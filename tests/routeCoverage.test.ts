/**
 * S1e: the React <Routes> table (App.tsx) must cover every route surface the SEO
 * layer publishes — or the SPA 404s a deep-link a crawler followed from the
 * prerendered page / sitemap. This is the "split-brain route" class: a route baked
 * by injectRouteMeta (head + body + JSON-LD) and listed in the sitemap, but with no
 * matching React <Route>, so the live SPA returns the catch-all 404 for it.
 *
 * Repo-native seam: this site has no React test harness (no jsdom/RTL) — SEO/prerender
 * correctness is tested as pure functions, and the App.tsx ↔ SEO-surface parity is
 * asserted by reading App.tsx as text (same idiom as the existing
 * "index.html anchored block equals renderSeoBlock('/')" guard).
 *
 * RED (this slice): ROUTE_META already carries '/diagrams' (added in S1c) but App.tsx
 * has no <Route path="/diagrams"> and no <Route path="/diagrams/:slug">. This test
 * fails until S1e GREEN registers both React routes (+ their page components).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_META } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = readFileSync(path.join(root, 'App.tsx'), 'utf8');

// Every `path="..."` declared in the App.tsx <Routes> table.
function appRoutePaths(): string[] {
  return [...appSrc.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
}

test('every static ROUTE_META route has a matching App.tsx <Route> (no split-brain routes)', () => {
  const routes = new Set(appRoutePaths());
  const missing = Object.keys(ROUTE_META).filter((k) => !routes.has(k));
  assert.deepEqual(
    missing,
    [],
    `ROUTE_META keys with no App.tsx <Route> (a crawler-followed deep-link would 404 in the SPA): ${missing.join(', ')}`,
  );
});

test('every prerendered dynamic :slug family has a matching App.tsx detail <Route>', () => {
  const routes = new Set(appRoutePaths());
  // Families that injectRouteMeta prerenders + sitemaps (caseStudy/thought/guide/diagram).
  const families = ['/case-studies/:slug', '/thoughts/:slug', '/guides/:slug', '/diagrams/:slug'];
  const missing = families.filter((f) => !routes.has(f));
  assert.deepEqual(
    missing,
    [],
    `dynamic :slug families prerendered by injectRouteMeta with no App.tsx detail <Route>: ${missing.join(', ')}`,
  );
});
