/**
 * danmercede.com substrate-content compiler.
 *
 * Reads substrate canonicals from `<substrate>/publishing/canonical/`, filters
 * those with `surface_targets` including "danmercede.com", maps each to the
 * `Thought` shape (title/preview/date/category + slug + full essay body), and
 * writes `constants.generated.ts`.
 *
 * Posture (fail-mode asymmetry — see AGENTS.md):
 * - Consumer mode (default; Vercel prebuild): FAIL-OPEN. If substrate is
 *   unreachable OR yields 0 matches, exit 0 without overwriting the committed
 *   constants.generated.ts. The site continues with whatever was last committed.
 * - Sync workflow mode (`--strict`): FAIL-LOUD. Exit 1 on either failure.
 *   The workflow halts and does not open a PR that would silently strip entries.
 *
 * Spec 5 PR-B. Mapper shape ported from danmercede.online (Spec 4); round-2
 * R1 extends it to extract the full essay body (parsed.content) — mirroring
 * danmercede.online's `content: body` — so the hub bakes the full corpus into
 * served per-thought pages, not just the preview. No inbox, no forbidden-content
 * scan (substrate canonicals are operator-authored and trusted).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

// Parse frontmatter with js-yaml's JSON_SCHEMA. This disables YAML's default
// `!!timestamp` type-coercion, so unquoted YAML dates like
// `date: 2026-05-20` and `date: 2026-05-20T00:00:00Z` are received as STRINGS
// - not as JavaScript Date objects. Distinguishing date-only from full ISO
// timestamps becomes unambiguous: a pure YYYY-MM-DD string is a calendar
// date, anything else is an instant. Without this, timestamp-aware YAML parsers
// can coerce both forms to Date objects whose .toISOString() ends
// in "T00:00:00.000Z", making them indistinguishable and causing the
// UTC-midnight instant `2026-05-20T00:00:00Z` to render as the calendar
// day "2026-05-20" rather than the PT day "2026-05-19".
interface ParsedCanonicalMarkdown {
  data: Record<string, unknown>;
  content: string;
}

function parseCanonicalMarkdown(raw: string): ParsedCanonicalMarkdown {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
  if (!match) return { data: {}, content: normalized };

  const loaded = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  if (loaded == null) {
    return { data: {}, content: normalized.slice(match[0].length) };
  }
  if (typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new Error('frontmatter must parse to a mapping');
  }
  return {
    data: loaded as Record<string, unknown>,
    content: normalized.slice(match[0].length),
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THIS_SURFACE = 'danmercede.com';
const ACCEPTED_TYPES = new Set<string>(['essay-long']);

// Hub-side consumer allowlist (mirrors the lane's [syndication] backfill_slugs +
// the distribution_opt_in_lane_side_not_sealed_substrate lesson). Flagship
// long-form essays whose substrate surface_targets do NOT include danmercede.com
// (substrate is immutable — frontmatter re-tagging is a no-op) are admitted to the
// hub /thoughts corpus by slug. This overrides ONLY the surface_targets gate; the
// status / type / required-field / date gates still apply. INVARIANT: the lane's
// [syndication] backfill_slugs MUST be a subset of this list (an essay may only
// carry a .com canonical if it has a real .com page).
export const HUB_ESSAY_ALLOWLIST: readonly string[] = [
  '2026-06-08-authority-gate-made-runnable',
  '2026-05-20-pre-execution-authority-gates',
];

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
  // Full essay body (substrate canonical markdown body below the frontmatter,
  // trimmed). Blank-line-separated paragraphs; baked verbatim into served
  // per-thought pages (R1). Empty string when the canonical has no body.
  body: string;
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

// existsSync→statSync is not atomic: the path can vanish between the calls, a
// component can be a file (ENOTDIR), or permissions/NFS can make stat throw
// even though exists returned true. Treat any stat failure as "not a usable
// directory" rather than crashing path resolution.
function isUsableDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

export function resolveSubstratePath(projectRoot: string): string | null {
  const envPath = process.env.SUBSTRATE_PATH;
  if (envPath && envPath.trim() !== '') {
    if (isUsableDirectory(envPath)) {
      return envPath;
    }
    console.log(`   ℹ️  SUBSTRATE_PATH set to "${envPath}" but is not an accessible directory; trying sibling fallback`);
  }
  const sibling = path.resolve(projectRoot, '..', 'dan-mercede-substrate');
  if (isUsableDirectory(sibling)) {
    return sibling;
  }
  return null;
}

export function deriveCategoryFromLayer(layer: unknown): string {
  if (typeof layer !== 'string') return DEFAULT_CATEGORY;
  return LAYER_TO_CATEGORY[layer] ?? DEFAULT_CATEGORY;
}

// Substrate authoring uses `[[entity]]` / `[[entity|display]]` wiki-link syntax (the
// LLM-wiki canon). danmercede.com has no wiki routes, so leaving them in the baked body
// renders literal broken `[[authority-gate]]` tokens publicly. De-link to plain prose
// before baking — `[[authority-gate]]` -> "authority gate", `[[slug|Display]]` -> "Display".
// Code-aware (mirrors the lane's _delink_wiki): fenced ```...``` and inline `...` spans are
// preserved verbatim so a Bash `[[ $x == y ]]` conditional or array literal inside code is
// neither rewritten nor (in the guard test) flagged.
const CODE_SPAN_RE = /```[\s\S]*?```|`[^`\n]+`/g;
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function delinkSegment(seg: string): string {
  return seg.replace(WIKILINK_RE, (_full, target: string, display?: string) =>
    display !== undefined ? display : target.replace(/[-_]/g, ' '),
  );
}

export function delinkWikiLinks(text: string): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(CODE_SPAN_RE)) {
    const idx = m.index ?? 0;
    out += delinkSegment(text.slice(last, idx));
    out += m[0]; // code span preserved verbatim
    last = idx + m[0].length;
  }
  out += delinkSegment(text.slice(last));
  return out;
}

// Pure date-only YYYY-MM-DD pattern (no time component).
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Strict ISO-8601 instant: date + 'T' + time (seconds and fraction optional)
// + REQUIRED explicit timezone (Z or ±HH:MM / ±HHMM). The mandatory offset is
// what makes the value runner-independent — see validateDate Case 3.
//
// Bare ±HH offsets (`-07`) are ISO-8601-permitted but deliberately NOT
// admitted: ECMAScript cannot parse them (`new Date('…-07')` → Invalid Date,
// verified on Node 20/V8), so admitting them in the regex would only move the
// rejection from here to the isNaN check while making this contract claim
// support the engine does not have.
const ISO_INSTANT_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/;

// ECMAScript NORMALIZES some impossible calendar fields instead of rejecting
// them: `2026-02-30T00:00:00Z` parses to 2026-03-02, `2026-04-31` to 05-01,
// and hour 24 rolls to the next day (verified on Node 20/V8). A regex match
// must therefore be followed by explicit field validation — isNaN alone is
// not a calendar-validity gate. (Out-of-range months, minutes, seconds, and
// timezone offsets ARE engine-rejected, but one authoritative validator is
// less fragile than documenting which fields the engine happens to catch.)
function hasRealCalendarFields(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  if (month < 1 || month > 12) return false;
  // Date.UTC(year, month, 0) = last day of `month` (deterministic UTC math).
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;
  return hour <= 23 && minute <= 59 && second <= 59;
}

/**
 * Normalize a substrate `date` value to:
 *   - `isoDate`: a sortable ISO-8601 instant for ordering (always present)
 *   - `displayDate`: the human-rendered calendar day in YYYY-MM-DD form
 *
 * Date-only inputs (YAML `date: 2026-05-20`, quoted `"2026-05-20"`, or a
 * caller-provided Date object that represents UTC midnight from date-only YAML)
 * are treated as calendar dates and rendered LITERALLY — not converted through
 * a JS Date instant in America/Los_Angeles, which would shift them one day
 * earlier (UTC midnight is the previous day in PT). Time-bearing strings must
 * be strict ISO-8601 instants with an explicit timezone (Z or ±HH:MM) and are
 * formatted via PT_DATE_FORMATTER; anything else (engine-dependent shapes,
 * offset-less datetimes) returns null → fatal at the caller.
 */
