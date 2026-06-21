import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURED_ESSAY_SLUGS, featuredEssays, WORKS_HUB, THOUGHTS } from '../constants';
import { ROUTE_META, renderBodyBlock } from '../seoMeta';

// ---------------------------------------------------------------------------
// AC1 — the curated-pointer hard cap is code-enforced (load-bearing)
// ---------------------------------------------------------------------------

test('FEATURED_ESSAY_SLUGS is hard-capped at 3-5 entries (keeps /works from becoming a second /thoughts)', () => {
  assert.ok(
    FEATURED_ESSAY_SLUGS.length >= 3 && FEATURED_ESSAY_SLUGS.length <= 5,
    `FEATURED_ESSAY_SLUGS must hold 3-5 slugs, got ${FEATURED_ESSAY_SLUGS.length}`,
  );
  assert.equal(
    new Set(FEATURED_ESSAY_SLUGS).size,
    FEATURED_ESSAY_SLUGS.length,
    'featured slugs must be unique (no duplicate pointer)',
  );
});

test('every featured slug resolves to a THOUGHTS entry; featuredEssays() preserves order + titles', () => {
  const resolved = featuredEssays();
  assert.equal(resolved.length, FEATURED_ESSAY_SLUGS.length);
  resolved.forEach((e, i) => {
    assert.equal(e.slug, FEATURED_ESSAY_SLUGS[i], 'order preserved');
    const t = THOUGHTS.find((th) => th.slug === e.slug);
    assert.ok(t, `slug ${e.slug} present in THOUGHTS`);
    assert.equal(e.title, t!.title, 'title kept in sync with the corpus');
  });
});

test('featuredEssays() is FAIL-LOUD on an unresolved slug (no dangling internal links)', () => {
  assert.throws(
    () => featuredEssays(['this-slug-does-not-exist']),
    /not in THOUGHTS/,
    'a featured slug missing from THOUGHTS must throw at build/test, never ship a dangling link',
  );
});

test('WORKS_HUB carries the single CTA copy + contact/outbound rail', () => {
  assert.match(WORKS_HUB.availability, /Available for/);
  assert.equal(WORKS_HUB.contactHref, '/connect');
  assert.equal(WORKS_HUB.githubUrl, 'https://github.com/OrionArchitekton');
  assert.equal(WORKS_HUB.signalUrl, 'https://danmercede.online');
});

// ---------------------------------------------------------------------------
// AC3 — the crawler bake carries availability text + featured deep-links + outbound
// ---------------------------------------------------------------------------

test('the /works baked body contains the availability line as crawlable text', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  assert.ok(block.includes(WORKS_HUB.availability), 'availability line baked as text');
});

test('the /works baked body bakes each featured essay as an escaped /thoughts/<slug> <a>', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  for (const e of featuredEssays()) {
    assert.match(
      block,
      new RegExp(`<a href="/thoughts/${e.slug}">`),
      `featured deep-link to /thoughts/${e.slug} baked`,
    );
  }
});

test('the /works baked body bakes the outbound rail (signal + GitHub)', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  assert.ok(block.includes(`href="${WORKS_HUB.signalUrl}"`), 'signal outbound baked');
  assert.ok(block.includes(`href="${WORKS_HUB.githubUrl}"`), 'GitHub outbound baked');
});

// Parity — the baked featured set CANNOT drift from featuredEssays(); the React
// WorksPage reads the same featuredEssays(), so all three renders agree.
test('the baked /works featured deep-links EQUAL featuredEssays() (no prerender drift)', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  const bakedSlugs = [...block.matchAll(/<a href="\/thoughts\/([^"/]+)">/g)].map((m) => m[1]);
  const expected = featuredEssays().map((e) => e.slug);
  assert.deepEqual(bakedSlugs, expected, 'baked featured deep-links must equal featuredEssays() exactly');
});

test('the baked /works featured links carry the resolved TITLES too (parity defense-in-depth)', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  const baked = [...block.matchAll(/<a href="\/thoughts\/([^"/]+)">([^<]+)<\/a>/g)].map((m) => ({
    slug: m[1],
    title: m[2],
  }));
  // featuredEssays() returns RAW titles; the bake escapes < > & via escapeText —
  // apply the same escaping to the expected side so the comparison is robust to a
  // future title containing those chars (today's 5 titles contain none).
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const expected = featuredEssays().map((e) => ({ slug: e.slug, title: esc(e.title) }));
  assert.deepEqual(baked, expected, 'baked featured slug+title must equal featuredEssays() exactly');
});

// AC4 — /works is a pointer, not a library: NO essay bodies leak into the bake.
test('the /works baked body hosts NO essay bodies (stays a small pointer: lead + 3 framing paragraphs)', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  const paras = (block.match(/<p>/g) || []).length;
  assert.ok(paras <= 4, `/works must stay a pointer (<=4 <p>), got ${paras} — did an essay body leak in?`);
});
