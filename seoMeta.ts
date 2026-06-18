import { CASE_STUDIES } from './constants';

// Single source of truth for per-route <head> SEO meta. Consumed by BOTH the
// runtime `usePageMeta` hook (App.tsx) and the build-time prerender injector
// (scripts/injectRouteMeta.ts), so the runtime head and the crawler-facing
// static head can never drift.

export const SITE_ORIGIN = 'https://www.danmercede.com';
// The verified, live social card (1200x630 JPEG). Unifies the previous
// static-vs-runtime og:image mismatch onto one asset.
export const DEFAULT_OG_IMAGE_PATH = '/dan-mercede-og-card.jpg';
export const DEFAULT_META_DESCRIPTION =
  'Dan Mercede is a systems architect and founder focused on building governed AI operating systems, enterprise AI reliability infrastructure, and human-owned intelligence platforms.';
export const DEFAULT_TITLE =
  'Dan Mercede — AI Systems Architect of the Governed AI Operating System';

// HTML comment anchors delimiting the swappable SEO block in index.html.
// Verified to survive `vite build` (Vite preserves HTML comments).
export const SEO_BLOCK_START = '<!--SEO_BLOCK-->';
export const SEO_BLOCK_END = '<!--/SEO_BLOCK-->';

// Anchors delimiting the crawlable body block injected INTO <body>. The SPA
// hydrates over `#root`; this static block is a sibling so it is visible to
// raw-HTML crawlers (ChatGPT/Perplexity/Claude — none execute JS) and replaced
// by React on hydration (it lives outside #root and is removed at runtime).
export const BODY_BLOCK_START = '<!--BODY_BLOCK-->';
export const BODY_BLOCK_END = '<!--/BODY_BLOCK-->';

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
  'Dan Mercede, systems architect and founder of the governed AI operating system';

// Crawlable body copy for a route: one H1 and one or more paragraphs. Sourced
// from the rendered page copy so the static body and the hydrated body agree.
export interface RouteBody {
  h1: string;
  // Lead positioning line, rendered as the first paragraph after the H1.
  lead?: string;
  paragraphs: string[];
}

export interface RouteMeta {
  title: string;
  description?: string;
  ogImage?: string;
  // Crawlable body content baked into <body> at build time (W1). Optional:
  // routes without it fall back to a minimal title+description body.
  body?: RouteBody;
  // JSON-LD primary @type for the route's content node (W4). One of
  // 'Article' | 'ProfilePage'. Omitted routes get no per-route content node
  // (only the homepage entity graph + a BreadcrumbList).
  schemaType?: 'Article' | 'ProfilePage';
}

