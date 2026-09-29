import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRIVACY_SECTIONS } from '../constants';
import { resolveGaConfig } from '../analytics/gaConfig';
import { ROUTE_META } from '../seoMeta';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(projectRoot, rel), 'utf8');

/**
 * Regression guard for the 2026-09-29 site audit (privacy finding).
 *
 * The /privacy page said the site used no behavioral tracking and collected no
 * personal data, while GA4 ran with analytics_storage granted and Vercel Web
 * Analytics + Speed Insights were mounted. The copy and the code were written
 * separately, so nothing noticed when they diverged. These tests derive what the
 * disclosure MUST say from the analytics code itself.
 */

const policyText = () => PRIVACY_SECTIONS.map((s) => `${s.heading}\n${s.body}`).join('\n\n');

test('the privacy policy has content to check', () => {
  assert.ok(PRIVACY_SECTIONS.length >= 3, 'expected a multi-section privacy policy');
  for (const s of PRIVACY_SECTIONS) {
    assert.ok(s.heading.trim() && s.body.trim(), 'every section needs a heading and a body');
  }
});

test('when GA4 runs with analytics storage granted, the policy discloses it and does not deny tracking', () => {
  const cfg = resolveGaConfig('G-TEST123');
  // Positive control: a well-formed id must enable GA, or this test checks nothing.
  assert.ok(cfg, 'resolveGaConfig must enable GA for a well-formed measurement id');

  const text = policyText();
  if (cfg!.consentDefaults.analytics_storage === 'granted') {
    assert.match(text, /Google Analytics/, 'analytics storage is granted, so GA4 must be named');
    assert.match(text, /cookie/i, 'GA4 sets first-party cookies when analytics storage is granted');
  }
  for (const denial of [
    /do not use (?:advertising or )?behavioral tracking/i,
    /do not collect personal data/i,
    /strictly for essential technical functionality/i,
  ]) {
    assert.doesNotMatch(text, denial, `the policy must not claim ${denial} while analytics runs`);
  }
});

test('every mounted analytics package is named in the policy', () => {
  const component = read('components/Analytics.tsx');
  const text = policyText();
  const packages: [RegExp, RegExp, string][] = [
    [/from '@vercel\/analytics\/react'/, /Vercel Web Analytics/, 'Vercel Web Analytics'],
    [/from '@vercel\/speed-insights\/react'/, /Vercel Speed Insights/, 'Vercel Speed Insights'],
  ];
  let mounted = 0;
  for (const [importRe, nameRe, name] of packages) {
    if (importRe.test(component)) {
      mounted++;
      assert.match(text, nameRe, `${name} is mounted in components/Analytics.tsx but not disclosed`);
    }
  }
  assert.ok(mounted > 0, 'expected to find at least one mounted analytics package (positive control)');
});

test('the /privacy page renders the tested policy, not a separate copy', () => {
  const app = read('App.tsx');
  assert.match(app, /PRIVACY_SECTIONS\.map\(/, 'PrivacyPage must render PRIVACY_SECTIONS');
  assert.doesNotMatch(app, /behavioral tracking cookies/, 'the old inline privacy copy must be gone');
});

test('the privacy claims about GA4 settings match gaConfig.ts', () => {
  const cfg = resolveGaConfig('G-TEST123')!;
  const text = policyText();
  const claimsIpAnon = /IP anonymization is on/.test(text);
  assert.equal(claimsIpAnon, cfg.configParams.anonymize_ip === true, 'IP anonymization claim must match configParams.anonymize_ip');
  const adsOff =
    cfg.consentDefaults.ad_storage === 'denied' &&
    cfg.consentDefaults.ad_personalization === 'denied' &&
    cfg.consentDefaults.ad_user_data === 'denied';
  const claimsAdsOff = /advertising storage, ad personalization, and ad user data are turned off/.test(text);
  assert.equal(claimsAdsOff, adsOff, 'the ads-off claim must match the three ad consent defaults');
});

// Each GA event the site sends, and the phrase that discloses it.
const EVENT_DISCLOSURES: Record<string, RegExp> = {
  generate_lead: /clicking the email link/,
  connect_click: /clicking the LinkedIn link/,
};

test('every analytics event the site sends is disclosed', () => {
  const sources = ['App.tsx', ...fs.readdirSync(path.join(projectRoot, 'components')).map((f) => `components/${f}`)];
  const names = new Set(
    sources.flatMap((rel) => [...read(rel).matchAll(/trackEvent\([^,]+,\s*'([a-z_]+)'/g)].map((m) => m[1])),
  );
  assert.ok(names.has('generate_lead'), 'expected to find the email-click event (positive control)');
  const text = policyText();
  for (const name of names) {
    const phrase = EVENT_DISCLOSURES[name];
    assert.ok(phrase, `event "${name}" is sent but has no disclosure entry; add it to the policy and this map`);
    assert.match(text, phrase, `event "${name}" is not described in the privacy policy`);
  }
});

test('the no-JS /privacy prerender carries the full policy', () => {
  const paragraphs = ROUTE_META['/privacy'].body?.paragraphs ?? [];
  for (const s of PRIVACY_SECTIONS) {
    assert.ok(
      paragraphs.some((p) => p.includes(s.body)),
      `the /privacy prerender body is missing section "${s.heading}"`,
    );
  }
});
