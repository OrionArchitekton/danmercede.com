# Edition 13 hub catch-up and Latest releases

Dan selected Latest releases above the existing lanes on October 20, 2026. The
default Thoughts view now selects the three newest admitted essays by display
date. Existing lanes remain the complete archive. Search and category filters
hide the latest section and clearing them restores it.

Edition 13 is The Transcript Looked Complete, slug
`2026-10-12-the-transcript-looked-complete`. Actual native publication was
October 12 at 07:03:06 Pacific (`2026-10-12T14:03:06Z`), from article
`7515119166732038144`. Seven full days elapsed October 19 at 07:03:06 Pacific.
Selected publication evidence and the recovered exact 39-block copy live in the
substrate source-correction PR #99:
https://github.com/OrionArchitekton/dan-mercede-substrate/pull/99.

This PR adds only Edition 13 to the hub allowlist and changes the index UI. The
generated corpus/assets remain byte-identical to main: 45 thoughts, newest
Edition 12. This is intentional until the missing canonical exists on substrate
main and the reviewed sync runs. The local UI preview uses that current corpus;
it is not proof of Edition 13 on the public hub.

## Release sequence and authority

1. Dan accepts the exact published-copy source recovery and its bound lineage,
   accepts the historical cover, and completes or waives the two missing external
   rounds. Human-merge the substrate correction; use the normal promotion tool
   and human-merge its canonical PR.
2. Human-merge this hub UI/admission PR. Both application and content changes
   remain reviewable; no generated bundle is edited by hand.
3. Dispatch the existing substrate-sync workflow after both repositories contain
   the admitted canonical and allowlist. Review and human-merge its generated
   content PR. It should add only Edition 13 to the current thought corpus.
4. Verify the served `/thoughts` latest section puts Edition 13 first, the essay
   body and exact CTA match the canonical, canonical URL/sitemap/feeds include
   it, and a reader can open the intended destination. Check mobile, filtering
   and hydration again. A green workflow alone is not publication proof.

Edition 14 remains outside this allowlist. Its separate draft PR #216 and
October 26 approval reminder remain unchanged.

## Validation and rollback

Selector tests cover unsorted input, date ties, three-card cap, small/empty
corpora and non-mutation. Built-page checks bind actual links, dates and placement
to the admitted corpus. Local browser checks cover 1440px desktop and 390px
mobile, no horizontal overflow, category/search hiding, clear restoring and no
reported browser errors. Full unit, typecheck, Vercel-equivalent build and
built-output results are recorded in the PR.

Before merge, close the PR to abandon. After merge, revert this change via a
reviewed PR to restore the previous index/admission behavior. A generated content
release has its own reviewed revert; immutable source canonicals stay intact.
