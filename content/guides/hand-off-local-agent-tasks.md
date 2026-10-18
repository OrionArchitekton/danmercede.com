---
title: Hand off a local task between agent sessions
slug: hand-off-local-agent-tasks
date: 2026-10-17
reviewed: 2026-10-17
category: Agent systems
description: Save explicit local task context, refuse ambiguous pickup, and preserve uncertainty with Orion Handoff.
lead: A new session needs the right task and its observed state. Here is a complete local walkthrough that keeps context separate from permission to act.
---

A useful handoff says which task it belongs to, what was observed, what remains unfinished, and where its claims came from. It also lets the next session say that the information is stale or ambiguous.

[Orion Handoff](/works/orion-handoff/) is a small local CLI for that boundary. It stores immutable JSON revisions in a directory you choose. It does not install agent hooks, inspect conversations, open references, or execute recorded next steps. Every response includes `authority: none`.

This walkthrough uses synthetic tasks. Its acceptance claims simulate a prior review; they are not human approval. The receiver still checks the current request, evidence, and permission to act.

## Install a verified wheel

Use Bash, Python 3.11 or newer, and a local Linux filesystem on an x86_64 host. The demonstrated matrix is CPython 3.11 and 3.13 on WSL2 with ext4. Native Windows, network filesystems, cross-host fencing, and protection against a hostile process running as your user are outside this version's scope.

