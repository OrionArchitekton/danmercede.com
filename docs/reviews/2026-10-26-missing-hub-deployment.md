# Edition 14 missing automatic deployment investigation

The accepted content merge is `545ca97c45965c7a1b5bfcb568b505dc740db078`,
PR #225, October 27 05:28:40 UTC (October 26 22:28 Pacific). Push CI ran and passed.
The prior admission merge `2e7a166` automatically deployed at 05:23:19 UTC, and
content PR head `7f79cac` automatically produced a preview at 05:24:02 UTC.

## Observed boundary

There was no Vercel production request, queued/failed deployment, commit status
or activity event for the content merge before explicit recovery at 05:31:14 UTC.
A later inventory still contains only that explicit deployment for this SHA.
The manual deployment reached READY and the full public essay/CTA were verified
in the preceding release closeout. That fixed the release, not its automatic trigger.

The current project links the correct public GitHub repository and `main`;
Git deployments and custom-domain assignment are enabled, and the ignored-build
command is null. The content commit changed only the generated bundle; its
Vercel configuration, author identity and email match the successful admission.
There are no workspaces or deployment-disable settings in the repo. The GitHub
installation exposes this repository without access restriction, and the account
is a confirmed team owner. Earlier content sync #220 deployed automatically.

The public status histories report no incident covering this merge interval.
The signed-in CLI can read project/activity/install metadata, but GitHub's
provider-owned webhook delivery records are not accessible through the current
user token. The dan browser is signed out of the Vercel dashboard. No login or
connection mutation was attempted. Native account Git-login readback remains open.

## Confirmed repo defect and bounded repair

CI had no post-merge deployment check. The WebSub job only warns if its feed
baseline is unchanged, and the existing production smoke checks older known
routes rather than the merged revision. A missing deployment could therefore
leave green builds while production still served the older bundle.

The new read-only post-merge observer checks the exact merged SHA, Production
environment, Vercel actor and latest successful status. Review additionally
requires a native project-specific commit status and matching source SHA from
the actual public origin; repository-wide deployment records alone are insufficient.
The build emits an uncached, non-secret revision marker for that consumer check. It is bounded and never
sends or deploys. Tests replay absence, previews/older revisions, delayed success,
failed statuses, wrong actors, malformed data and provider errors. The first observer
revision recognized the recovered Edition 14 GitHub records read-only. The tightened
observer also requires the new public marker; pre-feature deployments lack it and
cannot establish activation. Its first complete positive live test must use this PR
through the normal protected merge and Vercel Git path.

The original provider-side reason for omitting the request is still unknown.
Do not label the integration repaired, invent a webhook or authentication cause,
or close a provider incident from this observer alone. Required remaining proof:
native account-connection inspection and a genuine approved main-merge canary
whose deployment starts through ordinary Git and whose consumer output is verified.

Evidence: neighboring `hub-deployment-20261026/activity.json` and
`configuration.json` retain only this project's selected non-secret metadata.
References: [Vercel troubleshooting](https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel),
[Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github).

## Review adjudication

- Live activation remains operator-gated: an approved protected-main merge is
  necessary before its ordinary production deployment can be observed. Do not
  remove this acceptance criterion to make pre-merge review green.
- Fixed the public-read failure classification: transport, HTTP, JSON and
  missing `no-store` failures are explicit. The actual response header is checked,
  so a source-only header assertion cannot establish successful verification.
- Added direct tests of the actual CI GitHub reader for malformed/empty JSON,
  non-array bodies, empty result arrays and subprocess failures. Empty arrays
  mean absence, not success. Query/result filters reject unrelated deployments.
- The arbitrary-host concern does not establish a false public-release success:
  the observer never fetches the candidate URL and always requires the exact SHA
  at the fixed canonical public origin plus the native named-project status.
  Manual recovery is explicitly allowed to satisfy delivery, never automatic
  recovery. The native GitHub deployment payload is empty and its log URL is
  the same immutable host; it does not supply a project deployment ID to join.
  Keep the explicit normal-Git activity check for automatic-path acceptance;
  do not add a Vercel credential or a protected-host bypass to CI.
- Existing header rules cache assets and the sitemap, not this JSON path. The
  build-output test reads the real JSON artifact. All rewrites are `/works/...`
  proxies; there is no root SPA rewrite for this path. Actual public header and
  body readback remains required by the observer after merge.
- The final independent review's system-environment preflight is satisfied:
  fresh project metadata confirms `autoExposeSystemEnvs: true`, now retained in
  `configuration.json`. No setting changed. Native-built public marker readback
  still belongs to the approved production canary.
- Fixed propagation handling: regular CI retries classified public/GitHub read
  failures within its existing bound and retains the last failure on timeout;
  `--once` keeps its direct diagnostic. A real 404-then-success regression covers
  the first-deployment/alias transition.
- Declined accepting any historical success after a newer failed status. The
  existing latest-failure/older-success regression deliberately rejects it.
- Declined the claim that `no-store` allows positive `max-age` to override it:
  [RFC 9111 section 5.2.2.5](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5)
  applies to private and shared caches. This path has no separate CDN cache
  override, and the actual response is checked. Full live activation, including
  the public response, remains pending; no cached preview is accepted as proof.
