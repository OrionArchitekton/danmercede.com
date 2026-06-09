/**
 * danmercede.com substrate-content compiler.
 *
 * Reads substrate canonicals from `<substrate>/publishing/canonical/`, filters
 * those with `surface_targets` including "danmercede.com", maps each to the
 * 4-field `Thought` shape, and writes `constants.generated.ts`.
 *
 * Posture (fail-mode asymmetry — see AGENTS.md):
 * - Consumer mode (default; Vercel prebuild): FAIL-OPEN. If substrate is
 *   unreachable OR yields 0 matches, exit 0 without overwriting the committed
 *   constants.generated.ts. The site continues with whatever was last committed.
 * - Sync workflow mode (`--strict`): FAIL-LOUD. Exit 1 on either failure.
 *   The workflow halts and does not open a PR that would silently strip entries.
 *
 * Spec 5 PR-B. Mapper shape ported from danmercede.online (Spec 4) but
 * specialized for the 4-field Thought type — no inbox, no body extraction, no
 * forbidden-content scan (substrate canonicals are operator-authored and trusted).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import yaml from 'js-yaml';

// Custom gray-matter engine that uses js-yaml's JSON_SCHEMA. This disables
// YAML's default `!!timestamp` type-coercion, so unquoted YAML dates like
// `date: 2026-05-20` and `date: 2026-05-20T00:00:00Z` are received as STRINGS
// — not as JavaScript Date objects. Distinguishing date-only from full ISO
// timestamps becomes unambiguous: a pure YYYY-MM-DD string is a calendar
// date, anything else is an instant. Without this, gray-matter's default
// SAFE_SCHEMA coerces both forms to Date objects whose .toISOString() ends
// in "T00:00:00.000Z", making them indistinguishable and causing the
// UTC-midnight instant `2026-05-20T00:00:00Z` to render as the calendar
// day "2026-05-20" rather than the PT day "2026-05-19".
const yamlEngine = {
  parse: (raw: string): unknown => yaml.load(raw, { schema: yaml.JSON_SCHEMA }),
  stringify: (data: unknown): string => yaml.dump(data, { schema: yaml.JSON_SCHEMA }),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THIS_SURFACE = 'danmercede.com';
const ACCEPTED_TYPES = new Set<string>(['essay-long']);

// Substrate `layer` → Thought `category` display label. Unmapped layers fall
// back to DEFAULT_CATEGORY. Extend cautiously when new layers are minted in
// substrate; an unexpected new layer landing as "Doctrine" is the safer default
// than crashing or hiding the entry.
const LAYER_TO_CATEGORY: Record<string, string> = {
  'authority-gate': 'Architecture',
  'immutable-receipts': 'Enforcement',
  'drift-guard': 'Enforcement',
  'gated-substrate': 'Enforcement',
  'fail-closed': 'Doctrine',
  'capability-removal': 'Doctrine',
};
const DEFAULT_CATEGORY = 'Doctrine';

// Vercel runs UTC by default; relying on local-TZ Date methods would print
// wrong PT-labeled dates. This formatter pins the display TZ regardless of
// the runner's process TZ.
const PT_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface ThoughtEntry {
  title: string;
  preview: string;
  date: string;
  category: string;
  slug: string;
  isoDate: string;
}

/**
 * Diagnostic raised during substrate reading. Used by `--strict` to distinguish
 * fatal corruption (matched-target canonicals with bad fields, unreadable files,
 * YAML parse failures) from intentional skips (wrong surface, draft, wrong type).
 */
export interface SubstrateDiagnostic {
  file: string;
  // 'fatal' = strict mode MUST fail-loud on this. Includes:
  //   - unreadable file
  //   - YAML parse failure
  //   - canonical that matches surface_targets/status/type but has missing
  //     required fields or invalid date (i.e., would-have-been-published but
  //     is corrupt). A single bad target canonical must not be silently
  //     dropped while the rest publish — that would partially-strip the
  //     committed bundle.
  // 'skip' = informational only; never fatal. Includes:
  //   - non-matching surface_targets
  //   - non-canonical status
  //   - unaccepted type
  severity: 'fatal' | 'skip';
  reason: string;
}

