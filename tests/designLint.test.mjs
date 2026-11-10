import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ORIGIN = 'http://127.0.0.1:4173';
const CANARY = 'http://127.0.0.1:4199/__design-lint-canary/';

const page = (path, status = 200) => ({ path, url: `${ORIGIN}${path}`, status });
const finding = (file, antipattern, severity = 'warning', advisory = false) => ({
  antipattern,
  name: antipattern,
  severity,
  category: 'quality',
  file,
  line: 0,
  snippet: 'x',
  selector: 'p',
  ...(advisory ? { advisory: true } : {}),
});
const canaryHit = finding(CANARY, 'gradient-text');

async function load() {
  return import('../scripts/designLint.mjs');
}

test('scenario 1: findings on a served site report RAN with per-rule and per-page tallies', async () => {
  const { buildReport } = await load();
  const stdout = JSON.stringify([
    canaryHit,
    finding(`${ORIGIN}/`, 'line-length'),
    finding(`${ORIGIN}/`, 'line-length'),
    finding(`${ORIGIN}/`, 'straggler', 'advisory', true),
    finding(`${ORIGIN}/about/`, 'overused-font'),
  ]);
  const report = buildReport({
    exitCode: 2,
    stdout,
    pages: [page('/'), page('/about/'), page('/proof/')],
    canaryUrl: CANARY,
  });
  assert.equal(report.status, 'RAN');
  assert.equal(report.detector.exitCode, 2);
  assert.equal(report.pagesRequested, 3);
  assert.equal(report.pagesScanned, 3);
  assert.equal(report.pagesWithFindings, 2);
  assert.deepEqual(report.totals, { findings: 4, primary: 3, advisory: 1, bySeverity: { warning: 3, advisory: 1 } });
  assert.equal(report.canary.primaryFindings, 1);
  const lineLength = report.byRule.find((r) => r.rule === 'line-length');
  assert.deepEqual(
    { count: lineLength.count, pages: lineLength.pages, severity: lineLength.severity },
    { count: 2, pages: 1, severity: 'warning' },
  );
  assert.equal(report.byRule[0].rule, 'line-length', 'rules sort by count, highest first');
  const proof = report.byPage.find((p) => p.path === '/proof/');
  assert.deepEqual(proof, { path: '/proof/', findings: 0, primary: 0, advisory: 0 });
  assert.equal(report.byPage.length, 3, 'every scanned page appears, including clean ones');
});

test('scenario 2: a clean site is RAN with zero site findings; canary findings never count', async () => {
  const { buildReport } = await load();
  const report = buildReport({
    exitCode: 2,
    stdout: JSON.stringify([canaryHit]),
    pages: [page('/')],
    canaryUrl: CANARY,
  });
  assert.equal(report.status, 'RAN');
  assert.equal(report.totals.findings, 0);
  assert.equal(report.pagesScanned, 1);
  assert.equal(report.pagesWithFindings, 0);
});

test('scenario 3: exit 1 with an empty array is NOT RUN, never clean', async () => {
  const { buildReport } = await load();
  const report = buildReport({ exitCode: 1, stdout: '[]', pages: [page('/')], canaryUrl: CANARY });
  assert.equal(report.status, 'NOT_RUN');
  assert.match(report.reason, /exit 1/);
  assert.equal(report.pagesScanned, 0);
});

test('scenario 4: a canary without a primary finding is NOT RUN', async () => {
  const { buildReport } = await load();
  for (const stdout of [
    JSON.stringify([finding(`${ORIGIN}/`, 'line-length')]),
    JSON.stringify([finding(CANARY, 'straggler', 'advisory', true)]),
  ]) {
    const report = buildReport({ exitCode: 2, stdout, pages: [page('/')], canaryUrl: CANARY });
    assert.equal(report.status, 'NOT_RUN');
    assert.match(report.reason, /canary/);
  }
});

test('scenario 5: no pages, or a page that does not serve 200, is NOT RUN', async () => {
  const { buildReport } = await load();
  const none = buildReport({ exitCode: 2, stdout: JSON.stringify([canaryHit]), pages: [], canaryUrl: CANARY });
  assert.equal(none.status, 'NOT_RUN');
  assert.match(none.reason, /no pages/);
  const broken = buildReport({
    exitCode: 2,
    stdout: JSON.stringify([canaryHit]),
    pages: [page('/'), page('/gone/', 404)],
    canaryUrl: CANARY,
  });
  assert.equal(broken.status, 'NOT_RUN');
  assert.match(broken.reason, /\/gone\/ \(404\)/);
});

