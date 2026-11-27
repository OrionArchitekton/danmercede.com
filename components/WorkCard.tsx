import { ArrowRight, ExternalLink, Play, FileCode2 } from 'lucide-react';
import { Work } from '../types';

// One /works card, shared by the "Open Source & Tooling" and "Applied Agent Projects"
// sections. It deliberately shows no ship date: the page is ordered by importance
// (WORKS_PRIORITY), and dates made it read as a publishing calendar. Structured data
// still carries datePublished (seoMeta.ts).
// Same-site pages (including the /works/<slug>/ microsites served on this origin)
// open in place; only off-site links open a new tab (2026-09-29 site audit).
const SITE_ORIGINS = new Set(['https://www.danmercede.com', 'https://danmercede.com']);

export function linkTargetProps(href: string): { target?: string; rel?: string } {
  // Resolve against the site so a protocol-relative "//host/..." is judged by its
  // real origin, not by its leading slash.
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
    <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
  ) : (
    <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
  );

export const WorkCard = ({ work }: { work: Work }) => {
  const primaryHref = work.link || work.repo;
  const hasProjectPage = Boolean(work.link && work.link !== work.repo);

  return (
    <div className="relative rounded-lg border border-white/10 bg-navy-deep/65 p-6 hover:border-copper-500/45 hover:bg-navy-deep/90 transition-all duration-200 group flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-semibold text-white group-hover:text-copper-300 transition-colors leading-snug">
          {work.title}
        </h3>
        {work.license && (
          <span className="text-xs font-mono text-slate-400 shrink-0">{work.license}</span>
        )}
      </div>

      <p className="font-mono text-xs text-copper-400 mb-3">{work.category}</p>
      <p className="text-slate-300 text-sm leading-relaxed grow">{work.description}</p>

      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4">
        <a
          href={primaryHref}
          {...linkTargetProps(primaryHref)}
          aria-label={`${hasProjectPage ? 'View project' : 'Repository'}: ${work.title}`}
          className="inline-flex items-center text-sm font-medium text-copper-400 hover:text-copper-300 transition-colors"
        >
          {hasProjectPage ? 'View project' : 'Repository'}
          <LinkIcon href={primaryHref} />
        </a>
        {hasProjectPage && work.repo && (
          <a
            href={work.repo}
            {...linkTargetProps(work.repo)}
            aria-label={`Repo: ${work.title}`}
            className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            Repo <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
          </a>
        )}
        {work.gist && (
          <a
            href={work.gist}
            {...linkTargetProps(work.gist)}
            aria-label={`Code sample for ${work.title}`}
            className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-copper-400 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Sample
          </a>
        )}
        {work.video && (
          <a
            href={work.video}
            {...linkTargetProps(work.video)}
            aria-label={`Watch demo: ${work.title}`}
            className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-copper-400 transition-colors"
          >
            <Play className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Watch demo
          </a>
        )}
      </div>
    </div>
  );
};
