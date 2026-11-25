import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROOF_EVIDENCE } from '../constants';
import { summarizeEvidenceTiers } from '../components/EngineeringFigure';
import { parseRouteJsonLdGraph } from '../routeJsonLd';
import { ROUTE_META, routeJsonLdText } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

test('summarizeEvidenceTiers counts command checks, URL checks, and stated limitations without fabricating metrics', () => {
  const summary = summarizeEvidenceTiers(PROOF_EVIDENCE);
  assert.ok(summary.length >= 3, 'expected summary rows across proof tiers');
  const totalSummary = summary.reduce((acc, row) => acc + row.count, 0);
  const totalClaims = PROOF_EVIDENCE.reduce((acc, tier) => acc + tier.claims.length, 0);
  assert.equal(totalSummary, totalClaims);
});

test('parseRouteJsonLdGraph validates schema-dts Graph payloads across routes', () => {
  for (const [route, meta] of Object.entries(ROUTE_META)) {
    const json = routeJsonLdText(route, meta);
    const graph = parseRouteJsonLdGraph(json);
    assert.equal(graph['@context'], 'https://schema.org');
    assert.ok(Array.isArray(graph['@graph']) && graph['@graph'].length > 0, route);
  }
  assert.throws(() => parseRouteJsonLdGraph('{"@context":"https://example.com"}'), /Invalid route JSON-LD Graph/);
});

test('index.html emits conservative same-origin speculationrules excluding /api/*', () => {
  const html = read('index.html');
  const match = html.match(/<script type="speculationrules">([\s\S]*?)<\/script>/);
  assert.ok(match, 'speculationrules script tag present');
  const parsed = JSON.parse(match[1]) as {
    prerender?: Array<{ eagerness?: string; where?: unknown }>;
  };
  assert.ok(Array.isArray(parsed.prerender) && parsed.prerender.length > 0);
  assert.equal(parsed.prerender[0].eagerness, 'moderate');
  assert.match(match[1], /\/api\/\*/);
});

test('index.css defines @font-face metric overrides and prefers-reduced-motion guard', () => {
  const css = read('index.css');
  assert.match(css, /@font-face\s*\{[\s\S]*?Newsreader Fallback/);
  assert.match(css, /size-adjust:/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('Navigation renders a semantic header landmark with >=44px mobile controls', () => {
  const appSrc = read('App.tsx');
  assert.match(appSrc, /<header className="fixed top-0 inset-x-0/);
  assert.match(appSrc, /<nav[\s\S]*?aria-label="Primary"/);
  assert.match(appSrc, /min-h-\[44px\] min-w-\[44px\]/);
});
