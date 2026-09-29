import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ABOUT_BIO, CONTACT_INTENTS, CONTACT_EMAIL, contactHref } from '../constants';
import { ROUTE_META, renderBodyBlock } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

/**
 * 2026-09-29 site audit, front door: /about becomes a factual operating
 * biography (the audit found the Neo4j speaker page explained Dan's background
 * better than his own site), and /connect names the reasons to get in touch
 * instead of routing every visitor toward one commercial path.
 *
 * Both pages are rendered from constants that are also baked into the no-JS
 * prerender, so crawlers and visitors read the same text.
 */

const bioText = () =>
  [ABOUT_BIO.lead, ...ABOUT_BIO.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join('\n');

test('the About biography states operating history, current work, and external recognition', () => {
  assert.ok(ABOUT_BIO.sections.length >= 3, 'expected background, current work, and recognition sections');
  const text = bioText();
  assert.match(text, /General Manager/, 'the operating role must be stated, not implied');
  assert.match(text, /P&L/, 'the P&L scope is the fact the audit asked for');
  for (const s of ABOUT_BIO.sections) {
    assert.ok(s.heading.trim() && s.paragraphs.every((p) => p.trim()), `section "${s.heading}" has empty copy`);
  }
  assert.ok(ABOUT_BIO.recognition.length >= 2, 'expected at least two externally verifiable credentials');
  for (const r of ABOUT_BIO.recognition) {
    assert.match(r.href, /^https:\/\//, `${r.label}: recognition must link its source`);
    assert.doesNotMatch(r.href, /danmercede\.com/, `${r.label}: recognition must link an external source, not this site`);
  }
});

test('the /about prerender carries the full biography', () => {
  const body = renderBodyBlock('/about', ROUTE_META['/about']);
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const p of ABOUT_BIO.sections.flatMap((s) => s.paragraphs)) {
    assert.ok(body.includes(escape(p)), `the /about prerender is missing: ${p.slice(0, 60)}`);
  }
  for (const r of ABOUT_BIO.recognition) {
    assert.ok(body.includes(escape(r.label)), `the /about prerender is missing recognition: ${r.label}`);
  }
});

test('AboutPage renders ABOUT_BIO and drops the retired founder caption', () => {
  const app = read('App.tsx');
  const page = app.slice(app.indexOf('const AboutPage'), app.indexOf('const EcosystemPage'));
  assert.match(page, /ABOUT_BIO\.sections\.map\(/);
  assert.match(page, /ABOUT_BIO\.recognition\.map\(/);
  assert.doesNotMatch(app, /Founder of Cosmocrat/);
});

test('/connect names every reason to reach out, and each one has a working route', () => {
  const ids = CONTACT_INTENTS.map((i) => i.id).sort();
  assert.deepEqual(ids, ['collaboration', 'employment', 'implementation', 'speaking']);
  for (const intent of CONTACT_INTENTS) {
    if ('subject' in intent && intent.subject) {
      assert.ok(!('href' in intent && intent.href), `${intent.id}: an email intent must not also carry an href`);
    } else {
      assert.match((intent as { href?: string }).href ?? '', /^https:\/\//, `${intent.id}: needs a subject or an https href`);
    }
  }
  const body = renderBodyBlock('/connect', ROUTE_META['/connect']);
  for (const intent of CONTACT_INTENTS) {
    assert.ok(body.includes(intent.label), `the /connect prerender is missing "${intent.label}"`);
  }
});

test('ConnectPage renders CONTACT_INTENTS and the theatrical copy is gone everywhere', () => {
  const app = read('App.tsx');
  const page = app.slice(app.indexOf('const ConnectPage'), app.indexOf('const LegalPage'));
  assert.match(page, /CONTACT_INTENTS\.map\(/);
  for (const rel of ['App.tsx', 'seoMeta.ts', 'constants.ts']) {
    assert.doesNotMatch(read(rel), /Initiate Protocol/i, `${rel} still carries "Initiate Protocol"`);
  }
});

test('the new front-door copy follows the house voice', () => {
  const copy = [bioText(), ...ABOUT_BIO.recognition.map((r) => r.label), ...CONTACT_INTENTS.flatMap((i) => [i.label, i.detail])].join('\n');
  assert.doesNotMatch(copy, /[\u2013\u2014\u2015]/, 'no long dashes in public copy');
  for (const banned of [/passionate/i, /synergy/i, /responsible AI/i, /vibe[- ]?cod/i, /Daniel Mercede/]) {
    assert.doesNotMatch(copy, banned, `banned voice term ${banned}`);
  }
});

test('the no-JS bakes carry real links, not just labels', () => {
  const about = renderBodyBlock('/about', ROUTE_META['/about']);
  for (const r of ABOUT_BIO.recognition) {
    assert.ok(about.includes(`href="${r.href}"`), `/about prerender must link ${r.href}`);
  }
  const connect = renderBodyBlock('/connect', ROUTE_META['/connect']);
  assert.ok(connect.includes(CONTACT_EMAIL), '/connect prerender must show the email address');
  for (const intent of CONTACT_INTENTS) {
    const href = contactHref(intent).replace(/&/g, '&amp;');
    assert.ok(connect.includes(`href="${href}"`), `/connect prerender must link ${intent.id}: ${href}`);
  }
  const app = read('App.tsx');
  const page = app.slice(app.indexOf('const ConnectPage'), app.indexOf('const LegalPage'));
  assert.match(page, /contactHref\(intent\)/, 'ConnectPage and the prerender must share contactHref');
});
