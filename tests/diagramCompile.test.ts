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
  type DiagramEntry,
} from '../scripts/compileContent.js';

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
