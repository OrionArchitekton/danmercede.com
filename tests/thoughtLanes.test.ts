import test from 'node:test';
import assert from 'node:assert/strict';
import { THOUGHT_LANES, THOUGHTS } from '../constants';
import type { Thought } from '../types';

// Guard the hub-side /thoughts lane curation (THOUGHT_LANES). Lanes hard-code
// substrate-generated slugs; if a slug is renamed or removed in substrate, a curated
// lane would SILENTLY lose the essay (it falls into the default lane with no error and
// no dangling link). That silent misclassification is exactly what this CI guard turns
// loud, mirroring the fail-loud FEATURED_ESSAY_SLUGS contract in worksHub.test.ts.

test('every curated THOUGHT_LANES slug resolves to a real THOUGHTS entry (no silent misclassification)', () => {
  const known = new Set(THOUGHTS.map((t: Thought) => t.slug));
  const missing: string[] = [];
  for (const lane of THOUGHT_LANES) {
    if (lane.isDefault) continue;
    for (const slug of lane.slugs ?? []) {
      if (!known.has(slug)) missing.push(`${lane.name} -> ${slug}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `THOUGHT_LANES references slugs absent from THOUGHTS; they would silently fall into the ` +
      `default lane instead of their curated lane. Update the lane slug(s): ${missing.join(', ')}`,
  );
});

test('THOUGHT_LANES has exactly one default (catch-all) lane', () => {
  const defaults = THOUGHT_LANES.filter((l) => l.isDefault);
  assert.equal(
    defaults.length,
    1,
    'exactly one lane must be the default catch-all so every unclaimed essay is placed (never dropped)',
  );
});

test('no slug is claimed by more than one curated lane (each essay lands in one lane)', () => {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const lane of THOUGHT_LANES) {
    if (lane.isDefault) continue;
    for (const slug of lane.slugs ?? []) {
      if (seen.has(slug)) dupes.push(`${slug} in ${seen.get(slug)} and ${lane.name}`);
      else seen.set(slug, lane.name);
    }
  }
  assert.deepEqual(dupes, [], `slugs claimed by multiple lanes: ${dupes.join(', ')}`);
});
