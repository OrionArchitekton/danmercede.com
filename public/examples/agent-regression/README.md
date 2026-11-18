# Agent regression example

Companion to [How to regression-test an AI agent after a prompt or model change](https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change).

`invoice-contract.mjs` is a small educational fixture, not Proctor's engine. It runs with Node.js 20+ without dependencies, network calls, or file writes.

```bash
node invoice-contract.mjs
node invoice-contract.mjs --check baseline
node invoice-contract.mjs --check formatting
node invoice-contract.mjs --check regressed
```

The default command expects two passing invoices and one deliberately failing invoice; it exits 0 when those decisions reproduce. Checking `baseline` or `formatting` exits 0. Checking `regressed` exits 1. Invalid arguments exit 2. The helper exports can also be imported without running the command-line demonstration.

Amounts are integer cents. The checks verify a nonempty vendor, USD currency, numeric amounts, and a matching line-item sum. They do not prove the output faithfully matches an original invoice. If both the items and total change consistently, the arithmetic check can still pass.

`verification.json` records the commands and outcomes actually observed while preparing the guide. Proctor's separate keyless demonstration and upstream tests were executed from the pinned source revision, with no live-model or remote-tenant verification claimed.
