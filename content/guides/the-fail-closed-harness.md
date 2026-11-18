---
title: "The Fail-Closed Harness: Gate Agent Actions and Code Merges"
slug: the-fail-closed-harness
date: 2026-07-23
modified: 2026-11-17
reviewed: 2026-11-17
image: /assets/guides/fail-closed-harness/three-leg-refusal.webp
image_alt: "Untrusted input, sensitive access and consequential action converge on supervision or reliable validation in an agent harness."
category: Agent Engineering
description: "Build fail-closed gates for AI agent actions and code merges. Handle missing evidence, hook errors and reviewer failures without treating a matcher as a sandbox."
lead: "A consequential action needs affirmative evidence that its required checks passed. Missing evidence, a failed reviewer or an unevaluable policy must leave it blocked at the boundary that can actually execute it."
---

## How do you gate an agent action or code merge?

Define the required checks before the action, evaluate them outside the model, and let the execution or merge boundary proceed only after those checks succeed for the intended action and current revision. A missing result is not a passing result. Record the decision and test a known refusal alongside a legitimate action.

**Scope:** this guide separates declaration gates, command-text tripwires, tool-call controls and repository merge controls. A local hook does not establish that a remote merge is protected. The personal observations below are dated July 23 and August 2, 2026; they are not a claim about the current configuration of every agent session.

