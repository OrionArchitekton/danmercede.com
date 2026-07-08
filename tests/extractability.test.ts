import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lintExtractability,
  estimateTokens,
  MAX_ANSWER_TOKENS,
  MIN_JS_OFF_RATIO,
} from '../extractability';
import { renderBodyBlock } from '../seoMeta';
import { collectRoutes } from '../scripts/injectRouteMeta';

// ---------------------------------------------------------------------------
// A2 — passage-extractability linter (answer-engine / AEO surface).
//
// Scores a page's crawlable passages on THREE deterministic checks anchored to
// the estate's locked answer-first doctrine (~130-170 words; product-launch
// references/seo-geo-aeo.md): per-passage TOKEN BUDGET, JS-DISABLED readable %,
// and HEADING HIERARCHY. It deliberately does NOT reward FAQPage coverage and
// does NOT rank llms.txt Tier-1 (both REFUTED, seo-geo-aeo.md), and does NOT
// gate on query-phrased headings (advisory only, section-opener-structure.md).
// ---------------------------------------------------------------------------

// -- fixture builders (kept as builders so mutation testing is trivial) -------

/** A well-baked, crawlable answer-first page: content lives outside #root. */
function compliantPage(opts?: { lead?: string }): string {
  const lead =
    opts?.lead ??
    'Enterprise AI fails at runtime, not on capability. Governed operating systems fail closed, enforce authority, and emit audit-grade receipts so a decision can be replayed.';
  return `<!doctype html><html><head><title>x</title>
    <script type="application/ld+json">{"@type":"Article"}</script></head>
    <body>
      <div id="prerender-content" aria-hidden="true">
        <h1>Governed AI Operating Systems</h1>
        <p>${lead}</p>
        <h2>Why runtime</h2>
        <p>Because policy that is not enforced at runtime is not governance.</p>
      </div>
      <div id="root"></div>
    </body></html>`;
}

/** N words of filler prose (for the over-budget lead). */
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
}

// -- estimateTokens (documented heuristic) -----------------------------------

test('estimateTokens uses the documented ~4/3 tokens-per-word heuristic', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('one two three'), Math.ceil((3 * 4) / 3)); // 4
  // 170 words is the answer-first ceiling; its estimate is the budget.
  assert.equal(estimateTokens(words(170)), MAX_ANSWER_TOKENS);
});

// -- check 1: token budget (answer-first passage = H1 + lead) ----------------

test('a compliant answer-first lead PASSES the token budget', () => {
  const r = lintExtractability(compliantPage());
  const tb = r.findings.find((f) => f.check === 'token-budget');
  assert.ok(tb, 'a token-budget finding is emitted');
  assert.equal(tb!.ok, true, tb!.detail);
});

test('an over-budget answer-first lead FAILS the token budget', () => {
  const r = lintExtractability(compliantPage({ lead: words(300) }));
  const tb = r.findings.find((f) => f.check === 'token-budget');
  assert.equal(tb!.ok, false, 'a 300-word lead exceeds the ~170-word budget');
  assert.equal(r.ok, false, 'the document is not extractability-clean');
});

// Non-vacuity, always-on: flipping the SAME compliant fixture over budget
// flips the token-budget verdict true -> false (mutation test in-suite).
test('NON-VACUITY: flipping a compliant lead over budget flips the verdict', () => {
  assert.equal(
    lintExtractability(compliantPage()).findings.find((f) => f.check === 'token-budget')!.ok,
    true,
  );
  assert.equal(
    lintExtractability(compliantPage({ lead: words(300) })).findings.find(
      (f) => f.check === 'token-budget',
    )!.ok,
    false,
  );
});

// -- check 2: JS-disabled readable % -----------------------------------------

test('a JS-hidden page (answer only inside #root) FAILS js-off-readable', () => {
  const html = `<!doctype html><html><body>
    <div id="prerender-content"></div>
    <div id="root">
      <h1>Governed AI Operating Systems</h1>
      <p>${'The whole answer lives inside the React mount and is invisible to a no-JS crawler. '.repeat(
        6,
      )}</p>
    </div>
  </body></html>`;
  const r = lintExtractability(html);
  const js = r.findings.find((f) => f.check === 'js-off-readable');
  assert.equal(js!.ok, false, js!.detail);
  assert.equal(r.ok, false);
});

test('a baked page (answer outside #root) PASSES js-off-readable', () => {
  const js = lintExtractability(compliantPage()).findings.find(
    (f) => f.check === 'js-off-readable',
  );
  assert.equal(js!.ok, true, js!.detail);
});

// -- check 3: heading hierarchy ----------------------------------------------

test('a heading-level skip (H1 -> H3) FAILS heading-hierarchy', () => {
  const html = `<!doctype html><html><body><div id="prerender-content">
    <h1>Title</h1><p>Lead answer.</p><h3>Skipped H2</h3><p>Body.</p>
  </div><div id="root"></div></body></html>`;
  const h = lintExtractability(html).findings.find((f) => f.check === 'heading-hierarchy');
  assert.equal(h!.ok, false, h!.detail);
});

