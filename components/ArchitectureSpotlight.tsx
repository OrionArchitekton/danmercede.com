import { useState } from 'react';
import { ArrowRight, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DIAGRAMS } from '../constants';
import type { Diagram } from '../types';
import { DiagramPreview } from './DiagramPreview';

const spotlightSlugs = [
  '2026-02-27-monitor-after-vs-constrain-before',
  '2026-06-29-the-two-plane-architecture',
  '2026-02-24-authority-decay-over-a-session',
];
const diagrams = spotlightSlugs.map((slug) => DIAGRAMS.find((diagram) => diagram.slug === slug))
  .filter((diagram): diagram is Diagram => Boolean(diagram));

export function ArchitectureSpotlight() {
  const [preview, setPreview] = useState<Diagram | null>(null);
  if (!diagrams.length) return null;

  return (
    <section id="visual-architecture" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-10 md:py-14">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="border-l-2 border-copper-500 pl-5 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Visual architecture
        </h2>
        <Link to="/diagrams" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-copper-400 hover:text-copper-300">
          View all {DIAGRAMS.length} diagrams <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {diagrams.map((diagram) => (
          <article key={diagram.slug} className="overflow-hidden rounded-lg border border-white/10 bg-navy-deep">
            <button type="button" aria-haspopup="dialog" aria-label={`Preview ${diagram.title}`}
              onClick={() => setPreview(diagram)}
              className="group relative block w-full border-b border-white/10 bg-navy-midnight focus-visible:outline-offset-[-3px]">
              <img src={diagram.src} alt="" loading="lazy" decoding="async" className="aspect-[3/2] w-full object-contain" />
              <span className="absolute right-2 bottom-2 rounded-sm border border-white/20 bg-navy-midnight/95 p-2 text-copper-400 group-hover:text-white">
                <Maximize2 size={16} aria-hidden="true" />
              </span>
            </button>
            <h3 className="px-4 py-3 text-lg font-semibold leading-snug text-white">
              <Link to={`/diagrams/${diagram.slug}`} className="hover:text-copper-300">{diagram.title}</Link>
            </h3>
          </article>
        ))}
      </div>
      {preview && <DiagramPreview diagram={preview} onDismiss={() => setPreview(null)} />}
    </section>
  );
}
