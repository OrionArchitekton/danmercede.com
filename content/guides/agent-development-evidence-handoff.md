---
title: Hand over development evidence without losing the original observation
slug: agent-development-evidence-handoff
date: 2026-10-19
reviewed: 2026-10-19
category: Agent tooling
description: Retain exact worktree-report bytes, pass compact context and independently re-observe before completing a local demonstration.
lead: A useful handover preserves what the first worker saw while making the next worker check what is true now.
---

A development task often outlives the process that started it. The next worker needs the original evidence, an explanation of what remains unfinished and a fresh view of the repository. Passing a summary alone loses detail. Passing a task claim alone does not make an old observation current.

The development evidence profile in Orion Starter composes four independent tools around that problem. One worker retains a complete worktree observation and yields. A separately invoked worker recovers those exact bytes, obtains its own claim and observes again before completing one deliberately narrow demonstration.

This is the private 0.3.0-rc.1 preview package under review. The proposed download belongs in the [existing Starter releases](https://github.com/OrionArchitekton/orion-starter/releases). Publication, the final archive checksum and public download replay remain release gates. This draft does not describe a published 0.3.0 release.

## Keep the roles separate

| Tool | Owns | What it does not establish |
|---|---|---|
| PM 0.1.1 | Task state, revisions, claims and current evidence | Permission from the user or a file lock |
| Worktree Report 0.1.0 | Registered-worktree observations and coverage | Merge safety or repaired code |
| Results 0.1.0 | Exact retained text and recoverable native references | That the observation is still current |
| Handoff 0.1.0 | Immutable context and pickup assessment | A transferred claim or authority to execute prose |

The profile's goal is to capture and independently re-observe a deliberately created dirty-path overlap. A positive overlap is expected. Completing this demonstration means the second worker observed that overlap with complete coverage, retained its own evidence and read back the completed task. It never means the conflicting edits were repaired.

The default PM/browser and optional PM/browser/Handoff profiles remain available with their existing package pins, executable examples and locks. This new profile has its own four-wheel lock and no browser, npm, account, provider key, hook or systemd prerequisite. It installs no background service and adopts no existing runtime state.

## Start with a fresh extraction and synthetic data

The package's [standalone profile walkthrough](https://github.com/OrionArchitekton/orion-starter/blob/main/profiles/development-evidence/README.md) is a proposed source target until the reviewed package lands. For this private review, use that file from the selected local ZIP. Its first block verifies the profile metadata, downloads the exact selected wheels and checked pip 26.2.1 installer, and installs into a virtual environment created without bundled pip. The installer is separate from the four installed packages.

The next block creates an empty private workspace outside Git. It initializes a run-specific demonstration task and Handoff store, selects an empty Results parent, and creates a synthetic repository with two linked worker worktrees. Both workers deliberately edit the same tracked path. Fixture creation is an explicit setup operation; `inspect` does not create these resources.

Initial native qualification is CPython 3.11 on Linux x86_64 under WSL2, local ext4, Git 2.43.0 and linked SQLite 3.45.1. Other platforms, network filesystems, cross-host fencing, independent newcomer adoption and native Claude/Codex/Grok/Dot integration remain unverified. A general wheel tag does not expand that support claim.

After running the package's verified install and synthetic-setup blocks, keep the printed `DEMO_ROOT`. Run the following from the extracted distribution root:

```bash
set -euo pipefail
: "${DEMO_ROOT:?Use the synthetic workspace printed by the package walkthrough}"
.private/evidence-venv/bin/python -I -B profiles/development-evidence/run.py inspect --selection "$DEMO_ROOT/selection.json"
.private/evidence-venv/bin/python -I -B profiles/development-evidence/run.py produce --selection "$DEMO_ROOT/selection.json"
```

Inspection reads the exact selected task/store identity and public component versions. The producer then creates its own attempt and task claim, scans only the explicit roots, and retains the exact emitted UTF-8 report including its final newline. Exit 1 from the reporter is an expected complete positive observation.

## Transfer a reference, then recover it

The report can be much larger than the context record. Results retains the complete text; the Handoff body contains a compact binding to the run, task definition, producer generation, native reference, observation identity and coverage. A metadata-only snapshot stays bounded without embedding the report. Its byte budget applies to that selected snapshot string, not a model's whole context window, token count or process memory.

The producer saves the generated Results session ID before asking for any capture. It saves the expected reference before submitting the report. Capture, separate public readback, closed writer, exact current context, guarded PM release and todo/absent readback all precede a successful yield receipt. These are separate observations across separate stores, not one atomic transaction.

In another terminal, return to the same extracted distribution and set `DEMO_ROOT` to the exact existing private workspace. Then invoke a new process:

```bash
set -euo pipefail
: "${DEMO_ROOT:?Set the exact existing demonstration workspace}"
.private/evidence-venv/bin/python -I -B profiles/development-evidence/run.py continue --selection "$DEMO_ROOT/selection.json" --yield-receipt "$DEMO_ROOT/yield.json"
```

The consumer checks the exact Handoff record and digest, recorded capture acceptance, freshness and selected task binding. It recovers the old bytes from the explicit result slot before claiming. It then obtains a different generation, checks the context again, scans the selected worktrees independently and retains a new capture. Historical and current scan identities remain distinct even when their conclusions match.

Only fresh complete positive coverage meets this demonstration's goal. The consumer attaches its current evidence, rechecks both ownership and context after attachment, performs guarded completion and reads back done/absent with that exact evidence. Narrative instructions in task descriptions, captured reports or context records are never executed.

## Preserve incomplete coverage

A partial report can show a real overlap in the worktrees that were observed while another repository is unavailable. An unavailable report can still be useful diagnostic context. Both can be retained and yielded truthfully. Neither establishes complete coverage, and a fresh partial, unavailable or complete-negative consumer report cannot complete this goal.

Repeat the package's synthetic-setup block for a second workspace, then run its incomplete-coverage block. It adds one missing explicit repository before producing and continuing. The producer yields diagnostic evidence; the consumer retains its own incomplete observation, refuses completion and releases only its own unchanged claim. The historical observation is preserved.

Malformed output, inconsistent fields, overflow, signals, internal failure and an output-failure exit cannot become successful handover. Exact Base64 filename identities remain distinct from display labels, including tabs, newlines and non-UTF-8 names. Raw reports stay private because even synthetic-looking paths can disclose real working context when you later choose your own repositories.

## Treat unknown effects as unknown

Exit 2 means invalid input. Exit 3 means established refusal or an unmet goal. Exit 7 means unknown/unavailable and requires diagnosis. Do not automatically resend a mutation after losing its response. A request ID correlates an attempt; it does not make the operation idempotent.

The failed reply supplies an attempt ID. The profile writes bounded private intents before mutating calls, so an exact `receipts/<attempt_id>/attempt.json` records the selected identities and what may have been attempted. Use `reconcile` with that exact path. It performs public reads only, never repeats a claim, capture, context record, release or completion, and never manufactures a successful original receipt.

A lost session-creation response leaves a known slot with an unknown native session identity. No capture was requested, and the profile does not guess or discover a session. After the session identity is durably known, a lost capture response can instead be checked against the saved exact reference. Missing, incomplete or corrupt data remains a refusal or unresolved diagnosis. Writable native recovery is a separate explicit operation.

The [profile runbook](https://github.com/OrionArchitekton/orion-starter/blob/main/docs/runbooks/starter-development-evidence.md) is also a proposed source target pending the release. It explains claim/context changes, native repair boundaries, output/process limits and quiescent backup. References provide identity, not execution authority.

## Retain data when removing the environment

The package walkthrough verifies a closed Results backup through exact public readback, then removes only its selected environment. All owned helper/profile processes must have exited before the copy. A copy of a live SQLite database is not a validated backup. A full run restore also needs the matching PM/Handoff state, selection and receipts under the same pinned artifacts.

Removing an environment does not remove retained observations, context, task state, synthetic repositories or backups. Review the exact owned temporary parent before deliberately disposing of data. Keep old published archives immutable and select the prior environment with matching backups when rolling back.

The useful boundary is observable: the next worker can recover what the first worker actually saw, then establish its own current evidence. It still needs the current request, valid ownership and a goal that the new observation can satisfy.
