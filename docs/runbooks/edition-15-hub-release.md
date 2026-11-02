---
verified: 2026-10-31
review_after: 2026-11-02
topics: [newsletter, hub-release, edition-15, daylight-saving]
references:
  - scripts/compileContent.ts
  - .github/workflows/substrate-sync.yml
  - .github/workflows/substrate-verify.yml
  - docs/runbooks/newsletter-hub-sync.md
  - docs/runbooks/edition-14-hub-release.md
---

# Edition 15 hub release: November 2, 2026

Prepare admission of `2026-10-26-who-gets-to-interrupt-your-ai-work`,
**Who Gets to Interrupt Your AI Work?**, after seven full days of LinkedIn
exclusivity. This draft PR changes one consumer allowlist entry and this
handoff. It does not change the generated bundle, public assets, presentation,
sealed source, workflows or deployment controls. It authorizes no merge,
workflow dispatch, publication, syndication or timer.

## Publication and eligibility

The [published article](https://www.linkedin.com/pulse/who-gets-interrupt-your-ai-work-dan-mercede-2qhpc/)
is bound to article `7519523770274070528`, post
`urn:li:ugcPost:7519525406551687168` and newsletter `7477834312608866304`.
Accepted substrate commit `6e7e6d2b4017425b6b27fa6ecc312a168b3b6220`
contains `docs/editorial/edition-15-publication-verification.md` and its six-file
publication evidence inventory. All six evidence hashes and byte counts were
reverified during preparation.

The native published identity/time file has SHA256
`5ea2928c40f8a4ecbc1b937a9a54ff4bc3366daece2cd701829b4ad44fad325a`.
Its `publishedAt: 1793023688000` establishes actual publication at
**October 26, 07:08:08 PDT / 14:08:08 UTC**. Seven full days elapse on
**Monday November 2, 06:08:08 PST / 14:08:08 UTC**. Daylight saving time ends
November 1; the boundary is 168 hours after actual publication, not the
canonical editorial date or scheduled 07:00 slot.

The sealed canonical SHA256 is
`39982a3894ff0192258a0a520f7a53e3d8c6338b76b99905bc1bed68f8941ce2`.
Keep its body, metadata, October 26 display date and LinkedIn-only targets
unchanged. The allowlist overrides only the target filter; all status, type,
required-field and date checks remain enforced.

## Monday release checkpoint

1. Keep admission in draft until the November 2 checkpoint, after **14:08:08Z**.
   Re-probe ownership, current main, immutable source/evidence hashes, PR diff,
   required checks and review threads. Obtain Dan's scoped admission merge
   approval, then land it normally before the existing **08:10 PST / 16:10 UTC**
   sync where possible. No automatic or early merge is authorized.
2. Inspect the actual `substrate-sync.yml` run. The native schedule follows
   America/Los_Angeles; scheduled and manual triggers share non-cancelling
   concurrency and check out current main after acquiring it. Configuration
   does not prove execution. If the scheduled run is delayed or misses the
   admission, account for all queued/running work and obtain separate approval
   before a recovery dispatch on merged main. Do not create another timer.
3. Review the separately generated content-sync PR. Require successful private
   source checkout, strict nonempty compile, pinned diagram optimization,
   normal build/secret/extractability checks and trusted substrate verification.
   Explain any other source drift or removals. Obtain separate content-merge
   approval. Never combine generated outputs with this admission PR: trusted
   verification runs the base compiler.
4. After the content merge, verify the normal Git-triggered production
   deployment for that exact commit and its public revision. Inspect the real
   essay-specific initial HTML, thoughts index/latest-release link, canonical,
   sitemap and RSS/Atom entries. An invalid essay route must still return 404.
   A successful admission merge or workflow alone is not a hub release.

## Copy, CTA and validation

The eventual page is
`https://www.danmercede.com/thoughts/2026-10-26-who-gets-to-interrupt-your-ai-work`.
Compare its full body with the sealed source and hash-verified approved browser
map (`49bb715b9afc3e58950c47121bace604c0c359f58708612eee1ffac73a37fbb3`):
**33 body blocks, five H2 headings and literal `flock`**. Native LinkedIn code
font limitations do not authorize changing the source or hub body.

Preserve the exact final question: **Which AI workflow in your operation needs
a protected window, and what else can use the same capacity? Describe that
workflow in the comments.** It has no external CTA URL or form. The hub has no
native LinkedIn comment composer; this admission does not invent one or alter
the approved question. Report that channel limitation when reviewing the
content-sync PR. The cover exists only in source frontmatter; no inline image
or copied cover asset is introduced by the essay mapper.

A read-only real-mapper comparison against the pinned substrate source verified
the new essay is admitted exactly once, with exact title, display date, body,
all 33 approved blocks, five headings and final question. All **47 previously
admitted thoughts and 23 diagrams** remain unchanged. No generated content or
assets were written by that comparison. Run the existing regression suite,
typecheck, production-guarded build and built-output checks before pushing.
Use `VERCEL=1 npm run build` to preserve the committed bundle during the
admission-only build; an ordinary local build may discover a sibling substrate.

Preparation on October 31 passed typecheck, all **462 existing regression
tests**, the production-guarded build and all **21 built-output tests**. The
initial old shared dependency environment lacked declared jsdom/Tailwind
packages; installing the existing lockfile in this isolated worktree resolved
those environment failures without dependency-file or application-code changes.
The final diff contains only this handoff and the one allowlist entry.

## November 2 release execution

Dan requested taking the existing edition work through the merge process.
Edition 16 source PR #110 and Ops #62 are merged. Edition 15 admission #231
merged as `381ac6efcbc5539be5d8dec26bdd8b3e35636110` after all required checks
and revalidation of the six actual-publication evidence hashes. Eligibility
had elapsed at **14:08:08 UTC / 06:08:08 PST**.

A fresh content worktree starts at that merged admission. The compiler reads
an immutable accepted substrate checkout at
`44207b8278055b5d76dea688c2eee6f31dfd3962`; the Edition 15 sealed canonical
still matches SHA256 `39982a3894ff0192258a0a520f7a53e3d8c6338b76b99905bc1bed68f8941ce2`.
The existing `--strict --require-matches` compiler reports WROTE. The existing
workflow's pinned Sharp 0.34.4 optimizer restores copied diagram originals to
byte-identical shipped assets. No generated field is hand-edited.

The diff adds exactly this essay to the bundle. All 47 prior thoughts and all 23
diagrams remain identical, including every prior asset. The new entry has the
exact title, October 26 date and complete source body. All 33 approved blocks,
five H2 headings, literal flock and the final comments question match the
hash-verified browser map. It is first in the chronological corpus. Edition 16
is excluded and no cover-only source asset is copied into the body.

At the release admission checks after 10 a.m. Pacific, the active native sync
workflow had no November 2 run in its history and no queued/running run or open
content-sync PR. Its timezone configuration matches current GitHub documentation;
no unsupported-timezone diagnosis is claimed. This local mechanical strict-sync
preparation completes the requested reviewed content path without dispatching a
runtime workflow or changing its schedule, token or configuration. Recheck run/PR
inventory before merging to avoid a duplicate release if a delayed trigger arrives.
Trusted base-compiler verification and the normal required checks still apply.

Local validation passes: typecheck, all 462 regression tests, production build,
and all 21 built-output tests. The build emits the new essay into initial HTML,
latest-release ordering, sitemap and feeds; public deployment remains to be checked.

The generated-content merge must still be followed by exact-commit production
revision and real public page/index/feed verification. Neither this local
comparison nor an admission merge is proof that the hub serves the new essay.
The preserved comments CTA is LinkedIn context; the hub has no native composer.
No new comment feature or source rewording is introduced by this release.

## Rollback

Before admission merge, close the unmerged PR to withdraw this preparation.
After admission merge, keep the content PR unmerged if release must stop.
Removing the allowlist entry alone does not remove a committed essay, and
trusted verification still uses the merged base compiler. Follow the separately
approved deployment-hold and two-reviewed-merge recovery in
`edition-14-hub-release.md` if removal is required; that procedure is a plan,
not authority to change production controls. Never hand-edit generated content
or the immutable substrate canonical.