export function resolveSubstratePath(projectRoot: string): string | null {
  const envPath = process.env.SUBSTRATE_PATH;
  if (envPath && envPath.trim() !== '') {
    if (fs.existsSync(envPath) && fs.statSync(envPath).isDirectory()) {
      return envPath;
    }
    console.log(`   ℹ️  SUBSTRATE_PATH set to "${envPath}" but directory does not exist; trying sibling fallback`);
  }
  const sibling = path.resolve(projectRoot, '..', 'dan-mercede-substrate');
  if (fs.existsSync(sibling) && fs.statSync(sibling).isDirectory()) {
    return sibling;
  }
  return null;
}

export function deriveCategoryFromLayer(layer: unknown): string {
  if (typeof layer !== 'string') return DEFAULT_CATEGORY;
  return LAYER_TO_CATEGORY[layer] ?? DEFAULT_CATEGORY;
}

// Pure date-only YYYY-MM-DD pattern (no time component).
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize a substrate `date` value to:
 *   - `isoDate`: a sortable ISO-8601 instant for ordering (always present)
 *   - `displayDate`: the human-rendered calendar day in YYYY-MM-DD form
 *
 * Date-only inputs (YAML `date: 2026-05-20`, quoted `"2026-05-20"`, or a
 * gray-matter Date object that represents UTC midnight from date-only YAML)
 * are treated as calendar dates and rendered LITERALLY — not converted through
 * a JS Date instant in America/Los_Angeles, which would shift them one day
 * earlier (UTC midnight is the previous day in PT). Full ISO timestamps with a
 * time component or explicit offset are formatted via PT_DATE_FORMATTER as
 * before.
 */
function validateDate(date: unknown): { isoDate: string; displayDate: string } | null {
  // Case 1: caller-supplied Date object (no longer produced by our gray-matter
  // reader — the JSON_SCHEMA engine emits strings — but tests and future
  // callers may pass Date directly). When a Date is passed, we treat the
  // UTC-midnight marker (`T00:00:00.000Z`) as a calendar-date signal because
  // that is exactly the shape produced when gray-matter's default coercion
  // would parse `date: 2026-05-20` (unquoted YAML).
  //
  // CAVEAT: a Date constructed from a real ISO instant `2026-05-20T00:00:00Z`
  // is also UTC-midnight and indistinguishable here. Callers that need
  // instant semantics for UTC-midnight timestamps should pass the ISO string,
  // not a Date — the string path below disambiguates correctly because the
  // raw scalar carries the `T00:00:00Z` time token. Our substrate reader
  // takes this string path via the JSON_SCHEMA YAML engine.
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;
    const iso = date.toISOString();
    if (iso.endsWith('T00:00:00.000Z')) {
      return { isoDate: iso, displayDate: iso.slice(0, 10) };
    }
    return { isoDate: iso, displayDate: PT_DATE_FORMATTER.format(date) };
  }

  if (typeof date !== 'string' || date.trim() === '') return null;
  const trimmed = date.trim();

  // Case 2: pure YYYY-MM-DD string. Preserve as calendar date.
  if (DATE_ONLY_RE.test(trimmed)) {
    // Validate the calendar day is real (e.g., rejects 2026-02-30).
    const probe = new Date(`${trimmed}T00:00:00.000Z`);
    if (isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== trimmed) {
      return null;
    }
    return { isoDate: probe.toISOString(), displayDate: trimmed };
  }

  // Case 3: any string carrying a time component (or offset/Z marker) is a
  // real ISO instant; format in PT. This is where UTC-midnight timestamps
  // like `2026-05-20T00:00:00Z` correctly render as the PT-local day
  // (`2026-05-19`) rather than the calendar literal.
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return { isoDate: parsed.toISOString(), displayDate: PT_DATE_FORMATTER.format(parsed) };
}

/**
 * Map one substrate canonical frontmatter blob to a `ThoughtEntry`, or null if
 * it must be skipped. Skips are classified into:
 *   - 'skip' (intentional filter: wrong surface/status/type)
 *   - 'fatal' (matched target but is structurally corrupt: missing required
 *     field, invalid date)
 *
 * The caller (`readSubstrateThoughts`) collects diagnostics so `--strict` can
 * fail-loud on 'fatal' diagnostics while still permitting normal 'skip's.
 */