function validateDate(date: unknown): { isoDate: string; displayDate: string } | null {
  // Case 1: caller-supplied Date object (no longer produced by our frontmatter
  // reader - the JSON_SCHEMA engine emits strings - but tests and future callers
  // may pass Date directly). When a Date is passed, we treat the
  // UTC-midnight marker (`T00:00:00.000Z`) as a calendar-date signal because
  // that is exactly the shape produced when timestamp-aware YAML coercion would
  // parse `date: 2026-05-20` (unquoted YAML).
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

  // Case 3: a strict ISO-8601 instant WITH an explicit timezone (Z or
  // ±HH:MM); format in PT. This is where UTC-midnight timestamps like
  // `2026-05-20T00:00:00Z` correctly render as the PT-local day
  // (`2026-05-19`) rather than the calendar literal.
  //
  // Anything else is rejected (fatal at the caller): bare `new Date()`
  // accepts engine-dependent shapes like `May 20 2026` or
  // `2026-05-20 00:00:00` and interprets them in the PROCESS timezone, so
  // the same canonical would produce different isoDate/display/sort on a
  // UTC runner vs a PT laptop. Offset-less datetimes
  // (`2026-05-20T14:30:00`) are rejected for the same reason — ECMAScript
  // parses them as local time, which is runner-dependent.
  const match = ISO_INSTANT_RE.exec(trimmed);
  if (!match || !hasRealCalendarFields(match)) return null;
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return { isoDate: parsed.toISOString(), displayDate: PT_DATE_FORMATTER.format(parsed) };
}

