---
title: "The Router Is a Trap: Running Other Models Under Claude Code, Off Their Own Subscriptions"
slug: off-budget-subagents-under-claude-code
date: 2026-07-08
category: Agent Engineering
description: "I wanted Claude Code to keep Opus orchestrating while fanning subagent work out to other models on their own subscriptions. The obvious tool, an ANTHROPIC_BASE_URL router, turned out to be the wrong one: it corrupts the tool calls a subagent depends on, and the real wall is the Terms of Service, not the tooling. Here is what actually works, the three-of-four vendor ban that decides it, and the gated delegation layer I shipped."
lead: "My preference going in was a model router. The research inverted it. A proxy that swaps Claude for another model behind Claude Code's own API corrupts the one thing a subagent has to do reliably, which is call tools, and the seam it rides is banned at three of the four vendors I wanted to use. The mechanism that survives is the boring one: shell out to each vendor's own CLI."
---


I wanted a simple thing. Keep a Claude model orchestrating inside Claude Code, but when it fans out to subagents and background jobs, run that work on other models paid for by other subscriptions, so it stops drawing down my Anthropic allocation. The obvious build is a router: point Claude Code at a proxy, let the proxy translate each call to Gemini or GPT or a local model. That is the popular path, and it is a trap.

Two findings flipped my plan. The router path corrupts tool calls badly enough to be useless for agentic subagents. And the constraint that actually decides the architecture is legal, not technical: reusing a consumer subscription inside a third-party harness is prohibited and actively enforced at three of the four vendors I cared about. What survives both problems is the unglamorous option I already had running.

**Who this is for:** anyone trying to cut their Claude Code bill by offloading subagent or workflow fan-out onto other models, and anyone about to install a community "just point it at this proxy" bridge without reading what it does to your sandbox.

---

## What are you actually trying to buy?

The goal is narrow and worth stating before the tooling: keep the frontier orchestrator (a Claude model) as Claude Code's primary driver, and route only the *fan-out* (subagents, workflow `agent()` calls, background tasks) to other models on their own billing. A Claude Code Max plan meters a weekly token allocation that resets on a fixed cadence, so every subagent you can move off that pool is allocation you keep for the orchestration that has to stay on Claude.

The key word is *off-budget*. This is the test every option below has to pass. Running a cheaper Claude model as a subagent does not pass it: Claude Code's native per-subagent selection is Anthropic-alias-only, and a Haiku or Sonnet subagent still bills the same Anthropic pool. Saving per-token cost is not the same as taking work off the allocation. Only routing to a genuinely external provider does that, which is why the interesting question is how to reach a non-Anthropic model at all.

## Why does the router path corrupt your tool calls?

The most-starred tool in this space, claude-code-router, sits at roughly 35,600 GitHub stars as of mid-2026, and it works by exploiting one documented fact: Claude Code does not validate model IDs behind a custom `ANTHROPIC_BASE_URL`. Anthropic's own model-config docs say the ID check "runs only on the Anthropic API," so behind a gateway your provider defines the names and Claude Code passes any string through unchecked. That single gap is what every under-the-harness router is built on.

It works at the transport layer and fails at the semantic one. The dominant, recurring failure is tool-calling corruption. When a non-Claude model runs behind Claude Code's Anthropic-shaped API, the translation shim mistranslates tool calls: optional parameters get injected as empty strings (a `Read` arrives with `pages: ""`), which Claude Code rejects, "producing an infinite loop that burns reasoning tokens until the user manually interrupts." Server tools like web search get mistranslated into ordinary functions, so search comes back empty or misleading. Some local-model adapters emit plain text that merely *mimics* a tool call and then does nothing with it. On top of that, documented proxy layers drop MCP server tools, ignore prompt-cache control, and turn parallel tool use into sequential calls.

For a chat turn, that degradation is survivable. For an agentic subagent whose entire job is to call `Read`, `Edit`, `Bash`, and MCP tools reliably, it is disqualifying. The proxy gives you the model behind the endpoint and takes away the tool loop that made the endpoint worth reaching.

## Why is the Terms of Service the real constraint, not the tooling?

Here is the finding that actually decided the architecture: as of mid-2026, reusing a consumer *subscription* inside a third-party harness is prohibited and enforced at three of the four vendors, so the tooling question is downstream of a legal one. The enforcement is not theoretical, and in one case it is not even loud.

- **Anthropic** made the prohibition explicit in a February 2026 consumer-terms revision (tokens permitted only in Claude Code and Claude.ai), and on April 4, 2026 blocked third-party harnesses from using Claude Max subscription rate limits outright. Bring-your-own API keys still work; subscription-OAuth reuse does not.
- **Google** is the cautionary tale. It deployed abuse detection and *silently* banned paying AI Ultra subscribers (a $249.99-per-month plan) who drove third-party CLIs on their consumer OAuth in mid-April 2026, with reports of the ban cascading to Gmail and Workspace. It then stopped serving consumer and Pro or Ultra tiers to its IDE code-assist extensions on June 18, 2026. If your estate leans on Google Workspace, an OAuth-reuse ban is not a coding-tool outage, it is a Gmail outage.
- **xAI's** terms bar automated, non-human (bot or script) access to Grok and reserve suspension at sole discretion; the only sanctioned programmatic path is the separate pay-per-token API.
- **OpenAI is the outlier.** It publicly sanctions reusing a ChatGPT subscription in third-party tools with "the same usage as Codex," and Codex-into-third-party has an official adapter. Subscription Codex is governed by the consumer ChatGPT terms and metered as plan usage, not raw API billing.

