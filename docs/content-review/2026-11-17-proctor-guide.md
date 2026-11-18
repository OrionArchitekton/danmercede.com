# Proctor regression guide review

Reviewed: 2026-11-17

## Source and scope

- Guide: `content/guides/regression-test-ai-agent-prompt-model-change.md`.
- Proctor source: `ed7b11a156cacfc23b646eeb370fab376cbe6d66`.
- Read the source README and AGENTS plus the learner, runner, invariant registry, classifier, field proposer, invoice fake/real paths, fixture data, narrated demo, workflow, store, approval endpoint, and integration test.
- This guide demonstrates synthetic regression detection. It does not claim live-model accuracy, authenticated approval, a production deployment, or a repository merge gate.
- The small downloadable `invoice-contract.mjs` is an independent educational fixture. It is not presented as upstream Proctor code.

## Verified behavior

- Keyless Proctor demo: five fixtures, five structural fields, four invariants; good 45/45 and degraded 40/45. All five failures name `sum_line_items_eq_total`; classification is `real-regression`.
- Upstream unit suite: 77 tests across 11 files passed.
- Upstream durable integration: one test passed, reaching the real workflow hook and resuming it with a decision. The test does not exercise a process crash or multi-day review.
- Standalone fixture: baseline and harmless capitalization pass; incorrect total fails with exit 1; invalid fixture arguments fail with exit 2.

## Environment limitations

The environment provides Node 24.22.1 and a pnpm 11.25.0 wrapper, while upstream pins pnpm 9.12.0. Frozen package installation downloaded locked dependencies but returned `ERR_PNPM_IGNORED_BUILDS` for dependency lifecycle scripts; no build-script approvals were granted. The wrapper then tried to reinstall before `pnpm demo`/`pnpm test`/`pnpm test:int` and returned the same error.

The installed binaries were usable without those lifecycle scripts. Executed the demo as `PROCTOR_FAKE_LLM=1 PROCTOR_GATEWAY=local node --import tsx scripts/seed-demo.ts` and the two suites with `node_modules/.bin/vitest run -c <config>`. This avoids falsely reporting that the wrapper commands succeeded. The direct tsx CLI separately hit an IPC-listener EPERM; Node's supported `--import tsx` execution completed successfully.

The scratch checkout's application source was unchanged. The package manager added local `allowBuilds` placeholders to `pnpm-workspace.yaml`; no new dependencies or source edits were used to obtain the results. The public verification JSON names actual commands.

## Claims deliberately bounded

- The keyless learner uses presence-only structural fields, not learned per-fixture exact values.
- The sum invariant, not a semantic judge, catches this failure.
- The runner's exact/semantic baseline uses first-seen values in the current run. A uniformly wrong candidate can establish its own field-level baseline.
- The narrated demo is not the durable workflow or a live UiPath task. Its successful exit means the demonstration ran, including expected failures.
- Only approved legitimate evolution with a patch versions the contract. Approving a real regression does not turn its report into a passing one.
- The local approval endpoint is unauthenticated and requires hardening before an operational integration.

## Integration notes

Root owns the representative figure at `/assets/guides/agent-regression/contract-regression.webp` and the `?scenario=proctor-drift#gate-simulator` deep link. The guide already references both. It links only to established Proctor/merge-essay routes. Regenerate the guides bundle through `npm run compile:guides`; do not hand-edit it.
