---
title: "Giving Your Coding Agent Web Access Without Wrecking Its Context Window"
slug: giving-your-agent-web-access
date: 2026-07-05
reviewed: 2026-10-27
youtube: 1bdN4d52170
category: Agent Engineering
description: "Measure what your web tool returns before sending it to a model. Separate search, extraction and browser interaction; preserve the answer and source while reducing unnecessary page content. Includes a dated one-page measurement and current tool-discovery caveats."
lead: "A web tool can return the article together with navigation, scripts and repeated metadata. Check that payload before it reaches a model. In an October 27 sample, article extraction retained two selected sentences while reducing the returned text; the result is one page, not a universal saving or a provider bill."
---


If your fetch tool returns raw HTML, your agent may receive navigation, scripts and repeated metadata alongside the passage it needs. If the tool already returns a clean, useful result, measure that output before replacing it. The issue is the content returned, not a claim that every current agent uses the same fetch path.

I originally wrote this guide while hardening my own web-access tools. This October 27 reread separates the historical stack choices from current decision rules. Provider prices and quotas from the July comparison are removed rather than presented as current offers. The useful starting point is still small: measure the payload, check the information you need, and retain a way back to the source.

**Who this is for:** anyone giving an autonomous agent (Claude Code, a `-p` headless pipeline, Codex, an in-house harness) the ability to search, read, and drive the web, and paying for the tokens.

## Why does giving an agent web access wreck its context window?

Raw HTML can contain much more than the article. The size depends on the page and the tool; extraction is useful only if it preserves the material your task needs. A prefix cut can be smaller while losing the answer entirely.

### A dated measurement, with its limits

On **2026-10-27**, I saved the public HTML of this guide before this accuracy refresh. That archived response was **37,453 UTF-8 bytes**. A small parser took text inside its `article` element while skipping script, style and SVG content, producing **11,648 UTF-8 bytes**. Both selected sentences about using a plain fetch were still present. Keeping only the first **4,000 characters of raw HTML** missed both sentences.

For an illustrative second count, **tiktoken 0.12.0, `cl100k_base`** counted **10,068 encoding tokens** in the raw response and **2,737** in the extracted text. Those are counts in that fixed encoding, **not Claude token counts, a Codex usage bill, a model-quality benchmark or proof that every detail survived**. The saved raw response has SHA-256 `c9e62c86fb6544332c3e14a72e0391f40a4fe5f41e6701481fb2c5de59483bde`. The current page has changed; a new fetch need not match it.

The original July write-up reported another page at 9,541 tokens raw and 1,678 as markdown. That historical 82% example is not the October sample and should not be extrapolated to all pages. I do not have a fresh tokenizer-bound replay of that older figure in this refresh.

Tool results can consume working context and request usage when a client includes them in model input. What stays in later requests, what gets compacted or cached, and how it is billed depend on the client and provider. Do not infer a whole-bill reduction from a file-size comparison. Likewise, a self-hosted search tool can still encounter upstream rate limits; test the actual workload.

The earlier illustration shows the intended separation between retrieval and a small useful handoff. Its 82% annotation refers to the historical example, not a universal measured outcome.

![Historical illustration of raw HTML entering agent context versus search, extraction and an optional summarized handoff. Its percentage annotation belongs to the original July example, not every page.](/assets/guides/web-access/efficient-web-access.webp "Historical July illustration; the October sample and its limits are stated above.")

## What are the three axes of agent web access?

Web access is not one capability, it is three, and they want different tools. **Search** (find the URLs), **fetch** (read a page without drowning in it), and **browser automation** (click, fill, scroll a live app). In a 2026-07 review of the field, the cheapest resilient answer differed per axis: self-hosted for search and fetch, local-and-free for the browser.

Conflating them is how people end up overpaying. You do not need a headless Chromium to read a blog post; an extract-first fetch can handle a text article when the needed content is available in its response. You do not need a metered search API to read a page whose URL you already have. Name the axis, then choose a tool that covers it. Reserve the stateful browser for genuine interaction: clicks, forms, infinite scroll, auth walls.

The rest of this guide takes the axes in order. Compare current limits, operating effort and observed output for your own workload.

## What is the cheapest, most rate-limit-resilient search stack?

