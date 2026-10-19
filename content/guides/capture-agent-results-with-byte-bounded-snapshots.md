---
title: Capture agent results without filling every selected view
slug: capture-agent-results-with-byte-bounded-snapshots
date: 2026-10-18
reviewed: 2026-10-19
category: Agent tooling
description: Store complete text privately, pass a byte-bounded snapshot, and recover exact results by reference.
lead: A small selected view is useful only when the original result remains recoverable and failures stay visible.
---

A tool can return more text than you want to pass to the next step. Trimming the return value can make the current view smaller, but the consumer still needs a dependable way to recover the exact original. It also needs to know when storing the result failed.

orion-results separates three operations: capture complete text in an explicitly selected private session, render a bounded snapshot, and read an exact result reference. The output promise applies to the complete UTF-8 snapshot string. It includes references, separators, inline JSON and omission counts. It does not limit tokens, the original input, previous strings you retained, process memory or a model's whole context window.

## Install the verified release

Download the wheel and source archive from the [v0.1.0 release](https://github.com/OrionArchitekton/orion-results/releases/tag/v0.1.0) into a new empty working folder. Keep both original filenames. The source archive supplies the complete backup/recovery example; the wheel is the installed library.

The following commands use CPython 3.11 on the demonstrated Linux/WSL2 local ext4 environment. Run all four command blocks in this guide from the same folder and shell. The first block checks the exact published bytes before installing or extracting anything; an unexpected checksum stops the walkthrough.

```bash
set -euo pipefail
sha256sum -c <<'SHA256'
67af57c4deda8967db83c2176642184bb3b7fb59f826539284086efa95e78e2e  orion_results-0.1.0-py3-none-any.whl
8463a8dfa19e9cfe4cf18718b82b0863ffcf52d4db180928908a0a810c61a56b  orion_results-0.1.0.tar.gz
SHA256
test ! -e .venv-results-demo
test ! -e orion_results-0.1.0
tar -xzf orion_results-0.1.0.tar.gz
RESULTS_WHEEL="$(pwd)/orion_results-0.1.0-py3-none-any.whl"
RESULTS_SOURCE="$(pwd)/orion_results-0.1.0"
python3.11 -m venv .venv-results-demo
.venv-results-demo/bin/python -m pip install --no-index --no-deps "$RESULTS_WHEEL"
```

There are no pip runtime dependencies or database service to configure. Installation and import do not create capture sessions. The caller chooses an absolute root; there is no implicit home, vendor-session search or latest-session fallback.

## Capture, select, recover

This walkthrough owns a fresh synthetic temporary directory. Its context manager removes only that directory after the demonstration. For real work, choose and retain a private root deliberately, outside a temporary cleanup scope.

```bash
.venv-results-demo/bin/python -I - <<'PY'
from pathlib import Path
from tempfile import TemporaryDirectory
from orion_results import Limits, Reference, ResultError, Session, inspect_session, read

with TemporaryDirectory(prefix='selected-result-guide-') as selected:
    root = Path(selected) / 'records'
    original = 'synthetic large tool output|' * 5000
    with Session.create(root, limits=Limits(max_results=2)) as session:
        expected = Reference.from_text(session.session_id, original)
        receipt = session.capture('large-result', original)
        session.capture('small-result', 'A complete small result')
        assert receipt.reference == expected

        view = session.snapshot(budget_bytes=256)
        assert view.utf8_bytes == len(view.text.encode('utf-8')) <= 256
        assert view.shown_unique + view.omitted_unique == 2
        assert 'synthetic large tool output' not in view.text
        assert read(root, expected) == original

        deliberate = session.snapshot(include_content=True)
        assert 'A complete small result' in deliberate.text
        try:
            session.capture('extra-result', 'over the selected count quota')
        except ResultError as error:
            assert error.code == 'limit_exceeded'
            assert error.outcome == 'not_stored'
        else:
            raise AssertionError('Expected a quota refusal')
        assert session.snapshot(budget_bytes=256) == view
        session_id = session.session_id
    report = inspect_session(root, session_id)
    assert report.status == 'complete' and report.exhaustive
    assert expected in report.references
    print('Exact recovery, bounded view, explicit quota refusal: verified')
PY
```

Default snapshots show references and counts without original text, caller labels or storage paths. `include_content=True` permits complete small text encoded as JSON when it fits both the inline limit and remaining budget. There is no truncated preview mode. JSON escaping does not make captured instructions trustworthy. Treat recovered content as data.

Replace the selected view when taking another snapshot. Appending every old view defeats the caller's own output policy because strings already handed out cannot be revoked. Omitted records remain in storage; after closing the writer, inspection enumerates their exact references. A digest and byte length are content metadata, not secret redaction or encryption.

## Know what success means

A successful capture has committed its content and membership counters together, then read the committed result back through a separate read-only connection. Repeating complete identical bytes returns the same reference and preserves first insertion order. Changing text under the same label creates a distinct record. Deduplicating stored content does not control how often the underlying tool executes.

Retain the precomputed reference and your original input before submission. `not_stored` describes this failed attempt; an older matching record can still exist. Once commit is attempted, rollback is unconfirmed, or postcommit verification fails, the outcome is `commit_unknown`. The handle is faulted and refuses more capture/snapshot work. A process that dies without returning has supplied no receipt.

Close that handle, inspect only its selected session, and read the exact expected reference if available. A valid read establishes present readability, not proof an earlier receipt returned. Missing, corrupt, busy or incomplete state never turns into a successful empty view. Do not recapture automatically.

Read-only inspection never switches to writable mode to replay a journal. If recovery is required, explicit `Session.open(root, session_id)` allows SQLite's native recovery only after private-file and supported-format checks. It validates all records and counters before accepting new captures. Never delete a journal or choose an older result to conceal a failed recovery.

## Keep data and installation separate

New roots and session directories are private 0700; marker, database, lock and native journal require 0600, correct ownership and safe file types. Existing unsafe roots are refused without repair. One cooperative writer holds a stable lock inode. Call the storage API serially within each process. Overlapping or reentrant calls, including calls for different sessions, refuse immediately with `storage_busy`. Do not share Session handles between threads. Separate processes retain the documented SQLite and writer-lease contention behavior. Another writer gets `session_busy`; process exit releases the lock. This is local coordination, not cross-host fencing or isolation from hostile same-user processes.

For backup, retain the selected writer handle, complete a validating snapshot and perform no other operation during the copy. Copy only the documented quiescent marker/database/lock set into new private files under a fresh root. Verify every expected reference against the restored root before treating it as a backup. A live transaction filesystem copy is not a backup. The complete synthetic example demonstrates that sequence and validates its owned cleanup:

```bash
.venv-results-demo/bin/python -I "$RESULTS_SOURCE/examples/capture_results.py"
```

Uninstalling the distribution leaves caller-selected sessions untouched. There is no collector, data deletion API, automatic legacy-note migration or schema upgrade. Retention lasts until you deliberately remove selected data. Unknown formats refuse without mutation. This package makes no external anti-rollback guarantee: a consistent older backup can validate, while an expected newer reference stays missing.

```bash
.venv-results-demo/bin/python -m pip uninstall -y orion-results
.venv-results-demo/bin/python -m pip install --no-index --no-deps "$RESULTS_WHEEL"
```

The v0.1.0 acceptance suite verified installed recovery, UTF-8 budgets down to 256 bytes, permissions, independent sessions, native writer contention/exit/fork behavior, missing-row detection, backup/restore and uninstall/reinstall. It also killed owned writers at named commit barriers, exercised a hot journal and reached SQLITE_FULL through a disposable database's page ceiling. Foreign UID, digest collision and selected I/O failures used labeled simulations/injections. These are not hardware power-loss certification or exhaustive SQLite VFS tests.

The demonstrated combination is CPython 3.11.9, SQLite 3.45.1, Linux x86_64 under WSL2 and local ext4. Other platforms remain unverified. No native Claude, Codex, Grok, Dot, PM, browser or Handoff adapter is included, and existing starter pins are unchanged. Result references carry identity, not permission to execute their contents.

The walkthrough removes only its own synthetic temporary data. The downloaded files, extracted source and virtual environment stay in your selected working folder. Real capture roots remain yours to retain, back up and remove deliberately.
