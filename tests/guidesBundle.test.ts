import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
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

// Twin of the THOUGHTS ordering guard in tests/compileContent.test.ts.
// FEATURED_GUIDES = GUIDES.slice(0, 3) (App.tsx) treats this array as newest-first
// with no guard of its own; assert the committed bundle actually is.
// Non-increasing rather than strictly descending, so a same-day publish is legal.
test('shipped GUIDES is ordered newest-first (non-increasing publish date)', () => {
  const dates = GUIDES.map((g) => g.date);
  assert.ok(dates.length > 0, 'GUIDES must not be empty');
  for (let i = 1; i < dates.length; i += 1) {
    assert.ok(
      dates[i - 1] >= dates[i],
      `GUIDES out of order at index ${i}: "${dates[i - 1]}" precedes "${dates[i]}". ` +
        'Regenerate with `node scripts/compileGuides.mjs` and commit.',
    );
  }
});

async function compileMetadata(extra: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'guide-metadata-'));
  try {
    writeFileSync(path.join(dir, 'fixture.md'), [
      '---', 'title: Fixture', 'slug: fixture', 'date: 2026-10-01', 'reviewed: 2026-11-17',
      'category: Testing', 'description: Fixture.', 'lead: Fixture.', extra, '---', 'Body.',
    ].join('\n'));
    return (await compileGuides(dir))[0];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('guide compiler keeps modified and reviewed distinct and requires real modification dates', async () => {
  const guide = await compileMetadata('modified: 2026-11-10');
  assert.equal(guide.date, '2026-10-01');
  assert.equal(guide.modified, '2026-11-10');
  assert.equal(guide.reviewed, '2026-11-17');
  for (const value of ['', '2026-02-30', '2026-09-30', '2026-11-10T00:00:00Z', 'November 10, 2026']) {
    await assert.rejects(compileMetadata(`modified: ${value}`), /fixture\.md:.*modified/);
  }
  await assert.rejects(compileMetadata('modified: 2026-11-10\nmodified: 2026-11-11'), /modified.*appears 2 times/);
});

test('guide compiler rejects missing alt text, unsafe or remote image URLs and ambiguous optional fields', async () => {
  const guide = await compileMetadata('image: /assets/guides/testing/contract.webp\nimage_alt: A changed invoice fails its contract.');
  assert.equal(guide.image, '/assets/guides/testing/contract.webp');
  assert.equal(guide.imageAlt, 'A changed invoice fails its contract.');
  for (const fields of [
    'image: /assets/guides/testing/contract.webp',
    'image_alt: Missing the asset.',
    'image: https://example.com/figure.png\nimage_alt: External.',
    'image: //example.com/figure.png\nimage_alt: External.',
    'image: /assets/guides/../private.png\nimage_alt: Traversal.',
    'image: /assets/guides/%2e%2e/private.png\nimage_alt: Encoded traversal.',
    'image: /assets/guides/testing/contract.svg\nimage_alt: Unsupported social raster.',
    'image: /assets/guides/testing/contract.webp\nimage_alt: ""',
    'image : /assets/guides/testing/contract.webp\nimage_alt: Misspelled field.',
    'image: /assets/guides/testing/contract.webp\nimage_alt: One\nimage_alt: Two',
  ]) {
    await assert.rejects(compileMetadata(fields), /fixture\.md:.*image/);
  }
});

test('every declared guide article image exists in public and carries meaningful alt text', () => {
  for (const guide of GUIDES.filter((g) => g.image)) {
    const file = path.join(root, 'public', guide.image!);
    assert.ok(statSync(file).size > 0, `${guide.slug}: image asset must be non-empty`);
    assert.ok(guide.imageAlt && guide.imageAlt.trim().length > 10, `${guide.slug}: describe the article figure`);
  }
});
