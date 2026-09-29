import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ABOUT_BIO, CONTACT_INTENTS, WORKS } from '../constants';
import { lintExtractability } from '../extractability';
import { RENDERED_ROUTES, collectRoutes } from '../scripts/injectRouteMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const ssrEntry = path.join(root, 'build-ssr', 'entry-server.js');

/**
 * Reads the BUILT output (run after `npm run build`, via `npm run test:built`).
 *
 * Visible initial HTML spec, slice S1. Seam 1: the built route files. A route
 * in the rendered-route set ships the real page render inside a stamped #root
 * and no crawl block; every other route keeps an empty #root and its crawl
 * block. Seam 2: the build's render function, called directly.
 */

const fileFor = (route: string) =>
  route === '/' ? path.join(buildDir, 'index.html') : path.join(buildDir, route.slice(1), 'index.html');

const decode = (html: string) =>
  html.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function rootOf(html: string): { tag: string; inner: string } {
  const open = /<div id="root"[^>]*>/.exec(html);
  assert.ok(open, 'expected a #root');
  const start = open.index + open[0].length;
  const end = html.lastIndexOf('</div>', html.indexOf('</body>'));
  return { tag: open[0], inner: html.slice(start, end) };
}

async function loadRender(): Promise<(url: string) => string> {
  assert.ok(fs.existsSync(ssrEntry), 'run `npm run build` first; this test reads build-ssr/');
  return ((await import(pathToFileURL(ssrEntry).href)) as { render: (url: string) => string }).render;
}

test('every rendered route ships its page render, stamped, with no crawl block', async () => {
  const render = await loadRender();
  assert.ok(RENDERED_ROUTES.size > 0);
  for (const route of RENDERED_ROUTES) {
    const html = fs.readFileSync(fileFor(route), 'utf8');
    const { tag, inner } = rootOf(html);
    assert.equal(tag, `<div id="root" data-rendered-path="${route}">`);
    assert.equal(inner, render(route), `${route}: the file must carry exactly the build render`);
    assert.doesNotMatch(html, /prerender-content/, `${route}: the crawl block would repeat the page text`);
    assert.equal(html.match(/<h1\b/g)?.length, 1, `${route}: exactly one H1 in the initial HTML`);
    const lint = lintExtractability(html);
    assert.ok(lint.ok, `${route}: ${lint.findings.filter((f) => !f.ok).map((f) => f.detail).join('; ')}`);
  }
});

// Vercel serves /about/ from the same file as /about, and the client hydrates
// it there. The page must render identically at the slashed path, or hydration
// on /about/ would not match the shipped markup.
test('every rendered route renders identically with a trailing slash', async () => {
  const render = await loadRender();
  for (const route of [...RENDERED_ROUTES].filter((r) => r !== '/')) {
    assert.equal(render(`${route}/`), render(route), `${route}/ renders differently from ${route}`);
  }
});

test('/about shows the real biography before any script runs', () => {
  const { inner } = rootOf(fs.readFileSync(fileFor('/about'), 'utf8'));
  const text = decode(inner);
  assert.ok(text.includes(ABOUT_BIO.lead), 'the About lead');
  for (const section of ABOUT_BIO.sections) {
    assert.ok(text.includes(section.heading), `section "${section.heading}"`);
    for (const paragraph of section.paragraphs) assert.ok(text.includes(paragraph), `paragraph "${paragraph.slice(0, 40)}..."`);
  }
});

test('/works and /connect show their full content before any script runs', () => {
  const works = decode(rootOf(fs.readFileSync(fileFor('/works'), 'utf8')).inner);
  const missing = WORKS.filter((w) => !works.includes(w.title)).map((w) => w.title);
  assert.deepEqual(missing, [], 'every project title is in the initial HTML');
  const connect = decode(rootOf(fs.readFileSync(fileFor('/connect'), 'utf8')).inner);
  for (const intent of CONTACT_INTENTS) assert.ok(connect.includes(intent.label), `contact intent "${intent.label}"`);
});

test('the not-found file derives from the empty template, never the rendered homepage', () => {
  const notFound = fs.readFileSync(path.join(buildDir, '404.html'), 'utf8');
  assert.ok(notFound.includes('<div id="root"></div>'));
  assert.doesNotMatch(notFound, /data-rendered-path/);
  assert.match(fs.readFileSync(fileFor('/'), 'utf8'), /<div id="root" data-rendered-path="\/">/, 'the homepage itself is rendered');
});

test('routes outside the rendered set keep an empty #root and their crawl block', () => {
  const others = collectRoutes().filter((r) => !RENDERED_ROUTES.has(r.path));
  assert.ok(others.length > 50, 'expected every other baked route');
  for (const { path: route } of others) {
    const html = fs.readFileSync(fileFor(route), 'utf8');
    assert.ok(html.includes('<div id="root"></div>'), `${route}: #root must stay empty`);
    assert.match(html, /id="prerender-content"/, `${route}: the crawl block must stay`);
  }
  const notFound = fs.readFileSync(path.join(buildDir, '404.html'), 'utf8');
  assert.ok(notFound.includes('<div id="root"></div>'), 'the not-found file never carries a page render');
});

test('every published route renders at build time, deterministically', async () => {
  const render = await loadRender();
  for (const { path: route } of collectRoutes()) {
    const first = render(route);
    assert.ok(first.length > 0, `${route}: empty render`);
    assert.equal(render(route), first, `${route}: two renders differ, so hydration would not match`);
  }
});
