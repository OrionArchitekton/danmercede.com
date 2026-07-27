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
import { Pillar, Venture, Belief, Resource, CaseStudy, Work, Guide, Diagram } from './types';
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
