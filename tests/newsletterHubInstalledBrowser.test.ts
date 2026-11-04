import test from 'node:test';
import assert from 'node:assert/strict';
import { readInstalledHubBrowser } from '../scripts/newsletterHubInstalledBrowser.ts';

const input = {
  operation_id: 'fixture-installed-reader', input_sha256: 'a'.repeat(64),
  sha: 'b'.repeat(40), slug: '2026-10-26-who-gets-to-interrupt-your-ai-work',
  cta: { kind: 'question', text: 'Which workflow needs a protected window?' },
};
const purpose = 'Signed-out general web reading: job posts, articles, docs. Never sign in to any account here. Not for YouTube competitor study (use study).';
function fixture(overrides: { headless?: boolean; busy?: boolean; wrongPurpose?: boolean; failRecipe?: boolean; failRelease?: boolean; wrongVersion?: boolean; tabDrift?: boolean; expired?: boolean; replaceTarget?: boolean; replaceAfterOpen?: boolean; duplicateTargetUrl?: boolean; delayedNavigation?: boolean; replacePending?: boolean; unexpectedPending?: boolean; neverCommit?: boolean; endpoint?: string; discoveryUrl?: string } = {}) {
  const calls: Array<{ binary: string; args: string[]; env: NodeJS.ProcessEnv }> = [];
  let holder = '', active = 0, created = false, released = false, tabClosed = false;
  const endpoint = overrides.endpoint ?? 'ws://127.0.0.1:39199/devtools/browser/11111111-2222-3333-4444-555555555555';
  let discoveryCalls = 0;
  let currentUrl = 'about:blank', targetId = 'owned-target', publicOpened = false, discovered = 0;
  let pendingUrl = '', pendingReads = 0;
  const readerInput = overrides.delayedNavigation || overrides.replacePending || overrides.unexpectedPending || overrides.neverCommit ? { ...input, cta: { kind: 'external', text: 'Work with my agency on one workflow', url: 'https://www.orionintelligenceagency.com/readiness-scan?utm_source=linkedin' } } : input;
  const invoke = async (binary: string, args: string[], options: any) => {
    calls.push({ binary, args, env: options.env });
    if (args[0] === '--version') return { exit_code: 0, stdout: binary.endsWith('/orion-browser') ? 'orion-browser 0.1.0\n' : (overrides.wrongVersion ? 'agent-browser 0.25.5\n' : 'agent-browser 0.25.4\n') };
    const json = (value: any, exit_code = 0) => ({ exit_code, stdout: JSON.stringify(value) });
    if (binary.endsWith('/orion-browser')) {
      if (args[1] === 'lease') {
        holder = args.at(-1)!;
        if (overrides.busy) throw Object.assign(Error('SECRET lease capability'), { code: 3, stdout: JSON.stringify({ ok: false, code: 'BUSY', exit: 3, message: 'busy', data: {} }) });
        return json({ ok: true, code: 'OK', exit: 0, data: { browser: 'reader', holder, endpoint, watch: 'https://private-cap.invalid/?token=SECRET', expires_at: overrides.expired ? '2026-11-03T22:00:01Z' : '2026-11-03T22:05:00Z' } });
      }
      if (args[1] === 'status') return json({ ok: true, code: 'OK', exit: 0, data: { browser: 'reader', holder, state: 'healthy', expired: false, purpose: overrides.wrongPurpose ? 'Signed-in account' : purpose, expires_at: '2026-11-03T22:05:00Z' } });
      if (args[1] === 'release') {
        released = true;
        if (overrides.failRelease) throw Error('SECRET endpoint leak');
        return json({ ok: true, code: 'OK', exit: 0, data: { browser: 'reader', stop: 'clean' } });
      }
    }
    const command = args.slice(args.indexOf('--no-auto-dialog') + 1);
    if (command[0] === 'tab' && command[1] === 'list') return json({ success: true, data: { tabs: [{ index: 0, type: 'page', url: 'about:blank', active: active === 0 }, ...(created && !tabClosed ? [{ index: 1, type: 'page', url: currentUrl, active: active === 1 }] : []), ...(overrides.tabDrift && created ? [{ index: 2, type: 'page', url: 'https://unexpected.invalid/', active: false }] : [])] } });
    if (command[0] === 'tab' && command[1] === 'new') { created = true; active = 1; currentUrl = command[2]; return json({ success: true, data: { index: 1, url: currentUrl } }); }
    if (command[0] === 'tab' && command[1] === 'close') { assert.equal(command[2], '1'); tabClosed = true; active = 0; return json({ success: true, data: { closed: 1 } }); }
    if (command[0] === 'open') { currentUrl = command[1]; publicOpened = true; }
    if (command[0] === 'eval') {
      const script = Buffer.from(command[2], 'base64').toString();
      if (script.includes('user_agent')) return json({ success: true, data: { result: JSON.stringify({ user_agent: overrides.headless ? 'HeadlessChrome/130.0' : 'Mozilla/5.0 Chrome/130.0 Safari/537.36', url: currentUrl }) } });
      if (overrides.failRecipe) throw Error('SECRET recipe error');
      let value: any = { clicked: true };
      if (script.includes('location.assign(a.href)')) pendingUrl = (readerInput.cta as any).url;
      if (script.includes('link.click()')) currentUrl = `https://www.danmercede.com/thoughts/${input.slug}`;
      if (script.includes("capture_kind:'index'")) value = { capture_kind: 'index', url: 'https://www.danmercede.com/thoughts', time_origin: 100, target_count: 1, latest_hrefs: [`/thoughts/${input.slug}`] };
      else if (script.includes("capture_kind:'article'")) value = { capture_kind: 'article', url: `https://www.danmercede.com/thoughts/${input.slug}`, time_origin: 100, article_html: '<article>fixture</article>', article_visible: true, images_ready: true, latest_hrefs: [`/thoughts/${input.slug}`], cta_href: readerInput.cta.kind === 'external' ? (readerInput.cta as any).url : null };
      else if (script.includes("capture_kind:'cta'")) value = { capture_kind: 'cta', url: currentUrl, readiness_scan: true, title: 'Readiness Scan' };
      else if (script.includes('images_loaded:true')) value = { images_loaded: true, image_count: 0 };
                else if (script.includes("fetch('/deployment-revision.json'")) value = { schemaVersion: 1, sha: input.sha };
      return json({ success: true, data: { result: JSON.stringify(value) } });
    }
    return json({ success: true, data: { done: true } });
  };
  const fetchDiscovery = async (url: string, options: any) => {
    discoveryCalls++;
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(url, overrides.discoveryUrl ?? (endpoint.includes('[::1]') ? 'http://[::1]:39199/json/list' : 'http://127.0.0.1:39199/json/list'));
    if ((overrides.replaceTarget && created && ++discovered > 1 && !publicOpened) || (overrides.replaceAfterOpen && publicOpened)) targetId = 'foreign-replacement';
    if (pendingUrl) {
      if (overrides.replacePending) targetId = 'replacement-during-navigation';
      if (overrides.unexpectedPending) currentUrl = 'https://www.danmercede.com/unexpected';
      if (++pendingReads >= 3 && !overrides.neverCommit) { currentUrl = pendingUrl; pendingUrl = ''; }
    }
    return new Response(JSON.stringify([{ id: 'baseline-target', type: 'page', url: 'about:blank' }, ...(created && !tabClosed ? [{ id: targetId, type: 'page', url: currentUrl }] : []), ...(overrides.duplicateTargetUrl && created ? [{ id: 'ambiguous-target', type: 'page', url: currentUrl }] : [])]));
  };
  return { readerInput, calls, invoke, fetchDiscovery, pause: async () => {}, clock: () => Date.parse('2026-11-03T22:00:00Z'), toolBytes: async () => Buffer.from('fixture installed tool bytes'), state: () => ({ released, tabClosed, created, discoveryCalls }) };
}
test('installed fixed reader checks identity and UA before navigation and normally releases without exposing capabilities', async () => {
  const f = fixture();
  const result = await readInstalledHubBrowser(input, f);
  assert.equal(result.client_navigation_proven, true);
  assert.equal(result.installed_reader.lease_released, true);
  assert.equal(f.state().tabClosed, true);
  assert.equal(f.state().released, true);
  const navigations = f.calls.filter(c => c.args.includes('open'));
  assert.equal(navigations.length, 1);
  assert.ok(f.calls.findIndex(c => c.args.includes('open')) > f.calls.findIndex(c => c.args.some(a => { try { return Buffer.from(a, 'base64').toString().includes('user_agent'); } catch { return false; } })));
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.ok(!JSON.stringify(result).includes('39199'));
  assert.ok(f.calls.every(c => !c.args.includes('--all') && !c.args.includes('cookies') && !c.args.includes('fill')));
  assert.ok(f.calls.filter(c => c.binary.endsWith('/agent-browser')).every(c => !c.env.AGENT_BROWSER_STATE && !c.env.AGENT_BROWSER_SESSION_NAME));
});
test('busy reader remains unadmitted without fallback or foreign release', async () => {
  const f = fixture({ busy: true });
  await assert.rejects(readInstalledHubBrowser(input, f), /browser-reader-busy/);
  assert.equal(f.state().released, false);
  assert.equal(f.state().created, false);
});
test('headless or wrong-purpose reader never navigates and releases its own lease', async () => {
  for (const overrides of [{ headless: true }, { wrongPurpose: true }]) {
    const f = fixture(overrides);
    await assert.rejects(readInstalledHubBrowser(input, f), /browser-reader/);
    assert.ok(!f.calls.some(c => c.args.includes('open')));
    assert.equal(f.state().released, true);
  }
});
test('recipe or release failure is scrubbed and cannot claim cleanup success', async () => {
  for (const overrides of [{ failRecipe: true }, { failRelease: true }]) {
    const f = fixture(overrides);
    await assert.rejects(readInstalledHubBrowser(input, f), (error: Error) => /^browser-/.test(error.message) && !error.message.includes('SECRET'));
    assert.equal(f.state().released, true);
  }
});

