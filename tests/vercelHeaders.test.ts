/**
 * Guard tests for vercel.json header rules (round-2 R11 follow-through).
 *
 * Root cause of the original inertness: Vercel `source` patterns are
 * path-to-regexp, NOT full regex. A trailing `$` is matched as a LITERAL
 * dollar character, so any rule ending in `$` can never match a real path
 * and silently no-ops. Live evidence 2026-07-05: /assets/index-*.css served
 * `max-age=0, must-revalidate` while the no-`$` diagrams rule bound fine.
 *
 * These tests pin the class bug (no trailing `$` in any source) and the
 * intended Cache-Control policy per asset family, so a future edit cannot
 * silently reintroduce a never-matching rule.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');

type HeaderRule = { source: string; headers: { key: string; value: string }[] };
type VercelConfig = {
  headers?: HeaderRule[];
  redirects?: { source: string }[];
  rewrites?: { source: string }[];
};

const config: VercelConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf-8')
);

function cacheControlOf(rule: HeaderRule): string | undefined {
  return rule.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value;
}

test('no source pattern ends with a literal $ (path-to-regexp never matches it)', () => {
  const offenders: string[] = [];
  for (const section of ['headers', 'redirects', 'rewrites'] as const) {
    for (const rule of config[section] ?? []) {
      if (rule.source.endsWith('$')) {
        offenders.push(`${section}: ${rule.source}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `source patterns ending in "$" are inert on Vercel (literal $): ${offenders.join('; ')}`
  );
});

test('hashed bundle assets rule exists and is immutable', () => {
  const rule = (config.headers ?? []).find((r) =>
    r.source.startsWith('/assets/(.*)\\.(js|css')
  );
  assert.ok(rule, 'missing the /assets bundle Cache-Control rule');
  assert.equal(cacheControlOf(rule!), 'public, max-age=31536000, immutable');
});

test('guides images rule exists, is day-cached, and orders after the bundle rule', () => {
  const headers = config.headers ?? [];
  const guidesIdx = headers.findIndex((r) => r.source.startsWith('/assets/guides/(.*)'));
  const bundleIdx = headers.findIndex((r) => r.source.startsWith('/assets/(.*)\\.(js|css'));
  assert.ok(guidesIdx >= 0, 'missing the guides images rule');
  assert.equal(
    cacheControlOf(headers[guidesIdx]),
    'public, max-age=86400, stale-while-revalidate=604800'
  );
  // Later rules win on duplicate keys: guides must come after the broad
  // bundle rule or its day-cache would be overridden to immutable.
  assert.ok(
    guidesIdx > bundleIdx,
    'guides rule must appear after the broad /assets bundle rule to win Cache-Control'
  );
});

test('office document assets rule exists and is short-cached', () => {
  const rule = (config.headers ?? []).find((r) =>
    r.source.startsWith('/assets/(.*)\\.(pdf|docx')
  );
  assert.ok(rule, 'missing the /assets documents Cache-Control rule');
  assert.equal(cacheControlOf(rule!), 'public, max-age=300, must-revalidate');
});
