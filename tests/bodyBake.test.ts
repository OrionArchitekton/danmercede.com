import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROUTE_META,
  caseStudyMeta,
  caseStudyPaths,
  renderBodyBlock,
  renderRouteJsonLd,
  injectBlock,
  BODY_BLOCK_START,
  BODY_BLOCK_END,
  JSONLD_BLOCK_START,
  JSONLD_BLOCK_END,
  PERSON_ID,
  WEBSITE_ID,
} from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = () => readFileSync(path.join(root, 'index.html'), 'utf8');

function blockBetween(html: string, start: string, end: string): string {
  const s = html.indexOf(start);
  const e = html.indexOf(end);
  assert.ok(s !== -1 && e !== -1 && e > s, `markers ${start}/${end} not found in HTML`);
  return html.slice(s + start.length, e).trim();
}

// ---------------------------------------------------------------------------
// W1 — body bake
// ---------------------------------------------------------------------------

test('renderBodyBlock emits an h1 and at least one paragraph of real text', () => {
  const block = renderBodyBlock('/proof', ROUTE_META['/proof']);
  const h1 = (block.match(/<h1>/g) || []).length;
  const p = (block.match(/<p>/g) || []).length;
  assert.equal(h1, 1, 'exactly one <h1> per route');
  assert.ok(p >= 1, 'at least one <p>');
  assert.match(block, /<h1>Proof<\/h1>/);
  // Real copy, not the empty root shell.
  assert.match(block, /four deterministic boundaries/);
});

test('renderBodyBlock escapes < > & in copy (no breakout)', () => {
  const block = renderBodyBlock('/x', {
    title: 'x',
    body: { h1: 'A & B', paragraphs: ['<script>x</script> & more'] },
  });
  assert.match(block, /<h1>A &amp; B<\/h1>/);
  assert.match(block, /&lt;script&gt;x&lt;\/script&gt; &amp; more/);
  assert.doesNotMatch(block, /<script>x<\/script>/);
});

test('renderBodyBlock falls back to title+description when a route omits body', () => {
  const block = renderBodyBlock('/y', { title: 'Fallback Title', description: 'Fallback desc.' });
  assert.match(block, /<h1>Fallback Title<\/h1>/);
  assert.match(block, /<p>Fallback desc\.<\/p>/);
});

test('every static ROUTE_META route renders a non-empty body block', () => {
  for (const [routePath, meta] of Object.entries(ROUTE_META)) {
    const block = renderBodyBlock(routePath, meta);
    assert.match(block, /<h1>.+<\/h1>/, `${routePath} must have an h1`);
    assert.match(block, /<p>.+<\/p>/, `${routePath} must have a paragraph`);
  }
});

test('every case-study route renders a non-empty body block', () => {
  for (const csPath of caseStudyPaths()) {
    const slug = csPath.split('/').pop();
    const block = renderBodyBlock(csPath, caseStudyMeta(slug));
    assert.match(block, /<h1>.+<\/h1>/, `${csPath} must have an h1`);
    assert.match(block, /<p>.+<\/p>/, `${csPath} must have a paragraph`);
  }
});

test('the prerendered body block lives OUTSIDE #root so React never collides with it', () => {
  const block = renderBodyBlock('/', ROUTE_META['/']);
  // DOM placement: prerender content is a sibling of #root, never inside it.
  assert.match(block, /id="prerender-content"/);
  assert.doesNotMatch(block, /id="root"/);
  // Accessibility/visibility contract: hidden from users, still crawlable. A
  // refactor that drops aria-hidden or the visually-hidden style would expose
  // duplicate content to sighted users + AT — lock all three.
  assert.match(block, /aria-hidden="true"/);
  assert.match(block, /data-prerender="true"/);
  assert.match(block, /style="[^"]*position:absolute[^"]*"/);
});

test('index.html BODY_BLOCK equals renderBodyBlock("/") (no homepage body drift)', () => {
  const html = indexHtml();
  const block = blockBetween(html, BODY_BLOCK_START, BODY_BLOCK_END);
  assert.equal(block, renderBodyBlock('/', ROUTE_META['/']).trim());
});

// ---------------------------------------------------------------------------
// W4 — per-route JSON-LD (Article / ProfilePage / BreadcrumbList)
// ---------------------------------------------------------------------------

