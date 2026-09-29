import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
 * document type this suite cannot read must carry a human review bound to the
 * exact bytes that were reviewed.
 */

const DOCUMENT_EXTS = new Set(['.pdf', '.pptx', '.docx', '.doc', '.ppt', '.xlsx']);

// The downloads whose prose caseStudyHonesty.test.ts actually reads and scans:
// the CASE_STUDIES DOCX files, not every DOCX. A file-type rule here is what let
// the template (and before it, the deck) sit unscanned.
const SCANNED = new Set(
  CASE_STUDIES.filter((c) => c.filePath.toLowerCase().endsWith('.docx')).map((c) => c.filePath.slice('/assets/'.length)),
);

// Served documents of a type no test can read, keyed by path under public/assets.
// The sha256 pins the reviewed bytes: replacing the file fails this suite until
// someone re-reviews it and updates the hash (`sha256sum public/assets/<file>`).
const REVIEWED_UNSCANNED: Record<string, { sha256: string; review: string }> = {
  'Case_Study_Template.docx': {
    sha256: '604413e451b238ede4a0617c0258a6d6816f7780bcaca16037292032fccbc494',
    review: '2026-09-29: blank template. Field labels only (e.g. ROI Scorecard, Baseline KPI) with no figures, percentages, or currency. The case-study scanner is not applied because it bans those labels as claim shapes.',
  },
  'Speaking_One_Sheet.pdf': {
    sha256: 'e9b789ab8852c686fdd9152210319ec3a48d80e54cb4206dc560a94771944d01',
    review: '2026-09-29: rebuilt from docs/one-sheets/speaking-one-sheet.html. Bio, NODES 2026 talk, UiPath finalist, four talk topics, direct speaking email. No outcome figures.',
  },
  'What_We_Deliver.pdf': {
    sha256: 'c7635540b31ecdf90ceaece4a4c8be67083fff28ccc6db211db17fa1b91deb7c',
    review: '2026-09-29: engagement tiers with published prices, no outcome figures. Keep-or-retire tracked by audit item 1.4.',
  },
};

// Source files that can carry an href to a downloadable document.
const HREF_SOURCES = [
  'App.tsx',
  'constants.ts',
  'constants.generated.ts',
  'constants.guides.generated.ts',
  'seoMeta.ts',
  'public/llms.txt',
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    return e.isDirectory() ? walk(abs) : e.isFile() ? [abs] : [];
  });
}

// Every document anywhere under public/assets, as a path relative to it.
function servedDocuments(): string[] {
  return walk(assetsDir)
    .filter((abs) => DOCUMENT_EXTS.has(path.extname(abs).toLowerCase()))
    .map((abs) => path.relative(assetsDir, abs).split(path.sep).join('/'))
    .sort();
}

function linkedDocuments(): string[] {
  const paths = [...RESOURCES.map((r) => r.filePath), ...CASE_STUDIES.map((c) => c.filePath)];
  return [...new Set(paths.filter((p) => p.startsWith('/assets/')).map((p) => p.slice('/assets/'.length)))].sort();
}

const sha256 = (rel: string) =>
  crypto.createHash('sha256').update(fs.readFileSync(path.join(assetsDir, rel))).digest('hex');

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

test('every served document the honesty scanner does not read has a review pinned to its bytes', () => {
  const problems: string[] = [];
  for (const rel of servedDocuments()) {
    if (SCANNED.has(rel)) continue;
    const entry = REVIEWED_UNSCANNED[rel];
    if (!entry) {
      problems.push(`${rel}: served but no test can read it; review it and add an entry, or remove it`);
    } else if (sha256(rel) !== entry.sha256) {
      problems.push(`${rel}: bytes changed since the ${entry.review.slice(0, 10)} review; re-review and update its sha256`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the unscanned-review ledger names only files that still exist', () => {
  const served = new Set(servedDocuments());
  const stale = Object.keys(REVIEWED_UNSCANNED).filter((name) => !served.has(name));
  assert.deepEqual(stale, [], 'drop ledger entries for files that are no longer served');
});

test('no source file links a document that is not served', () => {
  const served = new Set(servedDocuments());
  // Old download names that vercel.json redirects to a served file are fine.
  const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'));
  const redirected = new Set<string>(
    (cfg.redirects ?? []).map((r: { source: string }) => r.source.replace(/^\/assets\//, '')),
  );
  const hrefs = HREF_SOURCES.flatMap((rel) =>
    [...fs.readFileSync(path.join(projectRoot, rel), 'utf8').matchAll(/\/assets\/([A-Za-z0-9_./-]+\.(?:pdf|pptx|docx|doc|ppt|xlsx))/gi)].map(
      (m) => `${rel}: /assets/${m[1]}`,
    ),
  );
  // Positive control: the scan must find the Proof page's known download links.
  assert.ok(hrefs.some((h) => h.includes('Speaking_One_Sheet.pdf')), 'expected to find a known download href');
  const dangling = hrefs.filter((h) => {
    const name = h.slice(h.indexOf('/assets/') + '/assets/'.length);
    return !served.has(name) && !redirected.has(name);
  });
  assert.deepEqual(dangling, [], 'these hrefs point at documents the site no longer serves');
});

test('every vercel.json redirect into /assets lands on a served document', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'));
  const served = new Set(servedDocuments());
  const intoAssets = (cfg.redirects ?? []).filter((r: { destination: string }) => r.destination.startsWith('/assets/'));
  assert.ok(intoAssets.length > 0, 'expected the old case-study download redirects (positive control)');
  const broken = intoAssets
    .map((r: { source: string; destination: string }) => r)
    .filter((r: { destination: string }) => !served.has(r.destination.slice('/assets/'.length)))
    .map((r: { source: string; destination: string }) => `${r.source} -> ${r.destination}`);
  assert.deepEqual(broken, [], 'these redirects point at documents the site no longer serves');
});
