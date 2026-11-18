import { SITE_ORIGIN } from '../siteOrigin';
import { NEWSLETTER } from '../constants';
import { GROKBOT_EXAMPLE_URL } from '../contentDiscovery';

// These are click intents, not paid work, successful executions or subscriptions.
// No raw query, fragment, email, link text or external URL enters the event.
export function guideNextStep(sourcePath: string, destinationHref: string) {
  const source = /^\/guides\/([a-z0-9-]+)\/?$/.exec(sourcePath);
  if (!source) return null;
  let destination: URL;
  try { destination = new URL(destinationHref, SITE_ORIGIN); } catch { return null; }
  const newsletter = new URL(NEWSLETTER.href);
  const grokExample = new URL(GROKBOT_EXAMPLE_URL);
  const path = destination.pathname.replace(/\/+$/, '') || '/';
  let kind: string | null = null;
  if (destination.origin === newsletter.origin && path === newsletter.pathname.replace(/\/+$/, '')) {
    kind = 'newsletter';
  } else if (destination.origin === grokExample.origin && path === grokExample.pathname) {
    return { guide_slug: source[1], destination_kind: 'example', destination_path: '/examples/grokbot-source' };
  } else if (destination.origin === SITE_ORIGIN) {
    if (/^\/guides\/[a-z0-9-]+$/.test(path) && path !== `/guides/${source[1]}`) kind = 'guide';
    else if (/^\/works\/[a-z0-9-]+$/.test(path)) kind = 'project';
    else if (path === '/connect') kind = 'contact';
    else if (path === '/proof') kind = 'proof';
    else if (/^\/examples\/[a-z0-9_./-]+$/.test(path)) kind = 'example';
  }
  if (!kind) return null;
  return {
    guide_slug: source[1],
    destination_kind: kind,
    destination_path: kind === 'newsletter' ? '/newsletter' : path,
  };
}

export function taggedShareUrl(path: string, source: 'linkedin' | 'x') {
  const url = new URL(path, SITE_ORIGIN);
  url.search = '';
  url.hash = '';
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', 'technical-guides');
  url.searchParams.set('utm_content', url.pathname.split('/').filter(Boolean).pop() ?? 'home');
  return url.toString();
}
