/** Hub-specific release coordinator. CLI writers remain runtime-unadmitted. */
import { isAbsolute, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import ts from 'typescript';
import { ESSAY_ADMISSION_PATH, parseEssayAdmissions } from './hubEssayAdmissions.mjs';
import { digest, insist, readPrivateJson, privateRoot } from './newsletterHubReleaseJournal.ts';
import { parsePublicationSnapshot, collectHubFacts, decideHubReadiness, readHubGitHub, decodeHubSource, parseHubInstant } from './newsletterHubReadiness.mjs';
import { parseCanonicalMarkdown, mapSubstrateToEntry, delinkWikiLinks, generateOutput, rewriteEssayBodyAssetReferences } from './compileContent.ts';
import { selectLatestThoughts } from '../thoughtsIndex.ts';
import { verifyHubReader } from './newsletterHubReleaseReader.ts';
import { readInstalledHubBrowser } from './newsletterHubInstalledBrowser.ts';
import { budgetKbFor } from './imageBudgets.mjs';
const REPOSITORY = 'OrionArchitekton/danmercede.com';
const PILOT_DRAIN_CUTOFF = '2026-12-09T07:59:00Z';
const executeRead = promisify(execFile);
const GH_EXECUTABLE = '/usr/bin/gh';
const authenticatedHubWriters = new WeakSet<object>();
/** Inert opaque capability. Only advancement's reserved fixed-effect seam can consume it. */
export function createAuthenticatedHubWriter(): Readonly<object> {
    insist(arguments.length === 0, 'invalid-writer-factory-options');
    const capability = Object.freeze({});
    authenticatedHubWriters.add(capability);
    return capability;
}
function capabilityWriter(capability: object) {
    if (!authenticatedHubWriters.has(capability)) return null;
    return async (method: string, path: string, body: any) => {
        insist(method === 'POST' && [
            `${nativePrefix}/git/blobs`, `${nativePrefix}/git/trees`, `${nativePrefix}/git/commits`,
            `${nativePrefix}/git/refs`, `${nativePrefix}/pulls`,
            `${nativePrefix}/actions/workflows/substrate-sync.yml/dispatches`,
        ].includes(path), 'unsupported-native-effect');
        const stdout = await new Promise<string>((resolve, reject) => {
            const child = execFile(GH_EXECUTABLE, ['api', '--hostname', 'github.com', '--method', 'POST', path, '--input', '-'], { timeout: 10000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' }, (error, output) => {
                if (error) reject(new Error('native-writer-transport-unknown'));
                else resolve(output);
            });
            child.stdin?.on('error', () => reject(new Error('native-writer-transport-unknown')));
            child.stdin?.end(JSON.stringify(body));
        });
        insist(typeof stdout === 'string' && Buffer.byteLength(stdout) <= 2 * 1024 * 1024, 'native-write-response-unusable');
        return stdout.trim() ? JSON.parse(stdout) : null;
    };
}
function injectedWriter(deps: Dependencies) {
    if (deps.authenticatedWriter !== undefined)
        return typeof deps.writeGitHub === 'function' ? null : capabilityWriter(deps.authenticatedWriter);
    return typeof deps.writeGitHub === 'function' ? deps.writeGitHub.bind(deps) : null;
}
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
function gitBlob(raw: string | Buffer) {
    return createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');
}
function admissionPatch(source: string, slug: string) {
    const existing = parseEssayAdmissions(source);
    const allowlist = existing.includes(slug) ? existing : [...existing, slug];
    const patch = existing.includes(slug) ? source : JSON.stringify({ schema_version: 1, essay_slugs: allowlist }, null, 2) + '\n';
    parseEssayAdmissions(patch); // The appended proposal must satisfy the same bounded data contract.
    return { patch, allowlist, data_path: ESSAY_ADMISSION_PATH, original_blob_sha: gitBlob(source), original_sha256: digest(source), proposed_blob_sha: gitBlob(patch), patch_sha256: digest(patch) };
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
const MAX_TARGET_ASSETS = 2, MAX_TARGET_ASSET_BYTES = 512 * 1024;
function binaryBlob(data: any, expected: string, assetPath: string) {
    const budget = budgetKbFor(extname(assetPath));
    insist(Number.isSafeInteger(budget) && budget > 0, 'target-asset-unverified');
    const limit = Math.min(MAX_TARGET_ASSET_BYTES, budget * 1024);
    insist(data?.sha === expected && data.encoding === 'base64' && Number.isSafeInteger(data.size) && data.size > 0 && data.size <= limit && typeof data.content === 'string' && data.content.length <= 2 * MAX_TARGET_ASSET_BYTES && /^[A-Za-z0-9+/=\r\n]*$/.test(data.content), 'target-asset-unverified');
    const compact = data.content.replace(/[\r\n]/g, ''), bytes = Buffer.from(compact, 'base64');
    insist(bytes.length === data.size && bytes.toString('base64') === compact && gitBlob(bytes) === expected, 'target-asset-unverified');
    return bytes;
}
async function targetAssetPlan(binding: any, body: string, read: (path: string) => Promise<any>) {
    const candidates = new Map<string, string>();
    rewriteEssayBodyAssetReferences(body, binding.request.slug, (source, dest) => {
        insist(source.startsWith(`publishing/assets/${binding.request.slug}/`) && source.length <= 512 && source.split('/').length <= 8 && source.split('/').every(part => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part)), 'target-asset-path-unverified');
        insist(![...candidates.values()].includes(dest) || candidates.get(source) === dest, 'target-asset-path-unverified');
        candidates.set(source, dest);
        insist(candidates.size <= MAX_TARGET_ASSETS, 'target-asset-count-unverified');
        return false;
    }, () => { throw Error('target-asset-path-unverified'); });
    if (!candidates.size) return { body, target_assets: [] };
    const prefix = '/repos/OrionArchitekton/dan-mercede-substrate';
    const commit = await read(`${prefix}/git/commits/${binding.request.canonical.commit}`);
    insist(commit?.sha === binding.request.canonical.commit && SHA.test(commit.tree?.sha), 'target-asset-source-unverified');
    const trees = new Map<string, any>(), target_assets = [];
    for (const [source_path, path] of candidates) {
        let tree = commit.tree.sha, leaf: any;
        const components = source_path.split('/');
        for (const [index, component] of components.entries()) {
            if (!trees.has(tree)) trees.set(tree, await read(`${prefix}/git/trees/${tree}`));
            const data = trees.get(tree);
            insist(data?.sha === tree && data.truncated === false && Array.isArray(data.tree) && data.tree.length <= 10000, 'target-asset-tree-unverified');
            const matches = data.tree.filter((entry: any) => entry.path === component);
            insist(matches.length === 1 && SHA.test(matches[0].sha), 'target-asset-source-unverified');
            leaf = matches[0];
            if (index < components.length - 1) { insist(leaf.type === 'tree' && leaf.mode === '040000', 'target-asset-source-unverified'); tree = leaf.sha; }
            else insist(leaf.type === 'blob' && leaf.mode === '100644', 'target-asset-source-unverified');
        }
        const bytes = binaryBlob(await read(`${prefix}/git/blobs/${leaf.sha}`), leaf.sha, source_path);
        target_assets.push({ source_path, path, mode: '100644', type: 'blob', blob: leaf.sha, sha256: digest(bytes), size: bytes.length });
    }
    const rewritten = rewriteEssayBodyAssetReferences(body, binding.request.slug, source => candidates.has(source));
    return { body: rewritten, target_assets };
}
async function verifyTargetAssets(assets: any[], tree: any[], read: (path: string) => Promise<any>) {
    insist(Array.isArray(assets) && assets.length <= MAX_TARGET_ASSETS, 'content-pr-assets-unverified');
    for (const asset of assets) {
        const leaf = tree.find(e => e.path === asset.path);
        insist(JSON.stringify(leaf) === JSON.stringify({ path: asset.path, mode: '100644', type: 'blob', sha: asset.blob }), 'content-pr-assets-unverified');
        const bytes = binaryBlob(await read(`${nativePrefix}/git/blobs/${asset.blob}`), asset.blob, asset.path);
        insist(bytes.length === asset.size && digest(bytes) === asset.sha256, 'content-pr-assets-unverified');
    }
}
async function detailedPlan(binding: any, facts: any, read: (path: string) => Promise<any>, pub: any) {
    const r = binding.request, main = facts.source.main_sha, prefix = `/repos/${REPOSITORY}`;
    const admissionData = decodeHubSource(await read(`${prefix}/contents/${ESSAY_ADMISSION_PATH}?ref=${main}`));
    const baselineSource = decodeHubSource(await read(`${prefix}/contents/constants.generated.ts?ref=${main}`));
    const trusted = await trustedCanonical(binding, read);
    const raw = trusted.raw;
    const parsed = parseCanonicalMarkdown(raw), patch = admissionPatch(admissionData, r.slug);
    const entry = mapSubstrateToEntry(parsed.data, delinkWikiLinks(parsed.content.trim()), r.canonical.path, [], patch.allowlist, () => {
    });
    insist(entry && entry.slug === r.slug && entry.title === pub.title, 'canonical-not-admissible');
    const assets = await targetAssetPlan(binding, entry.body, read);
    entry.body = assets.body;
    const expected = rows(generateOutput([entry!]), 'THOUGHTS')[0];
    insist(expected.date === r.week, 'canonical-week-mismatch');
    insist(expected.body.includes(r.cta.text), 'cta-not-in-pinned-body');
    const baseline = { thoughts: rows(baselineSource, 'THOUGHTS'), diagrams: rows(baselineSource, 'DIAGRAMS') };
    const commit = await read(`${prefix}/git/commits/${main}`);
    insist(commit?.sha === main && SHA.test(commit.tree?.sha), 'base-commit-unusable');
    const baseTree = await leafTree(read, commit.tree.sha);
    insist(baseTree.some((e: any) => e.path === ESSAY_ADMISSION_PATH && e.mode === '100644' && e.type === 'blob' && e.sha === patch.original_blob_sha), 'admission-data-base-mismatch');
    const current = baseline.thoughts.find((e: any) => e.slug === r.slug);
    if (current) {
        insist(JSON.stringify(current) === JSON.stringify(expected), 'target-copy-mismatch');
        await verifyTargetAssets(assets.target_assets, baseTree, read);
    }
    return { expected, target_assets: assets.target_assets, canonical: { commit: r.canonical.commit, sha256: r.canonical.sha256, trusted_main_sha: trusted.trusted_main_sha, blob_sha: trusted.blob_sha, surface_targeted: Array.isArray(parsed.data.surface_targets) && parsed.data.surface_targets.includes('danmercede.com') }, baseline, admission: { base_sha: main, base_tree_sha: commit.tree.sha, base_tree: baseTree, branch: `codex/fcn-hub-admission-${r.slug}`, ...patch } };
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
async function contentPrPlan(binding: any, detail: any, facts: any, read: (path: string) => Promise<any>, deps: Dependencies, merged = false) {
    insist(facts.existing.prs.length === 1, 'content-pr-ambiguous');
    const meta = facts.existing.prs[0], pr = await read(`${nativePrefix}/pulls/${meta.number}`);
    insist(pr?.number === meta.number && pr.state === (merged ? 'closed' : 'open') && (!merged || (pr.merged === true && SHA.test(pr.merge_commit_sha))) && pr.head?.sha === meta.head_sha && pr.head.ref === 'codex/substrate-sync' && pr.head.repo?.full_name === REPOSITORY && pr.base?.ref === 'main' && pr.base.sha === facts.source.main_sha && pr.base.repo?.full_name === REPOSITORY, 'content-pr-stale-or-foreign');
    const commit = await read(`${nativePrefix}/git/commits/${pr.head.sha}`);
    insist(commit?.parents?.length === 1 && commit.parents[0].sha === facts.source.main_sha && SHA.test(commit.tree?.sha), 'content-pr-base-mismatch');
    const tree = await leafTree(read, commit.tree.sha), base = detail.admission.base_tree;
    insist(Array.isArray(detail.target_assets) && detail.target_assets.length <= MAX_TARGET_ASSETS, 'content-pr-assets-unverified');
    const assetPaths = new Set(detail.target_assets.map((asset: any) => asset.path));
    const unaffected = (entries: any[]) => entries.filter(e => e.path !== 'constants.generated.ts' && !assetPaths.has(e.path));
    insist(JSON.stringify(unaffected(tree)) === JSON.stringify(unaffected(base)), 'content-pr-unrelated-files');
    await verifyTargetAssets(detail.target_assets, tree, read);
    for (const asset of detail.target_assets) {
        const prior = base.find((e: any) => e.path === asset.path);
        const expectedLeaf = { path: asset.path, mode: '100644', type: 'blob', sha: asset.blob };
        insist(!prior || JSON.stringify(prior) === JSON.stringify(expectedLeaf), 'content-pr-assets-unverified');
    }
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
async function originalPlanAnchor(root: any, binding: any) {
    let anchor: any;
    try { anchor = await root.get('hub-original-plan.json'); }
    catch (error: any) {
        if (error instanceof SyntaxError || error?.name === 'YAMLException' || error?.code === 'ERR_ENCODING_INVALID_ENCODED_DATA') throw Error('original-plan-unverified');
        throw error;
    }
    if (!anchor) return null;
    const value = anchor.value;
    insist(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === 'input_sha256|kind|operation_id|plan|schema_version|week' && value.schema_version === 1 && value.kind === 'newsletter-hub-original-plan' && value.operation_id === binding.request.operation_id && value.week === binding.request.week && value.input_sha256 === binding.input_sha256, 'original-plan-unverified');
    const ref = value.plan;
    insist(ref && typeof ref === 'object' && !Array.isArray(ref) && Object.keys(ref).sort().join('|') === 'ref|sha256' && HASH.test(ref.sha256) && ref.ref === `hub-plan-${ref.sha256}.json`, 'original-plan-unverified');
    return anchor;
}
async function artifact(options: Options, binding: any, data: any, status: string, holds: string[]) {
    const root = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    try {
        const value = { schema_version: 1, kind: 'newsletter-hub-stage', operation_id: binding.request.operation_id, week: binding.request.week, release_week: binding.request.release_week, input_sha256: binding.input_sha256, observed_at: options.now, merge_gate: 'HUMAN_REQUIRED', public_delivery: 'unknown', ...data };
        const name = `hub-plan-${digest(Buffer.from(JSON.stringify(value, null, 2) + '\n'))}.json`;
        const stored = await root.put(name, value);
        insist(digest(stored.bytes) === digest(Buffer.from(JSON.stringify(value, null, 2) + '\n')), 'artifact-conflict');
        if (value.admission?.data_path === ESSAY_ADMISSION_PATH && value.expected && value.baseline && value.source?.main_sha) {
            let anchor = await originalPlanAnchor(root, binding);
            if (!anchor) {
                // Recover only a first-plan crash, never silently rebase an existing job.
                for (const prior of await root.list()) {
                    if (prior === name) continue;
                    const previous = await root.get(prior);
                    insist(previous && prior === `hub-plan-${digest(previous.bytes)}.json`, 'artifact-digest-mismatch');
                    insist(!previous.value.admission || !previous.value.expected, 'original-plan-unverified');
                }
                await root.put('hub-original-plan.json', { schema_version: 1, kind: 'newsletter-hub-original-plan', operation_id: binding.request.operation_id, week: binding.request.week, input_sha256: binding.input_sha256, plan: { ref: name, sha256: stored.sha256 } });
                anchor = await originalPlanAnchor(root, binding);
            }
            insist(anchor, 'original-plan-unverified');
        }
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
    if (options.action === 'prepare-admission') {
        const anchor = await originalPlanAnchor(root, binding);
        insist(anchor?.value.plan.sha256 === options.planSha256 && anchor.value.plan.ref === `hub-plan-${options.planSha256}.json`, 'original-plan-unverified');
    }
    return saved.value;
}
function freshGrantTime(grant: any, deps: Dependencies) {
    const now = new Date((deps.clock ?? Date.now)()).toISOString();
    insist(parseHubInstant(now) < parseHubInstant(PILOT_DRAIN_CUTOFF), 'pilot-drain-expired');
    insist(grant?.admitted === true && grant.stopped === false && typeof grant.grant_ref === 'string', 'runtime-authority-unadmitted');
    insist(parseHubInstant(grant.checked_at) <= Date.parse(now) && Date.parse(now) - parseHubInstant(grant.checked_at) <= 60000 && parseHubInstant(grant.expires_at) > Date.parse(now) && parseHubInstant(grant.expires_at) <= parseHubInstant(PILOT_DRAIN_CUTOFF), 'runtime-authority-expired');
    return now;
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
    const afterAuthorization = await read(`${nativePrefix}/git/ref/heads/main`);
    insist(afterAuthorization?.object?.sha === plan.source.main_sha, 'current-base-changed');
    return { grant, now: freshGrantTime(grant, deps) };
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
    const authorization = await authorizeWrite(options, binding, plan, deps);
    const now = freshGrantTime(authorization.grant, deps);
    const intent = { schema_version: 1, kind: 'hub-native-intent', input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, step, payload_sha256, started_at: now };
    const reservation = await boundRecord(root, names.intent, intent);
    if (!reservation.created)
        throw new UnknownAttempt(step);
    try {
        const write = injectedWriter(deps);
        insist(write, 'native-writer-unavailable');
        freshGrantTime(authorization.grant, deps);
        budget.used++;
        const response = await write(method, path, body);
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
async function admissionAction(root: any, options: AdvanceOptions, binding: any, plan: any, deps: Dependencies, authorization?: any) {
    insist(plan.stage === 'admission-preparation-ready', 'admission-plan-not-ready');
    const read = deps.readGitHub ?? readHubGitHub, a = plan.admission, budget = { used: 0 };
    const original = decodeHubSource(await read(`${nativePrefix}/contents/${ESSAY_ADMISSION_PATH}?ref=${a.base_sha}`));
    const checked = admissionPatch(original, binding.request.slug);
    insist(a.base_sha === plan.source.main_sha, 'admission-data-base-mismatch');
    const currentBase = await read(`${nativePrefix}/git/commits/${a.base_sha}`);
    insist(currentBase?.sha === a.base_sha && currentBase.tree?.sha === a.base_tree_sha, 'admission-data-base-mismatch');
    const currentLeaves = await leafTree(read, a.base_tree_sha);
    insist(JSON.stringify(currentLeaves) === JSON.stringify(a.base_tree) && currentLeaves.some((e: any) => e.path === ESSAY_ADMISSION_PATH && e.mode === '100644' && e.type === 'blob' && e.sha === checked.original_blob_sha), 'admission-data-base-mismatch');
    for (const key of ['data_path', 'original_blob_sha', 'original_sha256', 'proposed_blob_sha', 'patch_sha256', 'patch']) insist(a[key] === checked[key], 'admission-data-binding-mismatch');
    insist(JSON.stringify(a.allowlist) === JSON.stringify(checked.allowlist), 'admission-data-binding-mismatch');
    const operation = await root.get('hub-operation.json');
    if (operation)
        insist(operation.value.input_sha256 === binding.input_sha256, 'operation-input-changed');
    else {
        insist(!deps.reconcileOnly, 'operation-not-started');
        freshGrantTime(authorization?.grant, deps);
        await root.put('hub-operation.json', { schema_version: 1, kind: 'hub-operation', operation_id: binding.request.operation_id, input_sha256: binding.input_sha256, week: binding.request.week, slug: binding.request.slug });
    }
    const prior = await root.get('hub-admission-action.json');
    if (!prior) {
        const refs = await read(`${nativePrefix}/git/matching-refs/heads/${encodeURIComponent(a.branch)}`);
        const prs = await read(`${nativePrefix}/pulls?state=all&base=main&head=${encodeURIComponent('OrionArchitekton:' + a.branch)}&per_page=100&page=1`);
        insist(Array.isArray(refs) && refs.length === 0 && Array.isArray(prs) && prs.length === 0, 'existing-admission-work');
    }
    if (!deps.reconcileOnly) freshGrantTime(authorization?.grant, deps);
    await boundRecord(root, 'hub-admission-action.json', { schema_version: 1, kind: 'hub-admission-action', input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, main_sha: plan.source.main_sha });
    const blobSha = (await import('node:crypto')).createHash('sha1').update(`blob ${Buffer.byteLength(a.patch)}\0`).update(a.patch).digest('hex');
    const blob = await nativeStep(root, options, binding, plan, deps, 'blob', 'POST', `${nativePrefix}/git/blobs`, { content: a.patch, encoding: 'utf-8' }, async (response) => {
        insist(response.sha === blobSha, 'wrong-blob');
        const data = await read(`${nativePrefix}/git/blobs/${response.sha}`);
        insist(decodeHubSource({ ...data, type: 'file' }) === a.patch, 'blob-readback-mismatch');
        return { sha: response.sha };
    }, budget);
    const tree = await nativeStep(root, options, binding, plan, deps, 'tree', 'POST', `${nativePrefix}/git/trees`, { base_tree: a.base_tree_sha, tree: [{ path: ESSAY_ADMISSION_PATH, mode: '100644', type: 'blob', sha: blob.sha }] }, async (response) => {
        const actual = await leafTree(read, response.sha), expected = a.base_tree.map((e: any) => e.path === ESSAY_ADMISSION_PATH ? { ...e, sha: blob.sha } : e);
        insist(JSON.stringify(actual) === JSON.stringify(expected), 'admission-tree-unrelated-change');
        return { sha: response.sha };
    }, budget);
    const commit = await nativeStep(root, options, binding, plan, deps, 'commit', 'POST', `${nativePrefix}/git/commits`, { message: `Admit ${binding.request.slug} [${binding.request.operation_id}:${binding.input_sha256}]`, tree: tree.sha, parents: [a.base_sha] }, async (response) => {
        const data = await read(`${nativePrefix}/git/commits/${response.sha}`);
        insist(data?.sha === response.sha && data.tree?.sha === tree.sha && data.parents?.length === 1 && data.parents[0].sha === a.base_sha, 'commit-readback-mismatch');
        insist(decodeHubSource(await read(`${nativePrefix}/contents/${ESSAY_ADMISSION_PATH}?ref=${response.sha}`)) === a.patch, 'commit-copy-mismatch');
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
    const authorization = await authorizeWrite(options, binding, plan, deps), pub = await publication(binding, authorization.now);
    const read = deps.readGitHub ?? readHubGitHub, facts = await collectHubFacts(read, { slug: binding.request.slug });
    const now = freshGrantTime(authorization.grant, deps);
    insist(Date.parse(now) >= Date.parse(pub.recovery_due_at), 'nominal-sync-grace-pending');
    const decision = decideHubReadiness({ ...facts, source: { ...facts.source, admitted: facts.source.admitted || plan.canonical.surface_targeted }, publication: pub, now });
    insist(decision.state === 'dispatch-if-authorized' && facts.source.main_sha === plan.source.main_sha, 'existing-or-uncertain-sync-work');
    const operation = await root.get('hub-operation.json');
    if (operation)
        insist(operation.value.input_sha256 === binding.input_sha256, 'operation-input-changed');
    // Inventory awaits may outlive a STOP decision even while the earlier
    // immutable grant remains within its time window. Refresh current admission.
    freshGrantTime(authorization.grant, deps);
    const reservationAuthorization = await authorizeWrite(options, binding, plan, deps);
    if (!operation) {
        freshGrantTime(reservationAuthorization.grant, deps);
        await root.put('hub-operation.json', { schema_version: 1, kind: 'hub-operation', operation_id: binding.request.operation_id, input_sha256: binding.input_sha256, week: binding.request.week, slug: binding.request.slug });
    }
    const body = { ref: 'main' }, intent = { schema_version: 1, kind: 'hub-sync-intent', input_sha256: binding.input_sha256, action: options.action, plan_sha256: options.planSha256, started_at: freshGrantTime(reservationAuthorization.grant, deps), main_sha: plan.source.main_sha, dedupe_key: decision.operation?.dedupe_key, payload_sha256: digest(JSON.stringify(body)), attributed: false };
    const reserved = await boundRecord(root, 'hub-sync-intent.json', intent);
    if (!reserved.created)
        throw new UnknownAttempt('sync');
    try {
        const write = injectedWriter(deps);
        insist(write, 'native-writer-unavailable');
        freshGrantTime(reservationAuthorization.grant, deps);
        await write('POST', `${nativePrefix}/actions/workflows/substrate-sync.yml/dispatches`, body);
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
    if (!injectedWriter(deps))
        return envelope(binding, 'held', [], ['native-writer-unqualified']);
    insist(['prepare-admission', 'recover-sync'].includes(options.action) && Number.isSafeInteger(options.maxActions) && options.maxActions >= 1 && options.maxActions <= 6, 'invalid-advance-action');
    const root = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    let plan: any, result: any;
    try {
        plan = await loadPlan(root, options, binding);
        if (options.action === 'recover-sync' && await root.get('hub-sync-intent.json'))
            throw new UnknownAttempt('sync');
        const authorization = await authorizeWrite(options, binding, plan, deps);
        if (options.action === 'prepare-admission')
            result = await admissionAction(root, options, binding, plan, deps, authorization);
        else
            result = await recoverSyncAction(root, options, binding, plan, deps);
    }
    catch (e: any) {
        result = { stage: e instanceof UnknownAttempt ? 'unknown-native-attempt' : 'operation-held', step: e instanceof UnknownAttempt ? e.step : null, reason: e instanceof UnknownAttempt ? 'unknown-native-attempt' : ['action-budget-exhausted', 'existing-admission-work', 'current-base-changed', 'operation-input-changed', 'original-plan-unverified', 'runtime-authority-unadmitted', 'runtime-authority-binding-mismatch', 'runtime-authority-expired', 'pilot-drain-expired', 'nominal-sync-grace-pending', 'recovery-not-ready', 'existing-or-uncertain-sync-work'].includes(e.message) ? e.message : 'operation-precondition-unverified' };
    }
    finally {
        await root.close();
    }
    const unknown = result.stage === 'unknown-native-attempt';
    return artifact(options, binding, { ...result, source: plan?.source ?? null }, unknown ? 'unknown' : 'held', [result.reason ?? 'HUMAN_REQUIRED']);
}
const HUB_DATA_PATHS = [ESSAY_ADMISSION_PATH, 'constants.generated.ts', 'constants.guides.generated.ts'];
// Only audited source-owned generation failures may appear in held diagnostics.
// Native/transient/parse messages and future unlisted failures stay unclassified.
const GENERATION_ERROR_CODES = new Set([
    'original-plan-unverified', 'original-target-changed', 'original-base-unverified',
    'original-admission-unverified', 'original-baseline-unverified', 'original-canonical-unverified', 'original-target-unverified',
    'generation-data-unusable', 'generation-data-unproved', 'generation-main-moved',
    'generation-anchor-unverified', 'generation-identity-changed', 'generation-proof-unusable', 'generation-proof-conflict',
    'merged-pr-inventory-unusable', 'merged-pr-inventory-incomplete', 'merged-pr-unverified',
    'merged-pr-head-unverified', 'merged-pr-tree-unverified', 'merged-pr-not-protected',
    'admission-merge-unrelated-change', 'admission-merge-copy-mismatch',
    'content-pr-ambiguous', 'content-pr-stale-or-foreign', 'content-pr-base-mismatch',
    'content-pr-unrelated-files', 'content-pr-assets-unverified', 'content-pr-target-mismatch', 'content-pr-unrelated-content',
    'required-check-inventory-unverified', 'required-checks-unverified', 'trusted-check-origin-unverified', 'review-threads-unverified',
    'target-asset-count-unverified', 'target-asset-path-unverified', 'target-asset-source-unverified',
    'target-asset-tree-unverified', 'target-asset-unverified',
    'canonical-main-unverified', 'canonical-not-on-protected-main', 'canonical-pin-changed',
    'canonical-protected-main-mismatch', 'canonical-main-moved',
    'tree-inventory-unusable', 'tree-entry-unusable', 'tree-duplicate-path',
]);
async function generationData(read: (path: string) => Promise<any>, commit: string, tree: any[]) {
    const files = [];
    for (const path of HUB_DATA_PATHS) {
        const leaf = tree.find(e => e.path === path);
        insist(leaf?.mode === '100644' && leaf.type === 'blob', 'generation-data-unusable');
        const raw = decodeHubSource(await read(`${nativePrefix}/contents/${path}?ref=${commit}`));
        insist(gitBlob(raw) === leaf.sha, 'generation-data-unusable');
        files.push({ path, blob: leaf.sha, sha256: digest(raw) });
    }
    return files;
}
async function mergedPull(read: (path: string) => Promise<any>, branch: string, base: string, protectedMain: string, marker?: string) {
    const candidates: any[] = [], seen = new Set<number>();
    let complete = false;
    for (let page = 1; page <= 3; page++) {
        const records = await read(`${nativePrefix}/pulls?state=closed&base=main&head=${encodeURIComponent('OrionArchitekton:' + branch)}&per_page=100&page=${page}`);
        insist(Array.isArray(records) && records.length <= 100, 'merged-pr-inventory-unusable');
        for (const record of records) {
            insist(Number.isSafeInteger(record?.number) && record.number > 0 && !seen.has(record.number) && record.state === 'closed' && record.head?.ref === branch && SHA.test(record.head.sha) && record.head.repo?.full_name === REPOSITORY && record.base?.ref === 'main' && SHA.test(record.base.sha) && record.base.repo?.full_name === REPOSITORY, 'merged-pr-inventory-unusable');
            seen.add(record.number);
            candidates.push(record);
        }
        if (records.length < 100) { complete = true; break; }
    }
    insist(complete, 'merged-pr-inventory-incomplete');
    const matches = candidates.filter(p => p.base?.sha === base && (!marker || p.body === marker));
    insist(matches.length === 1 && Number.isSafeInteger(matches[0].number) && matches[0].number > 0, 'merged-pr-unverified');
    const pr = await read(`${nativePrefix}/pulls/${matches[0].number}`);
    insist(pr?.number === matches[0].number && pr.state === 'closed' && pr.merged === true && SHA.test(pr.merge_commit_sha) && pr.head?.ref === branch && SHA.test(pr.head.sha) && pr.head.repo?.full_name === REPOSITORY && pr.base?.ref === 'main' && pr.base.sha === base && pr.base.repo?.full_name === REPOSITORY && (!marker || pr.body === marker), 'merged-pr-unverified');
    const head = await read(`${nativePrefix}/git/commits/${pr.head.sha}`), merge = await read(`${nativePrefix}/git/commits/${pr.merge_commit_sha}`);
    insist(head?.sha === pr.head.sha && head.parents?.length === 1 && head.parents[0].sha === base && SHA.test(head.tree?.sha), 'merged-pr-head-unverified');
    insist(merge?.sha === pr.merge_commit_sha && merge.tree?.sha === head.tree.sha && Array.isArray(merge.parents) && [1, 2].includes(merge.parents.length) && merge.parents[0].sha === base && (merge.parents.length === 1 || merge.parents[1].sha === pr.head.sha), 'merged-pr-tree-unverified');
    const ancestry = await read(`${nativePrefix}/compare/${merge.sha}...${protectedMain}`);
    insist(['ahead', 'identical'].includes(ancestry?.status) && ancestry.base_commit?.sha === merge.sha && ancestry.merge_base_commit?.sha === merge.sha, 'merged-pr-not-protected');
    return { pr, head, merge, tree: await leafTree(read, merge.tree.sha) };
}
function transitionIdentity(proof: any) {
    const { content_validation: _freshObservation, ...identity } = proof;
    return JSON.stringify(identity);
}
async function retainGeneration(root: any, proof: any) {
    insist(['admission-merged', 'content-merged'].includes(proof.transition), 'generation-proof-unusable');
    const name = `hub-transition-${proof.transition}.json`;
    let anchor = await root.get(name);
    if (!anchor) {
        for (const ref of await root.generationProofs()) {
            const record = await root.get(ref);
            insist(record && ref === `hub-generation-${digest(record.bytes)}.json`, 'generation-proof-unusable');
            insist(record.value.operation_id !== proof.operation_id || record.value.input_sha256 !== proof.input_sha256 || record.value.transition !== proof.transition, 'generation-anchor-unverified');
        }
        const hash = digest(Buffer.from(JSON.stringify(proof, null, 2) + '\n'));
        // Freeze identity and original observation before materializing its proof.
        await root.put(name, { schema_version: 1, kind: 'newsletter-hub-transition', transition: proof.transition, operation_id: proof.operation_id, week: proof.week, input_sha256: proof.input_sha256, proof: { ref: `hub-generation-${hash}.json`, sha256: hash }, payload: proof });
        anchor = await root.get(name);
    }
    const value = anchor?.value;
    fields(value, 'schema_version kind transition operation_id week input_sha256 proof payload');
    insist(value.schema_version === 1 && value.kind === 'newsletter-hub-transition' && value.transition === proof.transition && value.operation_id === proof.operation_id && value.week === proof.week && value.input_sha256 === proof.input_sha256 && transitionIdentity(value.payload) === transitionIdentity(proof), 'generation-identity-changed');
    fields(value.proof, 'ref sha256');
    const bytes = Buffer.from(JSON.stringify(value.payload, null, 2) + '\n');
    insist(HASH.test(value.proof.sha256) && value.proof.sha256 === digest(bytes) && value.proof.ref === `hub-generation-${value.proof.sha256}.json`, 'generation-proof-unusable');
    const saved = await root.put(value.proof.ref, value.payload);
    insist(digest(saved.bytes) === value.proof.sha256, 'generation-proof-conflict');
    return value.proof;
}
async function verifyOriginalPlan(binding: any, original: any, protectedMain: string, read: (path: string) => Promise<any>) {
    fields(original.source, 'repository main_sha allowlisted admitted bundle_slug_present content_equivalence');
    fields(original.baseline, 'thoughts diagrams');
    fields(original.canonical, 'commit sha256 trusted_main_sha blob_sha surface_targeted');
    fields(original.admission, 'base_sha base_tree_sha base_tree branch patch allowlist data_path original_blob_sha original_sha256 proposed_blob_sha patch_sha256');
    const a = original.admission, base = await read(`${nativePrefix}/git/commits/${original.source.main_sha}`);
    insist(original.kind === 'newsletter-hub-stage' && original.merge_gate === 'HUMAN_REQUIRED' && original.source.repository === REPOSITORY && base?.sha === original.source.main_sha && SHA.test(base.tree?.sha) && a.base_sha === base.sha && a.base_tree_sha === base.tree.sha, 'original-base-unverified');
    const tree = await leafTree(read, base.tree.sha);
    insist(JSON.stringify(tree) === JSON.stringify(a.base_tree), 'original-base-unverified');
    const ancestry = await read(`${nativePrefix}/compare/${base.sha}...${protectedMain}`);
    insist(['ahead', 'identical'].includes(ancestry?.status) && ancestry.base_commit?.sha === base.sha && ancestry.merge_base_commit?.sha === base.sha, 'original-base-unverified');
    const admissionData = decodeHubSource(await read(`${nativePrefix}/contents/${ESSAY_ADMISSION_PATH}?ref=${base.sha}`));
    const patch = admissionPatch(admissionData, binding.request.slug), allowed = parseEssayAdmissions(admissionData).includes(binding.request.slug);
    for (const key of ['data_path', 'original_blob_sha', 'original_sha256', 'proposed_blob_sha', 'patch_sha256', 'patch']) insist(a[key] === (patch as any)[key], 'original-admission-unverified');
    insist(a.branch === `codex/fcn-hub-admission-${binding.request.slug}` && JSON.stringify(a.allowlist) === JSON.stringify(patch.allowlist), 'original-admission-unverified');
    const corpus = decodeHubSource(await read(`${nativePrefix}/contents/constants.generated.ts?ref=${base.sha}`));
    const baseline = { thoughts: rows(corpus, 'THOUGHTS'), diagrams: rows(corpus, 'DIAGRAMS') };
    insist(JSON.stringify(original.baseline) === JSON.stringify(baseline) && original.source.allowlisted === allowed && original.source.admitted === (allowed ? true : null) && original.source.bundle_slug_present === baseline.thoughts.some(row => row.slug === binding.request.slug) && original.source.content_equivalence === 'not-checked', 'original-baseline-unverified');
    const canonical = await trustedCanonical(binding, read), parsed = parseCanonicalMarkdown(canonical.raw);
    const targeted = Array.isArray(parsed.data.surface_targets) && parsed.data.surface_targets.includes('danmercede.com');
    insist(original.canonical.commit === binding.request.canonical.commit && original.canonical.sha256 === binding.request.canonical.sha256 && original.canonical.blob_sha === canonical.blob_sha && original.canonical.surface_targeted === targeted && SHA.test(original.canonical.trusted_main_sha), 'original-canonical-unverified');
    if (original.canonical.trusted_main_sha !== canonical.trusted_main_sha) {
        const prior = await read(`/repos/OrionArchitekton/dan-mercede-substrate/compare/${original.canonical.trusted_main_sha}...${canonical.trusted_main_sha}`);
        insist(['ahead', 'identical'].includes(prior?.status) && prior.base_commit?.sha === original.canonical.trusted_main_sha && prior.merge_base_commit?.sha === original.canonical.trusted_main_sha, 'original-canonical-unverified');
        insist(decodeHubSource(await read(`/repos/OrionArchitekton/dan-mercede-substrate/contents/${binding.request.canonical.path}?ref=${original.canonical.trusted_main_sha}`)) === canonical.raw, 'original-canonical-unverified');
    }
    const entry = mapSubstrateToEntry(parsed.data, delinkWikiLinks(parsed.content.trim()), binding.request.canonical.path, [], patch.allowlist, () => {});
    insist(entry && entry.slug === binding.request.slug, 'original-target-unverified');
    const assets = await targetAssetPlan(binding, entry.body, read);
    entry.body = assets.body;
    const expected = rows(generateOutput([entry!]), 'THOUGHTS')[0];
    insist(JSON.stringify(original.expected) === JSON.stringify(expected) && JSON.stringify(original.target_assets) === JSON.stringify(assets.target_assets) && expected.date === binding.request.week && expected.body.includes(binding.request.cta.text), 'original-target-unverified');
    return base;
}
async function mergedDataGenerations(options: Options, binding: any, current: any, deps: Dependencies) {
    if (!current.source?.main_sha || !current.admission || !current.expected) return { references: [], observations: [] };
    const root = await privateRoot(options.jobDir, { recoverCrashLinks: true });
    try {
        const anchor = await originalPlanAnchor(root, binding);
        insist(anchor, 'original-plan-unverified');
        const originalPlan = anchor.value.plan;
        fields(originalPlan, 'ref sha256');
        insist(HASH.test(originalPlan.sha256) && originalPlan.ref === `hub-plan-${originalPlan.sha256}.json`, 'original-plan-unverified');
        const first = await root.get(originalPlan.ref);
        insist(first && digest(first.bytes) === originalPlan.sha256, 'original-plan-unverified');
        const original = first.value;
        insist(original.operation_id === binding.request.operation_id && original.week === binding.request.week && original.input_sha256 === binding.input_sha256 && original.admission?.data_path === ESSAY_ADMISSION_PATH && original.expected && original.baseline && original.source?.main_sha, 'original-plan-unverified');
        insist(JSON.stringify(current.expected) === JSON.stringify(original.expected), 'original-target-changed');
        insist(JSON.stringify(current.target_assets) === JSON.stringify(original.target_assets), 'original-target-changed');
        const read = deps.readGitHub ?? readHubGitHub;
        const originalBase = await verifyOriginalPlan(binding, original, current.source.main_sha, read);
        if (current.source.main_sha === original.source.main_sha) return { references: [], observations: [] };
        const generations = [], observations = [];
        let predecessor = { commit: original.admission.base_sha, tree: original.admission.base_tree_sha, leaves: original.admission.base_tree };
        const oldData = await generationData(read, predecessor.commit, predecessor.leaves);
        const currentCommit = await read(`${nativePrefix}/git/commits/${current.source.main_sha}`);
        insist(currentCommit?.sha === current.source.main_sha && SHA.test(currentCommit.tree?.sha), 'generation-data-unusable');
        const currentData = await generationData(read, current.source.main_sha, await leafTree(read, currentCommit.tree.sha));
        if (JSON.stringify(oldData) === JSON.stringify(currentData)) return { references: [], observations: [] };
        if (!original.source.allowlisted && !original.canonical.surface_targeted) {
            const a = original.admission;
            insist(a.base_sha === original.source.main_sha, 'original-plan-unverified');
            const base = originalBase;
            const originalData = decodeHubSource(await read(`${nativePrefix}/contents/${ESSAY_ADMISSION_PATH}?ref=${a.base_sha}`));
            const checked = admissionPatch(originalData, binding.request.slug);
            for (const key of ['data_path', 'original_blob_sha', 'original_sha256', 'proposed_blob_sha', 'patch_sha256', 'patch']) insist(a[key] === checked[key], 'original-admission-unverified');
            const marker = `Hub release ${binding.request.operation_id}; input ${binding.input_sha256}; canonical ${binding.request.canonical.sha256}. HUMAN_REQUIRED; no content bundle or release is authorized by this PR.`;
            const verified = await mergedPull(read, a.branch, a.base_sha, current.source.main_sha, marker);
            const expected = a.base_tree.map((e: any) => e.path === ESSAY_ADMISSION_PATH ? { ...e, sha: a.proposed_blob_sha } : e);
            insist(JSON.stringify(verified.tree) === JSON.stringify(expected), 'admission-merge-unrelated-change');
            insist(decodeHubSource(await read(`${nativePrefix}/contents/${ESSAY_ADMISSION_PATH}?ref=${verified.merge.sha}`)) === a.patch, 'admission-merge-copy-mismatch');
            const proof = { schema_version: 1, kind: 'newsletter-hub-generation-proof', transition: 'admission-merged', operation_id: binding.request.operation_id, week: binding.request.week, input_sha256: binding.input_sha256, original_plan: originalPlan, predecessor_proof: null,
                predecessor: { commit: base.sha, tree: base.tree.sha, files: await generationData(read, base.sha, a.base_tree) },
                successor: { commit: verified.merge.sha, tree: verified.merge.tree.sha, files: await generationData(read, verified.merge.sha, verified.tree) },
                pr: { number: verified.pr.number, head_sha: verified.head.sha, base_sha: base.sha, merge_sha: verified.merge.sha, merge_tree_sha: verified.merge.tree.sha } };
            generations.push(await retainGeneration(root, proof));
            predecessor = { commit: verified.merge.sha, tree: verified.merge.tree.sha, leaves: verified.tree };
        }
        if (current.source.bundle_slug_present && !original.source.bundle_slug_present) {
            const verified = await mergedPull(read, 'codex/substrate-sync', predecessor.commit, current.source.main_sha);
            const detail = { ...original, admission: { ...original.admission, base_tree: predecessor.leaves } };
            const facts = { source: { main_sha: predecessor.commit }, existing: { prs: [{ number: verified.pr.number, head_sha: verified.head.sha }] } };
            const validation = await contentPrPlan(binding, detail, facts, read, deps, true);
            const proof = { schema_version: 1, kind: 'newsletter-hub-generation-proof', transition: 'content-merged', operation_id: binding.request.operation_id, week: binding.request.week, input_sha256: binding.input_sha256, original_plan: originalPlan, predecessor_proof: generations.at(-1) ?? null,
                predecessor: { commit: predecessor.commit, tree: predecessor.tree, files: await generationData(read, predecessor.commit, predecessor.leaves) },
                successor: { commit: verified.merge.sha, tree: verified.merge.tree.sha, files: await generationData(read, verified.merge.sha, verified.tree) },
                pr: { number: verified.pr.number, head_sha: verified.head.sha, base_sha: predecessor.commit, merge_sha: verified.merge.sha, merge_tree_sha: verified.merge.tree.sha }, target_assets: original.target_assets, content_validation: validation };
            const reference = await retainGeneration(root, proof);
            generations.push(reference);
            observations.push({ transition: 'content-merged', proof: reference, content_validation: validation });
            predecessor = { commit: verified.merge.sha, tree: verified.merge.tree.sha, leaves: verified.tree };
        }
        insist(JSON.stringify(await generationData(read, predecessor.commit, predecessor.leaves)) === JSON.stringify(currentData), 'generation-data-unproved');
        const after = await read(`${nativePrefix}/git/ref/heads/main`);
        insist(after?.object?.sha === current.source.main_sha, 'generation-main-moved');
        return { references: generations, observations };
    } finally { await root.close(); }
}
export async function reconcileHubRelease(options: Options, deps: Dependencies = {}) {
    const binding = await load(options);
    let fresh: any;
    try { fresh = await planHubRelease(options, deps); }
    catch (error: any) {
        if (error.message !== 'original-plan-unverified') throw error;
        return artifact(options, binding, { stage: 'data-generation-unverified' }, 'held', ['original-plan-unverified']);
    }
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
    try {
        const generations = await mergedDataGenerations(options, binding, current, deps);
        if (generations.references.length) current = { ...current, data_generations: generations.references, generation_observations: generations.observations };
    } catch (error: unknown) {
        const message = error instanceof Error ? Object.getOwnPropertyDescriptor(error, 'message')?.value : undefined;
        const generation_error = typeof message === 'string' && GENERATION_ERROR_CODES.has(message) ? message : 'unclassified';
        return artifact(options, binding, { ...current, stage: 'data-generation-unverified', public_delivery: 'unknown', generation_error }, 'held', ['merged-generation-unverified']);
    }
    if (current.data_generations?.length && !syncAttempt && current.stage !== 'already-source-synced') return artifact(options, binding, current, fresh.status, fresh.holds);
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
    return artifact(options, binding, { ...current, ...result, public_delivery: 'unknown' }, result.stage === 'unknown-native-attempt' ? 'unknown' : 'held', [result.reason ?? 'HUMAN_REQUIRED']);
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
