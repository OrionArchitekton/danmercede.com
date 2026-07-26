import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { THOUGHT_LANES, THOUGHTS, thoughtMatchesQuery, thoughtSearchText, selectThoughts, isLaneGroupedThoughtsView } from '../constants';
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

// ---------------------------------------------------------------------------
// Index COMPOSITION (category x query) and the call-site wiring.
//
// An adversarial reviewer proved the gap these close: with only the
// single-thought predicate tested, `thoughtMatchesQuery(t, query)` in
// ThoughtsPage could be replaced by `thoughtMatchesQuery(t, '')` and the whole
// search feature became a no-op with every test still green. The predicate was
// covered; the WIRING was not.
// ---------------------------------------------------------------------------

test('selectThoughts: no category and no query returns the whole corpus', () => {
  assert.equal(selectThoughts(THOUGHTS, 'all', '').length, THOUGHTS.length);
  assert.equal(selectThoughts(THOUGHTS, 'all', '   ').length, THOUGHTS.length);
});

test('selectThoughts: a query narrows the corpus and every hit is explainable', () => {
  const sample = THOUGHTS[0];
  const word = sample.title.split(/\s+/).find((w) => w.length > 4)!;
  const hits = selectThoughts(THOUGHTS, 'all', word);
  assert.ok(hits.length > 0, 'expected at least one hit');
  assert.ok(hits.length < THOUGHTS.length, 'a real query must actually narrow the corpus');
  assert.ok(hits.some((h) => h.slug === sample.slug), 'the essay the term came from must be a hit');
  for (const h of hits) {
    assert.ok(thoughtSearchText(h).includes(word.toLowerCase()), `${h.slug} matched invisibly`);
  }
});

test('selectThoughts: category and query COMPOSE (neither is ignored)', () => {
  const sample = THOUGHTS[0];
  const word = sample.title.split(/\s+/).find((w) => w.length > 4)!;
  const other = THOUGHTS.find((t) => t.category !== sample.category);
  assert.ok(other, 'expected at least two categories in the corpus');

  // Same query, restricted to a category the matching essay is NOT in.
  const crossed = selectThoughts(THOUGHTS, other!.category, word);
  assert.ok(
    !crossed.some((t) => t.slug === sample.slug),
    'category must still constrain when a query is active',
  );
  for (const t of crossed) {
    assert.equal(t.category, other!.category, 'query must not smuggle in other categories');
  }

  // Same category, with a query that matches nothing: category alone must not win.
  assert.equal(selectThoughts(THOUGHTS, sample.category, 'zzzznotarealtermzzzz').length, 0);
});

test('isLaneGroupedThoughtsView: true ONLY when neither filter is narrowing', () => {
  assert.equal(isLaneGroupedThoughtsView('all', ''), true);
  assert.equal(isLaneGroupedThoughtsView('all', '   '), true);
  assert.equal(isLaneGroupedThoughtsView('all', 'gov'), false);
  assert.equal(isLaneGroupedThoughtsView('Architecture', ''), false);
  assert.equal(isLaneGroupedThoughtsView('Architecture', 'gov'), false);
});

test('ThoughtsPage wires the live query/category STATE into both derivations', () => {
  // No React harness in this repo, so the call site is pinned at the source level
  // (same technique as the /guides hero tile guard). This is what stops the
  // predicate being called with a constant while the unit tests stay green.
  const appSource = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'App.tsx'),
    'utf8',
  );
  assert.match(
    appSource,
    /const\s+matchingThoughts\s*=\s*selectThoughts\(\s*THOUGHTS\s*,\s*activeCategory\s*,\s*query\s*\)/,
    'the rendered grid must be derived from selectThoughts(THOUGHTS, activeCategory, query)',
  );
  assert.match(
    appSource,
    /const\s+isLaneGroupedView\s*=\s*isLaneGroupedThoughtsView\(\s*activeCategory\s*,\s*query\s*\)/,
    'the lane-grouped branch must be derived from isLaneGroupedThoughtsView(activeCategory, query)',
  );
});
