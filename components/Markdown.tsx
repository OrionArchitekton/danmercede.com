import React from 'react';

// Dep-free Markdown renderer for guide bodies (content/guides/*.md). Scoped to the
// bounded subset those files use — headings, paragraphs, fenced code, inline
// code/bold/italic/links, ordered/unordered lists (incl. nested blocks), tables,
// blockquotes, horizontal rules, and image figures `![alt](src "caption")`
// rendered as a responsive <figure> with a 768w/1536w srcset.
//
// This is the VISIBLE render. The crawlable answer-engine body is baked separately
// as plain text (seoMeta.renderBodyBlock + guideBodyToParagraphs), so this renderer
// never has to be Node/SSR-safe. NOT a general CommonMark parser by design — the
// repo deliberately avoids a markdown dependency (see the /guides design note).

type Key = string | number;

const FENCE = /^(\s*)```(.*)$/;
const HEADING = /^(#{1,6})\s+(.+)$/;
const HR = /^\s*---+\s*$/;
const IMAGE = /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)\s*$/;
const ULI = /^(\s*)[-*]\s+(.*)$/;
const OLI = /^(\s*)(\d+)\.\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const TABLE_SEP = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

function startsSpecial(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    IMAGE.test(line) ||
    QUOTE.test(line) ||
    ULI.test(line) ||
    OLI.test(line) ||
    (HR.test(line) && !line.includes('|')) ||
    line.trim().startsWith('|')
  );
}

// ---- inline ----

function parseInline(text: string, keyPrefix: Key = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let n = 0;
  const patterns: { re: RegExp; node: (m: RegExpExecArray, k: string) => React.ReactNode }[] = [
    {
      re: /`([^`]+)`/,
      node: (m, k) => (
        <code key={k} className="rounded bg-slate-800/70 px-1.5 py-0.5 font-mono text-[0.85em] text-copper-300">
          {m[1]}
        </code>
      ),
    },
    {
      re: /\*\*([^*]+)\*\*/,
      node: (m, k) => (
        <strong key={k} className="font-semibold text-white">
          {parseInline(m[1], `${k}b`)}
        </strong>
      ),
    },
    { re: /\*([^*]+)\*/, node: (m, k) => <em key={k}>{parseInline(m[1], `${k}e`)}</em> },
    {
      re: /\[([^\]]+)\]\(([^\s)]+)\)/,
      node: (m, k) => {
        const href = m[2];
        const external = /^https?:\/\//.test(href);
        return (
          <a
            key={k}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-copper-400 underline decoration-copper-500/40 underline-offset-2 hover:text-copper-300"
          >
            {parseInline(m[1], `${k}a`)}
          </a>
        );
      },
    },
  ];

  while (rest) {
    let best: { idx: number; len: number; node: React.ReactNode } | null = null;
    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.idx)) {
        best = { idx: m.index, len: m[0].length, node: p.node(m, `${keyPrefix}-${n}`) };
      }
    }
    if (!best) {
      out.push(rest);
      break;
    }
    if (best.idx > 0) out.push(rest.slice(0, best.idx));
    out.push(best.node);
    n += 1;
    rest = rest.slice(best.idx + best.len);
  }
  return out;
}

// ---- figures ----

function figure(alt: string, src: string, caption: string | undefined, key: string): React.ReactNode {
  const responsive = /\.webp$/.test(src);
  const src768 = src.replace(/\.webp$/, '-768w.webp');
  return (
    <figure key={key} className="my-8">
      <img
        src={src}
        {...(responsive
          ? { srcSet: `${src768} 768w, ${src} 1536w`, sizes: '(min-width: 768px) 768px, 100vw' }
          : {})}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-lg border border-white/10 bg-slate-900/40"
      />
      {caption ? (
        <figcaption className="mt-3 text-center text-sm text-slate-400">{parseInline(caption, `${key}c`)}</figcaption>
      ) : null}
    </figure>
  );
}

