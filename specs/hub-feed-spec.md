# Spec — Hub content feed (danmercede.com)

Status: drafting · Owner-merge · Sibling of danmercede.online `specs/rss-feed-spec.md`
(PR #105 there); same play, different integration convention: the hub generates crawl
artifacts INTO `build/` at deploy time (the `injectRouteMeta.ts` sitemap pattern), so
feeds are build outputs, never committed artifacts — the drift-gate/shrink-guard
problem class from the .online PR does not exist here.

## Problem

danmercede.com has no feed: every feed-shaped URL falls through to the SPA HTML
catch-all. Feed consumers (Google freshness crawling, Feedly-class WebSub
subscribers, answer-engine discovery) see nothing machine-readable, and the hub is
the bottom-of-funnel surface the whole distribution play routes to.

## Goal & non-goals

- **Goal:** RSS 2.0 (`/feed.xml`) + Atom (`/atom.xml`) covering BOTH hub corpora —
  essays (`THOUGHTS` → `/thoughts/<slug>`) and guides (`GUIDES` → `/guides/<slug>`)
  — regenerated on every deploy, with full sanitized content, autodiscovery,
  WebSub declaration, and a post-deploy hub ping.
- **Non-goal:** dev.to RSS import wiring for the hub (essays already syndicate
  there with canonicals via the lane; an import would create duplicate drafts).
- **Non-goal:** fixing the pre-existing broken in-body essay images
  (`publishing/assets/...` srcs render as SPA soft-404s on the live site) — the
  feed SANITIZES them out; the site-side fix is a separate arc.

## Scenarios (tracer bullets)

1. **Deploy refreshes the feed.** `npm run build` chains `renderFeed.ts` after
   `injectRouteMeta.ts`, emitting `build/feed.xml` + `build/atom.xml` from the same
   `THOUGHTS`/`GUIDES` corpora the pages and sitemap use. Vercel serves them; a
   substrate-sync that adds an essay needs zero feed maintenance.
2. **Items are self-describing.** Newest 20 across both corpora by date: title;
   `link`/permalink `guid` at `SITE_ORIGIN/thoughts|guides/<slug>`; RFC-822 UTC
   `pubDate` (date at midnight PT, host-TZ-independent); `description` = essay
   `preview` / guide `description`; `content:encoded` = the site's own `Markdown`
   component rendered via `renderToStaticMarkup` — then feed-sanitized: figures
   with unresolvable (non-absolute, non-root-relative) image srcs dropped,
   root-relative URLs absolutized to `SITE_ORIGIN`.
3. **Discovery surfaces can find and subscribe.** Autodiscovery `rel=alternate`
   links live in the static head (outside the injector anchors, so every per-route
   page inherits them). Both feeds declare `rel=self` + `rel=hub` (Google WebSub
   hub). `/rss.xml` and `/rss` redirect to `/feed.xml`.
4. **Publish pushes, not just polls.** A creds-free workflow on push-to-main waits
   out the Vercel deploy then POSTs `hub.mode=publish` for both feeds;
   non-blocking (WARNING, never a gate).

## Test seams

`scripts/renderFeed.ts` exports (`renderRss`, `renderAtom`, `feedItems`, sanitizer
helpers) fed by injected corpora — the same injectable-corpus pattern
`injectRouteMeta.ts` uses. New `tests/feed.test.ts` in the `npm test` roster; the
existing CI gate exercises the wiring.

## Acceptance criteria

- [ ] `npm run build` emits both feeds into `build/`; newest content is item 1.
- [ ] Items span both corpora with correct per-corpus links and summaries.
- [ ] Broken `publishing/assets/...` figures are absent from feed content; all
      feed URLs are absolute on the canonical host.
- [ ] Both feeds carry `rel=self` + `rel=hub`; head carries both autodiscovery
      links; `/rss.xml` and `/rss` redirect to `/feed.xml`.
- [ ] Push-to-main workflow pings the WebSub hub, non-blocking, zero secrets.
- [ ] Deterministic: identical corpora produce byte-identical feeds.
