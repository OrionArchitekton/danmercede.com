import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MeridianPolyhedronStage } from './MeridianPolyhedronStage';
import {
  AuthorityGateIcon,
  DriftGuardIcon,
  GatedSubstrateIcon,
  ImmutableReceiptIcon,
} from './BrandIcons';

export interface StackLayerSpec {
  id: 'L1' | 'L2' | 'L3' | 'L4';
  code: string;
  name: string;
  principle: string;
  failurePrevented: string;
  artifact: string;
  href: string;
  Icon: React.FC<{ className?: string }>;
}

const LAYERS: readonly StackLayerSpec[] = [
  {
    id: 'L1',
    code: 'LAYER 01',
    name: 'Authority Gate',
    principle: 'Every consequential mutation waits on an explicit schema-validated allow verdict before touching downstream state.',
    failurePrevented: 'Blocks silent pass-through when a model times out, hallucinates JSON keys, or contradicts itself.',
    artifact: 'failclosed admission gate',
    href: '/works/failclosed/',
    Icon: AuthorityGateIcon,
  },
  {
    id: 'L2',
    code: 'LAYER 02',
    name: 'Immutable Receipts',
    principle: 'Each evaluated transition emits a structured cryptographic receipt recording actor, input digest, rule result, and outcome.',
    failurePrevented: 'Eliminates un-auditable "trust me" runs where an operator cannot replay why an action fired.',
    artifact: 'Deterministic receipt schema',
    href: '/guides/done-needs-a-receipt',
    Icon: ImmutableReceiptIcon,
  },
  {
    id: 'L3',
    code: 'LAYER 03',
    name: 'Drift Guard',
    principle: 'Behavioral contracts travel across model upgrades, comparing live execution against the prior agreed contract before shipping.',
    failurePrevented: 'Catches quiet regression when an upstream frontier model weight changes tool-calling boundaries.',
    artifact: 'Proctor regression runner',
    href: '/works/proctor/',
    Icon: DriftGuardIcon,
  },
  {
    id: 'L4',
    code: 'LAYER 04',
    name: 'Gated Substrate',
    principle: 'Least-privilege tool surfaces, bounded token budgets, and isolated workspaces physically withhold capabilities the task does not own.',
    failurePrevented: 'Removes capability at the boundary rather than begging a prompt to behave safely.',
    artifact: 'mcp-context-budget & sandboxes',
    href: '/works/mcp-context-budget/',
    Icon: GatedSubstrateIcon,
  },
];

export const MeridianArtifactStage: React.FC<{ sectionId?: string }> = ({ sectionId = 'meridian-stage' }) => {
  const [selectedId, setSelectedId] = useState<StackLayerSpec['id']>('L1');
  const active = LAYERS.find((l) => l.id === selectedId) ?? LAYERS[0];
  const reduceMotion = useReducedMotion();

  return (
    <section
      id={sectionId}
      aria-labelledby="meridian-stack-heading"
      className="scroll-mt-24 meridian-plate-accent rounded-lg p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <img
            src="/brand/dm-seal-architectural.svg"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            loading="eager"
            decoding="async"
            className="h-9 w-9 shrink-0"
          />
          <div>
            <h2 id="meridian-stack-heading" className="text-2xl sm:text-3xl font-semibold text-white">
              How execution stays governed under failure
            </h2>
            <p className="folio-index text-copper-400 mt-1">TEST BENCH // FOUR-LAYER CONTROL PLANE</p>
          </div>
        </div>
        <span className="font-mono text-xs text-slate-300 tabular-nums">
          Inspect L1 to L4 boundaries
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 cols: Blender 5.2 Meridian Polyhedron Plate + Layer Selector */}
        <div className="lg:col-span-5 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>ARTIFACT // MERIDIAN POLYHEDRON</span>
            <span className="text-copper-300 tabular-nums">{active.code}</span>
          </div>
            <MeridianPolyhedronStage activeLayer={selectedId} onSelectLayer={setSelectedId} />
            <p className="mt-2 text-center font-mono text-xs text-slate-400">
              Interactive 3D solid mapped to L1 to L4 execution invariants
            </p>
            <div className="mt-1 flex justify-center">
              <a
                href="/media/blender/meridian-monolith.glb"
                className="inline-flex min-h-[44px] items-center gap-1.5 font-mono text-xs text-copper-300 hover:text-copper-400 underline underline-offset-4"
              >
                Inspect Blender asset (.glb · 26 KB)
              </a>
            </div>
        </div>

        {/* Right 7 cols: Interactive Layer Selector Bench */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="tablist" aria-label="Control plane layers">
            {LAYERS.map((layer) => {
              const selected = layer.id === selectedId;
              const Icon = layer.Icon;
              return (
                <button
                  key={layer.id}
                  id={`tab-${layer.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${layer.id}`}
                  onClick={() => setSelectedId(layer.id)}
                  className={`min-h-[48px] flex flex-col items-start justify-center rounded-sm border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'border-copper-300 bg-copper-300/15 text-white'
                      : 'border-white/10 bg-navy-midnight/80 text-slate-300 hover:border-copper-500/45 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-copper-300">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {layer.id}
                  </span>
                  <span className="mt-1 text-xs font-medium leading-tight">{layer.name}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/15 pt-5" role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-copper-500/40 bg-copper-500/10 text-copper-300">
                      <active.Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-mono text-xs text-copper-400">{active.code}</p>
                      <h3 className="text-xl font-semibold text-white">{active.name}</h3>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-300 border border-white/10 rounded-xs px-2.5 py-1 bg-navy-deep">
                    {active.artifact}
                  </span>
                </div>

                <dl className="space-y-4">
                  <div>
                    <dt className="font-mono text-xs text-slate-400">Invariant</dt>
                    <dd className="mt-1 text-sm sm:text-base text-slate-200 leading-relaxed max-w-[54ch]">{active.principle}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs text-slate-400">Failure Class Prevented</dt>
                    <dd className="mt-1 text-sm text-slate-300 leading-relaxed max-w-[54ch]">{active.failurePrevented}</dd>
                  </div>
                </dl>

                <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  {active.href.startsWith('/works/') ? (
                    <a
                      href={active.href}
                      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-copper-300 hover:text-copper-400"
                    >
                      Inspect {active.artifact} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      to={active.href}
                      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-copper-300 hover:text-copper-400"
                    >
                      Read {active.artifact} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  )}
                  <Link
                    to="/proof#gate-simulator"
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-white underline underline-offset-4"
                  >
                    Open live gate simulator <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeridianArtifactStage;
