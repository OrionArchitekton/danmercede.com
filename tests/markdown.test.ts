import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from '../components/Markdown';

const render = (src: string) => renderToStaticMarkup(React.createElement(Markdown, { source: src }));

test('Markdown renders core blocks (heading, code, table, list, figure)', () => {
  const html = render(
    [
      '## Hello',
      '',
      'A paragraph with `code` and **bold**.',
      '',
      '```bash',
      'echo hi',
      '```',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '- item one',
      '',
      '![alt text](/assets/guides/self-hosting/two-plane-architecture.webp "cap")',
    ].join('\n'),
  );
  assert.match(html, /<h2[^>]*>Hello<\/h2>/);
  assert.match(html, /echo hi/);
  assert.match(html, /<table/);
  assert.match(html, /item one/);
  assert.match(html, /<figure/);
  assert.match(html, /srcset=/i); // responsive figure
  assert.match(html, /768w/); // 768w variant in the srcset
});

test('Markdown handles nested blocks, blockquotes, ordered lists, hr, and inline syntax', () => {
  const html = render(
    [
      '> A quoted line with **bold**.',
      '',
      '1. First item with a nested code block:',
      '',
      '   ```yaml',
      '   key: value',
      '   ```',
      '2. Second item',
      '',
      'A [link](https://example.com) plus *italic* and `code`.',
      '',
      '---',
    ].join('\n'),
  );
  assert.match(html, /<blockquote/);
  assert.match(html, /<ol/);
  assert.match(html, /key: value/); // fenced code nested inside the list item
  assert.match(html, /<a [^>]*href="https:\/\/example\.com"/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<hr/);
});

test('headings get slug ids (anchorable) and bold renders inside paragraphs', () => {
  const html = render('## Two Planes\n\nThe **two-plane** rule.');
  assert.match(html, /<h2[^>]*id="two-planes"/);
  assert.match(html, /<strong[^>]*>two-plane<\/strong>/);
});

// Regression (Codex P2): a stray pipe-prefixed line that is NOT a table must not
// hang the parser — `i` must always advance. renderToStaticMarkup returning at all
// proves there is no infinite loop; we also confirm surrounding prose still renders.
test('a stray pipe line that is not a table does not hang the renderer', () => {
  const html = render('Intro paragraph.\n\n| this looks like a row but has no separator row\n\nClosing paragraph.');
  assert.match(html, /Intro paragraph\./);
  assert.match(html, /Closing paragraph\./);
});
