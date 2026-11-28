---
verified: 2026-11-27
review_after: 2027-02-21
topics: [analytics, observability, ga4, google-analytics, search-console, gsc, vercel, speed-insights, web-vitals, llms-txt, seo, aeo, consent-mode, conversions, cloudflare-web-analytics, key-events, danmercede.com]
references:
  - components/Analytics.tsx
  - components/GateSimulator.tsx
  - analytics/gaConfig.ts
  - analytics/cfBeacon.ts
  - App.tsx
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
3. In the stream's **Enhanced measurement** settings, **turn OFF "Page changes based
   on browser history events"** (Page views → the gear/settings). The app sends
   `page_view` per route itself (`send_page_view:false` only suppresses the initial
   one); leaving the history-events option on would make GA4 ALSO fire a page_view on
   every SPA navigation → **double-counted** route metrics. Keep the other Enhanced
   measurement signals (scrolls, outbound clicks, site search, etc.) ON.

## Step 2 — Wire the ID into Vercel (operator, Vercel dashboard)
1. Vercel → project **`danmercede-com`** → Settings → Environment Variables.
2. Add `VITE_GA_MEASUREMENT_ID = G-XXXXXXXXXX` for the **Production** environment
   **only** (leave Preview/Development unset so preview deploys stay analytics-free —
   the component no-ops without the var).
   - The `VITE_` prefix is **required** — Vite only exposes prefixed vars to client code.
3. Settings → **Analytics** → enable **Web Analytics**; Settings → **Speed Insights** → enable.
   (Both components are gated on `VITE_GA_MEASUREMENT_ID` in code — they mount only once the
   Production var is set, so dev/preview send nothing. Enabling here turns on the dashboards.)
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

## Step 4 - Conversion events / Key events (operator, GA4 UI)

The `/connect` page fires two conversion events via `trackEvent`
(`analytics/gaConfig.ts`, wired in `App.tsx`): **`generate_lead`** on the email
("Direct Contact") click and **`connect_click`** (`method: linkedin`) on the LinkedIn
click. The `/proof` page also fires **`gate_simulator_run`** (`scenario`,
`outcome_mode`, redacted `page_location`) from `components/GateSimulator.tsx`.
They are collected automatically once GA is live, but GA4 does **not** count
them as conversions, break down simulator parameters, or drop automated test hits
until the operator enables the three GA4 Admin settings below (console-only:
the site's GA connection is read-only):

1. GA4 -> Admin -> **Key events** -> **New key event** -> register **`generate_lead`**,
   **`gate_simulator_run`**, and **`connect_click`**.
2. Alternatively, once an event has fired at least once, toggle **mark as key event**
   from **Admin -> Events**.
3. GA4 -> Admin -> **Custom definitions** -> **Create custom dimension** (Event scope):
   register **`scenario`** (parameter `scenario`) and **`outcome_mode`** (parameter
   `outcome_mode`) so `gate_simulator_run` reports and Explorations can segment by tool
   and decision mode.
4. GA4 -> Admin -> **Data settings** -> **Data filters** -> if **Developer traffic** does
   not exist yet (for example on a newly created property), click **Create filter** ->
   **Developer Traffic** -> **Exclude**, enter a filter name, and set Filter state to
   **Active**; otherwise open the existing **Developer traffic** filter and switch Filter
   state from Testing to **Active**. Localhost, `.local`, Vercel preview deployments, and
   WebDriver checks emit `debug_mode: true` (`resolveGaDebugMode`), and activating this
   filter excludes those hits from standard production reports while keeping them visible
   in DebugView.

## Step 5 - Cloudflare Web Analytics beacon (operator, Cloudflare + Vercel)

The beacon code (`analytics/cfBeacon.ts`, mounted in `components/Analytics.tsx`) is
off until `VITE_CF_BEACON_TOKEN` holds a 32-hex beacon token. Even then it loads only
on danmercede.com and its subdomains (`isCfBeaconHost`), never on `.vercel.app` hosts,
danmercede.online, localhost, `.local`, Vercel previews, or WebDriver sessions. It is cookieless and uses `spa: true`, so it
counts react-router navigations itself. No CSP change is needed: `vercel.json` sets no
page CSP (a test fails if one is added without `static.cloudflareinsights.com` in
`script-src` and `cloudflareinsights.com` in `connect-src`).

Coverage: Cloudflare accepts a site token only from hostnames under the apex it was
registered for (postfix match), so the danmercede.com token covers `danmercede.com` and
`www.danmercede.com` (the apex redirects to `www`). The `danmercede-com.vercel.app`
alias and danmercede.online are not measured by this beacon: it does not load there,
since Cloudflare would reject those hits. Measuring them would need their own sites and
tokens, which this code does not support.

0. In Cloudflare -> **Web Analytics** -> **danmercede.com** -> **Manage site**, check the
   automatic setup. If the hostname is proxied and automatic setup is on, Cloudflare
   injects its own beacon whatever `VITE_CF_BEACON_TOKEN` says, and the rollback below
   would not stop it. Set it to **Enable with JS Snippet installation** so only this
   snippet loads. (The site has recorded 0 page loads, so automatic injection is not
   active today; confirm before relying on rollback.)
1. Cloudflare dashboard -> **Web Analytics** -> **danmercede.com** -> **Manage site** ->
   **JS snippet**. Copy the `token` value from `data-cf-beacon` (32 hex characters).
   It is not the site tag shown in the site list.
2. Vercel -> project **`danmercede-com`** -> Settings -> Environment Variables -> add
   `VITE_CF_BEACON_TOKEN = <token>` for **Production** only.
3. **Redeploy Production** (Vite inlines the value at build time).

Validation: on Production, DevTools Network shows one `beacon.min.js` request and a
`cloudflareinsights.com/cdn-cgi/rum` POST, and Cloudflare Web Analytics for
danmercede.com shows page loads (allow a few minutes). A Preview deploy shows neither.
Rollback: unset `VITE_CF_BEACON_TOKEN` in Production and redeploy (with automatic setup
set as in step 0, this stops all collection).

---

## Validation (do all — surface checks hide blocking defects)
- **GA gated-off proof:** on a **Preview** deploy (no env), `view-source` / Network
  shows **no** request to `googletagmanager.com/gtag/js`. (Acceptance #1.)
- **GA live proof:** on Production, open the site, then GA4 → **Reports → Realtime** —
  your session appears; navigate between routes and confirm **distinct `page_view`s
  per route** (not one). This is the end-to-end ALLOW proof, not just "script present".
- **Consent posture:** in DevTools console, `window.dataLayer` includes a
  `['consent','default',{analytics_storage:'granted', ad_storage:'denied', ...}]` entry.
- **Conversion proof:** on Production, open `/connect` and click the Email link, then
  GA4 → Realtime → Event count shows `generate_lead`. After it is marked a Key event
  (Step 4), it appears under Reports → Engagement → Conversions within ~24h.
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
