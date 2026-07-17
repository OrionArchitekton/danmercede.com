#!/usr/bin/env bash
# Repo-local pre-push test gate, consumed by the estate safe-push wrapper.
# Nonzero exit blocks the push. Runs the declared quality bar from the repo root.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

npx tsc --noEmit
npm test
