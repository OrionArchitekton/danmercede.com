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
import { Pillar, Venture, Belief, Resource, CaseStudy, Work } from './types';
import { THOUGHTS } from './constants.generated';
import { GUIDES } from './constants.guides.generated';

export const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Ecosystem', path: '/ecosystem' },
  { label: 'Thoughts', path: '/thoughts' },
  { label: 'Proof', path: '/proof' },
  { label: 'Works', path: '/works' },
  { label: 'Guides', path: '/guides' },
  { label: 'Connect', path: '/connect' },
];

export const HERO_CONTENT = {
  name: "DAN MERCEDE",
  positioning: "Enterprise AI doesn't fail on capability — it fails at runtime.",
  philosophy: "I design Runtime-Enforced Governed AI Operating Systems that fail closed, enforce authority, and generate audit-grade receipts.",
  wedge: "If governance isn't enforced at runtime, it isn't governance.",
};

export const PILLARS: Pillar[] = [
  { title: "Human-Owned Intelligence", icon: Cpu, description: "AI aligned with operator intent, control, and accountability." },
  { title: "Governance & Accountability", icon: ShieldCheck, description: "Traceability, auditability, and policy enforcement by default." },
  { title: "Execution Over Hype", icon: Zap, description: "Production systems with measurable outcomes — not experiments." },
  { title: "Systems That Scale", icon: Network, description: "Architectures designed to compound, degrade safely, and endure." },
];

