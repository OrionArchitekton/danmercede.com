// Guard for the build-time RSS 2.0 + Atom 1.0 feeds (specs/hub-feed-spec.md).
// renderRss()/renderAtom() project the SAME THOUGHTS/GUIDES corpora the pages
// and sitemap use, via the site's own Markdown renderer, so feed content cannot
// drift from what the site serves. Run via `npm test` (tsx --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderRss,
  renderAtom,
  feedItems,
  sanitizeFeedHtml,
  FEED_LIMIT,
} from '../scripts/renderFeed.ts';
import { SITE_ORIGIN } from '../seoMeta.ts';
import type { Thought, Guide } from '../types';

const essay: Thought = {
  title: 'Synthetic & Essay',
  preview: 'A <preview> with markup.',
  date: '2026-07-07',
  category: 'Architecture',
  slug: '2026-07-07-synthetic-essay',
  body: [
    'Paragraph one with **bold**.',
    '',
    '![broken](publishing/assets/2026-07-07-synthetic-essay/hero.svg "Broken figure")',
    '',
    '![ok](/assets/diagrams/good.svg "Good figure")',
    '',
    'Paragraph two links [here](/thoughts/other-essay).',
  ].join('\n'),
};

const guide: Guide = {
  title: 'Synthetic Guide',
  slug: 'synthetic-guide',
  date: '2026-01-23',
  category: 'Agent Engineering',
  description: 'Guide summary line.',
  lead: 'Lead paragraph.',
  body: 'Guide body paragraph.',
};

const rss = renderRss([essay], [guide]);
const atom = renderAtom([essay], [guide]);

test('items span both corpora with per-corpus canonical links, newest first', () => {
  const items = feedItems([essay], [guide]);
  assert.equal(items.length, 2);
  assert.equal(items[0].link, `${SITE_ORIGIN}/thoughts/${essay.slug}`);
  assert.equal(items[1].link, `${SITE_ORIGIN}/guides/${guide.slug}`);
  assert.ok(rss.indexOf(essay.slug) < rss.indexOf(guide.slug), 'newest first');
});

test('rss envelope: version, self link, WebSub hub, operator channel copy', () => {
  assert.ok(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(rss.includes(`<atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>`));
  assert.ok(rss.includes('<atom:link href="https://pubsubhubbub.appspot.com/" rel="hub"/>'));
  const desc = rss.match(/<description>([^<]*)<\/description>/)![1];
  assert.match(desc, /operator|workflow/i, 'channel copy carries the operator lead');
  assert.ok(!/runtime governance|operator-grade|control planes?, and/i.test(desc), 'no retired brand lead');
});

test('rss dates: RFC-822 UTC from date-only at midnight PT (PDT and PST)', () => {
  assert.ok(rss.includes('<pubDate>Tue, 07 Jul 2026 07:00:00 +0000</pubDate>'), 'July: PDT, 00:00 PT = 07:00 UTC');
  assert.ok(rss.includes('<pubDate>Fri, 23 Jan 2026 08:00:00 +0000</pubDate>'), 'January: PST, 00:00 PT = 08:00 UTC');
  assert.ok(rss.includes('<lastBuildDate>Tue, 07 Jul 2026 07:00:00 +0000</lastBuildDate>'), 'from newest item, not wall clock');
});

test('content is the site-rendered body, sanitized: broken figures dropped, URLs absolutized', () => {
  assert.ok(rss.includes('<content:encoded>'));
  assert.ok(rss.includes('Paragraph one'));
  assert.ok(!rss.includes('publishing/assets'), 'unresolvable figure srcs must not ship in the feed');
  assert.ok(rss.includes(`${SITE_ORIGIN}/assets/diagrams/good.svg`.replace(/&/g, '&amp;')), 'root-relative srcs absolutized');
  assert.ok(rss.includes(`${SITE_ORIGIN}/thoughts/other-essay`), 'root-relative hrefs absolutized');
  // summaries: essay preview and guide description, escaped
  assert.ok(rss.includes('A &lt;preview&gt; with markup.'));
  assert.ok(rss.includes('<description>Guide summary line.</description>'));
});

test('sanitizeFeedHtml drops only figures with unresolvable srcs', () => {
  const html =
    '<p>keep</p><figure><img src="publishing/assets/x/y.svg" alt="a"/></figure>' +
    '<figure><img src="/assets/ok.svg" alt="b"/></figure>';
  const out = sanitizeFeedHtml(html);
  assert.ok(out.includes('<p>keep</p>'));
  assert.ok(!out.includes('publishing/assets'));
  assert.ok(out.includes(`${SITE_ORIGIN}/assets/ok.svg`));
});

test('atom envelope and entries', () => {
  assert.ok(atom.includes('<feed xmlns="http://www.w3.org/2005/Atom">'));
  assert.ok(atom.includes(`<link href="${SITE_ORIGIN}/atom.xml" rel="self" type="application/atom+xml"/>`));
  assert.ok(atom.includes('<link href="https://pubsubhubbub.appspot.com/" rel="hub"/>'));
  assert.ok(atom.includes(`<id>${SITE_ORIGIN}/thoughts/${essay.slug}</id>`));
  assert.ok(atom.includes('<published>2026-07-07T07:00:00.000Z</published>'));
  assert.ok(atom.includes('<content type="html">'));
});

test('limit caps the merged corpus and rendering is deterministic', () => {
  const many: Thought[] = Array.from({ length: FEED_LIMIT + 5 }, (_, i) => ({
    ...essay,
    slug: `2026-07-07-many-${i}`,
  }));
  assert.equal(renderRss(many, []).match(/<item>/g)?.length, FEED_LIMIT);
  assert.equal(renderRss([essay], [guide]), rss);
  assert.equal(renderAtom([essay], [guide]), atom);
});

test('default path projects the real corpora with canonical-host URLs only', () => {
  const real = renderRss();
  assert.ok(real.includes('<item>'), 'real corpus produces items');
  assert.ok(!real.includes('publishing/assets'), 'no unresolvable srcs from real essays');
  assert.ok(!/(?:href|src)="\/(?!\/)/.test(real), 'no bare root-relative URLs survive');
});
