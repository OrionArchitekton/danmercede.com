---
title: "Building a Governed, Double-Send-Safe Delivery Pipeline for Agent Outputs"
slug: governed-double-send-safe-delivery
date: 2026-07-03
category: Agent Engineering
description: "I built a multi-agent system that emailed real people on a business's behalf, then retired the business. The delivery pipeline is the part worth keeping: the design that guarantees an agent never sends a customer the same email twice and never ships anything a human did not approve. Here is the pattern, the failure mode that shaped it, and the reaper rule most teams get wrong."
lead: "An agent that sends email is one crash away from sending it twice. I learned that building a governed multi-agent system, and the delivery pipeline is the one piece I would build again unchanged. Here is how it works and the reaper rule behind it."
---

I built a multi-agent system to run a small business. Agents drafted work, and some of that work left the building: emails to real people, exported documents, delivered artifacts. I later retired the business on market grounds, but the delivery pipeline is the piece I would rebuild without changing a line. It answers a question most agent demos skip: how do you let an autonomous system send things on a person's behalf without ever double-sending, misfiring, or shipping something nobody approved?

This guide is the pattern, generalized and stripped of the business it ran. It is for anyone whose agent sends consequential output: customer email, outbound messages, exported records, anything where "sent twice" or "sent without sign-off" is a real cost rather than a cosmetic bug.

**The one-line version:** treat every outbound action as a durable, leased, fail-closed transaction with a human approval gate and an evidence receipt, and make the crash-recovery path refuse to re-send by default. The rest of this guide is that sentence, unpacked.

---

## Why does an agent that sends email send it twice?

The double-send is not a rare edge case; it is the default behavior of a naive queue the first time a worker dies mid-send. A worker claims a send task, hands the message to the mail server, and then is killed (out of memory, a deploy, a reboot) before it writes "done." The task still looks unfinished, so the next worker picks it up and sends again. The customer gets two emails and you get a support ticket.

Every safe-delivery decision below exists to close that window. The failure is structural, not bad luck: the moment of maximum danger is the gap between "the side effect happened in the outside world" and "the system recorded that it happened." A crash in that gap is when a retry becomes a duplicate. You cannot make the gap zero, so you design for a crash inside it.

---

## What does the governed delivery pipeline look like?

The pipeline composes into one spine, and the rule is that no consequential send skips the approval, single-send, and attest gates. The score and review stages decide which items a human reads first rather than gating every send. Six stages, each durable before the next begins:

1. **Produce.** The agent generates the artifact in full (for email, a complete RFC 5322 message) and stages it. Nothing is sent inline at generation time.
2. **Persist.** Write the intent (the staged artifact plus a queue row and a receipt) to durable storage before anything leaves the process. If you crash now, the intent survives and is inspectable.
3. **Score.** Attach a confidence score to the output. This is the input to review routing, not a gate by itself.
4. **Review.** Route low-confidence items to a human review queue. High-confidence items still do not bypass the next stage.
5. **Approve.** A fail-closed approval gate. The release is blocked by default and proceeds only on an explicit, recorded authorization.
6. **Send and attest.** Send exactly once under a lease, then reconcile and write an evidence receipt describing what happened.

The important property is that steps 2 through 6 are separate durable transitions, not one function call. Each stage can crash and resume without losing or duplicating work, because the state that matters lives in the store, not in a worker's memory.

![The governed delivery spine: six durable stages (produce, persist, score, review, approve, and send with attest), with low-confidence items branching to a human review queue and each arrow a separate durable transition.](/assets/guides/governed-double-send-safe-delivery/governed-delivery-spine.webp "Six durable stages; each arrow is its own transaction, so a crash between stages never loses or duplicates work.")

---

## How do you make the send idempotent when a worker dies?

This is the stage most teams get wrong, and the fix is a rule, not a library. Use row-level leasing so exactly one worker owns a task at a time, and make external-send actions non-requeueable on lease expiry. In Postgres the leasing primitive is a claim under `SELECT ... FOR UPDATE SKIP LOCKED`: concurrent workers select different rows, never the same one, so two workers cannot both send.

The lease is what makes crash recovery safe, and the reaper is where the real decision lives. A reaper reclaims tasks whose lease expired because the worker died. For ordinary internal work, reclaiming and re-running is correct. For an external send it is a loaded gun: if the worker died after the mail server accepted the message but before it recorded success, re-running sends a duplicate. So the rule is:

> An external-send action is non-requeueable on lease expiry. When its lease dies, the reaper strands the task for human reconciliation instead of re-running it.

That is the whole trick. A visible stuck task beats an invisible double-send. You trade an automatic recovery you cannot prove is safe for a manual one a human can resolve in seconds by checking whether the message actually went out. Internal, side-effect-free tasks stay auto-requeueable; only the actions that touch the outside world are stranded. Encode the action type in the task and let the reaper branch on it; do not rely on a human remembering the distinction.

![The double-send-safe reaper: a worker claims a task under a lease and dies mid-send; when the lease expires the reaper branches on action type, requeuing internal tasks but stranding external sends for human reconciliation to avoid a duplicate customer send.](/assets/guides/governed-double-send-safe-delivery/double-send-safe-reaper.webp "The recovery path branches on action type: internal tasks requeue, external sends strand for a human.")

---

## How do you keep the pipeline fail-closed?

Fail-closed means the safe state is the default and every unsafe action requires an explicit, positive signal to proceed. Three defaults carry most of the weight:

- **Sending is off until switched on.** A single delivery-enabled flag gates all outbound sends, defaulting to off. A misconfiguration, a fresh environment, or a half-deployed release sends nothing rather than sending wrong.
- **The sender identity is checked, not assumed.** At the point of send, the from-address is checked against a verified sending domain, and a transport guard refuses to send if encrypted transport is expected but the connection would fall back to an unencrypted or wrong port. These checks live in send code, not in a config comment.
- **Nothing consequential ships without a recorded approval, and everything that ships leaves a receipt.** The approval gate is the choke point; the receipt is the audit trail. A stranded, unreconciled send is deliberately left without a success receipt, because its outcome is genuinely unknown until a human checks.

A short operational note, because it cost me. A swallowed import error once left a preflight check silently broken for about 65 days; a reboot finally surfaced it, and the whole time the failure had been read as a benign "dependency unavailable" state. A suppressed error that reads as a normal state is its own failure mode. Fail-closed only helps if the closed state is loud.

---

## When do you actually need this, and when is it overkill?

Match the machinery to the blast radius of a wrong send. For low-stakes internal output (a draft in a channel, a log line, a suggestion a human will obviously see and fix), this full pipeline is overkill and you should not build it. The cost of the ceremony exceeds the cost of the mistake.

You need it the moment a wrong or duplicate send has real cost: customer-facing email, anything touching money, anything with a compliance or legal record, anything a recipient acts on. For those, the pipeline is the floor, not the gold-plating. The tell is simple: if "sent twice" or "sent without sign-off" would generate a support ticket, a refund, or a liability, you are in scope.

The pattern outlived the business I built it for, which is the honest reason it is here rather than in a product. The decision to retire that system, and the principle that a clean architecture is a reason to document the pattern rather than keep funding the business, is its own argument, made in the companion essay [Architecture Fit Is Not Business Justification](https://www.danmercede.com/thoughts/2026-07-03-architecture-fit-is-not-business-justification). Build the pipeline when the sends are consequential. Skip it when they are not. And whatever you build, make the reaper refuse to re-send by default.
