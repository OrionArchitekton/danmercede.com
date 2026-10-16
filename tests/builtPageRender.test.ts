import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ABOUT_BIO, CASE_STUDIES, CONTACT_EMAIL, CONTACT_INTENTS, DIAGRAMS, GUIDES, NEWSLETTER, PRIVACY_SECTIONS, PROOF_EVIDENCE, REFERENCE_ARCHITECTURE_NOTICE, SELECTED_WORK, THOUGHTS, WORKS, WORKS_HUB, WORKS_START_HERE, contactHref, featuredEssays } from '../constants';
import { FORBIDDEN_NEEDLES } from './contentBoundaryNeedles';
import { lintExtractability } from '../extractability';
import { RENDERED_ROUTES, collectRoutes } from '../scripts/injectRouteMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const ssrEntry = path.join(root, 'build-ssr', 'entry-server.js');

/**
 * Reads the BUILT output (run after `npm run build`, via `npm run test:built`).
 *
 * Visible initial HTML spec. Seam 1: the built route files. Every published
 * route ships the real page render inside a stamped #root; the not-found file
 * keeps an empty #root. Seam 2: the build's render function, called directly.
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

test('every rendered route ships its page render, stamped', async () => {
  const render = await loadRender();
  assert.ok(RENDERED_ROUTES.size > 0);
  for (const route of RENDERED_ROUTES) {
    const html = fs.readFileSync(fileFor(route), 'utf8');
    const { tag, inner } = rootOf(html);
    assert.equal(tag, `<div id="root" data-rendered-path="${route}">`);
    assert.equal(inner, render(route), `${route}: the file must carry exactly the build render`);
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
  assert.match(notFound, /<meta name="robots" content="noindex/, 'the not-found file is noindex');
  assert.match(fs.readFileSync(fileFor('/'), 'utf8'), /<div id="root" data-rendered-path="\/">/, 'the homepage itself is rendered');
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

// The content contracts that once bound the hidden crawl block (homepage,
// works hub, front door, content boundary, proof, privacy, case studies,
// diagrams) bind the render the build ships. Review of #184, 2026-09-29;
// the crawl block itself was retired in S5.
test('a selected-work card that opens an essay stays in-site and reads "Read the case"', async () => {
  const home = (await loadRender())('/');
  const essayCards = SELECTED_WORK.filter((w) => w.href.startsWith('/thoughts/'));
  assert.ok(essayCards.length > 0, 'expected at least one selected-work card linking an essay');
  for (const w of essayCards) {
    const start = home.indexOf(`<a href="${w.href}"`);
    assert.ok(start >= 0, `homepage: no card anchor for ${w.href}`);
    const card = home.slice(start, home.indexOf('</a>', start));
    assert.doesNotMatch(card.slice(0, card.indexOf('>')), /target=/, `${w.title}: an essay link opens in the same tab`);
    assert.ok(decode(card).includes('Read the case'), `${w.title}: CTA should read "Read the case"`);
  }
});

test('rendered routes keep the content contracts the retired crawl block carried', async () => {
  const render = await loadRender();
  const home = render('/');
  for (const w of SELECTED_WORK) assert.ok(decode(home).includes(w.title), `homepage: selected work ${w.title}`);
  const homeMain = home.slice(home.indexOf('<main'), home.indexOf('</main>'));
  assert.ok(homeMain.length > 0, 'homepage: expected a <main> region');
  // The shared footer names the entity on every page; the homepage body must not.
  assert.doesNotMatch(homeMain, /Orion Apex Capital/, 'homepage: entity-structure copy belongs on /ecosystem');

  const works = render('/works');
  const start = works.slice(works.indexOf('Start here'), works.indexOf('Build: Open Source'));
  const startingLinks = [...start.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(startingLinks.length, 3, '/works: three starting cards precede the existing lists');
  WORKS_START_HERE.forEach((item, i) => {
    assert.ok(startingLinks[i][1].includes(`href="${item.href}"`), `/works: starting target ${item.href}`);
    assert.ok(decode(startingLinks[i][2]).includes(item.title), `/works: starting title ${item.title}`);
    if (item.description) assert.ok(decode(startingLinks[i][2]).includes(item.description), `/works: starting description ${item.title}`);
  });
  // React Router marks its intercepted links with data-discover. Rewritten
  // microsites require document navigation; the nav supplies a positive control
  // so a router upgrade cannot silently make this regression detector vacuous.
  const nav = works.slice(works.indexOf('<nav'), works.indexOf('</nav>'));
  assert.match(nav, /data-discover=/, 'control: router-managed links remain identifiable');
  assert.doesNotMatch(start, /data-discover=/, '/works: starting cards must make document requests');
  assert.ok(decode(works).includes(WORKS_HUB.pilot), '/works: pilot line');
  assert.ok(decode(works).includes(WORKS_HUB.availability), '/works: availability line');
  for (const e of featuredEssays()) {
    assert.ok(works.includes(`href="/thoughts/${e.slug}"`), `/works: featured essay ${e.slug}`);
    assert.ok(decode(works).includes(e.title), `/works: featured essay title ${e.title}`);
  }
  // /works is a pointer, not a library: no essay paragraph may run on it.
  const worksText = decode(works.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  for (const t of THOUGHTS) {
    for (const para of t.body.split(/\n\s*\n/).map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 120)) {
      assert.ok(!worksText.includes(para.slice(0, 120)), `/works must not host the body of ${t.slug}`);
    }
  }
  assert.ok(works.includes(`href="${WORKS_HUB.signalUrl}"`), '/works: signal link');
  assert.ok(works.includes(`href="${WORKS_HUB.githubUrl}"`), '/works: GitHub link');

  const connect = render('/connect');
  assert.ok(connect.includes(CONTACT_EMAIL), '/connect: the email address');
  for (const intent of CONTACT_INTENTS) {
    assert.ok(decode(connect).includes(intent.label), `/connect: intent ${intent.id}`);
    assert.ok(connect.includes(`href="${contactHref(intent).replace(/&/g, '&amp;')}"`), `/connect: link for ${intent.id}`);
  }

  const about = render('/about');
  for (const r of ABOUT_BIO.recognition) {
    assert.ok(about.includes(`href="${r.href}"`), `/about: recognition link ${r.href}`);
    assert.ok(decode(about).includes(r.label), `/about: recognition label ${r.label}`);
  }
  const aboutText = decode(about.replace(/<[^>]+>/g, ' ')).toLowerCase();
  assert.deepEqual(FORBIDDEN_NEEDLES.filter((n) => aboutText.includes(n)), [], '/about is identity-only: no call-to-action copy');
  // Negative control: the same detector must flag the promotional /connect render,
  // so the /about check above cannot be an always-pass no-op.
  const connectText = decode(connect.replace(/<[^>]+>/g, ' ')).toLowerCase();
  const flagged = FORBIDDEN_NEEDLES.filter((n) => connectText.includes(n));
  assert.ok(flagged.includes('contact dan') && flagged.includes('hiring or team roles'), `detector must flag /connect, got ${JSON.stringify(flagged)}`);

  const proof = render('/proof');
  const proofText = decode(proof);
  for (const phrase of ['Evidence', 'Approach', 'Commercial and speaking']) assert.ok(proofText.includes(phrase), `/proof: "${phrase}"`);
  assert.doesNotMatch(proofText, /engagement sheet/i, '/proof must not promise the retired sheet');
  for (const tier of PROOF_EVIDENCE) {
    for (const c of tier.claims) {
      const probe = c.claim.split(/[.,]/)[0].slice(0, 45);
      assert.ok(proofText.includes(probe), `/proof: claim "${probe}"`);
      for (const src of c.sources ?? []) assert.ok(proof.includes(`href="${src}"`), `/proof: source link ${src}`);
    }
  }

  const privacy = decode(render('/privacy'));
  for (const sec of PRIVACY_SECTIONS) assert.ok(privacy.includes(sec.body), `/privacy: section "${sec.heading}"`);

  assert.ok(CASE_STUDIES.length > 0, 'expected case studies to check');
  for (const study of CASE_STUDIES) {
    const page = decode(render(`/case-studies/${study.slug}`));
    const noticeAt = page.indexOf(REFERENCE_ARCHITECTURE_NOTICE);
    assert.ok(noticeAt >= 0, `${study.slug}: the illustrative-not-client notice`);
    const descriptionAt = page.indexOf(study.description);
    assert.ok(descriptionAt < 0 || noticeAt < descriptionAt, `${study.slug}: the notice must precede the case-study description`);
  }
  for (const d of DIAGRAMS) {
    const page = decode(render(`/diagrams/${d.slug}`));
    assert.ok(page.includes(d.caption) && page.includes(d.alt), `/diagrams/${d.slug}: caption and alt text`);
  }

  const thoughts = decode(render('/thoughts'));
  assert.deepEqual(THOUGHTS.filter((t) => !thoughts.includes(t.title)).map((t) => t.slug), [], '/thoughts lists every essay');
  const guides = decode(render('/guides'));
  assert.deepEqual(GUIDES.filter((g) => !guides.includes(g.title)).map((g) => g.slug), [], '/guides lists every guide');
});

// S3: essays and guides ship their full text in the initial HTML, not a shell.
// Every published essay and guide route is checked (a missing file or body
// fails). The rendered root must carry most of the source's words (markdown
// syntax and figure captions make an exact comparison brittle, so the bar is 80%).
// 2026-09-29 re-audit P2: the newsletter link must reach the rendered page as a
// plain off-site anchor that opens in a new tab: once in the Writing body and
// once in the footer, and only the footer copy on other pages.
test('the newsletter renders as an off-site link on Writing and in the footer', () => {
  const escaped = NEWSLETTER.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anchor = new RegExp(`<a href="${escaped}" target="_blank" rel="noopener noreferrer"`, 'g');
  const count = (route: string) => (rootOf(fs.readFileSync(fileFor(route), 'utf8')).inner.match(anchor) ?? []).length;
  assert.equal(count('/thoughts'), 2, 'Writing links the newsletter beside RSS and in the footer');
  assert.equal(count('/about'), 1, 'every page carries the footer link');
});

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

// Guide video player (specs/guide-video-embed-spec.md, AC6). Data-driven from the
// corpus, so it asserts the facade the day a guide gains a `youtube:` id. A guide
// without one ships no YouTube host at all; a guide with one ships the facade for its
// id and never the live player (that loads only on a press, in the browser).
test('a guide page carries the video facade only when the guide declares a video', () => {
  assert.ok(GUIDES.length > 0, 'guards against a vacuous pass: the guides corpus is empty');
  for (const g of GUIDES) {
    const route = `/guides/${g.slug}`;
    const html = fs.readFileSync(fileFor(route), 'utf8');
    const inner = rootOf(html).inner;
    assert.ok(!html.includes('youtube-nocookie.com'), `${route}: the live player host must not be in the initial HTML`);
    assert.doesNotMatch(inner, /<iframe\b/i, `${route}: no frame in the initial HTML`);
    if (g.youtube) {
      assert.ok(inner.includes(`src="https://i.ytimg.com/vi/${g.youtube}/hqdefault.jpg"`), `${route}: preview image for ${g.youtube}`);
      assert.match(inner, /<button\b[^>]*aria-label="Play video: [^"]+"/, `${route}: a named play button`);
      assert.ok(inner.includes(`href="https://www.youtube.com/watch?v=${g.youtube}"`), `${route}: the Watch on YouTube fallback link`);
    } else {
      assert.ok(!html.includes('i.ytimg.com'), `${route}: no video declared, so no YouTube image`);
      assert.doesNotMatch(inner, /aria-label="Play video: /, `${route}: no video declared, so no player`);
    }
  }
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