export function mapSubstrateToEntry(
  data: Record<string, unknown>,
  filename: string,
  diagnostics?: SubstrateDiagnostic[]
): ThoughtEntry | null {
  const pushDiag = (severity: SubstrateDiagnostic['severity'], reason: string): void => {
    if (diagnostics) diagnostics.push({ file: filename, severity, reason });
  };

  const surfaceTargets = data['surface_targets'];
  if (!Array.isArray(surfaceTargets) || !surfaceTargets.includes(THIS_SURFACE)) {
    console.log(`   ℹ️  substrate canonical skipped (surface_targets): ${filename}`);
    pushDiag('skip', 'surface_targets does not include danmercede.com');
    return null;
  }

  if (data['status'] !== 'canonical') {
    console.log(`   ℹ️  substrate canonical skipped (status="${String(data['status'])}"): ${filename}`);
    pushDiag('skip', `status="${String(data['status'])}"`);
    return null;
  }

  const typeRaw = data['type'];
  if (typeof typeRaw !== 'string' || !ACCEPTED_TYPES.has(typeRaw)) {
    console.log(`   ℹ️  substrate canonical skipped (unaccepted type "${String(typeRaw)}"): ${filename}`);
    pushDiag('skip', `unaccepted type "${String(typeRaw)}"`);
    return null;
  }

  // At this point the canonical matches surface/status/type — it WAS supposed
  // to publish. Any further failure is a fatal corruption signal under --strict.

  const slug = data['slug'];
  const title = data['title'];
  const dateRaw = data['date'];
  const claim = data['claim'];
  const missing: string[] = [];
  if (typeof slug !== 'string' || !slug.trim()) missing.push('slug');
  if (typeof title !== 'string' || !title.trim()) missing.push('title');
  // gray-matter parses unquoted YAML dates as Date objects; allow both.
  if (!(dateRaw instanceof Date) && (typeof dateRaw !== 'string' || !dateRaw.trim())) missing.push('date');
  if (typeof claim !== 'string' || !claim.trim()) missing.push('claim');
  if (missing.length > 0) {
    console.log(`   ⚠️  substrate canonical skipped (missing required: ${missing.join(', ')}): ${filename}`);
    pushDiag('fatal', `missing required fields: ${missing.join(', ')}`);
    return null;
  }

  const dateResult = validateDate(dateRaw);
  if (!dateResult) {
    console.log(`   ⚠️  substrate canonical skipped (invalid date "${String(dateRaw)}"): ${filename}`);
    pushDiag('fatal', `invalid date "${String(dateRaw)}"`);
    return null;
  }

  return {
    title: title as string,
    preview: claim as string,
    date: dateResult.displayDate,
    category: deriveCategoryFromLayer(data['layer']),
    slug: slug as string,
    isoDate: dateResult.isoDate,
  };
}

export interface ReadResult {
  entries: ThoughtEntry[];
  diagnostics: SubstrateDiagnostic[];
}

/**
 * Read substrate canonicals and return both successful entries AND
 * diagnostics. Returning diagnostics lets `main` distinguish (under `--strict`)
 * a clean substrate with intentional skips from a substrate that contains
 * corrupt target canonicals — see SubstrateDiagnostic for the severity model.
 *
 * The non-result-bearing overload `readSubstrateThoughts(path): ThoughtEntry[]`
 * is preserved for tests + back-compat.
 */