export const BUILD_AREAS = [
  {
    label: "Platform",
    icon: Globe,
    description: "Governed AI Operating System design, control planes, and execution frameworks that unify memory, decisioning, and oversight."
  },
  {
    label: "Agency",
    icon: Briefcase,
    description: "Enterprise AI reliability engineering — hardening workflows, enforcing constraints, and shipping governance-ready systems."
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
    role: "Enterprise AI Reliability Engineering",
    description: "Orion Intelligence Agency hardens and deploys governed AI systems in production environments, focusing on reliability, auditability, and execution under risk.",
    ecosystemRole: "Orion Intelligence Agency (OIA) applies and hardens governed AI systems in production environments where reliability, compliance, and auditability are required.",
    systemRelationship: "OIA deploys and validates Cosmocrat inside real enterprise workflows, translating the operating system into measurable outcomes without compromising governance.",
    operatingConstraints: "Enterprise-only. Execution-first. No experimentation in production. Designed for risk, security, and compliance teams.",
    status: "ENTERPRISE EXECUTION",
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
  cta: "Book a Runtime Governance Readiness Scan",
  deliverables: [
    "Control-plane gap map",
    "Failure-mode heatmap",
    "Enforcement checklist",
    "30/60/90 hardening roadmap",
  ],
  href: "https://www.orionintelligenceagency.com/readiness-scan",
};

export const PRIMARY_VENTURES = ['Cosmocrat', 'Orion Intelligence Agency'];

export const TARGET_AUDIENCE = [
  "Builders", "Operators", "Investors", "Enterprise Teams"
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
  // L1 — Authority Gate
  {
    title: "Governance Readiness Evidence Pack",
    description: "47 audit-ready evidence items mapping to deterministic enforcement points. Proves authority verification, attestation coverage, behavioral containment, and substrate isolation — structured for SOC 2 AI, ISO 42001, and EU AI Act readiness.",
    category: "lead-magnet",
    fileName: "Governance_Readiness_Evidence_Pack.docx",
    filePath: "/assets/Governance_Readiness_Evidence_Pack.docx",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 1,
    riskDomain: "Regulatory exposure — SOC 2 AI / ISO 42001 / EU AI Act control failure from ungoverned execution paths",
    gated: true,
    enforcementPoint: "Authority verification before state mutation",
    artifactType: "evidence-pack",
    fileType: "docx",
    fileSize: "29 KB",
  },
  {
    title: "What We Deliver",
    description: "Engagement deliverable map linking control-plane gap analysis, failure-mode heatmaps, and evidence checklists to enforcement layers. Risk-bounded pricing tiers anchored to audit defensibility outcomes.",
    category: "sales-collateral",
    fileName: "What_We_Deliver.pdf",
    filePath: "/assets/What_We_Deliver.pdf",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 1,
    riskDomain: "Deployment friction — no structured path from SOC 2 / ISO 42001 gap identification to deterministic enforcement",
    gated: false,
    enforcementPoint: "Pre-execution authority gate evaluation",
    artifactType: "one-sheet",
    fileType: "pdf",
    fileSize: "4 KB",
  },
  // L2 — Immutable Receipts
  {
    title: "Control-Plane Blueprint",
    description: "Component-level architecture of the four-layer enforcement cascade. Details intent boundary evaluation, cryptographic attestation pipelines, drift detection thresholds, and substrate isolation mechanics. The architectural proof behind immutable receipts.",
    category: "lead-magnet",
    fileName: "Control_Plane_Blueprint.docx",
    filePath: "/assets/Control_Plane_Blueprint.docx",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 2,
    riskDomain: "Irreversible state change — SOC 2 CC6.1 / ISO 42001 A.6.2 mutations without cryptographic attestation",
    gated: true,
    enforcementPoint: "Cryptographic attestation before mutation commit",
    artifactType: "blueprint",
    fileType: "docx",
    fileSize: "23 KB",
  },
  {
    title: "Executive Deck",
    description: "10-slide enforcement stack walkthrough with gate pipeline flow, ROI proof metrics, and engagement model. Maps cost per successful task, escalation rate reduction, and cycle-time compression to the four-layer cascade.",
    category: "deck",
    fileName: "Executive_Deck.pptx",
    filePath: "/assets/Executive_Deck.pptx",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 2,
    riskDomain: "Financial impact — SOC 2 CC7.2 uncontrolled execution without attestation trail",
    gated: false,
    enforcementPoint: "Append-only receipt ledger for mutation non-repudiation",
    artifactType: "deck",
    fileType: "pptx",
    fileSize: "236 KB",
  },
  // L3 — Drift Guard
  {
    title: "Case Study Template",
    description: "Structured engagement template mapping findings to enforcement stack layers. Captures enforcement points deployed, behavioral drift metrics, containment thresholds, and quantified risk reduction tied to operational blast radius.",
    category: "template",
    fileName: "Case_Study_Template.docx",
    filePath: "/assets/Case_Study_Template.docx",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 3,
    riskDomain: "Operational blast radius — ISO 42001 A.8.4 compounded deviation from unconstrained autonomous behavior",
    gated: false,
    enforcementPoint: "Behavioral containment across time — authority decay enforcement",
    artifactType: "template",
    fileType: "docx",
    fileSize: "13 KB",
  },
  // L4 — Gated Substrate
  {
    title: "Speaking One-Sheet",
    description: "Credential and topic mapping for CIO, CTO, CISO audiences. Talk tracks anchored to enforcement stack layers, substrate isolation mechanics, and quantified enterprise risk reduction. Architectural authority positioning.",
    category: "sales-collateral",
    fileName: "Speaking_One_Sheet.pdf",
    filePath: "/assets/Speaking_One_Sheet.pdf",
    enforcementLayers: [1, 2, 3, 4],
    enforcementLayer: 4,
    riskDomain: "Escalation rate — EU AI Act Article 14 / NIST AI RMF intelligence routing itself without substrate containment",
    gated: false,
    enforcementPoint: "Physical isolation at execution substrate — capability removal over restriction",
    artifactType: "one-sheet",
    fileType: "pdf",
    fileSize: "4 KB",
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: "Runtime Governance in Financial Services",
    slug: "financial-services",
    industry: "Financial Services",
    enforcementLayers: [1, 2],
    layerNames: ["Authority Gate", "Immutable Receipts"],
    metrics: [
      { label: "Escalation Reduction", value: "67%" },
      { label: "Task Completion", value: "94%" },
      { label: "ROI Multiple", value: "4.2x" },
      { label: "Cycle Time", value: "<48 hrs" },
    ],
    description: "Pre-execution authority verification for trading operations and cryptographic attestation for state mutations. Maps to $4.2M financial exposure, SOC 2, and SOX compliance requirements.",
    fileName: "Case_Study_Financial_Services.docx",
    filePath: "/assets/Case_Study_Financial_Services.docx",
    enforcementPoints: [
      "Pre-execution authority verification for trading operations",
      "Cryptographic attestation for state mutations",
    ],
    commercialMapping: [
      "$4.2M financial exposure containment",
      "SOC 2 audit defensibility",
      "SOX compliance enforcement",
      "Operational blast radius reduction",
    ],
  },
  {
    title: "Runtime Governance in Healthcare",
    slug: "healthcare",
    industry: "Healthcare",
    enforcementLayers: [3, 4],
    layerNames: ["Drift Guard", "Gated Substrate"],
    metrics: [
      { label: "SLA Compliance", value: "97%" },
      { label: "Unattested Mutations", value: "Zero" },
      { label: "Privilege Creep Reduction", value: "89%" },
    ],
    description: "Behavioral containment for clinical decision support and workload isolation for PHI-handling agents. Maps to HIPAA and FDA SaMD regulatory exposure.",
    fileName: "Case_Study_Healthcare.docx",
    filePath: "/assets/Case_Study_Healthcare.docx",
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

// Curated Works / Open-Source surface (W1: static, like VENTURES/CASE_STUDIES —
// not substrate-sourced). Append a new entry here whenever a public work ships
// (see docs/runbooks/works-update-on-ship.md).
export const WORKS: Work[] = [
  {
    title: 'orion-skills',
    description:
      'An open collection of first-party Claude Code skills — structural read-only mode, scope guarding, ship discipline, pre-PR checks, incident-as-code, learning capture, goal-prompt authoring, and pre-compact handoffs — extracted from production operator workflows.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/orion-skills',
    link: 'https://orion-skills.danmercede.com/',
    gist: 'https://gist.github.com/OrionArchitekton/6406f7c87d87668023b6594211fd791e',
    license: 'MIT',
    date: '2026-06-17',
    slug: 'orion-skills',
  },
  {
    title: 'mcp-context-budget',
    description:
      'A local-first CLI that keeps your MCP tool surface from eating the agent context budget — it scans tool schemas and response fixtures for token bloat, selects the smallest relevant tool set for a given task, emits a budget lockfile, and fails CI when a config regresses. Self-contained: no external services, runs from a fresh clone against fixture data.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/mcp-context-budget',
    link: 'https://mcp-context-budget.danmercede.com/',
    license: 'MIT',
    date: '2026-06-18',
    slug: 'mcp-context-budget',
  },
  {
    title: 'schemafit',
    description:
      'A local-first CLI that lints a JSON Schema, structured-output spec, or tool definition against the constraint surface of each major LLM provider (OpenAI, Anthropic, Gemini, Mistral, Cohere) and fails CI before the schema 400s in production — naming the exact JSON-Pointer path, the violated keyword, and the reason, plus a repair pass that emits a provider-valid variant. Static and offline: no API calls, runs from a fresh clone.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/schemafit',
    link: 'https://schemafit.danmercede.com/',
    license: 'MIT',
    date: '2026-06-19',
    slug: 'schemafit',
  },
  {
    title: 'failclosed',
    description:
      'Fail-closed merge admission control for agent-written code — runs an LLM reviewer, then refuses to report MERGE_READY when the output is unparseable, schema-invalid, or self-contradictory. Enforcement precedes the merge decision; the reviewer is a configurable command seam. Python 3.9+, self-contained.',
    category: 'Open Source',
    repo: 'https://github.com/OrionArchitekton/failclosed',
    link: 'https://failclosed.danmercede.com/',
    license: 'MIT',
    date: '2026-06-21',
    slug: 'failclosed',
  },
  // --- Applied Agent Projects — hackathon-built agent systems, surfaced as a
  // distinct /works section (App.tsx WorksPage filters on category). Competition
  // context lives in each description, not the section heading. ---
  {
    title: 'algorithm.reviews',
    description:
      'The Agent Trust Layer — a governed review agent that fans out across the live web, decides which sources are admissible (fail-closed), forms a verdict grounded only in admitted evidence, and ships a signed, verifiable review receipt: per-claim confidence, timestamped citations, dissent, and an ECDSA signature anyone can check. Built at the DeveloperWeek New York 2026 Hackathon.',
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/algorithm-reviews',
    link: 'https://algorithm-reviews.vercel.app',
    license: 'MIT',
    date: '2026-06-06',
    slug: 'algorithm-reviews',
  },
  {
    title: 'Proctor',
    description:
      "The agent that QAs other agents — regression-tests non-deterministic AI automations by learning each one's behavioral contract, catching when a model or prompt change silently breaks it, self-healing the tests when the change is legitimate, and escalating real regressions to a human. Built for UiPath AgentHack 2026 (Track 3: UiPath Test Cloud).",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/proctor',
    license: 'MIT',
    date: '2026-06-05',
    slug: 'proctor',
  },
  {
    title: 'Impact Lens',
    description:
      "Blast-radius and change-impact analysis for code — 'what does changing this break, and what must I re-test?' — built as a GitLab Duo Agent Platform skill and flow over the GitLab Orbit knowledge graph, and published to the GitLab AI Catalog. Built for the GitLab Transcend Hackathon (Showcase Track).",
    category: 'Agent Project',
    repo: 'https://gitlab.com/OrionArchitekton/orbit-impact-lens',
    license: 'MIT',
    date: '2026-06-23',
    slug: 'orbit-impact-lens',
  },
  {
    title: 'Quorum',
    description:
      "Decision-memory agent for Slack — detects when a thread reaches a decision, drafts a structured Decision Record, waits for human approval, files it to a canonical Decision Log, and answers 'what did we decide about X?' with sourced, permalink-cited replies. Built for the Slack Agent Builder Challenge.",
    category: 'Agent Project',
    repo: 'https://github.com/OrionArchitekton/quorum-slack-agent',
    link: 'https://quorum-slack-agent.vercel.app',
    license: 'MIT',
    date: '2026-06-06',
    slug: 'quorum',
  },
];

export { THOUGHTS };
export { GUIDES };

// --- /works dev-hub data (PR2) ---------------------------------------------
// FEATURED_ESSAY_SLUGS: operator-curated flagship essays surfaced on /works as a
// CAPPED pointer into /thoughts. The cap (3-5) is load-bearing — it keeps /works
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
        `featuredEssays: slug "${slug}" is not in THOUGHTS — fix FEATURED_ESSAY_SLUGS or publish the essay.`,
      );
    }
    return { slug: t.slug, title: t.title };
  });
}

// /works dev-hub framing: the single availability CTA, the contact route, and the
// outbound rail. Copy is operator-tunable. Consumed by BOTH the React WorksPage
// and the crawler bake so the visible and baked renders cannot drift.
export const WORKS_HUB = {
  availability: 'Available for staff/principal AI-systems roles and speaking.',
  contactHref: '/connect',
  githubUrl: 'https://github.com/OrionArchitekton',
  signalUrl: 'https://danmercede.online',
} as const;
