import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CASE_STUDIES } from '../constants';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

/**
 * 2026-09-29 site audit, claim precision:
 * - 3D: describe which controls a reference pattern supports, never imply the
 *   mechanism itself makes a system compliant.
 * - Legal: distinguish site content from separately licensed open-source software.
 * - Scaffolding: remove the unused AI Studio API-key defines.
 */

test('reference architectures never claim to enforce or guarantee compliance', () => {
  assert.ok(CASE_STUDIES.length > 0);
  for (const study of CASE_STUDIES) {
    const text = [study.description, ...study.enforcementPoints, ...study.commercialMapping].join('\n');
    assert.doesNotMatch(text, /compliance enforcement|compliance requirements|guarantee/i, `${study.slug}: compliance overclaim`);
    if (/SOC 2|SOX|HIPAA|FDA/.test(text)) {
      assert.match(study.description, /does not by itself/i, `${study.slug}: a regulation named must carry its scope limit`);
    }
  }
});

test('the legal notice separates site content from open-source licenses', () => {
  const app = read('App.tsx');
  const legal = app.slice(app.indexOf('const LegalPage'), app.indexOf('const PrivacyPage'));
  assert.match(legal, /licensed separately/i);
  assert.match(legal, /own repository/i);
  assert.doesNotMatch(legal, /All systems, methodologies/, 'the old blanket IP clause contradicted the MIT licenses');
});

test('the unused AI Studio API-key defines are gone', () => {
  assert.doesNotMatch(read('vite.config.ts'), /GEMINI_API_KEY|process\.env\.API_KEY/);
});
