import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, chmod, readdir, mkdir, rename, symlink, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, isAbsolute, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import React from 'react';
import { JSDOM } from 'jsdom';
import { runInNewContext } from 'node:vm';
import { readHydratedHub } from '../scripts/newsletterHubReleaseBrowser.ts';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '../components/Markdown.tsx';
import { renderRss, renderAtom } from '../scripts/renderFeed.ts';
import { privateRoot } from '../scripts/newsletterHubReleaseJournal.ts';
import { verifyHubReader } from '../scripts/newsletterHubReleaseReader.ts';
import { parseCanonicalMarkdown, mapSubstrateToEntry, generateOutput, HUB_ESSAY_ALLOWLIST } from '../scripts/compileContent.ts';
import { planHubRelease, inspectHubRelease, advanceHubRelease, reconcileHubRelease, verifyTrustedHubCheck } from '../scripts/newsletterHubRelease.ts';
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const slug = '2026-11-02-before-your-ai-tries-again';
const title = 'Before Your AI Tries Again';
const canonical = `---\nstatus: canonical\ntype: essay-long\nslug: ${slug}\ntitle: ${title}\ndate: 2026-11-02T07:00:00-08:00\nclaim: Recover a missing confirmation before repeating work.\nlayer: enforcement\nsurface_targets: [linkedin]\n---\nAn absent confirmation leaves the outcome unknown. Recover the actual record before repeating a consequential step.\n\n## Keep the original attempt\n\nRetain its identifier and inspect the result before allowing another attempt. A new request cannot explain what happened to the old one.\n\nWhich confirmation would you recover before trying again?\n`;
async function fixture(t: any, canonicalSource = canonical) {
    const dir = await mkdtemp(join(tmpdir(), 'hub-workflow-test-'));
    await chmod(dir, 0o700);
    t.after(() => rm(dir, { recursive: true, force: true }));
    const snapshot = { schema_version: 1, kind: 'newsletter-publication-coverage', newsletter_id: '7477834312608866304', editions: [{ slug, title, observed_title: title, hub_release_week: '2026-11-09', native_id: '7522060460920934400', public_url: 'https://www.linkedin.com/pulse/before-your-ai-tries-again-dan-mercede-example/', package_sha256: 'a'.repeat(64), published_at: '2026-11-02T15:02:46Z', observed_at: '2026-11-02T15:10:00Z', evidence_ref: 'fixture:publication', evidence_sha256: 'b'.repeat(64), coverage: ['identity', 'publication_time', 'title', 'body', 'headings', 'anchor', 'cover', 'caption', 'commentary', 'cta'] }] };
    const snapshotRaw = JSON.stringify(snapshot), snapshotPath = join(dir, 'publication.json');
    await writeFile(snapshotPath, snapshotRaw, { mode: 0o600 });
    const request = { schema_version: 1, kind: 'newsletter-hub-release-request', operation_id: 'fcn-hub-ed16-20261102', week: '2026-11-02', release_week: '2026-11-09', slug, canonical: { commit: 'c'.repeat(40), path: `publishing/canonical/${slug}.md`, sha256: sha(canonicalSource) }, publication_snapshot: { path: snapshotPath, sha256: sha(snapshotRaw) }, cta: { kind: 'question', text: 'Which confirmation would you recover before trying again?' } };
    const raw = JSON.stringify(request), path = join(dir, 'request.json');
    await writeFile(path, raw, { mode: 0o600 });
    return { dir, path, request, raw, snapshotPath, snapshotRaw };
}
test('private plan preserves E16 exact boundary and binds a real local artifact without native writes', async (t) => {
    const f = await fixture(t);
    let reads = 0;
    const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:02:45Z' }, { readGitHub: async () => {
            reads++;
            throw Error('unexpected read');
        } });
    assert.equal(reads, 0);
    assert.equal(result.schema_version, 1);
    assert.equal(result.kind, 'hub');
    assert.equal(result.week, '2026-11-02');
    assert.equal(result.input_sha256, sha(f.raw));
    assert.equal(result.status, 'held');
    assert.deepEqual(result.holds, ['seven-days-not-elapsed']);
    assert.equal(result.artifacts.length, 1);
    const artifactRaw = await readFile(join(f.dir, result.artifacts[0].ref));
    assert.equal(sha(artifactRaw), result.artifacts[0].sha256);
    const artifact = JSON.parse(artifactRaw.toString());
    assert.equal(artifact.publication.eligible_at, '2026-11-09T15:02:46.000Z');
    assert.equal(artifact.public_delivery, 'unknown');
    assert.equal(artifact.merge_gate, 'HUMAN_REQUIRED');
    assert.equal(await readFile(f.snapshotPath, 'utf8'), f.snapshotRaw);
});
test('inspect returns the original semantic artifact without writing or creating an operation', async (t) => {
    const f = await fixture(t), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:02:45Z' };
    const planned = await planHubRelease(options, { readGitHub: async () => {
            throw Error('must not read');
        } }), before = await readdir(f.dir);
    const result = await inspectHubRelease(options);
    assert.equal(result.status, 'held');
    assert.deepEqual(result.artifacts, planned.artifacts);
    assert.deepEqual(await readdir(f.dir), before);
    assert.ok(!before.includes('hub-operation.json'));
});
test('actual CLI plan and inspect emit bound JSON while execute flags cannot create writer authority', async (t) => {
    const f = await fixture(t), run = promisify(execFile), common = ['--request', f.path, '--job-dir', f.dir, '--now', '2026-11-09T15:02:45Z'];
    const planned = JSON.parse((await run(process.execPath, ['--import', 'tsx', 'scripts/newsletterHubRelease.ts', 'plan', ...common])).stdout);
    assert.equal(planned.kind, 'hub');
    assert.equal(planned.status, 'held');
    assert.equal(isAbsolute(planned.artifacts[0].ref), false);
    assert.equal(sha(await readFile(join(f.dir, planned.artifacts[0].ref))), planned.artifacts[0].sha256);
    const inspected = JSON.parse((await run(process.execPath, ['--import', 'tsx', 'scripts/newsletterHubRelease.ts', 'inspect', ...common])).stdout);
    assert.deepEqual(inspected.artifacts, planned.artifacts);
    const denied = JSON.parse((await run(process.execPath, ['--import', 'tsx', 'scripts/newsletterHubRelease.ts', 'advance', ...common, '--execute-action', 'prepare-admission', '--plan-sha256', planned.artifacts[0].sha256, '--max-actions', '5'])).stdout);
    assert.deepEqual(denied.holds, ['runtime-authority-unadmitted']);
    assert.ok(!(await readdir(f.dir)).some(name => name.includes('-intent') || name === 'hub-operation.json'));
});
const mainSha = 'e'.repeat(40), oldSlug = '2026-10-26-existing-edition';
const workflow = await readFile(new URL('../.github/workflows/substrate-sync.yml', import.meta.url), 'utf8');
const admissions = await readFile(new URL('../data/hub-essay-admissions.json', import.meta.url), 'utf8');
const compiler = await readFile(new URL('../scripts/compileContent.ts', import.meta.url), 'utf8');
const oldThought = { title: 'An existing edition', preview: 'Existing accepted claim', date: '2026-10-26', category: 'Doctrine', slug: oldSlug, body: 'Existing approved body. Preserve every word.' };
const bundle = (thoughts: any[]) => `export const THOUGHTS: Thought[] = ${JSON.stringify(thoughts)};\nexport const DIAGRAMS: Diagram[] = [];\n`;
const content = (text: string) => {
    const bytes = Buffer.from(text);
    return { type: 'file', encoding: 'base64', size: bytes.length, content: bytes.toString('base64'), sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
};
function nativeFixture(baselineThoughts: any[] = [oldThought], admissionData = admissions, canonicalSource = canonical) {
    const writes: any[] = [];
    const reads: string[] = [];
    const blobs = new Map<string, string>(), binaryBlobs = new Map<string, Buffer>(), trees = new Map<string, any[]>(), commits = new Map<string, any>(), refs = new Map<string, string>(), prs: any[] = [];
    const runs: any[] = [];
    let activeMain = mainSha;
    const putBlob = (raw: string) => {
        const value = content(raw);
        blobs.set(value.sha, raw);
        return value.sha;
    };
    const baseTree = 'f'.repeat(40), baseEntries = [{ path: 'scripts/compileContent.ts', mode: '100644', type: 'blob', sha: putBlob(compiler) }, { path: 'data/hub-essay-admissions.json', mode: '100644', type: 'blob', sha: putBlob(admissionData) }, { path: 'constants.guides.generated.ts', mode: '100644', type: 'blob', sha: putBlob("import type { Guide } from './types'; export const GUIDES: Guide[] = [];") }, { path: 'constants.generated.ts', mode: '100644', type: 'blob', sha: putBlob(bundle(baselineThoughts)) }, { path: '.github/workflows/substrate-sync.yml', mode: '100644', type: 'blob', sha: putBlob(workflow) }, { path: 'README.md', mode: '100644', type: 'blob', sha: putBlob('Unrelated source must remain exactly intact.') }];
    trees.set(baseTree, baseEntries);
    commits.set(mainSha, { sha: mainSha, tree: { sha: baseTree }, parents: [] });
    const readGitHub = async (path: string) => {
        reads.push(path);
        const prefix = '/repos/OrionArchitekton/danmercede.com';
        if (path === `${prefix}/git/ref/heads/main`)
            return { ref: 'refs/heads/main', object: { type: 'commit', sha: activeMain } };
        if (path === `${prefix}/contents/data/hub-essay-admissions.json?ref=${mainSha}`)
            return content(admissionData);
        if (path === `${prefix}/contents/scripts/compileContent.ts?ref=${mainSha}`)
            return content(compiler);
        if (path === `${prefix}/contents/constants.generated.ts?ref=${mainSha}`)
            return content(bundle(baselineThoughts));
        if (path === `${prefix}/contents/.github/workflows/substrate-sync.yml?ref=${mainSha}`)
            return content(workflow);
        if (path === `${prefix}/actions/workflows/substrate-sync.yml`)
            return { id: 292432866, path: '.github/workflows/substrate-sync.yml', state: 'active' };
        if (path === `${prefix}/actions/workflows/substrate-sync.yml/runs?per_page=100&page=1`)
            return { total_count: runs.length, workflow_runs: runs };
        if (path.startsWith(`${prefix}/pulls?`)) {
            const query = new URL('https://api.github.com' + path).searchParams, branch = (query.get('head') ?? '').split(':')[1];
            return prs.filter(p => p.head.ref === branch && (query.get('state') === 'all' || p.state === query.get('state')));
        }
        if (path === `${prefix}/actions/workflows/substrate-verify.yml`)
            return { id: 123456, state: 'active', path: '.github/workflows/substrate-verify.yml' };
        if (path === `${prefix}/actions/runs/777`)
            return { id: 777, check_suite_id: 112471990107, workflow_id: 123456, head_repository: { full_name: 'OrionArchitekton/danmercede.com' }, repository: { full_name: 'OrionArchitekton/danmercede.com' }, head_branch: 'codex/substrate-sync', path: '.github/workflows/substrate-verify.yml', event: 'pull_request_target', head_sha: prs.find(p => p.number === 902)?.head.sha, status: 'completed', conclusion: 'success', pull_requests: [] };
        if (path === `${prefix}/check-suites/112471990107`)
            return { id: 112471990107, head_sha: prs.find(p => p.number === 902)?.head.sha, repository: { full_name: 'OrionArchitekton/danmercede.com' }, app: { id: 15368 }, status: 'completed', conclusion: 'success' };
        if (path.startsWith(`${prefix}/compare/`)) {
            const [base, head] = path.slice(`${prefix}/compare/`.length).split('...');
            const pending = [head], seen = new Set<string>();
            while (pending.length) { const id = pending.pop()!; if (seen.has(id)) continue; seen.add(id); for (const parent of commits.get(id)?.parents ?? []) pending.push(parent.sha); }
            return { status: base === head ? 'identical' : seen.has(base) ? 'ahead' : 'diverged', base_commit: { sha: base }, merge_base_commit: { sha: seen.has(base) ? base : head } };
        }
        if (path.startsWith(`${prefix}/git/commits/`))
            return commits.get(path.slice(`${prefix}/git/commits/`.length));
        if (path.startsWith(`${prefix}/git/trees/`)) {
            const id = path.slice(`${prefix}/git/trees/`.length).split('?')[0];
            return { sha: id, truncated: false, tree: trees.get(id) };
        }
        if (path.startsWith(`${prefix}/git/blobs/`)) {
            const id = path.slice(`${prefix}/git/blobs/`.length), binary = binaryBlobs.get(id);
            return binary ? { sha: id, encoding: 'base64', size: binary.length, content: binary.toString('base64') } : content(blobs.get(id)!);
        }
        if (path.startsWith(`${prefix}/git/matching-refs/heads/`)) {
            const branch = decodeURIComponent(path.slice(`${prefix}/git/matching-refs/heads/`.length));
            return refs.has(branch) ? [{ ref: `refs/heads/${branch}`, object: { type: 'commit', sha: refs.get(branch) } }] : [];
        }
        if (path.startsWith(`${prefix}/pulls/`))
            return prs.find(p => p.number === Number(path.slice(`${prefix}/pulls/`.length)));
        if (path === `${prefix}/branches/main/protection/required_status_checks`)
            return { strict: true, checks: ['build', 'gitleaks', 'required-checks-fail-closed', 'substrate-verify', 'extractability'].map(context => ({ context, app_id: 15368 })) };
        if (path.startsWith(`${prefix}/commits/`) && path.endsWith('/check-runs?per_page=100')) {
            const id = path.split('/commits/')[1].split('/')[0];
            return { total_count: 5, check_runs: ['build', 'gitleaks', 'required-checks-fail-closed', 'substrate-verify', 'extractability'].map((name, i) => ({ id: 100 + i, name, app: { id: 15368 }, head_sha: id, check_suite: { id: 112471990107 }, status: 'completed', conclusion: 'success', details_url: 'https://github.com/OrionArchitekton/danmercede.com/actions/runs/777/job/104' })) };
        }
        if (path.startsWith(`${prefix}/contents/`)) {
            const [p, id] = path.slice(`${prefix}/contents/`.length).split('?ref='), commit = commits.get(id);
            if (commit)
                return content(blobs.get(trees.get(commit.tree.sha)!.find(e => e.path === p).sha)!);
        }
        if (path === `/repos/OrionArchitekton/dan-mercede-substrate/contents/publishing/canonical/${slug}.md?ref=${'c'.repeat(40)}`)
            return content(canonicalSource);
        if (path === '/repos/OrionArchitekton/dan-mercede-substrate/git/ref/heads/main')
            return { ref: 'refs/heads/main', object: { type: 'commit', sha: 'c'.repeat(40) } };
        throw Object.assign(Error('missing fixture route'), { path });
    };
    const writeGitHub = async (method: string, path: string, body: any) => {
        writes.push({ method, path, body });
        const prefix = '/repos/OrionArchitekton/danmercede.com';
        if (path === `${prefix}/git/blobs`) {
            return { sha: putBlob(body.content) };
        }
        if (path === `${prefix}/git/trees`) {
            const entries = trees.get(body.base_tree)!.map(e => body.tree.find((n: any) => n.path === e.path) ?? e), id = sha(JSON.stringify(entries)).slice(0, 40);
            trees.set(id, entries);
            return { sha: id };
        }
        if (path === `${prefix}/git/commits`) {
            const id = sha(JSON.stringify(body)).slice(0, 40), commit = { sha: id, tree: { sha: body.tree }, parents: body.parents.map((sha: string) => ({ sha })), message: body.message };
            commits.set(id, commit);
            return commit;
        }
        if (path === `${prefix}/git/refs`) {
            const branch = body.ref.slice('refs/heads/'.length);
            if (refs.has(branch))
                throw Error('already exists');
            refs.set(branch, body.sha);
            return { ref: body.ref, object: { type: 'commit', sha: body.sha } };
        }
        if (path === `${prefix}/actions/workflows/substrate-sync.yml/dispatches`)
            return null;
        if (path === `${prefix}/pulls`) {
            const pr = { number: 901, state: 'open', draft: true, merged: false, merge_commit_sha: null, html_url: 'https://github.com/OrionArchitekton/danmercede.com/pull/901', body: body.body, title: body.title, head: { ref: body.head, sha: refs.get(body.head), repo: { full_name: 'OrionArchitekton/danmercede.com' } }, base: { ref: 'main', sha: mainSha, repo: { full_name: 'OrionArchitekton/danmercede.com' } } };
            prs.push(pr);
            return pr;
        }
        throw Error('unexpected mutation');
    };
    const mergeAdmission = () => {
        const pr = prs[0];
        pr.state = 'closed';
        pr.merged = true;
        pr.merge_commit_sha = '9'.repeat(40);
        const commit = commits.get(pr.head.sha);
        commits.set(pr.merge_commit_sha, { sha: pr.merge_commit_sha, tree: commit.tree, parents: [{ sha: activeMain }, { sha: pr.head.sha }] });
        activeMain = pr.merge_commit_sha;
        return activeMain;
    };
    const openContent = (expected: any, changed = baselineThoughts, assets: { path: string; bytes: Buffer; mode?: string }[] = []) => {
        const next = [expected, ...changed].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)), tree = trees.get(commits.get(activeMain).tree.sha)!.map(e => e.path === 'constants.generated.ts' ? { ...e, sha: putBlob(bundle(next)) } : e), id = '8'.repeat(40);
        for (const asset of assets) {
            const blob = createHash('sha1').update(`blob ${asset.bytes.length}\0`).update(asset.bytes).digest('hex');
            binaryBlobs.set(blob, asset.bytes);
            const leaf = { path: asset.path, mode: asset.mode ?? '100644', type: 'blob', sha: blob };
            const existing = tree.findIndex(e => e.path === asset.path);
            if (existing < 0) tree.push(leaf); else tree[existing] = leaf;
        }
        const treeSha = sha(JSON.stringify(tree)).slice(0, 40);
        trees.set(treeSha, tree);
        commits.set(id, { sha: id, tree: { sha: treeSha }, parents: [{ sha: activeMain }] });
        refs.set('codex/substrate-sync', id);
        const pr = { number: 902, state: 'open', draft: false, merged: false, merge_commit_sha: null, html_url: 'https://github.com/OrionArchitekton/danmercede.com/pull/902', body: 'Native strict sync output', head: { ref: 'codex/substrate-sync', sha: id, repo: { full_name: 'OrionArchitekton/danmercede.com' } }, base: { ref: 'main', sha: activeMain, repo: { full_name: 'OrionArchitekton/danmercede.com' } } };
        prs.push(pr);
        return pr;
    };
    const mergeContent = () => {
        const pr = prs.find(p => p.number === 902);
        pr.state = 'closed';
        pr.merged = true;
        pr.merge_commit_sha = '7'.repeat(40);
        commits.set(pr.merge_commit_sha, { sha: pr.merge_commit_sha, tree: commits.get(pr.head.sha).tree, parents: [{ sha: activeMain }, { sha: pr.head.sha }] });
        activeMain = pr.merge_commit_sha;
        return activeMain;
    };
    const moveMain = () => {
        const next = '7'.repeat(40);
        commits.set(next, { sha: next, tree: commits.get(activeMain).tree, parents: [{ sha: activeMain }] });
        activeMain = next;
    };
    return { readGitHub, writeGitHub, writes, reads, trees, commits, refs, prs, runs, mergeAdmission, openContent, mergeContent, moveMain, readReviewThreads: async (number: number) => ({ head_sha: prs.find(p => p.number === number)?.head.sha, complete: true, threads: [] }) };
}
test('eligible private plan builds a minimal exact admission patch while default writer remains unadmitted', async (t) => {
    const f = await fixture(t), native = nativeFixture();
    const options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    const result = await planHubRelease(options, native);
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'admission-preparation-ready');
    assert.equal(stage.expected.slug, slug);
    assert.deepEqual(JSON.parse(stage.admission.patch).essay_slugs, [...JSON.parse(admissions).essay_slugs, slug]);
    assert.equal(stage.admission.data_path, 'data/hub-essay-admissions.json');
    assert.equal(stage.admission.original_blob_sha, content(admissions).sha);
    assert.equal(stage.admission.proposed_blob_sha, content(stage.admission.patch).sha);
    assert.equal(stage.admission.original_sha256, sha(admissions));
    assert.equal(stage.admission.base_sha, mainSha);
    assert.deepEqual(JSON.parse(stage.admission.patch).essay_slugs.slice(0, -1), JSON.parse(admissions).essay_slugs);
    const blocked = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: result.artifacts[0].sha256, maxActions: 6 }, native);
    assert.equal(blocked.status, 'held');
    assert.deepEqual(blocked.holds, ['runtime-authority-unadmitted']);
    assert.equal(native.writes.length, 0);
});
test('arbitrary unmerged canonical objects do not establish protected-main source admission', async (t) => {
    const f = await fixture(t), native = nativeFixture(), unmerged = '7'.repeat(40);
    const request = { ...f.request, canonical: { ...f.request.canonical, commit: unmerged } };
    await writeFile(f.path, JSON.stringify(request), { mode: 0o600 });
    const readGitHub = async (path: string) => path.includes(`/compare/${unmerged}...`)
        ? { status: 'diverged', base_commit: { sha: unmerged }, merge_base_commit: { sha: '6'.repeat(40) } }
        : path.endsWith(`?ref=${unmerged}`) ? content(canonical) : native.readGitHub(path);
    const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, { ...native, readGitHub });
    assert.equal(result.status, 'held');
    assert.ok(result.holds.includes('canonical-not-on-protected-main'));
    assert.equal(native.writes.length, 0);
});
test('separate strict content PR preserves unrelated newer edition and remains human-required after exact parity', async (t) => {
    const f = await fixture(t), newer = { ...oldThought, slug: '2026-11-09-a-newer-edition', title: 'A newer released edition', date: '2026-11-09' }, native = nativeFixture([newer, oldThought]);
    const options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, authorize = async (context: any) => ({ admitted: true, ...context, checked_at: options.now, expires_at: '2026-11-09T17:00:00Z', stopped: false, grant_ref: 'fixture:scoped-authorizer' });
    let planned = await planHubRelease(options, native);
    let stage = JSON.parse(await readFile(join(f.dir, planned.artifacts[0].ref), 'utf8'));
    const expected = stage.expected;
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: planned.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(options.now) });
    native.mergeAdmission();
    native.openContent(expected);
    options.now = '2026-11-16T16:25:00Z';
    planned = await planHubRelease(options, native);
    stage = JSON.parse(await readFile(join(f.dir, planned.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'content-pr-awaiting-merge');
    assert.equal(stage.content_pr.number, 902);
    assert.equal(stage.content_pr.copy_parity, true);
    assert.equal(stage.content_pr.required_checks_passed, true);
    assert.deepEqual(stage.content_pr.latest_slugs, [newer.slug, slug, oldSlug]);
    assert.equal(planned.status, 'held');
    assert.ok(planned.holds.includes('HUMAN_REQUIRED'));
    assert.equal(native.writes.length, 5);
    const missingProtection = await planHubRelease(options, {
        ...native,
        readGitHub: async (path: string) => path.endsWith('/protection/required_status_checks')
            ? { strict: true, checks: [{ context: 'build', app_id: 15368 }] }
            : native.readGitHub(path),
    });
    assert.equal(JSON.parse(await readFile(join(f.dir, missingProtection.artifacts[0].ref), 'utf8')).stage, 'content-pr-unverified');
    const forgedOrigin = await planHubRelease(options, {
        ...native,
        readGitHub: async (path: string) => {
            const value = await native.readGitHub(path);
            return path.endsWith('/actions/runs/777') ? { ...value, workflow_id: 654321 } : value;
        },
    });
    assert.ok(forgedOrigin.holds.includes('trusted-check-origin-unverified'));
    const unresolved = await planHubRelease(options, {
        ...native,
        readReviewThreads: async () => ({ head_sha: '8'.repeat(40), complete: true, threads: [{ id: 'thread', isResolved: false }] }),
    });
    assert.ok(unresolved.holds.includes('review-threads-unverified'));
    assert.equal(native.writes.length, 5);
    const mergedSha = native.mergeContent();
    const afterMerge = await planHubRelease(options, native);
    const mergedStage = JSON.parse(await readFile(join(f.dir, afterMerge.artifacts[0].ref), 'utf8'));
    assert.equal(mergedStage.stage, 'already-source-synced');
    assert.equal(mergedStage.source.main_sha, mergedSha);
    assert.equal(mergedStage.public_delivery, 'unknown');
    const readerUnverified = await reconcileHubRelease(options, {
        ...native,
        readGitHub: async (path: string) => {
            if (path.includes('/deployments?')) throw Error('fixture: no production proof');
            return native.readGitHub(path);
        },
        fetchPublic: async () => { throw Error('fixture: no public proof'); },
    });
    assert.equal(readerUnverified.status, 'held');
    assert.equal(JSON.parse(await readFile(join(f.dir, readerUnverified.artifacts[0].ref), 'utf8')).public_delivery, 'unknown');
    assert.equal(native.writes.length, 5);
});
test('missed sync waits for nominal grace and sends once, leaving uncertain dispatch unattributed across restarts', async (t) => {
    const f = await fixture(t), native = nativeFixture(), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: options.now, expires_at: '2026-11-09T17:00:00Z', stopped: false, grant_ref: 'fixture:scoped-authorizer' });
    const deps = { ...native, authorize, clock: () => Date.parse(options.now) };
    let plan = await planHubRelease(options, native);
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: plan.artifacts[0].sha256, maxActions: 5 }, deps);
    native.mergeAdmission();
    options.now = '2026-11-09T16:24:59Z';
    plan = await planHubRelease(options, native);
    let stage = JSON.parse(await readFile(join(f.dir, plan.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'waiting-for-scheduled-sync');
    const before = await advanceHubRelease({ ...options, action: 'recover-sync', planSha256: plan.artifacts[0].sha256, maxActions: 1 }, deps);
    assert.equal(native.writes.length, 5);
    assert.equal(before.status, 'held');
    options.now = '2026-11-09T16:25:00Z';
    plan = await planHubRelease(options, native);
    const dispatch = { ...options, action: 'recover-sync', planSha256: plan.artifacts[0].sha256, maxActions: 1 };
    const result = await advanceHubRelease(dispatch, deps);
    assert.equal(native.writes.length, 6);
    assert.equal(result.status, 'unknown');
    assert.deepEqual(native.writes[5], { method: 'POST', path: '/repos/OrionArchitekton/danmercede.com/actions/workflows/substrate-sync.yml/dispatches', body: { ref: 'main' } });
    const again = await advanceHubRelease(dispatch, deps);
    assert.equal(native.writes.length, 6);
    assert.equal(again.status, 'unknown');
    const reconciled = await reconcileHubRelease(options, deps);
    assert.equal(reconciled.status, 'unknown');
    const state = JSON.parse(await readFile(join(f.dir, reconciled.artifacts[0].ref), 'utf8'));
    assert.equal(state.step, 'sync');
    assert.equal(state.sync_attempt.attributed, false);
    assert.equal(state.sync_attempt.native_run_id, null);
    assert.equal(native.writes.length, 6);
});
test('authorized admission action creates only its data patch and separate draft PR with durable sub-write readbacks', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const planned = await planHubRelease(options, native);
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:scoped-authorizer' });
    const result = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: planned.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    assert.equal(native.writes.length, 5);
    assert.equal(native.prs.length, 1);
    assert.equal(native.prs[0].draft, true);
    assert.equal(native.writes[1].body.tree.length, 1);
    assert.equal(native.writes[1].body.tree[0].path, 'data/hub-essay-admissions.json');
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'admission-pr-awaiting-merge');
    assert.equal(stage.admission_pr.number, 901);
    assert.equal(stage.merge_gate, 'HUMAN_REQUIRED');
    assert.equal(stage.public_delivery, 'unknown');
    const again = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: planned.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    assert.equal(native.writes.length, 5);
    assert.equal(again.status, 'held');
    assert.ok(again.holds.includes('HUMAN_REQUIRED'));
});
test('unknown native sub-write is never resent and verified reconciliation resumes only unstarted steps', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const planned = await planHubRelease(options, native), advance = { ...options, action: 'prepare-admission', planSha256: planned.artifacts[0].sha256, maxActions: 5 };
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:scoped-authorizer' });
    let lose = true;
    const deps = { ...native, authorize, clock: () => Date.parse(now), writeGitHub: async (...args: any[]) => {
            const response = await (native.writeGitHub as any)(...args);
            if (lose) {
                lose = false;
                throw Error('transport lost after provider effect');
            }
            return response;
        } };
    const unknown = await advanceHubRelease(advance, deps);
    assert.equal(unknown.status, 'unknown');
    assert.equal(native.writes.length, 1);
    const retry = await advanceHubRelease(advance, deps);
    assert.equal(retry.status, 'unknown');
    assert.equal(native.writes.length, 1);
    await reconcileHubRelease(options, deps);
    assert.equal(native.writes.length, 1);
    const resumed = await advanceHubRelease(advance, deps);
    assert.equal(native.writes.length, 5);
    assert.equal(native.prs.length, 1);
    assert.ok(resumed.holds.includes('HUMAN_REQUIRED'));
});
test('initial HTML and revision parity alone cannot claim hydrated public delivery', async (t) => {
    const f = await fixture(t), native = nativeFixture(), planned = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, native), stage = JSON.parse(await readFile(join(f.dir, planned.artifacts[0].ref), 'utf8'));
    const target = stage.expected, thoughts = [target, oldThought], url = `https://www.danmercede.com/thoughts/${slug}`, origin = 'https://www.danmercede.com';
    const article = `<article><div><span>${target.category}</span><span>${target.date}</span></div><h1>${target.title}</h1><p>${target.preview}</p>${renderToStaticMarkup(React.createElement(Markdown, { source: target.body }))}</article>`;
    const html = `<html><head><link rel="canonical" href="${url}"></head><body><div id="root">${article}</div></body></html>`;
    const responses: any = { [url]: html, [`${origin}/thoughts`]: `<div id="root"><section aria-labelledby="latest-releases-heading"><a href="/thoughts/${slug}">Latest</a><a href="/thoughts/${oldSlug}">Previous</a></section></div>`, [`${origin}/sitemap.xml`]: `<urlset><url><loc>${url}</loc></url></urlset>`, [`${origin}/feed.xml`]: renderRss(thoughts, []), [`${origin}/atom.xml`]: renderAtom(thoughts, []) };
    const fetchPublic = async (link: string) => link === `${origin}/deployment-revision.json` ? new Response(JSON.stringify({ schemaVersion: 1, sha: mainSha }), { headers: { 'cache-control': 'no-store' } }) : link.startsWith(`${origin}/thoughts/fcn-reader-invalid-`) ? new Response('Not found', { status: 404 }) : new Response(responses[link] ?? 'not found', { status: responses[link] ? 200 : 404 });
    const readGitHub = async (path: string) => path.includes('/deployments?') ? [{ id: 123, sha: mainSha, environment: 'Production', creator: { login: 'vercel[bot]' } }] : path.includes('/deployments/123/statuses?') ? [{ state: 'success', environment_url: 'https://danmercede-com-qualified.vercel.app', creator: { login: 'vercel[bot]' } }] : path.includes('/statuses?') ? [{ state: 'success', context: 'Vercel', creator: { login: 'vercel[bot]' }, target_url: 'https://vercel.com/dan-mercedes-projects/danmercede-com/testdeployment' }] : native.readGitHub(path);
    const input = { operation_id: f.request.operation_id, input_sha256: sha(f.raw), main_sha: mainSha, target, thoughts, cta: f.request.cta };
    const result = await verifyHubReader(input, { readGitHub, fetchPublic });
    assert.equal(result.public_delivery, 'unknown');
    assert.equal(result.stage, 'hydrated-reader-unqualified');
    assert.equal(result.initial.invalid_route_status, 404);
    const atomUrl = `${origin}/atom.xml`, acceptedAtom = responses[atomUrl];
    responses[atomUrl] = acceptedAtom.replace(`href="${url}"`, 'href="https://www.danmercede.com/thoughts/wrong-entry"');
    await assert.rejects(verifyHubReader(input, { readGitHub, fetchPublic }), /public-feed-entry-mismatch/);
    responses[atomUrl] = acceptedAtom.replace(`<link href="${url}" rel="alternate"`, `<link href="${url}"`);
    assert.equal((await verifyHubReader(input, { readGitHub, fetchPublic })).stage, 'hydrated-reader-unqualified');
    responses[atomUrl] = acceptedAtom;
    responses[url] = html.replace('Retain its identifier', 'Lose its identifier');
    await assert.rejects(verifyHubReader(input, { readGitHub, fetchPublic }), /public-body-mismatch/);
    responses[url] = html;
    let hydratedArticle = article, afterTimeOrigin = 1234, articleVisible = true, closed = false, count = 0;
    const profile = { id: 'fixture-signed-out-browser', admission: 'admitted-read-only-public', recipe: 'hub-public-reader-v1', owns_isolated_session: true, signed_out: true, input_sha256: input.input_sha256, qualification_ref: 'fixture:qualified-recipe-executor', tool_sha256: 'e'.repeat(64) };
    const browserRuntime = { profile, execute: async (argv: string[]) => {
            let data: any = { done: true };
            if (argv[0] === 'close')
                closed = true;
            if (argv[0] === 'eval') {
                const script = Buffer.from(argv[2], 'base64').toString();
                let value: any;
                if (script.includes("capture_kind:'index'"))
                    value = { capture_kind: 'index', url: `${origin}/thoughts`, time_origin: 1234, target_count: 1, latest_hrefs: [`/thoughts/${slug}`, `/thoughts/${oldSlug}`] };
                else if (script.includes("capture_kind:'article'"))
                    value = { capture_kind: 'article', url, time_origin: afterTimeOrigin, article_html: hydratedArticle, article_visible: articleVisible, images_ready: true, latest_hrefs: [`/thoughts/${slug}`, `/thoughts/${oldSlug}`], cta_href: null };
                else if (script.includes('images_loaded:true')) value = { images_loaded: true, image_count: 0 };
                else if (script.includes("fetch('/deployment-revision.json'"))
                    value = { schemaVersion: 1, sha: mainSha };
                else
                    value = { clicked: true };
                data = { result: JSON.stringify(value) };
            }
            return { exit_code: 0, profile_id: profile.id, command_sha256: sha(JSON.stringify(argv)), run_id: `fixture-browser-execution-${++count}`, stdout: JSON.stringify({ success: true, data }) };
        } };
    const full = await verifyHubReader(input, { readGitHub, fetchPublic, browserRuntime });
    assert.equal(full.public_delivery, 'verified');
    assert.equal(full.hydrated.client_navigation_proven, true);
    assert.equal(closed, true);
    hydratedArticle = article.replace('Retain its identifier', 'Hydrated copy changed');
    await assert.rejects(verifyHubReader(input, { readGitHub, fetchPublic, browserRuntime }), /public-body-mismatch/);
    hydratedArticle = article;
    afterTimeOrigin = 1235;
    await assert.rejects(verifyHubReader(input, { readGitHub, fetchPublic, browserRuntime }), /hydrated-client-navigation-unverified/);
    afterTimeOrigin = 1234;
    articleVisible = false;
    await assert.rejects(verifyHubReader(input, { readGitHub, fetchPublic, browserRuntime }), /hydrated-article-not-visible/);
});

