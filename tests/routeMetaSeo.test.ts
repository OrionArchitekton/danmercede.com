// Route-level SEO meta contract. This surface previously had ZERO coverage:
// every one of the 78 baked routes emitted og:type=profile (including 9 guides
// and 33 thoughts), guide <title> carried a redundant ": Guide" infix, the meta
// description dumped the full frontmatter blurb (379 chars on the longest
// guide), and the Article JSON-LD node shipped without datePublished or image.
//
// The load-bearing regression guard here is the NEGATIVE one: schemaType
// 'Article' is also carried by listing surfaces (/thoughts, /guides, /proof),
// so og:type must key off the explicit per-route `ogType`, never off schemaType.
// Keying it off schemaType would silently flip 48 routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  guideMeta,
  guidePaths,
  renderSeoBlock,
  renderRouteJsonLd,
  truncateForMeta,
  META_DESCRIPTION_MAX,
  ROUTE_META,
} from '../seoMeta';

const slugOf = (routePath: string) => routePath.replace('/guides/', '');
const guideSlugs = guidePaths().map(slugOf);
const sampleSlug = guideSlugs[0];

const articleNode = (routePath: string, m: Parameters<typeof renderRouteJsonLd>[1]) => {
  const raw = renderRouteJsonLd(routePath, m);
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  const graph = JSON.parse(json)['@graph'] as Record<string, unknown>[];
  return graph.find((n) => n['@type'] === 'Article');
};

test('there is at least one guide to assert against', () => {
  assert.ok(guideSlugs.length > 0, 'GUIDES corpus is empty; the rest of this file is vacuous');
});

test('a guide route declares og:type=article and carries article:* properties', () => {
  const path = `/guides/${sampleSlug}`;
  const block = renderSeoBlock(path, guideMeta(sampleSlug));
  assert.match(block, /<meta property="og:type" content="article" \/>/);
  assert.match(block, /<meta property="article:published_time" content="\d{4}-\d{2}-\d{2}" \/>/);
  assert.match(block, /<meta property="article:author" content="Dan Mercede" \/>/);
});

test('a guide route drops the profile:* pair (incoherent on an article card)', () => {
  const block = renderSeoBlock(`/guides/${sampleSlug}`, guideMeta(sampleSlug));
  assert.ok(!block.includes('profile:first_name'), 'article route must not emit profile:first_name');
  assert.ok(!block.includes('profile:last_name'), 'article route must not emit profile:last_name');
});

test('the homepage stays og:type=profile and keeps the profile:* pair', () => {
  const block = renderSeoBlock('/', ROUTE_META['/']);
  assert.match(block, /<meta property="og:type" content="profile" \/>/);
  assert.match(block, /<meta property="profile:first_name" content="Dan" \/>/);
  assert.ok(!block.includes('article:published_time'));
});

test('REGRESSION: a non-guide route with schemaType Article stays og:type=profile', () => {
  // /thoughts is a listing surface typed as Article. Deriving og:type from
  // schemaType would wrongly flip it (and 47 other routes) to article.
  const listing = ROUTE_META['/thoughts'];
  assert.ok(listing, 'expected a /thoughts entry in ROUTE_META');
  assert.equal(listing.schemaType, 'Article', 'precondition: /thoughts is typed Article');
  const block = renderSeoBlock('/thoughts', listing);
  assert.match(block, /<meta property="og:type" content="profile" \/>/);
});

test('a route with no ogType (undefined) renders profile without throwing', () => {
  const block = renderSeoBlock('/x', { title: 'X' });
  assert.match(block, /<meta property="og:type" content="profile" \/>/);
});

test('guide titles drop the redundant ": Guide" infix', () => {
  for (const slug of guideSlugs) {
    const { title } = guideMeta(slug);
    assert.ok(!title.includes(': Guide |'), `"${slug}" still carries the ": Guide" infix`);
    assert.ok(title.endsWith(' | Dan Mercede'), `"${slug}" lost the brand suffix`);
  }
});

test('every guide meta description is within the SERP display cap', () => {
  for (const slug of guideSlugs) {
    const { description } = guideMeta(slug);
    assert.ok(
      (description ?? '').length <= META_DESCRIPTION_MAX,
      `"${slug}" description is ${(description ?? '').length} chars, over ${META_DESCRIPTION_MAX}`,
    );
  }
});

test('the capped meta description does not cost the JSON-LD its full text', () => {
  const m = guideMeta(sampleSlug) as ReturnType<typeof guideMeta> & { articleDescription?: string };
  const art = articleNode(`/guides/${sampleSlug}`, m)!;
  assert.ok(m.articleDescription, 'guide meta should retain the untruncated description');
  assert.equal(art.description, m.articleDescription);
  assert.ok(
    String(art.description).length >= (m.description ?? '').length,
    'structured data should carry at least as much text as the capped tag',
  );
});

test('the Article JSON-LD node carries datePublished, dateModified, and image', () => {
  const art = articleNode(`/guides/${sampleSlug}`, guideMeta(sampleSlug))!;
  assert.match(String(art.datePublished), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(String(art.dateModified), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(String(art.image), /^https:\/\/www\.danmercede\.com\/.+/);
});

test('the Article headline is the clean title, not the brand-suffixed SEO title', () => {
  const art = articleNode(`/guides/${sampleSlug}`, guideMeta(sampleSlug))!;
  assert.ok(
    !String(art.headline).includes('| Dan Mercede'),
    'headline should be the content title, without the SEO brand suffix',
  );
});

test('the Article author stays an @id backref to the canonical person', () => {
  // Guards the single-Person invariant that tests/identityCanonical.test.ts protects.
  const art = articleNode(`/guides/${sampleSlug}`, guideMeta(sampleSlug))!;
  assert.deepEqual(art.author, { '@id': 'https://www.danmercede.com/#person' });
  assert.deepEqual(art.publisher, { '@id': 'https://www.danmercede.com/#person' });
});

test('truncateForMeta leaves short text untouched', () => {
  assert.equal(truncateForMeta('short enough', 160), 'short enough');
});

test('truncateForMeta cuts at a word boundary and stays within the cap', () => {
  const long = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu';
  const out = truncateForMeta(long, 30);
  assert.ok(out.length <= 30, `got ${out.length} chars`);
  assert.ok(out.endsWith('...'));
  assert.ok(!/\s\.\.\.$/.test(out), 'should not leave a dangling space before the ellipsis');
  // The last retained token must be whole.
  const retained = out.slice(0, -3).trim().split(' ').pop()!;
  assert.ok(long.split(' ').includes(retained), `"${retained}" was cut mid-word`);
});

test('truncateForMeta still caps when there is no usable word boundary', () => {
  const out = truncateForMeta('x'.repeat(200), 40);
  assert.ok(out.length <= 40, `got ${out.length} chars`);
  assert.ok(out.endsWith('...'));
});
