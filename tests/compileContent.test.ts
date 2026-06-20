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

import { THOUGHTS } from '../constants.js';
import {
  resolveSubstratePath,
  deriveCategoryFromLayer,
  delinkWikiLinks,
  mapSubstrateToEntry,
  readSubstrateThoughts,
  readSubstrateWithDiagnostics,
  dedupBySlug,
  sortByIsoDateDesc,
  generateOutput,
  decideOutput,
  formatCompileStatus,
  COMPILE_STATUS_FILENAME,
  HUB_ESSAY_ALLOWLIST,
  type ThoughtEntry,
  type SubstrateDiagnostic,
  type OutputDecision,
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

test('resolveSubstratePath survives statSync throwing (path component is a file → ENOTDIR)', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const sibling = path.join(parent, 'dan-mercede-substrate');
  fs.mkdirSync(sibling);
  const projectRoot = path.join(parent, 'consumer');
  fs.mkdirSync(projectRoot);
  const blocker = path.join(parent, 'a-regular-file');
  fs.writeFileSync(blocker, 'not a directory', 'utf-8');
  try {
    // statSync on a path whose component is a regular file throws ENOTDIR;
    // resolution must treat that as "unusable" and fall through, not crash.
    process.env.SUBSTRATE_PATH = path.join(blocker, 'child');
    assert.equal(resolveSubstratePath(projectRoot), sibling);
  } finally {
    restoreEnv('SUBSTRATE_PATH', prior);
  }
});

test('resolveSubstratePath returns null when SUBSTRATE_PATH points at a file (not a directory)', () => {
  const prior = clearEnv('SUBSTRATE_PATH');
  const parent = mkTempDir('parent-');
  const projectRoot = path.join(parent, 'consumer');
  fs.mkdirSync(projectRoot);
  const filePath = path.join(parent, 'a-regular-file');
  fs.writeFileSync(filePath, 'not a directory', 'utf-8');
  try {
    process.env.SUBSTRATE_PATH = filePath;
    assert.equal(resolveSubstratePath(projectRoot), null);
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
  const entry = mapSubstrateToEntry(
    validFrontmatter(),
    'Full essay paragraph one.\n\nFull essay paragraph two.',
    'test.md'
  );
  assert.ok(entry, 'entry should not be null');
  assert.equal(entry!.title, 'Test Title');
  assert.equal(entry!.preview, 'Test claim text.');
  assert.equal(entry!.date, '2026-05-20');
  assert.equal(entry!.category, 'Architecture');
  assert.equal(entry!.slug, '2026-05-20-test');
  // R1: the full essay body is carried through verbatim (not just the claim).
  assert.equal(entry!.body, 'Full essay paragraph one.\n\nFull essay paragraph two.');
});

test('mapSubstrateToEntry: filters wrong surface_targets', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ surface_targets: ['linkedin', 'danmercede.online'] }),
    '', 'test.md'
  );
  assert.equal(entry, null);
});

test('mapSubstrateToEntry: filters missing surface_targets', () => {
  const fm = validFrontmatter();
  delete fm.surface_targets;
  assert.equal(mapSubstrateToEntry(fm, '', 'test.md'), null);
});

test('mapSubstrateToEntry: filters non-canonical status', () => {
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ status: 'draft' }), '', 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: filters unaccepted type (status-update)', () => {
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ type: 'status-update' }), '', 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: skips missing required fields (claim)', () => {
  const fm = validFrontmatter();
  delete fm.claim;
  assert.equal(mapSubstrateToEntry(fm, '', 'test.md'), null);
});

test('mapSubstrateToEntry: skips missing required fields (slug)', () => {
  const fm = validFrontmatter();
  delete fm.slug;
  assert.equal(mapSubstrateToEntry(fm, '', 'test.md'), null);
});

test('mapSubstrateToEntry: accepts Date object for date (unquoted YAML)', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: new Date('2026-05-20T07:00:00-07:00') }),
    '', 'test.md'
  );
  assert.ok(entry);
  assert.equal(entry!.date, '2026-05-20');
});

