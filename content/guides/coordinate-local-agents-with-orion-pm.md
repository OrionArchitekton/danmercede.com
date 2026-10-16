---
title: "Coordinate two local agents with Orion PM"
slug: coordinate-local-agents-with-orion-pm
date: 2026-10-15
reviewed: 2026-10-15
category: Agent Engineering
description: "A practical Orion PM tutorial: run two workers against one local task store, retain claim generations and revisions, attach evidence, and hand unfinished work back safely."
lead: "Two agents can read the same task list and both decide to start. Orion PM adds an exclusive claim, a generation that changes on reacquisition, and a revision for the task each worker observed. This guide follows those handles through a complete local workflow."
---

Separate chats do not create separate ownership. Two agents can read the same task list, decide the work is available, and both begin editing. A status field that says `in_progress` tells you what the record says. It does not tell you which worker can still change it.

**Orion PM** is a small, local coordination CLI for cooperating agents. A worker claims a task before doing the work, keeps the exact claim generation and task revision, and uses those handles to attach evidence, finish, or hand the task back. A later worker receives a different generation, even when it reuses the same holder name.

The core uses only the Python standard library at runtime and is prepared under MIT. The [Works overview](/works/orion-pm/) gives the short explanation. Download the v0.1.1 wheel and matching `SHA256SUMS` from the [GitHub release](https://github.com/OrionArchitekton/orion-pm-oss/releases/tag/v0.1.1). The [orion-pm-oss source](https://github.com/OrionArchitekton/orion-pm-oss) includes the core contract, examples and local-store runbook. You do not need a hosted PM service or a package-index download.

## Three owners, three different jobs

A **task claim** coordinates which cooperating worker owns a piece of work. A **resource lease** coordinates a browser, phone, or another tool's resource. **Permission** determines whether an action such as publishing, deploying, merging, spending, or using an account is allowed.

![Two workers compete for one PM task claim; the winner separately uses a native resource lease and follows the caller's action permissions.](/assets/guides/orion-pm/ownership-boundaries.webp "PM coordinates the task. Each tool keeps its resource lease. The caller retains the action-permission boundary.")

PM does the first job. It does not replace the other two. Finishing a PM task does not approve a deployment. Releasing a PM task does not close Chrome. An expired claim does not stop a process that is still running.

That separation keeps the core useful on its own and lets it fit into a larger system later. A command-line coding agent, a browser workflow, or a supervised desktop tool can use the same PM interface without adopting a shared daemon or a new permissions broker.

## Start in an isolated local folder

The observed support row is CPython 3.11.14 on WSL2 Linux with ext4. The package accepts Python 3.11+, but other interpreter and operating-system combinations need their own installed-artifact validation. Native Windows/macOS, network or synchronized storage, cross-host fencing, and hostile processes running as the same OS user are outside the established support boundary.

Place the reviewed `orion_pm-0.1.1-py3-none-any.whl` and its matching `SHA256SUMS` in an empty working folder. The first commands check the manifest against the recorded v0.1.1 digest, select its exact wheel entry, and verify the wheel bytes. A missing wheel entry or failed check stops the install before creating the environment. The check must report the wheel as `OK`; pip checks that selected digest again during installation. A version label alone does not identify the artifact bytes.

Run the following commands in one shell, from that folder:

```bash
umask 077
printf '%s\n' '1aa321ef138359e8fe6cff11d9ed43c3950ca559a5bda91e854144a4908be92b  SHA256SUMS' | sha256sum --strict --check - &&
awk '$2 == "orion_pm-0.1.1-py3-none-any.whl" {print; found=1} END {exit !found}' SHA256SUMS > wheel.sha256 &&
sha256sum --strict --check wheel.sha256 &&
awk '{print "./" $2 " --hash=sha256:" $1}' wheel.sha256 > wheel.requirements &&
python3 -m venv .venv &&
.venv/bin/python -m pip install --no-index --no-deps --require-hashes -r wheel.requirements
export PM_DEMO_HOME="$(mktemp -d)/pm-store"
pm() { .venv/bin/orion-pm --json --home "$PM_DEMO_HOME" "$@"; }
pm version
```

The virtual environment prevents the example from replacing another `orion-pm` command. The temporary absolute store path keeps synthetic work separate from an existing board. The shell function puts global options before the subcommand, which is part of this CLI's argument contract.

`version` reports the package version, API version, store-format version, and capabilities. A caller should check the capabilities it needs before mutating anything. The initial contract is API 1 and store format 1. Request IDs correlate calls; they do not make repeated mutations idempotent.

Create a neutral project configuration and initialize the store:

```bash
cat > projects.json <<'JSON'
{"schema_version":1,"projects":[{"id":"sample"}]}
JSON
pm init --projects projects.json
pm add --id draft-guide --title "Prepare a local guide example" --project sample --status todo
pm probe draft-guide
```

Initialization is explicit. The core refuses legacy or unmarked stores rather than silently importing them. Without an explicit store, it uses `$XDG_DATA_HOME/orion-pm` or `~/.local/share/orion-pm`. The explicit `--home` takes precedence over `ORION_PM_HOME`.

Probe before starting overlapping work. `clear` and `matches` describe coverage; inspect the returned matches and claim classifications. An unknown result is not a clear board. A live holder means coordinate with that worker rather than starting a competing edit. The atomic claim below remains the final ownership decision because the world can change after a probe.

## Let two workers compete

This small Python launcher starts two separate installed CLI processes together. It uses two threads only to release the subprocess calls from the same barrier. The workers share the store and task ID; each has its own holder name.

```bash
.venv/bin/python - <<'PY'
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import threading

executable = str(Path('.venv/bin/orion-pm').resolve())
barrier = threading.Barrier(2)

def claim(holder):
    barrier.wait()
    process = subprocess.run(
        [executable, '--json', '--home', os.environ['PM_DEMO_HOME'],
         'claim', 'draft-guide', '--holder', holder],
        capture_output=True, text=True, timeout=10,
    )
    return process.returncode, json.loads(process.stdout)

with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(claim, ['agent-a', 'agent-b']))
assert sorted(code for code, _ in results) == [0, 3], results
winner = next(reply for code, reply in results if code == 0)
loser = next(reply for code, reply in results if code == 3)
assert winner['ok'] is True and winner['data']['claim']['state'] == 'live'
assert loser['ok'] is False and loser['error']['code'] in ('held', 'not_claimable')
Path('winner.json').write_text(json.dumps(winner) + '\n')
print('winner:', winner['data']['claim']['holder'])
print('loser:', loser['error']['code'], '(exit 3)')
PY
```

Either holder may win. Exactly one receives a live claim in this controlled example; the other gets exit 3. The error can be `not_claimable` once the winner has promoted the task to progress, or `held` for a present claim on a claimable task. The losing worker must make no work or resource call. It cannot treat a busy claim as permission to create a second task for the same outcome.

The core uses exclusive local acquisition and serializes task/claim mutations on the supported filesystem. These are coordination guarantees for cooperating clients, not protection against another process bypassing the CLI or against a worker running on another host.

Inspect the result and retain the handles:

```bash
pm show draft-guide
HOLDER=$(.venv/bin/python -c 'import json; print(json.load(open("winner.json"))["data"]["claim"]["holder"])')
GENERATION=$(.venv/bin/python -c 'import json; print(json.load(open("winner.json"))["data"]["claim"]["generation"])')
REVISION=$(.venv/bin/python -c 'import json; print(json.load(open("winner.json"))["data"]["task"]["revision"])')
pm renew draft-guide --holder "$HOLDER" --generation "$GENERATION"
```

The **holder** is a session label. The **generation** identifies this acquisition. The **revision** identifies the task content that the worker observed. Keep all three, along with the task and store identity. Knowing only a task ID or holder name is insufficient.

Renew before the claim expires during long work. The default claim window is four hours; `--ttl-hours` accepts an integer from 1 to 24. This tutorial does not change the host clock or wait for expiry. An expired worker cannot renew or complete through its old handle.

## Attach evidence, then complete

For a synthetic local example, create a small result file and a scoped evidence record. The artifact hash binds its bytes. The evidence tells a reader exactly what was observed; it does not claim a deployment, a browser action, or an approved publication.

```bash
printf 'Synthetic local guide result.\n' > result.txt
.venv/bin/python - <<'PY'
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

evidence = {
    'id': 'local-guide-result',
    'source': 'tutorial-worker',
    'artifact': 'sha256:' + hashlib.sha256(Path('result.txt').read_bytes()).hexdigest(),
    'observed_at': datetime.now(timezone.utc).isoformat(),
    'scope': 'Created and hashed the synthetic local result.txt file.',
    'ref': 'artifact:result.txt',
}
Path('evidence.json').write_text(json.dumps(evidence) + '\n')
PY
pm evidence attach draft-guide --input evidence.json --holder "$HOLDER" --generation "$GENERATION" --expect-revision "$REVISION" > attached.json
REVISION=$(.venv/bin/python -c 'import json; print(json.load(open("attached.json"))["data"]["task"]["revision"])')
pm transition draft-guide done --holder "$HOLDER" --generation "$GENERATION" --expect-revision "$REVISION"
pm show draft-guide > completed.json
.venv/bin/python - <<'PY'
import json
reply = json.load(open('completed.json'))
assert reply['data']['task']['status'] == 'done'
assert reply['data']['claim']['state'] == 'absent'
assert reply['data']['task']['evidence'][0]['id'] == 'local-guide-result'
print('Observed done, no claim, and the scoped evidence reference.')
PY
```

Attaching evidence changes the task revision, so the completion uses the new revision returned by that command. Reusing the older revision should fail instead of overwriting another observed change. Completing the task clears the claim; the final `show` establishes the persisted result rather than relying only on the mutation's response.

The event log is a separate convenience surface. It is bounded, best effort, and non-authoritative. Event timestamps describe completed-operation observations, not an exact serialization journal. Use the task and validated claim for ownership and durable state; do not build an undo or approval system on PM events.

## Hand unfinished work back safely

An interrupted worker should not mark work done just to clear its claim. `release` returns unfinished `in_progress` work to `todo` and removes that exact claim. It does not stop the worker or release resources in other tools.

This example releases a task, reclaims it with the same holder name, and proves that the old generation cannot renew the replacement:

```bash
pm add --id handoff-example --title "Unfinished work to hand back" --project sample --status todo
pm claim handoff-example --holder agent-a > first-claim.json
OLD_GENERATION=$(.venv/bin/python -c 'import json; print(json.load(open("first-claim.json"))["data"]["claim"]["generation"])')
FIRST_REVISION=$(.venv/bin/python -c 'import json; print(json.load(open("first-claim.json"))["data"]["task"]["revision"])')
pm release handoff-example --holder agent-a --generation "$OLD_GENERATION" --expect-revision "$FIRST_REVISION"
pm claim handoff-example --holder agent-a > second-claim.json
if pm renew handoff-example --holder agent-a --generation "$OLD_GENERATION" > stale-result.json; then
  printf 'Unexpected stale-handle success. Stop and inspect.\n' >&2
  exit 1
else
  .venv/bin/python - <<'PY'
import json
reply = json.load(open('stale-result.json'))
assert reply['ok'] is False and reply['error']['code'] == 'stale_claim'
print('Old generation refused; the replacement claim stays intact.')
PY
fi
NEW_GENERATION=$(.venv/bin/python -c 'import json; print(json.load(open("second-claim.json"))["data"]["claim"]["generation"])')
SECOND_REVISION=$(.venv/bin/python -c 'import json; print(json.load(open("second-claim.json"))["data"]["task"]["revision"])')
pm release handoff-example --holder agent-a --generation "$NEW_GENERATION" --expect-revision "$SECOND_REVISION"
pm show handoff-example
```

The holder string is identical across both acquisitions. The generation is different. This is why a delayed process holding yesterday's arguments cannot mutate today's replacement claim through the supported interface.

After an unexpected termination, begin with read commands:

```bash
pm overdue
pm triage handoff-example
pm audit
pm surface
```

Triage is report-only. Takeover requires the exact observed generation, expiry and task revision, plus an explicit reason; it is not a universal force operation. A task that is in progress with a verifiably absent claim has a separate explicit recovery path. Unknown or corrupted authority calls for offline containment and inspection, not blanket claim deletion or a hand-edited status.

A maintenance-admission lease can prevent new claims while existing holders drain. It is a distinct lease from a task claim. Existing holders retain their own exact handles; maintenance does not turn the board into execution authority.

## Compose a browser workflow without merging the contracts

Browser use is optional. It needs the separately installed browser tool, its documented system prerequisites, and a task that actually calls for it. PM installation does not create browser profiles, install a service, sign in, or give the worker permission to use an account.

The composition order is:

1. Probe and acquire the PM task through the installed CLI.
2. Only the winner acquires the browser's native lease with a unique native holder.
3. Attach a driver to the returned endpoint and observe the requested result.
4. Release the browser through its own interface and establish cleanup.
5. Attach narrowly scoped PM evidence, complete with current guards, and read back.

The private PM core 0.1.0 candidate check observed that sequence using the released orion-browser 0.1.0 wheel, agent-browser 0.25.4, Chrome 155.0.8059.39, and an empty anonymous profile on the tested Linux host. The page was `https://example.com/`; the result was its `Example Domain` title. The losing PM process made zero native browser calls. The winning process completed after a clean native release, and cleanup checks found no remaining profile process or live endpoint.

That proves one synthetic read, not signed-in platform workflows or other tool versions. The source package's browser composition note and starter example define the caller-supplied adapter seam. The Python callback names are example-local, not new browser API commands.

Timeouts and unreadable responses remain unknown. Do not repeat an external action merely because its caller failed to receive a result. Reconcile the task and the native resource separately. A request ID, claim generation, or evidence record is not an approval token or a general duplicate-send guard.

## Keep state ownership clear when you upgrade

Normal core operations are local and offline. Optional future integrations do not change that default. Installing the wheel modifies the chosen Python environment; it does not enable hooks, schedulers, observers, recurring work, or legacy-store migration.

Before a backup or upgrade, drain or stop writers and reconcile their native resources. Keep an owner-private offline backup bound to the package and store-format version. A live copied claim is not transferable ownership. Restore compatible task/configuration state into a separate inactive store, establish empty claim authority, audit it, and use sanctioned recovery before admitting work.

Uninstalling the package leaves user state for deliberate retention. Keep the previous artifact and a known-compatible backup if rollback might be needed. Never run two restored copies as one cross-host coordination domain.

At the end of this tutorial, `draft-guide` is done with an absent claim, and `handoff-example` is todo with an absent claim. The temporary store and local receipts are synthetic. Retain or remove that exact tutorial folder and store deliberately; do not run a broad cleanup against another board.

To connect another agent, use the installed JSON interface, retain its claim and revision handles, and read back the final task state. Keep browser lifecycle, request delivery, and action permission in the tool or caller that owns them.