A self-hosted **SearXNG** instance is one option when you want to operate a metasearch service. It avoids a vendor fee per request to your own instance, but hosting, maintenance and upstream restrictions remain. A cache can reduce repeated requests; it cannot guarantee that every upstream will accept your traffic. See the [SearXNG documentation](https://docs.searxng.org/) before choosing an installation.

Hosted search can be a better fit when you need managed coverage or do not want to maintain a service. Compare the current provider documentation for the queries, concurrency, permitted use and budget you actually have. The old July table of free tiers and prices is not a current ranking. No new provider-price benchmark was performed for this refresh.

## What is the cheapest way to read a page without flooding context?

First check whether your current tool already extracts useful content. If it does not, compare extraction before model ingestion with the raw response. **Jina Reader**, **Trafilatura** and crawler services are possible tools, not a universal ordered shopping list. JavaScript rendering, tables, figures and authenticated content may require different handling. Consult the [Jina Reader documentation](https://docs.jina.ai/) and [Trafilatura documentation](https://trafilatura.readthedocs.io/) for their current interfaces and limits.

Keep the source URL, observation time, original response or a recoverable reference, and any omission or truncation flag with the result. Validate the information the task actually needs. A useful article extraction is not proof that every link, warning or interactive field survived. The October example above checks only two literal sentences in one captured page.

## Does a thin CLI always beat an MCP server for context?

No. **Tool definitions and returned content are different payloads.** Current [Claude Code documentation](https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search) describes MCP tool search with deferred loading. Current [official Codex tool-search source](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/tool_search.rs), inspected October 27, also includes discovery for deferred tools. The old blanket claim that Codex always loads every MCP schema in full is no longer a sound rule. Availability and loading behavior depend on the actual client, settings, runtime and provider path; a current source capability does not prove every installed client uses it.

A working CLI can still be a convenient portable interface. An MCP tool can also fit the job. Neither name bounds the size of a page returned to a model. Measure discovery overhead and returned content separately, then choose the interface your workflow can operate and verify.

A real browser is appropriate when you need interaction or content that the fetch path cannot reveal. Browser tooling can be exposed through a CLI, a library or MCP; statefulness does not force one protocol. No general browser reliability percentage or protocol-wide token-saving multiplier is established here. Check the actual page and session rather than borrowing a number from a different benchmark.

## How do you build the fetch tool, and why run it in a subagent?

The extraction can help before any model sees the response. An optional worker can then read that result and return the requested slice, with a source reference, to the main agent. This may reduce material in the parent conversation, but the worker still uses model input and output and can omit something important. It is not free total usage or guaranteed better answers. Use it when the task and measured tradeoff justify it; a direct bounded fetch may already be enough.

The following is a **historical implementation sketch**, not a fully hardened URL-fetch service or a freshly tested current provider integration. Check current endpoint behavior and permitted access before adopting it. Treat fetched page text as untrusted data; extraction and summarization do not authorize page instructions or guarantee prompt-injection protection.

The fetch CLI itself is about 120 lines. The load-bearing parts:

```python
import math, os, urllib.request  # the full CLI also imports json (for --json) and sys

READER = "https://r.jina.ai/"
# The default python-urllib User-Agent gets a 403 from the reader's bot filter.
# In the historical smoke test, a browser-like UA avoided that response.
# This is not a current compatibility guarantee or permission to bypass access controls.
UA = os.environ.get("WEB_READ_UA",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126 Safari/537.36")

def fetch(url, key=None):
    req = urllib.request.Request(READER + url, method="GET")
    req.add_header("User-Agent", UA)
    req.add_header("X-Return-Format", "markdown")
    if key:                                  # optional, raises free-tier limits
        req.add_header("Authorization", f"Bearer {key}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

def budget(md, max_tokens):
    # A stdlib token estimate: ~4 chars per token. Label it estimated.
    est = math.ceil(len(md) / 4)
    if not max_tokens or est <= max_tokens:
        return md, est, False
    return md[: max_tokens * 4].rstrip() + "\n\n... [truncated]", max_tokens, True
```

The sketch uses a keyless path from the historical integration, an approximate character-based budget and structured output in the full CLI. Current reader access and limits need a fresh check. **Characters divided by four is an estimate, not a hard token cap**; even the truncation marker adds text. Counting with the target encoding is stronger when you need an actual encoding bound, and neither method proves the answer survived clipping. Report truncation explicitly and offer recovery of the source.

In the historical integration, a live smoke test found a user-agent-dependent `403` that mocked network tests did not reveal. That observation supports checking the actual endpoint; it is not evidence that the same request works today. A production fetch service also needs its own URL/access policy, resource limits and error handling, which this short sketch does not implement.

## What should you actually adopt?

Start with one repeated task. Save its raw tool response, inspect a smaller view and check the material you need. Use search to find an unknown URL, extraction to read available text and a browser for interaction or content the fetch cannot reveal. If the current tool already does that well, keep it.

My original July stack used self-hosted search, a reader CLI, a crawler for bulk work and local browser automation. That is historical context, not a freshly benchmarked cheapest stack. Review present-day operating effort, permissions, provider terms and workload limits before choosing those tools. Add a summarizing worker only if its extra usage and information loss are acceptable for your task.

## The takeaway

Measure what your web tool actually returns. Reduce unnecessary content before model ingestion when that helps, verify the answer survived, and retain the source with its date and omissions. Separate tool discovery from returned payload, and choose the interface for the job. The October one-page result is a repeatable kind of check, not a universal percentage, billing saving or model-quality claim.