test('mapSubstrateToEntry: rejects invalid Date object', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: new Date('not-a-date') }),
    '', 'test.md'
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
      '', 'test.md'
    );
    assert.ok(entry);
    assert.equal(entry!.date, '2026-05-20');
  } finally {
    restoreEnv('TZ', priorTZ);
  }
});

test('mapSubstrateToEntry: rejects engine-dependent date string ("May 20 2026")', () => {
  // new Date('May 20 2026') parses in the PROCESS timezone — runner-dependent.
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ date: 'May 20 2026' }), '', 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: rejects space-separated datetime ("2026-05-20 00:00:00")', () => {
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ date: '2026-05-20 00:00:00' }), '', 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: rejects offset-less ISO datetime (runner-local semantics)', () => {
  // ECMAScript parses `2026-05-20T14:30:00` as LOCAL time → differs per runner.
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ date: '2026-05-20T14:30:00' }), '', 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: rejects impossible calendar fields the engine would normalize', () => {
  // V8 silently rolls these over (Feb 30 → Mar 2, Apr 31 → May 1, hour 24 →
  // next day) instead of rejecting; the explicit field validator must catch
  // them so strict sync fails loud rather than committing corrupted dates.
  for (const date of [
    '2026-02-30T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-05-20T24:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-05-20T14:60:00Z',
    '2026-05-20T14:30:60Z',
  ]) {
    assert.equal(
      mapSubstrateToEntry(validFrontmatter({ date }), '', 'test.md'),
      null,
      `expected rejection for ${date}`
    );
  }
});

test('mapSubstrateToEntry: rejects bare ±HH timezone offset (engine-unparseable)', () => {
  // ISO 8601 permits `-07`, but ECMAScript returns Invalid Date for it —
  // the regex intentionally matches only the engine-parseable ISO subset.
  assert.equal(
    mapSubstrateToEntry(validFrontmatter({ date: '2026-05-20T07:00:00-07' }), '', 'test.md'),
    null
  );
});

test('mapSubstrateToEntry: accepts strict ISO instants with explicit timezone', () => {
  for (const date of [
    '2026-05-20T14:30Z',
    '2026-05-20T14:30:00Z',
    '2026-05-20T14:30:00.123Z',
    '2026-05-20T07:00:00-07:00',
    '2026-05-20T07:00:00-0700',
  ]) {
    const entry = mapSubstrateToEntry(validFrontmatter({ date }), '', 'test.md');
    assert.ok(entry, `expected acceptance for ${date}`);
    assert.equal(entry!.date, '2026-05-20', `expected PT day for ${date}`);
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
  // R1: the canonical markdown body (below the frontmatter) is extracted.
  assert.ok(entries[0].body.length > 0, 'full essay body must be extracted, not empty');
  assert.match(entries[0].body, /Body text/);
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
    body: `Body for ${slug}.`,
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
      body: 'Para one.\n\nPara two.',
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
  assert.match(out, /slug: "s1"/);
  // Multi-line body serialized as a single-line newline-escaped TS literal.
  assert.match(out, /body: "Para one\.\\n\\nPara two\."/);
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
      body: 'Body with "quotes" & <angle> brackets.',
      isoDate: '2026-05-20T07:00:00-07:00',
    },
  ];
  const out = generateOutput(entries);
  assert.match(out, /title: "He said \\"hello\\""/);
  assert.match(out, /preview: "Single ' and double \\" quotes"/);
  assert.match(out, /body: "Body with \\"quotes\\" & <angle> brackets\."/);
});

// ---------------------------------------------------------------------------
// Date-only handling (regression: timezone shift bug)
//
// Without the fix, `date: 2026-05-20` (quoted OR unquoted YAML) is parsed as
// UTC midnight (2026-05-20T00:00:00.000Z) and PT_DATE_FORMATTER renders it as
// "2026-05-19" in America/Los_Angeles. The fix preserves date-only inputs as
// literal calendar days.
// ---------------------------------------------------------------------------

