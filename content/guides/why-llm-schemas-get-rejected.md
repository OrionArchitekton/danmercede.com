---
title: "Why 88% of Real LLM Schemas Get Rejected (and the `additionalProperties` Trap Behind It)"
slug: why-llm-schemas-get-rejected
date: 2026-06-28
category: Agent Engineering
description: "I ran a JSON-Schema linter across 50 real LLM tool and structured-output schemas from the OpenAI/Anthropic cookbooks, popular agent frameworks, and official MCP servers. 88% would be rejected by at least one provider. Here's the one field behind most of it — and how to catch it in CI instead of production."
lead: "A schema that works on OpenAI 400s on Anthropic. One that works on Anthropic warns on Gemini. I measured it on 50 real schemas — 88% break somewhere, and one field is behind most of the OpenAI failures."
---


I shipped a small tool that lints JSON Schemas against each LLM provider's structured-output constraints, then did the obvious thing: I pointed it at **50 real, public schemas** — the kind developers actually feed to these APIs — to check whether the problem I'd built for was real or imagined.

It was real. **44 of the 50 (88%) would be rejected by at least one major provider. Only 3 passed all five.** And the single biggest cause is one field almost nobody sets by hand.

This guide walks through what breaks, why it's invisible until production, the one-line shape of the fix, and how to make it a CI check instead of a runtime surprise. Every number here comes from a reproducible run you can repeat on your own schemas (link at the end).

**Who this is for:** anyone shipping structured outputs, tool calls, or `response_format` to more than one LLM provider — directly or through a framework like Instructor, LangChain, or an MCP server.

---

## 1. The experiment

The corpus was 50 schemas, each traceable to a public source:

- **15** from the OpenAI and Anthropic cookbooks and SDKs.
- **17** from popular agent frameworks — Instructor, LangChain, Pydantic-AI, CrewAI, Guidance, LlamaIndex.
- **18** tool `inputSchema`s from official Model Context Protocol servers.

Each was linted against OpenAI, Anthropic, Gemini, Mistral, and Cohere. The result:

| Provider | Would reject | Notes |
|---|---|---|
| **OpenAI** | **88%** | Strict Structured Outputs — firm, documented |
| **Mistral** | 88% | Conservative rule (see the honesty note) |
| **Cohere** | 26% | Needs ≥1 required field per object |
| **Anthropic** | 12% | Rejects certain validation keywords |
| **Gemini** | 0% errors | But 26% warn (`$ref` recursion, `anyOf`) |

The portability story is the real headline: **only 3 of 50 schemas were clean across all five providers.** A schema isn't "valid" or "invalid" — it's valid *for a specific provider*, and the surfaces don't agree.

---

## 2. The dominant failure: OpenAI strict Structured Outputs

OpenAI's strict mode is the firmest, best-documented constraint surface — and the one most schemas violate. It enforces two rules that ordinary JSON Schema does not:

1. **Every object must set `additionalProperties: false`.**
2. **Every property must be listed in `required`.** (To make a field "optional," you make it nullable — `["string", "null"]` — and keep it required.)

Plus a few smaller ones, including: **no `default`**, and a restricted keyword set.

Here's a real MCP tool schema — `get_channel_history`, about as simple as schemas get:

```json
{
  "type": "object",
  "properties": {
    "channel_id": { "type": "string", "description": "The ID of the channel" },
    "limit": { "type": "number", "description": "Number of messages", "default": 10 }
  },
  "required": ["channel_id"]
}
```

Two properties. It passes Anthropic, Gemini, and Cohere. Against OpenAI strict mode it fails **three** ways at once:

- no `additionalProperties: false` on the object,
- `limit` is optional (not in `required`),
- `limit` carries a `default`.

