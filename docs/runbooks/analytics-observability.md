---
verified: 2026-06-28
review_after: 2026-09-28
topics: [analytics, observability, ga4, google-analytics, search-console, gsc, vercel, speed-insights, web-vitals, llms-txt, seo, aeo, consent-mode, danmercede.com]
references:
  - components/Analytics.tsx
  - analytics/gaConfig.ts
  - .env.example
  - public/llms.txt
  - .github/workflows/prod-smoke.yml
  - specs/analytics-observability-spec.md
---

# Runbook — Analytics & Observability (danmercede.com)

Instrument the site with Google Analytics 4, Vercel Web Analytics + Speed
Insights, Google Search Console, and a synthetic self-canonical monitor. Spec:
[`specs/analytics-observability-spec.md`](../../specs/analytics-observability-spec.md).

The **code** ships env-gated and inert: nothing tracks until the operator sets
`VITE_GA_MEASUREMENT_ID` in Vercel and enables the Vercel widgets. The steps
below are the **operator-only** actions (Google-account- and Vercel-bound) that
turn it on. DNS for both danmercede domains is on **Cloudflare**.

## Pre-state (verified 2026-06-28)
- **GA4 / Vercel Analytics: NONE** — this change adds them (gated, off until configured).
- **Google Search Console: already partially set up** — the apex already carries
  three `google-site-verification` TXT records (danmercede.com) / one (danmercede.online).
  So a GSC property is very likely already verified. **Do not blindly re-verify** —
  confirm which property exists first (Step 3), then just submit the sitemap.

---

## Step 1 — Create the GA4 property (operator, Google account)
1. analytics.google.com → Admin → Create Property (or reuse one) → add a **Web**
   data stream for `https://www.danmercede.com`.
2. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
3. In the stream, leave **Enhanced measurement** on; our code sets
   `send_page_view:false` and fires `page_view` per route itself, so navigations
   are counted exactly once (no double-count).

## Step 2 — Wire the ID into Vercel (operator, Vercel dashboard)
1. Vercel → project **`danmercede-com`** → Settings → Environment Variables.
2. Add `VITE_GA_MEASUREMENT_ID = G-XXXXXXXXXX` for the **Production** environment
   **only** (leave Preview/Development unset so preview deploys stay analytics-free —
   the component no-ops without the var).
   - The `VITE_` prefix is **required** — Vite only exposes prefixed vars to client code.
3. Settings → **Analytics** → enable **Web Analytics**; Settings → **Speed Insights** → enable.
   (The `@vercel/analytics` + `@vercel/speed-insights` components are already mounted;
   they auto-no-op until enabled and off non-production.)
4. **Redeploy Production** (env vars apply on next build).

## Step 3 — Google Search Console (operator) — likely already verified
1. search.google.com/search-console → check for an existing **Domain** property
   `danmercede.com`. If present and verified (likely — TXT tokens exist), skip to 3.4.
2. **If not verified:** add a **Domain** property → Google gives a
   `google-site-verification=...` TXT value → add it in **Cloudflare** DNS
   (dash.cloudflare.com → danmercede.com → DNS → Add record: **TXT**, name `@`,
   content the full `google-site-verification=...` string). *(I can add this for you
   via the Cloudflare API once you paste the token.)* Then click Verify.
3. Verify the same for **danmercede.online** (one token already present).
4. In each property: **Sitemaps** → submit `sitemap.xml`
   (`https://www.danmercede.com/sitemap.xml`, `https://www.danmercede.online/sitemap.xml`).
5. Confirm **Settings → Ownership** lists your verification and that Coverage/Pages
   shows the baked routes being read.

---

## Validation (do all — surface checks hide blocking defects)
- **GA gated-off proof:** on a **Preview** deploy (no env), `view-source` / Network
  shows **no** request to `googletagmanager.com/gtag/js`. (Acceptance #1.)
- **GA live proof:** on Production, open the site, then GA4 → **Reports → Realtime** —
  your session appears; navigate between routes and confirm **distinct `page_view`s
  per route** (not one). This is the end-to-end ALLOW proof, not just "script present".
- **Consent posture:** in DevTools console, `window.dataLayer` includes a
  `['consent','default',{analytics_storage:'granted', ad_storage:'denied', ...}]` entry.
- **Vercel:** project → Analytics + Speed Insights tabs show data within ~30 min of traffic.
- **Synthetic monitor:** Actions → **Prod Smoke** → Run workflow → green, with
  `canonical=<self>` logged per URL. (It now fails on a soft-404/wrong-canonical.)
- **GSC:** Sitemaps shows "Success" + discovered URLs; impressions begin accruing in days.

## Rollback
- **Instant kill:** unset `VITE_GA_MEASUREMENT_ID` in Vercel Production → redeploy →
  GA is a no-op (Vercel widgets independently toggled off in Settings). No data/route change.
- **Full revert:** revert the PR. No migration, no `vercel.json`/routing change to undo.

## Notes / hazards
- WARNING: GA4 runs **without a cookie-consent banner** by deliberate choice
  (Consent Mode v2 defaults: analytics granted, all ad signals denied, IP anonymized).
  This is the common personal-brand posture, not strict-GDPR opt-in. Revisit if the
  audience/jurisdiction profile changes.
- INFO: `public/llms.txt` is hand-maintained (section-level, drift-resistant). Refresh
  it when a major new surface/flagship piece ships.
- INFO: the build dir is gitignored-but-tracked; never hand-edit baked HTML — rebuild.
