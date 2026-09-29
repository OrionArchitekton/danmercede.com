# Visible initial HTML for the hub: decision spec

Source: 2026-09-29 external site audit, P1 item #4 (relayed in the
`dm-site-audit-remediation-20260929` arc brief; the audit text is not persisted in
this repo): "Generate useful, visible initial HTML from the same content model or
page components used for the user-facing experience. Then hydrate or progressively
enhance the parts requiring interactivity." Google's rendering guidance favors
static rendering, server rendering, or hydration over crawler-only arrangements.

This PR carries the spec only. No production code changes.

## Glossary (one term per concept)

- **Initial HTML**: the bytes of the first HTTP response for a URL, before any
  script runs. Replaces "raw HTML", "served HTML", "no-JS view".
- **Crawl block**: today's hidden, abbreviated per-route copy that sits beside the
  app mount point. Replaces "prerender block", "body bake", "prerender-content".
- **Page render**: the markup produced by the real page components a visitor sees.
- **Rendered-route set**: the explicit routes whose initial HTML carries the page
  render; every other route keeps the crawl block unchanged.
- **Hydration**: the client attaching to existing markup instead of re-creating it.
- **Baseline output**: the built output after S0 (today's output minus the inert
  importmap). Parity and rollback claims compare against it, not against today's
  bytes, because S0 deliberately changes every route file.

## Problem and evidence

1. **The crawl block is hidden and outside the app.** It is emitted as a 1px,
   clipped, `aria-hidden` container beside `#root` (`seoMeta.ts:779-810`, style at
   `seoMeta.ts:786`), written per route into `build/<route>/index.html` by
   `scripts/injectRouteMeta.ts:147-158`. The homepage copy is hand-mirrored in
   `index.html:211-219`, and `#root` ships empty (`index.html:220`).
2. **The client throws it away.** `index.tsx:15` removes the crawl block, then
   `index.tsx:17-22` calls `createRoot(...).render(...)`: a full client render,
   not hydration. Visitors see nothing until the 802 kB (258 kB gzip) client chunk
   loads and runs.
3. **The crawl block is a second, abbreviated template, and it drifts.** Its copy
   is hand-authored in `ROUTE_META[*].body` (`seoMeta.ts:137-298`), separate from
   the page components in `App.tsx`. Measured on the build of `origin/main` at
   `b1fac9a` (recipe in the appendix):
   - Index pages show none of their listed items in the crawl block: /works has
     0 of 20 project titles, /thoughts 0 of 42 essay titles, /guides 0 of 9 guide
     titles.
   - Visible text, crawl block vs page render: / 429 vs 3,003 chars; /about 451
     vs 1,003; /works 819 vs 11,529; /thoughts 206 vs 12,940; /proof 13,778 vs
     17,068. Across all 88 published routes the ratio has median 0.84, min 0.02,
     max 3.27. At least one route bakes more text than its page shows.
   - H1 differs: /ecosystem bakes "Ecosystem" (`seoMeta.ts:169`) but the page H1
     is "Operator Stack" (`App.tsx:530`); /guides bakes "Guides"
     (`seoMeta.ts:229`) but the page H1 is "Build agents that can act and prove
     what happened." (`App.tsx:1840`).
   - Parity guards exist only for chosen fragments (/works featured essays, /proof
     evidence), not for whole pages (AGENTS.md "Dual-render parity").
4. **The required `extractability` gate measures the proxy, not the page.** It
   treats any text inside `#root` as JS-only (`extractability.ts:86-118`) and its
   real-route test lints the crawl block wrapped around an empty root
   (`tests/extractability.test.ts:193-205`). It is a required check
   (`.github/workflows/required-checks-fail-closed.yml:30`, `ci.yml:102-121`).

### Premise correction: React is bundled, not loaded from esm.sh

The audit and several comments say React is externalized through the esm.sh
importmap. That is stale, and it matters: the earlier SEO specs rejected SSR/SSG
on exactly that premise (`specs/per-route-seo-meta-spec.md:11-13`,
`specs/body-bake-and-route-jsonld-spec.md:41`).

- Lockfile: react 19.2.4, react-dom 19.2.4, react-router and react-router-dom
  7.18.0 (`package-lock.json:2873-2927`).
