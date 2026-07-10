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
import { pathToFileURL } from 'node:url';
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
  diagramMeta,
  diagramPaths,
  renderDiagramSitemapEntries,
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
import { DIAGRAMS, THOUGHTS } from '../constants';
import type { Diagram } from '../types';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from '../components/Markdown';

// Essay bodies are authored markdown; the hydrated page renders them with the
// Markdown component (App.tsx ThoughtDetailPage), so the baked body must carry
// the SAME rendered markup (real <h2>/<pre>/<figure>), not escaped literal
// markdown. Node-side render here keeps react-dom/server out of the browser
// bundle. Returns undefined for non-thought routes (paragraph bake unchanged).
export function renderedThoughtBody(routePath: string): string | undefined {
  if (!routePath.startsWith('/thoughts/')) return undefined;
  const slug = routePath.slice('/thoughts/'.length);
  const thought = THOUGHTS.find((t) => t.slug === slug);
  if (!thought || !thought.body) return undefined;
  return renderToStaticMarkup(React.createElement(Markdown, { source: thought.body }));
}

const BUILD_DIR = path.resolve(process.cwd(), 'build');

// The full per-route bake set: static (ROUTE_META, minus the homepage which IS
// build/index.html) + dynamic case-study / thought / guide / diagram routes, each
// derived from committed content so a content refresh needs no slug-list edit.
// The diagram corpus is injectable (mirrors the S1c seoMeta helpers) because the
// in-repo DIAGRAMS is empty until the substrate-sync regen — injection lets a test
// prove the diagram wiring with a synthetic corpus. Works microsites are deliberately
// EXCLUDED: they are Vercel-rewrite proxies and a physical build/works/<slug>/index.html
// would shadow the rewrite (seoMeta.ts:282).
export function collectRoutes(diagrams: Diagram[] = DIAGRAMS): Array<{ path: string; meta: RouteMeta }> {
  const routes: Array<{ path: string; meta: RouteMeta }> = [];
  // Static routes, excluding the homepage (build/index.html is already the homepage).
  for (const [routePath, meta] of Object.entries(ROUTE_META)) {
    if (routePath === '/') continue;
    routes.push({ path: routePath, meta });
  }
  // Dynamic case-study routes, derived from committed content.
  for (const csPath of caseStudyPaths()) {
    routes.push({ path: csPath, meta: caseStudyMeta(csPath.split('/').pop()) });
  }
  // Dynamic per-thought routes — each bakes the full essay body + an Article JSON-LD node.
  for (const tPath of thoughtPaths()) {
    routes.push({ path: tPath, meta: thoughtMeta(tPath.split('/').pop()) });
  }
  // Dynamic per-guide routes — each bakes the full guide prose + an Article JSON-LD node.
  for (const gPath of guidePaths()) {
    routes.push({ path: gPath, meta: guideMeta(gPath.split('/').pop()) });
  }
  // Dynamic per-diagram routes — each bakes the caption + alt prose (crawlable) and an
  // ImageObject JSON-LD node backref-ing the canonical #person. Pass the SAME corpus to
  // diagramPaths + diagramMeta so an injected test corpus resolves on lookup.
  for (const dPath of diagramPaths(diagrams)) {
    routes.push({ path: dPath, meta: diagramMeta(dPath.split('/').pop(), diagrams) });
  }
  return routes;
}

// The build-generated sitemap entries appended to the committed public/sitemap.xml
// (which carries only static + case-study routes). Thought / guide / diagram corpora
// are emitted here so a substrate-sync — which only commits constants.generated.ts —
// stays in lockstep with ZERO sitemap hand-maintenance. Empty corpora contribute
// nothing (the render* fns return '' and .filter(Boolean) drops them) so no orphan
// <image:image> child is ever written. Diagram corpus injectable (see collectRoutes).
export function buildSitemapExtraEntries(diagrams: Diagram[] = DIAGRAMS): string {
  return [
    renderThoughtSitemapEntries(),
    renderGuideSitemapEntries(),
    renderDiagramSitemapEntries(diagrams),
  ]
    .filter(Boolean)
    .join('\n');
}

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

  const routes = collectRoutes();

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
    // 3) crawlable <body> content — W1 body-bake (thought routes carry the
    // markdown-rendered body; everything else keeps the h1 + paragraph shape)
    html = injectBlock(
      html,
      BODY_BLOCK_START,
      BODY_BLOCK_END,
      renderBodyBlock(routePath, meta, renderedThoughtBody(routePath)),
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
  const extraEntries = buildSitemapExtraEntries();
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
      `${caseStudyPaths().length} case studies + ${thoughtPaths().length} thoughts + ` +
      `${guidePaths().length} guides + ${diagramPaths().length} diagrams) ` +
      `+ injected ${thoughtPaths().length} thought + ${guidePaths().length} guide + ` +
      `${diagramPaths().length} diagram entries into build/sitemap.xml`,
  );
}

// Entry-guard: run the injector ONLY when invoked as the CLI (npm run build →
// `tsx scripts/injectRouteMeta.ts`), not when imported by a test. This is what
// makes collectRoutes / buildSitemapExtraEntries unit-testable — importing the
// module no longer fires the build-time bake (which would fail with no build/ dir).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[injectRouteMeta] FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
