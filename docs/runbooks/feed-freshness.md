---
verified: 2026-07-09
review_after: 2026-10-09
topics: [rss, atom, feed, websub, pubsubhubbub, syndication, autodiscovery, aeo, danmercede.com]
references:
  - scripts/renderFeed.ts
  - scripts/injectRouteMeta.ts
  - tests/feed.test.ts
  - .github/workflows/websub-ping.yml
  - specs/hub-feed-spec.md
  - vercel.json
---

# Runbook: RSS/Atom feed freshness (danmercede.com)

## How it works

`npm run build` chains `scripts/renderFeed.ts` after `injectRouteMeta.ts`,
emitting `build/feed.xml` (RSS 2.0) and `build/atom.xml` (Atom 1.0) from the
same `THOUGHTS`/`GUIDES` corpora the pages and sitemap use, with item content
rendered by the site's own Markdown component. Feeds are BUILD OUTPUTS
(regenerated on every Vercel deploy, never committed), so a substrate-sync
that changes essays needs zero feed maintenance. After each push to main, the
`WebSub Ping` workflow waits out the deploy then POSTs a publish ping for both
feed URLs to `https://pubsubhubbub.appspot.com/` (non-blocking).

Sanitation contract: figures whose image src is substrate-relative
(`publishing/assets/...`, an SPA soft-404 on the served site) are dropped from
feed content; root-relative URLs are absolutized to the canonical host.

## Rollout

Merge to main; Vercel builds and serves the fresh feeds. Verify:

```bash
curl -s https://www.danmercede.com/feed.xml | grep -m1 lastBuildDate
curl -s -o /dev/null -w '%{http_code}\n' https://www.danmercede.com/rss.xml   # 308 -> /feed.xml
```

`lastBuildDate` must equal the newest essay/guide date (midnight PT in UTC),
NOT the deploy time; the feed is deterministic from content.

## Monitoring / validation

- Feed validity: https://validator.w3.org/feed/check.cgi?url=https%3A//www.danmercede.com/feed.xml
- WebSub ping result: the `WebSub Ping` workflow run log (204 = accepted).
- Freshness: the newest `THOUGHTS`/`GUIDES` entry should be item 1 live.

## Failure modes / recovery

- **Feed missing after deploy:** the build chain broke before `renderFeed.ts`
  (it throws if `build/` is absent). Check the Vercel build log for the
  `renderFeed: wrote build/feed.xml` line; the failure is upstream of it.
- **Broken images in feed readers:** the sanitizer only drops
  substrate-relative srcs; a NEW unresolvable pattern needs a sanitizer case
  in `scripts/renderFeed.ts` (`sanitizeFeedHtml`) plus a test.
- **Hub ping failing repeatedly:** subscribers fall back to polling; no user
  impact. Re-ping manually or re-run the workflow via workflow_dispatch.

## Rollback

Revert the PR; the next deploy serves no feeds again (pre-feature state). Hub
subscriptions expire on their own lease; no external state to clean.
