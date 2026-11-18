---
title: "Claude Code Cache Usage: What 471 Sessions Reveal About Token Cost"
slug: where-claude-code-usage-goes
date: 2026-10-23
reviewed: 2026-11-17
modified: 2026-11-17
image: /assets/guides/claude-code-usage/token-vs-cost-share.webp
image_alt: "One week of Claude Code usage: cache reads are 97 percent of tokens but 46 percent of API list-price cost, while cache writes are about 3 percent of tokens and 38 percent of cost."
category: Agent Engineering
description: "Measure Claude Code cache reads, cache writes, and subagent usage. A 471-session case study, a local Python counter, and the limits of API-price estimates."
lead: "A high cache hit rate does not mean a low token cost. In my seven-day Claude Code sample, cache reads were 97% of tokens and 46% of API list-price cost; cache writes were about 3% of tokens and 38% of that cost. Measure the token mix and price each bucket before changing how you use agents."
---


## What should you measure first?

Separate uncached input, cache writes by lifetime, cache reads, and output. Deduplicate streamed and replayed requests before adding them up. Then compare token share with API list-price share. Use Claude Code's `/usage` view for your plan's limits; a local token-price estimate does not reconstruct subscription billing.

For example, at the Opus 5.5 rates used here, reading 500,000 cached tokens costs $0.10; writing the same prefix into a one-hour cache costs $4.00. That is a price calculation, not a measurement of how many subscription credits either action consumes. [Anthropic's pricing](https://platform.claude.com/docs/en/about-claude/pricing) and [Claude Code's usage documentation](https://code.claude.com/docs/en/costs#using-the-usage-command) describe the two views.

## Scope and evidence

| What this analysis covers | Evidence and limit |
|---|---|
| Measurement window | Seven-day lookback run on October 23, 2026. The exact cutoff timestamp and timezone were not published. |
| What was counted | Local transcript analysis reported 471 sessions, 21,449 API calls, and 6.15 billion tokens, including subagents. These are the original author's measurements, not a new November sample. |
| Software observed | Claude Code 2.1.301 through 2.1.305. Cache lifetimes below describe those logs, not a promise about every version or provider. |
| Price basis | Each supported model's token buckets, using the dated rate table below. Approximately $2,500 is API list-price value, not an invoice or subscription charge. |
| What a reader can reproduce | The local counting method and price arithmetic. Raw work transcripts are not published, so the aggregate sample cannot be independently reconstructed from this page. |
| November 17 review | The whole guide and the current official pricing, caching, usage, and plugin references were reread. The original private transcript analysis was not rerun. |

**Who this is for:** heavy Claude Code users who want to know where their usage goes, and anyone running subagents or long sessions who has never looked at the token mix underneath.

**Start here:** [run the local measurement](#how-do-you-measure-your-own-claude-code-usage), then [compare the next week](#how-do-you-compare-a-change-without-losing-quality). If the costly work is an external handoff, the companion [Claude Code to Grok Bot guide](/guides/claude-code-controls-grok-bot) covers request IDs, explicit completion, and ambiguous sends. It does not establish that moving the work saves money.

---

## How do you measure your own Claude Code usage?

On October 23, 2026, I ran Anthropic's `session-report` plugin over seven days of local transcripts and got 471 sessions, 21,449 API calls and 6.15 billion tokens. The plugin reads saved transcripts under `~/.claude/projects`, including subagent transcripts. Your available history depends on what remains on that machine.

The plugin is listed in [Anthropic's official marketplace](https://claude.com/marketplace/plugins/session-report). In Claude Code:

```
/plugin install session-report@claude-plugins-official
/session-report
```

It writes an HTML report you can sort and expand. The [published analyzer source](https://github.com/anthropics/claude-plugins-official/blob/fd30cee3ecd5a8ee772733c5d20c0f2bae2da2f0/plugins/session-report/skills/session-report/analyze-sessions.mjs) supports `--json --since 7d`. A streamed response can have several records for one request, and a resumed session can replay history into a new file. The analyzer deduplicates usage and retains the largest output-token count for a request within a file. If you write your own counter, account for both cases before trusting the totals.

Keep the report private until you inspect it: prompts and project names can appear in the output. For comparisons, save the report, the analysis time, the selected window, the Claude Code version, and the price table you used.

My week, from the plugin's JSON:

| Measure | Value |
|---|---|
| Sessions | 471 |
| API calls | 21,449 |
| Input tokens | 6.12B (97.2% cache reads) |
| Output tokens | 21.6M |
| Subagent runs | 688 (1.96B tokens, 32% of all tokens) |
| Calls that wrote more than 100K uncached tokens | 223 |

That table reads like a well-tuned setup. 97% cached sounds like the cache is doing its job. It is doing its job, and that's exactly why the number tells you so little.

## Why is "97% cached" the wrong number to watch?

In my week, cache reads were 96.9% of all tokens but about 46% of the cost at API list prices. Cache writes were 2.8% of tokens and about 38% of the cost. Output was 0.4% of tokens and about 16%. Token share and cost share draw two different maps of the same week.

The reason is the price ladder. These are the Claude Opus 5.5 rates used in the October 23, 2026 analysis, per million tokens. They still matched [Anthropic's published pricing](https://platform.claude.com/docs/en/about-claude/pricing) at the November 17 review:

| Token type | Price | vs. base input |
|---|---|---|
| Cache read | $0.20 | 0.05x |
| Base input (uncached) | $4.00 | 1x |
| 5-minute cache write | $5.00 | 1.25x |
| 1-hour cache write | $8.00 | 2x |
| Output | $20.00 | 5x |

A 1-hour cache write costs 40 times what a cache read costs. So a session holding 500,000 tokens of context pays about $0.10 to re-read it on the next turn, and about $4.00 to write it again from scratch. One rewrite costs the same as forty reads of that same context.

So I priced every request in the week by its own model and token types. The session-report plugin counts tokens, not money, so I wrote a small script to weigh them. It keeps one usage record per request ID and splits cache writes by their time-to-live, using the [API's cache-creation fields](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration).

Save the following as `weigh.py`. Its price rows are the historical analysis inputs, not an automatically maintained price catalog. It skips unknown models and warns about their excluded tokens. Records without a request ID are excluded, and missing usage fields count as zero. Treat the result as a partial estimate if your transcripts do not have the expected fields. This script estimates token charges only; tool fees, provider-specific prices, discounts, and subscription metering are outside it.

```python
#!/usr/bin/env python3
"""Weigh Claude Code token usage by API list price (not plan quota)."""
import glob, json, os, sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# USD per million tokens: (input, output, cache read), from Anthropic's pricing
# page on 2026-10-23. Longer model IDs first: matching is by prefix.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00, 0.20),
    "claude-sonnet-5-5": (2.00, 10.00, 0.10),
    "claude-haiku-5-5": (0.10, 0.50, 0.01),  # prompts up to 100K tokens
    "claude-fable-5-1": (10.00, 50.00, 0.25),
    "claude-opus-5": (5.00, 25.00, 0.50),
}
HAIKU_LONG = (0.50, 2.50, 0.05)  # Haiku 5.5 prompts over 100K tokens
days = float(sys.argv[1]) if len(sys.argv) > 1 else 7
since = datetime.now(timezone.utc) - timedelta(days=days)

best = {}  # request id -> (model, usage); keep the record with the most output
skipped = 0
for path in glob.glob(os.path.expanduser("~/.claude/projects/**/*.jsonl"), recursive=True):
    with open(path, errors="replace") as fh:
        for line in fh:
            if '"usage"' not in line:
                continue
            try:
                e = json.loads(line)
            except ValueError:
                skipped += 1
                continue
            msg, rid, ts = e.get("message") or {}, e.get("requestId"), e.get("timestamp")
            u = msg.get("usage") if isinstance(msg, dict) else None
            if not (u and rid and ts):
                continue
            try:
                when = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
            except ValueError:
                skipped += 1
                continue
            if when.tzinfo is None:  # treat offset-less timestamps as UTC
                when = when.replace(tzinfo=timezone.utc)
            if when < since:
                continue
            if rid not in best or (u.get("output_tokens") or 0) >= (best[rid][1].get("output_tokens") or 0):
                best[rid] = (msg.get("model", "?"), u)

tokens, cost, unpriced = defaultdict(int), defaultdict(float), defaultdict(int)
for model, u in best.values():
    n = lambda d, k: d.get(k) or 0  # missing or null counts as 0
    cc = u.get("cache_creation") or {}
    w1h = n(cc, "ephemeral_1h_input_tokens")
    parts = {
        "uncached": n(u, "input_tokens"),
        "write_1h": w1h,
        "write_5m": max(n(u, "cache_creation_input_tokens") - w1h, 0),  # total includes 1h
        "read": n(u, "cache_read_input_tokens"),
        "output": n(u, "output_tokens"),
    }
    price = next((p for k, p in PRICES.items() if model.startswith(k)), None)
    if price is None:
        unpriced[model] += sum(parts.values())
        continue
    prompt = sum(n(u, k) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
    if model.startswith("claude-haiku-5-5") and prompt > 100_000:
        price = HAIKU_LONG
    # fast mode doubles every rate; US-only routing adds 10%
    mult = (2 if u.get("speed") == "fast" else 1) * (1.1 if u.get("inference_geo") == "us" else 1)
    inp, out, rd = (x * mult for x in price)
    rate = {"uncached": inp, "write_5m": 1.25 * inp, "write_1h": 2 * inp, "read": rd, "output": out}
    for kind, count in parts.items():
        tokens[kind] += count
        cost[kind] += count * rate[kind] / 1e6

t, c = sum(tokens.values()), sum(cost.values())
if skipped:
    print(f"skipped {skipped} unreadable transcript lines; totals may be low")
for model, count in unpriced.items():
    print(f"no price row for {model}: {count / 1e6:,.1f}M tokens left out")
if c == 0:
    sys.exit("nothing priced: add a PRICES row for your model")
print(f"{len(best)} requests, {t / 1e6:,.0f}M priced tokens, ${c:,.0f} at list price")
for kind in tokens:
    print(f"{kind:9} {100 * tokens[kind] / t:5.1f}% of tokens  {100 * cost[kind] / c:5.1f}% of cost")
```

Run it with `python3 weigh.py 7` for the last seven days. In the original analysis it matched the plugin to within 0.1% on request count and total tokens, and put the week at roughly $2,500 at API list price. That agreement is a reported result from October, not a new verification of the private dataset.

The dated table uses standard long-context rates for Opus 5.5 and Sonnet 5.5, the higher Haiku 5.5 tier above 100,000 prompt tokens, and modifiers for supported fast-mode and US-only requests. None of those modifiers showed up in my week: every request ran at standard speed on global routing. Check the current provider and model prices before applying this script to different traffic; do not assume its modifier rules cover a new model.

![Two stacked bars comparing one week of Claude Code usage. By tokens, cache reads fill 97% of the bar. By list price, cache reads are 46%, cache writes 38% and output 16%.](/assets/guides/claude-code-usage/token-vs-cost-share.webp "Same week, two maps: cache writes are 3% of the tokens and 38% of the list-price cost.")

The practical change is what you watch. A hit rate of 97% says little about cost. The cache write share says a lot, and it moves when your habits change.

## What is a cache break, and where did mine come from?

The plugin flags any call that writes more than 100,000 tokens it couldn't read from cache. My week had 223 of them, holding 42% of all cache-write tokens. When I lined each one up against the previous call in the same transcript, 209 of the 223 (94%) followed idle gaps longer than the observed cache lifetime. I classified those as consistent with expiry. Timing alone cannot exclude a simultaneous prompt change or another invalidation.

A cache entry has a time-to-live. A cache hit refreshes the entry; after expiry, a request may have to write its prefix again. Anthropic documents [five-minute and one-hour cache lifetimes](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration). In my transcripts the two kinds of context used different windows: 98% of main-session cache writes were 1-hour writes, and 100% of subagent cache writes were 5-minute writes. That is what my logs show on Claude Code 2.1.301 through 2.1.305, not a documented guarantee, so check the `cache_creation` fields in your own transcripts before you rely on it.

So I sorted the 223 big writes by what happened just before each one:

| What came before the rewrite | Breaks | Write tokens | List price |
|---|---|---|---|
| A main session sat idle for over an hour | 72 | 38.3M | about $307 |
| A subagent had finished, then got a follow-up message over 5 minutes later | 92 | 19.5M | about $76 |
| A subagent waited over 5 minutes on its own tool call | 42 | 9.9M | about $44 |
| A subagent sat idle over 5 minutes in some other way | 3 | 0.7M | about $3 |
| The prefix changed while the cache was still live | 13 | 2.3M | about $14 |
| The first call of a transcript | 1 | 0.3M | about $2 |

The first four rows are the expiry-consistent cases: 72 + 92 + 42 + 3 = 209. The prefix-change row covers an edited system prompt, a changed tool list, or a model switch while the observed lifetime had not elapsed. It was 13 breaks out of 223.

At list price, those 223 rewrites cost about $446, or 18% of my week. That is 223 calls out of 21,449.

## Why do subagents cost more than their token count suggests?

In my week, 688 subagent runs made up 32% of all tokens but 64% of all cache writes. A new subagent read a median 17,900 tokens from cache on its first call, then wrote a median 55,000 more. The bigger cost came later: 92 times, I sent a follow-up to a subagent that had already finished, after its 5-minute cache had expired.

Start with the first call, because every subagent pays it. The shared part of the prompt was already cached (78% of first calls read more than 10,000 tokens from cache), but the subagent's own brief and context were new, and across 688 runs those first-call writes added up to 39 million tokens, 23% of all my cache writes.

The follow-ups are the part I didn't expect. When a subagent finishes and you message it again, my transcripts show Claude Code continuing the same subagent with all of its context. If that follow-up arrives more than five minutes later, the cache is gone, and the whole subagent context gets written back. In my week, the median rewrite from a revived subagent was 178,000 tokens, more than three times the median cost of starting a fresh one. The median gap before those follow-ups was 9.3 minutes, so these weren't hour-long pauses. They were the ordinary rhythm of a coordinator getting to a subagent's result a few minutes late.

Long tool calls matter less than I assumed. 42 subagent breaks came after the subagent waited more than five minutes on its own command, a build or a test run or a sleep, which cost about $44 for the week. That's real, but it's about 60% of the follow-up cost, and both are small next to the main-session row.

## What does walking away from a long session cost?

72 of my main-session cache breaks came after more than an hour idle, and they cost about $307 at list price, 12% of my week. 57 of them were me coming back to a session, after a median gap of 11 hours, with a median rewrite of 489,000 tokens. Typing "continue" sends the whole context again as a 1-hour write, at twice the base input price.

The math is blunt. A session that has grown to 500,000 tokens of context costs about $4 in cache writes the moment you resume it the next morning, before the model does anything new. Do that across several open sessions and it adds up, while every individual turn still looks cheap.

The other 15 weren't a person coming back. 9 followed a foreground command that ran for more than an hour, so the session's own cache expired while it waited, and 6 followed a background task notification that woke an idle session.

You have two simple options before you step away from a big session. End it with a short written handoff and start fresh, so the next session begins small. Or compact it while the cache is still warm, so what gets rewritten later is a summary instead of the full history. I didn't measure the compaction option here; it follows from the price table, since a compaction run while the cache is warm reads the history at the cheap rate.

## What does this tell you about the "usage draining 5x" reports?

Nothing conclusive. The original motivation was [an October 21 report of faster usage drain](https://x.com/CampbellKaleb23/status/2112957708219433095) and [Anthropic's subsequent response](https://x.com/bcherny/status/2113417302402322910). That was the context when I wrote the October analysis, not a claim about the investigation's status today. A token mix priced at API rates cannot establish why a subscription limit changed.

What the transcripts do give you is a local baseline. Compare cache-write share, large rewrites, subagent activity, model mix, and completed work across equivalent windows. A difference can come from workload or software behavior as well as habits. No difference does not prove that the cause is external: local logs can be incomplete. Claude Code's current `/usage` view adds plan bars and approximate attribution from that machine's history, while its session dollar estimate remains separate from subscriber billing.

## What I'm changing

The first three changes come straight from rows in the tables above:

1. **After a long break, I start fresh with a handoff instead of resuming a huge context.** That was 57 resumes and most of the $307 main-session row.
2. **Follow-ups to a finished subagent go out within five minutes, or go to a fresh subagent with a short brief.** A revived subagent rewrote a median 178,000 tokens; a fresh one wrote 55,000. That was 92 breaks and about $76.
3. **Long waits run in the main session, not inside a subagent.** The main session keeps a 1-hour cache in my logs; a subagent keeps five minutes. That was 42 breaks and about $44.
4. **I watch the cost share, not the hit rate.** The weekly check is the script above, and the line I read first is cache writes.

These are workflow changes I chose from the measured rows, not a controlled before-and-after savings result. Reusing an agent can preserve context you would otherwise have to rebuild. A shorter brief is useful only if it retains the requirements and evidence needed to finish correctly.

## How do you compare a change without losing quality?

Start with one seven-day baseline. Choose one change, such as a written handoff before leaving a large session, then collect another seven-day report. Hold the price table constant when comparing token efficiency; use actual invoices or plan readings for billing questions.

| Record for both windows | Why it matters |
|---|---|
| Start and end timestamps, timezone, software versions | Makes the periods and tool behavior comparable. |
| Requests, token buckets, unknown models, missing records | Exposes changes in mix and holes in the counter. |
| Cache-write share, rewrites above 100K, subagent runs | Connects the change to a specific source of usage. |
| Completed tasks, regression results, rework | Prevents lower usage from being mistaken for better performance when less work was completed. |
| API estimate and plan readings in separate columns | Keeps a modeled price from becoming a billing claim. |

For a quick check of the article's price arithmetic, this dependency-free example makes no API calls:

```bash
python3 - <<'PY'
tokens = 500_000
read_usd = tokens * 0.20 / 1_000_000
write_usd = tokens * 8.00 / 1_000_000
print(f"Cache read: ${read_usd:.2f}")
print(f"One-hour write: ${write_usd:.2f}")
print(f"Price ratio: {write_usd / read_usd:.0f}x")
PY
```

Expected output is `$0.10`, `$4.00`, and `40x`. Those values validate only the arithmetic under the stated rates, not the private 471-session sample.

If you change a prompt or model to reduce usage, [regression-test the agent's behavior](/guides/regression-test-ai-agent-prompt-model-change) before accepting the result. If you delegate external work to another product, use the companion [Claude Code to Grok Bot webhook guide](/guides/claude-code-controls-grok-bot) to keep acceptance, completion, and retry decisions explicit.
