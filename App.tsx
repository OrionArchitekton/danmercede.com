import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { normalizePath } from './hydration';
import { syncRouteJsonLd } from './routeJsonLd';
import { Menu, X, ExternalLink, Linkedin, Mail, Shield, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Download, Layers, ArrowRight, AlertTriangle, Search, Copy, Check, Terminal, BookOpen, Calendar, Maximize2, Clock } from 'lucide-react';
import ConstellationBackground from './components/ConstellationBackground';
import { parseMarkdown } from './components/Markdown';
import ArticleLayout from './components/ArticleLayout';
import FollowFieldNotes from './components/FollowFieldNotes';
import { KnowledgeGraphContext, KNOWLEDGE_GRAPH_SLUG } from './components/KnowledgeGraphContext';
import { PRIORITY_GUIDE_SLUGS } from './contentDiscovery';
import { GuideMetadata } from './components/GuideMetadata';
import GuideVideo from './components/GuideVideo';
import Analytics from './components/Analytics';
import GateSimulator from './components/GateSimulator';
import MeridianStage from './components/monograph/MeridianStage';
import MeridianArtifactStage from './components/monograph/MeridianArtifactStage';
import { EngineeringFigure, summarizeEvidenceTiers } from './components/EngineeringFigure';
import CommandPalette from './components/CommandPalette';
import EcosystemMap from './components/EcosystemMap';
import { DiagramPreview } from './components/DiagramPreview';
import { SpeakingResources } from './components/SpeakingResources';
import { estimateReadingMinutes, ReadingProgressBar, ShareStrip, RelatedContentShelf } from './components/ArticleEngagement';
import { trackEvent } from './analytics/gaConfig';
import { NAV_ITEMS, IDENTITY_LINE, UPCOMING_SPEAKING, BELIEFS, VENTURES, PRIMARY_VENTURES, READINESS_SCAN, THOUGHT_LANES, FOOTER_DATA, getImageMeta, RESOURCES, CASE_STUDIES, THOUGHTS, WORKS, worksByPriority, GUIDES, DIAGRAMS, featuredEssays, WORKS_HUB, WORKS_START_HERE, GUIDE_LENSES, guideMatchesLens, GuideLensId, PROOF_EVIDENCE, PRIVACY_SECTIONS, REFERENCE_ARCHITECTURE_NOTICE, ABOUT_BIO, CONTACT_INTENTS, CONTACT_EMAIL, SELECTED_WORK, PROCTOR_FINALIST, FOOTER_LINKS, START_HERE, proofGroupFor, contactHref, NEWSLETTER } from './constants';
import { selectThoughts, selectLatestThoughts, isLaneGroupedThoughtsView } from './thoughtsIndex';

import { Venture, Resource, CaseStudy, Thought, Work, Guide, Diagram } from './types';
import { WorkCard, linkTargetProps } from './components/WorkCard';
import {
  ROUTE_META,
  caseStudyMeta,
  thoughtMeta,
  guideMeta,
  diagramMeta,
  typeScopedMetaTags,
  resolveMeta,
  routeMetaFor,
  routeJsonLdText,
  type RouteMeta,
  SITE_ORIGIN,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_TITLE,
} from './seoMeta';

// --- Shared Components ---

const Section: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = "", id }) => (
  <section id={id} className={`max-w-[74rem] mx-auto px-5 sm:px-8 py-16 md:py-24 ${className}`}>
    {children}
  </section>
);

const Button: React.FC<{ children: React.ReactNode; variant?: 'primary' | 'outline'; onClick?: () => void; to?: string }> = ({ children, variant = 'primary', onClick, to }) => {
  const baseClasses = "inline-flex min-h-[44px] items-center justify-center px-6 py-2.5 text-sm font-semibold tracking-wider uppercase transition-colors duration-200 border border-copper-300 rounded-sm";
  const variants = {
    primary: "bg-copper-300 text-slate-950 hover:bg-copper-400",
    outline: "bg-transparent text-copper-300 hover:bg-copper-500/10"
  };

  if (to) {
    return (
      <Link to={to} className={`${baseClasses} ${variants[variant]}`}>
        {children}
      </Link>
    );
  }
  return <button type="button" onClick={onClick} className={`${baseClasses} ${variants[variant]}`}>{children}</button>;
};

const SectionHeader: React.FC<{ title: string; subtitle?: string; as?: 'h1' | 'h2'; folio?: string }> = ({ title, subtitle, as: Heading = 'h2', folio }) => (
  <div className="mb-12 border-l-2 border-copper-500 pl-5 sm:pl-6">
    <Heading className="text-3xl sm:text-4xl md:text-5xl font-medium text-white mb-2 tracking-tight leading-[1.06]">{title}</Heading>
    {subtitle && <p className="text-slate-300 font-mono text-xs sm:text-sm">{subtitle}</p>}
    {folio && <p className="folio-index text-copper-400 mt-1">{folio}</p>}
  </div>
);

// Headings lead. A category, status or date follows its title as quiet mono
// metadata in sentence case; no label sits above a heading. Navigation, buttons,
// chips and badges keep the tracked-capitals voice.
const META = "font-mono text-xs text-slate-400";
const META_ACCENT = "font-mono text-xs text-copper-400";

// --- Layout Components ---

