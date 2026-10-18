---
verified: 2026-10-17
review_after: 2026-11-17
topics: [works, guides, handoff]
references: [../../vercel.json, ../../constants.ts, ../../content/guides/hand-off-local-agent-tasks.md]
---
# Orion Handoff release

Keep source and builds private until full-package approval. Destinations are proposals; no hosted configuration was changed.

After approval, establish approved repositories and release controls; publish the reviewed wheel/checksum and source; deploy the site to its own public origin and verify HTML/assets and no SSO wall; then request the protected hub merge. Never link unavailable release artifacts or origins. Change the guide's pinned checksum only for a separately reviewed replacement wheel.

Validate guides compile, npm tests, TypeScript, build and built-page tests. Preserve the committed substrate bundle unchanged. Confirm canonical, Article metadata, sitemap and native Works → site → guide links at desktop/mobile widths.

After approved deployment, monitor actual production browser navigation and raw HTML/asset responses. A SPA catch-all 200 alone is insufficient.

Rollback through a protected revert of the hub release commit and restore the prior site deployment separately. Installed packages and local stores are independent. No hooks, timers, DNS or estate runtime changes.
