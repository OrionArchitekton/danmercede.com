# Analytics & Observability — Spec

## Problem
danmercede.com (and the sibling danmercede.online) publish continuously but ship **no
instrumentation**: no traffic analytics, no search-performance visibility, no Core Web
Vitals signal, and no synthetic check that a served page self-identifies correctly. We are
"flying blind" — unable to see what content earns attention, what ranks, or whether a deploy
silently degraded a page. The site is a `react-router` SPA on Vercel; crawlers and verifiers
do not execute JS, and a non-existent route returns **HTTP 200** (the SPA shell) while
self-canonicaling to root (the documented soft-404 trap).

## Approach (chosen)
Instrument from the **app layer**, not the static `<head>`, so the carefully test-guarded
SEO head and `injectRouteMeta` prerender are untouched, and no measurement ID is committed:

- **Google Analytics 4** loaded by a React `<Analytics>` component, **gated on
  `import.meta.env.VITE_GA_MEASUREMENT_ID`**. Absent/blank/malformed ID → the component is a
  no-op (so dev, preview, and any unconfigured deploy emit zero analytics). GA runs in
  **Consent Mode v2** with analytics granted, all ad signals denied, IP anonymized, and
  `send_page_view:false` — SPA route changes fire `page_view` manually off `useLocation`.
- **Vercel Web Analytics + Speed Insights** (privacy-friendly, cookieless) via the official
  React components for the traffic cross-check and the Core Web Vitals (LCP/CLS/INP) feed that
  directly informs SEO ranking. Gated on the same production-only `VITE_GA_MEASUREMENT_ID`
  switch as GA4, so they mount nothing on dev/preview — no preview telemetry.
- **Google Search Console**: verified by **DNS TXT (domain property)** — correct for a
  no-JS-verifiable SPA — then the existing `sitemap.xml` is submitted. No code; runbook-driven.
- **Synthetic observability**: extend the existing daily `prod-smoke` monitor to assert each
  monitored URL's **served self-canonical matches the requested URL**, closing the soft-404 gap.
- **AEO**: add `public/llms.txt` (the personal sites currently serve none; the business sites do).

## Single source of truth
`analytics/gaConfig.ts` holds `resolveGaConfig(measurementId)` — the one place that decides
whether GA runs and with what consent/config. The component imports it; tests assert it. The
GA enable/no-op decision cannot drift from what is tested.

## Scope
- **In (.com):** `analytics/gaConfig.ts`, `components/Analytics.tsx` wired once into `App`,
  `@vercel/analytics` + `@vercel/speed-insights` deps (+ lockfile), `public/llms.txt`,
  `.env.example`, the `prod-smoke.yml` canonical assertion, tests, runbook, this spec.
- **Out:** substrate/content; the SEO `<head>` and `injectRouteMeta`; `vercel.json` routing/redirects;
  any cookie-consent **banner** (operator chose no-banner Consent-Mode posture); GA property /
  GSC property creation (operator-only, Google-account-bound — see runbook).

## Acceptance criteria
1. With **no** `VITE_GA_MEASUREMENT_ID`, the served site loads gtag **zero** times and pushes no
   GA events (verifiable: no `googletagmanager.com/gtag/js` request).
2. With a valid `G-XXXX` id set, gtag loads **once**, a `consent default` is set with
   `analytics_storage:'granted'` and `ad_storage/ad_user_data/ad_personalization:'denied'`, and a
   `page_view` fires on **initial load and on each in-app route change** (no double-count).
3. `resolveGaConfig` returns `null` for undefined/empty/whitespace/malformed ids and a correct
   config object only for a well-formed GA4 id (`G-` + alphanumerics).
4. ALL instrumentation (GA4 + Vercel Web Analytics + Speed Insights) is gated on
   `VITE_GA_MEASUREMENT_ID`: dev and preview deploys mount nothing and emit nothing (no preview
   telemetry); production mounts all three once.
5. `public/llms.txt` exists, begins with `# Dan Mercede`, advertises the canonical origin, and
   points at the `/thoughts`, `/guides`, and `/works` surfaces.
6. The daily synthetic monitor fails if any monitored URL serves a self-canonical that does not
   resolve to the requested URL (soft-404 / wrong-canonical regression).
7. The existing SEO head, prerender, sitemap, and all current tests remain green; `npm ci` succeeds
   (lockfile in sync); `npm run build` succeeds.

## Test seams
- **Unit (node `tsx --test`):** `resolveGaConfig` (gating + consent shape) and `llms.txt`
  presence/shape — `tests/analytics.test.ts`, added to the `npm test` file list. (The DOM-bound
  gtag injection and route-change firing are not unit-testable in the node harness; they are
  covered by `npm run build` succeeding + live verification per the runbook.)
- **Synthetic (CI cron):** `prod-smoke.yml` against live prod — the canonical-resolves assertion.

## Rollout / verification / rollback
- **Rollout:** merge → set `VITE_GA_MEASUREMENT_ID` in Vercel (Production) → redeploy; enable
  Web Analytics + Speed Insights in the Vercel project; verify GSC via DNS TXT and submit the sitemap.
- **Verify (mechanism):** GA4 Realtime shows the verifying session; `view-source` shows no GA when the
  env is unset on preview; `prod-smoke` run is green with the canonical assertion active.
- **Verify (outcome):** GA4 reports route-level page_views; GSC shows the sitemap read + impressions
  accruing; Speed Insights shows Core Web Vitals.
- **Rollback:** unset `VITE_GA_MEASUREMENT_ID` in Vercel (instant no-op) and/or revert the PR. No data
  migration, no routing change to undo.