test('mapSubstrateToEntry: quoted date-only string preserves calendar day (no PT shift)', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: '2026-05-20' }),
    '', 'test.md'
  );
  assert.ok(entry, 'date-only quoted string should map');
  assert.equal(entry!.date, '2026-05-20', 'must NOT shift back to 2026-05-19 in PT');
});

test('mapSubstrateToEntry: UTC-midnight Date object preserves calendar day', () => {
  // Historical timestamp-aware YAML parsers converted `date: 2026-05-20`
  // (unquoted) to a Date at UTC midnight; keep direct Date support stable.
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: new Date('2026-05-20T00:00:00.000Z') }),
    '', 'test.md'
  );
  assert.ok(entry, 'date-only Date object should map');
  assert.equal(entry!.date, '2026-05-20', 'must NOT shift back to 2026-05-19 in PT');
});

test('mapSubstrateToEntry: date-only preserved under UTC runner TZ', () => {
  const priorTZ = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const entry = mapSubstrateToEntry(
      validFrontmatter({ date: '2026-05-20' }),
      '', 'test.md'
    );
    assert.ok(entry);
    assert.equal(entry!.date, '2026-05-20');
  } finally {
    restoreEnv('TZ', priorTZ);
  }
});

test('mapSubstrateToEntry: date-only preserved under Asia/Tokyo runner TZ (ahead of UTC)', () => {
  const priorTZ = process.env.TZ;
  process.env.TZ = 'Asia/Tokyo';
  try {
    const entry = mapSubstrateToEntry(
      validFrontmatter({ date: '2026-05-20' }),
      '', 'test.md'
    );
    assert.ok(entry);
    // Should still be 2026-05-20, not shifted forward to 2026-05-21.
    assert.equal(entry!.date, '2026-05-20');
  } finally {
    restoreEnv('TZ', priorTZ);
  }
});

test('mapSubstrateToEntry: rejects calendar-impossible date-only (2026-02-30)', () => {
  const entry = mapSubstrateToEntry(
    validFrontmatter({ date: '2026-02-30' }),
    '', 'test.md'
  );
  assert.equal(entry, null, 'February 30 is not a real calendar day');
});

test('mapSubstrateToEntry: full ISO timestamp with offset still formats in PT', () => {
  const priorTZ = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    // 2026-05-20T23:30:00-07:00 = 2026-05-21T06:30:00Z. Should render as
    // 2026-05-20 in LA (the offset already locates it as a PT evening).
    const entry = mapSubstrateToEntry(
      validFrontmatter({ date: '2026-05-20T23:30:00-07:00' }),
      '', 'test.md'
    );
    assert.ok(entry);
    assert.equal(entry!.date, '2026-05-20');
  } finally {
    restoreEnv('TZ', priorTZ);
  }
});

// ---------------------------------------------------------------------------
// readSubstrateWithDiagnostics + strict-mode fatal classification
//
// Regression: prior behavior would skip a corrupt would-be-published canonical
// and silently strip it from the generated bundle. Strict mode must fail-loud
// on FATAL diagnostics (matched-target + missing field, matched-target +
// invalid date, unreadable file, YAML parse failure). Skip-class diagnostics
// (wrong surface/status/type) must remain non-fatal.
// ---------------------------------------------------------------------------

function writeCanonical(dir: string, name: string, body: string): void {
  fs.writeFileSync(path.join(dir, name), body, 'utf-8');
}

function mkSubstrateRoot(): string {
  const root = mkTempDir('substrate-strict-');
  const canonical = path.join(root, 'publishing', 'canonical');
  fs.mkdirSync(canonical, { recursive: true });
  return root;
}