// Static routes (mirrors the <Route> table in App.tsx). The homepage entry is
// the default that lives un-injected in index.html.
export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: DEFAULT_TITLE,
    schemaType: 'ProfilePage',
    body: {
      h1: 'Dan Mercede',
      lead: "Enterprise AI doesn't fail on capability — it fails at runtime.",
      paragraphs: [
        'I design Runtime-Enforced Governed AI Operating Systems that fail closed, enforce authority, and generate audit-grade receipts.',
        "If governance isn't enforced at runtime, it isn't governance.",
        'Each entity in the ecosystem operates independently but shares a common governance framework and capital structure managed by Orion Apex Capital.',
      ],
    },
  },
  '/about': {
    title: 'About — Dan Mercede',
    description:
      'Systems architect and founder building governed AI operating systems with deterministic enforcement at runtime.',
    schemaType: 'ProfilePage',
    body: {
      h1: 'The Throughline',
      lead: 'From operations to architecture, the mission has remained constant: governance over chaos.',
      paragraphs: [
        'I build governed AI operating systems — systems that remember, decide, execute, and remain auditable under real conditions.',
        "I don't believe in disruption for its own sake. I believe in systems that endure. My background isn't a straight line, but a thematic progression from managing complex human workflows to building the digital substrates that automate them.",
      ],
    },
  },
  '/ecosystem': {
    title: 'Ecosystem — Orion Ventures | Dan Mercede',
    schemaType: 'ProfilePage',
    body: {
      h1: 'Ecosystem',
      lead: 'Orion Ventures — independent entities under one governance framework.',
      paragraphs: [
        'Cosmocrat is the Governed AI Operating System that serves as the control plane for human-owned intelligence, governing how AI systems remember, decide, execute, and are audited over time.',
        'Orion Apex Capital originates, owns, and governs the ecosystem; Orion Intelligence Agency, ReplyBy, Apex Trading Systems, and Path of Life Hub deploy, validate, or operate under the Cosmocrat governance model.',
      ],
    },
  },
  '/proof': {
    title: 'Proof — Runtime Governance Enforcement Artifacts | Dan Mercede',
    description:
      'Downloadable enforcement artifacts mapped to the four-layer runtime governance stack: Authority Gate, Immutable Receipts, Drift Guard, Gated Substrate.',
    schemaType: 'Article',
    body: {
      h1: 'Proof',
      lead: 'Enforcement Artifacts.',
      paragraphs: [
        'Governance is enforced at four deterministic boundaries: Authority, Attestation, Behavioral Constraint, and Physical Isolation.',
        'Downloadable enforcement artifacts map to the four-layer runtime governance stack — Authority Gate, Immutable Receipts, Drift Guard, and Gated Substrate — structured for SOC 2 AI, ISO 42001, and EU AI Act readiness.',
      ],
    },
  },
  '/thoughts': {
    title: 'Thought Direction — Doctrine + Architecture | Dan Mercede',
    description:
      'Essays on runtime governance, enforcement architecture, and the structural requirements for governed intelligence at scale.',
    schemaType: 'Article',
    body: {
      h1: 'Thought Direction',
      lead: 'Doctrine and architecture.',
      paragraphs: [
        'Essays on runtime governance, enforcement architecture, and the structural requirements for governed intelligence at scale.',
      ],
    },
  },
  '/connect': {
    title: 'Connect — Initiate Protocol | Dan Mercede',
    description:
      'Engage with Dan Mercede on governed AI architecture, runtime enforcement, and enterprise reliability engineering.',
    body: {
      h1: 'Connect',
      lead: 'Initiate protocol.',
      paragraphs: [
        'Engage with Dan Mercede on governed AI architecture, runtime enforcement, and enterprise reliability engineering.',
      ],
    },
  },
  '/legal': {
    title: 'Legal Notice | Dan Mercede',
    description:
      'Terms and conditions for danmercede.com — intellectual property, limitation of liability, and usage terms.',
    body: {
      h1: 'Legal Notice',
      paragraphs: [
        'Terms and conditions for danmercede.com — intellectual property, limitation of liability, and usage terms.',
      ],
    },
  },
  '/privacy': {
    title: 'Privacy Policy — Data Governance | Dan Mercede',
    description:
      'Privacy policy for danmercede.com — data collection, cookies, and tracking practices.',
    body: {
      h1: 'Privacy Policy',
      paragraphs: [
        'Privacy policy for danmercede.com — data collection, cookies, and tracking practices.',
      ],
    },
  },
  '/imprint': {
    title: 'Imprint — Entity Details | Dan Mercede',
    description:
      'Imprint and entity information for danmercede.com — operating entity, responsible person, jurisdiction.',
    body: {
      h1: 'Imprint',
      paragraphs: [
        'Imprint and entity information for danmercede.com — operating entity, responsible person, jurisdiction.',
      ],
    },
  },
};

// Dynamic case-study meta. The title FORMAT lives here only, so the runtime
// (CaseStudyPage) and the prerender injector produce identical strings.
export function caseStudyMeta(slug: string | undefined): RouteMeta {
  const study = CASE_STUDIES.find((cs) => cs.slug === slug);
  if (!study) {
    return { title: 'Case Study Not Found | Dan Mercede' };
  }
  return {
    title: `${study.title} — Case Study | Dan Mercede`,
    description: study.description,
    schemaType: 'Article',
    body: {
      h1: study.title,
      lead: study.industry,
      paragraphs: [study.description],
    },
  };
}

// All case-study route paths, derived from committed content — so a new case
// study is prerendered automatically with no hand-maintained slug list.
export function caseStudyPaths(): string[] {
  return CASE_STUDIES.filter((cs) => cs.slug).map((cs) => `/case-studies/${cs.slug}`);
}

