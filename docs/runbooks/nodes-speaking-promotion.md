---
verified: 2026-11-12
review_after: 2027-02-10
topics: [nodes, speaking, registration]
references:
  - ../../constants.ts
  - ../../App.tsx
  - ../../tests/speakingSheet.test.ts
  - ../../tests/builtPageRender.test.ts
  - ../../specs/nodes-registration-link-spec.md
---

# NODES speaking promotion

PR #202 adds registration beside the existing speaker-profile proof. Human
merge deploys both links through the existing Vercel integration. Verify the
public homepage section and both destinations after merge. A working landing
page or a matching generator URL does not prove Neo4j credited a referral.

The generator at https://dev.assets.neo4j.com/nodes-sc-2026.html was read again
on October 20. Its `createUrl` joins first and last names with a raw ampersand.
Keep that generated URL unchanged until the organizer supplies a confirmed
replacement. Do not describe campaign attribution as verified or submit a test
registration. No organizer message is authorized by this runbook.

## November 13 source update

Dan or the agent in his active publishing session makes this reviewed edit on
November 13, 2026, after the November 12 event:

1. Change Upcoming Speaking to Past speaking and use past-tense event copy
   consistent with the actual event outcome. Preserve the published title,
   date and speaker-profile credential.
2. Remove Register free and its registration constants from the homepage.
   Update the speaking-section tests to require the profile and no registration.
3. Run typecheck, unit tests, `VERCEL=1 npm run build` and `npm run test:built`.
   Human-merge the source update; verify the public section after deploy.

This is a manual editorial release. No timer, recurring task or automatic send
is created. A render-time clock check would violate the site's deterministic
initial-render contract; this PR keeps the dated source and rendered copy aligned.

## Done on November 12, 2026

NODES 2026 was delivered live on November 12. The source update above shipped the
same day in the PR that also added OpsWorld 2027 (February 9, 2027) as the upcoming
talk: `UPCOMING_SPEAKING` leads the homepage speaking block, `SPEAKING` (NODES) follows
as Past Speaking with its speaker page, registration and its constants are gone, and
the speaking one-sheet was re-rendered and re-pinned. After merge, verify the public
homepage section and the one-sheet download, and recheck that the organizer's workshops schedule
(`UPCOMING_SPEAKING.href`) still lists the workshop.

## Abandon or roll back only if Dan chooses to withdraw the promotion

Before merge, close PR #202 to abandon the promotion. After merge, a reviewed
revert can remove the registration link if Dan chooses to withdraw it early.
This is separate from the November 13 forward edit above. Preserve current
main's unrelated changes and the substrate-generated content bundle.
