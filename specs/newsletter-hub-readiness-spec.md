# Read-only newsletter hub catch-up readiness

This source slice diagnoses the hub's existing admission/content-sync workflow. It
implements one read-only part of the accepted newsletter automation Phase 5, not
an automatic reconciler. Source review grants no content admission, workflow
dispatch, PR creation, merge, deployment, publication or runtime authority.

## Consumer and evidence boundary

The consumer is an operator or later separately authorized reconciler deciding
which existing hub operation to inspect. Inputs are an explicit edition, intended
hub-release Monday, supplied full-publication observation snapshot, UTC-comparable
now and bounded scheduling grace. Output is versioned JSON with facts, provenance,
one diagnostic state and at most one advisory operation identity. Ops remains an
adjacent consumer; no Ops or brand-publish implementation is imported.

A supplied snapshot is a claim, not authenticated LinkedIn/provider verification.
Its complete observed coverage is a prerequisite for a readiness suggestion, not
a grant. Identity/time-only Ops projections and scheduled-item receipts are
insufficient. The diagnostic never visits LinkedIn or reads approval stores.

## Observable scenarios

1. **Full observation and precise time.** The selected edition has the fixed
   newsletter identity, a unique safe slug/native ID/canonical LinkedIn article
   URL, pinned package SHA256, matching pinned/observed title, actual publication
   timestamp, capture timestamp, evidence reference/digest and every required
   coverage item. Invalid, duplicate, missing, future, offsetless, date-only,
   contradictory or unsupported values produce `unverified`, with no operation.
   JSON is strict and bounded; unknown/duplicate keys cannot overwrite a claim.
   Actual publication may precede or follow its intended date; retain that truth.
2. **Eligibility and scheduled-run grace are separate.** Hub eligibility begins
   exactly at actual publication +168 elapsed hours. One second before is
   `too-early`; no date-only estimate, DST shortcut or nominal schedule substitutes
   for that instant. The intended hub-release week is explicitly bound to the
   selected snapshot record. Its existing Monday 08:10 America/Los_Angeles sync
   instant plus explicit grace defines the recovery window. Recovery is due at
   `max(actual publication +168h, nominal sync +grace)`. Grace is an integer
   1–60 minutes; the documented initial value is 15. When eligible but recovery
   is not due, absent visible work is `waiting-for-scheduled-sync`, never a
   missed-cron claim or dispatch suggestion. Schedule configuration stays intact.
3. **Fresh hub facts, not local guesses.** Resolve GitHub's current `main` SHA,
   read admission/compiler, generated essay bundle and workflow definition at that
   SHA, and inspect native workflow/run/open content-PR inventories. Re-read main
   after collection. A run is bound by native workflow ID, repository and either
   the exact workflow path or that exact path suffixed by `@` and its independently
   validated branch. Branch metadata is literal, valid UTF-8 and at most 255
   UTF-16 code units, checked with Git branch-name rules without checkout
   shorthand expansion. Single-level names (including `@`) and valid Unicode
   remain supported; reserved `HEAD`, leading dash and malformed ref syntax
   refuse. Different paths, prefixes and mismatched/empty suffixes refuse.
   A changed main, failed/truncated read, unknown status, unsafe
   source shape, disabled/unexpected workflow or inconsistent inventory is
   `ambiguous`, not absent work. Never execute fetched source or a PR's code. Verify each decoded Git
   blob digest and require the reviewed normalized workflow-data fingerprint;
   any semantic workflow drift requires reviewed diagnostic requalification.
4. **Override membership is not the entire admission path.** Canonicals can
   directly target `danmercede.com`; this reader does not inspect those private
   `surface_targets`. Report `allowlisted` separately and `admitted:true` only
   for an observed hub allowlist override, otherwise `admitted:null`. Bundle
   slug presence is `already-source-synced` regardless of admission mechanism,
   meaning source presence only; exact copy and public delivery stay unverified.
   With neither override nor bundle presence, report `ambiguous` with reason
   `canonical-targets-not-inspected`. These inputs cannot establish
   `needs-admission`, so that state is not produced. No content is rewritten.
5. **Existing global work wins over another catch-up.** A queued, requested,
   pending, waiting or in-progress run of the exact sync workflow across all refs is
   `existing-queued-running`. Its event SHA may be older than current main: the
   queued job checks out main after acquiring the shared workflow concurrency
   group. Manual dispatches from another ref may share that same group and fixed
   content-PR branch; their active runs conservatively hold the workflow too. Hold that global workflow across all editions. One open same-repository
   content PR on the fixed sync branch is `existing-pr`; report its number/head
   and whether its pinned generated bundle contains the requested slug. An
   existing unrelated-content sync PR still owns that branch; inspect it rather
   than suggesting another dispatch. Duplicate/inconsistent candidates refuse.
6. **Only an advisory operation identity.** When full supplied coverage is usable,
   recovery is due, an allowlist override exists, the current bundle lacks the slug, complete
   inventories contain no active sync or existing content PR, and no unexplained
   terminal attempt at the current main SHA blocks the decision, report
   `dispatch-if-authorized`. The global dedupe identity is repository + workflow
   + main ref + observed main SHA, never edition/revision-specific. A failed or
   completed attempt at the current main SHA on any ref, with an unexplained
   missing result, is `ambiguous` and names that attempt for inspection. A successful CI
   run alone neither proves content sync nor public delivery. An absent run row
   cannot prove a delayed scheduled trigger will not arrive.