// A slug becomes BOTH a filesystem path segment (diagrams: public/assets/diagrams/<slug>.<ext>)
// AND an UNESCAPED sitemap <loc> token (thoughts/guides/diagrams: <loc>.../<family>/<slug></loc>),
// so it must be charset-safe: lowercase kebab only. Gating it at the mapper (ported from
// danmercede.online's isSafeSlug) closes a write-side path traversal (a "../.." slug escaping
// public/) and an XML-injection vector in the <loc>, on every content family that maps a slug.
const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isSafeSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SAFE_SLUG_PATTERN.test(slug);
}

/**
 * Map one substrate canonical frontmatter blob to a `ThoughtEntry`, or null if
 * it must be skipped. Skips are classified into:
 *   - 'skip' (intentional filter: wrong surface/status/type)
 *   - 'fatal' (matched target but is structurally corrupt: missing required
 *     field, invalid date, unsafe slug)
 *
 * The caller (`readSubstrateThoughts`) collects diagnostics so `--strict` can
 * fail-loud on 'fatal' diagnostics while still permitting normal 'skip's.
 */
export function mapSubstrateToEntry(
  data: Record<string, unknown>,
  body: string,
  filename: string,
  diagnostics?: SubstrateDiagnostic[]
): ThoughtEntry | null {
  const pushDiag = (severity: SubstrateDiagnostic['severity'], reason: string): void => {
    if (diagnostics) diagnostics.push({ file: filename, severity, reason });
  };

  const surfaceTargets = data['surface_targets'];
  const surfaceTargeted =
    Array.isArray(surfaceTargets) && surfaceTargets.includes(THIS_SURFACE);
  const slugRaw = data['slug'];
  const allowlisted = typeof slugRaw === 'string' && HUB_ESSAY_ALLOWLIST.includes(slugRaw);
  if (!surfaceTargeted && !allowlisted) {
    console.log(`   ℹ️  substrate canonical skipped (surface_targets): ${filename}`);
    pushDiag('skip', 'surface_targets does not include danmercede.com');
    return null;
  }
  if (allowlisted && !surfaceTargeted) {
    console.log(`   ✅ substrate canonical admitted via HUB_ESSAY_ALLOWLIST: ${filename}`);
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
  // The compiler's JSON_SCHEMA parser emits date strings, but keep Date support
  // for direct callers and regression tests.
  if (!(dateRaw instanceof Date) && (typeof dateRaw !== 'string' || !dateRaw.trim())) missing.push('date');
  if (typeof claim !== 'string' || !claim.trim()) missing.push('claim');
  if (missing.length > 0) {
    console.log(`   ⚠️  substrate canonical skipped (missing required: ${missing.join(', ')}): ${filename}`);
    pushDiag('fatal', `missing required fields: ${missing.join(', ')}`);
    return null;
  }

  // The slug is an unescaped sitemap <loc> token — reject metachar/traversal slugs
  // as FATAL corruption (it matched target, so it was supposed to publish).
  if (!isSafeSlug(slug)) {
    console.log(`   ⚠️  substrate canonical skipped (unsafe slug "${String(slug)}"): ${filename}`);
    pushDiag('fatal', `unsafe slug "${String(slug)}" (must match ${SAFE_SLUG_PATTERN})`);
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
    body,
    isoDate: dateResult.isoDate,
  };
}

// Substrate `type: "diagram"` canonicals (PR #14) are admitted to danmercede.com
// as a distinct content type. Unlike a Thought (prose body), a diagram carries
// alt_text/caption + an asset_path to the rendered image; the .com page is a
// figure with an ImageObject JSON-LD node (S1c). Decision #1: admission is by
// `surface_targets` including danmercede.com (no allowlist — the substrate
// canonical declares the .com target directly).
const DIAGRAM_TYPE = 'diagram';

export interface DiagramEntry {
  title: string;
  slug: string;
  // PT-local display day (YYYY-MM-DD), same handling as ThoughtEntry.date.
  date: string;
  isoDate: string;
  // From substrate `alt_text` — the crawlable image description (also the baked
  // <img alt> and the ImageObject.description).
  alt: string;
  // From substrate `caption` — the visible <figcaption> + meta description.
  caption: string;
  // From substrate `asset_path` (substrate-root-relative), e.g.
  // publishing/assets/<slug>/diagram.jpg. The image binary is copied into the
  // hub's public/assets/diagrams/ at compile time (S1b); the page src derives
  // from the slug + extension.
  assetPath: string;
}

/**
 * Map one substrate `type: diagram` canonical to a DiagramEntry, or null to skip.
 * Mirrors mapSubstrateToEntry's gate order (surface → status → type → required
 * fields → date) and its skip/fatal diagnostic model: a canonical that matches
 * surface+status+type but is missing alt_text/caption/asset_path or has an
 * invalid date is FATAL (it WAS supposed to publish), so --strict refuses to
 * write a partial bundle. Required fields beyond the essay set: alt_text,
 * caption, asset_path.
 */
export function mapSubstrateToDiagram(
  data: Record<string, unknown>,
  body: string,
  filename: string,
  diagnostics?: SubstrateDiagnostic[]
): DiagramEntry | null {
  const pushDiag = (severity: SubstrateDiagnostic['severity'], reason: string): void => {
    if (diagnostics) diagnostics.push({ file: filename, severity, reason });
  };

  const surfaceTargets = data['surface_targets'];
  const surfaceTargeted =
    Array.isArray(surfaceTargets) && surfaceTargets.includes(THIS_SURFACE);
  if (!surfaceTargeted) {
    console.log(`   ℹ️  substrate diagram skipped (surface_targets): ${filename}`);
    pushDiag('skip', 'surface_targets does not include danmercede.com');
    return null;
  }

  if (data['status'] !== 'canonical') {
    pushDiag('skip', `status="${String(data['status'])}"`);
    return null;
  }

  if (data['type'] !== DIAGRAM_TYPE) {
    pushDiag('skip', `type "${String(data['type'])}" is not diagram`);
    return null;
  }

  // Matched surface/status/type — it WAS supposed to publish. Any further
  // failure is fatal corruption under --strict.
  const slug = data['slug'];
  const title = data['title'];
  const dateRaw = data['date'];
  const alt = data['alt_text'];
  const caption = data['caption'];
  const assetPath = data['asset_path'];
  const missing: string[] = [];
  if (typeof slug !== 'string' || !slug.trim()) missing.push('slug');
  if (typeof title !== 'string' || !title.trim()) missing.push('title');
  if (!(dateRaw instanceof Date) && (typeof dateRaw !== 'string' || !dateRaw.trim())) missing.push('date');
  if (typeof alt !== 'string' || !alt.trim()) missing.push('alt_text');
  if (typeof caption !== 'string' || !caption.trim()) missing.push('caption');
  if (typeof assetPath !== 'string' || !assetPath.trim()) missing.push('asset_path');
  if (missing.length > 0) {
    console.log(`   ⚠️  substrate diagram skipped (missing required: ${missing.join(', ')}): ${filename}`);
    pushDiag('fatal', `missing required fields: ${missing.join(', ')}`);
    return null;
  }

  // The slug becomes the copied asset's destination filename AND an unescaped sitemap
  // <loc> token — reject metachar/traversal slugs as FATAL corruption (closes the
  // write-side path traversal: a "../.." slug would escape public/assets/diagrams/).
  if (!isSafeSlug(slug)) {
    console.log(`   ⚠️  substrate diagram skipped (unsafe slug "${String(slug)}"): ${filename}`);
    pushDiag('fatal', `unsafe slug "${String(slug)}" (must match ${SAFE_SLUG_PATTERN})`);
    return null;
  }

  const dateResult = validateDate(dateRaw);
  if (!dateResult) {
    pushDiag('fatal', `invalid date "${String(dateRaw)}"`);
    return null;
  }

  return {
    title: title as string,
    slug: slug as string,
    date: dateResult.displayDate,
    isoDate: dateResult.isoDate,
    alt: alt as string,
    caption: caption as string,
    assetPath: assetPath as string,
  };
}

export interface ReadResult {
  entries: ThoughtEntry[];
  diagrams: DiagramEntry[];
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
    return { entries: [], diagrams: [], diagnostics };
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
    return { entries: [], diagrams: [], diagnostics };
  }
  if (!stat.isDirectory()) {
    console.log(`   ℹ️  substrate canonical path is not a directory: ${canonicalDir}; skipping`);
    return { entries: [], diagrams: [], diagnostics };
  }

  let files: string[];
  try {
    files = fs.readdirSync(canonicalDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
  } catch (e) {
    console.log(`   ⚠️  substrate canonical dir unreadable: ${canonicalDir} (${e})`);
    diagnostics.push({ file: canonicalDir, severity: 'fatal', reason: `readdir failed: ${String(e)}` });
    return { entries: [], diagrams: [], diagnostics };
  }

  const entries: ThoughtEntry[] = [];
  const diagrams: DiagramEntry[] = [];
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
      parsed = parseCanonicalMarkdown(raw);
    } catch (e) {
      console.log(`   ⚠️  substrate canonical YAML parse failed: ${file} (${e})`);
      diagnostics.push({ file, severity: 'fatal', reason: `YAML parse failed: ${String(e)}` });
      continue;
    }

    // Extract the full essay body (markdown below the frontmatter), mirroring
    // danmercede.online's `const body = parsed.content.trim()` (R1), then de-link
    // substrate `[[wiki-links]]` so they never bake as literal tokens on .com.
    const body = delinkWikiLinks(parsed.content.trim());
    const data = parsed.data as Record<string, unknown>;
    // Dispatch by type: a diagram canonical maps to a DiagramEntry (figure +
    // alt/caption/asset_path); everything else goes through the essay mapper
    // (which skips unaccepted types). A single canonical is one OR the other.
    if (data['type'] === DIAGRAM_TYPE) {
      const diagram = mapSubstrateToDiagram(data, body, file, diagnostics);
      if (diagram) diagrams.push(diagram);
    } else {
      const entry = mapSubstrateToEntry(data, body, file, diagnostics);
      if (entry) entries.push(entry);
    }
  }

  return { entries, diagrams, diagnostics };
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
export function dedupBySlug<T extends { slug: string }>(
  entries: T[],
  diagnostics?: SubstrateDiagnostic[]
): T[] {
  const bySlug = new Map<string, T>();
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

export function sortByIsoDateDesc<T extends { isoDate: string; slug: string }>(entries: T[]): T[] {
  return entries.slice().sort((a, b) => {
    const diff = new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime();
    if (diff !== 0) return diff;
    return a.slug.localeCompare(b.slug);
  });
}

// Substrate diagram binaries live at <substrate>/publishing/assets/<slug>/diagram.<ext>;
// they must be copied into the hub's public/assets/diagrams/<slug>.<ext> to be served
// (Vercel serves the committed public/). `asset_path` is operator-authored but a
// path-traversal guard is mandatory: refuse absolute paths, Windows drive-letter
// paths, and any `..` segment, so a malformed/hostile asset_path can never read
// outside the substrate root. Ported from danmercede.online for cross-surface parity.
function normalizeSafeRelativePath(value: string): string | null {
  const normalizedInput = value.trim().replace(/\\/g, '/');
  if (!normalizedInput || path.posix.isAbsolute(normalizedInput) || /^[A-Za-z]:\//.test(normalizedInput)) {
    return null;
  }
  if (normalizedInput.split('/').some((part) => part === '..' || part === '')) {
    return null;
  }
  const normalized = path.posix.normalize(normalizedInput);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    return null;
  }
  return normalized;
}