test('version drift, expired leases and unexpected tabs hold before public navigation', async () => {
  for (const overrides of [{ wrongVersion: true }, { expired: true }, { tabDrift: true }]) {
    const f = fixture(overrides);
    await assert.rejects(readInstalledHubBrowser(input, f), /browser-reader/);
    assert.ok(!f.calls.some(c => c.args.includes('open')));
    assert.equal(f.state().released, !overrides.wrongVersion);
    if (overrides.tabDrift) assert.ok(f.calls.some(c => c.args.at(-1) === 'close' && !c.args.includes('--cdp')));
  }
});

test('same-index replacement is never navigated or closed, while the unique client is always disconnected', async () => {
  const f = fixture({ replaceTarget: true });
  await assert.rejects(readInstalledHubBrowser(input, f), /browser-reader/);
  assert.equal(f.state().tabClosed, false);
  assert.equal(f.calls.some(c => c.args.includes('open')), false);
  assert.ok(f.calls.some(c => c.args.at(-1) === 'close' && !c.args.includes('--cdp')));
  assert.equal(f.state().released, true);
});

test('post-command target replacement and duplicate URL mappings stop the recipe without closing the replacement', async () => {
  for (const overrides of [{ replaceAfterOpen: true }, { duplicateTargetUrl: true }]) {
    const f = fixture(overrides);
    await assert.rejects(readInstalledHubBrowser(input, f), /browser-reader/);
    assert.equal(f.state().tabClosed, false);
    assert.ok(!f.calls.some(c => c.args.some(a => { try { return Buffer.from(a, 'base64').toString().includes('link.click()'); } catch { return false; } })));
    assert.ok(f.calls.some(c => c.args.at(-1) === 'close' && !c.args.includes('--cdp')));
    assert.equal(f.state().released, true);
  }
});

