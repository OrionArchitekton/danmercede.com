# Technical discovery release review

Prepared 2026-11-17 from main `dee855d24f63d654ef6bd28cc73a7985af8a05fa` (homepage PRs #256 and #257 already merged).

## Why this change exists

A reader arriving at a useful technical guide needs a specific answer, inspectable evidence, and a related next step. The previous guide shelf sent every subject to the same essay and failclosed project. Guides also shared one social card, and several static sitemap entries still carried June dates after November content changes.

## What is reviewable

- Two Claude Code guides retain their URLs and original measurements, with clearer titles, direct answers, source boundaries, executable examples, current documentation corrections, and reciprocal links.
- A new Proctor guide reproduces the invoice invariant failure at a pinned source commit. The small standalone fixture is explicitly separate from Proctor. The real engine demo and its durable approval test were executed independently.
- A new five-message conversation example preserves both branches, selects one ancestry path, validates malformed input, and emits scoped Cypher. Node behavior was executed; Neo4j database execution was not.
- The existing graph essay has dated reading context and the annotated synthetic figure near the top. Its substrate-owned body and all historical measurements remain unchanged. Its planned archive is not represented as a completed action.
- All 26 guides have an explicit related read, with a relevant project or example where appropriate, plus a quiet Fail-Closed Notes link and Contact. The Guides index features the three distribution priorities.
- Proof scenario URLs select the intended simulator state, preserve UTM tags, and support reload and back/forward. Its Proctor illustration now matches the invoice example and does not imply production enforcement.
- Optional `modified`, `image` and `image_alt` metadata flow through guide compilation, served HTML, hydrated head tags, Article JSON-LD and sitemap dates. A review date alone never advances freshness. Custom figures do not inherit the default card's dimensions.
- `guide_next_step` records link intent with bounded destination values. It is environment gated, disclosed in Privacy, and excludes destination query strings/fragments. Simulator query changes do not create duplicate page views. Shared LinkedIn/X links carry an evergreen campaign; copied citation URLs remain clean.
- The release kit includes tagged links, channel-specific drafts, baseline attribution and an empty citation register. It does not claim anything was published or configured in GA4.

## Verification

The normal build scripts were executed with `node --import tsx` in place of the tsx CLI because this sandbox disallows the CLI's IPC socket. No application checks or permission controls were disabled.

- TypeScript passed.
- Vite client and server builds passed. Route rendering produced 112 per-route HTML files plus the homepage and both feeds.
- The full source run collected 778 tests. After fixing the new analytics event's missing policy disclosure, all changed functionality and its focused rerun passed. Two pre-existing Vercel guard tests cannot invoke the tsx CLI in this runner (IPC `EPERM`). Both guard cases were exercised directly through the tsx loader: exit 0, expected sentinel, and byte-identical essay bundle. See [guard receipt](technical-discovery-20261117/vercel-guards.json). Standard CI remains authoritative for the CLI invocation.
- Built-output checks verified served bodies, structured data, figure dimensions and deterministic page renders. The injector's CLI re-run has the same local IPC limitation; it is verified separately through the loader and remains required in CI.
- Chromium exercised seven routes at 1440px and 390px: no horizontal overflow or page errors, valid canonicals, visible next steps, runtime social-metadata changes/cleanup, and simulator query/reload/history behavior. See [browser checks](technical-discovery-20261117/browser-checks.json).
- A permanent DOM test verifies initial SSR parity, zero hydration recoveries, all six simulator states, UTM preservation, history navigation, and duplicate-active-click behavior.
- Content review checked 19 local article links, four fragments against generated heading IDs, nine assets, six example links and all five topic images. Each image is visible in its article.

The public Proctor verification record reports the actual executed commands and environment limits. The Claude guide and conversation-example review notes record their separate validation. None of these checks establishes current production deployment, live GA delivery, improved search ranking, independent citations or conversion lift.

## Release and measurement

1. Review and merge this PR through the existing required checks.
2. Verify the production revision, the three priority canonical URLs, social images, and the new guide event in the actual analytics property.
3. Register missing event dimensions as described in [the release kit](../distribution/2026-11-17-guide-release.md), then use its tagged descriptions/posts/README snippets in the appropriate channels.
4. Compare a full 28-day post-release window with the attributed historical baseline; measure citations independently from referral sessions.

The `/works/proctor/` and other project pages are existing Vercel rewrites into separate sites. This PR links them but does not mutate those projects, publish social posts, send a newsletter, or request a Neo4j backlink.

Rollback is a normal revert of this PR. No database migration, credentials, paid API usage, production setting change or external content publication is required by the code change.
