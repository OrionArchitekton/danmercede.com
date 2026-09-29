import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rollup } from 'rollup';

import { externalImports, selfContainedBundle } from '../scripts/selfContainedBundle';
import viteConfig from '../vite.config';

/**
 * Visible initial HTML spec, slice S0: the client build fails when any chunk
 * imports a module from outside the bundle. The check reads Rollup's module
 * graph, so an import-like string inside code is not an import, and a dynamic
 * import with an options argument is still one.
 */

test('externalImports names every import the bundle does not contain', () => {
  const bundle = {
    'assets/index.js': { type: 'chunk', imports: ['assets/vendor.js', 'react'], dynamicImports: ['https://cdn.example/m.js', 'assets/lazy.js'] },
    'assets/vendor.js': { type: 'chunk', imports: [], dynamicImports: [] },
    'assets/lazy.js': { type: 'chunk', imports: [], dynamicImports: [] },
    'assets/index.css': { type: 'asset' },
  };
  assert.deepEqual(externalImports(bundle), ['assets/index.js imports react', 'assets/index.js imports https://cdn.example/m.js']);
  assert.deepEqual(externalImports({ 'assets/index.js': { type: 'chunk', imports: ['assets/vendor.js'] }, 'assets/vendor.js': { type: 'chunk' } }), []);
});

async function bundleWithPlugin(files: Record<string, string>, external: (id: string) => boolean): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'self-contained-'));
  try {
    for (const [name, code] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), code);
    const build = await rollup({ input: path.join(dir, 'entry.js'), external, plugins: [selfContainedBundle() as never] });
    await build.generate({ format: 'es' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('the plugin fails a real Rollup build that imports from outside the bundle', async () => {
  const external = (id: string) => id === 'react' || id.startsWith('https:');
  await assert.rejects(
    bundleWithPlugin({ 'entry.js': "import React from 'react';\nconsole.log(React);" }, external),
    /entry\.js imports react/,
  );
  await assert.rejects(
    bundleWithPlugin({ 'entry.js': "export const m = () => import('https://cdn.example/m.js', { with: {} });" }, external),
    /imports https:\/\/cdn\.example\/m\.js/,
  );
  await bundleWithPlugin(
    {
      'entry.js': "import './local.js';\nconst help = 'import \"not-a-dependency\"';\nexport const lazy = () => import('./lazy.js');\nconsole.log(help);",
      'local.js': 'export const l = 1;',
      'lazy.js': 'export const z = 2;',
    },
    external,
  );
});

test('the client build registers the plugin', async () => {
  const config = await (viteConfig as (env: { command: 'build'; mode: string }) => { plugins?: unknown[] })({ command: 'build', mode: 'production' });
  const names = (config.plugins ?? []).flat(Infinity).map((p) => (p as { name?: string } | null)?.name);
  assert.ok(names.includes('self-contained-bundle'), `plugins: ${names.join(', ')}`);
});
