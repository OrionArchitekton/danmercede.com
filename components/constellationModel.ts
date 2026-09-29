// Pure, DOM-free core of ConstellationBackground: node physics, link geometry, and the
// animation-frame loop. Kept separate from the d3/React wiring so the lifecycle rules are
// unit-testable without a browser (tests/constellation.test.ts).

export interface ConstellationNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export interface Link {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 1 at zero distance, falling linearly to 0 at the connection distance. */
  strength: number;
}

export const NODE_COUNT = 40;
export const CONNECTION_DISTANCE = 150;

export function createNodes(count: number, bounds: Bounds, random: () => number = Math.random): ConstellationNode[] {
  const nodes: ConstellationNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: random() * bounds.width,
      y: random() * bounds.height,
      vx: (random() - 0.5) * 0.5, // slow drift
      vy: (random() - 0.5) * 0.5,
      r: random() * 2 + 1,
    });
  }
  return nodes;
}

// Advance every node one frame. `bounds` is read on each call, so a resize reaches the physics
// on the very next frame. The bounce is directional (a wall only ever points velocity back
// inward): for a node inside the viewport this is the same as flipping the sign at the wall,
// but a node left outside after the viewport shrinks heads back into view instead of flipping
// every frame and staying pinned off-screen.
export function stepNodes(nodes: ConstellationNode[], bounds: Bounds): void {
  for (const node of nodes) {
    node.x += node.vx;
    node.y += node.vy;
    if (node.x <= 0) node.vx = Math.abs(node.vx);
    else if (node.x >= bounds.width) node.vx = -Math.abs(node.vx);
    if (node.y <= 0) node.vy = Math.abs(node.vy);
    else if (node.y >= bounds.height) node.vy = -Math.abs(node.vy);
  }
}

// Every node pair closer than `maxDistance`, in (i, j) order.
export function computeLinks(nodes: ConstellationNode[], maxDistance: number): Link[] {
  const links: Link[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < maxDistance) {
        links.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y, strength: 1 - distance / maxDistance });
      }
    }
  }
  return links;
}

export interface FrameScheduler {
  request(callback: () => void): number;
  cancel(id: number): void;
}

// Run `frame` on the next animation frame and, when `animate` is true, on every frame after.
// Returns stop(): it cancels whichever frame is pending at that moment (every reschedule
// replaces the id) and blocks a reschedule from a frame that is already running.
export function startFrameLoop(frame: () => void, scheduler: FrameScheduler, animate: boolean): () => void {
  let pendingId: number | null = null;
  let stopped = false;

  const run = () => {
    pendingId = null;
    if (stopped) return;
    frame();
    if (animate && !stopped) pendingId = scheduler.request(run);
  };

  pendingId = scheduler.request(run);

  return () => {
    stopped = true;
    if (pendingId !== null) scheduler.cancel(pendingId);
    pendingId = null;
  };
}
