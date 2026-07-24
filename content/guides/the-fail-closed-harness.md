---
title: "The Fail-Closed Harness: Why a Safe Agent's Default Is Refusal"
slug: the-fail-closed-harness
date: 2026-07-23
category: Agent Engineering
description: "The safety of an agent harness is not the list of things it can do. It is what the harness does by default when it cannot verify that the next action is safe. This guide builds the guardrails half of harness engineering that most write-ups name and skip: a fail-closed default, a trajectory model for when to refuse (the lethal trifecta and Meta's Rule of Two), and a deterministic gate that enforces the state-change leg instead of merely naming it."
lead: "One session, three capabilities at once: untrusted input in scope, a live credential in reach, and a destructive command queued. A safe harness is the thing that stops there. Mine did, before it asked the model's opinion, and that stop is the whole safety story."
---

On a 2026-07 run, one session was holding all three at once. It had untrusted text in scope, pulled from a web page it was asked to summarize. It had reach into a production system, because the same task carried a live credential. And it had a destructive command queued: a history-rewriting force-push that a plan three steps back had made look reasonable. None of the three is alarming alone. Together they are the exact shape of an agent that quietly does real damage.

The command never ran. A gate sitting in front of the shell matched the destructive shape, refused by default, and raised the decision to a human. The model had already written a confident paragraph explaining why the push was fine. The gate did not read the paragraph. That is the whole point.

**Who this is for:** engineers building or operating an agent harness who have read the concept pieces, named the guardrails box on the diagram, and now need the guardrails box to actually hold.

![Three capabilities converging inside one agent session: untrusted input, access to secrets or a production system, and a destructive or external action. When all three are present at once, a safe harness refuses by default and escalates the decision to a human.](/assets/guides/fail-closed-harness/three-leg-refusal.webp "The three-leg convergence: untrusted input, sensitive access, and a consequential action in one session.")

---

Call it a fail-closed harness: one whose defining property is what it does when it cannot verify that the next action is safe. Not what it can do. What it refuses to do.

