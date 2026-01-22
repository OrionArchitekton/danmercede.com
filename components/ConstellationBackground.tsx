import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const ConstellationBackground: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr('width', width).attr('height', height);

    // Configuration
    const nodeCount = 40;
    const connectionDistance = 150;
    const nodes: Node[] = [];

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5, // Slow velocity
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
      });
    }

    // Draw function
    const tick = () => {
      svg.selectAll('*').remove();

      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x <= 0 || node.x >= width) node.vx *= -1;
        if (node.y <= 0 || node.y >= height) node.vy *= -1;
      });

      // Draw connections (Blueprint lines)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = 1 - distance / connectionDistance;
            svg.append('line')
              .attr('x1', nodes[i].x)
              .attr('y1', nodes[i].y)
              .attr('x2', nodes[j].x)
              .attr('y2', nodes[j].y)
              .attr('stroke', '#B87333') // Copper
              .attr('stroke-width', 0.5)
              .attr('opacity', opacity * 0.3); // Subtle
          }
        }
      }

      // Draw nodes
      svg.selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.r)
        .attr('fill', '#94a3b8') // Slate 400
        .attr('opacity', 0.6);

      requestAnimationFrame(tick);
    };

    const animationId = requestAnimationFrame(tick);

    const handleResize = () => {
      svg.attr('width', window.innerWidth).attr('height', window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-40"
      style={{ background: 'transparent' }} // Let body background show through
    />
  );
};

export default ConstellationBackground;