---
title: Verify the sync writer independently of a no-drift run
date: 2026-10-12
category: docs/solutions/incidents
module: substrate-consumer-authentication
problem_type: degradation
component: github-actions-substrate-sync-pr-writer
severity: medium
applies_when:
  - Strict compilation passes but the sync cannot push its review branch
symptoms:
  - Git fetch and push report could not read Username for https://github.com
  - Open review PR terminates at git push with exit 128
root_cause: unusable-pr-writer-credential
resolution_type: config_fix
operational_status: replacement-write-capability-verified-actions-drift-canary-pending
related_components: [substrate-sync, substrate-verify]
tags: [github-actions, substrate, authentication, pr-writer]
---

## What happened

After the separately verified private-substrate read-token repair,
[strict sync 38310461084](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38310461084)
passed checkout, strict compile, optimization and drift detection. In `Open review
PR`, authenticated Git fetch failed; the action continued with a local branch,
then Git push failed with `could not read Username`, exit 128. Fetch was not the
terminal failure. Approved content-sync PR #198 used existing CLI authentication
as a bounded fallback; E12 was independently verified live after its merge.

## Root cause and uncertainty

The workflow's separate PR-writing credential was unusable for authenticated
Git operations. Read access and compilation were not the failing boundary.
The old secret was last updated July 8, but its value was not retrieved and
expiry, revocation or incorrect scope was not independently established. Do not
present any one of those administrative explanations as a confirmed cause.

## Resolution and verification

On October 12, Dan explicitly authorized replacing this hub repository's exact
`SUBSTRATE_SYNC_PR_TOKEN`. The fine-grained replacement selects only
`OrionArchitekton/danmercede.com`, Contents and Pull requests read/write, and
mandatory Metadata read-only. It expires January 10, 2027. Native GitHub
confirmation showed three permissions on one repository.

Before installation, the replacement independently authenticated the expected
owner, read the exact task branch, and passed a non-forced same-tip ref update
(HTTP 200, no ref movement). It then created real release-evidence
[PR #199](https://github.com/OrionArchitekton/danmercede.com/pull/199) (HTTP 201),
which triggered the required Actions checks. A private-substrate file request
returned HTTP 404, confirming that repository was outside the writer's scope.
These positive write checks did not use the existing CLI credential.

The token moved only through process memory and `gh secret set` stdin. No value
entered chat, files, command arguments, screenshots, logs or commits. Secret
metadata independently records `2026-10-12T22:28:34Z`; the read token's update
remained `2026-10-12T20:34:42Z`. The generated-token page was cleared and the
leased browser released.

[Strict sync 38316883924](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38316883924)
ran current main `c6dc97b9ae3f5a93879168b773b80208a0f4a654` and succeeded at
22:29:26Z. Its actual private checkout, strict nonempty compile, asset optimization
and drift comparison passed. **No drift existed, so `Open review PR` was skipped.**
The token's direct write capability is verified; the full Actions Git-push and
PR-creation path still needs the next genuine content-drift canary. No synthetic
drift, redundant content PR, stale workflow rerun or workflow change was used.

## Prevention and rollback

Follow the [writer recovery runbook](../runbooks/substrate-sync-pr-authentication.md).
Diagnose read and write credentials separately, verify positive write capability,
and inspect step-level results rather than treating any green sync as writer proof.
Review renewal before January 10, 2027. No timer was armed and no branch protection
or merge gate changed. An incorrect replacement requires explicitly authorized
revocation/replacement with a verified narrow credential; the rejected old value
is not a working rollback. Content rollback remains a separate release action.
