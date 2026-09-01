import {
  ShieldCheck,
  Cpu,
  Scale,
  Network,
  Globe,
  Briefcase,
  Zap,
  PenTool
} from 'lucide-react';
import { Pillar, Venture, Belief, Resource, CaseStudy, Work, Guide, Diagram, EvidenceTier } from './types';
import { THOUGHTS } from './constants.generated';
// Namespace import so DIAGRAMS can default to [] when the (substrate-verified)
// generated bundle does not yet export it, a NAMED import would hard-fail at
// module load. DIAGRAMS enters the bundle via the substrate-sync regen after the
// diagram canonicals add danmercede.com to surface_targets; until then the hub
// builds cleanly with zero diagrams. (compiler-change / bundle-regen sequencing.)
import * as generatedBundle from './constants.generated';
import { GUIDES } from './constants.guides.generated';

export const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Ecosystem', path: '/ecosystem' },
  { label: 'Thoughts', path: '/thoughts' },
  { label: 'Proof', path: '/proof' },
  { label: 'Works', path: '/works' },
  { label: 'Guides', path: '/guides' },
  { label: 'Diagrams', path: '/diagrams' },
  { label: 'Connect', path: '/connect' },
];

export const HERO_CONTENT = {
  name: "DAN MERCEDE",
  positioning: "AI systems fail when nobody owns the workflow.",
  philosophy: "I'm an operator and systems builder. I help teams turn AI from experiments into owned, governed workflows they can actually run, not just advice and slideware.",
  wedge: "The teams that win with AI own the workflow, not just the model.",
};

export const PILLARS: Pillar[] = [
  { title: "Human-Owned Intelligence", icon: Cpu, description: "AI aligned with operator intent, control, and accountability." },
  { title: "Governance & Accountability", icon: ShieldCheck, description: "Traceability, auditability, and policy enforcement by default." },
  { title: "Execution Over Hype", icon: Zap, description: "Production systems with measurable outcomes: not experiments." },
  { title: "Systems That Scale", icon: Network, description: "Architectures designed to compound, degrade safely, and endure." },
];

export const BUILD_AREAS = [
  {
    label: "Platform",
    icon: Globe,
    description: "Governed AI Operating System design: control planes and execution frameworks that unify memory, decision-making, and oversight."
  },
  {
    label: "Agency",
    icon: Briefcase,
    description: "SMB AI strategy and consulting: one workflow from strategy to a system your team owns. Builds, not just advises."
  },
  {
    label: "Capital",
    icon: Scale,
    description: "Ownership, structure, and capital alignment for long-term system builders."
  },
  {
    label: "Media",
    icon: PenTool,
    description: "Signal creation and narrative architecture to teach categories, not market products."
  },
];

export const SIGNALS = [
  "Founder of Cosmocrat",
  "Director of Orion Intel",
  "Trademark Holder",
];

export const SPEAKING = {
  label: "Upcoming Speaking",
  event: "NODES 2026 by Neo4j",
  date: "November 12, 2026",
  // Published slot, verified against the live agenda 2026-09-01:
  // datetime="2026-11-12T19:30:00+00:00" (19:30-20:00 UTC), Americas panel.
  time: "11:30 AM PST",
  track: "Data Intelligence",
  title: "Don't Flatten the Tree: Ingesting Branched Conversations into a Knowledge Graph",
  detail: "Selected speaker at Neo4j's global developer conference: ingesting branched LLM conversation history into a production knowledge graph, with the patterns that keep it idempotent and re-runnable.",
  // The canonical Neo4j speaker page (self-canonical, robots index,follow). This is
  // the credential-proof target: neo4j.com/nodes/ itself carries zero mentions of Dan.
  // Mirrored into Person.sameAs in index.html per docs/identity-contract.md.
  href: "https://neo4j.com/nodes/speakers/dan-mercede/",
  cta: "Speaker profile",
};

export const BELIEFS: Belief[] = [
  { statement: "INTELLIGENCE AUGMENTS HUMANS", detail: "Operator authority stays in the loop." },
  { statement: "TRUST REQUIRES TRACEABILITY", detail: "If it can’t be audited, it can’t be trusted." },
  { statement: "AUTOMATION MUST BE GOVERNED", detail: "Fail closed. Log everything. Degrade safely." },
];

export const VENTURES: Venture[] = [
  {
    name: "Cosmocrat",
    role: "Governed AI Operating System",
    description: "Cosmocrat is a Governed AI Operating System that enforces auditability, policy control, and human oversight across AI memory, decisioning, and execution.",
    ecosystemRole: "Cosmocrat is the Governed AI Operating System that serves as the control plane for human-owned intelligence. It governs how AI systems remember, decide, execute, and are audited over time.",
    systemRelationship: "Cosmocrat is the core system originated and owned by Orion Apex Capital. All other entities in the ecosystem either deploy, validate, or operate under Cosmocrat’s governance model.",
    operatingConstraints: "Enterprise-grade, governance-first. Not a chatbot. Not an orchestration tool. Designed to fail closed and remain auditable under real production conditions.",
    status: "GOVERNED AI OS · CORE",
    logo: "/cosmocrat-.png",
    slug: "cosmocrat",
    link: "https://www.cosmocrat.ai"
  },
  {
    name: "Orion Intelligence Agency",
    role: "SMB AI Strategy & Consulting",
    description: "Orion Intelligence Agency helps small and mid-sized operators turn one high-friction workflow into an AI-assisted system the team can run: strategy, leadership facilitation, engineering, and agents.",
    ecosystemRole: "Orion Intelligence Agency (OIA) is the SMB AI strategy consulting arm. Four offering lines: AI Strategy, AI Leadership and Facilitation, AI Engineering, and AI Agents. Builds and deploys, not just advises.",
    systemRelationship: "OIA is the commercial delivery lane for operators who need one workflow shipped, adopted, and owned. Cosmocrat remains the Governed AI Operating System product when a control-plane substrate is the right fit.",
    operatingConstraints: "SMB-focused. One workflow first. Blueprint before build. Transparent scoping on a Readiness Scan call. No public package price list.",
    status: "SMB CONSULTING · LIVE",
    logo: "/oia-shield-only-dark.png",
    slug: "orion-intelligence",
    link: "https://www.orionintelligenceagency.com"
  },
  {
    name: "Orion Apex Capital",
    role: "Ownership & Systems Architecture",
    description: "Orion Apex Capital is a systems architecture and holding firm that originates, owns, and governs Cosmocrat, the Governed AI Operating System.",
    ecosystemRole: "Orion Apex Capital is the holding and architecture firm responsible for originating, owning, and governing the ecosystem’s intelligence systems.",
    systemRelationship: "OAC is the origin authority of Cosmocrat and oversees how the operating system is deployed, validated, and capitalized across domains.",
    operatingConstraints: "Ownership and architecture only. Not a services firm. Not a product marketplace.",
    status: "OWNERSHIP · ARCHITECTURE",
    logo: "/01-OAC-stacked_primary_white-transparent_sm.png",
    slug: "orion-apex-capital",
    link: "https://www.orionapexcapital.com"
  },
  {
    name: "ReplyBy",
    role: "Governed Communication Automation (SMB)",
    description: "ReplyBy is a production communication automation system that recovers missed calls through governed execution and structured workflows.",
    ecosystemRole: "ReplyBy is a production communication automation system that recovers missed opportunities through structured, governed execution.",
    systemRelationship: "ReplyBy operates as a production-grade application running under governed execution principles derived from Cosmocrat, validated through Orion Intelligence Agency.",
    operatingConstraints: "SMB-focused. Narrow scope. Production only. No autonomous decisioning.",
    status: "PRODUCTION · SMB",
    logo: "/header-icon - replyby.png",
    slug: "replyby",
    link: "https://www.replychatai.com"
  },
  {
    name: "Apex Trading Systems",
    role: "Internal Governed Execution Proof",
    description: "Apex Trading Systems is an internal, regime-aware trading execution system demonstrating governed AI decision enforcement under real market conditions.",
    ecosystemRole: "Apex Trading Systems (ATS) is an internal, regime-aware trading execution system used to demonstrate disciplined, risk-first governed execution.",
    systemRelationship: "ATS serves as internal validation of Cosmocrat’s governance model under continuous, adversarial conditions.",
    operatingConstraints: "Internal use only. Not offered publicly. No external capital or client access.",
    status: "INTERNAL · GOVERNED EXECUTION",
    logo: "/ats-logo.png",
    slug: "apex-trading",
    link: "https://www.apexaitrading.com"
  },
  {
    name: "Path of Life Hub",
    role: "Consumer Signal Exploration",
    description: "Path of Life Hub explores how governed decision surfacing can improve everyday life through a daily consumer signal platform.",
    ecosystemRole: "Path of Life Hub is a consumer signal platform exploring how governed decision surfacing can improve everyday life.",
    systemRelationship: "It functions as an exploratory edge of the ecosystem, testing how governance principles translate to individual-level decision contexts.",
    operatingConstraints: "Consumer-facing. Experimental by design. Not enterprise infrastructure.",
    status: "SIGNAL · CONSUMER",
    logo: "/Path-of-Light-Transparant.png",
    slug: "path-of-life",
    link: "https://pathoflifehub.com"
  }
];