export function isSafeRelativePath(value: string): boolean {
  return typeof value === 'string' && normalizeSafeRelativePath(value) !== null;
}

const ALLOWED_DIAGRAM_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

// Copy a diagram's substrate binary into <projectRoot>/public/assets/diagrams/<slug><ext>,
// returning the served path (/assets/diagrams/<slug><ext>) or null if asset_path is
// missing / unsafe / unsupported-ext / escapes-root / uncopyable. main() DROPS any
// diagram returning null, so the bundle never carries a dangling image src.
export function copyDiagramAsset(
  assetPath: unknown,
  slug: string,
  substratePath: string | undefined | null,
  projectRoot: string,
  file: string,
  diagnostics?: SubstrateDiagnostic[]
): string | null {
  // A diagram reaching copyDiagramAsset was already ADMITTED by mapSubstrateToDiagram —
  // it WAS supposed to publish. Dropping it here (unsafe/missing/uncopyable binary) is
  // corruption, not an intentional skip: raise a FATAL so --strict refuses to write a
  // partial (e.g. 20-of-21) bundle. The diagnostics array is optional so direct test
  // callers can probe the null-return without a diagnostics sink.
  const drop = (reason: string): null => {
    console.log(`   ⚠️  substrate diagram skipped (${reason}): ${file}`);
    if (diagnostics) diagnostics.push({ file, severity: 'fatal', reason });
    return null;
  };

  if (typeof assetPath !== 'string' || !assetPath.trim()) {
    return drop('missing asset_path');
  }
  if (!substratePath) {
    return drop('no substrate root for asset copy');
  }
  if (!isSafeRelativePath(assetPath)) {
    return drop(`unsafe asset_path "${assetPath}"`);
  }
  const safeAssetPath = normalizeSafeRelativePath(assetPath) as string;
  const ext = path.extname(safeAssetPath).toLowerCase();
  if (!ALLOWED_DIAGRAM_EXT.has(ext)) {
    return drop(`unsupported asset extension "${ext}"`);
  }
  const substrateRoot = path.resolve(substratePath);
  const source = path.resolve(substrateRoot, safeAssetPath);
  // Belt-and-suspenders: even after the segment guard, confirm the resolved source
  // stays within the substrate root (defends against normalize edge cases).
  const relativeSource = path.relative(substrateRoot, source);
  if (relativeSource.startsWith('..') || path.isAbsolute(relativeSource)) {
    return drop('asset_path escapes substrate root');
  }
  const publicDir = path.join(projectRoot, 'public', 'assets', 'diagrams');
  const publicName = `${slug}${ext}`;
  // Defense-in-depth (the slug is gated upstream by isSafeSlug, but never trust one
  // gate for a filesystem write): confirm <slug><ext> is a single in-dir filename that
  // cannot climb out of public/assets/diagrams/ before writing anything.
  const dest = path.join(publicDir, publicName);
  const relativeDest = path.relative(publicDir, dest);
  if (relativeDest.startsWith('..') || path.isAbsolute(relativeDest) || relativeDest.includes(path.sep)) {
    return drop(`destination "${publicName}" escapes public/assets/diagrams/`);
  }
  try {
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      return drop(`asset missing at ${safeAssetPath}`);
    }
    fs.mkdirSync(publicDir, { recursive: true });
    fs.copyFileSync(source, dest);
    return `/assets/diagrams/${publicName}`;
  } catch (e) {
    return drop(`failed to copy asset (${e})`);
  }
}