This isn't a contrived edge case — it's the *default shape* of a hand-written tool schema, and the default output of most Pydantic models (`additionalProperties` simply isn't emitted, and optional fields stay out of `required`). Across the 50-schema corpus, `additionalProperties` alone accounted for **134 flags** — more than every other keyword combined.

---

## 3. Why it's invisible until production

The constraints are documented, so why does everyone hit them? Because the failure mode is opaque. When a provider rejects a schema, the API returns the equivalent of *"invalid schema"* — a 400 — without telling you **which** constraint, at **which** path, failed. So the loop becomes: ship → 400 in production (or in a flaky eval) → bisect the schema by hand → discover it was a missing `additionalProperties` three levels deep in a nested object.

Multiply that by five providers, each with a different surface, and "just hand-port the schema" becomes a recurring tax instead of a one-time fix.

---

## 4. The shape of the fix

For the Slack example, OpenAI-strict-valid looks like:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "channel_id": { "type": "string", "description": "The ID of the channel" },
    "limit": { "type": ["number", "null"], "description": "Number of messages" }
  },
  "required": ["channel_id", "limit"]
}
```

`additionalProperties: false` added, `limit` made nullable and moved into `required`, `default` dropped. The semantics are preserved (a caller can still pass `null` for `limit`), but now it satisfies strict mode.

The mechanical part is easy *once you know which rule fired and where*. The hard part is knowing — before the 400.

---

## 5. The cross-provider trap

OpenAI is the loudest case, but the deeper problem is that **the five surfaces disagree**, so fixing for one can break another:

- **Anthropic** rejects a set of validation keywords in tool input schemas — `format`, `minLength`, `pattern`, `minimum`/`maximum` — that OpenAI and others accept. A schema you tightened for OpenAI can trip Anthropic.
- **Gemini** has no `anyOf`/union support in the same way and chokes on self-referential `$ref` (recursion) — a common shape when a Pydantic model references itself. In the corpus these showed up as warnings, not hard errors, but they're real runtime risks.
- **Cohere** wants at least one required field on every object.
- **Mistral**'s structured-output examples set `additionalProperties: false` everywhere, like OpenAI.

This is why only 3 of 50 schemas passed all five. There is no single "correct" schema — there's a per-provider constraint surface, and a schema that ships to multiple providers has to satisfy the *intersection*.

---

## 6. Catch it in CI, not in prod

The fix for an opaque, multi-surface, easy-to-regress constraint is the same fix we use for every other class of "works on my machine" bug: **a static check that fails the build.**

That's the entire premise of [schemafit](https://github.com/OrionArchitekton/schemafit) — the tool I ran this study with. It encodes each provider's documented constraint surface as a versioned rule pack and lints your schema statically: exact JSON-Pointer path, the keyword, and why, with a non-zero exit code so CI fails the PR instead of prod. It makes no model calls, needs no API key, and has zero runtime dependencies.

```bash
pip install schemafit
schemafit lint my-schema.json --provider openai,anthropic,gemini,mistral,cohere
```

It ships a GitHub Action and a pre-commit hook, and emits SARIF for GitHub code-scanning. But the tool is incidental to the lesson: **treat provider schema constraints as a CI concern, the way you treat types or lint.** Whether you adopt a linter, a test, or a checklist, the move is to surface the 400 *before* it reaches a provider.

---

## 7. Honesty notes (because the numbers will get scrutinized)

- **OpenAI's 88% is the firm case.** Strict Structured Outputs *documents* the `additionalProperties: false` and all-required requirements; the schemas that passed OpenAI genuinely carried both. That number is solid.
- **Mistral's 88% uses a more conservative rule.** Mistral's docs *show* `additionalProperties: false` in their structured-output examples but don't prose-mandate it, so read Mistral as "likely-reject," not "documented-reject."
- **Gemini's hits were warnings, not errors** — `$ref` recursion and `anyOf` are real risks, but I'm not claiming a guaranteed 400.
- **The corpus is provider-mixed by design** — cookbook examples skew already-strict; framework and MCP schemas skew permissive — so 88% is a floor, not a cherry-pick.

The full per-provider breakdown, the provenance for all 50 schemas (every source URL), and a script to reproduce the run on your own schema directory are in the repo's [`benchmarks/`](https://github.com/OrionArchitekton/schemafit/tree/main/benchmarks).

---

## The takeaway

LLM schemas aren't portable, and the providers won't tell you why a schema failed — only that it did. The constraint surfaces are documented but scattered, opaque at the API boundary, and easy to regress when you fix for one provider and break another. The 88% number isn't an indictment of anyone's schemas; it's evidence that this belongs in CI, next to your other static checks — not in a production traceback at 2am.

Run it on your own schemas and see where you land. If you hit a rejection a linter *doesn't* catch — or a rule that's wrong for your setup — that's exactly the feedback worth sharing.
