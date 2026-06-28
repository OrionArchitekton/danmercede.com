/**
 * S1d: the build-time prerender injector (scripts/injectRouteMeta.ts) must fold the
 * DIAGRAMS corpus into BOTH its per-route bake set (so build/diagrams/<slug>/index.html
 * is emitted) and the build-time sitemap (so the diagram <url> + <image:image> entries
 * land in the served sitemap.xml). The injector reads the module-level DIAGRAMS by
 * default (empty in-repo until the substrate-sync regen), so — exactly like the S1c
 * seoMeta helpers — the route-collection + sitemap-assembly are corpus-injectable so a
 * test can prove the wiring with a synthetic diagram. Importing the injector is only
 * safe because main() is entry-guarded (it does not auto-run on import).
 *
 * RED (this slice): collectRoutes / buildSitemapExtraEntries do not exist yet — the
 * injector bakes only static + case-study + thought + guide routes. This test fails at
 * import until S1d GREEN extracts the helpers and adds the diagram loop + sitemap entries.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectRoutes, buildSitemapExtraEntries } from '../scripts/injectRouteMeta';
import type { Diagram } from '../types';

const d: Diagram = {
  title: 'Monitoring vs Enforcement Architecture',
  slug: '2026-03-24-monitoring-vs-enforcement-architecture',
  date: '2026-03-24',
  alt: 'Architecture A records events after mutation; B evaluates intent before.',
  caption: 'The architecture divide, stated plainly.',
  src: '/assets/diagrams/2026-03-24-monitoring-vs-enforcement-architecture.jpg',
};

test('collectRoutes includes a /diagrams/<slug> ImageObject route for each diagram in the corpus', () => {
  const routes = collectRoutes([d]);
  const diag = routes.find((r) => r.path === `/diagrams/${d.slug}`);
  assert.ok(diag, 'the diagram route must be in the injector bake set');
  assert.equal(diag!.meta.schemaType, 'ImageObject');
  assert.match(diag!.meta.title, /Monitoring vs Enforcement Architecture — Diagram \| Dan Mercede/);
});

test('collectRoutes still bakes static + thought + guide routes (no regression), never the homepage, never works microsites', () => {
  const routes = collectRoutes([]);
  const paths = routes.map((r) => r.path);
  // build/index.html IS the homepage — it must never be re-baked under build/.
  assert.ok(!paths.includes('/'), 'homepage must not be in the dynamic bake set');
  assert.ok(paths.includes('/about'), 'static routes still baked');
  assert.ok(paths.some((p) => p.startsWith('/thoughts/')), 'thought routes still baked');
  assert.ok(paths.some((p) => p.startsWith('/guides/')), 'guide routes still baked');
  // Works microsites are Vercel-rewrite proxies — emitting a physical page would shadow
  // the rewrite (seoMeta.ts:282), so the injector must NOT bake /works/<slug>.
  assert.ok(!paths.some((p) => /^\/works\/[^/]+$/.test(p)), 'no physical works-microsite pages');
});

test('buildSitemapExtraEntries appends the diagram image entries alongside thoughts + guides', () => {
  const xml = buildSitemapExtraEntries([d]);
  assert.match(
    xml,
    /<loc>https:\/\/www\.danmercede\.com\/diagrams\/2026-03-24-monitoring-vs-enforcement-architecture<\/loc>/,
  );
  assert.match(xml, /<image:image>/);
  // Thought/guide corpora still injected (no regression — both are non-empty in-repo).
  assert.match(xml, /\/thoughts\//, 'thought entries still present');
});

test('buildSitemapExtraEntries with an empty diagram corpus emits NO diagram entries (no empty <image:image>)', () => {
  const xml = buildSitemapExtraEntries([]);
  assert.doesNotMatch(xml, /\/diagrams\//, 'no diagram <loc> when the corpus is empty');
  assert.doesNotMatch(xml, /<image:image>/, 'no orphan image-sitemap child when the corpus is empty');
});
