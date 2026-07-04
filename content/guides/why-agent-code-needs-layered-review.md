---
title: "The Reviewer Blessed the Bug: Why Agent-Written Code Needs Layered Review"
slug: why-agent-code-needs-layered-review
date: 2026-07-04
category: Agent Engineering
description: "I put one 20-line log-scrubbing function through four independent review layers while hardening a self-hosted LLM-observability backup. Each layer caught a real defect the others missed, and one layer reproduced a secret leak that an earlier layer had explicitly certified as safe. The case for layered review of AI-written code, with the five bugs and the fixes."
lead: "A security reviewer read my diff and certified the exact property that was broken: no overlap mis-redaction. One layer later, a different reviewer reproduced a partial secret in the logs. Same code, opposite verdict. That gap is the whole argument."
---


A security reviewer read my diff and signed off on a specific claim: the credential-scrubbing was correct, "encoded access/secret forms are distinct, no overlap mis-redaction." It was thorough. It traced every log path. It was also wrong.

One review layer later, a different reviewer took the same function, fed it two overlapping credentials, and printed the result: a **partial secret sitting in the log line**. The redaction had eaten part of one secret and left the tail of another exposed. Same code, same afternoon, opposite verdict.

That gap between "a careful reviewer certified this" and "an independent adversary broke it in one run" is the entire case for layered review. When an agent writes your code, and increasingly it does, no single review pass is a safety net. The passes have to be **independent**, because independence is the only thing that makes their blind spots not line up.

This guide walks the real arc: one small log-scrubber, four review layers, five defects, and the exact modality that let each layer catch what the others could not see. Every bug here is a shape you can copy into your own checks.

**Who this is for:** anyone shipping code an AI agent wrote, or building the review harness that gates it, especially around self-hosted infrastructure where a quiet failure hides for weeks.

---

## What was actually being hardened?

In a 2026-07 pass on a self-hosted LLM-observability stack (Langfuse on top of ClickHouse, with backups pushed to a MinIO object store and an encrypted off-box replica via restic), I hardened one function: a log scrubber that strips credentials out of backup-failure messages before they reach a cron log. Roughly 20 lines. It is exactly the kind of small, security-adjacent code an agent produces in seconds and a human skims in seconds.

The scrubber matters because backup scripts fail loudly, and a failure message often contains the command that failed, which contains the credentials. If a nightly backup dies and dumps an S3 secret key into a log that ships to your aggregator, you have turned a reliability event into a credential-exposure event. The scrubber's whole job is to make that impossible.

So it is a good test case: tiny, high-stakes, and the sort of thing everyone assumes is too small to need real review. It went through four layers anyway. Here is what each one saw.

## Why does live-environment recon catch what no diff can?

Before any diff review, I ran the backup once against the real host, and that single run exposed a defect no code reader could have found: the script selected its MinIO container with a fuzzy name match, and the host happened to run **two** MinIO containers. The match grabbed the wrong one, hit Access Denied on a bucket it could not see, and reported a false CRITICAL every night while the actual backup was fine.

No diff review catches this. The code was locally correct. `docker ps` filtered by a name substring returns the first match, and on a one-MinIO dev box that first match is always the intended one. The bug only exists in the shape of the live environment, where a second, unrelated MinIO happened to sort ahead of the one the backup wanted. The lesson is old and keeps being true: **a passing local test and a clean diff describe the code, not the world it runs in.** The fix was to select the container by exact name, defaulted in-script, so a fuzzy match can never wander onto the wrong instance.

Recon is a review layer in its own right. It senses runtime state, a modality a static reviewer cannot reach. If your agent-review harness is all diff-readers, it stays blind to an entire class of defect that only appears on contact with production.

## What does a pre-PR reviewer fleet catch that a single reviewer misses?

Before the pull request opened, I ran three independent reviewers over the diff (adversarial, correctness, and security), and the security pass caught a redaction bug hiding in plain sight: the scrubber replaced each secret with a shell pattern substitution, `s="${s//${SECRET}/<redacted>}"`, and the unquoted needle is treated as a **glob**. A secret containing a bracket expression like `[ab]` is read as a character class, fails to match itself literally, and passes through the log unredacted. A `*` or `?` in the secret fails the other way, over-matching and redacting adjacent log text. Both are wrong; only one leaks, and you cannot predict which without knowing the secret.

The fix is one edit, quoting the needle so the match is always literal:

```bash
# unquoted: a bracket-expression secret leaks, and * or ? over-redacts
s="${s//${SECRET}/<redacted>}"
# quoted: the secret is matched literally, both failure modes closed
s="${s//"${SECRET}"/<redacted>}"
```

The value of the fleet is not three times the reading. It is three **different** readings. Point one reviewer at a diff and you get one model's priors about what is worth checking. Point three with distinct adversarial framings and their blind spots do not fully overlap, so the union of what they notice is strictly larger. This is the cheapest layer to add and the one people skip most, because a single "looks good" from a capable model feels like enough. It is not enough. It is one sample.

## Why did the post-push layer catch what the security reviewer had certified?

With an access key of `ABC` and a password of `ABCDEF`, a post-push reviewer ran the already-certified scrubber on the line `password=ABCDEF` and got back `password=<redacted>DEF`: a partial secret in the log. The pre-PR security pass had checked this exact function for overlapping-secret bugs and signed off, "encoded access/secret forms are distinct, no overlap mis-redaction." A second model, running the code instead of reasoning about it, broke that certification in one run.

