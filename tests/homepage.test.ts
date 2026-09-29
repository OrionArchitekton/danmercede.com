import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SELECTED_WORK, VALIDATION, WORK_STATUSES, WORKS, INTENT_ROUTES } from '../constants';
import { ROUTE_META, renderBodyBlock } from '../seoMeta';

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
  for (const w of SELECTED_WORK) {
    assert.ok((WORK_STATUSES as readonly string[]).includes(w.status), `${w.title}: status "${w.status}" is not in the status vocabulary`);
    assert.ok(w.summary.trim() && w.evidence.trim(), `${w.title}: needs a summary and an evidence line`);
    if (w.href.startsWith('/works/')) {
      assert.ok(workLinks.has(`https://www.danmercede.com${w.href}`), `${w.title}: ${w.href} is not a published /works page`);
    } else {
      assert.match(w.href, /^https:\/\//, `${w.title}: an off-site link must be https`);
    }
  }
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

test('the homepage prerender names the selected work', () => {
  const body = renderBodyBlock('/', ROUTE_META['/']);
  for (const w of SELECTED_WORK) {
    assert.ok(body.includes(w.title), `the homepage prerender is missing ${w.title}`);
  }
  assert.doesNotMatch(body, /Orion Apex Capital/, 'entity-structure copy belongs on /ecosystem, not the homepage body');
});

test('the intent router offers a hiring path and no investor lane', () => {
  assert.ok(INTENT_ROUTES.some((r) => r.href === '/about'), 'expected a route for people evaluating Dan for a role');
  assert.ok(!INTENT_ROUTES.some((r) => /investor/i.test(r.audience)), 'the investor lane is not an active priority');
});
