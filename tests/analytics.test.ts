import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGaConfig, createGtag, trackEvent } from '../analytics/gaConfig';

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

// ---------------------------------------------------------------------------
// gtag stub — gtag.js processes ONLY `arguments` objects pushed to dataLayer.
// The array-form stub shipped first and silently sent ZERO hits (verified live:
// no /g/collect beacon, consent stuck at implicit). This locks the regression.
// ---------------------------------------------------------------------------

test('createGtag pushes arguments objects (NOT arrays) so gtag.js applies commands', () => {
  const w: { dataLayer?: unknown[] } = {};
  const gtag = createGtag(w);
  gtag('consent', 'default', { analytics_storage: 'granted' });
  gtag('config', 'G-TEST123', { send_page_view: false });

  assert.equal(w.dataLayer!.length, 2, 'each call pushes one dataLayer entry');
  const first = w.dataLayer![0] as IArguments;
  // The bug: an Array here means gtag.js ignores the command and sends no hits.
  assert.equal(Array.isArray(first), false, 'must NOT be a plain array (gtag.js ignores arrays)');
  assert.equal((first as unknown as { length: number }).length, 3, 'arguments preserves all args');
  assert.equal((first as unknown as Record<number, unknown>)[0], 'consent');
  assert.equal(
    (first as unknown as Record<number, { analytics_storage: string }>)[2].analytics_storage,
    'granted',
  );
});

test('createGtag initializes window.dataLayer and reuses an existing one', () => {
  const existing = [{ existing: true }] as unknown[];
  const pre = { dataLayer: existing };
  const gtag = createGtag(pre);
  gtag('js', 'x');
  assert.equal(pre.dataLayer, existing, 'must preserve the existing dataLayer instance');
  assert.equal(pre.dataLayer.length, 2, 'preserves a pre-existing dataLayer');
});

// ---------------------------------------------------------------------------
// trackEvent — the single event seam behind the /connect conversion links.
// Must forward to gtag as an 'event' command and be a NO-OP without gtag, so it
// is safe to wire unconditionally (dev/preview/unconfigured emit nothing).
// ---------------------------------------------------------------------------

test('trackEvent forwards to gtag as an event command with params', () => {
  const calls: unknown[][] = [];
  const target = { gtag: (...args: unknown[]) => { calls.push(args); } };
  trackEvent(target, 'generate_lead', { method: 'email' });
  assert.deepEqual(calls, [['event', 'generate_lead', { method: 'email' }]]);
});

test('trackEvent defaults params to an empty object', () => {
  const calls: unknown[][] = [];
  trackEvent({ gtag: (...a: unknown[]) => { calls.push(a); } }, 'connect_click');
  assert.deepEqual(calls, [['event', 'connect_click', {}]]);
});

test('trackEvent is a no-op when gtag is absent or the target is null/undefined', () => {
  assert.doesNotThrow(() => trackEvent({}, 'generate_lead', { method: 'email' }));
  assert.doesNotThrow(() => trackEvent(null, 'generate_lead', { method: 'email' }));
  assert.doesNotThrow(() => trackEvent(undefined, 'connect_click'));
});

test('the /connect page wires the lead conversion events (regression guard)', () => {
  const app = read('App.tsx');
  // Tolerant of quote style + spacing so a Prettier/ESLint reformat cannot false-fail.
  assert.match(app, /trackEvent\(\s*window\s*,\s*['"]generate_lead['"]/, 'email link must fire generate_lead');
  assert.match(app, /trackEvent\(\s*window\s*,\s*['"]connect_click['"]/, 'linkedin link must fire connect_click');
});
