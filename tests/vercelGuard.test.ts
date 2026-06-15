/**
 * Tests for the Spec 4b D1 Vercel compile guard (parity with danmercede.online).
 *
 * On Vercel, the prebuild hook must NOT recompile content — the committed
 * bundle is the deploy truth. The guard exits 0 before any filesystem write
 * (and before substrate access) when process.env.VERCEL is set, so a Vercel
 * build cannot overwrite constants.generated.ts regardless of whether the
 * substrate happens to be reachable from the build environment.
 *
 * danmercede.com previously relied only on the softer "substrate unreachable on
 * Vercel -> fail-open skip" path; this hard guard matches danmercede.online and
 * closes the deploy-truth trapdoor if substrate ever becomes reachable there.
 *
 * Uses node:test runner via tsx (no new test framework dependencies).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const generatedTsPath = path.join(projectRoot, 'constants.generated.ts');

const SENTINEL =
  'VERCEL build environment detected — skipping compile; the committed bundle is served (Spec 4b D1).';

/** Prefer the repo-local tsx binary; fall back to PATH (npm scripts add .bin). */
function resolveTsx(): string {
  const local = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
  return fs.existsSync(local) ? local : 'tsx';
}

test('VERCEL=1 compile exits 0, prints sentinel, leaves committed bundle byte-identical', () => {
  // Snapshot committed bytes before the invocation.
  const beforeTs = fs.readFileSync(generatedTsPath);

  const result = spawnSync(resolveTsx(), [path.join('scripts', 'compileContent.ts')], {
    cwd: projectRoot,
    env: { ...process.env, VERCEL: '1' },
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  assert.equal(
    result.status,
    0,
    `expected exit 0, got ${String(result.status)}; stderr: ${result.stderr}`
  );
  assert.ok(
    result.stdout.includes(SENTINEL),
    `stdout missing sentinel line.\nExpected to contain: ${SENTINEL}\nGot: ${result.stdout}`
  );

  const afterTs = fs.readFileSync(generatedTsPath);
  assert.ok(beforeTs.equals(afterTs), 'constants.generated.ts bytes changed under VERCEL=1');
});

test('VERCEL guard fires even when --strict --require-matches would otherwise fail-loud', () => {
  // The guard must short-circuit BEFORE substrate resolution, so the strict
  // flags (which fail-loud on substrate-unreachable / 0-matches) never run on
  // Vercel. Without the guard a Vercel build with these flags would exit 1.
  const result = spawnSync(
    resolveTsx(),
    [path.join('scripts', 'compileContent.ts'), '--strict', '--require-matches'],
    {
      cwd: projectRoot,
      env: { ...process.env, VERCEL: '1' },
      encoding: 'utf-8',
      shell: process.platform === 'win32',
    }
  );

  assert.equal(result.status, 0, `expected exit 0 under VERCEL guard, got ${String(result.status)}`);
  assert.ok(result.stdout.includes(SENTINEL), 'guard sentinel not printed');
});
