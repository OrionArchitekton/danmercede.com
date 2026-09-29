import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROUTE_META, SEO_BLOCK_START, SEO_BLOCK_END, BODY_BLOCK_START, BODY_BLOCK_END, JSONLD_BLOCK_START, JSONLD_BLOCK_END } from '../seoMeta';
import { collectRoutes, renderNotFoundHtml } from '../scripts/injectRouteMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Regression guard for the 2026-09-29 site audit (soft-404 finding).
 *
 * A `/(.*) -> /index.html` rewrite served the homepage shell with HTTP 200 for
 * every unknown path; NotFoundPage only added noindex after JavaScript ran.
 * Every real route already bakes build/<route>/index.html, and Vercel serves the
 * filesystem before rewrites, so the catch-all only ever answered unknown paths.
 * Without it, Vercel answers unknown paths with build/404.html and a 404 status.
 */

test('vercel.json has no same-origin rewrite (the SPA catch-all is what faked a 200)', () => {
  const cfg = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rewrites: { source: string; destination: string }[] = cfg.rewrites ?? [];
  // Positive control: the microsite proxies must still be here.
  assert.ok(
    rewrites.some((r) => r.source.startsWith('/works/') && r.destination.startsWith('https://')),
    'expected the /works/<slug>/ microsite proxy rewrites to remain',
  );
  const sameOrigin = rewrites.filter((r) => r.destination.startsWith('/'));
  assert.deepEqual(sameOrigin, [], 'a same-origin rewrite would serve a shell for unknown paths');
});

test('every React route is served by a baked file once the catch-all is gone', () => {
  const appSrc = readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const appPaths = [...appSrc.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*');
  assert.ok(appPaths.includes('/about'), 'expected to parse the App.tsx route table (positive control)');

  const baked = collectRoutes().map((r) => r.path);
  const missing = appPaths.filter((p) => {
    if (p === '/') return false; // build/index.html
    if (!p.includes(':')) return !(p in ROUTE_META);
    const prefix = p.slice(0, p.indexOf(':'));
    return !baked.some((b) => b.startsWith(prefix));
  });
  assert.deepEqual(missing, [], 'these React routes would 404 at the server');
});

test('renderNotFoundHtml marks the page noindex, drops the canonical, and keeps the app shell', () => {
  const base = [
    '<html><head>',
    `  ${SEO_BLOCK_START}`,
    '  <title>Home</title>',
    '  <link rel="canonical" href="https://www.danmercede.com/" />',
    `  ${SEO_BLOCK_END}`,
    `  ${JSONLD_BLOCK_START}`,
    '  <script type="application/ld+json">{"@type":"Person"}</script>',
    `  ${JSONLD_BLOCK_END}`,
    '</head><body>',
    `  ${BODY_BLOCK_START}`,
    '  <h1>DAN MERCEDE</h1>',
    `  ${BODY_BLOCK_END}`,
    '  <div id="root"></div><script type="module" src="/assets/index.js"></script>',
    '</body></html>',
  ].join('\n');

  const html = renderNotFoundHtml(base);
  assert.match(html, /<title>Page Not Found \| Dan Mercede<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.doesNotMatch(html, /rel="canonical"/, 'a 404 served at any path must not claim a canonical URL');
  assert.doesNotMatch(html, /"@type":"Person"/, 'the homepage route JSON-LD must not ride on the 404');
  assert.doesNotMatch(html, /<h1>DAN MERCEDE<\/h1>/, 'the homepage body must not ride on the 404');
  assert.match(html, /<div id="root"><\/div><script type="module" src="\/assets\/index.js"><\/script>/);
});
