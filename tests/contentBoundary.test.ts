import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_META, renderBodyBlock } from '../seoMeta';

// Round-2 R10 — content-boundary guard (identity-only surface carries NO
// promotional / CTA copy).
//
// The hub is NOT identity-only globally — it has marketing routes (/connect,
// /proof). But it HAS an identity-only surface: `/about` (ROUTE_META['/about'],
// schemaType 'ProfilePage', h1 "The Throughline"), a biographical page whose
// whole job is to state who Dan is, not to sell. This guard asserts the BAKED
// BODY of that identity route does not leak the promotional / call-to-action
// copy that lives on the marketing routes — the danielmercede-info CTA-leak
// class, where a refactor smeared "book a" / "readiness scan" CTA copy onto an
// identity-only spoke.
//
// Deterministic and browserless: renderBodyBlock() is a pure function over
// ROUTE_META, so this runs with NO build and NO network (mirrors the
// tests/bodyBake.test.ts idiom). The needle list and detector are the same shape
// as the danielmercede-info vite.config.ts forbidden-needle guard — the only
// repo carrying this guard today — extended with the hub's own promotional
// /connect copy as the load-bearing distinguishing needles.

// Promotional / CTA needles that must NEVER appear in an identity-only body.
// Lowercased; matched against the lowercased baked body. The first set is the
// generic CTA vocabulary ported from the danielmercede-info guard
// (['book a', '/book', 'readiness scan'] + common conversion verbs); the last
// two — 'initiate protocol' and 'engage with dan' — are pulled VERBATIM from the
// hub's promotional /connect route (ROUTE_META['/connect']: h1 "Connect", lead
// "Initiate protocol.", body "Engage with Dan Mercede on governed AI
// architecture…"). They are the load-bearing signal that genuinely separates
// promotional copy from identity copy on THIS site, which is why the negative
// control below renders /connect and proves the detector flags exactly them.
//
// All 14 needles were rendered against /about and / before being committed; NONE
// legitimately appears in either identity body (probe: zero hits), so none were
// dropped. Governance product vocabulary that legitimately belongs to Dan's
// identity (e.g. "governed AI operating systems", "runtime", "Cosmocrat") is
// deliberately NOT forbidden — it is identity context, not a CTA.
const FORBIDDEN_NEEDLES = [
  'book a',
  '/book',
  'readiness scan',
  'buy now',
  'sign up',
  'get started',
  'schedule a call',
  'contact us',
  'hire me',
  'book a call',
  'request a demo',
  'subscribe',
  'initiate protocol',
  'engage with dan',
];

// The detector: return every forbidden needle present in a lowercased body.
// Pure substring match (same posture as the reference guard) — robust to markup
// because the needles are plain copy that would only appear in rendered text.
function leakedNeedles(bodyLower: string): string[] {
  return FORBIDDEN_NEEDLES.filter((needle) => bodyLower.includes(needle));
}

// Identity-only routes whose baked body must stay free of promotional/CTA copy.
// `/about` is the canonical identity-only surface (always guarded). `/` is the
// homepage ProfilePage — its copy ("Dan Mercede", governance positioning) is
// identity/bio and (verified) contains none of the needles, so it is guarded
// too: a conservative addition, since a regression that smeared CTA copy onto
// the homepage body is exactly the class this guard exists to catch.
const IDENTITY_ROUTES = ['/about', '/'];

for (const route of IDENTITY_ROUTES) {
  test(`identity-only route ${route} bakes NO promotional/CTA copy`, () => {
    const meta = ROUTE_META[route];
    assert.ok(meta, `ROUTE_META['${route}'] must exist`);
    const bodyLower = renderBodyBlock(route, meta).toLowerCase();
    const leaked = leakedNeedles(bodyLower);
    assert.deepEqual(
      leaked,
      [],
      `identity-only route ${route} leaked promotional/CTA copy: ${leaked.join(', ')} — ` +
        `the body of an identity surface must not carry call-to-action / conversion copy ` +
        `(the danielmercede-info CTA-leak class).`,
    );
  });
}

// --- Negative control: prove the detector actually fires. -------------------
// `/connect` is the hub's promotional route (h1 "Connect", lead "Initiate
// protocol.", body "Engage with Dan Mercede…"). If the detector is sound AND the
// needles genuinely distinguish promotional from identity copy, rendering
// /connect MUST flag 'initiate protocol' and 'engage with dan'. This is a
// strong, repo-native negative control: it runs against the real promotional
// route, not a fixture, so it simultaneously proves (a) the detector works and
// (b) the two load-bearing needles are real promotional copy on THIS site. If a
// future edit de-promotes /connect, this test fails loudly — forcing the needle
// list to be re-grounded rather than silently degrading into a no-op.
// Models the danielmercede-info identity-guardrail negative-control pattern.
test('negative control: detector FLAGS the promotional /connect route', () => {
  const connectBody = renderBodyBlock('/connect', ROUTE_META['/connect']).toLowerCase();
  const leaked = leakedNeedles(connectBody);
  assert.ok(
    leaked.includes('initiate protocol'),
    `detector failed to flag 'initiate protocol' on the promotional /connect route — ` +
      `either the detector is inert or /connect no longer carries that promotional copy. ` +
      `Got: ${JSON.stringify(leaked)}`,
  );
  assert.ok(
    leaked.includes('engage with dan'),
    `detector failed to flag 'engage with dan' on the promotional /connect route — ` +
      `either the detector is inert or /connect no longer carries that promotional copy. ` +
      `Got: ${JSON.stringify(leaked)}`,
  );
});

// Synthetic-string control: a body fabricated to contain a CTA needle MUST be
// flagged, and a body of pure identity copy MUST NOT. This pins the detector's
// behavior independent of any route's current copy, so the guard cannot rot into
// an always-pass no-op even if every route's wording changes.
test('synthetic control: detector flags a fabricated CTA body and clears an identity body', () => {
  const fabricatedCta = '<h1>about</h1><p>book a readiness scan to get started today.</p>'.toLowerCase();
  const caught = leakedNeedles(fabricatedCta);
  for (const expected of ['book a', 'readiness scan', 'get started']) {
    assert.ok(
      caught.includes(expected),
      `detector failed on a synthetic CTA body — expected to flag '${expected}'; got ${JSON.stringify(caught)}`,
    );
  }

  const pureIdentity = '<h1>the throughline</h1><p>i build governed ai operating systems that endure.</p>'.toLowerCase();
  assert.deepEqual(
    leakedNeedles(pureIdentity),
    [],
    'detector wrongly flagged a pure identity body that contains no CTA needle',
  );
});
