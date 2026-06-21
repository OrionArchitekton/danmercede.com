# danmercede.com /works dev hub — IMPLEMENTATION SPEC (PR2)

**Status:** APPROVED implementation packet (operator, 2026-06-20). PR2 of the brand-consolidation
arc; PR1 (essay-anchoring) is merged + live. Single repo (`danmercede.com`), single PR.

## Goal

Evolve `/works` from a flat open-source grid into a **dev hub** for the IC-hunt + speaking
audience — proof that "this person ships governed agentic systems in production." It carries the
**Build** (cloneable artifacts), a **capped curated pointer** to the flagship essays, an
**outbound rail**, and **one CTA** (available for roles/talks). The `/works` URL is kept (URL
stability is domain-authority discipline; `/works` is already referenced).

## §1 — The /works vs /thoughts distinction (LOAD-BEARING)

The two surfaces have distinct jobs, audiences, and content — `/works` must never become a
second `/thoughts`:

| | **/thoughts** (exists, unchanged) | **/works** (this PR) |
|---|---|---|
| Answers | "What does he *think*?" | "What does he *build* / can he ship?" |
| Unit | **Essays** (long-form doctrine/architecture) | **Artifacts** (repos, tools, skills to clone/run) |
| Owns | The full essay corpus — every `/thoughts/<slug>`, the 25-essay library + category filter | The build proof (`WORKS`) + hub pointers |
| Audience | Idea evaluators / enterprise | IC-hunt (hiring managers) + speaking organizers |
| CTA | (none on-page; the enterprise Readiness Scan is HOMEPAGE-only) | Available for staff/principal AI-systems roles + speaking |

**Rule:** `/works` references essays ONLY via a **hard-capped (3-5) curated pointer** →
`/thoughts/<slug>`. It hosts NO essay bodies and re-creates NO library/filter. `/thoughts` stays
the canonical, sole home of the writing.

## §2 — Scope

**In scope (`danmercede.com` only):**
- `constants.ts`: `FEATURED_ESSAY_SLUGS` + a `featuredEssays()` resolver; availability/CTA +
  outbound constants.
- `App.tsx` `WorksPage`: restructure into Build · Selected essays · Outbound · CTA (existing
  design system).
- `seoMeta.ts`: a `/works` `body` (crawlable dev-hub framing + availability line) + a
  `RouteBody.links` extension so `renderBodyBlock` bakes the featured-essay deep-links + outbound
  into the crawler-only block.
- Tests for the cap, resolution, and the baked content.

**Out of scope:** any `/thoughts` change; ItemList/CreativeWork JSON-LD for the essays (defer);
nav-label change; URL-param filter on `/thoughts`; new `WORKS` entries; any new design language.

## §3 — Design

### 3.1 Data (`constants.ts`)

- `export const FEATURED_ESSAY_SLUGS: readonly string[]` — operator-curated flagship slugs,
  **HARD-CAPPED at 5** (a test asserts `3 <= length <= 5`). Seed (all confirmed in `THOUGHTS`):
  `2026-06-08-authority-gate-made-runnable`, `2026-05-20-pre-execution-authority-gates`,
  `2026-02-10-the-four-layer-enforcement-stack`, `2026-05-19-the-merge-is-a-state-mutation`,
  `2026-02-17-why-enterprise-ai-fails-at-runtime-not-capability`.
- `export function featuredEssays(): { slug: string; title: string }[]` — maps each slug to its
  `THOUGHTS` entry (title in sync with the corpus). **Fail-loud** if a slug is not in `THOUGHTS`
  (throw) so a typo/unpublished slug is caught at build/test, never a dangling link. Preserves
  `FEATURED_ESSAY_SLUGS` order.
- `export const WORKS_HUB = { availability: "Available for staff/principal AI-systems roles and
  speaking.", contactHref: "/connect", githubUrl: "https://github.com/OrionArchitekton",
  signalUrl: "https://danmercede.online" }` (exact copy operator-tunable).

### 3.2 React `WorksPage` (`App.tsx`)

Restructure within the existing `Section`/`SectionHeader`/card system (copper-on-slate,
`font-mono uppercase tracking-widest` labels, bordered rounded cards, lucide icons):
- **Header:** `<SectionHeader as="h1" title="Works" subtitle="Build · Selected essays · Signal" />`
  + a dev-hub intro paragraph framing "open-source tooling and field-tested patterns from shipping
  governed agentic systems in production."
- **Build:** the existing `WORKS.map(...)` grid (unchanged), under a sub-header "Build — open
  source & tooling."
- **Selected essays:** render `featuredEssays()` (≤5) as a compact list — each a react-router
  `<Link to={`/thoughts/${slug}`}>{title}</Link>` (NO body, NO filter) — followed by a bare
  `<Link to="/thoughts">Full archive →</Link>` (bare because `/thoughts` has no enterprise CTA;
  §8). Clearly a curated pointer, not a library.
- **Outbound:** two external links — `WORKS_HUB.signalUrl` ("Live signal log") and
  `WORKS_HUB.githubUrl` ("GitHub") — `<a target="_blank" rel="noopener noreferrer">`.
- **CTA block:** the `WORKS_HUB.availability` line + primary `<Link to="/connect">Get in touch</Link>`
  + a secondary GitHub link. One primary action.

### 3.3 Crawler bake (`seoMeta.ts`) — the AEO payoff

No-JS answer engines read only the baked `renderBodyBlock` prose + the JSON-LD, so the hub's
crawl-relevant content must be baked, not client-only:
- Give `/works` `ROUTE_META` (~L137) a `body: { h1, lead?, paragraphs[], links[] }` whose
  paragraphs carry the dev-hub framing + the availability line (crawlable text).
