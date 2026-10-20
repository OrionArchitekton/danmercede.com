---
title: See overlapping work without guessing who owns it
slug: git-worktree-overlap-report
date: 2026-10-19
reviewed: 2026-10-19
category: Open source
description: Use explicit Git worktree observations, exact path identities and coverage states to coordinate concurrent changes.
lead: Two clean-looking command runs are not enough when one checkout was never observed. Start with coverage, then look at the shared paths.
---


Git worktrees let several changes move forward in separate checkouts. They also make it easy to miss that two changes touch the same path. The useful question is concrete: which registered worktrees currently report the same uncommitted path?

Orion Worktree Report answers that question for repositories you explicitly select. It includes coverage in the answer because an unavailable checkout cannot be treated as a clean one. The command observes local state. It does not assign work, lock files or decide whether a merge is safe.

The walkthrough creates one disposable repository and two linked worktrees. It leaves ordinary project repositories alone.

## Install into a dedicated environment

Use CPython 3.11, Git 2.43.0 and a local ext4 filesystem on Linux x86_64 under WSL2 for the initial tested target. Other environments remain unverified. Start in a fresh local folder containing the [v0.1.0 wheel](https://github.com/OrionArchitekton/orion-worktree-report/releases/download/v0.1.0/orion_worktree_report-0.1.0-py3-none-any.whl). The [release page](https://github.com/OrionArchitekton/orion-worktree-report/releases/tag/v0.1.0) also carries the source archive and SHA256SUMS. The first command below verifies this guide's selected wheel digest before any installer executes.

The installer is a separate checksum-pinned pip wheel from PyPI. Python extracts it locally, then runs it in isolated mode to install the reporter into an environment created without bundled pip or setuptools. This uses no global tool upgrade. Keep the installer folder for removal later. Downloading pip needs HTTPS; installing the reporter uses no index or dependencies.

```bash
set -euo pipefail
test ! -e .venv
test ! -e .installer
printf 'f06d7ca9d3fd1001b9bd16ed18a8ee7827727c09eeb4a535f41692723336550b  orion_worktree_report-0.1.0-py3-none-any.whl\n' | sha256sum --check --strict
curl --fail --location --proto '=https' --tlsv1.2 --max-time 60 \
  https://files.pythonhosted.org/packages/f3/6e/1736e5b4ae2b778ef2f81c47d797de9f891d4d8acb047a24ca37a60294dd/pip-26.2.1-py3-none-any.whl \
  --output pip-26.2.1-py3-none-any.whl
printf '71138adf1f4ca900cdb7d289c21b7494329f2332b6d85f0e1c42108c0384ed3e  pip-26.2.1-py3-none-any.whl\n' | sha256sum --check --strict
python3.11 -m zipfile -e pip-26.2.1-py3-none-any.whl .installer
python3.11 -m venv --without-pip .venv
python3.11 -I .installer/pip --isolated --python .venv/bin/python install --no-index --no-deps ./orion_worktree_report-0.1.0-py3-none-any.whl
.venv/bin/orion-worktree-report --json version
```

There are no Python runtime dependencies. The reporter environment contains only the reporter, with its own bin/python; the POSIX launcher isolates imports and disables bytecode writes before Python startup. The separate installer and its vendored libraries are setup tools, not packages installed into that environment. Other installation layouts are unverified. Git must be trusted and on PATH. No daemon, hook or configuration change is installed.

## Build one disposable example

Continue in this same folder and shell. Use ordinary Git settings in your test environment; the fixture-creation commands themselves are standard Git operations.

```bash
mkdir demo-repo
git -C demo-repo init -b main
git -C demo-repo config user.name 'Synthetic example'
git -C demo-repo config user.email 'example@example.invalid'
printf 'base\n' > demo-repo/shared.txt
git -C demo-repo add shared.txt
git -C demo-repo commit -m 'Synthetic baseline'
git -C demo-repo worktree add -b worker-a ../worker-a
git -C demo-repo worktree add -b worker-b ../worker-b
DEMO_ROOT="$(pwd)/demo-repo"
.venv/bin/orion-worktree-report --json scan --repo "$DEMO_ROOT" > clean.json
```

The last command exits 0. The JSON reports one repository, three registered and observed worktrees, complete coverage and `no_overlap_observed`. The reporter uses Git's registration list, so the worktrees need not sit at any particular folder depth.

## Make one shared dirty path

```bash
printf 'worker a\n' > worker-a/shared.txt
printf 'worker b\n' > worker-b/shared.txt
OVERLAP_EXIT=0
.venv/bin/orion-worktree-report --json scan --repo "$DEMO_ROOT" > overlap.json || OVERLAP_EXIT=$?
test "$OVERLAP_EXIT" -eq 1
```

This command deliberately exits **1**. It observed an overlap with complete coverage. The block captures and checks that exit explicitly so the walkthrough can continue under `set -e`.

The report names `shared.txt` and one unordered pair of worktree IDs. It reports exact path identity, not whether the edits conflict semantically. Two worktrees can touch the same file in compatible ways. Separate clones with matching history remain separate repositories.

Staged changes, unstaged changes and individual nonignored untracked files enter the dirty-path set. Indexed renames/copies retain source and destination roles. Committed-only divergence, ignored files and submodule interiors do not enter this report's scope. Filename identities are Base64 of exact bytes; an exact UTF-8 label is supplied only when valid. Display labels are not comparison keys.

## Keep a missing observation visible

```bash
PARTIAL_EXIT=0
.venv/bin/orion-worktree-report --json scan --repo "$DEMO_ROOT" --repo "$(pwd)/missing-repo" > partial.json || PARTIAL_EXIT=$?
test "$PARTIAL_EXIT" -eq 3
```

The result exits **3** and says coverage is partial. The already observed positive pair can remain as a known subset. The registered-worktree total is null because one selected repository could not be discovered. That unknown is not zero.

When a known registration is unavailable, its unobserved dirty paths are null. Parse failure, timeout, configured unsupported features, detected drift and exceeded limits also prevent a complete negative answer.

| Result | Meaning |
|---|---|
| Exit 0, complete, no overlap observed | Every selected supported scope was observed; no exact pair appeared. |
| Exit 1, complete, overlap observed | One or more exact pairs appeared with complete coverage. |
| Exit 3, partial | Only a subset was observed; no absence claim is available. |
| Exit 2, 4 or 70, unavailable | Invalid invocation, unavailable/limited observation or internal failure. |

Always read interface version, process exit, coverage, conclusion and problems together. A failed output write is unsuccessful too. A valid JSON object alone establishes no coverage claim.

## Know the observation boundary

On supported stable repositories, the command initiates no writes to objects, refs/reflogs, index, configuration, working files or registrations and creates no in-repository locks, caches or reports. Filesystem access-time bookkeeping is excluded. Native inventories and helper sentinels check this boundary on the acceptance target.

Before any repository-aware Git setup, bounded configuration snapshots are checked with includes disabled. Include targets are refused before they are opened. Filters, included repository configuration, submodules/gitlinks, sparse or split indexes, partial/promisor clones and bare repositories are refused. Index flags that can hide changed paths, including assume-unchanged and skip-worktree, are refused as unsupported observations too. Intent-to-add remains observable. The reader disables optional locks, fsmonitor, global/system config and attributes, prompts and inherited Git redirection/tracing. Repository-local ignore rules remain active. These controls require cooperative stable configuration and a trusted executable. They are not a sandbox against malicious Git or a concurrent configuration writer.

Repeated observations compare registrations, HEAD, index/config digests and status. Detected changes make coverage incomplete without a silent retry. Matching samples cannot rule out a change-and-revert between reads or fence another writer.

Work is bounded: eight supplied roots, 64 registrations, 4,096 dirty paths per worktree, 1,000 overlap records, bounded command/output/config/index sizes, five seconds per Git command and a 60-second owned scan deadline. Exceeded limits remain visible problems. Host scheduling and uninterruptible I/O have no hard wall-clock guarantee. See the package behavior contract for all byte caps.

## Retain the report deliberately

The example saves reports outside the selected repository. Reports contain absolute local roots, branch names and file names. Keep them private until you review and sanitize them. The command does not emit file contents, diffs, remotes or raw Git diagnostics.

A later PM or Results consumer can deliberately attach a report through its own public interface. This package creates no task, lease, Handoff record, persistent store or integration, and changes no other package pin. The observation is evidence for your next decision; the authority to change files comes from your actual workflow.

## Remove the package

```bash
python3.11 -I .installer/pip --isolated --python .venv/bin/python uninstall -y orion-worktree-report
```

Uninstall removes package files only. Your synthetic repositories, linked worktrees and saved reports remain. No runtime state needs migration.

The first-party package uses MIT. Its NOTICE acknowledges ECC by Affaan Mustafa and retains the upstream MIT license for the selected overlap/deduplication concepts. The reference identifies pinned upstream material; it does not claim an exact historical source pin. The [source, behavior contract and runbook](https://github.com/OrionArchitekton/orion-worktree-report) describe the complete supported surface.
