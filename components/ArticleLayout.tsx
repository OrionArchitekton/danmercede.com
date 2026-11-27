import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ArticleHeading } from './Markdown';

function ArticleContents({ headings }: { headings: ArticleHeading[] }) {
  const [active, setActive] = useState(headings[0].id);
  const drawer = useRef<HTMLDetailsElement>(null);
  const rail = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = headings.map(({ id }) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const start = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 96;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top > start + 1) break;
        current = section;
      }
      setActive(current.id);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    const article = sections[0].closest('article');
    if (article) observer?.observe(article);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  useEffect(() => {
    const nav = rail.current;
    const link = nav?.querySelector<HTMLAnchorElement>('a[aria-current="location"]');
    if (!nav || !link || !nav.clientHeight) return;
    const rect = nav.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.bottom > rect.bottom) nav.scrollTop += item.bottom - rect.bottom;
    else if (item.top < rect.top) nav.scrollTop -= rect.top - item.top;
  }, [active]);

  const links = (
    <ol className="space-y-0.5 border-l border-white/15">
      {headings.map(({ id, label, level }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            aria-current={active === id ? 'location' : undefined}
            onClick={(event) => {
              if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && drawer.current) {
                drawer.current.open = false;
              }
            }}
            className={`-ml-px block border-l-2 py-1.5 pr-2 text-sm leading-snug hover:text-white ${level === 3 ? 'pl-6' : 'pl-3'} ${active === id ? 'border-copper-500 text-copper-300' : 'border-transparent text-slate-400'}`}
          >
            {label}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <aside aria-label="Article table of contents" className="mb-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:self-start">
      <details ref={drawer} className="group rounded-lg border border-white/15 bg-navy-deep lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
          On this page <ChevronDown size={16} aria-hidden="true" className="text-copper-400 group-open:rotate-180" />
        </summary>
        <nav aria-label="On this page (mobile)" className="max-h-[55vh] overflow-y-auto px-4 pb-3">{links}</nav>
      </details>
      <div className="hidden border-t border-copper-500/50 pt-4 lg:block">
        <p className="mb-3 font-semibold text-white">On this page</p>
        <nav ref={rail} aria-label="On this page" className="max-h-[calc(100dvh-11rem)] overflow-y-auto">{links}</nav>
      </div>
    </aside>
  );
}

export default function ArticleLayout({ headings, back, children }: {
  headings: ArticleHeading[];
  back: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!headings.length) return <div className="mx-auto max-w-3xl">{back}{children}</div>;

  return (
    <div className="mx-auto max-w-3xl lg:max-w-6xl">
      {back}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10 xl:gap-16">
        <ArticleContents headings={headings} />
        <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:[&_article>figure]:mx-0 lg:[&_article>figure]:w-full lg:[&_article>:not(figure)]:max-w-3xl">
          {children}
        </div>
      </div>
    </div>
  );
}
