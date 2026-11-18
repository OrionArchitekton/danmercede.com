# Fail-closed harness guide review

Reviewed the full guide on November 17, 2026. The original publication date remains July 23, 2026; `modified` records this substantive update and `reviewed` records the reread.

## Changes

- Lead with an answer about action and merge gates, followed by scope and linked evidence.
- Preserve the July 23 and August 2 observations as historical operator reports. They are not newly executed tests or a claim about current private configuration.
- Add a merge-boundary section that distinguishes the evaluator's result from repository enforcement and links the Proctor guide and illustrative Proof scenario.
- Reuse the existing gate-decision figure as the representative article image.

## Factual correction

The old text said every nonzero Claude Code hook exit other than 2 permits the action. The current [official hooks reference](https://code.claude.com/docs/en/hooks#exit-code-output) is more nuanced: output and event matter, and a nonblocking failure leaves ordinary permission controls in effect. The [failure-handling section](https://code.claude.com/docs/en/hooks#block-the-action-when-a-hook-fails) documents `onFailure: "block"` for command and HTTP hooks, requiring v2.1.295 or later, with event, background-hook, platform and Code Mode exceptions. The guide now reflects that distinction without claiming the user's installed runner was upgraded or verified.

GitHub's [required-check documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging) accepts successful, skipped and neutral conclusions. Requiring a check therefore does not by itself prove a particular evaluator ran. The guide explicitly assigns that validation to the policy gate and repository integration.

## Sources checked

- [failclosed README at fda838cd0102babd68ea1fce32230fc40911fe1b](https://github.com/OrionArchitekton/failclosed/blob/fda838cd0102babd68ea1fce32230fc40911fe1b/README.md).
- [Pipeline regression cases at the same revision](https://github.com/OrionArchitekton/failclosed/blob/fda838cd0102babd68ea1fce32230fc40911fe1b/test_run_review_pipeline.py). These replay reviewer subprocess output with GitHub access stubbed; source inspection is not a live merge-protection test.
- [LangChain's harness definition](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) and [reported 52.8 to 66.5 benchmark change](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering).
- [Meta's original Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/), including the stated supervision requirement and limitations.

## Validation boundary

The guide compiles with the optional image and modification-date metadata. Its body contains no banned long dash codepoints, and the file passes `git diff --check`. No live Claude Code hook, GitHub protection setting, or private historical transcript was executed or re-audited for this content refresh.