export function readSubstrateWithDiagnostics(substratePath: string): ReadResult {
  const diagnostics: SubstrateDiagnostic[] = [];
  const canonicalDir = path.join(substratePath, 'publishing', 'canonical');
  if (!fs.existsSync(canonicalDir)) {
    console.log(`   ℹ️  substrate canonical dir not found at ${canonicalDir}; skipping`);
    return { entries: [], diagnostics };
  }
  let stat;
  try {
    stat = fs.statSync(canonicalDir);
  } catch (e) {
    console.log(`   ⚠️  substrate canonical dir stat failed: ${canonicalDir} (${e})`);
    // Dir-level read failure is fatal under strict: we can't tell whether the
    // target canonicals are intact, so we must not proceed to write a possibly
    // truncated bundle.
    diagnostics.push({ file: canonicalDir, severity: 'fatal', reason: `stat failed: ${String(e)}` });
    return { entries: [], diagnostics };
  }
  if (!stat.isDirectory()) {
    console.log(`   ℹ️  substrate canonical path is not a directory: ${canonicalDir}; skipping`);
    return { entries: [], diagnostics };
  }

  let files: string[];
  try {
    files = fs.readdirSync(canonicalDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
  } catch (e) {
    console.log(`   ⚠️  substrate canonical dir unreadable: ${canonicalDir} (${e})`);
    diagnostics.push({ file: canonicalDir, severity: 'fatal', reason: `readdir failed: ${String(e)}` });
    return { entries: [], diagnostics };
  }

  const entries: ThoughtEntry[] = [];
  for (const file of files) {
    const filePath = path.join(canonicalDir, file);
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.log(`   ⚠️  substrate canonical unreadable: ${file} (${e})`);
      // Per-file read failure is fatal under strict — we cannot classify what
      // surface_targets the file declared.
      diagnostics.push({ file, severity: 'fatal', reason: `read failed: ${String(e)}` });
      continue;
    }

    let parsed;
    try {
      parsed = matter(raw, { engines: { yaml: yamlEngine } });
    } catch (e) {
      console.log(`   ⚠️  substrate canonical YAML parse failed: ${file} (${e})`);
      diagnostics.push({ file, severity: 'fatal', reason: `YAML parse failed: ${String(e)}` });
      continue;
    }

    const entry = mapSubstrateToEntry(parsed.data as Record<string, unknown>, file, diagnostics);
    if (entry) entries.push(entry);
  }

  return { entries, diagnostics };
}

export function readSubstrateThoughts(substratePath: string): ThoughtEntry[] {
  return readSubstrateWithDiagnostics(substratePath).entries;
}

/**
 * Collapse same-slug entries to one. A duplicate slug among admitted
 * danmercede.com canonicals is editorial corruption — directory iteration
 * order is not a content contract, so "later wins" is nondeterministic AND
 * silently deletes a publish-target canonical. When `diagnostics` is provided
 * (i.e., main() path), each duplicate raises a FATAL diagnostic so `--strict`
 * refuses to write a bundle that drops one. The non-diagnostics overload
 * preserves the prior "last wins" behavior for the legacy test path.
 */
export function dedupBySlug(
  entries: ThoughtEntry[],
  diagnostics?: SubstrateDiagnostic[]
): ThoughtEntry[] {
  const bySlug = new Map<string, ThoughtEntry>();
  for (const entry of entries) {
    if (bySlug.has(entry.slug)) {
      const msg = `duplicate slug "${entry.slug}" among admitted canonicals — nondeterministic data loss`;
      console.log(`   ⚠️  ${msg}`);
      if (diagnostics) {
        diagnostics.push({ file: entry.slug, severity: 'fatal', reason: msg });
      }
    }
    bySlug.set(entry.slug, entry);
  }
  return Array.from(bySlug.values());
}

export function sortByIsoDateDesc(entries: ThoughtEntry[]): ThoughtEntry[] {
  return entries.slice().sort((a, b) => {
    const diff = new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime();
    if (diff !== 0) return diff;
    return a.slug.localeCompare(b.slug);
  });
}

