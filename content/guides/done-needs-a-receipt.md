---
title: "'Done' Needs a Receipt: Four Checks Before You Believe an Agent Finished"
slug: done-needs-a-receipt
date: 2026-10-19
reviewed: 2026-10-19
youtube: 3KYZrGal5To
category: Agent Engineering
description: "When an agent says deployed, armed, fixed or verified, that is a claim, not evidence. Four MIT-licensed skills from orion-skills turn each claim into a receipt: output from the system itself, captured after the change, that would read differently if the claim were false."
lead: "An agent ends its turn with a status word: deployed, armed, fixed, verified. The word arrives whether or not anything changed. I stopped accepting it on its own, and now a completion claim either carries a receipt or reads as unproven."
---

It said healthy. Every API call said 502.

On 2026-06-20, a dashboard backend I run showed `Up 9 days (healthy)` in `docker ps`, and the dashboard pages returned 200 with a rendered shell. So a status check and a title check both called it live. But every API route behind those pages was returning 502, and only a real browser render with console capture showed it: 40 errors, all 502.

Agents write the status word as the last step of a plan, and the plan was written before the work ran. So "deployed" often means "I ran the deploy command", and "tests pass" can mean "the tests that are left pass". The agent isn't lying. It's reporting its own narration, and the narration ends on a success word because that's how plans end.

My rule now is short. **A completion word without a receipt beside it is a claim, and I treat it as one.** This guide covers what counts as a receipt, the four claims that most need one, the open-source skills that make an agent bring the receipt without being asked, and what a receipt still doesn't prove.

**Who this is for:** anyone who lets Claude Code, Codex or another coding agent deploy, merge, install hooks, or run verification on their behalf, and then reads the agent's summary to decide what happened.

---

## What makes a piece of output a receipt?

On 2026-07-18 my own test suite went 503 of 503 green over a bug I had diagnosed correctly and then failed to fix. I'd added a fixture that made the normal-day test pass, and the alert it guarded could still never clear. Green read the same with the bug alive, so green wasn't a receipt.

Three independent review passes flagged it. The suite never did, because I had changed what the suite measured.

A receipt has three properties:

1. **The system produced it**, not the agent's prose. A curl status code, a runner's summary line, a hook's own BLOCKED message. A sentence in the agent's final message that says "verified" is not output from anything.
2. **It was captured after the change, in this turn.** A green check from before the last push, or a status from yesterday's handoff, describes a different system.
3. **It would read differently if the claim were false.** This is the property most proxies fail. `/health` returns 200 whether the new code is serving or the old code is, so it can't tell you which one you have.

The third test is the one I run in my head: imagine the claim is false, and ask whether this output would change. If it wouldn't, it's a proxy.

| Claim | Proxy (reads the same either way) | Receipt |
|---|---|---|
| "Deployed" | deploy exited 0, container healthy, `/health` 200, PR merged | running build SHA equals the merge SHA; the declared route answers; the failing case now succeeds |
| "Tests pass" | "all green" in the summary | the runner's own count line, compared with the count on `main`, plus a diff of the test files |
| "The gate is armed" | hook installed, CI green, monitor OK | the gate blocking a planted violation, in its own output |
| "It's still broken" / "it landed" | the handoff note, the local checkout | the failing case reproduced now; `origin` after a fresh `git fetch` |
| "Verified by the reviewers" | the summary flag, the verdict count | completed reads per claim, with pending claims named |

The "tests pass" row deserves one more line, because it's the claim where the cheapest proxy hides the worst failure. If an agent deletes or skips the failing test, the run really is green. Two commands show it:

```bash
# test files deleted on this branch since it left main
git diff --diff-filter=D --name-only main...HEAD -- tests/

# skip or focus markers added on this branch
git diff main...HEAD -- tests/ | grep -nE '^\+.*(skip|xfail|\.only\()'
```

The three dots matter. `main...HEAD` compares the branch with the point where it left `main`, so a test added on `main` since then doesn't show up as "deleted on this branch".

And the runner's collected count is part of the receipt. If `main` collects 212 tests and the branch collects 211, the word "green" leaves out the one that matters.

## Why isn't green CI and a healthy container proof of "deployed"?

