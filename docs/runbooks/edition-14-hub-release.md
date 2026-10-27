---
verified: 2026-10-25
review_after: 2026-10-26
topics: [newsletter, hub-release, edition-14]
references:
  - scripts/compileContent.ts
  - .github/workflows/substrate-sync.yml
  - .github/workflows/substrate-verify.yml
  - docs/runbooks/private-substrate-checkout-authentication.md
  - docs/runbooks/substrate-sync-pr-authentication.md
---

# Edition 14 hub release: October 26, 2026

## Prepared scope and release boundary

Admit `2026-10-19-the-tool-worked-the-agent-couldnt-use-it` to the hub after
its LinkedIn-exclusive week. The exact title is **The Tool Worked. The Agent
Couldn't Use It.** The [published edition](https://www.linkedin.com/pulse/tool-worked-agent-couldnt-use-dan-mercede-f1lrc/)
is verified in substrate [PR #98](https://github.com/OrionArchitekton/dan-mercede-substrate/pull/98),
merged as `56fdb5cd61cfc6220b751dc8c3b463a4f8a94b22`.

Native `publishedAt: 1792418784000` establishes actual publication at
**October 19, 07:06:24 PDT / 14:06:24 UTC**. Seven full days elapse on
**Monday, October 26, 07:06:24 PDT / 14:06:24 UTC**. Use that instant, rather
than the planned October 19 07:00 slot or the canonical's editorial date.
The hash-verified source record is
`docs/editorial/edition-14-publication-evidence/published-identity-and-time.json`
in the substrate merge above, SHA-256
`e828c624136802f85ae245b2af6c4a78fc040425bccdb5821986e72d4e6dad1f`.

The canonical SHA-256 is
`df2e01151cb6ae29b88ef0fd977b5545a412b625d89567c66c49fd032f6a8a59`.
Do not change its body, date, frontmatter or `surface_targets: ["linkedin"]`.
This admission overrides only the hub's target filter; status, type, required
fields and date validation remain enforced. No other edition is added.

Preparation changes only the consumer allowlist and this handoff. Keep its PR
in draft until the release checkpoint. The committed `constants.generated.ts`
and served assets remain unchanged. Admission is one prerequisite; a separate
reviewed content-sync PR must land before the hub can serve the essay. The
current Vercel compiler guard preserves the committed bundle even if substrate
is reachable during a deploy.

This handoff does not schedule or authorize a future merge, workflow dispatch,
deployment, browser send or syndication. No timer is armed. The existing
read-only LinkedIn verification heartbeat stays paused.

## Monday sequence

1. After **14:06:24 UTC on October 26**, recheck the source hash, exact PR diff,
   current main, checks and human approval. Refresh the PR against current main
   if needed, without adding generated content. Obtain Dan's scoped admission
   merge approval and satisfy current required checks and review threads before
   merging. The estate's October 23 owner-approved merge amendment supersedes
   the earlier independent last-push approver requirement; it does not authorize
   an early or automatic merge.
2. For the October 26 release, the sync cron was `10 15 * * 1`: **15:10 UTC /
   08:10 PDT**, 1 hour 3 minutes 36 seconds after eligibility. That fixed-UTC
   timing is historical. The current schedule is Monday `10 8 * * 1` in
   `America/Los_Angeles`: 15:10 UTC during PDT and 16:10 UTC during PST. See
   [the current sync runbook](newsletter-hub-sync.md) for the November 2 window.
   Aim to land admission before this run. GitHub can delay scheduled runs.
   If admission misses it, request an explicitly authorized dispatch of
   `substrate-sync.yml` on **main** after admission lands; do not wait a week or
   dispatch an unmerged task branch.
   Before dispatch, check the workflow run inventory and wait for any older
   queued, waiting or running sync to finish. Both runs write the same
   `codex/substrate-sync` branch, so an older completion can replace a newer
   bundle. Bind the new run to the merged admission commit, and recheck that
   the resulting PR still contains the post-admission bundle before merging it.
3. Inspect that run's private checkout, strict nonempty compile, diagram
   optimization, drift detection and PR creation steps. The October 19 run
   [39277452263](https://github.com/OrionArchitekton/danmercede.com/actions/runs/39277452263)
   passed checkout and strict compile but found no drift and skipped PR
   creation. It proves those read/compile steps, not the Actions PR writer.
   An inaccessible substrate or failed writer needs its own diagnosis; no
   implicit credential rotation, scope broadening or gate bypass is authorized.
4. Review the resulting `codex/substrate-sync` PR separately. It should add
   this essay's exact generated title, October 19 display date and full body.
   Explain any other source drift or removal before merge. Preserve every
   existing thought and the approved CTA. Do not combine generated outputs
   with this admission PR: trusted verification executes the base compiler.
5. Require the sync PR's current build, extractability, secret scan,
   fail-closed aggregate and trusted substrate verification checks. Obtain its
   human review and separate content-merge approval. Only the content merge
   and subsequent deployment can release the essay on the hub.

If the PR writer alone fails, the existing fallback may prepare generated
outputs in a fresh worktree using the now-merged main compiler and a pinned
accepted substrate main. Preserve strict compilation, the workflow's pinned
diagram optimizer, unchanged source, normal CI and a separate human-reviewed
content PR. Do not repair credentials or merge generated output implicitly.

## Validation and public verification

Before admission, verify that the immutable source is excluded. With the new
allowlist entry, the real source must be admitted exactly once, with the same
title, date and full body; every previously admitted thought stays unchanged.
Run existing tests, typecheck, build and built-output checks. Keep generated
content and asset changes out of the admission diff.

For the admission-only build, use `VERCEL=1 npm run build` to exercise the
production compiler guard and preserve the committed bundle. An ordinary local
build can discover a sibling substrate checkout even with `SUBSTRATE_PATH`
unset, regenerate the essay bundle and copy unoptimized diagram originals.
Keep that separate as a local rehearsal; restore its generated changes before
checking or committing admission. The sync workflow owns its own strict compile
and subsequent diagram optimization.

October 19 preparation verified the actual source's exclusion before the
change and admission afterward, with all 45 previously admitted thoughts
unchanged. A local rendered-page rehearsal matched all 38 approved body blocks,
six headings and the exact CTA anchor. After restoring the generated rehearsal
output, typecheck, all 447 existing tests, the production-guarded build and all
18 built-output tests passed. The admission diff contains no generated content
or asset changes. These are preparation checks, not a production release.

The current hub mapper reads essay body content. This canonical's cover is
frontmatter-only and its body has no image references; this release therefore
adds no inline cover or asset. Do not invent a body image, copy unrelated
newsletter assets, or alter the sealed canonical to obtain one.

After the content merge, verify the deployment for that exact commit, then
inspect the actual public page:

`https://www.danmercede.com/thoughts/2026-10-19-the-tool-worked-the-agent-couldnt-use-it`

- Compare the essay-specific initial rendered article with the accepted
  canonical: exact title, full prose, all six headings and literal
  `Wsl/Service/E_ACCESSDENIED`. A title or a JavaScript-bundle match is not enough.
- The visible CTA must be **Work with my agency on one workflow**. Follow its
  actual anchor and confirm the Readiness Scan loads with the exact destination
  and all four attribution parameters:
  `https://www.orionintelligenceagency.com/readiness-scan?utm_source=linkedin&utm_medium=newsletter&utm_campaign=readiness_scan&utm_content=fcn_ed14`.
  Do not submit the form. The canonical keeps its approved newsletter tracking
  parameters; this preparation does not rewrite them for a new channel.
- Verify the thoughts index link, page canonical, sitemap, RSS and Atom entries.
  Compare an invalid essay slug returning a real 404 so an SPA fallback cannot
  be mistaken for this release. Record the deployed commit, observation time
  and consumer evidence only after these checks.

## October 23 readiness refresh

Refreshed the admission branch against hub main `0c6c703` without rewriting
history. The allowlist conflict came from Edition 13's approved backfill;
both admissions are preserved. The existing Latest releases presentation is
unchanged. Relative to current main, the diff remains one Edition 14 allowlist
entry plus this handoff, with no generated bundle or asset changes.

Reverified the canonical and actual-publication evidence against their hashes
above. A read-only comparison of the base and refreshed compilers against the
accepted source admits Edition 14 exactly once, preserves all 46 previously
admitted thoughts and every diagram, and leaves Edition 15 excluded. The added
entry retains the complete body, exact title, October 19 display date, six H2
headings, literal identifier and approved CTA. Typecheck, all 449 existing tests,
the production-guarded build and all 20 built-output tests pass.

The existing `approve-edition-14-hub-release` reminder remains active for
October 26 at 07:10 Pacific. It is notification-only. Admission stays in draft
until the Monday checkpoint; the subsequent generated-content PR and its merge
approval remain separate. This refresh grants no release authority.

## October 25 readiness refresh

Refreshed against hub main `f60cfe6` in a fresh worktree, preserving the
existing admission history. Relative to main, the scope remains one allowlist
entry and this runbook. No generated bundle, assets or presentation changed.

Rechecked the sealed source and publication-evidence hashes above against
accepted substrate main `fd9ca23a881552f0fa9102e722396ec455d2e302`.
The read-only mapper comparison preserves all 46 existing thoughts and all
23 diagrams, admits Edition 14 exactly once, and leaves Edition 15 excluded.
The exact title, October 19 display date, six H2 headings, literal identifier
and tracked CTA remain intact. Typecheck, all 449 existing tests, the
production-guarded build and all 20 built-output tests pass.

The admission remains a draft and is not released. Recheck current main and
all hosted checks at the October 26 checkpoint; the publication-time boundary,
Dan's scoped approval and separate content-sync PR still apply. This refresh
does not dispatch a workflow or authorize publication.

## Rollback

Before content merge, close the unmerged content PR and stop further syncs
for this release. Do not assume a plain admission revert passes verification:
`substrate-verify` executes the merged base compiler, which still admits Edition
14. With status `WROTE`, its truth includes the essay even while production's
committed bundle does not. The skipped-compilation fallback is not a recovery
mechanism, and checks must not be bypassed or made to fail intentionally.

If admission must be reverted at that point, obtain Dan's separate approval for
a temporary production-deployment hold and two reviewed recovery merges:

1. Prepare a recovery PR that removes admission but retains the verbatim bundle
   generated by the current trusted base compiler, including Edition 14. In the
   same PR, use Vercel's documented ignored-build command to skip production
   builds (`if [ "$VERCEL_ENV" = production ]; then exit 0; else exit 1; fi`).
   Preserve any existing ignore rule and its exact restoration value. Review
   the hold and verify it applies before merging; keep previews private, allow
   no manual promotion or deployment, and confirm the existing production
   deployment stays active. Normal preview/CI and trusted verification must
   pass. The bundle matches base truth, but the production hold prevents that
   intermediate content from becoming the public hub release.
2. From the merged rollback compiler, run the strict sync and pinned optimizer
   again. Its generated removal now matches the base compiler that excludes
   Edition 14. A separate reviewed PR commits that exact bundle and restores
   the previous ignore configuration. Require normal checks and inspect the
   removal before merging, then verify production still excludes the essay.

[Vercel documents](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)
that an ignored-build command exiting zero skips a build. This is an emergency
recovery plan, not permission to change deployment controls during this release.
If the deployment hold cannot be established and verified, leave the content PR
unmerged and escalate; do not publish the essay merely to clear verification.

After content merge, removing the allowlist entry alone does not remove the
committed article. The same base-compiler constraint applies: use separately
approved recovery merges and a verified deployment hold as needed, then
regenerate and review the removal under the now-merged exclusion compiler.
Verify the public page is removed after the final deployment. Never hand-edit
the generated bundle or the immutable substrate canonical.
