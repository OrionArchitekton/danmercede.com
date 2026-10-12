---
verified: 2026-10-12
review_after: 2026-12-27
topics: [substrate, github-actions, authentication, token-expiry]
references:
  - .github/workflows/substrate-sync.yml
  - .github/workflows/substrate-verify.yml
  - docs/solutions/2026-10-12-expired-substrate-read-token.md
---

# Private substrate checkout authentication

## Diagnose

Inspect the exact failed Actions job and checkout step, not merely the aggregate
check. `terminal prompts disabled` may mean missing, expired, revoked or incorrectly
scoped access. Compare secret update metadata and, with authorized native account
access, the token's status and resource/permission scope. Never read unrelated
secrets, reuse a broad CLI credential or print values to diagnose this class.

`substrate-verify` can remain green after failed checkout because it preserves the
base bundle. Actual private checkout success is required evidence. Strict sync is
fail-loud and opens no PR after failed fetch or zero matches.

## Authorized replacement

1. Obtain explicit authority for the exact repository secret replacement. Dan
   handles sign-in/native verification; do not type passwords/codes or export auth.
2. Prepare a fine-grained token for only `dan-mercede-substrate`, Contents read-only
   and mandatory Metadata read-only. Set an explicit expiry. The October 12
   replacement expires January 10, 2027; review renewal before that date.
3. Transfer the generated credential only in memory. Verify a private substrate
   file read before writing the exact hub `SUBSTRATE_READ_TOKEN` through encrypted
   `gh secret set` stdin. No values in argv, chat, logs, screenshots, files or commits.
4. Clear the generated-token page, release the browser, verify secret update
   metadata, then rerun trusted verification and inspect its actual private
   checkout/compile results. Keep source tokens confined to their existing
   trusted steps; never expose them to PR-controlled code.
5. Under separate dispatch/release authority, run strict sync and inspect its
   checkout, nonempty compile and generated review PR. The PR-writing token is
   separate; do not rotate it preemptively or claim it works from a read-token test.
   For that separately authorized repair, use
   [the writer recovery procedure](substrate-sync-pr-authentication.md).

## Failure and rollback

At a native verification or review gate, stop at that exact gate. Do not use admin
merge, weaken branch protection or enable auto-merge to work around authentication.
If a replacement is wrong, preserve the failed non-secret evidence and obtain
authority to revoke/replace it with another narrowly verified credential. Do not
restore an expired token as though it were recovery. This repair cannot revert a
generated-content merge or a published edition; use that release's own rollback.
