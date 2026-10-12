---
title: Recover substrate sync PR authentication
verified: 2026-10-12
review_after: 2026-12-27
topics: [substrate, github-actions, authentication, pr-writer, token-expiry]
references:
  - .github/workflows/substrate-sync.yml
  - docs/solutions/2026-10-12-substrate-sync-pr-credential.md
---

# Substrate sync PR authentication

## Diagnose

Inspect the exact failed `Open review PR` log. A failed remote fetch may be
followed by a terminal push failure, so record both and identify the actual
terminating command. The workflow uses `SUBSTRATE_READ_TOKEN` for private source
checkout and a separate `SUBSTRATE_SYNC_PR_TOKEN` for the hub branch and PR.
Successful checkout, compilation or trusted verification does not test the writer.
`could not read Username` alone does not prove expiry, revocation or wrong scope.

## Authorized recovery and validation

1. Obtain explicit authority for the exact hub secret replacement. Dan handles
   sign-in and any native security review. Never type passwords/codes or export auth.
2. Use a fine-grained token selecting **only `danmercede.com`**, Contents and Pull
   requests read/write plus mandatory Metadata read-only. No substrate, account,
   administration, Actions, Workflows or Secrets permissions. Set an explicit
   expiry; the October 12 replacement expires January 10, 2027.
3. Keep the credential in memory. Verify the expected identity and selected hub.
   Prove Contents-write using a non-forced same-tip update to an existing authorized
   task branch, after checking its exact remote SHA. Prove PR-write by opening a
   genuine in-scope review PR when one is already needed; do not fabricate content
   or duplicate a PR for the test. Private-substrate access must remain denied.
4. Install only `SUBSTRATE_SYNC_PR_TOKEN` through `gh secret set` stdin. Never
   expose the value in chat, files, logs, screenshots, argv or commits. Clear the
   generated-token page, release the browser and verify secret update metadata.
5. Run strict sync on current main under dispatch authority. Inspect actual source
   checkout, strict nonempty compile, optimization and drift result. A no-drift
   run skips the writer: preserve that limit explicitly. The next genuine
   content-drift run must push its branch, open/update the expected review PR and
   trigger required checks before declaring the full Actions writer recovered.
   Do not rerun a pre-release main or manufacture drift to produce a canary.

## Failure and rollback

At native verification or security rejection, stop for Dan at that exact gate.
If verification fails, preserve non-secret status evidence and request authority
for any different credential action. Do not restore the already rejected value,
reuse a broad CLI token, widen scope, weaken branch protection or auto-merge.
Replacing a secret cannot roll back published content. Documentation PR #199
remains subject to normal review and separate human merge authority.
