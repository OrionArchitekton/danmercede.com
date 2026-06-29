import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGaConfig } from '../analytics/gaConfig';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

// ---------------------------------------------------------------------------
// GA4 gating — the single decision point for whether analytics runs.
// Fail-safe by construction: anything that is not a well-formed GA4 id must
// produce a no-op (null), so dev/preview/unconfigured deploys emit nothing.
// ---------------------------------------------------------------------------

test('resolveGaConfig returns null for absent / empty / whitespace / malformed ids', () => {
  for (const bad of [undefined, null, '', '   ', 'UA-12345-1', 'G-', 'gtm-abc', 'G_ABC', 'random']) {
    assert.equal(resolveGaConfig(bad as string | undefined | null), null, `must no-op for: ${String(bad)}`);
  }
});

test('resolveGaConfig accepts a well-formed GA4 id and trims it', () => {
  const cfg = resolveGaConfig('  G-ABC1234XYZ  ');
  assert.ok(cfg, 'valid id must produce a config');
  assert.equal(cfg!.measurementId, 'G-ABC1234XYZ', 'id is trimmed');
});

test('GA runs in privacy-leaning Consent Mode v2: analytics granted, all ad signals denied', () => {
  const cfg = resolveGaConfig('G-TEST123')!;
  assert.equal(cfg.consentDefaults.analytics_storage, 'granted');
  assert.equal(cfg.consentDefaults.ad_storage, 'denied');
  assert.equal(cfg.consentDefaults.ad_user_data, 'denied');
  assert.equal(cfg.consentDefaults.ad_personalization, 'denied');
});

test('GA config anonymizes IP and disables auto page_view (SPA fires manually)', () => {
  const cfg = resolveGaConfig('G-TEST123')!;
  assert.equal(cfg.configParams.anonymize_ip, true);
  assert.equal(cfg.configParams.send_page_view, false);
});

// ---------------------------------------------------------------------------
// AEO — llms.txt (the personal sites currently serve none; business sites do).
// ---------------------------------------------------------------------------

test('public/llms.txt exists, identifies Dan, and points at the canonical origin + surfaces', () => {
  const txt = read('public/llms.txt');
  assert.match(txt, /^# Dan Mercede/, 'must begin with the H1 site name');
  assert.match(txt, /https:\/\/www\.danmercede\.com/, 'must advertise the canonical origin');
  for (const surface of ['/thoughts', '/guides', '/works']) {
    assert.ok(txt.includes(surface), `must point at the ${surface} surface`);
  }
});
