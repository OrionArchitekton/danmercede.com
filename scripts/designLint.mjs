// Report-only design lint (specs/design-lint-spec.md).
//
// Scans the built site, as served by a local preview server, with the pinned
// Impeccable detector and writes a report. The report logic (buildReport) is a
// pure function so every RAN / NOT RUN scenario is unit-tested; main() does the
// I/O: list pages, check each serves 200, serve the canary, run the detector,
// write artifacts and the job summary.
//
// Exit status of this script: 0 when the scan RAN (findings or not), 1 when it
// is NOT RUN. The job is not a required check, so 1 is loud but never blocks.

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CANARY_PATH = '/__design-lint-canary/';
const SCANNED_EXIT_CODES = new Set([0, 2]);
// Below this much time before the deadline the detector is not started at all.
const MIN_SCAN_MS = 30_000;

function tally(findings) {
  const bySeverity = {};
  let advisory = 0;
  for (const f of findings) {
    const severity = String(f.severity ?? 'unknown');
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
    if (f.advisory) advisory += 1;
  }
  return { findings: findings.length, primary: findings.length - advisory, advisory, bySeverity };
}

function parseFindings(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function notRunReason({ exitCode, signal, timedOut, deadlineReached, findings, pages, canaryUrl }) {
  if (deadlineReached) return 'scan deadline reached before the detector could start';
  if (timedOut) return 'detector timed out';
  if (signal) return `detector killed by ${signal}`;
  if (exitCode === 1) return 'detector exit 1: at least one target could not be scanned';
  if (!SCANNED_EXIT_CODES.has(exitCode)) return `detector exit ${exitCode}: not a scan result`;
  if (findings === null) return 'detector output is not a JSON array';
  if (pages.length === 0) return 'no pages to scan';
  const broken = pages.filter((p) => p.status !== 200);
  if (broken.length > 0) {
    return `pages did not serve HTTP 200: ${broken.map((p) => `${p.path} (${p.status})`).join(', ')}`;
  }
  const canaryPrimary = findings.filter((f) => f.file === canaryUrl && !f.advisory).length;
  if (canaryPrimary === 0) return 'canary page has no primary finding, so the scan did not render pages';
  return null;
}

export function buildReport({ exitCode, signal = null, timedOut = false, deadlineReached = false, stdout = '', pages = [], canaryUrl, detectorVersion = null }) {
  const all = parseFindings(stdout);
  const reason = notRunReason({ exitCode, signal, timedOut, deadlineReached, findings: all, pages, canaryUrl });
  const status = reason ? 'NOT_RUN' : 'RAN';
  const findings = all ?? [];
  const canaryFindings = findings.filter((f) => f.file === canaryUrl);
  const site = findings.filter((f) => f.file !== canaryUrl);

  const rules = new Map();
  for (const f of site) {
    const key = `${f.antipattern}::${f.severity}`;
    const row = rules.get(key) ?? { rule: f.antipattern, name: f.name ?? f.antipattern, severity: f.severity, advisory: Boolean(f.advisory), count: 0, files: new Set() };
    row.count += 1;
    row.files.add(f.file);
    rules.set(key, row);
  }
  const byRule = [...rules.values()]
    .map(({ files, ...row }) => ({ ...row, pages: files.size }))
    .sort((a, b) => b.count - a.count || a.rule.localeCompare(b.rule));

  const byUrl = new Map(pages.map((p) => [p.url, []]));
  for (const f of site) {
    if (!byUrl.has(f.file)) byUrl.set(f.file, []);
    byUrl.get(f.file).push(f);
  }
  const pathFor = new Map(pages.map((p) => [p.url, p.path]));
  const byPage = [...byUrl.entries()].map(([url, list]) => {
    const t = tally(list);
    return { path: pathFor.get(url) ?? url, findings: t.findings, primary: t.primary, advisory: t.advisory };
  });

  return {
    status,
    reason,
    detector: { name: 'impeccable', version: detectorVersion, exitCode: exitCode ?? null, signal, timedOut },
    pagesRequested: pages.length,
    pagesScanned: status === 'RAN' ? pages.length : 0,
    pagesWithFindings: byPage.filter((p) => p.findings > 0).length,
    canary: { url: canaryUrl, findings: canaryFindings.length, primaryFindings: canaryFindings.filter((f) => !f.advisory).length },
    totals: tally(site),
    byRule,
    byPage,
  };
}

const cell = (value) => String(value).replaceAll('|', '\\|');

export function renderSummary(report) {
  const d = report.detector;
  const lines = [];
  if (report.status === 'RAN') {
    lines.push(`## Design lint: RAN (report-only, never blocks merge)`);
    lines.push('');
    lines.push(`Detector impeccable ${d.version ?? '?'} exit ${d.exitCode}; ${report.pagesScanned} pages scanned; canary flagged with ${report.canary.primaryFindings} primary findings.`);
    lines.push('');
    const t = report.totals;
    lines.push(`Site findings: **${t.findings}** (primary ${t.primary}, advisory ${t.advisory}) on ${report.pagesWithFindings} of ${report.pagesScanned} pages.`);
  } else {
    lines.push(`## Design lint: NOT RUN (the scan did not happen or cannot be proven)`);
    lines.push('');
    lines.push(`Detector impeccable ${d.version ?? '?'} exit ${d.exitCode ?? 'none'}${d.signal ? ` signal ${d.signal}` : ''}${d.timedOut ? ' (timed out)' : ''}; 0 pages scanned of ${report.pagesRequested} requested.`);
    lines.push('');
    lines.push(`Reason: ${report.reason}. Findings below, if any, are partial and must not be read as a result.`);
  }
  lines.push('');
  lines.push('### Findings per rule');
  lines.push('');
  lines.push('| Rule | Severity | Findings | Pages |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const r of report.byRule) lines.push(`| ${cell(r.rule)} | ${cell(r.severity)}${r.advisory && r.severity !== 'advisory' ? ' (advisory)' : ''} | ${r.count} | ${r.pages} |`);
  if (report.byRule.length === 0) lines.push('| (none) | | 0 | 0 |');
  lines.push('');
  lines.push('### Findings per page');
  lines.push('');
  lines.push('| Page | Findings | Primary | Advisory |');
  lines.push('| --- | ---: | ---: | ---: |');
  const pagesSorted = [...report.byPage].sort((a, b) => b.findings - a.findings || a.path.localeCompare(b.path));
  for (const p of pagesSorted) lines.push(`| \`${cell(p.path)}\` | ${p.findings} | ${p.primary} | ${p.advisory} |`);
  lines.push('');
  lines.push('The full detector JSON and this report are in the `design-lint` artifact.');
  return `${lines.join('\n')}\n`;
}

export function listBuiltPages(buildDir, origin) {
  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === 'index.html') {
        const rel = relative(buildDir, dir).split(sep).join('/');
        const path = rel ? `/${rel}/` : '/';
        pages.push({ path, url: `${origin}${path}` });
      }
    }
  };
  walk(buildDir);
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}