test('scoped authority, expiry, stop and fixed drain remain fail-closed before any native write', async (t) => {
    for (const failure of ['stop', 'binding', 'expired', 'drain']) {
        const f = await fixture(t), native = nativeFixture();
        const now = failure === 'drain' ? '2026-12-09T08:00:00Z' : '2026-11-09T15:05:00Z';
        const options = { requestPath: f.path, jobDir: f.dir, now };
        const plan = await planHubRelease(options, native);
        const authorize = async (context: any) => ({
            admitted: true, ...context, checked_at: now,
            expires_at: failure === 'expired' ? now : '2026-11-09T15:10:00Z',
            stopped: failure === 'stop', grant_ref: 'fixture:grant',
            ...(failure === 'binding' ? { input_sha256: '0'.repeat(64) } : {}),
        });
        const result = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: plan.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
        assert.equal(result.status, 'held', failure);
        assert.equal(native.writes.length, 0, failure);
    }
});

test('a bounded partial admission resumes only remaining steps under fresh authority', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z';
    const options = { requestPath: f.path, jobDir: f.dir, now };
    const plan = await planHubRelease(options, native);
    const deps = { ...native, clock: () => Date.parse(now), authorize: async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:grant' }) };
    const advance = { ...options, action: 'prepare-admission', planSha256: plan.artifacts[0].sha256, maxActions: 1 };
    const partial = await advanceHubRelease(advance, deps);
    assert.ok(partial.holds.includes('action-budget-exhausted'));
    assert.equal(native.writes.length, 1);
    const finished = await advanceHubRelease({ ...advance, maxActions: 4 }, deps);
    assert.equal(native.writes.length, 5);
    assert.equal(native.prs.length, 1);
    assert.ok(finished.holds.includes('HUMAN_REQUIRED'));
});

