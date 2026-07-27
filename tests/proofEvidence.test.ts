import test from 'node:test';
import assert from 'node:assert/strict';

import { PROOF_EVIDENCE } from '../constants';

/**
 * Integrity guard for the /proof evidence surface.
 *
 * The page exists to answer a specific criticism: that the public record carried
 * architecture description rather than checkable evidence. That only holds if every
 * published line ships the check that confirms it, and if the limits stay visible.
 *
 * These tests exist so the surface cannot decay back into unverifiable marketing,
 * which is exactly what the removed case-study metrics were.
 */

test('every published evidence claim ships a check a reader can run', () => {
  assert.ok(PROOF_EVIDENCE.length > 0, 'expected at least one evidence tier');

  let claimCount = 0;
  for (const tier of PROOF_EVIDENCE) {
    assert.ok(tier.claims.length > 0, `tier "${tier.id}" has no claims`);
    for (const c of tier.claims) {
      claimCount++;
      assert.ok(
        c.claim.trim().length > 20,
        `tier "${tier.id}": a claim is too short to be meaningful: "${c.claim}"`
      );
      assert.ok(
        c.verify.trim().length > 0,
        `tier "${tier.id}": claim has no verify string: "${c.claim.slice(0, 60)}"`
      );
      assert.ok(
        ['command', 'url'].includes(c.verifyKind),
        `tier "${tier.id}": bad verifyKind "${c.verifyKind}"`
      );
    }
  }

  // Positive evidence that the scan covered a real corpus, not an empty one.
  assert.ok(claimCount >= 10, `expected a substantive evidence set, found ${claimCount} claims`);
});

test('a claim marked as url-verifiable actually carries a resolvable href', () => {
  for (const tier of PROOF_EVIDENCE) {
    for (const c of tier.claims) {
      if (c.verifyKind !== 'url') continue;
      assert.ok(
        c.href && /^https:\/\/\S+$/.test(c.href),
        `tier "${tier.id}": verifyKind "url" needs an https href, got ${String(c.href)}`
      );
    }
  }
});

test('every href is https, so no check points at an insecure or relative target', () => {
  for (const tier of PROOF_EVIDENCE) {
    for (const c of tier.claims) {
      if (!c.href) continue;
      assert.match(
        c.href,
        /^https:\/\//,
        `tier "${tier.id}": href must be absolute https, got ${c.href}`
      );
    }
  }
});

test('the limits tier stays present and non-empty', () => {
  // A proof page that lists only wins is marketing. The whole point of this
  // surface is that the limits are published alongside the results, so this
  // guard makes removing them a deliberate, test-breaking act rather than a quiet edit.
  const limits = PROOF_EVIDENCE.find((t) => t.id === 'not-claimed');
  assert.ok(limits, 'the "not-claimed" tier must exist');
  assert.ok(
    limits!.claims.length >= 3,
    `the limits tier must carry real limits, found ${limits!.claims.length}`
  );

  // At least one limit must concede something about the strength of the evidence
  // itself, not merely list an unrelated fact.
  const concedes = limits!.claims.some((c) =>
    /not third-party|no ci|won no prize|no award|no paying-customer/i.test(c.claim)
  );
  assert.ok(concedes, 'the limits tier must concede an actual weakness, not list neutral facts');
});

test('tier ids are unique and stable, since they are page anchors', () => {
  const ids = PROOF_EVIDENCE.map((t) => t.id);
  assert.deepEqual(
    ids,
    [...new Set(ids)],
    `duplicate tier ids would collide as DOM anchors: ${ids.join(', ')}`
  );
  for (const id of ids) {
    assert.match(id, /^[a-z0-9-]+$/, `tier id "${id}" is not anchor-safe`);
  }
});