function argValue(argv, name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

async function statusOf(url, timeoutMs) {
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    return res.status;
  } catch (error) {
    return `error ${error?.cause?.code ?? error?.name ?? 'fetch'}`;
  }
}

// Checks every route concurrently, each request capped at 15 s and none past
// the scan deadline, so a stalled server cannot eat the job's time budget.
async function checkPages(listed, deadlineMs, concurrency = 8) {
  const pages = listed.map((p) => ({ ...p, status: null }));
  let next = 0;
  const worker = async () => {
    while (next < pages.length) {
      const p = pages[next];
      next += 1;
      const left = deadlineMs - Date.now();
      p.status = left > 0 ? await statusOf(p.url, Math.min(15_000, left)) : 'error deadline';
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, worker));
  return pages;
}

function serveCanary(html) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === CANARY_PATH) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// The npm shim runs the platform engine as its own child with inherited stdio,
// so killing the shim alone would leave the engine holding the output pipes.
// The detector therefore starts as its own process group, and the watchdog
// (or an interrupt of this script) kills the whole group.
export function runDetector(bin, args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const out = [];
    const err = [];
    let timedOut = false;
    let settled = false;
    let fallback = null;
    const killGroup = (sig) => {
      try {
        process.kill(-child.pid, sig);
      } catch {
        child.kill(sig);
      }
    };
    const onInterrupt = (sig) => {
      killGroup('SIGKILL');
      process.exit(sig === 'SIGINT' ? 130 : 143);
    };
    process.once('SIGINT', onInterrupt);
    process.once('SIGTERM', onInterrupt);
    const finish = (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(fallback);
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onInterrupt);
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({ exitCode, signal: timedOut ? null : signal, timedOut, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup('SIGKILL');
      // Never wait on a descendant that left the group and still holds a pipe.
      fallback = setTimeout(() => finish(null, null), 5_000);
    }, timeoutMs);
    child.stdout.on('data', (b) => out.push(b));
    child.stderr.on('data', (b) => err.push(b));
    child.on('error', (error) => {
      err.push(Buffer.from(`spawn error: ${error.message}\n`));
    });
    child.on('close', (exitCode, signal) => finish(exitCode, signal));
  });
}

