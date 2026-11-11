import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SELECTED_WORK, VALIDATION, WORK_STATUSES, WORKS, INTENT_ROUTES, THOUGHTS } from '../constants';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const homePage = appSrc.slice(appSrc.indexOf('const HomePage = '), appSrc.indexOf('const AboutPage = '));

/**
 * 2026-09-29 site audit, homepage: the first screen and first scroll should
 * establish person, purpose, and evidence. Selected work and external
 * validation come right after the hero; the abstract pillars and the
 * Platform / Agency / Capital / Media entity blocks leave the homepage.
 */

test('the homepage features exactly three selected works, each with an honest status and a real link', () => {
  assert.equal(SELECTED_WORK.length, 3, 'the audit asks for three complementary selected works');
  const workLinks = new Set(WORKS.map((w) => w.link));
  const thoughtSlugs = new Set(THOUGHTS.map((t) => t.slug));
  for (const w of SELECTED_WORK) {
    assert.ok((WORK_STATUSES as readonly string[]).includes(w.status), `${w.title}: status "${w.status}" is not in the status vocabulary`);
    assert.ok(w.summary.trim() && w.evidence.trim(), `${w.title}: needs a summary and an evidence line`);
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

test('every validation item links an external source', () => {
  assert.ok(VALIDATION.length >= 3, 'expected a compact strip of at least three items');
  for (const v of VALIDATION) {
    assert.match(v.href, /^https:\/\//, `${v.label}: needs a source link`);
    assert.doesNotMatch(v.href, /danmercede\.com/, `${v.label}: validation must be external, not self-published`);
  }
});

test('HomePage renders selected work and validation, and drops the abstract blocks', () => {
  assert.match(homePage, /SELECTED_WORK\.map\(/);
  assert.match(homePage, /VALIDATION\.map\(/);
  assert.match(homePage, /id="selected-work"/);
  for (const retired of ['PILLARS.map(', 'BUILD_AREAS.map(', 'SIGNALS.map(']) {
    assert.ok(!homePage.includes(retired), `the homepage must no longer render ${retired.replace('.map(', '')}`);
  }
});

test('the hero leads with work and direct contact; OIA stays available but secondary', () => {
  const hero = homePage.slice(homePage.indexOf('{/* Hero */}'), homePage.indexOf('{/* Selected Work */}'));
  assert.ok(hero.length > 0, 'expected the hero to precede the selected-work section');
  const seeWork = hero.indexOf('href="#selected-work"');
  const contact = hero.indexOf('to="/connect"');
  const oia = hero.indexOf('READINESS_SCAN.href');
  assert.ok(seeWork >= 0, 'hero needs a "See selected work" action');
  assert.ok(contact >= 0, 'hero needs a "Contact Dan" action');
  assert.ok(oia > seeWork && oia > contact, 'the OIA link must come after the two primary actions');
});

test('the intent router offers a hiring path and no investor lane', () => {
  assert.ok(INTENT_ROUTES.some((r) => r.href === '/about'), 'expected a route for people evaluating Dan for a role');
  assert.ok(!INTENT_ROUTES.some((r) => /investor/i.test(r.audience)), 'the investor lane is not an active priority');
});

/**
 * Headings lead. A heading set as a small capitals label with wide tracking
 * reads as a tag, not a title, so no h1 to h4 may carry both `uppercase` and a
 * `tracking-` class. Nav, buttons, chips and badges are not headings and are
 * not checked here.
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
