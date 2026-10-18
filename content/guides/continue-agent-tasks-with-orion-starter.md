---
title: Continue a local agent task with PM, browser and Handoff
slug: continue-agent-tasks-with-orion-starter
date: 2026-10-17
reviewed: 2026-10-17
category: Agent systems
description: Run a local two-worker continuity example with independent task claims, exact context selection and native browser leases.
lead: One worker can leave observed context for another. The next worker still needs its own task claim, browser lease and current evidence before finishing.
---

A useful handoff preserves context without pretending to transfer ownership. The producer records what it observed and leaves the task unfinished. The consumer checks that exact record, obtains new handles, and independently verifies the result.

The [Orion starter preview](https://github.com/OrionArchitekton/orion-starter/releases/tag/v0.2.0-rc.1) puts three independently usable components into one reproducible local recipe:

| Component | Owns | Does not establish |
|---|---|---|
| [Orion PM](/works/orion-pm/) 0.1.1 | Task state, claim generations and guarded transitions | Permission to act or ownership of a browser |
| [Orion browser](/works/orion-browser/) 0.1.0 | A selected native browser's resource lifecycle | PM task ownership |
| [Orion Handoff](/works/orion-handoff/) 0.1.0 | Immutable context revisions and explicit pickup | Current evidence or execution authority |

This is a **0.2.0-rc.1 preview**, demonstrated with ordinary cooperating processes on CPython 3.11, WSL2 Linux x86_64, ext4 and a systemd user manager. It does not establish native Windows/macOS, cross-host fencing, account access or Claude/Codex/Grok/Dot hook support. A successful author-operated demo does not establish stable newcomer onboarding.

## Download and install the selected combination

Download `orion-starter-0.2.0-rc.1.zip` from the release above. The external release-verification receipt describes the exact archive and the scope of its native checks. Start in your download directory:

```bash
set -euo pipefail
printf '%s  %s\n' \
  '5858b935014443c1ad98100a60fa80da6518e2d0a3b10f5448a3e50110963b48' \
  'orion-starter-0.2.0-rc.1.zip' | sha256sum -c -
unzip orion-starter-0.2.0-rc.1.zip
cd orion-starter-0.2.0-rc.1
```

The continuity profile adds Handoff through its own complete dependency lock. The original PM/browser profile remains available. Install the profile from the extracted root:

```bash
set -euo pipefail
python3.11 -m venv .venv
.venv/bin/python -m pip install --require-hashes --force-reinstall -r bootstrap-requirements.txt
.venv/bin/python -m pip install --require-hashes -r profiles/continuity/requirements.lock
npm ci --prefix driver
python3 scripts/check_profile.py
.venv/bin/orion-pm --json version
.venv/bin/orion-handoff --json --version
.venv/bin/orion-browser --version
driver/node_modules/.bin/agent-browser --version
```

Chrome and browser system packages are explicit prerequisites under their own licenses. Use the browser release's setup documentation. Installation above does not create a store, start a browser, edit harness settings or sign in to an account.

## Create isolated synthetic state

Use a shell without inherited browser or navigation-client overrides. Choose a free X screen from 10 through 99; the block below uses 84 and refuses a collision rather than selecting another resource. The task and context stores stay separate, outside source control. A setup failure is a reason to inspect the new directory, not rerun initialization over it.

```bash
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"
test -S "$XDG_RUNTIME_DIR/bus"
systemctl --user is-active default.target
DEMO_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/starter-continuity.XXXXXXXX")
export DEMO_ROOT
export DEMO_SCREEN=84
.venv/bin/python - <<'PY'
from pathlib import Path
import hashlib, json, os, socket, subprocess, uuid
def check(condition, reason):
    if not condition:
        raise SystemExit(reason)
root = Path(os.environ['DEMO_ROOT']).resolve()
check(root.is_dir() and not list(root.iterdir()), 'workspace_not_empty')
check(not any(k.startswith(('ORION_BROWSER_', 'AGENT_BROWSER_')) for k in os.environ), 'inherited_browser_override')
screen = int(os.environ['DEMO_SCREEN'])
check(10 <= screen <= 99, 'screen_range')
check(not Path(f'/tmp/.X{screen}-lock').exists(), 'screen_lock_exists')
check(not Path(f'/tmp/.X11-unix/X{screen}').exists(), 'screen_socket_exists')
for port in (5900 + screen, 6080 + screen):
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', port))
candidate = Path.cwd().resolve()
binary = candidate / '.venv/bin'
def save(path, value):
    path.write_text(json.dumps(value) + '\n')
    path.chmod(0o600)
def call(argv):
    result = subprocess.run(list(map(str, argv)), check=True, capture_output=True, text=True)
    value = json.loads(result.stdout)
    check(value['ok'] is True, 'component_setup_refused')
    return value['data']
save(root / 'projects.json', {'schema_version': 1, 'projects': [{'id': 'sample'}]})
pm = [binary / 'orion-pm', '--json', '--home', root / 'pm']
call([*pm, 'init', '--projects', root / 'projects.json'])
task = call([*pm, 'add', '--id', 'continuity-demo', '--title', 'Read the synthetic page twice',
             '--project', 'sample', '--status', 'todo'])
call([binary / 'orion-handoff', '--store', root / 'handoff', '--json', 'init'])
config = ('[paths]\nstate = ' + json.dumps(str(root / 'browser-state')) +
          '\nprofiles = ' + json.dumps(str(root / 'browser-profiles')) +
          '\n[[browser]]\nname = "contdemo"\nscreen = ' + str(screen) + '\nrestore_session = false\n')
(root / 'browser.toml').write_text(config)
(root / 'browser.toml').chmod(0o600)
save(root / 'agent.json', {})
digest = lambda raw: hashlib.sha256(raw).hexdigest()
definition = {k: task['task'].get(k) for k in ('id', 'project', 'title', 'description', 'next_action')}
selection = {
    'selection_version': 1, 'run_id': str(uuid.uuid4()), 'workspace': str(root),
    'pm': {'executable': str(binary / 'orion-pm'), 'home': str(root / 'pm'), 'store_id': task['store_id'],
           'task_id': 'continuity-demo', 'task_definition_sha256': digest(json.dumps(
               definition, sort_keys=True, ensure_ascii=True, separators=(',', ':')).encode())},
    'handoff': {'executable': str(binary / 'orion-handoff'), 'store': str(root / 'handoff')},
    'browser': {'executable': str(binary / 'orion-browser'), 'config': str(root / 'browser.toml'),
                'config_sha256': digest((root / 'browser.toml').read_bytes()), 'name': 'contdemo'},
    'client': {'executable': str(candidate / 'driver/node_modules/.bin/agent-browser'),
               'config': str(root / 'agent.json'), 'config_sha256': digest((root / 'agent.json').read_bytes())}}
save(root / 'selection.json', selection)
print('Created isolated selection; no browser has started.')
PY
ORION_BROWSER_CONFIG="$DEMO_ROOT/browser.toml" .venv/bin/orion-browser --json setup
.venv/bin/python examples/continuity_starter.py --selection "$DEMO_ROOT/selection.json" inspect
```

The final inspect reports selected task and context state. It does not claim a task or make browser lifecycle calls. The explicit browser setup prepares only the selected directories; a later lease starts this anonymous browser's transient resources.

The selection binds the PM store ID, task identity and a digest of its definition. A changed task goal cannot reuse the old context. Handoff has no public store ID, so this recipe binds an explicitly selected store path and run identity without claiming to authenticate a store restored at the same path.

## Let the producer observe and yield

```bash
.venv/bin/python examples/continuity_starter.py --selection "$DEMO_ROOT/selection.json" produce
.venv/bin/orion-pm --json --home "$DEMO_ROOT/pm" show continuity-demo
```

Expect `state: yielded`, PM task `todo` and claim `absent`. The producer has read the public test page, proved clean native browser release and client close, saved and verified an exact Handoff revision, then guarded-released its PM claim. Saving a record alone would not establish a successful yield.

The private `yield.json` identifies the intended record and digest. Context observation time, synthetic acceptance claims and resource cleanup are recorded separately. Those claims simulate the recipe's accepted baseline; they are not human approval for another action.

## Continue under new ownership

In another terminal, select the same extracted candidate and explicitly set `DEMO_ROOT` to the synthetic directory you created. Review the current request and task goal. Do not copy the producer's holder or generation.

```bash
set -euo pipefail
.venv/bin/python examples/continuity_starter.py --selection "$DEMO_ROOT/selection.json" \
  continue --yield-receipt "$DEMO_ROOT/yield.json"
.venv/bin/orion-pm --json --home "$DEMO_ROOT/pm" show continuity-demo
if ORION_BROWSER_CONFIG="$DEMO_ROOT/browser.toml" .venv/bin/orion-browser --json status contdemo; then
  echo 'Unexpected running browser; inspect before proceeding.' >&2
  exit 1
else
  test "$?" -eq 6
fi
```

Expect `completed`, PM task `done` with claim `absent`, and the browser's expected exit 6: `BROWSER_DOWN`, state down/no holder. The consumer's task evidence comes from its own page observation and clean release.

The record is checked before and after the new PM claim. A newer revision is not followed silently, and an older revision is not substituted when the selected one fails. Browser ownership uses a new holder/session, independent of PM's generation. Native status reports holder, expiry and health; the session ID comes from the lease grant.

Two consumers started together have one PM winner. The losing claimant makes no browser lifecycle/navigation calls. A version preflight is not evidence of resource ownership. The verification receipt includes this refusal separately from the successful continuation.

## Treat missing and unknown results differently

| Profile exit | What it establishes |
|---|---|
| 0 | Only the named inspected, yielded or completed state |
| 2 | Invalid invocation or selection |
| 3 | An established refusal |
| 7 | Reconciliation is required |

Each component keeps its own result envelope and exit meanings. Handoff's `context_available` still carries `authority: none`. Stale, incomplete, ambiguous, conflicting or mismatched context cannot authorize a browser action or mark a PM task done.

A timeout or lost result does not establish that an action was never sent. Preserve the workspace and its bounded private operation receipts. Inspect PM with its explicit home, Handoff with its explicit store and the browser with its selected configuration. Follow the [starter recovery runbook](https://github.com/OrionArchitekton/orion-starter/blob/v0.2.0-rc.1/docs/runbooks/starter-continuity.md) before another intentional attempt. Request IDs correlate operations; they do not make them idempotent.

## Clean up and keep the limits visible

Normal success leaves the browser down, its client closed and the expected PM claim absent. Retain any private receipts you want, then remove only the selected disposable workspace and this candidate's environments. Reconcile unknown ownership or cleanup before removal. Other profiles, accounts, task stores and OS packages remain separately managed.

PM claims coordinate cooperating clients on one host. Expiry does not stop an old process, and sequential checks do not create an atomic transaction across components or isolate hostile same-user processes. This recipe installs no hooks, scheduler, approval broker or automatic runtime migration.

The [versioned profile walkthrough](https://github.com/OrionArchitekton/orion-starter/blob/v0.2.0-rc.1/profiles/continuity/README.md), MIT source and exact release artifacts remain available independently of this guide. The earlier RC2 archive is preserved rather than rewritten to fit the new profile.
