import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDiagramOptimize, chooseAdoption } from '../scripts/optimizeDiagrams.mjs';
import { IMAGE_BUDGET_KB, budgetKbFor } from '../scripts/imageBudgets.mjs';

const KB = 1024;

test('shared budget module is the single source the imageBudget gate enforces', () => {
  // If these drift, the optimizer would target a different number than the CI gate checks.
  assert.equal(IMAGE_BUDGET_KB['.jpg'], 250);
  assert.equal(IMAGE_BUDGET_KB['.jpeg'], 250);
  assert.equal(IMAGE_BUDGET_KB['.png'], 2800);
  assert.equal(IMAGE_BUDGET_KB['.webp'], 1300);
  assert.equal(IMAGE_BUDGET_KB['.svg'], 5000);
  assert.equal(budgetKbFor('.JPG'), 250); // case-insensitive
  assert.equal(budgetKbFor('.gif'), null); // unbudgeted
});

// --- planDiagramOptimize: which files are CONSIDERED for re-encode (type only, no floor) ---

test('every raster diagram type is considered for re-encoding (no MIN_BYTES floor)', () => {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    assert.equal(planDiagramOptimize({ ext }).action, 'optimize', `${ext} should be considered`);
  }
});

test('an over-budget svg is NOT rewritten (vector — cannot byte-shrink with sharp)', () => {
  const plan = planDiagramOptimize({ ext: '.svg' });
  assert.equal(plan.action, 'skip');
  assert.equal(plan.reason, 'not-raster');
});

test('an unbudgeted extension is skipped', () => {
  const plan = planDiagramOptimize({ ext: '.txt' });
  assert.equal(plan.action, 'skip');
  assert.equal(plan.reason, 'unbudgeted-type');
});

// --- chooseAdoption: shrink-only-adopt (fits budget AND strictly smaller than on disk) ---

test('REGRESSION: a 260KB jpg (over budget, under the old 300KB floor) IS shrunk when the re-encode fits', () => {
  // The exact gap that let the general optimizer leave a diagram oversized: its 300KB floor
  // skipped sub-300KB-but-over-budget assets. Here a 260KB original with a 180KB in-budget
  // re-encode must be adopted.
  assert.equal(chooseAdoption({ currentBytes: 260 * KB, candidateBytes: 180 * KB, budgetBytes: 250 * KB }), true);
});

test('an over-budget original is adopted once a re-encode fits budget', () => {
  assert.equal(chooseAdoption({ currentBytes: 647 * KB, candidateBytes: 240 * KB, budgetBytes: 250 * KB }), true);
});

test('a within-budget file is NOT grown by a larger re-encode (shrink-only)', () => {
  // e.g. an already-optimized 156KB asset whose q82 re-encode comes back at 160KB → keep.
  // NOTE: this is the size-decision only; a smaller lossy re-encode WOULD be adopted (the
  // pipeline is a fixpoint only because the sync recompiles from the raw original first —
  // see optimizeDiagrams.mjs header). The optimizer is not idempotent against its own output.
  assert.equal(chooseAdoption({ currentBytes: 156 * KB, candidateBytes: 160 * KB, budgetBytes: 250 * KB }), false);
});

test('a within-budget file that re-encodes smaller IS shrunk (keeps near-budget originals small)', () => {
  // 248KB original (2KB under the cliff) with a 156KB in-budget re-encode → adopt.
  assert.equal(chooseAdoption({ currentBytes: 248 * KB, candidateBytes: 156 * KB, budgetBytes: 250 * KB }), true);
});

test('a candidate that does not fit budget is never adopted, even if smaller than on disk', () => {
  // current 400KB, candidate 300KB (smaller) but still over the 250KB budget → reject.
  assert.equal(chooseAdoption({ currentBytes: 400 * KB, candidateBytes: 300 * KB, budgetBytes: 250 * KB }), false);
});

test('an equal-size re-encode is not adopted (strictly-smaller only)', () => {
  assert.equal(chooseAdoption({ currentBytes: 200 * KB, candidateBytes: 200 * KB, budgetBytes: 250 * KB }), false);
});
