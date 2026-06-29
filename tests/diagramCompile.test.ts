/**
 * S1a: the substrate compiler must admit `type: diagram` canonicals (targeted at
 * danmercede.com) and map them to a DiagramEntry — mirroring mapSubstrateToEntry
 * for essays. Diagrams carry alt_text/caption/asset_path instead of an essay body.
 *
 * RED (this slice): mapSubstrateToDiagram does not exist yet; compileContent only
 * accepts `essay-long`. This test fails at import until S1a GREEN adds the mapper.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  mapSubstrateToDiagram,
  readSubstrateWithDiagnostics,
  generateOutput,
  decideOutput,
  isSafeRelativePath,
  copyDiagramAsset,
  HUB_DIAGRAM_ALLOWLIST,
  type DiagramEntry,
  type SubstrateDiagnostic,
} from '../scripts/compileContent.js';
import { DIAGRAMS } from '../constants.js';

const sampleDiagram: DiagramEntry = {
  title: 'Monitoring vs Enforcement Architecture',
  slug: '2026-03-24-monitoring-vs-enforcement-architecture',
  date: '2026-03-24',
  isoDate: '2026-03-24T15:00:00.000Z',
  alt: 'Architecture A vs B.',
  caption: 'The architecture divide, stated plainly.',
  assetPath: 'publishing/assets/2026-03-24-monitoring-vs-enforcement-architecture/diagram.jpg',
};

function mkTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// A real-shaped diagram canonical (JSON-quoted frontmatter, as substrate writes
// canonicals), with danmercede.com added to surface_targets (decision #1).
const DIAGRAM_MD = `---
"slug": "2026-03-24-monitoring-vs-enforcement-architecture"
"title": "Monitoring vs Enforcement Architecture"
"date": "2026-03-24T08:00:00-07:00"
"type": "diagram"
"surface_targets":
- "danmercede.online"
- "danmercede.com"
"alt_text": "Architecture A records events after mutation; Architecture B evaluates intent before mutation."
"caption": "The architecture divide, stated plainly."
"asset_path": "publishing/assets/2026-03-24-monitoring-vs-enforcement-architecture/diagram.jpg"
"status": "canonical"
---
`;

// Shape mirrors a real substrate diagram canonical (JSON-quoted frontmatter on
// main), with danmercede.com added to surface_targets (decision #1).
const diagramData: Record<string, unknown> = {
  slug: '2026-03-24-monitoring-vs-enforcement-architecture',
  title: 'Monitoring vs Enforcement Architecture',
  date: '2026-03-24T08:00:00-07:00',
  type: 'diagram',
  surface_targets: ['danmercede.online', 'danmercede.com'],
  layer: 'authority-gate',
  alt_text:
    'Architecture A records events after mutation; Architecture B evaluates intent before mutation.',
  caption: 'The architecture divide, stated plainly.',
  asset_path:
    'publishing/assets/2026-03-24-monitoring-vs-enforcement-architecture/diagram.jpg',
  status: 'canonical',
};

test('mapSubstrateToDiagram admits a danmercede.com-targeted type:diagram canonical', () => {
  const entry: DiagramEntry | null = mapSubstrateToDiagram(diagramData, '', 'fixture.md');
  assert.ok(entry, 'expected a DiagramEntry for a .com-targeted diagram canonical');
  assert.equal(entry.slug, diagramData.slug);
  assert.equal(entry.title, diagramData.title);
  assert.equal(entry.alt, diagramData.alt_text);
  assert.equal(entry.caption, diagramData.caption);
  // PT-local display day for the ISO instant (mirrors essay date handling).
  assert.equal(entry.date, '2026-03-24');
});

test('mapSubstrateToDiagram skips a diagram NOT targeting danmercede.com', () => {
  const onlineOnly = { ...diagramData, surface_targets: ['danmercede.online'] };
  assert.equal(mapSubstrateToDiagram(onlineOnly, '', 'fixture.md'), null);
});

// HUB_DIAGRAM_ALLOWLIST (mirrors HUB_ESSAY_ALLOWLIST): the substrate diagram canonicals
// are IMMUTABLE and target only danmercede.online (frontmatter re-tagging is forbidden by
// substrate doctrine — promote.py has no retarget mode). The hub admits them by SLUG via a
// .com-side allowlist that overrides ONLY the surface_targets gate. Injectable so the
// mechanism is provable while the shipped constant stays empty (admits 0 in PR-com-1).
test('mapSubstrateToDiagram admits a NON-.com-targeted diagram whose slug is in the allowlist', () => {
  const onlineOnly = { ...diagramData, surface_targets: ['danmercede.online'] };
  // With the default (empty) allowlist it is NOT admitted (bundle stays unchanged in PR-com-1).
  assert.equal(mapSubstrateToDiagram(onlineOnly, '', 'f.md'), null);
  // With its slug allowlisted, it IS admitted despite surface_targets lacking danmercede.com.
  const entry = mapSubstrateToDiagram(onlineOnly, '', 'f.md', undefined, [diagramData.slug as string]);
  assert.ok(entry, 'an allowlisted diagram must be admitted even without .com in surface_targets');
  assert.equal(entry!.slug, diagramData.slug);
});

test('HUB_DIAGRAM_ALLOWLIST ships EMPTY (PR-com-1 admits 0 diagrams; the admission PR populates it)', () => {
  assert.deepEqual([...HUB_DIAGRAM_ALLOWLIST], [], 'must ship empty so the substrate-verify bundle stays unchanged');
});

// Review BLOCKING (write-side path traversal + XML <loc> injection): the slug becomes
// BOTH the copied asset's destination filename (public/assets/diagrams/<slug>.<ext>) and
// an UNESCAPED sitemap <loc> token. A slug like "../../evil-in-public" with a valid
// in-tree asset_path would write the binary OUTSIDE public/assets/diagrams/. An admitted
// (surface+status+type+fields-ok) diagram with an unsafe slug is FATAL corruption — it
// WAS supposed to publish — so --strict must refuse a partial bundle.
test('mapSubstrateToDiagram rejects a path-traversal slug as FATAL', () => {
  const diagnostics: SubstrateDiagnostic[] = [];
  const hostile = { ...diagramData, slug: '../../evil-in-public' };
  const entry = mapSubstrateToDiagram(hostile, '', 'fixture.md', diagnostics);
  assert.equal(entry, null, 'a traversal slug must be rejected');
  assert.ok(
    diagnostics.some((d) => d.severity === 'fatal' && /slug/i.test(d.reason)),
    'must push a FATAL slug diagnostic so --strict refuses a partial bundle',
  );
});

test('mapSubstrateToDiagram rejects slugs with unsafe characters; admits a clean kebab slug', () => {
  for (const bad of ['a/b', 'a..b', 'a b', 'Abc', 'a_b', '-leading', 'trailing-', '/abs']) {
    assert.equal(
      mapSubstrateToDiagram({ ...diagramData, slug: bad }, '', 'f.md'),
      null,
      `unsafe slug "${bad}" must be rejected`,
    );
  }
  // The real date-prefixed kebab slug must STILL be admitted (no regression).
  assert.ok(
    mapSubstrateToDiagram(diagramData, '', 'f.md'),
    'a clean date-prefixed kebab slug must still be admitted',
  );
});

// S1b: the reader must collect diagram canonicals into a `diagrams[]` alongside
// the essay `entries[]`, so main() can fold a DIAGRAMS array into the same
// (trusted-lane-verified) constants.generated.ts bundle.
test('readSubstrateWithDiagnostics collects type:diagram canonicals into diagrams[]', () => {
  const dir = mkTempDir('sub-diag-');
  const canonical = path.join(dir, 'publishing', 'canonical');
  fs.mkdirSync(canonical, { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '2026-03-24-monitoring-vs-enforcement-architecture.md'),
    DIAGRAM_MD,
  );
  const result = readSubstrateWithDiagnostics(dir);
  assert.equal(result.diagrams.length, 1, 'expected exactly one diagram');
  assert.equal(result.diagrams[0].slug, '2026-03-24-monitoring-vs-enforcement-architecture');
  assert.equal(result.diagrams[0].alt.length > 0, true);
  assert.equal(result.entries.length, 0, 'a diagram is not an essay Thought');
});

// S1b: generateOutput must fold a DIAGRAMS array into the SAME bundle (so the
// substrate-verify trusted lane covers it — no separate, unverified file). The
// public src is derived from slug + the asset's extension; the binary is copied
// into public/assets/diagrams/<slug>.<ext> (asset-copy step). THOUGHTS unchanged.
test('generateOutput emits a DIAGRAMS array with a public src derived from slug+ext', () => {
  const d: DiagramEntry = {
    title: 'Monitoring vs Enforcement Architecture',
    slug: '2026-03-24-monitoring-vs-enforcement-architecture',
    date: '2026-03-24',
    isoDate: '2026-03-24T15:00:00.000Z',
    alt: 'Architecture A vs B.',
    caption: 'The architecture divide, stated plainly.',
    assetPath: 'publishing/assets/2026-03-24-monitoring-vs-enforcement-architecture/diagram.jpg',
  };
  const out = generateOutput([], [d]);
  assert.match(out, /export const DIAGRAMS: Diagram\[\] = \[/);
  assert.match(out, /slug: "2026-03-24-monitoring-vs-enforcement-architecture"/);
  assert.match(out, /src: "\/assets\/diagrams\/2026-03-24-monitoring-vs-enforcement-architecture\.jpg"/);
  assert.match(out, /caption: "The architecture divide, stated plainly\."/);
});

// S1b: a substrate with diagrams but ZERO essays must still WRITE the bundle —
// the "0 matches" skip must count entries + diagrams, else a diagram-only refresh
// would fail-open-skip and never publish diagrams.
test('decideOutput writes when only diagrams match (0 essays)', () => {
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/x',
    entries: [],
    diagrams: [sampleDiagram],
    diagnostics: [],
    strict: false,
    requireMatches: false,
  });
  assert.equal(decision.action, 'write');
  if (decision.action === 'write') {
    assert.match(decision.content, /export const DIAGRAMS: Diagram\[\] = \[\s*\{/);
  }
});

test('decideOutput skips when neither essays nor diagrams match', () => {
  const decision = decideOutput({
    substrateReachable: true,
    substratePath: '/x',
    entries: [],
    diagrams: [],
    diagnostics: [],
    strict: false,
    requireMatches: false,
  });
  assert.equal(decision.action, 'skip');
});

// S1b: the diagram binary lives in substrate (publishing/assets/<slug>/diagram.<ext>)
// and must be copied into the hub's public/assets/diagrams/ to be served. asset_path
// is operator-authored, but a path-traversal guard is mandatory (security checklist).
test('isSafeRelativePath rejects traversal/absolute/empty, accepts in-tree', () => {
  assert.equal(isSafeRelativePath('publishing/assets/2026-03-24-x/diagram.jpg'), true);
  assert.equal(isSafeRelativePath('../../etc/passwd'), false);
  assert.equal(isSafeRelativePath('a/../../b'), false);
  assert.equal(isSafeRelativePath('/etc/passwd'), false);
  assert.equal(isSafeRelativePath('C:/Windows/x'), false);
  assert.equal(isSafeRelativePath(''), false);
});

test('copyDiagramAsset copies an in-tree asset and refuses traversal', () => {
  const substrate = mkTempDir('sub-asset-');
  const projectRoot = mkTempDir('proj-');
  const slug = '2026-03-24-monitoring-vs-enforcement-architecture';
  const assetRel = `publishing/assets/${slug}/diagram.jpg`;
  const srcPath = path.join(substrate, assetRel);
  fs.mkdirSync(path.dirname(srcPath), { recursive: true });
  fs.writeFileSync(srcPath, 'JPEGDATA');

  const okSrc = copyDiagramAsset(assetRel, slug, substrate, projectRoot, 'x.md');
  assert.equal(okSrc, `/assets/diagrams/${slug}.jpg`);
  assert.equal(
    fs.existsSync(path.join(projectRoot, 'public', 'assets', 'diagrams', `${slug}.jpg`)),
    true,
    'binary copied into public/assets/diagrams/',
  );

  // Traversal must be refused (null), nothing copied.
  assert.equal(copyDiagramAsset('../../../etc/passwd', slug, substrate, projectRoot, 'x.md'), null);
});

// Review WARNING (fail-open / auditability, all 3 reviewers): an ADMITTED diagram that
// reaches copyDiagramAsset WAS supposed to publish. If its binary is missing / unsupported-
// ext / uncopyable, main() drops it via .filter(... !== null). Without a FATAL diagnostic
// that drop is invisible to --strict, so a 20-of-21 partial bundle ships green. copyDiagramAsset
// must push a fatal (when given the diagnostics array) so --strict fails loud at the regen.
test('copyDiagramAsset pushes a FATAL diagnostic when an admitted diagram binary is missing', () => {
  const substrate = mkTempDir('sub-missing-');
  const projectRoot = mkTempDir('proj-missing-');
  const slug = '2026-03-24-monitoring-vs-enforcement-architecture';
  const diagnostics: SubstrateDiagnostic[] = [];
  // asset_path is safe + allowlisted ext, but the binary does not exist on disk.
  const result = copyDiagramAsset(
    `publishing/assets/${slug}/diagram.jpg`,
    slug,
    substrate,
    projectRoot,
    'x.md',
    diagnostics,
  );
  assert.equal(result, null, 'a missing binary yields null (the diagram is dropped)');
  assert.ok(
    diagnostics.some((d) => d.severity === 'fatal'),
    'dropping an ADMITTED diagram must raise a FATAL (no silent partial-strip under --strict)',
  );
});

// Review BLOCKING defense-in-depth: even if the mapper slug gate is bypassed, the COPY
// layer must not let a traversal slug write outside public/assets/diagrams/.
test('copyDiagramAsset defense-in-depth: a traversal slug cannot escape public/assets/diagrams/', () => {
  const substrate = mkTempDir('sub-dest-');
  const projectRoot = mkTempDir('proj-dest-');
  const slug = '../../evil-in-public';
  const assetRel = 'publishing/assets/x/diagram.svg';
  const srcPath = path.join(substrate, assetRel);
  fs.mkdirSync(path.dirname(srcPath), { recursive: true });
  fs.writeFileSync(srcPath, '<svg/>');
  const result = copyDiagramAsset(assetRel, slug, substrate, projectRoot, 'x.md');
  assert.equal(result, null, 'a traversal slug must be refused at the copy layer too');
  assert.equal(
    fs.existsSync(path.join(projectRoot, 'public', 'evil-in-public.svg')),
    false,
    'nothing may be written outside public/assets/diagrams/',
  );
});

// S1b: constants.ts must export DIAGRAMS as an array even when the committed
// generated bundle has no DIAGRAMS export yet (defensive default — the hub builds
// with zero diagrams until the substrate-sync regen adds them). No crash, no fail-open.
test('constants.ts exports DIAGRAMS as an array (defensive [] when bundle lacks it)', () => {
  assert.ok(Array.isArray(DIAGRAMS), 'DIAGRAMS must be an array');
});
