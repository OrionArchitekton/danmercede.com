---
title: "How My OpenAI Dot Starts Real Claude Code Sessions on My PC"
slug: openai-dot-starts-claude-code-sessions
date: 2026-10-07
reviewed: 2026-10-07
category: Agent Engineering
description: "On 2026-10-07 my OpenAI Dot, Orion, turned one short chat message into a real Claude Code session on my Windows PC, and that session drove an Android phone through a Google search. Here is how the start works, the checks that keep it narrow, what it does not limit, and what isn't built yet."
lead: "I sent my Dot one short message. A Claude Code session started on my PC, drove a phone through a Google search, and had its answer about six minutes later. Nothing was typed into my windows, and the same start works with the screen locked. This is how it works, what it guards, what it doesn't, and what's still missing."
---


Orion is my OpenAI Dot: an always-on agent I message from ChatGPT. It lives in the Codex desktop app on my Windows PC, which lets it run commands there. Claude Code is where my engineering runs. I wanted Orion to be able to hand Claude a job without me at the keyboard.

On 2026-10-07 it did. I asked Orion to have Claude use one of my agent phones to Google a question and bring back what Google showed. A real Claude Code session started on my PC, ran the search on the phone, and Orion put the answer in our chat.

This guide walks through what made that work: a small tool I call Remote Hands, built over about ten days, and the checks around it. It covers starting a session. Orion can't yet hold a conversation inside a running session; that is the next piece, and I say so where it matters. The code is linked at the end.

**Who this is for:** anyone who wants an always-on agent (a Dot, a Grok Bot, a scheduler, a phone) to start real coding-agent sessions on their own machine, without handing it a keyboard.

## What did the demo actually prove?

On 2026-10-07 at 2:06 PM Pacific, one chat message to my Dot became a real Claude Code session on my PC, and about six minutes later that session had its answer, which Orion relayed to our chat. In between, the session leased an Android phone, ran a Google search, captured the AI Overview word for word, released the phone, and reported.

What I sent Orion, typos included: "We could demo the right now. I know it'll work. Tell Claude to use phone A to Google search for 'what is OpenAI dot' have report back with the Google ai summary that shows up and you give me back that text." What came back: "It worked: Claude used Phone A, searched Google, expanded the AI Overview and returned the text. Phone A was released afterward."

