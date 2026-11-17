# Claude Code guide refresh, November 17, 2026

## Changed

- `claude-code-controls-grok-bot`: problem-oriented title and description; a direct answer and evidence table before the tutorial; a pinned, account-free protocol-test walkthrough; related usage and regression-testing reads.
- `where-claude-code-usage-goes`: an immediate cache-read versus cache-write answer; explicit original measurement window and limits; local comparison steps that include completed work and regression quality; related handoff and regression-testing reads.
- Both retain their existing URLs, publication dates, figures, and original measured values. Both now have `reviewed` and `modified` set to `2026-11-17`, and topic-specific `image` / `image_alt` metadata.

The review stamp records a full reread. It does not re-date the October usage sample or assert that the signed-in Grok Bot integration was rerun.

## Corrections from current primary sources

| Previous claim | Change and source |
|---|---|
| Background approval cards expire after about ten minutes. | Current Grok Bot documentation says thirty minutes. The guide distinguishes the old setup observation from the current documented window. [Approvals documentation](https://docs.x.ai/grok-bot/approvals-security-and-privacy#if-you-dont-answer) |
| Routine rate limits are undocumented. | Current documentation lists 300 runs per hour across one user's routines and 200 per hour per routine. [Routine limits](https://docs.x.ai/grok-bot/skills-routines-and-automations#rate-limits) |
| The sender provides at-most-once delivery. | Narrowed to one client POST attempt and retained accepted/ambiguous IDs in a local ledger. It does not establish service-side execution deduplication. New IDs, other machines, or removing the ledger bypass the local guard. [Pinned sender](https://github.com/OrionArchitekton/orion-skills/blob/e8474511988d3103f226619d5765961537cb9c21/skills/grokbot/scripts/grokbot-send) |
| A returned file proves the task finished correctly. | A result file proves that a response was collected; its claims require validation. Repeated file-size checks do not prove that an interrupted writer has finished. |
| Coding-agent sessions lack connected tools and browsers. | Replaced with the division of responsibilities in the author's setup. No universal product limitation is claimed. |
| Windows localhost is reachable from WSL only through mirrored networking. | Scoped to WSL2 and the loopback-only debug-port setup; the default NAT mode uses the Windows host address. [Microsoft WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking#mirrored-mode-networking) |
| Timing proves idle expiry caused 94% of large writes. | Preserved 209/223 and described them as consistent with expiry. A long idle gap cannot exclude concurrent prefix changes. |
| No change in local token mix proves the cause lies elsewhere. | Corrected: incomplete logs and different workloads also limit the inference. |

The historical Opus 5.5 rate table still matched [Anthropic's pricing](https://platform.claude.com/docs/en/about-claude/pricing) on this review. The existing Python counter remains explicitly a historical, partial rate catalog, not a current universal billing calculator. Unknown models are excluded with a warning. Claude Code's current [usage documentation](https://code.claude.com/docs/en/costs#using-the-usage-command) distinguishes session token-price estimates from subscriber billing and supplies plan bars and local approximate attribution.

The [session-report marketplace listing](https://claude.com/marketplace/plugins/session-report) and its [analyzer at fd30cee3](https://github.com/anthropics/claude-plugins-official/blob/fd30cee3ecd5a8ee772733c5d20c0f2bae2da2f0/plugins/session-report/skills/session-report/analyze-sessions.mjs) confirm the plugin, local transcript source, JSON analysis command, and request-usage deduplication behavior. [Prompt caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration) confirms the cache-creation token fields and lifetimes.

## Executed checks

- Checked out public `OrionArchitekton/orion-skills` at `e8474511988d3103f226619d5765961537cb9c21` and ran `python3 -m unittest discover -s tests -p 'test_grokbot_scripts.py' -v`: **56 passed**. The suite uses local temporary state, mocks, and loopback HTTP. No account credentials or live Grok Bot calls were used.
- Parsed the guide's unchanged `weigh.py` Python fence and executed it against two synthetic log entries sharing one request ID, with different output counts. It reported one priced request using the larger output count. This checks the small example, not the private 471-session dataset.
- Executed the new arithmetic snippet: **cache read $0.10; one-hour write $4.00; ratio 40x** under the stated Opus 5.5 rates.
- Ran `node --import tsx --test tests/guidesPrecision.test.ts tests/guidesNoLongDashes.test.ts`: **8 passed**. Generated-guide freshness and final built-route checks belong to the integrating PR verification after compilation.

## Evidence boundaries

The original seven-day usage sample was analyzed on October 23, 2026. Its exact cutoff timestamp/timezone and raw work transcripts were not published. Counts, cost shares, medians, and the approximately $2,500 API list-price valuation remain the original author's report. This review did not rerun that private analysis, measure subscription charges, reproduce the live desktop bridge, or establish savings from the proposed workflow changes.

No guide links were posted to external channels, and no third-party profile, production service, or account setting was changed.
