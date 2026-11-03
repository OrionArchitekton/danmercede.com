/** Independent initial and hydrated public-reader parity. No publication path. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { Markdown } from '../components/Markdown.tsx';
import { selectLatestThoughts } from '../thoughtsIndex.ts';
import { renderRss, renderAtom } from './renderFeed.ts';
import { observeProductionDeployment } from './verifyProductionDeployment.mjs';
import { readHydratedHub } from './newsletterHubReleaseBrowser.ts';
import { digest, insist } from './newsletterHubReleaseJournal.ts';
const ORIGIN = 'https://www.danmercede.com';
async function readText(fetchPublic: any, url: string) {
    const response = await fetchPublic(url, { cache: 'no-store', redirect: 'error', credentials: 'omit', headers: { 'User-Agent': 'orion-hub-reader-verification/1.0' }, signal: AbortSignal.timeout(10000) });
    insist(response && Number.isInteger(response.status) && (!response.url || response.url === url), 'public-response-unusable');
    const reader = response.body?.getReader();
    insist(reader, 'public-response-empty');
    let size = 0;
    const chunks = [];
    try {
        while (true) {
            const part = await reader.read();
            if (part.done)
                break;
            size += part.value.length;
            insist(size <= 4 * 1024 * 1024, 'public-response-unbounded');
            chunks.push(part.value);
        }
    }
    finally {
        await reader.cancel();
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    return { status: response.status, text, headers: response.headers, sha256: digest(text) };
}
function document(html: string, xml = false): Document {
    return new JSDOM(html, { url: ORIGIN, contentType: xml ? 'text/xml' : 'text/html' }).window.document as unknown as Document;
}
function articleParity(article: Element | null, target: any) {
    insist(article && article.querySelectorAll('h1').length === 1 && article.querySelector('h1')?.textContent === target.title, 'public-title-mismatch');
    const children = Array.from(article.children);
    insist(children.length >= 4, 'public-article-incomplete');
    const labels = Array.from(children[0].querySelectorAll('span')).map(e => e.textContent);
    insist(JSON.stringify(labels) === JSON.stringify([target.category, target.date]), 'public-metadata-mismatch');
    insist(children[2].tagName === 'P' && children[2].textContent === target.preview, 'public-preview-mismatch');
    const expected = document(renderToStaticMarkup(React.createElement(Markdown, { source: target.body }))), blocks = Array.from(expected.body.children).filter(e => e.tagName !== 'LINK');
    insist(JSON.stringify(children.slice(3).map(e => e.outerHTML)) === JSON.stringify(blocks.map(e => e.outerHTML)), 'public-body-mismatch');
    insist(!article.closest('[hidden],[aria-hidden="true"]') && !Array.from(article.querySelectorAll('[hidden],[aria-hidden="true"]')).length, 'public-article-hidden');
    return { title: true, metadata: true, preview: true, body: true, headings: Array.from(article.querySelectorAll('h2')).map(e => e.textContent), anchors: Array.from(article.querySelectorAll('a')).map(a => ({ text: a.textContent, href: a.getAttribute('href') })) };
}
function feedEntry(xml: string, expected: string, url: string, atom = false) {
    const actual = document(xml, true), wanted = document(expected, true), tag = atom ? 'entry' : 'item';
    const select = (doc: Document) => Array.from(doc.getElementsByTagName(tag)).filter(node => atom ? node.getElementsByTagName('id')[0]?.textContent === url : node.getElementsByTagName('link')[0]?.textContent === url);
    const a = select(actual), e = select(wanted);
    insist(a.length === 1 && e.length === 1, 'public-feed-entry-missing');
    const names = atom ? ['id', 'title', 'published', 'updated', 'summary', 'content'] : ['title', 'link', 'guid', 'pubDate', 'description', 'content:encoded'];
    for (const name of names)
        insist(a[0].getElementsByTagName(name)[0]?.textContent === e[0].getElementsByTagName(name)[0]?.textContent, 'public-feed-entry-mismatch');
    return true;
}
export async function verifyHubReader(input: any, deps: any) {
    const read = deps.readGitHub, fetchPublic = deps.fetchPublic ?? fetch, target = input.target, url = `${ORIGIN}/thoughts/${target.slug}`;
    async function revision() {
        const r = await readText(fetchPublic, `${ORIGIN}/deployment-revision.json`);
        insist(r.status === 200 && (r.headers.get('cache-control') ?? '').split(',').some((v: string) => v.trim() === 'no-store'), 'public-revision-unverified');
        return JSON.parse(r.text);
    }
    const production = await observeProductionDeployment(read, 'OrionArchitekton/danmercede.com', input.main_sha, { readRevision: revision });
    insist(production, 'production-deployment-unverified');
    const page = await readText(fetchPublic, url);
    insist(page.status === 200, 'public-article-http');
    const dom = document(page.text);
    insist(dom.querySelector('link[rel="canonical"]')?.getAttribute('href') === url, 'public-canonical-mismatch');
    const article = dom.querySelector('#root article'), initial = articleParity(article, target);
    const index = await readText(fetchPublic, `${ORIGIN}/thoughts`);
    insist(index.status === 200, 'public-index-http');
    const indexDom = document(index.text), latest = selectLatestThoughts(input.thoughts).map(t => t.slug);
    const actualLatest = Array.from(indexDom.querySelector('[aria-labelledby="latest-releases-heading"]')?.querySelectorAll('a[href^="/thoughts/"]') ?? []).map(a => a.getAttribute('href')?.slice('/thoughts/'.length));
    insist(JSON.stringify(actualLatest) === JSON.stringify(latest) && indexDom.querySelector(`a[href="/thoughts/${target.slug}"]`), 'public-latest-order-mismatch');
    const sitemap = await readText(fetchPublic, `${ORIGIN}/sitemap.xml`);
    insist(sitemap.status === 200 && Array.from(document(sitemap.text, true).getElementsByTagName('loc')).some(e => e.textContent === url), 'public-sitemap-missing');
    const rss = await readText(fetchPublic, `${ORIGIN}/feed.xml`), atom = await readText(fetchPublic, `${ORIGIN}/atom.xml`);
    insist(rss.status === 200 && atom.status === 200, 'public-feed-http');
    feedEntry(rss.text, renderRss([target], []), url);
    feedEntry(atom.text, renderAtom([target], []), url, true);
    const missing = await readText(fetchPublic, `${ORIGIN}/thoughts/fcn-reader-invalid-${input.input_sha256.slice(0, 16)}`);
    insist(missing.status === 404, 'public-soft-404');
    let cta: any = { kind: input.cta.kind, form_submitted: false };
    if (input.cta.kind === 'external') {
        const anchors = Array.from(article!.querySelectorAll('a')).filter(a => a.textContent === input.cta.text && a.getAttribute('href') === input.cta.url);
        insist(anchors.length === 1, 'public-cta-anchor-mismatch');
        const destination = await readText(fetchPublic, input.cta.url);
        insist(destination.status === 200 && /readiness\s+scan/i.test(document(destination.text).body.textContent ?? ''), 'public-cta-destination-unverified');
        cta = { ...cta, actual_href: anchors[0].getAttribute('href'), final_url: input.cta.url };
    }
    else
        insist(article!.lastElementChild?.textContent === input.cta.text, 'public-comment-question-mismatch');
    const initialProof = { production, initial, latest_slugs: latest, canonical: true, sitemap: true, rss: true, atom: true, invalid_route_status: 404, cta, article_sha256: page.sha256, index_sha256: index.sha256, scope: 'initial-html-parity' };
    if (!deps.browserRuntime)
        return { public_delivery: 'unknown', stage: 'hydrated-reader-unqualified', initial: initialProof, holds: ['hydrated-reader-unqualified'] };
    const hydrated = await readHydratedHub({ operation_id: input.operation_id, input_sha256: input.input_sha256, sha: input.main_sha, slug: target.slug, cta: input.cta }, deps.browserRuntime);
    articleParity(document(hydrated.article_html).querySelector('article'), target);
    insist(JSON.stringify(hydrated.latest_hrefs) === JSON.stringify(latest.map(slug => `/thoughts/${slug}`)), 'hydrated-latest-order-mismatch');
    const after = await revision();
    insist(after.schemaVersion === 1 && after.sha === input.main_sha, 'public-revision-moved');
    const current = await read('/repos/OrionArchitekton/danmercede.com/git/ref/heads/main');
    insist(current?.object?.sha === input.main_sha, 'public-source-moved');
    return { public_delivery: 'verified', stage: 'public-delivery-verified', initial: initialProof, hydrated, verification_scope: 'initial-and-hydrated-reader-parity', holds: [] };
}