test('delayed same-target CTA navigation reaches the exact wait and closes its owned tab', async () => {
  const f = fixture({ delayedNavigation: true });
  const result = await readInstalledHubBrowser(f.readerInput, f);
  assert.equal(result.cta.final_url, (f.readerInput.cta as any).url);
  assert.ok(f.calls.some(c => c.args.includes('wait') && c.args.includes((f.readerInput.cta as any).url)));
  assert.equal(f.state().tabClosed, true);
  assert.equal(f.state().released, true);
});
test('replacement or an unapproved URL during pending navigation holds without closing it', async () => {
  for (const overrides of [{ replacePending: true }, { unexpectedPending: true }]) {
    const f = fixture(overrides);
    await assert.rejects(readInstalledHubBrowser(f.readerInput, f), /browser-reader/);
    assert.equal(f.state().tabClosed, false);
    assert.ok(f.calls.some(c => c.args.at(-1) === 'close' && !c.args.includes('--cdp')));
    assert.equal(f.state().released, true);
  }
});

test('a pending navigation that never commits stays bounded and cleans up its original owned target', async () => {
  const f = fixture({ neverCommit: true });
  await assert.rejects(readInstalledHubBrowser(f.readerInput, f), /browser-reader-navigation-unverified/);
  assert.equal(f.state().tabClosed, true);
  assert.equal(f.state().released, true);
  assert.ok(f.calls.filter(c => c.binary.endsWith('/orion-browser') && c.args.includes('status')).length < 100);
});

