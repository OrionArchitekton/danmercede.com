import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { main, readPublicationSnapshot } from '../scripts/newsletterHubReadiness.mjs';
const slug = '2026-10-26-who-gets-to-interrupt-your-ai-work';
const coverage = ['identity', 'publication_time', 'title', 'body', 'headings', 'anchor', 'cover', 'caption', 'commentary', 'cta'];
function record(overrides = {}) {
    return { slug, title: 'Who Gets to Interrupt Your AI Work?', observed_title: 'Who Gets to Interrupt Your AI Work?', hub_release_week: '2026-11-02', native_id: '7519523770274070528', public_url: 'https://www.linkedin.com/pulse/who-gets-interrupt-your-ai-work-dan-mercede-abcde/', package_sha256: 'a'.repeat(64), published_at: '2026-10-26T14:08:08Z', observed_at: '2026-10-26T14:10:00Z', evidence_ref: 'private:edition15', evidence_sha256: 'b'.repeat(64), coverage, ...overrides };
}
function envelope(editions = [record()]) { return { schema_version: 1, kind: 'newsletter-publication-coverage', newsletter_id: '7477834312608866304', editions }; }
async function invoke(t, { snapshot = envelope(), now = '2026-11-02T14:08:07Z', readGitHub = async () => { throw Error('unexpected native read'); }, releaseWeek = '2026-11-02', selectedSlug = slug } = {}) {
    const dir = await mkdtemp(join(tmpdir(), 'hub-readiness-test-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'snapshot.json');
    await writeFile(path, typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot));
    let output = '', error = '';
    const exit = await main(['--publication-evidence-path', path, '--slug', selectedSlug, '--release-week', releaseWeek, '--sync-grace-minutes', '15', '--now', now], { readGitHub, stdout: s => { output += s; }, stderr: s => { error += s; } });
    return { exit, result: output ? JSON.parse(output) : null, error };
}
test('publication gate uses actual elapsed hours and performs no native read', async (t) => {
    const { exit, result } = await invoke(t);
    assert.equal(exit, 0);
    assert.equal(result.decision.state, 'too-early');
    assert.equal(result.publication.eligible_at, '2026-11-02T14:08:08.000Z');
    assert.equal(result.authority_granted, false);
    assert.equal(result.public_delivery, 'unknown');
});
test('exact elapsed boundary survives DST and uses nominal Pacific sync grace', async (t) => {
    const { result } = await invoke(t, { now: '2026-11-02T14:08:08Z' });
    assert.equal(result.publication.eligible, true);
    assert.equal(result.publication.nominal_sync_at, '2026-11-02T16:10:00.000Z');
    assert.equal(result.publication.recovery_due_at, '2026-11-02T16:25:00.000Z');
});
test('incomplete, duplicate, contradictory, unsafe or unsupported observations hold before native reads', async (t) => {
    const bad = [envelope([record({ coverage: ['identity', 'publication_time'] })]), envelope([record({ observed_title: 'Different' })]), envelope([record(), record()]), envelope([record({ published_at: '2026-10-26' })]), envelope([record({ published_at: '2026-10-26T14:08:08' })]), envelope([record({ published_at: '2026-02-30T14:08:08Z' })]), envelope([record({ published_at: '2026-10-26T14:08:08-00:00' })]), envelope([record({ published_at: '2026-10-26T14:08:08.1234Z' })]), envelope([record({ observed_at: '2026-11-03T00:00:00Z' })]), envelope([record({ extra: true })]), envelope([record({ public_url: 'https://www.linkedin.com/pulse/x/../y/' })]), JSON.stringify(envelope()).replace('"schema_version":1', '"schema_version":1,"schema_version":1'), JSON.stringify(envelope()).replace('"title":"Who', '"title":"Injected","title":"Who')];
    for (const snapshot of bad) {
        const { result } = await invoke(t, { snapshot });
        assert.equal(result.decision.state, 'unverified');
        assert.equal(result.decision.operation, null);
    }
});
test('late actual publication controls eligibility and nominal grace never advances it', async (t) => {
    const snapshot = envelope([record({ published_at: '2026-10-26T20:00:00Z', observed_at: '2026-10-26T20:05:00Z' })]);
    const { result } = await invoke(t, { snapshot, now: '2026-11-02T19:59:59Z' });
    assert.equal(result.decision.state, 'too-early');
    assert.equal(result.publication.recovery_due_at, '2026-11-02T20:00:00.000Z');
});
const repo = 'OrionArchitekton/danmercede.com', head = 'c'.repeat(40), old = 'd'.repeat(40);
const prefix = `/repos/${repo}`;
const workflow = await readFile(new URL('../.github/workflows/substrate-sync.yml', import.meta.url), 'utf8');
function content(source) { const bytes = Buffer.from(source); return { type: 'file', encoding: 'base64', size: bytes.length, content: bytes.toString('base64'), sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') }; }
function compiler(slugs = [slug]) { return `export const HUB_ESSAY_ALLOWLIST: readonly string[] = ${JSON.stringify(slugs)};`; }
function bundle(slugs = []) { return `export const THOUGHTS: Thought[] = ${JSON.stringify(slugs.map(slug => ({ title: 'Title', preview: 'Preview', date: '2026-11-02', category: 'Doctrine', slug, body: 'Body' })))};`; }
function nativeFixture({ allowlisted = true, synced = false, runs = [], prs = [], mainAfter = head, compilerText, bundleText, workflowText = workflow, runCount = runs.length, workflowState = 'active' } = {}) {
    const calls = [];
    let mainReads = 0;
    const read = async (path) => {
        calls.push(path);
        if (path === `${prefix}/git/ref/heads/main`)
            return { ref: 'refs/heads/main', object: { type: 'commit', sha: ++mainReads === 1 ? head : mainAfter } };
        if (path === `${prefix}/contents/scripts/compileContent.ts?ref=${head}`)
            return content(compilerText ?? compiler(allowlisted ? [slug] : []));
        if (path === `${prefix}/contents/constants.generated.ts?ref=${head}`)
            return content(bundleText ?? bundle(synced ? [slug] : []));
        if (path === `${prefix}/contents/.github/workflows/substrate-sync.yml?ref=${head}`)
            return content(workflowText);
        if (path === `${prefix}/actions/workflows/substrate-sync.yml`)
            return { id: 292432866, path: '.github/workflows/substrate-sync.yml', state: workflowState };
        if (path === `${prefix}/actions/workflows/substrate-sync.yml/runs?per_page=100&page=1`)
            return { total_count: runCount, workflow_runs: runs };
        if (path === `${prefix}/pulls?state=open&base=main&head=OrionArchitekton%3Acodex%2Fsubstrate-sync&per_page=100&page=1`)
            return prs;
        if (prs[0] && path === `${prefix}/contents/constants.generated.ts?ref=${prs[0].head.sha}`)
            return content(bundle([]));
        throw new Error('unexpected route');
    };
    return { read, calls };
}
test('pinned current main distinguishes source sync and unknown canonical admission', async (t) => {
    for (const [config, expected] of [[{ synced: true }, 'already-source-synced'], [{ allowlisted: false }, 'ambiguous']]) {
        const native = nativeFixture(config);
        const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
        assert.equal(result.decision.state, expected);
        assert.equal(result.source.main_sha, head);
        assert.equal(result.source.content_equivalence, 'not-checked');
        assert.equal(native.calls.filter(p => p.endsWith('/git/ref/heads/main')).length, 2);
    }
});
function run(overrides = {}) { return { id: 123, workflow_id: 292432866, path: '.github/workflows/substrate-sync.yml', repository: { full_name: repo }, head_branch: 'main', head_sha: old, event: 'schedule', status: 'queued', conclusion: null, ...overrides }; }
function pr(overrides = {}) { return { number: 240, state: 'open', head: { ref: 'codex/substrate-sync', sha: old, repo: { full_name: repo } }, base: { ref: 'main', sha: head, repo: { full_name: repo } }, ...overrides }; }
test('global queued old-head sync and unrelated existing PR own the work', async (t) => {
    for (const [config, state] of [[{ runs: [run()] }, 'existing-queued-running'], [{ prs: [pr()] }, 'existing-pr']]) {
        const native = nativeFixture(config);
        const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
        assert.equal(result.decision.state, state);
        assert.equal(result.decision.operation, null);
        if (state === 'existing-pr')
            assert.equal(result.existing.prs[0].target_slug_present, false);
    }
});
test('manual other-ref sync occupies repository-wide concurrency and fixed PR branch', async (t) => {
    const n = nativeFixture();
    const read = async (path) => path.endsWith('/runs?per_page=100&page=1') ? { total_count: 1, workflow_runs: [run({ head_branch: 'codex/other-dispatch', event: 'workflow_dispatch' })] } : n.read(path);
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: read });
    assert.equal(result.decision.state, 'existing-queued-running');
    assert.equal(result.existing.runs[0].head_branch, 'codex/other-dispatch');
    assert.equal(result.decision.operation, null);
});
test('other-ref inventory is bounded and same-commit terminal attempts hold', async (t) => {
    for (const bad of [null, '', 'bad\nbranch']) {
        const n = nativeFixture({ runs: [run({ head_branch: bad, event: 'workflow_dispatch' })] });
        const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: n.read });
        assert.equal(result.decision.state, 'ambiguous');
        assert.equal(result.decision.operation, null);
    }
    const n = nativeFixture({ runs: [run({ head_branch: 'codex/finished', head_sha: head, event: 'workflow_dispatch', status: 'completed', conclusion: 'success' })] });
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: n.read });
    assert.equal(result.decision.state, 'ambiguous');
    assert.equal(result.decision.operation, null);
    assert.equal(result.existing.runs[0].head_branch, 'codex/finished');
    const older = nativeFixture({ runs: [run({ head_branch: 'codex/finished-older', head_sha: old, event: 'workflow_dispatch', status: 'completed', conclusion: 'success' })] });
    const { result: olderResult } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: older.read });
    assert.equal(olderResult.decision.state, 'dispatch-if-authorized');
});
test('grace waits until precise boundary then provides only one advisory identity', async (t) => {
    for (const now of ['2026-11-02T14:10:00Z', '2026-11-02T16:10:00Z', '2026-11-02T16:24:59Z']) {
        const native = nativeFixture();
        const { result } = await invoke(t, { now, readGitHub: native.read });
        assert.equal(result.decision.state, 'waiting-for-scheduled-sync');
        assert.equal(result.decision.operation, null);
    }
    const native = nativeFixture();
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
    assert.equal(result.decision.state, 'dispatch-if-authorized');
    assert.equal(result.decision.operation.observed_main_sha, head);
    assert.equal(result.authority_granted, false);
    assert.ok(native.calls.every(path => path.startsWith(prefix + '/') && !/dispatches|merge|comments/.test(path)));
});
test('native failures drift unsupported source workflow inventory and unknown state refuse', async (t) => {
    const configs = [{ mainAfter: old }, { workflowState: 'disabled_manually' }, { compilerText: 'export const HUB_ESSAY_ALLOWLIST = [process.exit()];' }, { compilerText: `export const HUB_ESSAY_ALLOWLIST = ["${slug}"]; export const HUB_ESSAY_ALLOWLIST=[];` }, { workflowText: workflow.replace('ref: main', 'ref: older') }, { workflowText: workflow.replace('timezone: America/Los_Angeles', 'timezone: UTC') }, { runs: [run({ status: 'mystery' })] }, { runs: [run({ repository: { full_name: 'Else/repo' } })] }, { runs: [run(), run()] }, { runs: [run({ head_sha: head, status: 'completed', conclusion: 'success' })] }, { runs: [run({ head_sha: head, status: 'completed', conclusion: 'failure' })] }, { runs: [run()], runCount: 2 }, { prs: [pr(), pr({ number: 241 })] }];
    for (const config of configs) {
        const native = nativeFixture(config);
        const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
        assert.equal(result.decision.state, 'ambiguous', JSON.stringify(config));
        assert.equal(result.decision.operation, null);
    }
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: async () => { throw Error('secret-native-body-must-not-leak'); } });
    assert.equal(result.decision.state, 'ambiguous');
    assert.ok(!JSON.stringify(result).includes('secret-native'));
});
test('same main gives a global dedupe key across editions', async (t) => {
    const native = nativeFixture();
    const first = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
    const other = '2026-10-19-another-essay', secondNative = nativeFixture({ compilerText: compiler([slug, other]) });
    const second = await invoke(t, { selectedSlug: other, snapshot: envelope([record({ slug: other })]), now: '2026-11-02T16:25:00Z', readGitHub: secondNative.read });
    assert.equal(first.result.decision.operation.dedupe_key, second.result.decision.operation.dedupe_key);
    assert.equal(first.result.decision.operation.dedupe_key, `${repo}:.github/workflows/substrate-sync.yml:refs/heads/main:${head}`);
});
test('bounded complete pagination retains global work on later pages', async (t) => {
    const historical = Array.from({ length: 100 }, (_, i) => run({ id: i + 1, status: 'completed', conclusion: 'success' }));
    const native = nativeFixture({ runs: historical, runCount: 101 });
    const read = async (path) => path.endsWith('/runs?per_page=100&page=2') ? { total_count: 101, workflow_runs: [run({ id: 101, head_branch: 'codex/later-page', event: 'workflow_dispatch' })] } : native.read(path);
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: read });
    assert.equal(result.decision.state, 'existing-queued-running');
    assert.equal(result.existing.runs.length, 101);
    for (const count of [99, 301]) {
        const n = nativeFixture({ runs: historical, runCount: count });
        const { result: r } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: n.read });
        assert.equal(r.decision.state, 'ambiguous');
    }
});
test('private snapshot reader rejects final symlinks and oversized files', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'hub-file-test-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const original = join(dir, 'original.json'), link = join(dir, 'link.json');
    await writeFile(original, JSON.stringify(envelope()));
    await symlink(original, link);
    const options = { slug, releaseWeek: '2026-11-02', now: Date.parse('2026-11-02T16:25:00Z'), grace: 15 };
    await assert.rejects(readPublicationSnapshot(link, options));
    await assert.rejects(readPublicationSnapshot(dir, options));
    await writeFile(original, ' '.repeat(1024 * 1024 + 1));
    await assert.rejects(readPublicationSnapshot(original, options));
});
test('strict command syntax refuses missing duplicate unknown and unsafe arguments', async () => {
    for (const args of [[], ['--unexpected', 'private'], ['--publication-evidence-path', 'relative', '--slug', slug, '--release-week', '2026-11-02', '--sync-grace-minutes', '15', '--now', '2026-11-02T16:25:00Z'], ['--publication-evidence-path', '/tmp/x', '--slug', slug, '--release-week', '2026-11-03', '--sync-grace-minutes', '15', '--now', '2026-11-02T16:25:00Z']]) {
        let output = '', error = '';
        assert.equal(await main(args, { stdout: s => output += s, stderr: s => error += s }), 2);
        assert.equal(output, '');
        assert.equal(error, 'Invalid diagnostic arguments.\n');
    }
});
test('E16 exact time and summertime nominal sync preserve independent clocks', async (t) => {
    const e16 = record({ published_at: '2026-11-02T15:02:46Z', observed_at: '2026-11-02T15:05:00Z', hub_release_week: '2026-11-09' });
    const { result } = await invoke(t, { snapshot: envelope([e16]), releaseWeek: '2026-11-09', now: '2026-11-09T15:02:45Z' });
    assert.equal(result.decision.state, 'too-early');
    assert.equal(result.publication.eligible_at, '2026-11-09T15:02:46.000Z');
    assert.equal(result.publication.nominal_sync_at, '2026-11-09T16:10:00.000Z');
    const summer = record({ published_at: '2026-10-19T14:00:00Z', observed_at: '2026-10-19T14:05:00Z', hub_release_week: '2026-10-26' });
    const { result: r } = await invoke(t, { snapshot: envelope([summer]), releaseWeek: '2026-10-26', now: '2026-10-26T13:59:59Z' });
    assert.equal(r.publication.nominal_sync_at, '2026-10-26T15:10:00.000Z');
});
test('canonical journal article URL without a trailing slash is admitted and aliases collide', async (t) => {
    const canonical = 'https://www.linkedin.com/pulse/who-gets-interrupt-your-ai-work-dan-mercede-abcde';
    const { result } = await invoke(t, { snapshot: envelope([record({ public_url: canonical })]) });
    assert.equal(result.decision.state, 'too-early');
    assert.equal(result.publication.public_url, canonical);
    const duplicate = record({ slug: 'another-essay', native_id: '7519523770274070529', public_url: canonical });
    const { result: r } = await invoke(t, { snapshot: envelope([record(), duplicate]) });
    assert.equal(r.decision.state, 'unverified');
});
test('unknown workflow trigger and conditional strict compile refuse', async (t) => {
    for (const workflowText of [workflow.replace('on:\n', 'on:\n  push: {}\n'), workflow.replace('run: npm run compile -- --strict --require-matches', 'if: false\n        run: npm run compile -- --strict --require-matches')]) {
        const n = nativeFixture({ workflowText });
        const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: n.read });
        assert.equal(result.decision.state, 'ambiguous');
    }
});
test('actual committed multiline bundle is parsed as inert body data', async (t) => {
    const bundleText = await readFile(new URL('../constants.generated.ts', import.meta.url), 'utf8');
    const compilerText = await readFile(new URL('../scripts/compileContent.ts', import.meta.url), 'utf8');
    const native = nativeFixture({ compilerText, bundleText });
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
    assert.equal(result.decision.state, 'already-source-synced');
});
test('whitespace-only matched titles remain unusable supplied observations', async (t) => {
    const { result } = await invoke(t, { snapshot: envelope([record({ title: ' ', observed_title: ' ' })]) });
    assert.equal(result.decision.state, 'unverified');
});
test('changed known-name workflow step and mismatched source blob cannot authorize a suggestion', async (t) => {
    const n = nativeFixture({ workflowText: workflow.replace('node scripts/optimizeDiagrams.mjs --apply', 'git checkout older') });
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: n.read });
    assert.equal(result.decision.state, 'ambiguous');
    const good = nativeFixture();
    const read = async (path) => { const data = await good.read(path); return path.includes('/contents/') ? { ...data, sha: '0'.repeat(40) } : data; };
    const { result: r } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: read });
    assert.equal(r.decision.state, 'ambiguous');
});
test('bare observed and exact documented workflow path forms preserve all readiness decisions', async (t) => {
    for (const suffix of [false, true]) {
        const variants = [
            [{ runs: [run()] }, 'existing-queued-running'],
            [{ runs: [run({ head_branch: 'codex/other-ref', event: 'workflow_dispatch' })] }, 'existing-queued-running'],
            [{ runs: [run({ head_sha: head, status: 'completed', conclusion: 'success' })] }, 'ambiguous'],
            [{ allowlisted: false, runs: [run({ status: 'completed', conclusion: 'success' })] }, 'ambiguous'],
            [{ synced: true, runs: [run({ status: 'completed', conclusion: 'success' })] }, 'already-source-synced'],
            [{ runs: [run({ status: 'completed', conclusion: 'success' })] }, 'dispatch-if-authorized'],
        ];
        for (const [config, expected] of variants) {
            const rows = config.runs.map(row => ({ ...row, path: suffix ? `${row.path}@${row.head_branch}` : row.path }));
            const native = nativeFixture({ ...config, runs: rows });
            const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
            assert.equal(result.decision.state, expected, `${suffix ? 'suffixed' : 'bare'} ${expected}`);
        }
    }
});
test('workflow path suffix must exactly match the independently validated branch', async (t) => {
    const path = '.github/workflows/substrate-sync.yml';
    for (const invalid of [`${path}@`, `${path}@other`, `${path}@main-extra`, `${path}@main\n`, `${path}@refs/heads/main`, `.github/workflows/build.yml@main`, `prefix${path}@main`, `${path}.extra@main`]) {
        const native = nativeFixture({ runs: [run({ path: invalid })] });
        const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
        assert.equal(result.decision.state, 'ambiguous');
        assert.equal(result.decision.operation, null);
    }
});
test('malformed Git branch metadata holds for bare and exact-suffixed run paths', async (t) => {
    const invalid = ['not/a/git/ref..', 'with@{reflog', 'bad branch', 'bad\tbranch', 'bad\x7fbranch', 'bad~branch', 'bad^branch', 'bad:branch', 'bad?branch', 'bad*branch', 'bad[branch', 'bad\\branch', '/leading', 'trailing/', 'double//slash', '.hidden', 'nested/.hidden', 'nested/file.lock', 'ends.', '-leading', 'HEAD', 'nested/file.lock/child', 'x'.repeat(256), '\ud800'];
    for (const head_branch of invalid)
        for (const suffixed of [false, true]) {
            const path = suffixed ? `.github/workflows/substrate-sync.yml@${head_branch}` : '.github/workflows/substrate-sync.yml';
            const native = nativeFixture({ runs: [run({ head_branch, path, event: 'workflow_dispatch', status: 'completed', conclusion: 'success' })] });
            const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
            assert.equal(result.decision.state, 'ambiguous', `${JSON.stringify(head_branch)} ${suffixed}`);
            assert.equal(result.decision.operation, null);
        }
});
test('Git-valid single-level slash and Unicode branch metadata remains supported', async (t) => {
    for (const head_branch of ['main', 'feature/worker-one', 'valid-名字/épisode', 'foo./bar', 'foo/-bar', 'foo/@', '@', 'feature/🚀', '\u00a0'])
        for (const suffixed of [false, true]) {
            const path = suffixed ? `.github/workflows/substrate-sync.yml@${head_branch}` : '.github/workflows/substrate-sync.yml';
            const native = nativeFixture({ runs: [run({ head_branch, path, event: 'workflow_dispatch' })] });
            const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
            assert.equal(result.decision.state, 'existing-queued-running', `${JSON.stringify(head_branch)} ${suffixed}`);
            assert.equal(result.existing.runs[0].head_branch, head_branch);
        }
});
test('bundle presence proves source sync without an allowlist override', async (t) => {
    const native = nativeFixture({ allowlisted: false, synced: true });
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
    assert.equal(result.decision.state, 'already-source-synced');
    assert.equal(result.source.allowlisted, false);
    assert.equal(result.source.admitted, null);
    assert.equal(result.source.bundle_slug_present, true);
    assert.equal(result.decision.operation, null);
});
test('missing override and missing bundle leave canonical surface targets uninspected', async (t) => {
    const native = nativeFixture({ allowlisted: false });
    const { result } = await invoke(t, { now: '2026-11-02T16:25:00Z', readGitHub: native.read });
    assert.equal(result.decision.state, 'ambiguous');
    assert.deepEqual(result.decision.reasons, ['canonical-targets-not-inspected']);
    assert.equal(result.source.allowlisted, false);
    assert.equal(result.source.admitted, null);
    assert.equal(result.source.bundle_slug_present, false);
    assert.equal(result.decision.operation, null);
});