const Navigation: React.FC<{ onOpenSearch: () => void }> = ({ onOpenSearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentPath = normalizePath(location.pathname);
  const isActive = (path: string) => currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`));

  useEffect(() => setIsOpen(false), [location.key]);

  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  const openSearch = () => {
    if (isOpen) closeMenu();
    onOpenSearch();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/10">
      <div
        aria-hidden="true"
        className="meridian-scroll-progress pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-copper-300"
      />
      <nav
        aria-label="Primary"
        className="w-full"
        onKeyDown={(event) => { if (isOpen && event.key === 'Escape') closeMenu(); }}
        onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
      >
        <div className="max-w-[74rem] mx-auto px-5 sm:px-8 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center" aria-label="Dan Mercede, home">
            <img src="/dan-mercede-lockup-dark.svg" alt="" width="144" height="36" className="h-9 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-7">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? (currentPath === item.path ? 'page' : 'location') : undefined}
                  className={`relative inline-flex min-h-[44px] items-center text-sm font-medium uppercase tracking-wider hover:text-copper-300 transition-colors ${
                    active ? 'text-copper-300' : 'text-slate-200'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute left-0 right-0 bottom-1.5 h-0.5 bg-copper-300 rounded-full" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex min-h-[44px] items-center gap-2 px-3.5 py-1.5 rounded-sm border border-white/15 bg-navy-deep/80 text-xs font-mono text-slate-200 hover:border-copper-500/55 hover:text-white transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-copper-300" aria-hidden="true" />
              <span>Search</span>
              <span className="sr-only"> site</span>
              <kbd aria-hidden="true" className="text-[11px] text-slate-300 border border-white/15 px-1.5 rounded-xs">Ctrl K</kbd>
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search site"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm border border-white/15 bg-navy-deep/70 text-slate-200 hover:text-copper-300"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm border border-white/15 bg-navy-deep/70 text-white hover:text-copper-300"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              aria-controls={isOpen ? 'mobile-menu' : undefined}
            >
              {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden absolute top-full inset-x-0 h-[calc(100dvh-5rem)]">
            <div aria-hidden="true" onClick={closeMenu} className="absolute inset-0 bg-slate-950/80" />
            <div id="mobile-menu" ref={menuRef} className="relative max-h-full overflow-y-auto overscroll-contain bg-navy-deep border-b border-copper-500/35 px-6 py-5 space-y-1">
              {NAV_ITEMS.map((item, idx) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? (currentPath === item.path ? 'page' : 'location') : undefined}
                    className={`flex min-h-[48px] items-center justify-between border-l-2 px-3 py-2 text-lg font-medium hover:text-copper-300 ${active ? 'border-copper-300 bg-copper-500/12 text-copper-300' : 'border-transparent text-slate-200'}`}
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">0{idx + 1}</span>
                  </Link>
                );
              })}
              <button type="button" onClick={openSearch} className="mt-4 flex min-h-[48px] w-full items-center gap-3 rounded-sm border border-white/20 bg-slate-950/80 px-4 py-3 text-left text-sm text-white hover:border-copper-300">
                <Search className="size-4 text-copper-300" aria-hidden="true" />
                Search site
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

const Footer = () => (
  <footer className="border-t border-white/10 bg-navy-deep/50 py-14 mt-20">
    <div className="max-w-[74rem] mx-auto px-5 sm:px-8 grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
      <div className="md:col-span-5">
        <div className="mb-3">
          <img
            src="/brand/dm-colophon-signature.svg"
            alt="Dan Mercede Meridian Colophon"
            width="280"
            height="48"
            className="h-10 w-auto"
            loading="eager"
            decoding="async"
          />
        </div>
        <p className="text-slate-300 text-xs font-mono leading-relaxed max-w-sm">{FOOTER_DATA.role}</p>
        <p className="mt-3 font-mono text-xs text-slate-400">Meridian Monograph // Midnight &amp; Copper Architecture</p>
      </div>

      <div className="md:col-span-7 flex flex-col items-start md:items-end gap-3 text-slate-300">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {FOOTER_LINKS.map((l) =>
            l.href.endsWith('.xml') || /^https?:\/\//.test(l.href) ? (
              <a key={l.href} href={l.href} {...linkTargetProps(l.href)} className="inline-flex min-h-[44px] items-center px-2 text-xs font-mono hover:text-copper-300 transition-colors">{l.label}</a>
            ) : (
              <Link key={l.href} to={l.href} className="inline-flex min-h-[44px] items-center px-2 text-xs font-mono hover:text-copper-300 transition-colors">{l.label}</Link>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 border-t border-white/10 w-full md:w-auto md:justify-end">
          <Link to="/legal" className="inline-flex min-h-[44px] items-center px-1.5 text-xs hover:text-copper-300 cursor-pointer transition-colors">Legal</Link>
          <Link to="/privacy" className="inline-flex min-h-[44px] items-center px-1.5 text-xs hover:text-copper-300 cursor-pointer transition-colors">Privacy</Link>
          <Link to="/imprint" className="inline-flex min-h-[44px] items-center px-1.5 text-xs hover:text-copper-300 cursor-pointer transition-colors">Imprint</Link>
        </div>
      </div>
    </div>
  </footer>
);

// --- Pages ---

const HOME_DESTINATIONS = {
  '#gate-simulator': '/proof#gate-simulator',
  '#visual-architecture': '/diagrams',
} as const;

const HOME_LINK = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-copper-400 hover:text-copper-300";

const HomePage = () => {
  usePageMeta();
  const { hash } = useLocation();
  const [proctor, ...otherWork] = SELECTED_WORK;
  const [deskGuide] = GUIDES;
  const [deskEssay] = selectLatestThoughts(THOUGHTS);

  useEffect(() => {
    if (hash === '#gate-simulator' || hash === '#visual-architecture') {
      window.location.replace(HOME_DESTINATIONS[hash]);
    }
  }, [hash]);

  return (
    <div className="mx-auto max-w-[74rem] px-5 pt-20 sm:px-8">
      {/* 00 // Flagship Asymmetric Monograph Frontispiece */}
      <section aria-labelledby="home-heading" className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6 sm:gap-8 lg:gap-12 pt-5 pb-8 sm:py-12 lg:py-16">
        <div className="lg:col-span-7 flex flex-col">
          <div>
            <h1 id="home-heading" className="text-[clamp(2.6rem,8vw,4.9rem)] font-medium leading-[0.98] tracking-[-0.03em] text-white">
              Dan Mercede
            </h1>
            <p className="folio-index text-copper-400 mt-3">00 // OPERATOR &amp; SYSTEMS BUILDER</p>
          </div>

          <p className="mt-5 max-w-[32ch] font-serif text-2xl sm:text-3xl lg:text-[2.35rem] leading-[1.16] text-slate-100">
            {IDENTITY_LINE}
          </p>
          <p id="operator-thesis" className="mt-4 max-w-[56ch] scroll-mt-24 text-base leading-relaxed text-slate-300">
            I ran a club with a <Link to="/about" className="underline decoration-copper-500/60 underline-offset-4 text-white hover:text-copper-300">$6M P&amp;L</Link>. Today I build deterministic gates and behavioral checks that tell a team when an AI workflow needs a human decision.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href="#selected-work"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-sm bg-copper-300 px-6 text-sm font-semibold text-slate-950 hover:bg-copper-400 transition-colors"
            >
              See selected work <ChevronDown className="size-4" aria-hidden="true" />
            </a>
            <Link
              to="/connect"
              className="inline-flex min-h-[48px] items-center rounded-sm border border-white/15 bg-navy-deep/70 px-5 text-sm font-medium text-slate-100 hover:border-copper-300/60 hover:text-copper-300 transition-colors"
            >
              Contact Dan
            </Link>
          </div>

          {/* Grounded Operating Ledger Strip */}
          <dl className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 pt-5">
            <div>
              <dt className="font-mono text-xs text-slate-400">Operating P&amp;L</dt>
              <dd className="mt-1 font-mono text-base font-semibold text-white tabular-nums">$6M / yr</dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-slate-400">Commercial Ops</dt>
              <dd className="mt-1 font-mono text-base font-semibold text-white tabular-nums">15 yrs</dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-slate-400">UiPath 2026</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-copper-300">Track 3 Finalist</dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-slate-400">Conference</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-copper-300">NODES · OpsWorld</dd>
            </div>
          </dl>
        </div>

        {/* Sovereign Vernier Frame with Blender Polyhedron Inset (unified responsive stage) */}
        <div className="lg:col-span-5 max-w-md w-full mx-auto lg:max-w-none">
          <MeridianStage>
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
                alt={getImageMeta('/dan-mercede-founder-headshot-hero.webp').alt}
                width={1200}
                height={1500}
                fetchPriority="high"
                decoding="async"
                className="aspect-[4/5] w-full object-cover object-[50%_18%] contrast-[1.04] saturate-[0.92] brightness-[0.96]"
              />
            </picture>
          </MeridianStage>
        </div>
      </section>

      {/* 01 // Selected Work Dossier */}
      <section id="selected-work" aria-labelledby="selected-work-heading" className="scroll-mt-24 border-y border-white/10 py-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="selected-work-heading" className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white">Selected work</h2>
          <Link to="/works" className={HOME_LINK}>All projects <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>

        <article className="meridian-plate-accent grid items-center gap-8 rounded-lg px-5 py-6 sm:px-8 sm:py-8 md:grid-cols-[3fr_2fr]">
          <div className="max-w-[54ch]">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-medium leading-tight tracking-tight text-white">{proctor.title}</h3>
            <p className={`${META} mt-1 mb-3`}>01 // {proctor.status}</p>
            <p className="text-slate-200 leading-relaxed">{proctor.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a href={proctor.href} className={HOME_LINK}>
                {proctor.action} <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <p className={`mt-2 ${META}`}>
              <a href={PROCTOR_FINALIST.href} {...linkTargetProps(PROCTOR_FINALIST.href)} className="inline-flex min-h-[44px] items-center underline decoration-white/25 underline-offset-4 hover:text-copper-300">
                {PROCTOR_FINALIST.label}
              </a>
            </p>
          </div>

          <div className="border-t border-white/15 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2 mb-3 text-xs font-mono text-slate-400">
              <span>QUICKSTART // VERIFIABLE RUN</span>
              <span className="text-copper-300 shrink-0">LOCAL</span>
            </div>
            <p className="font-mono text-lg text-white">$ pnpm demo</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">After setup, run the invoice example locally. It catches a regression and opens an approval step. No API key required.</p>
          </div>
        </article>

        <div className="divide-y divide-white/10 mt-4">
          {otherWork.map((work, idx) => (
            <article key={work.href} className="py-5 md:grid md:grid-cols-[minmax(13rem,1fr)_minmax(0,1.45fr)_auto] md:items-center md:gap-6">
              <div>
                <h3 className="text-2xl font-medium leading-tight tracking-tight text-white lg:text-[1.75rem]">{work.title}</h3>
                <p className={`${META} mt-0.5`}>0{idx + 2} // {work.status}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 md:mt-0 sm:text-base">{work.summary}</p>
              <a href={work.href} className={`mt-2 md:mt-0 ${HOME_LINK}`}>{work.action} <ArrowRight className="size-4" aria-hidden="true" /></a>
            </article>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2">
          <a id="gate-simulator" href={HOME_DESTINATIONS['#gate-simulator']} className={`scroll-mt-24 ${HOME_LINK}`}>Try the gate demo <ArrowRight className="size-4" aria-hidden="true" /></a>
          <a id="visual-architecture" href={HOME_DESTINATIONS['#visual-architecture']} className={`scroll-mt-24 ${HOME_LINK}`}>Architecture diagrams <ArrowRight className="size-4" aria-hidden="true" /></a>
        </div>
      </section>

      {/* 02 // Meridian 3D Control Plane Bench */}
      <div className="border-b border-white/10 py-9 sm:py-12">
        <MeridianArtifactStage sectionId="meridian-stage" />
      </div>

      {/* 03 // From the Desk Broadsheet */}
      <section aria-labelledby="desk-heading" className="border-b border-white/10 py-8 sm:py-12">
        <h2 id="desk-heading" className="mb-5 text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white">From the desk</h2>
        {[
          deskGuide && { kind: 'Field guide', href: `/guides/${deskGuide.slug}`, article: deskGuide },
          deskEssay && { kind: 'Essay', href: `/thoughts/${deskEssay.slug}`, article: deskEssay },
        ].map((entry) => entry && (
          <div key={entry.href} className="border-t border-white/10 py-4 sm:grid sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6">
            <p className={META_ACCENT}>{entry.kind}</p>
            <Link to={entry.href} className="inline-flex min-h-[44px] items-center font-serif text-2xl font-medium leading-tight text-white hover:text-copper-300">
              {entry.article.title}
            </Link>
            <p className={`hidden whitespace-nowrap tabular-nums sm:block ${META}`}>{estimateReadingMinutes(entry.article.body)} min read</p>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap gap-x-6">
          <Link to="/guides" className={HOME_LINK}>All guides <ArrowRight className="size-4" aria-hidden="true" /></Link>
          <Link to="/thoughts" className={HOME_LINK}>All essays <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>

      {/* 04 // Speaking & Scoped Implementation Split Ledger */}
      <div className="grid sm:grid-cols-2 sm:gap-x-8 py-6 sm:py-10">
        <section className="meridian-plate rounded-lg p-6">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">Speaking</h2>
          {UPCOMING_SPEAKING && <p className="mt-2 text-sm text-slate-300">Next workshop · {UPCOMING_SPEAKING.event} · {UPCOMING_SPEAKING.date}</p>}
          <a href="/connect#speaking" className={`mt-3 ${HOME_LINK}`}>Talk topics &amp; speaker kit <ArrowRight className="size-4" aria-hidden="true" /></a>
        </section>
        <section className="meridian-plate rounded-lg p-6 mt-5 sm:mt-0">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">Implementation</h2>
          <p className="mt-2 max-w-[44ch] text-sm text-slate-300">I work through Orion Intelligence Agency to put one workflow into practice.</p>
          <a href={READINESS_SCAN.href} {...linkTargetProps(READINESS_SCAN.href)} className={`mt-3 ${HOME_LINK}`}>
            Work with OIA <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
};

const OPERATING_MILESTONES = [
  {
    period: 'Operations & Field',
    role: 'General Manager, 24 Hour Fitness (Escondido) & Mosaic Sales Solutions',
    detail: 'General Manager at 24 Hour Fitness Escondido (>$3M/yr club) with $6M commercial P&L scope, staffing, KPI dashboards, and CRM automation after frontline representation for Apple through Mosaic.',
  },
  {
    period: 'Infrastructure & Systems',
    role: 'Principal Systems Architect, Cosmocrat OS',
    detail: 'Built governed multi-agent infrastructure: Neo4j context graphs, deterministic execution gates, and cryptographic audit trails.',
  },
  {
    period: 'Contract & Production',
    role: 'Contract Architect (April to July 2026) & Open-Source Author',
    detail: 'Designed production agent harnesses and shipped failclosed, Proctor, and the Orion execution-discipline tools.',
  },
  {
    period: 'External Validation',
    role: 'UiPath AgentHack Finalist · NODES 2026 · OpsWorld 2027',
    detail: 'Demonstrated runnable governed systems at independent industry venues and hands-on engineering workshops.',
  },
] as const;

const AboutPage = () => {
  usePageMeta();
  return (
  <div className="pt-20">
    <Section>
      <div className="meridian-plate-accent mb-12 grid overflow-hidden rounded-lg md:grid-cols-12">
        <div className="md:col-span-6 self-center p-6 sm:p-8 lg:p-10">
          <h1 className="mb-2 text-4xl font-medium tracking-tight text-white md:text-5xl">About Dan Mercede</h1>
          <p className="folio-index text-copper-400 mb-5">BIOGRAPHY // OPERATING HISTORY</p>
          <p className="max-w-[58ch] text-lg sm:text-xl leading-relaxed text-slate-200">{ABOUT_BIO.lead}</p>
        </div>
        <div className="md:col-span-6 relative bg-navy-midnight">
          <picture>
            <source
              type="image/avif"
              srcSet="/media/portraits/dan-mercede-founder-working-landscape-480w.avif 480w, /media/portraits/dan-mercede-founder-working-landscape-800w.avif 800w"
              sizes="(max-width: 768px) 100vw, 560px"
            />
            <source
              type="image/webp"
              srcSet="/media/portraits/dan-mercede-founder-working-landscape-480w.webp 480w, /media/portraits/dan-mercede-founder-working-landscape-800w.webp 800w"
              sizes="(max-width: 768px) 100vw, 560px"
            />
            <img
              src="/dan-mercede-founder-working-landscape.webp"
              alt="Dan Mercede at a table with his laptop"
              width={1080}
              height={864}
              decoding="async"
              fetchPriority="high"
              className="aspect-[5/4] h-full w-full object-cover object-[50%_22%] contrast-[1.04] saturate-[0.92] brightness-[0.96]"
            />
          </picture>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#020B29]/55 via-transparent to-[#020B29]/25"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7">
          <div className="prose prose-invert prose-lg text-slate-300 max-w-[60ch]">
            {ABOUT_BIO.sections.map((section, sectionIdx) => (
              <div key={section.heading} className="mb-10 border-b border-white/10 pb-8 last:border-b-0">
                <h2 className="text-2xl sm:text-3xl font-medium text-white mb-4 mt-0">{section.heading}</h2>
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx} className="mb-4 max-w-[65ch] leading-relaxed text-slate-300">{paragraph}</p>
                ))}
              </div>
            ))}

            <div className="mb-10">
              <h2 className="text-2xl sm:text-3xl font-medium text-white mb-4 mt-0">Recognition and speaking</h2>
              <ul className="space-y-2 list-none pl-0 not-prose">
                {ABOUT_BIO.recognition.map((item) => (
                  <li key={item.href} className="pl-0">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-start gap-2.5 py-2 text-copper-300 hover:text-copper-400 transition-colors"
                    >
                      <span className="leading-snug">{item.label}</span>
                      <ExternalLink className="w-4 h-4 mt-1 shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-white mb-6">What I Believe</h2>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {BELIEFS.map((belief, idx) => (
                <div key={idx} className="py-5 sm:grid sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4 items-baseline">
                  <span className="font-mono text-xs text-copper-400 tabular-nums mb-1 block">0{idx + 1}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1.5">
                      {belief.statement}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed pl-4 border-l border-copper-500/50">
                      {belief.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="meridian-plate rounded-lg p-6 not-prose">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-medium text-white mb-1">Operating timeline</h2>
                <p className="folio-index text-copper-400">CALIPER // CAREER ARC</p>
              </div>
              <img
                src="/brand/dm-seal-architectural.svg"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                loading="eager"
                decoding="async"
                className="h-8 w-8 shrink-0 opacity-85"
              />
            </div>
            <ol className="space-y-4 border-l border-copper-500/40 pl-5">
              {OPERATING_MILESTONES.map((item) => (
                <li key={item.period} className="relative rounded-sm border border-white/10 bg-navy-midnight/75 p-4">
                  <span className="absolute -left-[25px] top-5 h-2.5 w-2.5 rounded-full bg-copper-300 ring-4 ring-slate-950" aria-hidden="true" />
                  <span className="font-mono text-xs text-copper-400 block mb-1">{item.period}</span>
                  <span className="text-base font-semibold text-white block mb-1.5">{item.role}</span>
                  <p className="text-sm text-slate-300 leading-relaxed m-0">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </Section>
  </div>
  );
};

const EcosystemPage = () => {
  usePageMeta();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const primaryVentures = VENTURES.filter(v => PRIMARY_VENTURES.includes(v.name));
  const secondaryVentures = VENTURES.filter(v => !PRIMARY_VENTURES.includes(v.name));

  useEffect(() => {
    if (location.hash) {
      const slug = location.hash.replace('#', '');
      setExpandedSlug(slug);
      // Auto-expand secondary section if hash targets a secondary venture
      if (secondaryVentures.some(v => v.slug === slug)) {
        setShowSecondary(true);
      }
    } else {
      setExpandedSlug(null);
    }
  }, [location]);

  const toggleExpand = (slug: string) => {
    if (expandedSlug === slug) {
      navigate('/ecosystem', { replace: true });
    } else {
      navigate(`#${slug}`, { replace: true });
    }
  };

  // Keyboard activation (Enter/Space) for the role="button" expand/collapse cards.
  const handleToggleKey = (e: React.KeyboardEvent, slug: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(slug);
    }
  };

  const renderVentureDetail = (venture: Venture) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="col-span-1 md:col-span-2 bg-slate-950 border-y border-copper-500/30 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-copper-500"></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 p-8 md:p-12 items-start">
        <div className="lg:col-span-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            {venture.name}
            <span className="text-slate-400 font-light">·</span>
            <span className="text-slate-300 font-light">{venture.role}</span>
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Role in the Ecosystem</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.ecosystemRole}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Relationship to the System</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.systemRelationship}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Operating Constraints</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.operatingConstraints}</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5">
            <a
              href={venture.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-copper-500 font-bold uppercase tracking-wider text-sm hover:text-copper-400 transition-colors"
            >
              Visit {venture.name}
              <ExternalLink className="ml-2 w-4 h-4" />
            </a>
          </div>
        </div>
        <div className="lg:col-span-4 border-l border-white/5 pl-8 hidden lg:block">
          <div className="space-y-6">
            <div>
              <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Entity Status</span>
              <span className="text-white font-mono text-sm">{venture.status}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Canonical Ref</span>
              <span className="text-slate-400 font-mono text-xs break-all">
                danmercede.com/ecosystem#{venture.slug}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="pt-20">
      {/* Primary: Operator Stack */}
      <Section>
        <SectionHeader as="h1" title="Operator Stack" subtitle="Core Systems" />
        <p className="text-slate-300 mb-10 max-w-[62ch] -mt-10 leading-relaxed">
          The platform and the consulting arm. Cosmocrat is the Governed AI Operating System. Orion Intelligence Agency is SMB AI strategy consulting that builds and deploys with operators, not just advises.
        </p>

        <EcosystemMap selectedSlug={expandedSlug} onSelect={toggleExpand} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min">
          {primaryVentures.map((venture) => {
            const isCosmocrat = venture.name === 'Cosmocrat';
            const isExpanded = expandedSlug === venture.slug;

            return (
              <React.Fragment key={venture.slug}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(venture.slug)}
                  onKeyDown={(e) => handleToggleKey(e, venture.slug)}
                  aria-expanded={isExpanded}
                  className={`group relative border p-8 transition-all duration-300 cursor-pointer flex flex-col h-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-copper-500 ${isCosmocrat
                    ? 'border-copper-500/30 bg-copper-500/5'
                    : isExpanded
                      ? 'border-copper-500/50 bg-navy-deep'
                      : 'border-white/10 bg-navy-deep/70 hover:border-copper-500/30 hover:bg-navy-deep'
                    }`}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className={`p-3 rounded-md border flex items-center justify-center ${isCosmocrat
                      ? 'border-copper-500/20 bg-copper-500/10'
                      : 'border-white/10 bg-white/5'
                      }`}>
                      <img
                        src={venture.logo}
                        alt={venture.name}
                        width="120"
                        height="36"
                        className="h-9 w-auto object-contain opacity-100"
                      />
                    </div>
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-xs uppercase tracking-widest ${isCosmocrat
                      ? 'bg-copper-500/20 text-copper-300 font-bold border border-copper-500/30'
                      : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                      {venture.status}
                    </span>
                  </div>
                  <div className="grow">
                    <h2 className="text-2xl font-bold mb-1 text-white">
                      {venture.name}
                    </h2>
                    <p className={`${META_ACCENT} mb-4`}>
                      {venture.role}
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {venture.description}
                    </p>
                  </div>
                  <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-4">
                    <span className={`text-sm font-medium transition-colors ${isExpanded ? 'text-copper-500' : 'text-slate-400 group-hover:text-copper-500'}`}>
                      {isExpanded ? 'Close details' : 'View details'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-copper-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-copper-500 transition-colors" />
                    )}
                  </div>
                </div>

                {isExpanded && renderVentureDetail(venture)}
              </React.Fragment>
            );
          })}
        </div>
      </Section>

      {/* Readiness Scan CTA Band */}
      <div className="border-y border-copper-500/20 bg-navy-deep/75 py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="folio-index text-copper-400 mb-2">ONE WORKFLOW ENTRY</p>
          <a
            href={READINESS_SCAN.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-colors border border-copper-300 bg-copper-300 text-slate-950 hover:bg-copper-400 rounded-sm"
          >
            {READINESS_SCAN.cta}
          </a>
          <p className="text-slate-300 text-xs font-mono mt-4">
            {READINESS_SCAN.deliverables.join(' · ')}
          </p>
        </div>
      </div>

      {/* Secondary: Extended Ecosystem */}
      <Section>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowSecondary(!showSecondary)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowSecondary(!showSecondary); } }}
          aria-expanded={showSecondary}
          className="cursor-pointer flex items-center justify-between mb-8 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-copper-500/50 rounded-xs"
        >
          <div className="border-l-2 border-slate-700 pl-6">
            <h2 className="text-2xl font-bold text-slate-400 group-hover:text-slate-300 transition-colors tracking-tight">Extended Ecosystem</h2>
            <p className="text-slate-400 font-mono text-sm">Supporting ventures and vehicles</p>
          </div>
          {showSecondary ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
          )}
        </div>

        {showSecondary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min">
            {secondaryVentures.map((venture) => {
              const isExpanded = expandedSlug === venture.slug;
              const isLive = venture.status.includes('PRODUCTION') || venture.status.includes('EXECUTION');

              return (
                <React.Fragment key={venture.slug}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpand(venture.slug)}
                    onKeyDown={(e) => handleToggleKey(e, venture.slug)}
                    aria-expanded={isExpanded}
                    className={`group relative border p-6 transition-all duration-300 cursor-pointer flex flex-col h-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-copper-500 ${isExpanded
                      ? 'border-copper-500/50 bg-navy-deep'
                      : 'border-white/10 bg-navy-deep/60 hover:border-copper-500/30 hover:bg-navy-deep'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-2 rounded-md border border-white/10 bg-white/5 flex items-center justify-center">
                        <img
                          src={venture.logo}
                          alt={venture.name}
                          width="96"
                          height="28"
                          className="h-7 w-auto object-contain opacity-75 group-hover:opacity-95 transition-all"
                        />
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-1 rounded-xs uppercase tracking-widest ${isLive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {venture.status}
                      </span>
                    </div>
                    <div className="grow">
                      <h3 className="text-xl font-bold mb-1 text-slate-300 group-hover:text-white transition-colors">{venture.name}</h3>
                      <p className={`${META} mb-3`}>{venture.role}</p>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{venture.description}</p>
                    </div>
                    <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-3">
                      <span className={`text-sm font-medium transition-colors ${isExpanded ? 'text-copper-500' : 'text-slate-400 group-hover:text-slate-300'}`}>
                        {isExpanded ? 'Close' : 'Details'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-copper-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </div>

                  {isExpanded && renderVentureDetail(venture)}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </Section>

      <div className="border-t border-white/5 bg-navy-deep/60 py-16 text-center">
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto px-6">
          Each entity operates independently under shared ownership architecture. Cosmocrat is the platform. OIA is the SMB consulting and delivery arm for one-workflow ownership.
        </p>
      </div>
    </div>
  );
};

// --- Proof Page (Enforcement Artifacts) ---
const LAYER_NAMES: Record<number, string> = {
  1: 'Authority Gate',
  2: 'Immutable Receipts',
  3: 'Drift Guard',
  4: 'Gated Substrate',
};

const LAYER_INVARIANTS: Record<number, string> = {
  1: 'Execution must depend on authority.',
  2: 'Mutation must depend on attestation.',
  3: 'Behavior must be constrained across time.',
  4: 'Capability must be removed, not restricted.',
};

const ReadinessScanCTA = () => (
  <div className="meridian-plate-accent rounded-lg p-6 sm:p-8 mt-10">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div>
        <p className="text-white text-lg font-semibold mb-1">Start with one workflow and clear ownership.</p>
        <p className="text-sm text-slate-300">Workflow readiness map. Failure-mode heatmap. Ownership and handoff plan. 30/60/90 rollout roadmap.</p>
      </div>
      <a
        href={READINESS_SCAN.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 bg-copper-300 hover:bg-copper-400 text-slate-950 text-sm font-semibold rounded-sm transition-colors whitespace-nowrap"
      >
        {READINESS_SCAN.cta}
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </a>
    </div>
  </div>
);

const RunnableProofCallout = () => (
  <div id="runnable-proof" className="mb-14">
    <div className="meridian-plate-accent rounded-lg p-6 sm:p-8">
      <h2 className="text-2xl md:text-3xl font-medium text-white mb-1.5">
        failclosed: the Authority Gate, made runnable
      </h2>
      <p className="folio-index text-copper-400 mb-4">RUNNABLE PROOF // L1 ADMISSION CONTROL</p>
      <p className="text-slate-200 leading-relaxed max-w-[62ch] mb-4">
        failclosed applies the Authority Gate to the merge boundary. It runs an LLM reviewer, distrusts the verdict, and refuses to admit unparseable, schema-invalid, or self-contradictory output.
      </p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-300 text-sm font-mono mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono uppercase tracking-wider bg-copper-500/15 text-copper-300 border border-copper-500/30">
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          L1: Authority Gate
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true"></span>
          Public. Runnable in two minutes. Receipt-backed.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href="https://github.com/OrionArchitekton/failclosed"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 bg-copper-300 hover:bg-copper-400 text-slate-950 text-sm font-semibold rounded-sm transition-colors"
        >
          View on GitHub
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </a>
        <a href="#gate-simulator" className="inline-flex min-h-[44px] items-center gap-2 px-2 text-sm font-semibold text-copper-300 hover:text-copper-400">
          Try the gate demo <ArrowRight className="size-4" aria-hidden="true" />
        </a>
        <Link
          to="/thoughts"
          className="inline-flex min-h-[44px] items-center gap-2 px-2 text-sm text-slate-200 hover:text-copper-300 font-mono transition-colors"
        >
          Read the doctrine
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </div>
);

const EVIDENCE_TIER_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  independent: CheckCircle2,
  reproducible: Shield,
  'not-claimed': AlertTriangle,
};

const EvidenceSection = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyCommand = (key: string, cmd: string) => {
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    }).catch(() => {});
  };

  return (
    <div id="evidence" className="mb-16 scroll-mt-32">
      <div className="border-l-2 border-copper-500 pl-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Checkable Claims</h2>
        <p className="text-sm text-slate-400">
          <span className="text-copper-400">Evidence.</span> Every checkable claim below carries the command or source that confirms it. The limits are labelled as limits.
        </p>
      </div>

      <EngineeringFigure
        title="Evidence Ledger Coverage"
        subtitle="Computed directly from committed PROOF_EVIDENCE claims"
        caption="Breakdown of checkable commands, public source URLs, and explicitly stated limitations across the proof surface."
        data={summarizeEvidenceTiers(PROOF_EVIDENCE)}
      />

      <div className="space-y-8">
        {PROOF_EVIDENCE.map((tier) => {
          const Icon = EVIDENCE_TIER_ICON[tier.id] ?? CheckCircle2;
          const isLimits = tier.id === 'not-claimed';
          return (
            <div
              key={tier.id}
              className={`border-t pt-6 ${
                isLimits
                  ? 'border-white/15'
                  : 'border-copper-500/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${isLimits ? 'text-slate-400' : 'text-copper-400'}`} />
                <h3 className="text-lg font-semibold text-white">{tier.title}</h3>
              </div>
              <p className="text-sm text-slate-300 mb-5 max-w-[62ch]">{tier.note}</p>

              <ul className="space-y-4">
                {tier.claims.map((c, i) => {
                  const key = `${tier.id}-${i}`;
                  const isCopied = copiedKey === key;
                  return (
                    <li key={i} className="border-l border-white/15 pl-4">
                      <p className="text-slate-200 text-sm leading-relaxed mb-2 max-w-[54ch]">{c.claim}</p>
                      {c.kind === 'check' ? (
                        <div className="flex flex-wrap items-center gap-2.5">
                          <code className="text-xs font-mono text-slate-300 bg-slate-950/75 border border-white/10 px-3 py-1.5 rounded-xs min-w-0 max-w-full whitespace-pre-wrap break-words">
                            {c.verify}
                          </code>
                          {c.verify && (
                            <button
                              type="button"
                              onClick={() => handleCopyCommand(key, c.verify)}
                              aria-label={`Copy command: ${c.claim.slice(0, 60)}`}
                              className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-xs border border-white/15 bg-slate-950/70 text-xs font-mono text-slate-300 hover:border-copper-500/50 hover:text-white transition-colors"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>
                          )}
                          {(c.sources ?? []).map((src, si) => {
                            const sourceLabel = (c.sources ?? []).length > 1 ? `source ${si + 1}` : 'check it';
                            return (
                              <a
                                key={si}
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${sourceLabel}: ${c.claim}`}
                                className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-mono text-copper-300 hover:text-copper-400 transition-colors"
                              >
                                {sourceLabel}
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                          Stated limitation
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// A plain download: says what the file is, never dresses it as an enforcement
// artifact (2026-09-29 site audit).
const DownloadCard = ({ resource, className = '' }: { resource: Resource; className?: string }) => (
  <div className={`meridian-plate rounded-lg p-6 hover:border-copper-500/45 transition-colors group flex flex-col ${className}`}>
    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-copper-300 transition-colors">{resource.title}</h3>
    <span className={`${META_ACCENT} mb-3`}>
      {resource.downloadLabel ?? resource.title} · {resource.fileType.toUpperCase()}
    </span>
    <p className="text-sm text-slate-300 mb-5 leading-relaxed grow">{resource.description}</p>
    <a
      href={resource.filePath}
      download={resource.fileName}
      className="inline-flex min-h-[44px] items-center gap-2 text-sm text-copper-300 hover:text-copper-400 font-mono transition-colors"
    >
      <Download className="w-4 h-4" aria-hidden="true" />
      Download
    </a>
  </div>
);

const LAYER_JUMP_LINKS = [
  { id: 'evidence-first', label: 'Evidence' },
  { id: 'approach', label: 'Approach' },
  // id stays 'production' so existing #production deep links keep resolving.
  { id: 'production', label: 'Reference' },
  { id: 'commercial', label: 'Commercial and speaking' },
] as const;

const LayerJumpBar = () => {
  const [active, setActive] = React.useState('');

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    LAYER_JUMP_LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-20 z-40 bg-slate-950/92 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[74rem] mx-auto px-5 sm:px-8">
        <nav className="flex flex-nowrap overflow-x-auto items-center gap-1.5 sm:gap-2 py-1.5 pr-6 [mask-image:linear-gradient(to_right,black_88%,transparent)] sm:pr-0 sm:[mask-image:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Layer navigation">
          {LAYER_JUMP_LINKS.map(({ id, label }, idx) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={e => {
                e.preventDefault();
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
              }}
              className={`whitespace-nowrap inline-flex min-h-[44px] items-center px-3.5 py-2 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors ${
                active === id
                  ? 'bg-copper-500/15 text-copper-300 border border-copper-500/40'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <span className="text-copper-400 mr-1.5 tabular-nums">0{idx + 1}</span>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
};

const DiagramDownloads = ({ basePath, name }: { basePath: string; name: string }) => (
  <div className="flex flex-wrap items-center gap-4 mt-4">
    <a href={`${basePath}.svg`} download className="inline-flex min-h-[44px] items-center gap-2 text-sm font-mono text-copper-300 hover:text-copper-400 transition-colors">
      <Download className="w-4 h-4" aria-hidden="true" /> {name} (SVG)
    </a>
    <a href={`${basePath}.png`} download className="inline-flex min-h-[44px] items-center gap-2 text-sm font-mono text-slate-300 hover:text-white transition-colors">
      <Download className="w-4 h-4" aria-hidden="true" /> {name} (PNG)
    </a>
  </div>
);

const ensureSingleHeadTag = <T extends Element>(selector: string, create: () => T): T => {
  const existing = Array.from(document.head.querySelectorAll<T>(selector));
  const primary = existing[0] ?? create();

  for (let i = 1; i < existing.length; i += 1) {
    existing[i].remove();
  }

  if (!primary.isConnected) {
    document.head.appendChild(primary);
  }

  return primary;
};

const upsertMetaByName = (name: string, content: string) => {
  const tag = ensureSingleHeadTag(`meta[name="${name}"]`, () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    return meta;
  });
  tag.setAttribute("content", content);
};

const upsertMetaByProperty = (property: string, content: string) => {
  const tag = ensureSingleHeadTag(`meta[property="${property}"]`, () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", property);
    return meta;
  });
  tag.setAttribute("content", content);
};

// Remove a meta tag outright. Deliberately NOT built on ensureSingleHeadTag,
// which creates-if-missing (the opposite of what removal needs). Required
// because og:type-scoped properties must be stripped, not merely overwritten,
// when a client-side navigation changes the route's type: a guide -> homepage
// nav that only rewrote og:type would strand the guide's article:* tags.
// querySelectorAll returns a static NodeList, so removing during iteration is safe.
const removeMetaByProperty = (property: string) => {
  document.head
    .querySelectorAll(`meta[property="${property}"]`)
    .forEach((tag) => tag.remove());
};

const removeCanonical = () => {
  document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
};

const upsertCanonical = (href: string) => {
  const tag = ensureSingleHeadTag(`link[rel="canonical"]`, () => {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    return link;
  });
  tag.setAttribute("href", href);
};

// Per-route head meta. Static routes resolve from ROUTE_META (the single source
// shared with the build-time prerender injector); dynamic routes (case studies)
// pass an explicit override. og:type/site_name/image and the rendered tag set
// are kept consistent with seoMeta.renderSeoBlock so the runtime head and the
// crawler-facing static head agree.
type PageMetaOverride = Partial<
  Pick<RouteMeta, 'title' | 'description' | 'ogImage' | 'ogImageAlt' | 'ogType' | 'datePublished' | 'dateModified'>
>;

const usePageMeta = (override?: PageMetaOverride, opts?: { noindex?: boolean }) => {
  const { pathname } = useLocation();
  const noindex = opts?.noindex ?? false;
  const overrideTitle = override?.title;
  const overrideDescription = override?.description;
  const overrideOgImage = override?.ogImage;
  const overrideOgImageAlt = override?.ogImageAlt;
  const overrideOgType = override?.ogType;
  const overrideDatePublished = override?.datePublished;
  const overrideDateModified = override?.dateModified;

  useEffect(() => {
    // Normalize trailing slashes (except root) so /about and /about/ resolve the
    // same route meta and produce a stable canonical that matches the static head.
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    const base: Partial<RouteMeta> = ROUTE_META[normalizedPath] ?? {};
    const title = overrideTitle ?? base.title ?? DEFAULT_TITLE;
    const description = overrideDescription ?? base.description ?? DEFAULT_META_DESCRIPTION;
    const ogImagePath = overrideOgImage ?? base.ogImage ?? DEFAULT_OG_IMAGE_PATH;
    // Mirrors seoMeta.renderSeoBlock: article-shaped routes (guides) declare
    // og:type=article, everything else stays profile. Kept in lockstep so the
    // hydrated head does not drift from the crawler-facing static head.
    const ogType = overrideOgType ?? base.ogType ?? "profile";
    const datePublished = overrideDatePublished ?? base.datePublished;
    const dateModified = overrideDateModified ?? base.dateModified;
    const imageMeta = resolveMeta({ title, description, ogImage: ogImagePath, ogImageAlt: overrideOgImageAlt ?? base.ogImageAlt });
    const canonicalUrl = new URL(normalizedPath || "/", SITE_ORIGIN).toString();
    const ogImageUrl = new URL(ogImagePath, SITE_ORIGIN).toString();

    document.title = title;
    upsertMetaByName("description", description);
    // A noindex page (404, unknown detail slug) must not claim a canonical URL:
    // the 404 document answers arbitrary paths. Drop both instead of writing them.
    if (noindex) {
      removeCanonical();
      removeMetaByProperty("og:url");
    } else {
      upsertCanonical(canonicalUrl);
      upsertMetaByProperty("og:url", canonicalUrl);
    }

    upsertMetaByProperty("og:type", ogType);
    upsertMetaByProperty("og:site_name", "Dan Mercede");
    upsertMetaByProperty("og:title", title);
    upsertMetaByProperty("og:description", description);
    upsertMetaByProperty("og:image", ogImageUrl);
    upsertMetaByProperty("og:image:alt", imageMeta.ogImageAlt);
    upsertMetaByProperty("og:image:type", imageMeta.ogImageType);
    if (imageMeta.ogImageWidth && imageMeta.ogImageHeight) {
      upsertMetaByProperty("og:image:width", String(imageMeta.ogImageWidth));
      upsertMetaByProperty("og:image:height", String(imageMeta.ogImageHeight));
    } else {
      removeMetaByProperty("og:image:width");
      removeMetaByProperty("og:image:height");
    }

    // Type-scoped properties, from the SAME helper the static renderer uses, so
    // the hydrated head and the served head cannot disagree. Remove before add:
    // the sets are disjoint today, but this order stays correct if they overlap.
    const { add: typeScopedAdd, remove: typeScopedRemove } = typeScopedMetaTags({
      ogType,
      datePublished,
      dateModified,
    });
    typeScopedRemove.forEach(removeMetaByProperty);
    typeScopedAdd.forEach(([prop, content]) => upsertMetaByProperty(prop, content));

    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:site", "@danmercede");
    upsertMetaByName("twitter:creator", "@danmercede");
    upsertMetaByName("twitter:title", title);
    upsertMetaByName("twitter:description", description);
    upsertMetaByName("twitter:image", ogImageUrl);
    upsertMetaByName("twitter:image:alt", imageMeta.ogImageAlt);

    // Robots: indexable by default; the catch-all 404 opts into noindex so
    // unknown paths are not indexed as thin homepage duplicates (soft-404).
    upsertMetaByName(
      "robots",
      noindex ? "noindex, follow" : "index, follow, max-image-preview:large",
    );

    // Route JSON-LD: the build bakes each page's graph into <head>, so after an
    // in-app navigation the head still describes the entry page. Swap in the
    // current route's graph, resolved the way the build resolves it (none for
    // a noindex page).
    const routeMeta = noindex ? null : routeMetaFor(normalizedPath);
    syncRouteJsonLd(document.head, routeMeta ? routeJsonLdText(normalizedPath, routeMeta) : null);
  }, [
    pathname,
    overrideTitle,
    overrideDescription,
    overrideOgImage,
    overrideOgImageAlt,
    overrideOgType,
    overrideDatePublished,
    overrideDateModified,
    noindex,
  ]);
};

const ResourcesPage = () => {
  usePageMeta();

  return (
    <div className="pt-20">
      <LayerJumpBar />
      <Section>
        <SectionHeader as="h1" title="Proof" subtitle="Evidence, approach, and resources" />
        <p className="text-slate-300 text-lg max-w-[62ch] mb-12">
          Three kinds of material live here, each labeled for what it is: evidence you can check, explanations of how the systems are built, and reference and commercial documents.
        </p>

        {/* Evidence first: runnable proof and checkable claims */}
        <div id="evidence-first">
          <RunnableProofCallout />
          <EvidenceSection />
        </div>

        {/* Approach: how the systems are built (design, not measured outcomes) */}
        <div id="approach" className="mb-4">
          {/* Old layer deep links (#authority, #receipts, #drift, #substrate) land here. */}
          <span id="authority" /><span id="receipts" /><span id="drift" /><span id="substrate" />
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">How the systems are built</h2>
            <p className="text-sm text-slate-400">
              <span className="text-copper-400">Approach.</span> These diagrams are conceptual. They explain the design and are not measured outcomes. For the platform concept, see{' '}
              <a href="https://www.cosmocrat.ai/platform" {...linkTargetProps('https://www.cosmocrat.ai/platform')} className="text-copper-400 hover:text-copper-300 underline underline-offset-4">Cosmocrat OS: Platform</a>.
            </p>
          </div>
          <section id="gate-simulator" aria-labelledby="gate-simulator-heading" className="mb-14 scroll-mt-32">
            <h3 id="gate-simulator-heading" className="mb-2 text-2xl font-medium text-white">See fail-closed execution in action</h3>
            <p className="mb-5 text-sm text-slate-300">Interactive example. Compare advisory and gated decisions and inspect the simulated receipt.</p>
            <GateSimulator />
            <p className="mt-5 text-sm text-slate-300">
              Run the real engine locally:{' '}
              <Link to="/guides/regression-test-ai-agent-prompt-model-change" className="inline py-2 text-copper-300 underline underline-offset-4 hover:text-copper-400">
                Regression-test an agent after a prompt or model change
              </Link>.
            </p>
          </section>
        </div>

        {/* Signature Diagram, Runtime Execution Control Plane Architecture */}
        <div id="control-plane" className="mb-14">
          <div className="w-full rounded-lg border border-copper-500/25 bg-[#0B1533] p-3 sm:p-4 ring-1 ring-inset ring-copper-300/15 overflow-hidden mb-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <span>Plate I // Control Plane</span>
              <span>SVG Schematic</span>
            </div>
            <img
              src="/assets/runtime-governance/diagrams/control-plane-architecture/runtime-governance-control-plane-architecture-v1.svg"
              alt="Runtime Execution Control Plane Architecture, a conceptual diagram: Authority Gate, Immutable Receipts, Drift Guard, Gated Substrate"
              width="2784"
              height="1536"
              className="w-full h-auto rounded-xs brightness-[0.94] contrast-[1.03]"
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="max-w-[62ch]">
            <p className="text-base text-slate-300 leading-relaxed">
              The design places governance at four boundaries. Authority. Attestation. Behavioral Constraint. Physical Isolation.
            </p>
          </div>
          <div className="mt-8 border-l-2 border-copper-500/40 pl-6 max-w-3xl">
            <p className="text-lg text-white font-semibold leading-relaxed tracking-tight">
              Evaluated before mutation.<br />
              Ambiguity defaults to halt.<br />
              No receipt, no commit.
            </p>
          </div>
          <DiagramDownloads
            basePath="/assets/runtime-governance/diagrams/control-plane-architecture/runtime-governance-control-plane-architecture-v1"
            name="Control Plane Architecture"
          />
        </div>

        {/* Diagram, Gated Execution Pipeline (between L1 and L2) */}
        <div id="gate-cascade" className="mb-16">
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Gated Execution Pipeline</h2>
            <p className="text-sm text-slate-400"><span className="text-copper-400">Conceptual.</span> PLAN &rarr; EXECUTE &rarr; REVIEW &rarr; APPROVE: the design checks each boundary.</p>
          </div>
          <p className="text-base text-slate-300 mb-6">In this design, each state mutation passes three gates.</p>
          <div className="w-full rounded-lg border border-copper-500/25 bg-[#0B1533] p-3 sm:p-4 ring-1 ring-inset ring-copper-300/15 overflow-hidden mb-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <span>Plate II // Execution Pipeline</span>
              <span>SVG Schematic</span>
            </div>
            <img
              src="/assets/runtime-governance/diagrams/gated-execution-pipeline/runtime-governance-gated-execution-pipeline-v1.svg"
              alt="Gated Execution Pipeline, a conceptual diagram: PLAN, EXECUTE, REVIEW, APPROVE with enforcement points at each boundary"
              width="2752"
              height="1536"
              className="w-full h-auto rounded-xs brightness-[0.94] contrast-[1.03]"
              loading="eager"
              decoding="async"
            />
          </div>
          <p className="text-sm font-mono text-slate-400 mb-4 tracking-wide">
            Gate 1: Authority &rarr; Gate 2: Attestation &rarr; Gate 3: Behavioral Constraint.
          </p>
          <DiagramDownloads
            basePath="/assets/runtime-governance/diagrams/gated-execution-pipeline/runtime-governance-gated-execution-pipeline-v1"
            name="Pipeline Diagram"
          />
        </div>

        {/* Diagram, conceptual economics framework (above Case Studies) */}
        <div id="economics" className="mb-16">
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">How Governance Could Change the Economics of Risk</h2>
            <p className="text-sm text-slate-400"><span className="text-copper-400">Economics (conceptual).</span> Cost per successful task. Escalation rate. Cycle-time compression. Audit defensibility.</p>
          </div>
          <p className="text-base text-slate-300 mb-6">The framework describes how governance could turn operational risk into predictable unit economics.</p>
          <div className="w-full rounded-lg border border-copper-500/25 bg-[#0B1533] p-3 sm:p-4 ring-1 ring-inset ring-copper-300/15 overflow-hidden mb-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <span>Plate III // Unit Economics</span>
              <span>SVG Schematic</span>
            </div>
            <img
              src="/assets/runtime-governance/diagrams/governance-economics-scorecard/runtime-governance-governance-economics-scorecard-v1.svg"
              alt="Conceptual economics framework: cost per successful task, escalation rate reduction, cycle-time compression, audit defensibility metrics"
              width="2752"
              height="1536"
              className="w-full h-auto rounded-xs brightness-[0.94] contrast-[1.03]"
              loading="eager"
              decoding="async"
            />
          </div>
          <DiagramDownloads
            basePath="/assets/runtime-governance/diagrams/governance-economics-scorecard/runtime-governance-governance-economics-scorecard-v1"
            name="Economics Scorecard"
          />
        </div>

        {/* Reference Enforcement Architectures, Case Studies */}
        {CASE_STUDIES.length > 0 && (
          <div id="production" className="mb-16">
            <div className="border-l-2 border-copper-500 pl-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Reference Enforcement Architectures</h2>
              <p className="text-sm text-slate-400">Reference enforcement architectures by industry and regulatory surface. Illustrative patterns, not measured client outcomes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CASE_STUDIES.map((study, i) => (
                <Link
                  key={i}
                  to={`/case-studies/${study.slug}`}
                  className="meridian-plate rounded-lg p-6 hover:border-copper-500/45 transition-all group block"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {study.enforcementLayers.map(l => (
                      <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono bg-copper-500/10 text-copper-400 border border-copper-500/20">
                        L{l}
                      </span>
                    ))}
                    <span className="text-xs font-mono text-slate-400 ml-auto">{study.industry}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-copper-400 transition-colors">
                    {study.title}
                  </h3>
                  {study.metrics && study.metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {study.metrics.map((m, mi) => (
                        <div key={mi} className="text-center p-3 rounded-sm bg-navy-midnight/80 border border-copper-500/25">
                          <span className="text-xl font-bold text-copper-400 block tabular-nums">{m.value}</span>
                          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">{study.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-copper-500 group-hover:text-copper-400 font-mono transition-colors">
                    View Enforcement Detail <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {(() => {
                const items = RESOURCES.filter((r) => proofGroupFor(r) === 'resources');
                return items.map((resource, idx) => (
                  <DownloadCard
                    key={resource.fileName}
                    resource={resource}
                    className={items.length % 2 === 1 && idx === items.length - 1 ? 'md:col-span-2' : ''}
                  />
                ));
              })()}
            </div>
          </div>
        )}

        {/* Commercial and speaking: the speaker one-sheet and the route to Contact, kept apart from evidence */}
        <div id="commercial" className="mb-16">
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Working together</h2>
            <p className="text-sm text-slate-400"><span className="text-copper-400">Commercial and speaking.</span> The speaker one-sheet describes talks, not results. For hiring, collaboration, or implementation work, use the <Link to="/connect" className="text-copper-400 underline underline-offset-4 hover:text-copper-300">Contact page</Link>.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RESOURCES.filter((r) => proofGroupFor(r) === 'commercial').map((resource) => (
              <DownloadCard key={resource.fileName} resource={resource} />
            ))}
          </div>
          <ReadinessScanCTA />
        </div>
        <FollowFieldNotes />
      </Section>
    </div>
  );
};

// --- Case Study Page ---
const CaseStudyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const study = CASE_STUDIES.find(cs => cs.slug === slug);
  usePageMeta(caseStudyMeta(slug), { noindex: !study });

  if (!study) {
    return (
      <div className="pt-20 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Case Study Not Found</h2>
          <Link to="/proof" className="text-copper-500 hover:text-copper-400 font-mono text-sm">
            ← Back to Proof
          </Link>
        </div>
      </div>
    );
  }

  const work = WORKS.find(item => item.slug === study.relatedWorkSlug);
  const diagram = DIAGRAMS.find(item => item.slug === study.relatedDiagramSlug);

  return (
    <div className="pt-20">
      <Section>
        <Link to="/proof" className="inline-flex items-center gap-1 font-mono text-sm text-copper-400 hover:text-copper-300">
          ← Proof
        </Link>

        <article className="mt-6">
          <div className="meridian-plate-accent grid overflow-hidden rounded-lg lg:grid-cols-2">
            <div className="p-6 md:p-9">
              <h1 className="max-w-xl text-3xl font-medium leading-tight text-white md:text-5xl">{study.title}</h1>
              <p className="folio-index text-copper-400 mt-2">REFERENCE ARCHITECTURE</p>
              <p className="mt-4 font-mono text-xs leading-relaxed text-copper-300">{REFERENCE_ARCHITECTURE_NOTICE}</p>
              <p className="mt-5 max-w-2xl leading-relaxed text-slate-300">{study.description}</p>
              <a href={study.filePath} download={study.fileName}
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-copper-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-copper-400">
                <Download size={16} aria-hidden="true" />
                Download reference architecture (DOCX)
              </a>
            </div>
            {diagram && (
              <Link to={`/diagrams/${diagram.slug}`} className="group flex flex-col justify-center border-t border-white/10 bg-navy-midnight p-5 hover:bg-navy-deep lg:border-t-0 lg:border-l lg:p-8">
                <img src={diagram.src} alt={diagram.alt} width="1200" height="675" className="aspect-video w-full rounded-sm object-contain" />
                <span className="mt-4 inline-flex min-h-[44px] items-center justify-between gap-3 text-sm font-medium text-copper-300 group-hover:text-copper-400">
                  View diagram · {diagram.title} <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-white/10 bg-navy-deep/65 p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white">Enforcement layers</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {study.layerNames.map((name, i) => (
                  <li key={name} className="rounded-sm border border-copper-500/25 px-3 py-1.5 text-sm text-slate-200">
                    <span className="mr-2 font-mono text-xs text-copper-400">L{study.enforcementLayers[i]}</span>{name}
                  </li>
                ))}
              </ul>
              <h3 className="mt-6 border-t border-white/10 pt-5 text-lg font-semibold text-white">Enforcement points</h3>
              <ul className="mt-3 space-y-3">
                {study.enforcementPoints.map(point => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-slate-300">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-copper-400" aria-hidden="true" /> {point}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-white/10 bg-navy-deep/65 p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white">Commercial mapping</h2>
              <ul className="mt-4 divide-y divide-white/10">
                {study.commercialMapping.map(item => (
                  <li key={item} className="py-2.5 text-sm text-slate-300">{item}</li>
                ))}
              </ul>
            </section>
          </div>

          {work && (
            <section className="mt-8 border-y border-white/10 py-7">
              <h2 className="text-2xl font-semibold text-white">Related code</h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-slate-300">{study.relatedWorkNote}</p>
              <a href={work.repo} {...linkTargetProps(work.repo)} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-copper-400 hover:text-copper-300">
                {work.title} on GitHub <ExternalLink size={15} aria-hidden="true" />
              </a>
            </section>
          )}
        </article>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <a href="/works#reference-architectures" className="font-mono text-sm text-copper-400 hover:text-copper-300">
            Browse reference architectures
          </a>
          <a href={READINESS_SCAN.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm border border-copper-500/30 px-5 py-3 font-mono text-sm text-copper-400 hover:bg-copper-500/10">
            {READINESS_SCAN.cta}
          </a>
        </div>
      </Section>
    </div>
  );
};

const WorksPage = () => {
  usePageMeta();
  const featured = featuredEssays();
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Open Source' | 'Agent Project'>('all');
  const [workQuery, setWorkQuery] = useState('');

  const openSourceWorks = worksByPriority('Open Source');
  const agentProjectWorks = worksByPriority('Agent Project');
  const normalizedWorkQuery = workQuery.trim().toLowerCase();

  const matchesWork = (w: Work) =>
    !normalizedWorkQuery ||
    `${w.title} ${w.description} ${w.category}`.toLowerCase().includes(normalizedWorkQuery);

  const visibleOpenSource = categoryFilter === 'Agent Project' ? [] : openSourceWorks.filter(matchesWork);
  const visibleAgentProjects = categoryFilter === 'Open Source' ? [] : agentProjectWorks.filter(matchesWork);

  return (
    <div className="pt-20">
      <Section>
        <div className="meridian-plate-accent p-6 md:p-10 mb-12 relative overflow-hidden rounded-lg">
          <img
            src="/brand/dm-blueprint-pattern.svg"
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="relative z-10">
            <SectionHeader as="h1" folio="CATALOG // SYSTEMS & BUILD INDEX" title="Works" subtitle="Build · Selected Essays · Signal" />
            <p className="text-slate-200 text-lg max-w-[62ch] -mt-8 mb-8 leading-relaxed">
              Open-source tooling and field-tested patterns from shipping governed agentic systems in production. The Orion tools are part of <a href="https://www.cosmocrat.ai/" {...linkTargetProps('https://www.cosmocrat.ai/')} className="text-copper-300 underline underline-offset-4 hover:text-copper-400">Cosmocrat OS</a>, with independent releases, installation identifiers and support boundaries.
            </p>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-t border-white/10 pt-6">
              <dl className="grid grid-cols-3 gap-6 max-w-md">
                <div>
                  <dt className="font-mono text-xs text-slate-400">Open Source</dt>
                  <dd className="text-2xl font-semibold text-white mt-1 tabular-nums">{openSourceWorks.length}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-slate-400">Agent Systems</dt>
                  <dd className="text-2xl font-semibold text-white mt-1 tabular-nums">{agentProjectWorks.length}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-slate-400">Flagship</dt>
                  <dd className="text-sm font-mono text-copper-300 mt-2">failclosed / Proctor</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <a href="#open-source" className="inline-flex min-h-[44px] items-center px-3.5 py-2 rounded-sm border border-white/15 bg-navy-midnight/80 text-xs font-mono text-slate-200 hover:border-copper-500/50 hover:text-white transition-colors">
                  Open source
                </a>
                <a href="#agent-projects" className="inline-flex min-h-[44px] items-center px-3.5 py-2 rounded-sm border border-white/15 bg-navy-midnight/80 text-xs font-mono text-slate-200 hover:border-copper-500/50 hover:text-white transition-colors">
                  Agent projects
                </a>
                <a href="#reference-architectures" className="inline-flex min-h-[44px] items-center px-3.5 py-2 rounded-sm border border-white/15 bg-navy-midnight/80 text-xs font-mono text-slate-200 hover:border-copper-500/50 hover:text-white transition-colors">
                  Reference architectures
                </a>
                <a href="#selected-essays" className="inline-flex min-h-[44px] items-center px-3.5 py-2 rounded-sm border border-white/15 bg-navy-midnight/80 text-xs font-mono text-slate-200 hover:border-copper-500/50 hover:text-white transition-colors">
                  Essays &amp; Signal
                </a>
              </div>
            </div>
          </div>
        </div>

        <section id="reference-architectures" aria-labelledby="works-architecture-heading" className="mb-12 scroll-mt-24">
          <h2 id="works-architecture-heading" className="text-2xl font-medium text-white">Reference architectures</h2>
          <p className="mt-2 mb-5 text-sm text-slate-300">Two illustrative designs for agent workflows in regulated industries.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {CASE_STUDIES.map((study) => (
              <Link key={study.slug} to={`/case-studies/${study.slug}`}
                className="group meridian-plate-accent flex min-h-[88px] items-center justify-between gap-5 rounded-lg p-5 transition-colors hover:border-copper-500/55">
                <div>
                  <h3 className="text-xl font-medium text-white group-hover:text-copper-300">{study.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{study.layerNames.join(' · ')}</p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-copper-300" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {/* Curated pointers to existing project pages and the knowledge-graph essay. */}
        <h2 className="text-xl font-medium text-white mb-6">Start here</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {WORKS_START_HERE.map((item, idx) => (
            <a
              key={item.href}
              href={item.href}
              {...linkTargetProps(item.href)}
              className={`group rounded-lg p-6 hover:border-copper-500/45 transition-colors ${
                idx === 0 ? 'md:col-span-2 meridian-plate-accent' : 'meridian-plate'
              }`}
            >
              <h3 className="text-lg text-white font-semibold mb-2 group-hover:text-copper-300 transition-colors">{item.title}</h3>
              {item.description && <p className="text-slate-300 text-sm leading-relaxed max-w-[65ch]">{item.description}</p>}
            </a>
          ))}
        </div>

        {/* Filter toolbar for builds */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-white/10 py-4 mb-10">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Browse projects by category">
            {(['all', 'Open Source', 'Agent Project'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                aria-current={categoryFilter === cat ? 'true' : undefined}
                className={`min-h-[44px] inline-flex items-center rounded-full border px-4 py-2 font-mono text-xs transition-colors ${
                  categoryFilter === cat
                    ? 'border-copper-300 bg-copper-300 text-slate-950 font-semibold'
                    : 'border-white/15 text-slate-200 hover:border-copper-500/50 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All builds' : cat === 'Open Source' ? 'Open Source' : 'Agent Projects'}
              </button>
            ))}
          </div>
          <div className="flex h-11 items-center gap-2.5 rounded-sm border border-white/15 bg-navy-deep/70 px-3 focus-within:border-copper-300 sm:w-72">
            <label htmlFor="works-filter-input" className="sr-only">Filter tools and projects</label>
            <Search size={15} className="text-copper-300 shrink-0" aria-hidden="true" />
            <input
              id="works-filter-input"
              type="search"
              value={workQuery}
              onChange={(e) => setWorkQuery(e.target.value)}
              placeholder="Filter tools and projects"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Build, open source & tooling */}
        {categoryFilter !== 'Agent Project' && (
          <div id="open-source">
            <h2 className="text-2xl font-medium text-white mb-6">Build: Open Source &amp; Tooling</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleOpenSource.map((work: Work, idx: number) => (
                <WorkCard
                  key={work.slug}
                  work={work}
                  index={idx}
                  className={visibleOpenSource.length % 2 === 1 && idx === visibleOpenSource.length - 1 ? 'md:col-span-2' : ''}
                />
              ))}
            </div>
          </div>
        )}

        {/* Build, applied agent projects */}
        {categoryFilter !== 'Open Source' && (
          <div id="agent-projects">
            <h2 className="text-2xl font-medium text-white mb-6 mt-16">Build: Applied Agent Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleAgentProjects.map((work: Work, idx: number) => (
                <WorkCard
                  key={work.slug}
                  work={work}
                  index={idx}
                  className={visibleAgentProjects.length % 2 === 1 && idx === visibleAgentProjects.length - 1 ? 'md:col-span-2' : ''}
                />
              ))}
            </div>
          </div>
        )}

        {visibleOpenSource.length === 0 && visibleAgentProjects.length === 0 && (
          <div className="py-10 border-b border-white/10">
            <p className="text-slate-300 mb-3">No builds match "{workQuery.trim()}".</p>
            <button
              type="button"
              onClick={() => { setWorkQuery(''); setCategoryFilter('all'); }}
              className="inline-flex min-h-[44px] items-center font-mono text-xs text-copper-300 hover:text-copper-400"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Selected essays, a CAPPED pointer into /thoughts (no bodies, no filter) */}
        <div id="selected-essays" className="mt-20 meridian-plate rounded-lg p-6 md:p-8 max-w-4xl">
          <h2 className="text-xl font-medium text-white mb-5">Selected Essays</h2>
          <ul className="divide-y divide-white/10">
            {featured.map((essay) => (
              <li key={essay.slug}>
                <Link
                  to={`/thoughts/${essay.slug}`}
                  className="group flex min-h-[44px] items-center gap-2.5 py-2 text-slate-200 hover:text-copper-300 transition-colors"
                >
                  <span className="text-copper-400 font-mono text-xs" aria-hidden="true">-&gt;</span>
                  <span className="border-b border-transparent group-hover:border-copper-300/40">{essay.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-white/10">
            <Link to="/thoughts" className="inline-flex min-h-[44px] items-center text-sm font-medium text-copper-300 hover:text-copper-400">
              Full archive <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Signal, outbound rail */}
        <div id="signal">
          <h2 className="text-xl font-medium text-white mt-14 mb-4">Signal</h2>
          <div className="flex flex-wrap gap-4 max-w-3xl">
            <a href={WORKS_HUB.signalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center px-3 rounded-sm border border-white/10 bg-navy-deep/60 text-sm font-medium text-copper-300 hover:border-copper-500/45 hover:text-copper-400">
              Live signal log <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
            </a>
            <a href={WORKS_HUB.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center px-3 rounded-sm border border-white/10 bg-navy-deep/60 text-sm font-medium text-copper-300 hover:border-copper-500/45 hover:text-copper-400">
              GitHub <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* CTA, one action: availability -> connect */}
        <div className="mt-14 meridian-plate-accent rounded-lg p-7 sm:p-8 max-w-3xl">
          <p className="text-xl text-white font-semibold mb-3">{WORKS_HUB.availability}</p>
          <p className="text-base text-slate-300 mb-6 leading-relaxed">{WORKS_HUB.pilot}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Button to={WORKS_HUB.contactHref} variant="primary">Get in touch</Button>
          </div>
        </div>
      </Section>
    </div>
  );
};

const ThoughtsPage = () => {
  usePageMeta();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const categories = ['all', ...Array.from(new Set(THOUGHTS.map((t: Thought) => t.category)))];
  const claimed = new Set(
    THOUGHT_LANES.flatMap((lane) => (lane.isDefault ? [] : [...(lane.slugs ?? [])])),
  );

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const matchingThoughts = selectThoughts(THOUGHTS, activeCategory, query);
  const isLaneGroupedView = isLaneGroupedThoughtsView(activeCategory, query);
  const latestThoughts = selectLatestThoughts(THOUGHTS);

  const renderCard = (thought: Thought, idx: number) => (
    <Link
      key={idx}
      to={`/thoughts/${thought.slug}`}
      className="flex flex-col border border-white/10 bg-navy-deep/60 rounded-lg p-6 hover:border-copper-500/45 hover:bg-navy-deep transition-all group h-full"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={META_ACCENT}>{thought.category}</span>
        <span className={META}>{thought.date}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-copper-300 transition-colors max-w-[54ch]">{thought.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed grow max-w-[54ch]">{thought.preview}</p>
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs">
        <span className="text-slate-400">{estimateReadingMinutes(thought.body)} min read</span>
        <span className="text-copper-400 group-hover:text-copper-300">Read &rarr;</span>
      </div>
    </Link>
  );

  return (
    <div className="pt-20">
      <Section>
        <div className="rounded-lg border border-white/10 bg-navy-deep/70 p-6 md:p-10 mb-12 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-architectural-grid opacity-25" aria-hidden="true" />
          <div className="relative z-10">
            <SectionHeader as="h1" title="Thought Direction" subtitle="Notes from the operating layer" />
            <p className="text-slate-300 text-lg max-w-3xl -mt-10 mb-4 leading-relaxed">
              Essays on governed AI, workflow ownership, operator-led automation, and execution discipline, plus the failure modes that show up when systems meet reality. Same voice as always: enforcement mechanics and architectural proof, not hot takes.
            </p>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-t border-white/10 pt-6 mt-6">
              <p className="text-slate-400 text-sm max-w-xl">
                Looking for AI strategy or implementation help?{' '}
                <a href={READINESS_SCAN.href} target="_blank" rel="noopener noreferrer" className="text-copper-400 hover:text-copper-300 underline underline-offset-4">
                  Work with OIA on one workflow.
                </a>
              </p>
              <dl className="grid grid-cols-3 gap-6 text-right">
                <div>
                  <dt className="font-mono text-xs text-slate-400">Essays</dt>
                  <dd className="text-xl font-bold text-white mt-0.5 tabular-nums">{THOUGHTS.length}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-slate-400">Lanes</dt>
                  <dd className="text-xl font-bold text-white mt-0.5 tabular-nums">{THOUGHT_LANES.length}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-slate-400">Latest</dt>
                  <dd className="text-sm font-mono text-copper-400 mt-1.5 whitespace-nowrap">{latestThoughts[0]?.date ?? 'n/a'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {isLaneGroupedView && latestThoughts.length > 0 && (
          <section aria-labelledby="latest-releases-heading" className="mb-12">
            <h2 id="latest-releases-heading" className="text-2xl font-bold text-white mb-6">Latest releases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestThoughts.map((t: Thought, idx: number) => (
                <div key={t.slug} className={idx === 0 && latestThoughts.length % 2 === 1 ? 'md:col-span-2' : ''}>
                  {renderCard(t, idx)}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="meridian-plate-accent p-6 md:p-8 mb-12 rounded-lg">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6 pb-4 border-b border-white/10">
            <h2 className="text-xl font-medium text-white">Start here</h2>
            <div className="flex flex-wrap gap-4">
              <a href={NEWSLETTER.href} {...linkTargetProps(NEWSLETTER.href)} className="inline-flex min-h-[44px] items-center text-xs font-mono uppercase tracking-wider text-copper-300 hover:text-copper-400">Subscribe to {NEWSLETTER.name}</a>
              <a href="/feed.xml" className="inline-flex min-h-[44px] items-center text-xs font-mono uppercase tracking-wider text-copper-300 hover:text-copper-400">Follow via RSS</a>
            </div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {START_HERE.map((item) => {
              const title = item.kind === 'guide'
                ? GUIDES.find((g) => g.slug === item.slug)?.title
                : THOUGHTS.find((th) => th.slug === item.slug)?.title;
              const to = item.kind === 'guide' ? `/guides/${item.slug}` : `/thoughts/${item.slug}`;
              return (
                <li key={item.slug} className="rounded-sm border border-white/10 bg-navy-midnight/75 p-4 hover:border-copper-500/45 transition-colors">
                  <Link to={to} className="group block">
                    <span className="text-xs font-mono uppercase tracking-wider text-copper-400 mr-2">{item.kind === 'guide' ? 'Guide' : 'Essay'}</span>
                    <span className="text-white font-semibold group-hover:text-copper-300 transition-colors">{title}</span>
                    <span className="block text-sm text-slate-300 mt-1.5 leading-relaxed">{item.why}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Category filter & search */}
        <div className={`grid gap-5 md:grid-cols-[1fr_22rem] md:items-center ${isLaneGroupedView ? 'mb-12' : 'mb-6'}`}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter essays by substrate category">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
                aria-pressed={activeCategory === cat}
                className={
                  'rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors min-h-[44px] inline-flex items-center ' +
                  (activeCategory === cat
                    ? 'border-copper-500 bg-copper-500 text-slate-950'
                    : 'border-white/15 text-slate-400 hover:border-copper-500/50 hover:text-white')
                }
              >
                {cat === 'all' ? 'All lanes' : cat}
              </button>
            ))}
          </div>
          <label className="flex h-14 items-center gap-3 border border-white/15 bg-navy-deep/60 px-4 focus-within:border-copper-500">
            <span className="sr-only">Search essays. Press slash to focus.</span>
            <Search size={17} className="text-copper-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, category, or idea"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-slate-400"
            />
            <kbd aria-hidden="true" className="rounded-sm border border-white/15 px-2 py-0.5 font-mono text-xs text-slate-300">/</kbd>
          </label>
        </div>

        <p
          className={`font-mono text-xs uppercase tracking-wider text-slate-400 ${isLaneGroupedView ? '' : 'mb-6'}`}
          aria-live="polite"
        >
          {isLaneGroupedView
            ? ''
            : `${matchingThoughts.length} ${matchingThoughts.length === 1 ? 'essay' : 'essays'}${
                normalizedQuery ? ` matching "${query.trim()}"` : ''
              }`}
        </p>

        {isLaneGroupedView ? (
          <div className="space-y-16">
            {THOUGHT_LANES.map((lane, laneIdx) => {
              const essays = lane.isDefault
                ? THOUGHTS.filter((t: Thought) => !claimed.has(t.slug))
                : THOUGHTS.filter((t: Thought) => (lane.slugs ?? []).includes(t.slug));
              return (
                <div key={lane.name}>
                  <div className="mb-6 border-l-2 border-copper-500/50 pl-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{lane.name}</h2>
                      <p className="text-slate-400 text-sm mt-1">{lane.blurb}</p>
                    </div>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      Lane {String(laneIdx + 1).padStart(2, '0')} · {essays.length} {essays.length === 1 ? 'essay' : 'essays'}
                    </span>
                  </div>
                  {essays.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {essays.map((thought: Thought, idx: number) => (
                        <div key={thought.slug} className={essays.length % 2 === 1 && idx === 0 ? 'md:col-span-2' : ''}>
                          {renderCard(thought, idx)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm italic">
                      {lane.emptyNote}{' '}
                      {lane.externalHref && (
                        <a href={lane.externalHref} target="_blank" rel="noopener noreferrer" className="text-copper-400 hover:text-copper-300 underline not-italic">
                          Visit danmercede.online
                        </a>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchingThoughts.map((thought: Thought, idx: number) => renderCard(thought, idx))}
            </div>
            {matchingThoughts.length === 0 && (
              <div className="flex min-h-40 flex-col items-start justify-center gap-4 border-y border-white/10">
                <p className="text-slate-300">No essays match that search.</p>
                <button
                  type="button"
                  onClick={() => { setQuery(''); setActiveCategory('all'); searchRef.current?.focus(); }}
                  className="font-mono text-xs uppercase tracking-widest text-copper-400 hover:text-copper-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Doctrine anchor */}
        <div className="mt-16 border-l-2 border-copper-500/40 pl-6 max-w-2xl">
          <p className="text-slate-400 text-sm font-mono mb-2">Governing Principle</p>
          <p className="text-slate-200 italic">
            "If governance is not deterministically enforced before state mutation, it is not governance."
          </p>
        </div>
      </Section>
    </div>
  );
};

const ThoughtDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const thought = THOUGHTS.find((t: Thought) => t.slug === slug);
  usePageMeta(thoughtMeta(slug), { noindex: !thought });

  if (!thought) {
    return (
      <div className="pt-20 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Thought Not Found</h2>
          <Link to="/thoughts" className="text-copper-500 hover:text-copper-400 font-mono text-sm">
            ← Back to Thoughts
          </Link>
        </div>
      </div>
    );
  }

  const readMinutes = estimateReadingMinutes(thought.body);
  const { blocks, headings } = parseMarkdown(thought.body);

  return (
    <div className="pt-20">
      <ReadingProgressBar />
      <Section>
        <ArticleLayout key={thought.slug} headings={thought.slug === KNOWLEDGE_GRAPH_SLUG ? [{ id: 'measurement-context', label: 'What the measurements cover', level: 2 }, ...headings] : headings} back={
          <div className="mb-6">
            <Link to="/thoughts" className="text-copper-400 hover:text-copper-300 font-mono text-sm inline-flex items-center gap-1">
              ← Thoughts
            </Link>
          </div>
        }>
          <article className="border-l-2 border-copper-500 pl-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{thought.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className={META_ACCENT}>{thought.category}</span>
              <Link to="/about" rel="author" className={`${META} hover:text-copper-300`}>By Dan Mercede</Link>
              <span className={META}>{thought.date}</span>
              <span className={`${META} inline-flex items-center gap-1`}>
                <Clock className="w-3.5 h-3.5 text-copper-400" aria-hidden="true" />
                {readMinutes} min read
              </span>
            </div>
            <p className="text-slate-200 text-lg leading-relaxed mb-8 italic">{thought.preview}</p>
            {thought.slug === KNOWLEDGE_GRAPH_SLUG && <KnowledgeGraphContext />}
            {blocks}
            <ShareStrip title={thought.title} path={`/thoughts/${thought.slug}`} />
            <RelatedContentShelf kind="essay" currentSlug={thought.slug} />
          </article>
        </ArticleLayout>
      </Section>
    </div>
  );
};

const guideSearchText = (guide: Guide) =>
  [guide.title, guide.category, guide.description, guide.lead].join(' ').toLowerCase();

const FEATURED_GUIDES = PRIORITY_GUIDE_SLUGS.map((slug) => {
  const guide = GUIDES.find((entry) => entry.slug === slug);
  if (!guide) throw new Error(`Priority guide missing: ${slug}`);
  return guide;
});
// Hero stat rail: the "Themes" tile counts the CURATED lenses (GUIDE_LENSES minus the
// 'all' escape hatch), which is the axis the index actually navigates by (the filter
// pills at "02 / Guide library" and the tiles at "03 / Recurring themes").
// It previously counted distinct `guide.category` values under a "Lanes" label, which
// was wrong twice over: `category` is a per-guide surface label with only 2 distinct
// values today, and "Lanes" is /thoughts vocabulary (THOUGHT_LANES), not a guides concept.
const GUIDE_THEME_COUNT = GUIDE_LENSES.filter((lens) => lens.id !== 'all').length;

const GuidesPage = () => {
  usePageMeta();
  const [query, setQuery] = useState('');
  const [activeLens, setActiveLens] = useState<GuideLensId>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGuides = GUIDES.filter((guide: Guide) =>
    (!normalizedQuery || guideSearchText(guide).includes(normalizedQuery)) &&
    guideMatchesLens(guide, activeLens),
  );
  return (
    <div className="pt-20">
      <Section className="pb-12 md:pb-16">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-navy-deep/65 px-6 py-10 md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(230, 130, 73, 0.14), transparent 60%)',
            }}
          />
          <div className="relative z-10 max-w-5xl">
            <div className="border-l-2 border-copper-500 pl-5 sm:pl-6">
              <h1 className="max-w-5xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.04] tracking-[-0.03em] text-white">
                Build agents that can act{' '}
                <span className="sm:block">and prove what happened.</span>
              </h1>
              <p className="folio-index text-copper-400 mt-2">TECHNICAL FIELD GUIDES // PRODUCTION VERIFICATION</p>
            </div>
            <div className="mt-8 grid gap-8 border-t border-white/10 pt-7 md:grid-cols-[1.5fr_1fr] md:items-end">
              <p className="max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg/7">
                <span className="text-copper-400">Field notes on governed AI.</span>{' '}
                Long-form technical guides for AI systems that remain legible under pressure:
                authority, evidence, observability, and fail-closed execution.
              </p>
              <dl className="grid grid-cols-[1fr_1fr_auto] gap-4 text-right">
                <div><dt className="font-mono text-xs uppercase tracking-widest text-slate-400">Guides</dt><dd className="mt-1 text-2xl font-semibold text-white">{GUIDES.length}</dd></div>
                <div><dt className="font-mono text-xs uppercase tracking-widest text-slate-400">Themes</dt><dd className="mt-1 text-2xl font-semibold text-white">{GUIDE_THEME_COUNT}</dd></div>
                <div><dt className="font-mono text-xs uppercase tracking-widest text-slate-400">Latest</dt><dd className="mt-1 whitespace-nowrap text-sm font-semibold text-white">{GUIDES[0]?.date ?? 'n/a'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-6 md:pt-8">
        <div className="mb-10 grid gap-5 md:grid-cols-[1fr_22rem] md:items-end">
          <div>
            <h2 className="text-3xl font-normal tracking-tight text-white md:text-5xl md:font-light">Start with the signal.</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">Start with agent regression testing, Claude Code cache usage, or a webhook bridge you can inspect.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {FEATURED_GUIDES.map((guide: Guide, index: number) => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className={`group flex min-h-[17rem] flex-col rounded-lg border transition-all duration-300 hover:-translate-y-0.5 hover:border-copper-500/45 ${
                index === 0 ? 'md:col-span-2 meridian-plate-accent' : 'meridian-plate'
              }`}
            >
              <div className="relative h-14 overflow-hidden border-b border-white/10 bg-navy-midnight/85 flex items-center justify-between px-6">
                <span className="font-mono text-xs tabular-nums text-copper-300">
                  PLATE {String(index + 1).padStart(2, '0')} // FEATURED FIELD NOTE
                </span>
                <Layers size={20} className="text-copper-500/45" aria-hidden="true" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold leading-snug text-white group-hover:text-copper-400">{guide.title}</h3>
                <p className={`${META} mt-2`}>{guide.category} · {guide.date}</p>
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-300 max-w-[54ch]">{guide.lead}</p>
                <span className="mt-auto flex items-center justify-between border-t border-white/10 pt-5 font-mono text-xs uppercase tracking-widest text-copper-300">
                  Read field note <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="guide-library" className="pt-8 md:pt-12">
        <div className="mb-9 grid gap-7 md:grid-cols-[max-content_minmax(0,32rem)] md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-normal tracking-tight text-white md:text-5xl md:font-light">Follow the question.</h2>
          </div>
          <label className="flex h-14 items-center gap-3 border border-white/15 bg-navy-deep/60 px-4 focus-within:border-copper-500">
            <span className="sr-only">Search guides</span>
            <Search size={17} className="text-copper-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, category, or idea"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-slate-400"
            />
            <kbd aria-hidden="true" className="rounded-sm border border-white/15 px-2 py-1 font-mono text-xs text-slate-300">/</kbd>
          </label>
        </div>

        <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Filter guides by recurring theme">
          {GUIDE_LENSES.map((lens) => (
            <button
              key={lens.id}
              type="button"
              onClick={() => setActiveLens(lens.id)}
              aria-pressed={activeLens === lens.id}
              className={'rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors min-h-[44px] inline-flex items-center ' + (activeLens === lens.id ? 'border-copper-500 bg-copper-500 text-slate-950' : 'border-white/15 text-slate-400 hover:border-copper-500/50 hover:text-white')}
            >
              {lens.label}
            </button>
          ))}
        </div>
        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-slate-400" aria-live="polite">
          {visibleGuides.length} {visibleGuides.length === 1 ? 'guide' : 'guides'}
        </p>
        <div className="border-t border-white/15">
          {visibleGuides.map((guide: Guide, index: number) => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className="group grid min-h-28 grid-cols-[2.25rem_1fr_auto] items-center gap-4 border-b border-white/10 py-5 transition-colors hover:bg-white/[0.025] md:grid-cols-[4rem_9rem_1fr_7rem_2rem] md:px-3"
            >
              <span className="font-mono text-xs text-copper-400 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              <span className="hidden font-mono text-xs uppercase tracking-wider text-slate-400 md:block">{guide.category}</span>
              <span className="text-lg font-medium leading-snug text-white group-hover:text-copper-300 md:text-2xl/8">
                {guide.title}
                <span className={`${META} mt-1 block md:hidden`}>{guide.category} · {guide.date}</span>
                <GuideMetadata guide={guide} />
              </span>
              <span className="hidden text-right font-mono text-xs text-slate-400 tabular-nums md:block">{guide.date}</span>
              <ChevronRight size={18} className="text-copper-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          ))}
          {visibleGuides.length === 0 && (
            <div className="flex min-h-40 flex-col items-start justify-center gap-4 border-b border-white/10">
              <p className="text-slate-300">No field notes match that search.</p>
              <button type="button" onClick={() => { setQuery(''); setActiveLens('all'); }} className="font-mono text-xs uppercase tracking-widest text-copper-400">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section className="pt-8 md:pt-12">
        <div className="grid gap-10 border-t border-white/10 pt-12 lg:grid-cols-[22rem_1fr]">
          <div>
            <h2 className="text-3xl font-normal tracking-tight text-white md:text-4xl md:font-light">The same hard questions, from different angles.</h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">The formats change. The doctrine does not. Use a theme as a lens into the corpus.</p>
          </div>
          <div className="grid gap-px bg-white/10 md:grid-cols-2">
            {GUIDE_LENSES.filter((lens) => lens.id !== 'all').map((lens, index, arr) => (
              <button
                key={lens.id}
                type="button"
                onClick={() => {
                  setActiveLens(lens.id);
                  setQuery('');
                  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  document.getElementById('guide-library')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                }}
                className={`group bg-navy-midnight p-6 text-left hover:bg-navy-deep ${
                  arr.length % 2 === 1 && index === 0 ? 'md:col-span-2' : ''
                }`}
              >
                <span className="font-mono text-xs text-copper-400">0{index + 1}</span>
                <span className="mt-6 block font-serif text-xl font-semibold text-white group-hover:text-copper-400">{lens.label}</span>
                <span className="mt-3 block text-sm leading-relaxed text-slate-400">{lens.description}</span>
                <span className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-slate-400">
                  {GUIDES.filter((guide: Guide) => guideMatchesLens(guide, lens.id)).length} guides <ChevronRight size={13} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">Prefer the picture? The same systems, as visual explainers.</p>
          <Link to="/diagrams" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-copper-400 hover:text-copper-300">
            Explore architecture diagrams <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <FollowFieldNotes />
      </Section>
    </div>
  );
};

const GuideDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find((g: Guide) => g.slug === slug);
  usePageMeta(guideMeta(slug), { noindex: !guide });

  if (!guide) {
    return (
      <div className="pt-20 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Guide Not Found</h2>
          <Link to="/guides" className="text-copper-500 hover:text-copper-400 font-mono text-sm">
            ← Back to Guides
          </Link>
        </div>
      </div>
    );
  }

  const readMinutes = estimateReadingMinutes(guide.body);
  const { blocks, headings } = parseMarkdown(guide.body);

  return (
    <div className="pt-20">
      <ReadingProgressBar />
      <Section>
        <ArticleLayout key={guide.slug} headings={headings} back={
          <div className="mb-6">
            <Link to="/guides" className="text-copper-400 hover:text-copper-300 font-mono text-sm inline-flex items-center gap-1">
              ← Guides
            </Link>
          </div>
        }>
          <article>
            <h1 className="text-3xl md:text-5xl/none font-bold text-white mb-4 leading-tight">{guide.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6">
              <span className={META_ACCENT}>{guide.category}</span>
              <Link to="/about" rel="author" className={`${META} hover:text-copper-300`}>By Dan Mercede</Link>
              <span className={META}>{guide.date}</span>
              {guide.modified && <span className={META}>Updated {guide.modified}</span>}
              {guide.reviewed && (
                <span className={META}>Reviewed {guide.reviewed}</span>
              )}
              <span className={`${META} inline-flex items-center gap-1`}>
                <Clock className="w-3.5 h-3.5 text-copper-400" aria-hidden="true" />
                {readMinutes} min read
              </span>
            </div>
            <p className="text-slate-200 text-lg md:text-xl/7 leading-relaxed mb-10 border-l-2 border-copper-500 pl-5">{guide.lead}</p>
            {guide.youtube && <GuideVideo key={guide.slug} id={guide.youtube} title={guide.title} />}
            {blocks}
            <ShareStrip title={guide.title} path={`/guides/${guide.slug}`} />
            <RelatedContentShelf kind="guide" currentSlug={guide.slug} />
          </article>
        </ArticleLayout>
      </Section>
    </div>
  );
};

const DiagramsPage = () => {
  usePageMeta();
  const [query, setQuery] = useState('');
  const [lightboxDiagram, setLightboxDiagram] = useState<Diagram | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleDiagrams = normalizedQuery
    ? DIAGRAMS.filter((d: Diagram) => `${d.title} ${d.caption} ${d.alt}`.toLowerCase().includes(normalizedQuery))
    : DIAGRAMS;

  return (
    <div className="pt-20">
      <Section>
        <SectionHeader as="h1" title="Diagrams" subtitle="Systems · Architecture · Agentic Patterns" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <p className="text-slate-300 text-lg max-w-3xl">
            Visual explainers for governed AI architecture: monitoring versus enforcement, non-repudiation, authority decay, the liability equation, and the systems patterns behind the doctrine.
          </p>
          <div className="flex h-11 items-center gap-2.5 rounded-sm border border-white/15 bg-navy-deep/50 px-3 focus-within:border-copper-500 md:w-72 shrink-0">
            <label htmlFor="diagrams-filter-input" className="sr-only">Filter diagrams</label>
            <Search size={15} className="text-copper-400 shrink-0" aria-hidden="true" />
            <input
              id="diagrams-filter-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter diagrams"
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-hidden placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleDiagrams.map((diagram: Diagram, idx: number) => {
            const isPaperSpecimen = diagram.src.endsWith('.jpg');
            return (
              <div
                key={diagram.slug}
                className="meridian-plate flex flex-col rounded-lg overflow-hidden hover:border-copper-500/45 transition-colors group"
              >
                <Link
                  to={`/diagrams/${diagram.slug}`}
                  className={`block border-b border-white/10 p-3.5 ${
                    isPaperSpecimen ? 'bg-[#0B1533] ring-1 ring-inset ring-copper-300/15' : 'bg-navy-midnight/85'
                  }`}
                >
                  {isPaperSpecimen && (
                    <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-slate-400">
                      <span>Archival Specimen</span>
                      <span className="text-copper-300/80">Plate {String(idx + 1).padStart(2, '0')}</span>
                    </div>
                  )}
                  <img
                    src={diagram.src}
                    alt={diagram.alt}
                    width="1200"
                    height="675"
                    className={`w-full h-auto rounded-xs ${isPaperSpecimen ? 'brightness-[0.88] contrast-[1.05] saturate-[0.92] border border-copper-300/20' : ''}`}
                    loading="eager"
                    decoding="sync"
                  />
                </Link>
              <div className="p-6 flex flex-col grow">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className={META_ACCENT}>PLATE {String(idx + 1).padStart(2, '0')} // DIAGRAM</span>
                  <span className={`${META} tabular-nums`}>{diagram.date}</span>
                </div>
                <Link to={`/diagrams/${diagram.slug}`} className="inline-flex min-h-[44px] items-center">
                  <h2 className="text-xl font-medium text-white group-hover:text-copper-300 transition-colors">{diagram.title}</h2>
                </Link>
                <p className="text-slate-300 text-sm leading-relaxed grow mb-5 mt-1">{diagram.caption}</p>
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <Link
                    to={`/diagrams/${diagram.slug}`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 font-mono text-xs text-copper-300 hover:text-copper-400"
                  >
                    Open diagram note <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setLightboxDiagram(diagram)}
                    aria-haspopup="dialog"
                    aria-label={`Inspect ${diagram.title} fullscreen`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-sm border border-white/15 bg-navy-midnight/80 font-mono text-xs text-slate-200 hover:border-copper-500/45 hover:text-white transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Inspect
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {visibleDiagrams.length === 0 && (
          <div className="py-10 border-y border-white/10 mt-6">
            <p className="text-slate-300 mb-3">No diagrams match "{query.trim()}".</p>
            <button type="button" onClick={() => setQuery('')} className="font-mono text-xs text-copper-400 hover:text-copper-300">
              Show all diagrams
            </button>
          </div>
        )}
        <FollowFieldNotes />
      </Section>

      {lightboxDiagram && <DiagramPreview diagram={lightboxDiagram} onDismiss={() => setLightboxDiagram(null)} />}
    </div>
  );
};

const DiagramDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const diagram = DIAGRAMS.find((d: Diagram) => d.slug === slug);
  usePageMeta(diagramMeta(slug), { noindex: !diagram });

  if (!diagram) {
    return (
      <div className="pt-20 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Diagram Not Found</h2>
          <Link to="/diagrams" className="text-copper-500 hover:text-copper-400 font-mono text-sm">
            ← Back to Diagrams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link to="/diagrams" className="text-copper-400 hover:text-copper-300 font-mono text-sm inline-flex items-center gap-1">
              ← Diagrams
            </Link>
          </div>

          <article>
            <h1 className="text-3xl md:text-5xl/none font-bold text-white mb-3 leading-tight">{diagram.title}</h1>
            <div className="flex items-center gap-4 mb-6">
              <span className={META_ACCENT}>Diagram</span>
              <span className={META}>{diagram.date}</span>
            </div>
            <figure>
              <div className="w-full rounded-lg border border-white/10 bg-navy-deep/70 overflow-hidden p-3">
                <img
                  src={diagram.src}
                  alt={diagram.alt}
                  width="1200"
                  height="675"
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
              <figcaption className="text-slate-200 text-base md:text-lg/7 leading-relaxed mt-5 border-l-2 border-copper-500 pl-5">
                {diagram.caption}
              </figcaption>
            </figure>
            <ShareStrip title={diagram.title} path={`/diagrams/${diagram.slug}`} />
            <RelatedContentShelf kind="diagram" currentSlug={diagram.slug} />
          </article>
        </div>
      </Section>
    </div>
  );
};

const ConnectPage = () => {
  usePageMeta();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [selectedIntentId, setSelectedIntentId] = useState<string>(CONTACT_INTENTS[0]?.id ?? 'implementation');
  const selectedIntent = CONTACT_INTENTS.find((i) => i.id === selectedIntentId) ?? CONTACT_INTENTS[0];

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => {
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    }).catch(() => {});
  };

  return (
  <div className="pt-20">
    <Section>
      <SectionHeader as="h1" folio="DISPATCH // DIRECT CHANNELS" title="Contact Dan" subtitle="Email and LinkedIn" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xl text-white leading-relaxed">
            Email reaches me directly. Pick the reason that fits and the subject line fills in.
          </p>

          <div className="meridian-plate-accent rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block font-mono text-xs text-slate-400">Direct email</span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  onClick={() => trackEvent(window, 'generate_lead', { method: 'email' })}
                  className="inline-flex min-h-[44px] items-center text-base font-mono text-copper-300 hover:text-copper-400"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-sm border border-white/15 bg-navy-midnight/85 font-mono text-xs text-slate-200 hover:border-copper-500/50 hover:text-white transition-colors shrink-0"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                {copiedEmail ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Previewing route: <span className="text-copper-300 font-mono">{selectedIntent?.label}</span>
              {'subject' in selectedIntent && selectedIntent.subject ? (
                <span className="block font-mono text-slate-200 mt-1">Subject: {selectedIntent.subject}</span>
              ) : null}
            </p>
          </div>

          <a
            href="https://www.linkedin.com/in/danmercede/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent(window, 'connect_click', { method: 'linkedin' })}
            className="meridian-plate flex min-h-[64px] items-center group p-4 rounded-lg hover:border-copper-500/60 transition-colors"
          >
            <Linkedin className="w-6 h-6 text-slate-300 group-hover:text-copper-300 mr-4 shrink-0" aria-hidden="true" />
            <div>
              <span className="block text-xs text-slate-400 uppercase tracking-wider font-mono">LinkedIn</span>
              <span className="text-white group-hover:text-copper-300 transition-colors">linkedin.com/in/danmercede</span>
            </div>
          </a>
          <div className="space-y-3.5">
            {CONTACT_INTENTS.map((intent) => {
              const external = Boolean(intent.href);
              const href = contactHref(intent);
              const isSelected = selectedIntentId === intent.id;
              return (
                <a
                  key={intent.id}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onMouseEnter={() => setSelectedIntentId(intent.id)}
                  onFocus={() => setSelectedIntentId(intent.id)}
                  onTouchStart={() => setSelectedIntentId(intent.id)}
                  onClick={external ? undefined : () => trackEvent(window, 'generate_lead', { method: 'email', intent: intent.id })}
                  className={`flex min-h-[72px] items-start group p-5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-copper-300/60 bg-navy-deep/90'
                      : 'border-white/10 bg-navy-deep/60 hover:border-copper-500/45'
                  }`}
                >
                  {external ? (
                    <ExternalLink className="w-5 h-5 text-copper-300 mr-4 mt-1 shrink-0" aria-hidden="true" />
                  ) : (
                    <Mail className="w-5 h-5 text-copper-300 mr-4 mt-1 shrink-0" aria-hidden="true" />
                  )}
                  <div className="grow">
                    <div className="flex items-center justify-between gap-2">
                      <span className="block text-white font-semibold group-hover:text-copper-300 transition-colors">{intent.label}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-copper-300 transition-transform group-hover:translate-x-1 shrink-0" aria-hidden="true" />
                    </div>
                    <span className="block text-sm text-slate-300 mt-1 leading-relaxed">{intent.detail}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
        <div className="lg:col-span-7">
          <SpeakingResources />
        </div>
      </div>
    </Section>
  </div>
  );
};

const LegalPage = () => {
  usePageMeta();
  return (
  <div className="pt-20">
    <Section>
      <SectionHeader as="h1" title="Legal Notice" subtitle="Terms & Conditions" />
      <div className="prose prose-invert prose-lg text-slate-400 max-w-4xl">
        <p className="mb-6">
          <strong>1. Information on this Website</strong><br />
          The content on danmercede.com is provided for informational purposes only. No representations or warranties are made regarding accuracy, completeness, or suitability for any purpose. Any reliance on the information is at your own risk.
        </p>
        <p className="mb-6">
          <strong>2. Intellectual Property</strong><br />
          The written content, diagrams, and branding on this site belong to Orion Apex Capital or its operating entities. Reproducing them without written permission is not allowed.
        </p>
        <p className="mb-6">
          <strong>3. Open-Source Software</strong><br />
          Open-source tools linked from this site are licensed separately, under the license in each tool's own repository (most are MIT). These terms cover this website's content and do not restrict or replace those licenses.
        </p>
        <p className="mb-6">
          <strong>4. Limitation of Liability</strong><br />
          The owner is not liable for any direct or indirect loss, damage, or injury arising from the use or inability to use the information provided on this site.
        </p>
      </div>
    </Section>
  </div>
  );
};

const PrivacyPage = () => {
  usePageMeta();
  return (
  <div className="pt-20">
    <Section>
      <SectionHeader as="h1" title="Privacy Policy" subtitle="Data Governance" />
      <div className="prose prose-invert prose-lg text-slate-400 max-w-4xl">
        {PRIVACY_SECTIONS.map((section) => (
          <p key={section.heading} className="mb-6">
            <strong>{section.heading}</strong><br />
            {section.body}
          </p>
        ))}
      </div>
    </Section>
  </div>
  );
};

const ImprintPage = () => {
  usePageMeta();
  return (
  <div className="pt-20">
    <Section>
      <SectionHeader as="h1" title="Imprint" subtitle="Entity Details" />
      <div className="max-w-2xl rounded-lg border border-white/10 bg-navy-deep/70 p-6 sm:p-10">
        <div className="space-y-6 text-slate-400">
          <div>
            <h2 className="text-white text-sm font-semibold mb-1">Operating Entity</h2>
            <p>Orion Apex Capital</p>
          </div>

          <div>
            <h2 className="text-white text-sm font-semibold mb-1">Responsible Person</h2>
            <p>Dan Mercede</p>
          </div>

          <div>
            <h2 className="text-white text-sm font-semibold mb-1">Contact</h2>
            <p>contact@danmercede.com</p>
          </div>

          <div>
            <h2 className="text-white text-sm font-semibold mb-1">Jurisdiction</h2>
            <p>United States</p>
          </div>
        </div>
      </div>
    </Section>
  </div>
  ); };

// Catch-all 404 for unknown paths. The SPA's `/(.*)` Vercel rewrite serves
// index.html (HTTP 200) for every path, so without this an unknown URL rendered
// the empty homepage shell (a thin soft-404). This renders a clear 404 surface
// and opts into <meta name="robots" content="noindex"> so crawlers don't index
// nonexistent paths as homepage duplicates.
const NotFoundPage = () => {
  usePageMeta(
    {
      title: 'Page Not Found: Dan Mercede',
      description: 'The page you requested does not exist. Return to danmercede.com.',
    },
    { noindex: true },
  );
  return (
    <div className="pt-20">
      <Section>
        <SectionHeader as="h1" title="Page Not Found" subtitle="404" />
        <p className="text-slate-400 mb-8 max-w-2xl -mt-10">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center text-copper-500 font-bold uppercase tracking-wider text-sm hover:text-copper-400 transition-colors"
        >
          Return home <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </Section>
    </div>
  );
};

// --- App Layout ---

const ScrollToTop = () => {
  const { pathname } = useLocation();
  // Skip the first mount: a route rendered at build time is readable before the
  // scripts load, and a visitor who has already scrolled must not be sent back
  // to the top when it hydrates. Later navigations still start at the top.
  const firstMount = React.useRef(true);
  React.useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// The router is chosen by the caller: BrowserRouter in the client entry
// (index.tsx), StaticRouter in the build-time render (entry-server.tsx).
const App: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <ScrollToTop />
      <Analytics />
      <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-copper-500 selection:text-slate-950 overflow-x-clip">
        <ConstellationBackground />
        <a
          href="#main-content"
          onClick={e => {
            e.preventDefault();
            const main = document.getElementById('main-content');
            if (main) {
              main.focus();
              const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              main.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            }
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-copper-500 focus:text-slate-950 focus:rounded-sm"
        >Skip to content</a>
        <Navigation onOpenSearch={() => setIsSearchOpen(true)} />
        <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        <main id="main-content" tabIndex={-1} className="relative z-10 focus:outline-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/ecosystem" element={<EcosystemPage />} />
            <Route path="/proof" element={<ResourcesPage />} />
            <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
            <Route path="/thoughts" element={<ThoughtsPage />} />
            <Route path="/thoughts/:slug" element={<ThoughtDetailPage />} />
            <Route path="/works" element={<WorksPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:slug" element={<GuideDetailPage />} />
            <Route path="/diagrams" element={<DiagramsPage />} />
            <Route path="/diagrams/:slug" element={<DiagramDetailPage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/imprint" element={<ImprintPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default App;
