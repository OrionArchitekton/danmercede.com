---
title: "Build a Supervisor Agent: Talk to One Session While the Rest Keep Moving"
slug: build-a-supervisor-agent
date: 2026-10-31
reviewed: 2026-10-31
category: Agent Engineering
description: "On 2026-10-31 one Claude Code session supervised four Codex threads and a second Claude Code session for a full day while I mostly made decisions. This guide shows how to build that supervisor from built-in messaging, plain files and a few small scripts, and the seven mistakes that became its rules."
lead: "You run several coding agents on one project, and somewhere along the way you became the message bus between them. A supervisor session fixes that. You talk to it, and it keeps every other session moving, routes their questions, checks their work, merges what passes and brings you only the real decisions."
---

If you run more than two or three coding agents on one project, you've probably noticed where the time goes. One session finishes and needs a review, another is waiting on an answer only a third one has, and you're the one carrying messages between terminals. The agents are fast, and you're the queue.

So I stopped being the queue. On 2026-10-31 I talked to one Claude Code session all day. It kept four Codex threads and a second Claude Code session moving, answered their questions, checked their handoffs, merged what passed its gates and brought me decisions: approve this cut, pick that name, choose where CI runs. I still carried a few messages by hand, every one a Codex question asked where the supervisor couldn't see it, and that gap became a rule too.

The whole thing is built from public pieces: Claude Code's cross-session messaging, Codex CLI's `codex queue`, a few plain text files and a few small scripts. There's no new service to run. This guide walks through each piece, with snippets written for this guide and tested before they went in, and then the mistakes from that day and the rule each one produced.

**Who this is for:** developers already running several Claude Code and Codex sessions (or other coding agents) on one project, who want those sessions to keep moving while they're away and to talk to only one of them.

## What did one supervisor session do on 2026-10-31?

On 2026-10-31, from 8:30 AM to 8:30 PM Pacific, one Claude Code session supervised four Codex threads and one other Claude Code session on a documentary video pipeline. Across that day 24 pull requests merged in the project, and two documentary scripts went from draft to narration, each fact-checked by a session that didn't write it.

The workers were a production thread, a thread polishing a third film, a build thread and a research thread, all in Codex, plus one Claude Code session that researched, narrated and assembled the second film. The supervisor and the writer subagents it launched wrote both scripts. The review bots on each pull request counted as workers too, since their findings had to be read, sorted and routed to the session that owned the code.

Some moments from the supervisor's running log, in Pacific time:

| Time | What happened |
|---|---|
| 10:42 AM | Hosted CI stops starting jobs: the account hit its spending limit |
| 11:50 AM | The supervisor brings up self-hosted runners, so jobs start again |
| 3:45 PM | The second film's key-scene proof is verified, and its script writing starts |
| 4:31 PM | The supervisor messages the other Claude session itself, instead of asking me to nudge it |
| 4:58 PM | Two narration jobs need the same GPU, so the supervisor puts them in order |
| 5:06 PM | The first narration finishes, and the GPU release is passed to the second job |
| 6:11 PM | The supervisor finds and fixes a CI bug it had introduced that afternoon |
| 6:46 PM | The second film's private review package is sealed and verified |
| 8:17 to 8:27 PM | I set three standing rules for the supervisor and its workers |

The second film went from key-scene proof to a sealed review package in about three hours, and its script went through six drafts on the way.

My part was mostly decisions. Among them, I approved one film's latest cut, settled a naming question, chose which machine hosts CI, held one release decision until more data was in, gave review notes on the finished cut, and set the three rules. I also carried messages by hand a few times: I pasted two Codex questions into the supervisor and its two answers back, and once pressed Steer in all four Codex threads so a new rule landed right away. Every one of those traced back to a Codex thread asking where the supervisor couldn't see it, which is the gap the inbox rule closed. Two lines from the supervisor's log, with session names and IDs removed, show the kind of thing it recorded:

