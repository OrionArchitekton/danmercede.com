// Single source of truth for per-type committed-image byte budgets (KB).
//
// Imported by BOTH:
//   - tests/imageBudget.test.ts  — the CI gate that fails a PR carrying an oversized asset
//   - scripts/optimizeDiagrams.mjs — the producer that re-encodes diagram binaries to fit
//
// Keeping the numbers here (not duplicated in each consumer) means the optimizer always
// targets EXACTLY what the test enforces — they can never silently drift, which is the
// failure mode that lets a "fixed" asset still trip the budget gate.
//
// Plain .mjs (not .ts/.json) so `node` (the optimizer) and `tsx` (the test) both import it
// natively with no loader. KB, not bytes, to match the human-facing budget table.

export const IMAGE_BUDGET_KB = Object.freeze({
  '.jpg': 250,
  '.jpeg': 250,
  '.png': 2800,
  '.webp': 1300,
  '.svg': 5000,
});

// Budget (KB) for a file by extension, case-insensitive. null for unbudgeted types.
export function budgetKbFor(ext) {
  if (typeof ext !== 'string') return null;
  const key = ext.toLowerCase();
  return Object.prototype.hasOwnProperty.call(IMAGE_BUDGET_KB, key) ? IMAGE_BUDGET_KB[key] : null;
}
