/**
 * renderFeed.ts
 *
 * Build-time RSS 2.0 + Atom 1.0 feed emitter (specs/hub-feed-spec.md).
 *
 * Projects the SAME THOUGHTS/GUIDES corpora the per-route pages and sitemap
 * use, rendering item content with the site's own Markdown component
 * (react-dom/server renderToStaticMarkup), so feed content cannot drift from
 * what the site serves. Emits `build/feed.xml` + `build/atom.xml` as BUILD
 * OUTPUTS — the injectRouteMeta.ts convention: regenerated every deploy,
 * never committed, zero hand-maintenance when a substrate-sync lands.
 *
 * Feed sanitation: the essay corpus carries substrate-relative image srcs
 * (`publishing/assets/...`) that do not resolve on the served site; figures
 * with such srcs are DROPPED from feed content, and root-relative srcs/hrefs
 * are absolutized to SITE_ORIGIN so items read standalone in feed readers.
 *
 * Deterministic given content: channel timestamps derive from the newest
 * item (dates are day-precision; midnight PT, converted per-date to UTC),
 * never the wall clock.
 *
 * Run after injectRouteMeta.ts in `npm run build`.
 */

import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import Markdown from '../components/Markdown';
import { SITE_ORIGIN } from '../seoMeta';
import { THOUGHTS } from '../constants.generated';
import { GUIDES } from '../constants.guides.generated';
import type { Thought, Guide } from '../types';

const FEED_TITLE = 'Dan Mercede';
const FEED_DESCRIPTION =
  'Essays and guides from Dan Mercede: turning AI from experiments into owned, ' +
  'governed workflows operators can actually run.';
const HUB_URL = 'https://pubsubhubbub.appspot.com/';
const AUTHOR_NAME = 'Dan Mercede';

/** Newest items included per feed, across both corpora. */
export const FEED_LIMIT = 20;

// ---------------------------------------------------------------------------
// Escaping + PT-midnight -> UTC (host-timezone-independent).
// ---------------------------------------------------------------------------

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function laOffsetMs(utcMs: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcMs;
}

/** A YYYY-MM-DD publish date as an instant: midnight PT that day, in UTC ms. */
export function dateUtcMs(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day, 0, 0);
  return guess - laOffsetMs(guess - laOffsetMs(guess));
}