> 4:31 PM: CORRECTION: peer Claude sessions ARE messageable. SendMessage delivered the fact-check request with notify_when_idle. No Dan nudge needed.
>
> 8:18 PM: Dan rule: busy Codex reads log; idle Codex needs a queue push.

![The supervisor architecture. You, marked decisions only, talk to the supervisor session, which holds standing approvals, a decisions list and merge on green, and messages workers itself without relaying through you. The supervisor sends SendMessage to Claude Code sessions in both directions, with a one-shot notice when a turn ends, and sends a one-line pointer to Codex threads with codex queue, using Steer in the app when it can't wait. Every session reads and appends shared files: append-only workstream logs carrying a path and SHA-256 on every handoff, a supervisor inbox for workers' questions, O_EXCL claim locks with one owner per item, and a read-only sweep script that reads all of it plus open pull requests. Codex threads reach the supervisor only through the files; Claude Code sessions can also message it directly.](/assets/guides/supervisor-agent/supervisor-architecture.webp "Two built-in message channels, four shared files and one read-only sweep. Codex threads reach the supervisor only through the files.")

## What authority does the supervisor need before it starts?

By 8:27 PM on 2026-10-31 my supervisor held three new standing rules from me, each written down so it would never bring me that question again. A supervisor that asks before every merge or commit is one more message bus. So give it written authority for routine actions and a list of decisions it must not re-ask.

I keep that list in a plain file the supervisor reads before it asks me anything. The three rules from that evening, reworded for any project:

```markdown
# decisions.md: read before asking. Each entry is settled until I change it.

- 2026-10-31 20:18 PT: Busy Codex threads read their workstream log. Idle ones get a
  queued one-line pointer. Queue to a busy thread only when it can't wait.
- 2026-10-31 20:24 PT: Workers never prompt me. Questions go to ~/coord/inbox.md.
- 2026-10-31 20:27 PT: Workers may commit and push task-branch pull requests after the
  full test suite passes. The supervisor reviews every diff and merges when checks and review pass.
  No session pushes to main.
```

The supervisor's own authority was set the same way: merge pull requests when CI and the review pipeline pass, read docs-only changes directly, message a worker only for a real blocker or decision, never interrupt a thread that's working, and batch everything that needs me into one question.

Some things stay with you no matter how good the supervisor gets: publishing, spending money, credentials, account and channel changes, and approval of the finished work. Write that list down too. Then the supervisor knows which questions to answer itself and which to bring you, without guessing.

One limit is worth knowing early. A worker that needs your approval can't get it from the supervisor, because a peer's message isn't your consent. Claude Code's docs say it directly: a message from another session "never counts as your consent, so it can't answer a pending permission prompt on your behalf." When that comes up, the fix is a standing rule from you, asked once, which is exactly what happened at 8:27 PM.

## How do sessions in different harnesses message each other?

On 2026-10-31 every message the supervisor sent to a Claude Code or Codex session went through two built-ins: Claude Code's cross-session messaging, which needs v2.1.224 or later, and Codex CLI's `codex queue`, which shipped in 0.149.0 on 2026-08-20. Everything else traveled through shared files, because a file is the one channel every harness can read and write.

**Claude Code to Claude Code.** Once your sessions are on a recent enough version (v2.1.234 on native Windows), messaging is on with nothing to enable. You don't call the tools yourself. You tell your supervisor, in plain words, "message the film session: draft 3 is in the log, fact-check it, and tell me when you're idle," and Claude finds the session and sends it. A few behaviors from the [cross-session messaging docs](https://code.claude.com/docs/en/cross-session-messaging) matter for supervision:

- A busy session reads the message between tool calls, so a running tool is never interrupted. An idle session starts a new turn with it.
- The supervisor can ask for a one-shot notice when the other session next goes idle. It fires once, works only for sessions on the same machine, needs v2.1.236 or later in both sessions, and lapses after 12 hours.
- The receiving session can reply the same way, so this channel runs in both directions.