test('readSubstrateWithDiagnostics: matched-target with missing required field → FATAL diag', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  // Matches surface/status/type but has NO claim → would-have-published but is corrupt.
  writeCanonical(canonical, 'bad-missing-claim.md', [
    '---',
    'slug: 2026-05-20-bad',
    'title: Bad Canonical',
    'date: 2026-05-20',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.com',
    'layer: authority-gate',
    'status: canonical',
    '---',
    '',
    'body',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  assert.equal(result.entries.length, 0);
  const fatals = result.diagnostics.filter(d => d.severity === 'fatal');
  assert.equal(fatals.length, 1, 'matched-target + missing claim must be FATAL');
  assert.match(fatals[0].reason, /missing required/);
});

test('readSubstrateWithDiagnostics: matched-target with invalid date → FATAL diag', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  writeCanonical(canonical, 'bad-date.md', [
    '---',
    'slug: 2026-05-20-bad-date',
    'title: Bad Date',
    'date: not-a-real-date',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.com',
    'layer: authority-gate',
    'claim: claim text',
    'status: canonical',
    '---',
    '',
    'body',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  assert.equal(result.entries.length, 0);
  const fatals = result.diagnostics.filter(d => d.severity === 'fatal');
  assert.equal(fatals.length, 1);
  assert.match(fatals[0].reason, /invalid date/);
});

test('readSubstrateWithDiagnostics: YAML parse failure → FATAL diag', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  writeCanonical(canonical, 'broken-yaml.md', [
    '---',
    'slug: x',
    'title: [unclosed',
    '---',
    '',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  const fatals = result.diagnostics.filter(d => d.severity === 'fatal');
  assert.equal(fatals.length, 1);
  assert.match(fatals[0].reason, /YAML parse failed/);
});

test('readSubstrateWithDiagnostics: wrong surface_targets → SKIP diag only (not fatal)', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  writeCanonical(canonical, 'wrong-surface.md', [
    '---',
    'slug: 2026-05-20-other',
    'title: Other Surface',
    'date: 2026-05-20',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.online',
    'layer: authority-gate',
    'claim: claim',
    'status: canonical',
    '---',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  const fatals = result.diagnostics.filter(d => d.severity === 'fatal');
  assert.equal(fatals.length, 0, 'wrong surface must NOT be fatal');
  const skips = result.diagnostics.filter(d => d.severity === 'skip');
  assert.equal(skips.length, 1);
});

test('readSubstrateWithDiagnostics: draft status → SKIP diag only', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  writeCanonical(canonical, 'draft.md', [
    '---',
    'slug: 2026-05-20-draft',
    'title: Draft',
    'date: 2026-05-20',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.com',
    'layer: authority-gate',
    'claim: claim',
    'status: draft',
    '---',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  assert.equal(result.diagnostics.filter(d => d.severity === 'fatal').length, 0);
  assert.equal(result.diagnostics.filter(d => d.severity === 'skip').length, 1);
});

test('readSubstrateWithDiagnostics: mixed substrate (1 valid + 1 fatal) → entry yielded AND fatal diag', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  writeCanonical(canonical, 'valid.md', [
    '---',
    'slug: 2026-05-20-valid',
    'title: Valid',
    'date: 2026-05-20',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.com',
    'layer: authority-gate',
    'claim: valid claim',
    'status: canonical',
    '---',
  ].join('\n'));
  writeCanonical(canonical, 'bad.md', [
    '---',
    'slug: 2026-05-21-bad',
    'title: Bad',
    'date: 2026-05-21',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.com',
    'layer: authority-gate',
    // no claim → matched-target corruption
    'status: canonical',
    '---',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  assert.equal(result.entries.length, 1, 'valid entry still yielded');
  const fatals = result.diagnostics.filter(d => d.severity === 'fatal');
  assert.equal(fatals.length, 1, 'one fatal raised for partial corruption');
  // This is the key signal: under strict mode main() will see entries.length>0
  // (which used to be the only fail-loud gate) but ALSO see a fatal diag and
  // refuse to write a partial bundle.
});

// ---------------------------------------------------------------------------
// Cycle-2 regression: the frontmatter parser must NOT auto-coerce YAML dates
// to Date objects (JSON_SCHEMA engine). A UTC-midnight ISO timestamp string
// must route through the PT-formatting path, not the calendar-literal path.
// ---------------------------------------------------------------------------

test('readSubstrateWithDiagnostics: unquoted YYYY-MM-DD is received as STRING, not Date (JSON_SCHEMA engine)', () => {
  const root = mkSubstrateRoot();
  const canonical = path.join(root, 'publishing', 'canonical');
  writeCanonical(canonical, 'date-only.md', [
    '---',
    'slug: 2026-05-20-date-only',
    'title: Date Only',
    'date: 2026-05-20',
    'type: essay-long',
    'surface_targets:',
    '  - danmercede.com',
    'layer: authority-gate',
    'claim: claim',
    'status: canonical',
    '---',
  ].join('\n'));
  const result = readSubstrateWithDiagnostics(root);
  assert.equal(result.entries.length, 1);
  // Calendar literal preserved regardless of runner TZ.
  assert.equal(result.entries[0].date, '2026-05-20');
});

test('readSubstrateWithDiagnostics: UTC-midnight ISO timestamp renders as PT day (not calendar literal)', () => {
  const priorTZ = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const root = mkSubstrateRoot();
    const canonical = path.join(root, 'publishing', 'canonical');
    // Real instant at UTC midnight = PT 17:00 of the prior day.
    writeCanonical(canonical, 'utc-midnight.md', [
      '---',
      'slug: 2026-05-20-utc-midnight',
      'title: UTC Midnight',
      'date: 2026-05-20T00:00:00Z',
      'type: essay-long',
      'surface_targets:',
      '  - danmercede.com',
      'layer: authority-gate',
      'claim: claim',
      'status: canonical',
      '---',
    ].join('\n'));
    const result = readSubstrateWithDiagnostics(root);
    assert.equal(result.entries.length, 1);
    // 2026-05-20T00:00:00Z = 2026-05-19T17:00:00 PT — must render as PT day.
    // BEFORE cycle-2 fix this incorrectly returned "2026-05-20" because the
    // Date object's iso ended in "T00:00:00.000Z" and was treated as
    // date-only YAML.
    assert.equal(result.entries[0].date, '2026-05-19');
  } finally {
    restoreEnv('TZ', priorTZ);
  }
});

// ---------------------------------------------------------------------------
// Cycle-2 regression: duplicate slugs raise FATAL diag (not silent "last wins")
// ---------------------------------------------------------------------------

test('dedupBySlug: duplicate slug raises FATAL diagnostic when diagnostics provided', () => {
  const a = mkEntry('dup', '2026-05-20T07:00:00-07:00');
  const b = mkEntry('dup', '2026-05-21T07:00:00-07:00');
  const diagnostics: SubstrateDiagnostic[] = [];
  const result = dedupBySlug([a, b], diagnostics);
  assert.equal(result.length, 1);
  const fatals = diagnostics.filter(d => d.severity === 'fatal');
  assert.equal(fatals.length, 1);
  assert.match(fatals[0].reason, /duplicate slug "dup"/);
});

test('dedupBySlug: no diagnostics param preserves legacy "last wins" behavior (no throw)', () => {
  const a = mkEntry('dup', '2026-05-20T07:00:00-07:00');
  const b = mkEntry('dup', '2026-05-21T07:00:00-07:00');
  const result = dedupBySlug([a, b]);
  assert.equal(result.length, 1);
  assert.equal(result[0].isoDate, b.isoDate);
});

test('dedupBySlug: distinct slugs do not raise diagnostics', () => {
  const a = mkEntry('s1', '2026-05-20T07:00:00-07:00');
  const b = mkEntry('s2', '2026-05-21T07:00:00-07:00');
  const diagnostics: SubstrateDiagnostic[] = [];
  const result = dedupBySlug([a, b], diagnostics);
  assert.equal(result.length, 2);
  assert.equal(diagnostics.filter(d => d.severity === 'fatal').length, 0);
});

// ---------------------------------------------------------------------------
// Cycle-3 regression: decideOutput must skip (not write) in FAIL-OPEN mode
// when fatal diagnostics are present. Previously, fail-open + fatal diags +
// non-zero entries would overwrite constants.generated.ts with the partial
// bundle, silently dropping intended public content. The fix is to skip
// (preserve committed bundle) on fatal diagnostics in fail-open mode and
// fail (exit 1) in strict mode.
// ---------------------------------------------------------------------------

test('decideOutput: fail-open + fatal diagnostic + valid entry → SKIP (preserve committed bundle)', () => {
  const validEntry = mkEntry('s-valid', '2026-05-20T07:00:00-07:00');
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/fake',
    entries: [validEntry],
    diagnostics: [{ file: 'bad.md', severity: 'fatal', reason: 'missing required claim' }],
    strict: false,
    requireMatches: false,
  });
  assert.equal(decision.action, 'skip');
  if (decision.action === 'skip') {
    assert.match(decision.reason, /fatal corruption/);
    assert.match(decision.reason, /bad\.md/);
  }
});

test('decideOutput: strict + fatal diagnostic + valid entry → FAIL (exit 1)', () => {
  const validEntry = mkEntry('s-valid', '2026-05-20T07:00:00-07:00');
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/fake',
    entries: [validEntry],
    diagnostics: [{ file: 'bad.md', severity: 'fatal', reason: 'missing required claim' }],
    strict: true,
    requireMatches: false,
  });
  assert.equal(decision.action, 'fail');
});

test('decideOutput: fail-open + no fatal + valid entries → WRITE', () => {
  const entry = mkEntry('s-valid', '2026-05-20T07:00:00-07:00');
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/fake',
    entries: [entry],
    diagnostics: [{ file: 'skip.md', severity: 'skip', reason: 'wrong surface_targets' }],
    strict: false,
    requireMatches: false,
  });
  assert.equal(decision.action, 'write');
  if (decision.action === 'write') {
    assert.equal(decision.entryCount, 1);
    assert.match(decision.content, /THOUGHTS: Thought\[\]/);
  }
});

