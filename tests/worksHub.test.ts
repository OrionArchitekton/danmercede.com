import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURED_ESSAY_SLUGS, featuredEssays, WORKS_HUB, THOUGHTS } from '../constants';

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