**Supervisor to Codex.** `codex queue` sends a message to an existing Codex session by its UUID or exact name:

```bash
codex queue --thread "$PRODUCTION_THREAD" \
  --message "New line in ~/coord/production.log.md at 17:45 UTC: draft 03 is ready for fact check. Read the log; no reply needed here."
```

Keep the message a pointer to the log, not the content. On 2026-10-31 a message queued to an idle thread started it right away, and a message queued to a busy thread waited until its turn ended. Codex's release notes say queued messages wake idle sessions, and its docs describe a message queued from the composer as waiting for the next run. The `codex queue` reference doesn't say how a busy thread handles one, but waiting for the turn to end is what I saw. When something truly can't wait, Codex's Steer adds a message to the turn that's running: press Enter while Codex is working in the CLI, or use Steer in the app.

**Codex to the supervisor** goes through files. A Codex thread appends to its log or the inbox, and the supervisor's watcher wakes it. That asymmetry is the reason the logs exist.

![A two-by-two grid of how a message reaches a worker. A busy Claude Code session reads a SendMessage between tool calls, without interrupting a running tool. An idle Claude Code session starts a new turn when a SendMessage arrives, and the sender can ask for a one-shot notice when it goes idle. A busy Codex thread gets the news from its log, which it re-reads between steps, while a queued message waits for the turn to end. An idle Codex thread gets a queued pointer with codex queue, and Steer is only for urgent cases. Footnotes: the Claude Code rows come from its cross-session messaging docs, version 2.1.224 or later; the Codex busy row is what I observed on 2026-10-31, since the codex queue reference doesn't say when a busy thread receives one.](/assets/guides/supervisor-agent/message-routing.webp "Log first. Push only when the worker is idle or the matter can't wait.")

## Why does every workstream need an append-only log?

At 8:16 PM on 2026-10-31 I asked about the messages in a busy Codex thread's queue. All four the supervisor had sent were stale, because the work they announced had already moved on. A log reaches a busy session in any harness and keeps the history a message loses. An idle Codex thread still needs a push to read it.

So each workstream gets one log file, and every session on it, in any harness, appends to it. The rules are short:

- Append only. Never edit an earlier line, so the log is a record, not a draft.
- One line per entry: a UTC timestamp, who wrote it, what happened, and what's next.
- Every handoff names a path and its SHA-256, so the next session can prove it has the exact file the last one meant.
- Tell busy workers to re-read their log between steps. That's how a working Codex thread picks up news mid-turn.

A few shell helpers make the format hard to get wrong. Every session sources the same file, and all the shared files live in one folder outside any checkout, so every worktree and every harness sees the same copy:

```bash
# coord.sh: source this in every session's shell. One line per append, UTC stamps.
# The folder sits outside any checkout, so every worktree and harness sees the same files.
COORD="${COORD:-$HOME/coord}"; mkdir -p "$COORD"
stamp() { date -u '+%Y-%m-%d %H:%M UTC'; }
sha() { { sha256sum "$1" 2>/dev/null || shasum -a 256 "$1"; } | cut -c1-64; }

# log WORKSTREAM WHO TEXT: append a line to that workstream's log
log() { printf -- '- %s %s: %s\n' "$(stamp)" "$2" "$3" >> "$COORD/$1.log.md"; }

# ask WHO QUESTION NEEDS BLOCKING: put a question in the supervisor inbox
ask() { printf -- '- %s %s: ASK: %s Needs: %s. Blocking: %s.\n' "$(stamp)" "$1" "$2" "$3" "$4" >> "$COORD/inbox.md"; }

# receipt FILE: the path and SHA-256 every handoff carries
receipt() { printf '%s sha256 %s' "$1" "$(sha "$1")"; }
```

A handoff line then looks like this:

```text
- 2026-11-02 17:45 UTC writer: Draft 03 ready for fact check: ~/coord/script-03.json sha256 2da6d7ac8575...d87d. Gate: PASS. Next owner: checker.
```

After that evening the supervisor's rule became log first, and queue a pointer only when the thread is idle or the matter can't wait.

## How do workers ask questions without interrupting you?

On 2026-10-31 I pasted two Codex questions into the supervisor by hand, because each thread had asked in its own prompt box, where the supervisor couldn't see it. At 8:24 PM I made it a rule: workers never prompt me. Every question goes into one append-only inbox file, and the worker keeps working.

An inbox line carries four things: who's asking, the question, what the answer needs (a path or a receipt), and whether the worker is blocked. The `ask` helper above writes it:

```text
- 2026-11-02 17:50 UTC build-round: ASK: May I take over the stalled caption PR? Its owner has been idle 14 hours. Needs: ~/coord/handoffs/captions/RECEIPT.txt. Blocking: no.
```

The supervisor answers with a message to the worker and an answer line that names the ask it closes, so the sweep can tell which asks are still open:

```text
- 2026-11-02 17:57 UTC supervisor: ANSWER to 2026-11-02 17:50 UTC build-round: yes, receipt verified, take it.
```

Most asks never reach you. A worker asking which branch to rebase onto, whether a review finding is real, or whether a receipt checks out gets its answer from the supervisor. The asks only you can answer, like publishing, spend or creative approval, the supervisor holds and batches into one structured question, so you make five decisions in one sitting instead of being pinged five times.

When I set the rule, the supervisor queued it to all four Codex threads, I pressed Steer so they would read it right away, and the supervisor messaged the other Claude session, which already messaged it directly. In the next 52 minutes five questions came in through the inbox from three Codex threads, and the supervisor answered the first three within two minutes each.

## How do you stop two sessions from doing the same work?

At 7:57 PM on 2026-10-31 the supervisor handed a stalled pull request to the build thread, after checking that its previous owner had been idle for more than 14 hours. The receipt held the SHA-256 of the staged patch, so uncommitted work survived the move. A handoff like that only works if ownership is exclusive first.

The simplest exclusive claim is a lock file the operating system creates only when it doesn't already exist:

```python
#!/usr/bin/env python3
"""claim.py ITEM HOLDER: take exclusive ownership of one work item, or refuse."""
import json, os, sys, time

COORD = os.environ.get("COORD", os.path.expanduser("~/coord"))

def claim(item: str, holder: str) -> bool:
    root = os.path.join(COORD, "claims")
    os.makedirs(root, exist_ok=True)
    path = os.path.join(root, f"{item}.lock")
    try:
        # O_CREAT | O_EXCL: the OS creates the file only if it does not exist yet,
        # so two sessions racing for the same item cannot both succeed.
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    except FileExistsError:
        with open(path, encoding="utf-8") as fh:
            print(f"HELD {item}: {fh.read().strip() or '(being written)'}", file=sys.stderr)
        return False
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump({"holder": holder, "since": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, fh)
    return True

if __name__ == "__main__":
    sys.exit(0 if claim(sys.argv[1], sys.argv[2]) else 1)
```

When I started 20 claimers for the same item at once, one exited 0 and 19 exited 1 with `HELD`. A session that gets `HELD` stands down, or writes an ask in the inbox, and never works around the lock.

A lock records who claimed the item, not whether they're still working. Before the supervisor reassigned that pull request, it checked the owner's last activity and found no reviews in flight. Then it wrote the handoff as files the next owner can verify:

```bash
H="$COORD/handoffs/captions"; mkdir -p "$H"
git diff --cached --binary > "$H/staged.patch"
git status --short         > "$H/status.txt"
(cd "$H" && sha256sum staged.patch > RECEIPT.txt)    # macOS: shasum -a 256

# The new owner, in its own checkout, after sourcing coord.sh:
H="$COORD/handoffs/captions"
(cd "$H" && sha256sum -c RECEIPT.txt) && git apply --index "$H/staged.patch"
```

If you want claims with generations, task revisions and safe hand-back, the [Orion PM guide](/guides/coordinate-local-agents-with-orion-pm) covers a fuller version of the same idea.

## How does the supervisor see everything without asking anyone?

On 2026-10-31 my supervisor ran its sweep 17 times between 8:15 AM and 8:32 PM, usually right before deciding what to do next. A sweep is one read-only script that prints each workstream's newest log lines and quiet time, the unanswered asks and the open pull requests, so the supervisor sees everything without sending a message.

A skeleton you can adapt:

```python
#!/usr/bin/env python3
"""sweep.py: one read-only screen of every workstream. It sends no messages."""
import glob, json, os, re, subprocess, time

COORD = os.environ.get("COORD", os.path.expanduser("~/coord"))
now = time.time()

print("== Workstreams (minutes since the last log line)")
for path in sorted(glob.glob(f"{COORD}/*.log.md")):
    lines = [l.rstrip() for l in open(path, encoding="utf-8") if l.strip()]
    quiet = int((now - os.path.getmtime(path)) / 60)
    print(f"{quiet:>5}m  {os.path.basename(path)}{'  QUIET' if quiet >= 45 else ''}")
    for line in lines[-2:]:
        print(f"         {line[:150]}")

print("\n== Unanswered asks")
asks, answered = {}, set()
for line in open(f"{COORD}/inbox.md", encoding="utf-8"):
    if m := re.match(r"- (\S+ \S+ UTC) (\S+): ASK: (.*)", line):
        asks[f"{m[1]} {m[2]}"] = m[3]
    if m := re.match(r"- \S+ \S+ UTC supervisor: ANSWER to (\S+ \S+ UTC \S+):", line):
        answered.add(m[1])
for key, text in asks.items():
    if key not in answered:
        print(f"  {'BLOCKING ' if 'Blocking: yes' in text else ''}{key}: {text[:120]}")

print("\n== Open pull requests")
out = subprocess.run(["gh", "pr", "list", "--json", "number,title,isDraft,mergeStateStatus"],
                     capture_output=True, text=True).stdout or "[]"
for pr in json.loads(out):
    state = "draft" if pr["isDraft"] else pr["mergeStateStatus"].lower()
    print(f"  #{pr['number']:<4} {state:<9} {pr['title'][:70]}")
```

Quiet time in this skeleton comes from the log, so it works the same for every harness. My own sweep takes Codex quiet time from each session's local transcript instead, and doesn't read the inbox yet. That transcript layout isn't documented, so if you copy the idea, treat it as a convenience that can break on an update, and keep the log as the source of truth.

The sweep decides what the supervisor does next, and most of the time the answer is nothing. A `QUIET` flag on a thread that's mid-render is fine. A `BLOCKING` ask or a pull request with failing checks is where it acts.

## How does the supervisor wait without polling?

Between 3:33 PM and 4:58 PM on 2026-10-31 my supervisor armed a fresh file watcher 12 times, a new one each time a handoff it was waiting on landed. A watcher is a small background command that exits the moment a log or the inbox grows, so the supervisor reacts to the change instead of asking "are you done?"

```bash
#!/usr/bin/env bash
# wait-grow.sh FILE...: exit as soon as any file grows, and show its new tail.
# Run it as a background command; its exit is the wake-up.
files=("$@"); sizes=()
for f in "${files[@]}"; do touch "$f"; sizes+=("$(wc -c < "$f")"); done
while sleep 15; do
  for i in "${!files[@]}"; do
    if [ "$(wc -c < "${files[$i]}")" -gt "${sizes[$i]}" ]; then
      echo "grew: ${files[$i]}"; tail -n 3 "${files[$i]}"; exit 0
    fi
  done
done
```

Ask your supervisor to run it in the background over the files it's waiting on, for example `wait-grow.sh ~/coord/inbox.md ~/coord/production.log.md`. When the command exits, Claude Code delivers the background task's result to the session, and the supervisor reads the new lines and acts. Then it arms the next one.

Claude Code has other wait primitives, and each fits a different job:

- **The idle notice** from cross-session messaging, for "tell me when the film session finishes this turn."
- **The [Monitor tool](https://code.claude.com/docs/en/tools-reference)**, which streams events from a running command and has Claude interject when one arrives, for watching a long build or render.
- **[Scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks)** and `/loop`, for fixed-time checks like a 9:00 AM publish or the hourly sweep.

The rule is the same for all of them: wait on an event, and don't poll a session with messages. A "how's it going?" to a busy Codex thread just joins its queue and goes stale there.

## Why should the supervisor verify instead of trusting reports?

On 2026-10-31 a fact check scored a script's style at about 3.9, under the project's limit of 4, by joining its paragraphs with single spaces. The project's own check joins them with blank lines, and on that input the same script scored about 8.2. The recheck found it a draft later. Measure with the enforcing code, on the enforcing input.

Four habits do most of the work:

1. **Path and SHA-256 on every handoff.** "Draft 3 is ready" is a claim. "~/coord/script-03.json sha256 2da6...d87d" is something the next session can check.
2. **Re-measure with the code that enforces the rule.** Call the project's own function on the same input it will see in production. A count from your own reimplementation is a different measurement.
3. **The writer never checks its own work.** On 2026-10-31 the supervisor's writers wrote both scripts, the production thread checked the first film's, and the second Claude session checked the second film's.
4. **One gate that runs every rule before any handoff.** That afternoon and evening three slips got past the checks in place: the style score above, two chapter-ending questions that the supervisor's own voice edit had turned into statements, and an opening question missing a word from the stakes list the production gate looks for. Each was found later, by a different session, after it had already cost a round trip. The first two led the supervisor to write one gate script, and the third got past that script's first version, so the gate gained a rule for it.

The gate is a short script that runs every check, keeps going after a failure, and prints the receipt:

```python
#!/usr/bin/env python3
"""gate.py DRAFT: run every check before a handoff. Exit 0 only when all of them pass."""
import hashlib, subprocess, sys

draft = sys.argv[1]
# Each entry calls the project's own enforcing check, never a copy of it.
CHECKS = [
    ("style score",      ["python3", "-m", "checks.style", draft]),
    ("chapter endings",  ["python3", "-m", "checks.endings", draft]),
    ("required quotes",  ["python3", "-m", "checks.quotes", draft]),
    ("opening question", ["python3", "-m", "checks.hook", draft]),
]
failed = []
for name, cmd in CHECKS:  # run them all, so one failure cannot hide another
    ok = subprocess.run(cmd).returncode == 0
    print(f"{'PASS' if ok else 'FAIL'}  {name}")
    if not ok:
        failed.append(name)
digest = hashlib.sha256(open(draft, "rb").read()).hexdigest()
print(f"{draft} sha256 {digest}")
print("RESULT:", "PASS" if not failed else "FAIL " + ", ".join(failed))
sys.exit(1 if failed else 0)
```

Before you trust a new gate, run it on a draft you know is bad. Mine failed the older drafts that had slipped through and passed their fixed versions, so I knew it could tell them apart.

![The handoff pipeline. A writer session drafts the work and runs gate.py, which runs every rule and exits 0 only if all pass. On a pass, the writer appends a log line with the path and SHA-256, and a checker session, a different session, re-measures with the real code before the next stage: narrate, build or merge. A gate failure loops back to the writer to fix and rerun the whole gate, and the checker's corrections loop back as a new draft with a new SHA-256. A footnote: on 2026-10-31 three slips got past the checks in place, and each was found later by a different session: a style score measured on the wrong paragraph join, two chapter questions edited into statements, and an opening question with no stakes word. The gate grew a rule for each.](/assets/guides/supervisor-agent/handoff-gate.webp "The writer never checks its own work, and no check runs alone.")

## What went wrong, and which rule fixed it?

The 2026-10-31 run produced seven mistakes worth keeping, and each became a standing rule. Most trace back to the supervisor itself: it queued messages a busy thread couldn't read yet, asked me to nudge a session it could message, shipped a CI hook that failed a job, and merged a stacked pull request into the wrong branch.

| What went wrong | The rule it produced |
|---|---|
| Four messages queued to a busy Codex thread were stale before it read them | Log first. Queue a pointer only when the thread is idle or the matter can't wait |
| At 4:17 PM the supervisor said I needed to nudge the other Claude session | The supervisor messages sessions itself. You never relay |
| Three slips got past the checks in place, each a different rule | One gate runs every rule before any handoff |
| Two narration jobs could have started on one GPU at the same moment | Put the jobs in an explicit order, and pass a release message between them |
| A worker needed commit approval, and a peer can't grant yours | Ask the human once, for a standing rule |
| The supervisor's own CI hook failed a job | Find it in the job log, reproduce it, fix it, write it up |
| A stacked pull request merged into its parent branch, not main | The merge script skips any pull request whose base isn't main |

**The nudge.** At 4:17 PM the second Claude session had been idle for half an hour, with a fact-check request waiting in its log, and the supervisor logged that I'd need to nudge it. Thirteen minutes later I asked whether I really had to. It checked, found that peer Claude sessions are messageable, and sent the request itself with an idle notice attached. If your supervisor ever tells you to go poke a session, ask it whether it can message that session itself, and then put the answer in its instructions.

**The GPU.** By late afternoon both films were ready to narrate, on one GPU that a 3D render and a review model loaded by the supervisor's own review runs were already sharing. Each narration job had its own watcher waiting for free memory, so both could have seen the GPU free up at the same instant and started together. The supervisor set the order (the second film first, then the rest of the first film's chapters), held its own review runs, and asked the second Claude session to log a release line when its job finished. At 5:06 PM that line arrived and the supervisor passed the GPU on.

**The commit approval.** At about 8:27 PM the second Claude session said it would stop before committing its next fix. Its rules said to show me a diff and wait for my explicit approval, and it wrote back that a peer request couldn't stand in for that approval. It was right. The supervisor asked me one question, whether to approve its next two changes or set a standing rule, and I picked the standing rule. It recorded my exact answer in the decisions file and passed it on word for word.

**The CI hook.** That afternoon the supervisor had added a job-started hook to the self-hosted runners, to clean up a temp file a secret scanner kept leaving behind. GitHub runs Bash hooks with `-e`, and a non-zero exit fails the job before it starts. That evening a job failed because the hook's `find` hit an item it couldn't delete. By 6:11 PM the supervisor had read the job log, reproduced exit 1 with the old hook under `bash -e` and exit 0 with the fixed one, and added a section to the runner runbook.

## Where should you start?

Start with the pieces my 2026-10-31 run leaned on most, in this order: a decisions file, one log per workstream, the inbox, the sweep, then claims and the gate. The first three are plain text files that take minutes. The last three are small scripts, and each replaces a question you'd otherwise answer by hand.

1. **Write `decisions.md`** with your standing approvals and the list of things that always come to you.
2. **Create one log per workstream** and tell every session to append to it, re-read it between steps, and put a path and SHA-256 on every handoff.
3. **Create `~/coord/inbox.md`** and tell every worker, in every harness, that questions go there and never to you.
4. **Run the sweep** before you message anyone, and let the supervisor run it on a schedule.
5. **Add claims** when two sessions could reach for the same work, and **add the gate** the first time a handoff comes back with a problem a script could have found.

Then open one session and tell it it's the supervisor: it owns coordination, it reads the decisions file before asking you anything, and it messages workers itself.

One step is still manual. When a Codex thread asks in its own prompt box instead of the inbox, the supervisor can't see the question until someone carries it over. The inbox rule moved the questions to where the supervisor can see them, and closing that gap for good is what I'm building next.

Run this for a day and the change shows up in what reaches you. Apart from those few relays, what reached me on 2026-10-31 was decisions, and the sessions kept working between them. Talk to one agent, and make it earn that trust by checking everything it's handed.