test('protected canonical ancestor requires unchanged current-main file bytes', async (t) => {
    const f = await fixture(t), native = nativeFixture(), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    const source = '/repos/OrionArchitekton/dan-mercede-substrate', current = 'd'.repeat(40);
    let changed = false;
    const readGitHub = async (path: string) => {
        if (path === `${source}/git/ref/heads/main`) return { ref: 'refs/heads/main', object: { type: 'commit', sha: current } };
        if (path === `${source}/compare/${f.request.canonical.commit}...${current}`) return { status: 'ahead', base_commit: { sha: f.request.canonical.commit }, merge_base_commit: { sha: f.request.canonical.commit } };
        if (path === `${source}/contents/${f.request.canonical.path}?ref=${current}`) return content(changed ? canonical + '\nChanged protected file.\n' : canonical);
        return native.readGitHub(path);
    };
    let result = await planHubRelease(options, { ...native, readGitHub });
    assert.equal(result.status, 'completed');
    changed = true;
    result = await planHubRelease(options, { ...native, readGitHub });
    assert.ok(result.holds.includes('canonical-protected-main-mismatch'));
    assert.equal(native.writes.length, 0);
});

test('an admitted fixture grant without a writer cannot reserve a native attempt', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z';
    const options = { requestPath: f.path, jobDir: f.dir, now };
    const plan = await planHubRelease(options, native);
    const { writeGitHub: omitted, ...readOnlyNative } = native;
    const result = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: plan.artifacts[0].sha256, maxActions: 5 }, {
        ...readOnlyNative, clock: () => Date.parse(now), authorize: async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:grant' }),
    });
    assert.ok(result.holds.includes('native-writer-unqualified'));
    assert.equal((await readdir(f.dir)).some(name => name.endsWith('-intent.json')), false);
    assert.equal(native.writes.length, 0);
});