const RFC822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC822_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function rfc822Utc(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${RFC822_DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ` +
    `${RFC822_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`
  );
}

// ---------------------------------------------------------------------------
// Feed HTML sanitation.
// ---------------------------------------------------------------------------

/**
 * Feed-ready HTML from the site-rendered markup: drop <figure> blocks whose
 * <img> src is neither absolute nor root-relative (the substrate-relative
 * `publishing/assets/...` srcs are SPA soft-404s on the served site), strip
 * responsive srcset/sizes attributes (their candidate URLs would resolve
 * against the feed reader's own context; one absolute src is the portable
 * shape), then absolutize remaining root-relative src/href attributes to
 * SITE_ORIGIN so every URL reads standalone in a feed reader.
 */
export function sanitizeFeedHtml(html: string): string {
  const withoutBrokenFigures = html.replace(
    /<figure\b[\s\S]*?<\/figure>/g,
    (figure) => {
      const src = figure.match(/<img[^>]*\bsrc="([^"]*)"/)?.[1] ?? '';
      return /^(https?:\/\/|\/)/.test(src) ? figure : '';
    },
  );
  const withoutResponsiveAttrs = withoutBrokenFigures.replace(
    /\s(?:srcset|sizes)="[^"]*"/gi,
    '',
  );
  return withoutResponsiveAttrs.replace(
    /\b(src|href)="\/(?!\/)/g,
    (_m, attr) => `${attr}="${SITE_ORIGIN}/`,
  );
}

function bodyHtml(markdown: string): string {
  return sanitizeFeedHtml(
    renderToStaticMarkup(React.createElement(Markdown, { source: markdown })),
  );
}

// ---------------------------------------------------------------------------
// Item projection (both corpora, newest-first, capped).
// ---------------------------------------------------------------------------

export interface FeedItem {
  title: string;
  link: string;
  date: string;
  summary: string;
  body: string;
}

export function feedItems(
  thoughts: Thought[] = THOUGHTS,
  guides: Guide[] = GUIDES,
): FeedItem[] {
  const items: FeedItem[] = [
    ...thoughts
      .filter((t) => t.slug)
      .map((t) => ({
        title: t.title,
        link: `${SITE_ORIGIN}/thoughts/${t.slug}`,
        date: t.date,
        summary: t.preview,
        body: t.body,
      })),
    ...guides
      .filter((g) => g.slug)
      .map((g) => ({
        title: g.title,
        link: `${SITE_ORIGIN}/guides/${g.slug}`,
        date: g.date,
        summary: g.description,
        body: g.body,
      })),
  ];
  // Newest first; same-date ties break by link for a deterministic order.
  items.sort((a, b) => b.date.localeCompare(a.date) || a.link.localeCompare(b.link));
  return items.slice(0, FEED_LIMIT);
}

// ---------------------------------------------------------------------------
// Renderers.
// ---------------------------------------------------------------------------

export function renderRss(
  thoughts: Thought[] = THOUGHTS,
  guides: Guide[] = GUIDES,
): string {
  const items = feedItems(thoughts, guides);
  const newestMs = items.length ? dateUtcMs(items[0].date) : 0;
  const itemXml = items
    .map(
      (item) =>
        '<item>' +
        `<title>${escapeXml(item.title)}</title>` +
        `<link>${item.link}</link>` +
        `<guid isPermaLink="true">${item.link}</guid>` +
        `<pubDate>${rfc822Utc(dateUtcMs(item.date))}</pubDate>` +
        `<description>${escapeXml(item.summary)}</description>` +
        `<content:encoded>${escapeXml(bodyHtml(item.body))}</content:encoded>` +
        '</item>',
    )
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" ' +
    'xmlns:content="http://purl.org/rss/1.0/modules/content/">\n' +
    '<channel>\n' +
    `<title>${escapeXml(FEED_TITLE)}</title>\n` +
    `<link>${SITE_ORIGIN}/</link>\n` +
    `<description>${escapeXml(FEED_DESCRIPTION)}</description>\n` +
    '<language>en</language>\n' +
    `<lastBuildDate>${rfc822Utc(newestMs)}</lastBuildDate>\n` +
    '<docs>https://www.rssboard.org/rss-specification</docs>\n' +
    `<atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    `<atom:link href="${HUB_URL}" rel="hub"/>\n` +
    `${itemXml}\n` +
    '</channel>\n' +
    '</rss>\n'
  );
}

export function renderAtom(
  thoughts: Thought[] = THOUGHTS,
  guides: Guide[] = GUIDES,
): string {
  const items = feedItems(thoughts, guides);
  const newestMs = items.length ? dateUtcMs(items[0].date) : 0;
  const entryXml = items
    .map((item) => {
      const iso = new Date(dateUtcMs(item.date)).toISOString();
      return (
        '<entry>' +
        `<id>${item.link}</id>` +
        `<title>${escapeXml(item.title)}</title>` +
        `<link href="${item.link}" rel="alternate" type="text/html"/>` +
        `<published>${iso}</published>` +
        `<updated>${iso}</updated>` +
        `<summary>${escapeXml(item.summary)}</summary>` +
        `<content type="html">${escapeXml(bodyHtml(item.body))}</content>` +
        '</entry>'
      );
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<feed xmlns="http://www.w3.org/2005/Atom">\n' +
    `<id>${SITE_ORIGIN}/</id>\n` +
    `<title>${escapeXml(FEED_TITLE)}</title>\n` +
    `<subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>\n` +
    `<updated>${new Date(newestMs).toISOString()}</updated>\n` +
    `<author><name>${escapeXml(AUTHOR_NAME)}</name><uri>${SITE_ORIGIN}/</uri></author>\n` +
    `<link href="${SITE_ORIGIN}/atom.xml" rel="self" type="application/atom+xml"/>\n` +
    `<link href="${SITE_ORIGIN}/" rel="alternate" type="text/html"/>\n` +
    `<link href="${HUB_URL}" rel="hub"/>\n` +
    `${entryXml}\n` +
    '</feed>\n'
  );
}

// ---------------------------------------------------------------------------
// CLI: emit into build/ (chained after injectRouteMeta.ts in `npm run build`).
// ---------------------------------------------------------------------------

function main(): void {
  const buildDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'build');
  if (!existsSync(buildDir)) {
    throw new Error(`${buildDir} not found — run \`vite build\` first.`);
  }
  writeFileSync(join(buildDir, 'feed.xml'), renderRss(), 'utf8');
  writeFileSync(join(buildDir, 'atom.xml'), renderAtom(), 'utf8');
  console.log(`renderFeed: wrote build/feed.xml + build/atom.xml (limit ${FEED_LIMIT})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