export function generateOutput(entries: ThoughtEntry[]): string {
  const lines: string[] = [];
  lines.push('// GENERATED FILE — do not edit by hand.');
  lines.push('// Source: dan-mercede-substrate/publishing/canonical/.');
  lines.push('// Regenerated by scripts/compileContent.ts when substrate canonicals');
  lines.push(`// with surface_targets including "${THIS_SURFACE}" are present.`);
  lines.push('// See AGENTS.md for the substrate-consumer contract.');
  lines.push('');
  lines.push("import type { Thought } from './types';");
  lines.push('');
  lines.push('export const THOUGHTS: Thought[] = [');
  for (const e of entries) {
    lines.push('  {');
    lines.push(`    title: ${JSON.stringify(e.title)},`);
    lines.push(`    preview: ${JSON.stringify(e.preview)},`);
    lines.push(`    date: ${JSON.stringify(e.date)},`);
    lines.push(`    category: ${JSON.stringify(e.category)},`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

function projectRoot(): string {
  return path.resolve(__dirname, '..');
}

/**
 * Decision shape returned by `decideOutput`. Externalizes the write gate from
 * `main()` so the fail-open-on-fatal-diagnostic behavior is testable without
 * a subprocess. Action semantics:
 *   - 'write' : write content to constants.generated.ts (success path).
 *   - 'skip'  : do not write; preserve last committed bundle (fail-open
 *               paths: substrate unreachable, 0 matches, fatal diagnostics).
 *   - 'fail'  : exit 1 (strict-mode failures: unreachable, 0 matches under
 *               --require-matches, fatal diagnostics under --strict).
 */
export type OutputDecision =
  | { action: 'write'; content: string; entryCount: number }
  | { action: 'skip'; reason: string }
  | { action: 'fail'; reason: string };

export interface DecideOutputArgs {
  substrateReachable: boolean;
  substratePath: string | null;
  entries: ThoughtEntry[];
  diagnostics: SubstrateDiagnostic[];
  strict: boolean;
  requireMatches: boolean;
}

export function decideOutput(args: DecideOutputArgs): OutputDecision {
  const { substrateReachable, entries, diagnostics, strict, requireMatches } = args;
  if (!substrateReachable) {
    const reason = 'substrate root unreachable (SUBSTRATE_PATH unset and sibling ../dan-mercede-substrate not found)';
    return strict ? { action: 'fail', reason } : { action: 'skip', reason };
  }
  const fatal = diagnostics.filter(d => d.severity === 'fatal');
  if (fatal.length > 0) {
    const summary = fatal.map(d => `${d.file}: ${d.reason}`).join('; ');
    const reason = `substrate contains ${fatal.length} fatal corruption(s): ${summary}`;
    return strict ? { action: 'fail', reason } : { action: 'skip', reason };
  }
  if (entries.length === 0) {
    const reason = `substrate yielded 0 canonicals matching surface_targets="${THIS_SURFACE}"`;
    return requireMatches ? { action: 'fail', reason } : { action: 'skip', reason };
  }
  return { action: 'write', content: generateOutput(entries), entryCount: entries.length };
}

export function main(): void {
  // --strict: fail-loud on FATAL diagnostics (corrupt matched canonical,
  //   unreadable file, YAML parse failure, duplicate slug among admitted
  //   canonicals) AND on substrate unreachable. Used by both CI (PR drift
  //   gate) and the sync workflow. Required to prevent CI from blessing a
  //   partial bundle stripped of corrupt entries.
  // --require-matches: additionally fail-loud on 0 matches. Used ONLY by
  //   the sync workflow, where 0 matches means "nothing to sync" — opening
  //   a PR that deletes all entries would be silent data loss. CI does NOT
  //   set this because during the initial-seed period substrate has 0
  //   danmercede.com matches and the committed seed is intentional.
  const strict = process.argv.includes('--strict');
  const requireMatches = process.argv.includes('--require-matches');
  const root = projectRoot();
  const substratePath = resolveSubstratePath(root);

  const modeLabel = [
    strict ? 'strict' : 'fail-open',
    requireMatches ? 'require-matches' : null,
  ].filter(Boolean).join(', ');
  console.log(`\n🛠  danmercede.com substrate compile (mode: ${modeLabel})`);

  let entries: ThoughtEntry[] = [];
  let diagnostics: SubstrateDiagnostic[] = [];
  if (substratePath) {
    console.log(`   ℹ️  substrate root: ${substratePath}`);
    const result = readSubstrateWithDiagnostics(substratePath);
    // Plumb diagnostics into dedup so duplicate slugs among admitted
    // canonicals raise a fatal diagnostic (caught by decideOutput below).
    const deduped = dedupBySlug(result.entries, result.diagnostics);
    entries = sortByIsoDateDesc(deduped);
    diagnostics = result.diagnostics;
  }

  const decision = decideOutput({
    substrateReachable: substratePath !== null,
    substratePath,
    entries,
    diagnostics,
    strict,
    requireMatches,
  });

  switch (decision.action) {
    case 'fail':
      console.error(`❌ ${decision.reason}`);
      process.exit(1);
      return; // unreachable
    case 'skip':
      console.log(`   ℹ️  ${decision.reason}; preserving committed constants.generated.ts`);
      return;
    case 'write': {
      const outputPath = path.join(root, 'constants.generated.ts');
      fs.writeFileSync(outputPath, decision.content, 'utf-8');
      console.log(`\n📊 wrote ${decision.entryCount} thought(s) to constants.generated.ts`);
      return;
    }
  }
}

const invokedDirectly = path.resolve(process.argv[1] ?? '') === __filename;
if (invokedDirectly) {
  main();
}
