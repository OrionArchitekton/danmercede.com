import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RESOURCES, proofGroupFor, INTENT_ROUTES } from '../constants';
import { ROUTE_META, renderBodyBlock } from '../seoMeta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const proofPage = appSrc.slice(appSrc.indexOf('const ResourcesPage = '), appSrc.indexOf('const CaseStudyPage = '));

/**
 * 2026-09-29 site audit, Proof: a sales sheet, a speaker bio, a blank template,
 * and a runtime receipt are not interchangeable kinds of proof. The page used
 * an enforcement-layer taxonomy for every download, so the speaking one-sheet
 * read as an "L4: Gated Substrate" artifact whose output was an "egress reject
 * record". The page now separates evidence, approach, reference material, and
 * commercial/speaking material, and downloads carry no enforcement-layer labels.
 */

test('the Proof page leads with evidence, then approach, then reference, then commercial', () => {
  const order = ['id="evidence-first"', 'id="approach"', 'id="production"', 'id="commercial"'].map((needle) => {
    const at = proofPage.indexOf(needle);
    assert.ok(at >= 0, `expected ${needle} on the Proof page`);
    return at;
  });
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sections are out of order');
  assert.ok(
    proofPage.indexOf('<EvidenceSection />') < proofPage.indexOf('id="approach"'),
    'checkable claims must come before the architecture explanations',
  );
});

test('every download lands in exactly one plainly labeled group', () => {
  assert.ok(RESOURCES.length > 0, 'expected downloads to classify');
  for (const r of RESOURCES) {
    const group = proofGroupFor(r);
    assert.ok(['resources', 'commercial'].includes(group), `${r.title}: unexpected group ${group}`);
  }
  assert.equal(proofGroupFor(RESOURCES.find((r) => r.fileName === 'Speaking_One_Sheet.pdf')!), 'commercial');
  assert.equal(proofGroupFor(RESOURCES.find((r) => r.fileName === 'Case_Study_Template.docx')!), 'resources');
});

test('downloads no longer wear enforcement-layer labels', () => {
  assert.ok(!proofPage.includes('<ProofArtifactCard'), 'the Proof page must not render downloads as enforcement artifacts');
  assert.doesNotMatch(appSrc, /Download Proof Asset/, 'a sales sheet or template is not a proof asset');
  assert.match(proofPage, /<DownloadCard /);
});

test('the /proof prerender names the three kinds of material', () => {
  const body = renderBodyBlock('/proof', ROUTE_META['/proof']);
  for (const phrase of ['Evidence', 'Approach', 'Commercial and speaking']) {
    assert.ok(body.includes(phrase), `the /proof prerender should mention "${phrase}"`);
  }
});

test('no download is marked gated, because DownloadCard has no gated path', () => {
  // DownloadCard always links the file. Gating a resource without first adding a
  // gated branch to DownloadCard would silently serve it anyway.
  const gated = RESOURCES.filter((r) => r.gated).map((r) => r.fileName);
  assert.deepEqual(gated, [], 'add a gated branch to DownloadCard before marking a resource gated');
});

test('the homepage card for /proof describes the page as it now is', () => {
  const card = INTENT_ROUTES.find((r) => r.href === '/proof');
  assert.ok(card, 'expected a homepage intent card for /proof');
  assert.doesNotMatch(`${card!.prompt} ${card!.description}`, /enforcement artifacts|production proof/i);
});

// 2026-09-29, audit item 1.4 (Dan): the priced engagement sheet is retired from this
// site. Implementation inquiries go through the Contact intents instead.
test('the priced engagement sheet is retired and Proof points commercial inquiries at Contact', () => {
  assert.ok(!RESOURCES.some((r) => /What_We_Deliver/i.test(r.fileName)), 'no download entry');
  assert.ok(!fs.existsSync(path.join(root, 'public/assets/What_We_Deliver.pdf')), 'no served file');
  const bake = renderBodyBlock('/proof', ROUTE_META['/proof']);
  assert.doesNotMatch(bake, /engagement sheet/i, 'the /proof bake must not promise the sheet');
  assert.doesNotMatch(proofPage, /Service and speaking documents/, 'no service document remains');
  assert.match(proofPage, /to="\/connect"/, 'the commercial section must route inquiries to Contact');
});