In June 2026 I found a merged feature that had done nothing in production for about two months. The running image had been built before the merge and never rebuilt, so the repo had the code and the server didn't. Rebuilding the image, with zero code changes, fixed it on 2026-06-18.

The PR was merged, and the service kept answering the whole time, with the old code. Both were true statements about the wrong thing.

The `prove-deploy-is-live` skill asks for three proofs, and none of them substitutes for another:

1. **Version identity.** The running artifact is the new build. Compare a baked build SHA, a `/version` route or the running image digest against the merge commit, not against "the PR merged".
2. **The real route serves.** Probe the route users actually hit, never `/health` and never a bare `/`. By HTTP class, 2xx, 3xx, 401, 403, 405 and 429 mean the app answered; 404, 5xx and a refused connection count as a regression. For a worker or a queue consumer, "serves" means a real item went in and came out the other end.
3. **The behavior is correct end to end.** Rerun the case that was failing and watch it succeed. For a single-page app, that means rendering it and reading the console and the data calls, because the shell can return 200 while every API call behind it fails.

![Two rows. The top row shows four amber proxy signals: deploy exited 0, container healthy, /health returns 200, PR merged. The bottom row shows three green receipts joined by arrows: version identity, real route serves, behavior end to end, each with the failure it rules out.](/assets/guides/done-needs-a-receipt/deploy-proxies-vs-receipts.webp "Proxies are necessary at most. Each receipt rules out a failure the proxies can't see.")

In shell, the first two are a few lines, run from a clone of the repo. The names here are placeholders for your own service:

```bash
# 1. Version identity: the running build contains the merge commit
git fetch -q origin
merge_sha=$(gh pr view 123 --json mergeCommit -q .mergeCommit.oid)
running_sha=$(curl -s https://app.example.com/version)
if git merge-base --is-ancestor "$merge_sha" "$running_sha"; then
  echo "VERSION OK: $running_sha contains the merge"
else
  echo "STALE: running $running_sha"
fi

# 2. The declared route answers (never /health)
curl -s -o /dev/null -w 'route %{http_code}\n' https://app.example.com/api/orders
```

If you can't run one of the proofs, the honest status is "wired but unproven". That phrase does a lot of work in my sessions. It tells me exactly which check is missing, and it stops a half-proven deploy from being filed as done.

## How do you know a gate is armed and not just quiet?

On 2026-10-19 I staged a fake GitHub token in a scratch repo whose pre-commit hook blocks tokens. The commit went through with exit 0, and a secret scanner printed "no leaks found". Two controls were installed and both looked green. Neither had stopped anything, and the reason was different for each.

Green has two causes: nothing to catch, or catching nothing. The `prove-control-binds` skill exists to tell them apart, and its whole method is to plant a violation and watch the control fire from its own output. These are the runs from that scratch repo, with git 2.43.0 and gitleaks 8.24.3:

| Run | What I staged | What happened |
|---|---|---|
| 1 | `ghp_` followed by 36 copies of the letter `a`, local hook in `.git/hooks` | committed, exit 0, "no leaks found" |
| 2 | `ghp_` followed by 36 random letters and digits | blocked by the scanner, exit 1 |
| 3 | same random token, with `-c core.hooksPath=.git/hooks` | blocked by my local hook, exit 1 |

Two separate things were wrong in run 1.

**My hook was dead code.** My global git config sets `core.hooksPath`, so git looks for hooks in that directory and never in the repo's `.git/hooks`. The hook I wrote was installed, executable and correct, and git never ran it. The scanner output came from a different hook entirely. If I hadn't read whose message it was, I'd have credited my own hook.

**The canary looked fake, and the scanner agreed.** With its default rules, gitleaks passed a token made of one repeated letter. It also passed `ghp_` plus the alphabet in order, which has plenty of entropy, so I'm reporting what it did rather than guessing at why. A random token was blocked at once. A canary has to look like the real thing, assembled from random characters at run time so the full token string never sits in a file, or the control's silence tells you nothing.

The skill keeps a table of the silent no-op shapes. These are the ones I see most:

