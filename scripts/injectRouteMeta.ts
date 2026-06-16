// Build-time per-route SEO meta injector.
//
// Why this exists: danmercede.com is a react-router SPA whose per-route <head>
// meta is set at runtime by usePageMeta (post-hydration). No-JS crawlers and
// social unfurlers hitting a deep link (/about, /proof, /case-studies/:slug)
// therefore read the homepage's meta. This postbuild step emits one static
// HTML file per route with the correct head, served by Vercel's filesystem
// precedence (before the SPA catch-all rewrite) — no server, no framework, and
// no React executed in Node (so it is unaffected by the esm.sh importmap that
// externalizes React).
//
// Routing: emits build/<route>/index.html (directory-index), which Vercel
// serves for /<route> via filesystem precedence. No vercel.json change needed.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ROUTE_META,
  caseStudyMeta,
  caseStudyPaths,
  renderSeoBlock,
  injectSeoBlock,
  SEO_BLOCK_START,
  type RouteMeta,
} from '../seoMeta';

const BUILD_DIR = path.resolve(process.cwd(), 'build');

async function main() {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  const baseHtml = await fs.readFile(indexPath, 'utf8').catch(() => {
    throw new Error(`${indexPath} not found — run \`vite build\` first.`);
  });
  if (!baseHtml.includes(SEO_BLOCK_START)) {
    throw new Error(
      `SEO block anchors (${SEO_BLOCK_START}) not found in build/index.html — did the index.html anchors survive the build?`,
    );
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

  let written = 0;
  for (const { path: routePath, meta } of routes) {
    const html = injectSeoBlock(baseHtml, renderSeoBlock(routePath, meta));
    const outDir = path.join(BUILD_DIR, routePath.replace(/^\//, ''));
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    written++;
  }

  console.log(
    `[injectRouteMeta] wrote ${written} per-route static HTML files ` +
      `(${routes.length} routes: ${Object.keys(ROUTE_META).length - 1} static + ${caseStudyPaths().length} case studies)`,
  );
}

main().catch((err) => {
  console.error('[injectRouteMeta] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
