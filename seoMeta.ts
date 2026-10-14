import { CASE_STUDIES, WORKS, THOUGHTS, GUIDES, DIAGRAMS, REFERENCE_ARCHITECTURE_NOTICE } from './constants';
import type { Diagram } from './types';

// Single source of truth for per-route <head> SEO meta. Consumed by BOTH the
// runtime `usePageMeta` hook (App.tsx) and the build-time prerender injector
// (scripts/injectRouteMeta.ts), so the runtime head and the crawler-facing
// static head can never drift.

export const SITE_ORIGIN = 'https://www.danmercede.com';
// The verified, live social card (1200x630 JPEG). Unifies the previous
// static-vs-runtime og:image mismatch onto one asset.
export const DEFAULT_OG_IMAGE_PATH = '/dan-mercede-og-card.jpg';
export const DEFAULT_META_DESCRIPTION =
  'Dan Mercede is an operator and systems builder who helps teams turn AI from experiments into owned, governed workflows they can actually run. Governance and reliability are proof depth, not the pitch.';
export const DEFAULT_TITLE =
  'Dan Mercede: Operator, Systems Builder, and Governed AI Architect';

// HTML comment anchors delimiting the swappable SEO block in index.html.
// Verified to survive `vite build` (Vite preserves HTML comments).
export const SEO_BLOCK_START = '<!--SEO_BLOCK-->';
export const SEO_BLOCK_END = '<!--/SEO_BLOCK-->';

// Anchors delimiting the per-route JSON-LD block injected into <head>. The
// homepage entity graph (Person/WebSite/ImageObject) stays static below this
// block; content routes get an additional Article/ProfilePage + BreadcrumbList.
export const JSONLD_BLOCK_START = '<!--ROUTE_JSONLD-->';
export const JSONLD_BLOCK_END = '<!--/ROUTE_JSONLD-->';

// Stable @id anchors for the homepage entity graph (defined in index.html).
// Per-route JSON-LD links back to these so the answer-engine entity graph
// resolves to one canonical Person/WebSite.
export const PERSON_ID = `${SITE_ORIGIN}/#person`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

const OG_IMAGE_ALT =
  'Dan Mercede, founder, operator, and systems builder';

export interface RouteMeta {
  title: string;
  description?: string;
  ogImage?: string;
  // JSON-LD primary @type for the route's content node (W4). One of
  // 'Article' | 'ProfilePage' | 'CollectionPage'. Omitted routes get no
  // per-route content node (only the homepage entity graph + a BreadcrumbList).
  // CollectionPage drives the /works surface: a portfolio collection whose items
  // are SoftwareSourceCode nodes, all backref-ing the canonical #person.
  // ImageObject drives the /diagrams/<slug> surface: a figure whose author/
  // publisher backref the canonical #person.
  schemaType?: 'Article' | 'ProfilePage' | 'CollectionPage' | 'ImageObject';
  // Diagram-route fields consumed by the ImageObject JSON-LD branch: the absolute
  // image contentUrl and the alt text (rendered as the ImageObject.description).
  diagramSrc?: string;
  diagramAlt?: string;
  // Open Graph object type. Defaults to 'profile' because the site is a personal
  // brand surface; article-shaped routes set 'article' so the card type and the
  // article:* properties match the content. Deliberately per-route rather than
  // derived from schemaType: 'Article' is ALSO carried by listing surfaces like
  // /thoughts and /guides, which are collections and must stay 'profile'.
  ogType?: 'article' | 'profile';
  // ISO publish date (YYYY-MM-DD) for article-shaped routes. Feeds both
  // article:published_time and the Article JSON-LD datePublished/dateModified.
  datePublished?: string;
  // Clean content headline for JSON-LD, without the SEO title's brand suffix.
  // Falls back to title when absent.
  headline?: string;
  // Full-length description for the JSON-LD Article node. The meta-tag
  // description is length-capped for SERP display; structured data keeps the
  // complete text, so capping the tag costs no machine-readable detail.
  articleDescription?: string;
}

