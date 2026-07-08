import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const WORKFLOW = readFileSync(
  new URL('../.github/workflows/required-checks-fail-closed.yml', import.meta.url),
  'utf8',
);
const CI = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const PKG = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };

describe('required-checks-fail-closed workflow', () => {
  it('does not run the PR-open gate on closed or merged pull_request events', () => {
    assert.match(WORKFLOW, /^\s+types:\s*$/m);

    const typesBlock = WORKFLOW.match(/^\s+types:\s*\n(?<items>(?:\s+- .+\n)+)/m);
    assert.ok(typesBlock?.groups?.items, 'pull_request types block is required');

    const types = [...typesBlock.groups.items.matchAll(/^\s+-\s+(.+)\s*$/gm)].map(
      (match) => match[1].trim(),
    );

    assert.deepEqual(types, ['opened', 'reopened', 'synchronize']);
    assert.ok(!types.includes('closed'), 'closed pull_request events must not run this gate');
  });
});

// The extractability linter (A2) is wired as a fail-closed REQUIRED check. That
// enforcement is a THREE-mirror invariant that must move in lockstep, or the
// gate silently drifts (catalog-mirror-drift on the consumed surface):
//   (1) package.json `test`/`test:extractability` runs the linter,
//   (2) ci.yml defines an `extractability` job that emits the check-run, and
//   (3) required-checks-fail-closed.yml lists `extractability` in
//       BASE_REQUIRED_CHECKS so the fail-closed gate actually waits on it.
// This suite locks all three: drop any one and it goes RED.
describe('extractability linter is a fail-closed REQUIRED check (3-mirror lockstep)', () => {
  const base = WORKFLOW.match(/BASE_REQUIRED_CHECKS:\s*"([^"]+)"/);
  const requiredChecks = (base?.[1] ?? '').split(',').map((s) => s.trim());

  it('BASE_REQUIRED_CHECKS lists extractability (the gate waits on it)', () => {
    assert.ok(base, 'BASE_REQUIRED_CHECKS must be declared in the gate workflow');
    assert.ok(
      requiredChecks.includes('extractability'),
      `extractability must be a required check; got [${requiredChecks.join(', ')}]`,
    );
  });

  it('the package.json test surface runs the extractability linter', () => {
    assert.match(
      PKG.scripts.test,
      /tests\/extractability\.test\.ts/,
      'the aggregate `test` script must include tests/extractability.test.ts',
    );
    assert.match(
      PKG.scripts['test:extractability'] ?? '',
      /tests\/extractability\.test\.ts/,
      'a dedicated `test:extractability` script must run the linter',
    );
  });

  it('ci.yml defines the extractability check-run job that runs the linter', () => {
    // The fail-closed gate resolves required checks by check-run NAME; a GitHub
    // Actions job's check-run name is its `name:` field. So the job must be
    // named `extractability` and invoke the dedicated linter script.
    assert.match(CI, /^\s+extractability:\s*$/m, 'ci.yml must define an `extractability` job');
    assert.match(CI, /name:\s*extractability\b/, 'the job must be named `extractability`');
    assert.match(CI, /npm run test:extractability/, 'the job must run the linter');
  });
});
