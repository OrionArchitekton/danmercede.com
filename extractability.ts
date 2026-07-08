// A2 — passage-extractability linter for the answer-engine (AEO) surface.
//
// A no-JS answer engine (ChatGPT / Perplexity / Claude fetchers) extracts an
// answer from the RAW HTML it receives — it does not execute React. This linter
// scores a page's crawlable passages on three deterministic checks anchored to
// the estate's LOCKED answer-first doctrine (~130-170 words;
// ~/.claude/skills/product-launch/references/seo-geo-aeo.md):
//
//   1. token budget   — the answer-first passage (H1 + lead) is extractable-
//                        length, not a wall of text (<= MAX_ANSWER_TOKENS).
//   2. js-off readable — the answer lives OUTSIDE the React mount (#root), so a
//                        no-JS crawler can read it (readable ratio >= MIN_JS_OFF_RATIO).
//   3. heading         — exactly one H1, first heading is H1, no level skips.
//
// It DELIBERATELY does not reward FAQPage coverage and does not rank llms.txt
// Tier-1 (BOTH refuted by seo-geo-aeo.md), and does NOT gate on query-phrased
// headings (advisory only, dan-mercede-substrate/docs/section-opener-structure.md
// — a mechanical query-phrasing gate manufactures formulaic headings). Those
// tactics are absent from this module by construction, not merely unweighted.

// ceil(170 words * 4/3 tokens/word) — the 170-word answer-first ceiling from the
// ~130-170w doctrine, converted to tokens via the heuristic below.
export const MAX_ANSWER_TOKENS = 227;
// A no-JS crawler must be able to read at least this share of the page's text
// without executing the React mount.
export const MIN_JS_OFF_RATIO = 0.8;

export interface PassageFinding {
  check: 'token-budget' | 'js-off-readable' | 'heading-hierarchy';
  ok: boolean;
  detail: string;
}

export interface LintResult {
  ok: boolean;
  findings: PassageFinding[];
}

/**
 * Documented heuristic token estimate. OpenAI's public rule of thumb is
 * ~0.75 words per token (≈4 chars/token) for English prose
 * (https://help.openai.com/en/articles/4936856-what-are-tokens), so
 * tokens ≈ ceil(words * 4/3). A real BPE tokenizer (gpt-tokenizer / js-tiktoken)
 * could replace this behind the same signature if precision is ever needed; for
 * a 170-word ceiling the heuristic is comfortably adequate and — deliberately —
 * adds no dependency (and no Python tiktoken) to a minimal node hub.
 */
