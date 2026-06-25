import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../constants.guides.generated';
import { compileGuides, renderBundle } from '../scripts/compileGuides.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('GUIDES corpus is non-empty and carries the self-hosting guide with all fields', () => {
  assert.ok(GUIDES.length > 0, 'expected at least one guide');
  const g = GUIDES.find((x) => x.slug === 'self-hosting-websites-and-apps');
  assert.ok(g, 'self-hosting guide present in GUIDES');
  for (const field of ['title', 'slug', 'date', 'category', 'description', 'lead', 'body'] as const) {
    assert.ok(g![field] && g![field].length > 0, `guide field "${field}" is non-empty`);
  }
  assert.ok(g!.body.length > 1000, 'guide body is substantial');
});

// Drift guard: the committed constants.guides.generated.ts MUST equal a fresh
// compile of content/guides/*.md. Editing a guide's markdown without rerunning
// the generator (and committing) fails CI here — the generated bundle is what the
// site/tests/injector consume, so it must never go stale relative to its source.
test('committed constants.guides.generated.ts matches a fresh compile (no .md/.ts drift)', async () => {
  const fresh = renderBundle(await compileGuides());
  const committed = readFileSync(path.join(root, 'constants.guides.generated.ts'), 'utf8');
  assert.equal(
    committed,
    fresh,
    'constants.guides.generated.ts is stale — run `node scripts/compileGuides.mjs` and commit the result.',
  );
});
