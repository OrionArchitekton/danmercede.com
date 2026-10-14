import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORBIDDEN_NEEDLES } from './contentBoundaryNeedles';

// Content-boundary guard detector (identity-only surface carries NO promotional
// / CTA copy).
//
// The hub is NOT identity-only globally (it has marketing routes such as
// /connect), but it HAS an identity-only surface: `/about`, a biographical page
// whose job is to state who Dan is, not to sell. A refactor that smeared "book a"
// / "readiness scan" CTA copy onto an identity-only spoke is the
// danielmercede-info CTA-leak class this guard exists to catch.
//
// The served /about render and the negative control against the promotional
// /connect render are checked in tests/builtPageRender.test.ts (they need the
// build's render bundle). This file pins the detector itself, with no build and
// no network, so it cannot rot into an always-pass no-op.

// The detector: return every forbidden needle present in a lowercased body.
// Pure substring match (same posture as the reference guard), robust to markup
// because the needles are plain copy that would only appear in rendered text.
function leakedNeedles(bodyLower: string): string[] {
  return FORBIDDEN_NEEDLES.filter((needle) => bodyLower.includes(needle));
}

// Synthetic-string control: a body fabricated to contain a CTA needle MUST be
// flagged, and a body of pure identity copy MUST NOT. This pins the detector's
// behavior independent of any route's current copy.
test('synthetic control: detector flags a fabricated CTA body and clears an identity body', () => {
  const fabricatedCta = '<h1>about</h1><p>book a readiness scan to get started today.</p>'.toLowerCase();
  const caught = leakedNeedles(fabricatedCta);
  for (const expected of ['book a', 'readiness scan', 'get started']) {
    assert.ok(
      caught.includes(expected),
      `detector failed on a synthetic CTA body: expected to flag '${expected}'; got ${JSON.stringify(caught)}`,
    );
  }

  const pureIdentity = '<h1>the throughline</h1><p>i build governed ai operating systems that endure.</p>'.toLowerCase();
  assert.deepEqual(
    leakedNeedles(pureIdentity),
    [],
    'detector wrongly flagged a pure identity body that contains no CTA needle',
  );
});
