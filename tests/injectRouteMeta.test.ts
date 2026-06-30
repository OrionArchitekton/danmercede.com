import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  renderSeoBlock,
  injectSeoBlock,
  caseStudyMeta,
  caseStudyPaths,
  ROUTE_META,
  SEO_BLOCK_START,
  SEO_BLOCK_END,
} from '../seoMeta';

test('renderSeoBlock sets per-route title, canonical, og:url, twitter', () => {
  const block = renderSeoBlock('/about', ROUTE_META['/about']);
  assert.match(block, /<title>About: Dan Mercede<\/title>/);
  assert.match(block, /<link rel="canonical" href="https:\/\/www\.danmercede\.com\/about" \/>/);
  assert.match(block, /og:title" content="About: Dan Mercede"/);
  assert.match(block, /og:url" content="https:\/\/www\.danmercede\.com\/about"/);
  assert.match(block, /twitter:title" content="About: Dan Mercede"/);
});

test('renderSeoBlock falls back to the default description when a route omits one', () => {
  const block = renderSeoBlock('/ecosystem', ROUTE_META['/ecosystem']);
  assert.match(block, /governed AI operating systems, enterprise AI reliability/);
});

test('renderSeoBlock escapes special characters in titles/descriptions', () => {
  const block = renderSeoBlock('/x', { title: 'A & B <"C">' });
  assert.match(block, /<title>A &amp; B &lt;&quot;C&quot;&gt;<\/title>/);
});

test('injectSeoBlock replaces only the anchored region, preserving the rest', () => {
  const html = `<head>\n  ${SEO_BLOCK_START}\n  <title>OLD</title>\n  ${SEO_BLOCK_END}\n  <link rel="icon" href="/f.ico">\n</head>`;
  const out = injectSeoBlock(html, '  <title>NEW</title>');
  assert.match(out, /<title>NEW<\/title>/);
  assert.doesNotMatch(out, /OLD/);
  assert.match(out, /<link rel="icon" href="\/f\.ico">/);
  assert.ok(out.includes(SEO_BLOCK_START) && out.includes(SEO_BLOCK_END));
});

test('injectSeoBlock throws when markers are missing (build-time safety)', () => {
  assert.throws(() => injectSeoBlock('<head></head>', 'x'), /markers not found/);
});

test('caseStudyMeta: known slug yields a Case Study title; unknown yields the not-found fallback', () => {
  const knownSlug = caseStudyPaths()[0].split('/').pop()!; // real slug from committed content
  const known = caseStudyMeta(knownSlug);
  assert.match(known.title, /: Case Study \| Dan Mercede$/);
  assert.ok(known.description && known.description.length > 0);
  assert.equal(caseStudyMeta('definitely-not-a-real-slug').title, 'Case Study Not Found | Dan Mercede');
});

test('caseStudyPaths derives at least one /case-studies/<slug> path from committed content', () => {
  const paths = caseStudyPaths();
  assert.ok(paths.length >= 1);
  for (const p of paths) assert.match(p, /^\/case-studies\/[a-z0-9-]+$/);
});

test('index.html anchored block equals renderSeoBlock("/") (no homepage drift)', () => {
  const html = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  const s = html.indexOf(SEO_BLOCK_START);
  const e = html.indexOf(SEO_BLOCK_END);
  assert.ok(s !== -1 && e !== -1, 'index.html must contain the SEO block anchors');
  const block = html.slice(s + SEO_BLOCK_START.length, e).trim();
  assert.equal(block, renderSeoBlock('/', ROUTE_META['/']).trim());
});