export const READINESS_SCAN = {
  cta: "Work with OIA on one workflow",
  deliverables: [
    "Workflow readiness map",
    "Failure-mode heatmap",
    "Ownership and handoff plan",
    "30/60/90 rollout roadmap",
  ],
  href: "https://www.orionintelligenceagency.com/readiness-scan?utm_source=danmercede.com&utm_medium=hub_cta&utm_campaign=readiness_scan",
};

// Hub-side /thoughts lane grouping (the authority-router 'operating journal' view).
// Lanes are a HAND-AUTHORED curation, ORTHOGONAL to the substrate-derived `category`
// badge (which stays on each card). It touches neither the substrate nor the
// generated bundle. Curated lanes list explicit slugs; the default lane (Governed AI)
// catches every essay not claimed by another lane, so no post is ever dropped. Two
// lanes ship EMPTY by design: Workflow Ownership fills later via the /thoughts
// authoring rail; Public Signals routes to danmercede.online.
export interface ThoughtLane {
  name: string;
  blurb: string;
  slugs?: readonly string[];
  isDefault?: boolean;
  emptyNote?: string;
  externalHref?: string;
}
export const THOUGHT_LANES: readonly ThoughtLane[] = [
  {
    name: 'Operator Notes',
    blurb: 'Lived execution, business lessons, and the work patterns behind the systems.',
    slugs: [
      '2026-07-03-architecture-fit-is-not-business-justification',
      '2026-06-29-the-alibi-of-a-green-gate',
      '2026-06-24-verify-the-verifier-v2',
      '2026-05-12-posted-is-not-published',
      '2026-05-05-gated-substrate-is-a-pinned-sha',
      '2026-04-28-content-has-a-substrate-too',
      '2026-03-10-extraction-without-a-frozen-contract',
    ],
  },
  {
    name: 'Governed AI',
    blurb: 'Fail-closed systems, receipts, authority, and the controls that make AI trustworthy.',
    isDefault: true,
  },
  {
    name: 'Workflow Ownership',
    blurb: 'Turning AI from experiments into workflows a team owns, the bridge into hands-on work.',
    slugs: [],
    emptyNote: 'New essays are landing here. In the meantime, work with OIA on one workflow.',
  },
  {
    name: 'Public Signals',
    blurb: 'Shorter working notes and market observations, posted as they happen.',
    slugs: [],
    emptyNote: 'Raw signals live on danmercede.online.',
    externalHref: 'https://danmercede.online',
  },
  {
    name: 'Archive',
    blurb: 'Older pieces that still matter but are not the current front door.',
    slugs: [
      '2026-02-17-why-enterprise-ai-fails-at-runtime-not-capability',
    ],
  },
];

// Homepage intent-router: routes each visitor to the surface that fits their
// intent. danmercede.com is the authority router; OIA is the commercial lane.
// External SMB card points at the OIA readiness-scan; the rest are in-hub routes.
export const INTENT_ROUTES = [
  {
    audience: 'SMB buyer',
    prompt: 'Need AI strategy or a workflow built?',
    description: 'Work with Orion Intelligence Agency on one workflow, from strategy to a system your team owns.',
    href: READINESS_SCAN.href,
    cta: 'Go to OIA',
    external: true,
  },
  {
    audience: 'Technical reader',
    prompt: 'Here for the engineering?',
    description: 'Guides, essays, and open-source tools on governed AI and operator-led automation.',
    href: '/guides',
    cta: 'Read the guides',
    external: false,
  },
  {
    audience: 'Reliability and governance',
    prompt: 'Evaluating governed AI infrastructure?',
    description: 'The reliability and governance archive: enforcement artifacts and production proof.',
    href: '/proof',
    cta: 'See the proof',
    external: false,
  },
  {
    audience: 'Investor or operator',
    prompt: 'Exploring the bigger picture?',
    description: 'The Orion ecosystem and Orion Apex Capital, the entity stack under one governance framework.',
    href: '/ecosystem',
    cta: 'View the ecosystem',
    external: false,
  },
];

export const PRIMARY_VENTURES = ['Cosmocrat', 'Orion Intelligence Agency'];

export const TARGET_AUDIENCE = [
  "Builders", "Operators", "Investors", "Practice Owners"
];

export const FOOTER_DATA = {
  entity: "Orion Apex Capital",
  jurisdiction: "United States",
};

export type ImageMeta = { alt: string; description?: string };

export const IMAGE_METADATA = {
  // Executive / Authority Set
  "dan-mercede-executive-authority.png": {
    alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system",
    description:
      "Executive portrait of Dan Mercede, founder and systems architect focused on governed AI systems and enterprise control planes.",
  },
  "dan-mercede-executive-outdoor.png": {
    alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system",
    description:
      "Outdoor executive portrait of Dan Mercede, founder and systems architect specializing in governed AI and system control architecture.",
  },
  "dan-mercede-executive-relaxed.png": {
    alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system",
    description:
      "Relaxed executive portrait of Dan Mercede, founder and systems architect working in governed AI and enterprise AI governance.",
  },

  // Founder / Working Headshots
  "dan-mercede-founder-headshot.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Founder headshot of Dan Mercede, actively building and operating governed AI systems with a focus on execution and architecture.",
  },
  "dan-mercede-founder-headshot-sm.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Scaled founder headshot of Dan Mercede focused on hands-on AI system design and governance.",
  },
  "dan-mercede-founder-headshot-sm.webp": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Scaled founder headshot of Dan Mercede focused on hands-on AI system design and governance.",
  },
  "dan-mercede-founder-headshot-hero.webp": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Homepage hero portrait of Dan Mercede, optimized for the initial page load while preserving the founder headshot composition.",
  },
  "dan-mercede-founder-headshot-xs.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Compact founder headshot of Dan Mercede emphasizing hands-on work in governed AI systems.",
  },

  // Founder / Social & Working Context
  "dan-mercede-founder-social-landscape.png": {
    alt: "Dan Mercede, founder and systems architect in a working environment",
    description:
      "Landscape portrait of Dan Mercede in a casual working environment, representing hands-on leadership in governed AI systems.",
  },
  "dan-mercede-founder-social-portrait.png": {
    alt: "Dan Mercede, founder and systems architect in a working environment",
    description:
      "Portrait of Dan Mercede in a social working context, reflecting active system design and founder-led execution.",
  },
  "dan-mercede-founder-working-landscape.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Landscape image of Dan Mercede actively working on governed AI system architecture and execution.",
  },
  "dan-mercede-founder-working-portrait.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Portrait of Dan Mercede in a focused working setting, emphasizing hands-on system building and AI governance.",
  },
} as const satisfies Record<string, ImageMeta>;

