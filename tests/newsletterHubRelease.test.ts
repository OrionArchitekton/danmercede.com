import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, chmod, readdir, mkdir, rename, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
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
async function fixture(t: any) {
    const dir = await mkdtemp(join(tmpdir(), 'hub-workflow-test-'));
    await chmod(dir, 0o700);
    t.after(() => rm(dir, { recursive: true, force: true }));
    const snapshot = { schema_version: 1, kind: 'newsletter-publication-coverage', newsletter_id: '7477834312608866304', editions: [{ slug, title, observed_title: title, hub_release_week: '2026-11-09', native_id: '7522060460920934400', public_url: 'https://www.linkedin.com/pulse/before-your-ai-tries-again-dan-mercede-example/', package_sha256: 'a'.repeat(64), published_at: '2026-11-02T15:02:46Z', observed_at: '2026-11-02T15:10:00Z', evidence_ref: 'fixture:publication', evidence_sha256: 'b'.repeat(64), coverage: ['identity', 'publication_time', 'title', 'body', 'headings', 'anchor', 'cover', 'caption', 'commentary', 'cta'] }] };
    const snapshotRaw = JSON.stringify(snapshot), snapshotPath = join(dir, 'publication.json');
    await writeFile(snapshotPath, snapshotRaw, { mode: 0o600 });
    const request = { schema_version: 1, kind: 'newsletter-hub-release-request', operation_id: 'fcn-hub-ed16-20261102', week: '2026-11-02', release_week: '2026-11-09', slug, canonical: { commit: 'c'.repeat(40), path: `publishing/canonical/${slug}.md`, sha256: sha(canonical) }, publication_snapshot: { path: snapshotPath, sha256: sha(snapshotRaw) }, cta: { kind: 'question', text: 'Which confirmation would you recover before trying again?' } };
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
const compiler = await readFile(new URL('../scripts/compileContent.ts', import.meta.url), 'utf8');
const oldThought = { title: 'An existing edition', preview: 'Existing accepted claim', date: '2026-10-26', category: 'Doctrine', slug: oldSlug, body: 'Existing approved body. Preserve every word.' };
const bundle = (thoughts: any[]) => `export const THOUGHTS: Thought[] = ${JSON.stringify(thoughts)};\nexport const DIAGRAMS: Diagram[] = [];\n`;
const content = (text: string) => {
    const bytes = Buffer.from(text);
    return { type: 'file', encoding: 'base64', size: bytes.length, content: bytes.toString('base64'), sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
};
function nativeFixture(baselineThoughts: any[] = [oldThought]) {
    const writes: any[] = [];
    const reads: string[] = [];
    const blobs = new Map<string, string>(), trees = new Map<string, any[]>(), commits = new Map<string, any>(), refs = new Map<string, string>(), prs: any[] = [];
    const runs: any[] = [];
    let activeMain = mainSha;
    const putBlob = (raw: string) => {
        const value = content(raw);
        blobs.set(value.sha, raw);
        return value.sha;
    };
    const baseTree = 'f'.repeat(40), baseEntries = [{ path: 'scripts/compileContent.ts', mode: '100644', type: 'blob', sha: putBlob(compiler) }, { path: 'constants.generated.ts', mode: '100644', type: 'blob', sha: putBlob(bundle(baselineThoughts)) }, { path: '.github/workflows/substrate-sync.yml', mode: '100644', type: 'blob', sha: putBlob(workflow) }, { path: 'README.md', mode: '100644', type: 'blob', sha: putBlob('Unrelated source must remain exactly intact.') }];
    trees.set(baseTree, baseEntries);
    commits.set(mainSha, { sha: mainSha, tree: { sha: baseTree }, parents: [] });
    const readGitHub = async (path: string) => {
        reads.push(path);
        const prefix = '/repos/OrionArchitekton/danmercede.com';
        if (path === `${prefix}/git/ref/heads/main`)
            return { ref: 'refs/heads/main', object: { type: 'commit', sha: activeMain } };
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
            return prs.filter(p => p.head.ref === branch && (query.get('state') === 'all' || p.state === 'open'));
        }
        if (path === `${prefix}/actions/workflows/substrate-verify.yml`)
            return { id: 123456, state: 'active', path: '.github/workflows/substrate-verify.yml' };
        if (path === `${prefix}/actions/runs/777`)
            return { id: 777, check_suite_id: 112471990107, workflow_id: 123456, head_repository: { full_name: 'OrionArchitekton/danmercede.com' }, repository: { full_name: 'OrionArchitekton/danmercede.com' }, head_branch: 'codex/substrate-sync', path: '.github/workflows/substrate-verify.yml', event: 'pull_request_target', head_sha: prs.find(p => p.number === 902)?.head.sha, status: 'completed', conclusion: 'success', pull_requests: [] };
        if (path === `${prefix}/check-suites/112471990107`)
            return { id: 112471990107, head_sha: prs.find(p => p.number === 902)?.head.sha, repository: { full_name: 'OrionArchitekton/danmercede.com' }, app: { id: 15368 }, status: 'completed', conclusion: 'success' };
        if (path.startsWith(`${prefix}/git/commits/`))
            return commits.get(path.slice(`${prefix}/git/commits/`.length));
        if (path.startsWith(`${prefix}/git/trees/`)) {
            const id = path.slice(`${prefix}/git/trees/`.length).split('?')[0];
            return { sha: id, truncated: false, tree: trees.get(id) };
        }
        if (path.startsWith(`${prefix}/git/blobs/`))
            return content(blobs.get(path.slice(`${prefix}/git/blobs/`.length))!);
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
            return content(canonical);
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
    const openContent = (expected: any, changed = baselineThoughts) => {
        const next = [expected, ...changed].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)), tree = trees.get(commits.get(activeMain).tree.sha)!.map(e => e.path === 'constants.generated.ts' ? { ...e, sha: putBlob(bundle(next)) } : e), treeSha = sha(JSON.stringify(tree)).slice(0, 40), id = '8'.repeat(40);
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
    return { readGitHub, writeGitHub, writes, reads, trees, commits, refs, prs, runs, mergeAdmission, openContent, mergeContent, readReviewThreads: async (number: number) => ({ head_sha: prs.find(p => p.number === number)?.head.sha, complete: true, threads: [] }) };
}
test('eligible private plan builds a minimal exact admission patch while default writer remains unadmitted', async (t) => {
    const f = await fixture(t), native = nativeFixture();
    const options = { requestPath: f.path, jobDir: f.dir, now: '2026-11-09T15:05:00Z' };
    const result = await planHubRelease(options, native);
    const stage = JSON.parse(await readFile(join(f.dir, result.artifacts[0].ref), 'utf8'));
    assert.equal(stage.stage, 'admission-preparation-ready');
    assert.equal(stage.expected.slug, slug);
    assert.ok(stage.admission.patch.includes(`'${slug}'`));
    assert.equal(stage.admission.base_sha, mainSha);
    assert.ok(stage.admission.patch.replace(stage.admission.insertion, '') === compiler);
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
});
test('authorized admission action creates only its compiler patch and separate draft PR with durable sub-write readbacks', async (t) => {
    const f = await fixture(t), native = nativeFixture(), now = '2026-11-09T15:05:00Z', options = { requestPath: f.path, jobDir: f.dir, now };
    const planned = await planHubRelease(options, native);
    const authorize = async (context: any) => ({ admitted: true, ...context, checked_at: now, expires_at: '2026-11-09T15:10:00Z', stopped: false, grant_ref: 'fixture:scoped-authorizer' });
    const result = await advanceHubRelease({ ...options, action: 'prepare-admission', planSha256: planned.artifacts[0].sha256, maxActions: 5 }, { ...native, authorize, clock: () => Date.parse(now) });
    assert.equal(native.writes.length, 5);
    assert.equal(native.prs.length, 1);
    assert.equal(native.prs[0].draft, true);
    assert.equal(native.writes[1].body.tree.length, 1);
    assert.equal(native.writes[1].body.tree[0].path, 'scripts/compileContent.ts');
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
                    value = { capture_kind: 'article', url, time_origin: afterTimeOrigin, article_html: hydratedArticle, article_visible: articleVisible, latest_hrefs: [`/thoughts/${slug}`, `/thoughts/${oldSlug}`], cta_href: null };
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
            data = { result: await runInNewContext(script, { document: dom.window.document, location, performance: { timeOrigin: 100 }, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), fetch: async () => new Response(JSON.stringify({ schemaVersion: 1, sha: mainSha }), { headers: { 'cache-control': 'no-store' } }) }) };
        }
        return { exit_code: 0, profile_id: profile.id, command_sha256: sha(JSON.stringify(argv)), run_id: `fixture-script-${++sequence}`, stdout: JSON.stringify({ success: true, data }) };
    } };
    const actual = await readHydratedHub(input, runtime);
    assert.equal(actual.cta.final_url, ctaUrl);
    assert.equal(actual.cta.form_submitted, false);
    location.href = 'https://www.danmercede.com/thoughts';
    dom.window.document.body.style.opacity = '0';
    await assert.rejects(readHydratedHub(input, runtime), /hydrated-article-not-visible/);
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
