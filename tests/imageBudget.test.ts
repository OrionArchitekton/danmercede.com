import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OG_IMAGE_PATH } from '../seoMeta';
// Per-type byte budgets (KB) live in a shared module so the diagram optimizer
// (scripts/optimizeDiagrams.mjs) targets EXACTLY what this gate enforces — they can
// never drift. Set with headroom above the current committed maxima (png ~2.47MB,
// webp ~1.1MB, og/jpg ~118KB, substrate-synced diagram SVG ~4.2MB; the /proof SVGs carry
// their own tighter budget below). The point: a future commit that
// re-introduces an unoptimized multi-MB original fails CI here. Since these brand repos
// deploy on merge, this is the only automated guard against image re-bloat. Fix a
// failure by re-optimizing in place: `npm i -D sharp && npm run optimize:images -- --apply`
// (diagrams: `npm run optimize:diagrams -- --apply`).
import { IMAGE_BUDGET_KB } from '../scripts/imageBudgets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(root, 'public');
const HOMEPAGE_HERO_IMAGE_PATH = '/dan-mercede-founder-headshot-hero.webp';
const HOMEPAGE_HERO_BUDGET_KB = 700;

// /proof signature diagrams: hand-committed SVGs that wrap one full-resolution raster
// (base64 <image>). The control-plane one shipped at ~4.1MB because it embedded a lossless
// PNG; re-encoded as WebP q95 it is ~0.57MB. The generic '.svg' budget above cannot guard
// this: it must stay high for the substrate-synced copies in assets/diagrams/ (copied
// verbatim by the weekly sync, so the hub cannot shrink them). Fix a failure by
// re-encoding the embedded raster, not with svgo (svgo does not recompress base64 images).
const PROOF_SVG_DIR = path.join(PUBLIC, 'assets', 'runtime-governance');
const PROOF_SVG_BUDGET_KB = 1024;
const PROOF_SVG_MIN_COUNT = 3; // control-plane, gated-execution, economics-scorecard

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

const proofSvgs = () =>
  walk(PROOF_SVG_DIR).filter((f) => path.extname(f).toLowerCase() === '.svg').sort();

test('/proof raster-wrapper SVGs stay under the proof-diagram budget', () => {
  const files = proofSvgs();
  // Positive evidence: an empty or moved directory must not pass vacuously.
  assert.ok(
    files.length >= PROOF_SVG_MIN_COUNT,
    `expected >= ${PROOF_SVG_MIN_COUNT} proof SVGs under ${path.relative(root, PROOF_SVG_DIR)}, found ${files.length}`,
  );
  const offenders = files
    .map((f) => ({ f, kb: statSync(f).size / 1024 }))
    .filter(({ kb }) => kb > PROOF_SVG_BUDGET_KB)
    .map(({ f, kb }) => `${path.relative(PUBLIC, f)} = ${kb.toFixed(0)}KB > ${PROOF_SVG_BUDGET_KB}KB`);
  assert.deepEqual(
    offenders,
    [],
    `Oversized /proof SVG(s). Re-encode the embedded base64 raster (e.g. WebP q95), keep the file path:\n  ${offenders.join('\n  ')}`,
  );
});

test('/proof SVG embedded rasters match their declared type and are not truncated', () => {
  const MAGIC: Record<string, (b: Buffer) => boolean> = {
    png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b.at(-2) === 0xff && b.at(-1) === 0xd9,
    // RIFF container: bytes 4..8 carry (file length - 8), so a truncated payload fails here.
    webp: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP' &&
      b.readUInt32LE(4) + 8 === b.length,
  };
  for (const f of proofSvgs()) {
    const rel = path.relative(PUBLIC, f);
    const embeds = [...readFileSync(f, 'utf8').matchAll(/data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)/g)];
    for (const [, type, payload] of embeds) {
      const check = MAGIC[type];
      assert.ok(check, `${rel}: unexpected embedded image type image/${type}`);
      assert.ok(check(Buffer.from(payload, 'base64')), `${rel}: embedded image/${type} payload is malformed or truncated`);
    }
  }
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