- The built client chunk contains React 19.2.4 (7 version literals), has 0 bare
  module imports and 0 references to esm.sh. The importmap still ships in
  `index.html:59-70` (react ^19.2.3, react-dom ^19.2.3, react-router-dom ^7.12.0,
  lucide-react ^0.562.0, d3 ^7.9.0) but resolves nothing at runtime.
  `index.html:10` already says so (commit `698d38d`).
- Stale contrary comments: `scripts/injectRouteMeta.ts:13-14`, `seoMeta.ts:692-694`.

Consequence: a server render and client hydration both use React 19.2.4 from the
same lockfile. The version-skew risk the audit raised does not apply as long as
the importmap stays inert. Slice 0 deletes it so it cannot become live again.

### Feasibility probe (throwaway, not committed)

A scratch Vite SSR build of the unmodified `App.tsx` (only `BrowserRouter` swapped
for `StaticRouter` through a resolve alias) rendered with `renderToString`:

- All 88 published routes (/ plus the 87 the injector bakes) rendered with 0
  exceptions and 0 console errors in 211 ms total (mean 13.4 KB per route). The SSR
  bundle build took 2.87 s against 4.14 s for today's full `npm run build`.
- The page render of /works contains 20 of 20 project titles, /thoughts 42 of 42,
  /guides 9 of 9. Two renders of the same route are byte-identical. /about renders
  byte-identically with the production analytics switch on and off.
