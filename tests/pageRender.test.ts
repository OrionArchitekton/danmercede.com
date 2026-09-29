import test from 'node:test';
import assert from 'node:assert/strict';

import { injectPageRender, RENDERED_ROUTES } from '../scripts/injectRouteMeta';
import { lintExtractability } from '../extractability';
import { BODY_BLOCK_START, BODY_BLOCK_END } from '../seoMeta';

/**
 * Visible initial HTML spec, slice S1. A route in the rendered-route set ships
 * the real page render inside #root, stamped with its path, and drops the
 * hidden crawl block so the page text appears once. Every other route keeps
 * today's empty #root and crawl block.
 */

const template = [
  '<body>',
  `  ${BODY_BLOCK_START}`,
  '  <div id="prerender-content" aria-hidden="true"><h1>Crawl copy</h1></div>',
  `  ${BODY_BLOCK_END}`,
  '  <div id="root"></div>',
  '</body>',
].join('\n');

test('the rendered-route set is /about only in this slice', () => {
  assert.deepEqual([...RENDERED_ROUTES], ['/about']);
});

test('a rendered route carries its page render in a stamped #root and drops the crawl block', () => {
  const out = injectPageRender(template, '/about', '<h1>About</h1><p>Costs $&amp; $1 nothing.</p>');
  assert.ok(
    out.includes('<div id="root" data-rendered-path="/about"><h1>About</h1><p>Costs $&amp; $1 nothing.</p></div>'),
    'markup is inserted verbatim, with no replacement-pattern expansion',
  );
  assert.doesNotMatch(out, /prerender-content|Crawl copy/);
  assert.ok(out.includes(BODY_BLOCK_START) && out.includes(BODY_BLOCK_END), 'the block anchors stay in place');
});

test('the route stamp is attribute-escaped', () => {
  const out = injectPageRender(template, '/a"b<c', '<p>x</p>');
  assert.ok(out.includes('<div id="root" data-rendered-path="/a&quot;b&lt;c"><p>x</p></div>'));
});

test('injectPageRender refuses a template without exactly one empty #root', () => {
  assert.throws(() => injectPageRender(template.replace('<div id="root"></div>', ''), '/about', '<h1>x</h1>'), /#root/);
  assert.throws(() => injectPageRender(`${template}\n<div id="root"></div>`, '/about', '<h1>x</h1>'), /#root/);
});

test('the linter reads a stamped #root as crawlable, and an unstamped one as script-only', () => {
  const rendered =
    '<!doctype html><html><body><div id="root" data-rendered-path="/about"><h1>About</h1><p>A short bio.</p><h2>Now</h2></div></body></html>';
  const ok = lintExtractability(rendered);
  assert.equal(ok.findings.find((f) => f.check === 'js-off-readable')!.ok, true);
  assert.equal(ok.findings.find((f) => f.check === 'heading-hierarchy')!.ok, true);
  const scriptOnly = lintExtractability(rendered.replace(' data-rendered-path="/about"', ''));
  assert.equal(scriptOnly.findings.find((f) => f.check === 'js-off-readable')!.ok, false, 'positive control');
  const emptyStamp = lintExtractability(rendered.replace('data-rendered-path="/about"', 'data-rendered-path=""'));
  assert.equal(emptyStamp.findings.find((f) => f.check === 'js-off-readable')!.ok, false, 'an empty stamp is not a rendered route');
});
