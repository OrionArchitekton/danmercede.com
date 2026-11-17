import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  CONNECTION_DISTANCE,
  NODE_COUNT,
  computeLinks,
  createNodes,
  startFrameLoop,
  stepNodes,
  type Bounds,
  type ConstellationNode,
  type Link,
} from './constellationModel';

const POINTER_RADIUS = 190;

const ConstellationBackground: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const svg = d3.select(svgRef.current);
    // Mutable: the resize handler updates it and every frame reads it.
    const bounds: Bounds = { width: window.innerWidth, height: window.innerHeight };
    let pointer: { x: number; y: number } | null = null;

    svg.attr('width', bounds.width).attr('height', bounds.height);

    const nodes = createNodes(NODE_COUNT, bounds);

    // Build the scene once; frames only update attributes. Lines sit under the nodes.
    const linkLayer = svg.append('g');
    const nodeLayer = svg.append('g');
    const circles = nodeLayer
      .selectAll<SVGCircleElement, ConstellationNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.r)
      .attr('fill', '#94a3b8') // Slate 400
      .attr('opacity', 0.6);

    const draw = () => {
      stepNodes(nodes, bounds);

      // Connections (blueprint lines): reuse existing <line> elements, add/remove only the delta.
      linkLayer
        .selectAll<SVGLineElement, Link>('line')
        .data(computeLinks(nodes, CONNECTION_DISTANCE))
        .join(enter => enter.append('line').attr('stroke', '#E68249').attr('stroke-width', 0.65))
        .attr('x1', d => d.x1)
        .attr('y1', d => d.y1)
        .attr('x2', d => d.x2)
        .attr('y2', d => d.y2)
        .attr('stroke', d => {
          if (!pointer) return '#E68249';
          const mx = (d.x1 + d.x2) * 0.5;
          const my = (d.y1 + d.y2) * 0.5;
          const dist = Math.hypot(mx - pointer.x, my - pointer.y);
          return dist < POINTER_RADIUS ? '#FFC08B' : '#E68249';
        })
        .attr('opacity', d => {
          if (!pointer) return d.strength * 0.34;
          const mx = (d.x1 + d.x2) * 0.5;
          const my = (d.y1 + d.y2) * 0.5;
          const dist = Math.hypot(mx - pointer.x, my - pointer.y);
          const boost = dist < POINTER_RADIUS ? (1 - dist / POINTER_RADIUS) * 0.35 : 0;
          return Math.min(0.68, d.strength * 0.34 + boost);
        });

      circles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('fill', d => {
          if (!pointer) return '#94a3b8';
          return Math.hypot(d.x - pointer.x, d.y - pointer.y) < POINTER_RADIUS ? '#F0975A' : '#94a3b8';
        })
        .attr('opacity', d => {
          if (!pointer) return 0.6;
          return Math.hypot(d.x - pointer.x, d.y - pointer.y) < POINTER_RADIUS ? 0.92 : 0.55;
        });
    };

    // Honor reduced-motion: draw a single static frame, do not loop.
    const stopLoop = startFrameLoop(
      draw,
      { request: cb => requestAnimationFrame(cb), cancel: id => cancelAnimationFrame(id) },
      !prefersReducedMotion,
    );

    const handleResize = () => {
      bounds.width = window.innerWidth;
      bounds.height = window.innerHeight;
      svg.attr('width', bounds.width).attr('height', bounds.height);
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };

    const handlePointerLeave = () => {
      pointer = null;
    };

    window.addEventListener('resize', handleResize);
    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerleave', handlePointerLeave);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      stopLoop();
      linkLayer.remove();
      nodeLayer.remove();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-55"
      style={{ background: 'transparent' }} // Let body background show through
    />
  );
};

export default ConstellationBackground;
