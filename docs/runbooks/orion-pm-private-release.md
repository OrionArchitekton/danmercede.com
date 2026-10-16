---
verified: 2026-10-15
review_after: 2026-11-15
topics: [orion-pm, guides, works-microsite, private-release-preparation]
references: [content/guides/coordinate-local-agents-with-orion-pm.md, specs/orion-pm-launch-prep-spec.md, vercel.json, constants.ts]
---

# Orion PM release operation

Regenerate the static guide bundle with npm run compile:guides, then run npm test,
npm run build and npm run test:built. Preserve the unrelated substrate bundle.
Execute the tutorial's shell blocks against the supplied core wheel in an isolated
new store. Compare guide source/asset digests with the exact compiled build.

Inspect the microsite and full guide in a local loopback proxy, including mounted
section links, guide-to-product navigation, Works entry, responsive figure and
mobile overflow. The proxy may rebase the public brand origin for private local
navigation; it proves no actual Vercel deployment. Preparation uses local patches and previews; publication follows the approval below.

Dan approved the full package release on 2026-10-15. Confirm the exact public core and site
repositories, their source-home/admission posture and independent site project.
Publish only the approved set. First establish the exact public source/artifacts
and independent microsite origin; then merge/deploy the reviewed hub guide and
Works wiring. The origin must serve HTML/assets publicly without an account wall.
The bare path rewrite and prefix-stripped asset rewrite must both exist. Do not
add a physical page at the Works proxy path. Verify the canonical guide and product
URL, their initial text, an asset MIME type, and actual mounted navigation.

Monitor those same consumer responses after release. Pause syndication until the
canonical guide is verified live and distribution is explicitly requested.
For rollback, revert the guide/card/routing change and compiled bundle through the
normal hub review path; restore the prior independent site deployment if necessary.
Keep the core release and state ownership separate; a hub rollback does not
migrate or roll back any user's task store. Stop the loopback preview to reverse
private review; it installs no service, hook, timer or deployment.

## Build-tool dependency maintenance

The private review migrated the build to Tailwind 4.3.3 and its official Vite
adapter because the Tailwind 3 dependency chain contains unpatched braces
GHSA-vfj7-8cjw-p6xm. There are no advisory suppressions or package overrides.
Authored UI sources are enumerated explicitly; private fixtures are not scanned.
Brand tokens remain in the explicitly loaded configuration. Renamed utilities
and base border/button/placeholder rules preserve the prior presentation.

Run `npm ci`, `npm audit`, `npm audit --omit=dev`, build, tests and typecheck.
Inspect desktop/mobile pages after every toolchain update. Tailwind 4 requires
modern browsers: Safari 16.4+, Chrome 111+, Firefox 128+; this package's observed
UI receipt covers the named Chrome version only. Other browsers remain untested.
An audit result is point-in-time dependency evidence, not a security guarantee.
The old private package is retained for comparison and reversal. This release
does not migrate the original PM runtime or stores. Record deployment and public
consumer receipts separately from local build results.

Upstream references: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and
https://tailwindcss.com/docs/upgrade-guide.