// Static routes (mirrors the <Route> table in App.tsx). The homepage entry is
// the default that lives un-injected in index.html.

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: DEFAULT_TITLE,
    schemaType: 'ProfilePage',
  },
  '/about': {
    title: 'About: Dan Mercede',
    description:
      'Former General Manager with full P&L ownership, now building AI workflows with clear ownership, a private AI control plane, and open-source tools.',
    schemaType: 'ProfilePage',
  },
  '/ecosystem': {
    title: 'Ecosystem: Orion Ventures | Dan Mercede',
    schemaType: 'ProfilePage',
  },
  '/proof': {
    title: 'Proof: Evidence, Approach, and Resources | Dan Mercede',
    description:
      'Evidence first: checkable claims, each paired with the check that confirms it. Then how the systems are built, illustrative reference architectures, and commercial and speaking material, each labeled for what it is.',
    schemaType: 'Article',
  },
  '/thoughts': {
    title: 'Thoughts: Notes from the Operating Layer | Dan Mercede',
    description:
      'Essays on governed AI, workflow ownership, operator-led automation, and the failure modes that show up when systems meet reality.',
    schemaType: 'Article',
  },
  '/works': {
    title: 'Works: Build, Selected Essays & Signal | Dan Mercede',
    description:
      'Open-source tooling and field-tested patterns from shipping governed agentic systems in production, with selected essays on the doctrine behind the build.',
    schemaType: 'CollectionPage',
  },
  '/guides': {
    title: 'Guides: Agent Engineering, Workflow Ownership & Operations | Dan Mercede',
    description:
      'Long-form technical guides on governed AI: build agents that can act and prove what happened. Multi-agent pipelines, layered review, fail-closed execution, self-hosting, and secure ingress on infrastructure you control.',
    schemaType: 'Article',
  },
  // The '/diagrams' INDEX route. Held out of PR-com-1 (empty allowlist would have made
  // this a thin, sitemap-advertised, content-less page); restored here in the admission
  // regen now that DIAGRAMS is populated, so the index goes live baked + sitemapped WITH
  // content. Mirrors the /thoughts + /guides index entries (schemaType Article).
  '/diagrams': {
    title: 'Diagrams: Systems & Architecture | Dan Mercede',
    description:
      'Architecture and systems diagrams for operator-led AI, workflow ownership, and the patterns that keep reliability intact under load.',
    schemaType: 'Article',
  },
  '/connect': {
    title: 'Contact: Roles, Speaking, and Collaboration | Dan Mercede',
    description:
      'Contact Dan Mercede about hiring or team roles, speaking, open-source collaboration, or AI implementation work through Orion Intelligence Agency.',
  },
  '/legal': {
    title: 'Legal Notice | Dan Mercede',
    description:
      'Terms and conditions for danmercede.com, intellectual property, limitation of liability, and usage terms.',
  },
  '/privacy': {
    title: 'Privacy Policy: Data Governance | Dan Mercede',
    description:
      'Privacy policy for danmercede.com, data collection, cookies, and tracking practices.',
  },
  '/imprint': {
    title: 'Imprint: Entity Details | Dan Mercede',
    description:
      'Imprint and entity information for danmercede.com, operating entity, responsible person, jurisdiction.',
  },
};

// Dynamic case-study meta. The title FORMAT lives here only, so the runtime
// (CaseStudyPage) and the prerender injector produce identical strings.
export function caseStudyMeta(slug: string | undefined): RouteMeta {
  const study = CASE_STUDIES.find((cs) => cs.slug === slug);
  if (!study) {
    return { title: 'Reference Architecture Not Found | Dan Mercede' };
  }
  return {
    // The infix reads ": Reference Architecture" so the crawler and no-JS
    // title matches the on-page framing and the download filename. Splitting the
    // claim across surfaces is what the 2026-07-26 honesty pass exists to stop.
    title: `${study.title}: Reference Architecture | Dan Mercede`,
    // The notice leads the snippet and the Article node too, so a search result or
    // a structured-data consumer sees the status before any architecture detail.
    description: truncateForMeta(`${REFERENCE_ARCHITECTURE_NOTICE} ${study.description}`),
    articleDescription: `${REFERENCE_ARCHITECTURE_NOTICE} ${study.description}`,
    headline: study.title,
    // CaseStudy carries no date, so the dateless article branch applies:
    // article:published_time is omitted and the JSON-LD node carries no dates.
    ogType: 'article',
    schemaType: 'Article',
  };
}

// All case-study route paths, derived from committed content, so a new case
// study is prerendered automatically with no hand-maintained slug list.
export function caseStudyPaths(): string[] {
  return CASE_STUDIES.filter((cs) => cs.slug).map((cs) => `/case-studies/${cs.slug}`);
}

