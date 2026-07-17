import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lintDensity, countCitations, countStats } from '../densityRail';
import { THOUGHTS } from '../constants.generated';
import { GUIDES } from '../constants.guides.generated';

// --- unit: the density signal discriminates (non-vacuous by construction) ---

test('a body with an external citation is dense', () => {
  const r = lintDensity('Per [the NIST AI RMF](https://www.nist.gov/itl/ai-rmf), governance is continuous.');
  assert.equal(r.ok, true);
  assert.equal(r.citations, 1);
});

test('a body with a percentage statistic is dense', () => {
  const r = lintDensity('Detectors misfired on 61.3% of non-native essays.');
  assert.equal(r.ok, true);
  assert.equal(r.stats, 1);
});

test('a body with neither a citation nor a statistic is NOT dense', () => {
  assert.equal(lintDensity('A plain doctrine paragraph with no source and no measured number.').ok, false);
});

test('a self-link to danmercede is NOT counted as an external citation', () => {
  assert.equal(countCitations('See [my earlier post](https://www.danmercede.com/thoughts/x).'), 0);
});

test('a code-example host:port is NOT counted as a citation', () => {
  assert.equal(countCitations('Route through [the proxy](http://traefik:80/health).'), 0);
});

test('a bare year or count is NOT counted as a statistic', () => {
  assert.equal(countStats('In 2026 we shipped 12 things across 4 nodes.'), 0);
});

// --- corpus: no-regression ratchet + advisory backfill worklist ---

// Current compliant count across the published corpus (2 thoughts + 3 guides,
// 2026-07-16). This is a RATCHET: raise it as backfill enriches posts; never
// lower it except when a post is deliberately deleted. It does NOT require every
// post to be dense (34/39 are not, today) - that would pressure fabrication.
const DENSITY_FLOOR = 5;

test('published corpus does not regress below the density floor', () => {
  const items = [
    ...THOUGHTS.map((t) => ({ slug: t.slug, body: t.body || '' })),
    ...GUIDES.map((g) => ({ slug: g.slug, body: `${g.lead || ''}\n${g.body || ''}` })),
  ];
  const compliant = items.filter((i) => lintDensity(i.body).ok);
  const poor = items.filter((i) => !lintDensity(i.body).ok).map((i) => i.slug);

  // Advisory backfill worklist (the density-poor posts T1-5 targets). Printed,
  // not asserted: enrichment is real-source authoring done upstream in the
  // substrate, never forced here.
  console.log(`[density] ${compliant.length}/${items.length} posts carry a citation or statistic.`);
  console.log(`[density] backfill candidates (${poor.length}): ${poor.join(', ')}`);

  assert.ok(
    compliant.length >= DENSITY_FLOOR,
    `density regressed: ${compliant.length} compliant < floor ${DENSITY_FLOOR}. A citation/statistic was removed; restore it, or lower the floor only if a post was deliberately deleted.`,
  );
});
