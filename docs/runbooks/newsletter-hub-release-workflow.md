---
verified: 2026-11-04
review_after: 2026-11-11
topics: [newsletter, hub, release, recovery, production-verification]
references:
  - scripts/hubEssayAdmissions.mjs
  - data/hub-essay-admissions.json
  - specs/newsletter-hub-release-workflow-spec.md
  - scripts/newsletterHubRelease.ts
  - scripts/newsletterHubReleaseJournal.ts
  - scripts/newsletterHubReleaseReader.ts
  - scripts/newsletterHubReleaseBrowser.ts
  - scripts/newsletterHubInstalledBrowser.ts
  - scripts/renderFeedCore.ts
  - scripts/renderFeed.ts
  - siteOrigin.ts
  - docs/reviews/newsletter-hub-reader-native-20261103-attempt1/qualification-closeout.json
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
**no admitted production mutation authorizer or production GitHub writer binding**. It now includes a fixed installed-CLI public-reader binding; targeted live read-only qualification is recorded below and remains distinct from mutation/runtime authority. Injected fixtures exercise actual
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

`plan` performs native read requests and appends only a content-addressed stage artifact in
that root. REST reads use GET; the content-PR review-thread GraphQL query is a read-only query sent by `gh api` as POST. It verifies immutable canonical ancestry and exact current protected
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
drain cutoff; and the installed signed-out public-reader qualification. Do not enter,
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
single requested slug addition in the protected admission-data file and unchanged complete base tree. Existing foreign work
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
the actual anchor and destination; no form is submitted. The normal `reconcile` path calls the installed public reader only after initial parity succeeds. Standalone reader calls without any browser binding remain `hydrated-reader-unqualified` and public delivery unknown. Browser refusal, unknown cleanup or any mismatch also preserves an unknown public result. Review holds, exact IDs, pins and public result, not CI
or a deployment toast alone.

## Rollback

Disable the prospective runtime stop/admission integration first; do not remove
journals, native IDs, expired policy receipts or uncertain attempts. Source rollback
is an ordinary reviewed revert. Reverting source does not undo a native PR,
dispatch, published page or prior deployment. Those require their separate exact
authority and native readback. No cleanup command in this feature closes PRs,
removes admission data, rolls back production or changes the existing sync timer.

## Installed public-reader binding

The source uses existing `/home/orion/.local/bin/orion-browser` 0.1.0 and
`/home/orion/.local/bin/agent-browser` 0.25.4. It does not install, update or launch
an independent browser. It leases only `reader` for five minutes under a unique
holder, proves its exact signed-out purpose/healthy holder/expiry, and uses a
unique CDP client session. No signed-in profile or fallback account is admitted.

An empty private temporary agent-browser config and a small environment allowlist
prevent inherited session state, auth vault or auto-connect settings. The runner
creates one blank tab, verifies unchanged baseline tabs and its owned active index,
then checks a non-headless Chrome user agent before any public navigation. It
rechecks lease and tab ownership before every fixed recipe command; expiry,
unexpected tabs, a changed purpose or refusal stops the attempt. Only the trusted
recipe's public navigation/evaluation/waits are executed. No form, credentials,
cookies, auth state, messages or publication command is read or submitted.

Cleanup closes only its owned tab, disconnects its unique agent-browser CDP
session and releases `reader` normally in `finally`; it never uses close-all or
steals/releases a foreign lease. Unknown acquisition is resolved only by a normal
release under the same unique holder. A busy response neither retries nor
releases another owner. Failed cleanup cannot claim a complete public proof.
Lease endpoints, watch links and capabilities remain in memory; subprocess errors
are scrubbed before they can reach logs/artifacts. Evidence contains code/tool
hashes, local invocation trace IDs, identity/UA facts and cleanup results, not CDP
or viewer URLs. Local invocation IDs are not provider publication receipts.

The exact installed-version source contracts are documented upstream at
https://github.com/vercel-labs/agent-browser/blob/v0.25.4/cli/src/native/browser.rs
and https://github.com/vercel-labs/agent-browser/blob/v0.25.4/cli/src/native/actions.rs.
This version returns positional tab indices; newer stable-tab APIs must not be
substituted without review. The runner records the installed tool hashes and
requires exact versions. It does not attest the entire installed tool dependency
tree. Parent-directed live read-only E15/E14 qualification after source review
must prove compatibility, real hydrated copy/CTA and cleanup. Fixture success
alone does not establish that observed outcome or activate a timer/runtime.


## Recovery and code compatibility refinements

Reconciliation consumes its own fresh plan through the bound private root and
checks the exact content-addressed name, envelope SHA256 and operation binding
before reading semantic fields. A replacement artifact cannot become source or
reader authority. A saved unattributed sync intent is reported as unknown rather
than replaying admission. A later independently verified result may establish
the requested effect, while the saved dispatch attribution remains explicitly
unknown in the evidence.

Private mutating operations can recover one crash-left temporary hard link only
when it is the sole second link to the same owned regular journal inode, strict
bounded JSON/schema/record checks pass, and the directory/inodes still match.
The payload is never rewritten. Unrelated temp files, hard links and user work
are preserved; unknown shapes hold. Strict `inspect` never performs that recovery
or other writes; use normal `reconcile` for verified private-record recovery.

