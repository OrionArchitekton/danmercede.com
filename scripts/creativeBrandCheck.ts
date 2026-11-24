import type { Guide, Thought } from '../types';

export const CREATIVE_KIT_VERSION = '0.2.0';
export const VOICE_PROFILE_ID = 'dan_mercede';
export const VOICE_PROFILE_SHA256 =
  'c7740e52bea9c9469b3eba9337e486d28211c7dd83b3b56f72eb6d96068fc235';
export const CREATIVE_BRIEF_SCHEMA = 'CreativeBrief.v1';

// Codepoint lookup so zero banned dash characters appear in source files.
export const BANNED_DASHES: Record<number, string> = {
  0x2014: 'em dash',
  0x2013: 'en dash',
  0x2015: 'horizontal bar',
};

export const HARD_SLOP_LEXEMES = [
  'delve',
  'tapestry',
  'multifaceted',
  'seamless',
  'a myriad of',
  "it's worth noting",
  "in today's digital age",
  'testament to',
  'game-changer',
  'paradigm shift',
  'navigating the landscape',
] as const;

export const KOBAK_EXCESS_TERMS = [
  'intricacies',
  'meticulous',
  'meticulously',
  'notably',
  'underscores',
  'underscore',
  'pivotal',
  'fostering',
  'foster',
  'garnered',
  'bolster',
  'showcase',
  'showcasing',
  'highlighting',
  'emphasizing',
  'crucial',
  'enhance',
  'enhancing',
  'intricate',
  'elevate',
  'realm',
  'unlock',
  'empower',
  'leverage',
  'robust',
  'harness',
  'commendable',
  'versatile',
  'groundbreaking',
  'transformative',
  'streamline',
  'unprecedented',
  'comprehensive',
  'indispensable',
  'burgeoning',
  'reimagine',
  'spearhead',
  'amplify',
  'synergize',
  'catalyst',
  'paramount',
  'nuanced',
  'poised',
  'cornerstone',
  'linchpin',
  'holistic',
  'ever-evolving',
  'resonate',
] as const;

export const THRILLER_CLICHES = [
  'vanished off the face of the earth',
  'in the dead of night',
  'conjured out of thin air',
  'crown-jewel',
  'nondescript office park',
  'behind closed doors',
  'ticking time bomb',
  'game of cat and mouse',
  'house of cards',
  'perfect storm',
  'shrouded in secrecy',
  'sent shockwaves',
  'double-edged sword',
] as const;

export const META_ANNOUNCEMENTS = [
  'in this article',
  'in this video',
  "let's dive in",
  'make sure you watch',
  'make sure you subscribe',
  "don't forget to subscribe",
  "here's the thing",
  "here's the catch",
] as const;

export const DAN_MERCEDE_TABOO_PATTERNS: readonly { label: string; pattern: RegExp }[] = [
  {
    label: 'ai_agency_buzzword',
    pattern: /\bleverages?\s+(?:autonomous|governed|agentic)\s+workflows?\b/i,
  },
  {
    label: 'landscape_cliche',
    pattern: /\bin\s+today's\s+(?:digital\s+|agentic\s+)?landscape\b/i,
  },
  {
    label: 'evasive_git_paraphrase',
    pattern: /\ba\s+redirecting\s+setting\s+in\s+the\s+version\s+control\s+system\b/i,
  },
  {
    label: 'conversational_filler_hook',
    pattern: /\bhere's\s+the\s+(?:clever\s+bit|catch|thing)\b/i,
  },
];