Download `orion_handoff-0.1.0-py3-none-any.whl` from the [v0.1.0 release](https://github.com/OrionArchitekton/orion-handoff/releases/tag/v0.1.0) into a new directory. Start the commands below from that directory. The pinned checksum binds this guide to that wheel; stop if it differs. The wheel contains the CLI, and the generator below supplies the entire example without a source checkout.

```bash
set -euo pipefail
printf '%s  %s\n' \
  'e1f3e1e43839cfd2896cfc553bef9366867c1cf50bce1e4d4762cdbec9977e41' \
  'orion_handoff-0.1.0-py3-none-any.whl' | sha256sum -c -
DEMO_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/handoff-guide.XXXXXXXX")
python3 -m venv "$DEMO_ROOT/venv"
"$DEMO_ROOT/venv/bin/python" -m pip install --no-deps --no-index \
  ./orion_handoff-0.1.0-py3-none-any.whl
CLI="$DEMO_ROOT/venv/bin/orion-handoff"
STORE="$DEMO_ROOT/store"
PYTHON="$DEMO_ROOT/venv/bin/python"
export DEMO_ROOT CLI STORE PYTHON
"$CLI" --json --version
"$CLI" --store "$STORE" --json init
printf 'A synthetic draft heading\n' > "$DEMO_ROOT/draft.txt"
printf 'DEMO_ROOT=%q\nCLI=%q\nSTORE=%q\nPYTHON=%q\nexport DEMO_ROOT CLI STORE PYTHON\n' \
  "$DEMO_ROOT" "$CLI" "$STORE" "$PYTHON" > "$DEMO_ROOT/session.env"
chmod 600 "$DEMO_ROOT/session.env"
printf 'For the second session, run: source %q\n' "$DEMO_ROOT/session.env"
```

`--version` reports package `0.1.0` and interface/store/record version `1`. Initialization returns `code: initialized`, exit 0. The explicit store is new and private; this does not select any agent's existing state. Leave this terminal open for the producer steps.

## Session one: record an observation

The generator actually reads and hashes the synthetic draft each time it runs, then records that observation time. It does not refresh timestamps on old evidence. The `sample://` references are labels for this demonstration; the CLI never follows them.

```bash
cat > "$DEMO_ROOT/make-record.py" <<'PY'
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys

task = sys.argv[1]
predecessor = sys.argv[2] if len(sys.argv) > 2 else None
status = sys.argv[3] if len(sys.argv) > 3 else "active"
draft = (Path(os.environ["DEMO_ROOT"]) / "draft.txt").read_bytes()
observed = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
print(json.dumps({
    "record_version": 1, "task_key": task, "project_key": "sample-project",
    "predecessor": predecessor, "title": "Synthetic draft " + task,
    "status": status, "actor": "demo-producer", "request_id": "demo-" + task,
    "context_as_of": observed,
    "last_observed_outcome": "Read the synthetic heading",
    "unfinished_step": "Review the remaining paragraphs",
    "recorded_next_step": "Check the current request before editing",
    "remaining_authority": "None granted by this record",
    "acceptance_claims": [{"baseline": "synthetic-baseline-" + task,
        "reference": "sample://simulated-review/" + task, "accepted_at": observed}],
    "evidence": [{"source": "synthetic draft", "artifact": hashlib.sha256(draft).hexdigest(),
        "observed_at": observed, "scope": "Heading bytes only",
        "reference": "sample://draft/heading"}],
    "body": "Synthetic context. Recheck the draft before editing."
}))
PY
"$PYTHON" "$DEMO_ROOT/make-record.py" alpha > "$DEMO_ROOT/alpha.json"
"$CLI" --store "$STORE" --json record --input - \
  < "$DEMO_ROOT/alpha.json" > "$DEMO_ROOT/alpha-receipt.json"
"$PYTHON" - <<'PY'
import json, os
from pathlib import Path
receipt = json.loads((Path(os.environ["DEMO_ROOT"]) / "alpha-receipt.json").read_text())
assert receipt["code"] == "recorded" and receipt["authority"] == "none"
print("Saved alpha:", receipt["data"]["record_id"])
PY
```

A successful write exits 0 and returns the generated `record_id` and the stored byte hash. Task key, record ID, producer identity, request ID, and project key are separate fields. A later revision must name the current record as its predecessor.

## Session two: pick the exact task

In another terminal, run the `source` command printed during setup. It restores only variables from the file this walkthrough created. You can also continue in the first terminal. Keep using that same `CLI` and absolute `STORE` path in either session.

```bash
set -euo pipefail
"$CLI" --store "$STORE" --json pickup --task alpha > "$DEMO_ROOT/pickup.json"
"$PYTHON" - <<'PY'
import json, os
from pathlib import Path
root = Path(os.environ["DEMO_ROOT"])
picked = json.loads((root / "pickup.json").read_text())
written = json.loads((root / "alpha-receipt.json").read_text())
assert picked["code"] == "context_available"
assert picked["data"]["selected_record_id"] == written["data"]["record_id"]
assert picked["authority"] == "none"
assert picked["data"]["reference_check"] == "not_performed"
print("Exact task selected; references unchecked; authority:", picked["authority"])
PY
```

Within the default 24-hour age window, this fresh complete example exits 0 with `match: task`, `integrity: valid`, `recency: within_window`, and `acceptance: recorded`. `context_available` means the record meets those checks. Its baseline is still a recorded claim. It does not grant approval, validate a reference, reserve a browser or phone, or claim a PM task. Those remain separate checks at their owning tools.

## Add a second task and refuse ambiguity

A project is a grouping, not a task selector. Two active tasks in the same project must not silently choose whichever was saved most recently.

```bash
"$PYTHON" "$DEMO_ROOT/make-record.py" beta > "$DEMO_ROOT/beta.json"
"$CLI" --store "$STORE" --json record --input - < "$DEMO_ROOT/beta.json"
status=0
"$CLI" --store "$STORE" --json pickup --project sample-project --resume \
  > "$DEMO_ROOT/ambiguous.json" || status=$?
test "$status" -eq 11
"$PYTHON" - <<'PY'
import json, os
from pathlib import Path
result = json.loads((Path(os.environ["DEMO_ROOT"]) / "ambiguous.json").read_text())
assert result["code"] == "ambiguous" and result["data"]["record"] is None
print("Ambiguous project refused; exit 11")
PY
"$CLI" --store "$STORE" --json pickup --task alpha
```

The project pickup exits 11 and returns no selected record. The final exact-task pickup still selects alpha. The shell captures the expected nonzero exit instead of stopping under `set -e`.

## Record a stale successor

A successor is a complete new record. Marking it stale does not revive the earlier fresh context.

```bash
ALPHA_ID=$("$PYTHON" -c 'import json,sys; print(json.load(open(sys.argv[1]))["data"]["record_id"])' \
  "$DEMO_ROOT/alpha-receipt.json")
"$PYTHON" "$DEMO_ROOT/make-record.py" alpha "$ALPHA_ID" stale > "$DEMO_ROOT/stale.json"
"$CLI" --store "$STORE" --json record --input - \
  < "$DEMO_ROOT/stale.json" > "$DEMO_ROOT/stale-receipt.json"
status=0
"$CLI" --store "$STORE" --json pickup --task alpha \
  > "$DEMO_ROOT/stale-pickup.json" || status=$?
test "$status" -eq 10
"$PYTHON" - <<'PY'
import json, os
from pathlib import Path
root = Path(os.environ["DEMO_ROOT"])
picked = json.loads((root / "stale-pickup.json").read_text())
written = json.loads((root / "stale-receipt.json").read_text())
assert picked["code"] == "inspect_only"
assert picked["data"]["selected_record_id"] == written["data"]["record_id"]
assert picked["data"]["continuation"] is None
print("Stale successor selected; no continuation; exit 10")
PY
"$CLI" --store "$STORE" --json show "$ALPHA_ID"
```

Pickup exits 10. `show` can inspect the older alpha record, but reports `current: false`. Unknown or future observation times, incomplete or conflicting acceptance claims, and insufficient evidence also prevent continuation. A corrupt committed record blocks selection with exit 74; it does not cause an older-record fallback.

## Back up and validate a restored copy

Stop all cooperating readers and writers before copying a store. In this walkthrough, wait for both terminals' commands to finish and leave them idle. Copy the whole directory, including the version marker and lock file, preserving modes and hard links. Do not delete a lock file to break an active lock.

```bash
cp -a "$STORE" "$DEMO_ROOT/backup"
cp -a "$DEMO_ROOT/backup" "$DEMO_ROOT/restored"
"$PYTHON" - <<'PY'
import hashlib, os, stat
from pathlib import Path
root = Path(os.environ["DEMO_ROOT"])
def snapshot(folder):
    return {str(p.relative_to(folder)): (stat.S_IMODE(p.stat().st_mode),
        hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None)
        for p in [folder, *folder.rglob("*")]}
assert snapshot(Path(os.environ["STORE"])) == snapshot(root / "restored")
print("Restored bytes and modes match")
PY
status=0
"$CLI" --store "$DEMO_ROOT/restored" --json pickup --task alpha \
  > "$DEMO_ROOT/restored-pickup.json" || status=$?
test "$status" -eq 10
"$PYTHON" - <<'PY'
import json, os
from pathlib import Path
root = Path(os.environ["DEMO_ROOT"])
original = json.loads((root / "stale-pickup.json").read_text())
restored = json.loads((root / "restored-pickup.json").read_text())
assert restored["data"]["selected_record_id"] == original["data"]["selected_record_id"]
assert restored["data"]["continuation"] is None
print("Restored pickup preserves the stale successor")
PY
```

Keep the original until the restored copy is validated. If a write returns `commit_unknown` with exit 74, preserve its `candidate_record_id`, inspect it with `show` and inspect the current task with `pickup` before considering another write. A failed acknowledgement can follow a committed record. Do not blindly resend.

## Keep the boundary small

The store retains historical, stale, and completed records. There is no automatic deletion or migration. Version 0.1 limits committed records to 512, input records to 64 KiB, and body text to 16 KiB; a reached limit refuses work rather than silently removing history. Preserve a complete store before retiring it and deliberately starting another one.

Uninstalling the package leaves the selected store in place. To end the demonstration, stop its processes and retain or remove only the scratch directory printed during setup. Existing agent configuration and stores were never selected.

Use [Orion PM](/works/orion-pm/) for task coordination and the [browser pool](/works/orion-browser/) or [phone pool](/works/orion-phone/) for resource leases. Handoff supplies recorded context; each executor still checks its own current request and action authority. The [source and recovery runbook](https://github.com/OrionArchitekton/orion-handoff/blob/main/docs/runbooks/local-handoff-store.md) describe the supported store and recovery boundaries.
