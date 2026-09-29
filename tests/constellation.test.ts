import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeLinks,
  startFrameLoop,
  stepNodes,
  type ConstellationNode,
} from '../components/constellationModel';

// Regression tests for the ConstellationBackground lifecycle defects (2026-09-29 site audit,
// performance). No jsdom here, so the frame loop and node physics are pure functions tested
// directly, and the d3 wiring is pinned by reading the component source as text.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const componentSource = readFileSync(path.join(root, 'components', 'ConstellationBackground.tsx'), 'utf8');

// A controllable stand-in for requestAnimationFrame / cancelAnimationFrame.
function fakeScheduler() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  const cancelled: number[] = [];
  return {
    pending,
    cancelled,
    request(cb: () => void) {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancel(id: number) {
      cancelled.push(id);
      pending.delete(id);
    },
    flush() {
      const batch = [...pending.entries()];
      pending.clear();
      for (const [, cb] of batch) cb();
    },
  };
}

// --- Defect 1: cleanup cancelled only the FIRST frame id, so the loop outlived unmount ---

test('stop() cancels the frame that is pending NOW, not the first one scheduled', () => {
  const s = fakeScheduler();
  let frames = 0;
  const stop = startFrameLoop(() => { frames++; }, s, true);
  s.flush();
  s.flush();
  s.flush();
  assert.equal(frames, 3);
  const [latest] = [...s.pending.keys()];
  assert.ok(latest > 1, 'a later frame must be pending after three frames ran');
  stop();
  assert.deepEqual(s.cancelled, [latest]);
  assert.equal(s.pending.size, 0);
  s.flush();
  assert.equal(frames, 3, 'no frame may run after stop()');
});

test('stop() called from inside a running frame prevents the reschedule', () => {
  const s = fakeScheduler();
  let frames = 0;
  let stop: () => void = () => {};
  stop = startFrameLoop(() => {
    frames++;
    if (frames === 2) stop();
  }, s, true);
  s.flush();
  s.flush();
  assert.equal(s.pending.size, 0);
  s.flush();
  assert.equal(frames, 2);
});

test('reduced motion: exactly one static frame is drawn and nothing is rescheduled', () => {
  const s = fakeScheduler();
  let frames = 0;
  startFrameLoop(() => { frames++; }, s, false);
  s.flush();
  assert.equal(frames, 1);
  assert.equal(s.pending.size, 0);
});

test('component wires cleanup through the frame-loop stop handle', () => {
  assert.match(componentSource, /const stopLoop = startFrameLoop\(/);
  assert.match(componentSource, /return \(\) => \{[\s\S]*stopLoop\(\);[\s\S]*\};/);
  // The old shape: a bare rAF id captured once and cancelled on unmount.
  assert.doesNotMatch(componentSource, /const animationId = requestAnimationFrame/);
  // reduced-motion still decides whether the loop animates
  assert.match(componentSource, /startFrameLoop\([\s\S]*?!prefersReducedMotion[\s,]*\);/);
});

// --- Defect 2: bounce bounds were captured once, so resize never reached the physics ---

const node = (x: number, vx: number): ConstellationNode => ({ x, y: 100, vx, vy: 0, r: 1 });

test('stepNodes bounces against the bounds passed on THIS call (grown viewport)', () => {
  const bounds = { width: 1000, height: 800 };
  const n = node(999.8, 0.4);
  bounds.width = 1400; // window grew after mount
  stepNodes([n], bounds);
  assert.ok(n.x > 1000 && n.vx > 0, 'a node past the old right edge keeps moving into the new space');
});

test('stepNodes steers a node stranded outside a shrunk viewport back inward (no edge jitter)', () => {
  const bounds = { width: 1000, height: 800 };
  const n = node(950, 0.4);
  bounds.width = 600; // window shrank; node is now off-screen
  const xs: number[] = [];
  for (let i = 0; i < 5; i++) {
    stepNodes([n], bounds);
    xs.push(n.x);
  }
  // A plain `vx *= -1` would flip every frame while x >= width and pin the node off-screen.
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] < xs[i - 1], `x must decrease monotonically: ${xs.join(', ')}`);
});

test('stepNodes matches the original wall bounce for nodes inside the viewport', () => {
  const bounds = { width: 1000, height: 800 };
  const left = node(0.2, -0.3);
  const right = node(999.9, 0.25);
  stepNodes([left, right], bounds);
  assert.equal(left.vx, 0.3);
  assert.equal(right.vx, -0.25);
});

test('component resize handler updates the same bounds object the frames read', () => {
  assert.match(componentSource, /const handleResize = \(\) => \{[\s\S]*?bounds\.width = window\.innerWidth;[\s\S]*?bounds\.height = window\.innerHeight;/);
  assert.match(componentSource, /stepNodes\(nodes, bounds\)/);
  assert.match(componentSource, /window\.removeEventListener\('resize', handleResize\)/);
});

// --- Defect 3: every frame removed and re-created the whole SVG subtree ---

test('computeLinks yields the same segments and opacity as the original pairwise loop', () => {
  const nodes: ConstellationNode[] = [
    { x: 0, y: 0, vx: 0, vy: 0, r: 1 },
    { x: 30, y: 40, vx: 0, vy: 0, r: 1 }, // 50 from #0
    { x: 300, y: 0, vx: 0, vy: 0, r: 1 }, // 300 from #0, out of range
    { x: 300, y: 120, vx: 0, vy: 0, r: 1 }, // 120 from #2
  ];
  const links = computeLinks(nodes, 150);
  assert.deepEqual(
    links.map((l) => [l.x1, l.y1, l.x2, l.y2]),
    [[0, 0, 30, 40], [300, 0, 300, 120]],
  );
  assert.equal(links[0].strength, 1 - 50 / 150);
  assert.equal(links[1].strength, 1 - 120 / 150);
});

test('frames update persistent elements in place instead of rebuilding the SVG', () => {
  assert.doesNotMatch(componentSource, /selectAll\('\*'\)\.remove\(\)/);
  assert.match(componentSource, /\.join\(/);
  // Layers are built once per mount and removed on unmount (StrictMode remounts must not stack them).
  assert.match(componentSource, /return \(\) => \{[\s\S]*linkLayer\.remove\(\);[\s\S]*nodeLayer\.remove\(\);[\s\S]*\};/);
});
