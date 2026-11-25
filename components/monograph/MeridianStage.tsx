import React from 'react';

interface MeridianStageProps {
  className?: string;
  children?: React.ReactNode;
}

export const MeridianStage: React.FC<MeridianStageProps> = ({ className = '', children }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Architectural coordinate vernier frame */}
      <div className="meridian-plate-accent relative overflow-hidden rounded-lg p-3 sm:p-4">
        {/* Precision coordinate vernier dot matrix (pure radial CSS avoids gradient-grid advisory & LCP competition) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage: 'radial-gradient(rgba(230, 130, 73, 0.24) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 border-l border-t border-copper-300/75"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 border-r border-t border-copper-300/75"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-copper-300/75"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r border-copper-300/75"
        />

        {/* Top plate telemetry strip */}
        <div className="relative z-10 mb-3 flex items-center justify-between gap-2 whitespace-nowrap border-b border-white/10 pb-2 text-[11px] sm:text-xs font-mono text-slate-300 tabular-nums">
          <span>PLATE 00 // PRINCIPAL</span>
          <span className="sm:hidden text-copper-300">24HR · $6M P&amp;L</span>
          <span className="hidden sm:inline text-copper-300">24HR FITNESS · $6M P&amp;L</span>
        </div>

        {/* Portrait plate (AVIF srcset + guaranteed fallback) */}
        <div className="relative overflow-hidden rounded-sm border border-white/15 bg-navy-midnight">
          {children ?? (
            <picture>
              <source
                type="image/avif"
                srcSet="/media/portraits/dan-mercede-founder-headshot-hero-480w.avif 480w, /media/portraits/dan-mercede-founder-headshot-hero-800w.avif 800w"
                sizes="(max-width: 1023px) 360px, 420px"
              />
              <source
                type="image/webp"
                srcSet="/media/portraits/dan-mercede-founder-headshot-hero-480w.webp 480w, /media/portraits/dan-mercede-founder-headshot-hero-800w.webp 800w"
                sizes="(max-width: 1023px) 360px, 420px"
              />
              <img
                src="/dan-mercede-founder-headshot-hero.webp"
                alt="Portrait of Dan Mercede, operator and systems builder"
                width={1200}
                height={1500}
                fetchPriority="high"
                decoding="async"
                className="aspect-[4/5] w-full object-cover object-[50%_18%] contrast-[1.04] saturate-[0.92] brightness-[0.96]"
              />
            </picture>
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,transparent_48%,rgba(2,11,41,0.58)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#020B29]/90 via-[#020B29]/30 to-transparent"
          />

          {/* Sculpted Blender 5.2 Meridian Polyhedron plate inset */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2.5 rounded-sm border border-copper-500/40 bg-[#020B29]/90 p-1.5 backdrop-blur-xs">
            <picture>
              <source type="image/avif" srcSet="/media/blender/meridian-monolith-480w.avif" />
              <img
                src="/media/blender/meridian-monolith-480w.webp"
                alt="Sculptural copper and navy meridian polyhedron instrument mark"
                width={48}
                height={48}
                loading="eager"
                decoding="async"
                className="h-11 w-11 rounded-xs object-cover"
              />
            </picture>
            <div className="pr-1.5 text-left">
              <p className="font-mono text-xs text-copper-300 leading-tight">Meridian 01</p>
              <p className="font-mono text-xs text-slate-300 leading-tight">Fail-closed</p>
            </div>
          </div>
        </div>

        {/* Colophon calibration footer */}
        <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <span>Authority · Receipts · Drift</span>
          <span className="text-slate-300 tabular-nums">33.1192° N</span>
        </div>
      </div>
    </div>
  );
};

export default MeridianStage;
