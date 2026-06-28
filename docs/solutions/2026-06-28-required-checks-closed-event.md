---
verified: 2026-06-28
review_after: 2026-09-28
topics: [github-actions, required-checks, substrate-verify, danmercede.com]
references:
  - .github/workflows/required-checks-fail-closed.yml
  - tests/requiredChecksWorkflow.test.ts
---

# Required Checks Closed-Event Timeout

## Incident

`required-checks-fail-closed` ran after a pull request was merged and timed out
waiting for `substrate-verify`, even though the trusted `substrate-verify` check
had passed before merge.

## Root Cause

The workflow listened to every `pull_request` event. On `closed` events,
GitHub's workflow-run association for the trusted `pull_request_target`
`substrate-verify` run no longer matches the open-PR shape used by the resolver,
so the gate kept waiting for a run it could not trustably associate with the PR.

## Fix

Limit the gate to PR-open lifecycle events that can introduce or update a head
commit:

- `opened`
- `reopened`
- `synchronize`

Do not run this PR-open gate on `closed` or merged events. Branch protection and
the pre-merge required checks remain the enforcement point.

## Validation

- `npx tsx --test tests/requiredChecksWorkflow.test.ts`
- `npm test`
- GitHub Actions on the follow-up PR must show `required-checks-fail-closed`
  passing while the PR is open.

## Rollback

Revert the workflow event filter and this regression test. Expect merged PRs to
be able to create false red `required-checks-fail-closed` runs again.
