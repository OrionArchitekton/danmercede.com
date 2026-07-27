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
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  guideMeta,
  guidePaths,
  thoughtMeta,
  thoughtPaths,
  caseStudyMeta,
  caseStudyPaths,
  renderSeoBlock,
  renderRouteJsonLd,
  truncateForMeta,
  typeScopedMetaTags,
  ARTICLE_AUTHOR_URL,
  TYPE_SCOPED_META_PROPS,
  META_DESCRIPTION_MAX,
  ROUTE_META,
} from '../seoMeta';

const PERSON_ID = 'https://www.danmercede.com/#person';

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
  assert.ok(
    block.includes(`<meta property="article:author" content="${ARTICLE_AUTHOR_URL}" />`),
    'article:author must be the profile URL, not a display name',
  );
});

test('article:author is an absolute https URL to a real route that is itself a profile', () => {
  // Open Graph types article:author as a profile OBJECT, so the value must be a
  // URL, and the page it points at must itself declare og:type=profile.
  assert.match(ARTICLE_AUTHOR_URL, /^https:\/\/www\.danmercede\.com\/[a-z-]+$/);
  const authorPath = new URL(ARTICLE_AUTHOR_URL).pathname;
  const authorMeta = ROUTE_META[authorPath];
  assert.ok(authorMeta, `article:author points at ${authorPath}, which is not a known route`);
  assert.match(renderSeoBlock(authorPath, authorMeta), /<meta property="og:type" content="profile" \/>/);
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

test('a route with no ogType (undefined) renders profile AND keeps the profile:* pair', () => {
  const block = renderSeoBlock('/x', { title: 'X' });
  assert.match(block, /<meta property="og:type" content="profile" \/>/);
  assert.match(block, /<meta property="profile:first_name" content="Dan" \/>/);
  assert.match(block, /<meta property="profile:last_name" content="Mercede" \/>/);
});

// typeScopedMetaTags is the single source shared by renderSeoBlock and the
// runtime head hook. These assertions are what make the App.tsx half testable:
// the repo has no DOM harness, so the branch itself is verified here instead.
test('typeScopedMetaTags: an article route adds article:* and removes profile:*', () => {
  const { add, remove } = typeScopedMetaTags({ ogType: 'article', datePublished: '2026-01-01' });
  assert.deepEqual(add, [
    ['article:published_time', '2026-01-01'],
    ['article:author', ARTICLE_AUTHOR_URL],
  ]);
  assert.deepEqual(remove.sort(), ['profile:first_name', 'profile:last_name']);
});

test('typeScopedMetaTags: add and remove together cover every type-scoped property', () => {
  for (const m of [
    { ogType: 'article' as const, datePublished: '2026-01-01' },
    { ogType: 'article' as const },
    {},
  ]) {
    const { add, remove } = typeScopedMetaTags(m);
    const covered = [...add.map(([p]) => p), ...remove].sort();
    assert.deepEqual(
      covered,
      [...TYPE_SCOPED_META_PROPS].sort(),
      'every type-scoped property must be either emitted or explicitly removed',
    );
  }
});

test('typeScopedMetaTags: a dateless article route removes article:published_time', () => {
  const { add, remove } = typeScopedMetaTags({ ogType: 'article' });
  assert.deepEqual(add, [['article:author', ARTICLE_AUTHOR_URL]]);
  assert.ok(remove.includes('article:published_time'));
});

test('typeScopedMetaTags: a profile route removes both article:* properties', () => {
  const { add, remove } = typeScopedMetaTags({});
  assert.deepEqual(add, [
    ['profile:first_name', 'Dan'],
    ['profile:last_name', 'Mercede'],
  ]);
  assert.deepEqual(remove.sort(), ['article:author', 'article:published_time']);
});

test('the runtime head hook consumes the shared helper rather than duplicating the branch', () => {
  // Guards the drift this PR fixes. There is no DOM harness in this repo, so the
  // structural guarantee (one branch, not two) is what makes the runtime correct.
  const app = readFileSync(path.resolve(process.cwd(), 'App.tsx'), 'utf8');
  assert.match(app, /typeScopedMetaTags\(/, 'App.tsx must call the shared helper');
  for (const prop of TYPE_SCOPED_META_PROPS) {
    assert.ok(
      !app.includes(`"${prop}"`) && !app.includes(`'${prop}'`),
      `App.tsx must not hardcode ${prop}; it belongs to typeScopedMetaTags`,
    );
  }
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

test('truncateForMeta handles caps below the ellipsis length', () => {
  // Regression: slice(0, max - 3) takes a NEGATIVE index for max < 3 and
  // returned nearly the whole string plus '...', i.e. LONGER than the cap.
  assert.equal(truncateForMeta('abcdef', 0), '');
  assert.equal(truncateForMeta('abcdef', 2), 'ab');
  for (let max = 0; max <= 5; max += 1) {
    const out = truncateForMeta('x'.repeat(200), max);
    assert.ok(out.length <= Math.max(max, 0), `max=${max} produced ${out.length} chars`);
  }
});

test('an Article route with no datePublished omits both date fields but keeps image and author', () => {
  const art = articleNode('/x', { title: 'X', description: 'd', schemaType: 'Article' })!;
  assert.ok(!('datePublished' in art), 'datePublished must be omitted when unknown');
  assert.ok(!('dateModified' in art), 'dateModified must be omitted when unknown');
  assert.match(String(art.image), /^https:\/\//);
  assert.deepEqual(art.author, { '@id': PERSON_ID });
  assert.deepEqual(art.publisher, { '@id': PERSON_ID });
});

// /thoughts/<slug> detail pages are article-shaped too. They were left on
// og:type=profile by the first pass, which is 33 of the 42 article routes.
const thoughtSlugs = thoughtPaths().map((p) => p.replace('/thoughts/', ''));

test('a thought route declares og:type=article with a date and the profile-URL author', () => {
  const slug = thoughtSlugs[0];
  const block = renderSeoBlock(`/thoughts/${slug}`, thoughtMeta(slug));
  assert.match(block, /<meta property="og:type" content="article" \/>/);
  assert.match(block, /<meta property="article:published_time" content="\d{4}-\d{2}-\d{2}" \/>/);
  assert.ok(block.includes(`<meta property="article:author" content="${ARTICLE_AUTHOR_URL}" />`));
});

test('a thought route drops the profile:* pair', () => {
  const block = renderSeoBlock(`/thoughts/${thoughtSlugs[0]}`, thoughtMeta(thoughtSlugs[0]));
  assert.ok(!block.includes('profile:first_name'));
  assert.ok(!block.includes('profile:last_name'));
});

test('every thought meta description is within the SERP display cap', () => {
  for (const slug of thoughtSlugs) {
    const { description } = thoughtMeta(slug);
    assert.ok(
      (description ?? '').length <= META_DESCRIPTION_MAX,
      `"${slug}" description is ${(description ?? '').length} chars`,
    );
  }
});

// Case studies are the third article-shaped detail family. They carry no date,
// so they exercise the dateless branch end to end: og:type=article and an
// author, but NO article:published_time and no JSON-LD dates.
const caseStudySlugs = caseStudyPaths().map((p) => p.replace('/case-studies/', ''));

test('a case-study route is an article with an author but no published_time (dateless)', () => {
  const slug = caseStudySlugs[0];
  const block = renderSeoBlock(`/case-studies/${slug}`, caseStudyMeta(slug));
  assert.match(block, /<meta property="og:type" content="article" \/>/);
  assert.ok(block.includes(`<meta property="article:author" content="${ARTICLE_AUTHOR_URL}" />`));
  assert.ok(!block.includes('article:published_time'), 'no date exists, so the tag must be omitted');
  assert.ok(!block.includes('profile:first_name'));
});

test('a case-study JSON-LD node omits dates but keeps image and the @id backrefs', () => {
  const slug = caseStudySlugs[0];
  const art = articleNode(`/case-studies/${slug}`, caseStudyMeta(slug))!;
  assert.ok(!('datePublished' in art));
  assert.ok(!('dateModified' in art));
  assert.match(String(art.image), /^https:\/\//);
  assert.deepEqual(art.author, { '@id': PERSON_ID });
});

test('every article-shaped DETAIL route emits og:type=article, and no listing does', () => {
  // The whole-class invariant this PR establishes: 44 detail routes are
  // articles; listings and the homepage stay profile.
  const detail = [
    ...guidePaths().map((p) => [p, guideMeta(p.replace('/guides/', ''))] as const),
    ...thoughtPaths().map((p) => [p, thoughtMeta(p.replace('/thoughts/', ''))] as const),
    ...caseStudyPaths().map((p) => [p, caseStudyMeta(p.replace('/case-studies/', ''))] as const),
  ];
  assert.ok(detail.length >= 40, `expected the full detail corpus, got ${detail.length}`);
  for (const [p, m] of detail) {
    assert.match(renderSeoBlock(p, m), /<meta property="og:type" content="article" \/>/, `${p}`);
  }
  for (const listing of ['/', '/thoughts', '/guides', '/proof']) {
    const m = ROUTE_META[listing];
    if (!m) continue;
    assert.match(
      renderSeoBlock(listing, m),
      /<meta property="og:type" content="profile" \/>/,
      `${listing} is a listing and must stay profile`,
    );
  }
});

test('case-study titles keep their pinned ": Reference Architecture" format', () => {
  // Deliberately NOT harmonised with guides/thoughts: tests/injectRouteMeta.test.ts
  // pins this format, and the defect fixed here was og:type, not the title.
  for (const slug of caseStudySlugs) {
    assert.match(caseStudyMeta(slug).title, /: Reference Architecture \| Dan Mercede$/);
  }
});

test('thought titles drop the ": Thought" infix and keep the full text in JSON-LD', () => {
  for (const slug of thoughtSlugs) {
    const m = thoughtMeta(slug) as ReturnType<typeof thoughtMeta> & { articleDescription?: string };
    assert.ok(!m.title.includes(': Thought |'), `"${slug}" still carries the ": Thought" infix`);
    assert.ok(m.title.endsWith(' | Dan Mercede'));
    const art = articleNode(`/thoughts/${slug}`, m)!;
    assert.equal(art.description, m.articleDescription);
  }
});
