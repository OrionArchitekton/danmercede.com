# Read-only Newsletter Hub Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task after the parent technical review. Steps use checkbox syntax. Independent implementation reviews remain parent-owned; no Dan checkpoint is added by this plan.

**Goal:** Make one read-only CLI select truthful existing-work/wait/admission/catch-up diagnostics for the hub without creating write authority.

**Architecture:** One hub-owned ES module combines a bounded supplied-snapshot reader, fixed-argv native GitHub GET adapter, data-only source extraction, pure decision function and CLI. It consumes the actual main compiler allowlist/generated bundle and the existing sync workflow/branch; it never imports cross-repo implementation, runs fetched code or mutates existing workflow/content. No ledger exists until a future actual writing path requires an intent.

**Tech Stack:** Node 20+ built-ins, existing TypeScript and js-yaml packages for bounded literal-data/strict-JSON/config parsing where needed, existing node:test runner. No new dependency or service.

---

## Current source proof and boundaries

- Worktree `/home/orion/.worktrees/fcn-hub-readiness-20261102`, branch
  `codex/fcn-hub-readiness-20261102`, clean base
  `e2bd8cab371d09c35c515f985c247f53bf57a1d8`.
- `AGENTS.md` preserves admission PR then separate content-sync PR; trusted
  `pull_request_target` verification never executes PR code or exposes substrate
  credentials to untrusted code. This diagnostic changes none of those paths.
- `.github/workflows/substrate-sync.yml`: Monday `10 8 * * 1`, native timezone
  America/Los_Angeles, manual trigger, shared non-cancelling concurrency group,
  current-main checkout after admission to that group, strict nonempty compile,
  pinned asset optimizer, one PR branch `codex/substrate-sync`.
- Native read-only recon November 2 observed current main equal to the base above,
  workflow ID 292432866 active at the exact workflow path, 49 historical runs and
  no open fixed-branch content PR. The latest observed scheduled run was completed
  successfully at event SHA `cac48f22...`, created `2026-11-02T23:26:21Z`.
  These are discovery observations, not future availability or public proof.
- Accepted Ops automation Phase 5 is the design context. Its historical roadmap
  still carries research-stage prose; current source approval is recorded in the
  accepted Ops publication-clock spec. Neither document grants dispatch or merges
  to this diagnostic. Ops stays adjacent through declared JSON/CLI contracts.

## Files and concrete interface

Create `scripts/newsletterHubReadiness.mjs`,
`tests/newsletterHubReadiness.test.mjs`, and finish
`docs/runbooks/newsletter-hub-readiness.md`. Add the test file explicitly to
`package.json`'s `test` command. Keep the root behavior spec in the same PR.
No existing compiler, allowlist, workflow, generated bundle, content, assets,
Ops code, approval controls or production configuration changes.

Exports: `readPublicationSnapshot(path, options)`,
`collectHubFacts(readGitHub, options)`, `decideHubReadiness(facts, options)`,
`main(argv, dependencies)`. Their role is one diagnostic, not a generic framework.
`readGitHub` is injected at the native JSON seam; production uses `execFile` with
constant `gh api --hostname github.com --method GET` vectors and bounded execution.
The CLI flags and exact input/output schema are in the root spec.

### Fixed native GET inventory

Repository is a source constant: `OrionArchitekton/danmercede.com`.
Only validated full SHAs and positive integer PR numbers enter variable path parts.
No user-controlled API route, host, executable or repository option exists.

1. `/repos/{repo}/git/ref/heads/main` before and after collection.
2. `/repos/{repo}/contents/scripts/compileContent.ts?ref={mainSha}`.
3. `/repos/{repo}/contents/constants.generated.ts?ref={mainSha}`.
4. `/repos/{repo}/contents/.github/workflows/substrate-sync.yml?ref={mainSha}`.
5. `/repos/{repo}/actions/workflows/substrate-sync.yml`.
6. `/repos/{repo}/actions/workflows/substrate-sync.yml/runs?per_page=100&page=N`.
7. `/repos/{repo}/pulls?state=open&base=main&head=OrionArchitekton%3Acodex%2Fsubstrate-sync&per_page=100&page=N`.
8. For a unique matching same-repo content PR, read its pinned
   `constants.generated.ts` as data at validated head SHA; record slug presence,
   never execute or checkout the PR. Preserve PR number/head/base identities.

Bound each process to 10 seconds and 2 MiB stdout; bound content files to 1 MiB
before parsing, snapshot nesting to a conservative finite depth, and inventories
to three pages of 100 rows each. Exhausted pagination/total-count inconsistencies
are ambiguous, never empty. There is no polling loop. Match workflow path,
repository, validated branch metadata and admitted schedule/manual events, not a display job title.
Accept the exact bare run workflow path observed natively, or the exact path
plus `@` and that validated head branch as documented by GitHub. Never accept
a different file, arbitrary prefix or mismatched/empty suffix.
Inventory every workflow ref: a manual other-ref run can share the repository
concurrency group and fixed PR branch. Validate/report branch metadata, hold
active runs across refs. Terminal events at the current main SHA also hold
across refs: they used the same reviewed workflow commit and shared output path. Recognize active statuses
queued/requested/pending/waiting/in_progress; completed
requires a recognized conclusion. Unknown or contradictory statuses refuse.