// Derive the .com public image src for a diagram from its slug + the substrate
// asset extension (lowercased to match copyDiagramAsset's publicName), e.g.
// publishing/assets/<slug>/diagram.JPG → /assets/diagrams/<slug>.jpg. Kept in
// lockstep with copyDiagramAsset so the baked src always resolves to the copied file.
export function diagramPublicSrc(entry: DiagramEntry): string {
  const ext = (path.extname(entry.assetPath) || '.png').toLowerCase();
  return `/assets/diagrams/${entry.slug}${ext}`;
}

export function generateOutput(entries: ThoughtEntry[], diagrams: DiagramEntry[] = []): string {
  const lines: string[] = [];
  lines.push('// GENERATED FILE — do not edit by hand.');
  lines.push('// Source: dan-mercede-substrate/publishing/canonical/.');
  lines.push('// Regenerated by scripts/compileContent.ts when substrate canonicals');
  lines.push(`// with surface_targets including "${THIS_SURFACE}" are present.`);
  lines.push('// See AGENTS.md for the substrate-consumer contract.');
  lines.push('');
  lines.push("import type { Thought, Diagram } from './types';");
  lines.push('');
  lines.push('export const THOUGHTS: Thought[] = [');
  for (const e of entries) {
    lines.push('  {');
    lines.push(`    title: ${JSON.stringify(e.title)},`);
    lines.push(`    preview: ${JSON.stringify(e.preview)},`);
    lines.push(`    date: ${JSON.stringify(e.date)},`);
    lines.push(`    category: ${JSON.stringify(e.category)},`);
    lines.push(`    slug: ${JSON.stringify(e.slug)},`);
    // JSON.stringify encodes the multi-line essay body as a single-line,
    // newline-escaped TS string literal (\n between paragraphs). Consumers
    // (seoMeta thoughtMeta) split on the blank-line boundary to rebuild
    // paragraphs for the baked body block.
    lines.push(`    body: ${JSON.stringify(e.body)},`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  // DIAGRAMS folds into the SAME (trusted-lane-verified) bundle as THOUGHTS — a
  // separate generated file would be unverified by substrate-verify (injection
  // hole). Always emitted (possibly empty) so consumers can import it.
  lines.push('export const DIAGRAMS: Diagram[] = [');
  for (const d of diagrams) {
    lines.push('  {');
    lines.push(`    title: ${JSON.stringify(d.title)},`);
    lines.push(`    slug: ${JSON.stringify(d.slug)},`);
    lines.push(`    date: ${JSON.stringify(d.date)},`);
    lines.push(`    alt: ${JSON.stringify(d.alt)},`);
    lines.push(`    caption: ${JSON.stringify(d.caption)},`);
    lines.push(`    src: ${JSON.stringify(diagramPublicSrc(d))},`);
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

/**
 * Marker file written to project root after `decideOutput`. Read by CI to
 * branch the verification gate:
 *   - `WROTE`   → compile produced a fresh bundle; CI's drift gate diffs
 *                 working tree vs index (committed = substrate truth).
 *   - `SKIPPED` → compile preserved the committed bundle; CI's
 *                 zero-match-bypass guard diffs the committed bundle vs
 *                 base branch (refuses PR-side hand-edits during the
 *                 substrate's zero-match seed period).
 *
 * Without this signal, CI cannot distinguish "compile wrote a bundle that
 * happens to match committed" from "compile skipped writes entirely", and
 * a PR-side hand-edit to `constants.generated.ts` would pass the drift
 * gate during the zero-match seed window. See AGENTS.md.
 */
export const COMPILE_STATUS_FILENAME = '.compile-status';
export type CompileStatus = 'WROTE' | 'SKIPPED';

export function formatCompileStatus(decision: OutputDecision): CompileStatus {
  return decision.action === 'write' ? 'WROTE' : 'SKIPPED';
}

export interface DecideOutputArgs {
  substrateReachable: boolean;
  substratePath: string | null;
  entries: ThoughtEntry[];
  // Optional with a [] default in decideOutput: a caller that omits diagrams
  // gets the prior entries-only behavior (fail-safe — absent means no diagrams).
  diagrams?: DiagramEntry[];
  diagnostics: SubstrateDiagnostic[];
  strict: boolean;
  requireMatches: boolean;
}

export function decideOutput(args: DecideOutputArgs): OutputDecision {
  const { substrateReachable, entries, diagrams = [], diagnostics, strict, requireMatches } = args;
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
  if (entries.length === 0 && diagrams.length === 0) {
    const reason = `substrate yielded 0 canonicals (thought or diagram) matching surface_targets="${THIS_SURFACE}"`;
    return requireMatches ? { action: 'fail', reason } : { action: 'skip', reason };
  }
  return {
    action: 'write',
    content: generateOutput(entries, diagrams),
    entryCount: entries.length + diagrams.length,
  };
}

export function main(): void {
  // Spec 4b D1 (parity with danmercede.online): Vercel never compiles. The
  // committed bundle is the deploy truth; CI owns compilation. This guard must
  // run BEFORE substrate resolution and any filesystem write so the Vercel
  // prebuild hook cannot overwrite the committed bundle — even if substrate
  // ever becomes reachable from the Vercel build environment (the softer
  // "substrate unreachable -> fail-open skip" path is not a hard guarantee).
  if (process.env.VERCEL) {
    console.log(
      'VERCEL build environment detected — skipping compile; the committed bundle is served (Spec 4b D1).'
    );
    return;
  }

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
  let diagrams: DiagramEntry[] = [];
  let diagnostics: SubstrateDiagnostic[] = [];
  if (substratePath) {
    console.log(`   ℹ️  substrate root: ${substratePath}`);
    const result = readSubstrateWithDiagnostics(substratePath);
    // Plumb diagnostics into dedup so duplicate slugs among admitted
    // canonicals raise a fatal diagnostic (caught by decideOutput below).
    entries = sortByIsoDateDesc(dedupBySlug(result.entries, result.diagnostics));
    // Copy each diagram's binary into public/assets/diagrams/ and DROP any whose
    // asset is missing / unsafe / uncopyable, so the bundle never carries a
    // dangling image src (mirrors danmercede.online's copy-then-keep behavior).
    diagrams = sortByIsoDateDesc(dedupBySlug(result.diagrams, result.diagnostics)).filter(
      (d) => copyDiagramAsset(d.assetPath, d.slug, substratePath, root, d.slug, result.diagnostics) !== null,
    );
    diagnostics = result.diagnostics;
  }

  const decision = decideOutput({
    substrateReachable: substratePath !== null,
    substratePath,
    entries,
    diagrams,
    diagnostics,
    strict,
    requireMatches,
  });

  // Emit the compile-status marker BEFORE acting on the decision so CI can
  // branch its verification gate on WROTE vs SKIPPED. Fail paths exit before
  // any subsequent CI step runs, so the marker is moot on fail — but the
  // marker file is written for write/skip so CI sees the explicit signal
  // rather than inferring intent from git diff alone.
  if (decision.action !== 'fail') {
    const statusPath = path.join(root, COMPILE_STATUS_FILENAME);
    fs.writeFileSync(statusPath, formatCompileStatus(decision), 'utf-8');
  }

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