test('only exact numeric loopback endpoints are admitted before discovery or browser commands', async () => {
  const path = '/devtools/browser/11111111-2222-3333-4444-555555555555';
  for (const endpoint of [
    `ws://localhost:39199${path}`, `ws://127.0.0.2:39199${path}`,
    `ws://192.0.2.1:39199${path}`, `ws://127.1:39199${path}`,
    `ws://127.0.0.1${path}`, `ws://127.0.0.1:0${path}`,
    `ws://127.0.0.1:65536${path}`, `ws://127.0.0.1:080${path}`, `wss://127.0.0.1:0443${path}`, `ws://user:pass@127.0.0.1:39199${path}`,
    'ws://127.0.0.1:39199/devtools/page/target',
    `ws://127.0.0.1:39199${path}\n`, `ws://127.0.0.1:39199${path}?token=SECRET`, `ws://127.0.0.1:39199${path}#fragment`,
  ]) {
    const f = fixture({ endpoint });
    await assert.rejects(readInstalledHubBrowser(input, f), /browser-reader-endpoint-unusable/);
    assert.equal(f.state().discoveryCalls, 0);
    assert.ok(!f.calls.some(c => c.binary.endsWith('/agent-browser') && c.args[0] !== '--version'));
    assert.equal(f.state().released, true);
  }
  const ipv6 = fixture({ endpoint: `ws://[::1]:39199${path}` });
  assert.equal((await readInstalledHubBrowser(input, ipv6)).installed_reader.lease_released, true);
});

test('explicit default WebSocket ports remain valid and the owned endpoint is passed through exactly', async () => {
  const path = '/devtools/browser/11111111-2222-3333-4444-555555555555';
  for (const pair of [
    { endpoint: `ws://127.0.0.1:80${path}`, discoveryUrl: 'http://127.0.0.1/json/list' },
    { endpoint: `wss://127.0.0.1:443${path}`, discoveryUrl: 'https://127.0.0.1/json/list' },
    { endpoint: `ws://[::1]:80${path}`, discoveryUrl: 'http://[::1]/json/list' },
    { endpoint: `wss://[::1]:443${path}`, discoveryUrl: 'https://[::1]/json/list' },
  ]) {
    const f = fixture(pair);
    assert.equal((await readInstalledHubBrowser(input, f)).installed_reader.lease_released, true);
    assert.ok(f.calls.some(c => c.args.includes('--cdp')));
    assert.ok(f.calls.filter(c => c.args.includes('--cdp')).every(c => c.args[c.args.indexOf('--cdp') + 1] === pair.endpoint));
  }
});
