/**
 * Unit + integration tests for scripts/compileContent.ts.
 * Run via `npm test` (tsx --test).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  resolveSubstratePath,
  deriveCategoryFromLayer,
  mapSubstrateToEntry,
  readSubstrateThoughts,
  dedupBySlug,
  sortByIsoDateDesc,
  generateOutput,
  type ThoughtEntry,
} from '../scripts/compileContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_SUBSTRATE = path.join(__dirname, 'fixtures', 'substrate');

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function clearEnv(name: string): string | undefined {
  const prior = process.env[name];
  delete process.env[name];
  return prior;
}

function restoreEnv(name: string, prior: string | undefined): void {
  if (prior === undefined) delete process.env[name];
  else process.env[name] = prior;
}

// ---------------------------------------------------------------------------
// resolveSubstratePath
// ---------------------------------------------------------------------------

test('resolveSubstratePath returns SUBSTRATE_PATH when env set and dir exists', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const tmp = mkTempDir('substrate-env-');
  try {
    process.env.SUBSTRATE_PATH = tmp;
    const fakeRoot = mkTempDir('proj-');
    assert.equal(resolveSubstratePath(fakeRoot), tmp);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
  }
});

test('resolveSubstratePath falls back to sibling when env unset and sibling exists', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const sibling = path.join(parent, 'dan-mercede-substrate');
  fs.mkdirSync(sibling);
  const projectRoot = path.join(parent, 'consumer');
  fs.mkdirSync(projectRoot);
  try {
    assert.equal(resolveSubstratePath(projectRoot), sibling);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
  }
});

test('resolveSubstratePath returns null when neither env nor sibling exists', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const projectRoot = path.join(parent, 'consumer');
  fs.mkdirSync(projectRoot);
  try {
    assert.equal(resolveSubstratePath(projectRoot), null);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
  }
});

test('resolveSubstratePath falls back to sibling when SUBSTRATE_PATH points to nonexistent dir', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const sibling = path.join(parent, 'dan-mercede-substrate');
  fs.mkdirSync(sibling);
  const projectRoot = path.join(parent, 'consumer');
  fs.mkdirSync(projectRoot);
  try {
    process.env.SUBSTRATE_PATH = path.join(parent, 'does-not-exist');
    assert.equal(resolveSubstratePath(projectRoot), sibling);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
  }
});

// ---------------------------------------------------------------------------
// deriveCategoryFromLayer
// ---------------------------------------------------------------------------

test('deriveCategoryFromLayer: known mapped layers', () => {
  assert.equal(deriveCategoryFromLayer('authority-gate'), 'Architecture');
  assert.equal(deriveCategoryFromLayer('immutable-receipts'), 'Enforcement');
  assert.equal(deriveCategoryFromLayer('fail-closed'), 'Doctrine');
});

test('deriveCategoryFromLayer: unknown layer falls back to Doctrine', () => {
  assert.equal(deriveCategoryFromLayer('not-a-real-layer'), 'Doctrine');
});

test('deriveCategoryFromLayer: non-string falls back to Doctrine', () => {
  assert.equal(deriveCategoryFromLayer(undefined), 'Doctrine');
  assert.equal(deriveCategoryFromLayer(null), 'Doctrine');
  assert.equal(deriveCategoryFromLayer(42), 'Doctrine');
});

// ---------------------------------------------------------------------------
// mapSubstrateToEntry
// ---------------------------------------------------------------------------

function validFrontmatter(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: '2026-05-20-test',
    title: 'Test Title',
    date: '2026-05-20T07:00:00-07:00',
    type: 'essay-long',
    surface_targets: ['danmercede.com'],
    layer: 'authority-gate',
    claim: 'Test claim text.',
    status: 'canonical',
    ...overrides,
  };
}

test('mapSubstrateToEntry: valid canonical maps to ThoughtEntry', () => {
  const entry = mapSubstrateToEntry(validFrontmatter(), 'test.md');
  assert.ok(entry, 'entry should not be null');
  assert.equal(entry!.title, 'Test Title');
  assert.equal(entry!.preview, 'Test claim text.');
  assert.equal(entry!.date, '2026-05-20');
  assert.equal(entry!.category, 'Architecture');
  assert.equal(entry!.slug, '2026-05-20-test');
});

test('mapSubstrateToEntry: filters wrong surface_targets', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ surface_targets: ['linkedin', 'danmercede.online'] }),
    'test.md'
  );
  assert.equal(entry, null);
});

test('mapSubstrateToEntry: filters missing surface_targets', () => {
  const fm = validFrontmatter();
  delete fm.surface_targets;
  assert.equal(mapSubstrateToEntry(fm, 'test.md'), null);
});

test('mapSubstrateToEntry: filters non-canonical status', () => {
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ status: 'draft' }), 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: filters unaccepted type (status-update)', () => {
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ type: 'status-update' }), 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: skips missing required fields (claim)', () => {
  const fm = validFrontmatter();
  delete fm.claim;
  assert.equal(mapSubstrateToEntry(fm, 'test.md'), null);
});

test('mapSubstrateToEntry: skips missing required fields (slug)', () => {
  const fm = validFrontmatter();
  delete fm.slug;
  assert.equal(mapSubstrateToEntry(fm, 'test.md'), null);
});

test('mapSubstrateToEntry: accepts Date object for date (unquoted YAML)', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: new Date('2026-05-20T07:00:00-07:00') }),
    'test.md'
  );
  assert.ok(entry);
  assert.equal(entry!.date, '2026-05-20');
});

test('mapSubstrateToEntry: rejects invalid Date object', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: new Date('not-a-date') }),
    'test.md'
  );
  assert.equal(entry, null);
});

test('mapSubstrateToEntry: TZ-independent date format (UTC runner → PT date)', () => {
  const priorTZ = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    // Late-PT timestamp 2026-05-20T23:30:00-07:00 = 2026-05-21T06:30:00 UTC.
    // Display TZ pinned to LA → date should still be 2026-05-20.
    const entry = mapSubstrateToEntry(
      validFrontmatter({ date: '2026-05-20T23:30:00-07:00' }),
      'test.md'
    );
    assert.ok(entry);
    assert.equal(entry!.date, '2026-05-20');
  } finally {
    restoreEnv('TZ', priorTZ);
  }
});

// ---------------------------------------------------------------------------
// readSubstrateThoughts (end-to-end via fixtures)
// ---------------------------------------------------------------------------

test('readSubstrateThoughts: admits only valid danmercede.com canonical from fixtures', () => {
  const entries = readSubstrateThoughts(FIXTURE_SUBSTRATE);
  assert.equal(entries.length, 1, 'expected exactly one fixture to pass all filters');
  assert.equal(entries[0].slug, '2026-05-20-valid-for-dotcom');
  assert.equal(entries[0].title, 'Pre-Execution Authority Gates');
  assert.equal(entries[0].category, 'Architecture');
  assert.equal(entries[0].date, '2026-05-20');
});

test('readSubstrateThoughts: missing canonical dir returns [] (fail-open)', () => {
  const empty = mkTempDir('substrate-empty-');
  assert.deepEqual(readSubstrateThoughts(empty), []);
});

// ---------------------------------------------------------------------------
// dedupBySlug + sortByIsoDateDesc
// ---------------------------------------------------------------------------

function mkEntry(slug: string, isoDate: string): ThoughtEntry {
  return {
    slug,
    title: `Title ${slug}`,
    preview: `Preview ${slug}`,
    date: isoDate.slice(0, 10),
    category: 'Doctrine',
    isoDate,
  };
}

test('dedupBySlug: later entry wins on duplicate slug', () => {
  const a = mkEntry('s1', '2026-05-20T07:00:00-07:00');
  const b = mkEntry('s1', '2026-05-21T07:00:00-07:00');
  const result = dedupBySlug([a, b]);
  assert.equal(result.length, 1);
  assert.equal(result[0].isoDate, b.isoDate);
});

test('sortByIsoDateDesc: newest first', () => {
  const a = mkEntry('a', '2026-05-20T07:00:00-07:00');
  const b = mkEntry('b', '2026-05-22T07:00:00-07:00');
  const c = mkEntry('c', '2026-05-21T07:00:00-07:00');
  const sorted = sortByIsoDateDesc([a, b, c]);
  assert.deepEqual(sorted.map(e => e.slug), ['b', 'c', 'a']);
});

test('sortByIsoDateDesc: same-day ties broken by slug ascending', () => {
  const a = mkEntry('zzz', '2026-05-20T07:00:00-07:00');
  const b = mkEntry('aaa', '2026-05-20T07:00:00-07:00');
  const sorted = sortByIsoDateDesc([a, b]);
  assert.deepEqual(sorted.map(e => e.slug), ['aaa', 'zzz']);
});

// ---------------------------------------------------------------------------
// generateOutput
// ---------------------------------------------------------------------------

test('generateOutput: emits valid TS with header + import + array', () => {
  const entries: ThoughtEntry[] = [
    {
      slug: 's1',
      title: 'Title 1',
      preview: 'Preview 1',
      date: '2026-05-20',
      category: 'Doctrine',
      isoDate: '2026-05-20T07:00:00-07:00',
    },
  ];
  const out = generateOutput(entries);
  assert.match(out, /GENERATED FILE/);
  assert.match(out, /import type \{ Thought \} from '\.\/types';/);
  assert.match(out, /export const THOUGHTS: Thought\[\] = \[/);
  assert.match(out, /title: "Title 1"/);
  assert.match(out, /preview: "Preview 1"/);
  assert.match(out, /date: "2026-05-20"/);
  assert.match(out, /category: "Doctrine"/);
});

test('generateOutput: zero entries produces empty array literal', () => {
  const out = generateOutput([]);
  assert.match(out, /export const THOUGHTS: Thought\[\] = \[\s*\];/);
});

test('generateOutput: escapes embedded quotes correctly', () => {
  const entries: ThoughtEntry[] = [
    {
      slug: 's1',
      title: 'He said "hello"',
      preview: 'Single \' and double " quotes',
      date: '2026-05-20',
      category: 'Doctrine',
      isoDate: '2026-05-20T07:00:00-07:00',
    },
  ];
  const out = generateOutput(entries);
  assert.match(out, /title: "He said \\"hello\\""/);
  assert.match(out, /preview: "Single ' and double \\" quotes"/);
});
