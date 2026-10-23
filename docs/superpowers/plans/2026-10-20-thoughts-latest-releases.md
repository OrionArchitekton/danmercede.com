# Thoughts latest releases implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Put the three latest admitted essays above the existing Thoughts lanes.

**Architecture:** Select a sorted copy of the admitted corpus in `thoughtsIndex.ts`; reuse the existing card in `App.tsx`. The existing unfiltered-view predicate controls visibility. Keep generated content unchanged and Edition 14 held.

**Tech Stack:** React, TypeScript, existing Node tests and built-page render seam.

## 1. Latest selection

- [x] Add a test to `tests/thoughtLanes.test.ts` using an out-of-order frozen corpus with tied dates. Expect three newest entries, slug ties ascending, original corpus unchanged, and zero to two entries handled.
- [x] Run `npx tsx --test tests/thoughtLanes.test.ts`; observe failure before implementation.
- [x] Export `selectLatestThoughts(thoughts: readonly Thought[]): Thought[]` from `thoughtsIndex.ts`: copy, sort by descending ISO display date then ascending slug, slice to three.
- [x] Rerun the selector tests; require PASS.

## 2. Visible initial HTML and live page

- [x] Add a built-page assertion in `tests/builtPageRender.test.ts` that the Latest releases section contains exactly the expected three card links in date order and precedes Start here and every lane.
- [x] Build with `VERCEL=1 npm run build` and run `npm run test:built`; observe the missing-section failure.
- [x] In `App.tsx`, select latest essays and render a labelled section above Start here only when `isLaneGroupedView` and the selection is nonempty. Reuse `renderCard` in a responsive one/three-column grid. Keep lane rendering and filters intact.
- [x] Run `npx tsc --noEmit`, `npm test`, `VERCEL=1 npm run build`, and `npm run test:built`; require PASS and no generated-content diff.
- [x] Check desktop/mobile preview and live search/category/clear transitions, including hydration errors and horizontal overflow. Record concise evidence.

## 3. Edition 13 admission and delivery

- [ ] Add only Edition 13 to the compiler allowlist, with actual-publication day-seven evidence and a release handoff. Keep Edition 14 absent.
- [ ] Commit and push the task branch; open and attach a PR. Run the required post-push review pipeline, resolve genuine findings and verify current CI.
- [ ] Present the concrete source/admission/contentsync sequence at the human merge gate. Do not claim the public hub is caught up before the generated content has merged and the live essay and index have been observed.
