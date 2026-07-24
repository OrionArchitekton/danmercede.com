import { CASE_STUDIES, WORKS, THOUGHTS, GUIDES, DIAGRAMS, featuredEssays, WORKS_HUB } from './constants';
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

// Anchors delimiting the crawlable body block injected INTO <body>. The SPA
// hydrates over `#root`; this static block is a sibling so it is visible to
// raw-HTML crawlers (ChatGPT/Perplexity/Claude, none execute JS) and replaced
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
  'Dan Mercede, founder, operator, and systems builder';

// Crawlable body copy for a route: one H1 and one or more paragraphs. Sourced
// from the rendered page copy so the static body and the hydrated body agree.
export interface RouteBody {
  h1: string;
  // Lead positioning line, rendered as the first paragraph after the H1.
  lead?: string;
  paragraphs: string[];
  // Crawlable links baked into the prerender block (W1 deep-link bake). Used by
  // /works to concentrate crawl authority on the flagship essays + outbound rail.
  // Mirrors the visible React render (prerender parity), NOT crawler-only content.
  links?: { href: string; text: string }[];
}

export interface RouteMeta {
  title: string;
  description?: string;
  ogImage?: string;
  // Crawlable body content baked into <body> at build time (W1). Optional:
  // routes without it fall back to a minimal title+description body.
  body?: RouteBody;
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

// Build the /works crawlable link set: the featured-essay deep-links (in lockstep
// with featuredEssays() so the baked block can't drift from the visible render),
// the bare full-archive link, then the outbound rail. Evaluated at module load , 
// featuredEssays() throws here if a featured slug is unresolved, failing the build
// loud (the desired fail-closed behavior). Used only by ROUTE_META['/works'].body.
function worksBodyLinks(): { href: string; text: string }[] {
  return [
    ...featuredEssays().map((e) => ({ href: `/thoughts/${e.slug}`, text: e.title })),
    { href: '/thoughts', text: 'Full archive' },
    { href: WORKS_HUB.signalUrl, text: 'Live signal log' },
    { href: WORKS_HUB.githubUrl, text: 'GitHub' },
  ];
}

// Static routes (mirrors the <Route> table in App.tsx). The homepage entry is
// the default that lives un-injected in index.html.
export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: DEFAULT_TITLE,
    schemaType: 'ProfilePage',
    body: {
      h1: 'Dan Mercede',
      lead: 'AI systems fail when nobody owns the workflow.',
      paragraphs: [
        "I'm an operator and systems builder. I help teams turn AI from experiments into owned, governed workflows they can actually run, not just advice and slideware.",
        'The teams that win with AI own the workflow, not just the model.',
        'Each entity in the ecosystem operates independently but shares a common governance framework and capital structure managed by Orion Apex Capital.',
      ],
    },
  },
  '/about': {
    title: 'About: Dan Mercede',
    description:
      'Operator and systems builder helping teams turn AI from experiments into owned workflows. Governance as proof depth, not the pitch.',
    schemaType: 'ProfilePage',
    body: {
      h1: 'The Throughline',
      lead: 'From operations to architecture: build systems operators can own and run.',
      paragraphs: [
        'I help teams turn AI from experiments into owned workflows. Strategy and facilitation first. Build when the path is clear. Hand off ownership so day two is real.',
        'Governance and reliability are how the work holds under pressure. They are proof depth, not the front-door pitch. My path runs from complex human operations to the digital systems that automate them.',
      ],
    },
  },
  '/ecosystem': {
    title: 'Ecosystem: Orion Ventures | Dan Mercede',
    schemaType: 'ProfilePage',
    body: {
      h1: 'Ecosystem',
      lead: 'Orion Ventures: independent entities under shared ownership architecture.',
      paragraphs: [
        'Cosmocrat is the Governed AI Operating System that serves as the control plane for human-owned intelligence, governing how AI systems remember, decide, execute, and are audited over time.',
        'Orion Apex Capital originates, owns, and governs the ecosystem. Orion Intelligence Agency is the SMB AI strategy consulting arm that builds and deploys with operators. ReplyBy, Apex Trading Systems, and Path of Life Hub operate as domain applications under the same ownership architecture.',
      ],
    },
  },
  '/proof': {
    title: 'Reliability and Governance Archive | Dan Mercede',
    description:
      'The reliability and governance archive: downloadable enforcement artifacts mapped to the four-layer governance stack (Authority Gate, Immutable Receipts, Drift Guard, Gated Substrate). Proof depth, not the front-door pitch.',
    schemaType: 'Article',
    body: {
      h1: 'Proof',
      lead: 'Reliability and governance archive: proof depth, not the pitch.',
      paragraphs: [
        'Governance is enforced at four deterministic boundaries: Authority, Attestation, Behavioral Constraint, and Physical Isolation.',
        'Downloadable enforcement artifacts map to the four-layer governance stack, Authority Gate, Immutable Receipts, Drift Guard, and Gated Substrate, structured for SOC 2 AI, ISO 42001, and EU AI Act readiness.',
      ],
    },
  },
  '/thoughts': {
    title: 'Thoughts: Notes from the Operating Layer | Dan Mercede',
    description:
      'Essays on governed AI, workflow ownership, operator-led automation, and the failure modes that show up when systems meet reality.',
    schemaType: 'Article',
    body: {
      h1: 'Thought Direction',
      lead: 'Notes from the operating layer.',
      paragraphs: [
        'Essays on governed AI, workflow ownership, operator-led automation, and execution discipline, plus the failure modes that show up when systems meet reality.',
      ],
    },
  },
  '/works': {
    title: 'Works: Build, Selected Essays & Signal | Dan Mercede',
    description:
      'Open-source tooling and field-tested patterns from shipping governed agentic systems in production, with selected essays on the doctrine behind the build.',
    schemaType: 'CollectionPage',
    body: {
      h1: 'Works',
      lead: 'Open-source tooling and field-tested patterns from shipping governed agentic systems in production.',
      paragraphs: [
        'Build, open-source tools and Claude Code skills, cloneable and runnable from a fresh checkout.',
        'Selected essays point to the doctrine behind the build; the full archive lives at /thoughts.',
        WORKS_HUB.availability,
      ],
      links: worksBodyLinks(),
    },
  },
  '/guides': {
    title: 'Guides: Agent Engineering, Workflow Ownership & Operations | Dan Mercede',
    description:
      'Long-form technical guides on governed AI: build agents that can act and prove what happened. Multi-agent pipelines, layered review, fail-closed execution, self-hosting, and secure ingress on infrastructure you control.',
    schemaType: 'Article',
    body: {
      h1: 'Guides',
      lead: 'Field notes on governed AI: practical, field-tested walkthroughs.',
      paragraphs: [
        'Long-form, field-tested guides for building agents that can act and prove what happened: agent systems and orchestration, layered review and verification, governed delivery, and self-hosting with secure ingress on infrastructure you control.',
      ],
    },
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
    body: {
      h1: 'Diagrams',
      lead: 'Architecture and agentic-systems diagrams.',
      paragraphs: [
        'Visual explainers for operator-led AI architecture, two-plane topology, request lifecycle, and the systems patterns that keep ownership and reliability intact under load.',
      ],
    },
  },
  '/connect': {
    title: 'Connect: Initiate Protocol | Dan Mercede',
    description:
      'Engage with Dan Mercede on operator-led AI systems, workflow ownership, and SMB AI strategy consulting through OIA.',
    body: {
      h1: 'Connect',
      lead: 'Initiate protocol.',
      paragraphs: [
        'Engage with Dan Mercede on operator-led AI systems, one-workflow ownership, and SMB AI strategy consulting through Orion Intelligence Agency.',
      ],
    },
  },
  '/legal': {
    title: 'Legal Notice | Dan Mercede',
    description:
      'Terms and conditions for danmercede.com, intellectual property, limitation of liability, and usage terms.',
    body: {
      h1: 'Legal Notice',
      paragraphs: [
        'Terms and conditions for danmercede.com, intellectual property, limitation of liability, and usage terms.',
      ],
    },
  },
  '/privacy': {
    title: 'Privacy Policy: Data Governance | Dan Mercede',
    description:
      'Privacy policy for danmercede.com, data collection, cookies, and tracking practices.',
    body: {
      h1: 'Privacy Policy',
      paragraphs: [
        'Privacy policy for danmercede.com, data collection, cookies, and tracking practices.',
      ],
    },
  },
  '/imprint': {
    title: 'Imprint: Entity Details | Dan Mercede',
    description:
      'Imprint and entity information for danmercede.com, operating entity, responsible person, jurisdiction.',
    body: {
      h1: 'Imprint',
      paragraphs: [
        'Imprint and entity information for danmercede.com, operating entity, responsible person, jurisdiction.',
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
    title: `${study.title}: Case Study | Dan Mercede`,
    description: study.description,
    schemaType: 'Article',
    body: {
      h1: study.title,
      lead: study.industry,
      paragraphs: [study.description],
    },
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

// Split a substrate essay body into crawlable paragraphs. The body is stored
// as a single newline-escaped string (compileContent's generateOutput) with
// blank lines separating paragraphs; split on one-or-more blank lines and drop
// empties so each paragraph becomes its own baked <p> (R1 full-body bake).
export function bodyToParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

// Dynamic per-thought meta (round-2 R1/R2). The title FORMAT lives here only so
// the runtime (ThoughtDetailPage) and the prerender injector emit identical
// strings. The baked body carries the FULL essay (every paragraph of the
// substrate canonical), not just the preview, that is the corpus bake. JSON-LD
// is an Article authored/published by the canonical #person (never a competing
// Person node, never FAQPage).
export function thoughtMeta(slug: string | undefined): RouteMeta {
  const thought = THOUGHTS.find((t) => t.slug === slug);
  if (!thought) {
    return { title: 'Thought Not Found | Dan Mercede' };
  }
  const paragraphs = bodyToParagraphs(thought.body);
  return {
    title: `${thought.title}: Thought | Dan Mercede`,
    // The preview (substrate `claim`) is the thesis, the ideal meta description.
    description: thought.preview,
    schemaType: 'Article',
    body: {
      h1: thought.title,
      // Lead = the thesis claim; the full essay paragraphs follow it.
      lead: thought.preview,
      // Fall back to the preview if a canonical ever has an empty body, so the
      // route never bakes an h1 with zero paragraphs.
      paragraphs: paragraphs.length > 0 ? paragraphs : [thought.preview],
    },
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

// Flatten a guide's markdown body into clean crawlable prose paragraphs for the
// answer-engine body-bake (W1). Unlike a thought (plain prose), a guide body
// carries fenced code, tables, and image figures, none of which belong in the
// hidden text block, so those are dropped and inline syntax is stripped to text.
function guideInlineToText(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ');
}

export function guideBodyToParagraphs(body: string): string[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const paras: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    if (buf.length) {
      const text = guideInlineToText(buf.join(' ')).trim();
      if (text) paras.push(text);
    }
    buf = [];
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (inFence) continue; // drop fenced code
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (/^!\[.*\]\(.*\)\s*$/.test(line)) {
      flush();
      continue;
    } // drop image figures
    if (line.trim().startsWith('|')) continue; // drop table rows
    if (/^\s*---+\s*$/.test(line)) {
      flush();
      continue;
    } // drop horizontal rules
    // Each structural element (heading, blockquote, list item) starts its own
    // paragraph, matching how the visible renderer splits blocks even without a
    // blank line between them, keeps the crawl body and rendered body in parity.
    const isHeading = /^#{1,6}\s+/.test(line);
    const isQuote = /^\s*>/.test(line);
    const isList = /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line);
    if (isHeading || isQuote || isList) flush();
    const stripped = line
      .replace(/^#{1,6}\s+/, '') // heading marker
      .replace(/^\s*>\s?/, '') // blockquote marker
      .replace(/^\s*[-*]\s+/, '') // unordered marker
      .replace(/^\s*\d+\.\s+/, ''); // ordered marker
    buf.push(stripped);
    if (isHeading) flush(); // a heading stands alone as its own paragraph
  }
  flush();
  return paras;
}

// Dynamic per-guide meta (mirrors thoughtMeta). The baked body carries the full
// guide prose (every paragraph), so no-JS answer engines read the whole guide.
// JSON-LD is an Article authored/published by the canonical #person.
export function guideMeta(slug: string | undefined): RouteMeta {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) {
    return { title: 'Guide Not Found | Dan Mercede' };
  }
  const paragraphs = guideBodyToParagraphs(guide.body);
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
    body: {
      h1: guide.title,
      lead: guide.lead,
      paragraphs: paragraphs.length > 0 ? paragraphs : [guide.lead],
    },
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

// Dynamic per-diagram meta (mirrors guideMeta). schemaType ImageObject; the body
// bakes the caption (lead) + the alt text (paragraph) as crawlable prose so no-JS
// answer engines read the figure's meaning. Corpus is injectable for testing , 
// the in-repo DIAGRAMS is empty until the substrate-sync regen.
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
    body: {
      h1: diagram.title,
      lead: diagram.caption,
      paragraphs: [diagram.alt],
    },
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
  const cut = s.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(' ');
  // Only honour the word boundary if it is not absurdly early (a single very
  // long token would otherwise collapse the whole description to an ellipsis).
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s,;:.]+$/, '')}...`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render the static <head> SEO tag block for a route. Deterministic; never
// executes React or touches a DOM, safe in a Node build even though React is
// externalized via the esm.sh importmap.
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
    // profile:* are og:type=profile properties and are incoherent on an article
    // card; article routes carry article:* instead. Routes that set no ogType
    // keep the profile pair verbatim, which is what holds the homepage block
    // byte-identical to index.html (guarded by tests/injectRouteMeta.test.ts).
    ...(m.ogType === 'article'
      ? [
          ...(m.datePublished
            ? [`  <meta property="article:published_time" content="${escapeAttr(m.datePublished)}" />`]
            : []),
          `  <meta property="article:author" content="Dan Mercede" />`,
        ]
      : [
          `  <meta property="profile:first_name" content="Dan" />`,
          `  <meta property="profile:last_name" content="Mercede" />`,
        ]),
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
// Deterministic, browserless, no React, safe in the Node build.
export function renderBodyBlock(path: string, m: RouteMeta, renderedHtml?: string): string {
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
  if (renderedHtml) {
    // Build-generated markup from the site's own Markdown component (the
    // injector renders essay bodies node-side so the baked body carries real
    // <h2>/<pre>/<figure> markup instead of escaped literal markdown). Trusted
    // build output, inserted verbatim; NEVER pass user/runtime input here.
    parts.push(`    ${renderedHtml}`);
  } else {
    for (const p of b.paragraphs) {
      parts.push(`    <p>${escapeText(p)}</p>`);
    }
  }
  if (b.links) {
    for (const link of b.links) {
      parts.push(`    <a href="${escapeAttr(link.href)}">${escapeText(link.text)}</a>`);
    }
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
// FAQPage is intentionally NOT emitted, its rich result was deprecated 2026.
export function renderRouteJsonLd(path: string, m: RouteMeta): string {
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

  const doc = { '@context': 'https://schema.org', '@graph': graph };
  return `  <script type="application/ld+json">\n${escapeJsonForHtml(JSON.stringify(doc, null, 2))}\n  </script>`;
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
