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

test('every guide carries a well-formed reviewed date on or after its publish date', () => {
  assert.ok(GUIDES.length > 0, 'guards against a vacuous pass: the guides corpus is empty');
  const problems: string[] = [];
  for (const g of GUIDES) {
    const reviewed = (g as { reviewed?: string }).reviewed;
    if (!reviewed) {
      problems.push(`${g.slug}: no "reviewed:" frontmatter (set it to the publish date for a new guide)`);
      continue;
    }
    if (!isRealCalendarDay(reviewed)) {
      problems.push(`${g.slug}: reviewed "${reviewed}" is not a real YYYY-MM-DD calendar day`);
      continue;
    }
    // Same-length YYYY-MM-DD strings compare correctly as text.
    if (reviewed < g.date) {
      problems.push(`${g.slug}: reviewed ${reviewed} predates publish date ${g.date}`);
    }
  }
  assert.deepEqual(problems, [], `guide review stamps are missing or invalid:\n  ${problems.join('\n  ')}`);
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
// The rule is deliberately blunt: any paragraph (or title / description / lead) that
// contains "exactly once" or "exactly-once" must, in that same paragraph, also say
// "at most once" or "at least once" (hyphenated or not). It does not try to tell a
// delivery claim from an unrelated counting use of the phrase; that is judgment a
// pattern match does not have. If a non-delivery sentence trips it, reword the sentence.

const EXACTLY_ONCE = /\bexactly[\s-]+once\b/i;
const QUALIFIER = /\bat[\s-]+(most|least)[\s-]+once\b/i;

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

test('no guide says "exactly once" unless the same paragraph names the guarantee it actually provides', async () => {
  const guides = await compileGuides();
  assert.ok(guides.length > 0, 'guards against a vacuous pass: the guides corpus is empty');
  const problems = guides.flatMap((g) =>
    unqualifiedExactlyOnce(g.slug, [g.title, g.description, g.lead, ...g.body.split(/\n\s*\n/)]),
  );
  assert.deepEqual(
    problems,
    [],
    `unqualified "exactly once" claim(s); say "at most once" or "at least once" in the same paragraph:\n  ${problems.join('\n  ')}`,
  );
});

test('the exactly-once checker flags a bare claim and passes a qualified one', () => {
  // Without this, a broken checker and a clean corpus look identical: both report
  // nothing. Drive the detector with fixtures before trusting its silence.
  assert.equal(unqualifiedExactlyOnce('fixture', ['Send exactly once under a lease.']).length, 1);
  assert.equal(unqualifiedExactlyOnce('fixture', ['An exactly-once\npipeline.']).length, 1);
  assert.deepEqual(
    unqualifiedExactlyOnce('fixture', [
      'Not exactly once: at most once, with ambiguous sends held for a human.',
      'Exactly-once is at-least-once plus an idempotent receiver.',
      'Send at most once under a lease.',
    ]),
    [],
  );
});
