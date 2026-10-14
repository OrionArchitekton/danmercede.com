import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROUTE_META,
  caseStudyMeta,
  caseStudyPaths,
  thoughtMeta,
  thoughtPaths,
  renderRouteJsonLd,
  injectBlock,
  SEO_BLOCK_START,
  SEO_BLOCK_END,
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
// Per-thought routes (JSON-LD)
// ---------------------------------------------------------------------------

test('R1: there is at least one published thought route to bake', () => {
  assert.ok(thoughtPaths().length > 0, 'expected the THOUGHTS corpus to be non-empty');
});

test('R1/W4: a per-thought route emits an Article authored by the canonical #person (no competing Person, no FAQPage)', () => {
  const tPath = thoughtPaths()[0];
  const slug = tPath.split('/').pop();
  const block = renderRouteJsonLd(tPath, thoughtMeta(slug));
  const doc = JSON.parse(block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&'));
  const types = doc['@graph'].map((n: { '@type': string }) => n['@type']);
  assert.ok(types.includes('Article'), 'Article present');
  assert.ok(types.includes('BreadcrumbList'), 'BreadcrumbList present');
  assert.ok(!types.includes('Person'), 'NO competing Person node on a thought route');
  assert.ok(!types.includes('FAQPage'), 'NEVER FAQPage');
  const article = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
  assert.equal(article.author['@id'], PERSON_ID, 'Article author backrefs the hub #person');
  assert.equal(article.publisher['@id'], PERSON_ID, 'Article publisher backrefs the hub #person');
  assert.equal(article.isPartOf['@id'], WEBSITE_ID);
});

test('R2: a per-thought breadcrumb chains Home > Thoughts > Title', () => {
  const tPath = thoughtPaths()[0];
  const slug = tPath.split('/').pop();
  const block = renderRouteJsonLd(tPath, thoughtMeta(slug));
  const doc = JSON.parse(block.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, ''));
  const crumb = doc['@graph'].find((n: { '@type': string }) => n['@type'] === 'BreadcrumbList');
  const names = crumb.itemListElement.map((i: { name: string }) => i.name);
  assert.deepEqual(names.slice(0, 2), ['Home', 'Thoughts']);
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
  const html = `<head>${SEO_BLOCK_START}\nOLD\n${SEO_BLOCK_END}</head>`;
  const once = injectBlock(html, SEO_BLOCK_START, SEO_BLOCK_END, 'NEW');
  assert.match(once, /NEW/);
  assert.doesNotMatch(once, /OLD/);
  const twice = injectBlock(once, SEO_BLOCK_START, SEO_BLOCK_END, 'NEW');
  assert.equal(once, twice, 'second injection is a no-op (markers survive)');
});

test('injectBlock throws when markers are missing', () => {
  assert.throws(() => injectBlock('<head></head>', SEO_BLOCK_START, SEO_BLOCK_END, 'x'), /markers not found/);
});

// ---------------------------------------------------------------------------
// End-to-end: the injector bakes head + JSON-LD for a deep route
// ---------------------------------------------------------------------------

test('a deep route gets its own title and Article JSON-LD (end-to-end)', () => {
  // Minimal index.html template carrying both anchors.
  const template = [
    '<head>',
    '  <!--SEO_BLOCK-->',
    '  <title>HOME</title>',
    '  <!--/SEO_BLOCK-->',
    '  <!--ROUTE_JSONLD-->',
    '  <!--/ROUTE_JSONLD-->',
    '</head>',
    '<body>',
    '  <div id="root"></div>',
    '</body>',
  ].join('\n');

  const meta = ROUTE_META['/proof'];
  let html = injectBlock(template, SEO_BLOCK_START, SEO_BLOCK_END, '  <title>Proof | Dan Mercede</title>', '  ');
  html = injectBlock(html, JSONLD_BLOCK_START, JSONLD_BLOCK_END, renderRouteJsonLd('/proof', meta), '  ');

  // Route title replaced the homepage default.
  assert.match(html, /<title>Proof \| Dan Mercede<\/title>/);
  assert.doesNotMatch(html, /<title>HOME<\/title>/);
  // Article JSON-LD present in head.
  assert.match(html, /"@type": "Article"/);
  // The root shell is untouched; the page render is injected separately.
  assert.match(html, /<div id="root"><\/div>/);
});
