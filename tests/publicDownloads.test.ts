import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RESOURCES, CASE_STUDIES } from '../constants';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(projectRoot, 'public', 'assets');

/**
 * Regression guard for the 2026-09-29 site audit (Executive Deck finding).
 *
 * The 2026-07-26 honesty pass removed unsourced outcome figures from the /proof
 * cards and scanned the case-study DOCX downloads, but the Executive Deck (PPTX,
 * plus an unlinked PDF twin) kept serving the same figures because nothing
 * scanned those file types. The fix is on the coverage axis, not the file: a
 * document served from public/assets must be linked from the site, and a
 * document type this suite cannot read must carry an explicit human review.
 */

const DOCUMENT_EXTS = new Set(['.pdf', '.pptx', '.docx', '.doc', '.ppt', '.xlsx']);

// Types whose prose caseStudyHonesty.test.ts actually reads and scans.
const SCANNED_EXTS = new Set(['.docx']);

// Served documents of a type no test can read. Each entry is a human review of
// the current file contents; replacing the file means re-reviewing it here.
const REVIEWED_UNSCANNED: Record<string, string> = {
  'Speaking_One_Sheet.pdf':
    'Reviewed 2026-09-29: bio, talk topics, contact. No outcome figures. Stale positioning tracked by audit item 1.3.',
  'What_We_Deliver.pdf':
    'Reviewed 2026-09-29: engagement tiers with published prices, no outcome figures. Keep-or-retire decision tracked by audit item 1.4.',
};

function servedDocuments(): string[] {
  return fs
    .readdirSync(assetsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && DOCUMENT_EXTS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

function linkedDocuments(): string[] {
  const paths = [...RESOURCES.map((r) => r.filePath), ...CASE_STUDIES.map((c) => c.filePath)];
  return [...new Set(paths.filter((p) => p.startsWith('/assets/')).map((p) => p.slice('/assets/'.length)))].sort();
}

test('every document served from public/assets is linked from the site, and vice versa', () => {
  const served = servedDocuments();
  // Positive control: the scan must see the known case-study downloads.
  assert.ok(
    served.includes('Reference_Architecture_Healthcare.docx'),
    'expected the document scan to find a known committed download',
  );
  assert.deepEqual(
    served,
    linkedDocuments(),
    'a document removed from the page must also stop being served (and a linked one must exist)',
  );
});

test('every served document type without a content scanner has an explicit review', () => {
  const unreviewed = servedDocuments().filter(
    (name) => !SCANNED_EXTS.has(path.extname(name).toLowerCase()) && !(name in REVIEWED_UNSCANNED),
  );
  assert.deepEqual(
    unreviewed,
    [],
    'these downloads are served but no test can read them; review them and add an entry, or remove them',
  );
});

test('the unscanned-review ledger names only files that still exist', () => {
  const served = new Set(servedDocuments());
  const stale = Object.keys(REVIEWED_UNSCANNED).filter((name) => !served.has(name));
  assert.deepEqual(stale, [], 'drop ledger entries for files that are no longer served');
});
