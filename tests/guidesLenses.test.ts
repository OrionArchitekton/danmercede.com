import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
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

// ---------------------------------------------------------------------------
// Hero stat rail. There is no React test harness in this repo (see
// tests/routeCoverage.test.ts), so the tile is guarded at the source level the
// same way routeCoverage/routeMetaSeo/imageBudget guard their App.tsx contracts.
//
// Regression this exists for: the tile rendered `GUIDE_CATEGORY_COUNT` (distinct
// `guide.category`, 2 values today) under the label "Lanes", a /thoughts concept
// (THOUGHT_LANES) that does not exist on /guides. The live hero read "Lanes: 2"
// while GUIDE_LENSES carried 4 ids. Count the axis the page navigates by.
// ---------------------------------------------------------------------------

test('the /guides hero theme tile counts curated lenses, not guide categories', () => {
  const appSource = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'App.tsx'),
    'utf8',
  );

  assert.ok(
    !appSource.includes('GUIDE_CATEGORY_COUNT'),
    'the hero stat rail must not derive a tile from distinct guide.category values',
  );
  assert.match(
    appSource,
    /GUIDE_THEME_COUNT\s*=\s*GUIDE_LENSES\s*\.filter\([\s\S]{0,80}?!==\s*'all'[\s\S]{0,20}?\)\.length/,
    'GUIDE_THEME_COUNT must count curated GUIDE_LENSES (excluding the "all" escape hatch)',
  );
  assert.match(
    appSource,
    /Themes<\/dt>\s*<dd[^>]*>\s*\{GUIDE_THEME_COUNT\}/,
    'the "Themes" tile must render GUIDE_THEME_COUNT',
  );

  // The value the tile renders must be the real curated-lens count, and every
  // curated lens must be reachable from the pills (guidesLenses tests above
  // already assert none is empty), so the number is never aspirational.
  const curated = GUIDE_LENSES.filter((lens) => lens.id !== 'all');
  assert.equal(curated.length, 3, 'curated lens count changed; confirm the hero tile still reads true');
  assert.ok(
    curated.every((lens) => lens.slugs.length > 0),
    'a curated lens with no guides would inflate the hero Themes count',
  );
});
