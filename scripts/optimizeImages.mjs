// Optimize brand image assets IN PLACE (same filename + format, zero reference breakage).
//   Photos:        resize to maxEdge 2048 + lossy re-encode.
//   Diagrams/logos: re-encode only, no resize (preserve crisp text/vector resolution).
// Shrink-only-adopt: a re-encode is written only if it is actually smaller, so re-running
// on already-optimized assets is a safe no-op.
//
// sharp is intentionally NOT a package.json dependency (it ships heavy native binaries and
// this is a rarely-run maintenance tool, not a site runtime/CI need). Install it on demand:
//     npm i -D sharp && npm run optimize:images -- --apply
// Usage: node scripts/optimizeImages.mjs [publicDir=public] [--apply]   (omit --apply for a dry run)
import { promises as fs } from 'node:fs';
import path from 'node:path';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error(
    'optimizeImages: sharp is not installed.\n' +
    'Run `npm i -D sharp` first (kept out of package.json to keep the site install/CI lean).'
  );
  process.exit(1);
}

const PUB = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'public';
const APPLY = process.argv.includes('--apply');
const MIN_BYTES = 300 * 1024;          // skip already-small assets
const MAX_EDGE = 2048;                  // photo cap (never upscale)
const SKIP = /favicon|apple-touch|android-chrome|og-card|mstile|safari-pinned/i;
const NO_RESIZE = /\/assets\/runtime-governance\/|diagram|Path-of-Light|OAC|logo|primary_white|stacked/i; // keep resolution

async function walk(dir) {
  let out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p));
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = await walk(PUB);
let totalBefore = 0, totalAfter = 0, changed = 0;
const rows = [];
for (const f of files.sort()) {
  const fp = f.split(path.sep).join('/'); // normalize separators so SKIP/NO_RESIZE path regexes work cross-OS
  if (SKIP.test(fp)) continue;
  const st = await fs.stat(f);
  if (st.size < MIN_BYTES) continue;
  const ext = path.extname(f).toLowerCase().replace('.', '').replace('jpeg', 'jpg');
  const meta = await sharp(f).metadata();
  const noResize = NO_RESIZE.test(fp);
  let pipe = sharp(f);
  if (!noResize) pipe = pipe.resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true });
  if (ext === 'png')  pipe = pipe.png({ quality: 90, effort: 8, dither: 1.0 });
  if (ext === 'webp') pipe = pipe.webp({ quality: 82 });
  if (ext === 'jpg')  pipe = pipe.jpeg({ quality: 82, mozjpeg: true });
  const buf = await pipe.toBuffer();
  totalBefore += st.size;
  // only adopt if it actually shrinks (guard against re-growing an already-optimized asset)
  if (buf.length < st.size) {
    totalAfter += buf.length; changed++;
    if (APPLY) await fs.writeFile(f, buf);
    rows.push(`  ${(st.size/1024).toFixed(0).padStart(6)}KB -> ${(buf.length/1024).toFixed(0).padStart(5)}KB  ${noResize ? '[no-resize]' : `${meta.width}x${meta.height}->max${MAX_EDGE}`}  ${path.relative(PUB, f)}`);
  } else {
    totalAfter += st.size;
    rows.push(`  ${(st.size/1024).toFixed(0).padStart(6)}KB    (kept; re-encode not smaller)  ${path.relative(PUB, f)}`);
  }
}
console.log(rows.join('\n'));
console.log(`\n  ${APPLY ? 'APPLIED' : 'DRY-RUN'}: ${changed} files, ${(totalBefore/1048576).toFixed(1)}MB -> ${(totalAfter/1048576).toFixed(1)}MB  (${totalBefore ? (100-100*totalAfter/totalBefore).toFixed(1) : '0.0'}% smaller)`);