test('decideOutput: fail-open + 0 entries + no fatal → SKIP', () => {
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/fake',
    entries: [],
    diagnostics: [],
    strict: false,
    requireMatches: false,
  });
  assert.equal(decision.action, 'skip');
  if (decision.action === 'skip') {
    assert.match(decision.reason, /0 canonicals/);
  }
});

test('decideOutput: require-matches + 0 entries → FAIL', () => {
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/fake',
    entries: [],
    diagnostics: [],
    strict: false,
    requireMatches: true,
  });
  assert.equal(decision.action, 'fail');
});

test('decideOutput: substrate unreachable + fail-open → SKIP', () => {
  const decision = decideOutput({
    substrateReachable: false,
    substratePath: null,
    entries: [],
    diagnostics: [],
    strict: false,
    requireMatches: false,
  });
  assert.equal(decision.action, 'skip');
});

test('decideOutput: substrate unreachable + strict → FAIL', () => {
  const decision = decideOutput({
    substrateReachable: false,
    substratePath: null,
    entries: [],
    diagnostics: [],
    strict: true,
    requireMatches: false,
  });
  assert.equal(decision.action, 'fail');
});

// ---------------------------------------------------------------------------
// formatCompileStatus + COMPILE_STATUS_FILENAME — cycle-6 zero-match-bypass guard
// ---------------------------------------------------------------------------

