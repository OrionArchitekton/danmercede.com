import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

function walkFiles(dir: string, exts: Set<string>): string[] {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(rel, exts));
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      results.push(rel);
    }
  }
  return results.sort();
}

function hexLuminance(hex: string): number {
  const clean = hex.replace(/^#/, '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function wcagContrast(a: string, b: string): number {
  const [hi, lo] = [hexLuminance(a), hexLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('speaking-one-sheet uses canonical #E68249 copper with #020B29 Midnight Navy ink lock and brand fonts', () => {
  const html = read('docs/one-sheets/speaking-one-sheet.html');
  assert.doesNotMatch(html, /#c2632c/i, 'legacy #c2632c copper must be removed from speaking-one-sheet.html');
  assert.doesNotMatch(html, /#b87333/i, 'legacy #b87333 copper must not appear in speaking-one-sheet.html');
  assert.doesNotMatch(html, /\bArial\b/i, 'Arial fallback must not appear in speaking-one-sheet.html');
  assert.doesNotMatch(html, /\bInter\b/, 'Inter must be replaced with Newsreader / IBM Plex Sans / JetBrains Mono');
  assert.match(html, /#E68249/i, 'speaking-one-sheet.html must use canonical Copper Mid #E68249');
  assert.match(html, /#020B29/i, 'speaking-one-sheet.html must use canonical Midnight Navy #020B29');
  assert.match(html, /JetBrains Mono/, 'speaking-one-sheet.html must declare JetBrains Mono');
  assert.ok(wcagContrast('#020B29', '#E68249') >= 7.0, 'Midnight Navy ink on #E68249 copper exceeds 7:1 WCAG AA');
});

test('all UI and DESIGN.md typography tokens enforce the >=11px monospace label floor', () => {
  const uiFiles = ['App.tsx', 'DESIGN.md', ...walkFiles('components', new Set(['.tsx', '.ts']))];
  const sub11Hits: string[] = [];

  for (const rel of uiFiles) {
    const content = read(rel);
    content.split('\n').forEach((line, idx) => {
      if (/text-\[(?:[0-9]|10(?:\.\d+)?)px\]/.test(line) || /label-sm:\s*"10px"/.test(line)) {
        sub11Hits.push(`${rel}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(sub11Hits, [], `Found sub-11px UI label sizes:\n${sub11Hits.join('\n')}`);
});

test('all SVG assets eliminate Arial, legacy #B87333/#c2632c copper, <11px text, and Unicode long dashes', () => {
  const svgFiles = [
    ...walkFiles('public', new Set(['.svg'])),
    ...walkFiles('docs/guide-artwork', new Set(['.svg'])),
    ...walkFiles('brand-kit/assets', new Set(['.svg']))
  ];
  assert.ok(svgFiles.length >= 15, 'expected public, guide-artwork, and brand-kit SVGs to be scanned');

  const violations: string[] = [];
  for (const rel of svgFiles) {
    const svg = read(rel);
    if (/[\u2013\u2014\u2015]/.test(svg)) {
      violations.push(`${rel}: contains banned Unicode long dash (U+2013/2014/2015)`);
    }
    if (/\bArial\b/i.test(svg)) {
      violations.push(`${rel}: contains off-brand Arial font stack`);
    }
    if (/#(?:c2632c|b87333)\b/i.test(svg)) {
      violations.push(`${rel}: contains legacy off-brand copper (#c2632c or #B87333)`);
    }
    for (const m of svg.matchAll(/font-size=["']([0-9.]+)(?:px)?["']/g)) {
      const px = Number.parseFloat(m[1]);
      if (Number.isFinite(px) && px < 11) {
        violations.push(`${rel}: font-size="${m[1]}" violates >=11px floor`);
      }
    }
  }

  assert.deepEqual(violations, [], `SVG brand/typography violations:\n${violations.join('\n')}`);
});
