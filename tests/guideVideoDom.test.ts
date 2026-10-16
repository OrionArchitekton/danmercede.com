import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// Guide video player (specs/guide-video-embed-spec.md), seam 2b: the player mounted
// in a DOM (jsdom) and driven by presses, for the behavior a static render cannot
// show: the swap on press, focus moving into the live player, and the reset when the
// page moves to another guide. jsdom loads no subresources by default, so the
// YouTube frame and preview image are never fetched here.

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://www.danmercede.com/guides/a' });
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
// Node 21+ has a global navigator; Node 20 (CI) does not, and React DOM reads navigator.userAgent at import.
if (!('navigator' in globalThis)) {
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;

// React DOM decides at import time whether a DOM exists, so it loads after the globals.
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: GuideVideo } = await import('../components/GuideVideo');
const { act } = React;

const ID_A = 'Ab3_d-F9hJk';
const ID_B = 'Zy9-x_W8vUt';

// Assertions compare booleans, never DOM nodes: on failure node:assert would try to
// print a jsdom element, whose object graph is large enough to hang the run.
function mount() {
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const show = (id: string) => act(async () => root.render(React.createElement(GuideVideo, { id, title: 'A guide' })));
  const press = () =>
    act(async () => {
      const button = container.querySelector('button');
      assert.ok(button, 'expected the facade play button');
      button.click();
    });
  const iframe = () => container.querySelector('iframe');
  const facadeImage = () => container.querySelector('button img')?.getAttribute('src') ?? null;
  const unmount = () => act(async () => root.unmount());
  return { container, show, press, iframe, facadeImage, unmount };
}

test('pressing play swaps the facade for the live player and moves focus into it (AC9)', async () => {
  const p = mount();
  await p.show(ID_A);
  assert.ok(p.iframe() === null, 'no frame before the press');
  assert.ok(p.facadeImage()?.includes(`/vi/${ID_A}/`));
  await p.press();
  const frame = p.iframe();
  assert.ok(frame !== null, 'the press loads the live player');
  assert.ok(frame.getAttribute('src')?.startsWith(`https://www.youtube-nocookie.com/embed/${ID_A}?`));
  assert.ok(p.container.querySelector('button') === null, 'the facade button is gone');
  assert.ok(dom.window.document.activeElement === frame, 'keyboard focus moves into the live player');
  await p.unmount();
});

test('moving to another guide video resets the player to its facade, with no press (AC8)', async () => {
  const p = mount();
  await p.show(ID_A);
  await p.press();
  assert.ok(p.iframe() !== null, 'playing guide A');
  await p.show(ID_B);
  assert.ok(p.iframe() === null, 'guide B must not load its player without a press');
  assert.ok(p.facadeImage()?.includes(`/vi/${ID_B}/`), 'guide B shows its own facade');
  await p.show(ID_A);
  assert.ok(p.iframe() === null, 'coming back to guide A does not resume its player either');
  await p.press();
  assert.ok(p.iframe()?.getAttribute('src')?.includes(`/embed/${ID_A}?`), 'a fresh press still plays');
  await p.unmount();
});

test('the guide page keys the player by guide, so each guide mounts a fresh player (AC8)', () => {
  const app = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'App.tsx'), 'utf8');
  assert.match(app, /<GuideVideo\s+key=\{guide\.slug\}/);
});