export const NEGATIVE_PARALLELISM_PATTERNS: readonly RegExp[] = [
  /\b(?:wasn't|isn't|aren't|weren't|not)\s+(?:just|only|merely)\s+[^.!?\n]{1,60}(?:,|;)\s*(?:it\s+(?:was|is)|it's|they're|that's|but)\b/i,
  /\bmore\s+than\s+just\b/i,
  /\b(?:it's|it\s+is|this\s+is)\s+not\s+about\s+[^.!?\n]{1,50},\s*(?:it's|it\s+is|this\s+is)\s+about\b/i,
];

const URL_RX = /https?:\/\/\S+/g;

function termPattern(term: string): RegExp {
  const escaped = term
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

const HARD_PATTERNS = HARD_SLOP_LEXEMES.map((term) => ({ term, rx: termPattern(term) }));
const KOBAK_PATTERNS = KOBAK_EXCESS_TERMS.map((term) => ({ term, rx: termPattern(term) }));
const THRILLER_PATTERNS = THRILLER_CLICHES.map((term) => ({ term, rx: termPattern(term) }));
const META_PATTERNS = META_ANNOUNCEMENTS.map((term) => ({ term, rx: termPattern(term) }));

export interface CreativeHit {
  rule: string;
  match: string;
}

export interface CopyScanResult {
  ok: boolean;
  hardHits: CreativeHit[];
  advisoryHits: CreativeHit[];
}

export function scanDanMercedeCopy(text: string): CopyScanResult {
  if (!text) {
    return { ok: true, hardHits: [], advisoryHits: [] };
  }
  const prose = text.replace(URL_RX, ' ');
  const hardHits: CreativeHit[] = [];
  const advisoryHits: CreativeHit[] = [];

  for (const cp of [0x2014, 0x2013, 0x2015]) {
    const ch = String.fromCodePoint(cp);
    if (text.includes(ch)) {
      hardHits.push({ rule: 'banned_dash', match: `U+${cp.toString(16).toUpperCase()}` });
    }
  }
  for (const { term, rx } of HARD_PATTERNS) {
    if (rx.test(prose)) {
      hardHits.push({ rule: 'ai_slop_lexeme', match: term });
    }
  }
  for (const { label, pattern } of DAN_MERCEDE_TABOO_PATTERNS) {
    const m = pattern.exec(prose);
    if (m) {
      hardHits.push({ rule: 'dan_mercede_taboo', match: `${label}:${m[0]}` });
    }
  }
  for (const { term, rx } of THRILLER_PATTERNS) {
    if (rx.test(prose)) {
      hardHits.push({ rule: 'thriller_cliche', match: term });
    }
  }
  for (const { term, rx } of META_PATTERNS) {
    if (rx.test(prose)) {
      hardHits.push({ rule: 'meta_announcement', match: term });
    }
  }

  for (const rx of NEGATIVE_PARALLELISM_PATTERNS) {
    const m = rx.exec(prose);
    if (m) {
      advisoryHits.push({ rule: 'negative_parallelism', match: m[0] });
    }
  }
  for (const { term, rx } of KOBAK_PATTERNS) {
    if (rx.test(prose)) {
      advisoryHits.push({ rule: 'kobak_excess_term', match: term });
    }
  }

  return {
    ok: hardHits.length === 0,
    hardHits,
    advisoryHits,
  };
}

export const SUPPORTED_CONTENT_FORMATS = ['guide', 'thought', 'work', 'essay'] as const;
export type SupportedContentFormat = (typeof SUPPORTED_CONTENT_FORMATS)[number];

export interface CreativeBriefV1 {
  schema_version: typeof CREATIVE_BRIEF_SCHEMA;
  brief_id: string;
  brand_id: typeof VOICE_PROFILE_ID;
  content_format: SupportedContentFormat;
  title: string;
  claim: string;
  implication: string;
  target_audience: string;
  source_urls?: string[];
  required_open_loops?: string[];
  constraints?: string[];
  created_at?: string;
}

export interface BriefValidationResult {
  ok: boolean;
  errors: string[];
  advisory: CreativeHit[];
}

export function validateCreativeBrief(brief: Partial<CreativeBriefV1>): BriefValidationResult {
  const errors: string[] = [];
  if (brief.schema_version !== CREATIVE_BRIEF_SCHEMA) {
    errors.push(`schema_version must equal ${CREATIVE_BRIEF_SCHEMA}`);
  }
  if (brief.brand_id !== VOICE_PROFILE_ID) {
    errors.push(`brand_id must equal ${VOICE_PROFILE_ID}`);
  }
  for (const field of [
    'brief_id',
    'content_format',
    'title',
    'claim',
    'implication',
    'target_audience',
  ] as const) {
    const val = brief[field];
    if (typeof val !== 'string' || !val.trim()) {
      errors.push(`missing required CreativeBrief.v1 field: ${field}`);
    }
  }
  if (
    typeof brief.content_format === 'string' &&
    brief.content_format.trim() &&
    !(SUPPORTED_CONTENT_FORMATS as readonly string[]).includes(brief.content_format)
  ) {
    errors.push(
      `unsupported content_format "${brief.content_format}"; expected one of ${SUPPORTED_CONTENT_FORMATS.join(', ')}`,
    );
  }
  if (typeof brief.claim === 'string' && brief.claim.trim().length < 24) {
    errors.push('claim is too short to state a falsifiable assertion (>= 24 chars required)');
  }
  if (typeof brief.implication === 'string' && brief.implication.trim().length < 24) {
    errors.push('implication is too short to specify concrete engineering stakes (>= 24 chars required)');
  }

  const combined = [brief.title ?? '', brief.claim ?? '', brief.implication ?? ''].join('\n');
  const scan = scanDanMercedeCopy(combined);
  for (const hit of scan.hardHits) {
    errors.push(`voice violation [${hit.rule}]: ${hit.match}`);
  }
  return {
    ok: errors.length === 0,
    errors,
    advisory: scan.advisoryHits,
  };
}

export function guideToCreativeBrief(guide: Guide): CreativeBriefV1 {
  return {
    schema_version: CREATIVE_BRIEF_SCHEMA,
    brief_id: `guide:${guide.slug}`,
    brand_id: VOICE_PROFILE_ID,
    content_format: 'guide',
    title: guide.title,
    claim: guide.lead,
    implication: guide.description,
    target_audience:
      'Staff+ engineers, AI architects, and CTOs running production agent infrastructure.',
    source_urls: [`https://www.danmercede.com/guides/${guide.slug}`],
    created_at: guide.date,
  };
}

export function thoughtToCreativeBrief(thought: Thought): CreativeBriefV1 {
  const firstParagraph =
    thought.body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p.length >= 24) ?? thought.preview;
  return {
    schema_version: CREATIVE_BRIEF_SCHEMA,
    brief_id: `thought:${thought.slug}`,
    brand_id: VOICE_PROFILE_ID,
    content_format: 'thought',
    title: thought.title,
    claim: thought.preview.length >= 24 ? thought.preview : firstParagraph,
    implication: firstParagraph.length >= 24 ? firstParagraph : thought.preview,
    target_audience:
      'Staff+ engineers, AI architects, and CTOs running production agent infrastructure.',
    source_urls: [`https://www.danmercede.com/thoughts/${thought.slug}`],
    created_at: thought.date,
  };
}
