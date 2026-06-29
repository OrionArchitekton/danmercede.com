---
verified: 2026-06-29
review_after: 2026-09-29
topics: [diagrams, image-budget, substrate-sync, optimize, sharp, imageBudget, ci, danmercede.com, deploy-truth, fixpoint]
references:
  - scripts/optimizeDiagrams.mjs
  - scripts/imageBudgets.mjs
  - scripts/compileContent.ts
  - tests/imageBudget.test.ts
  - tests/optimizeDiagrams.test.ts
  - .github/workflows/substrate-sync.yml
  - public/assets/diagrams
---

# Runbook — Diagram asset optimize-in-pipeline (danmercede.com)

## TL;DR

Diagram binaries land in `public/assets/diagrams/<slug>.<ext>` VERBATIM from the substrate
(`compileContent.ts` `copyDiagramAsset` does a raw `copyFileSync`). The substrate originals
are full-resolution exports and several exceed the per-type image budget that CI enforces
(`tests/imageBudget.test.ts` — `jpg<=250KB`, `png<=2800KB`, `webp<=1300KB`, `svg<=5000KB`).
`scripts/optimizeDiagrams.mjs` re-encodes them to budget. The weekly **substrate-sync**
workflow runs it automatically, so the auto-opened refresh PR ships within-budget assets and
passes CI. Run it by hand after any local diagram regen.

## Why it exists

`.com` is **committed-bundle-as-deploy-truth** — Vercel never compiles; it serves the
committed `constants.generated.ts` + `public/`. The only automated guard against image
re-bloat is `imageBudget` in `ci.yml`'s `npm test`. The weekly `substrate-sync` regenerates
the bundle and re-copies the substrate diagram originals; without an optimize step those
oversized originals fail `imageBudget`, so the sync PR is red and can never merge. This is the
durable fix for that (S5).

## The optimizer

`node scripts/optimizeDiagrams.mjs [--apply] [--dir <dir=public/assets/diagrams>]`

- Targets the per-type budgets from the single source `scripts/imageBudgets.mjs` (the SAME
  module `tests/imageBudget.test.ts` imports — they cannot drift).
- For every raster diagram (`.jpg/.jpeg/.png/.webp`) it picks the highest-quality rung on a
  fixed ladder whose re-encode fits budget (full resolution first; downscale to 1800px / lower
  quality only when no full-res quality fits), and adopts it only if **strictly smaller** than
  the file on disk (shrink-only — never grows an asset). SVGs carry a budget but are vectors:
  reported, never rewritten (reduce manually with `svgo` if one ever exceeds 5000KB).
- **Deterministic fixpoint (and its boundary):** `optimize(raw_original)` is byte-stable on the
  pinned linux-x64 sharp, and the weekly sync ALWAYS re-copies the raw substrate original
  BEFORE optimizing — so the committed assets (themselves `optimize(raw_original)`) match what
  the next sync produces and a sync with no real substrate change opens NO diff. That
  recompile-first ordering is load-bearing. **CAVEAT:** lossy re-encode is NOT idempotent against
  the script's own output — running `optimize:diagrams --apply` again on already-optimized files
  WITHOUT first recompiling from the raw original shrinks them slightly further. Always recompile
  before optimizing; never double-run on committed output.
- **Resolution floor:** the ladder will not downscale below 1600px (≈1.8× the ~896px display). A
  detail-heavy export that cannot fit budget at ≥1600px fails LOUD (exit 2) rather than silently
  shipping a sub-retina, over-compressed diagram that still passes the size-only budget gate.
- **SVG:** vectors carry a budget but cannot be re-encoded to a byte target; an over-budget SVG
  fails LOUD at the optimize step with svgo guidance (not a confusing later imageBudget red).
- Writes atomically (temp + decode-validate + rename); a partial/corrupt write never lands at
  the served filename.
- **Exit codes:** `0` ok · `1` sharp missing / bad target · `2` an over-budget raster could not
  be fit at the resolution floor, or an over-budget SVG was found (fails the sync job LOUD
  rather than shipping an oversized/over-compressed asset).

`sharp` is intentionally NOT a `package.json` dependency (heavy native binaries; no site
runtime/CI need). Install on demand: `npm i -D sharp` (the sync workflow pins `sharp@0.34.4`
with `--no-save` so the encode is deterministic and the manifest/lockfile stay clean).

## Automated path (weekly substrate-sync)

`.github/workflows/substrate-sync.yml` step **"Optimize diagram assets to image budget"** runs
after the strict compile and before the drift diff:

```
npm i -D sharp@0.34.4 --no-save
node scripts/optimizeDiagrams.mjs --apply
```

The drift diff (`git status --porcelain -- constants.generated.ts public/assets/diagrams`) then
sees the optimized bytes, and the opened PR stages them via `add-paths`.

## Operator path (after a local diagram regen)

When you regenerate the bundle locally WITH substrate access (e.g. promoting a net-new diagram):

```
SUBSTRATE_PATH=<dan-mercede-substrate> TZ=America/Los_Angeles npm run compile   # copies originals + regen bundle
npm i -D sharp && npm run optimize:diagrams -- --apply                          # re-encode to budget
npm test                                                                        # imageBudget must pass
```

Commit `constants.generated.ts` + the changed `public/assets/diagrams/*` together (the
`<img src>` and the file must stay consistent). Do NOT commit `sharp` into `package.json`.

## Validation

- `npm test` — `imageBudget` (no committed asset over budget) + `optimizeDiagrams` (decision /
  shrink-only adopt logic, sharp-free) both pass.
- Fixpoint: re-run `npm run compile` (re-copies originals) then `optimize:diagrams --apply`; the
  diagram binaries must be byte-identical (no diff) — proves the next sync is a clean no-op.

## Rollback

The optimizer is additive tooling + one workflow step. Revert the PR to restore prior behavior;
the committed (already-optimized) binaries are unaffected by a revert. If a future encode
regresses quality, tune the `LADDER` in `scripts/optimizeDiagrams.mjs` (quality/resolution
rungs) and re-run; the budget numbers themselves live in `scripts/imageBudgets.mjs`.

## Related

The diagram route-family + per-route SEO canonical lives in `seoMeta.ts` (diagramMeta /
diagramPaths / renderDiagramSitemapEntries) and `scripts/injectRouteMeta.ts`. The 21 diagram
bundle entries are emitted by `compileContent.ts` only when their slug is in
`HUB_DIAGRAM_ALLOWLIST` AND the substrate canonical is present — a local build WITHOUT
`SUBSTRATE_PATH` drops them (the bundle is committed-as-truth, so always regen WITH substrate).
