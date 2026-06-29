// Bring committed diagram binaries under the per-type image budget that
// tests/imageBudget.test.ts enforces, and keep them comfortably small.
//
// WHY THIS EXISTS — the weekly substrate-sync workflow regenerates the bundle and copies
// each admitted diagram's substrate binary into public/assets/diagrams/ VERBATIM
// (scripts/compileContent.ts copyDiagramAsset). The substrate originals are full-resolution
// exports; several exceed the 250KB jpg budget, so without an optimize step the sync PR
// ships oversized assets, tests/imageBudget.test.ts fails in CI, and the PR can never merge.
//
// WHAT IT DOES — for every raster diagram it picks the HIGHEST-quality rung on a fixed
// ladder whose re-encode lands within budget (re-encode at full resolution first, only
// downscaling when no full-res quality fits), and adopts that re-encode ONLY when it is
// strictly smaller than the file on disk (shrink-only — never grow an asset). Optimizing
// EVERY diagram (not only the over-budget ones) keeps near-budget originals from sitting one
// kilobyte from the cliff.
//
// FIXPOINT (and its boundary) — the weekly sync ALWAYS re-copies the raw substrate original
// (compileContent.ts copyDiagramAsset) BEFORE running this, then commits the result. Because
// the ladder is fixed and pinned sharp is byte-deterministic on the linux-x64 runner,
// optimize(raw_original) is stable, so the committed bytes (themselves optimize(raw_original))
// match what the next sync produces → no drift → no spurious weekly PR. That recompile-first
// ordering is load-bearing. CAVEAT: lossy re-encode is NOT idempotent against this script's
// OWN output — running the optimizer again on already-optimized files WITHOUT first recompiling
// from the raw original re-encodes them slightly smaller and adopts that. Always recompile
// (copy the raw originals) before optimizing; never double-run on committed output.
//
// vs scripts/optimizeImages.mjs — that is the general brand-asset optimizer: a 300KB
// MIN_BYTES floor and NO_RESIZE for diagrams. Those rules are wrong for budget ENFORCEMENT:
// the floor skips a 262KB-over-250KB diagram, and no-resize cannot rescue a detail-heavy
// export that overflows the budget at any quality. This script is budget-driven instead:
// no floor, resize-when-required, guarantee ≤budget or fail loud.
//
// sharp is intentionally NOT a package.json dependency (heavy native binaries; not a site
// runtime/CI need). Install on demand:
//     npm i -D sharp && node scripts/optimizeDiagrams.mjs --apply
// Usage: node scripts/optimizeDiagrams.mjs [--apply] [--dir <publicDir=public/assets/diagrams>]
//   omit --apply for a dry run (reports what WOULD change, exit 0).
// Exit codes: 0 ok · 1 sharp missing / bad target · 2 an OVER-budget diagram could NOT be
//   brought under budget at the smallest ladder rung (fail loud — never leave an oversized
//   asset silently un-fixed).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { budgetKbFor } from './imageBudgets.mjs';

// Raster types this optimizer can re-encode. SVG carries a budget too, but it is a vector
// (sharp cannot meaningfully shrink it to a byte target) — an oversized SVG is reported,
// never silently rewritten.
const CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Fixed encode ladder, tried in order; the FIRST rung whose output is within budget wins
// (highest quality that fits). Ordered to preserve quality/resolution maximally: keep full
// resolution at descending quality first, and only downscale for detail-heavy exports that
// overflow at any full-res quality. The display surface is ~896px wide, so the resize FLOOR is
// 1600px (≈1.8× retina): if even 1600px at q74 will not fit budget, the script fails loud
// (exit 2) rather than SILENTLY shipping a sub-retina, over-compressed diagram that still
// passes the size-only budget gate. Tune the encode policy here only.
const LADDER = [
  { maxEdge: null, quality: 82 },
  { maxEdge: null, quality: 76 },
  { maxEdge: 2048, quality: 80 },
  { maxEdge: 1800, quality: 80 },
  { maxEdge: 1800, quality: 74 },
  { maxEdge: 1600, quality: 74 },
];

// Pure, sharp-free: should this file be CONSIDERED for re-encoding at all? Decided by type
// only — no MIN_BYTES floor (the bug in the general optimizer), vector excluded. Whether a
// candidate re-encode is actually written is a separate size decision (chooseAdoption).
export function planDiagramOptimize({ ext }) {
  const budgetKb = budgetKbFor(ext);
  if (budgetKb == null) return { action: 'skip', reason: 'unbudgeted-type' };
  if (!CONVERTIBLE.has(String(ext).toLowerCase())) return { action: 'skip', reason: 'not-raster' };
  return { action: 'optimize', budgetKb };
}

// Pure, sharp-free: adopt a candidate re-encode iff it fits the budget AND is strictly
// smaller than what is on disk. Shrink-only: an already-smaller (or already-optimal) asset is
// never grown, which is what makes a repeat run idempotent.
export function chooseAdoption({ currentBytes, candidateBytes, budgetBytes }) {
  return candidateBytes <= budgetBytes && candidateBytes < currentBytes;
}

