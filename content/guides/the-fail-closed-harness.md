---
title: "The Fail-Closed Harness: Why a Safe Agent's Default Is Refusal"
slug: the-fail-closed-harness
date: 2026-07-23
category: Agent Engineering
description: "The safety of an agent harness is not the list of things it can do. It is what the harness does by default when a required check cannot be satisfied. This guide builds the guardrails half of harness engineering that most write-ups name and skip: a fail-closed default, a trajectory model for when to refuse, and an honest account of what a command matcher can and cannot enforce."
lead: "While I was writing this guide, my own harness refused me over and over. Not once because a command was dangerous, but because a required check had not been satisfied yet. None of those gates was a wall, and understanding why is the whole discipline."
---

While I was writing this guide, my own harness kept refusing me.

The first refusal came when I tried to create a file. A gate intercepted the write and would not pass it until I had stated, on the record, what imported the file, what the blast radius was, what data it touched, and what the operator had actually asked for. I wrote those four facts. The retry went through. That happened on every new file the session touched, including the ones holding this guide's own research.

A second gate refused to let the session end. I had pushed a branch and wanted to stop; the stop was blocked until I either ran the review pipeline or stated in writing why this change did not need it. A third, quieter one flagged that I had hidden both output streams on a command whose result I was branching on, which collapses "the probe found nothing" and "the probe broke" into the same answer.

Not one of those is a wall. Every one is a speed bump that a deliberate, explicit action clears. That is the point, and it is where most guardrail writing goes wrong in both directions at once: it either promises a wall it cannot build, or it settles for a prompt the model can talk its way past.

**Who this is for:** engineers building or operating an agent harness who have read the concept pieces, named the guardrails box on the diagram, and now need the guardrails box to actually hold.

![Three capabilities converging inside one agent session: untrusted input, access to secrets or a production system, and a destructive or external action. When all three are present at once, the session needs supervision or a reliable validation step before a consequential action.](/assets/guides/fail-closed-harness/three-leg-refusal.webp "The three-leg convergence: untrusted input, sensitive access, and a consequential action in one session.")

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

A property is enforced by something outside the model that the model cannot argue with. The write lands or it does not, and no paragraph of justification changes the outcome. Our companion guide on [building infrastructure with an agent you can trust](/guides/agent-built-infrastructure-you-can-trust) makes the build-time version of this case. This guide makes the runtime version, and the mechanism is the difference: not a better instruction, but a check that runs outside the model and decides for it.

## When should the harness refuse?

On 2025-10-31, Meta drew the line as a rule: an agent session should satisfy at most two of three properties at once. The three are untrusted input, sensitive access, and consequential action, which is the shape of most real damage. Hold all three and you are one prompt injection from a bad outcome.