- Hydration in headless Chrome, React development build: 12 canonical URLs (/,
  /about, /works, /thoughts, /guides, /proof, /ecosystem, /connect, /diagrams, one
  essay, one guide, one case study) plus /ecosystem#cosmocrat hydrated with
  **0 React warnings**. Positive controls failed as predicted:
  - `/about/` (trailing slash) logged an attribute mismatch that React does not
    patch. The nav compares the path exactly (`App.tsx:94`), and Vercel serves
    `/about` and `/about/` from the same file.
  - An unknown URL served homepage page-render markup (the SPA catch-all rewrite at
    `vercel.json:337-338` served `build/index.html`; #165 removes it): hydration
    failed and React regenerated the tree.
- Linter impact: with page-render markup inside `#root`, today's `extractability`
  linter fails 88 of 88 routes. With `#root` counted as readable, the
  heading-hierarchy check still fails 85 of 88. The pages really do skip heading
  levels, e.g. the footer `h4` (`App.tsx:148`) and /about `h1` then `h4`
  (`App.tsx:389`). The token-budget check fails 0.

No component is server-unsafe: every browser API and random or clock read sits in an
effect or event handler (`ConstellationBackground.tsx:15-106`, `Analytics.tsx:49-65`,
`LayerJumpBar` `App.tsx:969-985`, ecosystem hash `App.tsx:443-453`, `usePageMeta`
`App.tsx:1089-1157`, `ScrollToTop` `App.tsx:2303-2308`). Two module-load reads
of `import.meta.env` (`components/Analytics.tsx:9`, `constants.ts:368`) mean the
render must run through a Vite SSR build, not plain `tsx`.

## Goals

1. The initial HTML of every published hub route carries that route's page
   render, visible, inside the app mount point.
2. The client hydrates that markup instead of discarding it.
3. One template per page: the crawl block and its hand-written copy are retired
   once every route is migrated.
4. The `extractability` gate measures the page visitors get.
5. Every slice before crawl-block retirement (S5) reverses with a one-line change.

## Non-goals

- The `/works/<slug>/` microsites: separate deployments behind rewrites, excluded
  from the injector (`scripts/injectRouteMeta.ts:72-75`); failclosed already bakes.
- Head meta, JSON-LD, sitemap and feed: unchanged. No runtime server, Node server
  or edge function: output stays static files on Vercel.
- Code splitting and client chunk size. Visual redesign (S4 heading fixes are
  semantic only).

## Candidate approaches

### A. Build-time render of the real page components, hydrated (recommended)

Add a Vite SSR build of the app, render each route with `StaticRouter` at build
time, put the markup inside `#root` of that route's HTML file through the existing
injector, and hydrate on the client. The router moves out of `App` (`App.tsx:2311`)
so the client wraps it in `BrowserRouter` and the build wraps it in `StaticRouter`.

- Pros: one template; exact content parity by construction; visible content before
  JS; keeps the existing injector, head, JSON-LD, sitemap and filesystem routing;
  no new runtime dependency (react-dom/server is already used at build time,
  `scripts/injectRouteMeta.ts:49-64`); the probe shows it works on all 88 routes.
- Cons: hydration discipline from now on (no render-time reads of window, time or
  randomness); two build targets; the `extractability` linter and about ten tests
  change; 85 routes need heading fixes before the full heading check can gate.
- Effort: 6 small PRs (S0 to S5, see slices).
- Rollback: empty the rendered-route set; output returns to the baseline output.

### B. Visible crawl block generated from shared content constants

Keep the crawl block, drop the hiding, place it inside `#root`, and generate more
of it from the same constants the pages use (WORKS, THOUGHTS, GUIDES).

- Pros: smallest change (1 to 2 PRs); no hydration work.
- Cons: still a second template, so parity stays a per-fragment test burden and
  the H1 drift persists; `createRoot` discards it for the real page, so visitors
  see a jump from plain to styled; misses the audit wording "same page components".
- Rollback: trivial revert.

### C. Migrate to a framework SSG (React Router framework mode, Vike, Astro)

- Pros: maintained prerender pipeline, per-route code splitting, loaders.
- Cons: new build plugin and dependencies; route-module rewrite of a 2,363-line
  `App.tsx`; replaces the working head, JSON-LD, sitemap and feed pipeline and
  its 34 test files; new output layout and Vercel config; the largest blast
  radius for the smallest marginal gain over A on an 88-route static site.
- Effort: large (weeks). Rollback: whole-branch revert only.

## Recommendation

**Approach A.** The only reason SSR was ruled out before (React on esm.sh) is
false today, and the probe shows the real component tree renders every route
without errors and hydrates cleanly on 12 canonical URLs. A gives parity by
construction, removes a hand-maintained template, and stays inside the existing
static-file deployment. B keeps the drift the audit names; C costs weeks for
features the hub does not need.

## Design constraints for A (from the probe)

1. Render through a Vite SSR build (`import.meta.env` at module load). Write the
   SSR bundle outside the deployed `build/` directory and do not copy `public/`
   into it (the probe build copied public assets by default).
2. Hydrate only when the markup was rendered for this path: the build stamps the
   rendered path on `#root`; the client hydrates when it equals the current path
   normalized for a trailing slash, and otherwise clears the root and renders
   fresh. This covers `/about/` and unknown URLs.
3. Normalize the path wherever it feeds the render. The nav highlight (`App.tsx:94`)
   must treat `/about/` and `/about` alike. Do not set `trailingSlash` in
   `vercel.json`: the microsite rewrites use trailing-slash sources.
4. Unknown URLs must never receive page-render markup. The audit P0 change (#165)
   removed the SPA catch-all rewrite: unknown URLs now get the not-found file with
   HTTP 404. That file must keep deriving from the empty template, never from the
   rendered homepage, once `/` joins the rendered-route set (S3 adds the test).
5. `ScrollToTop` (`App.tsx:2303-2308`) must not scroll on first mount: visitors can
   now scroll before hydration, and a mount-time `scrollTo(0, 0)` would jump them
   back to the top.
6. A route in the rendered-route set drops its crawl block, so the H1 appears
   once in the initial HTML.
7. Remove the inert importmap and correct the stale comments.

## Tracer-bullet slices

Each slice is one PR, end to end (build, initial HTML, hydration, tests), and
demoable on its Vercel preview deploy.

- **S0: hygiene (no behavior change).** Remove the inert importmap; correct stale
  comments; add a build-output test that the client chunk has no bare module
  imports. Demo: preview is byte-identical apart from the importmap.
- **S1: /about end to end, behind the rendered-route set.** Router split, SSR build
  step, injector renders /about into `#root` and drops its crawl block, guarded
  hydration, trailing-slash normalization, ScrollToTop first-mount fix, heading fix
  for /about, linter counts `#root` as readable for rendered routes. Rendered-route
  set = {/about}; every other file is unchanged. Demo: `curl` the preview /about and
  see the page text; load /about and /about/ with 0 hydration warnings.
- **S2: index pages.** Add /works, /thoughts, /guides, /diagrams, /proof. Retarget
  the /works and /proof parity tests to the page render. Demo: the /works initial
  HTML lists all 20 project titles.
- **S3: detail families and the homepage.** Essays, guides, diagrams, case studies,
  the remaining static routes, then / (constraint 4 keeps the not-found file
  empty). Retire the markdown-to-crawl-block path for essays.
- **S4: headings and gate.** Fix heading skips across shared chrome and pages, then
  switch the `extractability` gate to lint every built route file.
- **S5: retire the crawl block.** Delete the crawl block renderer, the per-route
  hand copy, the homepage mirror in the template, and their tests.

Estimate: 6 PRs (S0 to S5). S1 carries most of the plumbing; S2 and S3 are mostly
set membership plus test retargeting.

**Rollout as shipped (2026-09-29).** The 2026-09-29 re-audit asked for the homepage,
Works, and Contact first, so the slices were reordered:
- S0 (#177) and S1 (#178, /about) as planned.
- S4a (#183): the footer's brand-name h4 became a paragraph; it was the heading skip on
  most pages.
- S2 (#184): `/`, `/works`, `/connect`, `/thoughts`, `/guides`, the routes whose render
  already passed the heading check. The content contracts the crawl-block tests carried
  now also bind the served render of these routes (post-build).
- S4b (#185): the remaining page-level skips (/proof, /diagrams, /ecosystem, /imprint,
  case studies); every published route now renders with a clean outline.
- S3 then adds every remaining route; S5 still waits two weeks without
  `hydration_error` events.

## Test seams (decision)

The hub has no DOM test harness (`tests/routeCoverage.test.ts:8-11`). Choose the
fewest, highest seams, all existing in kind:

1. **Built route files (primary).** Node tests that read `build/<route>/index.html`
   after `npm run build`, extending the existing CI built-body step
   (`ci.yml:63-91`). They assert visible page text inside `#root`, rendered-path
   stamp, no crawl block for rendered routes, and the unchanged crawl block for
   the rest.
2. **Render function (unit).** The build's per-route render function, called
   directly: every published route renders without throwing, deterministically.
3. **Hydration check (new, browser).** A headless-browser pass over the top routes
   with the React development build, failing on any hydration warning or
   recoverable error, with `/about/` and one unknown URL as positive controls.
   Every slice runs it as an operator step against its preview deploy (decided:
   no browser dev dependency, open question 4). In production, recoverable
   hydration errors are reported to analytics as a `hydration_error` event, which
   the privacy policy must then disclose (the policy test enforces it).

## Acceptance criteria

1. For every route in the rendered-route set, the initial HTML contains the page's
   H1 and body text as visible content inside the app mount point, with no hidden
   or `aria-hidden` wrapper.
2. The initial HTML for /works contains every project title; /thoughts every essay
   title; /guides every guide title.
3. A route's initial HTML contains its H1 exactly once.
4. Loading each top route (/, /about, /works, /thoughts, /guides, /proof,
   /ecosystem, /connect, /diagrams, one essay, one guide, one case study) and
   `/about/` produces 0 hydration warnings and 0 recoverable hydration errors.
5. An unknown URL shows the not-found page without any hydration error or
   visible homepage flash.
6. A visitor who scrolls before scripts finish loading is not scrolled back to top
   when the page becomes interactive.
7. Head meta, JSON-LD, sitemap and feed output are byte-identical to the baseline
   output for every route.
8. Routes outside the rendered-route set produce byte-identical initial HTML to
   the baseline output (S1 to S3).
9. Emptying the rendered-route set restores the baseline output for every route.
10. After S4, the `extractability` gate lints every built route file and passes.
11. After S5, no hand-written per-route body copy exists; the page components are
    the only source of visible route content.
12. The deployed output contains no server-render bundle.

## Existing tests: impact

| Test | Today it pins | Needed |
|---|---|---|
| `bodyBake.test.ts:150-161` | crawl block outside `#root`, `aria-hidden` | per route: inverted for rendered routes |
| `bodyBake.test.ts:163-171` | template homepage block equals the renderer | retarget to built homepage (S3) |
| `bodyBake.test.ts:303-335` | deep route has empty `#root`, H1 before it | invert for rendered routes |
| `bodyBake.test.ts:37-122` | crawl block renderer shape | keep until S5, then delete |
| `extractability.test.ts:25-40, 90-135, 193-205` | `#root` text is JS-only; lints the crawl block | redefine readable text; lint built files (S1, S4) |
| `worksHub.test.ts:71-126` | /works crawl block links | retarget to /works page render (S2) |
| `proofEvidence.test.ts:244-258` | /proof crawl block parity | retarget to page render (S2) |
| `contentBoundary.test.ts:76, 100` | forbidden terms in crawl block | lint page render instead (S2, S3) |
| `thoughtMarkdownRender.test.ts` | essay markdown baked into crawl block | delete with that path (S3) |
| CI built-body step `ci.yml:63-91` | h1 and p in three built files | keep; extend per seam 1 |
| `diagramInject`, `routeCoverage`, `sitemapParity`, `routeMetaSeo`, `headHygiene` | route set, head, sitemap | unchanged |

## Risks

- **WARNING, hydration mismatch in production.** React does not patch attribute
  mismatches. Mitigation: guarded hydration, path normalization, browser check on
  every slice, `hydration_error` telemetry.
- **INFO, unknown URLs receiving page-render markup.** Proven by the probe against
  the old catch-all, which #165 removed. Remaining guard: constraint 4 keeps the
  not-found file empty once the homepage joins the set.
- **WARNING, heading fixes touch shared chrome.** 85 of 88 routes skip levels;
  changing the footer and card headings alters every page's outline. Mitigation:
  semantic element changes only, styles pinned; S4 is its own PR.
- **INFO, interaction before hydration.** Search, filters and expand cards are
  visible but inert until the chunk loads (258 kB gzip); links work without JS.
- **INFO, HTML weight.** Page render gzips to 2.4 KB (/about), 8.6 KB (/works),
  12.7 KB (/proof); the crawl block it replaces goes away. Client chunk unchanged.
- **INFO, future render-time browser reads.** A new component reading `window`,
  time or randomness during render breaks the build or hydration. Mitigation:
  seam 2 fails the build; add a code-review rule to AGENTS.md in S1.

## Rollout, monitoring, validation, rollback

- **Rollout:** one slice per PR, verified on its Vercel preview (curl the initial
  HTML, run the browser check) before merge.
- **Monitoring and validation:** `hydration_error` events in GA4 after each merge;
  `curl` production /about after S1; Search Console URL inspection after S1, S2.
- **Rollback:** remove routes from the rendered-route set (one-line revert); the
  build re-emits the baseline crawl block for them. S5 deletes that fallback, so it
  ships last, after two weeks without `hydration_error` events.

## Open questions for Dan (all resolved)

1. ~~Approach~~ Resolved 2026-09-29 (Dan): approach A, render the real page
   components at build time and hydrate.
2. ~~Unknown URLs: empty shell file or a separate homepage file?~~ Resolved: the
   audit P0 change (#165) removed the catch-all and serves a not-found file with
   HTTP 404 (constraint 4).
3. ~~Heading fixes~~ Resolved 2026-09-29 (Dan): fold the heading fixes into this
   arc as S4; do not relax the heading check.
4. ~~Hydration check in CI~~ Resolved 2026-09-29 (Dan): keep the headless
   hydration check an operator step per preview deploy; no new dev dependency.
5. ~~Sequencing~~ Resolved 2026-09-29: #162 merged 2026-09-28, and the audit PRs
   merge as one train; S0 starts after that train lands on main.

## Appendix: how the numbers were measured

`npm run build` on `origin/main` at `b1fac9a`; probe files lived in a session
scratchpad. SSR entry: `vite build --ssr` with `ssr.noExternal: true` and an alias
of `react-router-dom` to a shim that re-exports it but maps `BrowserRouter` to
`StaticRouter` at `globalThis.__SSR_URL__`. Then (tsx, entities decoded first):

```ts
const render = (url) => ((globalThis.__SSR_URL__ = url), renderToString(<App />));
const body = readFileSync('build/works/index.html', 'utf8').split('<body')[1];
WORKS.filter((w) => !body.includes(w.title)).length;            // 20 absent today
WORKS.filter((w) => render('/works').includes(w.title)).length; // 20 present
lintExtractability(`<body><div id="root">${render(p)}</div></body>`); // fails 88/88
lintExtractability(`<body>${render(p)}</body>`); // heading-hierarchy fails 85/88
```

Hydration: client entry switched to `hydrateRoot` with `onRecoverableError`
logging, built with `NODE_ENV=development`, served by a static server injecting
`render(path)` into `#root`, loaded in headless Chrome; console errors and
warnings counted (blocked Google Fonts requests excluded).