| Shape | How it stays green |
|---|---|
| Shadowed hook | a global `core.hooksPath` makes `.git/hooks/*` dead code |
| Empty pathspec | a pathspec that matches no files scans nothing and passes |
| Subset CI | the required check runs a fixed file list, so new tests never gate |
| Vacuous skip | a conditional skip lets the gate pass without running |
| Aged-out monitor | the monitor shows OK after its producer stopped reporting |
| Reaper alibi | the cleanup job exits green having removed nothing |

Review checks are gates too, and they fail the same way. On 2026-09-19 one of my pull requests showed six checks, all green or passing, and no line-by-line review had happened. One review bot's plan only writes a summary. A cloud integration had hit its usage limit. The two checks that were genuinely green were a secret scan and a build, and neither is a review. Behind them, two review passes timed out, and two engines refuse diffs over 200,000 characters (this one was 300,874). The green checks hid all of it, and each engine's own log or comment said so.

The receipt for "armed" is the canary command and the control's own blocking output, recorded where the next person will look. For "reviewed", it's each reviewer's own log. Without those, "armed" means "installed" and "reviewed" means "a check ran".

## Why re-check a claim the last session made?

On 2026-06-25 I concluded that a site migration had only half landed, on four separate signals: old links, a missing runbook, missing sitemap entries and a PR that looked unmerged. All four were false. My checkout of this site's repo was 8 commits behind, and one `git fetch` flipped every signal.

Even `git show origin/main:<file>` agreed with the wrong answer, because my local copy of `origin/main` predated the merge. A handoff note, a teammate's diagnosis and your own memory of yesterday all fail the same way: true when written, and possibly false now.

I hit a small version of this while writing the guide. My notes said this site's single-page app returned HTTP 200 for a guide that doesn't exist, a classic soft 404, and I was about to use it as the example. I probed it first. On 2026-10-19, a missing `/guides/` page returns a real 404; a fix in late September replaced the catch-all rewrite. The trap is still common on single-page apps, but my note about my own site was stale.

The `reprobe-stale-premise` skill treats any claim you didn't verify this session as a hypothesis, and gives each kind its own probe:

- **"It's still broken."** Rerun the failing case now. If it no longer reproduces, report `ALREADY-FIXED (checked: <command>)` and stop. Don't invent a fix for a bug that's gone.
- **"Tool X doesn't exist."** Search by concept and by alias, not only by name. Report `ABSENT (checked: <command>)`, never a silent absence.
- **"Did the PR land?"** Run `git fetch origin` first. Without it, `git show origin/main:<file>` reads your local copy of the remote, which can be days old. Then confirm with `gh pr view <n> --json state,mergedAt`. The remote is the truth and the clone is a cache.
- **"It merged, so it's out."** Merged isn't deployed. Go back to the three proofs.

The status words in those bullets are the receipt format. `ALREADY-FIXED (checked: ...)` carries its own evidence, so the next reader can rerun it instead of trusting it.

## What did a panel of verifier agents actually verify?

On 2026-06-29 a 105-agent research run hit rate limits in its verify stage. No verifier managed to vote on 25 useful sources, and the run's tooling recorded each 0-0 vote as "refuted", so the run's summary would have thrown all 25 away. They hadn't been refuted. A rate limit returns a default, not a judgment.

Fan-outs fail in a specific way. A verifier that hits a rate limit or a timeout still returns something, and the something is often its default verdict. So a throttled panel can report "all refuted", and a dead skeptic can report "survived the skeptic". Both read as confident results.

The `triage-fanout-verdicts` skill reads the mechanism fields before the verdict fields: how many reads each verifier completed, what errors it logged, and whether it said it couldn't decide. It ships a small script that re-buckets every claim from those fields and ignores the aggregator's summary flag. I fed it a four-claim sample shaped like a throttled run, where every claim said "refuted" and the summary said `all_refuted: true`:

```bash
python3 skills/triage-fanout-verdicts/scripts/triage_verdicts.py verify.json
```

```text
BLOCKING: 3/4 claims are PENDING (abstention/infra-failure is not a verdict); re-verify before any decision they are load-bearing for.
{
  "total": 4,
  "buckets": {
    "CONFIRMED": [],
    "REFUTED": [
      "c1"
    ],
    "PENDING_INFRA": [
      "c2",
      "c3"
    ],
    "PENDING_ABSTAIN": [
      "c4"
    ]
  },
  "pending": 3,
  "clean": false
}
```

