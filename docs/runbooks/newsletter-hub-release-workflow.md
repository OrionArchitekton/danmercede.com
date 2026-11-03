---
verified: 2026-11-03
review_after: 2026-11-10
topics: [newsletter, hub, release, recovery, production-verification]
references:
  - specs/newsletter-hub-release-workflow-spec.md
  - scripts/newsletterHubRelease.ts
  - scripts/newsletterHubReleaseJournal.ts
  - scripts/newsletterHubReleaseReader.ts
  - scripts/newsletterHubReleaseBrowser.ts
  - scripts/newsletterHubReadiness.mjs
  - scripts/compileContent.ts
  - scripts/verifyProductionDeployment.mjs
  - .github/workflows/substrate-sync.yml
  - .github/workflows/substrate-verify.yml
---

# Newsletter hub release workflow

This is source for the hub half of the weekly newsletter lifecycle. It prepares
one admission-only draft PR, validates a separate strict-sync content PR, reserves
one genuinely missed sync, and checks exact public-reader parity after an
independently authorized content merge. It never merges or deploys. The estate
merge result remains `HUMAN_REQUIRED`.

The CLI can plan, inspect and reconcile through read-only native readers. It has
**no admitted production mutation authorizer, no production GitHub writer binding,
and no qualified public-browser executor**. Injected fixtures exercise actual
bounded request bodies and browser recipes; those tests are not native runtime
qualification. A source merge is not runtime activation or public delivery.

## Inputs and private operation

Use the already installed Node/tsx toolchain; do not fetch a replacement loader.
The operator/controller creates and owns an absolute, real, mode-0700 job directory.
Every root ancestor is bound by a retained no-follow directory descriptor and rechecked before access. Request and supplied publication evidence are regular, single-link, owned,
mode-0600 JSON files. Keep original records across restarts.

```sh
node --import tsx scripts/newsletterHubRelease.ts plan \
  --request /private/request.json --job-dir /private/job \
  --now 2026-11-09T15:05:00Z
```

The exact request and envelope schemas are in the feature spec. `week` identifies
the original newsletter Monday; `release_week` is its nominal hub Monday seven
calendar days later. Eligibility uses genuine actual publication +168 elapsed
hours, including DST. E16 is ineligible before November 9 at 15:02:46 UTC.
Recovery additionally waits for 08:10 Pacific plus 15 minutes on release Monday.
Explicit `now` is diagnostic input; mutation authority uses a fresh independent
clock, not a caller's date.

`plan` performs native GETs and appends only a content-addressed stage artifact in
that root. It verifies immutable canonical ancestry and exact current protected
source blob, trusted mapper output, current hub main and complete workflow/PR
inventories. It leaves the generated bundle unchanged. `inspect` returns the
latest request-bound hashed artifact as historical/held evidence without writing, ordered by actual parsed observation instant. External artifact references are relative to the private job root; controllers must consume those original names and hashes.
`reconcile` refreshes source/native reads and may append readback or reader
artifacts; it never begins or repeats a native write.

Do not interpret outer `completed` as publication. Read the hashed stage:
`merge_gate` remains human-required; `public_delivery` is independently unknown or
verified. Publication semantics are parsed from the exact digest-verified bytes without a second pathname read. Supplied LinkedIn coverage is bound evidence, not a new authenticated
LinkedIn observation.

## Prospective native action and activation checkpoint

`advance` requires one action (`prepare-admission` or `recover-sync`), exact plan
SHA256 and a maximum of 1–6 constituent API writes. One invocation cannot perform
both actions. Flags, request content, policy receipts or controller completion do
not grant authority. The CLI currently returns `runtime-authority-unadmitted`;
an injected authorizer without an injected writer returns
`native-writer-unqualified` before reserving any attempt.

A separately reviewed activation must bind the exact source revision, executable
and runtime identity; existing installed GitHub access; fixed repository and
closed route/body writer; private job root; operator stop input; pilot expiry and
drain cutoff; and qualified signed-out isolated browser runner. Do not enter,
export, create or rotate credentials as part of this source workflow. The rejected
authenticated fallback proposal remains outside executable source pending explicit
factory authorization. No timer or runtime integration is provided by this PR.

The authorizer interface receives operation/input/action/plan/root/current-main,
protected-substrate-main/publication/canonical pins and the fixed drain cutoff.
It must return an exact scoped match, a durable grant reference, `admitted:true`,
`stopped:false`, a check within 60 seconds and unexpired authority ending no later
than December 9, 2026 at 07:59 UTC. Each sub-write refreshes authority, canonical
provenance, elapsed eligibility and current main. A stop, expiry, mismatch or base
movement holds; runtime integration must preserve this seam rather than substitute
an unconditional grant. Current classifier still has no admitted auto-merge path.

Before activation, qualify the real writer under an independently authorized exact
operation, with native IDs/readbacks and stop/expiry negative controls; qualify the
browser runner's actual isolated signed-out ownership, fixed recipe, tool SHA,
per-command attributable run IDs, cleanup and public reader receipt. Source fixture
results are not substitutes. Parent owns that bounded checkpoint and native
read-only canary after final source review.

## Recovery and monitoring

Admission reserves separate blob/tree/commit/ref/PR intents. Readbacks verify the
single compiler insertion and unchanged complete base tree. Existing foreign work
holds; there is no overwrite, force push, branch reset or replacement PR. A fully
prepared PR waits for the separate human merge boundary. Strict sync remains the
only generated-content writer; its existing trusted base compiler is unchanged.

Never delete an intent to retry. An intent without verified receipt is unknown.
`reconcile` can use a saved native response, deterministic blob/ref identity or
uniquely matching PR marker to recover the original effect. Opaque lost tree or
commit identity may remain unknown and require operator investigation. A partial
budget may resume only verified completed steps and unstarted later steps under
fresh authority. No TTL stealing or stale-lock reset exists.

A dispatch intent is once per job across changed plans/main revisions. The
unchanged native workflow returns no correlated run ID. Even a successful HTTP
return stays unattributed/unknown; never infer ownership from timing or resend it.
All-ref active runs and the global fixed content branch/PR inventory block another
recovery. Verify resulting content independently instead of inventing attribution.

A content PR must preserve the complete unrelated corpus/tree, newer editions and
latest order, have exact current base/head, all five strict required checks from
native check runs including trusted substrate verification bound through native check/run/suite IDs, exact repository/head/branch/workflow and success. Native run/suite PR arrays may be empty; those arrays cannot substitute for or defeat positive suite association. Require complete resolved
review threads. It still requires a human merge. This version conservatively
holds changes outside the bundle; editions requiring newly materialized assets
need separate supported asset preparation rather than an approximate acceptance.

After the content merge, reader reconciliation requires the exact native Vercel
project/production SHA, public no-store revision bookends, actual initial article,
canonical/index/latest/sitemap/full RSS and Atom entry/404, plus actual hydrated
article parity after client navigation and visible body. External CTA checks use
the actual anchor and destination; no form is submitted. Without an admitted
browser executor, initial-page parity remains `hydrated-reader-unqualified` and
public delivery unknown. Review holds, exact IDs, pins and public result, not CI
or a deployment toast alone.

## Rollback

Disable the prospective runtime stop/admission integration first; do not remove
journals, native IDs, expired policy receipts or uncertain attempts. Source rollback
is an ordinary reviewed revert. Reverting source does not undo a native PR,
dispatch, published page or prior deployment. Those require their separate exact
authority and native readback. No cleanup command in this feature closes PRs,
removes admission data, rolls back production or changes the existing sync timer.