"Harness engineering" is now its own discipline, and by mid-2026 it has owners. LangChain, [Mitchell Hashimoto](https://mitchellh.com/writing/my-ai-adoption-journey), Martin Fowler's team, and Lilian Weng have all staked out the term for the software wrapped around a model. The cleanest short definition comes from [LangChain's Vivek Trivedy](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness):

> A harness is every piece of code, configuration, and execution logic that isn't the model itself.

Most of that writing races on capability: better tools, longer memory, smarter loops. The part almost everyone names and then skips is the guardrails. This guide is about that skipped part, and about one claim: the guardrails are not a feature you bolt on. They are a default you choose, once, and enforce everywhere.

## What does fail closed actually mean for a harness?

In a 2026-07 run holding untrusted input, a live credential, and a queued force-push, a permission prompt would have cleared in under a second. The model had already justified the action to itself, and a justification is exactly what a prompt asks a human to skim and accept. Fail closed is the opposite default: cannot verify, do not proceed.

The distinction that carries the whole guide is prompt versus property. A permission prompt is a request. It asks the model, or a tired operator, to say yes, and a model fed untrusted content can be steered into saying yes and can steer you into it too, because the same context that poisoned the plan writes the rationale for the prompt. Telling an agent to "only propose, never execute" is a request of the same kind: a sentence in a system prompt, and a sentence is not an interlock.

A property is enforced by something outside the model that the model cannot argue with. The command runs or it does not, and no paragraph of justification changes the outcome. Our companion guide on [building infrastructure with an agent you can trust](/guides/agent-built-infrastructure-you-can-trust) makes the build-time version of this case. This guide makes the runtime version, and the mechanism is the difference: not a better instruction, but a gate that lives outside the model and decides for it.

## When should the harness refuse?

On 2025-10-31, Meta drew the line as a rule: an agent session should satisfy at most two of three properties at once. The three are untrusted input, sensitive access, and consequential action, the shape of the opening story. Hold all three and you are one prompt injection from real harm.

The discipline is to drop a leg before you act, or gate the action when you cannot. Meta states [the three properties](https://ai.meta.com/blog/practical-ai-agent-security/) directly:

> agents must satisfy no more than two of the following three properties within a session: [A] An agent can process untrustworthy inputs; [B] An agent can have access to sensitive systems or private data; [C] An agent can change state or communicate externally.

Two days later Simon Willison [called it](https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/) the best practical advice for building secure LLM-powered agent systems today. His own earlier framing, [the lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) from June 2025, names the same three ingredients:

> The lethal trifecta of capabilities is: Access to your private data ... Exposure to untrusted content ... The ability to externally communicate in a way that could be used to steal your data

The two framings differ on one leg, and the difference is the whole game. Willison's trifecta draws its third capability narrowly, the ability to communicate data out; he says as much, that the trifecta "only covers the risk of data exfiltration." Meta's rule already draws leg (C) wider, "change state or communicate externally," which on its face includes destruction with no exfiltration at all. The fail-closed harness takes that wider leg at its word and enforces it: a force-push that rewrites history, a `DROP TABLE`, a prune that deletes volumes. Nothing leaves the building. Something inside it is destroyed.

That reading is a real extension of the trifecta and a literal reading of Meta, and it is the correction Willison himself raised. He pushed back on the idea that any two of three is automatically safe, because an agent with untrusted input and the ability to act, legs (A) and (C) with no sensitive data at all, can still do damage. Widening the destructive leg is what makes the rule bind on the commands that ruin your afternoon.

![The Rule of Two as three legs, with leg C widened. Leg A is untrusted input, leg B is sensitive or production access, leg C is any consequential output, redrawn to include destructive or irreversible state-change and not only external communication. Holding all three legs at once is the refuse-by-default condition.](/assets/guides/fail-closed-harness/rule-of-two-extended.webp "Meta's Rule of Two with leg C read at its word: destructive state-change, not only exfiltration.")

## How do you make refusal a property and not a prompt?

Since 2026-06, a deterministic gate has fronted every shell call in my harness, matching each command against a small set of destructive shapes in a few milliseconds. It does not ask the model to behave. On a match, it stops and raises an explicit decision with an override, rather than trusting the model's read of its own plan.

The subtlety that separates a real gate from a decorative one is its failure mode. A gate is fail-closed only if the gate breaking is itself a block. In Claude Code, only a [`PreToolUse` hook](https://docs.claude.com/en/docs/claude-code/hooks) can stop a call: exit code 2 blocks it and hands the message back to the model, while any other exit, including an unhandled crash, lets it through. A `PostToolUse` hook runs after the action and cannot undo it. So a gate that throws on an input it did not anticipate does not fail safe. It fails open, silently, on exactly the weird input most likely to be an attack. The rule that came out of watching a pre-push check do this is blunt: write the gate so its own error path exits blocking, and test the error path, not just the happy path.

Be honest about what this kind of gate is. It matches command text before execution, which makes it a pre-command filter and not a sandbox. Shell expansion, an alias, `eval`, a sourced wrapper script, a `git` alias, or the same binary reached by another path can all carry a destructive action past a string match. Treat that list as the canary set and fire each one at the gate on a schedule. Where an action must be stopped rather than discouraged, the enforcement belongs at the execution boundary, in the layer that actually runs the command, not in a matcher reading its text.

The override is the other half, and it has to be a different kind of thing from the prompt it replaces. Fail-closed is not a wall; it is a speed bump with a human on the far side. Normal work is never touched, because the gate only recognizes destructive shapes. When it does fire, the clearing action has to sit outside the model's reach: authenticated, bound to that exact normalized command and session, single-use rather than replayable, and written to an audit trail. An override a model can issue for itself is the permission prompt again in a different hat. That asymmetry, invisible to safe commands and loud on dangerous ones, is what keeps people from ripping the gate out. Our guide on a [governed, double-send-safe delivery pipeline](/guides/governed-double-send-safe-delivery) builds the same pattern for outbound messages: the send is a fail-closed transaction, and a lease plus a reaper decides what happens when a step dies mid-flight.

![A decision flow for the destructive-action gate. A command enters, the gate checks it against known destructive shapes, a safe command passes straight through, a destructive command raises an explicit ask with a one-step override, and any internal error in the gate itself exits on the blocking path rather than allowing the command.](/assets/guides/fail-closed-harness/gate-decision-flow.webp "The gate's decision flow, including the error path that fails closed.")

## What happens when the gate itself dies?

In 2026-07 the failure I had underweighted turned out to be the gate itself. A pre-tool gate is code, and code has a failure mode: throw on an unexpected input, exit on a path that is not the blocking one, and the command it was built to stop goes straight through. No error you notice. It has quietly stopped gating.

A healthy-looking control and a silently dead one are indistinguishable from the outside, and that is a general trap, not a new one. I made the build-time version of the case in the [infrastructure guide](/guides/agent-built-infrastructure-you-can-trust): a control that is "armed and green" is making a claim about its own status, not about whether it does its job. The runtime version is sharper, because the thing failing open here is the safety gate. The same month, a recorder meant to capture the lessons from every run died quietly and stayed green while it captured nothing; a day of captured lessons was gone before anyone noticed, because green has two causes and you cannot tell them apart by watching.

You tell them apart by firing the control. A canary is a known violation you send through on purpose, on a schedule, to confirm the gate still blocks it. Armed-and-green proves nothing; fired-and-caught proves the gate binds. It is the difference between installing a smoke detector and pressing its test button, and it is the single most skipped step in every safety layer I have built. A gate proven in June and silently broken in July is worth exactly nothing in August.

## Does fail-closed scale, and what does it cost?

By 2026-07 my harness runs four gate types under one default: a permission layer, a secret redactor that fails closed on an unreadable input, a destructive-action gate, and a review pipeline that can block a merge. They share no code and one rule: refuse when you cannot verify.

The principle composes precisely because each gate is dumb on its own, so there is no central brain to poison, only a stack of narrow interlocks that each answer one yes-or-no question and default to no.

Fail-closed has a cost, and pretending it does not is how you end up switching it off. A destructive-action gate that matches command shapes will sometimes stop a safe command that merely looks dangerous: a chained one-liner with the word reset in a filename, a script whose name contains prune. False positives are real and annoying. The wrong response is to loosen the match until it stops firing, because a gate that never fires on a false positive never fires on a true one either. The right response is to scope the gate to the shapes that are actually irreversible and give it a fast override. Fail-closed on everything and people route around you. Fail-closed on the irreversible and they thank you.

There is a market reason this matters, not only a safety one. The labs are bundling their own harnesses, Claude Code and Codex ship with the model, and third-party harnesses like LangChain's Deep Agents and Pydantic AI's Harness are racing them on capability. [LangChain showed](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) how much capability lives in the harness rather than the weights: tuning only the harness moved their coding agent 13.7 points, from 52.8 to 66.5 on Terminal Bench 2.0, with the model held fixed. [Boris Cherny](https://x.com/bcherny/status/2007179832300581177), who built Claude Code, makes the capability case in one line, that giving an agent a way to verify its work "will 2-3x the quality of the final result." The safety case is that same move pointed the other way: a gate that verifies before a destructive action and refuses when it cannot. I have not seen that lane claimed yet, a harness that is correct because it fails closed and portable because the safety lives in the scaffolding and not the model.

![Four gate types stacked under one fail-closed default: a permission layer, a secret redactor, a destructive-action gate, and a review gate. Each is small and deterministic, each answers one yes-or-no question, and each defaults to no when it cannot verify.](/assets/guides/fail-closed-harness/layered-enforcement-stack.webp "Four narrow gates composing under a single fail-closed default.")

## What are you actually shipping when you ship a harness?

The capability is what gets demoed. The default is what saves you at 2 a.m. when a poisoned page has talked your agent into a command it should never run. Capability is the model plus the tools. Safety is the harness deciding, before the fact and without the model's permission, what happens when it cannot be sure.

Fail closed. Prove the gate fires by firing it. Pay the friction on purpose, on the irreversible actions and nowhere else.

Three companion guides go deeper on the pieces: [why agent-written code needs layered review](/guides/why-agent-code-needs-layered-review), the [governed double-send-safe delivery pipeline](/guides/governed-double-send-safe-delivery), and a [self-correcting verifier that learns to abstain](/guides/verifier-abstention-not-refutation). For the wider map of what a harness even is, Paul Iusztin's [overview of the parts of a harness](https://read.technically.dev/p/whats-harness-engineering) is a good conceptual starting point; this guide is the guardrails part of that map, built out into something that holds. The rest of the map, the tools, the memory, the loop, is where the demos live. The guardrails are where the trust does.
