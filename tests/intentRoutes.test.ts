import test from 'node:test';
import assert from 'node:assert/strict';
import { INTENT_ROUTES, NAV_ITEMS } from '../constants';

// Guard the homepage intent-router. Each non-external card must point to a real in-hub
// nav route; the SMB card is the sole outbound (OIA) link. This turns a dead intent
// card into a CI failure instead of a silent 404, mirroring the fail-loud route/slug
// contracts elsewhere in the hub (routeCoverage, worksHub, thoughtLanes).

test('every internal INTENT_ROUTES card links to a real in-hub nav route (no dead card)', () => {
  const known = new Set(NAV_ITEMS.map((n) => n.path));
  const bad: string[] = [];
  for (const r of INTENT_ROUTES) {
    if (r.external) continue;
    if (!known.has(r.href)) bad.push(`${r.audience} -> ${r.href}`);
  }
  assert.deepEqual(
    bad,
    [],
    `INTENT_ROUTES internal cards pointing to routes absent from NAV_ITEMS ` +
      `(a crawler-followed / clicked card would 404): ${bad.join(', ')}`,
  );
});

test('exactly one INTENT_ROUTES card is external (the SMB -> OIA card), and it is an absolute URL', () => {
  const ext = INTENT_ROUTES.filter((r) => r.external);
  assert.equal(ext.length, 1, 'exactly one outbound card (SMB to OIA); the other three route in-hub');
  assert.match(ext[0].href, /^https?:\/\//, 'the external card href must be an absolute URL');
});
