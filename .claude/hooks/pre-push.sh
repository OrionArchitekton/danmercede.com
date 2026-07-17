#!/usr/bin/env bash
# Repo-local pre-push test gate, consumed by ~/.claude/hooks/pre-push-dispatch.sh.
# DISPATCHER CONTRACT: exit 2 blocks the push; every other status (including a
# plain failure's exit 1) is rewritten to ALLOW by the dispatcher's fail-open
# EXIT trap. Always exit 2 on failure or this gate silently does nothing.
# Coverage boundary: only pushes issued as literal `git push` tool commands
# traverse the dispatcher; scripted pushes (e.g. the sweep safe-push driver)
# bypass this gate entirely (tracked estate-side: postpush-binds non-Bash seam).
set -uo pipefail

fail() { echo "[pre-push gate] $1 FAILED - blocking push (exit 2)" >&2; exit 2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" || fail "resolve repo root"
cd "${REPO_ROOT}" || fail "chdir to repo root"

npx tsc --noEmit || fail "typecheck"
npm test || fail "tests"