const basename = (src: string) => src.split("/").pop() || src;

export function getImageMeta(srcOrFilename: string): ImageMeta {
  const key = basename(srcOrFilename);
  const meta = (IMAGE_METADATA as Record<string, ImageMeta>)[key];

  if (!meta) {
    // Dev: fail loud. Prod: safe fallback.
    if (import.meta.env.DEV) {
      throw new Error(`Missing IMAGE_METADATA for: ${key}`);
    }
    return { alt: "Dan Mercede", description: undefined };
  }

  return meta;
}

export const RESOURCES: Resource[] = [
  // L1: Authority Gate
  {
    title: "What We Deliver",
    description: "Engagement deliverable map linking control-plane gap analysis, failure-mode heatmaps, and evidence checklists to enforcement layers. Risk-bounded pricing tiers anchored to audit defensibility outcomes.",
    category: "sales-collateral",
    fileName: "What_We_Deliver.pdf",
    filePath: "/assets/What_We_Deliver.pdf",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 1,
    riskDomain: "Deployment friction, no structured path from SOC 2 / ISO 42001 gap identification to deterministic enforcement",
    gated: false,
    enforcementPoint: "Pre-execution authority gate evaluation",
    artifactType: "one-sheet",
    fileType: "pdf",
    fileSize: "4 KB",
  },
  // L2: Immutable Receipts
  {
    title: "Executive Deck",
    description: "10-slide enforcement stack walkthrough with gate pipeline flow, ROI proof metrics, and engagement model. Maps cost per successful task, escalation rate reduction, and cycle-time compression to the four-layer cascade.",
    category: "deck",
    fileName: "Executive_Deck.pptx",
    filePath: "/assets/Executive_Deck.pptx",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 2,
    riskDomain: "Financial impact, SOC 2 CC7.2 uncontrolled execution without attestation trail",
    gated: false,
    enforcementPoint: "Append-only receipt ledger for mutation non-repudiation",
    artifactType: "deck",
    fileType: "pptx",
    fileSize: "236 KB",
  },
  // L3: Drift Guard
  {
    title: "Case Study Template",
    description: "Structured engagement template mapping findings to enforcement stack layers. Captures enforcement points deployed, behavioral drift metrics, containment thresholds, and quantified risk reduction tied to operational blast radius.",
    category: "template",
    fileName: "Case_Study_Template.docx",
    filePath: "/assets/Case_Study_Template.docx",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 3,
    riskDomain: "Operational blast radius, ISO 42001 A.8.4 compounded deviation from unconstrained autonomous behavior",
    gated: false,
    enforcementPoint: "Behavioral containment across time, authority decay enforcement",
    artifactType: "template",
    fileType: "docx",
    fileSize: "13 KB",
  },
  // L4: Gated Substrate
  {
    title: "Speaking One-Sheet",
    description: "Credential and topic mapping for CIO, CTO, CISO audiences. Talk tracks anchored to enforcement stack layers, substrate isolation mechanics, and quantified enterprise risk reduction. Architectural authority positioning.",
    category: "sales-collateral",
    fileName: "Speaking_One_Sheet.pdf",
    filePath: "/assets/Speaking_One_Sheet.pdf",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 4,
    riskDomain: "Escalation rate, EU AI Act Article 14 / NIST AI RMF intelligence routing itself without substrate containment",
    gated: false,
    enforcementPoint: "Physical isolation at execution substrate, capability removal over restriction",
    artifactType: "one-sheet",
    fileType: "pdf",
    fileSize: "4 KB",
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: "Governed AI in Financial Services",
    slug: "financial-services",
    industry: "Financial Services",
    enforcementLayers: [1, 2],
    layerNames: ["Authority Gate", "Immutable Receipts"],
    description: "Pre-execution authority verification for trading operations and cryptographic attestation for state mutations. Maps to SOC 2 and SOX compliance requirements.",
    fileName: "Reference_Architecture_Financial_Services.docx",
    filePath: "/assets/Reference_Architecture_Financial_Services.docx",
    enforcementPoints: [
      "Pre-execution authority verification for trading operations",
      "Cryptographic attestation for state mutations",
    ],
    commercialMapping: [
      "Financial exposure containment",
      "SOC 2 audit defensibility",
      "SOX compliance enforcement",
      "Operational blast radius reduction",
    ],
  },
  {
    title: "Governed AI in Healthcare",
    slug: "healthcare",
    industry: "Healthcare",
    enforcementLayers: [3, 4],
    layerNames: ["Drift Guard", "Gated Substrate"],
    description: "Behavioral containment for clinical decision support and workload isolation for PHI-handling agents. Maps to HIPAA and FDA SaMD regulatory exposure.",
    fileName: "Reference_Architecture_Healthcare.docx",
    filePath: "/assets/Reference_Architecture_Healthcare.docx",
    enforcementPoints: [
      "Behavioral containment for clinical decision support",
      "Workload isolation for PHI-handling agents",
    ],
    commercialMapping: [
      "HIPAA compliance enforcement",
      "FDA SaMD regulatory alignment",
      "Patient safety risk containment",
      "Audit defensibility for clinical AI",
    ],
  },
];

