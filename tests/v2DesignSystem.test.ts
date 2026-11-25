import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Color from 'colorjs.io';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

test('W3C DTCG tokens/brand.tokens.json passes WCAG 2.2 AA contrast pairs via colorjs.io', () => {
  const tokens = JSON.parse(read('tokens/brand.tokens.json'));
  const pairs: Array<{ name: string; fg: string; bg: string; level: 'normal' | 'ui' }> =
    tokens.$extensions['com.orion.contrastPairs'];
  assert.ok(Array.isArray(pairs) && pairs.length >= 10);

  const resolveHex = (ref: string) => {
    const [, key] = ref.split('.');
    return tokens.color[key]?.$value as string;
  };

  for (const pair of pairs) {
    const fg = new Color(resolveHex(pair.fg));
    const bg = new Color(resolveHex(pair.bg));
    const ratio = Math.abs(fg.contrast(bg, 'WCAG21'));
    const min = pair.level === 'ui' ? 3.0 : 4.5;
    assert.ok(ratio >= min, `${pair.name} (${resolveHex(pair.fg)} on ${resolveHex(pair.bg)}) = ${ratio.toFixed(2)}:1 < ${min}:1`);
  }
});

test('self-hosted variable font woff2 files exist locally for all three typefaces', () => {
  const requiredFiles = [
    'node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2',
    'node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2',
    'node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2',
    'node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2',
    'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  ];
  for (const rel of requiredFiles) {
    assert.ok(existsSync(path.join(root, rel)), `missing bundled font file ${rel}`);
  }
});

test('vercel.json marks every *.vercel.app preview deployment noindex', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const rule = (vercel.headers ?? []).find((h: { headers?: Array<{ key: string; value: string }> }) =>
    h.headers?.some((kv) => kv.key.toLowerCase() === 'x-robots-tag' && kv.value.includes('noindex') && kv.value.includes('nofollow')),
  );
  assert.ok(rule, 'missing *.vercel.app preview noindex rule');
  const hostRe = new RegExp(rule.has[0].value);
  assert.ok(hostRe.test('danmercede-abc123-dan-mercedes-projects.vercel.app'), 'preview alias must match noindex rule');
  assert.ok(hostRe.test('danmercede-git-release-danmercede-v2-dan-mercedes-projects.vercel.app'), 'git branch preview must match noindex rule');
  assert.ok(!hostRe.test('www.danmercede.com'), 'production www domain must NEVER match preview noindex');
  assert.ok(!hostRe.test('danmercede.com'), 'production apex domain must NEVER match preview noindex');
});

test('expanded brand kit SVGs and Blender meridian assets are present in public/', () => {
  const assets = [
    'public/brand/dm-seal-architectural.svg',
    'public/brand/dm-monogram-compact.svg',
    'public/brand/dm-colophon-signature.svg',
    'public/brand/dm-mark-animated.svg',
    'public/brand/dm-blueprint-pattern.svg',
    'public/media/blender/meridian-monolith-480w.avif',
    'public/media/blender/meridian-monolith-960w.avif',
    'public/media/blender/meridian-monolith.glb',
    'public/media/portraits/dan-mercede-founder-headshot-hero-480w.avif',
  ];
  for (const rel of assets) {
    assert.ok(existsSync(path.join(root, rel)), `missing asset ${rel}`);
  }
});
