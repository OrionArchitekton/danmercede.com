# Production deployment verification

After a reviewed commit reaches the protected production branch, a successful
local build does not establish that the Git hosting integration requested or
completed a production deployment. CI must report a missing handoff separately.

- After the main-branch build passes, inspect only deployment records for the
  exact merged revision. A preview, an older revision, another actor's record,
  or a non-successful latest status does not establish the handoff. Require the
  native commit status to name `dan-mercedes-projects/danmercede-com` and require
  the canonical public origin to serve the same revision.
- Wait at most ten minutes for Vercel's successful Production record; otherwise
  fail visibly. Provider/API errors fail visibly. A newer push cancels the
  older verification job.
- Pull requests do not run the post-merge check. Existing pre-merge requirements,
  release approval, content admission and review remain unchanged.
- This observer has read-only GitHub permissions, no Vercel credential and no
  mutation path. It cannot deploy, merge, retry a release, or repair an account.
- The build emits `/deployment-revision.json` with schema version 1 and only the
  native `VERCEL_GIT_COMMIT_SHA`; a local or malformed value is null. Serve it
  with `Cache-Control: no-store`. The observer reads that fixed public origin
  without credentials, verifies that the actual response says `no-store`, and
  requires its SHA to equal the merge. Public transport, HTTP, cache-policy and
  JSON errors fail separately from a well-formed stale revision.
- A matching success is project-specific deployment and served-revision evidence. Verify actual served copy
  and CTA through the edition release procedure. A manually recovered deployment
  can satisfy delivery; it does not prove automatic event handling recovered.

Test seams: the Node observer with recorded-shape GitHub responses, the real
operator CLI, build-output tests for the revision marker, and workflow configuration parsed by the existing test suite.
Activation acceptance: a scoped approved main merge must start its ordinary
Vercel Git deployment and pass the post-merge check. A preview alone is insufficient.
