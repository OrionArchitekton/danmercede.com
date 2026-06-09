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

function validateDate(date: unknown): string | null {
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  if (typeof date !== 'string' || date.trim() === '') return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatDate(isoDate: string): string {
  return PT_DATE_FORMATTER.format(new Date(isoDate));
}

export function mapSubstrateToEntry(
  data: Record<string, unknown>,
  filename: string
): ThoughtEntry | null {
  const surfaceTargets = data['surface_targets'];
  if (!Array.isArray(surfaceTargets) || !surfaceTargets.includes(THIS_SURFACE)) {
    console.log(`   ℹ️  substrate canonical skipped (surface_targets): ${filename}`);
    return null;
  }

  if (data['status'] !== 'canonical') {
    console.log(`   ℹ️  substrate canonical skipped (status="${String(data['status'])}"): ${filename}`);
    return null;
  }

  const typeRaw = data['type'];
  if (typeof typeRaw !== 'string' || !ACCEPTED_TYPES.has(typeRaw)) {
    console.log(`   ℹ️  substrate canonical skipped (unaccepted type "${String(typeRaw)}"): ${filename}`);
    return null;
  }

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
    return null;
  }

  const isoDate = validateDate(dateRaw);
  if (!isoDate) {
    console.log(`   ⚠️  substrate canonical skipped (invalid date "${String(dateRaw)}"): ${filename}`);
    return null;
  }

  return {
    title: title as string,
    preview: claim as string,
    date: formatDate(isoDate),
    category: deriveCategoryFromLayer(data['layer']),
    slug: slug as string,
    isoDate,
  };
}

export function readSubstrateThoughts(substratePath: string): ThoughtEntry[] {
  const canonicalDir = path.join(substratePath, 'publishing', 'canonical');
  if (!fs.existsSync(canonicalDir)) {
    console.log(`   ℹ️  substrate canonical dir not found at ${canonicalDir}; skipping`);
    return [];
  }
  let stat;
  try {
    stat = fs.statSync(canonicalDir);
  } catch (e) {
    console.log(`   ⚠️  substrate canonical dir stat failed: ${canonicalDir} (${e})`);
    return [];
  }
  if (!stat.isDirectory()) {
    console.log(`   ℹ️  substrate canonical path is not a directory: ${canonicalDir}; skipping`);
    return [];
  }

  let files: string[];
  try {
    files = fs.readdirSync(canonicalDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
  } catch (e) {
    console.log(`   ⚠️  substrate canonical dir unreadable: ${canonicalDir} (${e})`);
    return [];
  }

  const entries: ThoughtEntry[] = [];
  for (const file of files) {
    const filePath = path.join(canonicalDir, file);
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.log(`   ⚠️  substrate canonical unreadable: ${file} (${e})`);
      continue;
    }

    let parsed;
    try {
      parsed = matter(raw);
    } catch (e) {
      console.log(`   ⚠️  substrate canonical YAML parse failed: ${file} (${e})`);
      continue;
    }

    const entry = mapSubstrateToEntry(parsed.data as Record<string, unknown>, file);
    if (entry) entries.push(entry);
  }

  return entries;
}

export function dedupBySlug(entries: ThoughtEntry[]): ThoughtEntry[] {
  const bySlug = new Map<string, ThoughtEntry>();
  for (const entry of entries) {
    if (bySlug.has(entry.slug)) {
      console.log(`   ℹ️  duplicate slug, later wins: ${entry.slug}`);
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

export function main(): void {
  const strict = process.argv.includes('--strict');
  const root = projectRoot();
  const substratePath = resolveSubstratePath(root);

  console.log(`\n🛠  danmercede.com substrate compile (mode: ${strict ? 'strict' : 'fail-open'})`);

  if (!substratePath) {
    const msg = 'substrate root unreachable (SUBSTRATE_PATH unset and sibling ../dan-mercede-substrate not found)';
    if (strict) {
      console.error(`❌ ${msg}`);
      process.exit(1);
    }
    console.log(`   ℹ️  ${msg}; preserving committed constants.generated.ts`);
    return;
  }

  console.log(`   ℹ️  substrate root: ${substratePath}`);

  const raw = readSubstrateThoughts(substratePath);
  const deduped = dedupBySlug(raw);
  const sorted = sortByIsoDateDesc(deduped);

  if (sorted.length === 0) {
    const msg = `substrate yielded 0 canonicals matching surface_targets="${THIS_SURFACE}"`;
    if (strict) {
      console.error(`❌ ${msg}`);
      process.exit(1);
    }
    console.log(`   ℹ️  ${msg}; preserving committed constants.generated.ts`);
    return;
  }

  const output = generateOutput(sorted);
  const outputPath = path.join(root, 'constants.generated.ts');
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log(`\n📊 wrote ${sorted.length} thought(s) to constants.generated.ts`);
}

const invokedDirectly = path.resolve(process.argv[1] ?? '') === __filename;
if (invokedDirectly) {
  main();
}
