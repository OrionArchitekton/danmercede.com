# AEO Passage-Extractability Linter — Spec

## Problem
danmercede.com is optimized to be **cited by answer engines** (ChatGPT / Perplexity / Claude),
which fetch raw HTML and do **not** execute React. The hub already bakes crawlable bodies
(`renderBodyBlock`) and a canonical entity graph, but nothing **enforces** that a published
passage stays *extractable*: an opening answer can bloat past the answer-first budget, content
can regress into the JS-only `#root` mount, or a heading hierarchy can break — and all of that
ships green today because no test measures extractability. Meanwhile the field's popular AEO
tactics (FAQPage schema, `llms.txt` Tier-1) are **refuted estate doctrine**
(`seo-geo-aeo.md`): a naive port would re-import killed tactics.

## Approach (chosen)
A pure, dependency-free linter (`extractability.ts`) exposing `lintExtractability(html)`, wired
as a **first-class fail-closed REQUIRED check**. It scores the crawlable layer of a page on
three deterministic checks anchored to the locked **answer-first ~130-170-word doctrine**:

1. **Token budget** — the answer-first passage (`H1` + the lead `<p>` under it) is
   extractable-length, `estimateTokens ≤ MAX_ANSWER_TOKENS` (227 = ceil(170 words × 4/3)).
   Uses a **documented heuristic** (OpenAI ~0.75 words/token), never Python `tiktoken`; a real
   JS tokenizer can replace it behind the same signature. The budget is a **ceiling** (don't
   bury the answer), never a floor — long-form essays are answer-first + depth, so only the
   opening answer carries it.
2. **JS-disabled readable %** — the answer must live **outside** the React mount (`#root`);
   readable ratio `≥ MIN_JS_OFF_RATIO` (0.8). A balanced `<div>` scan splits the `#root`
   subtree out; the real hub ships an empty `#root`, so a well-baked page scores 1.0.
3. **Heading hierarchy** — exactly one `H1`, first heading is `H1`, no level skips.

### Explicit NON-guards (doctrine, asserted by test)
- Does **not** reward FAQPage coverage (refuted; deprecated 2026-05).
- Does **not** rank `llms.txt` Tier-1 (refuted; 97% never crawled).
- Does **not** gate on query-phrased headings (advisory only per
  `section-opener-structure.md`; a mechanical gate manufactures formulaic headings).

These are absent **by construction** — the module has no code path reading FAQPage, llms.txt,
or heading phrasing.

## Scenarios / acceptance criteria
- An over-budget answer-first lead FAILS `token-budget`; a compliant lead PASSES; flipping the
  same fixture over budget flips the verdict (non-vacuity, always-on in-suite).
- A page whose answer lives only inside `#root` FAILS `js-off-readable`; a baked page PASSES.
- An `H1 → H3` skip and a two-`H1` document FAIL `heading-hierarchy`; a clean `H1→H2→H3` PASSES.
- Adding a FAQPage node does not change the verdict; a question-phrased `H2` scores identically
  to a statement `H2`.
- Every `ROUTE_META` baked body is extractability-clean (the gate binds to **real emitter
  output**, not fixtures only).
- The linter is a fail-closed REQUIRED check: the **three mirrors move in lockstep** — the
  `package.json` `test`/`test:extractability` surface, the ci.yml `extractability` job, and
  `required-checks-fail-closed.yml` `BASE_REQUIRED_CHECKS` — locked by
  `tests/requiredChecksWorkflow.test.ts` (drop any one → RED).

## Test seam
The node test runner (`tsx --test tests/*.test.ts`), mirroring `headHygiene` / `imageBudget` /
`identityCanonical` fixture-style units. No new seam introduced.

## Out of scope / deferred
- **A7 per-Article `dateModified`** — DEFERRED. The content model (`Thought`/`Guide`/`Diagram`)
  carries only a publish `date`, no content-change/`updated` field. A `dateModified` would
  either equal the publish date (no-op) or derive from a git-commit bump (the banned W9
  `lastmod` anti-pattern). A real content-change date requires a substrate schema change,
  out of scope for this minimal AEO hardening.
- Replacing the heuristic tokenizer with a real BPE tokenizer (interface already allows it).
