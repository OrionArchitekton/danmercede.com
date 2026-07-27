import test from 'node:test';
import assert from 'node:assert/strict';

import { PROOF_EVIDENCE } from '../constants';
import { ROUTE_META, renderBodyBlock, evidenceBakeParagraphs } from '../seoMeta';

/**
 * Integrity guard for the /proof evidence surface.
 *
 * The page exists to answer one criticism: that the public record carried
 * architecture description rather than checkable evidence. That only holds if
 *   (a) every claim presented AS checkable actually ships a runnable check,
 *   (b) editorial limitations are never dressed up as verified findings, and
 *   (c) the evidence reaches no-JS answer engines, not only the React render.
 *
 * (a) and (c) were both violated by the first version of this surface: several
 * verify strings were prose or `<repo>` placeholders that no reader could run,
 * and the whole section was invisible to crawlers because it lived only in React.
 */

const allClaims = PROOF_EVIDENCE.flatMap((t) => t.claims.map((c) => ({ tier: t.id, ...c })));
const checks = allClaims.filter((c) => c.kind === 'check');
const limitations = allClaims.filter((c) => c.kind === 'limitation');

// A verify a reader cannot literally run. `<repo>` / `<id>` style templates are
// the specific shape that slipped through the first version of this test.
const PLACEHOLDER = /<[a-z][a-z0-9_-]*>/i;

test('every claim declares a kind, and the corpus is substantive', () => {
  assert.ok(PROOF_EVIDENCE.length > 0, 'expected at least one evidence tier');
  for (const t of PROOF_EVIDENCE) {
    assert.ok(t.claims.length > 0, `tier "${t.id}" has no claims`);
  }
  for (const c of allClaims) {
    assert.ok(
      c.kind === 'check' || c.kind === 'limitation',
      `claim has no valid kind: "${c.claim.slice(0, 60)}"`
    );
    assert.ok(c.claim.trim().length > 20, `claim too short to be meaningful: "${c.claim}"`);
  }
  assert.ok(checks.length >= 8, `expected a substantive checkable set, found ${checks.length}`);
});

test('a claim presented as checkable ships a runnable check and a source', () => {
  for (const c of checks) {
    const label = `${c.tier}: "${c.claim.slice(0, 55)}"`;
    assert.ok(c.verify && c.verify.trim().length > 0, `${label} has no verify string`);
    assert.ok(
      c.verifyKind === 'command' || c.verifyKind === 'url',
      `${label} has bad verifyKind ${String(c.verifyKind)}`
    );
    // The page promises a reader can re-run this. A template is not runnable.
    assert.doesNotMatch(
      c.verify!,
      PLACEHOLDER,
      `${label} verify contains an unresolved placeholder, so a reader cannot run it as written`
    );
    assert.ok(
      c.href && /^https:\/\/\S+$/.test(c.href),
      `${label} needs an https source href covering the asserted facts, got ${String(c.href)}`
    );
  }
});

test('a stated limitation never pretends to carry a check', () => {
  assert.ok(limitations.length > 0, 'the page must publish at least one stated limitation');
  for (const c of limitations) {
    assert.equal(
      c.verify,
      undefined,
      `a limitation must not carry a verify string: "${c.claim.slice(0, 55)}"`
    );
    assert.equal(c.verifyKind, undefined, 'a limitation must not carry a verifyKind');
  }
});

test('every href is absolute https, so no check points at an insecure target', () => {
  for (const c of allClaims) {
    if (!c.href) continue;
    assert.match(c.href, /^https:\/\//, `href must be absolute https, got ${c.href}`);
  }
});

test('the limits tier stays present and keeps conceding an actual weakness', () => {
  // A proof page that lists only wins is marketing. Removing the limits must be a
  // deliberate, test-breaking act rather than a quiet edit.
  const limits = PROOF_EVIDENCE.find((t) => t.id === 'not-claimed');
  assert.ok(limits, 'the "not-claimed" tier must exist');
  assert.ok(
    limits!.claims.length >= 3,
    `the limits tier must carry real limits, found ${limits!.claims.length}`
  );
  const concedes = limits!.claims.some((c) =>
    /not third-party|no ci|won no prize|no award|no paying-customer/i.test(c.claim)
  );
  assert.ok(concedes, 'the limits tier must concede an actual weakness, not list neutral facts');
});

test('tier ids are unique and anchor-safe', () => {
  const ids = PROOF_EVIDENCE.map((t) => t.id);
  assert.deepEqual(ids, [...new Set(ids)], `duplicate tier ids collide as anchors: ${ids}`);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/, `tier id "${id}" is not anchor-safe`);
});

test('PARITY: every published claim reaches the no-JS crawl body for /proof', () => {
  // The whole arc exists because answer engines could not retrieve the evidence.
  // EvidenceSection renders client-side only, so without the bake a crawler sees
  // the old generic Proof copy and none of this. Three separate reviewers caught
  // that; this test is what stops it regressing.
  const baked = renderBodyBlock('/proof', ROUTE_META['/proof']);
  assert.ok(baked.length > 0, 'the /proof route must bake a body block');

  // renderBodyBlock escapes & < > so an ampersand in a claim ("Fork Around & Find
  // Out") will never match verbatim. Decode before comparing rather than dodging
  // the characters, so the test keeps covering claims that contain them.
  const bakedText = baked
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  for (const c of allClaims) {
    // Compare on a distinctive slice: renderBodyBlock escapes entities, so the
    // full sentence will not match verbatim once it contains & or quotes.
    const probe = c.claim.split(/[.,]/)[0].slice(0, 45);
    assert.ok(
      bakedText.includes(probe),
      `claim is invisible to no-JS crawlers: "${probe}"`
    );
  }

  for (const c of checks) {
    assert.ok(
      bakedText.includes(c.href!),
      `source link missing from the crawl body: ${c.href}`
    );
  }
});

test('the bake helper emits a lead line per tier plus one line per claim', () => {
  const paras = evidenceBakeParagraphs();
  const expected = PROOF_EVIDENCE.length + allClaims.length;
  assert.equal(
    paras.length,
    expected,
    `expected ${expected} baked paragraphs (one lead per tier plus one per claim), got ${paras.length}`
  );
  assert.ok(
    paras.every((p) => p.trim().length > 0),
    'no baked paragraph may be empty'
  );
});
