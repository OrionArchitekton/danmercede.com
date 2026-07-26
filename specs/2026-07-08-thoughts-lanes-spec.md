# Spec: /thoughts lane grouping

**Feature:** the /thoughts index presents the essay corpus as a curated operating journal, grouped into lanes.
**Status:** shipped 2026-07-08 (top-funnel reposition, STEP-2 PR-C).
**Domain terms:** *lane* (a hub-side editorial grouping of essays: Operator Notes, Governed AI, Workflow Ownership, Public Signals, Archive); *category badge* (the substrate-derived per-essay label, Architecture / Enforcement / Doctrine, shown on each card and left unchanged).

## Why

/thoughts is Dan's public operating journal and authority archive, not a sales blog. The
redesign is classification, framing, ordering, and routing, never a rewrite of the essay
voice or bodies. Every existing post is kept.

## Scenarios

- **A reader landing on /thoughts** sees an intro that frames the page as notes from the
  operating layer, plus a subtle routing line to OIA for strategy/implementation help.
- **Essays are grouped into lanes** in a curated order. Each essay keeps its substrate
  category badge; the lane is an orthogonal editorial grouping.
- **The Governed AI lane is the default:** any essay not explicitly placed in another lane
  appears here, so no post is ever dropped.
- **Operator Notes and Archive** are hand-curated by slug (business/work-pattern essays;
  and the former enterprise-runtime hero thesis, respectively).
- **Workflow Ownership** ships empty by design, with a note that new essays are landing and
  a pointer to work with OIA. It is the bridge into the commercial lane.
- **Public Signals** ships empty in /thoughts and routes to danmercede.online, where the
  raw shorter working notes live.
- **The substrate category filter is preserved.** The default `All lanes` view is the
  lane grouping; selecting a category (Architecture / Enforcement / Doctrine) switches to a
  flat filtered grid, keeping the documented /thoughts index filter available.
- **Free-text search is a third trigger for that same flat filtered grid** (added 2026-07-26).
  A reader can search the corpus by title, category, or preview text; `/` focuses the input.
  Search and category compose: the flat grid honours both at once, and a result count is
  announced politely while either is active. The lane-grouped view remains the default and is
  rendered unchanged whenever the query is empty, so search adds a way in without displacing
  the operating-journal framing. A query with no matches shows an explicit empty state with a
  clear-filters affordance, so the reader is never left staring at a blank grid.

## Constraints / acceptance criteria

- Lanes are a hand-authored hub-side curation (`THOUGHT_LANES` in `constants.ts`),
  orthogonal to the substrate category. The change touches neither the substrate canonicals
  nor the generated bundle (`constants.generated.ts` is not regenerated), so it is effective
  on merge and substrate-verify-neutral.
- The essay voice and bodies are not modified. Only the container (intro, grouping, ordering,
  routing) changes.
- A slug listed in a lane that does not resolve to a real essay simply does not render (no
  dangling link); essays render from the THOUGHTS corpus, filtered by lane.

## Test seam

Exercised at the existing `routeCoverage` seam (essay links resolve) and the compile/bundle
guards (the bundle is unchanged). The lane grouping is pure UI over `THOUGHT_LANES` and the
existing THOUGHTS corpus; no new test harness is introduced.

Search (2026-07-26) is exercised at the same existing `thoughtLanes` seam. The predicate is a
pure exported function (`thoughtMatchesQuery` / `thoughtSearchText` in `constants.ts`) rather
than inline page state, precisely so it is assertable without a React harness (this repo has
none, per `tests/routeCoverage.test.ts`). The load-bearing assertion is that an empty query is
identity over the corpus: that is what guarantees the lane-grouped default view above is
reachable and unchanged. Search scope is deliberately title + category + preview and excludes
`body`, so no result matches on text the card does not render; that exclusion is itself
asserted, and adopting body search later should replace the assertion with a result-highlighting
contract rather than delete it.
