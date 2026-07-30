import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { PROOF_EVIDENCE } from '../constants';
import { ROUTE_META, renderBodyBlock, evidenceBakeParagraphs, evidenceBakeLinks } from '../seoMeta';

/**
 * Integrity guard for the /proof evidence surface.
 *
 * The page exists to answer one criticism: that the public record carried
 * architecture description rather than checkable evidence. That only holds if
 *   (a) every claim presented AS checkable actually ships a runnable check,
 *   (b) editorial limitations are never dressed up as verified findings, and
 *   (c) the evidence reaches no-JS answer engines, not only the React render.
 *
 * (a) and (c) were both violated by the first version of this surface: several
 * verify strings were prose or `<repo>` placeholders that no reader could run,
 * and the whole section was invisible to crawlers because it lived only in React.
 */

const allClaims = PROOF_EVIDENCE.flatMap((t) => t.claims.map((c) => ({ tier: t.id, ...c })));
const checks = allClaims.filter((c) => c.kind === 'check');
const limitations = allClaims.filter((c) => c.kind === 'limitation');
const commandClaims = checks.filter((c) => c.verifyKind === 'command');

// A verify a reader cannot literally run. `<repo>` / `<id>` style templates are
// the specific shape that slipped through the first version of this test.
const PLACEHOLDER = /<[a-z][a-z0-9_-]*>/i;
const EXPECTED_COMMAND_CONTRACT_DIGEST =
  '8f01c661e37af4c8af8e58140fcf755c085c1f5b1649bf1f3752fff9aeabd435';
const commandContractDigest = (claims: typeof commandClaims): string => {
  const contract = claims
    .map((c) => ({
      claim: c.claim,
      verify: c.verify,
      sources: [...(c.sources ?? [])].sort(),
    }))
    .sort((a, b) => (a.claim < b.claim ? -1 : a.claim > b.claim ? 1 : 0));
  return createHash('sha256').update(JSON.stringify(contract)).digest('hex');
};
const hasValidBashSyntax = (value: string): boolean =>
  spawnSync('bash', ['-n'], { input: value, encoding: 'utf8' }).status === 0;
const isUsableHttpsUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return (
      !/\s/.test(value) &&
      parsed.protocol === 'https:' &&
      parsed.hostname.length > 0 &&
      parsed.username === '' &&
      parsed.password === ''
    );
  } catch {
    return false;
  }
};

test('every claim declares a kind, and the corpus is substantive', () => {
  assert.ok(PROOF_EVIDENCE.length > 0, 'expected at least one evidence tier');
  for (const t of PROOF_EVIDENCE) {
    assert.ok(t.claims.length > 0, `tier "${t.id}" has no claims`);
  }
  for (const c of allClaims) {
    assert.ok(
      c.kind === 'check' || c.kind === 'limitation',
      `claim has no valid kind: "${c.claim.slice(0, 60)}"`
    );
    assert.ok(c.claim.trim().length > 20, `claim too short to be meaningful: "${c.claim}"`);
  }
  assert.ok(checks.length >= 8, `expected a substantive checkable set, found ${checks.length}`);
});

