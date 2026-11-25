import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, FileText, BookOpen, Wrench, Layers, Compass } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { WORKS, THOUGHTS, GUIDES, DIAGRAMS } from '../constants';

interface PaletteItem {
  id: string;
  kind: 'Work' | 'Guide' | 'Essay' | 'Diagram' | 'Page';
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
  searchText: string;
}

const STATIC_PAGES: PaletteItem[] = [
  { id: 'page-home', kind: 'Page', title: 'Home', subtitle: 'Overview, selected work, speaking', href: '/', searchText: 'home overview selected work speaking' },
  { id: 'page-works', kind: 'Page', title: 'Works', subtitle: 'Open-source tools and applied agent projects', href: '/works', searchText: 'works open source tools projects' },
  { id: 'page-thoughts', kind: 'Page', title: 'Writing', subtitle: 'Essays and operating journal lanes', href: '/thoughts', searchText: 'writing thoughts essays journal' },
  { id: 'page-guides', kind: 'Page', title: 'Guides', subtitle: 'Long-form technical field guides', href: '/guides', searchText: 'guides tutorials field notes' },
  { id: 'page-proof', kind: 'Page', title: 'Proof', subtitle: 'Checkable claims, CI verification, downloads', href: '/proof', searchText: 'proof evidence architecture ci downloads' },
  { id: 'page-ecosystem', kind: 'Page', title: 'Ecosystem', subtitle: 'Cosmocrat OS, Orion Intelligence Agency, ventures', href: '/ecosystem', searchText: 'ecosystem cosmocrat orion ventures' },
  { id: 'page-diagrams', kind: 'Page', title: 'Diagrams', subtitle: 'Visual architecture explainers', href: '/diagrams', searchText: 'diagrams visual explainers' },
  { id: 'page-about', kind: 'Page', title: 'About', subtitle: 'Operating background and recognition', href: '/about', searchText: 'about bio background speaking' },
  { id: 'page-connect', kind: 'Page', title: 'Contact', subtitle: 'Direct email, LinkedIn, speaking, roles', href: '/connect', searchText: 'contact connect email linkedin speaking' },
];

const KIND_ICON = {
  Work: Wrench,
  Guide: BookOpen,
  Essay: FileText,
  Diagram: Layers,
  Page: Compass,
} as const;

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const allItems = useMemo<PaletteItem[]>(() => {
    const workItems: PaletteItem[] = WORKS.map((w) => ({
      id: `work-${w.slug}`,
      kind: 'Work',
      title: w.title,
      subtitle: `${w.category} · ${w.description.slice(0, 90)}`,
      href: w.link || w.repo,
      external: Boolean(w.link ? !w.link.includes('danmercede.com') : true),
      searchText: `${w.title} ${w.category} ${w.description}`.toLowerCase(),
    }));
    const guideItems: PaletteItem[] = GUIDES.map((g) => ({
      id: `guide-${g.slug}`,
      kind: 'Guide',
      title: g.title,
      subtitle: `${g.category} · ${g.date}`,
      href: `/guides/${g.slug}`,
      searchText: `${g.title} ${g.category} ${g.description} ${g.lead}`.toLowerCase(),
    }));
    const essayItems: PaletteItem[] = THOUGHTS.map((t) => ({
      id: `essay-${t.slug}`,
      kind: 'Essay',
      title: t.title,
      subtitle: `${t.category} · ${t.date}`,
      href: `/thoughts/${t.slug}`,
      searchText: `${t.title} ${t.category} ${t.preview}`.toLowerCase(),
    }));
    const diagramItems: PaletteItem[] = DIAGRAMS.map((d) => ({
      id: `diagram-${d.slug}`,
      kind: 'Diagram',
      title: d.title,
      subtitle: `Diagram · ${d.date}`,
      href: `/diagrams/${d.slug}`,
      searchText: `${d.title} ${d.caption}`.toLowerCase(),
    }));
    return [...STATIC_PAGES, ...guideItems.slice(0, 8), ...workItems, ...essayItems, ...guideItems.slice(8), ...diagramItems];
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 10);
    return allItems.filter((item) => item.searchText.includes(q)).slice(0, 14);
  }, [allItems, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const activate = (item: PaletteItem) => {
    onClose();
    let isMicrosite = false;
    try {
      const parsed = new URL(item.href, window.location.origin);
      isMicrosite = parsed.pathname.startsWith('/works/');
    } catch {
      isMicrosite = item.href.startsWith('/works/');
    }
    if (isMicrosite || item.external) {
      window.location.assign(item.href);
    } else {
      navigate(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && e.target instanceof HTMLInputElement && results[activeIndex]) {
      e.preventDefault();
      activate(results[activeIndex]);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/85 backdrop-blur-sm px-4 pt-16 sm:pt-24"
            role="dialog"
            aria-modal="true"
            aria-label="Search site"
            onClick={onClose}
            onKeyDown={handleKeyDown}
          >
            <motion.div
              initial={{ y: -8, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="meridian-plate-accent w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-navy-midnight/85">
                <img
                  src="/brand/dm-monogram-compact.svg"
                  alt=""
                  aria-hidden="true"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] shrink-0 opacity-85"
                />
                <Search className="w-4 h-4 text-copper-300 shrink-0" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Jump to a guide, essay, open-source tool, or page..."
                  aria-label="Search guides, essays, tools, and pages"
                  className="min-w-0 min-h-[44px] flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close search"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
                {results.length > 0 ? (
                  results.map((item, idx) => {
                    const Icon = KIND_ICON[item.kind];
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => activate(item)}
                        className={`w-full min-h-[52px] text-left px-4 py-3 flex items-center gap-3.5 transition-colors ${
                          isActive ? 'bg-copper-500/15' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="p-2 rounded-sm border border-white/10 bg-navy-midnight text-copper-300 shrink-0">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{item.title}</span>
                            <span className="font-mono text-xs text-copper-400 shrink-0">{item.kind}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                        </div>
                        <ArrowRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-copper-300' : 'text-slate-400'}`} aria-hidden="true" />
                      </button>
                    );
                  })
                ) : (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm text-slate-300">No matches for "{query.trim()}".</p>
                    <p className="text-xs text-slate-400 mt-1">Try searching for failclosed, proctor, receipts, schemas, or MCP.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 bg-navy-midnight/85 text-xs font-mono text-slate-400">
                <span>INDEX // {allItems.length} RECORDS</span>
                <span>Esc to close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
};

export default CommandPalette;
