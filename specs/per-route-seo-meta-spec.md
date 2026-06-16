# Per-Route SEO Meta (build-time prerender) — Spec

## Problem
danmercede.com is a `react-router` SPA. Per-route `<head>` meta (title/og/twitter/canonical)
is set at runtime by `usePageMeta` **after hydration**. No-JS crawlers and social unfurlers
(Slack/X/LinkedIn/Facebook, Googlebot on discovery) hitting a deep link (`/about`, `/proof`,
`/case-studies/:slug`) therefore read the **homepage** head, not the route's. This is the only
brand surface with the gap — the other four are single-page with static meta.

## Approach (chosen)
A browserless, build-time **meta injector** — not a prerender framework. React is externalized
via the esm.sh importmap (not bundled), which rules out Node-SSR/SSG tools (vite-react-ssg, Vike)
and makes a puppeteer snapshot heavy/flaky. The injector **never executes React**, so it is
importmap-agnostic. Routing uses Vercel **filesystem precedence** (directory-index files served
before the SPA catch-all rewrite) — **zero `vercel.json` change**, so the 10 existing redirects
are untouched.

## Single source of truth
`seoMeta.ts` holds `ROUTE_META` (static routes) + `caseStudyMeta()` (dynamic, derived from
committed `CASE_STUDIES`) + `renderSeoBlock()`. BOTH the runtime hook (`usePageMeta`) and the
build-time injector consume it, so the runtime head and the crawler-facing static head cannot drift.
A test asserts `index.html`'s anchored block equals `renderSeoBlock('/')`.

## Scope
- **In:** danmercede.com only — `seoMeta.ts`, `scripts/injectRouteMeta.ts`, `index.html` SEO anchors,
  `usePageMeta` wired to `ROUTE_META`, `build` runs the injector, tests.
- **Out:** the other four brand surfaces (no gap); the esm.sh importmap; React/Vite versions; the
  VERCEL compile guard; any `vercel.json` routing change; prerendering page **body** content.

## Acceptance criteria
1. A static HTML file is emitted per static route (`/about`, `/ecosystem`, `/proof`, `/thoughts`,
   `/connect`, `/legal`, `/privacy`, `/imprint`) and per case-study slug, at `build/<route>/index.html`.
2. Each emitted file's `<title>`, `og:title`, `twitter:title`, `og:url`, and `<link rel=canonical>`
   reflect that route — not the homepage's.
3. Case-study routes are derived from committed `CASE_STUDIES` (no hand-maintained slug list); a new
   case study is prerendered automatically.
4. The homepage `build/index.html` is unchanged in meaning (same title/og as before, plus a canonical).
5. Runtime `usePageMeta` and the injector produce consistent per-route meta (single source; drift test).
6. `og:image` is unified onto the live `/dan-mercede-og-card.jpg` (fixes the prior static-vs-runtime mismatch).
7. The injector fails the build loudly if the `index.html` SEO anchors are missing.
8. No `vercel.json` change; the 10 existing redirects keep working.

## Rollout / verification / rollback
- **Rollout:** merge → Vercel runs `npm run build` (`vite build && tsx scripts/injectRouteMeta.ts`) →
  per-route files emitted into `build/` (outputDirectory) → served by filesystem precedence.
- **Verify (Phase 1, mechanism):** `curl https://www.danmercede.com/<route>` shows the route's own
  `<title>`/`og:*` in raw HTML; the 10 existing redirects (`/contact`, `/terms`, `/resources`,
  `/readiness-scan`, apex→www, http→https) still 301 correctly.
- **Verify (Phase 2, outcome):** social card validators against live deep links (previews are `noindex`).
- **Rollback:** revert one `package.json` `build` line (drop the injector) → next deploy returns to
  today's behavior. No `vercel.json`, runtime, or data changes to undo.
