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

const ConstellationBackground: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const svg = d3.select(svgRef.current);
    // Mutable: the resize handler updates it and every frame reads it.
    const bounds: Bounds = { width: window.innerWidth, height: window.innerHeight };

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
        .join(enter => enter.append('line').attr('stroke', '#B87333').attr('stroke-width', 0.5)) // Copper
        .attr('x1', d => d.x1)
        .attr('y1', d => d.y1)
        .attr('x2', d => d.x2)
        .attr('y2', d => d.y2)
        .attr('opacity', d => d.strength * 0.3); // Subtle

      circles.attr('cx', d => d.x).attr('cy', d => d.y);
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

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stopLoop();
      linkLayer.remove();
      nodeLayer.remove();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-40"
      style={{ background: 'transparent' }} // Let body background show through
    />
  );
};

export default ConstellationBackground;