- Extend the `RouteBody` type with optional `links?: { href: string; text: string }[]` and update
  `renderBodyBlock` to emit them as `<a href="...">text</a>` inside the existing hidden,
  `aria-hidden`, visually-clipped prerender block (crawler-only — no visible duplication). Escape
  `href` + `text` for `< > &` (reuse `escapeText`).
- Populate `/works` `body.links` with the 3-5 featured-essay deep-links (`/thoughts/<slug>`,
  titles from `featuredEssays()`) + the outbound links — concentrating crawl/authority on the
  flagship essays, visible to no-JS engines.
- **Not cloaking:** the baked links MIRROR the visible React render (same essays, same
  destinations, same titles) — this is the established prerender-fallback pattern (the hub already
  bakes the per-route body text this hidden-block way for no-JS crawlers), not crawler-only
  content that differs from what users see. A test asserts the featured set in the baked block
  equals `featuredEssays()` so the two renders cannot drift.

### 3.4 JSON-LD (`renderRouteJsonLd`) — UNCHANGED

The `/works` `CollectionPage` (mainEntity = `#person`, `hasPart` = `WORKS` `SoftwareSourceCode`)
stays exactly as is. NO new entities — the essays carry their own Article JSON-LD on their
`/thoughts/<slug>` pages; the `worksJsonLd` guard ("exactly one CollectionPage / no second
Person") stays green.

## §4 — Acceptance criteria

- **AC1** — `FEATURED_ESSAY_SLUGS` has 3-5 entries (test); every slug resolves to a `THOUGHTS`
  entry and `featuredEssays()` throws on a missing slug (test). The hard cap is code-enforced,
  not a soft intention.
- **AC2** — `WorksPage` renders Build (the `WORKS` grid), Selected essays (≤5, each →
  `/thoughts/<slug>`) + "Full archive → /thoughts", Outbound (.online + GitHub), and the
  availability CTA (→ `/connect` + GitHub).
- **AC3** — The baked `build/works/index.html` contains, as crawlable HTML: the availability line
  (text), the 3-5 featured-essay internal links (`href="/thoughts/<slug>"`), and the outbound
  links. Proven by a `renderBodyBlock('/works', …)` unit test + a post-build grep.
- **AC4** — `/works` hosts NO essay body and NO category filter; `/thoughts` is byte-unchanged
  (the distinction holds).
- **AC5** — `worksJsonLd` (exactly one CollectionPage, no second Person), `headHygiene`,
  `bodyBake`, `sitemapParity` all stay green.
- **AC6** — `npm test` + `npm run build` green.

## §5 — Invariants

1. **Hard cap 3-5 featured essays** (test-enforced) — `/works` never becomes a second `/thoughts`.
2. `/thoughts` owns the essay corpus; `/works` references via a capped pointer only; **no essay
   bodies on `/works`**.
3. **Dual-render:** every crawl-relevant element (availability line, essay deep-links, outbound)
   is in the BAKED body, not client-only.
4. **No new JSON-LD entities;** the `CollectionPage` identity guard stays intact.
5. Existing design system reused; **no new visual language;** nav label "Works" + the `/works`
   URL kept.
6. `featuredEssays()` fail-loud on an unresolved slug — no dangling internal links.

## §6 — Files touched

- `constants.ts` — `FEATURED_ESSAY_SLUGS`, `featuredEssays()`, `WORKS_HUB`.
- `App.tsx` — `WorksPage` restructure.
- `seoMeta.ts` — `/works` `ROUTE_META.body`, `RouteBody.links`, `renderBodyBlock` link rendering.
- `tests/` — new `worksHub.test.ts` (cap + resolution + baked availability/links); extend
  `bodyBake`/`headHygiene` only if their assertions enumerate routes.
- `specs/works-dev-hub-spec.md` — this spec.

## §7 — Testing & quality bar

- `npm test` (the `tsx --test` suite incl. `worksJsonLd`, `bodyBake`, `headHygiene`,
  `sitemapParity`, `compileContent`, + new `worksHub`) green.
- `SUBSTRATE_PATH=…/dan-mercede-substrate npm run build` succeeds (compile + vite +
  injectRouteMeta).
- Post-build: `grep` `build/works/index.html` for the availability line + each featured
  `/thoughts/<slug>` href + the outbound links; confirm `build/thoughts/index.html` is unchanged.

## §8 — Resolved facts (do NOT re-investigate)

- `/thoughts` carries NO enterprise CTA (`READINESS_SCAN` renders only on `HomePage`, App.tsx
  ~179/281/540; `ThoughtsPage`/`ThoughtDetailPage` do not) → **"Full archive → /thoughts" is a
  bare link** (the dev reader stays in-lane; no filtered view needed).
- `/thoughts` filter is client `useState` (not URL-param) and categories are
  Architecture/Enforcement/Doctrine (no "engineering" tag) → a `/thoughts?tag=…` deep link is NOT
  available without out-of-scope work; bare archive link is correct.
- `/connect` is the contact route (`ConnectPage`); GitHub = `github.com/OrionArchitekton`; live
  signal = `danmercede.online`.
- All 5 seed featured slugs are present in `THOUGHTS` (`constants.generated.ts`) and resolve.

## §9 — Deferred

- ItemList/CreativeWork JSON-LD for the featured essays (AEO nicety; risks the `worksJsonLd`
  guard — separate, careful packet).
- Carry-overs from PR1 follow-ups register (publish-time canonical guard, business-brand entity
  repoint) — unrelated to this PR.