test('optional admission preview preserves default compiler admission and generated bytes', () => {
    const parsed = parseCanonicalMarkdown(canonical);
    const targetData = { ...parsed.data, surface_targets: ['danmercede.com'] };
    const defaultEntry = mapSubstrateToEntry(targetData, parsed.content.trim(), 'fixture.md');
    const explicitEntry = mapSubstrateToEntry(targetData, parsed.content.trim(), 'fixture.md', [], HUB_ESSAY_ALLOWLIST, () => {});
    assert.ok(defaultEntry && explicitEntry);
    assert.equal(generateOutput([defaultEntry]), generateOutput([explicitEntry]));
    const before = [...HUB_ESSAY_ALLOWLIST];
    assert.equal(mapSubstrateToEntry(parsed.data, parsed.content.trim(), 'fixture.md', [], undefined, () => {}), null);
    assert.ok(mapSubstrateToEntry(parsed.data, parsed.content.trim(), 'fixture.md', [], [...HUB_ESSAY_ALLOWLIST, slug], () => {}));
    assert.equal(mapSubstrateToEntry(parsed.data, parsed.content.trim(), 'fixture.md', [], undefined, () => {}), null);
    assert.deepEqual(HUB_ESSAY_ALLOWLIST, before);
});

test('publication eligibility uses the exact digest-verified bytes even if its pathname changes after close', async (t) => {
    const f = await fixture(t), originalOpen = fsPromises.open;
    const earlier = JSON.parse(f.snapshotRaw);
    earlier.editions[0].published_at = '2026-10-26T15:02:46Z';
    earlier.editions[0].observed_at = '2026-10-26T15:10:00Z';
    let swapped = false;
    fsPromises.open = (async (...args: any[]) => {
        const handle = await (originalOpen as any)(...args);
        if (args[0] === f.snapshotPath && !swapped) {
            swapped = true;
            const close = handle.close.bind(handle);
            handle.close = async () => {
                await close();
                await writeFile(f.snapshotPath, JSON.stringify(earlier), { mode: 0o600 });
            };
        }
        return handle;
    }) as typeof fsPromises.open;
    syncBuiltinESMExports();
    try {
        const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-08T15:05:00Z' }, { readGitHub: async () => { throw Error('must not read'); } });
        assert.ok(swapped);
        assert.deepEqual(result.holds, ['seven-days-not-elapsed']);
    } finally {
        fsPromises.open = originalOpen;
        syncBuiltinESMExports();
    }
});

test('a replaced private-root ancestor cannot redirect a reserved artifact outside the admitted root', async (t) => {
    const f = await fixture(t), parent = join(f.dir, 'parent'), moved = join(f.dir, 'parked'), outside = join(f.dir, 'outside');
    await mkdir(parent, { mode: 0o700 });
    await mkdir(join(parent, 'job'), { mode: 0o700 });
    await mkdir(outside, { mode: 0o700 });
    await mkdir(join(outside, 'job'), { mode: 0o700 });
    const originalOpen = fsPromises.open;
    let swapped = false;
    fsPromises.open = (async (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].endsWith('/job') && !swapped) {
            swapped = true;
            await rename(parent, moved);
            await symlink(outside, parent);
        }
        return (originalOpen as any)(...args);
    }) as typeof fsPromises.open;
    syncBuiltinESMExports();
    try {
        await assert.rejects(async () => {
            const root = await privateRoot(join(parent, 'job'));
            try { await root.put('probe.json', { probe: true }); } finally { await root.close(); }
        });
        assert.ok(swapped);
        assert.deepEqual(await readdir(join(outside, 'job')), []);
    } finally {
        fsPromises.open = originalOpen;
        syncBuiltinESMExports();
    }
});

test('read-only inspection orders mixed explicit offsets by actual instant', async (t) => {
    const f = await fixture(t), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T07:00:00-08:00' };
    const latest = await planHubRelease(options);
    await planHubRelease({ ...options, now: '2026-11-09T14:59:00Z' });
    const result = await inspectHubRelease({ ...options, now: '2026-11-09T15:01:00Z' });
    assert.deepEqual(result.artifacts, latest.artifacts);
});

test('emitted browser recipe follows the actual CTA and rejects an invisible ancestor', async () => {
    const url = `https://www.danmercede.com/thoughts/${slug}`;
    const ctaUrl = 'https://www.orionintelligenceagency.com/readiness-scan?utm_source=linkedin&utm_content=fixture';
    const cta = { kind: 'external', text: 'Work with my agency on one workflow', url: ctaUrl };
    const input = { operation_id: 'fixture-browser-recipe', input_sha256: 'a'.repeat(64), sha: mainSha, slug, cta };
    const dom = new JSDOM(`<body><div id="root"><section aria-labelledby="latest-releases-heading"><a href="/thoughts/${slug}">Latest</a></section><article><p>Visible body</p><a href="${ctaUrl.replaceAll('&', '&amp;')}">${cta.text}</a></article></div></body>`, { url: 'https://www.danmercede.com/thoughts' });
    Object.defineProperty(dom.window.Element.prototype, 'getClientRects', { value: () => [{ width: 200, height: 100 }] });
    const location = { href: 'https://www.danmercede.com/thoughts', assign(value: string) { this.href = value; } };
    dom.window.document.querySelector('a')!.click = () => { location.href = url; };
    Object.defineProperty(dom.window.document.body, 'innerText', { get: () => 'Readiness Scan' });
    const profile = { id: 'fixture-script-browser', admission: 'admitted-read-only-public', recipe: 'hub-public-reader-v1', owns_isolated_session: true, signed_out: true, input_sha256: input.input_sha256, qualification_ref: 'fixture:emitted-script', tool_sha256: 'b'.repeat(64) };
    let sequence = 0;
    const runtime = { profile, execute: async (argv: string[]) => {
        let data: any = { done: true };
        if (argv[0] === 'eval') {
            const script = Buffer.from(argv[2], 'base64').toString();
            data = { result: await runInNewContext(script, { document: dom.window.document, location, performance: { timeOrigin: 100 }, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), scrollX: 0, scrollY: 0, scrollTo: () => {}, requestAnimationFrame: (f: any) => f(), setTimeout, clearTimeout, fetch: async () => new Response(JSON.stringify({ schemaVersion: 1, sha: mainSha }), { headers: { 'cache-control': 'no-store' } }) }) };
        }
        return { exit_code: 0, profile_id: profile.id, command_sha256: sha(JSON.stringify(argv)), run_id: `fixture-script-${++sequence}`, stdout: JSON.stringify({ success: true, data }) };
    } };
    const actual = await readHydratedHub(input, runtime);
    assert.equal(actual.cta.final_url, ctaUrl);
    assert.equal(actual.cta.form_submitted, false);
    location.href = 'https://www.danmercede.com/thoughts';
    dom.window.document.body.style.opacity = '0';
    await assert.rejects(readHydratedHub(input, runtime), /hydrated-article-not-visible/);
    dom.window.document.body.style.opacity = '1';
    const image = dom.window.document.createElement('img');
    image.src = 'https://www.danmercede.com/assets/fixture.webp';
    const figure = dom.window.document.createElement('figure');
    figure.appendChild(image);
    dom.window.document.querySelector('article')!.appendChild(figure);
    let imageReady = false, lazy = false;
    Object.defineProperty(image, 'complete', { get: () => imageReady });
    Object.defineProperty(image, 'naturalWidth', { get: () => imageReady ? 200 : 0 });
    Object.defineProperty(image, 'naturalHeight', { get: () => imageReady ? 100 : 0 });
    image.scrollIntoView = () => { if (lazy) imageReady = true; };
    image.decode = async () => { if (!imageReady) throw Error('broken fixture image'); };
    location.href = 'https://www.danmercede.com/thoughts';
    await assert.rejects(readHydratedHub(input, runtime), /(?:image|browser)-/);
    imageReady = true;
    image.style.opacity = '0';
    location.href = 'https://www.danmercede.com/thoughts';
    await assert.rejects(readHydratedHub(input, runtime), /hydrated-images-unready/);
    image.style.opacity = '1';
    imageReady = false;
    lazy = true;
    location.href = 'https://www.danmercede.com/thoughts';
    assert.equal((await readHydratedHub(input, runtime)).images_ready, true);
    dom.window.close();
});

test('captured native trusted checks bind their suite even when native PR arrays are empty', async () => {
    const base = new URL('./fixtures/hub-native-provenance/', import.meta.url);
    const nativeRun = JSON.parse(await readFile(new URL('run.json', base), 'utf8'));
    const nativeSuite = JSON.parse(await readFile(new URL('suite.json', base), 'utf8'));
    const [nativeCheck] = JSON.parse(await readFile(new URL('checks.json', base), 'utf8'));
    const manifest = JSON.parse(await readFile(new URL('manifest.json', base), 'utf8'));
    for (const [name, hash] of Object.entries(manifest.files)) assert.equal(sha(await readFile(new URL(name, base))), hash);
    assert.deepEqual(nativeRun.pull_requests, []);
    assert.deepEqual(nativeSuite.pull_requests, []);
    const pr = { head: { sha: nativeRun.head_sha, ref: nativeRun.head_branch } };
    let badSuite = false;
    const read = async (path: string) => {
        if (path.endsWith('/actions/workflows/substrate-verify.yml')) return { id: nativeRun.workflow_id, path: nativeRun.path, state: 'active' };
        if (path.endsWith(`/actions/runs/${nativeRun.id}`)) return nativeRun;
        if (path.endsWith(`/check-suites/${nativeSuite.id}`)) return badSuite ? { ...nativeSuite, head_sha: '0'.repeat(40) } : nativeSuite;
        throw Error('unexpected fixture route');
    };
    await verifyTrustedHubCheck(pr, nativeCheck, read);
    badSuite = true;
    await assert.rejects(verifyTrustedHubCheck(pr, nativeCheck, read), /trusted-check-origin-unverified/);
    badSuite = false;
    await assert.rejects(verifyTrustedHubCheck(pr, { ...nativeCheck, check_suite: { id: nativeSuite.id + 1 } }, read), /trusted-check-origin-unverified/);
});

