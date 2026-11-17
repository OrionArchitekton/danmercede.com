import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { VENTURES } from '../constants';

interface EcosystemMapProps {
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

interface NodePos {
  slug: string;
  label: string;
  role: string;
  x: number;
  y: number;
  primary: boolean;
}

interface EdgeDef {
  from: string;
  to: string;
  relation: string;
}

const NODE_POSITIONS: readonly NodePos[] = [
  { slug: 'orion-apex-capital', label: 'Orion Apex Capital', role: 'Ownership & Architecture', x: 160, y: 76, primary: false },
  { slug: 'cosmocrat', label: 'Cosmocrat OS', role: 'Governed AI OS', x: 420, y: 155, primary: true },
  { slug: 'orion-intelligence', label: 'Orion Intelligence Agency', role: 'SMB Consulting & Delivery', x: 680, y: 76, primary: true },
  { slug: 'replyby', label: 'ReplyBy', role: 'Production SMB App', x: 680, y: 255, primary: false },
  { slug: 'apex-trading', label: 'Apex Trading Systems', role: 'Internal Execution Proof', x: 420, y: 280, primary: false },
  { slug: 'path-of-life', label: 'Path of Life Hub', role: 'Consumer Signal Edge', x: 160, y: 255, primary: false },
];

const EDGES: readonly EdgeDef[] = [
  { from: 'orion-apex-capital', to: 'cosmocrat', relation: 'Originates & owns' },
  { from: 'cosmocrat', to: 'orion-intelligence', relation: 'Commercial delivery lane' },
  { from: 'cosmocrat', to: 'replyby', relation: 'Governed execution model' },
  { from: 'cosmocrat', to: 'apex-trading', relation: 'Internal validation' },
  { from: 'cosmocrat', to: 'path-of-life', relation: 'Exploratory edge' },
  { from: 'orion-intelligence', to: 'replyby', relation: 'Validated through OIA' },
];

export const EcosystemMap: React.FC<EcosystemMapProps> = ({ selectedSlug, onSelect }) => {
  const bySlug = useMemo(() => new Map(NODE_POSITIONS.map((n) => [n.slug, n])), []);

  // Use d3.linkHorizontal for smooth, deterministic Bezier splines across both SSR and client.
  const linkGenerator = useMemo(
    () =>
      d3
        .linkHorizontal<EdgeDef, NodePos>()
        .source((d) => bySlug.get(d.from)!)
        .target((d) => bySlug.get(d.to)!)
        .x((d) => d.x)
        .y((d) => d.y),
    [bySlug],
  );

  return (
    <div className="mb-14 rounded-lg border border-white/10 bg-navy-deep/70 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Architecture Relationship Map</h2>
          <p className="text-xs font-mono text-slate-400">Select any entity node to inspect its role and operating constraints below.</p>
        </div>
        <span className="font-mono text-xs text-copper-400">6 entities · shared governance thesis</span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 840 340"
          className="w-full min-w-[600px] h-auto select-none"
          role="img"
          aria-label="Interactive ecosystem architecture diagram connecting Orion Apex Capital, Cosmocrat OS, Orion Intelligence Agency, ReplyBy, Apex Trading Systems, and Path of Life Hub"
        >
          {/* Connection splines */}
          <g>
            {EDGES.map((edge) => {
              const path = linkGenerator(edge) ?? '';
              const highlighted =
                selectedSlug === edge.from || selectedSlug === edge.to;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={path}
                  fill="none"
                  stroke={highlighted ? '#E68249' : '#334155'}
                  strokeWidth={highlighted ? 2.2 : 1.25}
                  strokeDasharray={edge.to === 'path-of-life' ? '4 4' : undefined}
                  opacity={selectedSlug && !highlighted ? 0.35 : 0.9}
                />
              );
            })}
          </g>

          {/* Entity nodes */}
          <g>
            {NODE_POSITIONS.map((node) => {
              const venture = VENTURES.find((v) => v.slug === node.slug);
              const isSelected = selectedSlug === node.slug;
              const isConnected =
                selectedSlug !== null &&
                EDGES.some(
                  (e) =>
                    (e.from === selectedSlug && e.to === node.slug) ||
                    (e.to === selectedSlug && e.from === node.slug),
                );
              const dimmed = selectedSlug !== null && !isSelected && !isConnected;
              const boxW = node.primary ? 216 : 196;
              const boxH = 62;

              return (
                <g
                  key={node.slug}
                  transform={`translate(${node.x - boxW / 2}, ${node.y - boxH / 2})`}
                  onClick={() => onSelect(node.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(node.slug);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Inspect ${venture?.name ?? node.label}`}
                  className="cursor-pointer focus:outline-hidden"
                  opacity={dimmed ? 0.45 : 1}
                >
                  <rect
                    width={boxW}
                    height={boxH}
                    rx={6}
                    fill={isSelected ? '#07143A' : '#020B29'}
                    stroke={isSelected ? '#E68249' : node.primary ? '#F0975A' : '#334155'}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  <text
                    x={boxW / 2}
                    y={26}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={13}
                    fontWeight={600}
                    fontFamily="IBM Plex Sans, system-ui, sans-serif"
                  >
                    {node.label}
                  </text>
                  <text
                    x={boxW / 2}
                    y={44}
                    textAnchor="middle"
                    fill={node.primary || isSelected ? '#F0975A' : '#94A3B8'}
                    fontSize={10.5}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.role}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default EcosystemMap;
