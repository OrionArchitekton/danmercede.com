import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPEAKING, CONTACT_INTENTS, CONTACT_EMAIL } from '../constants';

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

test('the published PDF carries a real title, not "(anonymous)"', () => {
  const pdf = fs.readFileSync(pdfPath).toString('latin1');
  assert.doesNotMatch(pdf, /\/Title\s*\(\\?\(anonymous\\?\)\)/, 'PDF title is still "(anonymous)"');
  assert.match(pdf, /\/Title\s*[(<]/, 'expected a /Title entry in the PDF info dictionary');
});
