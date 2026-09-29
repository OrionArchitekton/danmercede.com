import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePath, shouldHydrate } from '../hydration';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

/**
 * Visible initial HTML spec, slice S1. Some routes now ship their page render
 * inside #root. The client may hydrate that markup only when it was rendered
 * for the route being visited; Vercel serves /about and /about/ from the same
 * file, so a trailing slash is the same route. Anything else renders fresh.
 */

test('normalizePath treats a trailing slash as the same route', () => {
  assert.equal(normalizePath('/about/'), '/about');
  assert.equal(normalizePath('/about'), '/about');
  assert.equal(normalizePath('/thoughts/some-essay//'), '/thoughts/some-essay');
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath(''), '/');
});

test('the client hydrates only markup rendered for this route', () => {
  assert.equal(shouldHydrate('/about', '/about'), true);
  assert.equal(shouldHydrate('/about', '/about/'), true);
  assert.equal(shouldHydrate(undefined, '/about'), false, 'no rendered markup: render fresh');
  assert.equal(shouldHydrate('', '/'), false, 'an empty stamp is not a rendered route');
  assert.equal(shouldHydrate('/about', '/proof'), false, 'markup for another route: render fresh');
});

test('the client entry hydrates through shouldHydrate and renders fresh otherwise', () => {
  const entry = read('index.tsx');
  assert.match(entry, /shouldHydrate\(\s*rootElement\.dataset\.renderedPath\s*,\s*window\.location\.pathname\s*\)/);
  assert.match(entry, /hydrateRoot\(/);
  assert.match(entry, /createRoot\(/);
  assert.match(entry, /<BrowserRouter>/, 'the client wraps the app in BrowserRouter');
});

test('the app shell carries no router of its own, so the build can use StaticRouter', () => {
  const app = read('App.tsx');
  assert.doesNotMatch(app, /<Router>|<BrowserRouter|import[^;]*\bBrowserRouter\b/, 'App must not choose the router');
  assert.match(read('entry-server.tsx'), /<StaticRouter location=\{url\}>/);
});

test('the nav highlights /about/ like /about', () => {
  assert.match(read('App.tsx'), /normalizePath\(location\.pathname\) === item\.path/);
});

test('ScrollToTop does not scroll on first mount', () => {
  const app = read('App.tsx');
  const block = app.slice(app.indexOf('const ScrollToTop'), app.indexOf('const App'));
  assert.match(block, /firstMount\.current/, 'a visitor who scrolled before hydration must not be sent back to the top');
});

// Visible initial HTML spec, slice S4 (headings), first part. The footer sits
// on every page, and its brand name was an <h4>: straight after a page's H1 or
// H2 that is a heading-level skip, which fails the extractability heading
// check on every page that renders at build time. It is a label, not a
// section heading, so it is a paragraph with the same classes (Tailwind's
// preflight resets both elements alike, so nothing moves visually).
test('the footer carries no heading element', () => {
  const app = read('App.tsx');
  const start = app.indexOf('const Footer');
  const footer = app.slice(start, app.indexOf('\nconst ', start + 1));
  assert.ok(footer.includes('Dan Mercede'), 'expected the footer component (positive control)');
  assert.doesNotMatch(footer, /<h[1-6]\b/, 'footer labels must not enter the page outline');
});
