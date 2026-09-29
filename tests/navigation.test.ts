import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAV_ITEMS, FOOTER_LINKS, START_HERE, GUIDES, THOUGHTS } from '../constants';
import { ROUTE_META } from '../seoMeta';
import { linkTargetProps } from '../components/WorkCard';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');

/**
 * 2026-09-29 site audit, information architecture: nine equally weighted nav
 * items asked visitors to learn the site's internal categories first. The
 * primary nav now names what a visitor came for; secondary surfaces move to the
 * footer, and nothing becomes unreachable. URLs do not change.
 */

test('the primary nav is short and names what visitors came for', () => {
  assert.deepEqual(
    NAV_ITEMS.map((n) => n.label),
    ['Work', 'Writing', 'Guides', 'Proof', 'About', 'Contact'],
  );
  assert.ok(!NAV_ITEMS.some((n) => n.path === '/'), 'the logo is the home link; no separate Home item');
  assert.match(appSrc, /<Link to="\/" className="flex items-center" aria-label="Dan Mercede, home">/, 'the logo must link home');
});

test('every public page stays reachable from the nav or the footer', () => {
  const reachable = new Set([...NAV_ITEMS.map((n) => n.path), ...FOOTER_LINKS.map((l) => l.href)]);
  const legalFooter = new Set(['/', '/legal', '/privacy', '/imprint']);
  const orphaned = Object.keys(ROUTE_META).filter((p) => !legalFooter.has(p) && !reachable.has(p));
  assert.deepEqual(orphaned, [], 'these routes left the nav without a footer link');
  assert.match(appSrc, /FOOTER_LINKS\.map\(/, 'the footer must render FOOTER_LINKS');
});

test('same-site project links open in place; off-site links open a new tab', () => {
  for (const href of ['/works/proctor/', 'https://www.danmercede.com/works/failclosed/', 'https://danmercede.com/works/x/']) {
    assert.deepEqual(linkTargetProps(href), {}, `${href} is on this site and must not force a new tab`);
  }
  for (const href of ['https://github.com/OrionArchitekton/failclosed', 'https://youtu.be/abc', '//evil.example/phish']) {
    assert.deepEqual(linkTargetProps(href), { target: '_blank', rel: 'noopener noreferrer' });
  }
  const card = fs.readFileSync(path.join(root, 'components/WorkCard.tsx'), 'utf8');
  assert.doesNotMatch(card, /target="_blank"/, 'WorkCard must derive targets from linkTargetProps, not hard-code them');
  const home = appSrc.slice(appSrc.indexOf('const HomePage = '), appSrc.indexOf('const AboutPage = '));
  assert.match(home, /linkTargetProps\(work\.href\)/, 'homepage selected-work cards must use the same classifier');
});

test('Writing has a curated Start here list that resolves to real guides and essays', () => {
  assert.ok(START_HERE.length >= 3 && START_HERE.length <= 6, 'a short, curated list');
  const guideSlugs = new Set(GUIDES.map((g) => g.slug));
  const thoughtSlugs = new Set(THOUGHTS.map((t) => t.slug));
  for (const item of START_HERE) {
    const known = item.kind === 'guide' ? guideSlugs.has(item.slug) : thoughtSlugs.has(item.slug);
    assert.ok(known, `${item.kind} "${item.slug}" does not exist`);
    assert.ok(item.why.trim(), `${item.slug}: say why it is worth starting with`);
  }
  assert.ok(START_HERE.some((i) => i.kind === 'guide') && START_HERE.some((i) => i.kind === 'essay'), 'mix practical guides with essays');
  const page = appSrc.slice(appSrc.indexOf('const ThoughtsPage'), appSrc.indexOf('const ThoughtDetailPage'));
  assert.match(page, /START_HERE\.map\(/, 'the Writing page must render START_HERE');
  assert.match(page, /href="\/feed\.xml"/, 'the Writing page must expose the RSS feed');
});
