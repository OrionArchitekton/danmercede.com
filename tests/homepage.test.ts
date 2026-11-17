import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SELECTED_WORK, WORK_STATUSES, WORKS, THOUGHTS } from '../constants';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('the homepage features exactly three selected works, each with an honest status and a real link', () => {
  assert.equal(SELECTED_WORK.length, 3, 'the audit asks for three complementary selected works');
  const workLinks = new Set(WORKS.map((w) => w.link));
  const thoughtSlugs = new Set(THOUGHTS.map((t) => t.slug));
  for (const w of SELECTED_WORK) {
    assert.ok((WORK_STATUSES as readonly string[]).includes(w.status), `${w.title}: status "${w.status}" is not in the status vocabulary`);
    assert.ok(w.summary.trim() && w.action.trim(), `${w.title}: needs a summary and an action`);
    if (w.href.startsWith('/works/')) {
      assert.ok(workLinks.has(`https://www.danmercede.com${w.href}`), `${w.title}: ${w.href} is not a published /works page`);
    } else if (w.href.startsWith('/thoughts/')) {
      assert.ok(thoughtSlugs.has(w.href.slice('/thoughts/'.length)), `${w.title}: ${w.href} is not a published essay`);
    } else {
      assert.match(w.href, /^https:\/\//, `${w.title}: an off-site link must be https`);
    }
  }
});

test('the knowledge-graph card opens its own case narrative, not an off-site page', () => {
  const kg = SELECTED_WORK.find((w) => w.title === 'Production knowledge graph');
  assert.ok(kg, 'the knowledge-graph card is still selected');
  assert.equal(kg.href, '/thoughts/2026-09-30-the-knowledge-graph-my-agents-stopped-asking');
});

/**
 * Headings lead. A heading set as a small capitals label with wide tracking
 * reads as a tag, not a title, so no h1 to h4 may carry both `uppercase` and a
 * `tracking-` class. Nav, buttons, chips and badges are not headings and are
 * not checked here.
 *
 * Scope: this reads class strings as written in the source. It reports a tag
 * that names both classes anywhere, even in exclusive branches (it errs toward
 * a failure a person then reads), and it cannot see a class that arrives
 * through a variable. The built-output twin in builtPageRender.test.ts checks
 * the classes each rendered heading actually carries.
 */
function capsLabelHeadings(src: string): string[] {
  const hits: string[] = [];
  for (const m of src.matchAll(/<h[1-4]\b[^>]*>/g)) {
    const tag = m[0];
    if (/\buppercase\b/.test(tag) && /\btracking-/.test(tag)) {
      hits.push(`line ${src.slice(0, m.index).split('\n').length}: ${tag.slice(0, 90)}`);
    }
  }
  return hits;
}

test('the capitals-label heading check sees the pattern and ignores other elements (positive control)', () => {
  assert.equal(capsLabelHeadings('<h2 className="font-mono uppercase tracking-widest">A</h2>').length, 1);
  assert.equal(capsLabelHeadings('<h3\n  className={`tracking-[0.2em] uppercase ${x}`}>A</h3>').length, 1);
  assert.equal(capsLabelHeadings('<h2 className="text-2xl font-bold tracking-tight">A</h2>').length, 0);
  assert.equal(capsLabelHeadings('<span className="uppercase tracking-widest">chip</span>').length, 0);
});

test('no heading is styled as a small capitals label', () => {
  const sources = ['App.tsx', ...fs.readdirSync(path.join(root, 'components')).filter((f) => f.endsWith('.tsx')).map((f) => `components/${f}`)];
  const hits = sources.flatMap((rel) =>
    capsLabelHeadings(fs.readFileSync(path.join(root, rel), 'utf8')).map((h) => `${rel} ${h}`),
  );
  assert.deepEqual(hits, [], `headings styled as capitals labels:\n${hits.join('\n')}`);
});
