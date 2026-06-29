import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OG_IMAGE_PATH } from '../seoMeta';
// Per-type byte budgets (KB) live in a shared module so the diagram optimizer
// (scripts/optimizeDiagrams.mjs) targets EXACTLY what this gate enforces — they can
// never drift. Set with headroom above the current committed maxima (png ~2.47MB,
// webp ~1.1MB, og/jpg ~118KB, signature SVG ~4.2MB). The point: a future commit that
// re-introduces an unoptimized multi-MB original fails CI here. Since these brand repos
// deploy on merge, this is the only automated guard against image re-bloat. Fix a
// failure by re-optimizing in place: `npm i -D sharp && npm run optimize:images -- --apply`
// (diagrams: `npm run optimize:diagrams -- --apply`).
import { IMAGE_BUDGET_KB } from '../scripts/imageBudgets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(root, 'public');
const HOMEPAGE_HERO_IMAGE_PATH = '/dan-mercede-founder-headshot-hero.webp';
const HOMEPAGE_HERO_BUDGET_KB = 700;

const BUDGET_KB: Record<string, number> = IMAGE_BUDGET_KB;

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
    `Oversized image asset(s). Re-encode rasters in place via \`npm i -D sharp && npm run optimize:images -- --apply\`; SVGs are not handled by the optimizer and must be reduced manually (e.g. svgo):\n  ${offenders.join('\n  ')}`,
  );
});

test('DEFAULT_OG_IMAGE_PATH resolves to a non-empty file inside public/', () => {
  const resolved = path.resolve(PUBLIC, DEFAULT_OG_IMAGE_PATH.replace(/^\//, ''));
  // Containment: a traversal value (e.g. "/../secret") must NOT satisfy the "in public/" contract.
  assert.ok(
    resolved === PUBLIC || resolved.startsWith(PUBLIC + path.sep),
    `DEFAULT_OG_IMAGE_PATH (${DEFAULT_OG_IMAGE_PATH}) must resolve inside public/ (resolved to ${resolved}).`,
  );
  let size = -1;
  try {
    size = statSync(resolved).size;
  } catch {
    /* missing → size stays -1 */
  }
  assert.ok(
    size > 0,
    `DEFAULT_OG_IMAGE_PATH (${DEFAULT_OG_IMAGE_PATH}) must exist and be non-empty in public/ (got ${size} bytes) — a renamed/removed OG card silently breaks social unfurls.`,
  );
});

test('homepage LCP hero uses the optimized committed asset', () => {
  const rel = HOMEPAGE_HERO_IMAGE_PATH.replace(/^\//, '');
  const resolved = path.join(PUBLIC, rel);
  const kb = statSync(resolved).size / 1024;

  assert.ok(
    kb <= HOMEPAGE_HERO_BUDGET_KB,
    `Homepage hero ${rel} must stay <= ${HOMEPAGE_HERO_BUDGET_KB}KB (got ${kb.toFixed(0)}KB).`,
  );

  const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8');
  const appSource = readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const seoSource = readFileSync(path.join(root, 'seoMeta.ts'), 'utf8');

  assert.match(indexHtml, new RegExp(`href="${HOMEPAGE_HERO_IMAGE_PATH}"`));
  assert.match(appSource, new RegExp(`src="${HOMEPAGE_HERO_IMAGE_PATH}"`));
  assert.match(seoSource, new RegExp(`href="${HOMEPAGE_HERO_IMAGE_PATH}"`));
});
