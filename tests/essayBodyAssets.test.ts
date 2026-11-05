/**
 * Essay in-body asset rewrite (specs/essay-body-assets-spec.md).
 *
 * Essay bodies carry substrate-relative image refs
 * (`publishing/assets/<slug>/file.svg`) that soft-404 on the served site.
 * rewriteEssayBodyAssets copies each referenced binary into
 * public/assets/thoughts/<slug>/ at compile time and rewrites the ref to the
 * served root-relative src, using copyDiagramAsset's guard chain. A missing or
 * unsafe asset leaves the ref UNREWRITTEN with a 'skip' diagnostic (an essay
 * is prose first; a lost figure must not block the bundle the way a lost
 * diagram entry does).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { Markdown } from '../components/Markdown.tsx';

import { rewriteEssayBodyAssets, type SubstrateDiagnostic } from '../scripts/compileContent.ts';

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'essay-assets-'));
  const substrate = path.join(root, 'substrate');
  const project = path.join(root, 'project');
  const assetDir = path.join(substrate, 'publishing', 'assets', 'test-essay');
  fs.mkdirSync(assetDir, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(assetDir, 'fig.svg'), '<svg/>');
  fs.writeFileSync(path.join(assetDir, 'notes.txt'), 'nope');
  return { substrate, project };
}

test('rewrites a resolvable ref, copies the binary, preserves alt and caption', () => {
  const { substrate, project } = makeFixture();
  const diags: SubstrateDiagnostic[] = [];
  const body = 'Intro.\n\n![Hero diagram](publishing/assets/test-essay/fig.svg "The caption")\n\nOutro.';
  const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diags);
  assert.ok(out.includes('![Hero diagram](/assets/thoughts/test-essay/fig.svg "The caption")'));
  assert.ok(!out.includes('publishing/assets'));
  assert.ok(fs.existsSync(path.join(project, 'public', 'assets', 'thoughts', 'test-essay', 'fig.svg')));
  assert.equal(diags.length, 0);
});

test('missing asset leaves the ref unrewritten with a skip diagnostic', () => {
  const { substrate, project } = makeFixture();
  const diags: SubstrateDiagnostic[] = [];
  const body = '![gone](publishing/assets/test-essay/absent.svg)';
  const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diags);
  assert.equal(out, body);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].severity, 'skip');
});

test('path escape and unsupported extension are refused, never copied', () => {
  const { substrate, project } = makeFixture();
  const diags: SubstrateDiagnostic[] = [];
  const body =
    '![esc](publishing/assets/../../secret.svg)\n\n![txt](publishing/assets/test-essay/notes.txt)';
  const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diags);
  assert.equal(out, body);
  assert.equal(diags.length, 2);
  assert.ok(diags.every((d) => d.severity === 'skip'));
  assert.ok(!fs.existsSync(path.join(project, 'public', 'assets', 'thoughts')));
});

test('external and already-served refs are untouched; rewrite is idempotent', () => {
  const { substrate, project } = makeFixture();
  const body =
    '![ext](https://example.com/x.png)\n\n![served](/assets/diagrams/existing.svg)\n\n![ok](publishing/assets/test-essay/fig.svg)';
  const once = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md');
  const twice = rewriteEssayBodyAssets(once, 'test-essay', substrate, project, 'test-essay.md');
  assert.equal(once, twice);
  assert.ok(once.includes('https://example.com/x.png'));
  assert.ok(once.includes('/assets/diagrams/existing.svg'));
  assert.ok(once.includes('/assets/thoughts/test-essay/fig.svg'));
});

test('no substrate root: body returned verbatim (inbox-only parity)', () => {
  const { project } = makeFixture();
  const body = '![x](publishing/assets/test-essay/fig.svg)';
  assert.equal(rewriteEssayBodyAssets(body, 'test-essay', null, project, 'test-essay.md'), body);
});

test('single-quoted titles are matched and rewritten too (review finding)', () => {
  const { substrate, project } = makeFixture();
  const body = "![alt](publishing/assets/test-essay/fig.svg 'Single quoted')";
  const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md');
  assert.ok(out.includes("(/assets/thoughts/test-essay/fig.svg 'Single quoted')"));
});

import { pruneUnreferencedThoughtAssets } from '../scripts/compileContent.ts';

test('traversal slug is refused in-function, nothing written (cycle-2 finding)', () => {
  const { substrate, project } = makeFixture();
  const diags: SubstrateDiagnostic[] = [];
  const body = '![x](publishing/assets/test-essay/fig.svg)';
  const out = rewriteEssayBodyAssets(body, '../outside', substrate, project, 'evil.md', diags);
  assert.equal(out, body);
  assert.equal(diags.length, 1);
  assert.ok(!fs.existsSync(path.join(project, 'public')), 'no write may occur for an unsafe slug');
});

test('prune removes unreferenced binaries, keeps referenced ones and .gitkeep (cycle-2 finding)', () => {
  const { project } = makeFixture();
  const base = path.join(project, 'public', 'assets', 'thoughts');
  fs.mkdirSync(path.join(base, 'kept-essay'), { recursive: true });
  fs.mkdirSync(path.join(base, 'withdrawn-essay'), { recursive: true });
  fs.writeFileSync(path.join(base, '.gitkeep'), '');
  fs.writeFileSync(path.join(base, 'kept-essay', 'fig.svg'), '<svg/>');
  fs.writeFileSync(path.join(base, 'kept-essay', 'old.svg'), '<svg/>');
  fs.writeFileSync(path.join(base, 'withdrawn-essay', 'gone.svg'), '<svg/>');
  const pruned = pruneUnreferencedThoughtAssets(project, new Set(['/assets/thoughts/kept-essay/fig.svg']));
  assert.deepEqual(pruned.sort(), ['/assets/thoughts/kept-essay/old.svg', '/assets/thoughts/withdrawn-essay/gone.svg']);
  assert.ok(fs.existsSync(path.join(base, 'kept-essay', 'fig.svg')));
  assert.ok(fs.existsSync(path.join(base, '.gitkeep')));
  assert.ok(!fs.existsSync(path.join(base, 'withdrawn-essay')), 'emptied slug dir is removed');
});

test('prune no-ops when the assets dir is absent', () => {
  const { project } = makeFixture();
  assert.deepEqual(pruneUnreferencedThoughtAssets(project, new Set()), []);
});

test('basename collision: first source wins, later ref stays unrewritten (cycle-3 finding)', () => {
  const { substrate, project } = makeFixture();
  const altDir = path.join(substrate, 'publishing', 'assets', 'test-essay', 'alt');
  fs.mkdirSync(altDir, { recursive: true });
  fs.writeFileSync(path.join(altDir, 'fig.svg'), '<svg id="other"/>');
  const diags: SubstrateDiagnostic[] = [];
  const body =
    '![a](publishing/assets/test-essay/fig.svg)\n\n![b](publishing/assets/test-essay/alt/fig.svg)';
  const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diags);
  assert.ok(out.includes('![a](/assets/thoughts/test-essay/fig.svg)'));
  assert.ok(out.includes('![b](publishing/assets/test-essay/alt/fig.svg)'), 'colliding ref must stay unrewritten');
  assert.equal(diags.length, 1);
  assert.match(diags[0].reason, /collision/);
  assert.equal(fs.readFileSync(path.join(project, 'public', 'assets', 'thoughts', 'test-essay', 'fig.svg'), 'utf8'), '<svg/>', 'first copy must not be overwritten');
});

test('filesystem compile preserves resolvable code examples and copies only a real image with backticks', () => {
  const { substrate, project } = makeFixture();
  const code = '`![Inline](publishing/assets/test-essay/fig.svg)`\n\n```markdown\n![Fenced](publishing/assets/test-essay/fig.svg)\n```';
  const real = '![A `literal` alt](publishing/assets/test-essay/fig.svg "A `literal` caption")';
  const body = code + '\n\n' + real, diagnostics: SubstrateDiagnostic[] = [];
  const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diagnostics);
  assert.equal(out, code + '\n\n' + real.replace('publishing/assets/test-essay/', '/assets/thoughts/test-essay/'));
  assert.deepEqual(diagnostics, []);
  assert.equal(fs.readFileSync(path.join(project, 'public', 'assets', 'thoughts', 'test-essay', 'fig.svg'), 'utf8'), '<svg/>');
});

test('filesystem compile performs no copy or skip diagnostic for code-only image examples', () => {
  const { substrate, project } = makeFixture();
  const body = '`![Inline](publishing/assets/test-essay/fig.svg)`\n\n```markdown\n![Missing](publishing/assets/foreign/missing.svg)\n```';
  const diagnostics: SubstrateDiagnostic[] = [];
  assert.equal(rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diagnostics), body);
  assert.deepEqual(diagnostics, []);
  assert.equal(fs.existsSync(path.join(project, 'public', 'assets', 'thoughts')), false);
});

test('filesystem asset copying agrees with actual renderer literal boundaries', () => {
  const one = 'publishing/assets/test-essay/one.svg', two = 'publishing/assets/test-essay/two.svg';
  const examples = [
    `Prose \`\`\`inline opener\n\n![Real](${one})\n\n\`\`\``,
    `Prose \`\`\`inline opener\n\n![Real](${one})\n\n\`\`\` `,
    `![First \`\`\`](${one})\n\n![Second \`\`\`](${two})`,
    `![First](${one} "Opening \`\`\` title")\n\n![Second](${two} "Closing \`\`\` title")`,
    `  \`\`\`markdown\n  ![Literal](${one})`,
    `> \`\`\`markdown\n> ![Literal](publishing/assets/foreign/missing.svg)\n> \`\`\`\n\n![Real](${one})`,
    `> \`\`\`markdown\n> ![Literal](publishing/assets/foreign/missing.svg)\n\n![Real](${one})`,
    `- \`\`\`markdown\n  ![Literal](publishing/assets/foreign/missing.svg)\n  \`\`\`\n\n![Real](${one})`,
    `- \`\`\`markdown\n  ![Literal](publishing/assets/foreign/missing.svg)\n\n![Real](${one})`,
    `Inline \`example\nwith ![Literal](publishing/assets/foreign/missing.svg)\nends\`.\n\n![Real](${one})`,
  ];
  for (const body of examples) {
    const { substrate, project } = makeFixture(), assetDir = path.join(substrate, 'publishing/assets/test-essay');
    fs.writeFileSync(path.join(assetDir, 'one.svg'), '<svg id="one"/>');
    fs.writeFileSync(path.join(assetDir, 'two.svg'), '<svg id="two"/>');
    const before = new JSDOM(renderToStaticMarkup(React.createElement(Markdown, { source: body }))).window.document;
    const diagnostics: SubstrateDiagnostic[] = [];
    const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diagnostics);
    const after = new JSDOM(renderToStaticMarkup(React.createElement(Markdown, { source: out }))).window.document;
    assert.deepEqual(diagnostics, [], body);
    assert.equal(after.querySelectorAll('img').length, before.querySelectorAll('img').length, body);
    assert.ok([...after.querySelectorAll('img')].every(img => img.getAttribute('src')!.startsWith('/assets/thoughts/test-essay/')), body);
    assert.deepEqual([...after.querySelectorAll('code')].map(e => e.textContent), [...before.querySelectorAll('code')].map(e => e.textContent), body);
    for (const img of after.querySelectorAll('img')) {
      const file = path.basename(img.getAttribute('src')!);
      assert.equal(fs.readFileSync(path.join(project, 'public/assets/thoughts/test-essay', file), 'utf8'), fs.readFileSync(path.join(assetDir, file), 'utf8'));
    }
    if (!before.querySelectorAll('img').length) {
      assert.equal(out, body);
      assert.equal(fs.existsSync(path.join(project, 'public/assets/thoughts')), false);
    }
  }
});

test('caption code never copies its example for external served or owned figures', () => {
  const outer = 'publishing/assets/test-essay/outer.svg', literal = 'publishing/assets/test-essay/code.svg';
  for (const kind of ['external', 'served', 'owned']) {
    const { substrate, project } = makeFixture(), assetDir = path.join(substrate, 'publishing/assets/test-essay');
    fs.writeFileSync(path.join(assetDir, 'outer.svg'), '<svg id="outer"/>');
    fs.writeFileSync(path.join(assetDir, 'code.svg'), '<svg id="code"/>');
    const src = kind === 'external' ? 'https://example.com/Try.png' : kind === 'served' ? '/assets/thoughts/previous/existing.svg' : outer;
    const body = `![Try \`literal\`](${src} " Try \`![Literal](${literal})\` ")`, diagnostics: SubstrateDiagnostic[] = [];
    const before = new JSDOM(renderToStaticMarkup(React.createElement(Markdown, { source: body }))).window.document;
    const out = rewriteEssayBodyAssets(body, 'test-essay', substrate, project, 'test-essay.md', diagnostics);
    const after = new JSDOM(renderToStaticMarkup(React.createElement(Markdown, { source: out }))).window.document;
    assert.deepEqual([...after.querySelectorAll('code')].map(e => e.textContent), [...before.querySelectorAll('code')].map(e => e.textContent), kind);
    assert.equal(after.querySelector('img')!.getAttribute('alt'), 'Try `literal`');
    assert.deepEqual(diagnostics, []);
    assert.equal(fs.existsSync(path.join(project, 'public/assets/thoughts/test-essay/code.svg')), false, kind);
    if (kind === 'owned') {
      assert.equal(out, body.replace(outer, '/assets/thoughts/test-essay/outer.svg'));
      assert.equal(fs.readFileSync(path.join(project, 'public/assets/thoughts/test-essay/outer.svg'), 'utf8'), '<svg id="outer"/>');
    } else assert.equal(out, body);
  }
});
