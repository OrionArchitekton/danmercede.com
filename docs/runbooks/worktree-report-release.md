---
verified: 2026-10-19
review_after: 2026-11-18
topics: [works, guides, worktree-report]
references: [../../vercel.json, ../../constants.ts, ../../content/guides/git-worktree-overlap-report.md, ../../specs/worktree-report-release-surface-spec.md]
---

# Worktree Report Works and guide release

Private preparation only. The guide and Work dates are provisional publication metadata; the reviewed stamp records the actual full reread on October 19. A later publication date requires a fresh full reread and truthful metadata update, followed by regeneration and applicable checks.

Validate `npm run compile:guides`, `npm test`, `npm run build` and `npm run test:built`. Confirm the guide’s own initial HTML, canonical, Article data and generated sitemap. The microsite is proxy-served; do not add it to ROUTE_META. Source and site: OrionArchitekton/orion-worktree-report and OrionArchitekton/orion-worktree-report-site. The separately prepared external project/origin is orion-worktree-report-site / https://orion-worktree-report-site.vercel.app/ . No project or deployment is created by these files.

After full-package release approval, preserve protected CI and qualified human review. Publish and independently verify the exact core wheel/source/checksums; preflight the site origin and its assets; then release the guide/index/sitemap/Works proxy together. Every URL remains an intended destination until its own hosted readback succeeds. Do not infer a valid page from a 200 alone or use the hub’s SPA fallback as guide proof. If the intended origin identity changes, revise and review these mappings before release.

Consumer verification after that approved release: the Works route resolves with its own canonical and real body, JS/CSS/manifest/images match the selected build after prefix stripping, source and guide links open the correct destinations, and the guide has a visible walkthrough, its own canonical, Article data and sitemap entry. Recheck mobile, keyboard, reduced motion and script-disabled rendering. Local evidence proves only the local selected build. No monitor or timer is introduced.

Rollback: ordinary protected revert of this change’s guide/generated guide entry, Works entry/priority, static microsite sitemap entry, slash redirect and both rewrites. Other routes and substrate-generated constants are outside scope. No runtime integration, credentials, package pins, original helper, collaborator access or syndication changes belong here.