test('reconciliation rejects replacement of its newly emitted content-addressed plan before semantic use', async (t) => {
    const f = await fixture(t), originalOpen = fsPromises.open;
    let replaced = false;
    fsPromises.open = (async (...args: any[]) => {
        const handle = await (originalOpen as any)(...args);
        if (typeof args[0] === 'string' && /\/hub-plan-[a-f0-9]{64}\.json$/.test(args[0]) && !replaced) {
            replaced = true;
            const close = handle.close.bind(handle);
            handle.close = async () => {
                await close();
                const path = join(f.dir, basename(args[0]));
                const changed = JSON.parse(await readFile(path, 'utf8'));
                changed.stage = 'content-pr-awaiting-merge';
                await writeFile(path, JSON.stringify(changed), { mode: 0o600 });
            };
        }
        return handle;
    }) as typeof fsPromises.open;
    syncBuiltinESMExports();
    try {
        await assert.rejects(reconcileHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:02:45Z' }, { readGitHub: async () => { throw Error('must not read'); } }), /artifact-(digest|binding)-mismatch/);
        assert.ok(replaced);
    } finally {
        fsPromises.open = originalOpen;
        syncBuiltinESMExports();
    }
});

test('journal recovers only a verified same-inode crash link and preserves unrelated private work', async (t) => {
    const f = await fixture(t), root = await privateRoot(f.dir, { recoverCrashLinks: true });
    const value = { schema_version: 1, kind: 'hub-operation', operation_id: f.request.operation_id, input_sha256: sha(f.raw), week: f.request.week, slug };
    try {
        await root.put('hub-operation.json', value);
        const orphan = join(f.dir, '.hub-11111111-2222-3333-4444-555555555555');
        const unrelated = join(f.dir, '.hub-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        await link(join(f.dir, 'hub-operation.json'), orphan);
        const inspectRoot = await privateRoot(f.dir);
        try { await assert.rejects(inspectRoot.get('hub-operation.json'), /private-file-unusable/); } finally { await inspectRoot.close(); }
        assert.ok((await readdir(f.dir)).includes(basename(orphan)));
        await writeFile(unrelated, 'Preserve unrelated private work.', { mode: 0o600 });
        assert.deepEqual((await root.get('hub-operation.json'))?.value, value);
        assert.ok(!(await readdir(f.dir)).includes(basename(orphan)));
        assert.equal(await readFile(unrelated, 'utf8'), 'Preserve unrelated private work.');
        await link(f.path, join(f.dir, 'unrelated-request-link'));
        await assert.rejects(planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:02:45Z' }), /private-file-unusable/);
    } finally { await root.close(); }
});

test('actual hub CLI import never executes replaced generated corpora', async (t) => {
    const f = await fixture(t), runtime = join(f.dir, 'runtime'), marker = join(f.dir, 'corpus-executed');
    await mkdir(runtime, { mode: 0o700 });
    const closure = ['scripts/hubEssayAdmissions.mjs', 'data/hub-essay-admissions.json', 'scripts/newsletterHubRelease.ts', 'scripts/newsletterHubReleaseJournal.ts', 'scripts/newsletterHubReleaseReader.ts', 'scripts/newsletterHubReleaseBrowser.ts', 'scripts/newsletterHubInstalledBrowser.ts', 'scripts/newsletterHubReadiness.mjs', 'scripts/compileContent.ts', 'scripts/renderFeed.ts', 'scripts/renderFeedCore.ts', 'scripts/verifyProductionDeployment.mjs', 'components/Markdown.tsx', 'thoughtsIndex.ts', 'seoMeta.ts', 'siteOrigin.ts', 'constants.ts', 'types.ts', 'package.json', 'tsconfig.json'];
    for (const path of closure) {
        let raw: Buffer;
        try { raw = await readFile(new URL('../' + path, import.meta.url)); } catch (error: any) { if (error.code === 'ENOENT') continue; throw error; }
        await mkdir(dirname(join(runtime, path)), { recursive: true, mode: 0o700 });
        await writeFile(join(runtime, path), raw, { mode: 0o600 });
    }
    const malicious = `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'executed'); export const THOUGHTS = []; export const DIAGRAMS = []; export const GUIDES = [];`;
    await writeFile(join(runtime, 'constants.generated.ts'), malicious);
    await writeFile(join(runtime, 'constants.guides.generated.ts'), malicious);
    await symlink(new URL('../node_modules', import.meta.url).pathname, join(runtime, 'node_modules'), 'dir');
    const run = promisify(execFile);
    await run(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', `await import(${JSON.stringify(join(runtime, 'scripts/newsletterHubRelease.ts'))})`], { cwd: runtime });
    assert.ok(!(await readdir(f.dir)).includes('corpus-executed'));
});

test('pure feed core preserves prior fixed-fixture bytes and existing default API', async () => {
    const pure = await import('../scripts/renderFeedCore.ts');
    const { THOUGHTS } = await import('../constants.generated.ts');
    const { GUIDES } = await import('../constants.guides.generated.ts');
    const thought = { ...oldThought, slug: '2026-10-26-existing-edition' };
    assert.equal(sha(pure.renderRss([thought], [])), 'c9331e46ad4a10aaf905f7f9761b39e4fe02e5d718332b8b0a5eeddf0a9892b8');
    assert.equal(sha(pure.renderAtom([thought], [])), 'e769473eb31c8e94ef0ecf2052ce3180a3f4ce64f4521bfff91da94c0c4cc23b');
    assert.equal(pure.renderRss(THOUGHTS, GUIDES), renderRss());
    assert.equal(pure.renderAtom(THOUGHTS, GUIDES), renderAtom());
});

test('admission data must match its exact protected base tree leaf before preparation', async (t) => {
    const f = await fixture(t), native = nativeFixture();
    const deps = { ...native, readGitHub: async (path: string) => {
        const value = await native.readGitHub(path);
        if (path.includes('/git/trees/') && path.endsWith('?recursive=1')) return { ...value, tree: value.tree.map((e: any) => e.path === 'data/hub-essay-admissions.json' ? { ...e, sha: '0'.repeat(40) } : e) };
        return value;
    } };
    const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, deps);
    assert.equal(result.status, 'held');
    assert.equal(native.writes.length, 0);
});

test('admission writer refuses second slugs, reorder, removal and unrelated base leaves before any write', async (t) => {
    for (const change of ['second-slug', 'reorder', 'remove', 'tree-leaf']) {
        const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
        const planned = await planHubRelease(options, native);
        const stage = JSON.parse(await readFile(join(f.dir, planned.artifacts[0].ref), 'utf8'));
        if (change === 'tree-leaf') stage.admission.base_tree.find((e: any) => e.path === 'README.md').sha = '0'.repeat(40);
        else {
            const data = JSON.parse(stage.admission.patch);
            if (change === 'second-slug') data.essay_slugs.push('unrequested-slug');
            if (change === 'reorder') [data.essay_slugs[0], data.essay_slugs[1]] = [data.essay_slugs[1], data.essay_slugs[0]];
            if (change === 'remove') data.essay_slugs.shift();
            stage.admission.patch = JSON.stringify(data, null, 2) + '\n';
            stage.admission.patch_sha256 = sha(stage.admission.patch);
            stage.admission.proposed_blob_sha = content(stage.admission.patch).sha;
            stage.admission.allowlist = data.essay_slugs;
        }
        const bytes = JSON.stringify(stage, null, 2) + '\n', digest = sha(bytes);
        await writeFile(join(f.dir, `hub-plan-${digest}.json`), bytes, { mode: 0o600, flag: 'wx' });
        const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:bounded-authorizer' });
        const result = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: digest, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
        assert.equal(result.status, 'held', change);
        assert.equal(native.writes.length, 0, change);
    }
});

test('full admission list cannot produce an invalid over-capacity proposal', async (t) => {
    const f = await fixture(t), raw = JSON.stringify({ schema_version: 1, essay_slugs: Array.from({ length: 1000 }, (_, i) => `existing-${i}`) }), native = nativeFixture([oldThought], raw);
    const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, native);
    assert.equal(result.status, 'held');
    assert.equal(native.writes.length, 0);
});

test('read-only reconcile appends an exact admission-merged generation proof', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native);
    const originalBytes = await readFile(join(f.dir, original.artifacts[0].ref));
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    const merge = native.mergeAdmission(), writesBefore = native.writes.length;
    const observed = await reconcileHubRelease(options, native);
    const stage = JSON.parse(await readFile(join(f.dir, observed.artifacts[0].ref), 'utf8'));
    assert.equal(stage.data_generations.length, 1);
    const reference = stage.data_generations[0], bytes = await readFile(join(f.dir, reference.ref));
    assert.equal(sha(bytes), reference.sha256);
    const proof = JSON.parse(bytes.toString());
    assert.equal(proof.transition, 'admission-merged');
    assert.equal(proof.operation_id, f.request.operation_id);
    assert.equal(proof.input_sha256, original.input_sha256);
    assert.deepEqual(proof.original_plan, original.artifacts[0]);
    assert.equal(proof.predecessor.commit, mainSha);
    assert.equal(proof.successor.commit, merge);
    assert.equal(proof.pr.number, 901);
    assert.equal(proof.predecessor_proof, null);
    assert.equal(native.writes.length, writesBefore);
    assert.deepEqual(await readFile(join(f.dir, original.artifacts[0].ref)), originalBytes);
});