test('content routes emit an Article node linked to the canonical Person/WebSite', () => {
  const block = renderRouteJsonLd('/proof', ROUTE_META['/proof']);
  const doc = JSON.parse(block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, ''));
  const types = doc['@graph'].map((n: { '@type': string }) => n['@type']);
  assert.ok(types.includes('Article'), 'Article present');
  assert.ok(types.includes('BreadcrumbList'), 'BreadcrumbList present');
  const article = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
  assert.equal(article.author['@id'], PERSON_ID);
  assert.equal(article.isPartOf['@id'], WEBSITE_ID);
});

test('bio routes emit a ProfilePage whose mainEntity is the hub Person', () => {
  const block = renderRouteJsonLd('/about', ROUTE_META['/about']);
  const doc = JSON.parse(block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, ''));
  const profile = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'ProfilePage');
  assert.ok(profile, 'ProfilePage present');
  assert.equal(profile.mainEntity['@id'], PERSON_ID);
});

test('FAQPage is never emitted (deprecated rich result, 2026)', () => {
  for (const [routePath, meta] of Object.entries(ROUTE_META)) {
    assert.doesNotMatch(renderRouteJsonLd(routePath, meta), /FAQPage/, `${routePath} must not emit FAQPage`);
  }
});

test('all three bio routes (/, /about, /ecosystem) emit a ProfilePage', () => {
  for (const routePath of ['/', '/about', '/ecosystem']) {
    const block = renderRouteJsonLd(routePath, ROUTE_META[routePath]);
    const doc = JSON.parse(block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '').replace(/\\u003c/g, '<'));
    const types = doc['@graph'].map((n: { '@type': string }) => n['@type']);
    assert.ok(types.includes('ProfilePage'), `${routePath} must emit ProfilePage`);
  }
});

test('JSON-LD cannot break out of its <script> tag (</script> is escaped)', () => {
  const block = renderRouteJsonLd('/x', {
    title: 'Pwn </script><img src=x onerror=alert(1)>',
    description: 'evil </script> payload',
    schemaType: 'Article',
  });
  // The literal closing-tag sequence must not survive in the emitted markup.
  assert.doesNotMatch(block, /<\/script><img/);
  // The dangerous `<` is escaped to < — the parser never sees a `</script>`
  // close inside the payload (acceptance criterion 5: `<` is escaped).
  assert.match(block, /\\u003c\/script/, 'the opening < of </script> is escaped as \\u003c');
  assert.doesNotMatch(block.slice(0, -'  </script>'.length), /<\/script>/, 'no raw </script> inside the JSON payload');
  // The single trailing real </script> that closes the block is still intact.
  assert.ok(block.trimEnd().endsWith('</script>'));
  // And the escaped payload still parses back to the original string.
  const json = block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '');
  const doc = JSON.parse(json);
  const article = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
  assert.match(article.headline, /<\/script>/, 'round-trips to the original unescaped string');
});

test('JSON-LD escapes the full `< > &` set per acceptance criterion 5', () => {
  // Acceptance criterion 5 requires the baked JSON-LD to be escaped for
  // `< > &` (not just the `<` script-breakout char). A title/description
  // carrying all three plus a raw `>` and `&` must emit none of them raw
  // inside the <script> payload, yet round-trip back to the original strings.
  const block = renderRouteJsonLd('/x', {
    title: 'a < b > c & d </script>',
    description: 'x > y && z < w',
    schemaType: 'Article',
  });
  // Strip the wrapping <script ...> ... </script> to inspect only the payload.
  const payload = block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '');
  assert.doesNotMatch(payload, /</, 'no raw < survives in the JSON-LD payload');
  assert.doesNotMatch(payload, />/, 'no raw > survives in the JSON-LD payload');
  assert.doesNotMatch(payload, /&/, 'no raw & survives in the JSON-LD payload');
  assert.match(payload, /\\u003c/, '< is escaped to \\u003c');
  assert.match(payload, /\\u003e/, '> is escaped to \\u003e');
  assert.match(payload, /\\u0026/, '& is escaped to \\u0026');
  // The escaped JSON still parses, and the values round-trip exactly.
  const doc = JSON.parse(payload);
  const article = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
  assert.equal(article.headline, 'a < b > c & d </script>', 'headline round-trips with < > & intact');
  assert.equal(article.description, 'x > y && z < w', 'description round-trips with < > & intact');
});

