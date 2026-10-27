// Read-only GitHub deployment handoff check. This never starts a deployment.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);

export async function observeProductionDeployment(readJson, repository, sha) {
  const deployments = await readJson(`/repos/${repository}/deployments?sha=${sha}&environment=Production&per_page=100`);
  const candidates = deployments.filter((d) => d.sha === sha && d.environment === 'Production' && d.creator?.login === 'vercel[bot]' && Number.isSafeInteger(d.id) && d.id > 0);
  for (const deployment of candidates) {
    const statuses = await readJson(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=1`);
    let url;
    try { url = new URL(statuses[0]?.environment_url); } catch { continue; }
    if (statuses[0]?.state === 'success' && statuses[0]?.creator?.login === 'vercel[bot]' &&
        url.protocol === 'https:' && url.hostname.endsWith('.vercel.app') && !url.username && !url.password && !url.search && !url.hash) {
      return { deploymentId: deployment.id, url: statuses[0].environment_url, sha };
    }
  }
  return null;
}

export async function waitForProductionDeployment(readJson, repository, sha, { timeoutMs = 600_000, intervalMs = 15_000 } = {}) {
  const deadline = performance.now() + timeoutMs;
  do {
    const result = await observeProductionDeployment(readJson, repository, sha);
    if (result) return result;
    const remaining = deadline - performance.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remaining)));
  } while (performance.now() <= deadline);
  throw new Error(`No successful Vercel Production deployment for ${repository}@${sha}. Build success is not deployment proof; inspect the Git handoff before retrying a release.`);
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
    const readJson = async (path) => {
      try {
        const { stdout } = await exec('gh', ['api', path, '--method', 'GET',
          '-H', 'X-GitHub-Api-Version: 2022-11-28'], { timeout: 10_000, maxBuffer: 2_000_000 });
        const data = JSON.parse(stdout);
        if (!Array.isArray(data)) throw new Error('Unexpected deployment API response');
        return data;
      } catch {
        // Do not echo child argv/env, response bodies or provider error strings.
        throw new Error('GitHub deployment API read failed; check read permissions and GitHub availability.');
      }
    };
    const result = await waitForProductionDeployment(readJson, values.repository, values.sha,
      values.once ? { timeoutMs: 0 } : {});
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