// The OSS microsites served under /works/<slug>/ (the hub Vercel-rewrites those paths
// to each microsite's own deployment). They are real, indexable pages on this origin , 
// derived from WORKS cards whose link is a same-origin /works/ path, so the committed
// sitemap must list them. They are deliberately NOT in ROUTE_META: injectRouteMeta must
// not emit a physical build/works/<slug>/index.html, which Vercel filesystem precedence
// would serve INSTEAD of the rewrite proxy (shadowing the cutover).
export function worksMicrositePaths(): string[] {
  return WORKS.map((w) => w.link)
    .filter((l): l is string => !!l)
    .map((l) => {
      try {
        const url = new URL(l, SITE_ORIGIN);
        if (url.origin !== SITE_ORIGIN || !url.pathname.startsWith('/works/')) {
          return null;
        }
        const slug = url.pathname.slice('/works/'.length);
        return slug ? url.pathname : null;
      } catch {
        return null;
      }
    })
    .filter((p): p is string => p !== null);
}

// Dynamic per-thought meta (round-2 R1/R2). The title FORMAT lives here only so
// the runtime (ThoughtDetailPage) and the prerender injector emit identical
// strings. JSON-LD is an Article authored/published by the canonical #person
// (never a competing Person node, never FAQPage).
export function thoughtMeta(slug: string | undefined): RouteMeta {
  const thought = THOUGHTS.find((t) => t.slug === slug);
  if (!thought) {
    return { title: 'Thought Not Found | Dan Mercede' };
  }
  return {
    // No ": Thought" infix: the kind is already carried by the /thoughts/ path
    // and the Article schema, and the redundant token only eats title budget.
    title: `${thought.title} | Dan Mercede`,
    // The preview (substrate `claim`) is the thesis, the ideal meta description,
    // but most previews exceed the SERP display cap. The tag is truncated; the
    // full text survives on articleDescription and reaches the JSON-LD node.
    description: truncateForMeta(thought.preview),
    articleDescription: thought.preview,
    headline: thought.title,
    ogType: 'article',
    datePublished: thought.date,
    schemaType: 'Article',
  };
}

// All per-thought route paths, derived from the committed THOUGHTS corpus, so
// a newly-compiled canonical is prerendered + sitemap-covered automatically
// with no hand-maintained slug list. Closes the round-1 gap where the corpus
// was outside both the route set AND the sitemap.
export function thoughtPaths(): string[] {
  return THOUGHTS.filter((t) => t.slug).map((t) => `/thoughts/${t.slug}`);
}

// Per-thought <url> sitemap blocks, GENERATED at build time (injectRouteMeta
// writes them into build/sitemap.xml). The committed public/sitemap.xml carries
// only the static + case-study routes; the thought entries are derived from the
// THOUGHTS corpus here so a substrate-sync that adds/removes a thought stays in
// lockstep with ZERO hand-maintenance (substrate-sync only commits
// constants.generated.ts, it must not need to also edit the sitemap). lastmod =
// each essay's own publish date (never a build-time bump, W9 lastmod policy).
export function renderThoughtSitemapEntries(): string {
  const blocks = THOUGHTS.filter((t) => t.slug).map((t) =>
    [
      '  <url>',
      `    <loc>${SITE_ORIGIN}/thoughts/${t.slug}</loc>`,
      `    <lastmod>${t.date}</lastmod>`,
      '    <changefreq>monthly</changefreq>',
      '    <priority>0.7</priority>',
      '  </url>',
    ].join('\n'),
  );
  if (blocks.length === 0) return '';
  return (
    '  <!-- Thought corpus (per-thought routes; lastmod = each essay publish date, R2; generated at build from THOUGHTS) -->\n' +
    blocks.join('\n')
  );
}

// Dynamic per-guide meta (mirrors thoughtMeta). JSON-LD is an Article authored/published by the canonical #person.
export function guideMeta(slug: string | undefined): RouteMeta {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) {
    return { title: 'Guide Not Found | Dan Mercede' };
  }
  return {
    // No ": Guide" infix: the kind is already carried by the /guides/ path and
    // the Article schema, and the redundant token only eats SERP title budget.
    title: `${guide.title} | Dan Mercede`,
    description: truncateForMeta(guide.description),
    articleDescription: guide.description,
    headline: guide.title,
    ogType: 'article',
    datePublished: guide.date,
    schemaType: 'Article',
  };
}

