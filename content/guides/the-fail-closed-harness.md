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

The failure mode is the other half. A gate is fail-closed only if the gate breaking is itself a block. In [Claude Code](https://code.claude.com/docs/en/hooks), a `PreToolUse` hook can stop a call two ways: exit code 2, which blocks and feeds its stderr back to the model, or a clean exit carrying a structured `permissionDecision` of `deny`. A `PermissionRequest` hook can deny as well. A `PostToolUse` hook cannot stop anything, because the tool has already run.

Every other non-zero exit, including an unhandled crash, is treated as a non-blocking error and the action proceeds. That failure is not silent; the transcript carries a hook-error notice. But a notice after the fact is not a block, and it arrives when the command has already run. So a gate that throws on an input it did not anticipate fails open on exactly the weird input most likely to be an attack. Write the gate so its own error path exits blocking, and test that path, not just the happy one.

![A destructive-command tripwire checks a command for a known bad shape. A non-match continues to normal controls, while a match stops for a human decision. A separate error panel contrasts the current non-blocking failure path, which continues with a visible hook error, against a target blocking path that stops the command.](/assets/guides/fail-closed-harness/gate-decision-flow.webp "A tripwire is not a wall: current fail-open behavior contrasted with the target blocking path.")

Then there is the override, and here I will be exact rather than flattering. What clears the block in my own setup today is an environment variable the operator sets. That is a weaker thing than it sounds: an environment variable is not authentication, it is not bound to the specific command, it is not single-use, and it leaves no audit trail. Those four properties are what an override should have, and naming the gap is more useful than implying it is closed. An override the model can set for itself is the permission prompt again in a different hat.

## What happens when the gate itself dies?

The gate that fired repeatedly on 2026-07-23 is documented, in its own rules file, as fail-open by construction. That is not a flaw someone hid. It is a deliberate trade, chosen so normal work is never blocked, and it is the single most important sentence to read about any control you are relying on.

A healthy-looking control and a silently dead one are indistinguishable from the outside, and that is a general trap. I made the build-time version of the case in the [infrastructure guide](/guides/agent-built-infrastructure-you-can-trust): a control that is "armed and green" is making a claim about its own status, not about whether it does its job. The runtime version is sharper, because the thing failing open is the safety layer itself. Green has two causes, and watching cannot tell them apart.

You tell them apart by firing the control. A canary is a known violation you send through on purpose, on a schedule, to confirm the gate still catches it. It is the difference between installing a smoke detector and pressing its test button, and it is the single most skipped step in every safety layer I have built.

Be precise about what a fired canary buys, though, because it is less than the phrase suggests. Armed-and-green proves nothing. Fired-and-caught proves that one path bound, at one moment. It says nothing about the path you did not exercise. So rotate the canaries: send a plainly known-bad command, then send the same intent dressed up in an alias or an `eval`, then force the control's own error path. Those three fail independently, and only the first is usually tested. A gate proven in June and quietly broken in July is worth exactly nothing in August.

## Does fail-closed scale, and what does it cost?

On 2026-07-23 four control types touched one session: a first-touch fact gate, a pre-commit secret scan, a stop gate that blocked the session from ending, and a destructive-command matcher. Three of them hold until a check is satisfied. The fourth is fail-open by construction, and conflating the two is how a stack gets oversold.

The principle composes precisely because each control is dumb on its own. There is no central brain to poison, only narrow interlocks that each answer one question. But the stack is not uniform, and the honest inventory matters more than the count: three required gates that hold, plus one advisory tripwire that raises a decision and can be cleared. A pile of tripwires is not a sandbox, and calling it one is how teams end up surprised.

Fail-closed has a cost, and pretending otherwise is how you end up switching it off. A matcher keyed on command shapes will sometimes stop something harmless that merely looks dangerous: a chained one-liner with the word reset in a filename, a script whose name contains prune. False positives are real and annoying. Narrowing the pattern is often exactly right, and it can drop a specific false positive while keeping every true one, so the crude warning that tuning always costs coverage is wrong. What makes tuning safe is not judgment, it is a regression set: keep a fixture of commands that must still trip the matcher, and run it after every change. Tuning without that fixture is how a matcher quietly drifts toward matching nothing. Scope it to shapes that are actually irreversible, and give it a fast, trusted way to proceed. Fail-closed on everything and people route around you. Fail-closed on the irreversible and they thank you.

There is a market reason this matters, not only a safety one. The labs are bundling their own harnesses, Claude Code and Codex ship with the model, and third-party harnesses like LangChain's Deep Agents and Pydantic AI's Harness are racing them on capability. [LangChain showed](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) how much capability lives in the harness rather than the weights: tuning only the harness moved their coding agent 13.7 points, from 52.8 to 66.5 on Terminal Bench 2.0, with the model held fixed. [Boris Cherny](https://x.com/bcherny/status/2007179832300581177), who built Claude Code, makes the capability case in one line, that giving an agent a way to verify its work "will 2-3x the quality of the final result." The safety case is the same move pointed the other way: check before a consequential action, and refuse while the check is unsatisfied. I have not seen that lane claimed yet.

![Three required gates, first-touch declaration, secret scan, and stop plus review, share a default-refuse enforcement spine. A destructive-command matcher sits outside that spine as a separate tripwire that asks on a known match but fails open on an internal error.](/assets/guides/fail-closed-harness/layered-enforcement-stack.webp "Three required gates and one advisory tripwire, separated by role and default.")

## What are you actually shipping when you ship a harness?

The capability is what gets demoed. The default is what saves you at 2 a.m. when a poisoned page has talked your agent into something it should never do. Capability is the model plus the tools. Safety is the harness deciding, before the fact and without the model's permission, what happens when a required check cannot be satisfied.

Fail closed. Prove the control fires by firing it. Say plainly which layers are tripwires and which actually enforce, because the gap between those two is where every unpleasant surprise lives. And pay the friction on purpose, on the irreversible actions and nowhere else.

Three companion guides go deeper on the pieces: [why agent-written code needs layered review](/guides/why-agent-code-needs-layered-review), the [governed double-send-safe delivery pipeline](/guides/governed-double-send-safe-delivery), and a [self-correcting verifier that learns to abstain](/guides/verifier-abstention-not-refutation). For the wider map of what a harness even is, Paul Iusztin's [overview of the parts of a harness](https://read.technically.dev/p/whats-harness-engineering) is a good conceptual starting point; this guide is the guardrails part of that map, built out into something that holds. The rest of the map, the tools, the memory, the loop, is where the demos live. The guardrails are where the trust does.
