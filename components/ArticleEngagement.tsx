import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Share2, ArrowRight } from 'lucide-react';
import { GUIDES, THOUGHTS, WORKS, NEWSLETTER } from '../constants';
import { SITE_ORIGIN } from '../seoMeta';
import { guideJourney } from '../contentDiscovery';
import { taggedShareUrl } from '../analytics/guideJourney';

export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export const ReadingProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="fixed top-20 left-0 right-0 z-40 h-0.5 bg-transparent pointer-events-none" aria-hidden="true">
      <div
        className="h-full bg-copper-500 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export const ShareStrip: React.FC<{ title: string; path: string }> = ({ title, path }) => {
  const [copied, setCopied] = useState(false);
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(taggedShareUrl(path, 'linkedin'))}`;
  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(taggedShareUrl(path, 'x'))}&via=danmercede`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(canonicalUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-y border-white/10 my-8">
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 mr-auto">
        <Share2 className="w-3.5 h-3.5 text-copper-400" aria-hidden="true" />
        Share this note
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/15 bg-navy-deep/60 text-xs font-mono text-slate-300 hover:border-copper-500/50 hover:text-white transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <a
        href={linkedInHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/15 bg-navy-deep/60 text-xs font-mono text-slate-300 hover:border-copper-500/50 hover:text-white transition-colors"
      >
        LinkedIn
      </a>
      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/15 bg-navy-deep/60 text-xs font-mono text-slate-300 hover:border-copper-500/50 hover:text-white transition-colors"
      >
        X
      </a>
    </div>
  );
};

export const RelatedContentShelf: React.FC<{
  kind: 'guide' | 'essay' | 'diagram';
  currentSlug: string;
}> = ({ kind, currentSlug }) => {
  const journey = kind === 'guide' ? guideJourney(currentSlug) : null;
  if (journey) {
    return (
      <aside aria-label="Continue reading" className="mt-14 border-t border-white/10 pt-10">
        <h2 className="mb-5 text-xl font-bold text-white">Put this guide to work</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link data-guide-next-step to={`/guides/${journey.read.slug}`} className="group rounded-lg border border-white/10 bg-navy-deep/60 p-5 hover:border-copper-500/40">
            <span className="mb-2 block font-mono text-xs text-copper-400">Related read</span>
            <span className="block font-semibold text-white group-hover:text-copper-300">{journey.read.title}</span>
            <span className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-slate-400">Read guide <ArrowRight className="size-3.5" aria-hidden="true" /></span>
          </Link>
          {journey.example ? (
            <a data-guide-next-step href={journey.example.href} className="group rounded-lg border border-white/10 bg-navy-deep/60 p-5 hover:border-copper-500/40">
              <span className="mb-2 block font-mono text-xs text-copper-400">Try the example</span>
              <span className="block font-semibold text-white group-hover:text-copper-300">{journey.example.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-slate-300">{journey.example.description}</span>
            </a>
          ) : journey.work ? (
            <a data-guide-next-step href={journey.work.link || journey.work.repo} className="group rounded-lg border border-white/10 bg-navy-deep/60 p-5 hover:border-copper-500/40">
              <span className="mb-2 block font-mono text-xs text-copper-400">Related project</span>
              <span className="block font-semibold text-white group-hover:text-copper-300">{journey.work.title}</span>
              <span className="mt-2 block text-sm text-slate-300">Read the setup, inspect the source and check its limits.</span>
            </a>
          ) : null}
        </div>
        {journey.example && journey.work && <p className="mt-4 text-sm text-slate-300">Source and setup: <a data-guide-next-step href={journey.work.link || journey.work.repo} className="text-copper-400 underline underline-offset-4">{journey.work.title}</a>.</p>}
        <p className="mt-6 text-sm leading-relaxed text-slate-400">
          More field notes in <a data-guide-next-step href={NEWSLETTER.href} className="text-copper-400 underline underline-offset-4">Fail-Closed Notes</a> on LinkedIn.
          {' '}For a question about applying this work, <Link data-guide-next-step to="/connect" className="text-slate-300 underline underline-offset-4 hover:text-copper-300">contact Dan</Link>.
        </p>
      </aside>
    );
  }
  const nextGuides = GUIDES.filter((g) => !(kind === 'guide' && g.slug === currentSlug)).slice(0, 2);
  const nextEssay = THOUGHTS.find((t) => !(kind === 'essay' && t.slug === currentSlug));
  const featuredWork = WORKS.find((w) => w.slug === (kind === 'guide' ? 'failclosed' : 'proctor')) ?? WORKS[0];

  return (
    <aside aria-label="Continue reading" className="mt-14 pt-10 border-t border-white/10">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Continue exploring</h2>
        <Link to="/works" className="font-mono text-xs text-copper-400 hover:text-copper-300">
          All tools &amp; projects
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nextGuides.slice(0, 1).map((g) => (
          <Link
            key={g.slug}
            to={`/guides/${g.slug}`}
            className="group flex flex-col p-5 rounded-lg border border-white/10 bg-navy-deep/60 hover:border-copper-500/40 transition-colors"
          >
            <span className="font-mono text-xs text-copper-400 mb-2">Guide · {g.category}</span>
            <span className="text-base font-semibold text-white group-hover:text-copper-300 transition-colors mb-2">
              {g.title}
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-mono text-slate-400 group-hover:text-copper-400">
              Read guide <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}

        {nextEssay && (
          <Link
            to={`/thoughts/${nextEssay.slug}`}
            className="group flex flex-col p-5 rounded-lg border border-white/10 bg-navy-deep/60 hover:border-copper-500/40 transition-colors"
          >
            <span className="font-mono text-xs text-copper-400 mb-2">Essay · {nextEssay.category}</span>
            <span className="text-base font-semibold text-white group-hover:text-copper-300 transition-colors mb-2">
              {nextEssay.title}
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-mono text-slate-400 group-hover:text-copper-400">
              Read essay <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </Link>
        )}

        {featuredWork && (
          <a
            href={featuredWork.link || featuredWork.repo}
            className="group flex flex-col p-5 rounded-lg border border-white/10 bg-navy-deep/60 hover:border-copper-500/40 transition-colors"
          >
            <span className="font-mono text-xs text-copper-400 mb-2">Tool · {featuredWork.category}</span>
            <span className="text-base font-semibold text-white group-hover:text-copper-300 transition-colors mb-2">
              {featuredWork.title}
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-mono text-slate-400 group-hover:text-copper-400">
              Inspect build <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </a>
        )}
      </div>
    </aside>
  );
};