// Curated Works / Open-Source surface (W1: static, like VENTURES/CASE_STUDIES , 
// not substrate-sourced). Append a new entry here whenever a public work ships
// (see docs/runbooks/works-update-on-ship.md).
export const WORKS: Work[] = [
  {
    title: 'Fork Around & Find Out',
    description:
      "A fail-closed decision gateway for agent tool-calls. Instead of reading a proposed action and guessing whether it is dangerous, it runs the action in a disposable Daytona sandbox, measures the actual blast radius (files touched, network egress, honeytoken reads even when the secret leaves in a request body), and returns ALLOW, QUARANTINE, or BLOCK. If the run cannot be measured, the action is blocked. Built solo at Daytona HackSprint #5.",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/fork-around-find-out',
    link: 'https://www.danmercede.com/works/fork-around-find-out/',
    date: '2026-07-24',
    slug: 'fork-around-find-out',
  },
  {
    title: 'Reprise',
    description:
      "A reuse-first gateway for generative media. It answers one question per request: did we already generate this? An exact or near-exact match is served straight from Backblaze B2 with the saving booked, the ambiguous band routes to a human, and only genuinely new work reaches the pipeline. Every decision lands in an Object-Lock ledger under GOVERNANCE retention, so the savings scoreboard is recomputed from records nobody can edit while retention holds.",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/reprise',
    link: 'https://www.danmercede.com/works/reprise/',
    date: '2026-07-26',
    slug: 'reprise',
  },
  {
    title: 'Rekindle',
    description:
      "Paste a dormant GitHub repo and get three things: an honest diagnosis of why the flame died, read from commit cadence and the gap between README ambition and reality; a three-step plan whose first step fits in fifteen minutes tonight; and a roughly ninety-word cornerman speech about your project by name, spoken out loud. Model output runs at temperature 0 and is parsed defensively and clamped server-side.",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/rekindle',
    link: 'https://www.danmercede.com/works/rekindle/',
    date: '2026-07-10',
    slug: 'rekindle',
  },
  {
    title: 'agent-demo-video',
    description:
      'A headless pipeline that turns a Markdown DEMO_SCRIPT and a running web app into a finished, narrated, captioned MP4. Audio-first: narration is synthesised first and its per-character timing paces both the screen recording and the captions, so audio, video, and captions stay in sync with zero drift. Runs keyless with FAKE_TTS to iterate before spending any API quota.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/agent-demo-video',
    link: 'https://www.danmercede.com/works/agent-demo-video/',
    license: 'MIT',
    date: '2026-06-26',
    slug: 'agent-demo-video',
  },
  {
    title: 'orion-skills',
    description:
      'An open collection of first-party Claude Code skills, structural read-only mode, scope guarding, ship discipline, pre-PR checks, incident-as-code, learning capture, goal-prompt authoring, and pre-compact handoffs, extracted from production operator workflows.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/orion-skills',
    link: 'https://www.danmercede.com/works/orion-skills/',
    gist: 'https://gist.github.com/OrionArchitekton/6406f7c87d87668023b6594211fd791e',
    license: 'MIT',
    date: '2026-06-17',
    slug: 'orion-skills',
  },
  {
    title: 'mcp-context-budget',
    description:
      'A local-first CLI that keeps your MCP tool surface from eating the agent context budget, it scans tool schemas and response fixtures for token bloat, selects the smallest relevant tool set for a given task, emits a budget lockfile, and fails CI when a config regresses. Self-contained: no external services, runs from a fresh clone against fixture data.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/mcp-context-budget',
    link: 'https://www.danmercede.com/works/mcp-context-budget/',
    license: 'MIT',
    date: '2026-06-18',
    slug: 'mcp-context-budget',
  },
  {
    title: 'schemafit',
    description:
      'A local-first CLI that lints a JSON Schema, structured-output spec, or tool definition against the constraint surface of each major LLM provider (OpenAI, Anthropic, Gemini, Mistral, Cohere) and fails CI before the schema 400s in production, naming the exact JSON-Pointer path, the violated keyword, and the reason, plus a repair pass that emits a provider-valid variant. Static and offline: no API calls, runs from a fresh clone. v0.5 adds automatic rule-pack drift detection, an opt-in live-verify run that rejects a schema the static pack passed flags the pack as lagging the provider’s docs.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/schemafit',
    link: 'https://www.danmercede.com/works/schemafit/',
    license: 'MIT',
    date: '2026-06-19',
    slug: 'schemafit',
  },
  {
    title: 'failclosed',
    description:
      'Fail-closed merge admission control for agent-written code, runs an LLM reviewer, then refuses to report MERGE_READY when the output is unparseable, schema-invalid, or self-contradictory. Enforcement precedes the merge decision; the reviewer is a configurable command seam. Python 3.9+, self-contained.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/failclosed',
    link: 'https://www.danmercede.com/works/failclosed/',
    license: 'MIT',
    date: '2026-06-21',
    slug: 'failclosed',
  },
  {
    title: 'localfiscal',
    description:
      'Local-first private receipt + invoice + ledger intelligence for solopreneurs and small businesses. Ingest receipts locally (heuristic + optional Ollama vision), maintain a private sqlite ledger, generate clean invoice PDFs, produce P&L and category reports, export CSV/OFX for accountants. One-command Docker. Everything stays on your machine.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/localfiscal',
    link: 'https://www.danmercede.com/works/localfiscal/',
    license: 'MIT',
    date: '2026-06-28',
    slug: 'localfiscal',
  },
  // --- Applied Agent Projects, hackathon-built agent systems, surfaced as a
  // distinct /works section (App.tsx WorksPage filters on category). Competition
  // context lives in each description, not the section heading. ---
  {
    title: 'algorithm.reviews',
    description:
      'The Agent Trust Layer, a governed review agent that fans out across the live web, decides which sources are admissible (fail-closed), forms a verdict grounded only in admitted evidence, and ships a signed, verifiable review receipt: per-claim confidence, timestamped citations, dissent, and an ECDSA signature anyone can check. Built at the DeveloperWeek New York 2026 Hackathon.',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/algorithm-reviews',
    link: 'https://www.danmercede.com/works/algorithm-reviews/',
    video: 'https://youtu.be/LTc_OkIlrck',
    license: 'MIT',
    date: '2026-06-06',
    slug: 'algorithm-reviews',
  },
  {
    title: 'Proctor',
    description:
      'Behavioral regression testing for AI agents. Proctor learns a per-agent contract from sample runs, re-checks it on every model or prompt change, and classifies drift as real regression, legitimate evolution, or flaky. Consequential changes pause a durable workflow for human approval; approved evolution versions the contract. Verified live against a real UiPath tenant. Built for UiPath AgentHack 2026 (Track 3: UiPath Test Cloud); named a finalist.',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/proctor',
    link: 'https://www.danmercede.com/works/proctor/',
    video: 'https://youtu.be/GaTzq_fDmqU',
    license: 'MIT',
    date: '2026-07-23',
    slug: 'proctor',
  },
  {
    title: 'Impact Lens',
    description:
      "Blast-radius and change-impact analysis for code, 'what does changing this break, and what must I re-test?', built as a GitLab Duo Agent Platform skill and flow over the GitLab Orbit knowledge graph, and published to the GitLab AI Catalog. Built for the GitLab Transcend Hackathon (Showcase Track).",
    category: 'Agent Project',
    repo: 'https://gitlab.com/OrionArchitekton/orbit-impact-lens',
    license: 'MIT',
    date: '2026-06-23',
    slug: 'orbit-impact-lens',
  },
  {
    title: 'Quorum',
    description:
      "Decision-memory agent for Slack, detects when a thread reaches a decision, drafts a structured Decision Record, waits for human approval, files it to a canonical Decision Log, and answers 'what did we decide about X?' with sourced, permalink-cited replies. Built for the Slack Agent Builder Challenge.",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/quorum-slack-agent',
    link: 'https://www.danmercede.com/works/quorum/',
    license: 'MIT',
    date: '2026-06-06',
    slug: 'quorum',
  },
  {
    title: 'Plainspeak',
    description:
      'AI that reads the fine print, paste any dense document (a lease, a medical letter, terms of service) and get it back in plain words, the clauses that affect you ranked by severity, and the exact questions to ask before you sign. A single structured Claude call with a strict JSON contract, a not-legal-advice guardrail, and a defensive parser that keeps the UI clean. Built for the FutureAI Global Hackathon 2026.',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/plainspeak',
    link: 'https://www.danmercede.com/works/plainspeak/',
    video: 'https://youtu.be/EbHJ4gQpNS8',
    license: 'MIT',
    date: '2026-06-30',
    slug: 'plainspeak',
  },
  {
    title: 'Engram',
    description:
      'A memory engine for AI agents: typed memories with LLM-scored importance, recall greedily packed under a hard token budget, Ebbinghaus-style forgetting that retires stale memories without deleting them, and contradiction adjudication that supersedes old facts with an audit pointer. Pure TypeScript engine with 67 unit tests, an MCP server so any agent can adopt it as a memory backend, deployed on Alibaba Cloud Function Compute with Qwen Cloud models end to end. Built for the Qwen Cloud Global AI Hackathon (Track 1: MemoryAgent).',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/engram',
    link: 'https://www.danmercede.com/works/engram/',
    video: 'https://youtu.be/MWBz4cQEByc',
    license: 'MIT',
    date: '2026-07-10',
    slug: 'engram',
  },
  {
    title: 'Whisperways',
    description:
      "Noise-aware flight corridor planning for advanced air mobility: pick two Los Angeles vertiports and it returns the direct route and the quiet route, showing how many people can hear an eVTOL overhead under each, then has Claude draft the community impact brief a vertiport operator could hand a neighborhood council, grounded only in the engine's numbers. Real US Census population, published eVTOL flyover acoustics, and a population-noise Dijkstra router, with the first-order acoustic model honestly labeled a planning heuristic, not certification. Built for the HTCJ Aviation Futures Innovation Challenge.",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/whisperways',
    link: 'https://www.danmercede.com/works/whisperways/',
    video: 'https://youtu.be/pAYEz0GL6KQ',
    license: 'MIT',
    date: '2026-07-17',
    slug: 'whisperways',
  },
  {
    title: 'Notary',
    description:
      "The context lie detector for data catalogs: an agent that cross-examines a catalog's claims (units, freshness, completeness, enums, deprecation) against the warehouse with deterministic SQL, adjudicates each as CONFIRMED, CONTRADICTED, or UNVERIFIABLE with evidence, and writes what it learned back to DataHub as a trust ledger, evidence dossier, and provenance-labeled correction. The evaluation table is published verbatim, misses included: 9 of 12 planted lies caught and 0 of the 6 adjudicated controls misclassified, because for a trust product a wrong CONTRADICTED is worse than a declared miss. Built for the DataHub Agent Hackathon (Category 1: Agents That Do Real Work).",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/notary',
    link: 'https://www.danmercede.com/works/notary/',
    video: 'https://youtu.be/eMN0t10ZndM',
    license: 'Apache-2.0',
    date: '2026-07-19',
    slug: 'notary',
  },
  {
    title: 'Codex Rule Ledger',
    description:
      'Evidence-bound audits for Codex runs: it reconstructs the instruction chain from a launch capture and reports whether the supplied evidence supports, contradicts, or cannot decide each rule (SUPPORTED, CONTRADICTED, NOT_EVIDENCED, NOT_APPLICABLE), never confusing missing evidence with compliance or failure. GPT-5.6 proposes semantics; deterministic TypeScript alone owns evidence sufficiency and final ledger states, ending in a hash-bound JSON export. The public demo is deliberately recorded-case-only (two disclosed synthetic fixtures, keyless), and verification runs all 77 unit and contract tests plus five Chromium E2E flows. Built for OpenAI Build Week (Developer Tools).',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/codex-rule-ledger',
    link: 'https://www.danmercede.com/works/codex-rule-ledger/',
    video: 'https://youtu.be/7zJCkww6TaE',
    license: 'MIT',
    date: '2026-07-21',
    slug: 'codex-rule-ledger',
  },
  {
    title: 'Standing Questions',
    description:
      'Ask the Bluesky firehose a question once and get a living chart instead of a paragraph; pin it, and a scheduled agent keeps re-evaluating, reopening the thread in a public feed with a visual before/after delta card when the picture materially changes. Every turn runs as a durable Trigger.dev chat.agent() session, and the model never touches the database: it emits a JSON plan that a deterministic SQL gate validates before anything executes (single SELECT, allowlisted tables, re-validated at pin time and in the re-eval cron). 59 unit tests, with the honest limit stated up front: ingest is a sampled stream, a bounded 25 second Jetstream capture every 5 minutes, not the full firehose. Built for the ClickHouse and Trigger.dev Virtual Summer Hackathon 2026.',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/standing-questions',
    link: 'https://www.danmercede.com/works/standing-questions/',
    video: 'https://youtu.be/2oMPTFokXws',
    license: 'MIT',
    date: '2026-07-19',
    slug: 'standing-questions',
  },
  {
    title: 'Invisible Hand',
    description:
      'An agent economy where real on-chain settlement, not a simulated score, decides which AI agents survive and breed. Seller-agents earn Base Sepolia testnet USDC behind x402 paywalls, adversarial buyer-verifiers cross-check every answer against the live source, cumulative net profit is fitness, insolvency delists to HTTP 410, and profitable sellers breed through a six-rule fail-closed guild gate. The frozen run produced 731 on-chain settlements. Its first headline claimed the next generation earned several times the unit economics while verified accuracy fell, and a post-release errata retracted that reading: the comparison is largely survivorship of a hand-seeded price band, the accuracy decline is confounded and unsized, and four of six model ids were mispriced through a fallback. What survives is structural and is the point: fitness carries no accuracy term, so selection could only ever see profit. Built solo in one day at SwarmHack SF, and shipped with the errata that corrects it.',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/invisible-hand',
    link: 'https://www.danmercede.com/works/invisible-hand/',
    video: 'https://youtu.be/XA3-3MLTkAM',
    license: 'MIT',
    date: '2026-07-24',
    slug: 'invisible-hand',
  },
];

