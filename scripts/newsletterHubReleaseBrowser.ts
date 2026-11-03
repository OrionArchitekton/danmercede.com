/** Fixed public-reader recipe. A separately admitted isolated runner owns Chrome. */
import { digest, insist } from './newsletterHubReleaseJournal.ts';
export const HUB_BROWSER_RECIPE = 'hub-public-reader-v1';
type BrowserInput = {
    operation_id: string;
    input_sha256: string;
    sha: string;
    slug: string;
    cta: any;
};
type BrowserRuntime = {
    profile: any;
    execute: (argv: string[]) => Promise<any>;
};
export async function readHydratedHub(input: BrowserInput, runtime?: BrowserRuntime) {
    const profile = runtime?.profile;
    insist(profile?.admission === 'admitted-read-only-public' && profile.recipe === HUB_BROWSER_RECIPE && profile.owns_isolated_session === true && profile.signed_out === true && profile.input_sha256 === input.input_sha256 && typeof profile.id === 'string' && typeof profile.qualification_ref === 'string' && /^[a-f0-9]{64}$/.test(profile.tool_sha256), 'hydrated-reader-unqualified');
    insist(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug), 'invalid-browser-slug');
    const origin = 'https://www.danmercede.com', url = `${origin}/thoughts/${input.slug}`, trace: any[] = [];
    async function command(argv: string[]) {
        const result = await runtime!.execute(argv), args_sha256 = digest(JSON.stringify(argv));
        insist(result?.exit_code === 0 && result.profile_id === profile.id && result.command_sha256 === args_sha256 && typeof result.run_id === 'string' && result.run_id.length > 0 && typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= 2 * 1024 * 1024, 'browser-command-unverified');
        const value = JSON.parse(result.stdout);
        insist(value.success === true && value.data, 'browser-command-failed');
        trace.push({ argv_sha256: args_sha256, stdout_sha256: digest(result.stdout), run_id: result.run_id });
        return value.data;
    }
    async function evaluate(script: string) {
        const data = await command(['eval', '-b', Buffer.from(script).toString('base64')]);
        insist(typeof data.result === 'string', 'browser-result-unusable');
        return JSON.parse(data.result);
    }
    let capture: any, cleanup = false;
    try {
        await command(['open', `${origin}/thoughts`]);
        await command(['wait', '--fn', `document.readyState === 'complete' && !!document.querySelector('#root') && Object.keys(document.querySelector('#root')).some(k => k.startsWith('__reactContainer$'))`]);
        const index = await evaluate(`JSON.stringify({capture_kind:'index',url:location.href,time_origin:performance.timeOrigin,latest_hrefs:Array.from(document.querySelector('[aria-labelledby="latest-releases-heading"]')?.querySelectorAll('a[href^="/thoughts/"]')||[]).map(a=>a.getAttribute('href')),target_count:Array.from(document.querySelectorAll('a')).filter(a=>a.getAttribute('href')===${JSON.stringify('/thoughts/' + input.slug)}).length})`);
        insist(index.capture_kind === 'index' && new URL(index.url).pathname === '/thoughts' && index.target_count > 0 && Number.isFinite(index.time_origin), 'hydrated-index-unverified');
        await evaluate(`(()=>{const link=Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')===${JSON.stringify('/thoughts/' + input.slug)});if(!link)throw Error('target missing');link.click();return JSON.stringify({clicked:true});})()`);
        await command(['wait', '--url', url]);
        const article = await evaluate(`JSON.stringify({capture_kind:'article',url:location.href,time_origin:performance.timeOrigin,article_html:document.querySelector('#root article')?.outerHTML||'',article_visible:(()=>{const a=document.querySelector('#root article');if(!a)return false;return [a,...a.children].every(e=>{if(!Array.from(e.getClientRects()).some(r=>r.width>0&&r.height>0))return false;for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity||'1')<=0)return false;}return true;});})(),latest_hrefs:${JSON.stringify(index.latest_hrefs)},cta_href:Array.from(document.querySelectorAll('#root article a')).find(a=>a.textContent===${JSON.stringify(input.cta.text)})?.href||null})`);
        insist(article.capture_kind === 'article' && article.url === url && article.time_origin === index.time_origin && article.article_html, 'hydrated-client-navigation-unverified');
        insist(article.article_visible === true, 'hydrated-article-not-visible');
        const revision = await evaluate(`(async()=>{const r=await fetch('/deployment-revision.json',{cache:'no-store',credentials:'omit',redirect:'error'});if(!r.ok||!r.headers.get('cache-control')?.split(',').some(v=>v.trim()==='no-store'))throw Error('revision missing');return JSON.stringify(await r.json());})()`);
        insist(revision.schemaVersion === 1 && revision.sha === input.sha, 'hydrated-revision-mismatch');
        let cta = { kind: input.cta.kind, form_submitted: false, actual_href: article.cta_href, final_url: null as string | null };
        if (input.cta.kind === 'external') {
            insist(article.cta_href === input.cta.url, 'hydrated-cta-anchor-mismatch');
            await evaluate(`(()=>{const a=Array.from(document.querySelectorAll('#root article a')).find(a=>a.textContent===${JSON.stringify(input.cta.text)});if(!a||a.href!==${JSON.stringify(input.cta.url)})throw Error('CTA mismatch');location.assign(a.href);return JSON.stringify({following:true});})()`);
            await command(['wait', '--url', input.cta.url]);
            const destination = await evaluate(`JSON.stringify({capture_kind:'cta',url:location.href,title:document.title,readiness_scan:/readiness\\s+scan/i.test(document.body.innerText)})`);
            insist(destination.url === input.cta.url && destination.readiness_scan === true, 'hydrated-cta-destination-unverified');
            cta.final_url = destination.url;
        }
        capture = { profile_id: profile.id, qualification_ref: profile.qualification_ref, tool_sha256: profile.tool_sha256, recipe: HUB_BROWSER_RECIPE, client_navigation_proven: true, ...article, revision_sha: revision.sha, cta, trace };
    }
    finally {
        await command(['close']);
        cleanup = true;
    }
    insist(cleanup, 'browser-cleanup-unverified');
    return { ...capture, isolated_session_closed: true };
}