// All per-guide route paths, derived from the committed GUIDES corpus, so a new
// guide is prerendered + sitemap-covered automatically with no hand-maintained
// slug list (mirrors thoughtPaths).
export function guidePaths(): string[] {
  return GUIDES.filter((g) => g.slug).map((g) => `/guides/${g.slug}`);
}

// Per-guide <url> sitemap blocks, generated at build time (mirrors
// renderThoughtSitemapEntries). lastmod = each guide's own publish date.
export function renderGuideSitemapEntries(): string {
  const blocks = GUIDES.filter((g) => g.slug).map((g) =>
    [
      '  <url>',
      `    <loc>${SITE_ORIGIN}/guides/${g.slug}</loc>`,
      `    <lastmod>${g.date}</lastmod>`,
      '    <changefreq>monthly</changefreq>',
      '    <priority>0.7</priority>',
      '  </url>',
    ].join('\n'),
  );
  if (blocks.length === 0) return '';
  return (
    '  <!-- Guides corpus (per-guide routes; generated at build from GUIDES) -->\n' +
    blocks.join('\n')
  );
}

// Dynamic per-diagram meta (mirrors guideMeta). schemaType ImageObject. Corpus is
// injectable for testing; the in-repo DIAGRAMS is empty until the substrate-sync regen.
export function diagramMeta(slug: string | undefined, corpus: Diagram[] = DIAGRAMS): RouteMeta {
  const diagram = corpus.find((d) => d.slug === slug);
  if (!diagram) {
    return { title: 'Diagram Not Found | Dan Mercede' };
  }
  return {
    title: `${diagram.title}: Diagram | Dan Mercede`,
    description: diagram.caption,
    schemaType: 'ImageObject',
    diagramSrc: new URL(diagram.src, SITE_ORIGIN).toString(),
    diagramAlt: diagram.alt,
  };
}

// All per-diagram route paths, derived from the DIAGRAMS corpus (mirrors
// guidePaths/thoughtPaths). Corpus injectable for testing.
export function diagramPaths(corpus: Diagram[] = DIAGRAMS): string[] {
  return corpus.filter((d) => d.slug).map((d) => `/diagrams/${d.slug}`);
}

// Per-diagram <url> sitemap blocks WITH a Google image-sitemap <image:image>
// child (image:loc = absolute diagram src, image:caption). Generated at build
// (mirrors renderGuideSitemapEntries); lastmod = the diagram's own date. The
// <urlset> must declare xmlns:image for these children to validate (injectRouteMeta
// adds it to the committed sitemap).
export function renderDiagramSitemapEntries(corpus: Diagram[] = DIAGRAMS): string {
  const blocks = corpus.filter((d) => d.slug).map((d) =>
    [
      '  <url>',
      `    <loc>${SITE_ORIGIN}/diagrams/${d.slug}</loc>`,
      `    <lastmod>${d.date}</lastmod>`,
      '    <changefreq>monthly</changefreq>',
      '    <priority>0.6</priority>',
      '    <image:image>',
      `      <image:loc>${escapeText(SITE_ORIGIN + d.src)}</image:loc>`,
      `      <image:caption>${escapeText(d.caption)}</image:caption>`,
      '    </image:image>',
      '  </url>',
    ].join('\n'),
  );
  if (blocks.length === 0) return '';
  return (
    '  <!-- Diagram corpus (per-diagram routes + image-sitemap; generated at build from DIAGRAMS) -->\n' +
    blocks.join('\n')
  );
}

export function resolveMeta(m: RouteMeta) {
  return {
    title: m.title || DEFAULT_TITLE,
    description: m.description ?? DEFAULT_META_DESCRIPTION,
    ogImagePath: m.ogImage ?? DEFAULT_OG_IMAGE_PATH,
  };
}

// Search engines truncate the displayed description around 155-160 characters,
// so anything past that is invisible weight in the <head>. Cap at a word
// boundary rather than mid-word. The untruncated text is preserved separately
// on RouteMeta.articleDescription for the JSON-LD node.
export const META_DESCRIPTION_MAX = 160;