test('formatCompileStatus: write decision → "WROTE"', () => {
  const decision: OutputDecision = { action: 'write', content: 'x', entryCount: 1 };
  assert.equal(formatCompileStatus(decision), 'WROTE');
});

test('formatCompileStatus: skip decision → "SKIPPED"', () => {
  const decision: OutputDecision = { action: 'skip', reason: 'zero matches' };
  assert.equal(formatCompileStatus(decision), 'SKIPPED');
});

test('formatCompileStatus: fail decision → "SKIPPED" (marker never written on fail, but the function is total)', () => {
  // main() does not write the marker on fail (the process exits before any
  // subsequent CI step runs), but formatCompileStatus is a total function so
  // the type checker can prove the switch in main() is exhaustive. SKIPPED
  // is the safe default — a CI consumer that somehow sees a stale fail-state
  // marker treats it as "do not trust as fresh-compile output", which is
  // exactly the desired fail-closed behavior.
  const decision: OutputDecision = { action: 'fail', reason: 'unreachable' };
  assert.equal(formatCompileStatus(decision), 'SKIPPED');
});

test('COMPILE_STATUS_FILENAME: stable contract with CI', () => {
  // The CI workflow (.github/workflows/ci.yml) reads `.compile-status`
  // verbatim — this assertion locks the filename so a rename here cannot
  // silently desync the workflow.
  assert.equal(COMPILE_STATUS_FILENAME, '.compile-status');
});

