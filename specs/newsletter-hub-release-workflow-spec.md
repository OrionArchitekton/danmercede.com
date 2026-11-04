# Newsletter hub release workflow

This hub-owned workflow prepares and reconciles separate admission and strict
content PRs, reserves a missed-sync recovery once, and verifies the real reader
outcome. It never merges, deploys, edits credentials or activates a runtime.
Current estate classification remains `HUMAN_REQUIRED`; the ratified pilot's
conditional merge grant does not replace that result.

## Command and evidence contract

Use the existing installed loader, without an installation fallback:

```sh
node --import tsx scripts/newsletterHubRelease.ts plan \
  --request /private/hub-request.json --job-dir /private/hub-job \
  --now 2026-11-09T15:05:00Z
```

Commands `plan`, `inspect`, `reconcile` take those three required arguments.
`advance` additionally requires `--execute-action prepare-admission|recover-sync`,
`--plan-sha256 HEX` and `--max-actions N`. One advance handles exactly one logical
action; N bounds its constituent native API writes, not additional logical work.
`plan` performs external reads and writes only its bound private artifact into
the explicit, already owned, non-symlink private job directory. `inspect` is
strictly read-only. `reconcile` may append verified native readbacks and public
observations to an existing job; it never repeats an external write.

The production CLI's mutation authorizer is unadmitted and denies all writes.
Flags, plan digests, supplied policy files, a Grokbot acknowledgement and this
source implementation cannot grant authority. An injected authorizer seam tests
the actual bounded native request bodies through an explicitly injected writer; a future admitted executor must bind the exact
operation, private journal root, action and current digest. There is no merge
adapter, safe-class override or supplied-human-review switch.

Request JSON has exactly `schema_version:1`,
`kind:"newsletter-hub-release-request"`, `operation_id`, `week` (original newsletter publication Monday), `release_week`
(the nominal hub Monday, exactly seven calendar days later),
`slug`, `canonical:{commit,path,sha256}`, `publication_snapshot:{path,sha256}`,
and `cta:{kind:"question",text}` or `cta:{kind:"external",text,url}`.
Canonical repository, hub repository, workflow and branch namespaces are fixed
source constants. Canonical paths stay under `publishing/canonical/`; full Git
and SHA256 pins are required. Snapshot coverage is genuine supplied evidence,
not authenticated current provider observation. Source claims never mint a grant.

Outer JSON is `schema_version:1`, `operation_id`, `week`, `kind:"hub"`,
`input_sha256`, `status:"completed"|"failed"|"unknown"|"held"`,
`artifacts:[{ref,sha256}]`, `holds:[code,...]`. Artifact refs are job-relative names; only internal readers resolve them under the admitted private root. Completed means the requested
private operation only. A separately hashed hub-stage artifact carries the exact
source/native PR/run/deployment/reader evidence, stage, explicit
`merge_gate:"HUMAN_REQUIRED"` and `public_delivery:"unknown"|"verified"`.
No consumer may infer public delivery from the outer completed status.

## Observable scenarios

1. A request's exact bytes bind every artifact and persistent record. Unsafe,
   duplicate, changed or missing inputs hold before any native mutation. Explicit
   now, selected snapshot week, full observed coverage and immutable canonical
   hashes must agree. Publication semantics use the exact already-read, digest-verified bytes without reopening the evidence pathname. Missing evidence never becomes an estimated release time.
2. Eligibility is actual publication +168 elapsed hours, reusing the merged
   readiness checker. E15 crosses the November 1 DST change without shortening
   the week. E16's earliest instant is `2026-11-09T15:02:46Z`. A recovery dispatch
   additionally waits until Monday 08:10 Pacific plus explicit existing 15-minute
   grace. No date-only, intended schedule or later draft substitutes for evidence.
3. Planning reads pinned main/admission-data/bundle/workflow and complete global
   workflow/ref/PR inventories through the existing checker. It previews an
   admission-only data patch appending exactly the requested slug, preserving existing order and all other tree leaves, and maps the
   pinned canonical using the trusted local compiler. It never hand-edits the
   generated bundle or sealed source. Bundle presence without allowlist membership
   remains valid; absent override alone does not establish absent direct targeting.
4. An explicitly authorized prepare-admission action creates/reconciles one fixed
   branch and admission PR. Only the declared allowlist data may change. It records
   each Git object/ref/PR intent before its native write and verifies native
   readbacks. Existing foreign or inconsistent branches/PRs hold, never get reset,
   overwritten, force-pushed, closed or duplicated. Main movement invalidates a
   stale mutation plan. A prepared PR remains awaiting `HUMAN_REQUIRED` merge.
5. After a separate actual admission merge, the existing trusted strict sync is
   the only content writer. An active run on any ref or existing fixed-branch PR
   blocks another dispatch. Once genuinely due and absent visible work, one
   recovery dispatch is reserved before sending. An uncertain send is unattributed
   and verification-only; no timeout, new main SHA or changed plan creates a retry.
   The unchanged workflow exposes no unique request ID, so timing alone cannot
   authenticate which run was ours. A matching resulting artifact may establish
   the requested effect without rewriting that uncertainty into attribution.