test('a claim presented as checkable ships a runnable check and a source', () => {
  assert.equal(
    isUsableHttpsUrl('https://?'),
    false,
    'the URL sentinel must reject an HTTPS-looking string with no hostname'
  );
  assert.equal(
    commandContractDigest(commandClaims),
    EXPECTED_COMMAND_CONTRACT_DIGEST,
    'the complete command/claim/source contract changed; review every verifier before updating its pin'
  );
  for (const poison of [
    'for each repository, inspect its workflow',
    'gh api repos/example; this is descriptive prose',
  ]) {
    const poisonedClaims = commandClaims.map((c, index) =>
      index === 0 ? { ...c, verify: poison } : c
    );
    assert.notEqual(
      commandContractDigest(poisonedClaims),
      EXPECTED_COMMAND_CONTRACT_DIGEST,
      `the command contract pin must reject: "${poison}"`
    );
  }
  for (const c of checks) {
    const label = `${c.tier}: "${c.claim.slice(0, 55)}"`;
    assert.ok(c.verify && c.verify.trim().length > 0, `${label} has no verify string`);
    assert.ok(
      c.verifyKind === 'command' || c.verifyKind === 'url',
      `${label} has bad verifyKind ${String(c.verifyKind)}`
    );
    // The page promises a reader can re-run this. A template is not runnable.
    assert.doesNotMatch(
      c.verify!,
      PLACEHOLDER,
      `${label} verify contains an unresolved placeholder, so a reader cannot run it as written`
    );
    assert.ok(
      c.sources && c.sources.length > 0,
      `${label} needs at least one https source covering the asserted facts`
    );
    for (const src of c.sources!) {
      assert.ok(isUsableHttpsUrl(src), `${label} has a malformed source: ${src}`);
    }
    // A 'url' verifier means the check IS the source, so it must resolve to one.
    // The pinned command contract above requires an explicit review for any
    // command change; syntax validation then catches malformed shell structure.
    if (c.verifyKind === 'command') {
      assert.ok(
        hasValidBashSyntax(c.verify!),
        `${label} is typed 'command' but has invalid shell syntax: "${c.verify}"`
      );
    } else {
      assert.ok(
        isUsableHttpsUrl(c.verify!),
        `${label} is typed 'url' but is not an absolute URL: "${c.verify}"`
      );
      assert.ok(
        c.sources!.includes(c.verify!),
        `${label} URL verifier must be one of its evidence sources`
      );
    }
  }
});

test('proof checks preserve command whitespace and name repeated source links', () => {
  const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const sectionStart = appSource.indexOf('const EvidenceSection');
  const sectionEnd = appSource.indexOf('const ProofArtifactCard');
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, 'EvidenceSection source boundary must exist');
  const evidenceSource = appSource.slice(sectionStart, sectionEnd);
  assert.ok(
    evidenceSource.includes(
      'className="text-[11px] font-mono text-slate-500 min-w-0 max-w-full whitespace-pre-wrap break-words"'
    ),
    'proof verifier code must preserve newlines and wrap long tokens without overflowing'
  );
  assert.ok(
    !evidenceSource.includes('break-all'),
    'proof verifier code must not split every token with break-all'
  );
  assert.ok(
    evidenceSource.includes(
      "const sourceLabel = (c.sources ?? []).length > 1 ? `source ${si + 1}` : 'check it';"
    ),
    'proof links must derive one label for both visible and accessible text'
  );
  assert.ok(
    evidenceSource.includes('aria-label={`${sourceLabel}: ${c.claim}`}') &&
      evidenceSource.includes('{sourceLabel}'),
    'each accessible name must retain its visible label and add claim-specific context'
  );
});

test('a claim naming several repositories cites a source for each of them', () => {
  // A three-repository claim backed by one link asks the reader to accept two
  // thirds of it on trust. Reviewers flagged exactly that on the SHA-pinning and
  // Trusted Publishing claims.
  const NAMED = [
    'notary', 'reprise', 'fork-around-find-out', 'schemafit',
    'mcp-context-budget', 'failclosed', 'orion-skills', 'standing-questions',
    'engram', 'proctor', 'agent-demo-video', 'invisible-hand', 'plainspeak', 'whisperways',
  ];
  for (const c of checks) {
    // Only claims that enumerate repos as a LIST, which is where partial
    // sourcing hides. Aggregate counts are covered by their own command.
    const named = NAMED.filter((r) => new RegExp(`\\b${r}\\b`).test(c.claim));
    if (named.length < 2) continue;

    // Coverage is satisfied EITHER by a source per repository, OR by a verify
    // command that itself names every repository the claim covers. The command
    // is the stronger form: running it reproduces all of them. What is NOT
    // acceptable is a multi-repo claim whose check reaches only some of them.
    const perRepoSources = (c.sources ?? []).length >= named.length;
    const commandCoversAll = named.every((r) => (c.verify ?? '').includes(r));
    assert.ok(
      perRepoSources || commandCoversAll,
      `"${c.claim.slice(0, 50)}" names ${named.length} repositories (${named.join(', ')}) but neither cites a source for each nor runs a command naming all of them`
    );
  }
});