test('scenario 6: malformed output, unknown exit codes, signals and timeouts are NOT RUN', async () => {
  const { buildReport } = await load();
  const cases = [
    { exitCode: 2, stdout: 'Error: boom' },
    { exitCode: 2, stdout: '{"findings":[]}' },
    { exitCode: 3, stdout: JSON.stringify([canaryHit]) },
    { exitCode: null, signal: 'SIGKILL', stdout: '' },
    { exitCode: null, timedOut: true, stdout: '' },
  ];
  for (const c of cases) {
    const report = buildReport({ ...c, pages: [page('/')], canaryUrl: CANARY });
    assert.equal(report.status, 'NOT_RUN', JSON.stringify(c));
    assert.equal(report.pagesScanned, 0);
  }
});

test('the summary leads with the status, exit code and pages scanned', async () => {
  const { buildReport, renderSummary } = await load();
  const ran = renderSummary(
    buildReport({
      exitCode: 2,
      stdout: JSON.stringify([canaryHit, finding(`${ORIGIN}/`, 'line-length')]),
      pages: [page('/'), page('/about/')],
      canaryUrl: CANARY,
    }),
  );
  const firstLines = ran.split('\n').slice(0, 4).join('\n');
  assert.match(firstLines, /RAN/);
  assert.match(firstLines, /exit 2/);
  assert.match(firstLines, /2 pages scanned/);
  assert.match(ran, /\| line-length \|/);
  assert.match(ran, /\| `\/about\/` \| 0 \|/);
  const notRun = renderSummary(buildReport({ exitCode: 1, stdout: '[]', pages: [page('/')], canaryUrl: CANARY }));
  assert.match(notRun.split('\n')[0], /NOT RUN/);
  assert.doesNotMatch(notRun, /\bclean\b/i);
});

test('built pages are every index.html the build emits, as served paths', async () => {
  const { listBuiltPages } = await load();
  const dir = mkdtempSync(join(tmpdir(), 'design-lint-'));
  for (const rel of ['', 'about', 'thoughts/a-post', 'assets']) mkdirSync(join(dir, rel), { recursive: true });
  for (const rel of ['index.html', 'about/index.html', 'thoughts/a-post/index.html', '404.html', 'assets/x.js']) {
    writeFileSync(join(dir, rel), '<!doctype html>');
  }
  assert.deepEqual(listBuiltPages(dir, ORIGIN), [
    { path: '/', url: `${ORIGIN}/` },
    { path: '/about/', url: `${ORIGIN}/about/` },
    { path: '/thoughts/a-post/', url: `${ORIGIN}/thoughts/a-post/` },
  ]);
});

// Report-only shape of the CI job. These hold the line until someone promotes
// the check on purpose (see specs/design-lint-spec.md, "Promotion").
const readRepo = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the detector is an exact-pinned dev dependency locked with its integrity hash', () => {
  const PKG = JSON.parse(readRepo('package.json'));
  const LOCK = JSON.parse(readRepo('package-lock.json'));
  const version = PKG.devDependencies?.impeccable;
  assert.match(version ?? '', /^\d+\.\d+\.\d+$/, 'impeccable must be an exact version, no range');
  const locked = LOCK.packages?.['node_modules/impeccable'];
  assert.equal(locked?.version, version);
  assert.match(locked?.integrity ?? '', /^sha512-/);
});

test('the design-lint job is report-only, pinned and runs without telemetry', () => {
  const WORKFLOW = readRepo('.github/workflows/design-lint.yml');
  assert.match(WORKFLOW, /^\s+design-lint:\s*$/m, 'job id design-lint');
  assert.match(WORKFLOW, /name:\s*design-lint\b/);
  const jobBlock = WORKFLOW.slice(WORKFLOW.search(/^\s+design-lint:\s*$/m));
  assert.doesNotMatch(jobBlock.split(/\n\s+steps:/)[0], /^\s+if:/m, 'no job-level if: skip');
  for (const uses of WORKFLOW.matchAll(/uses:\s*(\S+)/g)) {
    assert.match(uses[1], /@[0-9a-f]{40}$/, `action not pinned to a commit SHA: ${uses[1]}`);
  }
  assert.doesNotMatch(WORKFLOW, /npx\s+(-y\s+)?impeccable/, 'never a floating npx install');
  assert.doesNotMatch(WORKFLOW, /@latest/);
  for (const key of ['DO_NOT_TRACK', 'IMPECCABLE_NO_TELEMETRY', 'IMPECCABLE_PRO']) {
    assert.match(WORKFLOW, new RegExp(`${key}:`), `${key} must be set`);
  }
  assert.match(WORKFLOW, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(WORKFLOW, /persist-credentials:\s*false/);
  assert.doesNotMatch(WORKFLOW, /secrets\./, 'untrusted lane carries no secrets');
});
