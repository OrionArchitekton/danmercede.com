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
