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

// ---------------------------------------------------------------------------
// Index control parity (/thoughts and /guides).
//
// Both index pages carry the same two affordances: a search box and a row of
// filter pills. They were implemented independently and drifted, /guides at h-14
// with square corners and a FileText icon, /thoughts at h-12 with rounded corners
// and a Search icon, plus two different pill treatments. Same affordance, two
// visual languages. These assertions pin them to ONE spec.
//
// Source-level because the repo has no React harness (tests/routeCoverage.test.ts).
// If a third index adopts these controls, prefer extracting a shared component
// over widening these regexes.
// ---------------------------------------------------------------------------

const appTsx = () =>
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'App.tsx'), 'utf8');

test('both index search boxes use one identical shell spec', () => {
  const shells = [...appTsx().matchAll(/<label className="(flex h-\d+[^"]*focus-within:[^"]*)"/g)].map((m) => m[1]);
  assert.equal(shells.length, 2, `expected exactly 2 index search shells, found ${shells.length}`);
  assert.equal(
    shells[0],
    shells[1],
    `the /thoughts and /guides search boxes must share one spec.\n  a: ${shells[0]}\n  b: ${shells[1]}`,
  );
  // Pin the canonical values so a drift that changes BOTH still fails loudly.
  assert.match(shells[0], /\bh-14\b/, 'canonical search height is h-14');
  assert.match(shells[0], /border-white\/15/, 'canonical search border is white/15');
  // Tokenise rather than regex the whole string. Any /\brounded.../ pattern also
  // matches the "rounded" PREFIX of `rounded-none` (the "-" is a non-word char, so
  // there is a boundary right after "d"), which would red a build that squared the
  // corners the idiomatic Tailwind way. Checking whole class tokens has no such trap.
  const radiusUtils = shells[0]
    .split(/\s+/)
    .filter((cls) => /^rounded(-.+)?$/.test(cls) && cls !== 'rounded-none');
  assert.deepEqual(
    radiusUtils,
    [],
    `canonical search box has square corners, found radius utility/utilities: ${radiusUtils.join(', ')}`,
  );
});

test('both index search boxes use the same icon', () => {
  const src = appTsx();
  const icons = [...src.matchAll(/<(\w+) size=\{17\} className="text-copper-400" aria-hidden="true" \/>/g)].map((m) => m[1]);
  assert.equal(icons.length, 2, `expected 2 search icons, found ${icons.length}`);
  assert.equal(icons[0], icons[1], 'both index search boxes must use the same icon');
  assert.equal(icons[0], 'Search', 'the search affordance uses the Search glyph, not a document glyph');
});

test('both index filter pill rows use one identical spec', () => {
  const pills = [...appTsx().matchAll(/'(rounded-full border px-4 py-2 font-mono text-\[10px\][^']*)'/g)].map((m) => m[1]);
  assert.equal(pills.length, 2, `expected exactly 2 index pill rows, found ${pills.length}`);
  assert.equal(pills[0], pills[1], `the /thoughts and /guides filter pills must share one spec.\n  a: ${pills[0]}\n  b: ${pills[1]}`);

  const src = appTsx();
  const active = [...src.matchAll(/'(border-copper-500 bg-copper-500 text-slate-950)'/g)];
  assert.equal(active.length, 2, 'both pill rows must use the same solid-copper active state');

  // The INACTIVE branch needs the same treatment. Pinning only the base fragment and
  // the active literal leaves the default state of every unselected pill free to
  // diverge per page with CI green (verified: mutating one page's inactive string
  // passed all assertions before this was added).
  const inactive = [...src.matchAll(/'(border-white\/15 text-slate-400[^']*)'/g)].map((m) => m[1]);
  assert.equal(inactive.length, 2, `expected 2 inactive pill states, found ${inactive.length}`);
  assert.equal(
    inactive[0],
    inactive[1],
    `both pill rows must share one inactive state.\n  a: ${inactive[0]}\n  b: ${inactive[1]}`,
  );
  assert.equal(
    (src.match(/aria-pressed=\{/g) || []).length,
    2,
    'both pill rows must expose selection state via aria-pressed',
  );
  assert.equal(
    (src.match(/role="group" aria-label="Filter /g) || []).length,
    2,
    'both pill rows must be a labelled group, not a bare div of buttons',
  );
});
