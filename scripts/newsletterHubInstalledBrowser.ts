/** Fixed installed-CLI public reader. Lease endpoints/capabilities never leave memory. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { digest, insist } from './newsletterHubReleaseJournal.ts';
import { readHydratedHub, HUB_BROWSER_RECIPE } from './newsletterHubReleaseBrowser.ts';

const POOL = '/home/orion/.local/bin/orion-browser';
const AGENT = '/home/orion/.local/bin/agent-browser';
const PURPOSE = 'Signed-out general web reading: job posts, articles, docs. Never sign in to any account here. Not for YouTube competitor study (use study).';
const runFile = promisify(execFile);
type Invocation = (binary: string, args: string[], options: any) => Promise<{ exit_code: number; stdout: string }>;
type Dependencies = { invoke?: Invocation; clock?: () => number; toolBytes?: (path: string) => Promise<Buffer>; fetchDiscovery?: typeof fetch; pause?: (milliseconds: number) => Promise<void> };
type Input = { operation_id: string; input_sha256: string; sha: string; slug: string; cta: any };
type Tab = { index: number; type: string; url: string; active: boolean };
function environment() {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['HOME', 'PATH', 'USER', 'LOGNAME', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'TMPDIR', 'LANG', 'LC_ALL']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.AGENT_BROWSER_DEFAULT_TIMEOUT = '10000';
  env.AGENT_BROWSER_NO_AUTO_DIALOG = 'true';
  return env;
}
async function invokeInstalled(binary: string, args: string[], options: any) {
  const result = await runFile(binary, args, { ...options, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' });
  return { exit_code: 0, stdout: result.stdout.toString() };
}
function jsonResult(result: any) {
  insist(Number.isInteger(result?.exit_code) && typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= 2 * 1024 * 1024, 'browser-command-response-unusable');
  try { return JSON.parse(result.stdout); } catch { throw Error('browser-command-response-unusable'); }
}
function tabRows(value: any): Tab[] {
  const tabs = value?.tabs;
  insist(Array.isArray(tabs) && tabs.length > 0 && tabs.length <= 20, 'browser-reader-tabs-unverified');
  insist(tabs.every(t => Number.isSafeInteger(t.index) && t.index >= 0 && typeof t.url === 'string' && t.url.length <= 4096 && t.type === 'page' && typeof t.active === 'boolean'), 'browser-reader-tabs-unverified');
  insist(new Set(tabs.map(t => t.index)).size === tabs.length && tabs.filter(t => t.active).length === 1, 'browser-reader-tabs-unverified');
  return tabs;
}
/** Only this source-owned recipe reaches the internal command executor. */
export async function readInstalledHubBrowser(input: Input, dependencies: Dependencies = {}) {
  insist(/^[a-f0-9]{64}$/.test(input.input_sha256) && /^[a-f0-9]{40}$/.test(input.sha) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug), 'browser-reader-input-unusable');
  insist(['question', 'external'].includes(input.cta?.kind) && typeof input.cta.text === 'string' && input.cta.text.length <= 2000, 'browser-reader-input-unusable');
  if (input.cta.kind === 'external') {
    const url = new URL(input.cta.url);
    insist(url.origin === 'https://www.orionintelligenceagency.com' && url.pathname === '/readiness-scan' && !url.username && !url.password && !url.hash && url.href === input.cta.url, 'browser-reader-cta-unusable');
  }
  const invoke = dependencies.invoke ?? invokeInstalled;
  const clock = dependencies.clock ?? Date.now;
  const started = clock(), holder = `fcn-reader-${randomUUID()}`;
  const env = environment();
  let endpoint = '', discoveryUrl = '', ownTarget = '', expectedUrl = '', expires = 0, acquired = false, leaseAttempted = false, ownTab: number | null = null;
  let disconnected = false, tabClosed = false, released = false, releaseStop = '';
  let baseline: Tab[] = [], sequence = 0, configDir = '';
  let pendingNavigation: { from: string; to: string } | null = null;
  const toolBytes = dependencies.toolBytes ?? (async path => readFile(await realpath(path)));
  const hashes = { pool: digest(await toolBytes(POOL)), agent: digest(await toolBytes(AGENT)) };
  async function call(binary: string, args: string[], timeout = 15000) {
    try { return await invoke(binary, args, { timeout, env, windowsHide: true }); }
    catch (error: any) {
      // execFile errors embed argv, stderr and endpoint capabilities. Keep only bounded native JSON.
      if (Number.isInteger(error?.code) && typeof error.stdout === 'string' && Buffer.byteLength(error.stdout) <= 2 * 1024 * 1024) {
        return { exit_code: error.code, stdout: error.stdout };
      }
      throw Error('browser-command-transport-unverified');
    }
  }
  async function pool(args: string[], timeout = 15000) {
    const result = await call(POOL, ['--json', ...args], timeout);
    const value = jsonResult(result);
    if (value.code === 'BUSY' && result.exit_code === 3) throw Error('browser-reader-busy');
    insist(result.exit_code === 0 && value.ok === true && value.code === 'OK' && value.exit === 0, 'browser-reader-lease-unverified');
    return value.data;
  }
  async function ownedLease() {
    insist(clock() - started < 180000 && clock() < expires - 10000, 'browser-reader-lease-expired');
    const status = await pool(['status', 'reader']);
    insist(status?.browser === 'reader' && status.holder === holder && status.state === 'healthy' && status.expired === false && status.purpose === PURPOSE && Date.parse(status.expires_at) === expires, 'browser-reader-identity-unverified');
  }
  function flags(cdp = true) {
    return ['--config', join(configDir, 'agent-browser.json'), '--json', '--session', holder, ...(cdp ? ['--cdp', endpoint] : []), '--allowed-domains', 'www.danmercede.com,www.orionintelligenceagency.com', '--no-auto-dialog'];
  }
  async function agent(args: string[], cdp = true) {
    const result = await call(AGENT, [...flags(cdp), ...args]);
    const value = jsonResult(result);
    insist(result.exit_code === 0 && value.success === true && value.data, 'browser-reader-command-unverified');
    return { result, data: value.data };
  }
  async function targets() {
    try {
      const response = await (dependencies.fetchDiscovery ?? fetch)(discoveryUrl, {
        method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      insist(response.status === 200 && (!response.url || response.url === discoveryUrl), 'browser-reader-target-inventory-unverified');
      const body = response.body?.getReader();
      insist(body, 'browser-reader-target-inventory-unverified');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await body.read();
          if (part.done) break;
          size += part.value.length;
          insist(size <= 256 * 1024, 'browser-reader-target-inventory-unverified');
          chunks.push(part.value);
        }
      } finally { await body.cancel(); }
      const rows = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
      insist(Array.isArray(rows) && rows.length > 0 && rows.length <= 100 && rows.every(t => typeof t.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(t.id) && typeof t.type === 'string' && typeof t.url === 'string' && t.url.length <= 4096), 'browser-reader-target-inventory-unverified');
      insist(new Set(rows.map(t => t.id)).size === rows.length, 'browser-reader-target-inventory-unverified');
      const pages = rows.filter(t => t.type === 'page');
      insist(pages.length > 0 && pages.length <= 20 && new Set(pages.map(t => t.url)).size === pages.length, 'browser-reader-target-inventory-unverified');
      return pages as Array<{ id: string; type: string; url: string }>;
    } catch { throw Error('browser-reader-target-inventory-unverified'); }
  }
  let baselineTargets: Array<{ id: string; type: string; url: string }> = [];
  async function assertOwnedTab(allowedUrls: string[] = [expectedUrl]) {
    const rows = tabRows((await agent(['tab', 'list'])).data);
    const native = await targets();
    insist(ownTab !== null && ownTarget && rows.length === baseline.length + 1 && native.length === baselineTargets.length + 1, 'browser-reader-tab-ownership-unverified');
    const current = rows.find(t => t.index === ownTab);
    const target = native.find(t => t.id === ownTarget);
    insist(current?.active === true && allowedUrls.includes(current.url) && rows.filter(t => t.url === current.url).length === 1 && target && allowedUrls.includes(target.url), 'browser-reader-tab-ownership-unverified');
    for (const prior of baseline) {
      const other = rows.find(t => t.index === prior.index);
      const target = baselineTargets.find(t => t.url === prior.url);
      insist(target && other && other.url === prior.url && other.type === prior.type && native.some(t => t.id === target.id && t.url === prior.url), 'browser-reader-tab-ownership-unverified');
    }
    return { cli_url: current.url, target_url: target.url };
  }
  async function awaitTrustedNavigation() {
    insist(pendingNavigation, 'browser-reader-navigation-unverified');
    const pending = pendingNavigation, deadline = clock() + 10000;
    for (let attempt = 0; attempt < 50 && clock() <= deadline; attempt++) {
      await ownedLease();
      const observed = await assertOwnedTab([pending.from, pending.to]);
      if (observed.cli_url === pending.to && observed.target_url === pending.to && clock() <= deadline) {
        expectedUrl = pending.to;
        pendingNavigation = null;
        return;
      }
      await (dependencies.pause ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))))(200);
    }
    throw Error('browser-reader-navigation-unverified');
  }
  function expectedAfter(argv: string[]) {
    if (argv[0] === 'open') {
      insist(argv[1] === 'https://www.danmercede.com/thoughts', 'browser-reader-command-denied');
      return argv[1];
    }
    if (argv[0] === 'eval') {
      const script = Buffer.from(argv[2], 'base64').toString('utf8');
      if (script.includes('link.click();')) {
        insist(expectedUrl === 'https://www.danmercede.com/thoughts', 'browser-reader-command-denied');
        return `https://www.danmercede.com/thoughts/${input.slug}`;
      }
      if (script.includes('location.assign(a.href)')) {
        insist(input.cta.kind === 'external' && expectedUrl === `https://www.danmercede.com/thoughts/${input.slug}`, 'browser-reader-command-denied');
        return input.cta.url;
      }
    }
    if (argv[0] === 'wait' && argv[1] === '--url') insist(argv[2] === expectedUrl, 'browser-reader-command-denied');
    return expectedUrl;
  }
  async function disconnect() {
    if (!disconnected) {
      // CDP close disconnects this unique agent-browser session; it does not close Chrome.
      await agent(['close'], false);
      disconnected = true;
    }
  }
  async function closeOwnedTab() {
    if (ownTab !== null && !tabClosed) {
      await ownedLease();
      await assertOwnedTab(pendingNavigation ? [pendingNavigation.from, pendingNavigation.to] : [expectedUrl]);
      await agent(['tab', 'close', String(ownTab)]);
      tabClosed = true;
    }
  }
  let proof: any, failure: unknown;
  try {
    for (const [binary, expected] of [[POOL, 'orion-browser 0.1.0'], [AGENT, 'agent-browser 0.25.4']]) {
      const version = await call(binary, ['--version']);
      insist(version.exit_code === 0 && version.stdout.trim() === expected, 'browser-reader-tool-version-unverified');
    }
    configDir = await mkdtemp(join(tmpdir(), 'fcn-reader-config-'));
    await writeFile(join(configDir, 'agent-browser.json'), '{}\n', { mode: 0o600 });
    leaseAttempted = true;
    const lease = await pool(['lease', 'reader', '--minutes', '5', '--holder', holder], 45000);
    acquired = true;
    insist(lease?.browser === 'reader' && lease.holder === holder && typeof lease.endpoint === 'string', 'browser-reader-lease-unverified');
    const address = new URL(lease.endpoint);
    insist(['ws:', 'wss:'].includes(address.protocol) && ['127.0.0.1', '[::1]', 'localhost'].includes(address.hostname) && address.port && /^\/devtools\/browser\/[A-Za-z0-9_-]{1,128}$/.test(address.pathname) && !address.username && !address.password && !address.search && !address.hash, 'browser-reader-endpoint-unusable');
    insist(address.href === lease.endpoint, 'browser-reader-endpoint-unusable');
    endpoint = lease.endpoint;
    discoveryUrl = `${address.protocol === 'ws:' ? 'http:' : 'https:'}//${address.host}/json/list`;
    expires = Date.parse(lease.expires_at);
    insist(Number.isFinite(expires) && expires > clock() + 180000 && expires <= clock() + 330000, 'browser-reader-lease-expired');
    await ownedLease();
    baseline = tabRows((await agent(['tab', 'list'])).data);
    baselineTargets = await targets();
    insist(baselineTargets.length === baseline.length && baseline.every(t => baselineTargets.filter(n => n.url === t.url).length === 1), 'browser-reader-target-inventory-unverified');
    expectedUrl = `about:blank#${holder}`;
    const tab = (await agent(['tab', 'new', expectedUrl])).data;
    insist(Number.isSafeInteger(tab.index) && !baseline.some(t => t.index === tab.index) && tab.url === expectedUrl, 'browser-reader-tab-ownership-unverified');
    ownTab = tab.index;
    const created = (await targets()).filter(t => t.url === expectedUrl && !baselineTargets.some(prior => prior.id === t.id));
    insist(created.length === 1, 'browser-reader-tab-ownership-unverified');
    ownTarget = created[0].id;
    await assertOwnedTab();
    const uaScript = 'JSON.stringify({user_agent:navigator.userAgent,url:location.href})';
    const ua = JSON.parse((await agent(['eval', '-b', Buffer.from(uaScript).toString('base64')])).data.result);
    insist(ua.url === expectedUrl && typeof ua.user_agent === 'string' && /Chrome\/[0-9]+/.test(ua.user_agent) && !/Headless|PhantomJS/i.test(ua.user_agent), 'browser-reader-headless-or-identity-unverified');
    const profile = { id: holder, admission: 'admitted-read-only-public', recipe: HUB_BROWSER_RECIPE, owns_isolated_session: true, signed_out: true, input_sha256: input.input_sha256, qualification_ref: 'installed-reader-cli-contract-v1', tool_sha256: hashes.agent };
    proof = await readHydratedHub(input, {
      profile,
      execute: async argv => {
        if (argv.length === 1 && argv[0] === 'close') {
          try { await closeOwnedTab(); } finally { await disconnect(); }
          return { exit_code: 0, profile_id: holder, command_sha256: digest(JSON.stringify(argv)), run_id: `local-process:${holder}:${++sequence}`, stdout: JSON.stringify({ success: true, data: { owned_tab_closed: true, session_disconnected: true } }) };
        }
        insist(['open', 'wait', 'eval'].includes(argv[0]), 'browser-reader-command-denied');
        await ownedLease();
        await assertOwnedTab();
        const afterUrl = expectedAfter(argv);
        if (afterUrl !== expectedUrl) pendingNavigation = { from: expectedUrl, to: afterUrl };
        const { result } = await agent(argv);
        if (pendingNavigation) await awaitTrustedNavigation();
        else await assertOwnedTab();
        return { exit_code: result.exit_code, profile_id: holder, command_sha256: digest(JSON.stringify(argv)), run_id: `local-process:${holder}:${++sequence}`, stdout: result.stdout.toString() };
      },
    });
    proof.installed_reader = { browser: 'reader', holder, tool_versions: { pool: '0.1.0', agent: '0.25.4' }, tool_sha256: hashes, non_headless_user_agent: true, user_agent_sha256: digest(ua.user_agent), signed_out_purpose_verified: true, dedicated_tab_closed: tabClosed, target_identity_sha256: digest(ownTarget), lease_released: false };
  } catch (error) {
    failure = error;
  } finally {
    if (acquired) {
      try { await closeOwnedTab(); } catch { failure = Error('browser-reader-tab-cleanup-unverified'); }
      try { await disconnect(); } catch { failure = Error('browser-reader-client-disconnect-unverified'); }
    }
    if (leaseAttempted && !(failure instanceof Error && failure.message === 'browser-reader-busy')) {
      try {
        const result = await pool(['release', 'reader', '--holder', holder], 30000);
        insist(result?.browser === 'reader' && ['clean', 'none', 'signal', 'kill'].includes(result.stop), 'browser-reader-release-unverified');
        released = true;
        releaseStop = result.stop;
      } catch { failure = Error('browser-reader-lease-release-unverified'); }
    }
    if (configDir) await rm(configDir, { recursive: true, force: true });
    endpoint = '';
    discoveryUrl = '';
    ownTarget = '';
  }
  if (failure) throw Error(failure instanceof Error && /^browser-[a-z-]{1,80}$/.test(failure.message) ? failure.message : 'browser-reader-verification-unavailable');
  insist(proof && released && tabClosed && disconnected, 'browser-reader-cleanup-unverified');
  proof.installed_reader.lease_released = true;
  proof.installed_reader.release_stop = releaseStop;
  return proof;
}
