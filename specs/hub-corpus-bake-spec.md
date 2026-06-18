# Hub Full Essay-Body Corpus Bake + Per-Thought Routes (round-2 R1/R2)

**Status:** implementation spec
**Repo:** OrionArchitekton/danmercede.com (the HUB)
**Surface:** `/thoughts` + new `/thoughts/<slug>` per-thought pages
**Authored from:** approved MAP `danmercede-brand-aeo-round2-MAP-20260617.md` (APPROVED BY DAN, 2026-06-18), GATE fork 2 = **FULL ESSAY BODIES**.

## Why

Round-1 made the hub readable but the `/thoughts` corpus was uncrawlable: the served
`/thoughts` index emitted a generic shell (h1 + 1 lead paragraph), there was **no**
`/thoughts/<slug>` route, and the 23-essay corpus sat **outside both** the route set and
the sitemap. The `.online` spoke bakes its full corpus; the hub did not. This change
mirrors the `.online` full-body extraction (`compileContent.ts:587` `const body =
parsed.content.trim()`) for the hub and adds per-thought routes so every essay is a
first-class, crawlable, answer-engine-citable page.

## Scope (substrate → hub CONTRACT change)

R1 (corpus bake) + R2 (per-thought routes + sitemap), shipped as one PR. This is a
**substrate→hub contract change**: the body-less 4-field `Thought` type is widened, and
the hub compiler now extracts the full essay body from the substrate canonical.

### Substrate contract / `substrate-verify` interaction (BLOCKING — owner-resolved)

The hub `substrate-verify` workflow (`pull_request_target`, base-branch code) byte-diffs
the PR's `constants.generated.ts` against a **base-compiler** recompile of substrate
(`ref: main`). Because this PR changes the compiler's **output shape** (adds `slug` +
`body`) AND regenerates the bundle in the same PR, `substrate-verify` **fails by design** —
exactly the case documented in `AGENTS.md` → "Compiler-change caveat". The 4 pre-existing
fields (`title`/`preview`/`date`/`category`) are **byte-identical** to the base-compiler
extraction across all 23 entries; the change is purely additive (`slug` + `body`).

**Resolution (per AGENTS.md):** the operator admin-merges past `substrate-verify` after
personally reviewing the regenerated bundle diff. Verification self-heals on the next
`substrate-sync` PR, which recompiles under the now-merged compiler. The bundle was
**not hand-edited** — it is the verbatim output of `npm run compile` against substrate
`0049707`. No `substrate.lock`/pin bump was needed (substrate HEAD unchanged; same data,
wider extraction).

## Acceptance criteria

1. **`Thought` type carries the corpus.** `types.ts` `Thought` gains `slug: string` and
   `body: string` (the full rendered essay, blank-line-separated paragraphs).
2. **Compiler extracts the full body.** `scripts/compileContent.ts` extracts
   `parsed.content.trim()` per canonical and emits `slug` + `body` into
   `constants.generated.ts`; the 4 existing fields are unchanged.
3. **Bundle regenerated from substrate, not hand-edited.** `constants.generated.ts` is the
   verbatim `npm run compile` output (23 danmercede.com essay-long canonicals).
4. **Per-thought route exists.** `/thoughts/<slug>` renders a `ThoughtDetailPage` (App.tsx
   `<Route path="/thoughts/:slug">`) showing h1 + the full essay body. `/thoughts` cards
   link to it.
5. **Served body carries the FULL essay.** The prerendered `build/thoughts/<slug>/index.html`
   bakes an `<h1>` + **multiple** `<p>` (the full essay — lead claim + every body
   paragraph), not just the 1-line preview. (`injectRouteMeta.ts` iterates `thoughtPaths()`.)
6. **Sitemap parity.** Every published THOUGHTS slug has a `/thoughts/<slug>` `<loc>` in
   `public/sitemap.xml`, and a prerendered route. `tests/sitemapParity.test.ts` asserts
   `sitemap == ROUTE_META ∪ caseStudyPaths() ∪ thoughtPaths()` with no missing/extra.
7. **JSON-LD Article per thought.** Each per-thought page emits exactly one `Article` whose
   `author`/`publisher` `@id` is the canonical hub `#person`, plus a `BreadcrumbList`
   (Home > Thoughts > Title).
8. **No Person-node regression.** A per-thought route introduces **no** competing `Person`
   node — the only `Person` on every page is the static homepage entity graph (`#person`),
   same count as every other route. **FAQPage is never emitted.**
9. **Hydration parity.** The runtime `ThoughtDetailPage` splits the body with the same
   `bodyToParagraphs` helper the prerender bake uses, so the hydrated DOM matches the
   crawler-facing baked body.
10. **Tests green.** `npm test` passes (sitemapParity + bodyBake + compileContent).
    `npm run build` succeeds and prerenders all 23 thought pages.

## Out of scope (deferred / other rows)

- R3 off-domain syndication, R4 scout surfacing, R5–R15 (separate rows/repos).
- `substrate.lock`/pin bump (not required — substrate HEAD unchanged).
- Any change to the homepage entity graph or the 5-spoke identity rule (unchanged).

## Verification evidence (this PR)

- `npm test` → all tests pass (incl. new R1/R2 body + sitemap + breadcrumb assertions).
- `npm run build` → `[injectRouteMeta] wrote 34 per-route static HTML files (9 static + 2
  case studies + 23 thoughts)`.
- `build/thoughts/2026-06-16-the-gate-is-the-product/index.html` → prerender block h1=1,
  p=3 (lead + 2 full essay paragraphs); JSON-LD Article author/publisher = `#person`;
  Person nodes = 1 (the static canonical, identical to homepage); FAQPage = 0 across all
  thought pages.
