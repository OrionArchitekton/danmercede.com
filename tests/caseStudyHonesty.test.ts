import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { CASE_STUDIES } from '../constants';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Regression guard for the 2026-07-26 honesty pass.
 *
 * The /proof case-study cards previously carried six numeric outcome claims
 * (67% escalation reduction, 94% task completion, 4.2x ROI, 97% SLA compliance,
 * 89% privilege creep reduction, $4.2M exposure) that could not be sourced to any
 * measurement. An audit traced them to a sales deck slide, and the Healthcare
 * figures did not appear in the document they were attributed to at all.
 *
 * Nothing in the suite asserted those values, which is exactly why they survived
 * and why removing them broke no test. These tests close that gap on BOTH
 * surfaces: the React constants AND the downloadable artifacts, since the first
 * fix removed them from the cards while the downloads kept distributing them.
 */

// Figures that were removed, plus the shapes they came in. Matched case-insensitively.
const BANNED_LITERALS = [
  '67%', '94%', '4.2x', '97%', '89%', '99%',
  '$4.2M', '$2.1M', '$3.2M', '$4.8M', '$12.40', '$8.60',
  'Post-Engagement', 'ROI Scorecard', 'Baseline KPI',
  'Annualized Risk Reduction', 'Financial Exposure Estimate',
];

// Generic outcome-claim shapes, so a NEW fabricated number is caught too, not
// just the specific ones removed. This is the leg that survives a reword.
const OUTCOME_SHAPES: { re: RegExp; why: string }[] = [
  { re: /\b\d{1,3}\s?%/, why: 'a bare percentage reads as a measured rate' },
  { re: /\b\d+(\.\d+)?\s?x\b/i, why: 'an "Nx" multiple reads as a measured ROI' },
  { re: /\$\s?\d[\d,.]*\s?[MKB]\b/i, why: 'a currency magnitude reads as measured exposure or savings' },
];

function scanText(text: string, label: string): string[] {
  const problems: string[] = [];
  for (const lit of BANNED_LITERALS) {
    if (text.toLowerCase().includes(lit.toLowerCase())) {
      problems.push(`${label}: contains removed figure "${lit}"`);
    }
  }
  for (const { re, why } of OUTCOME_SHAPES) {
    const m = text.match(re);
    if (m) problems.push(`${label}: matched ${re} ("${m[0]}"), ${why}`);
  }
  return problems;
}

/**
 * Minimal DOCX (zip) reader over the central directory. No zip dependency is
 * installed, and the local-header path is unreliable when sizes live in a data
 * descriptor, so the central directory is the trustworthy source of offsets.
 */
function readDocxText(absPath: string): string {
  const buf = fs.readFileSync(absPath);

  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.notEqual(eocd, -1, `${absPath}: no zip end-of-central-directory found`);

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < entryCount; n++) {
    assert.equal(buf.readUInt32LE(ptr), 0x02014b50, `${absPath}: bad central directory entry ${n}`);
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');

    if (name === 'word/document.xml') {
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      const xml = method === 8 ? zlib.inflateRawSync(raw) : raw;
      return xml.toString('utf8').replace(/<[^>]+>/g, ' ');
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  assert.fail(`${absPath}: word/document.xml not found in archive`);
}

test('CASE_STUDIES carry no unsourced numeric outcome claims', () => {
  // Positive evidence first: an empty corpus must not pass vacuously.
  assert.ok(CASE_STUDIES.length > 0, 'expected at least one case study to scan');

  const problems: string[] = [];
  for (const study of CASE_STUDIES) {
    const surfaces: [string, string][] = [
      ['title', study.title],
      ['description', study.description],
      ...study.enforcementPoints.map((p, i) => [`enforcementPoints[${i}]`, p] as [string, string]),
      ...study.commercialMapping.map((c, i) => [`commercialMapping[${i}]`, c] as [string, string]),
      ...(study.metrics ?? []).flatMap((m, i) => [
        [`metrics[${i}].label`, m.label],
        [`metrics[${i}].value`, m.value],
      ] as [string, string][]),
    ];
    for (const [field, text] of surfaces) {
      problems.push(...scanText(text, `${study.slug}.${field}`));
    }
  }

  assert.deepEqual(
    problems,
    [],
    `unsourced outcome claims are back on the /proof cards:\n  ${problems.join('\n  ')}`
  );
});

test('every CASE_STUDIES filePath resolves to a committed asset under public/', () => {
  assert.ok(CASE_STUDIES.length > 0, 'expected at least one case study to check');

  for (const study of CASE_STUDIES) {
    assert.ok(
      study.filePath.startsWith('/assets/'),
      `${study.slug}: filePath must live under /assets/, got ${study.filePath}`
    );
    const abs = path.join(projectRoot, 'public', study.filePath.replace(/^\//, ''));
    assert.ok(
      fs.existsSync(abs),
      `${study.slug}: filePath ${study.filePath} has no committed file at public${study.filePath}`
    );
    assert.ok(
      fs.statSync(abs).size > 0,
      `${study.slug}: ${study.filePath} is an empty file`
    );
  }
});

test('the downloadable case-study documents carry no unsourced numeric outcome claims', () => {
  const docx = CASE_STUDIES.filter((s) => s.filePath.toLowerCase().endsWith('.docx'));

  // Positive evidence: the scan must actually have read documents with real text.
  // Without this, a rename or a broken reader would make the test pass silently,
  // which is the failure mode that let the original figures survive.
  assert.ok(docx.length > 0, 'expected at least one .docx case-study download to scan');

  const problems: string[] = [];
  let scanned = 0;

  for (const study of docx) {
    const abs = path.join(projectRoot, 'public', study.filePath.replace(/^\//, ''));
    const text = readDocxText(abs);
    assert.ok(
      text.trim().length > 500,
      `${study.filePath}: extracted only ${text.trim().length} chars, the reader is probably broken`
    );
    scanned++;
    problems.push(...scanText(text, study.filePath));
  }

  assert.equal(scanned, docx.length, 'not every referenced .docx was scanned');
  assert.deepEqual(
    problems,
    [],
    `the downloadable documents still distribute unsourced figures:\n  ${problems.join('\n  ')}`
  );
});

test('CaseStudy.metrics is optional, so a study may omit outcome numbers entirely', () => {
  // The honesty pass made metrics optional. Guard that the type and the data
  // still permit omission, so a future edit cannot quietly make numbers mandatory.
  const withoutMetrics = CASE_STUDIES.filter((s) => !s.metrics || s.metrics.length === 0);
  assert.ok(
    withoutMetrics.length > 0,
    'expected at least one case study with no metrics block after the honesty pass'
  );
});