export function truncateForMeta(text: string, max: number = META_DESCRIPTION_MAX): string {
  const s = text.trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  // Caps below the ellipsis length need their own branch: s.slice(0, max - 3)
  // takes a NEGATIVE index for max < 3 and would return nearly the whole string
  // before appending '...', producing output LONGER than the cap.
  if (max <= 0) return '';
  if (max < 3) return s.slice(0, max);
  const cut = s.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(' ');
  // Only honour the word boundary if it is not absurdly early (a single very
  // long token would otherwise collapse the whole description to an ellipsis).
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s,;:.]+$/, '')}...`;
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// article:author is spec-typed by Open Graph as a `profile` OBJECT, not a display
// name, so it must be the URL of a page that itself declares og:type=profile.
// /about is that page (ProfilePage schema, profile:* pair, prerendered, sitemapped).
// Derived from SITE_ORIGIN so it cannot drift from the canonical origin. Note this
// is deliberately NOT PERSON_ID: that is a JSON-LD @id whose #fragment is never
// sent to a server, so any consumer dereferencing it lands on the homepage.
export const ARTICLE_AUTHOR_URL = new URL('/about', SITE_ORIGIN).toString();

// The COMPLETE set of og:type-scoped properties. Anything listed here is either
// emitted or explicitly removed, never left stranded.
export const TYPE_SCOPED_META_PROPS = [
  'article:published_time',
  'article:author',
  'profile:first_name',
  'profile:last_name',
] as const;

// Single source of truth for which meta properties belong to which og:type,
// shared by the static renderer (renderSeoBlock) and the runtime head hook
// (usePageMeta in App.tsx). Duplicating this branch is exactly what let the
// hydrated head drift from the served head on client-side navigation: og:type
// flipped while the other type's properties stayed behind. Returning both the
// ADD set and the REMOVE set means a property added here is automatically
// stripped on the branch that does not emit it.
export function typeScopedMetaTags(
  m: Pick<RouteMeta, 'ogType' | 'datePublished'>,
): { add: [string, string][]; remove: string[] } {
  const add: [string, string][] =
    m.ogType === 'article'
      ? [
          ...(m.datePublished
            ? ([['article:published_time', m.datePublished]] as [string, string][])
            : []),
          ['article:author', ARTICLE_AUTHOR_URL],
        ]
      : [
          ['profile:first_name', 'Dan'],
          ['profile:last_name', 'Mercede'],
        ];
  const added = new Set(add.map(([prop]) => prop));
  return { add, remove: TYPE_SCOPED_META_PROPS.filter((p) => !added.has(p)) };
}

// Render the static <head> SEO tag block for a route. Deterministic; never
// executes React or touches a DOM, so it is safe in a Node build.
export function renderSeoBlock(path: string, m: RouteMeta): string {
  const r = resolveMeta(m);
  const canonical = new URL(path, SITE_ORIGIN).toString();
  const ogImageUrl = new URL(r.ogImagePath, SITE_ORIGIN).toString();
  const t = escapeAttr(r.title);
  const d = escapeAttr(r.description);
  const alt = escapeAttr(OG_IMAGE_ALT);
  return [
    // Preload the LCP hero, HOMEPAGE ONLY. The hero <img> renders only on
    // HomePage, so preloading it on other routes downloads the hero asset they never use.
    ...(path === '/'
      ? [`  <link rel="preload" as="image" href="/dan-mercede-founder-headshot-hero.webp" fetchpriority="high" />`]
      : []),
    `  <title>${t}</title>`,
    `  <meta name="description" content="${d}" />`,
    `  <meta name="robots" content="index, follow, max-image-preview:large" />`,
    `  <link rel="canonical" href="${canonical}" />`,
    `  <meta property="og:type" content="${m.ogType ?? 'profile'}" />`,
    `  <meta property="og:site_name" content="Dan Mercede" />`,
    `  <meta property="og:title" content="${t}" />`,
    `  <meta property="og:description" content="${d}" />`,
    `  <meta property="og:url" content="${canonical}" />`,
    `  <meta property="og:image" content="${ogImageUrl}" />`,
    `  <meta property="og:image:type" content="image/jpeg" />`,
    `  <meta property="og:image:width" content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta property="og:image:alt" content="${alt}" />`,
    // Type-scoped properties come from typeScopedMetaTags, the single source
    // shared with the runtime head hook. Routes with no ogType keep the profile
    // pair verbatim, holding the homepage block byte-identical to index.html
    // (guarded by tests/injectRouteMeta.test.ts).
    ...typeScopedMetaTags(m).add.map(
      ([prop, content]) => `  <meta property="${prop}" content="${escapeAttr(content)}" />`,
    ),
    `  <meta name="twitter:card" content="summary_large_image" />`,
    `  <meta name="twitter:site" content="@danmercede" />`,
    `  <meta name="twitter:creator" content="@danmercede" />`,
    `  <meta name="twitter:title" content="${t}" />`,
    `  <meta name="twitter:description" content="${d}" />`,
    `  <meta name="twitter:image" content="${ogImageUrl}" />`,
    `  <meta name="twitter:image:alt" content="${alt}" />`,
  ].join('\n');
}

// Replace the content between the SEO anchors with a freshly-rendered block.
export function injectSeoBlock(html: string, blockBody: string): string {
  return injectBlock(html, SEO_BLOCK_START, SEO_BLOCK_END, blockBody, '  ');
}

// Generic anchored-region replacer used by the SEO/body/JSON-LD injectors. The
// content between `startMarker` and `endMarker` is replaced; the markers
// themselves survive so a re-run is idempotent. `indent` is the whitespace
// placed before the closing marker (cosmetic, to keep emitted HTML tidy).
export function injectBlock(
  html: string,
  startMarker: string,
  endMarker: string,
  blockBody: string,
  indent = '',
): string {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`block markers not found in HTML (${startMarker})`);
  }
  const before = html.slice(0, start + startMarker.length);
  const after = html.slice(end);
  return `${before}\n${blockBody}\n${indent}${after}`;
}

// Escape text destined for HTML text content (not an attribute). Closes the
// `</`-injection vector and ampersands so baked copy can never break out of the
// element it sits in. Total over null/undefined (a route/case-study with a
// missing optional field must never crash the build-time generator).
function escapeText(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escape a serialized JSON string for safe embedding inside an HTML
// <script type="application/ld+json"> element. JSON.stringify alone leaves a
// literal `</script>` (e.g. inside a title/description) able to close the tag
// early and inject markup. We escape the full `< > &` set (acceptance
// criterion 5) plus
// the U+2028/U+2029 line/para separators for strict JS parsers. `\uXXXX`
// escapes keep the JSON byte-for-byte equivalent (JSON.parse decodes them back
// to the original string) while making any markup breakout impossible.
// Standard JSON-LD-in-HTML hardening.
function escapeJsonForHtml(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// Render the per-route JSON-LD block (W4): an Article or ProfilePage content
// node plus a BreadcrumbList, both linked to the canonical homepage entity
// graph (#person / #website) so answer engines resolve one Dan Mercede entity.
// FAQPage is intentionally NOT emitted, its rich result was deprecated 2026.
// The route metadata the build bakes for a path, or null when no page exists at
// it. The build (collectRoutes) and the client (route JSON-LD after an in-app
// navigation) both resolve paths through the same families, so a page is
// described the same way however the visitor arrived. A trailing slash is the
// same route.
export function routeMetaFor(pathname: string, diagrams: Diagram[] = DIAGRAMS): RouteMeta | null {
  const route = pathname.replace(/\/+$/, '') || '/';
  if (Object.prototype.hasOwnProperty.call(ROUTE_META, route)) return ROUTE_META[route];
  const slug = route.split('/').pop();
  if (caseStudyPaths().includes(route)) return caseStudyMeta(slug);
  if (thoughtPaths().includes(route)) return thoughtMeta(slug);
  if (guidePaths().includes(route)) return guideMeta(slug);
  if (diagramPaths(diagrams).includes(route)) return diagramMeta(slug, diagrams);
  return null;
}

// The JSON text of a route's JSON-LD script, exactly as renderRouteJsonLd bakes
// it; the client inserts the same text after an in-app navigation.
export function routeJsonLdText(path: string, m: RouteMeta): string {
  return escapeJsonForHtml(JSON.stringify(routeJsonLdDoc(path, m), null, 2));
}

export function renderRouteJsonLd(path: string, m: RouteMeta): string {
  return `  <script type="application/ld+json">\n${routeJsonLdText(path, m)}\n  </script>`;
}

function routeJsonLdDoc(path: string, m: RouteMeta): Record<string, unknown> {
  const r = resolveMeta(m);
  const canonical = new URL(path, SITE_ORIGIN).toString();
  const graph: Record<string, unknown>[] = [];

  if (m.schemaType === 'Article') {
    graph.push({
      '@type': 'Article',
      '@id': `${canonical}#article`,
      // Clean content headline, not the brand-suffixed SEO title.
      headline: m.headline ?? r.title,
      // Structured data keeps the full description even when the meta tag is capped.
      description: m.articleDescription ?? r.description,
      url: canonical,
      image: new URL(r.ogImagePath, SITE_ORIGIN).toString(),
      ...(m.datePublished
        ? { datePublished: m.datePublished, dateModified: m.datePublished }
        : {}),
      author: { '@id': PERSON_ID },
      publisher: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID },
      mainEntityOfPage: canonical,
    });
  } else if (m.schemaType === 'ProfilePage') {
    graph.push({
      '@type': 'ProfilePage',
      '@id': `${canonical}#profilepage`,
      name: r.title,
      description: r.description,
      url: canonical,
      mainEntity: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID },
    });
  } else if (m.schemaType === 'CollectionPage') {
    // /works: a portfolio CollectionPage whose mainEntity is the canonical
    // #person and whose hasPart lists SoftwareSourceCode works. Every node
    // backrefs #person by @id (creator), NO second Person is introduced, so
    // the single-Person identity invariant (tests/identityCanonical.test.ts)
    // holds. NB: extending RouteMeta.schemaType WITHOUT this branch would emit
    // only a BreadcrumbList (silent no-op); both edits are required.
    graph.push({
      '@type': 'CollectionPage',
      '@id': `${canonical}#works-collection`,
      name: r.title,
      description: r.description,
      url: canonical,
      mainEntity: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID },
      hasPart: WORKS.map((w) => ({
        '@type': 'SoftwareSourceCode',
        '@id': `${canonical}#${w.slug}`,
        name: w.title,
        description: w.description,
        url: w.link || w.repo,
        codeRepository: w.repo,
        creator: { '@id': PERSON_ID },
        ...(w.license ? { license: w.license } : {}),
        ...(w.date ? { datePublished: w.date } : {}),
      })),
    });
  } else if (m.schemaType === 'ImageObject') {
    // /diagrams/<slug>: the figure as an ImageObject; author/publisher backref the
    // canonical #person (NO second Person node, identityCanonical.test.ts). NB:
    // extending RouteMeta.schemaType WITHOUT this branch would emit only a
    // BreadcrumbList (silent no-op), both edits are required.
    graph.push({
      '@type': 'ImageObject',
      '@id': `${canonical}#image`,
      name: breadcrumbLabel(r.title),
      caption: r.description,
      description: m.diagramAlt ?? r.description,
      contentUrl: m.diagramSrc ?? canonical,
      url: canonical,
      author: { '@id': PERSON_ID },
      publisher: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID },
    });
  }

  graph.push(renderBreadcrumb(path, breadcrumbLabel(r.title)));

  return { '@context': 'https://schema.org', '@graph': graph };
}

