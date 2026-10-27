---
title: Diagnose a missing hub production deployment
verified: 2026-10-26
review_after: 2026-11-02
topics: [vercel, github, newsletter, deployment, production]
references:
  - .github/workflows/ci.yml
  - scripts/verifyProductionDeployment.mjs
  - docs/runbooks/edition-14-hub-release.md
---

# Missing production deployment

A green build or preview is not evidence that the merged revision reached
production. The post-merge `production-deployment` job waits up to ten minutes
for the exact SHA's latest Vercel Production status to succeed, a native commit status naming the exact Vercel project,
and the same SHA served at the fixed public `/deployment-revision.json` endpoint.
The build writes only schema version and the native Vercel Git commit SHA; unknown
local values are null. The endpoint is uncached and contains no credentials.
The observer has read-only
permissions and cannot recover or duplicate a deployment. It is not a pre-merge
requirement. Existing protections and editorial approvals remain separate.

## Diagnose

1. Bind the merged commit, merge time, target repo/project and production branch.
   Inspect push CI, Vercel commit statuses and deployment records for that exact
   SHA. Use the existing CLI auth; never export credentials.
2. Run the same observer read-only for an explicit revision:
   Set `HUB_MERGE_SHA` to the 40-character merged commit SHA, then run
   `node scripts/verifyProductionDeployment.mjs --repository OrionArchitekton/danmercede.com --sha "$HUB_MERGE_SHA" --once`.
   Without `--once`, it waits for up to ten minutes. API errors fail separately
   from absent/non-successful records or a missing/mismatched public revision.
   Public transport, HTTP, JSON and cache-policy errors are reported explicitly;
   a successful public response must actually carry `Cache-Control: no-store`.
   Builds predating this observer have no marker and cannot pass the new check. A real Vercel Production deployment may
   have `production_environment: false`; use its native environment name.
3. Inspect Vercel's project metadata: linked repository and exact `main` branch,
   automatic Git deployments, ignore command, repo configuration and account
   access. Query only needed metadata; omit environment values and billing data.
   Read the account activity log around the merge. Compare a working admission
   or earlier content merge with the missing request.
4. Verify the GitHub installation can read this repository. A project link or
   successful manual deployment alone does not prove the Git login connection
   or delivery of the missing push event. Account-level reconnection/sign-in is
   Dan's native action. Do not disconnect a working installation to test a guess.
5. The observer can also succeed after a manual recovery. To verify automatic
   recovery, bind a genuine approved subsequent merge to the Vercel activity
   record showing ordinary Git initiation, then verify the actual deployed copy.
   Do not manufacture content drift or release an ineligible edition as a canary.

## Recovery and validation

Dan's scoped release approval must cover an explicit production recovery. First
inspect inventory for an existing queued/building deployment of the accepted
SHA; an uncertain request permits readback, not duplicate submission. Preserve
existing team/project, Git source, settings, secrets and custom domains.

Only after approval, request one deployment pinned to the exact merged Git SHA
through the existing Vercel project. Recheck main before the request. Do not
upload a dirty checkout, mutate approved canonicals, widen token permissions or
create another deployment pipeline as a shortcut. Verify READY, public domain
assignment, served full copy, index placement, metadata/feeds, CTA and invalid
slug 404. The edition-specific runbook owns those content checks.

## Rollout, monitoring and rollback

- Rollout the read-only observer only after protected PR approval/merge. Confirm
  its post-merge job executes and the normal Vercel Git request is recorded.
- A red observer means delivery remains unverified; inspect its exact revision
  and provider state. Do not turn timeout or missing API data into success.
- Revert this observer through a normal reviewed PR if it misclassifies native
  data. It changes no platform setting and reverting it changes no deployment.
- Content rollback remains the separately approved verifier-aware sequence in
  the edition runbook. The observer grants no rollback or credential authority.
