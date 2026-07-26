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

// The pilot qualifier sits BESIDE the roles line, it does not replace it. The roles
// lane is the higher-dollar one; a pilot CTA that overwrites it dilutes both. This
// test is the guard against a future edit quietly collapsing the two into one.
test('WORKS_HUB.pilot adds a second qualifier without touching the roles line', () => {
  assert.equal(
    WORKS_HUB.availability,
    'Available for staff/principal AI-systems roles and speaking.',
    'the roles availability line must stay byte-identical; the pilot line is additive',
  );
  assert.ok(
    typeof WORKS_HUB.pilot === 'string' && WORKS_HUB.pilot.trim().length > 0,
    'WORKS_HUB.pilot must be non-empty copy',
  );
  assert.notEqual(WORKS_HUB.pilot, WORKS_HUB.availability, 'pilot must be distinct copy, not a duplicate');
  for (const dash of ['—', '–', '―']) {
    assert.ok(!WORKS_HUB.pilot.includes(dash), `pilot copy must not contain a long dash (${dash})`);
  }
});

test('the /works baked body contains the pilot line, so visible and baked cannot drift', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  assert.ok(block.includes(WORKS_HUB.pilot), 'pilot line baked as crawlable text');
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
test('the /works baked body hosts NO essay bodies (stays a small pointer: lead + 3 framing paragraphs + the pilot CTA)', () => {
  const block = renderBodyBlock('/works', ROUTE_META['/works']);
  const paras = (block.match(/<p>/g) || []).length;
  assert.ok(paras <= 5, `/works must stay a pointer (max 5 <p>), got ${paras}. Did an essay body leak in?`);
  // Raising the count cap for the pilot CTA line would weaken this guard on its own,
  // because a leaked essay body is ONE very long paragraph and would still pass a count
  // check. Assert shape as well, so the cap increase cannot mask the hazard the test
  // actually exists to catch. Longest legitimate paragraph today is 149 chars.
  const longest = Math.max(0, ...(block.match(/<p>[\s\S]*?<\/p>/g) || []).map((p) => p.length));
  assert.ok(longest <= 400, `no /works paragraph may run essay-length, longest is ${longest} chars`);
});
