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

const OG_IMAGE_ALT =
  'Dan Mercede, systems architect and founder of the governed AI operating system';

export interface RouteMeta {
  title: string;
  description?: string;
  ogImage?: string;
}

// Static routes (mirrors the <Route> table in App.tsx). The homepage entry is
// the default that lives un-injected in index.html.
export const ROUTE_META: Record<string, RouteMeta> = {
  '/': { title: DEFAULT_TITLE },
  '/about': {
    title: 'About — Dan Mercede',
    description:
      'Systems architect and founder building governed AI operating systems with deterministic enforcement at runtime.',
  },
  '/ecosystem': { title: 'Ecosystem — Orion Ventures | Dan Mercede' },
  '/proof': {
    title: 'Proof — Runtime Governance Enforcement Artifacts | Dan Mercede',
    description:
      'Downloadable enforcement artifacts mapped to the four-layer runtime governance stack: Authority Gate, Immutable Receipts, Drift Guard, Gated Substrate.',
  },
  '/thoughts': {
    title: 'Thought Direction — Doctrine + Architecture | Dan Mercede',
    description:
      'Essays on runtime governance, enforcement architecture, and the structural requirements for governed intelligence at scale.',
  },
  '/connect': {
    title: 'Connect — Initiate Protocol | Dan Mercede',
    description:
      'Engage with Dan Mercede on governed AI architecture, runtime enforcement, and enterprise reliability engineering.',
  },
  '/legal': {
    title: 'Legal Notice | Dan Mercede',
    description:
      'Terms and conditions for danmercede.com — intellectual property, limitation of liability, and usage terms.',
  },
  '/privacy': {
    title: 'Privacy Policy — Data Governance | Dan Mercede',
    description:
      'Privacy policy for danmercede.com — data collection, cookies, and tracking practices.',
  },
  '/imprint': {
    title: 'Imprint — Entity Details | Dan Mercede',
    description:
      'Imprint and entity information for danmercede.com — operating entity, responsible person, jurisdiction.',
  },
};

// Dynamic case-study meta. The title FORMAT lives here only, so the runtime
// (CaseStudyPage) and the prerender injector produce identical strings.
export function caseStudyMeta(slug: string | undefined): RouteMeta {
  const study = CASE_STUDIES.find((cs) => cs.slug === slug);
  return study
    ? { title: `${study.title} — Case Study | Dan Mercede`, description: study.description }
    : { title: 'Case Study Not Found | Dan Mercede' };
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
    `  <meta name="twitter:title" content="${t}" />`,
    `  <meta name="twitter:description" content="${d}" />`,
    `  <meta name="twitter:image" content="${ogImageUrl}" />`,
    `  <meta name="twitter:image:alt" content="${alt}" />`,
  ].join('\n');
}

// Replace the content between the SEO anchors with a freshly-rendered block.
export function injectSeoBlock(html: string, blockBody: string): string {
  const start = html.indexOf(SEO_BLOCK_START);
  const end = html.indexOf(SEO_BLOCK_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('SEO block markers not found in HTML');
  }
  const before = html.slice(0, start + SEO_BLOCK_START.length);
  const after = html.slice(end);
  return `${before}\n${blockBody}\n  ${after}`;
}
