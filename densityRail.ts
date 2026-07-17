// Cite/quote/stat DENSITY rail (aeo-parity arc; benchmark
// orion-research-registers#65/#66, TIER 1 finding T1-5). Adding citations from
// reliable sources and quantitative statistics to content is the strongest
// MEASURED lever for AI-answer citation likelihood (+30-40% position-adjusted
// word count). The estate already has ANTI-fabrication rails ("don't invent");
// this is the complementary "do cite" signal, and it deliberately REWARDS the
// presence of >=1 real source/number rather than REQUIRING one on every post,
// so it never pressures fabrication (cut-and-enrich doctrine).
//
// INPUT SURFACE: read the RAW markdown body (Thought.body / Guide.body+lead),
// NOT the baked crawl HTML. The baker's guideInlineToText strips `[text](url)`
// down to `text`, dropping every outbound URL, so the baked surface cannot see
// citations at all.

export interface DensityResult {
  ok: boolean;
  citations: number;
  stats: number;
  detail: string;
}

// An outbound citation: a markdown link `](http(s)://host…)` to an EXTERNAL
// host. Excludes danmercede's own domains (self-links are not third-party
// citations) and code-example hosts (localhost / 127.0.0.1 / a host:port like
// `http://traefik:80`), which are configuration, not evidence.
const EXTERNAL_CITATION =
  /\]\(https?:\/\/(?!(?:www\.)?danmercede\.|localhost|127\.0\.0\.1|[a-z0-9.-]*:\d)[^)]+\)/gi;

// A quantitative statistic: a percentage. The strongest, least-ambiguous stat
// signal, chosen deliberately over "any number" so dates, counts, and version
// numbers do not make the check vacuously pass.
const PERCENT_STAT = /\b\d+(?:\.\d+)?%/g;

export function countCitations(md: string): number {
  return (md.match(EXTERNAL_CITATION) || []).length;
}

export function countStats(md: string): number {
  return (md.match(PERCENT_STAT) || []).length;
}

/**
 * Density verdict for one content body (raw markdown). A body is dense when it
 * carries at least one external citation OR at least one quantitative statistic.
 * Pure and dependency-free, mirroring lintExtractability's signature so it
 * reuses the same non-vacuity + real-content-binding test conventions.
 */
export function lintDensity(bodyMarkdown: string): DensityResult {
  const citations = countCitations(bodyMarkdown);
  const stats = countStats(bodyMarkdown);
  const ok = citations >= 1 || stats >= 1;
  return {
    ok,
    citations,
    stats,
    detail: ok
      ? `${citations} external citation(s), ${stats} statistic(s)`
      : 'no external citation and no quantitative statistic (T1-5: enrich with a real source or a measured number, never fabricate)',
  };
}