export function resolveMeta(m: RouteMeta) {
  return {
    title: m.title || DEFAULT_TITLE,
    description: m.description ?? DEFAULT_META_DESCRIPTION,
    ogImagePath: m.ogImage ?? DEFAULT_OG_IMAGE_PATH,
  };
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render the static <head> SEO tag block for a route. Deterministic; never
// executes React or touches a DOM — safe in a Node build even though React is
// externalized via the esm.sh importmap.
export function renderSeoBlock(path: string, m: RouteMeta): string {
  const r = resolveMeta(m);
  const canonical = new URL(path, SITE_ORIGIN).toString();
  const ogImageUrl = new URL(r.ogImagePath, SITE_ORIGIN).toString();
  const t = escapeAttr(r.title);
  const d = escapeAttr(r.description);
  const alt = escapeAttr(OG_IMAGE_ALT);
  return [
    `  <title>${t}</title>`,
    `  <meta name="description" content="${d}" />`,
    `  <meta name="robots" content="index, follow, max-image-preview:large" />`,
    `  <link rel="canonical" href="${canonical}" />`,
    `  <meta property="og:type" content="profile" />`,
    `  <meta property="og:site_name" content="Dan Mercede" />`,
    `  <meta property="og:title" content="${t}" />`,
    `  <meta property="og:description" content="${d}" />`,
    `  <meta property="og:url" content="${canonical}" />`,
    `  <meta property="og:image" content="${ogImageUrl}" />`,
    `  <meta property="og:image:type" content="image/jpeg" />`,
    `  <meta property="og:image:width" content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta property="og:image:alt" content="${alt}" />`,
    `  <meta property="profile:first_name" content="Dan" />`,
    `  <meta property="profile:last_name" content="Mercede" />`,
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

// Render the crawlable <body> block for a route (W1 body-bake). Emits a real
// <h1> + <p> set wrapped in a hidden-but-crawlable container. The block lives
// OUTSIDE #root, so React's render into #root never collides with it; we also
// remove it on hydration (see index.tsx) to avoid duplicate content for users.
// Deterministic, browserless, no React — safe in the Node build.
export function renderBodyBlock(path: string, m: RouteMeta): string {
  const r = resolveMeta(m);
  // Fallback body when a route omits `body`: title + description. resolveMeta
  // always yields a non-empty description, but guard anyway so a future shape
  // change can never inject `undefined` into the paragraph list.
  const b: RouteBody = m.body ?? { h1: r.title, paragraphs: r.description ? [r.description] : [] };
  const parts: string[] = [
    `  <div id="prerender-content" data-prerender="true" aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;">`,
    `    <h1>${escapeText(b.h1)}</h1>`,
  ];
  if (b.lead) {
    parts.push(`    <p>${escapeText(b.lead)}</p>`);
  }
  for (const p of b.paragraphs) {
    parts.push(`    <p>${escapeText(p)}</p>`);
  }
  parts.push(`  </div>`);
  return parts.join('\n');
}

// Escape a serialized JSON string for safe embedding inside an HTML
// <script type="application/ld+json"> element. JSON.stringify alone leaves a
// literal `</script>` (e.g. inside a title/description) able to close the tag
// early and inject markup. We escape the full `< > &` set (acceptance
// criterion 5 \u2014 the baked body and JSON-LD are both escaped for `< > &`) plus
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
// FAQPage is intentionally NOT emitted — its rich result was deprecated 2026.
export function renderRouteJsonLd(path: string, m: RouteMeta): string {
  const r = resolveMeta(m);
  const canonical = new URL(path, SITE_ORIGIN).toString();
  const graph: Record<string, unknown>[] = [];

  if (m.schemaType === 'Article') {
    graph.push({
      '@type': 'Article',
      '@id': `${canonical}#article`,
      headline: r.title,
      description: r.description,
      url: canonical,
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
  }

  graph.push(renderBreadcrumb(path, breadcrumbLabel(r.title)));

  const doc = { '@context': 'https://schema.org', '@graph': graph };
  return `  <script type="application/ld+json">\n${escapeJsonForHtml(JSON.stringify(doc, null, 2))}\n  </script>`;
}

// Concise breadcrumb leaf: strip the trailing brand suffix (" — Dan Mercede" /
// " | Dan Mercede") so the crumb is the page label, not the full SEO <title>.
function breadcrumbLabel(title: string): string {
  return title.replace(/\s*[—|]\s*Dan Mercede\s*$/, '').trim();
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
