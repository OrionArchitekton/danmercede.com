---
verified: 2026-11-02
review_after: 2026-12-02
topics: [newsletter, hub, github-actions, diagnostic]
references:
  - specs/newsletter-hub-readiness-spec.md
  - docs/superpowers/plans/2026-11-02-newsletter-hub-readiness.md
  - .github/workflows/substrate-sync.yml
  - scripts/compileContent.ts
  - docs/runbooks/newsletter-hub-sync.md
---

# Read-only newsletter hub readiness

This source CLI diagnoses one supplied edition against the current hub main,
existing admission and content-sync workflow. It grants no authority and creates
no dispatch, PR, merge, deployment, monitor or receipt. Run from a reviewed source
checkout with the repository's locked dependencies installed by `npm ci`.

## One-shot diagnostic

Use the edition's private full-publication coverage snapshot, an explicit intended
hub-release Monday and a strict current instant. The snapshot schema is in the
behavior spec. It uses the existing journal's FULL_PUBLIC coverage vocabulary;
`body` includes literal identifiers. Identity/time-only Ops projections are
insufficient. Supplied fields remain claims, not authenticated provider proof.

```sh
node scripts/newsletterHubReadiness.mjs \
  --publication-evidence-path /private/publication-coverage.json \
  --slug 2026-10-26-who-gets-to-interrupt-your-ai-work \
  --release-week 2026-11-02 --sync-grace-minutes 15 \
  --now 2026-11-02T16:25:00Z
```

All arguments are required. The file is bounded to 1 MiB, regular, stable and
final-component no-follow. Strict JSON duplicate keys, unsupported fields,
incomplete coverage, contradictory titles/times or duplicate identities refuse.
Instants use seconds, up to millisecond precision, and an explicit timezone;
`-00:00` is outside this admitted ISO input profile. Native article URLs use
`https://www.linkedin.com/pulse/<lowercase-ascii-slug>` with optional trailing
slash, normalized for duplicate identity checking. Evidence references are inert.

Eligibility is actual publication +168 elapsed hours. Recovery is the later of
eligibility and that Monday's existing 08:10 Pacific sync +explicit 1–60 minute
grace (initially 15). DST never shortens the elapsed week. Early/late observed
publication remains true; a nominal schedule never replaces it.

The fixed native adapter uses only `gh api --hostname github.com --method GET`
for `OrionArchitekton/danmercede.com`. It requests no credential export. Each
process is bounded to 10 seconds and 2 MiB stdout. Sources are pinned to current
main, decoded up to 1 MiB and parsed as literal TypeScript/YAML data without
execution. Current main is re-read after complete inventories. Workflow runs are read across all refs: another ref
can own repository-wide concurrency and the fixed PR branch. Validated branch
metadata is reported; unusable branch metadata holds. Run/PR inventories
are bounded to three pages of 100; truncation and native errors hold. Each decoded file must match its native Git blob digest. The exact reviewed
workflow YAML data is fingerprinted independently of comments/key order; any
semantic edit requires a reviewed diagnostic requalification. Unexpected workflow
triggers, sequence, checkout, compile or concurrency posture also hold.
No input/source/state file is written; there is no polling loop.

## Reading the result

Every JSON result retains `authority_granted:false` and
`public_delivery:"unknown"`. Exit 0 means a complete diagnostic, including holds;
invalid CLI syntax exits 2, unexpected internal failure exits 1. Errors are
scrubbed and never print native response bodies, environments or child commands.

- `unverified`: missing/partial/invalid supplied coverage. Obtain the real missing
  observation; title, schedule, merge and CI alone cannot fill it.
- `too-early`: fewer than 168 elapsed hours. Preserve the actual timestamp.
- `waiting-for-scheduled-sync`: eligible, but nominal sync+grace has not elapsed;
  absence is not a missed-cron receipt.
- `needs-admission`: current-main admission is absent. The existing admission PR
  then separate content-sync PR trust split remains required.
- `existing-queued-running`: inspect the same global run across all refs, including
  manual other-ref dispatches and old event SHAs whose queued job later checks out
  current main. Do not overlap it.
- `existing-pr`: inspect that existing fixed-branch PR/head, even if it contains
  unrelated content. Its existence grants no merge authority.
- `already-source-synced`: allowlisted slug exists in current-main generated
  source. Exact copy, deployment and public reader delivery remain unverified.
- `dispatch-if-authorized`: advisory operation identity only. The global dedupe
  key binds repository/workflow/main ref/main SHA, never edition. A later
  independently authorized executor must re-probe and reserve its own intent.
- `ambiguous`: failed APIs, incomplete inventories, unknown states, moving main,
  unsupported source/workflow, inconsistent candidates or unexplained current-main
  terminal events at the current main SHA on any ref. Inspect existing IDs; do not manufacture empty inventories.

## Validation and native canary

Implementation validation: the focused CLI seam covers precise E15 DST/E16
boundaries, late publication, strict JSON/file safety, source data parsing,
queued old-head work, unrelated PRs, main drift, scheduling grace, pagination,
unknown states and global dedupe. `npm test` includes this file explicitly.
November 2 source validation passed: 20 focused scenarios, 482 full-suite tests,
21 built-output tests, typecheck, production-consumer build, whitespace and
staged/range secret scans. Run `npx tsc --noEmit`, `npm test`, `npm run build`,
`npm run test:built`, `git diff --check` and range/staged secret scans before
subsequent delivery.

For an asset-preserving production-consumer build in a sibling checkout, set
`SUBSTRATE_PATH` to an explicit empty private directory. Otherwise the existing
prebuild may find the adjacent substrate and re-copy its original diagram assets;
those derived copies are not changes belonging to this diagnostic PR.

The parent-owned one-shot native CLI canary ran at 2026-11-03T06:46:27Z from
source e252a7575c51281b317ea70dafda4b8eb118cfe3. All six retained E15 publication
evidence files matched their inventory before constructing a supplied historical
snapshot. Current main e2bd8cab371d09c35c515f985c247f53bf57a1d8 reported E15
admitted and present, 49 complete workflow runs and no open fixed-branch PR. The
result was `already-source-synced`, operation null, authority false and public
delivery unknown. No native mutation or E16 preparation/admission occurred. This
checks actual GitHub source reads; it does not re-authenticate old publication
observations, compare exact content or establish public delivery. Future reads
must preserve `unverified` when genuine full coverage is unavailable.

## Rollout, monitoring and rollback

Source delivery is separate from runtime adoption. Protected main merges may
trigger the existing Vercel production deployment; assess that separate authority
before any merge. A source worker commits for review and never merges or deploys.
No workflow, allowlist,
generated bundle, cron, approval policy, provider, credential, timer or standing
editorial/publication hold changes. Existing writing surfaces and trusted versus
untrusted CI lanes remain intact. At a necessary operator or later authorized
reconciler read, run once; unchanged waits create no messages or helper timers.

Rollback is a reviewed source revert of this diagnostic, test entry and docs.
Preserve snapshots, native IDs and existing PRs/runs. There is no installed
runtime, ledger or public action to undo. Any future writing path needs exact
additional authority, durable intent and its own rollback design.
