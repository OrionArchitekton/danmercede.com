// Read-only GitHub deployment handoff check. This never starts a deployment.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);

export async function readPublicRevision(fetchRevision = fetch) {
  let response;
  try {
    response = await fetchRevision('https://www.danmercede.com/deployment-revision.json', {
      headers: { 'User-Agent': 'orion-ci-deployment-verification/1.0' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
  } catch { throw new Error('Public revision transport failed; inspect public reachability.'); }
  if (!response.ok) throw new Error(`Public revision HTTP ${response.status}; inspect the public endpoint.`);
  if (!(response.headers.get('cache-control') ?? '').toLowerCase().split(',').some((value) => value.trim() === 'no-store')) {
    throw new Error('Public revision cache policy must include no-store.');
  }
  try { return await response.json(); }
  catch { throw new Error('Public revision JSON invalid; inspect the served artifact.'); }
}

export async function observeProductionDeployment(readJson, repository, sha, { readRevision = readPublicRevision } = {}) {
  const deployments = await readJson(`/repos/${repository}/deployments?sha=${sha}&environment=Production&per_page=100`);
  const candidates = deployments.filter((d) => d.sha === sha && d.environment === 'Production' && d.creator?.login === 'vercel[bot]' && Number.isSafeInteger(d.id) && d.id > 0);
  for (const deployment of candidates) {
    const statuses = await readJson(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=1`);
    let url;
    try { url = new URL(statuses[0]?.environment_url); } catch { continue; }
    if (statuses[0]?.state === 'success' && statuses[0]?.creator?.login === 'vercel[bot]' &&
        url.protocol === 'https:' && url.hostname.endsWith('.vercel.app') && !url.username && !url.password && !url.search && !url.hash) {
      const commitStatuses = await readJson(`/repos/${repository}/commits/${sha}/statuses?per_page=100`);
      const projectStatus = commitStatuses.find((status) => {
        try {
          const target = new URL(status.target_url);
          return status.creator?.login === 'vercel[bot]' && status.context.startsWith('Vercel') &&
            target.origin === 'https://vercel.com' && !target.search && !target.hash &&
            /^\/dan-mercedes-projects\/danmercede-com\/[A-Za-z0-9_-]+$/.test(target.pathname);
        } catch { return false; }
      });
      if (projectStatus?.state !== 'success') continue;
      const revision = await readRevision();
      if (revision?.schemaVersion !== 1 || revision?.sha !== sha) continue;
      return { deploymentId: deployment.id, url: statuses[0].environment_url, projectUrl: projectStatus.target_url, sha };
    }
  }
  return null;
}

export async function waitForProductionDeployment(readJson, repository, sha, { timeoutMs = 600_000, intervalMs = 15_000, readRevision = readPublicRevision } = {}) {
  const deadline = performance.now() + timeoutMs;
  do {
    const result = await observeProductionDeployment(readJson, repository, sha, { readRevision });
    if (result) return result;
    const remaining = deadline - performance.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remaining)));
  } while (performance.now() <= deadline);
  throw new Error(`No successful Vercel Production deployment and matching served revision for ${repository}@${sha}. Build success is not deployment proof; inspect the Git handoff before retrying a release.`);
}

export async function readGitHubArray(path, execute = exec) {
  try {
    const { stdout } = await execute('gh', ['api', path, '--method', 'GET',
      '-H', 'X-GitHub-Api-Version: 2022-11-28'], { timeout: 10_000, maxBuffer: 2_000_000 });
    const data = JSON.parse(stdout);
    if (!Array.isArray(data)) throw new Error('Unexpected deployment API response');
    return data;
  } catch {
    // Do not echo child argv/env, response bodies or provider error strings.
    throw new Error('GitHub deployment API read failed; check read permissions and GitHub availability.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      repository: { type: 'string', default: process.env.GITHUB_REPOSITORY },
      sha: { type: 'string', default: process.env.GITHUB_SHA },
      once: { type: 'boolean', default: false },
    } });
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(values.repository ?? '')) {
      throw new Error('A GitHub owner/repository is required.');
    }
    if (!/^[a-f0-9]{40}$/i.test(values.sha ?? '')) {
      throw new Error('A 40-character commit SHA is required.');
    }
    const result = await waitForProductionDeployment(readGitHubArray, values.repository, values.sha,
      values.once ? { timeoutMs: 0 } : {});
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