test('one original release reconciles through both merged generations to full public reader proof', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native), originalStage = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    const admissionMerge = native.mergeAdmission();
    const admission = await reconcileHubRelease(options, native), admissionStage = JSON.parse(await readFile(join(f.dir, admission.artifacts[0].ref), 'utf8'));
    native.openContent(originalStage.expected);
    const pending = await reconcileHubRelease(options, native), pendingStage = JSON.parse(await readFile(join(f.dir, pending.artifacts[0].ref), 'utf8'));
    assert.equal(pendingStage.stage, 'content-pr-awaiting-merge');
    assert.deepEqual(pendingStage.data_generations, admissionStage.data_generations);
    const merge = native.mergeContent(), writesBefore = native.writes.length;
    const observed = await reconcileHubRelease(options, { ...native, readGitHub: async (path: string) => { if (path.includes('/deployments?')) throw Error('fixture: reader not yet verified'); return native.readGitHub(path); } });
    const stage = JSON.parse(await readFile(join(f.dir, observed.artifacts[0].ref), 'utf8'));
    assert.equal(stage.data_generations.length, 2);
    assert.deepEqual(stage.data_generations[0], admissionStage.data_generations[0]);
    const contentProof = JSON.parse(await readFile(join(f.dir, stage.data_generations[1].ref), 'utf8'));
    assert.equal(contentProof.transition, 'content-merged');
    assert.deepEqual(contentProof.predecessor_proof, admissionStage.data_generations[0]);
    assert.equal(contentProof.predecessor.commit, admissionMerge);
    assert.equal(contentProof.successor.commit, merge);
    assert.equal(contentProof.pr.number, 902);
    assert.equal(contentProof.content_validation.required_checks_passed, true);
    assert.equal(stage.public_delivery, 'unknown');
    const target = originalStage.expected, origin = 'https://www.danmercede.com', url = `${origin}/thoughts/${slug}`;
    const article = `<article><div><span>${target.category}</span><span>${target.date}</span></div><h1>${target.title}</h1><p>${target.preview}</p>${renderToStaticMarkup(React.createElement(Markdown, { source: target.body }))}</article>`;
    const responses: any = { [url]: `<html><head><link rel="canonical" href="${url}"></head><body><div id="root">${article}</div></body></html>`, [`${origin}/thoughts`]: `<div id="root"><section aria-labelledby="latest-releases-heading"><a href="/thoughts/${slug}">Latest</a><a href="/thoughts/${oldSlug}">Previous</a></section></div>`, [`${origin}/sitemap.xml`]: `<urlset><url><loc>${url}</loc></url></urlset>`, [`${origin}/feed.xml`]: renderRss([target, oldThought], []), [`${origin}/atom.xml`]: renderAtom([target, oldThought], []) };
    const readGitHub = async (path: string) => path.includes('/deployments?') ? [{ id: 123, sha: merge, environment: 'Production', creator: { login: 'vercel[bot]' } }] : path.includes('/deployments/123/statuses?') ? [{ state: 'success', environment_url: 'https://danmercede-com-qualified.vercel.app', creator: { login: 'vercel[bot]' } }] : path.includes('/statuses?') ? [{ state: 'success', context: 'Vercel', creator: { login: 'vercel[bot]' }, target_url: 'https://vercel.com/dan-mercedes-projects/danmercede-com/testdeployment' }] : native.readGitHub(path);
    const fetchPublic = async (link: string) => link === `${origin}/deployment-revision.json` ? new Response(JSON.stringify({ schemaVersion: 1, sha: merge }), { headers: { 'cache-control': 'no-store' } }) : link.startsWith(`${origin}/thoughts/fcn-reader-invalid-`) ? new Response('Not found', { status: 404 }) : new Response(responses[link] ?? 'missing', { status: responses[link] ? 200 : 404 });
    const readerTransport = { ...native, readGitHub, fetchPublic, readHydratedBrowser: async () => ({ article_html: article, latest_hrefs: [`/thoughts/${slug}`, `/thoughts/${oldSlug}`] }) };
    const final = await reconcileHubRelease(options, readerTransport);
    const finalStage = JSON.parse(await readFile(join(f.dir, final.artifacts[0].ref), 'utf8'));
    assert.equal(final.status, 'completed');
    assert.equal(finalStage.public_delivery, 'verified');
    assert.equal(finalStage.reader.verification_scope, 'initial-and-hydrated-reader-parity');
    assert.deepEqual(finalStage.data_generations, stage.data_generations);
    assert.equal(native.writes.length, writesBefore);
    assert.equal(final.operation_id, original.operation_id);
    const proofBytes = await Promise.all(finalStage.data_generations.map((ref: any) => readFile(join(f.dir, ref.ref))));
    const restarted = await reconcileHubRelease({ ...options, now: '2026-11-09T15:06:00Z' }, readerTransport);
    const restartedStage = JSON.parse(await readFile(join(f.dir, restarted.artifacts[0].ref), 'utf8'));
    assert.equal(restartedStage.public_delivery, 'verified');
    assert.deepEqual(restartedStage.data_generations, finalStage.data_generations);
    assert.deepEqual(await Promise.all(restartedStage.data_generations.map((ref: any) => readFile(join(f.dir, ref.ref)))), proofBytes);
    assert.equal(native.writes.length, writesBefore);
});

test('merged generation evidence refuses unrelated changes, ambiguous PRs and missing protected ancestry', async (t) => {
    for (const failure of ['second-slug', 'code', 'guides', 'ambiguous', 'foreign', 'not-protected', 'corrupt-original']) {
        const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
        const original = await planHubRelease(options, native);
        const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
        await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
        const merge = native.mergeAdmission();
        if (failure === 'ambiguous') native.prs.push({ ...native.prs[0], number: 999 });
        if (failure === 'foreign') native.prs[0].head.repo.full_name = 'Foreign/repo';
        if (failure === 'corrupt-original') await writeFile(join(f.dir, original.artifacts[0].ref), '{}', { mode: 0o600 });
        const readGitHub = async (path: string) => {
            const value = await native.readGitHub(path);
            if (failure === 'not-protected' && path.includes('/compare/')) return { ...value, status: 'diverged', merge_base_commit: { sha: '0'.repeat(40) } };
            if (path.includes('/git/trees/') && path.includes(native.commits.get(merge).tree.sha)) return { ...value, tree: value.tree.map((leaf: any) => leaf.path === (failure === 'code' ? 'scripts/compileContent.ts' : failure === 'guides' ? 'constants.guides.generated.ts' : failure === 'second-slug' ? 'data/hub-essay-admissions.json' : '') ? { ...leaf, sha: '0'.repeat(40) } : leaf) };
            return value;
        };
        const observed = await reconcileHubRelease(options, { ...native, readGitHub });
        assert.equal(observed.status, 'held', failure);
        const stage = JSON.parse(await readFile(join(f.dir, observed.artifacts[0].ref), 'utf8'));
        assert.equal(stage.public_delivery, 'unknown', failure);
        assert.ok(!stage.data_generations?.length, failure);
        assert.equal(native.writes.length, 5, failure);
    }
});
test('content generation proof refuses changed unrelated copy or unverified checks after merge', async (t) => {
    for (const failure of ['unrelated-thought', 'target', 'checks']) {
        const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
        const original = await planHubRelease(options, native), first = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
        const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
        await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
        native.mergeAdmission(); await reconcileHubRelease(options, native);
        native.openContent(failure === 'target' ? { ...first.expected, body: 'Changed target body' } : first.expected, failure === 'unrelated-thought' ? [{ ...oldThought, body: 'Lost unrelated copy' }] : [oldThought]);
        native.mergeContent();
        const readGitHub = async (path: string) => { const value = await native.readGitHub(path); return failure === 'checks' && path.includes('/check-runs?') ? { ...value, check_runs: value.check_runs.map((c: any) => ({ ...c, conclusion: 'failure' })) } : value; };
        const result = await reconcileHubRelease(options, { ...native, readGitHub });
        assert.equal(result.status, 'held', failure);
        const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
        assert.equal(stage.public_delivery, 'unknown', failure);
        assert.ok((stage.data_generations?.length ?? 0) < 2, failure);
        assert.equal(native.writes.length, 5);
    }
});

test('first full plan has an immutable original-plan anchor independent of later file metadata', async (t) => {
    const f = await fixture(t), native = nativeFixture(), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    const first = await planHubRelease(options, native);
    const anchor = JSON.parse(await readFile(join(f.dir, 'hub-original-plan.json'), 'utf8'));
    assert.deepEqual(anchor.plan, first.artifacts[0]);
    assert.equal(anchor.input_sha256, first.input_sha256);
    const bytes = await readFile(join(f.dir, 'hub-original-plan.json'));
    await planHubRelease({ ...options, now: '2026-11-09T15:06:00Z' }, native);
    assert.deepEqual(await readFile(join(f.dir, 'hub-original-plan.json')), bytes);
});

test('missing original anchor after a merge holds without rebinding or retrying', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native);
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    native.mergeAdmission(); await rm(join(f.dir, 'hub-original-plan.json'));
    const result = await reconcileHubRelease(options, native);
    assert.equal(result.status, 'held');
    assert.deepEqual(result.holds, ['original-plan-unverified']);
    assert.ok(!(await readdir(f.dir)).includes('hub-original-plan.json'));
    assert.equal(native.writes.length, 5);
});

test('main advancing inside the awaited authorizer prevents setup and every native write', async (t) => {
    for (const moveAt of [1, 2]) {
      await t.test(`authorization gate ${moveAt}`, async () => {
        const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
        const plan = await planHubRelease(options, native);
        let calls = 0;
        const authorize = async (context: any) => {
            if (++calls === moveAt) native.moveMain();
            return { admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:bounded' };
        };
        const result = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: plan.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
        assert.equal(result.status, 'held');
        assert.equal(native.writes.length, 0, `authorizer call ${moveAt}`);
        const names = await readdir(f.dir);
        assert.ok(!names.some(name => name.endsWith('-intent.json')));
        if (moveAt === 1) assert.ok(!names.includes('hub-operation.json') && !names.includes('hub-admission-action.json'));
      });
    }
});

test('recover-sync never dispatches when main changes during authorization', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T16:25:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native);
    const grant = (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T16:30:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize: async (context: any) => grant(context), clock: () => Date.parse(now) });
    native.mergeAdmission();
    const plan = await planHubRelease(options, native), writesBefore = native.writes.length;
    let calls = 0;
    const result = await advanceHubRelease({ ...options, action: 'recover-sync', planSha256: plan.artifacts[0].sha256, maxActions: 1 }, { ...native, authorize: async (context: any) => { if (++calls === 2) native.moveMain(); return grant(context); }, clock: () => Date.parse(now) });
    assert.equal(result.status, 'held');
    assert.equal(native.writes.length, writesBefore);
    assert.ok(!(await readdir(f.dir)).includes('hub-sync-intent.json'));
});

test('unexpected original-anchor fields hold instead of widening the binding', async (t) => {
    const f = await fixture(t), native = nativeFixture(), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    await planHubRelease(options, native);
    const path = join(f.dir, 'hub-original-plan.json'), value = JSON.parse(await readFile(path, 'utf8'));
    await writeFile(path, JSON.stringify({ ...value, extra: true }), { mode: 0o600 });
    const result = await reconcileHubRelease(options, native);
    assert.equal(result.status, 'held');
    assert.deepEqual(result.holds, ['original-plan-unverified']);
    assert.equal(native.writes.length, 0);
});

test('authorization uses fresh time after awaited callbacks and final main readbacks', async (t) => {
    for (const scenario of ['fresh', 'expired', 'drain']) await t.test(scenario, async () => {
        const f = await fixture(t), native = nativeFixture(), now = scenario === 'drain' ? '2026-12-09T07:58:59Z' : '2026-11-09T15:05:00Z';
        const options = { requestPath: f.path, jobDir: f.dir, now }, plan = await planHubRelease(options, native);
        let ticks = Date.parse(now), pending = false;
        const authorize = async (context: any) => {
            if (scenario === 'fresh') ticks += 1000;
            pending = true;
            return { admitted: true, ...context, checked_at: new Date(ticks).toISOString(), expires_at: scenario === 'drain' ? '2026-12-09T07:59:00Z' : new Date(ticks + (scenario === 'fresh' ? 60000 : 1000)).toISOString(), stopped: false, grant_ref: 'fixture:clock-bound' };
        };
        const readGitHub = async (path: string) => {
            const result = await native.readGitHub(path);
            if (pending && path.endsWith('/git/ref/heads/main')) { pending = false; if (scenario !== 'fresh') ticks += 2000; }
            return result;
        };
        await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: plan.artifacts[0].sha256, maxActions: 1 }, { ...native, authorize, readGitHub, clock: () => ticks });
        assert.equal(native.writes.length, scenario === 'fresh' ? 1 : 0, scenario);
        const names = await readdir(f.dir);
        if (scenario === 'fresh') {
            const intent = JSON.parse(await readFile(join(f.dir, 'hub-admission-blob-intent.json'), 'utf8'));
            assert.equal(intent.started_at, new Date(ticks).toISOString());
        } else {
            assert.ok(!names.some(name => name.endsWith('-intent.json')));
            assert.ok(!names.includes('hub-operation.json') && !names.includes('hub-admission-action.json'));
        }
    });
});

test('recover-sync rechecks expiry after its asynchronous native inventory', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T16:25:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native);
    const grant = (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T16:30:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize: async (context: any) => grant(context), clock: () => Date.parse(now) });
    native.mergeAdmission();
    const plan = await planHubRelease(options, native), before = await readdir(f.dir), writes = native.writes.length;
    let ticks = Date.parse(now), calls = 0;
    const authorize = async (context: any) => { calls++; return { ...grant(context), checked_at: new Date(ticks).toISOString(), expires_at: new Date(ticks + 1000).toISOString() }; };
    const readGitHub = async (path: string) => { const result = await native.readGitHub(path); if (calls >= 2 && path.includes('/runs?')) ticks += 2000; return result; };
    await advanceHubRelease({ ...options, action: 'recover-sync', planSha256: plan.artifacts[0].sha256, maxActions: 1 }, { ...native, authorize, readGitHub, clock: () => ticks });
    assert.equal(native.writes.length, writes);
    assert.ok(!(await readdir(f.dir)).some(name => name.endsWith('-intent.json') && !before.includes(name)));
});