// Encode `file` with sharp at one ladder rung; returns the encoded Buffer.
async function encodeRung(sharp, file, ext, rung) {
  let pipe = sharp(file, { failOn: 'error' });
  if (rung.maxEdge != null) {
    pipe = pipe.resize(rung.maxEdge, rung.maxEdge, { fit: 'inside', withoutEnlargement: true });
  }
  if (ext === '.png') return pipe.png({ quality: rung.quality, effort: 9, compressionLevel: 9, palette: true }).toBuffer();
  if (ext === '.webp') return pipe.webp({ quality: rung.quality }).toBuffer();
  return pipe.jpeg({ quality: rung.quality, mozjpeg: true }).toBuffer(); // .jpg / .jpeg
}

async function walk(dir) {
  let out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p));
    else out.push(p);
  }
  return out;
}

// Atomic, validated in-place replace (same pattern as optimizeImages.mjs): write a sibling
// temp, decode it back to confirm valid image bytes, then rename over the original. A
// partial/corrupt write never lands at the still-referenced filename, and the size-only
// budget gate cannot catch a corrupt-but-nonzero file, so the decode check is load-bearing.
async function atomicReplace(sharp, file, buf) {
  const tmp = `${file}.optdiag-${process.pid}.tmp`;
  try {
    await fs.writeFile(tmp, buf);
    await sharp(tmp).metadata();
    await fs.rename(tmp, file);
  } catch (e) {
    await fs.rm(tmp, { force: true });
    throw e;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const dirIdx = argv.indexOf('--dir');
  const dir = dirIdx >= 0 && argv[dirIdx + 1] ? argv[dirIdx + 1] : path.join('public', 'assets', 'diagrams');

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error(
      'optimizeDiagrams: sharp is not installed.\n' +
      'Run `npm i -D sharp` first (kept out of package.json to keep the site install/CI lean).',
    );
    process.exit(1);
  }

  try {
    if (!(await fs.stat(dir)).isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`optimizeDiagrams: target is not a readable directory: ${dir}`);
    process.exit(1);
  }

  const files = (await walk(dir)).sort();
  const rows = [];
  let changed = 0;
  const failures = [];

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const st = await fs.stat(f);
    const plan = planDiagramOptimize({ ext });
    if (plan.action === 'skip') {
      if (plan.reason === 'not-raster') {
        // Vector (SVG): this optimizer cannot re-encode a vector to a byte target. It still
        // carries a budget, so if a re-exported SVG exceeds it, FAIL LOUD here (with svgo
        // guidance) — otherwise it surfaces later as a confusing imageBudget red in the opened
        // sync PR, attributed to the wrong step.
        const budgetKb = budgetKbFor(ext);
        if (budgetKb != null && st.size > budgetKb * 1024) {
          failures.push(`${path.relative(dir, f)} (${(st.size / 1024).toFixed(0)}KB) is a VECTOR over its ${budgetKb}KB budget — reduce it manually with svgo (this optimizer cannot shrink a vector to a byte target)`);
        } else {
          rows.push(`  ${(st.size / 1024).toFixed(0).padStart(6)}KB  [keep: ${plan.reason}]  ${path.relative(dir, f)}`);
        }
      }
      continue;
    }

    const budgetBytes = plan.budgetKb * 1024;
    // Highest-quality rung whose re-encode lands within budget.
    let chosen = null;
    for (const rung of LADDER) {
      const buf = await encodeRung(sharp, f, ext, rung);
      if (buf.length <= budgetBytes) { chosen = { buf, rung }; break; }
    }

    if (!chosen) {
      // No rung fits the budget. Only a FAILURE if the file on disk is itself over budget
      // (we genuinely cannot ship it); an already-within-budget file that simply will not
      // compress further is fine to keep.
      if (st.size > budgetBytes) {
        failures.push(`${path.relative(dir, f)} (${(st.size / 1024).toFixed(0)}KB) could not reach ${plan.budgetKb}KB at the smallest ladder rung`);
      } else {
        rows.push(`  ${(st.size / 1024).toFixed(0).padStart(6)}KB  [keep: already within budget, no smaller in-budget re-encode]  ${path.relative(dir, f)}`);
      }
      continue;
    }

    if (!chooseAdoption({ currentBytes: st.size, candidateBytes: chosen.buf.length, budgetBytes })) {
      rows.push(`  ${(st.size / 1024).toFixed(0).padStart(6)}KB  [keep: on-disk already <= in-budget re-encode]  ${path.relative(dir, f)}`);
      continue;
    }

    const meta = await sharp(chosen.buf).metadata();
    const res = chosen.rung.maxEdge == null ? 'full-res' : `max${chosen.rung.maxEdge}->${meta.width}x${meta.height}`;
    rows.push(
      `  ${(st.size / 1024).toFixed(0).padStart(6)}KB -> ${(chosen.buf.length / 1024).toFixed(0).padStart(5)}KB` +
      `  [q${chosen.rung.quality} ${res}]  ${path.relative(dir, f)}`,
    );
    changed++;
    if (apply) await atomicReplace(sharp, f, chosen.buf);
  }

  if (rows.length) console.log(rows.join('\n'));
  console.log(`\n  ${apply ? 'APPLIED' : 'DRY-RUN'}: ${changed} diagram(s) re-encoded; ${files.length} file(s) scanned.`);

  if (failures.length) {
    console.error('\noptimizeDiagrams: FAILED to fit budget (would ship oversized assets):\n  ' + failures.join('\n  '));
    process.exit(2);
  }
}

// Run only as a CLI; importing the module (the unit test) must not execute main().
// pathToFileURL encodes the argv path the same way import.meta.url is encoded, so the
// comparison stays correct even when the script path contains spaces or other URL-special
// characters (a raw `file://${argv}` would mismatch on those).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