The discipline is to drop a leg before you act, or to require supervision when you cannot. Meta states [the three properties](https://ai.meta.com/blog/practical-ai-agent-security/) directly:

> agents must satisfy no more than two of the following three properties within a session: [A] An agent can process untrustworthy inputs; [B] An agent can have access to sensitive systems or private data; [C] An agent can change state or communicate externally.

Two days later Simon Willison [called it](https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/) the best practical advice for building secure LLM-powered agent systems today. His own earlier framing, [the lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) from June 2025, names the same three ingredients:

> The lethal trifecta of capabilities is: Access to your private data ... Exposure to untrusted content ... The ability to externally communicate in a way that could be used to steal your data

The two framings differ on one leg. Willison's trifecta draws its third capability narrowly, the ability to communicate data out; he says as much, that the trifecta "only covers the risk of data exfiltration." Meta's leg (C) is already wider, "change state or communicate externally," which on its face includes destruction with no exfiltration at all: a force-push that rewrites history, a `DROP TABLE`, a prune that deletes volumes. Nothing leaves the building. Something inside it is destroyed.

Two clarifications keep this from being read too simply. First, leg (B) is broad. A force-push against a repository that matters is already access to a sensitive system, so that example usually implicates (A), (B), and (C) together rather than being a clean two-leg case. (A) plus (C) is genuinely lower risk only when the target is disposable. Second, the rule does not say that any two of three is safe, and Willison pushed back on exactly that reading. Two legs means lower blast radius, not immunity. Three legs means you need supervision or a reliable validation step before the action, which is not always the same as refusing it outright.

![The Rule of Two as three legs. Leg A is untrusted input, leg B is sensitive or production access, leg C is any consequential output, including destructive or irreversible state-change and not only external communication. Holding all three legs at once is the condition that demands supervision or validation before acting.](/assets/guides/fail-closed-harness/rule-of-two-extended.webp "Meta's Rule of Two, with leg C read at its word: destructive state-change, not only exfiltration.")

## How do you make refusal a property and not a prompt?

On 2026-07-23 the gate that fired most often did something narrower than it sounds. It matched the shape of what I was about to do against a small rule set, before the action ran, and raised an explicit decision. It never judged whether the action was safe. It judged whether a rule matched, a different and much weaker question.

That distinction is not pedantry, it is the whole honest account. A matcher that finds no known destructive pattern has established exactly one thing: no known pattern matched. It has not established that the command is safe. So the right mental model is a tripwire, not a wall, and the right role is defense-in-depth: one cheap layer that catches the obvious cases loudly, sitting underneath real controls, never standing in for them.

Be concrete about what slips past. It matches command text before execution, which makes it a pre-command filter and not a sandbox. Shell expansion, an alias, `eval`, a sourced wrapper script, a `git` alias, or the same binary reached by another path can all carry a destructive action past a string match. Treat that list as the canary set and fire each one at the gate on a schedule. Where an action must actually be prevented rather than discouraged, enforcement belongs at the execution boundary, in the layer that runs the command, or better, in removing the capability from the session at all.

The failure mode is the other half. A gate is fail-closed only if the gate breaking is itself a block. In Claude Code, only a [`PreToolUse` hook](https://docs.claude.com/en/docs/claude-code/hooks) can stop a call: exit code 2 blocks it and hands the message back to the model, while any other exit, including an unhandled crash, lets it through. A `PostToolUse` hook runs after the action and cannot undo it. So a gate that throws on an input it did not anticipate does not fail safe. It fails open, silently, on exactly the weird input most likely to be an attack. Write the gate so its own error path exits blocking, and test the error path, not just the happy one.

![A decision flow for a destructive-command matcher. A command enters, the matcher checks it against known destructive shapes, an unmatched command continues to the normal controls, a matched command raises an explicit decision requiring a trusted authorization, and any internal error in the matcher itself exits on the blocking path rather than allowing the command.](/assets/guides/fail-closed-harness/gate-decision-flow.webp "The matcher's decision flow. An unmatched command is not a safe command, it is an unmatched one.")

Then there is the override, and here I will be exact rather than flattering. What clears the block in my own setup today is an environment variable the operator sets. That is a weaker thing than it sounds: an environment variable is not authentication, it is not bound to the specific command, it is not single-use, and it leaves no audit trail. Those four properties are what an override should have, and naming the gap is more useful than implying it is closed. An override the model can set for itself is the permission prompt again in a different hat.

## What happens when the gate itself dies?

The gate that fired repeatedly on 2026-07-23 is documented, in its own rules file, as fail-open by construction. That is not a flaw someone hid. It is a deliberate trade, chosen so normal work is never blocked, and it is the single most important sentence to read about any control you are relying on.

A healthy-looking control and a silently dead one are indistinguishable from the outside, and that is a general trap. I made the build-time version of the case in the [infrastructure guide](/guides/agent-built-infrastructure-you-can-trust): a control that is "armed and green" is making a claim about its own status, not about whether it does its job. The runtime version is sharper, because the thing failing open is the safety layer itself. Green has two causes, and watching cannot tell them apart.

You tell them apart by firing the control. A canary is a known violation you send through on purpose, on a schedule, to confirm the gate still catches it. Armed-and-green proves nothing; fired-and-caught proves the gate still binds. It is the difference between installing a smoke detector and pressing its test button, and it is the single most skipped step in every safety layer I have built. A gate proven in June and quietly broken in July is worth exactly nothing in August.

## Does fail-closed scale, and what does it cost?

On 2026-07-23 four different control types touched one session: a first-touch fact gate on file writes, a destructive-command matcher, a pre-commit secret scan, and a stop gate that refused to let the session end. They share no code and one rule: do not proceed while a required check is unsatisfied.

The principle composes precisely because each control is dumb on its own. There is no central brain to poison, only a stack of narrow interlocks that each answer one question and default to no. That also caps what the stack can promise: a pile of tripwires is not a sandbox, and calling it one is how teams end up surprised.

Fail-closed has a cost, and pretending otherwise is how you end up switching it off. A matcher keyed on command shapes will sometimes stop something harmless that merely looks dangerous: a chained one-liner with the word reset in a filename, a script whose name contains prune. False positives are real and annoying. The wrong response is to loosen the match until it stops firing, because a matcher that never fires on a false positive never fires on a true one either. The right response is to scope it to shapes that are actually irreversible and give it a fast, trusted way to proceed. Fail-closed on everything and people route around you. Fail-closed on the irreversible and they thank you.

There is a market reason this matters, not only a safety one. The labs are bundling their own harnesses, Claude Code and Codex ship with the model, and third-party harnesses like LangChain's Deep Agents and Pydantic AI's Harness are racing them on capability. [LangChain showed](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) how much capability lives in the harness rather than the weights: tuning only the harness moved their coding agent 13.7 points, from 52.8 to 66.5 on Terminal Bench 2.0, with the model held fixed. [Boris Cherny](https://x.com/bcherny/status/2007179832300581177), who built Claude Code, makes the capability case in one line, that giving an agent a way to verify its work "will 2-3x the quality of the final result." The safety case is the same move pointed the other way: check before a consequential action, and refuse while the check is unsatisfied. I have not seen that lane claimed yet.

![Four control types stacked under one default: a first-touch fact gate, a secret scan, a destructive-command matcher, and a review gate. Each is small and deterministic, each answers one question, and each declines to proceed while a required check is unsatisfied.](/assets/guides/fail-closed-harness/layered-enforcement-stack.webp "Four narrow controls composing under a single fail-closed default.")

## What are you actually shipping when you ship a harness?

The capability is what gets demoed. The default is what saves you at 2 a.m. when a poisoned page has talked your agent into something it should never do. Capability is the model plus the tools. Safety is the harness deciding, before the fact and without the model's permission, what happens when a required check cannot be satisfied.

Fail closed. Prove the control fires by firing it. Say plainly which layers are tripwires and which actually enforce, because the gap between those two is where every unpleasant surprise lives. And pay the friction on purpose, on the irreversible actions and nowhere else.

Three companion guides go deeper on the pieces: [why agent-written code needs layered review](/guides/why-agent-code-needs-layered-review), the [governed double-send-safe delivery pipeline](/guides/governed-double-send-safe-delivery), and a [self-correcting verifier that learns to abstain](/guides/verifier-abstention-not-refutation). For the wider map of what a harness even is, Paul Iusztin's [overview of the parts of a harness](https://read.technically.dev/p/whats-harness-engineering) is a good conceptual starting point; this guide is the guardrails part of that map, built out into something that holds. The rest of the map, the tools, the memory, the loop, is where the demos live. The guardrails are where the trust does.
