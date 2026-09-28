import { ExternalLink } from 'lucide-react';
import { Work } from '../types';

// One /works card, shared by the "Open Source & Tooling" and "Applied Agent Projects"
// sections. It deliberately shows no ship date: the page is ordered by importance
// (WORKS_PRIORITY), and dates made it read as a publishing calendar. Structured data
// still carries datePublished (seoMeta.ts).
export const WorkCard = ({ work }: { work: Work }) => (
  <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6 hover:border-copper-500/30 transition-all group flex flex-col">
    <div className="mb-4">
      <span className="text-xs font-mono uppercase tracking-widest text-copper-400">
        {work.category}
      </span>
    </div>
    <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-copper-400 transition-colors">
      {work.title}
    </h3>
    <p className="text-slate-400 text-sm leading-relaxed flex-grow">{work.description}</p>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <a
        href={work.link || work.repo}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${work.link && work.link !== work.repo ? 'View project' : 'Repository'}: ${work.title}`}
        className="inline-flex items-center text-sm font-medium text-copper-400 hover:text-copper-300"
      >
        {work.link && work.link !== work.repo ? 'View project' : 'Repository'} <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
      </a>
      {work.gist && (
        <a
          href={work.gist}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Code sample for ${work.title}`}
          className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-copper-400"
        >
          Sample <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
        </a>
      )}
      {work.video && (
        <a
          href={work.video}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Demo video for ${work.title}`}
          className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-copper-400"
        >
          Watch demo <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
        </a>
      )}
      {work.license && (
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider ml-auto">{work.license}</span>
      )}
    </div>
  </div>
);
