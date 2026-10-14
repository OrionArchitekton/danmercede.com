import test from 'node:test';
import assert from 'node:assert/strict';

import { collectRoutes, injectPageRender, RENDERED_ROUTES } from '../scripts/injectRouteMeta';
import { lintExtractability } from '../extractability';

/**
 * Visible initial HTML spec. A route in the rendered-route set ships the real
 * page render inside #root, stamped with its path.
 */

const template = [
  '<body>',
  '  <div id="root"></div>',
  '</body>',
].join('\n');

// Every published route ships its page render.
test('the rendered-route set covers every published route', () => {
  const published = ['/', ...collectRoutes().map((r) => r.path)].sort();
  assert.deepEqual([...RENDERED_ROUTES].sort(), published);
  assert.ok(published.length > 80);
});

test('a rendered route carries its page render in a stamped #root', () => {
  const out = injectPageRender(template, '/about', '<h1>About</h1><p>Costs $&amp; $1 nothing.</p>');
  assert.ok(
    out.includes('<div id="root" data-rendered-path="/about"><h1>About</h1><p>Costs $&amp; $1 nothing.</p></div>'),
    'markup is inserted verbatim, with no replacement-pattern expansion',
  );
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
