import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPEAKING, UPCOMING_SPEAKING, CONTACT_INTENTS, CONTACT_EMAIL } from '../constants';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'docs/one-sheets/speaking-one-sheet.html');
const pdfPath = path.join(root, 'public/assets/Speaking_One_Sheet.pdf');

/**
 * 2026-09-29 site audit, item 1.3: the speaking one-sheet claimed "a new
 * architectural category for enterprise AI", listed governance-only talks,
 * booked through a commercial Readiness Scan, and carried "(anonymous)" as its
 * PDF title. It is now rendered from a committed HTML source that must agree
 * with the site's verified SPEAKING entry and route organizers to a direct
 * speaking inquiry.
 */

const source = () => fs.readFileSync(sourcePath, 'utf8');

test('the one-sheet source agrees with the verified speaking entry', () => {
  const html = source();
  for (const fact of [SPEAKING.event, SPEAKING.date, SPEAKING.title, SPEAKING.href]) {
    const escaped = fact.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
    assert.ok(html.includes(fact) || html.includes(escaped), `one-sheet source is missing: ${fact}`);
  }
});

test('organizers get a direct speaking route, not a sales funnel', () => {
  const html = source();
  const speaking = CONTACT_INTENTS.find((i) => i.id === 'speaking');
  assert.ok(speaking, 'expected a speaking contact intent');
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(speaking!.subject ?? '')}`;
  assert.ok(html.includes(mailto), `the one-sheet must link ${mailto}`);
  assert.doesNotMatch(html, /readiness[- ]scan/i, 'speaking inquiries must not route through the commercial Readiness Scan');
  assert.doesNotMatch(html, /new architectural category/i, 'retired positioning');
});

test('the one-sheet copy follows the house voice', () => {
  const text = source().replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /[\u2013\u2014\u2015]/, 'no long dashes in public copy');
});

test('the published PDF carries exactly the one-sheet title', () => {
  const pdf = fs.readFileSync(pdfPath).toString('latin1');
  const m = pdf.match(/\/Title\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]+>)/);
  assert.ok(m, 'expected a /Title entry in the PDF info dictionary');
  const raw = m![1];
  const title = raw.startsWith('<')
    ? Buffer.from(raw.slice(1, -1), 'hex').swap16().toString('utf16le').replace(/^\uFEFF/, '')
    : raw.slice(1, -1).replace(/\\(.)/g, '$1');
  assert.equal(title, 'Dan Mercede, Speaker One-Sheet');
});

/**
 * NODES 2026 took place on November 12, 2026 (docs/runbooks/nodes-speaking-promotion.md,
 * "November 13 source update"). The talk now reads as past speaking, keeps the Neo4j
 * speaker page as its credential-proof link (neo4j.com/nodes/ itself never names Dan),
 * and no longer offers the speaker-contest registration link.
 */
test('the past NODES talk keeps the speaker page as proof and drops registration', () => {
  assert.equal(SPEAKING.href, 'https://neo4j.com/nodes/speakers/dan-mercede/', 'the credential-proof link stays the speaker page');
  assert.equal(SPEAKING.label, 'Past Speaking');
  assert.ok(!Object.keys(SPEAKING).includes('registerHref'), 'registration ended with the event');
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const start = app.indexOf('{/* Speaking');
  assert.ok(start >= 0, 'expected the homepage speaking block');
  const block = app.slice(start, app.indexOf('</Section>', start));
  assert.ok(block.includes('href={SPEAKING.href}'), 'the speaking block links the NODES speaker page');
  assert.doesNotMatch(block, /registerHref|registerCta/, 'no registration link after the event');
  assert.doesNotMatch(app, /SpeakerContest/, 'the contest URL is gone from the homepage');
});

/**
 * OpsWorld 2027 (accepted 2026-11-09, confirmed 2026-11-10; the organizer set the
 * 50-minute slot as a hands-on workshop on 2026-11-10). Proof is Dan's public
 * Sessionize profile, which lists OpsWorld 2027 as an upcoming event.
 */
test('the upcoming OpsWorld workshop leads the speaking block with its public proof link', () => {
  assert.equal(UPCOMING_SPEAKING.label, 'Upcoming Speaking');
  assert.equal(UPCOMING_SPEAKING.event, 'OpsWorld 2027');
  assert.equal(UPCOMING_SPEAKING.date, 'February 9, 2027');
  assert.equal(UPCOMING_SPEAKING.title, 'Close Incidents With Solution Docs and Check Runbook Freshness');
  assert.equal(UPCOMING_SPEAKING.href, 'https://sessionize.com/dan-mercede/');
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const start = app.indexOf('{/* Speaking');
  const block = app.slice(start, app.indexOf('</Section>', start));
  assert.ok(block.includes('href={UPCOMING_SPEAKING.href}'), 'the speaking block links the OpsWorld proof');
  assert.ok(block.indexOf('UPCOMING_SPEAKING.event') < block.indexOf('SPEAKING.event}', block.indexOf('UPCOMING_SPEAKING.event') + 30), 'upcoming comes before past');
});

test('the one-sheet source names the upcoming workshop', () => {
  const html = source();
  for (const fact of [UPCOMING_SPEAKING.event, UPCOMING_SPEAKING.date, UPCOMING_SPEAKING.title]) {
    assert.ok(html.includes(fact), `one-sheet source is missing: ${fact}`);
  }
});