It exits 3 when anything is pending, so a script or an agent loop can gate on it. Only c1 was refuted from completed reads. c2 and c3 had none (a 429 and a timeout), and c4's verifier read two sources, then said it couldn't decide. A pending claim gets re-verified by a different route, never rounded to a verdict. I wrote up the gate design behind this in [Self-Correcting Agents: Learning the Loop the Hard Way](/guides/verifier-abstention-not-refutation).

## How do you make the agent bring the receipt without being asked?

`prove-deploy-is-live`, `prove-control-binds`, `reprobe-stale-premise` and `triage-fanout-verdicts` ship in [orion-skills](https://github.com/OrionArchitekton/orion-skills) v0.6.0 (2026-09-28), MIT licensed, alongside 23 others. Claude Code loads skills from `~/.claude/skills/`, so a copy is the whole install, and a short project rule carries the same demand into every turn, not only the turns where a skill's description happens to match.

```bash
git clone --branch v0.6.0 https://github.com/OrionArchitekton/orion-skills
cd orion-skills
mkdir -p ~/.claude/skills
for s in prove-deploy-is-live prove-control-binds \
         reprobe-stale-premise triage-fanout-verdicts; do
  cp -r "skills/$s" ~/.claude/skills/
done
```

The repo README also covers the `skills` CLI and Codex installs. Each skill's description names the moment it applies (`prove-deploy-is-live`, for one, triggers when the agent is about to declare a deploy live), so the agent loads it when it's about to make the claim.

The `mkdir -p` line isn't decoration. Without it, on a machine with no `~/.claude/skills` yet, the first `cp -r` creates that directory as a copy of the skill, so one skill's files land loose in `~/.claude/skills/`, and nothing reports an error.

Skills fire on a match, though, and I want the rule on every turn. So I also keep a short block in the project instructions file the agent reads at the start of a session (`CLAUDE.md` or `AGENTS.md`):

```markdown
## Completion claims
- Never write "deployed", "live", "fixed", "armed", "passing" or "verified"
  without the command you ran and its output beside it.
- If you could not run the proof, write "wired but unproven" and name the
  missing check.
- A claim from a handoff, a teammate or an earlier session is a hypothesis.
  Re-probe it before acting on it.
- A verifier that timed out, was rate limited or abstained has not voted.
- Report status as one of: LIVE, WIRED-UNPROVEN, ALREADY-FIXED (checked: ...),
  ABSENT (checked: ...), PENDING.
```

That gives every summary a small, fixed vocabulary:

| Status | Means |
|---|---|
| `LIVE` | all three deploy proofs ran this turn, output attached |
| `WIRED-UNPROVEN` | changed, but at least one proof didn't run; the missing one is named |
| `ALREADY-FIXED (checked: ...)` | the inherited bug no longer reproduces |
| `ABSENT (checked: ...)` | searched by concept and alias, not found |
| `PENDING` | a verifier didn't complete; not a verdict either way |

## What does a receipt not prove?

On 2026-06-20 a dashboard's pages returned a real 200, captured live from the system itself, while every API call behind them failed. That 200 was a receipt, and it proved the page shell loaded, which was never in question. A receipt proves one observation at one moment, and it's only as good as the question you pointed it at.

So three limits are worth stating plainly.

**The receipt can point at the wrong thing.** A 200 from the wrong route is a convincing receipt for a claim you didn't make. The skills push you toward the declared route and the original failing case for exactly this reason, but choosing them is still your call.

**The agent can't author its own receipt.** Output pasted into the agent's prose is prose. The receipt is a tool result in the session record, from a command that queried the system. Read the command as well as its output, because `echo "VERSION OK"` is a tool call too.

**Proof has a cost, so scale it to the blast radius.** A local refactor needs the test count and the test-file diff, not three deploy proofs. A production cutover needs all three, for every service it touched. Each skill's "when not to use" note keeps it to its own claim (`prove-deploy-is-live` is for after a deploy, not for a local change), so the heavy proofs only show up where the claim calls for them.

The words I trust least in an agent's final message are done, live and verified. They still show up, and now each one arrives with the command that earned it, or it says unproven and names what's missing.