6. A separate content PR is read and validated, never merged. The target's exact
   compiler-produced title/date/preview/category/body must
   match the pinned canonical. Every unrelated current Thought and Diagram stays
   byte-equivalent; additions/removals/changes outside this release hold. Preserve
   newer already present editions and their newest-first presentation. Changes requiring new materialized assets hold in this version; no incomplete asset release is accepted. Green CI
   does not replace content equivalence. Unknown, stale or failing checks/threads
   remain holds and current merge classification always remains human-required.
7. Restarts reuse immutable action/sub-write intents and readbacks. An exclusive
   no-follow create reserves each write once. Every private-root ancestor is opened through retained no-follow directory descriptors and revalidated; a changed ancestor cannot redirect writes. Historical inspection compares parsed instants, including mixed valid offsets. A started sub-write without a
   verified receipt is unknown and may only be reconciled. A verified receipt
   permits later unstarted substeps under fresh authority. No reset, TTL stealing,
   duplicated PR, dispatch or synthetic receipt exists. Conflicting records hold.
8. After an independently authorized content merge, reuse the existing exact-SHA,
   project-specific Production deployment and served-revision verifier. Then read
   actual initial HTML: exact title/preview/date/body rendered with the existing
   Markdown component, headings/literals/anchors/figures, canonical, Thoughts
   index/latest order, sitemap, RSS, Atom and a real invalid-route 404. Follow the
   actual approved external CTA without form submission. Compare the actual visible hydrated article, including ancestor opacity, after client navigation using a separately qualified isolated signed-out browser recipe, with exact revision bookends. Without that runner the public result remains unknown. Only the full independent
   reader comparison may set `public_delivery:"verified"`; revision or PR/CI
   status alone leaves it unknown. Preserve deployment/source movement as a hold.

## Test seams and delivery

Use one injected fixed GitHub/native HTTP seam, temporary private job roots and
real structured Git object/PR state fixtures. Tests exercise actual writer bodies,
AST patch preservation, restart/uncertain-write reconciliation and full public
initial and hydrated HTML comparison. Fixtures do not qualify the native writer or browser executor. Existing compiler tests prove its new optional admission
preview parameter preserves default behavior and generated bytes. No live mutation
is used for tests or qualification. A later parent-directed read-only source CLI
canary is separate from live operation activation.

Run installed dependency setup, typecheck, full tests, production-guarded build,
built-output tests and staged/range secret checks. Root behavior spec and operator
runbook ship together. No timer, service, dependency, credentials, actual edition
admission or production configuration is changed by source implementation.

## Installed public browser

After source/native/initial-reader parity, normal reconciliation may use the
existing installed reader pool and agent-browser tools. It leases only the
signed-out `reader` identity for a bounded five minutes under a unique holder,
checks exact supported versions, identity/purpose/expiry and a non-headless Chrome
user agent before public navigation, and owns one dedicated blank tab. The fixed
recipe is the only command producer. Changed/foreign tabs, expiry or refusal hold
without alternate identity or retry. Close the owned tab and unique CDP session,
then release the same holder normally in `finally`; cleanup uncertainty keeps
public delivery unknown. Never expose lease capabilities/endpoints in artifacts
or process errors. No cookie/credential/state export, form submission, sends,
installation, update, timer or new mutation authority is added.

The process seam tests installed-version JSON shapes, ordering, busy refusal,
wrong identity/headless/version/expiry/tab drift, capability scrubbing and cleanup.
A later explicitly directed native public-reader qualification remains separate.


## Reader and reconciliation integrity

The reader's static import graph contains no executable generated corpus. Pure
feed projection accepts explicit already-verified data; the existing public feed
API/default CLI preserves its bytes. A replaced generated file cannot execute
before controller qualification. Reconciliation rechecks the exact freshly
emitted plan name/hash and operation binding through the admitted root before
semantic use. Saved dispatch uncertainty remains visible without another send.

The installed reader preserves the exact owned loopback WebSocket lease URL and
uses same-origin read-only target discovery to bind a nonce-created persistent
CDP target to its unique tab mapping and expected URL. Detected identity/URL/target drift holds and prevents further index-based commands or tab closure. Checks run before and after commands under the exclusive lease; the installed index-only protocol does not provide an atomic target transaction against an actor violating that lease. The unique client disconnects even
when owned-tab cleanup cannot proceed; normal lease release remains mandatory.
Every nested article image must load/decode and remain effectively visible,
including through ancestors. The Atom alternate link must match the intended
entry; missing rel is treated as alternate.

A crash-left second journal link can be removed only in an explicitly mutating
private operation after strict same-inode/content/ownership verification. Payloads
and unrelated files never change; strict inspection remains read-only.


A trusted navigation may be pending on the same owned target. Within a bounded
wait, admit only the exact source and destination URLs while rechecking lease,
baseline and persistent target identity. Continue only when both native and CLI
observations reach the destination. A replacement or unapproved third URL holds;
a timeout stays unverified and still cleans up the original owned target safely.
