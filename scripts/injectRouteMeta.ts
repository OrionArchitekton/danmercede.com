// Build-time per-route prerender injector (head + JSON-LD + body).
//
// Why this exists: danmercede.com is a react-router SPA whose per-route <head>
// meta, structured data, and body are produced at runtime (post-hydration).
// No-JS crawlers — including ChatGPT/Perplexity/Claude, which execute no JS —
// hitting a deep link (/about, /proof, /case-studies/:slug) therefore read the
// homepage's head and an empty <div id="root"> body. This postbuild step emits
// one static HTML file per route carrying that route's:
//   1. <head> meta  (title/og/twitter/canonical)        — renderSeoBlock
//   2. JSON-LD      (Article/ProfilePage + BreadcrumbList) — renderRouteJsonLd (W4)
//   3. <body> copy  (h1 + paragraphs, crawlable)          — renderBodyBlock (W1)
// served by Vercel filesystem precedence (before the SPA catch-all rewrite) —
// no server, no framework, and no React executed in Node (so it is unaffected
// by the esm.sh importmap that externalizes React).
//
// Routing: emits build/<route>/index.html (directory-index), which Vercel
// serves for /<route> via filesystem precedence. No vercel.json change needed.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ROUTE_META,
  caseStudyMeta,
  caseStudyPaths,
  thoughtMeta,
  thoughtPaths,
  renderThoughtSitemapEntries,
  guideMeta,
  guidePaths,
  renderGuideSitemapEntries,
  renderSeoBlock,
  injectSeoBlock,
  renderBodyBlock,
  renderRouteJsonLd,
  injectBlock,
  SEO_BLOCK_START,
  BODY_BLOCK_START,
  BODY_BLOCK_END,
  JSONLD_BLOCK_START,
  JSONLD_BLOCK_END,
  type RouteMeta,
} from '../seoMeta';

const BUILD_DIR = path.resolve(process.cwd(), 'build');

async function main() {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  const baseHtml = await fs.readFile(indexPath, 'utf8').catch(() => {
    throw new Error(`${indexPath} not found — run \`vite build\` first.`);
  });
  for (const anchor of [SEO_BLOCK_START, BODY_BLOCK_START, JSONLD_BLOCK_START]) {
    if (!baseHtml.includes(anchor)) {
      throw new Error(
        `injector anchor (${anchor}) not found in build/index.html — did the index.html anchors survive the build?`,
      );
    }
  }

  const routes: Array<{ path: string; meta: RouteMeta }> = [];
  // Static routes, excluding the homepage (build/index.html is already the homepage).
  for (const [routePath, meta] of Object.entries(ROUTE_META)) {
    if (routePath === '/') continue;
    routes.push({ path: routePath, meta });
  }
  // Dynamic case-study routes, derived from committed content.
  for (const csPath of caseStudyPaths()) {
    const slug = csPath.split('/').pop();
    routes.push({ path: csPath, meta: caseStudyMeta(slug) });
  }
  // Dynamic per-thought routes, derived from the committed THOUGHTS corpus (R2).
  // Each bakes the full essay body (R1) and an Article JSON-LD node.
  for (const tPath of thoughtPaths()) {
    const slug = tPath.split('/').pop();
    routes.push({ path: tPath, meta: thoughtMeta(slug) });
  }
  // Dynamic per-guide routes, derived from the committed GUIDES corpus. Each bakes
  // the full guide prose (figures/code dropped) and an Article JSON-LD node.
  for (const gPath of guidePaths()) {
    const slug = gPath.split('/').pop();
    routes.push({ path: gPath, meta: guideMeta(slug) });
  }

  let written = 0;
  for (const { path: routePath, meta } of routes) {
    // 1) per-route <head> meta (title/og/twitter/canonical)
    let html = injectSeoBlock(baseHtml, renderSeoBlock(routePath, meta));
    // 2) per-route JSON-LD (Article/ProfilePage + BreadcrumbList) — W4
    html = injectBlock(
      html,
      JSONLD_BLOCK_START,
      JSONLD_BLOCK_END,
      renderRouteJsonLd(routePath, meta),
      '  ',
    );
    // 3) crawlable <body> content (h1 + paragraphs) — W1 body-bake
    html = injectBlock(
      html,
      BODY_BLOCK_START,
      BODY_BLOCK_END,
      renderBodyBlock(routePath, meta),
      '  ',
    );
    const outDir = path.join(BUILD_DIR, routePath.replace(/^\//, ''));
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    written++;
  }

  // Regenerate the per-thought sitemap entries into the BUILT sitemap so the
  // served sitemap is always in lockstep with the THOUGHTS corpus. The committed
  // public/sitemap.xml (copied to build/ by Vite) carries only static + case-study
  // routes; a substrate-sync that changes THOUGHTS needs no sitemap edit.
  const sitemapPath = path.join(BUILD_DIR, 'sitemap.xml');
  const sitemapXml = await fs.readFile(sitemapPath, 'utf8').catch(() => {
    throw new Error(
      `${sitemapPath} not found — public/sitemap.xml must ship so Vite copies it to build/.`,
    );
  });
  const closeTag = '</urlset>';
  if (!sitemapXml.includes(closeTag)) {
    throw new Error('build/sitemap.xml is missing </urlset> — cannot inject thought entries.');
  }
  const thoughtEntries = renderThoughtSitemapEntries();
  const guideEntries = renderGuideSitemapEntries();
  const extraEntries = [thoughtEntries, guideEntries].filter(Boolean).join('\n');
  if (extraEntries) {
    await fs.writeFile(
      sitemapPath,
      sitemapXml.replace(closeTag, `${extraEntries}\n${closeTag}`),
      'utf8',
    );
  }

  console.log(
    `[injectRouteMeta] wrote ${written} per-route static HTML files ` +
      `(${routes.length} routes: ${Object.keys(ROUTE_META).length - 1} static + ` +
      `${caseStudyPaths().length} case studies + ${thoughtPaths().length} thoughts + ${guidePaths().length} guides) ` +
      `+ injected ${thoughtPaths().length} thought + ${guidePaths().length} guide entries into build/sitemap.xml`,
  );
}

main().catch((err) => {
  console.error('[injectRouteMeta] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
