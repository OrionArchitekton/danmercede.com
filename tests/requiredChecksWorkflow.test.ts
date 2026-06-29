import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const WORKFLOW = readFileSync(
  new URL('../.github/workflows/required-checks-fail-closed.yml', import.meta.url),
  'utf8',
);

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
