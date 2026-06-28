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

import {
  mapSubstrateToDiagram,
  type DiagramEntry,
} from '../scripts/compileContent.js';

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