export { THOUGHTS };
export { GUIDES };
// Defensive: resolves to the generated DIAGRAMS array once present, else [].
export const DIAGRAMS: Diagram[] =
  (generatedBundle as { DIAGRAMS?: Diagram[] }).DIAGRAMS ?? [];

// --- /works dev-hub data (PR2) ---------------------------------------------
// FEATURED_ESSAY_SLUGS: operator-curated flagship essays surfaced on /works as a
// CAPPED pointer into /thoughts. The cap (3-5) is load-bearing, it keeps /works
// from drifting into a second /thoughts. Enforced by tests/worksHub.test.ts.
export const FEATURED_ESSAY_SLUGS: readonly string[] = [
  '2026-06-08-authority-gate-made-runnable',
  '2026-05-20-pre-execution-authority-gates',
  '2026-02-10-the-four-layer-enforcement-stack',
  '2026-05-19-the-merge-is-a-state-mutation',
  '2026-02-17-why-enterprise-ai-fails-at-runtime-not-capability',
];

// Resolve each featured slug to its THOUGHTS entry (title kept in sync with the
// corpus). FAIL-LOUD: throws if a slug is not in THOUGHTS, so a typo or an
// unpublished slug is caught at build/test, never shipped as a dangling link.
// Preserves FEATURED_ESSAY_SLUGS order. The optional `slugs` param exists only so
// the fail-loud path is unit-testable with a bogus slug; production calls pass none.
export function featuredEssays(
  slugs: readonly string[] = FEATURED_ESSAY_SLUGS,
): { slug: string; title: string }[] {
  const bySlug = new Map(THOUGHTS.map((t) => [t.slug, t]));
  return slugs.map((slug) => {
    const t = bySlug.get(slug);
    if (!t) {
      throw new Error(
        `featuredEssays: slug "${slug}" is not in THOUGHTS, fix FEATURED_ESSAY_SLUGS or publish the essay.`,
      );
    }
    return { slug: t.slug, title: t.title };
  });
}