test('same-head successful check reruns retain one immutable content transition across restarts', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native), first = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    native.mergeAdmission(); await reconcileHubRelease(options, native);
    native.openContent(first.expected); native.mergeContent();
    const transport = (rerun: boolean) => async (path: string) => {
        if (path.includes('/deployments?')) throw Error('fixture: no public delivery');
        const value = await native.readGitHub(path);
        if (rerun && path.includes('/check-runs?')) return { ...value, check_runs: value.check_runs.map((check: any) => check.name === 'build' ? { ...check, id: 200 } : check).reverse() };
        if (rerun && path.includes('/protection/required_status_checks')) return { ...value, checks: [...value.checks].reverse() };
        return value;
    };
    const observed = await reconcileHubRelease(options, { ...native, readGitHub: transport(false) });
    const stage = JSON.parse(await readFile(join(f.dir, observed.artifacts[0].ref), 'utf8'));
    const reference = stage.data_generations[1], bytes = await readFile(join(f.dir, reference.ref));
    for (const minute of ['06', '07']) {
        const after = await reconcileHubRelease({ ...options, now: `2026-11-09T15:${minute}:00Z` }, { ...native, readGitHub: transport(true) });
        const next = JSON.parse(await readFile(join(f.dir, after.artifacts[0].ref), 'utf8'));
        assert.deepEqual(next.data_generations, stage.data_generations);
        assert.deepEqual(await readFile(join(f.dir, reference.ref)), bytes);
        assert.equal(next.generation_observations.find((entry: any) => entry.transition === 'content-merged').content_validation.required_checks.find((check: any) => check.name === 'build').id, 200);
    }
    const content = [];
    for (const name of (await readdir(f.dir)).filter(name => /^hub-generation-[a-f0-9]{64}\.json$/.test(name))) if (JSON.parse(await readFile(join(f.dir, name), 'utf8')).transition === 'content-merged') content.push(name);
    assert.equal(content.length, 1);
    assert.equal(native.writes.length, 5);
});

test('content-only handoffs rebind forged original trees, baselines and flags to native facts', async (t) => {
    for (const failure of ['tree', 'baseline', 'surface-flag', 'allowlist-flag']) await t.test(failure, async () => {
        const f = await fixture(t), initialAdmissions = JSON.stringify({ ...JSON.parse(admissions), essay_slugs: [...JSON.parse(admissions).essay_slugs, slug] });
        const native = nativeFixture([oldThought], initialAdmissions), options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T16:25:00Z' };
        const first = await planHubRelease(options, native), original = JSON.parse(await readFile(join(f.dir, first.artifacts[0].ref), 'utf8'));
        const changed = failure === 'baseline' ? [{ ...oldThought, body: 'Forged baseline matches an unrelated content change' }] : [oldThought];
        const pr = native.openContent(original.expected, changed);
        if (failure === 'tree') {
            const originalLeaves = JSON.stringify(native.trees.get(original.admission.base_tree_sha));
            const headTree = native.trees.get(native.commits.get(pr.head.sha).tree.sha)!.map((entry: any) => ({ ...entry }));
            const leaf = headTree.find((entry: any) => entry.path === 'scripts/compileContent.ts');
            leaf.sha = '0'.repeat(40);
            const treeSha = sha(JSON.stringify(headTree)).slice(0, 40);
            native.trees.set(treeSha, headTree);
            native.commits.get(pr.head.sha).tree = { sha: treeSha };
            original.admission.base_tree.find((entry: any) => entry.path === leaf.path).sha = leaf.sha;
            assert.equal(JSON.stringify(native.trees.get(original.admission.base_tree_sha)), originalLeaves);
        }
        if (failure === 'baseline') original.baseline.thoughts = changed;
        if (failure === 'surface-flag') original.canonical.surface_targeted = true;
        if (failure === 'allowlist-flag') { original.source.allowlisted = false; original.canonical.surface_targeted = true; }
        const bytes = JSON.stringify(original, null, 2) + '\n', hash = sha(bytes), ref = `hub-plan-${hash}.json`;
        await writeFile(join(f.dir, ref), bytes, { mode: 0o600, flag: 'wx' });
        const anchorPath = join(f.dir, 'hub-original-plan.json'), anchor = JSON.parse(await readFile(anchorPath, 'utf8'));
        await writeFile(anchorPath, JSON.stringify({ ...anchor, plan: { ref, sha256: hash } }), { mode: 0o600 });
        native.mergeContent();
        const observed = await reconcileHubRelease(options, { ...native, readGitHub: async (path: string) => { if (path.includes('/deployments?')) throw Error('fixture: no public reads'); return native.readGitHub(path); } });
        assert.equal(observed.status, 'held');
        const stage = JSON.parse(await readFile(join(f.dir, observed.artifacts[0].ref), 'utf8'));
        assert.equal(stage.stage, 'data-generation-unverified');
        assert.ok(!stage.data_generations?.length);
        assert.equal(native.writes.length, 0);
    });
});

test('a transition anchor recovers its original proof after materialization crashes and checks rerun', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native), first = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    native.mergeAdmission(); await reconcileHubRelease(options, native);
    native.openContent(first.expected); native.mergeContent();
    const originalLink = fsPromises.link;
    let held: any;
    try {
        fsPromises.link = async (from: any, to: any) => { if (String(to).includes('/hub-generation-') && (await readdir(f.dir)).includes('hub-transition-content-merged.json')) throw Error('fixture: materialization crash'); return originalLink(from, to); };
        syncBuiltinESMExports();
        held = await reconcileHubRelease(options, native);
    } finally { fsPromises.link = originalLink; syncBuiltinESMExports(); }
    assert.equal(held.status, 'held');
    const anchorPath = join(f.dir, 'hub-transition-content-merged.json'), anchorBytes = await readFile(anchorPath), anchor = JSON.parse(anchorBytes.toString());
    assert.ok(!(await readdir(f.dir)).includes(anchor.proof.ref));
    const readGitHub = async (path: string) => {
        if (path.includes('/deployments?')) throw Error('fixture: no public reads');
        const value = await native.readGitHub(path);
        return path.includes('/check-runs?') ? { ...value, check_runs: value.check_runs.map((check: any) => check.name === 'build' ? { ...check, id: 200 } : check) } : value;
    };
    const recovered = await reconcileHubRelease(options, { ...native, readGitHub });
    const stage = JSON.parse(await readFile(join(f.dir, recovered.artifacts[0].ref), 'utf8'));
    assert.deepEqual(stage.data_generations[1], anchor.proof);
    assert.equal(sha(await readFile(join(f.dir, anchor.proof.ref))), anchor.proof.sha256);
    assert.deepEqual(await readFile(anchorPath), anchorBytes);
    assert.equal(stage.generation_observations[0].content_validation.required_checks.find((check: any) => check.name === 'build').id, 200);
    assert.equal(native.writes.length, 5);
});

test('recover-sync observes a current STOP raised during native inventory before any reservation', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T16:25:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native);
    const grant = (context: any, stopped = false) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T16:30:00Z', stopped, grant_ref: 'fixture:current-authority' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize: async (context: any) => grant(context), clock: () => Date.parse(now) });
    native.mergeAdmission();
    const plan = await planHubRelease(options, native), writesBefore = native.writes.length, namesBefore = await readdir(f.dir);
    let stopped = false, calls = 0;
    const authorize = async (context: any) => { calls++; return grant(context, stopped); };
    const readGitHub = async (path: string) => { const value = await native.readGitHub(path); if (calls >= 2 && path.includes('/runs?')) stopped = true; return value; };
    const result = await advanceHubRelease({ ...options, action: 'recover-sync', planSha256: plan.artifacts[0].sha256, maxActions: 1 }, { ...native, authorize, readGitHub, clock: () => Date.parse(now) });
    assert.equal(native.writes.length, writesBefore);
    assert.equal(result.status, 'held');
    assert.ok(calls >= 3);
    assert.ok(!(await readdir(f.dir)).some(name => name.endsWith('-intent.json') && !namesBefore.includes(name)));
});

test('recovery refresh starts only under a still-valid decision and may finish with a fresh later grant', async (t) => {
    for (const scenario of ['expires-in-journal-read', 'valid-refresh-finishes-later']) await t.test(scenario, async () => {
        const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T16:25:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
        const original = await planHubRelease(options, native);
        const setupGrant = (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T16:30:00Z', stopped: false, grant_ref: 'fixture:setup' });
        await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize: async (context: any) => setupGrant(context), clock: () => Date.parse(now) });
        native.mergeAdmission();
        const plan = await planHubRelease(options, native), writesBefore = native.writes.length;
        let ticks = Date.parse(now), calls = 0, inventoryDone = false, delayed = false;
        const authorize = async (context: any) => {
            calls++;
            if (scenario === 'valid-refresh-finishes-later' && calls === 3) ticks += 2000;
            return { ...setupGrant(context), checked_at: new Date(ticks).toISOString(), expires_at: new Date(ticks + (calls === 3 ? 60000 : 1000)).toISOString(), grant_ref: `fixture:decision-${calls}` };
        };
        const readGitHub = async (path: string) => { const value = await native.readGitHub(path); if (calls >= 2 && path.includes('/runs?')) inventoryDone = true; return value; };
        const originalOpen = fsPromises.open;
        let result: any;
        try {
            fsPromises.open = async (...args: any[]) => {
                const handle = await (originalOpen as any)(...args);
                if (scenario === 'expires-in-journal-read' && inventoryDone && calls === 2 && !delayed && String(args[0]).endsWith('/hub-operation.json')) { ticks += 2000; delayed = true; }
                return handle;
            };
            syncBuiltinESMExports();
            result = await advanceHubRelease({ ...options, action: 'recover-sync', planSha256: plan.artifacts[0].sha256, maxActions: 1 }, { ...native, authorize, readGitHub, clock: () => ticks });
        } finally { fsPromises.open = originalOpen; syncBuiltinESMExports(); }
        if (scenario === 'expires-in-journal-read') {
            assert.equal(delayed, true);
            assert.equal(calls, 2);
            assert.equal(native.writes.length, writesBefore);
            assert.equal(result.status, 'held');
            assert.ok(!(await readdir(f.dir)).includes('hub-sync-intent.json'));
        } else {
            assert.equal(calls, 3);
            assert.equal(native.writes.length, writesBefore + 1);
            assert.equal(result.status, 'unknown');
            const intent = JSON.parse(await readFile(join(f.dir, 'hub-sync-intent.json'), 'utf8'));
            assert.equal(intent.started_at, new Date(ticks).toISOString());
            assert.equal(intent.input_sha256, original.input_sha256);
            assert.equal(intent.plan_sha256, plan.artifacts[0].sha256);
        }
    });
});

const assetBody = `\n![Original attempt](publishing/assets/${slug}/gate.svg "Keep its record")\n`;
const assetCanonical = canonical + assetBody;
const assetBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>');
function pinnedAssetFixture(canonicalSource = assetCanonical, sourceEntries: { path: string; bytes: Buffer; mode?: string }[] = [{ path: `publishing/assets/${slug}/gate.svg`, bytes: assetBytes }]) {
    const native = nativeFixture([oldThought], admissions, canonicalSource), prefix = '/repos/OrionArchitekton/dan-mercede-substrate', rootTree = '1'.repeat(40);
    const treeEntries = new Map<string, any[]>(), assetBlobs = new Map<string, Buffer>();
    treeEntries.set(rootTree, []);
    for (const entry of sourceEntries) {
        let tree = rootTree;
        const parts = entry.path.split('/');
        for (const part of parts.slice(0, -1)) {
            let child = treeEntries.get(tree)!.find(e => e.path === part);
            if (!child) { const id = sha(tree + '/' + part).slice(0, 40); child = { path: part, mode: '040000', type: 'tree', sha: id }; treeEntries.get(tree)!.push(child); treeEntries.set(id, []); }
            tree = child.sha;
        }
        const blob = createHash('sha1').update(`blob ${entry.bytes.length}\0`).update(entry.bytes).digest('hex');
        assetBlobs.set(blob, entry.bytes);
        treeEntries.get(tree)!.push({ path: parts.at(-1), mode: entry.mode ?? '100644', type: 'blob', sha: blob });
    }
    const readGitHub = async (path: string) => {
        if (path === `${prefix}/git/commits/${'c'.repeat(40)}`) return { sha: 'c'.repeat(40), tree: { sha: rootTree } };
        if (path.startsWith(`${prefix}/git/trees/`)) { const id = path.slice(`${prefix}/git/trees/`.length); return { sha: id, truncated: false, tree: treeEntries.get(id) }; }
        if (path.startsWith(`${prefix}/git/blobs/`)) { const id = path.slice(`${prefix}/git/blobs/`.length), bytes = assetBlobs.get(id)!; return { sha: id, encoding: 'base64', size: bytes.length, content: bytes.toString('base64') }; }
        const hubBlob = '/repos/OrionArchitekton/danmercede.com/git/blobs/';
        if (path.startsWith(hubBlob) && assetBlobs.has(path.slice(hubBlob.length))) { const id = path.slice(hubBlob.length), bytes = assetBlobs.get(id)!; return { sha: id, encoding: 'base64', size: bytes.length, content: bytes.toString('base64') }; }
        return native.readGitHub(path);
    };
    return { ...native, readGitHub, assetBlobs, treeEntries };
}
test('pinned target image derives compiler rewritten body and exact owned asset proof', async (t) => {
    const f = await fixture(t, assetCanonical), native = pinnedAssetFixture();
    const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, native);
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'admission-preparation-ready');
    assert.ok(stage.expected.body.includes(`![Original attempt](/assets/thoughts/${slug}/gate.svg "Keep its record")`));
    assert.deepEqual(stage.target_assets, [{ source_path: `publishing/assets/${slug}/gate.svg`, path: `public/assets/thoughts/${slug}/gate.svg`, mode: '100644', type: 'blob', blob: [...native.assetBlobs.keys()][0], sha256: sha(assetBytes), size: assetBytes.length }]);
    assert.equal(native.writes.length, 0);
});

