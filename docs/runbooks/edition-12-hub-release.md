---
verified: 2026-10-12
review_after: 2026-10-19
topics: [newsletter, hub-release, edition-12]
references:
  - scripts/compileContent.ts
  - .github/workflows/substrate-sync.yml
  - .github/workflows/substrate-verify.yml
  - docs/runbooks/private-substrate-checkout-authentication.md
---

# Edition 12 hub release

## Evidence and scope

Release `2026-10-05-the-assistant-was-only-supposed-to-read` to the hub after
its LinkedIn-exclusive week. The [public edition](https://www.linkedin.com/pulse/assistant-only-supposed-read-dan-mercede-jpmtc)
was published October 5. Its seven-day anniversary has passed on October 12.
The substrate canonical is on main via
[PR #92](https://github.com/OrionArchitekton/dan-mercede-substrate/pull/92),
merge `6453900e0c68bc21228054e3dc1f4a2021e3ef7a`.
The main review manifest records Dan's exact-draft firsthand attestation and
acceptance of the three images on October 5. Do not re-author or re-tag this
immutable canonical. Admission PR #197 changed only consumer admission, added its
regression test and recorded this procedure. Content-sync PR #198 separately
landed the generated body and referenced assets after its own review checkpoint.

The separate browser-pool guide PR #196 and the held lane lock-bump work are
outside this release. No dev.to/Hashnode send is authorized or implied here.

## E12 is live; authentication history

Dan merged [content-sync PR #198](https://github.com/OrionArchitekton/danmercede.com/pull/198)
at 22:13:55Z on October 12 as `c6dc97b9ae3f5a93879168b773b80208a0f4a654`.
The production deployment bound to that SHA succeeded at 22:14:25Z. At
22:16:53Z, public consumer checks verified the exact complete E12 initial
render, both source-identical images, CTA, index, canonical, sitemap, RSS/Atom
and an invalid-slug HTTP 404 negative control. See
[the production verification](../reviews/2026-10-12-edition-12-production-verification.md).
This establishes E12's hub release, not the separate PR-writer repair.

The [October 12 scheduled sync](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38270302649)
failed before compilation, while fetching the private substrate:
`fatal: could not read Username for 'https://github.com': terminal prompts disabled`
(three attempts, exit 128). Native GitHub account inspection on October 12
additionally shows the fine-grained PAT named `SUBSTRATE_READ_TOKEN` has expired.
Dan authorized this exact repair, signed in and completed native token generation
after GitHub rejected the automated generation click. The replacement grants only
`dan-mercede-substrate` Contents read-only plus mandatory Metadata read-only,
expiring January 10, 2027. It passed a private file read, then was transferred
in memory through `gh secret set` stdin to this repository's exact
`SUBSTRATE_READ_TOKEN` secret. Metadata confirms update at 20:34:42Z on October 12.
No value entered chat, files, argv or commits; the token page was cleared and the
browser released.

[Trusted verification run 38298024701, attempt 2](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38298024701/attempts/2)
independently passed the private substrate checkout, base-code compile and bundle
comparison with the replacement. This establishes checkout recovery, not E12
release or strict-sync/PR-token health. A green verifier alone is insufficient:
it normally tolerates fetch failure, so inspect the actual checkout step.
The approved post-merge strict dispatch
[38310461084](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38310461084)
passed private checkout, strict compile, optimization and drift detection, then
failed at PR creation with authenticated Git fetch and push errors; the terminal
failure was the push to `codex/substrate-sync`, exit 128. The separate
`SUBSTRATE_SYNC_PR_TOKEN` was separately replaced under Dan's explicit authority
at 22:28:34Z. Its replacement passed positive Contents-write and Pull-requests-write
checks, creating real documentation [PR #199](https://github.com/OrionArchitekton/danmercede.com/pull/199),
and correctly denied private-substrate access. The old credential's exact
expiry/revocation/scope cause remains unconfirmed. The replacement selects only
this hub, Contents and Pull requests read/write plus Metadata read-only,
expiring January 10, 2027. No read-token scope or merge protection changed.

[Strict main sync 38316883924](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38316883924)
succeeded at 22:29:26Z: private checkout, strict nonempty compile, optimization
and drift comparison passed. No drift was found, so the Actions PR-writing step
was skipped. The direct write checks establish replacement-token capability;
they do not establish a complete Actions Git-push/PR-creation canary. Observe
the next genuine content-drift sync rather than fabricate drift or rerun a stale
pre-release main. See the reusable [read-token recovery procedure](private-substrate-checkout-authentication.md)
and [PR-writer recovery procedure](substrate-sync-pr-authentication.md).

To prepare the release, the same merged-main compiler and pinned substrate source were
run in dedicated clean worktrees, without hand-editing the generated output.
The existing authenticated CLI delivered content PR #198; it passed the normal
base-code trusted verifier and Dan's separate content-merge checkpoint.
Exact pins, generated diff and local consumer proof are recorded in
[the content-sync evidence](../reviews/2026-10-12-edition-12-content-sync.md).
That fallback did not itself repair the weekly PR writer or relax any merge gate;
the separately authorized replacement and its verification are recorded above.

## Completed rollout (historical procedure; do not repeat)

Admission #197, content #198 and the production consumer verification are
complete. The checklist below preserves the procedure and its human gates;
it is not a queue of remaining release actions. Only the next genuine
content-drift writer canary remains unobserved, as described above.

1. Restore and verify the existing private-substrate checkout access under
   credential authority. Review fresh checks and merge this admission PR only
   with Dan's merge authority; never bypass a failed trusted verification.
2. The normal sync already failed today before this admission existed. After
   the merge, dispatch `substrate-sync.yml` on **main** in this repository,
   rather than waiting another week. Confirm the dispatch is authorized at the same
   checkpoint as the admission merge.
3. Inspect the generated sync PR. It must add the E12 body and referenced assets
   from substrate without unexpected removals or unrelated changes. Do not
   hand-edit the generated bundle or combine it with this compiler-change PR:
   trusted verification executes the base compiler.
   If the automated PR writer alone fails, inspect its failed step first. An
   in-scope fallback may run the identical base compiler in a fresh task worktree
   against pinned accepted substrate main, then submit the generated outputs
   through existing working CLI authentication. Keep strict flags, the pinned
   diagram optimizer, bundle comparison, asset parity and human merge gates.
   Never hand-edit the bundle or rotate a second credential implicitly.
4. Run/observe `build`, `gitleaks`, `required-checks-fail-closed`, and
   `substrate-verify` on that exact sync head. Dan reviews and authorizes its
   merge separately; no auto-merge or bypass is implied.
5. Observe the production deployment and consumer checks below. An admission
   merge, dispatch, sync PR, or successful build alone is not publication proof.

## Validation and monitoring

- Regression: the E12 slug occurs exactly once in the allowlist; an E12-specific
  mapper test admits its actual LinkedIn-only target and preserves title/date/body.
  Existing mapper tests preserve status/type/date checks and reject unlisted essays.
- Before admission merge, full tests and build must pass with the committed
  generated bundle unchanged.
- After sync merge, fetch
  `/thoughts/2026-10-05-the-assistant-was-only-supposed-to-read` on danmercede.com.
  Verify the real E12 title, opening and closing body anchors, CTA destination,
  referenced assets, canonical URL, sitemap and feed entries. Compare an invalid
  slug so a generic SPA HTTP 200 or corpus-wide text match cannot pass as E12.
- Check the thoughts index links to this edition. Record the observed deployment
  and URL only after the rendered consumer contains the essay.

## Rollback

Before the sync PR merges, revert admission through a reviewed PR and discard
the unmerged sync change. After release, removing admission alone does not remove
the already committed body: revert admission, regenerate through the trusted
sync flow, review and merge the removal, and verify the deployed consumer.
Never edit the substrate canonical or the generated constants by hand.