The net for the original dream of "route all my subscriptions through one proxy": it is durable for exactly one of them, GPT via Codex. Every other subscription seam rides reverse-engineered OAuth that the vendor is actively closing. One corroborating datum: a Claude-Max-as-API seam that made the rounds earlier in 2026 survived about two months before the vendor shut it. Treat any subscription-brokering feature as a liability with a short shelf life, not a capability. For Gemini or Grok specifically, use a paid API key, never the consumer login.

## What actually works: shell out to headless CLIs

The mechanism that clears both the tool-fidelity trap and the Terms-of-Service wall is the one I already ran in production for months: keep Claude orchestrating and shell out to each other vendor's *headless CLI* as a subagent. Instead of translating Claude Code's API to another provider, you invoke `codex exec`, `gemini`, or `grok -p` as a subprocess, each authenticated to its own login, each doing its own native tool calling.

This inverts every problem the proxy created. There is no Anthropic-to-OpenAI translation shim, so there is no empty-string-parameter loop and no mistranslated web search; each CLI speaks its own protocol natively. The work runs on that CLI's own credentials, so a Codex call bills the ChatGPT plan and a local-model call bills nothing, both off the Anthropic allocation. And it matches a doctrine most mature harnesses already follow, which is to prefer a working CLI over a bespoke integration: a post-push review pipeline that drives Codex headless is the same pattern, just pointed at review instead of fan-out.

The tradeoff is honest. You give up the illusion of one unified `/v1` endpoint and instead orchestrate N processes, joined by your own wait-and-collect logic. In exchange you get native tool loops, per-vendor billing, and no dependency on a subscription seam that gets patched out from under you.

## How do you keep the delegation layer from bypassing your sandbox?

The security catch is real and specific: nearly every community CLI-bridge I looked at launches its child CLI with a permission-or-sandbox bypass flag baked in (`--dangerously-skip-permissions`, `--dangerously-bypass-approvals-and-sandbox`, `--yolo`, `-y`). That is convenient and it is also how you hand an untrusted subagent's output the keys to your workstation. When I shipped my own delegation layer in July 2026, the rails were the point, not an afterthought, and they are enforced in code with tests, not just documented.

Five rails carry the safety, and each is one small function:

- **Never emit a bypass flag.** A denylist is asserted in a unit test so a bypass flag can never regress into the spawned `argv`. The read-only sandbox is the default; write access is an explicit, separate opt-in.
- **Scrub the child environment by whitelist, not denylist.** The child gets `PATH`, `HOME`, and its *own* provider key, and nothing else. A future secret-shaped variable you have not thought of yet does not survive by default, because the default is to drop, not to keep.
- **Resolve the CLI by absolute path.** Never exec a bare command name; resolve it to an absolute path first so a planted binary earlier on `PATH` cannot shadow the real one.
- **Close stdin.** Recent Codex versions deadlock on a non-TTY pipe, so the child gets `stdin` pointed at `/dev/null`.

```python
# read-only by default; workspace-write is an explicit, separate opt-in
sandbox = "workspace-write" if write else "read-only"
argv = [resolve_cli("codex"), "exec", "-s", sandbox, task]
assert not any(flag in argv for flag in BYPASS_FLAGS)  # tested, not just asserted here
```

The fifth rail I only found by running the thing, which is the reminder that live verification beats reasoning. Grok's CLI needs an explicit headless flag: `grok -p "<prompt>"` prints the answer and exits, but a *positional* prompt with no flag opens the interactive TUI and hangs a non-interactive caller. A positional prompt cost me a two-minute timeout before I read the help text. The regression is now pinned by a test that asserts the `-p` flag is present in the built `argv`.

```python
# a positional prompt opens grok's interactive TUI and hangs a non-TTY caller;
# -p / --single prints and exits.
argv = [resolve_cli("grok"), "-p", task, "--output-format", "json"]
```

## What should you actually build?

If you take one architecture from this, take this shape, which I settled on after two research runs and a working implementation in July 2026: Claude orchestrates, and it delegates to a small, gated set of headless CLIs chosen by Terms-of-Service durability first and cost second.

1. **Orchestrator:** a Claude model in Claude Code, unchanged.
2. **Primary off-budget subagent:** GPT via `codex exec` on the ChatGPT plan. This is the one durable subscription-reuse path, so it earns the default slot.
3. **Cheap bulk fan-out:** a metered API key (DeepSeek and Kimi run roughly an order of magnitude cheaper than frontier Claude on input tokens) or a free local model on your own GPU box via a local inference endpoint. No subscription to reuse means no ban risk.
4. **Gemini or Grok, if at all:** only on a paid API key, isolated from the primary Google account. Never the consumer login.
5. **Mechanism:** headless-CLI subprocess, not a proxy. If you ever want a proxy for *API-key* models, the routers are fine; just treat their subscription-brokering as the liability it is.

The three paths compared, so the choice is legible:

| | Router proxy | Headless CLI (recommended) | Native per-subagent |
|---|---|---|---|
| Keeps Claude orchestrating | Only if you patch aliases | Yes, cleanly | Yes |
| Routes subagents to other providers | Yes, but Claude-unaware | Yes, per call, model named | No, Anthropic aliases only |
| Off the Anthropic budget | Yes | Yes | No, still bills the same pool |
| Tool-calling reliability | Poor and brittle | Native per CLI | Native |
| Subscription legality | Rides the prohibited seam | Depends on vendor (GPT sanctioned) | Not applicable |

The plan I walked in with, a single elegant router, was the wrong instinct dressed up as the clean one. The winning design is a handful of subprocesses behind a security gate, choosing each model by whether its vendor will still let you in next month. Boring, durable, and off-budget. That is the trade, and it is a good one.

*The vendor terms and enforcement dates in this guide are time-sensitive and were accurate to mid-2026; enforcement is active and moving, so re-verify a vendor's current terms before you build on any subscription seam.*
