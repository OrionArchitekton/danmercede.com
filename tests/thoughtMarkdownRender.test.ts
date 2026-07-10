// Full-markdown essay rendering (operator decision 2026-07-10): the hydrated
// page renders bodies with the Markdown component, and the baked body must
// carry the SAME rendered markup instead of escaped literal markdown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderedThoughtBody } from '../scripts/injectRouteMeta.ts';
import { renderBodyBlock, thoughtMeta } from '../seoMeta.ts';
import { THOUGHTS } from '../constants.generated.ts';

const withBody = THOUGHTS.find((t) => t.body && t.body.includes('## '));

test('thought routes render markdown: real h2, no literal ## in baked body', () => {
  assert.ok(withBody, 'corpus must contain an essay with a markdown heading');
  const html = renderedThoughtBody(`/thoughts/${withBody!.slug}`)!;
  assert.ok(html.includes('<h2'), 'headings must render as h2 elements');
  assert.ok(!/<p[^>]*>## /.test(html), 'no literal ## heading text in a paragraph');
});

test('non-thought routes get no override (paragraph bake unchanged)', () => {
  assert.equal(renderedThoughtBody('/works'), undefined);
  assert.equal(renderedThoughtBody('/guides/some-guide'), undefined);
});

test('renderBodyBlock embeds the rendered html verbatim and skips the paragraph fallback', () => {
  const meta = thoughtMeta(withBody!.slug);
  const block = renderBodyBlock(`/thoughts/${withBody!.slug}`, meta, '<h2 id="x">Rendered</h2>');
  assert.ok(block.includes('<h2 id="x">Rendered</h2>'));
  assert.ok(!/<p>## /.test(block));
});
