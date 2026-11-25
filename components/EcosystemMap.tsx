import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { motion, useReducedMotion } from 'motion/react';
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
  { slug: 'cosmocrat', label: 'Cosmocrat', role: 'Governed AI OS', x: 420, y: 155, primary: true },
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

  const activeNode = NODE_POSITIONS.find((n) => n.slug === selectedSlug) ?? null;
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="ecosystem-map-heading"
      className="mb-14 meridian-plate-accent rounded-lg p-5 md:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="ecosystem-map-heading" className="text-xl sm:text-2xl font-semibold text-white">
            Architecture Relationship Map
          </h2>
          <p className="text-xs font-mono text-slate-300 mt-1">
            ESTATE TOPOLOGY // Select any entity below to inspect its boundary and operating relationship.
          </p>
        </div>
        <span className="font-mono text-xs text-copper-300 tabular-nums">
          6 entities · clean product boundaries
        </span>
      </div>

      {/* Desktop accessible >=44px selector buttons: hidden on mobile where stacked card buttons serve directly */}
      <div className="hidden sm:flex mb-5 flex-wrap gap-2" role="group" aria-label="Select ecosystem entity">
        {NODE_POSITIONS.map((node) => {
          const isSelected = selectedSlug === node.slug;
          return (
            <button
              key={node.slug}
              type="button"
              onClick={() => onSelect(node.slug)}
              aria-pressed={isSelected}
              className={`min-h-[44px] inline-flex items-center rounded-sm border px-3.5 py-2 text-xs font-mono transition-colors ${
                isSelected
                  ? 'border-copper-300 bg-copper-300 text-slate-950 font-semibold'
                  : 'border-white/15 bg-navy-midnight text-slate-200 hover:border-copper-500/50 hover:text-white'
              }`}
            >
              {node.label}
            </button>
          );
        })}
      </div>

      {/* Mobile interactive plane topology (replaces duplicate pill buttons & shrunk SVG below 640px) */}
      <div className="sm:hidden border-t border-white/10 pt-4 space-y-2.5" role="group" aria-label="Select ecosystem entity (mobile)">
        {NODE_POSITIONS.map((node) => {
          const isSelected = selectedSlug === node.slug;
          const isConnected =
            selectedSlug !== null &&
            EDGES.some(
              (e) =>
                (e.from === selectedSlug && e.to === node.slug) ||
                (e.to === selectedSlug && e.from === node.slug),
            );
          const rel = selectedSlug
            ? EDGES.find(
                (e) =>
                  (e.from === selectedSlug && e.to === node.slug) ||
                  (e.to === selectedSlug && e.from === node.slug),
              )?.relation
            : undefined;
          return (
            <button
              key={node.slug}
              type="button"
              onClick={() => onSelect(node.slug)}
              aria-pressed={isSelected}
              className={`w-full min-h-[52px] text-left rounded-sm border px-3.5 py-2.5 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-copper-300 bg-navy-deep'
                  : isConnected
                    ? 'border-copper-500/45 bg-navy-midnight'
                    : node.primary
                      ? 'border-copper-500/30 bg-navy-midnight/90'
                      : 'border-white/10 bg-navy-midnight/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{node.label}</span>
                <span className="font-mono text-[11px] text-copper-300">{node.role}</span>
              </div>
              {rel && <p className="mt-1 font-mono text-[11px] text-slate-300">{rel}</p>}
            </button>
          );
        })}
      </div>

      {/* Desktop architectural topology plate (pointer clicks mirror the semantic controls above) */}
      <div className="hidden sm:block w-full border-t border-white/10 pt-4">
        <svg
          viewBox="0 0 840 340"
          className="w-full h-auto select-none"
          aria-hidden="true"
        >
          <g>
            {EDGES.map((edge) => {
              const path = linkGenerator(edge) ?? '';
              const highlighted = selectedSlug === edge.from || selectedSlug === edge.to;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={path}
                  fill="none"
                  stroke={highlighted ? '#FFC08B' : '#334155'}
                  strokeWidth={highlighted ? 2.4 : 1.3}
                  strokeDasharray={edge.to === 'path-of-life' ? '4 4' : undefined}
                  opacity={selectedSlug && !highlighted ? 0.35 : 0.92}
                  style={{ transition: 'stroke 180ms ease, opacity 180ms ease' }}
                />
              );
            })}
          </g>

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
              const boxW = node.primary ? 220 : 198;
              const boxH = 64;

              return (
                <g
                  key={node.slug}
                  transform={`translate(${node.x - boxW / 2}, ${node.y - boxH / 2})`}
                  onClick={() => onSelect(node.slug)}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={dimmed ? 0.45 : 1}
                >
                  <rect
                    width={boxW}
                    height={boxH}
                    rx={6}
                    fill={isSelected ? '#0E1F4F' : '#07143A'}
                    stroke={isSelected ? '#FFC08B' : node.primary ? '#E68249' : '#475569'}
                    strokeWidth={isSelected ? 2 : 1.25}
                    style={{ transition: 'fill 180ms ease, stroke 180ms ease' }}
                  />
                  <text
                    x={boxW / 2}
                    y={27}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={13}
                    fontWeight={600}
                    fontFamily="IBM Plex Sans, system-ui, sans-serif"
                  >
                    {venture?.name ?? node.label}
                  </text>
                  <text
                    x={boxW / 2}
                    y={46}
                    textAnchor="middle"
                    fill={node.primary || isSelected ? '#FFC08B' : '#94A3B8'}
                    fontSize={11}
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

      {activeNode && (
        <motion.p
          key={activeNode.slug}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="mt-3 text-xs font-mono text-copper-300"
          aria-live="polite"
        >
          Selected: {activeNode.label} ({activeNode.role})
        </motion.p>
      )}
    </section>
  );
};

export default EcosystemMap;
