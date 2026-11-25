import { ArrowRight, ExternalLink, Play, FileCode2 } from 'lucide-react';
import { Work } from '../types';

const SITE_ORIGINS = new Set(['https://www.danmercede.com', 'https://danmercede.com']);

export function linkTargetProps(href: string): { target?: string; rel?: string } {
  let sameSite = false;
  try {
    sameSite = SITE_ORIGINS.has(new URL(href, 'https://www.danmercede.com').origin);
  } catch {
    sameSite = false;
  }
  return sameSite ? {} : { target: '_blank', rel: 'noopener noreferrer' };
}

const LinkIcon = ({ href }: { href: string }) =>
  linkTargetProps(href).target ? (
    <ExternalLink className="w-3.5 h-3.5 ml-1.5 shrink-0" aria-hidden="true" />
  ) : (
    <ArrowRight className="w-3.5 h-3.5 ml-1.5 shrink-0" aria-hidden="true" />
  );

export const WorkCard = ({ work, index, className = '' }: { work: Work; index?: number; className?: string }) => {
  const primaryHref = work.link || work.repo;
  const hasProjectPage = Boolean(work.link && work.link !== work.repo);
  const folio = index !== undefined ? String(index + 1).padStart(2, '0') : null;
  const isPriority = index !== undefined && index < 2;

  return (
    <article
      className={`${
        isPriority ? 'meridian-plate-accent' : 'meridian-plate'
      } group relative flex flex-col rounded-lg p-6 hover:border-copper-500/45 transition-colors duration-200 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {folio && (
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {folio} // {work.category}
              </span>
            )}
            {isPriority && (
              <span className="rounded-xs border border-copper-500/35 bg-copper-500/12 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-copper-300">
                Primary
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-white group-hover:text-copper-300 transition-colors leading-snug">
            {work.title}
          </h3>
        </div>
        {work.license && (
          <span className="shrink-0 rounded-xs border border-white/10 bg-navy-midnight px-2 py-0.5 text-xs font-mono text-slate-300">
            {work.license}
          </span>
        )}
      </div>

      {!folio && <p className="font-mono text-xs text-copper-400 mb-3">{work.category}</p>}
      <p className="mt-2 text-slate-300 text-sm leading-relaxed grow max-w-[54ch]">{work.description}</p>

      <div className="mt-5 pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-5 gap-y-1">
        <a
          href={primaryHref}
          {...linkTargetProps(primaryHref)}
          aria-label={`${hasProjectPage ? 'View project' : 'Repository'}: ${work.title}`}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-copper-300 hover:text-copper-400 transition-colors"
        >
          {hasProjectPage ? 'View project' : 'Repository'}
          <LinkIcon href={primaryHref} />
        </a>
        {hasProjectPage && work.repo && (
          <a
            href={work.repo}
            {...linkTargetProps(work.repo)}
            aria-label={`Repo for ${work.title}`}
            className="inline-flex min-h-[44px] items-center text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            Repo <ExternalLink className="w-3 h-3 ml-1 shrink-0" aria-hidden="true" />
          </a>
        )}
        {work.gist && (
          <a
            href={work.gist}
            {...linkTargetProps(work.gist)}
            aria-label={`Sample code for ${work.title}`}
            className="inline-flex min-h-[44px] items-center text-xs font-mono text-slate-300 hover:text-copper-300 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />
            Sample
          </a>
        )}
        {work.video && (
          <a
            href={work.video}
            {...linkTargetProps(work.video)}
            aria-label={`Watch demo of ${work.title}`}
            className="inline-flex min-h-[44px] items-center text-xs font-mono text-slate-300 hover:text-copper-300 transition-colors"
          >
            <Play className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />
            Watch demo
          </a>
        )}
      </div>
    </article>
  );
};