function renderTable(rows: string[], key: string): React.ReactNode {
  const cells = (r: string) =>
    r
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells); // row 0 = header, row 1 = separator
  return (
    <div key={key} className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-copper-500/30">
            {header.map((c, ci) => (
              <th key={ci} className="px-3 py-2 font-semibold text-white">
                {parseInline(c, `${key}-h${ci}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5">
              {row.map((c, ci) => (
                <td key={ci} className="px-3 py-2 align-top text-slate-300">
                  {parseInline(c, `${key}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- block parser ----

function parseBlocks(lines: string[], keyPrefix: Key = 'b'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const nextKey = () => `${keyPrefix}-${k++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Fenced code (``` … ```)
    const fence = line.match(FENCE);
    if (fence) {
      const indent = fence[1].length;
      const lang = fence[2].trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== '```') {
        body.push(lines[i].slice(indent));
        i += 1;
      }
      i += 1; // closing fence
      out.push(
        <pre
          key={nextKey()}
          className="my-5 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/80 p-4 text-sm leading-relaxed"
        >
          <code className={`font-mono text-slate-300${lang ? ` language-${lang}` : ''}`}>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const h = line.match(HEADING);
    if (h) {
      const level = Math.min(h[1].length, 6);
      const text = h[2].trim();
      const cls =
        level <= 2
          ? 'mt-12 mb-4 scroll-mt-24 text-2xl md:text-3xl font-bold text-white'
          : level === 3
            ? 'mt-8 mb-3 text-xl font-bold text-white'
            : 'mt-6 mb-2 text-lg font-semibold text-white';
      // React.createElement avoids a dynamic JSX tag (React 19 moved the JSX
      // namespace under React.JSX); `h${level}` renders the right heading element.
      out.push(
        React.createElement(
          `h${level}`,
          { key: nextKey(), id: slugify(text), className: cls },
          parseInline(text, nextKey()),
        ),
      );
      i += 1;
      continue;
    }

    // Standalone image → figure
    const img = line.match(IMAGE);
    if (img) {
      out.push(figure(img[1], img[2], img[3], nextKey()));
      i += 1;
      continue;
    }

    // Horizontal rule
    if (HR.test(line) && !line.includes('|')) {
      out.push(<hr key={nextKey()} className="my-10 border-white/10" />);
      i += 1;
      continue;
    }

    // Blockquote
    if (QUOTE.test(line)) {
      const q: string[] = [];
      while (i < lines.length) {
        if (lines[i].trim() === '') {
          if (i + 1 < lines.length && QUOTE.test(lines[i + 1])) {
            q.push('');
            i += 1;
            continue;
          }
          break;
        }
        if (!QUOTE.test(lines[i])) break;
        q.push(lines[i].replace(QUOTE, '$1'));
        i += 1;
      }
      out.push(
        <blockquote key={nextKey()} className="my-5 border-l-2 border-copper-500/50 pl-5 text-slate-300">
          {parseBlocks(q, nextKey())}
        </blockquote>,
      );
      continue;
    }

    // Table (header row followed by a separator row)
    if (line.trim().startsWith('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(rows, nextKey()));
      continue;
    }

    // List (ordered or unordered), with nested-block item content
    if (ULI.test(line) || OLI.test(line)) {
      const ordered = OLI.test(line);
      const baseIndent = leadingSpaces(line);
      const markerWidth = ordered ? 3 : 2;
      const items: string[][] = [];
      while (i < lines.length) {
        const cur = lines[i];
        const mm = ordered ? cur.match(OLI) : cur.match(ULI);
        if (mm && leadingSpaces(cur) === baseIndent) {
          const itemLines: string[] = [ordered ? mm[3] : mm[2]];
          i += 1;
          while (i < lines.length) {
            const ln = lines[i];
            if (ln.trim() === '') {
              if (i + 1 < lines.length && leadingSpaces(lines[i + 1]) > baseIndent) {
                itemLines.push('');
                i += 1;
                continue;
              }
              break;
            }
            const indentLen = leadingSpaces(ln);
            const sibling = (ordered ? ln.match(OLI) : ln.match(ULI)) && indentLen === baseIndent;
            if (indentLen > baseIndent && !sibling) {
              itemLines.push(ln.slice(baseIndent + markerWidth));
              i += 1;
              continue;
            }
            break;
          }
          items.push(itemLines);
        } else {
          break;
        }
      }
      const ListTag = ordered ? 'ol' : 'ul';
      out.push(
        <ListTag
          key={nextKey()}
          className={`my-5 space-y-2 pl-6 text-slate-300 marker:text-copper-500/70 ${
            ordered ? 'list-decimal' : 'list-disc'
          }`}
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {parseBlocks(it, `${keyPrefix}-li-${idx}`)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Paragraph — consume the current line UNCONDITIONALLY so `i` always advances.
    // A stray pipe-prefixed line the table branch rejected (no separator row) is
    // `startsSpecial`, so without seeding the first line the loop body never runs,
    // nothing is consumed, and rendering would spin forever (Codex P2).
    const para: string[] = [lines[i].trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && !startsSpecial(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(
      <p key={nextKey()} className="my-4 leading-relaxed text-slate-300">
        {parseInline(para.join(' '), nextKey())}
      </p>,
    );
  }

  return out;
}

export const Markdown: React.FC<{ source: string }> = ({ source }) => {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  return <>{parseBlocks(lines)}</>;
};

export default Markdown;
