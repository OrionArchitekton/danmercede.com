// /thoughts index derivations: the search predicate and the view selector.
//
// These live here rather than in `constants.ts` because AGENTS.md keeps that file
// for static site constants only. They are also deliberately NOT inline in
// ThoughtsPage: this repo has no React test harness (see tests/routeCoverage.test.ts),
// so a predicate left in the page component would ship with zero coverage. An
// adversarial reviewer demonstrated the cost of that gap concretely, replacing the
// query argument at the call site with a constant left the whole search feature a
// no-op while every test stayed green.
//
// Exercised at the existing `thoughtLanes` test seam, which also source-asserts the
// ThoughtsPage call sites so the wiring itself cannot silently drift.

import type { Thought } from './types';

// Search corpus for one thought. Deliberately EXCLUDES `body`: every hit must be
// explainable by text the card itself renders (title, category badge, preview), so a
// reader is never shown a result whose match is invisible. Widening this to include
// `body` costs no payload (bodies already ship in the bundle) but would need result
// highlighting to stay honest.
export const thoughtSearchText = (thought: Thought): string =>
  [thought.title, thought.category, thought.preview].join(' ').toLowerCase();

export const thoughtMatchesQuery = (thought: Thought, rawQuery: string): boolean => {
  const needle = rawQuery.trim().toLowerCase();
  if (!needle) return true;
  return thoughtSearchText(thought).includes(needle);
};

// The index result set: category AND query composed. Extracting the COMPOSITION
// (not just the single-thought predicate) is what makes "neither filter is ignored"
// assertable.
export const selectThoughts = (
  thoughts: readonly Thought[],
  activeCategory: string,
  rawQuery: string,
): Thought[] =>
  thoughts.filter(
    (thought) =>
      (activeCategory === 'all' || thought.category === activeCategory) &&
      thoughtMatchesQuery(thought, rawQuery),
  );

// True when the index shows the lane-grouped operating-journal view (AGENTS.md
// /thoughts doctrine + the lanes spec): the default, and ONLY when neither the
// category filter nor the search query is narrowing the corpus.
export const isLaneGroupedThoughtsView = (activeCategory: string, rawQuery: string): boolean =>
  activeCategory === 'all' && !rawQuery.trim();
