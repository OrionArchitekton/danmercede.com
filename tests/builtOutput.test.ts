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
 * React. The built output must stay self-contained: every module a page or
 * chunk loads is a file inside build/.
 */

function walk(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });
}

// Static imports, side-effect imports, re-exports, and dynamic imports with a
// literal specifier. A dynamic import of a computed value cannot be resolved
// statically; the bundle carries one (react-router's route-module loader, dead
// code in this app's declarative routing), so it is not flagged.
const SPECIFIER =
  /\b(?:import|export)\s*(?:[\w$*{},\s]+?\s*from\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function moduleSpecifiers(code: string): string[] {
  return [...code.matchAll(SPECIFIER)].map((m) => m[1] ?? m[2]);
}

// An HTML attribute value: double-quoted, single-quoted, or unquoted.
const VALUE = String.raw`(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))`;
const valueOf = (m: RegExpMatchArray) => m[1] ?? m[2] ?? m[3];

// Module references in HTML, matched case-insensitively with any attribute
// quoting: every <script src>, every link whose rel includes modulepreload, and
// every specifier inside an inline <script type="module">.
function pageModuleRefs(html: string): string[] {
  const scripts = [...html.matchAll(new RegExp(String.raw`<script\b[^>]*?\bsrc\s*=\s*${VALUE}[^>]*>`, 'gi'))].map(valueOf);
  const preloads = [
    ...html.matchAll(
      new RegExp(String.raw`<link\b(?=[^>]*\brel\s*=\s*(?:"[^"]*\bmodulepreload\b[^"]*"|'[^']*\bmodulepreload\b[^']*'|modulepreload\b))[^>]*?\bhref\s*=\s*${VALUE}[^>]*>`, 'gi'),
    ),
  ].map(valueOf);
  const inline = [...html.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']?module\b)(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) =>
    moduleSpecifiers(m[1]),
  );
  return [...scripts, ...preloads, ...inline];
}

// The file inside build/ that a reference names, or null for a package name, a
// URL (including a protocol-relative //host), or a path that leaves build/.
function resolveInBuild(ref: string, fromFile: string): string | null {
  const clean = ref.split(/[?#]/)[0];
  let target: string;
  if (/^\.{1,2}\//.test(clean)) target = path.resolve(path.dirname(fromFile), clean);
  else if (/^\/(?!\/)/.test(clean)) target = path.join(buildDir, clean);
  else return null;
  return target.startsWith(buildDir + path.sep) ? target : null;
}

function unresolved(refs: string[], fromFile: string): string[] {
  return refs.filter((ref) => {
    const target = resolveInBuild(ref, fromFile);
    return target === null || !fs.existsSync(target);
  });
}

test('the scanners find every import form and module tag (positive control)', () => {
  assert.deepEqual(
    moduleSpecifiers('import{a as b}from"react";import"./x.js";export*from"pkg";export{c}from"./c.js";import("./d.js")'),
    ['react', './x.js', 'pkg', './c.js', './d.js'],
  );
  assert.deepEqual(
    pageModuleRefs(
      '<SCRIPT TYPE=module SRC=https://cdn.example/m.js></SCRIPT>' +
        "<link rel='preload modulepreload' href=//cdn.example/p.js>" +
        '<script type="module">import "https://cdn.example/inline.js";</script>',
    ),
    ['https://cdn.example/m.js', '//cdn.example/p.js', 'https://cdn.example/inline.js'],
  );
});

test('only files inside build/ count as local (positive control)', () => {
  const chunk = path.join(buildDir, 'assets', 'index.js');
  for (const ref of ['react', '//cdn.example/m.js', 'https://cdn.jsdelivr.net/npm/react', '../../outside.js']) {
    assert.equal(resolveInBuild(ref, chunk), null, `${ref} must not resolve inside build/`);
  }
  assert.equal(resolveInBuild('./chunk.js', chunk), path.join(buildDir, 'assets', 'chunk.js'));
  assert.equal(resolveInBuild('/assets/a.js?v=1', chunk), path.join(buildDir, 'assets', 'a.js'));
});

test('the build output exists', () => {
  assert.ok(fs.existsSync(path.join(buildDir, 'index.html')), 'run `npm run build` first; this test reads build/');
  assert.ok(walk(buildDir, '.js').length > 0, 'expected at least one client chunk');
});

test('client chunks import only files from this build', () => {
  for (const file of walk(buildDir, '.js')) {
    const refs = moduleSpecifiers(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(unresolved(refs, file), [], `${path.relative(root, file)} loads a module the build does not contain`);
  }
});

test('no built page ships an importmap or loads a module from outside the build', () => {
  const pages = walk(buildDir, '.html');
  assert.ok(pages.length > 50, `expected every baked route, found ${pages.length}`);
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    const rel = path.relative(root, page);
    assert.doesNotMatch(html, /<script\b[^>]*\btype\s*=\s*["']?importmap\b/i, `${rel} ships an importmap`);
    const refs = pageModuleRefs(html);
    assert.ok(refs.length > 0, `${rel}: expected the client entry script (positive control)`);
    assert.deepEqual(unresolved(refs, page), [], `${rel} loads a module the build does not contain`);
  }
});
