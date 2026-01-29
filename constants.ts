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
import { Pillar, Venture, Belief, Thought } from './types';

export const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Ecosystem', path: '/ecosystem' },
  { label: 'Thoughts', path: '/thoughts' },
  { label: 'Connect', path: '/connect' },
];

export const HERO_CONTENT = {
  name: "DAN MERCEDE",
  positioning: "Systems that scale. Intelligence that serves.",
  philosophy: "Building the infrastructure for human-owned intelligence and governed automation.",
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

export const TARGET_AUDIENCE = [
  "Builders", "Operators", "Investors", "Enterprise Teams"
];

export const FOOTER_DATA = {
  jurisdiction: "United States",

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