// Concise breadcrumb leaf: strip the trailing brand suffix (", Dan Mercede" /
// " | Dan Mercede") so the crumb is the page label, not the full SEO <title>.
function breadcrumbLabel(title: string): string {
  return title.replace(/\s*[, |]\s*Dan Mercede\s*$/, '').trim();
}

// BreadcrumbList from the homepage down to the current route. Single-segment
// routes (/about) get Home > Title; case studies get Home > Proof > Title.
function renderBreadcrumb(path: string, leafName: string): Record<string, unknown> {
  const items: Array<{ name: string; url: string }> = [
    { name: 'Home', url: `${SITE_ORIGIN}/` },
  ];
  if (path.startsWith('/case-studies/')) {
    items.push({ name: 'Proof', url: new URL('/proof', SITE_ORIGIN).toString() });
  }
  // Per-thought detail pages sit under the /thoughts index: Home > Thoughts > Title.
  if (path.startsWith('/thoughts/')) {
    items.push({ name: 'Thoughts', url: new URL('/thoughts', SITE_ORIGIN).toString() });
  }
  if (path.startsWith('/guides/')) {
    items.push({ name: 'Guides', url: new URL('/guides', SITE_ORIGIN).toString() });
  }
  if (path.startsWith('/diagrams/')) {
    items.push({ name: 'Diagrams', url: new URL('/diagrams', SITE_ORIGIN).toString() });
  }
  if (path !== '/') {
    items.push({ name: leafName, url: new URL(path, SITE_ORIGIN).toString() });
  }
  return {
    '@type': 'BreadcrumbList',
    '@id': `${new URL(path, SITE_ORIGIN).toString()}#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