**Evidence:** inspect [failclosed's admission rules at revision `fda838c`](https://github.com/OrionArchitekton/failclosed/blob/fda838cd0102babd68ea1fce32230fc40911fe1b/README.md#what-failclosed-does) and its [pipeline regression cases](https://github.com/OrionArchitekton/failclosed/blob/fda838cd0102babd68ea1fce32230fc40911fe1b/test_run_review_pipeline.py). The latter stub GitHub interactions and replay reviewer output in a subprocess; they demonstrate the gate's decision logic, not a live repository's protection settings. Claude Code's [hook failure behavior](https://code.claude.com/docs/en/hooks#block-the-action-when-a-hook-fails) and GitHub's [required-check rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging) define separate enforcement boundaries.

## What happened in the original session?

While I was writing the original guide on July 23, 2026, my own harness kept refusing me.

The first refusal came when I tried to create a file. A gate intercepted the write and would not pass it until I had stated, on the record, what imported the file, what the blast radius was, what data it touched, and what the operator had actually asked for. I wrote those four facts. The retry went through. That happened on every new file the session touched, including the ones holding this guide's own research.

A second gate refused to let the session end. I had pushed a branch and wanted to stop; the stop was blocked until I either ran the review pipeline or stated in writing why this change did not need it. A third, quieter one flagged that I had hidden both output streams on a command whose result I was branching on, which collapses "the probe found nothing" and "the probe broke" into the same answer.

Not one of those is a wall. Every one is a speed bump that a deliberate, explicit action clears. That is the point, and it is where most guardrail writing goes wrong in both directions at once: it either promises a wall it cannot build, or it settles for a prompt the model can talk its way past.

**Who this is for:** engineers building or operating an agent harness who have read the concept pieces, named the guardrails box on the diagram, and now need the guardrails box to actually hold.

![Three agent capabilities, untrusted input, sensitive access, and consequential action, converge on a central supervision control, showing that a session holding all three requires supervision or reliable validation.](/assets/guides/fail-closed-harness/three-leg-refusal.webp "One session, three capabilities, with supervision at their convergence.")

---

Call it a fail-closed harness, and define it precisely, because the loose version of this idea is worse than useless:

> A fail-closed harness refuses a consequential action when a required policy check or authorization cannot be evaluated or satisfied. A non-match in a destructive-command filter is not proof that the command is safe.

That second sentence is the one people skip. Hold onto it.

"Harness engineering" is now its own discipline, and by mid-2026 it has owners. LangChain, [Mitchell Hashimoto](https://mitchellh.com/writing/my-ai-adoption-journey), Martin Fowler's team, and Lilian Weng have all staked out the term for the software wrapped around a model. The cleanest short definition comes from [LangChain's Vivek Trivedy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness):

> A harness is every piece of code, configuration, and execution logic that isn't the model itself.

Most of that writing races on capability: better tools, longer memory, smarter loops. The part almost everyone names and then skips is the guardrails. This guide is about that skipped part, and about one claim: the guardrails are not a feature you bolt on. They are a default you choose, once, and apply everywhere.

## What does fail closed actually mean for a harness?

On 2026-07-23, three separate gates interrupted a single writing session, and not one of them was a wall. Each blocked by default, said exactly what it needed, and cleared once I supplied it. Fail closed names that default: when a required check cannot be satisfied, stop rather than proceed.

The distinction that carries the whole guide is prompt versus property. A permission prompt is a request. It asks the model, or a tired operator, to say yes, and a model fed untrusted content can be steered into saying yes and can steer you into it too, because the same context that poisoned the plan writes the rationale for the prompt. Telling an agent to "only propose, never execute" is a request of the same kind: a sentence in a system prompt, and a sentence is not an interlock.

A property is enforced by something outside the model, and the model cannot redefine what counts as passing. That claim is narrower than it first sounds, and the opening shows why. The fact gate did clear after I wrote a paragraph, so a paragraph plainly changed the outcome. What the paragraph could not do was change the condition. The gate decided what had to be stated and when, and it recorded that a statement was made. It never verified that what I wrote was true.

That distinction splits guardrails into two kinds that are easy to confuse. A declaration gate forces something onto the record and proves only that it was recorded. An evidence gate independently validates the claim: a secret scan reads the diff itself, a test suite runs the code. Declaration gates buy deliberation and an audit trail, which is worth real money. They do not buy truth, and treating one as the other is its own failure mode. Our companion guide on [building infrastructure with an agent you can trust](/guides/agent-built-infrastructure-you-can-trust) makes the build-time version of this case; this guide makes the runtime version.

## When should the harness refuse?

On 2025-10-31, Meta drew the line as a rule: an agent session should satisfy at most two of three properties at once. The three are untrusted input, sensitive access, and consequential action, which is the shape of most real damage. Hold all three and you are one prompt injection from a bad outcome.

The discipline is to drop a leg before you act, or to require supervision when you cannot. Meta states [the three properties](https://ai.meta.com/blog/practical-ai-agent-security/) directly:

> agents must satisfy no more than two of the following three properties within a session: [A] An agent can process untrustworthy inputs; [B] An agent can have access to sensitive systems or private data; [C] An agent can change state or communicate externally.

Two days later Simon Willison [called it](https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/) the best practical advice for building secure LLM-powered agent systems today. His own earlier framing, [the lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) from June 2025, names the same three ingredients:

> The lethal trifecta of capabilities is: Access to your private data ... Exposure to untrusted content ... The ability to externally communicate in a way that could be used to steal your data

The two framings differ on one leg. Willison's trifecta draws its third capability narrowly, the ability to communicate data out; he says as much, that the trifecta "only covers the risk of data exfiltration." Meta's leg (C) is already wider, "change state or communicate externally," which on its face includes destruction with no exfiltration at all: a force-push that rewrites history, a `DROP TABLE`, a prune that deletes volumes. Nothing leaves the building. Something inside it is destroyed.

Two clarifications keep this from being read too simply. First, leg (B) is broad. A force-push against a repository that matters is already access to a sensitive system, so that example usually implicates (A), (B), and (C) together rather than being a clean two-leg case. (A) plus (C) is genuinely lower risk only when the target is disposable. Second, the rule does not say that any two of three is safe, and Willison pushed back on exactly that reading. Two legs means lower blast radius, not immunity. Three legs means you need supervision or a reliable validation step before the action, which is not always the same as refusing it outright.

![Meta's Rule of Two shown as three architectural pillars: untrusted input, sensitive access, and the wider third leg of changing state or communicating externally. Leg C branches into data leaving and state changing, while the closing line warns that two legs lower risk but do not certify safety.](/assets/guides/fail-closed-harness/rule-of-two-extended.webp "The Rule of Two, with leg C read at its word and two legs treated as lower risk rather than safe.")

## How do you make refusal a property and not a prompt?

On 2026-07-23 the gate that fired most often did something narrower than it sounds. It matched the shape of what I was about to do against a small rule set, before the action ran, and raised an explicit decision. It never judged whether the action was safe. It judged whether a rule matched, a different and much weaker question.

That distinction is not pedantry, it is the whole honest account. A matcher that finds no known destructive pattern has established exactly one thing: no known pattern matched. It has not established that the command is safe. So the right mental model is a tripwire, not a wall, and the right role is defense-in-depth: one cheap layer that catches the obvious cases loudly, sitting underneath real controls, never standing in for them.

Be concrete about what slips past. It matches command text before execution, which makes it a pre-command filter and not a sandbox. Shell expansion, an alias, `eval`, a sourced wrapper script, a `git` alias, or the same binary reached by another path can all carry a destructive action past a string match. Treat that list as the canary set and fire each one at the gate on a schedule. Where an action must actually be prevented rather than discouraged, enforcement belongs at the execution boundary, in the layer that runs the command, or better, in removing the capability from the session at all.

The failure mode is the other half. In [Claude Code's current hook reference](https://code.claude.com/docs/en/hooks#exit-code-output), a synchronous `PreToolUse` command hook can deny with exit 2 or valid decision JSON. An ordinary crash or timeout can be non-blocking, leaving the call to normal permissions. Valid JSON can also control the outcome despite another exit code, so inspect output as well as status. A `PostToolUse` hook runs after the action.

**November 17 update:** command and HTTP hooks support [`onFailure: "block"`](https://code.claude.com/docs/en/hooks#block-the-action-when-a-hook-fails), requiring Claude Code v2.1.295 or later. On `PreToolUse`, it blocks failures such as a missing script, timeout or invalid JSON. It has no effect on background command hooks or the documented stop/task-completion events; platform and Code Mode behavior also differ. Check the installed version and event. The July observation below describes that earlier setup, not an unavoidable limitation of current Claude Code.

Test the missing-script and timeout paths, a policy denial and a valid action in a disposable environment. Confirm protected state stayed unchanged; a hook-error notice alone proves no enforcement.

![Historical configuration: a command tripwire stops a known match for review, while an internal error continues. The original diagram labels blocking errors as the target.](/assets/guides/fail-closed-harness/gate-decision-flow.webp "Historical setup documented in this guide. Current versions can configure onFailure: block; the original diagram predates that option.")

Then there is the override, and here I will be exact rather than flattering. What cleared the block in the July setup was an environment variable the operator set. That is a weaker thing than it sounds: an environment variable is not authentication, it is not bound to the specific command, it is not single-use, and it leaves no audit trail by itself. Those four properties are what an override should have, and naming the gap is more useful than implying it is closed. An override the model can set for itself is the permission prompt again in a different hat.

## What changes at the code-merge boundary?

Make the repository enforce the decision. A local review command can produce a result; branch protection or a ruleset must require the appropriate check before the target branch changes. Review the bypass permissions too. GitHub's [required-status-check documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging) accepts `successful`, `skipped` and `neutral` conclusions, so a required check alone does not prove the underlying evaluator ran. Your policy gate must distinguish a completed evaluation from a skipped or missing one.

The [failclosed project](/works/failclosed/) makes that distinction explicit. At the [pinned source revision](https://github.com/OrionArchitekton/failclosed/blob/fda838cd0102babd68ea1fce32230fc40911fe1b/README.md#status-codes), `MERGE_READY` requires successful required phases and approving reviews. A reviewer crash, skipped required phase or unparseable result refuses that status. Wiring that result into an enforced repository check remains an integration responsibility; printing `MERGE_READY` does not itself lock a branch.

For review, keep one clean case, one known finding and one evaluator failure. Bind the evidence to the revision being merged. After a new commit, obtain fresh evidence. The [missing-review scenario on Proof](/proof?scenario=failclosed-drift#gate-simulator) illustrates the decision in the browser. It does not query or change GitHub protection.

If the question is whether a prompt or model change preserved agent behavior, start with the [Proctor regression-testing guide](/guides/regression-test-ai-agent-prompt-model-change). Its contract checks supply evidence; the merge or action gate decides whether the consequential step may proceed.

## What happens when the gate itself dies?

The gate that fired repeatedly on 2026-07-23 is documented, in its own rules file, as fail-open by construction. That is not a flaw someone hid. It is a deliberate trade, chosen so normal work is never blocked, and it is the single most important sentence to read about any control you are relying on.

A healthy-looking control and a silently dead one are indistinguishable from the outside, and that is a general trap. I made the build-time version of the case in the [infrastructure guide](/guides/agent-built-infrastructure-you-can-trust): a control that is "armed and green" is making a claim about its own status, not about whether it does its job. The runtime version is sharper, because the thing failing open is the safety layer itself. Green has two causes, and watching cannot tell them apart.

You tell them apart by firing the control. A canary is a known violation you send through on purpose, on a schedule, to confirm the gate still catches it. It is the difference between installing a smoke detector and pressing its test button, and it is the single most skipped step in every safety layer I have built.

Be precise about what a fired canary buys, though, because it is less than the phrase suggests. Armed-and-green proves nothing. Fired-and-caught proves that one path bound, at one moment. It says nothing about the path you did not exercise. So rotate the canaries: send a plainly known-bad command, then send the same intent dressed up in an alias or an `eval`, then force the control's own error path. Those three fail independently, and only the first is usually tested. A gate proven in June and quietly broken in July is worth exactly nothing in August.

## Is anything in here actually a wall?

Everything above is about gates that ask. It is fair to read all of it and conclude that the
harness never really prevents anything, only slows it down. So on 2026-08-02 I fired both
kinds at the same target, minutes apart, and watched what each one did.

The ask first. An ordinary recursive delete on a scratch directory tripped the
destructive-command matcher, which graded it and stopped:

```text
[rule-of-two] HOLD, destructive state-change detected. Ask-with-override, not a hard block.
graded: tier=CONFIRM score=65/100 (thresholds review=35 confirm=60 block=85)
triggered by: floor:rm with recursive+force
To proceed intentionally, rerun the exact command with the override env var:
  RULE_OF_TWO_OK=1 <your command>
```

That is the gate this guide already described honestly. It hands the decision back, and it
tells you how to proceed anyway.

Now the other kind. In a fresh scratch repository holding zero commits, I ran a real commit
whose message carried a long dash, which the estate bans from anything public:

```sh
git commit -m "feat: add the reuse layer <U+2014> it checks B2 before generating"
```

The `<U+2014>` above stands for the literal em dash. It cannot appear on this page,
because the rule being demonstrated governs this page too, and a guard now enforces
that across every published guide. Writing the codepoint instead of the character is
the same move the demonstration itself needed, one paragraph later.

It was refused, and the refusal offered no override:

```text
Banned long dash in a publish/PR/commit command. Em (U+2014), en (U+2013), and
horizontal-bar (U+2015) dashes are not allowed in public-facing content ...
Policy: ~/.claude/rules/no-em-dashes.md
```

Then the half that actually matters, because a refusal message proves nothing on its own.
Afterward the repository still held zero commits and zero reflog entries, and the file was
still sitting in the index, never written to history. The protected property survived the
attempt. That is the claim worth making, rather than the harness having merely complained.

One more step, and it is load-bearing. A gate that blocks everything is useless rather than
safe, and from outside the two are indistinguishable. So I sent the same commit again with
the dash replaced by a comma, and it went straight through:

```sh
git commit -m "feat: add the reuse layer, it checks B2 before generating"
```

Blocked the violation, passed the legitimate variant, left the protected state untouched.
That is a wall, and it is the only thing in this guide I am willing to call one.

Be careful what it generalizes to, because it is narrower than it looks. Of 78 hooks on disk
that day, 13 carried a deny signal at all. One of the strongest-looking candidates, a
config-protection gate, is excluded from this demonstration entirely because it is fail-open
by construction and disarmed by default, even though its arm marker happened to be present.

And the gate that did hold inspects command text, which has a consequence I hit while writing
this section: the hook blocked my own attempt to paste the offending commit into this guide,
then let the same text through when I built the character from its codepoint instead. That is
not a defeat of the control, it is the control's documented boundary. A dash living in a file
passed by reference, `git commit -F` or a PR body file, is outside what a command matcher can
see, and that path is guarded by operator habit rather than by the hook.

So the honest summary is not that the harness prevents things. It is that this harness holds
at least one path that prevents and at least one that only asks, and that the two are told
apart by firing them, never by reading their descriptions.

## Does fail-closed scale, and what does it cost?

On 2026-07-23 four control types touched one session: a first-touch fact gate, a pre-commit secret scan, a stop gate that blocked the session from ending, and a destructive-command matcher. Three of them hold until a check is satisfied. The fourth is fail-open by construction, and conflating the two is how a stack gets oversold.

The principle composes precisely because each control is dumb on its own. Each answers one question and none of them needs to understand the others, so there is no central judgment to poison. Be careful with that claim though, because it is about logic and not about failure. They share a runner and a configuration file. Corrupt the config or disable the dispatcher and every one of them stops at once, quietly, which is the common-mode failure the neat stack diagram hides.

The stack is not uniform either, and the honest inventory matters more than the count: three required gates that hold, plus one advisory tripwire that raises a decision and can be cleared. A pile of tripwires is not a sandbox, and calling it one is how teams end up surprised.

Fail-closed has a cost, and pretending otherwise is how you end up switching it off. A matcher keyed on command shapes will sometimes stop something harmless that merely looks dangerous: a chained one-liner with the word reset in a filename, a script whose name contains prune. False positives are real and annoying. Narrowing the pattern is often exactly right, and it can drop a specific false positive while keeping every true one, so the crude warning that tuning always costs coverage is wrong. What makes tuning safe is not judgment, it is a regression set: keep a fixture of commands that must still trip the matcher, and run it after every change. Tuning without that fixture is how a matcher quietly drifts toward matching nothing. Scope it to shapes that are actually irreversible, and give it a fast, trusted way to proceed. Fail-closed on everything and people route around you. Fail-closed on the irreversible and they thank you.

There is a market reason this matters, not only a safety one. The labs are bundling their own harnesses, Claude Code and Codex ship with the model, and third-party harnesses like LangChain's Deep Agents and Pydantic AI's Harness are racing them on capability. [LangChain showed](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) how much capability lives in the harness rather than the weights: tuning only the harness moved their coding agent 13.7 points, from 52.8 to 66.5 on Terminal Bench 2.0, with the model held fixed. [Boris Cherny](https://x.com/bcherny/status/2007179832300581177), who built Claude Code, makes the capability case in one line, that giving an agent a way to verify its work "will 2-3x the quality of the final result." The safety case is the same move pointed the other way: check before a consequential action, and refuse while the check is unsatisfied. I have not seen that lane claimed yet.

![Three required gates, first-touch declaration, secret scan, and stop plus review, share a default-refuse enforcement spine. A destructive-command matcher sits outside that spine as a separate tripwire that asks on a known match but fails open on an internal error.](/assets/guides/fail-closed-harness/layered-enforcement-stack.webp "Three required gates and one advisory tripwire, separated by role and default.")

## What are you actually shipping when you ship a harness?

The capability is what gets demoed. The default is what saves you at 2 a.m. when a poisoned page has talked your agent into something it should never do. Capability is the model plus the tools. Safety is the harness deciding, before the fact and without the model's permission, what happens when a required check cannot be satisfied.

Fail closed. Prove the control fires by firing it. Say plainly which layers are tripwires and which actually enforce, because the gap between those two is where every unpleasant surprise lives. And pay the friction on purpose, on the irreversible actions and nowhere else.

Three companion guides go deeper on the pieces: [why agent-written code needs layered review](/guides/why-agent-code-needs-layered-review), the [governed double-send-safe delivery pipeline](/guides/governed-double-send-safe-delivery), and a [self-correcting verifier that learns to abstain](/guides/verifier-abstention-not-refutation). For the wider map of what a harness even is, Paul Iusztin's [overview of the parts of a harness](https://read.technically.dev/p/whats-harness-engineering) is a good conceptual starting point; this guide is the guardrails part of that map, built out into something that holds. The rest of the map, the tools, the memory, the loop, is where the demos live. The guardrails are where the trust does.
