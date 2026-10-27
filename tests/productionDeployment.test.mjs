import test from 'node:test';
import assert from 'node:assert/strict';

const sha = '545ca97c45965c7a1b5bfcb568b505dc740db078';
const repository = 'OrionArchitekton/danmercede.com';
const projectStatus = { context: 'Vercel', state: 'success', creator: { login: 'vercel[bot]' },
  target_url: 'https://vercel.com/dan-mercedes-projects/danmercede-com/example' };
const readRevision = async () => ({ schemaVersion: 1, sha });

test('a green preview and an older production deployment do not verify this merge', async () => {
  const { observeProductionDeployment } = await import('../scripts/verifyProductionDeployment.mjs');
  const calls = [];
  const result = await observeProductionDeployment(async (path) => {
    calls.push(path);
    return [
      { id: 1, sha, environment: 'Preview', creator: { login: 'vercel[bot]' } },
      { id: 2, sha: 'a'.repeat(40), environment: 'Production', creator: { login: 'vercel[bot]' } },
    ];
  }, repository, sha);
  assert.equal(result, null);
  assert.equal(calls.length, 1, 'do not inspect statuses of unrelated deployments');
});

test('a delayed Vercel production status is polled until this exact merge succeeds', async () => {
  const { waitForProductionDeployment } = await import('../scripts/verifyProductionDeployment.mjs');
  let observations = 0;
  const result = await waitForProductionDeployment(async (path) => {
    if (path.includes('/commits/')) return [projectStatus];
    if (path.includes('/statuses?')) {
      observations += 1;
      return [{ state: observations === 1 ? 'pending' : 'success', creator: { login: 'vercel[bot]' }, environment_url: 'https://danmercede-example.vercel.app' }];
    }
    return [{ id: 3, sha, environment: 'Production', production_environment: false, creator: { login: 'vercel[bot]' } }];
  }, repository, sha, { timeoutMs: 2000, intervalMs: 1, readRevision });
  assert.equal(result.deploymentId, 3);
  assert.equal(result.sha, sha);
  assert.equal(observations, 2);
});

test('absence, a failed latest status and non-Vercel status cannot pass', async () => {
  const { waitForProductionDeployment } = await import('../scripts/verifyProductionDeployment.mjs');
  for (const statuses of [[], [{ state: 'failure' }, { state: 'success' }], [{ state: 'success', creator: { login: 'other-app[bot]' } }]]) {
    await assert.rejects(waitForProductionDeployment(async (path) => path.includes('/statuses?') ? statuses : [
      { id: 3, sha, environment: 'Production', creator: { login: 'vercel[bot]' } },
    ], repository, sha, { timeoutMs: 0 }), /No successful Vercel Production deployment/);
  }
});

test('untrusted identifiers and destination URLs cannot be accepted as Vercel proof', async () => {
  const { observeProductionDeployment } = await import('../scripts/verifyProductionDeployment.mjs');
  for (const [id, url] of [['3/other', 'https://example.vercel.app'], [3, 'https://evil.example/'], [3, 'http://example.vercel.app']]) {
    const result = await observeProductionDeployment(async (path) => path.includes('/statuses?') ? [
      { state: 'success', creator: { login: 'vercel[bot]' }, environment_url: url },
    ] : [{ id, sha, environment: 'Production', creator: { login: 'vercel[bot]' } }], repository, sha);
    assert.equal(result, null);
  }
});

test('GitHub API errors cannot be treated as an empty successful result', async () => {
  const { waitForProductionDeployment } = await import('../scripts/verifyProductionDeployment.mjs');
  await assert.rejects(waitForProductionDeployment(async () => { throw new Error('GitHub unavailable'); }, repository, sha, { timeoutMs: 0 }), /GitHub unavailable/);
});

