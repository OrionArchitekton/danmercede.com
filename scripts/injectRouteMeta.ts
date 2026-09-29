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
// served by Vercel from the filesystem (an unknown path gets build/404.html).
// No server and no framework. React runs in Node only to render essay markdown
// (renderToStaticMarkup below), from the same bundled React the client uses.
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
  escapeAttr,
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

// Visible initial HTML (specs/visible-initial-html-spec.md): routes whose initial
// HTML carries the real page render inside #root instead of the hidden crawl
// block. It grows slice by slice; emptying it restores the baseline output.
// S3: every published route (the homepage plus everything collectRoutes emits).
// Rollback: replace with an empty Set, and the build emits the baseline output.
export const RENDERED_ROUTES: ReadonlySet<string> = new Set(['/', ...collectRoutes().map((r) => r.path)]);

// The build-time render bundle (`vite build --ssr entry-server.tsx`), written
// outside the deployed build/ directory.
const SSR_ENTRY = path.resolve(process.cwd(), 'build-ssr', 'entry-server.js');

const EMPTY_ROOT = '<div id="root"></div>';

// The empty template vite emits, saved for injector re-runs (see main()).
const TEMPLATE_COPY = path.resolve(process.cwd(), 'build-ssr', 'index.template.html');

// Put a route's page render inside #root, stamped with the path it was rendered
// for (the client hydrates only on that path), and drop the crawl block so the
// page text appears once. The block anchors stay in place.
export function injectPageRender(html: string, routePath: string, markup: string): string {
  const roots = html.split(EMPTY_ROOT).length - 1;
  if (roots !== 1) throw new Error(`expected exactly one empty #root in the template, found ${roots}`);
  const withoutCrawlBlock = injectBlock(html, BODY_BLOCK_START, BODY_BLOCK_END, '', '  ');
  // A replacer function, so `$&` or `$1` in the markup is inserted verbatim.
  return withoutCrawlBlock.replace(EMPTY_ROOT, () => `<div id="root" data-rendered-path="${escapeAttr(routePath)}">${markup}</div>`);
}

async function loadPageRenderer(): Promise<(url: string) => string> {
  try {
    await fs.access(SSR_ENTRY);
  } catch {
    throw new Error(`${SSR_ENTRY} not found; run \`vite build --ssr entry-server.tsx\` first.`);
  }
  const mod = (await import(pathToFileURL(SSR_ENTRY).href)) as { render: (url: string) => string };
  return mod.render;
}

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

// build/404.html: Vercel serves it with HTTP 404 for any path that matches no
// file and no rewrite. It keeps the app shell so NotFoundPage still renders, but
// the head is noindex with no canonical (the file answers arbitrary URLs), and the
// homepage prerender body is replaced and all structured data is removed.
export function renderNotFoundHtml(baseHtml: string): string {
  const seo = [
    '  <title>Page Not Found | Dan Mercede</title>',
    '  <meta name="description" content="This page does not exist on danmercede.com." />',
    '  <meta name="robots" content="noindex, follow" />',
  ].join('\n');
  let html = injectSeoBlock(baseHtml, seo);
  html = injectBlock(html, JSONLD_BLOCK_START, JSONLD_BLOCK_END, '', '  ');
  html = injectBlock(
    html,
    BODY_BLOCK_START,
    BODY_BLOCK_END,
    renderBodyBlock('/404', {
      title: 'Page Not Found | Dan Mercede',
      body: { h1: 'Page Not Found', paragraphs: ['This page does not exist. Start from the homepage or browse selected work at /works.'] },
    }),
    '  ',
  );
  // The site-wide entity graph (Person / WebSite / ImageObject) lives outside the
  // anchors in index.html; a 404 describes no entity, so drop every JSON-LD block.
  return html.replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '');
}

async function main() {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  const builtIndex = await fs.readFile(indexPath, 'utf8').catch(() => {
    throw new Error(`${indexPath} not found — run \`vite build\` first.`);
  });
  // The homepage render is written into build/index.html itself, so after one
  // run that file is no longer the empty template every route derives from.
  // Keep the pristine template beside the SSR bundle (outside the deployed
  // build/) and read it back when the injector is re-run without a new
  // `vite build`, so a re-run produces the same output instead of failing.
  let baseHtml: string;
  if (builtIndex.includes(EMPTY_ROOT)) {
    baseHtml = builtIndex;
    await fs.writeFile(TEMPLATE_COPY, baseHtml, 'utf8');
  } else {
    baseHtml = await fs.readFile(TEMPLATE_COPY, 'utf8').catch(() => '');
    if (!baseHtml.includes(EMPTY_ROOT)) {
      throw new Error(`${indexPath} is already rendered and ${TEMPLATE_COPY} is not an empty template; run \`vite build\` first.`);
    }
  }
  for (const anchor of [SEO_BLOCK_START, BODY_BLOCK_START, JSONLD_BLOCK_START]) {
    if (!baseHtml.includes(anchor)) {
      throw new Error(
        `injector anchor (${anchor}) not found in build/index.html — did the index.html anchors survive the build?`,
      );
    }
  }

  const routes = collectRoutes();
  const renderPage = RENDERED_ROUTES.size > 0 ? await loadPageRenderer() : null;

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
    // 4) the real page render inside #root, for the rendered-route set
    if (renderPage && RENDERED_ROUTES.has(routePath)) {
      html = injectPageRender(html, routePath, renderPage(routePath));
    }
    const outDir = path.join(BUILD_DIR, routePath.replace(/^\//, ''));
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    written++;
  }

  // The homepage is build/index.html itself, so it is not in collectRoutes. Its
  // head and JSON-LD are already the homepage's (the template is the homepage);
  // only the page render goes in. baseHtml stays the empty template in memory,
  // so the not-found file below never inherits the homepage render.
  if (renderPage && RENDERED_ROUTES.has('/')) {
    await fs.writeFile(indexPath, injectPageRender(baseHtml, '/', renderPage('/')), 'utf8');
  }

  await fs.writeFile(path.join(BUILD_DIR, '404.html'), renderNotFoundHtml(baseHtml), 'utf8');

  // Regenerate the per-thought sitemap entries into the BUILT sitemap so the
  // served sitemap is always in lockstep with the THOUGHTS corpus. The committed
  // public/sitemap.xml (copied to build/ by Vite) carries only static + case-study
  // routes; a substrate-sync that changes THOUGHTS needs no sitemap edit.
  // Read the committed source, not the built copy: after a previous run the built
  // copy already carries the injected entries, and re-reading it would add them
  // twice. Vite copies public/sitemap.xml verbatim, so the output is the same.
  const sitemapPath = path.join(BUILD_DIR, 'sitemap.xml');
  const sitemapSource = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  const sitemapXml = await fs.readFile(sitemapSource, 'utf8').catch(() => {
    throw new Error(`${sitemapSource} not found; the hub ships a committed sitemap for Vite to copy.`);
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