// GUIDE_LENSES: hub-side curated theme lenses for the /guides index, mirroring the
// FEATURED_ESSAY_SLUGS pattern: explicit slug membership, never keyword inference.
// A guide may sit under multiple lenses; an unlensed guide still surfaces via the
// "all" lens and free-text search. Slug validity guarded by tests/guidesLenses.test.ts.
export const GUIDE_LENSES = [
  {
    id: 'all',
    label: 'All guides',
    description: 'The complete field library, newest first.',
    slugs: [] as readonly string[],
  },
  {
    id: 'agent-systems',
    label: 'Agent systems',
    description: 'Models, tools, schemas, context, and orchestration.',
    slugs: [
      'off-budget-subagents-under-claude-code',
      'giving-your-agent-web-access',
      'why-llm-schemas-get-rejected',
    ] as readonly string[],
  },
  {
    id: 'proof-review',
    label: 'Proof & review',
    description: 'Verification, layered review, evidence, and honest failure.',
    slugs: [
      'why-agent-code-needs-layered-review',
      'verifier-abstention-not-refutation',
      'agent-built-infrastructure-you-can-trust',
      'the-fail-closed-harness',
    ] as readonly string[],
  },
  {
    id: 'governed-delivery',
    label: 'Governed delivery',
    description: 'Approval boundaries, safe delivery, and owned infrastructure.',
    slugs: [
      'governed-double-send-safe-delivery',
      'self-hosting-websites-and-apps',
      'agent-built-infrastructure-you-can-trust',
      'the-fail-closed-harness',
    ] as readonly string[],
  },
] as const;

export type GuideLensId = (typeof GUIDE_LENSES)[number]['id'];

export const guideMatchesLens = (guide: Guide, lensId: GuideLensId): boolean => {
  const lens = GUIDE_LENSES.find((candidate) => candidate.id === lensId);
  if (!lens || lens.id === 'all') return true;
  return lens.slugs.includes(guide.slug);
};


// /works dev-hub framing: the single availability CTA, the contact route, and the
// outbound rail. Copy is operator-tunable. Consumed by BOTH the React WorksPage
// and the crawler bake so the visible and baked renders cannot drift.
export const WORKS_HUB = {
  availability: 'Available for staff/principal AI-systems roles and speaking.',
  // Secondary, additive qualifier. Deliberately does NOT replace the roles line:
  // both lanes stay open and a single CTA that tried to serve both would dilute each.
  // Describes a deliverable, never a guaranteed outcome.
  pilot: 'Running agents in production? I do a five-day readout on your own logs: cost per verified success, and what a quality floor would have caught.',
  contactHref: '/connect',
  githubUrl: 'https://github.com/OrionArchitekton',
  signalUrl: 'https://danmercede.online',
} as const;

