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
  // Compare route sets independent of cosmetic trailing-slash differences.
  const normalize = (u: string) => u.replace(/\/+$/, '');
  const locList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normalize(m[1].trim()));
  // A Set hides repeats, so a sitemap with a duplicated <loc> would pass the "exactly covers"
  // check; assert uniqueness against the raw list first.
  const dupes = [...new Set(locList.filter((u, i) => locList.indexOf(u) !== i))];
  assert.deepEqual(dupes, [], `Duplicate <loc> entries in public/sitemap.xml: ${dupes.join(', ')}`);
  const locs = new Set(locList);
  const expected = new Set([
    ...Object.keys(ROUTE_META).map((p) => normalize(new URL(p, SITE_ORIGIN).toString())),
    ...caseStudyPaths().map((p) => normalize(new URL(p, SITE_ORIGIN).toString())),
  ]);
  const missing = [...expected].filter((u) => !locs.has(u));
  const extra = [...locs].filter((u) => !expected.has(u));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'public/sitemap.xml drifted from the route source of truth (ROUTE_META ∪ caseStudyPaths). Update the sitemap to match.',
  );
});
