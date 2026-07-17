import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES, GUIDE_LENSES, guideMatchesLens } from '../constants';

// ---------------------------------------------------------------------------
// GUIDE_LENSES is hub-side curation (explicit slug membership, mirroring the
// FEATURED_ESSAY_SLUGS pattern) — never keyword inference. These tests guard
// slug validity so a guide rename/retire cannot silently empty a lens.
// ---------------------------------------------------------------------------

test('every curated lens slug resolves to a published guide', () => {
  const known = new Set(GUIDES.map((guide) => guide.slug));
  for (const lens of GUIDE_LENSES) {
    for (const slug of lens.slugs) {
      assert.ok(known.has(slug), `lens "${lens.id}" references unknown guide slug "${slug}"`);
    }
  }
});

test('lens ids are unique and include the "all" lens', () => {
  const ids = GUIDE_LENSES.map((lens) => lens.id);
  assert.equal(new Set(ids).size, ids.length, 'lens ids must be unique');
  assert.ok(ids.includes('all'), 'the "all" lens must exist (unlensed guides stay reachable)');
});

test('"all" matches every guide; curated lenses match exactly their slug lists', () => {
  for (const guide of GUIDES) {
    assert.ok(guideMatchesLens(guide, 'all'), `"all" must match ${guide.slug}`);
  }
  for (const lens of GUIDE_LENSES) {
    if (lens.id === 'all') continue;
    assert.ok(lens.slugs.length > 0, `curated lens "${lens.id}" must not be empty`);
    for (const guide of GUIDES) {
      assert.equal(
        guideMatchesLens(guide, lens.id),
        lens.slugs.includes(guide.slug),
        `lens "${lens.id}" membership for ${guide.slug} must be slug-driven`,
      );
    }
  }
});