// Evidence surface for /proof. EVERY claim here was independently re-verified by
// an adversarial reviewer that ran the `verify` string and tried to refute it.
// Claims that could not be reproduced, or whose wording overstated what the check
// actually showed, were dropped rather than softened.
//
// Do not add a line here without a `verify` a stranger can run.
// tests/proofEvidence.test.ts enforces that, and enforces that the limits tier
// stays non-empty: a proof page that only lists wins is marketing.
export const PROOF_EVIDENCE: EvidenceTier[] = [
  {
    id: 'independent',
    title: 'Independently validated',
    note: "Someone else's system attests to these. None of them rests on my own word.",
    claims: [
      {
        kind: 'check',
        claim:
          'Proctor was named a finalist in UiPath AgentHack 2026, Track 3 (UiPath Test Cloud). 31 finalists were selected from the 203 solutions that reached judging, and Track 3 accounted for 11 of them.',
        verify:
          'https://forum.uipath.com/t/this-years-uipath-agenthack-finalist-teams-are-here/5762660',
        verifyKind: 'url',
        sources: [
          'https://forum.uipath.com/t/this-years-uipath-agenthack-finalist-teams-are-here/5762660',
        ],
      },
      {
        kind: 'check',
        claim:
          'A pull request authored by OrionArchitekton is merged into Arize-ai/openinference, a public repository with 1,113 stars.',
        verify:
          'gh api repos/Arize-ai/openinference/pulls/3238 --jq \'{merged,author:.user.login}\' && gh api repos/Arize-ai/openinference --jq .stargazers_count',
        verifyKind: 'command',
        sources: ['https://github.com/Arize-ai/openinference/pull/3238'],
      },
      {
        kind: 'check',
        claim:
          'A pull request authored by OrionArchitekton is merged into punkpeye/fastmcp, a public repository with 3,236 stars.',
        verify:
          'gh api repos/punkpeye/fastmcp/pulls/275 --jq \'{merged,author:.user.login}\' && gh api repos/punkpeye/fastmcp --jq .stargazers_count',
        verifyKind: 'command',
        sources: ['https://github.com/punkpeye/fastmcp/pull/275'],
      },
    ],
  },
  {
    id: 'reproducible',
    title: 'Publicly reproducible',
    note: 'My own CI and releases. The claim is that you can re-run every check yourself, not that a third party audited it.',
    claims: [
      {
        kind: 'check',
        claim:
          '552 tests pass in CI across 8 public repositories: notary 159, reprise 92, schemafit 90, failclosed 59, mcp-context-budget 56, standing-questions 55, fork-around-find-out 39, orion-skills 2.',
        // Extracts the per-repo pass counts from each run log rather than only
        // listing run ids, so the command establishes the numbers the claim asserts.
        verify:
          'for r in notary reprise schemafit failclosed mcp-context-budget standing-questions fork-around-find-out orion-skills; do id=$(gh run list -R OrionArchitekton/$r --branch main --limit 1 --json databaseId --jq \'.[0].databaseId\'); echo "== $r"; gh run view $id -R OrionArchitekton/$r --log | grep -aE \'[0-9]+ passed|Tests [0-9]+ passed|Ran [0-9]+ test\'; done',
        verifyKind: 'command',
        sources: ['https://github.com/OrionArchitekton?tab=repositories'],
      },
      {
        kind: 'check',
        claim:
          'failclosed contains exactly 59 test definitions across its 3 test files, matching the 59 tests its CI run executes.',
        verify:
          'for f in test_graphql_helpers.py test_parse_codex_output.py test_resolve_bot_threads.py; do gh api repos/OrionArchitekton/failclosed/contents/$f --jq .content | base64 -d | grep -cE \'^[[:space:]]*def test_\'; done',
        verifyKind: 'command',
        sources: ['https://github.com/OrionArchitekton/failclosed'],
      },
      {
        kind: 'check',
        claim:
          'schemafit publishes 5 released versions on PyPI, 0.1.0 through 0.5.0, MIT licensed.',
        verify:
          'curl -s https://pypi.org/pypi/schemafit/json | python3 -c "import json,sys;d=json.load(sys.stdin);print(sorted(d[\'releases\']), d[\'info\'][\'license\'])"',
        verifyKind: 'command',
        sources: ['https://pypi.org/project/schemafit/'],
      },
      {
        kind: 'check',
        claim: 'mcp-context-budget publishes 1 released version on PyPI, 0.4.0, MIT licensed.',
        verify:
          'curl -s https://pypi.org/pypi/mcp-context-budget/json | python3 -c "import json,sys;d=json.load(sys.stdin);print(sorted(d[\'releases\']), d[\'info\'][\'license\'])"',
        verifyKind: 'command',
        sources: ['https://pypi.org/project/mcp-context-budget/'],
      },
      {
        kind: 'check',
        // Narrowed deliberately. A reader can see the workflow requests an OIDC
        // token and references no API-token secret. Nobody outside the org can
        // enumerate stored Actions secrets, so a stronger "no token is stored"
        // phrasing would assert more than its own check can establish.
        claim:
          'Both published packages release through PyPI Trusted Publishing. Both release workflows request an OIDC id-token and reference no API-token secret.',
        verify:
          'for r in schemafit mcp-context-budget; do echo "== $r"; curl -s https://raw.githubusercontent.com/OrionArchitekton/$r/main/.github/workflows/release.yml | grep -nE \'id-token|secrets\\.\'; done',
        verifyKind: 'command',
        sources: [
          'https://github.com/OrionArchitekton/schemafit/blob/main/.github/workflows/release.yml',
          'https://github.com/OrionArchitekton/mcp-context-budget/blob/main/.github/workflows/release.yml',
        ],
      },
      {
        kind: 'check',
        // The strongest form of "the gates are real": a public run where one
        // FIRED. Green CI has two indistinguishable causes (nothing to catch,
        // or catching nothing); a red run on main removes the ambiguity.
        claim:
          "The quality gates publicly fire rather than wave work through: reprise's CI history on main includes a push run where the Typecheck step failed the build, on 2026-07-26.",
        // The run page renders step names client-side only, so the check reads
        // the public jobs API, which needs no authentication.
        verify:
          'curl -s https://api.github.com/repos/OrionArchitekton/reprise/actions/runs/30221340528 | python3 -c "import json,sys;r=json.load(sys.stdin);print(r[\'head_branch\'],r[\'event\'],r[\'created_at\'][:10],r[\'conclusion\'])"; curl -s https://api.github.com/repos/OrionArchitekton/reprise/actions/runs/30221340528/jobs | python3 -c "import json,sys;j=json.load(sys.stdin)[\'jobs\'][0];print(j[\'name\'],j[\'conclusion\'],[s[\'name\'] for s in j[\'steps\'] if s[\'conclusion\']==\'failure\'])"',
        verifyKind: 'command',
        sources: ['https://github.com/OrionArchitekton/reprise/actions/runs/30221340528'],
      },
      {
        kind: 'check',
        claim:
          "failclosed's enforcement contract is runnable by any stranger: a fresh clone passes its 59-test suite, which includes tests asserting that unparseable and schema-invalid reviewer output blocks a MERGE_READY verdict.",
        verify:
          'git clone --depth 1 https://github.com/OrionArchitekton/failclosed && cd failclosed && python3 -m pytest -q',
        verifyKind: 'command',
        sources: ['https://github.com/OrionArchitekton/failclosed'],
      },
      {
        kind: 'check',
        claim:
          'The orion-skills library publicly catalogs 26 agent skills as individually readable SKILL.md files, read 2026-07-27.',
        verify:
          'curl -s "https://api.github.com/repos/OrionArchitekton/orion-skills/git/trees/main?recursive=1" | grep -oE \'"skills/[^"]*/SKILL.md"\' | wc -l',
        verifyKind: 'command',
        sources: ['https://github.com/OrionArchitekton/orion-skills'],
      },
      {
        kind: 'check',
        claim:
          'Three repositories pin every third-party GitHub Action to a full commit SHA rather than a floating tag: notary, reprise, and fork-around-find-out. Each has exactly one workflow file, so the check covers all of them.',
        // Lists the workflow directory first, so the reader confirms ci.yml is the
        // only workflow before reading its uses: lines. Without that step the
        // command would only prove pinning in one file of an unknown set.
        verify:
          'for r in notary reprise fork-around-find-out; do echo "== $r"; gh api repos/OrionArchitekton/$r/contents/.github/workflows --jq \'.[].name\'; gh api repos/OrionArchitekton/$r/contents/.github/workflows/ci.yml --jq .content | base64 -d | grep \'uses:\'; done',
        verifyKind: 'command',
        sources: [
          'https://github.com/OrionArchitekton/notary/blob/main/.github/workflows/ci.yml',
          'https://github.com/OrionArchitekton/reprise/blob/main/.github/workflows/ci.yml',
          'https://github.com/OrionArchitekton/fork-around-find-out/blob/main/.github/workflows/ci.yml',
        ],
      },
    ],
  },
  {
    id: 'published',
    title: 'Published work and live surfaces',
    note: 'Self-published and self-hosted. These establish volume, recency, and that the systems serve live. None of it is reach, endorsement, or third-party review.',
    claims: [
      {
        kind: 'check',
        claim:
          '43 individually addressable articles are self-published on danmercede.com: 34 essays under /thoughts and 9 long-form guides under /guides, each enumerated in the public sitemap, read 2026-07-27.',
        verify:
          "curl -s https://www.danmercede.com/sitemap.xml | grep -oE 'danmercede.com/(thoughts|guides)/' | sort | uniq -c",
        verifyKind: 'command',
        sources: ['https://www.danmercede.com/sitemap.xml'],
      },
      {
        kind: 'check',
        // The command reproduces every number in the claim: the count, both
        // dates, and how many articles declare a hub canonical.
        claim:
          '40 articles are published on dev.to under the danmercede account, dated 2026-06-20 through 2026-07-24, and 37 of the 40 declare a rel=canonical URL pointing back to danmercede.com or danmercede.online, read 2026-07-27.',
        verify:
          'curl -s "https://dev.to/api/articles?username=danmercede&per_page=200" | python3 -c "import json,sys;a=json.load(sys.stdin);print(len(a),min(x[\'published_at\'][:10] for x in a),max(x[\'published_at\'][:10] for x in a),sum(1 for x in a if str(x.get(\'canonical_url\')).startswith((\'https://www.danmercede.com/\',\'https://www.danmercede.online/\'))))"',
        verifyKind: 'command',
        sources: ['https://dev.to/danmercede'],
      },
      {
        kind: 'check',
        // The homepage does not display a post count, so the check queries
        // Hashnode's public GraphQL API, which needs no token for reads.
        claim:
          'The Hashnode publication danmercede.hashnode.dev carries 32 published posts, and all 32 declare a canonical URL pointing back to danmercede.com or danmercede.online, read 2026-07-27.',
        verify:
          'curl -s -X POST https://gql-beta.hashnode.com -H \'Content-Type: application/json\' -d \'{"query":"query{publication(host:\\"danmercede.hashnode.dev\\"){posts(first:50){totalDocuments edges{node{canonicalUrl}}}}}"}\' | python3 -c "import json,sys;p=json.load(sys.stdin)[\'data\'][\'publication\'][\'posts\'];print(p[\'totalDocuments\'],sum(1 for e in p[\'edges\'] if str(e[\'node\'][\'canonicalUrl\']).startswith((\'https://www.danmercede.com/\',\'https://www.danmercede.online/\'))))"',
        verifyKind: 'command',
        sources: ['https://danmercede.hashnode.dev/'],
      },
      {
        kind: 'check',
        claim:
          'A public speaker profile exists on Sessionize, listing speaking topics across AI governance and agentic systems. A self-managed profile, not third-party recognition.',
        verify: 'https://sessionize.com/dan-mercede/',
        verifyKind: 'url',
        sources: ['https://sessionize.com/dan-mercede/'],
      },
      {
        kind: 'check',
        // Unknown /works paths also return 200 with the hub shell, so liveness
        // is established by each page's own title, never by status code.
        claim:
          'Each of the 19 product pages under danmercede.com/works serves live with its own product title, asserted against an expected-title map rather than a status code.',
        verify:
          "set -euo pipefail; while IFS='|' read -r s want; do got=$(curl -sL --fail --show-error https://www.danmercede.com/works/$s/ | grep -o 'title>[^<]*' | head -1); case \"$got\" in *\"$want\"*) echo \"OK $s\";; *) echo \"FAIL $s: $got\"; exit 1;; esac; done <<'EOF'\nagent-demo-video|automated, narrated, captioned demo videos\nalgorithm-reviews|a review whose reviewing is reviewable\ncodex-rule-ledger|evidence-bound audits for Codex runs\nengram|a memory engine for AI agents\nfailclosed|Fail-closed merge admission control\nfork-around-find-out|speculative execution for agent safety\ninvisible-hand|an agent economy where on-chain settlement\nlocalfiscal|Local-first private receipt\nmcp-context-budget|enforce MCP tool-surface budgets\nnotary|the context lie detector\norion-skills|skills for Claude Code\nplainspeak|AI that reads the fine print\nproctor|behavioral regression testing for AI agents\nquorum|the decision memory for your Slack workspace\nrekindle|your abandoned side project misses you\nreprise|check what you already generated\nschemafit|Lint LLM structured-output\nstanding-questions|ask a live stream once\nwhisperways|noise-aware eVTOL flight corridors\nEOF",
        verifyKind: 'command',
        sources: ['https://www.danmercede.com/works'],
      },
      {
        kind: 'check',
        claim:
          'danmercede.online, the public raw working log, lists 117 dated entries in its sitemap, read 2026-07-27.',
        verify:
          "curl -sL https://www.danmercede.online/sitemap.xml | grep -cE '/[0-9]{4}-[0-9]{2}-[0-9]{2}-'",
        verifyKind: 'command',
        sources: ['https://www.danmercede.online/sitemap.xml'],
      },
      {
        kind: 'check',
        claim:
          'Six of the shipped tools serve live public demos, read 2026-07-27: Reprise, Fork Around & Find Out, Standing Questions, Quorum, Notary, and Engram.',
        verify:
          "set -euo pipefail; while IFS='|' read -r u want; do got=$(curl -sL --fail --show-error https://$u | grep -o 'title>[^<]*' | head -1); case \"$got\" in *\"$want\"*) echo \"OK $u\";; *) echo \"FAIL $u: $got\"; exit 1;; esac; done <<'EOF'\nreprise-murex.vercel.app|Reprise\nfork-around-find-out.vercel.app|speculative execution for agent safety\nstanding-questions.vercel.app|Standing Questions\nquorum-slack-agent.vercel.app|Quorum\nnotary-replay.vercel.app|Notary\nengram.orionbot.online|a memory engine for AI agents\nEOF",
        verifyKind: 'command',
        sources: [
          'https://reprise-murex.vercel.app',
          'https://fork-around-find-out.vercel.app',
          'https://standing-questions.vercel.app',
          'https://quorum-slack-agent.vercel.app',
          'https://notary-replay.vercel.app',
          'https://engram.orionbot.online',
        ],
      },
      {
        kind: 'check',
        claim:
          'Orion Intelligence Agency, the consulting lane I operate, publishes 15 individually addressable insight articles on its live site, each listed in the public sitemap, read 2026-07-27.',
        verify:
          "curl -s https://www.orionintelligenceagency.com/sitemap-0.xml | grep -c 'insights/'",
        verifyKind: 'command',
        sources: [
          'https://www.orionintelligenceagency.com/sitemap-0.xml',
          'https://www.orionintelligenceagency.com/insights',
        ],
      },
      {
        kind: 'check',
        // Narrowed from "carries zero percentage or dollar figures": the raw
        // HTML contains a Tailwind gradient stop ("transparent_68%"), so a
        // stranger's grep would surface a percent sign that is not content.
        // The quote is what the command reproduces cleanly.
        claim:
          "OIA's case-studies page publishes anonymized engagement shapes under an explicit disclaimer: Not invented guarantees. They show how we work, not promised metrics.",
        verify:
          "curl -s https://www.orionintelligenceagency.com/case-studies | sed 's/<[^>]*>/ /g' | tr -s ' ' | grep -oE 'Not invented guarantees|These are anonymized engagement shapes|They show how we work, not promised metrics' | sort -u",
        verifyKind: 'command',
        sources: ['https://www.orionintelligenceagency.com/case-studies'],
      },
      {
        kind: 'check',
        claim:
          'Five primary pages of the OIA site (home, about, services, contact, and case-studies) each disclose the operating entity: Orion Intelligence Agency, LLC, founded 2025 in Ohio. Disclosure on my own site, not an independent registry record.',
        verify:
          'for p in "" about services contact case-studies; do printf \'/%s: \' "$p"; curl -s "https://www.orionintelligenceagency.com/$p" | grep -c \'Orion Intelligence Agency, LLC, founded 2025 in Ohio\'; done',
        verifyKind: 'command',
        sources: [
          'https://www.orionintelligenceagency.com/',
          'https://www.orionintelligenceagency.com/about',
          'https://www.orionintelligenceagency.com/services',
          'https://www.orionintelligenceagency.com/contact',
          'https://www.orionintelligenceagency.com/case-studies',
        ],
      },
    ],
  },
  {
    id: 'not-claimed',
    title: 'What this page does not claim',
    note: 'The limits are part of the evidence. A proof page that lists only wins is marketing.',
    claims: [
      {
        kind: 'limitation',
        claim:
          'Self-run CI is not third-party review. The test counts above come from my own pipelines. Reproducibility is the claim; independent audit is not.',
      },
      {
        kind: 'check',
        claim:
          '6 of the 14 tool repositories ship no CI at all: engram, proctor, agent-demo-video, invisible-hand, plainspeak, and whisperways.',
        // Iterates the full 14-repo corpus the claim is measured against, so the
        // denominator is established by the command rather than asserted by me.
        verify:
          'for r in failclosed orion-skills schemafit mcp-context-budget engram notary proctor reprise agent-demo-video invisible-hand plainspeak standing-questions whisperways fork-around-find-out; do printf "%s " "$r"; gh api repos/OrionArchitekton/$r/contents/.github/workflows --jq \'[.[].name]|join(",")\' 2>/dev/null || echo "NO CI"; done',
        verifyKind: 'command',
        sources: ['https://github.com/OrionArchitekton?tab=repositories'],
      },
      {
        kind: 'check',
        claim:
          'Fork Around & Find Out was submitted to Daytona HackSprint #5 and won no prize. It appears in the public project gallery with no winner badge.',
        verify: 'https://devpost.com/software/fork-around-find-out',
        verifyKind: 'url',
        sources: ['https://devpost.com/software/fork-around-find-out'],
      },
      {
        kind: 'check',
        claim:
          'Invisible Hand is listed on the SwarmHack gallery with judging locked and no award, prize, or placement.',
        verify: 'https://tokensand.com/p/invisible-hand',
        verifyKind: 'url',
        sources: ['https://tokensand.com/p/invisible-hand'],
      },
      {
        kind: 'limitation',
        claim:
          'No paying-customer outcomes are published here. The reference architectures on this page are illustrative patterns, not engagement records, and each download opens by saying so.',
      },
      {
        kind: 'limitation',
        claim:
          'No third-party editorial placement exists to date. Every article above is self-published or syndicated under my own canonical URLs, and no conference talk has been delivered to date.',
      },
    ],
  },
];
