import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE_ORIGIN,
  ROUTE_META,
  caseStudyPaths,
  worksMicrositePaths,
  thoughtPaths,
  renderThoughtSitemapEntries,
} from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The committed public/sitemap.xml carries ONLY the static (ROUTE_META) + case-study
// routes. The per-thought entries are GENERATED at build (injectRouteMeta writes them
// into build/sitemap.xml from the THOUGHTS corpus) so a weekly/manual substrate-sync —
// which only diffs+commits constants.generated.ts — does not need to also hand-edit the
// sitemap (it would otherwise drift and break CI on every content refresh). This guard
// keeps the committed file in lockstep with the static route source of truth.
const normalize = (u: string) => u.replace(/\/+$/, '');
const toLoc = (p: string) => normalize(new URL(p, SITE_ORIGIN).toString());

test('committed public/sitemap.xml exactly covers ROUTE_META ∪ case-study paths (no thoughts, no drift)', () => {
  const xml = readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const locList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normalize(m[1].trim()));
  // A Set hides repeats, so a sitemap with a duplicated <loc> would pass the "exactly covers"
  // check; assert uniqueness against the raw list first.
  const dupes = [...new Set(locList.filter((u, i) => locList.indexOf(u) !== i))];
  assert.deepEqual(dupes, [], `Duplicate <loc> entries in public/sitemap.xml: ${dupes.join(', ')}`);
  const locs = new Set(locList);
  const expected = new Set([
    ...Object.keys(ROUTE_META).map(toLoc),
    ...caseStudyPaths().map(toLoc),
    ...worksMicrositePaths().map(toLoc),
  ]);
  const missing = [...expected].filter((u) => !locs.has(u));
  const extra = [...locs].filter((u) => !expected.has(u));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'committed public/sitemap.xml drifted from ROUTE_META ∪ caseStudyPaths (per-thought entries are build-generated, must NOT be committed here).',
  );
});

// R2 structural guard, now self-syncing: the build-time generator must cover EXACTLY the
// published THOUGHTS corpus. Because injectRouteMeta emits this into the served sitemap,
// a substrate-sync that adds/removes a thought stays in lockstep with zero hand-maintenance.
test('renderThoughtSitemapEntries covers exactly the published THOUGHTS corpus (self-syncing)', () => {
  const xml = renderThoughtSitemapEntries();
  const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normalize(m[1].trim())));
  const expected = thoughtPaths().map(toLoc);
  assert.ok(expected.length > 0, 'expected at least one published thought');
  const missing = expected.filter((u) => !locs.has(u));
  const extra = [...locs].filter((u) => !expected.includes(u));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'generated thought sitemap entries drifted from thoughtPaths()',
  );
});
