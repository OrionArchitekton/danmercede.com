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

// Comments are removed first, so a commented-out value is never read.
const config = read('tailwind.config.js')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const css = read('index.css').replace(/\/\*[\s\S]*?\*\//g, '');

// Each token must be declared exactly once: a second declaration (a later
// override or a duplicate block) fails here instead of being silently ignored.
function only(source: string, re: RegExp, what: string): RegExpMatchArray {
  const all = [...source.matchAll(re)];
  assert.equal(all.length, 1, `${what}: expected exactly one declaration, found ${all.length}`);
  return all[0];
}

function group(name: string): Record<string, string> {
  const m = only(config, new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 'g'), `tailwind.config.js ${name} colour group`);
  const out: Record<string, string> = {};
  for (const [, key, hex] of m[1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{6})['"]/g)) {
    out[key] = hex;
  }
  return out;
}

function single(name: string): string {
  return only(config, new RegExp(`\\b${name}:\\s*['"](#[0-9a-fA-F]{6})['"]`, 'g'), `tailwind.config.js ${name}`)[1];
}

function themeColor(name: string): string {
  return only(css, new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'), `index.css --color-${name}`)[1];
}

function bodyBackground(): string {
  return only(
    css,
    /(^|[\s};])body\s*\{[^}]*background(-color)?:\s*(#[0-9a-fA-F]{6})/g,
    'index.css body background',
  )[3];
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
    { name: 'slate-400 metadata text on the page', fg: themeColor('slate-400'), bg: page, min: 4.5 },
    { name: 'copper-500 ordered-list numbers on the page (Markdown.tsx)', fg: copper['500'], bg: page, min: 4.5 },
    { name: 'navy label on copper-500 (skip link focus state, text selection)', fg: navyText, bg: copper['500'], min: 4.5 },
  ];
}

test('every brand text and background pair meets WCAG AA', () => {
  const failures = brandPairs()
    .map((p) => ({ ...p, ratio: contrast(p.fg, p.bg) }))
    .filter((p) => p.ratio < p.min)
    .map((p) => `${p.name}: ${p.fg} on ${p.bg} = ${p.ratio.toFixed(2)}:1, needs ${p.min}:1`);
  assert.deepEqual(failures, []);
});

// The retint bug shape: white text on a solid copper fill. Heuristic over the
// class strings in component source: a single string literal that carries both
// classes (so the two arms of a conditional are not read as one element). There
// are no allowed exceptions: the skip link and the text selection use a navy label.
function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((entry) => {
    const rel = path.join(dir, entry);
    if (statSync(path.join(root, rel)).isDirectory()) return sourceFiles(rel);
    return /\.tsx$/.test(entry) ? [rel] : [];
  });
}

// A variant prefix (hover:, md:, focus:) still counts, and so does `/100`, which
// is opaque; any other opacity is a tint, covered by the pairs above.
const solidCopperFill = /(^|[\s'"`:])bg-copper-(300|400|500|600)(\/100)?(?![\/\w-])/;
const whiteText = /(^|[\s'"`:])text-white(\/100)?(?![\/\w-])/;

const whiteOnCopper = (classes: string) => solidCopperFill.test(classes) && whiteText.test(classes);

// slate-500 text is 4.08:1 on the page, below AA; metadata uses slate-400 (7.57:1).
const slate500Text = /(^|[\s'"`:])text-slate-500(?![\w-])/;
// List numbers are text: a translucent copper marker drops below AA (70 percent
// measured 3.89:1), so the marker stays full strength (7.07:1).
const fadedCopperMarker = /(^|[\s'"`])marker:text-copper-\d+\/\d+/;

test('the markup guards catch the shapes they claim to', () => {
  assert.ok(whiteOnCopper('px-4 bg-copper-500 text-white'), 'plain classes');
  assert.ok(whiteOnCopper('hover:bg-copper-600 hover:text-white'), 'variant-prefixed classes');
  assert.ok(whiteOnCopper('bg-copper-400/100 text-white/100'), 'explicit /100 opacity');
  assert.ok(whiteOnCopper('selection:bg-copper-500 selection:text-white'), 'white text selection on copper');
  assert.ok(whiteOnCopper('sr-only focus:not-sr-only focus:bg-copper-500 focus:text-white'), 'white skip link on copper');
  assert.ok(!whiteOnCopper('bg-copper-500 text-slate-950'), 'navy label on copper');
  assert.ok(!whiteOnCopper('selection:bg-copper-500 selection:text-slate-950'), 'navy text selection on copper');
  assert.ok(!whiteOnCopper('bg-copper-500/10 text-white'), 'white on a translucent tint');
  assert.ok(slate500Text.test('font-mono text-slate-500 uppercase'), 'slate-500 text');
  assert.ok(slate500Text.test('placeholder:text-slate-500'), 'slate-500 placeholder');
  assert.ok(!slate500Text.test('text-slate-400 border-slate-500'), 'slate-400 text, slate-500 border');
  assert.ok(fadedCopperMarker.test('pl-6 marker:text-copper-500/70'), 'translucent copper marker');
  assert.ok(!fadedCopperMarker.test('pl-6 marker:text-copper-500'), 'full-strength copper marker');
});

// Limit: classes for one element split across several string literals (for
// example clsx arguments) are not joined; each literal is checked alone so the
// two arms of a conditional are not read as one element.
test('no white text on a solid copper fill', () => {
  const hits: string[] = [];
  for (const file of ['App.tsx', ...sourceFiles('components')]) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        for (const [literal] of line.matchAll(/'[^']*'|"[^"]*"|`[^`]*`/g)) {
          if (whiteOnCopper(literal.slice(1, -1))) hits.push(`${file}:${i + 1}`);
        }
      });
  }
  assert.deepEqual(hits, []);
});

test('metadata text and list numbers use the AA colours', () => {
  const hits: string[] = [];
  for (const file of ['App.tsx', ...sourceFiles('components')]) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        if (slate500Text.test(line)) hits.push(`${file}:${i + 1} text-slate-500 (use text-slate-400)`);
        if (fadedCopperMarker.test(line)) hits.push(`${file}:${i + 1} translucent copper list marker (use full strength)`);
      });
  }
  assert.deepEqual(hits, []);
});