export async function main(argv) {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const buildDir = argValue(argv, '--build-dir', 'build');
  const origin = argValue(argv, '--origin', 'http://127.0.0.1:4173');
  const outDir = argValue(argv, '--out', 'design-lint');
  const bin = argValue(argv, '--detector', join(repoRoot, 'node_modules', '.bin', 'impeccable'));
  const timeoutMs = Number(argValue(argv, '--timeout-ms', String(15 * 60_000)));
  // One deadline (epoch seconds) covers the route checks and the detector. The
  // workflow sets it from the job start, so install and build time count too.
  const deadlineArg = argValue(argv, '--deadline', process.env.DESIGN_LINT_DEADLINE || '');
  const deadlineMs = deadlineArg ? Number(deadlineArg) * 1000 : Number.POSITIVE_INFINITY;
  mkdirSync(outDir, { recursive: true });

  const listed = existsSync(buildDir) ? listBuiltPages(buildDir, origin) : [];
  const pages = await checkPages(listed, deadlineMs);

  const canaryServer = await serveCanary(readFileSync(join(repoRoot, 'scripts', 'designLintCanary.html'), 'utf8'));
  const canaryUrl = `http://127.0.0.1:${canaryServer.address().port}${CANARY_PATH}`;

  const env = { ...process.env, DO_NOT_TRACK: '1', IMPECCABLE_NO_TELEMETRY: '1', IMPECCABLE_PRO: 'off', CI: process.env.CI || '1' };
  delete env.DISPLAY;
  delete env.WAYLAND_DISPLAY;
  const args = ['detect', '--json', '--no-config', canaryUrl, ...pages.map((p) => p.url)];
  let detectorVersion = null;
  try {
    detectorVersion = JSON.parse(readFileSync(join(repoRoot, 'node_modules', 'impeccable', 'package.json'), 'utf8')).version;
  } catch {
    detectorVersion = null;
  }

  const left = deadlineMs - Date.now();
  const deadlineReached = pages.length > 0 && left < MIN_SCAN_MS;
  const notStarted = (why) => ({ exitCode: null, signal: null, timedOut: false, stdout: '', stderr: `${why}; detector not started\n` });
  let run;
  if (pages.length === 0) run = notStarted('no pages listed');
  else if (deadlineReached) run = notStarted('scan deadline reached');
  else run = await runDetector(bin, args, env, Math.min(timeoutMs, left));
  canaryServer.close();

  writeFileSync(join(outDir, 'findings.json'), run.stdout);
  writeFileSync(join(outDir, 'detector.stderr.txt'), run.stderr);
  const report = buildReport({ ...run, deadlineReached, pages, canaryUrl, detectorVersion });
  writeFileSync(join(outDir, 'report.json'), `${JSON.stringify({ ...report, args: args.slice(0, 4), pages }, null, 2)}\n`);
  const summary = renderSummary(report);
  writeFileSync(join(outDir, 'summary.md'), summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

  const t = report.totals;
  console.log(`design-lint: status=${report.status} exit=${report.detector.exitCode} pages_requested=${report.pagesRequested} pages_scanned=${report.pagesScanned} findings=${t.findings} primary=${t.primary} advisory=${t.advisory} canary_primary=${report.canary.primaryFindings}`);
  if (report.status !== 'RAN') {
    console.log(`::error title=design-lint NOT RUN::${report.reason}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (error) => {
    console.log(`::error title=design-lint NOT RUN::${error?.stack ?? error}`);
    process.exit(1);
  });
}
