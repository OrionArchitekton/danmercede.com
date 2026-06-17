import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN, ROUTE_META, caseStudyPaths } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// public/sitemap.xml is hand-maintained, but the per-route prerenderer (injectRouteMeta)
// derives the live route set from ROUTE_META ∪ caseStudyPaths(). Without this guard, adding
// a route/case-study would prerender a crawler head but silently leave the sitemap stale.
test('public/sitemap.xml exactly covers ROUTE_META ∪ case-study paths (no drift)', () => {
  const xml = readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
  const expected = new Set([
    ...Object.keys(ROUTE_META).map((p) => new URL(p, SITE_ORIGIN).toString()),
    ...caseStudyPaths().map((p) => new URL(p, SITE_ORIGIN).toString()),
  ]);
  const missing = [...expected].filter((u) => !locs.has(u));
  const extra = [...locs].filter((u) => !expected.has(u));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'public/sitemap.xml drifted from the route source of truth (ROUTE_META ∪ caseStudyPaths). Update the sitemap to match.',
  );
});