test('deployment verification runs only after a protected main push, with read-only permissions', async () => {
  const { readFileSync } = await import('node:fs');
  const { load } = await import('js-yaml');
  const ci = load(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'));
  const job = ci.jobs['production-deployment'];
  assert.ok(job, 'main merges must check the deployment handoff');
  assert.equal(job.if, "github.event_name == 'push' && github.ref == 'refs/heads/main'");
  assert.equal(job.needs, 'build');
  assert.deepEqual(job.permissions, { contents: 'read', deployments: 'read', statuses: 'read' });
  assert.ok(job.steps.some((s) => s.run === 'node scripts/verifyProductionDeployment.mjs'));
  assert.ok(!job.steps.some((s) => /deploy --prod|workflow run/.test(s.run ?? '')));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts.test.includes('tests/productionDeployment.test.mjs'));
});

test('another project or an older served public revision cannot satisfy this hub', async () => {
  const { observeProductionDeployment } = await import('../scripts/verifyProductionDeployment.mjs');
  for (const [target_url, publicSha] of [
    ['https://vercel.com/dan-mercedes-projects/another-project/example', sha],
    [projectStatus.target_url, 'b'.repeat(40)],
  ]) {
    const result = await observeProductionDeployment(async (path) => {
      if (path.includes('/commits/')) return [{ ...projectStatus, target_url }];
      if (path.includes('/statuses?')) return [{ state: 'success', creator: { login: 'vercel[bot]' }, environment_url: 'https://danmercede-example.vercel.app' }];
      return [{ id: 3, sha, environment: 'Production', creator: { login: 'vercel[bot]' } }];
    }, repository, sha, { readRevision: async () => ({ schemaVersion: 1, sha: publicSha }) });
    assert.equal(result, null);
  }
});

test('the operator CLI rejects invalid commit identity before any API access', async () => {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [new URL('../scripts/verifyProductionDeployment.mjs', import.meta.url).pathname,
    '--repository', repository, '--sha', 'not-a-commit', '--once'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /40-character commit SHA/);
});

test('public revision transport, HTTP and JSON failures are distinct from a stale revision', async () => {
  const { readPublicRevision } = await import('../scripts/verifyProductionDeployment.mjs');
  await assert.rejects(readPublicRevision(async () => { throw new Error('private transport detail'); }), /Public revision transport failed/);
  await assert.rejects(readPublicRevision(async () => new Response('private body', { status: 503 })), /Public revision HTTP 503/);
  await assert.rejects(readPublicRevision(async () => new Response('<html>old application</html>', { headers: { 'Cache-Control': 'no-store' } })), /Public revision JSON invalid/);
  assert.deepEqual(await readPublicRevision(async () => Response.json({ schemaVersion: 1, sha: 'a'.repeat(40) }, { headers: { 'Cache-Control': 'no-store' } })),
    { schemaVersion: 1, sha: 'a'.repeat(40) });
});

test('the actual public revision response must disable shared caching', async () => {
  const { readPublicRevision } = await import('../scripts/verifyProductionDeployment.mjs');
  await assert.rejects(readPublicRevision(async () => Response.json({ schemaVersion: 1, sha })), /Public revision cache policy/);
});

test('the CI GitHub reader checks subprocess results and JSON without exposing provider details', async () => {
  const { readGitHubArray } = await import('../scripts/verifyProductionDeployment.mjs');
  let command;
  assert.deepEqual(await readGitHubArray('/repos/example/site/deployments', async (...args) => {
    command = args;
    return { stdout: '[]' };
  }), []);
  assert.equal(command[0], 'gh');
  assert.deepEqual(command[1], ['api', '/repos/example/site/deployments', '--method', 'GET', '-H', 'X-GitHub-Api-Version: 2022-11-28']);
  for (const stdout of ['', '{}', '{"private":"provider body"}']) {
    await assert.rejects(readGitHubArray('/repos/example/site/deployments', async () => ({ stdout })),
      { message: 'GitHub deployment API read failed; check read permissions and GitHub availability.' });
  }
  await assert.rejects(readGitHubArray('/repos/example/site/deployments', async () => { throw new Error('private subprocess detail'); }),
    { message: 'GitHub deployment API read failed; check read permissions and GitHub availability.' });
});
