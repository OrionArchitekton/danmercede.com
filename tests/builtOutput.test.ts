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
 * Visible initial HTML spec, slice S0: React is bundled by Vite, and once pages
 * are rendered at build time a module from outside the build could load a
 * second, mismatched React. Two layers keep the output self-contained:
 * - JavaScript: the build itself fails when a chunk imports anything outside
 *   the bundle (scripts/selfContainedBundle.ts reads Rollup's module graph).
 * - HTML: the template is ours, so pages may carry only the exact script and
 *   module-preload tag shapes the build emits. Any other shape (an importmap, an
 *   inline module, a CDN or page-relative src, different casing or quoting)
 *   fails here, and an intended change updates this allowlist deliberately.
 */

function walk(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });
}

const JSON_LD = /^<script type="application\/ld\+json">$/;
const ENTRY_SCRIPT = /^<script type="module" crossorigin src="(\/assets\/[\w.-]+\.js)">$/;
const MODULE_PRELOAD = /^<link rel="modulepreload" crossorigin href="(\/assets\/[\w.-]+\.js)">$/;

// Problems with a page's script and script-preload tags. `isBuiltFile` answers
// whether a site path such as /assets/index-abc.js is a file inside build/.
function scriptTagProblems(html: string, isBuiltFile: (sitePath: string) => boolean): string[] {
  const problems: string[] = [];
  const checkFile = (tag: string, sitePath: string) => {
    if (!isBuiltFile(sitePath)) problems.push(`${tag} names ${sitePath}, which is not a file in build/`);
  };
  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
    if (JSON_LD.test(tag)) continue;
    const entry = ENTRY_SCRIPT.exec(tag);
    if (entry) checkFile(tag, entry[1]);
    else problems.push(`unexpected script tag ${tag}`);
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/modulepreload|\bas\s*=\s*["']?script\b/i.test(tag)) continue;
    const preload = MODULE_PRELOAD.exec(tag);
    if (preload) checkFile(tag, preload[1]);
    else problems.push(`unexpected script preload ${tag}`);
  }
  return problems;
}

const isBuiltFile = (sitePath: string) => {
  const target = path.join(buildDir, sitePath);
  return target.startsWith(buildDir + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile();
};

test('the tag allowlist accepts the emitted shapes and rejects everything else (positive control)', () => {
  const exists = (p: string) => p === '/assets/index-abc.js';
  assert.deepEqual(
    scriptTagProblems(
      '<script type="application/ld+json">{}</script><script type="module" crossorigin src="/assets/index-abc.js"></script>' +
        '<link rel="modulepreload" crossorigin href="/assets/index-abc.js"><link rel="preload" as="image" href="/hero.webp">',
      exists,
    ),
    [],
  );
  const rejected = [
    '<script type="importmap">{}</script>',
    '<script type=importmap>{}</script>',
    '<script type="module">import "react";</script>',
    '<SCRIPT TYPE=module SRC=https://cdn.example/m.js></SCRIPT>',
    '<script type="module" crossorigin data-src="/assets/index-abc.js" src="https://cdn.example/m.js"></script>',
    '<script type="module" crossorigin src="assets/index-abc.js"></script>',
    '<link rel="preload modulepreload" href="//cdn.example/p.js">',
    '<link rel="preload" as="script" href="https://cdn.example/p.js">',
  ];
  for (const html of rejected) assert.equal(scriptTagProblems(html, exists).length, 1, `must reject ${html}`);
  assert.equal(scriptTagProblems('<script type="module" crossorigin src="/assets/missing.js"></script>', exists).length, 1);
});

test('a site path must name a file, not a directory (positive control)', () => {
  assert.equal(isBuiltFile('/assets/'), false);
  assert.equal(isBuiltFile('/../package.json'), false);
});

test('the build output exists', () => {
  assert.ok(fs.existsSync(path.join(buildDir, 'index.html')), 'run `npm run build` first; this test reads build/');
  assert.ok(walk(path.join(buildDir, 'assets'), '.js').length > 0, 'expected at least one client chunk');
});

test('every JavaScript file in build/ is an emitted chunk', () => {
  const stray = walk(buildDir, '.js').filter((f) => path.dirname(f) !== path.join(buildDir, 'assets'));
  assert.deepEqual(stray.map((f) => path.relative(root, f)), [], 'a script outside build/assets was not checked by the bundle plugin');
});

test('every built page carries only the allowed script tags, naming built files', () => {
  const pages = walk(buildDir, '.html');
  assert.ok(pages.length > 50, `expected every baked route, found ${pages.length}`);
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    const rel = path.relative(root, page);
    assert.match(html, /<script type="module" crossorigin src="\/assets\//, `${rel}: expected the client entry script`);
    assert.deepEqual(scriptTagProblems(html, isBuiltFile), [], rel);
  }
});
