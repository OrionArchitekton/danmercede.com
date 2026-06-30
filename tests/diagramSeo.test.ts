/**
 * S1c: seoMeta diagram support (mirrors the guide pattern). Tests pass an injected
 * Diagram corpus because the in-repo DIAGRAMS is empty until the substrate-sync
 * regen — the production callers use the DIAGRAMS default.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diagramPaths,
  renderDiagramSitemapEntries,
  diagramMeta,
  renderRouteJsonLd,
  SITE_ORIGIN,
  PERSON_ID,
} from '../seoMeta.js';
import type { Diagram } from '../types.js';

const d: Diagram = {
  title: 'Monitoring vs Enforcement Architecture',
  slug: '2026-03-24-monitoring-vs-enforcement-architecture',
  date: '2026-03-24',
  alt: 'Architecture A records events after mutation; B evaluates intent before.',
  caption: 'The architecture divide, stated plainly.',
  src: '/assets/diagrams/2026-03-24-monitoring-vs-enforcement-architecture.jpg',
};

test('diagramPaths maps a diagram corpus to /diagrams/<slug>', () => {
  assert.deepEqual(diagramPaths([d]), [
    '/diagrams/2026-03-24-monitoring-vs-enforcement-architecture',
  ]);
});

test('renderDiagramSitemapEntries emits a <url> with an <image:image> child', () => {
  const xml = renderDiagramSitemapEntries([d]);
  assert.match(
    xml,
    /<loc>https:\/\/www\.danmercede\.com\/diagrams\/2026-03-24-monitoring-vs-enforcement-architecture<\/loc>/,
  );
  assert.match(xml, /<image:image>/);
  assert.match(
    xml,
    /<image:loc>https:\/\/www\.danmercede\.com\/assets\/diagrams\/2026-03-24-monitoring-vs-enforcement-architecture\.jpg<\/image:loc>/,
  );
  assert.match(xml, /<image:caption>The architecture divide, stated plainly\.<\/image:caption>/);
});

test('diagramMeta builds title/description/body from a diagram (via injected corpus)', () => {
  const m = diagramMeta(d.slug, [d]);
  assert.match(m.title, /Monitoring vs Enforcement Architecture: Diagram \| Dan Mercede/);
  assert.equal(m.description, d.caption);
  assert.equal(m.body?.h1, d.title);
  // The alt text is baked as crawlable prose so no-JS answer engines read it.
  assert.ok(m.body?.paragraphs.some((p) => p.includes('evaluates intent before')));
});

test('renderRouteJsonLd emits an ImageObject backref-ing #person for a diagram route', () => {
  const m = diagramMeta(d.slug, [d]);
  const jsonld = renderRouteJsonLd(`/diagrams/${d.slug}`, m);
  assert.match(jsonld, /"@type":\s*"ImageObject"/);
  assert.match(jsonld, /"contentUrl":/);
  // author/publisher must reference the single hub #person — no second Person node.
  assert.match(jsonld, new RegExp(`"@id":\\s*"${PERSON_ID.replace(/[/]/g, '\\/')}"`));
  assert.ok(!/"@type":\s*"Person"/.test(jsonld), 'must not introduce a second Person node');
});
