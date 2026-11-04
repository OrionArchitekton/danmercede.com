/** Hub-specific release coordinator. CLI writers remain runtime-unadmitted. */
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import ts from 'typescript';
import { digest, insist, readPrivateJson, privateRoot } from './newsletterHubReleaseJournal.ts';
import { parsePublicationSnapshot, collectHubFacts, decideHubReadiness, readHubGitHub, decodeHubSource, parseHubInstant } from './newsletterHubReadiness.mjs';
import { parseCanonicalMarkdown, mapSubstrateToEntry, delinkWikiLinks, generateOutput } from './compileContent.ts';
import { selectLatestThoughts } from '../thoughtsIndex.ts';
import { verifyHubReader } from './newsletterHubReleaseReader.ts';
import { readInstalledHubBrowser } from './newsletterHubInstalledBrowser.ts';
const REPOSITORY = 'OrionArchitekton/danmercede.com';
const PILOT_DRAIN_CUTOFF = '2026-12-09T07:59:00Z';
const executeRead = promisify(execFile);
async function readNativeReviewThreads(number: number) {
    insist(Number.isSafeInteger(number) && number > 0, 'invalid-pr-number');
    let cursor: string | null = null;
    let head: string | null = null;
    const threads: any[] = [];
    for (let page = 0; page < 3; page++) {
        const after = cursor ? `, after:${JSON.stringify(cursor)}` : '';
        const query = `query { repository(owner:"OrionArchitekton",name:"danmercede.com") { pullRequest(number:${number}) { headRefOid reviewThreads(first:100${after}) { pageInfo { hasNextPage endCursor } nodes { id isResolved } } } } }`;
        const { stdout } = await executeRead('gh', ['api', 'graphql', '-f', `query=${query}`], { timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
        const response = JSON.parse(stdout);
        insist(!response.errors, 'review-query-failed');
        const pr = response.data?.repository?.pullRequest;
        insist(SHA.test(pr?.headRefOid) && (!head || head === pr.headRefOid) && Array.isArray(pr.reviewThreads?.nodes), 'review-thread-inventory-unusable');
        head = pr.headRefOid;
        threads.push(...pr.reviewThreads.nodes);
        if (pr.reviewThreads.pageInfo.hasNextPage === false) {
            return { head_sha: head, complete: true, threads };
        }
        cursor = pr.reviewThreads.pageInfo.endCursor;
        insist(typeof cursor === 'string' && /^[A-Za-z0-9_+/=-]{1,300}$/.test(cursor), 'review-cursor-unusable');
    }
    throw Error('review-thread-inventory-incomplete');
}
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Options = {
    requestPath: string;
    jobDir: string;
    now: string;
};
type Dependencies = {
    readGitHub?: (path: string) => Promise<any>;
    [key: string]: any;
};
function fields(value: any, names: string) {
    insist(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === names.split(' ').sort().join('|'), 'invalid-request-fields');
}
function monday(value: any) {
    insist(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'invalid-week');
    const d = new Date(value + 'T00:00:00Z');
    insist(d.toISOString().slice(0, 10) === value && d.getUTCDay() === 1, 'invalid-week');
    return value;
}
async function load(options: Options) {
    const { value: r, bytes } = await readPrivateJson(options.requestPath);
    fields(r, 'schema_version kind operation_id week release_week slug canonical publication_snapshot cta');
    insist(r.schema_version === 1 && r.kind === 'newsletter-hub-release-request' && typeof r.operation_id === 'string' && /^[a-z0-9][a-z0-9-]{1,100}$/.test(r.operation_id), 'invalid-operation');
    monday(r.week);
    monday(r.release_week);
    insist(Date.parse(r.release_week + 'T00:00:00Z') - Date.parse(r.week + 'T00:00:00Z') === 7 * 86400000, 'invalid-release-week');
    insist(typeof r.slug === 'string' && r.slug.length <= 160 && SLUG.test(r.slug), 'invalid-slug');
    fields(r.canonical, 'commit path sha256');
    insist(SHA.test(r.canonical.commit) && r.canonical.path === `publishing/canonical/${r.slug}.md` && HASH.test(r.canonical.sha256), 'invalid-canonical-pin');
    fields(r.publication_snapshot, 'path sha256');
    insist(isAbsolute(r.publication_snapshot.path) && HASH.test(r.publication_snapshot.sha256), 'invalid-publication-pin');
    fields(r.cta, r.cta?.kind === 'question' ? 'kind text' : 'kind text url');
    insist(['question', 'external'].includes(r.cta.kind) && typeof r.cta.text === 'string' && r.cta.text.trim() && r.cta.text.length <= 2000, 'invalid-cta');
    insist(!/[\u0000-\u001f\u007f]/u.test(r.cta.text), 'invalid-cta');
    if (r.cta.kind === 'external') {
        insist(typeof r.cta.url === 'string' && r.cta.url.length <= 2048, 'unsupported-cta-origin');
        const u = new URL(r.cta.url);
        insist(u.href === r.cta.url && u.origin === 'https://www.orionintelligenceagency.com' && u.pathname === '/readiness-scan' && !u.username && !u.password && !u.hash && !/[\u0000-\u001f\u007f]/u.test(r.cta.url), 'unsupported-cta-origin');
    }
    parseHubInstant(options.now);
    return { request: r, input_sha256: digest(bytes) };
}
function envelope(binding: any, status: string, artifacts: any[], holds: string[]) {
    return { schema_version: 1, operation_id: binding.request.operation_id, week: binding.request.week, kind: 'hub', input_sha256: binding.input_sha256, status, artifacts, holds };
}
async function publication(binding: any, now: string) {
    const raw = await readPrivateJson(binding.request.publication_snapshot.path);
    insist(digest(raw.bytes) === binding.request.publication_snapshot.sha256, 'publication-pin-changed');
    return parsePublicationSnapshot(new TextDecoder('utf-8', { fatal: true }).decode(raw.bytes), { slug: binding.request.slug, releaseWeek: binding.request.release_week, now: Date.parse(now), grace: 15 });
}
function arrayDeclaration(source: string, name: string) {
    const tree = ts.createSourceFile('hub.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const diagnostics = (tree as ts.SourceFile & {
        parseDiagnostics?: readonly ts.Diagnostic[];
    }).parseDiagnostics;
    insist(Array.isArray(diagnostics) && diagnostics.length === 0, 'source-parse-failed');
    const matches: ts.ArrayLiteralExpression[] = [];
    for (const statement of tree.statements)
        if (ts.isVariableStatement(statement))
            for (const d of statement.declarationList.declarations)
                if (ts.isIdentifier(d.name) && d.name.text === name) {
                    insist(statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && !!(statement.declarationList.flags & ts.NodeFlags.Const) && d.initializer && ts.isArrayLiteralExpression(d.initializer), 'unsupported-source-shape');
                    matches.push(d.initializer);
                }
    insist(matches.length === 1, 'ambiguous-source-export');
    return matches[0];
}
function rows(source: string, name: string) {
    const array = arrayDeclaration(source, name);
    const result = array.elements.map(element => {
        insist(ts.isObjectLiteralExpression(element), 'unsupported-bundle-row');
        const row: any = {};
        for (const p of element.properties) {
            insist(ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && ts.isStringLiteral(p.initializer), 'unsupported-bundle-property');
            insist(!Object.hasOwn(row, p.name.text), 'duplicate-bundle-property');
            row[p.name.text] = p.initializer.text;
        }
        insist(typeof row.slug === 'string' && SLUG.test(row.slug), 'invalid-bundle-slug');
        fields(row, name === 'THOUGHTS' ? 'title preview date category slug body' : 'title slug date alt caption src');
        return row;
    });
    insist(new Set(result.map(row => row.slug)).size === result.length, 'duplicate-bundle-slug');
    return result;
}
function admissionPatch(source: string, slug: string) {
    const array = arrayDeclaration(source, 'HUB_ESSAY_ALLOWLIST');
    const existing = array.elements.map(e => {
        insist(ts.isStringLiteral(e), 'unsupported-allowlist');
        return e.text;
    });
    insist(new Set(existing).size === existing.length, 'duplicate-allowlist');
    if (existing.includes(slug))
        return { patch: source, insertion: '', allowlist: existing };
    const end = array.end - 1, insertion = `${array.elements.length && !array.elements.hasTrailingComma ? ',' : ''}\n  '${slug}',\n`;
    return { patch: source.slice(0, end) + insertion + source.slice(end), insertion, allowlist: [...existing, slug] };
}
async function trustedCanonical(binding: any, read: (path: string) => Promise<any>) {
    const r = binding.request;
    const source = '/repos/OrionArchitekton/dan-mercede-substrate';
    const ref = await read(`${source}/git/ref/heads/main`);
    insist(ref?.ref === 'refs/heads/main' && ref.object?.type === 'commit' && SHA.test(ref.object.sha), 'canonical-main-unverified');
    const trustedMain = ref.object.sha;
    if (r.canonical.commit !== trustedMain) {
        const comparison = await read(`${source}/compare/${r.canonical.commit}...${trustedMain}`);
        insist(['ahead', 'identical'].includes(comparison?.status) && comparison.base_commit?.sha === r.canonical.commit && comparison.merge_base_commit?.sha === r.canonical.commit, 'canonical-not-on-protected-main');
    }
    const pinned = await read(`${source}/contents/${r.canonical.path}?ref=${r.canonical.commit}`);
    const current = trustedMain === r.canonical.commit ? pinned : await read(`${source}/contents/${r.canonical.path}?ref=${trustedMain}`);
    const raw = decodeHubSource(pinned);
    insist(digest(raw) === r.canonical.sha256, 'canonical-pin-changed');
    insist(decodeHubSource(current) === raw && current.sha === pinned.sha, 'canonical-protected-main-mismatch');
    const after = await read(`${source}/git/ref/heads/main`);
    insist(after?.object?.sha === trustedMain, 'canonical-main-moved');
    return { raw, trusted_main_sha: trustedMain, blob_sha: pinned.sha };
}
async function detailedPlan(binding: any, facts: any, read: (path: string) => Promise<any>, pub: any) {
    const r = binding.request, main = facts.source.main_sha, prefix = `/repos/${REPOSITORY}`;
    const compiler = decodeHubSource(await read(`${prefix}/contents/scripts/compileContent.ts?ref=${main}`));
    const baselineSource = decodeHubSource(await read(`${prefix}/contents/constants.generated.ts?ref=${main}`));
    const trusted = await trustedCanonical(binding, read);
    const raw = trusted.raw;
    const parsed = parseCanonicalMarkdown(raw), patch = admissionPatch(compiler, r.slug);
    const entry = mapSubstrateToEntry(parsed.data, delinkWikiLinks(parsed.content.trim()), r.canonical.path, [], patch.allowlist, () => {
    });
    insist(entry && entry.slug === r.slug && entry.title === pub.title, 'canonical-not-admissible');
    const expected = rows(generateOutput([entry!]), 'THOUGHTS')[0];
    insist(expected.date === r.week, 'canonical-week-mismatch');
    insist(expected.body.includes(r.cta.text), 'cta-not-in-pinned-body');
    const baseline = { thoughts: rows(baselineSource, 'THOUGHTS'), diagrams: rows(baselineSource, 'DIAGRAMS') };
    const commit = await read(`${prefix}/git/commits/${main}`);
    insist(commit?.sha === main && SHA.test(commit.tree?.sha), 'base-commit-unusable');
    const baseTree = await leafTree(read, commit.tree.sha);
    const current = baseline.thoughts.find((e: any) => e.slug === r.slug);
    if (current)
        insist(JSON.stringify(current) === JSON.stringify(expected), 'target-copy-mismatch');
    return { expected, canonical: { commit: r.canonical.commit, sha256: r.canonical.sha256, trusted_main_sha: trusted.trusted_main_sha, blob_sha: trusted.blob_sha, surface_targeted: Array.isArray(parsed.data.surface_targets) && parsed.data.surface_targets.includes('danmercede.com') }, baseline, admission: { base_sha: main, base_tree_sha: commit.tree.sha, base_tree: baseTree, branch: `codex/fcn-hub-admission-${r.slug}`, compiler_sha256: digest(compiler), patch: patch.patch, insertion: patch.insertion, patch_sha256: digest(patch.patch) } };
}
async function leafTree(read: (path: string) => Promise<any>, sha: string) {
    const data = await read(`/repos/${REPOSITORY}/git/trees/${sha}?recursive=1`);
    insist(data?.sha === sha && data.truncated === false && Array.isArray(data.tree) && data.tree.length <= 10000, 'tree-inventory-unusable');
    const leaves = data.tree.filter((e: any) => e.type !== 'tree').map((e: any) => {
        insist(typeof e.path === 'string' && !e.path.startsWith('/') && !e.path.split('/').some((p: string) => !p || p === '.' || p === '..') && ['blob', 'commit'].includes(e.type) && ['100644', '100755', '120000', '160000'].includes(e.mode) && SHA.test(e.sha), 'tree-entry-unusable');
        return { path: e.path, mode: e.mode, type: e.type, sha: e.sha };
    }).sort((a: any, b: any) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    insist(new Set(leaves.map((e: any) => e.path)).size === leaves.length, 'tree-duplicate-path');
    return leaves;
}
export async function verifyTrustedHubCheck(pr: any, check: any, read: (path: string) => Promise<any>) {
    const match = new RegExp(`^https://github\\.com/${REPOSITORY.replace('.', '\\.')}/actions/runs/([1-9][0-9]*)/job/[1-9][0-9]*$`).exec(check.details_url ?? '');
    insist(match, 'trusted-check-origin-unverified');
    const workflow = await read(`${nativePrefix}/actions/workflows/substrate-verify.yml`);
    const run = await read(`${nativePrefix}/actions/runs/${match[1]}`);
    insist(Number.isSafeInteger(workflow?.id) && workflow.id > 0 && workflow.state === 'active' && workflow.path === '.github/workflows/substrate-verify.yml' && run.id === Number(match[1]) && run.workflow_id === workflow.id && run.repository?.full_name === REPOSITORY && run.head_repository?.full_name === REPOSITORY, 'trusted-check-origin-unverified');
    insist(Number.isSafeInteger(check.check_suite?.id) && check.check_suite.id > 0 && run.check_suite_id === check.check_suite.id, 'trusted-check-origin-unverified');
    const suite = await read(`${nativePrefix}/check-suites/${check.check_suite.id}`);
    insist(suite?.id === check.check_suite.id && suite.head_sha === pr.head.sha && suite.app?.id === 15368 && suite.repository?.full_name === REPOSITORY && suite.status === 'completed' && suite.conclusion === 'success', 'trusted-check-origin-unverified');
    insist(run.path === '.github/workflows/substrate-verify.yml' && run.event === 'pull_request_target' && run.head_sha === pr.head.sha && run.head_branch === pr.head.ref && run.status === 'completed' && run.conclusion === 'success', 'trusted-check-origin-unverified');
}
async function contentPrPlan(binding: any, detail: any, facts: any, read: (path: string) => Promise<any>, deps: Dependencies) {
    insist(facts.existing.prs.length === 1, 'content-pr-ambiguous');
    const meta = facts.existing.prs[0], pr = await read(`${nativePrefix}/pulls/${meta.number}`);
    insist(pr?.number === meta.number && pr.state === 'open' && pr.head?.sha === meta.head_sha && pr.head.ref === 'codex/substrate-sync' && pr.head.repo?.full_name === REPOSITORY && pr.base?.ref === 'main' && pr.base.sha === facts.source.main_sha && pr.base.repo?.full_name === REPOSITORY, 'content-pr-stale-or-foreign');
    const commit = await read(`${nativePrefix}/git/commits/${pr.head.sha}`);
    insist(commit?.parents?.length === 1 && commit.parents[0].sha === facts.source.main_sha && SHA.test(commit.tree?.sha), 'content-pr-base-mismatch');
    const tree = await leafTree(read, commit.tree.sha), base = detail.admission.base_tree;
    const unaffected = (entries: any[]) => entries.filter(e => e.path !== 'constants.generated.ts');
    insist(JSON.stringify(unaffected(tree)) === JSON.stringify(unaffected(base)), 'content-pr-unrelated-files');
    const source = decodeHubSource(await read(`${nativePrefix}/contents/constants.generated.ts?ref=${pr.head.sha}`)), thoughts = rows(source, 'THOUGHTS'), diagrams = rows(source, 'DIAGRAMS');
    const targets = thoughts.filter((e: any) => e.slug === binding.request.slug);
    insist(targets.length === 1 && JSON.stringify(targets[0]) === JSON.stringify(detail.expected), 'content-pr-target-mismatch');
    insist(JSON.stringify(thoughts.filter((e: any) => e.slug !== binding.request.slug)) === JSON.stringify(detail.baseline.thoughts.filter((e: any) => e.slug !== binding.request.slug)) && JSON.stringify(diagrams) === JSON.stringify(detail.baseline.diagrams), 'content-pr-unrelated-content');
    const protection = await read(`${nativePrefix}/branches/main/protection/required_status_checks`), checks = await read(`${nativePrefix}/commits/${pr.head.sha}/check-runs?per_page=100`);
    insist(Array.isArray(protection?.checks) && protection.checks.length > 0 && checks?.total_count === checks?.check_runs?.length && checks.total_count < 100, 'required-check-inventory-unverified');
    const requiredNames = ['build', 'gitleaks', 'required-checks-fail-closed', 'substrate-verify', 'extractability'];
    insist(protection.strict === true && requiredNames.every(name => protection.checks.some((rule: any) => rule.context === name && rule.app_id === 15368)), 'required-check-inventory-unverified');
    insist(new Set(protection.checks.map((rule: any) => rule.context)).size === protection.checks.length && new Set(checks.check_runs.map((check: any) => check.id)).size === checks.check_runs.length, 'required-check-inventory-unverified');
    const required = [];
    for (const rule of protection.checks) {
        const matches = checks.check_runs.filter((c: any) => c.name === rule.context && c.app?.id === rule.app_id && c.head_sha === pr.head.sha).sort((a: any, b: any) => b.id - a.id);
        const check = matches[0];
        insist(check && Number.isSafeInteger(check.id) && check.id > 0 && check.status === 'completed' && check.conclusion === 'success', 'required-checks-unverified');
        required.push({ name: check.name, id: check.id, app_id: check.app.id, head_sha: check.head_sha });
        if (check.name === 'substrate-verify') {
            await verifyTrustedHubCheck(pr, check, read);
        }
    }
    const threads = await (deps.readReviewThreads ?? readNativeReviewThreads)(pr.number);
    insist(threads?.head_sha === pr.head.sha && threads.complete === true && Array.isArray(threads.threads) && threads.threads.length <= 300 && threads.threads.every((t: any) => typeof t.id === 'string' && t.id.length > 0 && t.isResolved === true) && new Set(threads.threads.map((t: any) => t.id)).size === threads.threads.length, 'review-threads-unverified');
    return { number: pr.number, head_sha: pr.head.sha, base_sha: pr.base.sha, copy_parity: true, unrelated_corpus_preserved: true, required_checks_passed: true, required_checks: required, unresolved_threads: 0, latest_slugs: selectLatestThoughts(thoughts as any).map(t => t.slug), merge_gate: 'HUMAN_REQUIRED' };
}
async function artifact(options: Options, binding: any, data: any, status: string, holds: string[]) {
    const root = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    try {
        const value = { schema_version: 1, kind: 'newsletter-hub-stage', operation_id: binding.request.operation_id, week: binding.request.week, release_week: binding.request.release_week, input_sha256: binding.input_sha256, observed_at: options.now, merge_gate: 'HUMAN_REQUIRED', public_delivery: 'unknown', ...data };
        const name = `hub-plan-${digest(Buffer.from(JSON.stringify(value, null, 2) + '\n'))}.json`;
        const stored = await root.put(name, value);
        insist(digest(stored.bytes) === digest(Buffer.from(JSON.stringify(value, null, 2) + '\n')), 'artifact-conflict');
        return envelope(binding, status, [{ ref: name, sha256: stored.sha256 }], holds);
    }
    finally {
        await root.close();
    }
}
export async function planHubRelease(options: Options, deps: Dependencies = {}) {
    const binding = await load(options);
    let pub: any;
    try {
        pub = await publication(binding, options.now);
    }
    catch {
        return artifact(options, binding, { stage: 'publication-unverified' }, 'held', ['publication-evidence-unverified']);
    }
    if (!pub.eligible)
        return artifact(options, binding, { stage: 'too-early', publication: pub }, 'held', ['seven-days-not-elapsed']);
    let facts: any;
    const read = deps.readGitHub ?? readHubGitHub;
    try {
        facts = await collectHubFacts(read, { slug: binding.request.slug });
    }
    catch {
        return artifact(options, binding, { stage: 'native-unverified', publication: pub }, 'held', ['native-facts-unusable']);
    }
    let detail: any;
    try {
        detail = await detailedPlan(binding, facts, read, pub);
    }
    catch (e: any) {
        return artifact(options, binding, { stage: 'source-unverified', publication: pub, ...facts }, 'held', [['canonical-pin-changed', 'canonical-not-admissible', 'canonical-not-on-protected-main', 'canonical-protected-main-mismatch', 'canonical-main-unverified', 'canonical-main-moved', 'target-copy-mismatch', 'cta-not-in-pinned-body'].includes(e.message) ? e.message : 'source-parity-unusable']);
    }
    if (facts.existing.prs.length) {
        try {
            const content_pr = await contentPrPlan(binding, detail, facts, read, deps);
            return artifact(options, binding, { stage: 'content-pr-awaiting-merge', publication: pub, ...facts, ...detail, content_pr }, 'held', ['HUMAN_REQUIRED']);
        }
        catch (e: any) {
            return artifact(options, binding, { stage: 'content-pr-unverified', publication: pub, ...facts, ...detail }, 'held', [['content-pr-target-mismatch', 'content-pr-unrelated-files', 'content-pr-unrelated-content', 'required-checks-unverified', 'trusted-check-origin-unverified', 'review-threads-unverified', 'content-pr-stale-or-foreign'].includes(e.message) ? e.message : 'content-pr-unverified']);
        }
    }
    if (!facts.source.allowlisted && !facts.source.bundle_slug_present && !detail.canonical.surface_targeted)
        return artifact(options, binding, { stage: 'admission-preparation-ready', publication: pub, ...facts, ...detail }, 'completed', []);
    const decision = decideHubReadiness({ ...facts, source: { ...facts.source, admitted: facts.source.admitted || detail.canonical.surface_targeted }, publication: pub, now: options.now });
    return artifact(options, binding, { stage: decision.state, publication: pub, ...facts, ...detail, decision }, decision.state === 'already-source-synced' ? 'completed' : 'held', [decision.reasons[0]]);
}
export async function inspectHubRelease(options: Options) {
    const binding = await load(options), root = await privateRoot(options.jobDir);
    try {
        const candidates = [];
        for (const name of await root.list()) {
            const saved = await root.get(name);
            if (!saved)
                continue;
            insist(name === `hub-plan-${digest(saved.bytes)}.json`, 'artifact-digest-mismatch');
            const v = saved.value;
            if (v.kind === 'newsletter-hub-stage' && v.operation_id === binding.request.operation_id && v.input_sha256 === binding.input_sha256 && v.week === binding.request.week && v.release_week === binding.request.release_week && parseHubInstant(v.observed_at) <= parseHubInstant(options.now))
                candidates.push({ name, value: v, sha256: digest(saved.bytes), order: await root.order(name) });
        }
        candidates.sort((a, b) => parseHubInstant(b.value.observed_at) - parseHubInstant(a.value.observed_at) || (a.order < b.order ? 1 : a.order > b.order ? -1 : a.name.localeCompare(b.name)));
        if (!candidates.length)
            return envelope(binding, 'held', [], ['no-bound-stage-artifact']);
        const latest = candidates[0];
        return envelope(binding, 'held', [{ ref: latest.name, sha256: latest.sha256 }], ['inspection-is-historical']);
    }
    finally {
        await root.close();
    }
}
type AdvanceOptions = Options & {
    action: string;
    planSha256: string;
    maxActions: number;
};
const nativePrefix = `/repos/${REPOSITORY}`;
class UnknownAttempt extends Error {
    constructor(public step: string) {
        super('unknown-native-attempt');
    }
}
async function loadPlan(root: any, options: AdvanceOptions, binding: any) {
    insist(HASH.test(options.planSha256), 'invalid-plan-digest');
    const saved = await root.get(`hub-plan-${options.planSha256}.json`);
    insist(saved && digest(saved.bytes) === options.planSha256 && saved.value.input_sha256 === binding.input_sha256 && saved.value.operation_id === binding.request.operation_id, 'plan-binding-mismatch');
    return saved.value;
}
async function authorizeWrite(options: AdvanceOptions, binding: any, plan: any, deps: Dependencies) {
    insist(typeof deps.authorize === 'function', 'runtime-authority-unadmitted');
    const now = new Date((deps.clock ?? Date.now)()).toISOString(), read = deps.readGitHub ?? readHubGitHub;
    insist(parseHubInstant(now) < parseHubInstant(PILOT_DRAIN_CUTOFF), 'pilot-drain-expired');
    const pub = await publication(binding, now);
    const canonical = await trustedCanonical(binding, read);
    insist(canonical.blob_sha === plan.canonical.blob_sha, 'canonical-protected-main-mismatch');
    insist(pub.eligible, 'seven-days-not-elapsed');
    const ref = await read(`${nativePrefix}/git/ref/heads/main`);
    insist(ref?.object?.sha === plan.source.main_sha, 'current-base-changed');
    const context = { operation_id: binding.request.operation_id, input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, private_root: options.jobDir, main_sha: plan.source.main_sha, substrate_main_sha: canonical.trusted_main_sha, publication_sha256: binding.request.publication_snapshot.sha256, canonical_sha256: binding.request.canonical.sha256, drain_cutoff: PILOT_DRAIN_CUTOFF };
    const grant = await deps.authorize(context);
    insist(grant?.admitted === true && grant.stopped === false && typeof grant.grant_ref === 'string', 'runtime-authority-unadmitted');
    for (const [key, value] of Object.entries(context))
        insist(grant[key] === value, 'runtime-authority-binding-mismatch');
    insist(parseHubInstant(grant.checked_at) <= Date.parse(now) && Date.parse(now) - parseHubInstant(grant.checked_at) <= 60000 && parseHubInstant(grant.expires_at) > Date.parse(now) && parseHubInstant(grant.expires_at) <= parseHubInstant(PILOT_DRAIN_CUTOFF), 'runtime-authority-expired');
    return now;
}
async function boundRecord(root: any, name: string, value: any) {
    const saved = await root.put(name, value);
    insist(saved.value.input_sha256 === value.input_sha256 && saved.value.action === value.action && saved.value.plan_sha256 === value.plan_sha256, 'operation-record-conflict');
    return saved;
}
function stepNames(step: string) {
    return { intent: `hub-admission-${step}-intent.json`, response: `hub-admission-${step}-response.json`, receipt: `hub-admission-${step}-receipt.json` };
}
async function nativeStep(root: any, options: AdvanceOptions, binding: any, plan: any, deps: Dependencies, step: string, method: string, path: string, body: any, verify: (response: any) => Promise<any>, budget: {
    used: number;
}) {
    const names = stepNames(step), payload_sha256 = digest(JSON.stringify({ method, path, body }));
    const receipt = await root.get(names.receipt);
    if (receipt) {
        insist(receipt.value.input_sha256 === binding.input_sha256 && receipt.value.payload_sha256 === payload_sha256, 'receipt-binding-conflict');
        await verify(receipt.value.native);
        return receipt.value.native;
    }
    const pending = await root.get(names.intent);
    if (pending) {
        insist(pending.value.input_sha256 === binding.input_sha256 && pending.value.payload_sha256 === payload_sha256 && pending.value.plan_sha256 === options.planSha256, 'intent-binding-conflict');
        if (!deps.reconcileOnly)
            throw new UnknownAttempt(step);
        const response = await root.get(names.response);
        let pointer = response?.value.native;
        if (!pointer && step === 'blob')
            pointer = { sha: (await import('node:crypto')).createHash('sha1').update(`blob ${Buffer.byteLength(body.content)}\0`).update(body.content).digest('hex') };
        if (!pointer && step === 'ref')
            pointer = { sha: body.sha };
        if (!pointer && step === 'pr') {
            const candidates = await (deps.readGitHub ?? readHubGitHub)(`${nativePrefix}/pulls?state=all&base=main&head=${encodeURIComponent('OrionArchitekton:' + body.head)}&per_page=100&page=1`);
            insist(Array.isArray(candidates) && candidates.length < 100, 'pr-reconciliation-incomplete');
            const matches = candidates.filter((p: any) => p.body === body.body && p.head?.ref === body.head);
            if (matches.length === 1)
                pointer = { number: matches[0].number };
        }
        if (!pointer)
            throw new UnknownAttempt(step);
        try {
            const native = await verify(pointer), saved = await boundRecord(root, names.receipt, { ...pending.value, kind: 'hub-native-readback', native, reconciled: true });
            insist(JSON.stringify(saved.value.native) === JSON.stringify(native), 'native-readback-conflict');
            return native;
        }
        catch {
            throw new UnknownAttempt(step);
        }
    }
    insist(!deps.reconcileOnly, 'unstarted-native-substep');
    insist(budget.used < options.maxActions, 'action-budget-exhausted');
    const now = await authorizeWrite(options, binding, plan, deps);
    const intent = { schema_version: 1, kind: 'hub-native-intent', input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, step, payload_sha256, started_at: now };
    const reservation = await boundRecord(root, names.intent, intent);
    if (!reservation.created)
        throw new UnknownAttempt(step);
    try {
        insist(typeof deps.writeGitHub === 'function', 'native-writer-unavailable');
        budget.used++;
        const response = await deps.writeGitHub(method, path, body);
        const pointer = step === 'pr' ? { number: response?.number } : { sha: response?.sha };
        if (step === 'ref') {
            pointer.sha = response?.object?.sha;
        }
        insist(step === 'pr' ? Number.isSafeInteger(pointer.number) && pointer.number > 0 : SHA.test(pointer.sha), 'native-write-response-unusable');
        const responseRecord = await boundRecord(root, names.response, { ...intent, kind: 'hub-native-response', native: pointer });
        insist(JSON.stringify(responseRecord.value.native) === JSON.stringify(pointer), 'native-response-conflict');
        const native = await verify(pointer);
        const saved = await boundRecord(root, names.receipt, { ...intent, kind: 'hub-native-readback', native });
        insist(JSON.stringify(saved.value.native) === JSON.stringify(native), 'native-readback-conflict');
        return native;
    }
    catch {
        throw new UnknownAttempt(step);
    }
}
async function admissionAction(root: any, options: AdvanceOptions, binding: any, plan: any, deps: Dependencies) {
    insist(plan.stage === 'admission-preparation-ready', 'admission-plan-not-ready');
    const read = deps.readGitHub ?? readHubGitHub, a = plan.admission, budget = { used: 0 };
    const operation = await root.get('hub-operation.json');
    if (operation)
        insist(operation.value.input_sha256 === binding.input_sha256, 'operation-input-changed');
    else {
        insist(!deps.reconcileOnly, 'operation-not-started');
        await root.put('hub-operation.json', { schema_version: 1, kind: 'hub-operation', operation_id: binding.request.operation_id, input_sha256: binding.input_sha256, week: binding.request.week, slug: binding.request.slug });
    }
    const prior = await root.get('hub-admission-action.json');
    if (!prior) {
        const refs = await read(`${nativePrefix}/git/matching-refs/heads/${encodeURIComponent(a.branch)}`);
        const prs = await read(`${nativePrefix}/pulls?state=all&base=main&head=${encodeURIComponent('OrionArchitekton:' + a.branch)}&per_page=100&page=1`);
        insist(Array.isArray(refs) && refs.length === 0 && Array.isArray(prs) && prs.length === 0, 'existing-admission-work');
    }
    await boundRecord(root, 'hub-admission-action.json', { schema_version: 1, kind: 'hub-admission-action', input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, main_sha: plan.source.main_sha });
    const blobSha = (await import('node:crypto')).createHash('sha1').update(`blob ${Buffer.byteLength(a.patch)}\0`).update(a.patch).digest('hex');
    const blob = await nativeStep(root, options, binding, plan, deps, 'blob', 'POST', `${nativePrefix}/git/blobs`, { content: a.patch, encoding: 'utf-8' }, async (response) => {
        insist(response.sha === blobSha, 'wrong-blob');
        const data = await read(`${nativePrefix}/git/blobs/${response.sha}`);
        insist(decodeHubSource({ ...data, type: 'file' }) === a.patch, 'blob-readback-mismatch');
        return { sha: response.sha };
    }, budget);
    const tree = await nativeStep(root, options, binding, plan, deps, 'tree', 'POST', `${nativePrefix}/git/trees`, { base_tree: a.base_tree_sha, tree: [{ path: 'scripts/compileContent.ts', mode: '100644', type: 'blob', sha: blob.sha }] }, async (response) => {
        const actual = await leafTree(read, response.sha), expected = a.base_tree.map((e: any) => e.path === 'scripts/compileContent.ts' ? { ...e, sha: blob.sha } : e);
        insist(JSON.stringify(actual) === JSON.stringify(expected), 'admission-tree-unrelated-change');
        return { sha: response.sha };
    }, budget);
    const commit = await nativeStep(root, options, binding, plan, deps, 'commit', 'POST', `${nativePrefix}/git/commits`, { message: `Admit ${binding.request.slug} [${binding.request.operation_id}:${binding.input_sha256}]`, tree: tree.sha, parents: [a.base_sha] }, async (response) => {
        const data = await read(`${nativePrefix}/git/commits/${response.sha}`);
        insist(data?.sha === response.sha && data.tree?.sha === tree.sha && data.parents?.length === 1 && data.parents[0].sha === a.base_sha, 'commit-readback-mismatch');
        insist(decodeHubSource(await read(`${nativePrefix}/contents/scripts/compileContent.ts?ref=${response.sha}`)) === a.patch, 'commit-copy-mismatch');
        return { sha: response.sha };
    }, budget);
    const ref = await nativeStep(root, options, binding, plan, deps, 'ref', 'POST', `${nativePrefix}/git/refs`, { ref: `refs/heads/${a.branch}`, sha: commit.sha }, async (response) => {
        const data = await read(`${nativePrefix}/git/matching-refs/heads/${encodeURIComponent(a.branch)}`);
        insist(Array.isArray(data) && data.length === 1 && data[0].ref === `refs/heads/${a.branch}` && data[0].object?.sha === commit.sha && response.sha === commit.sha, 'ref-readback-mismatch');
        return { sha: commit.sha };
    }, budget);
    const marker = `Hub release ${binding.request.operation_id}; input ${binding.input_sha256}; canonical ${binding.request.canonical.sha256}. HUMAN_REQUIRED; no content bundle or release is authorized by this PR.`;
    const pr = await nativeStep(root, options, binding, plan, deps, 'pr', 'POST', `${nativePrefix}/pulls`, { head: a.branch, base: 'main', draft: true, title: `Admit newsletter: ${plan.expected.title}`, body: marker }, async (response) => {
        const data = await read(`${nativePrefix}/pulls/${response.number}`);
        insist(data?.number === response.number && data.head?.sha === ref.sha && data.head.ref === a.branch && data.head.repo?.full_name === REPOSITORY && data.base?.ref === 'main' && data.base.repo?.full_name === REPOSITORY && data.body === marker, 'pr-readback-mismatch');
        return { number: data.number, head_sha: data.head.sha, url: data.html_url };
    }, budget);
    return { stage: 'admission-pr-awaiting-merge', admission_pr: pr, native_writes: budget.used };
}
async function recoverSyncAction(root: any, options: AdvanceOptions, binding: any, plan: any, deps: Dependencies) {
    if (await root.get('hub-sync-intent.json'))
        throw new UnknownAttempt('sync');
    insist(plan.stage === 'dispatch-if-authorized', 'recovery-not-ready');
    const now = await authorizeWrite(options, binding, plan, deps), pub = await publication(binding, now);
    insist(Date.parse(now) >= Date.parse(pub.recovery_due_at), 'nominal-sync-grace-pending');
    const read = deps.readGitHub ?? readHubGitHub, facts = await collectHubFacts(read, { slug: binding.request.slug });
    const decision = decideHubReadiness({ ...facts, source: { ...facts.source, admitted: facts.source.admitted || plan.canonical.surface_targeted }, publication: pub, now });
    insist(decision.state === 'dispatch-if-authorized' && facts.source.main_sha === plan.source.main_sha, 'existing-or-uncertain-sync-work');
    const operation = await root.get('hub-operation.json');
    if (operation)
        insist(operation.value.input_sha256 === binding.input_sha256, 'operation-input-changed');
    else
        await root.put('hub-operation.json', { schema_version: 1, kind: 'hub-operation', operation_id: binding.request.operation_id, input_sha256: binding.input_sha256, week: binding.request.week, slug: binding.request.slug });
    const body = { ref: 'main' }, intent = { schema_version: 1, kind: 'hub-sync-intent', input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, started_at: now, main_sha: plan.source.main_sha, dedupe_key: decision.operation?.dedupe_key, payload_sha256: digest(JSON.stringify(body)), attributed: false };
    const reserved = await boundRecord(root, 'hub-sync-intent.json', intent);
    if (!reserved.created)
        throw new UnknownAttempt('sync');
    try {
        insist(typeof deps.writeGitHub === 'function', 'native-writer-unavailable');
        await deps.writeGitHub('POST', `${nativePrefix}/actions/workflows/substrate-sync.yml/dispatches`, body);
        await boundRecord(root, 'hub-sync-response.json', { ...intent, kind: 'hub-sync-transport-returned', attributed: false, native_run_id: null });
    }
    catch {
        throw new UnknownAttempt('sync');
    }
    throw new UnknownAttempt('sync');
}
export async function advanceHubRelease(options: AdvanceOptions, deps: Dependencies = {}) {
    const binding = await load(options);
    if (typeof deps.authorize !== 'function')
        return envelope(binding, 'held', [], ['runtime-authority-unadmitted']);
    if (typeof deps.writeGitHub !== 'function')
        return envelope(binding, 'held', [], ['native-writer-unqualified']);
    insist(['prepare-admission', 'recover-sync'].includes(options.action) && Number.isSafeInteger(options.maxActions) && options.maxActions >= 1 && options.maxActions <= 6, 'invalid-advance-action');
    const root = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    let plan: any, result: any;
    try {
        plan = await loadPlan(root, options, binding);
        if (options.action === 'recover-sync' && await root.get('hub-sync-intent.json'))
            throw new UnknownAttempt('sync');
        await authorizeWrite(options, binding, plan, deps);
        if (options.action === 'prepare-admission')
            result = await admissionAction(root, options, binding, plan, deps);
        else
            result = await recoverSyncAction(root, options, binding, plan, deps);
    }
    catch (e: any) {
        result = { stage: e instanceof UnknownAttempt ? 'unknown-native-attempt' : 'operation-held', step: e instanceof UnknownAttempt ? e.step : null, reason: e instanceof UnknownAttempt ? 'unknown-native-attempt' : ['action-budget-exhausted', 'existing-admission-work', 'current-base-changed', 'operation-input-changed', 'runtime-authority-unadmitted', 'runtime-authority-binding-mismatch', 'runtime-authority-expired', 'pilot-drain-expired', 'nominal-sync-grace-pending', 'recovery-not-ready', 'existing-or-uncertain-sync-work'].includes(e.message) ? e.message : 'operation-precondition-unverified' };
    }
    finally {
        await root.close();
    }
    const unknown = result.stage === 'unknown-native-attempt';
    return artifact(options, binding, { ...result, source: plan?.source ?? null }, unknown ? 'unknown' : 'held', [result.reason ?? 'HUMAN_REQUIRED']);
}
export async function reconcileHubRelease(options: Options, deps: Dependencies = {}) {
    const binding = await load(options);
    const fresh = await planHubRelease(options, deps);
    insist(fresh.input_sha256 === binding.input_sha256 && fresh.operation_id === binding.request.operation_id, 'operation-input-changed');
    const freshRoot = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    let current: any, syncAttempt: any = null;
    try {
        const reference = fresh.artifacts[0];
        insist(reference && HASH.test(reference.sha256) && reference.ref === `hub-plan-${reference.sha256}.json`, 'artifact-binding-mismatch');
        const saved = await freshRoot.get(reference.ref);
        insist(saved && digest(saved.bytes) === reference.sha256, 'artifact-digest-mismatch');
        current = saved.value;
        insist(current.kind === 'newsletter-hub-stage' && current.input_sha256 === binding.input_sha256 && current.operation_id === binding.request.operation_id && current.week === binding.request.week && current.release_week === binding.request.release_week, 'artifact-binding-mismatch');
        const sync = await freshRoot.get('hub-sync-intent.json');
        if (sync) {
            insist(sync.value.kind === 'hub-sync-intent' && sync.value.input_sha256 === binding.input_sha256 && sync.value.action === 'recover-sync' && sync.value.attributed === false && SHA.test(sync.value.main_sha) && HASH.test(sync.value.plan_sha256), 'operation-input-changed');
            syncAttempt = { ...sync.value, attributed: false, native_run_id: null };
        }
    } finally { await freshRoot.close(); }
    if (current?.stage === 'content-pr-awaiting-merge' || current?.stage === 'content-pr-unverified') {
        return syncAttempt ? artifact(options, binding, { ...current, sync_attempt: syncAttempt }, 'held', fresh.holds) : fresh;
    }
    if (syncAttempt && current?.stage !== 'already-source-synced') {
        return artifact(options, binding, { ...current, stage: 'unknown-native-attempt', step: 'sync', sync_attempt: syncAttempt }, 'unknown', ['unknown-native-attempt']);
    }
    if (current?.stage === 'already-source-synced') {
        try {
            const proof = await verifyHubReader({
                operation_id: binding.request.operation_id,
                input_sha256: binding.input_sha256,
                main_sha: current.source.main_sha,
                target: current.expected,
                thoughts: current.baseline.thoughts,
                cta: binding.request.cta,
            }, { ...deps, readGitHub: deps.readGitHub ?? readHubGitHub, readHydratedBrowser: deps.readHydratedBrowser ?? (deps.browserRuntime ? undefined : readInstalledHubBrowser) });
            return artifact(options, binding, { ...current, observed_at: options.now, stage: proof.stage, public_delivery: proof.public_delivery, reader: proof, ...(syncAttempt ? { sync_attempt: syncAttempt } : {}) }, proof.public_delivery === 'verified' ? 'completed' : 'held', proof.holds);
        }
        catch (error: any) {
            const code = typeof error.message === 'string' && /^(public|hydrated|production|browser)-[a-z-]{1,65}$/.test(error.message) ? error.message : 'reader-proof-unverified';
            return artifact(options, binding, { ...current, observed_at: options.now, stage: 'public-reader-unverified', public_delivery: 'unknown', ...(syncAttempt ? { sync_attempt: syncAttempt } : {}) }, 'held', [code]);
        }
    }
    const root = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    let result: any;
    try {
        const operation = await root.get('hub-operation.json');
        insist(operation && operation.value.input_sha256 === binding.input_sha256, 'operation-not-started');
        const action = await root.get('hub-admission-action.json');
        insist(action, 'operation-not-started');
        const advance = { ...options, action: 'prepare-admission', planSha256: action.value.plan_sha256, maxActions: 1 }, plan = await loadPlan(root, advance, binding);
        result = await admissionAction(root, advance, binding, plan, { ...deps, reconcileOnly: true });
    }
    catch (e: any) {
        result = { stage: e instanceof UnknownAttempt ? 'unknown-native-attempt' : 'operation-held', step: e instanceof UnknownAttempt ? e.step : null, reason: e instanceof UnknownAttempt ? 'unknown-native-attempt' : ['unstarted-native-substep', 'operation-not-started'].includes(e.message) ? e.message : 'reconciliation-unverified' };
    }
    finally {
        await root.close();
    }
    return artifact(options, binding, result, result.stage === 'unknown-native-attempt' ? 'unknown' : 'held', [result.reason ?? 'HUMAN_REQUIRED']);
}
export async function main(argv: string[], dependencies: Dependencies = {}) {
    const command = argv[0];
    insist(['plan', 'inspect', 'reconcile', 'advance'].includes(command), 'invalid-command');
    const definitions: any = {
        request: { type: 'string' },
        'job-dir': { type: 'string' },
        now: { type: 'string' },
    };
    if (command === 'advance') {
        definitions['execute-action'] = { type: 'string' };
        definitions['plan-sha256'] = { type: 'string' };
        definitions['max-actions'] = { type: 'string' };
    }
    const parsed = parseArgs({ args: argv.slice(1), options: definitions, strict: true, allowPositionals: false });
    const values: any = parsed.values;
    insist(typeof values.request === 'string' && isAbsolute(values.request) && typeof values['job-dir'] === 'string' && isAbsolute(values['job-dir']) && typeof values.now === 'string', 'missing-command-input');
    const options = { requestPath: values.request, jobDir: values['job-dir'], now: values.now };
    if (command === 'plan')
        return planHubRelease(options, dependencies);
    if (command === 'inspect')
        return inspectHubRelease(options);
    if (command === 'reconcile')
        return reconcileHubRelease(options, dependencies);
    insist(typeof values['execute-action'] === 'string' && typeof values['plan-sha256'] === 'string' && /^[1-6]$/.test(values['max-actions'] ?? ''), 'missing-advance-input');
    return advanceHubRelease({ ...options, action: values['execute-action'], planSha256: values['plan-sha256'], maxActions: Number(values['max-actions']) }, dependencies);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main(process.argv.slice(2)).then(result => {
        process.stdout.write(JSON.stringify(result) + '\n');
    }).catch(() => {
        process.stderr.write('Hub operation input or private evidence is unusable.\n');
        process.exitCode = 2;
    });
}