The expectation mapper remains the reviewed local compiler, never fetched code
executed from a native response. A runtime whose reviewed mapper semantics have
fallen behind main can hold on copy parity; refresh and review the static code
closure through the normal source/runtime path. This is an intentional
compatibility hold, not permission to evaluate a remote compiler or accept a
mismatched row. The workflow still uses main's trusted base compiler for its
separate strict content production.

The hub reader now imports a pure feed core with explicit corpus arguments and a
shared pure origin constant. Neither generated corpus executes in the hub CLI,
including during import before caller qualification. The existing default feed
CLI/API still uses the site's corpora and produces identical bytes. Generated
corpora remain operation data whose native/source pins and generated shape are
checked independently; they are not an executable import dependency of the hub
process. The static closure must include the new pure feed core and origin module.

The installed lease endpoint is the exact owned loopback browser WebSocket URL.
It is preserved in memory, including its DevTools path. Discovery uses only the
same owned loopback origin's read-only `/json/list`; no caller-supplied host or
redirect is admitted. A nonce blank URL identifies the newly created CDP target;
its persistent target ID, unique URL/index mapping, expected command URL and
baseline targets are checked before and after recipe commands. Detected replacement or ambiguous mappings hold before further commands or tab cleanup. The installed CLI accepts tab indices, so these checks surround each command under the exclusive lease; they do not create an atomic transaction against an actor replacing a target inside that interval. Even when
expiry or target drift prevents tab closure, the unique CDP client is disconnected
in an independent `finally` step and the pool lease is released normally. Cleanup
uncertainty holds the result.

Before capture, nested article images are brought into view and decoded within a
bounded deadline. Every image must be complete, have positive natural dimensions
and be effectively visible through ancestors; lazy, broken or hidden images cannot
be certified from their figure/caption layout. Atom checks also compare each
entry's actual alternate-link destination; absent `rel` means `alternate`.


For a source-owned navigation, the same persistent target may remain briefly at
its exact previous URL before committing the exact approved next URL. A bounded
navigation wait rechecks lease, baseline and target identity throughout; only
those two URLs are admitted while pending, and both CLI/native observations must
converge on the destination before the recipe continues. A replacement or third
URL holds immediately. If navigation never commits, the result remains unknown
and cleanup can close that same owned target at either admitted pending URL;
the independent client disconnect and normal lease release still run.


## Observed native qualification

The actual installed helper and actual `verifyHubReader` consumer passed on the
already-live E15 and E14 pages on November 3 Pacific (November 4,
00:25:42–00:26:11 UTC). The closeout is
[the native qualification receipt](../reviews/newsletter-hub-reader-native-20261103-attempt1/qualification-closeout.json),
SHA256 `a9d1eacb12ecd94fe1322255dab08adcd1b1ed477d7b15b8fde5943c6a718e49`.
Its inventory binds the exact inputs and observations to reviewed functional code
tree `f681d33cc635d156535db3fb30b72862a32db379` and native/public revision
`df65ef115c39cff31d96126ff40f2add2cc64b63`.

Both runs verified full initial and hydrated article parity, metadata/headings,
canonical/index/latest/feed/404/revision checks and their exact CTAs. E14 followed
the actual approved attributed Readiness Scan anchor; no form was submitted.
The reader's signed-out purpose, non-headless user agent, owned target/tab and
client cleanup were observed, both normal releases were clean, and the final pool
state was down/unheld. Both articles had zero nested images, so native image
readiness remains unexercised; source regressions cover lazy/broken/hidden cases.

This receipt qualifies those read-only observations. It grants no writer,
mutation authorizer, publication, admission, merge, dispatch, deployment, timer or
runtime-installation authority, and does not certify future content or changed
installed tools. Subsequent changes must preserve the exact code/tool/data
boundaries and be verified at their own requested consumer boundary.


## Essay admission data

`data/hub-essay-admissions.json` carries only version 1 and the ordered
`essay_slugs` array. The fixed parser rejects unknown/duplicate keys, duplicate
slugs, invalid versions/slugs and oversized data. This overrides only essay
surface targeting; all other compiler gates and diagram admission are unchanged.
Invalid data yields consumer SKIPPED with the old generated bundle untouched;
strict compilation exits nonzero. Exported mapping/reader APIs reject invalid
configuration, and the exported list cannot be consumed as an empty fallback.

Admission plans bind protected main, the original data Git blob and SHA256, and
the proposed Git blob and SHA256 to the original immutable request/plan. The
injected writer rechecks the base tree and appends exactly the requested slug;
its tree contains one changed data leaf. Unrequested entries, removals, reorder,
base movement and unrelated tree edits hold. The normal compiler code closure
therefore remains fixed across later legitimate data-only admissions. Trusted
verification uses its base checkout's data; PR-supplied policy/code never executes
in that lane. Admission and content PRs remain separate and HUMAN_REQUIRED.

This source change does not install or qualify a writer. `advance` still requires
both an explicitly injected authorizer and bounded writer; the default CLI holds.
No authenticated GitHub writer fallback is provided. The weekly controller needs
a separately reviewed extension to its protected mutable-data receipt plus new
fixed code pins before consuming this source generation. Pending PR239's browser
endpoint fix remains a separate final reader-qualification dependency.

Roll out through reviewed source, verify migration parity and fake-GitHub
plan/advance/reconcile tests, then qualify the consumer separately. Monitor held
stages and original intent/readbacks without resending unknown attempts. Roll
back source through a reviewed revert; never delete reservations or remove live
admission data as an operational rollback, and never edit generated bundles by
hand. No source merge alone changes runtime, schedule, public delivery or grants.
