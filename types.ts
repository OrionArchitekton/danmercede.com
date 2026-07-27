import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
}

export interface Pillar {
  title: string;
  icon: LucideIcon;
  description?: string;
}

export interface Venture {
  name: string;
  role: string;
  description: string;
  ecosystemRole: string;
  systemRelationship: string;
  operatingConstraints: string;
  link?: string;
  status: string;
  logo: string;
  slug: string;
}

export interface Thought {
  title: string;
  preview: string;
  date: string;
  category: string;
  // Per-thought route slug (substrate `slug`). Drives /thoughts/<slug> routing,
  // prerender, and sitemap parity (round-2 R2).
  slug: string;
  // Full rendered essay body (substrate canonical markdown body, blank-line-
  // separated paragraphs). Baked into the served per-thought page so no-JS
  // answer engines read the full corpus, not just the `preview` lead (R1).
  body: string;
}

export interface Guide {
  title: string;
  slug: string;          // /guides/<slug> routing + sitemap parity
  date: string;          // YYYY-MM-DD (publish date; drives sitemap lastmod)
  category: string;      // surface label, e.g. "Self-Hosting"
  description: string;   // meta description (head + JSON-LD)
  lead: string;          // positioning line rendered under the H1
  body: string;          // full markdown body (rendered by the in-house Markdown renderer)
}

export interface Diagram {
  title: string;
  slug: string;          // /diagrams/<slug> routing + sitemap parity
  date: string;          // YYYY-MM-DD (publish date; drives sitemap lastmod)
  alt: string;           // substrate alt_text — baked <img alt> + ImageObject.description + crawl body
  caption: string;       // substrate caption — visible <figcaption> + meta description
  src: string;           // public asset on .com: /assets/diagrams/<slug>.<ext>
}

export interface Work {
  title: string;
  description: string;
  category: string;        // surface label, e.g. "Open Source"
  repo: string;            // codeRepository URL (GitHub) — drives the JSON-LD codeRepository
  link?: string;           // primary external link (defaults to repo if absent)
  gist?: string;           // optional supporting gist URL surfaced as a sample
  video?: string;          // optional demo video URL (e.g. YouTube)
  license?: string;        // e.g. "MIT"
  date?: string;           // YYYY-MM-DD (shipped/published)
  slug: string;
}

export interface Belief {
  statement: string;
  detail: string;
}

export interface Resource {
  title: string;
  description: string;
  category: 'lead-magnet' | 'template' | 'sales-collateral' | 'diagram' | 'deck';
  fileName: string;
  filePath: string;
  enforcementLayers: number[];
  enforcementLayer: number;
  riskDomain: string;
  gated: boolean;
  enforcementPoint: string;
  artifactType: 'evidence-pack' | 'blueprint' | 'template' | 'one-sheet' | 'diagram' | 'deck';
  fileType: 'pdf' | 'docx' | 'pptx';
  fileSize: string;
}

export interface CaseStudyMetric {
  label: string;
  value: string;
}

export interface CaseStudy {
  title: string;
  slug: string;
  industry: string;
  enforcementLayers: number[];
  layerNames: string[];
  metrics?: CaseStudyMetric[];
  description: string;
  fileName: string;
  filePath: string;
  enforcementPoints: string[];
  commercialMapping: string[];
}
export interface EvidenceClaim {
  /** One factual sentence. Every number here must be reproducible by `verify`. */
  claim: string;
  /** A command or URL a reader can run to re-check the claim themselves. */
  verify: string;
  verifyKind: 'command' | 'url';
  href?: string;
}

export interface EvidenceTier {
  id: string;
  title: string;
  /** What KIND of evidence this tier is, stated plainly so tiers are not conflated. */
  note: string;
  claims: EvidenceClaim[];
}
