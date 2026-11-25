---
verified: 2026-11-25
review_after: 2027-02-25
topics: [monitoring, post-deploy, seo, cwv, analytics, rollback-triggers]
references:
  - docs/runbooks/danmercede-v2-release-and-rollback.md
  - docs/runbooks/analytics-observability.md
  - analytics/gaConfig.ts
  - public/sitemap.xml
---

# DanMercede.com v2.0 Post-Deployment Monitoring Plan

This runbook defines the post-cutover observation schedule, key health signals, and automatic rollback thresholds for DanMercede.com v2.0 (`release/danmercede-v2.0`).

## 1. Monitoring Cadence

| Window | Focus | Required Checks |
|---|---|---|
| `T+15m` | Smoke & Indexability | Verify HTTP `200` on core routes (`/`, `/works`, `/proof`, `/about`, `/ecosystem`, `/thoughts`, `/guides`, `/diagrams`, `/connect`), `/works/proctor/`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feed.xml`, `/atom.xml`; confirm zero `X-Robots-Tag: noindex` on `www.danmercede.com`; confirm `deployment-revision.json` matches deployed SHA. |
| `24h` | Error Rate & Assets | Inspect Vercel runtime/edge logs for `4xx/5xx` spikes on `/media/*`, `/brand/*`, `/assets/*`; verify `Speaking_One_Sheet.pdf` and reference architecture DOCX downloads return HTTP `200`; confirm `hydration_error` GA4 event count is zero. |
| `72h` | Analytics & Conversions | Confirm GA4 realtime & standard events (`page_view`, `generate_lead`, `connect_click`, `gate_sim_run`, `outbound_click`) fire cleanly with URL query parameter redaction and `debug_mode` absent on `www.danmercede.com`. |
| `7d` | Search Indexing & Sitemap | Review Google Search Console sitemap ingestion (`140` submitted URLs), Coverage exclusions (`404` on nonexistent routes, zero unintended `noindex` pages), and canonical clustering. |
| `14d` | Core Web Vitals & CWV Field | Inspect GSC Core Web Vitals & CrUX (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1) across desktop and mobile; verify organic impression stability across top entry pages. |
| `30d` | Organic Equity & Runbook Audit | Compare 30-day organic clicks, top queries, backlinks, and conversion CTR against pre-cutover baseline (`2026-11-25`). Archive findings in the Orion vault. |

## 2. Explicit Rollback Triggers

Trigger the 1-command rollback in `docs/runbooks/danmercede-v2-release-and-rollback.md` immediately if any of the following occur:

1. `https://www.danmercede.com/` serves HTTP `5xx` or emits `X-Robots-Tag: noindex`.
2. Production `hydration_error` GA4 event rate exceeds `0.5%` of sessions or primary navigation/interactive flows break on iOS Safari / Android Chrome / Desktop Chromium.
3. Any `/works/<slug>/` Vercel rewrite returns `404` or `5xx` due to config regression.
4. Search Console reports systemic de-indexing or canonical drops traceable to v2.0 markup.
5. `generate_lead` (`mailto:contact@danmercede.com`) or `Speaking_One_Sheet.pdf` conversions drop sharply without external cause over 72h.
