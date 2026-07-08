---
verified: 2026-07-08
review_after: 2026-10-06
topics: [aeo, geo, extractability, linter, answer-engine, required-checks, fail-closed, ci, token-budget, js-off, heading-hierarchy, seo, danmercede.com]
references:
  - extractability.ts
  - tests/extractability.test.ts
  - tests/requiredChecksWorkflow.test.ts
  - .github/workflows/ci.yml
  - .github/workflows/required-checks-fail-closed.yml
  - package.json
  - specs/aeo-extractability-linter-spec.md
---

# Runbook — AEO passage-extractability linter (danmercede.com)

## What it is
`extractability.ts` scores each page's crawlable answer-first passage on three checks
(token budget, JS-off readable %, heading hierarchy) so answer engines can extract a clean,
complete answer from raw HTML. It runs as a **first-class fail-closed REQUIRED check** named
`extractability` — a red linter blocks merge.

## Operational surface added
- **CI job** `extractability` in `.github/workflows/ci.yml` (emits the `extractability`
  check-run).
- **Required-check entry** `extractability` in `BASE_REQUIRED_CHECKS`
  (`required-checks-fail-closed.yml`) — the fail-closed gate WAITS on it.
- **npm scripts** `test:extractability` (dedicated) + inclusion in the aggregate `test`.

## Interpreting a failure
`npm run test:extractability` prints per-check findings. A failing check means:
- `token-budget` — a page's opening answer (H1 + lead `<p>`) exceeds ~170 words
  (`MAX_ANSWER_TOKENS` = 227 heuristic tokens). Tighten the lead into an answer-first summary;
  put depth in later paragraphs.
- `js-off-readable` — the answer regressed into the React `#root` mount (invisible to no-JS
  crawlers). Ensure the copy is baked into the prerender block (`renderBodyBlock`), not
  React-only.
- `heading-hierarchy` — not exactly one H1, or a heading level skip. Fix the baked body's
  heading structure.

## Rollback / disarm (deliberate, reviewed)
1. To stop **blocking merges** on it (keep it advisory): remove `extractability` from
   `BASE_REQUIRED_CHECKS` in `required-checks-fail-closed.yml` **and** the matching assertion
   in `tests/requiredChecksWorkflow.test.ts` (they are locked in lockstep). The CI job still
   runs and reports, it just no longer gates.
2. To fully remove: also drop the `extractability` job from `ci.yml` and
   `tests/extractability.test.ts` from `package.json` `test`/`test:extractability`. All three
   mirrors move together or `requiredChecksWorkflow.test.ts` goes RED.

## Validation
- `npm test` green (223+), including `tests/extractability.test.ts` and the 3-mirror lockstep.
- On a PR: `gh pr checks` shows `extractability` and `required-checks-fail-closed` green.

## Notes
- The token counter is a **documented heuristic** (OpenAI ~0.75 words/token), never Python
  `tiktoken`. Swappable for a real JS BPE tokenizer behind `estimateTokens`.
- The linter deliberately does **not** reward FAQPage or `llms.txt` (refuted doctrine) and does
  **not** gate on query-phrased headings (advisory). Do not "extend" it to do so.
