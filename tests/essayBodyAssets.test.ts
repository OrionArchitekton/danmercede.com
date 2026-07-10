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