// ---------------------------------------------------------------------------
// HUB_ESSAY_ALLOWLIST (flagship-essay consumer-side admission)
// ---------------------------------------------------------------------------

test('HUB_ESSAY_ALLOWLIST contains the 2 flagship essays', () => {
  assert.ok(HUB_ESSAY_ALLOWLIST.includes('2026-06-08-authority-gate-made-runnable'));
  assert.ok(HUB_ESSAY_ALLOWLIST.includes('2026-05-20-pre-execution-authority-gates'));
});

test('mapSubstrateToEntry admits an allowlisted slug whose surface_targets exclude danmercede.com', () => {
  const slug = HUB_ESSAY_ALLOWLIST[0];
  const data = {
    slug,
    title: 'The Authority Gate',
    date: '2026-06-08',
    claim: 'A claim.',
    status: 'canonical',
    type: 'essay-long',
    layer: 'authority-gate',
    surface_targets: ['linkedin', 'danmercede.online'],
  };
  const entry = mapSubstrateToEntry(data, 'Essay body.', `${slug}.md`);
  assert.ok(entry, 'allowlisted essay should be admitted');
  assert.equal(entry?.slug, slug);
  assert.equal(entry?.category, 'Architecture'); // layer authority-gate -> Architecture
  assert.equal(entry?.body, 'Essay body.');
});

test('mapSubstrateToEntry still skips a non-allowlisted slug whose surface_targets exclude danmercede.com', () => {
  const data = {
    slug: 'not-allowlisted-slug',
    title: 'X',
    date: '2026-06-08',
    claim: 'C.',
    status: 'canonical',
    type: 'essay-long',
    surface_targets: ['linkedin'],
  };
  assert.equal(mapSubstrateToEntry(data, 'b', 'x.md'), null);
});

test('allowlist overrides ONLY surface_targets — an allowlisted slug of an unaccepted type is still skipped', () => {
  const slug = HUB_ESSAY_ALLOWLIST[0];
  const data = {
    slug,
    title: 'X',
    date: '2026-06-08',
    claim: 'C.',
    status: 'canonical',
    type: 'diagram',
    surface_targets: ['linkedin'],
  };
  assert.equal(mapSubstrateToEntry(data, 'b', 'x.md'), null);
});

// ---------------------------------------------------------------------------
// delinkWikiLinks (no [[wiki-link]] tokens leak onto the public .com page)
// ---------------------------------------------------------------------------

test('delinkWikiLinks rewrites [[target]] and [[target|display]], preserving code spans', () => {
  assert.equal(delinkWikiLinks('the [[authority-gate]] holds'), 'the authority gate holds');
  assert.equal(delinkWikiLinks('see [[immutable-receipts|receipts]] now'), 'see receipts now');
  // inline + fenced code preserved verbatim (a Bash `[[ ]]` is not wiki markup)
  assert.equal(delinkWikiLinks('run `if [[ $x ]]; then` ok'), 'run `if [[ $x ]]; then` ok');
  assert.equal(delinkWikiLinks('```\n[[ 1, 2 ]]\n```'), '```\n[[ 1, 2 ]]\n```');
});

test('no published THOUGHTS body carries a residual [[ wiki-link outside code (leak guard)', () => {
  const stripCode = (s: string): string => s.replace(/```[\s\S]*?```|`[^`\n]+`/g, '');
  for (const t of THOUGHTS) {
    assert.ok(
      !stripCode(t.body).includes('[['),
      `THOUGHT ${t.slug} body has a residual [[ wiki-link (must be de-linked before bake)`,
    );
  }
});