7. **Read-only, bounded, independently consumable.** All native commands are fixed
   `gh api` GET argument vectors for the one hub repository and GitHub host; no
   shell, arbitrary command/repository/URL override, dispatch, PR/merge/deploy
   route, timer, state directory or ledger exists. No receipt or input file is
   written. JSON always includes `authority_granted:false` and
   `public_delivery:"unknown"`. A later executor must re-probe current facts and
   independently establish authority/intent; a dedupe key is not an authority
   token or an exactly-once guarantee.

## Concrete interface

Proposed invocation (paths remain operator-supplied private files):

```sh
node scripts/newsletterHubReadiness.mjs \
  --publication-evidence-path /private/publication-coverage.json \
  --slug 2026-10-26-who-gets-to-interrupt-your-ai-work \
  --release-week 2026-11-02 --sync-grace-minutes 15 \
  --now 2026-11-02T16:25:00Z
```

All five arguments are required. `release-week` is an explicit Monday in Pacific
calendar time and must equal the selected observation's `hub_release_week`.
Strict instant inputs require seconds and an explicit `Z`/numeric offset;
invalid calendar components/offsets, `-00:00` outside the admitted ISO input profile, and arithmetic overflow
refuse. The diagnostic computes the Pacific nominal instant; it never changes a
cron. E15: actual `2026-10-26T14:08:08Z`, eligible
`2026-11-02T14:08:08Z`, nominal `2026-11-02T16:10:00Z`, recovery due with 15-minute
grace `2026-11-02T16:25:00Z`. An E16 time fixture uses actual
`2026-11-02T15:02:46Z` and eligibility `2026-11-09T15:02:46Z`; it does not
prepare, admit or release E16 content. If publication is late enough that its
168-hour instant follows nominal+grace, that later actual-time boundary wins.

Input envelope: `schema_version:1`, `kind:"newsletter-publication-coverage"`,
`newsletter_id:"7477834312608866304"`, `editions:[...]`. Each edition has exactly:

- `slug`, `title`, `observed_title`, `hub_release_week`, `native_id`, `public_url`;
- `package_sha256`, `published_at`, `observed_at`, `evidence_ref`, `evidence_sha256`;
- `coverage`, a unique string array containing `identity`, `publication_time`,
  `title`, `body`, `headings`, `anchor`, `cover`, `caption`,
  `commentary`, `cta`.

This is the existing journal FULL_PUBLIC vocabulary. `body` includes exact literal
identifier text; LinkedIn inline-code font loss is not a separate coverage item.
The snapshot producer must attest that full comparison, rather than translating
identity/time projection coverage into body verification.

Full snapshot coverage is explicitly supplied, never independently authenticated
by this reader. Publication must be no later than capture, and capture no later
than explicit now. Matching titles and coverage do not authorize any outward act.
Evidence references are retained as inert strings, never opened or executed.
Files are regular, final-component no-follow, stable across bounded reads and at
most 1 MiB. Duplicate slugs/native identities/canonical public URLs refuse.

Output envelope: `schema_version:1`, `kind:"newsletter-hub-readiness"`, `slug`,
`now`, `release_week`, `sync_grace_minutes`, `publication`, `source`, `existing`,
`decision`, `authority_granted:false`, `public_delivery:"unknown"`.

- `publication`: supplied-snapshot status/provenance, native identity, canonical
  public URL and title, actual/capture/eligibility,
  nominal-sync/recovery-due instants, eligible flag, evidence reference/digest,
  missing coverage. Unknown facts remain null; estimates never replace them.
- `source`: repository, main SHA, `allowlisted` boolean, `admitted` true for the
  observed override or null for uninspected canonical targeting, and bundle slug
  presence. These facts grant no editorial/release authority; content equivalence
  remains `"not-checked"`.
- `existing`: bounded scrubbed run IDs/branches/statuses and PR numbers/head SHAs/target
  slug presence; raw source, result payloads, bodies and provider errors omitted.
- `decision`: one scenario state, finite reason codes, optional structured
  operation `{kind:"workflow-dispatch", repository, workflow_path,
  ref:"refs/heads/main", observed_main_sha, dedupe_key}`. No executable command or
  approval payload is returned.

Exit 0 means a complete diagnostic was emitted, including holds/waits. Invalid
CLI syntax is exit 2. Unusable snapshot emits `unverified` and exits 0; a native
read failure emits `ambiguous` and exits 0. Unexpected internal failure exits 1
with a scrubbed error and no suggested operation. Never echo private input,
child argv/environment, provider response bodies or credential material.

## Decision precedence and test seams

Use one CLI/native-reader seam: injected fixed-argv executor returning mocked
native JSON, temporary observation files and explicit clock. A pure decision
function consumes already validated facts. Gate unusable observations before any
native calls, then `too-early`. With eligible observations, collection failures
or inconsistent facts take `ambiguous`; otherwise source-synced, uninspected canonical targeting,
existing global run, existing PR, waiting for nominal sync/grace, unexplained
current-main terminal attempt, then advisory dispatch, in that order. Waiting is
not absence proof. Native failures never become empty arrays.

Required regressions: E15 DST, E16 precise boundary, late/early actual publication,
07:05 eligibility before 08:10 sync/grace, duplicate snapshot keys/IDs, partial
coverage/identity-time-only input, main movement, queued old-head run, existing PR
with unrelated drift, malformed/paginated inventories, unknown statuses, disabled
workflow, failed current-main attempt, and same dedupe key across editions at
one main SHA. No live network in unit tests. A later one-shot actual read-only CLI
canary uses an already released edition and supplied private snapshot. It never
performs or proves public delivery and never admits new content.