Here is the whole bug. The scrubber redacted each secret in sequence. If a shorter secret is a substring of a longer one, the shorter replacement fires first, mutates the line, and the longer secret no longer matches itself, so its tail survives:

```bash
# ACCESS='ABC'  RESTIC='ABCDEF'
s="${s//"${ACCESS}"/<redacted>}"   # 'password=ABCDEF' -> 'password=<redacted>DEF'
s="${s//"${RESTIC}"/<redacted>}"   # no longer matches; 'DEF' leaks
```

The fix is to stop treating the needles as an ordered list and redact them **longest-first**, so no shorter needle can fragment a longer secret before that secret is matched whole:

```bash
# sort the needles by length, descending, then redact each literally
readarray -t needles < <(printf '%s\n' "${needles[@]}" | awk '{print length"\t"$0}' | sort -rn | cut -f2-)
for n in "${needles[@]}"; do s="${s//"${n}"/<redacted>}"; done
```

Longest-first closes the substring case, where one secret sits wholly inside another. It does not close the rarer case of two distinct secrets that overlap in the log line, a suffix of one equal to a prefix of another; random credentials almost never do this, but if yours can, redact in a single combined pass instead of a loop. State the bound; do not sell the fix as total.

This is the load-bearing section, so sit with what happened. A competent reviewer did not skip the overlap question. It **considered the overlap question and answered it wrong**, because it reasoned about the encoded forms being distinct and missed that the raw forms could overlap. A second, independent adversary, running the function instead of reasoning about it, found the counterexample immediately. Certification by one reviewer is an argument. Reproduction by an independent one is a fact. When you can afford only one, prefer the layer that runs the code.

## Can a merge gate itself be a review layer?

The last defect was not in the code at all, and the CI gate surfaced it: my new test used credential-shaped fixtures (values with an `AKIA` prefix, the AWS access-key-ID shape), and a secret scanner flagged them and **transitively blocked the merge**, even though that scanner was not one of the branch's required status checks. A second scanner, run on the identical fixtures, passed. The gate disagreed with itself.

The trap is one layer of indirection. The scanner was not in the branch-protection required list, so it looked advisory. But a separate fail-closed meta-check that *was* required carried its own internal list of checks it waits on, and the scanner was in it. So a "non-required" check gated the merge through a required one. Reading only the branch-protection settings would tell you the merge was clear. It was not.

Two portable lessons fall out. First, **never hardcode credential-shaped fixtures**; use obviously-fake, low-entropy placeholders that still exercise the code path, because a scanner cannot tell your test data from a live leak and should not have to. Second, when a merge is blocked and the required checks look green, **read what your meta-gates actually wait on**, not just the protection rules. The scanner also scans full branch history, so neutralizing the fixtures at the tip does not clear a hit an earlier commit introduced; a squash-merge that collapses to the net diff does.

## Why don't the layers just catch the same things?

Across the arc, four layers caught five distinct defects with no overlap in the catches (the merge gate alone surfaced two, the credential-shaped fixtures and the transitive block), because each layer senses a different modality. Live recon senses runtime state. The pre-PR fleet senses the diff with fresh adversarial priors. The post-push pass senses by an independent model that runs the code. The CI gate senses policy and scanner state. Independent modalities have independent blind spots, which is the only reason stacking them pays off.

| Review layer | Sensing modality | The defect it caught |
|---|---|---|
| Live recon | runtime state on the real host | wrong container selected, false CRITICAL nightly |
| Pre-PR reviewer fleet | fresh adversarial read of the diff | glob-unquoted redaction needle |
| Post-push pass | an independent model that runs the code | sequential-substitution partial-secret leak |
| CI merge gate | policy and scanner state | credential-shaped fixtures, transitive merge block |

Stacking identical reviewers does not work. Three passes from the same model with the same framing tend to miss the same things, because they share priors. The gain comes from **orthogonality**: a runtime probe sees what a reader cannot, a code-runner sees what a reasoner cannot, a scanner sees what a designer forgot. The arc is a clean natural experiment for this, because one layer certified the precise property another layer broke. If the two had shared a modality, they would have shared the blind spot, and the leak would have shipped.

The uncomfortable corollary for AI-written code: the model that wrote the code, the model that reviews the diff, and the model that reasons about correctness are correlated failure sources when they are the same model reasoning the same way. Independence is not a nice-to-have on top of review. Independence **is** the review.

## How do you build this without drowning in process?

You do not need a 20-layer gauntlet on every one-line change; you need a few genuinely independent layers on anything security-adjacent, and a smaller set elsewhere. In practice, for agent-written infrastructure code, four layers cover the modalities that matter, and each is cheap once wired.

Concretely:

- **Run it against the real environment before you trust the diff.** One live execution surfaces the wrong-container, wrong-endpoint, and "works-on-the-dev-box" class that no reader catches. Recon is a layer.
- **Fan out a small pre-PR reviewer set with distinct framings,** not one reviewer three times. Adversarial, correctness, and a security pass on the named bug classes. The union beats the average.
- **Add one post-push pass by a different model that runs the code,** not just reads it. This is the layer that catches what your best reviewer confidently blessed. Weight reproduction over certification.
- **Treat the CI gate as a reviewer and read its real dependency graph,** including what your fail-closed meta-checks wait on. And keep credential-shaped data out of tests entirely.

The through-line is not "more review." It is **independent** review. Five defects in one 20-line function, each invisible to every layer but one, is the normal shape of software when a fast writer meets a single slow reader. That is not a verdict on the agent; it is arithmetic. Give the writer four orthogonal readers instead, and the blind spots stop lining up.
