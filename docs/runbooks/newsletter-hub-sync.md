---
title: Monday newsletter hub sync timing
verified: 2026-10-27
review_after: 2026-11-03
topics: [newsletter, github-actions, scheduling, daylight-saving]
references:
  - .github/workflows/substrate-sync.yml
  - docs/runbooks/edition-14-hub-release.md
---

# Monday hub sync

The existing weekly substrate sync is scheduled for Monday at 08:10 in
America/Los_Angeles. GitHub's native schedule timezone follows daylight saving
time: October 26, 2026 was 15:10 UTC; November 2 is 16:10 UTC / 08:10 PST.
The old fixed `10 15 * * 1` cron would instead run at 07:10 PST on November 2.
The job's `TZ` environment does not set the scheduler's timezone.

This corrects the intended weekly cadence. It does not explain the separate
Edition 14 Vercel request gap. The workflow still opens a review PR when admitted
source content changes. Admission, source verification, required CI, human merge
approval and the actual production deployment remain separate release steps.

Rollout: obtain approval for this schedule change and merge normally. Verify
main retains one Monday `10 8 * * 1` schedule with timezone
`America/Los_Angeles`; keep `workflow_dispatch` and the existing sync job intact.
No dispatch or content release is needed to adopt the configuration.

Monitor: after the November 2 scheduled window, inspect the actual workflow run
event and start time. GitHub may delay scheduled jobs; configuration is not an
execution receipt. Inspect any generated PR, then use the normal release review.
If a scheduled run is missing, inspect the run inventory before requesting a
separately approved manual dispatch. Do not start duplicate syncs.

Rollback: revert this schedule change through a reviewed PR. That restores the
fixed UTC cadence and its known winter drift; it does not undo a completed sync
or published content.

Source: [GitHub schedule syntax and timezone support](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule).
