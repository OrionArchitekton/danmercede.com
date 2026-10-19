---
verified: 2026-10-18
review_after: 2026-11-18
topics: [works, guides, result-capture]
references: [../../vercel.json, ../../constants.ts, ../../content/guides/capture-agent-results-with-byte-bounded-snapshots.md, ../../specs/orion-results-release-surface-spec.md]
---

# Result-capture release

Current state is private preparation. No hosted repository, deployment or public
guide is established by these staged changes. MIT and destination names are
approved; publication requires the full refreshed package and exact action set.

After that approval, establish the named core/site repositories and protected
review gates. Publish the exact reviewed v0.1.0 wheel/source/checksums first. Verify
unauthenticated downloads and hashes before the guide is enabled. Prepare the
site's new external Vercel project without copying another project's credentials
or identity. Verify its root HTML, prefix-safe assets and absence of an SSO wall.

The hub release carries the Works card, no-slash redirect, two prefix-stripped
rewrites, sitemap and static guide together. Merge only after the published core
assets and new site origin have been checked. Then verify Works to site to guide
navigation and the guide's commands, canonical, visible body and Article metadata.
The site source can be deployed first for origin checks; its guide link is accepted
as live only after the hub release is verified. No temporary guide URL is needed.

Local validation: compile guides; run npm tests, TypeScript, build and built-page
checks. Preserve the committed substrate bundle byte-for-byte. Inspect desktop
and mobile rendering, prefix-stripped assets and the built guide. A local proxy
rehearsal is supporting evidence and cannot establish production availability.

Monitor through bounded unauthenticated production reads after the later approved
deployment. Verify exact deployment/source identity and asset content types; a
catch-all HTML 200 is insufficient. Add no timer or monitoring service.

Rollback through protected revert PRs for this hub release and a separate
same-project known-good site redeployment. If no prior site deployment exists,
remove its hub route/card and pause the new project after approval. Keep released
package assets immutable; correct defects through a newly reviewed version.
Caller-selected data and the installed estate runtime remain independent.
