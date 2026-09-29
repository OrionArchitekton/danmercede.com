import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');

/**
 * Reads the BUILT output, so it runs after `npm run build` (CI step "Assert
 * built client output"; locally `npm run build && npm run test:built`). It is
 * not in the `npm test` list, which runs before the build. It fails closed when
 * build/ is missing.
 *
 * Visible initial HTML spec, slice S0: React is bundled by Vite. The esm.sh
 * importmap in index.html resolved nothing at runtime, and once the page is
 * rendered at build time a live importmap could load a second, mismatched
 * React. The built output must stay self-contained.
 */

function walk(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });
}

// Static (`import x from "y"`, `import "y"`) and dynamic (`import("y")`) specifiers.
const IMPORT_SPECIFIER = /\bimport\s*(?:[\w$*{},\s]+?\s*from\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

// Every specifier that is not a file inside this build: bare names and remote URLs.
function nonLocalSpecifiers(code: string): string[] {
  return [...code.matchAll(IMPORT_SPECIFIER)]
    .map((m) => m[1] ?? m[2])
    .filter((spec) => !/^(\.{1,2})?\//.test(spec));
}

test('the specifier scan finds bare and remote imports (positive control)', () => {
  assert.deepEqual(
    nonLocalSpecifiers('import{a as b}from"react";import"./local.js";import("./chunk.js");import("https://esm.sh/d3")'),
    ['react', 'https://esm.sh/d3'],
  );
});

test('the build output exists', () => {
  assert.ok(fs.existsSync(path.join(buildDir, 'index.html')), 'run `npm run build` first; this test reads build/');
  assert.ok(walk(path.join(buildDir, 'assets'), '.js').length > 0, 'expected at least one client chunk');
});

test('client chunks import only files from this build', () => {
  for (const file of walk(path.join(buildDir, 'assets'), '.js')) {
    const code = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file);
    assert.deepEqual(nonLocalSpecifiers(code), [], `${rel} imports a module the build does not contain`);
    assert.doesNotMatch(code, /esm\.sh/, `${rel} references esm.sh`);
  }
});

test('no built page carries an importmap or an esm.sh URL', () => {
  const pages = walk(buildDir, '.html');
  assert.ok(pages.length > 50, `expected every baked route, found ${pages.length}`);
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    const rel = path.relative(root, page);
    assert.doesNotMatch(html, /type=["']importmap["']/, `${rel} ships an importmap`);
    assert.doesNotMatch(html, /esm\.sh/, `${rel} references esm.sh`);
  }
});