test('a stated limitation never pretends to carry a check', () => {
  assert.ok(limitations.length > 0, 'the page must publish at least one stated limitation');
  for (const c of limitations) {
    assert.equal(
      c.verify,
      undefined,
      `a limitation must not carry a verify string: "${c.claim.slice(0, 55)}"`
    );
    assert.equal(c.verifyKind, undefined, 'a limitation must not carry a verifyKind');
  }
});

test('every source is absolute https, so no check points at an insecure target', () => {
  for (const c of allClaims) {
    for (const src of c.sources ?? []) {
      assert.ok(isUsableHttpsUrl(src), `source must be absolute usable https, got ${src}`);
    }
  }
});

test('the limits tier stays present and keeps conceding an actual weakness', () => {
  // A proof page that lists only wins is marketing. Removing the limits must be a
  // deliberate, test-breaking act rather than a quiet edit.
  const limits = PROOF_EVIDENCE.find((t) => t.id === 'not-claimed');
  assert.ok(limits, 'the "not-claimed" tier must exist');
  assert.ok(
    limits!.claims.length >= 3,
    `the limits tier must carry real limits, found ${limits!.claims.length}`
  );
  const concedes = limits!.claims.some((c) =>
    /not third-party|no ci|won no prize|no award|no paying-customer/i.test(c.claim)
  );
  assert.ok(concedes, 'the limits tier must concede an actual weakness, not list neutral facts');
});

test('tier ids are unique and anchor-safe', () => {
  const ids = PROOF_EVIDENCE.map((t) => t.id);
  assert.deepEqual(ids, [...new Set(ids)], `duplicate tier ids collide as anchors: ${ids}`);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/, `tier id "${id}" is not anchor-safe`);
});

test('PARITY: every published claim reaches the no-JS crawl body for /proof', () => {
  // The whole arc exists because answer engines could not retrieve the evidence.
  // EvidenceSection renders client-side only, so without the bake a crawler sees
  // the old generic Proof copy and none of this. Three separate reviewers caught
  // that; this test is what stops it regressing.
  const baked = renderBodyBlock('/proof', ROUTE_META['/proof']);
  assert.ok(baked.length > 0, 'the /proof route must bake a body block');

  // renderBodyBlock escapes & < > so an ampersand in a claim ("Fork Around & Find
  // Out") will never match verbatim. Decode before comparing rather than dodging
  // the characters, so the test keeps covering claims that contain them.
  const bakedText = baked
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  for (const c of allClaims) {
    // Compare on a distinctive slice: renderBodyBlock escapes entities, so the
    // full sentence will not match verbatim once it contains & or quotes.
    const probe = c.claim.split(/[.,]/)[0].slice(0, 45);
    assert.ok(
      bakedText.includes(probe),
      `claim is invisible to no-JS crawlers: "${probe}"`
    );
  }

  // Sources must be real anchors, not URL text a crawler has to parse out of prose.
  for (const c of checks) {
    for (const src of c.sources ?? []) {
      assert.ok(
        bakedText.includes(`href="${src}"`),
        `source is not baked as a crawlable anchor: ${src}`
      );
    }
  }
});

test('the bake helper emits a lead line per tier plus one line per claim', () => {
  const paras = evidenceBakeParagraphs();
  const expected = PROOF_EVIDENCE.length + allClaims.length;
  assert.equal(
    paras.length,
    expected,
    `expected ${expected} baked paragraphs (one lead per tier plus one per claim), got ${paras.length}`
  );
  assert.ok(
    paras.every((p) => p.trim().length > 0),
    'no baked paragraph may be empty'
  );
});

test('every evidence source is baked as a link, one per source', () => {
  const links = evidenceBakeLinks();
  const expected = PROOF_EVIDENCE.flatMap((t) => t.claims.flatMap((c) => c.sources ?? [])).length;
  assert.equal(links.length, expected, `expected ${expected} baked source links, got ${links.length}`);
  for (const l of links) {
    assert.ok(isUsableHttpsUrl(l.href), `baked link must be usable https: ${l.href}`);
    assert.ok(l.text.trim().length > 0, 'baked link needs anchor text');
  }
});