Read remote compiler/bundle as literal data using the already installed
TypeScript AST API: require exactly one expected named export with the known
literal shape; reject duplicates, spreads, expressions or parse errors. Do not
execute source, import fetched modules, or clone private substrate. Strict JSON
syntax plus existing js-yaml JSON-schema duplicate-key rejection can qualify the
small supplied JSON; tests must prove duplicates at every level refuse. Parse
workflow YAML only as data to require the existing cron/timezone, main checkout,
strict compile and shared concurrency posture. A changed/unsupported contract is
ambiguous; never rewrite it to suit the reader.

## Vertical implementation tasks

### Task 1: Supplied publication gate through the CLI

- [x] Add one CLI test with a private complete observation and injected now;
  assert `too-early` one second before actual+168h and no native calls.
- [x] Run `node --test --test-name-pattern='publication gate' tests/newsletterHubReadiness.test.mjs`;
  capture deterministic RED, then implement just bounded file/schema/time parsing
  and the minimal CLI path. Repeat until GREEN; no network in tests.
- [x] Add separate RED/GREEN cases for exact boundary, E15 DST, E16 actual time,
  partial/identity-time-only snapshot, title mismatch, duplicate keys/IDs, unsafe
  files and timestamp/offset/overflow refusal. Snapshot assertions remain labelled
  supplied, with authority false and public delivery unknown.

### Task 2: Bound nominal sync/grace without rewriting actual time

- [x] RED/GREEN a selected record bound to explicit intended hub-release Monday;
  derive that day's 08:10 America/Los_Angeles instant and explicit 1–60 minute
  grace. Assert recovery due is the later of actual+168h and nominal+grace.
- [x] Prove a 07:05 eligibility instant yields `waiting-for-scheduled-sync` at
  07:10 and 08:10, still waits one second before grace expires, and can advance
  at the precise grace boundary. Prove late actual eligibility wins over grace.
- [x] Keep one-time UTC/Pacific conversion internal and test both DST offsets;
  reject invalid Monday/week binding/grace. Never edit scheduler configuration.

### Task 3: Pinned source facts and operation selection

- [x] At the same CLI seam, RED/GREEN native main/compiler/bundle/workflow JSON
  fixtures for uninspected canonical targeting and `already-source-synced`. Add the test to
  `package.json` now so ordinary `npm test` actually runs it.
- [x] Implement only fixed GET reads and bounded literal-data extraction.
  Assert all remote source is treated as data and local generated files do not
  change. Source-synced means bundle slug present regardless of admission path,
  not exact-copy/live proof. Missing override alone cannot prove missing
  admission: direct canonical `surface_targets` are not inspected; hold unknown.
- [x] RED/GREEN final-main drift, unreadable/unsupported source/workflow contract,
  disabled workflow and malformed content envelopes as `ambiguous`.

### Task 4: Existing-work dedupe and advisory catch-up

- [x] RED/GREEN an active old-head sync that blocks new work across editions,
  one existing fixed-branch PR, and a PR that carries only unrelated content.
- [x] RED/GREEN exhausted/inconsistent pagination, unknown status, duplicate PR
  candidates, wrong branch/repository/event and native API failures. None may
  become empty inventory or an operation suggestion.
- [x] RED/GREEN an eligible allowlisted missing edition, after nominal+grace, with
  complete empty inventories: `dispatch-if-authorized` with one structured
  candidate and no command execution. The dedupe key is workflow+main SHA,
  identical across two editions; it is not an exactly-once promise.
- [x] RED/GREEN failed/completed current-main attempts with unexplained gaps as
  `ambiguous`. A completed old-head run never substitutes for current bundle
  or public proof. Repeated CLI calls perform reads only; no state framework.

### Task 5: Consumer canary and delivery gates

- [x] Finish the runbook with bounded actual CLI invocation, status meanings,
  provenance limits and source-only rollback. Independent review checks the
  actual diff against the root spec and the read-only/no-authority boundary.
- [x] Run `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run build`,
  `npm run test:built`, `git diff --check`, and staged/range secret scans;
  capture exits. Keep build-generated baseline content unchanged and inspect
  any unintended local regeneration before commit.
- [ ] A separately exercised one-shot native canary uses an already released
  edition and explicit private supplied snapshot, logs scrubbed diagnostic JSON,
  and confirms no source/input mutation. Never manufacture snapshot claims or
  admit E16 copy to make the canary pass. If full coverage is unavailable, record
  unverified rather than weakening the seam.
- [ ] Commit source for a normal reviewed PR under existing approval. This
  plan introduces no deployment, dispatch, publication, merge-policy waiver,
  timer, paid service or runtime activation. Parent technical check precedes code.
