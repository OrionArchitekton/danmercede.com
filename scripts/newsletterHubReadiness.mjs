/** Read-only supplied-publication / current-main hub diagnostic. No write routes. */
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import ts from 'typescript';
const LIMIT = 1024 * 1024;
const WEEK = 168 * 60 * 60 * 1000;
const REPO = 'OrionArchitekton/danmercede.com';
const WORKFLOW = '.github/workflows/substrate-sync.yml';
// Reviewed main contract, normalized as YAML data (comments/key order excluded).
// Requalify this diagnostic in a reviewed PR when the workflow contract changes.
const WORKFLOW_CONTRACT_SHA256 = '3b276d591bb0f3c8cbc4eb9bc3eb6263c1646323de7ce2aacf7af90c7b8ee933';
const COVERAGE = new Set(['identity', 'publication_time', 'title', 'body', 'headings', 'anchor', 'cover', 'caption', 'commentary', 'cta']);
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requireValue(ok) {
    if (!ok)
        throw new Error('unsupported-data');
}
function text(value, maximum = 2048) { requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/u.test(value)); return value; }
function fields(value, names) { requireValue(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === names.split(' ').sort().join('|')); }
function strictJson(raw) {
    requireValue(typeof raw === 'string' && Buffer.byteLength(raw) <= LIMIT);
    const value = JSON.parse(raw);
    // JSON.parse checks JSON syntax; YAML's JSON schema additionally rejects duplicate keys.
    yaml.load(raw, { schema: yaml.JSON_SCHEMA });
    const pending = [[value, 0]];
    let nodes = 0;
    while (pending.length) {
        const [entry, depth] = pending.pop();
        requireValue(depth <= 20 && ++nodes <= 20000);
        if (entry && typeof entry === 'object')
            for (const child of Object.values(entry))
                pending.push([child, depth + 1]);
    }
    return value;
}
function instant(value) {
    text(value, 40);
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    requireValue(m && m[1] !== '0000' && m[8] !== '-00:00');
    const [, year, month, day, hour, minute, second, , offset] = m;
    const y = Number(year), mo = Number(month), d = Number(day), h = Number(hour), mi = Number(minute), s = Number(second);
    const local = new Date(0);
    local.setUTCFullYear(y, mo - 1, d);
    local.setUTCHours(h, mi, s, 0);
    requireValue(local.getUTCFullYear() === y && local.getUTCMonth() === mo - 1 && local.getUTCDate() === d && h < 24 && mi < 60 && s < 60);
    if (offset !== 'Z')
        requireValue(Number(offset.slice(1, 3)) <= 23 && Number(offset.slice(4, 6)) < 60);
    const ms = Date.parse(value);
    requireValue(Number.isFinite(ms) && ms >= 0 && new Date(ms + WEEK).getUTCFullYear() <= 9999);
    return ms;
}
function monday(value) { requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)); const ms = instant(`${value}T00:00:00Z`); requireValue(new Date(ms).getUTCDay() === 1); return value; }
function nominalSync(releaseWeek) {
    const target = `${releaseWeek}T08:10:00`;
    const format = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const candidates = [7, 8].map(hours => instant(`${target}Z`) + hours * 3600000).filter(ms => format.format(new Date(ms)).replace(' ', 'T') === target);
    requireValue(candidates.length === 1);
    return candidates[0];
}
function publicUrl(value) {
    text(value);
    const u = new URL(value);
    requireValue(u.protocol === 'https:' && u.hostname === 'www.linkedin.com' && !u.port && !u.username && !u.password && !u.search && !u.hash && /^\/pulse\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(u.pathname) && u.href === value);
    return value.replace(/\/$/, '');
}
async function boundedFile(path) {
    requireValue(isAbsolute(path));
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
        const before = await handle.stat();
        requireValue(before.isFile() && before.size <= LIMIT);
        const buffer = Buffer.alloc(before.size + 1);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const after = await handle.stat();
        requireValue(bytesRead === before.size && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs);
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead));
    }
    finally {
        await handle.close();
    }
}
export async function readPublicationSnapshot(path, { slug, releaseWeek, now, grace = 15 }) {
    const root = strictJson(await boundedFile(path));
    fields(root, 'schema_version kind newsletter_id editions');
    requireValue(root.schema_version === 1 && root.kind === 'newsletter-publication-coverage' && root.newsletter_id === '7477834312608866304' && Array.isArray(root.editions) && root.editions.length > 0 && root.editions.length <= 100);
    const slugs = new Set(), ids = new Set(), urls = new Set();
    let selected;
    for (const row of root.editions) {
        fields(row, 'slug title observed_title hub_release_week native_id public_url package_sha256 published_at observed_at evidence_ref evidence_sha256 coverage');
        requireValue(SLUG.test(text(row.slug, 160)) && !slugs.has(row.slug));
        slugs.add(row.slug);
        text(row.title, 300);
        text(row.observed_title, 300);
        requireValue(row.title === row.observed_title);
        monday(row.hub_release_week);
        requireValue(typeof row.native_id === 'string' && /^[1-9][0-9]{10,24}$/.test(row.native_id) && !ids.has(row.native_id));
        ids.add(row.native_id);
        const url = publicUrl(row.public_url);
        requireValue(!urls.has(url));
        urls.add(url);
        requireValue(DIGEST.test(row.package_sha256) && DIGEST.test(row.evidence_sha256));
        text(row.evidence_ref, 512);
        requireValue(Array.isArray(row.coverage) && row.coverage.length === COVERAGE.size && new Set(row.coverage).size === COVERAGE.size && row.coverage.every(c => COVERAGE.has(c)));
        const published = instant(row.published_at), observed = instant(row.observed_at);
        requireValue(published <= observed && observed <= now);
        if (row.slug === slug) {
            requireValue(row.hub_release_week === releaseWeek);
            const nominal = nominalSync(releaseWeek), due = Math.max(published + WEEK, nominal + grace * 60000);
            selected = { status: 'supplied-snapshot', authenticated: false, native_id: row.native_id, public_url: url, title: row.title, published_at: new Date(published).toISOString(), observed_at: new Date(observed).toISOString(), eligible_at: new Date(published + WEEK).toISOString(), nominal_sync_at: new Date(nominal).toISOString(), recovery_due_at: new Date(due).toISOString(), eligible: now >= published + WEEK, evidence_ref: row.evidence_ref, evidence_sha256: row.evidence_sha256, package_sha256: row.package_sha256, missing_coverage: [] };
        }
    }
    requireValue(selected);
    return selected;
}
function literalExport(source, name, objects = false) {
    const tree = ts.createSourceFile('remote.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    requireValue(tree.parseDiagnostics.length === 0);
    const values = [];
    for (const statement of tree.statements)
        if (ts.isVariableStatement(statement))
            for (const declaration of statement.declarationList.declarations)
                if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                    requireValue(statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && statement.declarationList.flags & ts.NodeFlags.Const && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer));
                    values.push(declaration.initializer);
                }
    requireValue(values.length === 1);
    const slugs = [];
    for (const element of values[0].elements) {
        if (!objects) {
            requireValue(ts.isStringLiteral(element));
            slugs.push(element.text);
            continue;
        }
        requireValue(ts.isObjectLiteralExpression(element));
        const row = {};
        for (const property of element.properties) {
            requireValue(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && ts.isStringLiteral(property.initializer));
            const key = property.name.text;
            requireValue(!Object.hasOwn(row, key));
            row[key] = property.initializer.text;
        }
        fields(row, 'title preview date category slug body');
        for (const key of Object.keys(row)) {
            if (key === 'body')
                requireValue(row.body.trim().length > 0 && Buffer.byteLength(row.body) <= LIMIT && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(row.body));
            else
                text(row[key], 2048);
        }
        slugs.push(row.slug);
    }
    requireValue(slugs.length <= 10000 && slugs.every(s => SLUG.test(s) && s.length <= 160) && new Set(slugs).size === slugs.length);
    return slugs;
}
function workflowContract(raw) {
    const w = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
    const seen = new WeakSet();
    let nodes = 0;
    function stable(value, depth = 0) {
        requireValue(depth <= 20 && ++nodes <= 20000);
        if (!value || typeof value !== 'object')
            return value;
        requireValue(!seen.has(value));
        seen.add(value);
        if (Array.isArray(value))
            return value.map(item => stable(item, depth + 1));
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key], depth + 1)]));
    }
    requireValue(createHash('sha256').update(JSON.stringify(stable(w))).digest('hex') === WORKFLOW_CONTRACT_SHA256);
    requireValue(w && typeof w === 'object' && w.on && Object.keys(w.on).sort().join('|') === 'schedule|workflow_dispatch' && w.on.schedule?.length === 1 && w.on.schedule[0].cron === '10 8 * * 1' && w.on.schedule[0].timezone === 'America/Los_Angeles');
    requireValue(w.concurrency?.group === 'substrate-sync-${{ github.repository }}' && w.concurrency['cancel-in-progress'] === false && Object.keys(w.jobs ?? {}).join('|') === 'sync');
    const job = w.jobs.sync;
    requireValue(!Object.hasOwn(job, 'if') && !job.strategy && !job.needs && !job.concurrency && job.env?.TZ === 'America/Los_Angeles' && Array.isArray(job.steps));
    const steps = job.steps;
    // Narrow known sequence: unexpected steps may change what the shared job checks out.
    requireValue(steps.length === 9 && steps.map(s => s.name).join('|') === 'Checkout danmercede.com|Checkout dan-mercede-substrate (fail-loud)|Setup Node|Install dependencies|Compile in strict mode (require ≥1 match)|Optimize diagram assets to image budget|Diff against committed bundle|Remove vendored substrate before PR|Open review PR');
    requireValue(steps[0].uses === 'actions/checkout@v4' && steps[0].with?.ref === 'main' && !Object.hasOwn(steps[0], 'if') && !steps[0].run && steps[1].uses === 'actions/checkout@v4' && steps[1].with?.repository === 'OrionArchitekton/dan-mercede-substrate' && steps[1].with.ref === 'main' && steps[1].with['persist-credentials'] === false);
    requireValue(steps[3].run === 'npm ci' && steps[4].run === 'npm run compile -- --strict --require-matches' && !Object.hasOwn(steps[4], 'if') && steps[4].env?.SUBSTRATE_PATH === '${{ github.workspace }}/vendor/dan-mercede-substrate');
    requireValue(steps[8].uses === 'peter-evans/create-pull-request@v7' && steps[8].with?.branch === 'codex/substrate-sync');
}
function sourceContent(data) {
    requireValue(data?.type === 'file' && data.encoding === 'base64' && Number.isSafeInteger(data.size) && data.size >= 0 && data.size <= LIMIT && SHA.test(data.sha) && typeof data.content === 'string' && /^[A-Za-z0-9+/=\r\n]*$/.test(data.content));
    const bytes = Buffer.from(data.content, 'base64');
    requireValue(bytes.length === data.size && bytes.toString('base64') === data.content.replace(/[\r\n]/g, ''));
    requireValue(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') === data.sha);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
const nativeExec = promisify(execFile);
async function nativeRead(path) {
    const { stdout } = await nativeExec('gh', ['api', '--hostname', 'github.com', '--method', 'GET', path], { timeout: 10000, maxBuffer: 2 * LIMIT, encoding: 'utf8', windowsHide: true });
    // Native envelopes may exceed the smaller input/source-file bound.
    requireValue(Buffer.byteLength(stdout) <= 2 * LIMIT);
    return strictNativeJson(stdout);
}
function strictNativeJson(raw) { const value = JSON.parse(raw); yaml.load(raw, { schema: yaml.JSON_SCHEMA }); return value; }
function mainSha(value) { requireValue(value?.ref === 'refs/heads/main' && value.object?.type === 'commit' && SHA.test(value.object.sha)); return value.object.sha; }
function positive(value) { requireValue(Number.isSafeInteger(value) && value > 0); return value; }
function branchName(value) {
    // Literal native branch metadata, never Git's @{-n} checkout shorthand.
    // Git --branch permits single-level names (including @) and valid Unicode;
    // it rejects the reserved HEAD name and leading dash in addition to ref rules.
    requireValue(typeof value === 'string' && value.length > 0 && value.length <= 255 && Buffer.from(value, 'utf8').toString('utf8') === value);
    requireValue(value !== 'HEAD' && !value.startsWith('-') && !value.endsWith('.') && !value.includes('..') && !value.includes('@{'));
    requireValue(!/[\u0000-\u0020\u007f]/u.test(value) && !Array.from('~^:?*[\\').some(character => value.includes(character)));
    requireValue(value.split('/').every(component => component.length > 0 && !component.startsWith('.') && !component.endsWith('.lock')));
    return value;
}
const ACTIVE = new Set(['queued', 'requested', 'pending', 'waiting', 'in_progress']);
const CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', 'startup_failure']);
export async function collectHubFacts(readGitHub, { slug }) {
    const prefix = `/repos/${REPO}`, main = mainSha(await readGitHub(`${prefix}/git/ref/heads/main`));
    const admitted = literalExport(sourceContent(await readGitHub(`${prefix}/contents/scripts/compileContent.ts?ref=${main}`)), 'HUB_ESSAY_ALLOWLIST').includes(slug);
    const synced = literalExport(sourceContent(await readGitHub(`${prefix}/contents/constants.generated.ts?ref=${main}`)), 'THOUGHTS', true).includes(slug);
    workflowContract(sourceContent(await readGitHub(`${prefix}/contents/${WORKFLOW}?ref=${main}`)));
    const workflow = await readGitHub(`${prefix}/actions/workflows/substrate-sync.yml`);
    requireValue(workflow?.path === WORKFLOW && workflow.state === 'active');
    positive(workflow.id);
    const runs = [], runIds = new Set();
    let total;
    for (let page = 1; page <= 3; page++) {
        // Manual dispatches on other refs can share the same repository-wide
        // concurrency group and fixed PR branch. Never filter them out.
        const data = await readGitHub(`${prefix}/actions/workflows/substrate-sync.yml/runs?per_page=100&page=${page}`);
        requireValue(Number.isSafeInteger(data?.total_count) && data.total_count >= 0 && data.total_count <= 300 && Array.isArray(data.workflow_runs) && data.workflow_runs.length <= 100);
        if (total === undefined)
            total = data.total_count;
        requireValue(data.total_count === total);
        for (const row of data.workflow_runs) {
            positive(row.id);
            requireValue(!runIds.has(row.id));
            runIds.add(row.id);
            branchName(row.head_branch);
            // Native responses observed here use the bare path; GitHub's
            // documented response also permits that exact path suffixed by ref.
            const pathMatches = row.path === WORKFLOW || row.path === `${WORKFLOW}@${row.head_branch}`;
            requireValue(row.workflow_id === workflow.id && pathMatches && row.repository?.full_name === REPO && SHA.test(row.head_sha) && ['schedule', 'workflow_dispatch'].includes(row.event));
            requireValue((ACTIVE.has(row.status) && row.conclusion === null) || (row.status === 'completed' && CONCLUSIONS.has(row.conclusion)));
            runs.push({ id: row.id, head_branch: row.head_branch, head_sha: row.head_sha, status: row.status, conclusion: row.conclusion });
        }
        requireValue(runs.length <= total);
        if (runs.length === total)
            break;
        requireValue(data.workflow_runs.length === 100 && page < 3);
    }
    requireValue(runs.length === total);
    const prs = [], prIds = new Set();
    let complete = false;
    for (let page = 1; page <= 3; page++) {
        const rows = await readGitHub(`${prefix}/pulls?state=open&base=main&head=OrionArchitekton%3Acodex%2Fsubstrate-sync&per_page=100&page=${page}`);
        requireValue(Array.isArray(rows) && rows.length <= 100);
        for (const row of rows) {
            positive(row.number);
            requireValue(!prIds.has(row.number));
            prIds.add(row.number);
            requireValue(row.state === 'open' && row.head?.ref === 'codex/substrate-sync' && row.head.repo?.full_name === REPO && SHA.test(row.head.sha) && row.base?.ref === 'main' && row.base.repo?.full_name === REPO && SHA.test(row.base.sha));
            prs.push({ number: row.number, head_sha: row.head.sha, base_sha: row.base.sha, target_slug_present: null });
        }
        if (rows.length < 100) {
            complete = true;
            break;
        }
    }
    requireValue(complete && prs.length <= 1);
    for (const pr of prs)
        pr.target_slug_present = literalExport(sourceContent(await readGitHub(`${prefix}/contents/constants.generated.ts?ref=${pr.head_sha}`)), 'THOUGHTS', true).includes(slug);
    requireValue(mainSha(await readGitHub(`${prefix}/git/ref/heads/main`)) === main && !(synced && !admitted));
    return { source: { repository: REPO, main_sha: main, admitted, bundle_slug_present: synced, content_equivalence: 'not-checked' }, existing: { runs, prs } };
}
export function decideHubReadiness(facts) {
    const decision = (state, reason, operation = null) => ({ state, reasons: [reason], operation });
    if (!facts.publication.eligible)
        return decision('too-early', 'seven-days-not-elapsed');
    if (!facts.source)
        return decision('ambiguous', 'native-facts-unavailable');
    if (facts.source.bundle_slug_present)
        return decision('already-source-synced', 'current-main-source-present');
    if (!facts.source.admitted)
        return decision('needs-admission', 'current-main-admission-absent');
    if (facts.existing.runs.some(r => ACTIVE.has(r.status)))
        return decision('existing-queued-running', 'global-sync-active');
    if (facts.existing.prs.length)
        return decision('existing-pr', 'fixed-sync-branch-owned');
    if (Date.parse(facts.now) < Date.parse(facts.publication.recovery_due_at))
        return decision('waiting-for-scheduled-sync', 'nominal-sync-grace-pending');
    if (facts.existing.runs.some(r => r.head_sha === facts.source.main_sha))
        return decision('ambiguous', 'current-main-terminal-attempt-needs-inspection');
    return decision('dispatch-if-authorized', 'eligible-admitted-missing-no-visible-work', { kind: 'workflow-dispatch', repository: REPO, workflow_path: WORKFLOW, ref: 'refs/heads/main', observed_main_sha: facts.source.main_sha, dedupe_key: `${REPO}:${WORKFLOW}:refs/heads/main:${facts.source.main_sha}` });
}
export async function main(argv, { readGitHub, stdout = s => process.stdout.write(s), stderr = s => process.stderr.write(s) } = {}) {
    let options;
    try {
        const names = ['publication-evidence-path', 'slug', 'release-week', 'sync-grace-minutes', 'now'];
        requireValue(argv.length === 10);
        const values = {};
        for (let i = 0; i < argv.length; i += 2) {
            requireValue(names.includes(argv[i].slice(2)) && argv[i].startsWith('--') && !(argv[i].slice(2) in values));
            values[argv[i].slice(2)] = argv[i + 1];
        }
        requireValue(isAbsolute(values['publication-evidence-path']) && SLUG.test(text(values.slug, 160)) && /^\d+$/.test(values['sync-grace-minutes']));
        options = { path: values['publication-evidence-path'], slug: values.slug, releaseWeek: monday(values['release-week']), grace: Number(values['sync-grace-minutes']), now: instant(values.now) };
        requireValue(options.grace >= 1 && options.grace <= 60);
    }
    catch {
        stderr('Invalid diagnostic arguments.\n');
        return 2;
    }
    const result = { schema_version: 1, kind: 'newsletter-hub-readiness', slug: options.slug, now: new Date(options.now).toISOString(), release_week: options.releaseWeek, sync_grace_minutes: options.grace, publication: null, source: null, existing: null, decision: null, authority_granted: false, public_delivery: 'unknown' };
    try {
        result.publication = await readPublicationSnapshot(options.path, options);
    }
    catch {
        result.decision = { state: 'unverified', reasons: ['unusable-supplied-publication'], operation: null };
        stdout(`${JSON.stringify(result)}\n`);
        return 0;
    }
    if (result.publication.eligible)
        try {
            Object.assign(result, await collectHubFacts(readGitHub ?? nativeRead, options));
        }
        catch {
            result.decision = { state: 'ambiguous', reasons: ['native-facts-unusable'], operation: null };
            stdout(`${JSON.stringify(result)}\n`);
            return 0;
        }
    result.decision = decideHubReadiness(result);
    stdout(`${JSON.stringify(result)}\n`);
    return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(() => { process.stderr.write('Diagnostic failed.\n'); process.exitCode = 1; });
