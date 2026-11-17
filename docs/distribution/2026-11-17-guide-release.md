# Technical guide release and measurement package

Prepared November 17, 2026. Owner: Dan Mercede.

**Status: publication drafts.** Use this package after the PR is merged and the three production pages have been verified. This file does not record a publication, newsletter send, analytics configuration, or a completed deployment. No external channel was changed while preparing it.

## Release objective

Help a reader find one concrete answer, reproduce a useful result, and choose a relevant next step. The first release pairs the existing Claude Code traffic signal with an agent regression-testing walkthrough. The conversation-graph reference is the next release.

| Page | Exact canonical URL | Reader's problem | Main next step |
|---|---|---|---|
| Claude Code usage | https://www.danmercede.com/guides/where-claude-code-usage-goes | Why can high cache reuse still carry substantial modeled token cost? | Measure a local baseline and compare completed work, not only token volume. |
| Claude Code / Grok Bot | https://www.danmercede.com/guides/claude-code-controls-grok-bot | How can a coding agent delegate through a webhook and recover an ambiguous send? | Run the pinned public protocol tests before configuring an account. |
| Agent regression testing | https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change | How can I catch a behavior regression after changing a prompt or model? | Run the small invoice fixture, then reproduce the pinned Proctor demo. |

The canonical URLs stay untagged in page metadata and editorial citations. The campaign links below are inbound distribution links.

## Release record to fill after verification

| Evidence | Current state | Owner |
|---|---|---|
| Merged commit and PR URL | Not recorded in this package | Dan / release operator |
| Production deployment URL and commit | Not recorded in this package | Release operator |
| Production verification timestamp, with timezone | Not recorded in this package | Release operator |
| Three pages return the expected article and canonical | To verify on production | Release operator |
| Article images, section links, examples, and next-step links work | To verify on production | Release operator |
| GA4 receives the new event with the intended parameters | Not verified against the live property | Analytics operator |
| Publication URL and timestamp for each channel | To record when actually published | Dan |

A merged commit is source state. A production page showing that commit's content is deployment evidence. A captured event in the selected GA4 property is collection evidence. Record each separately.

## Tagged links

Use lowercase, consistent parameters:

- `utm_campaign=technical-guides-2026-11`
- `utm_content=<full guide slug>`
- Regular LinkedIn posts: `linkedin / social`
- YouTube descriptions: `youtube / video`
- GitHub README links: `github / referral`
- Fail-Closed Notes: `newsletter / social` for its current LinkedIn newsletter placement

The `newsletter` source is a deliberate placement label so newsletter traffic can be separated from ordinary LinkedIn posts. The `social` medium reflects that this newsletter is currently hosted on LinkedIn. Use `newsletter / email` only for an actual email distribution; this package does not assume an email list or an email send.

The site's evergreen share buttons use `utm_campaign=technical-guides`. This release kit uses the dated campaign above. Keep the two campaign rows separate in reporting. Do not add UTMs to internal site navigation; `guide_next_step` records that intent.

| Placement | Copyable link | Source | Medium |
|---|---|---|---|
| linkedin | [usage](https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=linkedin&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes) | `linkedin` | `social` |
| linkedin | [bridge](https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=linkedin&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot) | `linkedin` | `social` |
| linkedin | [regression](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=linkedin&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change) | `linkedin` | `social` |
| youtube | [usage](https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=youtube&utm_medium=video&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes) | `youtube` | `video` |
| youtube | [bridge](https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=youtube&utm_medium=video&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot) | `youtube` | `video` |
| youtube | [regression](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=youtube&utm_medium=video&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change) | `youtube` | `video` |
| github | [usage](https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=github&utm_medium=referral&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes) | `github` | `referral` |
| github | [bridge](https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=github&utm_medium=referral&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot) | `github` | `referral` |
| github | [regression](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=github&utm_medium=referral&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change) | `github` | `referral` |
| newsletter | [usage](https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=newsletter&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes) | `newsletter` | `social` |
| newsletter | [bridge](https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=newsletter&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot) | `newsletter` | `social` |
| newsletter | [regression](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=newsletter&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change) | `newsletter` | `social` |

