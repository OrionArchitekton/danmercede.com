import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN, ROUTE_META, caseStudyPaths, thoughtPaths } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// public/sitemap.xml is hand-maintained, but the per-route prerenderer (injectRouteMeta)
// derives the live route set from ROUTE_META ∪ caseStudyPaths() ∪ thoughtPaths(). Without
// this guard, adding a route/case-study/thought would prerender a crawler head but silently
// leave the sitemap stale. R2 added thoughtPaths() so every published THOUGHTS slug has a
// prerendered route AND a sitemap loc — closing the round-1 gap where the corpus was outside
// both the route set and the sitemap.
test('public/sitemap.xml exactly covers ROUTE_META ∪ case-study ∪ thought paths (no drift)', () => {
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
    ...thoughtPaths().map((p) => normalize(new URL(p, SITE_ORIGIN).toString())),
  ]);
  const missing = [...expected].filter((u) => !locs.has(u));
  const extra = [...locs].filter((u) => !expected.has(u));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'public/sitemap.xml drifted from the route source of truth (ROUTE_META ∪ caseStudyPaths ∪ thoughtPaths). Update the sitemap to match.',
  );
});

// Every published thought must have a prerendered route AND a sitemap loc.
// This is the structural guard for R2: the corpus is no longer outside the
// crawlable set.
test('every published THOUGHTS slug has a /thoughts/<slug> sitemap loc', () => {
  const xml = readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const normalize = (u: string) => u.replace(/\/+$/, '');
  const locs = new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normalize(m[1].trim())),
  );
  const paths = thoughtPaths();
  assert.ok(paths.length > 0, 'expected at least one published thought');
  const missing = paths
    .map((p) => normalize(new URL(p, SITE_ORIGIN).toString()))
    .filter((u) => !locs.has(u));
  assert.deepEqual(missing, [], `thought routes missing from sitemap: ${missing.join(', ')}`);
});
