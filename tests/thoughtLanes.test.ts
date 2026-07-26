import test from 'node:test';
import assert from 'node:assert/strict';
import { THOUGHT_LANES, THOUGHTS, thoughtMatchesQuery, thoughtSearchText } from '../constants';
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

// ---------------------------------------------------------------------------
// /thoughts index search.
//
// The predicate lives in constants.ts (not inline in ThoughtsPage) precisely so
// it is testable: this repo has no React harness, so a predicate left in the page
// component would ship with zero coverage. These tests pin the CONTRACT the index
// relies on, most importantly that an empty query is identity: that is what keeps
// the lane-grouped default view (AGENTS.md /thoughts doctrine + the lanes spec)
// reachable and unchanged.
// ---------------------------------------------------------------------------

test('an empty or whitespace-only query matches every essay (identity)', () => {
  for (const q of ['', '   ', '\t', '\n']) {
    for (const thought of THOUGHTS) {
      assert.ok(
        thoughtMatchesQuery(thought, q),
        `query ${JSON.stringify(q)} must not filter out ${thought.slug}`,
      );
    }
  }
});

test('search is case-insensitive and matches title, category, and preview', () => {
  const sample = THOUGHTS[0];

  const titleWord = sample.title.split(/\s+/).find((w) => w.length > 4);
  assert.ok(titleWord, 'expected a usable word in the newest essay title');
  assert.ok(thoughtMatchesQuery(sample, titleWord!.toUpperCase()), 'title match must be case-insensitive');
  assert.ok(thoughtMatchesQuery(sample, titleWord!.toLowerCase()), 'title match must be case-insensitive');

  assert.ok(thoughtMatchesQuery(sample, sample.category.toLowerCase()), 'category must be searchable');

  const previewWord = sample.preview.split(/\s+/).find((w) => w.length > 5);
  assert.ok(previewWord, 'expected a usable word in the newest essay preview');
  assert.ok(thoughtMatchesQuery(sample, previewWord!), 'preview must be searchable');
});

test('surrounding whitespace in a query is ignored', () => {
  const sample = THOUGHTS[0];
  const word = sample.title.split(/\s+/).find((w) => w.length > 4)!;
  assert.equal(thoughtMatchesQuery(sample, `  ${word}  `), thoughtMatchesQuery(sample, word));
});

test('search does NOT match on body text the card never renders', () => {
  // Guards the deliberate scope choice in constants.ts thoughtSearchText: a result
  // whose match is invisible on the card is a result the reader cannot explain.
  // If body search is ever adopted, this test should be replaced by a highlighting
  // contract, not silently deleted.
  for (const thought of THOUGHTS) {
    assert.equal(
      thoughtSearchText(thought),
      [thought.title, thought.category, thought.preview].join(' ').toLowerCase(),
      `search text for ${thought.slug} must be exactly title + category + preview`,
    );
  }

  // And prove the exclusion bites on real data: a phrase drawn from deep inside a
  // body must not be findable, or this contract is vacuous.
  const long = THOUGHTS.find((t) => t.body.length > 800);
  assert.ok(long, 'expected at least one substantial essay body to test against');
  const deepPhrase = long!.body.slice(600, 640).trim();
  assert.ok(deepPhrase.length > 20, 'expected a usable body phrase');
  assert.equal(
    thoughtMatchesQuery(long!, deepPhrase),
    false,
    'a phrase that appears only in the body must not produce a search hit',
  );
});

test('a query with no corpus match filters everything out (empty-state is reachable)', () => {
  const nonsense = 'zzzznotarealtermzzzz';
  const hits = THOUGHTS.filter((t) => thoughtMatchesQuery(t, nonsense));
  assert.equal(hits.length, 0, 'the zero-results branch must be reachable');
});