test('two H1 nodes FAIL heading-hierarchy (must be exactly one)', () => {
  const html = `<!doctype html><html><body><div id="prerender-content">
    <h1>First</h1><p>Lead.</p><h1>Second</h1><p>Body.</p>
  </div><div id="root"></div></body></html>`;
  const h = lintExtractability(html).findings.find((f) => f.check === 'heading-hierarchy');
  assert.equal(h!.ok, false, h!.detail);
});

test('a clean H1 -> H2 -> H3 hierarchy PASSES', () => {
  const html = `<!doctype html><html><body><div id="prerender-content">
    <h1>Title</h1><p>Lead answer.</p><h2>Section</h2><p>Body.</p><h3>Sub</h3><p>More.</p>
  </div><div id="root"></div></body></html>`;
  const h = lintExtractability(html).findings.find((f) => f.check === 'heading-hierarchy');
  assert.equal(h!.ok, true, h!.detail);
});

// -- NON-guards: the refuted / advisory tactics the linter must NOT enforce ---

test('FAQPage coverage does NOT change the score (FAQPage is refuted, not rewarded)', () => {
  const base = compliantPage();
  const withFaq = base.replace(
    '</body>',
    '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"q?","acceptedAnswer":{"@type":"Answer","text":"a"}}]}</script></body>',
  );
  assert.deepEqual(
    lintExtractability(withFaq).findings.map((f) => [f.check, f.ok]),
    lintExtractability(base).findings.map((f) => [f.check, f.ok]),
    'adding a FAQPage node must not improve (or change) the extractability verdict',
  );
});

test('query-phrased vs statement H2 score identically (query-phrasing stays advisory)', () => {
  const statement = compliantPage();
  const query = statement.replace('<h2>Why runtime</h2>', '<h2>Why does runtime governance matter?</h2>');
  assert.deepEqual(
    lintExtractability(query).findings.map((f) => [f.check, f.ok]),
    lintExtractability(statement).findings.map((f) => [f.check, f.ok]),
    'a question-phrased heading must not change the score (no mechanical query-phrasing gate)',
  );
});

// -- robustness: HTML comments + numeric entities (review hardening) ---------

test('commented-out headings are ignored (HTML comments stripped before analysis)', () => {
  // A commented-out <h1>/<h2> must not be counted by the regex heading pass,
  // or a disabled/legacy heading left in a comment would break the hierarchy.
  const html = `<!doctype html><html><body><div id="prerender-content">
    <!-- <h1>ghost heading</h1> -->
    <h1>Real Title</h1><p>Lead answer.</p>
    <!-- <h2>ghost</h2> -->
  </div><div id="root"></div></body></html>`;
  const r = lintExtractability(html);
  const h = r.findings.find((f) => f.check === 'heading-hierarchy');
  assert.equal(h!.ok, true, `a commented-out <h1> must not count as a second H1: ${h!.detail}`);
  assert.equal(r.ok, true);
});

test('numeric HTML entities are treated as separators (token budget counts real words)', () => {
  // 300 words joined by non-breaking-space entities: without numeric-entity
  // handling they collapse to a single token and slip under the answer budget.
  const lead = Array.from({ length: 300 }, (_, i) => `w${i}`).join('&#160;');
  const html = `<!doctype html><html><body><div id="prerender-content">
    <h1>Title</h1><p>${lead}</p></div><div id="root"></div></body></html>`;
  const tb = lintExtractability(html).findings.find((f) => f.check === 'token-budget');
  assert.equal(tb!.ok, false, 'a 300-word nbsp-joined lead must exceed the budget (entities are separators)');
});

// -- real-content binding: the gate has a LIVE subject, not a fixture no-op ---

test('every PUBLISHED route baked body is extractability-clean (binds the gate to the FULL prerender set, not just static routes)', () => {
  // collectRoutes() is the same enumerator the build prerenders with: static
  // ROUTE_META + generated case-study / thought / guide / diagram detail pages.
  // Binding here (not just ROUTE_META) makes the gate cover the real published
  // corpus — the bulk of the site's answer-engine surface.
  const routes = collectRoutes();
  assert.ok(routes.length > 12, 'collectRoutes must include static + generated detail routes, not just the ~12 static ones');
  for (const { path, meta } of routes) {
    const body = renderBodyBlock(path, meta);
    const html = `<!doctype html><html><body>${body}<div id="root"></div></body></html>`;
    const r = lintExtractability(html);
    assert.equal(r.ok, true, `${path} baked body must be extractability-clean: ${JSON.stringify(r.findings.filter((f) => !f.ok))}`);
  }
});

test('MIN_JS_OFF_RATIO and MAX_ANSWER_TOKENS are the doctrine-anchored thresholds', () => {
  assert.equal(MAX_ANSWER_TOKENS, 227); // ceil(170 words * 4/3)
  assert.equal(MIN_JS_OFF_RATIO, 0.8);
});
