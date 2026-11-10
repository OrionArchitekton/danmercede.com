---
verified: 2026-11-10
review_after: 2027-02-08
topics: [design-lint, impeccable, ci, report-only, ui-quality, anti-patterns, accessibility, contrast, danmercede.com]
references:
  - .github/workflows/design-lint.yml
  - scripts/designLint.mjs
  - scripts/designLintCanary.html
  - tests/designLint.test.mjs
  - tests/requiredChecksWorkflow.test.ts
  - .github/workflows/required-checks-fail-closed.yml
  - specs/design-lint-spec.md
  - package.json
  - package-lock.json
---

# Runbook: report-only design lint (danmercede.com)

## What it is

The `design-lint` job builds the site, serves it with `vite preview` on
127.0.0.1:4173, and scans every page the build emits (each `index.html` under
`build/`) with the Impeccable detector. It reports findings per rule and per
page in the job summary and uploads the full JSON as the `design-lint`
artifact. It is **report-only**: not in `BASE_REQUIRED_CHECKS`, not in branch
protection, never blocks a merge.

## Operational surface added

- Workflow `.github/workflows/design-lint.yml`, job `design-lint`, on every
  pull request to `main` and on manual dispatch. GitHub-hosted
  `ubuntu-latest` (Chrome preinstalled). Public repo, so no billed minutes.
- Dev dependency `impeccable`, exact version, locked with its integrity hash.
  The platform engine comes in as an exact-pinned optional dependency
  (`@impeccable/cli-linux-x64` on the runner).
- Env on every detector run: `DO_NOT_TRACK=1`, `IMPECCABLE_NO_TELEMETRY=1`,
  `IMPECCABLE_PRO=off`, `CI` set, `IMPECCABLE_HOME` in the runner temp dir.
- `--no-config`: repo ignore files and inline ignores are not honored while
  the check is report-only.

## Reading a run

The first lines of the job summary decide everything:

| Status | Meaning | Job result |
|---|---|---|
| `RAN` | Detector exited 0 or 2, every page served HTTP 200, the canary page was flagged. Pages scanned is greater than 0. | success, even with findings |
| `NOT RUN` | Anything else. The reason line says which. | failure (red, non-blocking) |

A green job is not proof by itself. Open the artifact and read
`report.json`: `status`, `detector.exitCode`, `pagesScanned`,
`canary.primaryFindings`, `totals`, `byRule`, `byPage`. `findings.json` is the
detector's raw output; `detector.stderr.txt` holds its diagnostics.

Command line:

```bash
gh run list --workflow design-lint.yml --limit 5
gh run download <run-id> --name design-lint --dir /tmp/design-lint
jq '{status, reason, exit: .detector.exitCode, pagesScanned, totals}' /tmp/design-lint/report.json
gh run view <run-id> --log | grep 'design-lint: status='
```

## Why the canary exists

The detector prints `[]` when it cannot reach a page or cannot start a
browser, and only its exit code (1) says so. The lint therefore serves a small
known-bad page (`scripts/designLintCanary.html`, never deployed) from memory
and scans it in the same run. If the canary has no primary finding, the scan
did not really render pages and the status is NOT RUN. Canary findings are
never counted as site findings.

## NOT RUN triage

| Reason line | Likely cause | Action |
|---|---|---|
| `detector exit 1` | A page timed out, or no browser found | Check `detector.stderr.txt`; check the "browser:" log line; re-run once |
| `pages did not serve HTTP 200` | Build or preview server problem | Check the Build and Serve steps; the `build` check in `ci.yml` usually fails too |
| `canary page has no primary finding` | Detector rule change or rendering broken | Compare the detector version; run locally (below) |
| `detector output is not a JSON array` | Detector crash or CLI change | Read `findings.json` and stderr; check the detector changelog |
| `no pages to scan` | Build emitted no `index.html` | Check the Build step |
| the preview server did not start | Port or build output problem | Read the printed preview log |

## Run locally

Use a throwaway copy, not a checkout you will commit from: the build step runs
the content compile.

```bash
git archive HEAD | tar -x -C /tmp/dl-copy && cd /tmp/dl-copy
npm ci && npm run build
./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173 --strictPort &
env -u DISPLAY -u WAYLAND_DISPLAY node scripts/designLint.mjs --build-dir build --out /tmp/dl-out
kill %1
```

On WSL, unset `DISPLAY` and `WAYLAND_DISPLAY` (a dead display breaks headless
Chromium). Expect about 3 minutes for the full page set.

## Updating the detector

1. Read the release notes in the maintainer's repository (pbakaus/impeccable).
2. Confirm the npm surface: `npm view impeccable maintainers repository.url version`.
3. `npm install --save-dev --save-exact impeccable@<version>` and commit
   `package.json` plus `package-lock.json`.
4. Re-run the job and compare totals with the previous run; rule changes move
   the counts.

Never use `npx impeccable@latest` or any floating install. Never run
`impeccable install` here: it writes agent skills and hooks into the repo.

## Promotion (decision, not routine)

Making the lint required is a separate, deliberate change: add `design-lint`
to `BASE_REQUIRED_CHECKS` and to branch protection together, keep the job free
of any job-level `if:` (a skipped required check reports success), decide
which rules fail the job, decide whether repo ignore files become the waiver
path (drop `--no-config`), and update the report-only assertions in
`tests/requiredChecksWorkflow.test.ts` and `tests/designLint.test.mjs`.

## Rollback

Delete `.github/workflows/design-lint.yml` (nothing depends on it). Optionally
remove the `impeccable` dev dependency, `scripts/designLint.mjs`,
`scripts/designLintCanary.html` and `tests/designLint.test.mjs` (and its entry
in the `test` script). No branch protection or required-check change is needed
because the job was never required.