Google documents how [campaign parameters populate acquisition reporting](https://support.google.com/analytics/answer/10917952). The names above are this release's convention, not a claim that reporting has already been configured.

## Three LinkedIn drafts

Publish each as its own post when the linked page is live. Use the relevant article figure if the posting workflow supports an image. Do not substitute a generic homepage link.

### Draft 1: Claude Code usage

My Claude Code logs looked healthy: roughly 97% of tokens came from cache reads.

The price-weighted view told a different story. In the seven-day sample I analyzed on October 23, cache writes were about 3% of tokens and 38% of API list-price cost.

That is not my subscription bill, and it does not explain anyone else's usage limit. It is a reason to measure the token buckets before changing your workflow.

I've refreshed the guide with the measurement scope, the local Python counter, and a comparison checklist that keeps completed work and regression quality beside usage.

https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=linkedin&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes

### Draft 2: Claude Code to Grok Bot

A webhook returning 200 tells you the task was accepted. It does not tell you the work finished.

My Claude Code to Grok Bot bridge keeps three outcomes separate: accepted, refused, and unknown. If the response is lost, the sender preserves the request ID for collection instead of quietly sending the same work again.

The updated guide includes the outbox return path, the local-execution trade-off, and a pinned Python test suite you can run without a Grok Bot account. Those tests validate the bridge's protocol; they do not certify the live service.

https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=linkedin&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot

### Draft 3: Agent regression testing

An invoice extractor can return valid-looking JSON and still report the wrong total.

In this example, the line items are 100 and 50. The changed extractor reports 100. Every required field is present; the sum invariant catches the regression.

The new guide starts with a small Node example and then reproduces the same failure with Proctor. Keep the inputs and behavior contract fixed while changing the prompt or model. Check what must remain true, not whether the wording stayed identical.

The walkthrough uses synthetic outputs. It demonstrates the check and review path, not a live model accuracy score.

https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=linkedin&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change

## YouTube description snippets

Add only to an existing video whose topic matches, or to a new demonstration after it is recorded and reviewed. These snippets do not claim that a video has been created or changed.

### Usage video

```text
Companion guide: Claude Code cache reads, cache writes, and subagent usage.
Includes the original 471-session analysis, a local counter, and a way to compare changes without losing work quality. API list-price estimates are separate from subscription billing.
https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=youtube&utm_medium=video&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes
```

### Grok Bot handoff video

```text
Setup, code, and failure cases for handing work from Claude Code to Grok Bot:
https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=youtube&utm_medium=video&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot

The guide separates webhook acceptance from the returned result, explains unknown sends, and links the pinned local protocol tests. Review the local-execution permission before configuring the outbox.
```

### Proctor demo video

```text
Reproduce the invoice regression and inspect the behavior contract:
https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=youtube&utm_medium=video&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change

The guide includes a dependency-free Node teaching example and the pinned Proctor keyless walkthrough. The inputs are synthetic; the result is not a live model accuracy benchmark.
```

## GitHub README snippets

These are proposed edits for the named repositories, not changes made by this PR. The repository owner should choose an existing documentation or examples section and preserve the README's install instructions.

### OrionArchitekton/orion-skills: Grok Bot documentation link

Suggested destination: `README.md`, beside the Grok Bot skill entry.

```markdown
### Claude Code to Grok Bot walkthrough

[Connect Claude Code to Grok Bot through a routine webhook](https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=github&utm_medium=referral&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot). The guide covers request IDs, outbox collection, unknown-send handling, and the local-execution permission, with a pinned protocol-test command.
```

### OrionArchitekton/mcp-context-budget: broader usage-analysis link

Suggested destination: `README.md`, in related reading. This is a companion article about broader Claude Code usage; it does not claim that mcp-context-budget reconstructs subscription billing or measures all session costs.

```markdown
### Related reading

[Measure Claude Code cache reads, cache writes, and subagent usage](https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=github&utm_medium=referral&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes). This local-log case study shows why token share and modeled API-price share differ, and how to compare usage changes alongside completed work.
```

### OrionArchitekton/proctor: reproducible guide link

Suggested destination: `README.md`, after the existing quickstart or demo instructions.

```markdown
### Reproducible walkthrough

[Regression-test an AI agent after a prompt or model change](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=github&utm_medium=referral&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change). Start with a small invoice fixture, then reproduce Proctor's keyless contract check against a pinned commit. The guide distinguishes a detected regression, a review decision, and the separate enforcement needed for a merge gate.
```

## Quiet newsletter copy

For the next appropriate Fail-Closed Notes edition on LinkedIn, after the pages are live:

> Three practical references for the next time you change an agent workflow:
>
> [Measure Claude Code's cache and subagent usage](https://www.danmercede.com/guides/where-claude-code-usage-goes?utm_source=newsletter&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=where-claude-code-usage-goes), [make a webhook handoff's unknown state explicit](https://www.danmercede.com/guides/claude-code-controls-grok-bot?utm_source=newsletter&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=claude-code-controls-grok-bot), or [regression-test behavior after a prompt or model change](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change?utm_source=newsletter&utm_medium=social&utm_campaign=technical-guides-2026-11&utm_content=regression-test-ai-agent-prompt-model-change).
>
> Each page states what was measured or reproduced and what remains outside the example. Start with the problem you have today.

Optional closing line for a guide-related post: Follow Fail-Closed Notes for more working examples of agent reliability and workflow ownership.

Newsletter destination: https://www.linkedin.com/newsletters/fail-closed-notes-7477834312608866304

## Next release: conversation branches and Neo4j

Target reference URL:

https://www.danmercede.com/thoughts/2026-09-30-the-knowledge-graph-my-agents-stopped-asking

Prepare the graph article's release around one clear problem: preserving alternative branches without flattening them into a transcript that implies the wrong ancestry. Keep the existing measurement window, counted objects, method, and limitations adjacent to any aggregate result. Include the small publishable branch example and an annotated diagram only when their behavior and source are verified. Keep the financial-services and healthcare pages labeled as illustrative reference architectures.

### Backlink request draft

Recipient: the verified Neo4j talk or recap page owner. Resolve the person and channel before sending. No request has been sent.

Subject: Companion reference for my conversation-graph talk

Hi,

I have a companion write-up on preserving conversation branches and making the graph's structure useful to an agent:

https://www.danmercede.com/thoughts/2026-09-30-the-knowledge-graph-my-agents-stopped-asking

If there is a talk or recap page for my session, would this be useful as a companion reference? Linking directly to the article would let readers inspect the explanation and its evidence without navigating through a profile first.

Thanks,
Dan

Use the canonical URL for an editorial backlink. Do not represent this draft as an earned link or a committed Neo4j page update.

## Measurement baseline

The user supplied the following October 17 to November 13, 2026, 28-day report. These figures were **not independently re-queried or verified while preparing this package**. The report is a historical reference; retain that attribution until a property export is available.

| Measure | User-supplied value | Interpretation |
|---|---:|---|
| GA4 sessions | 329 | Sitewide sessions reported for that window; not guide-only or engaged-session counts. |
| Google Search impressions | 332 | Search impressions reported for that window. |
| Google Search clicks | 4 | Search clicks reported for that window; a non-branded split was not supplied. |
| Clicks to the Claude Code / Grok Bot guide | 2 | Page-level traffic signal from the supplied report. |
| Detected AI-assistant referral sessions | 0 | No trackable sessions detected by that report's method; not evidence of zero citations. |
| AI-answer citations | Unmeasured | Establish a citation baseline separately. |

The user also supplied search spot checks. Treat those as dated observations of the results reviewed, not a complete index-coverage test or a universal ranking claim.

## After deployment: one comparable 28-day window

Start the post-release window on the **first full calendar day after confirmed production deployment**. Record the chosen timezone and use 28 complete days. Also export the immediately preceding 28 complete days with the same filters where available. Keep the original October 17 to November 13 report as a historical reference, not a substitute for a missing pre-release export.

Keep Google Search Console and GA4 in separate tables, with each property's reporting timezone and export settings recorded. Do not force totals to agree: they measure different stages and may have different date boundaries. An observational before/after comparison cannot isolate the release from posting volume, search changes, or workload seasonality.

### Search discovery

In Search Console, compare clicks and impressions for the three exact canonical landing pages, then inspect their query rows. Use the same search type, date length, device/country filters, and branded-query definition for both windows. [Search Console's performance report](https://support.google.com/webmasters/answer/7576553) provides page, query, and date groupings.

Define branded queries before exporting. At minimum, separate Dan's name, its spelling variants, the domain, OrionArchitekton, and portfolio names. Review product-name queries such as Proctor separately: they can be navigational, and the word can also be generic. Report generic non-branded discovery separately from person/portfolio and product discovery. Preserve the exact exclusion rule and any manual classifications in the export notes.

Track these page/query pairs as a starting set, without assuming rankings:

| Page | Query family |
|---|---|
| Usage | Claude Code cache usage; cache writes vs cache reads; Claude Code subagent cost |
| Handoff | Claude Code Grok Bot webhook; Grok Bot webhook results; webhook timeout duplicate runs |
| Regression | AI agent regression testing; test agent after model change; behavior contracts for AI agents |

Report raw counts before percentages. Four sitewide baseline clicks are too few for a strong causal growth claim. Zero observed rows, missing query data, and unavailable exports must remain distinct.

### Landing sessions and continuation

In GA4, use the three guide landing paths and session source/medium. Record sessions and engaged sessions, then separate this release's `technical-guides-2026-11` campaign from evergreen `technical-guides` shares. Preserve unknown or unassigned rows rather than relabeling them as direct evidence of a channel.

The new site event is `guide_next_step`. It records a click on an instrumented next-step destination with these parameters:

| Parameter | Meaning | Reporting setup |
|---|---|---|
| `guide_slug` | Guide where the next-step click occurred | Event-scoped custom dimension |
| `destination_kind` | One of `guide`, `project`, `newsletter`, `contact`, `example`, `proof` | Event-scoped custom dimension |
| `destination_path` | Normalized destination path or defined marker, such as `/newsletter` | Event-scoped custom dimension |

**Operator action:** check whether these event-scoped dimensions already exist in the intended GA4 property; create missing definitions, then verify the event and parameters with a controlled production click. The PR does not configure the GA4 property. [Google's custom-dimension documentation](https://support.google.com/analytics/answer/14240153) explains how event parameters become reportable dimensions.

Interpretation rules:

- `project` means a project-link click, not an installation or a paying customer.
- `newsletter` means an outbound click toward the newsletter, not a completed subscription.
- `contact` means a contact-path click, not an inquiry sent.
- `example` means an example-link click, not a successful local execution.
- `proof` means an illustrative-demo link click, not a completed test or live enforcement.
- The event covers the marked links in “Put this guide to work.” Global navigation, footer and inline article links are outside that measurement.

Show event counts and distinct sessions separately. If reporting a continuation rate, use distinct eligible landing sessions with at least one qualifying next-step event divided by eligible landing sessions. Do not divide repeated click events by sessions and label the result a conversion rate. Confirm subscriptions, inquiries, installs, or paid work from their own systems before reporting them as outcomes.

No live GA4 delivery or custom-dimension setup was verified while preparing this file.

## Citation baseline and register

`citation-register.csv` starts with a header only. It deliberately contains no invented observations.

| Field | Record |
|---|---|
| `observed_at` | Exact observation timestamp with timezone, preferably ISO 8601 |
| `engine` | Product and mode used; include a visible model/version in notes if known |
| `query` | The exact query or prompt, without silently rewriting it between checks |
| `cited_url` | The actual linked source URL in the answer; leave empty when no site citation was observed |
| `answer_url_or_capture` | Shareable answer URL or a saved capture that actually exists |
| `referral_utm_source` | Observed referral campaign source, if known; otherwise blank |
| `evidence_path` | Location of the saved export/capture supporting the observation |
| `notes` | Result scope, position/context, locale, signed-in state where relevant, missing data, and limitations |

Run the same small query set once before broad distribution and at a consistent weekly interval afterward. Add the three query families above plus the graph question, "How do I preserve conversation branches in Neo4j without flattening alternatives?" Record the exact engine and scope of each check. An absent citation in one answer means only that no citation was observed in that captured answer.

Keep three measurements distinct:

| Observation | What it supports | What it does not establish |
|---|---|---|
| Search-result snapshot | The URL appeared, or did not appear, in the reviewed result set for that query and context. | Overall indexing, a universal rank, or whether an AI answer cited the page. |
| AI answer with a linked citation | That captured answer linked the specific URL. | A reader clicked it, or that the citation recurs for other users or prompts. |
| Attributed landing session | The tracking setup received a visit with a recorded source. | That the visit followed a citation rather than a shared link or another route. |

Use provider citation reports when actually available to the operator, and record their date coverage and definitions. Do not claim that a Search Console generative-AI report is available or configured. A `chatgpt.com` referral or tag is a visit signal; it is not a substitute for capturing the cited URL and query. Do not join a specific citation to a specific session without evidence that supports that attribution.

## Review decisions after 28 days

| Finding | Next action |
|---|---|
| Non-branded impressions appear but clicks remain low | Review the actual query intent and the page's title/description against that intent. |
| Tagged visits arrive but few engaged landing sessions follow | Check that the post's promise matches the opening answer and that the page loads and reads well. |
| Readers engage but rarely continue | Inspect whether the related read, example, and project are the right next steps for that guide. |
| Citations appear without trackable visits | Retain the citation evidence; do not manufacture an attribution or conclude the citation has no value. |
| Guide continuation and verified inquiries increase | Keep the successful source/page pairing and inspect the inquiry quality before expanding effort. |
| Data remains sparse or incomplete | Extend observation and fix collection gaps; report counts and uncertainty instead of an invented lift. |

Record a decision, its evidence, and the owner for the next change. This package creates no automatic posting, outreach, recurring task, or production mutation.
