import { JSONLD_BLOCK_START, JSONLD_BLOCK_END } from './seoMeta';

// Keeps the route-specific JSON-LD in <head> in step with in-app navigation.
// The build bakes each page's route graph (ProfilePage, Article, BreadcrumbList,
// ...) between the ROUTE_JSONLD comment anchors; the stable Person and WebSite
// graph sits outside them and never changes. After a client-side navigation the
// head would otherwise still describe the page the visitor entered on.

const commentData = (marker: string) => marker.replace(/^<!--/, '').replace(/-->$/, '');
const START = commentData(JSONLD_BLOCK_START);
const END = commentData(JSONLD_BLOCK_END);

// Replace the scripts between the anchors with one carrying `json`, or remove
// them when `json` is null (a noindex page has no route graph). A block that
// already carries `json` is left alone, so the first load causes no DOM churn.
// Without both anchors the head is left untouched.
export function syncRouteJsonLd(head: HTMLHeadElement, json: string | null): void {
  const nodes = Array.from(head.childNodes);
  const isComment = (node: ChildNode, data: string) => node.nodeType === 8 && (node as Comment).data === data;
  const start = nodes.findIndex((n) => isComment(n, START));
  const end = nodes.findIndex((n) => isComment(n, END));
  if (start === -1 || end === -1 || end < start) return;
  const scripts = nodes
    .slice(start + 1, end)
    .filter((n): n is HTMLScriptElement => n.nodeType === 1 && (n as Element).tagName === 'SCRIPT');
  if (json !== null && scripts.length === 1 && scripts[0].textContent?.trim() === json.trim()) return;
  scripts.forEach((s) => s.remove());
  if (json === null) return;
  const script = head.ownerDocument.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = json;
  head.insertBefore(script, nodes[end]);
}
