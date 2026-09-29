import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES } from '../constants.guides.generated';
import { compileGuides } from '../scripts/compileGuides.mjs';

// ---------------------------------------------------------------------------
// Review stamp: every guide says when it was last reread in full
// ---------------------------------------------------------------------------
// `reviewed` is an optional frontmatter field at the compiler and type level, so an
// old checkout or a draft still compiles. This test is what makes it mandatory for
// every published guide: a reader sees "Reviewed <date>" and should be able to trust
// that someone reread the whole guide for accuracy on that day. It is a reread stamp
// and nothing more. It does not claim the guide's code was executed against any
// provider; do not turn it into a "last tested" field.
//
// A new guide sets `reviewed` to its publish date. A later full reread moves it
// forward. It can never predate the publish date.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDay(s: string): boolean {
  if (!ISO_DAY.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Reject rollover dates such as 2026-02-30, which Date silently normalizes.
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// A stamp more than two days ahead of today claims a reread that has not happened
// (same tolerance tests/headHygiene.test.ts gives sitemap lastmod values).
const MAX_FUTURE_DAYS = 2;

function reviewStampProblems(slug: string, reviewed: string | undefined, published: string, today: Date): string[] {
  if (!reviewed) return [`${slug}: no "reviewed:" frontmatter (set it to the publish date for a new guide)`];
  if (!isRealCalendarDay(reviewed)) return [`${slug}: reviewed "${reviewed}" is not a real YYYY-MM-DD calendar day`];
  const problems: string[] = [];
  // Same-length YYYY-MM-DD strings compare correctly as text.
  if (reviewed < published) problems.push(`${slug}: reviewed ${reviewed} predates publish date ${published}`);
  const latest = new Date(today.getTime() + MAX_FUTURE_DAYS * 86_400_000).toISOString().slice(0, 10);
  if (reviewed > latest) problems.push(`${slug}: reviewed ${reviewed} is in the future (latest allowed ${latest})`);
  return problems;
}

test('every guide carries a well-formed reviewed date between its publish date and today', () => {
  assert.ok(GUIDES.length > 0, 'guards against a vacuous pass: the guides corpus is empty');
  const today = new Date();
  const problems = GUIDES.flatMap((g) =>
    reviewStampProblems(g.slug, (g as { reviewed?: string }).reviewed, g.date, today),
  );
  assert.deepEqual(problems, [], `guide review stamps are missing or invalid:\n  ${problems.join('\n  ')}`);
});

test('the review-stamp checker flags each bad case and accepts a new guide', () => {
  const today = new Date('2026-09-29T12:00:00Z');
  assert.equal(reviewStampProblems('f', undefined, '2026-09-01', today).length, 1, 'missing');
  assert.equal(reviewStampProblems('f', '2026-02-30', '2026-01-01', today).length, 1, 'rollover date');
  assert.equal(reviewStampProblems('f', '2026-08-31', '2026-09-01', today).length, 1, 'predates publish');
  assert.equal(reviewStampProblems('f', '2099-01-01', '2026-09-01', today).length, 1, 'far future');
  assert.deepEqual(reviewStampProblems('f', '2026-09-01', '2026-09-01', today), [], 'a new guide stamps its publish date');
  assert.deepEqual(reviewStampProblems('f', '2026-10-01', '2026-09-01', today), [], 'within the two-day tolerance');
});

// ---------------------------------------------------------------------------
// Delivery-claim precision: "exactly once" never stands alone
// ---------------------------------------------------------------------------
// "Exactly once" is the strongest delivery claim there is, and a real system only
// approximates it by composing a weaker guarantee with something else (deduplication,
// idempotent receivers, or a human who resolves the ambiguous case). A design that
// withholds a retry after an ambiguous outcome is AT MOST once; one that retries until
// acknowledged is AT LEAST once. The guides must say which one they actually provide.
//
// The rule is deliberately blunt: any clause (a sentence, or a part of one split at a
// semicolon, taken line by line so list items stand alone) that contains "exactly once"
// or "exactly-once" must, in that same clause, also say "at most once" or "at least
// once" (hyphenated or not). A sibling list item or another sentence cannot qualify it. It does not try to tell a
// delivery claim from an unrelated counting use of the phrase; that is judgment a
// pattern match does not have. If a non-delivery sentence trips it, reword the sentence.

const EXACTLY_ONCE = /\bexactly[\s-]+once\b/i;
const QUALIFIER = /\bat[\s-]+(most|least)[\s-]+once\b/i;

// Lines first (list items, headings), then sentences, then semicolon clauses.
function splitUnits(text: string): string[] {
  return text
    .split(/\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .flatMap((sentence) => sentence.split(/;\s*/))
    .filter((u) => u.trim());
}

function unqualifiedExactlyOnce(label: string, units: string[]): string[] {
  const problems: string[] = [];
  for (const unit of units) {
    const text = unit.replace(/\s+/g, ' ').trim();
    if (EXACTLY_ONCE.test(text) && !QUALIFIER.test(text)) {
      problems.push(`${label}: "${text.slice(0, 140)}"`);
    }
  }
  return problems;
}

test('no guide says "exactly once" unless the same clause names the guarantee it actually provides', async () => {
  const guides = await compileGuides();
  assert.ok(guides.length > 0, 'guards against a vacuous pass: the guides corpus is empty');
  const problems = guides.flatMap((g) =>
    unqualifiedExactlyOnce(g.slug, [g.title, g.description, g.lead, g.body].flatMap(splitUnits)),
  );
  assert.deepEqual(
    problems,
    [],
    `unqualified "exactly once" claim(s); say "at most once" or "at least once" in the same clause:\n  ${problems.join('\n  ')}`,
  );
});

test('the exactly-once checker flags a bare claim and passes a qualified one', () => {
  // Without this, a broken checker and a clean corpus look identical: both report
  // nothing. Drive the detector with fixtures before trusting its silence.
  assert.equal(unqualifiedExactlyOnce('fixture', ['Send exactly once under a lease.']).length, 1);
  assert.equal(unqualifiedExactlyOnce('fixture', splitUnits('An exactly-once pipeline.')).length, 1);
  // A sibling list item or a neighbouring clause must not launder the claim.
  assert.equal(unqualifiedExactlyOnce('fixture', splitUnits('1. Send exactly once.\n2. Retries are at least once.')).length, 1);
  assert.equal(unqualifiedExactlyOnce('fixture', splitUnits('The audit runs at least once daily; customer delivery is exactly once.')).length, 1);
  assert.deepEqual(
    unqualifiedExactlyOnce('fixture', [
      'Not exactly once: at most once, with ambiguous sends held for a human.',
      'Exactly-once is at-least-once plus an idempotent receiver.',
      'Send at most once under a lease.',
    ]),
    [],
  );
});