![The chat with Orion, my OpenAI Dot. I ask it to have Claude use Phone A to Google "what is OpenAI dot" and return the Google AI summary. Orion replies that it will, then reports: it worked, Claude used Phone A, searched Google, expanded the AI Overview and returned the text, and Phone A was released afterward, with a link to the Claude session. It then quotes Google's generated overview, labeled as Google's claims captured at 2:09 PM Pacific, not independently verified facts. Below, I note the demo took a few minutes because it captured more than needed, and Orion suggests asking for the first result's title and link in the live version.](/assets/guides/openai-dot-claude-sessions/orion-chat.webp "The exchange with Orion. The 3:12 PM stamp marks the later follow-up; when Orion relayed the result isn't logged.")

The logs on the PC put times on every hop:

| Time (PT) | What happened |
|---|---|
| 2:05:54 PM | A health check reaches the Remote Hands service |
| 2:06:52 PM | Orion's prompt is written to a file on the PC |
| 2:06:58 PM | The start request reaches the service, which accepts it 2.3 seconds later |
| 2:07:04 PM | Orion's brief arrives as the new session's first message |
| 2:07:43 PM | The session leases the phone |
| 2:09:06 PM | The search is submitted |
| 2:12:03 PM | The phone is released |
| 2:13 PM | The session gives its final report |

Most of those six minutes were the job, not the plumbing. The brief asked for the whole AI Overview, expanded and scrolled, plus every source card. The start itself took seconds. For a live demo I'd ask for the first result's title and link instead.

The brief Orion wrote is worth reading, because it set the session's scope. Its authorization paragraph began:

> Authorization covers this search and browser/device navigation, capturing screenshots and result evidence in a temporary folder. No purchases, account changes, unrelated messages, app installs/modifications, repairs, deployments, board edits, claims, memory writes, publishing or changes to other work.

It also told the session to label the result "Google's generated overview, not independently verified product facts", and, if a sign-in, CAPTCHA, or permission barrier appeared, to "report it without bypassing it." None blocked the search, but something close showed up. Right after Chrome launched, its first-run sign-in page flashed onto the phone screen. The session left it alone, and by the next screenshot Google was showing normally. Its report noted the moment and said plainly: "I don't know why it cleared." Report, don't touch: that's the behavior I want.

![The phone's screen at 2:09 PM: Google search results for "what is OpenAI dot", opening with an AI Overview that begins "OpenAI Dots are always-on, persistent AI agents inside the ChatGPT ecosystem that continue working on multistep tasks even after you close your chat sessions."](/assets/guides/openai-dot-claude-sessions/phone-overview.webp "What the Claude session saw on the phone at 2:09 PM, cropped from its own evidence screenshots. Google's overview, not verified facts.")

## Why not let the Dot click through the desktop?

Because keystrokes are the wrong tool for a start. In tests from 2026-09-29 to 2026-10-07, keyboard input couldn't reach a locked PC, and opening Claude's chat panel with a prompt only pre-fills the box without sending it. A terminal opened by an editor extension works locked or unlocked, stays out of the windows I'm using, and leaves an audit line.

So for starts, Orion never drives my screen. It asks a service for one thing, a new Claude session in a given folder with a given prompt, and the service does it in a way I can audit. Two live checks settled it. Behind the lock screen, a start in an already-open window was ready in 7 seconds and a brand-new window in 17. And in three live checks, a start never typed into a window I was working in.

## How does a start request get from the Dot to a Claude session?

Through four hops on one machine. Orion runs a CLI, the CLI posts to a Windows service that listens only on 127.0.0.1, the service asks a Cursor extension, and the extension opens a terminal running Claude Code. In live checks on 2026-10-05 and 2026-10-06, a start in an open window was ready in 8.2 seconds, and opening a new window took 45.

![The four hops of a Remote Hands start. The Dot checks hands health, writes its prompt to a file, and runs hands start-claude. The CLI sends an HTTP POST with a bearer token to a Windows service listening only on 127.0.0.1. The service checks the allowed folders, the prompt rules, the kill switch and the request id, then asks the Cursor bridge extension for a window with that folder open, opening one only when the PC is locked or idle for 10 seconds. The bridge re-checks the request, trusts the folder only inside allowed roots, and opens a terminal running claude with a session id derived from the request id and remote control on, so the session also shows up in the Claude app.](/assets/guides/openai-dot-claude-sessions/start-hops.webp "Four hops, all on one machine. Every hop checks the request again.")

1. **The Dot runs `hands`.** In the logs, a `hands health` check comes 40 to 90 seconds before each of Orion's starts. Orion writes its prompt to a file, then runs `hands start-claude` with a folder, a request id, and the prompt.
2. **The CLI posts to the service.** One HTTP POST to a Windows service on 127.0.0.1, with a bearer token from a file in the service's state folder. Nothing listens beyond the machine.
3. **The service checks, then asks the bridge.** It runs the checks in the next section, claims the request id in a journal, and asks the Cursor bridge extension for a window with that folder open. If there isn't one, it opens one, but only when the PC is locked or I've been idle for 10 seconds, so it never steals focus while I'm typing.
4. **The bridge opens a terminal.** It re-checks the request, trusts the folder (only inside the allowed roots), reserves the session id, and opens a terminal running:

```bash
claude --session-id <uuid5 of the request id> \
       --remote-control <label> --name <label> -- <prompt>
```

Two details in that line do real work. The session id is derived from the request id, so a replayed request can only ever point at the same session. And `--remote-control` makes the session show up in the Claude app on my phone, so I can watch it or take over.

## What does the start contract guard, and what doesn't it?

It guards the start, not the session. As of 2026-10-07 the service has three actions: a health check, an early typing self-test that only types into its own scratch window, and the one that does real work, starting a Claude session. Both the service and the editor extension check every start. Once the session is running, Claude Code's own permission mode decides what it can do.

What every start is checked against:

- **Allowed folders.** A folder outside the allowed roots is refused. A start request just after midnight on 2026-10-07 hit exactly this: `repo must be inside one of ...`. Folder paths with control characters or `${...}` variable syntax are refused too, because Cursor would substitute the variable.
- **The prompt is never parsed as options.** It always follows `--`, which ends option parsing. That alone isn't enough, so the service also refuses a prompt that starts with `-`, a one-word prompt, and control characters other than tabs and newlines.
- **Once per request id.** The journal claim plus a reservation marker means a replayed request returns the same session id. The live check found one session record and one bridge intent, not two.
- **A kill switch.** `hands off` makes every start fail with `service_off` until it's switched back on.
- **Trust only where allowed.** The bridge pre-trusts a folder for Claude only inside the allowed roots, writes an audit line first, and never overrides a "no" I already gave to Claude's question about importing external CLAUDE.md files.

What it doesn't limit, and I'd rather name it than hide it:

- **The session's reach.** The allowed roots pick where a session starts. They don't fence it in. To the service the prompt is data; to Claude it is an instruction, and the session can do whatever its permission mode allows.
- **The token.** Any process on the PC that can read the token file can start sessions.
- **Your own setup.** A started session runs with your Claude Code config, hooks included. The demo session's last message was about declining two of my own stop hooks, because Orion's brief had ruled out memory writes and unrelated changes.

So if your Claude Code skips permission prompts, the brief is the only scope a started session has. Start with prompts on, and have the calling agent write its scope into the brief anyway, the way Orion did.

## How does the Dot find out what the session did?

Only partly, so far. Claude Code writes each session to a JSON-lines file, and as of 2026-10-07 the read-back command polls that file by session id every 2 seconds for the session's first reply after the prompt, capped at 4,000 characters and treated as untrusted text. That confirms a session took its brief. It doesn't return the final result.

In the demo, the first reply was the session acknowledging its scope, at 2:07:12 PM. I have no log of how Orion collected the final result, so I won't claim a route.

Orion's first real start, on 2026-10-06 at 8:11 PM, shows why "started" and "done" have to stay separate. It told me: "Remote Hands opened a new Cursor window at 8:11 pm with Claude running ... I haven't verified Claude's first reply yet." That's the honesty I want from an agent: it said what it knew, and no more.

## What broke along the way?

Six failures between 2026-09-29 and 2026-10-07 became fixes, and one is still unexplained. Most were Windows and editor behavior: a lock check that lied, a chat panel that can't send, two Claude prompts that stalled unattended sessions, lost log lines, and slow refusals.

- **The lock check lied.** The first probe reported `desktop_locked: false` on a locked PC. It now reads the session's lock flag instead.
- **The chat panel can't send.** Research into the Claude extension showed that opening its chat panel with a prompt only pre-fills the input box; nothing submits it. That's why starts go through a terminal.
- **The trust prompt stalled a session.** A session in a new window sat at Claude's folder-trust question, wrote no session record, and the CLI gave up with `needs_human` after 180 seconds. The bridge now pre-trusts folders, but only inside the allowed roots.
- **The imports prompt stalled another.** "Allow external CLAUDE.md file imports?" held a session the same way. Approval now follows trust, and a "no" I gave earlier is never overridden.
- **Log lines went missing.** Eight writers appending to one file through the Windows file share kept 426 of 3,200 lines. Giving each process its own file kept all 3,200, so every window now writes its own audit file.
- **Refusals were slow.** On Windows, a ping to a closed loopback port takes about 2 seconds to fail, so the ping timeout is 3 seconds. A later fix, made after the demo and not yet installed, narrows when a window counts as gone: only a refused connection or a wrong instance, with anything else treated as busy and nothing sent.
- **Still unexplained.** Orion's 8:11 PM start on 2026-10-06 sat about seven minutes before Claude took its prompt, and Orion never read back after the wait. The cause is unconfirmed.

## What can't it do yet?

As of 2026-10-07, Orion can start a Claude Code session and hand it a brief, and that's all. It can't hold a conversation inside a running session yet. That is the next slice: send a message, read back the reply, repeat. Codex and Grok sessions, approvals, and voice come after that.

Two live checks are still open too: a start when Cursor isn't running at all, and confirming that Claude terminals don't come back on their own after Cursor restarts. I'll update this guide when those land, rather than describe them as working now.

## What should you take from this?

Give the always-on agent a verb, not a keyboard, wherever a verb exists. For starts it does: one checked action (allowed folders, a prompt that can't become options, one submit per request id, a kill switch, a token on loopback) beat screen automation on every axis I measured. It works with the screen locked, stays out of my windows, and leaves an audit trail. The plan for Codex and Grok will need paste and Enter where a harness has no launch route, behind the same checks.

Then remember what the contract doesn't cover. It guards the start, not the session. Decide the permission mode before you point an always-on agent at it, and make the agent write its scope into every brief.

The code is public: [remote-hands](https://github.com/OrionArchitekton/remote-hands), MIT, with 636 Python and 212 bridge tests. It's experimental and does what this guide says: it starts sessions.
