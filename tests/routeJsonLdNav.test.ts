import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROUTE_META, renderRouteJsonLd, routeJsonLdText, routeMetaFor } from '../seoMeta';
import { collectRoutes } from '../scripts/injectRouteMeta';
import { syncRouteJsonLd } from '../routeJsonLd';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 2026-09-29 re-audit P1.3: each page's route JSON-LD (ProfilePage, Article,
 * BreadcrumbList...) is baked into <head> at build time. After an in-app
 * navigation (Home, then About) the head still held the homepage's graph while
 * the title and canonical said About. The client now swaps the route block on
 * every navigation, from the same path-to-metadata resolution the build uses.
 */

test('the client resolves every built route to the metadata the build baked', () => {
  const routes = collectRoutes();
  assert.ok(routes.length > 80, 'expected every baked route');
  for (const { path: route, meta } of routes) {
    assert.deepEqual(routeMetaFor(route), meta, `${route}: client and build disagree`);
    assert.deepEqual(routeMetaFor(`${route}/`), meta, `${route}/: a trailing slash is the same route`);
  }
  assert.deepEqual(routeMetaFor('/'), ROUTE_META['/'], 'the homepage');
  assert.equal(routeMetaFor('/no-such-page'), null);
  assert.equal(routeMetaFor('/thoughts/no-such-essay'), null, 'an unknown slug has no page');
});

test('the client inserts exactly the JSON the build bakes', () => {
  for (const { path: route, meta } of collectRoutes()) {
    assert.ok(renderRouteJsonLd(route, meta).includes(`\n${routeJsonLdText(route, meta)}\n`), route);
  }
});

// A minimal stand-in for <head>: comment and element nodes, remove, insertBefore.
class FakeNode {
  parent: FakeHead | null = null;
  constructor(public nodeType: number) {}
  remove() {
    this.parent!.childNodes.splice(this.parent!.childNodes.indexOf(this), 1);
    this.parent = null;
  }
}
class FakeComment extends FakeNode {
  constructor(public data: string) {
    super(8);
  }
}
class FakeElement extends FakeNode {
  type = '';
  textContent = '';
  constructor(public tagName: string) {
    super(1);
  }
}
class FakeHead {
  childNodes: FakeNode[] = [];
  ownerDocument = { createElement: (tag: string) => new FakeElement(tag.toUpperCase()) };
  append(node: FakeNode) {
    node.parent = this;
    this.childNodes.push(node);
    return node;
  }
  insertBefore(node: FakeNode, ref: FakeNode) {
    node.parent = this;
    this.childNodes.splice(this.childNodes.indexOf(ref), 0, node);
  }
}
function script(text: string): FakeElement {
  const el = new FakeElement('SCRIPT');
  el.type = 'application/ld+json';
  el.textContent = text;
  return el;
}
function headWithRouteBlock(routeJson: string) {
  const head = new FakeHead();
  const person = head.append(script('{"@type":"Person"}')) as FakeElement;
  head.append(new FakeComment('ROUTE_JSONLD'));
  const baked = head.append(script(`\n${routeJson}\n  `)) as FakeElement;
  head.append(new FakeComment('/ROUTE_JSONLD'));
  return { head, person, baked };
}
const routeScripts = (head: FakeHead) =>
  head.childNodes.filter((n): n is FakeElement => n instanceof FakeElement && n !== head.childNodes[0]);

test('syncRouteJsonLd swaps only the route block', () => {
  const { head, person } = headWithRouteBlock('{"home":true}');
  syncRouteJsonLd(head as unknown as HTMLHeadElement, '{"about":true}');
  assert.equal(head.childNodes[0], person, 'the stable Person graph outside the anchors stays');
  assert.deepEqual(routeScripts(head).map((s) => s.textContent), ['{"about":true}']);
  const end = head.childNodes.findIndex((n) => n instanceof FakeComment && n.data === '/ROUTE_JSONLD');
  assert.equal(head.childNodes[end - 1], routeScripts(head)[0], 'the new block sits inside the anchors');
});

test('syncRouteJsonLd leaves an already-current block untouched, and clears it for a page with none', () => {
  const { head, baked } = headWithRouteBlock('{"home":true}');
  syncRouteJsonLd(head as unknown as HTMLHeadElement, '{"home":true}');
  assert.deepEqual(routeScripts(head), [baked], 'first load: no DOM churn');
  syncRouteJsonLd(head as unknown as HTMLHeadElement, null);
  assert.deepEqual(routeScripts(head), [], 'a noindex page carries no route graph');
});

test('syncRouteJsonLd does nothing when the anchors are missing', () => {
  const head = new FakeHead();
  head.append(script('{"@type":"Person"}'));
  syncRouteJsonLd(head as unknown as HTMLHeadElement, '{"about":true}');
  assert.equal(head.childNodes.length, 1);
});

test('usePageMeta keeps the route JSON-LD in step with the route', () => {
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const hook = app.slice(app.indexOf('const usePageMeta = '), app.indexOf('\n};', app.indexOf('const usePageMeta = ')));
  assert.match(hook, /const routeMeta = noindex \? null : routeMetaFor\(normalizedPath\);/);
  assert.match(hook, /syncRouteJsonLd\(document\.head, routeMeta \? routeJsonLdText\(normalizedPath, routeMeta\) : null\);/);
});
