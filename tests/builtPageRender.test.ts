import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ABOUT_BIO, CONTACT_EMAIL, CONTACT_INTENTS, GUIDES, SELECTED_WORK, THOUGHTS, WORKS, WORKS_HUB, contactHref, featuredEssays } from '../constants';
import { FORBIDDEN_NEEDLES } from './contentBoundaryNeedles';
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
  // Since S3 every published route is rendered, so this set is empty; it guards
  // the rollback path (an emptied or partial set keeps the baseline output).
  const others = collectRoutes().filter((r) => !RENDERED_ROUTES.has(r.path));
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

// Slice S4 (headings): every published route's page render must pass the
// extractability checks as if it were already in the rendered-route set, so a
// route can join the set without a heading fix of its own. Rendered-route files
// are also linted as built, above.
test('every published route renders with a clean heading outline', async () => {
  const render = await loadRender();
  const failing: string[] = [];
  for (const route of ['/', ...collectRoutes().map((r) => r.path)]) {
    const html = `<!doctype html><html><body><div id="root" data-rendered-path="${route}">${render(route)}</div></body></html>`;
    const bad = lintExtractability(html).findings.filter((f) => !f.ok);
    if (bad.length) failing.push(`${route}: ${bad.map((f) => f.detail).join('; ')}`);
  }
  assert.deepEqual(failing, []);
});

// The content contracts the crawl-block tests assert (homepage.test.ts,
// worksHub.test.ts, frontDoor.test.ts, contentBoundary.test.ts) bind the hidden
// crawl block, which a rendered route no longer ships. These bind the render the
// build does ship for the same routes. Review of #184, 2026-09-29.
test('rendered routes keep the content contracts their crawl blocks carried', async () => {
  const render = await loadRender();
  const home = render('/');
  for (const w of SELECTED_WORK) assert.ok(decode(home).includes(w.title), `homepage: selected work ${w.title}`);
  const homeMain = home.slice(home.indexOf('<main'), home.indexOf('</main>'));
  assert.ok(homeMain.length > 0, 'homepage: expected a <main> region');
  // The shared footer names the entity on every page; the homepage body must not.
  assert.doesNotMatch(homeMain, /Orion Apex Capital/, 'homepage: entity-structure copy belongs on /ecosystem');

  const works = render('/works');
  assert.ok(decode(works).includes(WORKS_HUB.pilot), '/works: pilot line');
  assert.ok(decode(works).includes(WORKS_HUB.availability), '/works: availability line');
  for (const e of featuredEssays()) assert.ok(works.includes(`href="/thoughts/${e.slug}"`), `/works: featured essay ${e.slug}`);
  assert.ok(works.includes(`href="${WORKS_HUB.signalUrl}"`), '/works: signal link');
  assert.ok(works.includes(`href="${WORKS_HUB.githubUrl}"`), '/works: GitHub link');

  const connect = render('/connect');
  assert.ok(connect.includes(CONTACT_EMAIL), '/connect: the email address');
  for (const intent of CONTACT_INTENTS) {
    assert.ok(decode(connect).includes(intent.label), `/connect: intent ${intent.id}`);
    assert.ok(connect.includes(`href="${contactHref(intent).replace(/&/g, '&amp;')}"`), `/connect: link for ${intent.id}`);
  }

  const about = render('/about');
  for (const r of ABOUT_BIO.recognition) assert.ok(about.includes(`href="${r.href}"`), `/about: recognition link ${r.href}`);
  const aboutText = decode(about.replace(/<[^>]+>/g, ' ')).toLowerCase();
  assert.deepEqual(FORBIDDEN_NEEDLES.filter((n) => aboutText.includes(n)), [], '/about is identity-only: no call-to-action copy');

  const thoughts = decode(render('/thoughts'));
  assert.deepEqual(THOUGHTS.filter((t) => !thoughts.includes(t.title)).map((t) => t.slug), [], '/thoughts lists every essay');
  const guides = decode(render('/guides'));
  assert.deepEqual(GUIDES.filter((g) => !guides.includes(g.title)).map((g) => g.slug), [], '/guides lists every guide');
});

