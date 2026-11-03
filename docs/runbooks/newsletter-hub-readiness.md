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

# Newsletter hub readiness — runbook outline

Planning artifact only: the CLI below has not been implemented or qualified.
Complete the validation receipts during implementation; this outline establishes
no installed monitor, reconciler, dispatch route or authority change.

## Proposed one-shot diagnostic

Use the intended edition's private full-publication coverage snapshot, an explicit
hub-release Monday and strict current instant. Initial grace is explicitly 15
minutes after that Monday's existing 08:10 Pacific sync. The recovery gate is the
later of that instant+grace and actual publication+168 elapsed hours. A generic
Ops identity/time projection is insufficient. Snapshot fields are supplied claims,
not authenticated provider evidence, and references are never opened/executed.

```sh
node scripts/newsletterHubReadiness.mjs \
  --publication-evidence-path /private/publication-coverage.json \
  --slug 2026-10-26-who-gets-to-interrupt-your-ai-work \
  --release-week 2026-11-02 --sync-grace-minutes 15 \
  --now 2026-11-02T16:25:00Z
```

The diagnostic uses existing read access through fixed `gh api` GET commands.
It requests no credential export or secret loading. Output is versioned scrubbed
JSON. Every result retains `authority_granted:false` and public delivery unknown.
No input/source/receipt/state file is written. There is no polling or helper timer.

## Reading the result

- `unverified`: missing/partial/invalid supplied coverage; preserve the real
  evidence gap. Do not infer actual public verification from title/CI alone.
- `too-early`: fewer than 168 elapsed hours; actual publication time remains true.
- `waiting-for-scheduled-sync`: eligible but nominal sync+grace not reached;
  this is not a missed-cron receipt.
- `needs-admission`: current-main admission is absent. This authorizes neither
  admission nor content preparation; use the established two-PR trust split.
- `existing-queued-running`: inspect the same global run, including old event
  SHAs that may later checkout current main; do not start overlapping work.
- `existing-pr`: inspect that existing fixed-branch content PR/head, including
  unrelated content drift. An open PR is not approval to merge it.
- `already-source-synced`: allowlisted slug exists in current-main generated
  source. Exact package equivalence, deployment and reader delivery stay unproven.
- `dispatch-if-authorized`: advisory operation identity only, with current main
  SHA and a global workflow dedupe key. Re-probe before any later authorized
  executor acts; this tool never dispatches or grants permission.
- `ambiguous`: preserve the concrete uncertainty and existing IDs. Truncation,
  failed APIs, unknown status, moving main or unexplained terminal attempts are
  not evidence of absent work. No speculative retry, duplicate PR or dispatch.

## Validation and canary to complete

During implementation, add captured npm/typecheck/unit/build/built-output/secret
receipts and one native read-only CLI result for a previously released edition.
Verify exact current-main/source binding, bounded complete run/PR inventory,
explicit publication/nominal/grace clocks and no file mutations. A supplied
snapshot never becomes a native-provider or public-delivery claim. Do not prepare
or admit E16 hub content as part of diagnosis or qualification.

## Rollout, monitoring and rollback

Source delivery is separate from any future runtime adoption. No workflow,
allowlist, generated bundle, cron, policy, provider, credential, timer or standing
editorial/publication hold changes. Existing newspaper/writing surfaces and the
trusted/untrusted CI lanes stay intact. At a necessary human or later authorized
reconciler read, run once; routine unchanged waits create no messages or polls.

Rollback is a reviewed source revert of this diagnostic/test/CLI entry and docs;
preserve snapshots, native IDs and existing PRs/runs. There is no installed
runtime, ledger or public action to undo. Any future actual write path requires
its own exact authority, durable intent and rollback design before implementation.
