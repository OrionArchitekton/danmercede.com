# Edition 12 content-sync evidence

Historical checkpoint for **content PR #198**, not documentation PR #199.
Dan merged #198 at 22:13:55Z on October 12; the
[production verification](2026-10-12-edition-12-production-verification.md)
records the subsequent live release. Statements below about pending authority
and the unrepaired writer describe the pre-merge #198 checkpoint. The later
separately authorized writer replacement and its positive #199 PR-write test
are recorded in [the writer incident](../solutions/2026-10-12-substrate-sync-pr-credential.md).

## Scope and exact inputs

This is the separate content checkpoint after admission
[PR #197](https://github.com/OrionArchitekton/danmercede.com/pull/197).
The generated bundle adds only **The Assistant Was Only Supposed to Read**,
slug `2026-10-05-the-assistant-was-only-supposed-to-read`, plus the two
images its accepted body references. No source copy or artwork was changed.

- Hub main/compiler: `421fd16b8a6b13c1f7b3139b738d70e1d541191c`.
- Substrate main/source: `78618df1494c8a6e4a1b697a72f97611db2ba601`.
- The accepted canonical originally landed through substrate PR #92,
  merge `6453900e0c68bc21228054e3dc1f4a2021e3ef7a`.
- Actual LinkedIn publication: October 5, 2026, 07:04 America/Los_Angeles.
  Seven full days elapsed before this October 12 preparation. The canonical's
  09:00 frontmatter timestamp is not evidence of actual publication time.

## Why content PR #198 used the authenticated CLI

The approved main dispatch
[38310461084](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38310461084)
passed private substrate checkout, strict compilation, diagram optimization
and drift detection. Opening its review PR encountered authenticated Git fetch
failure and then terminated at the push to `codex/substrate-sync`, exit 128,
after the action selected the separate PR-writer credential. This clarifies the
earlier shorthand that identified only the fetch error; both are in the job log.
No automated PR was created. The precise reason that credential is rejected
is not established; expiration must not be assumed.

The repaired read credential is working at its actual consumer. The separate
`SUBSTRATE_SYNC_PR_TOKEN` was neither read nor changed. Instead, the same
merged-main generator and pinned source were run in clean dedicated worktrees,
and this review PR is delivered using the existing authenticated GitHub CLI.
The generated bundle was not edited by hand. The normal trusted verification
must still compare it against base-branch compilation before merge. No
workflow, dependency manifest, lockfile, protection or approval rule changed.
Weekly automated PR creation remains unrepaired.

## Generation and validation

1. `npm ci`, then `SUBSTRATE_PATH=<pinned-source> npm run compile -- --strict --require-matches`.
2. The workflow's exact on-demand `sharp@0.34.4` install with `--no-save
   --ignore-scripts --no-audit --no-fund`, then
   `node scripts/optimizeDiagrams.mjs --apply`.
3. All existing optimized diagram files were byte-identical to main afterward.
   The resulting corpus contains 45 thoughts and 23 diagrams. All 44 prior
   thoughts and all diagram metadata are unchanged; there are no removals.
4. `npm test`: **457 passed**. `VERCEL=1 npm run build`: **passed**.
   `npm run test:built`: **19 passed**. Build retains the existing large-chunk
   advisory. Local Node is v24.13.1; Actions must independently validate Node 20.
5. Exact parity assertion: the accepted 9,069-character canonical body becomes
   9,067 characters solely through the two deterministic served-image path
   rewrites. Title, claim, date, full body, image alt text, captions and CTA
   destination are preserved. No unreferenced cover is added to the body.
6. Built-consumer checks passed for the exact essay's initial rendered HTML,
   opening and closing anchors, CTA, both assets, canonical URL, thoughts index,
   sitemap, individual RSS item and Atom entry. An invalid-slug render shows
   Thought Not Found and neither the E12 body nor its images. These are local
   build checks, not production publication proof.

The canonical origin is `https://www.danmercede.com`. An initial ad-hoc check
assumed the non-www origin and was corrected to consume the site's origin;
the feed check also decodes XML and embedded HTML separately. Neither
correction changed site code or output.

### Source-identical image bytes

| File | Bytes | SHA-256 |
|---|---:|---|
| reach.png | 2243299 | `c7f547028caa32612bb49b5c9e5198693476fd4ef6d52abb67c14f098c3d70e8` |
| record.png | 2010107 | `922b11a12168be03f0cc23a69cb6f50b1baa7740732e64ff5ec387d1900b60b4` |

Both committed candidates and built copies match the pinned source bytes.

## Remaining authority and rollback

This PR requires Dan's **separate content-sync merge approval**. A passing
build, preview or trusted verifier is not permission to merge. No native
LinkedIn schedule, dev.to/Hashnode send or second credential repair is included.

After an approved merge, observe the normal production deployment and perform
the exact consumer and negative-control checks in
[the release runbook](../runbooks/edition-12-hub-release.md).
Before merge, abandoning this PR leaves production unchanged. After release,
follow the reviewed admission-removal/regeneration rollback in that runbook;
never hand-edit the generated bundle or immutable source canonical.
