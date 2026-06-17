import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OG_IMAGE_PATH } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(root, 'public');

// Per-type byte budgets (KB), set with headroom above the current committed maxima
// (png ~2.47MB, webp ~1.1MB, og/jpg ~118KB, signature SVG ~4.2MB). The point: a future
// commit that re-introduces an unoptimized multi-MB original fails CI here. Since these
// brand repos deploy on merge, this is the only automated guard against image re-bloat.
// Fix a failure by re-optimizing in place: `npm i -D sharp && npm run optimize:images -- --apply`.
const BUDGET_KB: Record<string, number> = {
  '.jpg': 250,
  '.jpeg': 250,
  '.png': 2800,
  '.webp': 1300,
  '.svg': 5000,
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

test('no committed public/ image exceeds its per-type byte budget', () => {
  const offenders: string[] = [];
  for (const f of walk(PUBLIC)) {
    const budget = BUDGET_KB[path.extname(f).toLowerCase()];
    if (budget == null) continue;
    const kb = statSync(f).size / 1024;
    if (kb > budget) offenders.push(`${path.relative(PUBLIC, f)} = ${kb.toFixed(0)}KB > ${budget}KB`);
  }
  assert.deepEqual(
    offenders,
    [],
    `Oversized image asset(s) — re-run \`npm run optimize:images -- --apply\`:\n  ${offenders.join('\n  ')}`,
  );
});

test('DEFAULT_OG_IMAGE_PATH resolves to a non-empty file in public/', () => {
  const p = path.join(PUBLIC, DEFAULT_OG_IMAGE_PATH.replace(/^\//, ''));
  let size = -1;
  try {
    size = statSync(p).size;
  } catch {
    /* missing → size stays -1 */
  }
  assert.ok(
    size > 0,
    `DEFAULT_OG_IMAGE_PATH (${DEFAULT_OG_IMAGE_PATH}) must exist and be non-empty in public/ (got ${size} bytes) — a renamed/removed OG card silently breaks social unfurls.`,
  );
});