export function estimateTokens(text: string): number {
  return Math.ceil((countWords(text) * 4) / 3);
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Drop content that is never crawlable prose: <script>/<style> blocks AND HTML
 * comments. Comments are stripped BEFORE any heading/text pass so a commented-
 * out (disabled/legacy) heading or paragraph can never be counted — the regex
 * passes would otherwise match markup inside `<!-- ... -->`. Non-greedy so each
 * comment (incl. the hub's `<!--BODY_BLOCK-->` markers) is removed individually
 * without swallowing the real content that sits between paired markers.
 */
function stripCode(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
}

/**
 * Collapse markup + HTML entities to plain text. Named (`&amp;`), decimal
 * (`&#160;`), and hex (`&#x27;`) entities are all reduced to a separator so a
 * nbsp-joined run counts as its real words, not one giant token, and no literal
 * entity leaks into the token/length measures.
 */
function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split the React mount (#root) subtree out of the document. Text inside #root
 * is rendered only after JS hydration, so it is NOT visible to a no-JS crawler.
 * Balanced <div> scan so nested divs inside #root are handled correctly. The
 * real hub ships an EMPTY #root (content is baked into a sibling prerender
 * block, seoMeta.ts renderBodyBlock), so a well-baked page yields rootInner=''.
 */
function splitRoot(html: string): { rootInner: string; jsOff: string } {
  const open = /<div\b[^>]*\bid=["']root["'][^>]*>/i.exec(html);
  if (!open) return { rootInner: '', jsOff: html };
  const openEnd = open.index + open[0].length;
  const tagRe = /<(\/?)div\b[^>]*>/gi;
  tagRe.lastIndex = openEnd;
  let depth = 1;
  let closeStart = -1;
  let closeEnd = html.length;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    if (m[1] === '/') {
      depth -= 1;
      if (depth === 0) {
        closeStart = m.index;
        closeEnd = tagRe.lastIndex;
        break;
      }
    } else {
      depth += 1;
    }
  }
  const rootInner = closeStart === -1 ? html.slice(openEnd) : html.slice(openEnd, closeStart);
  const jsOff =
    html.slice(0, open.index) + ' ' + (closeStart === -1 ? '' : html.slice(closeEnd));
  return { rootInner, jsOff };
}

function headingLevels(crawl: string): number[] {
  return [...crawl.matchAll(/<h([1-6])\b[^>]*>[\s\S]*?<\/h\1>/gi)].map((x) => Number(x[1]));
}

/**
 * The answer-first passage = the H1 text plus the lead paragraph immediately
 * under it (the first <p> before any sub-heading). This is the "answer-first"
 * opening the ~130-170w doctrine governs — NOT the whole article: a long-form
 * essay is answer-first + depth, so only its opening answer carries the budget.
 */
function answerFirstText(crawl: string): string {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(crawl);
  if (!h1) return '';
  let text = toText(h1[1]);
  const after = crawl.slice(h1.index + h1[0].length);
  const nextHeading = /<h[1-6]\b/i.exec(after);
  const region = nextHeading ? after.slice(0, nextHeading.index) : after;
  const lead = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(region);
  if (lead) text += ' ' + toText(lead[1]);
  return text.trim();
}

export function lintExtractability(html: string): LintResult {
  const noCode = stripCode(html);
  const { rootInner, jsOff } = splitRoot(noCode);

  // check 1 — token budget on the answer-first passage
  const answer = answerFirstText(jsOff);
  const answerTokens = estimateTokens(answer);
  const tokenOk = answerTokens <= MAX_ANSWER_TOKENS;

  // check 2 — JS-disabled readable share
  const readableChars = toText(jsOff).length;
  const rootChars = toText(rootInner).length;
  const total = readableChars + rootChars;
  const ratio = total > 0 ? readableChars / total : 1;
  const jsOk = ratio >= MIN_JS_OFF_RATIO;

  // check 3 — heading hierarchy (crawlable layer only)
  const levels = headingLevels(jsOff);
  const h1Count = levels.filter((l) => l === 1).length;
  let headingOk = true;
  let headingDetail = 'one H1, first heading is H1, no level skips';
  if (levels.length === 0) {
    headingOk = false;
    headingDetail = 'no crawlable heading (an answer-first page needs exactly one H1)';
  } else if (h1Count !== 1) {
    headingOk = false;
    headingDetail = `expected exactly one H1, found ${h1Count}`;
  } else if (levels[0] !== 1) {
    headingOk = false;
    headingDetail = `first crawlable heading is H${levels[0]}, must be H1`;
  } else {
    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i] > levels[i - 1] + 1) {
        headingOk = false;
        headingDetail = `heading level skips H${levels[i - 1]} -> H${levels[i]}`;
        break;
      }
    }
  }

  const findings: PassageFinding[] = [
    {
      check: 'token-budget',
      ok: tokenOk,
      detail: `answer-first ≈${answerTokens} tokens (budget ${MAX_ANSWER_TOKENS})`,
    },
    {
      check: 'js-off-readable',
      ok: jsOk,
      detail: `js-off readable ratio ${ratio.toFixed(2)} (min ${MIN_JS_OFF_RATIO})`,
    },
    { check: 'heading-hierarchy', ok: headingOk, detail: headingDetail },
  ];

  return { ok: findings.every((f) => f.ok), findings };
}
