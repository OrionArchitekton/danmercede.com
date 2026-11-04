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
import { THOUGHTS } from '../constants.generated';
import { GUIDES } from '../constants.guides.generated';
import type { Thought, Guide } from '../types';
import { FEED_LIMIT, feedItems as projectFeedItems, renderRss as projectRss, renderAtom as projectAtom } from './renderFeedCore';
export { FEED_LIMIT, escapeXml, dateUtcMs, sanitizeFeedHtml, type FeedItem } from './renderFeedCore';

export function feedItems(thoughts: Thought[] = THOUGHTS, guides: Guide[] = GUIDES) {
  return projectFeedItems(thoughts, guides);
}
export function renderRss(thoughts: Thought[] = THOUGHTS, guides: Guide[] = GUIDES): string {
  return projectRss(thoughts, guides);
}
export function renderAtom(thoughts: Thought[] = THOUGHTS, guides: Guide[] = GUIDES): string {
  return projectAtom(thoughts, guides);
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
