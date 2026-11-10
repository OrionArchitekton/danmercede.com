import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Brand colour contract: the site's colour tokens equal the logo pack, and every
// brand text/background pair the site renders meets WCAG AA. A past copper
// retint broke white-on-accent contrast and the suite did not notice; these
// ratios are computed from the configured hex values, so a retint that drops a
// pair below AA fails here.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

// dan-mercede-logo-pack/brand-colors.txt (kept outside git), copied verbatim.
const LOGO_PACK = {
  midnightNavy: '#020B29',
  deepNavy: '#07143A',
  copperLight: '#FFC08B',
  copperMid: '#E68249',
  copperDark: '#B95122',
  white: '#FFFFFF',
} as const;

const HEX = /^#[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  assert.match(hex, HEX, `not a 6-digit hex colour: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

// WCAG 2.x relative luminance.
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Composite a translucent colour over an opaque one (Tailwind `/NN` opacity).
function over(fg: string, alpha: number, bg: string): string {
  const f = channels(fg);
  const b = channels(bg);
  return '#' + f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('');
}

// --- configured tokens, read from the files that define them ---------------

const config = read('tailwind.config.js');

function group(name: string): Record<string, string> {
  const m = config.match(new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`));
  assert.ok(m, `tailwind.config.js defines a ${name} colour group`);
  const out: Record<string, string> = {};
  for (const [, key, hex] of m![1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{6})['"]/g)) {
    out[key] = hex;
  }
  return out;
}

function single(name: string): string {
  const m = config.match(new RegExp(`\\b${name}:\\s*['"](#[0-9a-fA-F]{6})['"]`));
  assert.ok(m, `tailwind.config.js defines ${name}`);
  return m![1];
}

const css = read('index.css');

function themeColor(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `index.css @theme pins --color-${name}`);
  return m![1];
}

function bodyBackground(): string {
  const m = css.match(/body\s*\{[^}]*background-color:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(m, 'index.css sets the body background-color');
  return m![1];
}

const same = (a: string, b: string, what: string) => assert.equal(a.toLowerCase(), b.toLowerCase(), what);

test('copper and navy tokens equal the logo pack values', () => {
  const copper = group('copper');
  const navy = group('navy');
  same(copper['300'], LOGO_PACK.copperLight, 'copper-300 is Copper Light');
  same(copper['500'], LOGO_PACK.copperMid, 'copper-500 is Copper Mid');
  same(copper['600'], LOGO_PACK.copperDark, 'copper-600 is Copper Dark');
  same(navy.midnight, LOGO_PACK.midnightNavy, 'navy-midnight is Midnight Navy');
  same(navy.deep, LOGO_PACK.deepNavy, 'navy-deep is Deep Navy');
  same(single('void'), LOGO_PACK.midnightNavy, 'void is Midnight Navy');
});

test('the page background is Midnight Navy everywhere it is declared', () => {
  same(bodyBackground(), LOGO_PACK.midnightNavy, 'index.css body background');
  same(themeColor('slate-950'), LOGO_PACK.midnightNavy, 'index.css @theme slate-950 (the page background class)');
  const meta = read('index.html').match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
  assert.ok(meta, 'theme-color meta present');
  same(meta![1], LOGO_PACK.midnightNavy, 'index.html theme-color');
  const manifest = JSON.parse(read('public/site.webmanifest'));
  same(manifest.background_color, LOGO_PACK.midnightNavy, 'manifest background_color');
  same(manifest.theme_color, LOGO_PACK.midnightNavy, 'manifest theme_color');
});

type Pair = { name: string; fg: string; bg: string; min: number };

// AA: 4.5:1 for body text, 3:1 for large text and UI (borders, focus rings).
function brandPairs(): Pair[] {
  const copper = group('copper');
  const page = bodyBackground();
  const navyText = themeColor('slate-950'); // text-slate-950 labels on copper fills
  const cardOnPage = over(themeColor('slate-900'), 0.25, page); // bg-slate-900/25 guide card
  const copperStrip = over(copper['600'], 0.7, cardOnPage); // bg-copper-600/70 guide card header
  return [
    { name: 'copper-300 text on the page', fg: copper['300'], bg: page, min: 4.5 },
    { name: 'copper-400 text on the page', fg: copper['400'], bg: page, min: 4.5 },
    { name: 'copper-500 text on the page', fg: copper['500'], bg: page, min: 4.5 },
    { name: 'white text on the page', fg: LOGO_PACK.white, bg: page, min: 4.5 },
    { name: 'navy label on a copper-500 button', fg: navyText, bg: copper['500'], min: 4.5 },
    { name: 'navy label on a copper-400 hover fill', fg: navyText, bg: copper['400'], min: 4.5 },
    { name: 'copper-400 text on a copper-500/10 tint', fg: copper['400'], bg: over(copper['500'], 0.1, page), min: 4.5 },
    { name: 'copper-400 text on a copper-500/15 tint', fg: copper['400'], bg: over(copper['500'], 0.15, page), min: 4.5 },
    { name: 'copper-400 text on a copper-500/20 tint', fg: copper['400'], bg: over(copper['500'], 0.2, page), min: 4.5 },
    { name: 'copper-500 border or focus ring on the page', fg: copper['500'], bg: page, min: 3 },
    { name: 'slate-300 label on the copper-600/70 guide header', fg: themeColor('slate-300'), bg: copperStrip, min: 4.5 },
    { name: 'slate-200 label on the copper-600/70 guide header', fg: themeColor('slate-200'), bg: copperStrip, min: 4.5 },
    { name: 'white on Copper Dark (logo pack pair)', fg: LOGO_PACK.white, bg: copper['600'], min: 4.5 },
    { name: 'Copper Dark on Midnight Navy, large text and UI only', fg: copper['600'], bg: page, min: 3 },
  ];
}

test('every brand text and background pair meets WCAG AA', () => {
  const failures = brandPairs()
    .map((p) => ({ ...p, ratio: contrast(p.fg, p.bg) }))
    .filter((p) => p.ratio < p.min)
    .map((p) => `${p.name}: ${p.fg} on ${p.bg} = ${p.ratio.toFixed(2)}:1, needs ${p.min}:1`);
  assert.deepEqual(failures, []);
});

// Pairs that fail AA today and are open questions in DESIGN.md, not fixed by the
// token alignment. Fixed one? Remove it here and from DESIGN.md's open questions.
function knownGaps(): Pair[] {
  const page = bodyBackground();
  return [
    { name: 'white on copper-500 (skip link focus state, text selection)', fg: LOGO_PACK.white, bg: group('copper')['500'], min: 4.5 },
    { name: 'slate-500 text on the page', fg: themeColor('slate-500'), bg: page, min: 4.5 },
  ];
}

test('known AA gaps are real and listed as open questions in DESIGN.md', () => {
  const design = read('DESIGN.md');
  for (const gap of knownGaps()) {
    const ratio = contrast(gap.fg, gap.bg);
    assert.ok(ratio < gap.min, `${gap.name} now passes (${ratio.toFixed(2)}:1): drop it from knownGaps and DESIGN.md`);
    const label = `${gap.fg} on ${gap.bg}`;
    assert.ok(design.toLowerCase().includes(label.toLowerCase()), `DESIGN.md lists ${gap.name} as "${label}"`);
  }
});

// The retint bug shape: white text on a solid copper fill. Heuristic over the
// class strings in component source: a single string literal that carries both
// classes (so the two arms of a conditional are not read as one element). The
// two known gaps above are the only allowed sites.
function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((entry) => {
    const rel = path.join(dir, entry);
    if (statSync(path.join(root, rel)).isDirectory()) return sourceFiles(rel);
    return /\.tsx$/.test(entry) ? [rel] : [];
  });
}

test('no white text on a solid copper fill outside the known gaps', () => {
  const solidCopperFill = /(^|[\s'"`:])bg-copper-(300|400|500|600)(?![\/\w-])/;
  const whiteText = /(^|[\s'"`:])text-white(?![\/\w-])/;
  const allowed = [/sr-only focus:not-sr-only/, /selection:bg-copper-500/];
  const hits: string[] = [];
  for (const file of ['App.tsx', ...sourceFiles('components')]) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        for (const [literal] of line.matchAll(/'[^']*'|"[^"]*"|`[^`]*`/g)) {
          if (solidCopperFill.test(literal) && whiteText.test(literal) && !allowed.some((a) => a.test(literal))) {
            hits.push(`${file}:${i + 1}`);
          }
        }
      });
  }
  assert.deepEqual(hits, []);
});