test('case-study breadcrumb chains Home > Proof > Title', () => {
  const csPath = caseStudyPaths()[0];
  const slug = csPath.split('/').pop();
  const block = renderRouteJsonLd(csPath, caseStudyMeta(slug));
  const doc = JSON.parse(block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, ''));
  const crumb = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'BreadcrumbList');
  const names = crumb.itemListElement.map((i: { name: string }) => i.name);
  assert.deepEqual(names.slice(0, 2), ['Home', 'Proof']);
});

test('per-route JSON-LD is valid JSON for every route', () => {
  const all = [
    ...Object.keys(ROUTE_META),
    ...caseStudyPaths(),
  ];
  for (const p of all) {
    const meta = p.startsWith('/case-studies/') ? caseStudyMeta(p.split('/').pop()) : ROUTE_META[p];
    const block = renderRouteJsonLd(p, meta);
    const json = block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '');
    assert.doesNotThrow(() => JSON.parse(json), `${p} JSON-LD must parse`);
  }
});

test('index.html ROUTE_JSONLD block equals renderRouteJsonLd("/") (no homepage schema drift)', () => {
  const html = indexHtml();
  const block = blockBetween(html, JSONLD_BLOCK_START, JSONLD_BLOCK_END);
  assert.equal(block, renderRouteJsonLd('/', ROUTE_META['/']).trim());
});

// ---------------------------------------------------------------------------
// injectBlock idempotence
// ---------------------------------------------------------------------------

test('injectBlock replaces only the anchored region and is idempotent', () => {
  const html = `<head>${BODY_BLOCK_START}\nOLD\n${BODY_BLOCK_END}</head>`;
  const once = injectBlock(html, BODY_BLOCK_START, BODY_BLOCK_END, 'NEW');
  assert.match(once, /NEW/);
  assert.doesNotMatch(once, /OLD/);
  const twice = injectBlock(once, BODY_BLOCK_START, BODY_BLOCK_END, 'NEW');
  assert.equal(once, twice, 'second injection is a no-op (markers survive)');
});

test('injectBlock throws when markers are missing', () => {
  assert.throws(() => injectBlock('<head></head>', BODY_BLOCK_START, BODY_BLOCK_END, 'x'), /markers not found/);
});

// ---------------------------------------------------------------------------
// End-to-end: the injector bakes head + JSON-LD + body for a deep route
// ---------------------------------------------------------------------------

test('a deep route gets its own title, Article JSON-LD, and crawlable body (end-to-end)', () => {
  // Minimal index.html template carrying all three anchors.
  const template = [
    '<head>',
    '  <!--SEO_BLOCK-->',
    '  <title>HOME</title>',
    '  <!--/SEO_BLOCK-->',
    '  <!--ROUTE_JSONLD-->',
    '  <!--/ROUTE_JSONLD-->',
    '</head>',
    '<body>',
    '  <!--BODY_BLOCK-->',
    '  <!--/BODY_BLOCK-->',
    '  <div id="root"></div>',
    '</body>',
  ].join('\n');

  const meta = ROUTE_META['/proof'];
  let html = injectBlock(template, '<!--SEO_BLOCK-->', '<!--/SEO_BLOCK-->', '  <title>Proof — Runtime Governance Enforcement Artifacts | Dan Mercede</title>', '  ');
  html = injectBlock(html, JSONLD_BLOCK_START, JSONLD_BLOCK_END, renderRouteJsonLd('/proof', meta), '  ');
  html = injectBlock(html, BODY_BLOCK_START, BODY_BLOCK_END, renderBodyBlock('/proof', meta), '  ');

  // Route title replaced the homepage default.
  assert.match(html, /<title>Proof — Runtime Governance/);
  assert.doesNotMatch(html, /<title>HOME<\/title>/);
  // Article JSON-LD present in head.
  assert.match(html, /"@type": "Article"/);
  // Crawlable body present and outside #root.
  const bodySection = html.slice(html.indexOf('<body>'));
  assert.match(bodySection, /<h1>Proof<\/h1>/);
  assert.match(bodySection, /<div id="root"><\/div>/);
  // h1 sits before the empty root shell.
  assert.ok(bodySection.indexOf('<h1>Proof') < bodySection.indexOf('id="root"'));
});
