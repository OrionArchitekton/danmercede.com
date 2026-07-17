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

// Strip fenced (```...```) and inline (`...`) code before matching, so a link or
// URL shown as a code EXAMPLE (tutorial/guide content) is not miscounted as a
// real citation.
function stripCode(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ');
}

// A "danmercede" host (bare, www, or ANY subdomain: blog./docs./etc.) is a
// self-link, not a third-party citation.
const SELF_HOST = /^(?:[a-z0-9-]+\.)*danmercede\.[a-z]+$/i;

function isExternalCitationUrl(url: string): boolean {
  // Host only: strip scheme, then cut at the first path/port/query/fragment char.
  const host = url.replace(/^https?:\/\//i, '').split(/[/:?#]/)[0].toLowerCase();
  // Code/localhost hosts are configuration, not evidence.
  if (host === 'localhost' || host === '127.0.0.1') return false;
  // An internal service name has no dot (e.g. `traefik`, a docker-compose host);
  // a real external citation always has a dotted domain (arxiv.org, example.gov).
  if (!host.includes('.')) return false;
  // danmercede's own domains (any subdomain) are self-links, not citations.
  if (SELF_HOST.test(host)) return false;
  return true;
}

// Markdown-link citation `[text](url)` to an external host. Group 1 captures a
// leading `!`, which makes it an IMAGE embed (`![alt](url)`) - decoration, not a
// citation - so those are skipped. Group 2 is the URL.
const MD_LINK = /(!?)\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi;
// Autolink `<https://url>` (unambiguous citation syntax). Group 1 is the URL.
const AUTOLINK = /<(https?:\/\/[^>\s]+)>/gi;

// A quantitative statistic: a percentage. The strongest, least-ambiguous stat
// signal, chosen deliberately over "any number" so dates, counts, and version
// numbers do not make the check vacuously pass.
const PERCENT_STAT = /\b\d+(?:\.\d+)?%/g;

export function countCitations(md: string): number {
  const text = stripCode(md);
  let n = 0;
  // Markdown links, skipping image embeds (leading '!').
  for (const m of text.matchAll(MD_LINK)) {
    if (m[1] === '!') continue;
    if (isExternalCitationUrl(m[2])) n += 1;
  }
  // Autolinks <url>.
  for (const m of text.matchAll(AUTOLINK)) {
    if (isExternalCitationUrl(m[1])) n += 1;
  }
  return n;
}

export function countStats(md: string): number {
  return (stripCode(md).match(PERCENT_STAT) || []).length;
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