// S3: essays and guides ship their full text in the initial HTML, not a shell.
// Every published essay and guide route is checked (a missing file or body
// fails). The rendered root must carry most of the source's words (markdown
// syntax and figure captions make an exact comparison brittle, so the bar is 80%).
test('every essay and guide ships its full text in the initial HTML', () => {
  const words = (text: string) => text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  const bodies = new Map<string, string | undefined>([
    ...THOUGHTS.map((t) => [`/thoughts/${t.slug}`, (t as { body?: string }).body] as [string, string | undefined]),
    ...GUIDES.map((g) => [`/guides/${g.slug}`, (g as { body?: string }).body] as [string, string | undefined]),
  ]);
  const routes = collectRoutes().map((r) => r.path).filter((p) => /^\/(thoughts|guides)\/./.test(p));
  assert.ok(routes.length > 40, `expected every published essay and guide, found ${routes.length}`);
  const short: string[] = [];
  for (const route of routes) {
    const body = bodies.get(route);
    assert.ok(body && body.trim(), `${route}: published without a body`);
    const root = decode(rootOf(fs.readFileSync(fileFor(route), 'utf8')).inner.replace(/<[^>]+>/g, ' '));
    const source = words(body.replace(/[#*_`>\[\]()!-]/g, ' '));
    if (words(root) < source * 0.8) short.push(`${route}: ${words(root)} of ~${source} words`);
  }
  assert.deepEqual(short, []);
});

// Re-running the injector without a new `vite build` must change nothing: the
// homepage render lands in build/index.html itself, so the injector keeps the
// empty template beside the SSR bundle, and it reads the committed sitemap
// rather than the copy a previous run already extended.
test('re-running the injector changes no built file', () => {
  const snapshot = () =>
    Object.fromEntries(
      [...walkFiles(buildDir)].map((f) => [path.relative(buildDir, f), createHash('sha256').update(fs.readFileSync(f)).digest('hex')]),
    );
  const before = snapshot();
  const run = spawnSync('npx', ['tsx', 'scripts/injectRouteMeta.ts'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(snapshot(), before);
});

function* walkFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}

// Rollback (spec criterion 9): VISIBLE_HTML_ROLLBACK=1 empties the rendered-route
// set without a code change. Re-run the injector in a scratch copy of the built
// inputs: in rollback mode every page must ship the crawl-block output with an
// empty #root and the homepage must be the empty template again; a normal re-run
// must then restore exactly the rendered output this build shipped.
test('the rollback switch restores the crawl-block output, and a normal run restores the renders', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'visible-html-rollback-'));
  try {
    fs.mkdirSync(path.join(scratch, 'build'));
    fs.mkdirSync(path.join(scratch, 'public'));
    fs.copyFileSync(path.join(buildDir, 'index.html'), path.join(scratch, 'build', 'index.html'));
    fs.cpSync(path.join(root, 'build-ssr'), path.join(scratch, 'build-ssr'), { recursive: true });
    fs.copyFileSync(path.join(root, 'public', 'sitemap.xml'), path.join(scratch, 'public', 'sitemap.xml'));
    const inject = (env: Record<string, string>) =>
      spawnSync('npx', ['tsx', path.join(root, 'scripts', 'injectRouteMeta.ts')], {
        cwd: scratch,
        env: { ...process.env, ...env },
        encoding: 'utf8',
      });

    const rolledBack = inject({ VISIBLE_HTML_ROLLBACK: '1' });
    assert.equal(rolledBack.status, 0, rolledBack.stderr);
    const template = fs.readFileSync(path.join(scratch, 'build-ssr', 'index.template.html'), 'utf8');
    assert.equal(fs.readFileSync(path.join(scratch, 'build', 'index.html'), 'utf8'), template, 'the homepage is the empty template again');
    const pages = [...walkFiles(path.join(scratch, 'build'))].filter((f) => f.endsWith('.html'));
    assert.ok(pages.length > 80, `expected every route file, found ${pages.length}`);
    for (const page of pages) {
      const html = fs.readFileSync(page, 'utf8');
      assert.ok(html.includes('<div id="root"></div>'), `${page}: #root must be empty in rollback`);
      assert.doesNotMatch(html, /data-rendered-path/, `${page}: no page render in rollback`);
      assert.match(html, /id="prerender-content"/, `${page}: the crawl block is back`);
    }

    const restored = inject({ VISIBLE_HTML_ROLLBACK: '' });
    assert.equal(restored.status, 0, restored.stderr);
    for (const page of [...walkFiles(path.join(scratch, 'build'))].filter((f) => f.endsWith('.html'))) {
      const rel = path.relative(path.join(scratch, 'build'), page);
      assert.equal(fs.readFileSync(page, 'utf8'), fs.readFileSync(path.join(buildDir, rel), 'utf8'), `${rel}: a normal run restores the shipped render`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