test('merged target image content retains exact asset proof and original operation', async (t) => {
    const f = await fixture(t, assetCanonical), native = pinnedAssetFixture(), now = '2026-11-09T15:05:00Z';
    const options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native), first = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    native.mergeAdmission();
    const pr = native.openContent(first.expected, [oldThought], [{ path: `public/assets/thoughts/${slug}/gate.svg`, bytes: assetBytes }]);
    const readGitHub = async (path: string) => {
        if (path.includes('/deployments?')) throw Error('fixture: no public browser');
        const asset = first.target_assets[0];
        if (path === `/repos/OrionArchitekton/danmercede.com/git/blobs/${asset.blob}`) return { sha: asset.blob, encoding: 'base64', size: asset.size, content: assetBytes.toString('base64') };
        return native.readGitHub(path);
    };
    const pending = await reconcileHubRelease(options, { ...native, readGitHub });
    const pendingStage = JSON.parse(await readFile(join(f.dir, pending.artifacts[0].ref), 'utf8'));
    assert.equal(pendingStage.stage, 'content-pr-awaiting-merge');
    native.mergeContent();
    const result = await reconcileHubRelease(options, { ...native, readGitHub });
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.data_generations.length, 2);
    const proof = JSON.parse(await readFile(join(f.dir, stage.data_generations[1].ref), 'utf8'));
    assert.deepEqual(proof.target_assets, first.target_assets);
    assert.equal(proof.pr.head_sha, pr.head.sha);
    assert.equal(proof.operation_id, original.operation_id);
    assert.equal(stage.public_delivery, 'unknown');
    assert.equal(native.writes.length, 5);
    const again = await reconcileHubRelease(options, { ...native, readGitHub });
    const restarted = JSON.parse(await readFile(join(f.dir, again.artifacts[0].ref), 'utf8'));
    assert.deepEqual(restarted.data_generations, stage.data_generations);
});

test('already compiled target still refuses changed image bytes before reader verification', async (t) => {
    const f = await fixture(t, assetCanonical), native = pinnedAssetFixture(), now = '2026-11-09T15:05:00Z';
    const options = { requestPath: f.path, jobDir: f.dir, now };
    const original = await planHubRelease(options, native), first = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
    await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    native.mergeAdmission();
    const pr = native.openContent(first.expected, [oldThought], [{ path: `public/assets/thoughts/${slug}/gate.svg`, bytes: Buffer.from('<svg>changed</svg>') }]);
    native.mergeContent();
    const result = await planHubRelease(options, native);
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'source-unverified');
    assert.equal(result.status, 'held');
    assert.equal(native.writes.length, 5);
    assert.ok(pr.merged);
});

test('target asset path and count refusals occur before any source blob read', async (t) => {
    const cases = {
        foreign: '![x](publishing/assets/another-edition/gate.svg)',
        traversal: `![x](publishing/assets/${slug}/../private.svg)`,
        unsupported: `![x](publishing/assets/${slug}/notes.txt)`,
        query: `![x](publishing/assets/${slug}/gate.svg?private=1)`,
        collision: `![x](publishing/assets/${slug}/one/gate.svg)\n![y](publishing/assets/${slug}/two/gate.svg)`,
        count: [1, 2, 3].map(n => `![x](publishing/assets/${slug}/gate-${n}.svg)`).join('\n'),
    };
    for (const [reason, body] of Object.entries(cases)) await t.test(reason, async () => {
        const source = canonical + '\n' + body, f = await fixture(t, source), native = pinnedAssetFixture(source);
        let blobReads = 0;
        const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, { ...native, readGitHub: async (path: string) => { if (path.includes('/git/blobs/')) blobReads++; return native.readGitHub(path); } });
        const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
        assert.equal(result.status, 'held');
        assert.equal(stage.stage, 'source-unverified');
        assert.equal(blobReads, 0);
        assert.equal(native.writes.length, 0);
    });
});

test('pinned asset source requires bounded unique trees and exact regular binary blobs', async (t) => {
    for (const reason of ['symlink', 'executable', 'ancestor-symlink', 'missing', 'truncated', 'duplicate', 'bytes', 'sha', 'base64', 'oversize', 'empty']) await t.test(reason, async () => {
        const f = await fixture(t, assetCanonical), bytes = reason === 'oversize' ? Buffer.alloc(524289, 1) : reason === 'empty' ? Buffer.alloc(0) : assetBytes;
        const native = pinnedAssetFixture(assetCanonical, reason === 'missing' ? [] : [{ path: `publishing/assets/${slug}/gate.svg`, bytes, mode: reason === 'symlink' ? '120000' : reason === 'executable' ? '100755' : '100644' }]);
        const readGitHub = async (path: string) => {
            const value = await native.readGitHub(path);
            if (path.startsWith('/repos/OrionArchitekton/dan-mercede-substrate/git/trees/')) {
                if (reason === 'truncated') return { ...value, truncated: true };
                if (reason === 'duplicate') return { ...value, tree: [...value.tree, ...value.tree] };
                if (reason === 'ancestor-symlink') return { ...value, tree: value.tree.map((e: any) => e.type === 'tree' ? { ...e, type: 'blob', mode: '120000' } : e) };
            }
            if (path.startsWith('/repos/OrionArchitekton/dan-mercede-substrate/git/blobs/')) {
                if (reason === 'bytes') return { ...value, content: Buffer.from('different').toString('base64'), size: 9 };
                if (reason === 'sha') return { ...value, sha: '0'.repeat(40) };
                if (reason === 'base64') return { ...value, content: value.content + ' ' };
            }
            return value;
        };
        const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, { ...native, readGitHub });
        const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
        assert.equal(result.status, 'held');
        assert.equal(stage.stage, 'source-unverified');
        assert.equal(native.writes.length, 0);
    });
});

test('content image proof refuses missing extra changed or executable asset leaves', async (t) => {
    for (const reason of ['missing', 'extra', 'wrong-bytes', 'executable', 'binary-readback', 'unrelated-delete', 'existing-replace']) await t.test(reason, async () => {
        const f = await fixture(t, assetCanonical), native = pinnedAssetFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
        const initialTree = native.trees.get(native.commits.get(mainSha).tree.sha)!;
        initialTree.push({ path: reason === 'existing-replace' ? `public/assets/thoughts/${slug}/gate.svg` : `public/assets/thoughts/${oldSlug}/retained.svg`, type: 'blob', mode: '100644', sha: '0'.repeat(40) });
        const original = await planHubRelease(options, native), first = JSON.parse(await readFile(join(f.dir, original.artifacts[0].ref), 'utf8'));
        const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:only' });
        await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: original.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
        native.mergeAdmission();
        const assets = reason === 'missing' ? [] : [{ path: `public/assets/thoughts/${slug}/gate.svg`, bytes: reason === 'wrong-bytes' ? Buffer.from('<svg>wrong</svg>') : assetBytes, mode: reason === 'executable' ? '100755' : '100644' }];
        if (reason === 'extra') assets.push({ path: `public/assets/thoughts/${slug}/unmentioned.svg`, bytes: assetBytes, mode: '100644' });
        const pr = native.openContent(first.expected, [oldThought], assets);
        if (reason === 'unrelated-delete') {
            const commit = native.commits.get(pr.head.sha), tree = native.trees.get(commit.tree.sha)!;
            tree.splice(tree.findIndex(e => e.path === `public/assets/thoughts/${oldSlug}/retained.svg`), 1);
        }
        native.mergeContent();
        const readGitHub = async (path: string) => {
            if (path.includes('/deployments?')) throw Error('fixture: no reader');
            const value = await native.readGitHub(path);
            if (reason === 'binary-readback' && path.startsWith('/repos/OrionArchitekton/danmercede.com/git/blobs/')) return { ...value, content: Buffer.from('changed').toString('base64'), size: 7 };
            return value;
        };
        const result = await reconcileHubRelease(options, { ...native, readGitHub });
        const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
        assert.equal(result.status, 'held');
        assert.equal(stage.public_delivery, 'unknown');
        assert.ok(!stage.data_generations?.some((_: any, index: number) => index === 1));
        assert.equal(native.writes.length, 5);
    });
});

test('rehashed original image plans cannot widen native asset provenance', async (t) => {
    const sourceAdmissions = JSON.stringify({ ...JSON.parse(admissions), essay_slugs: [...JSON.parse(admissions).essay_slugs, slug] });
    const f = await fixture(t, assetCanonical), underlying = nativeFixture([oldThought], sourceAdmissions, assetCanonical), assetNative = pinnedAssetFixture();
    const native = { ...underlying, readGitHub: async (path: string) => path.startsWith('/repos/OrionArchitekton/dan-mercede-substrate/') ? assetNative.readGitHub(path) : path.startsWith('/repos/OrionArchitekton/danmercede.com/git/blobs/') && assetNative.assetBlobs.has(path.split('/').at(-1)!) ? assetNative.readGitHub(path) : underlying.readGitHub(path) };
    const options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    const result = await planHubRelease(options, native), original = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    native.openContent(original.expected, [oldThought], [{ path: `public/assets/thoughts/${slug}/gate.svg`, bytes: assetBytes }]);
    original.target_assets[0].source_path = `publishing/assets/another-edition/gate.svg`;
    const bytes = JSON.stringify(original, null, 2) + '\n', hash = sha(bytes), ref = `hub-plan-${hash}.json`;
    await writeFile(join(f.dir, ref), bytes, { mode: 0o600, flag: 'wx' });
    const anchorPath = join(f.dir, 'hub-original-plan.json'), anchor = JSON.parse(await readFile(anchorPath, 'utf8'));
    await writeFile(anchorPath, JSON.stringify({ ...anchor, plan: { ref, sha256: hash } }), { mode: 0o600 });
    native.mergeContent();
    const observed = await reconcileHubRelease(options, native), stage = JSON.parse(await readFile(join(f.dir, observed.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'data-generation-unverified');
    assert.equal(stage.public_delivery, 'unknown');
    assert.ok(!stage.data_generations?.length);
    assert.equal(native.writes.length, 0);
});

test('image planning admits two owned refs and repeats one source without duplicate asset records', async (t) => {
    const body = `\n![first](publishing/assets/${slug}/gate.svg)\n![second](publishing/assets/${slug}/other.png)\n![again](publishing/assets/${slug}/gate.svg 'same source')`;
    const source = canonical + body, f = await fixture(t, source), native = pinnedAssetFixture(source, [{ path: `publishing/assets/${slug}/gate.svg`, bytes: assetBytes }, { path: `publishing/assets/${slug}/other.png`, bytes: Buffer.alloc(524288, 1) }]);
    const result = await planHubRelease({ requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' }, native);
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'admission-preparation-ready');
    assert.equal(stage.target_assets.length, 2);
    assert.equal(stage.target_assets[1].size, 524288);
    assert.ok(stage.expected.body.includes(`![again](/assets/thoughts/${slug}/gate.svg 'same source')`));
    assert.equal(native.writes.length, 0);
});
