import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { normalizePath } from './hydration';
import { syncRouteJsonLd } from './routeJsonLd';
import { Menu, X, ExternalLink, Linkedin, Mail, Shield, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Download, Layers, ArrowRight, AlertTriangle, Search } from 'lucide-react';
import ConstellationBackground from './components/ConstellationBackground';
import Markdown from './components/Markdown';
import Analytics from './components/Analytics';
import { trackEvent } from './analytics/gaConfig';
import { NAV_ITEMS, HERO_CONTENT, SPEAKING, BELIEFS, VENTURES, PRIMARY_VENTURES, READINESS_SCAN, INTENT_ROUTES, THOUGHT_LANES, FOOTER_DATA, getImageMeta, RESOURCES, CASE_STUDIES, THOUGHTS, worksByPriority, GUIDES, DIAGRAMS, featuredEssays, WORKS_HUB, GUIDE_LENSES, guideMatchesLens , GuideLensId, PROOF_EVIDENCE, PRIVACY_SECTIONS, REFERENCE_ARCHITECTURE_NOTICE, ABOUT_BIO, CONTACT_INTENTS, CONTACT_EMAIL, SELECTED_WORK, VALIDATION, FOOTER_LINKS, START_HERE, proofGroupFor, contactHref, NEWSLETTER } from './constants';
import { selectThoughts, isLaneGroupedThoughtsView } from './thoughtsIndex';

import { Venture, Resource, CaseStudy, Thought, Work, Guide, Diagram } from './types';
import { WorkCard, linkTargetProps } from './components/WorkCard';
import {
  ROUTE_META,
  caseStudyMeta,
  thoughtMeta,
  guideMeta,
  diagramMeta,
  typeScopedMetaTags,
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
  <section id={id} className={`max-w-7xl mx-auto px-6 py-20 md:py-32 ${className}`}>
    {children}
  </section>
);

const Button: React.FC<{ children: React.ReactNode; variant?: 'primary' | 'outline'; onClick?: () => void; to?: string }> = ({ children, variant = 'primary', to }) => {
  const baseClasses = "inline-flex items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-copper-500";
  const variants = {
    primary: "bg-copper-500 text-slate-950 hover:bg-copper-400",
    outline: "bg-transparent text-copper-500 hover:bg-copper-500/10"
  };

  if (to) {
    return (
      <Link to={to} className={`${baseClasses} ${variants[variant]}`}>
        {children}
      </Link>
    );
  }
  return <button className={`${baseClasses} ${variants[variant]}`}>{children}</button>;
};

// `as` lets a route's lead heading render as the page-level <h1> (identical
// styling) so each top-level route exposes one screen-reader-perceivable h1;
// subsequent section headers stay h2. Default h2 keeps existing call sites intact.
const SectionHeader: React.FC<{ title: string; subtitle?: string; as?: 'h1' | 'h2' }> = ({ title, subtitle, as: Heading = 'h2' }) => (
  <div className="mb-16 border-l-2 border-copper-500 pl-6">
    <Heading className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{title}</Heading>
    {subtitle && <p className="text-copper-400 font-mono text-sm tracking-widest uppercase">{subtitle}</p>}
  </div>
);

// --- Layout Components ---

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Disclosure-menu keyboard a11y: focus the first link when the menu opens;
  // close on Escape and return focus to the toggle button.
  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="Dan Mercede, home">
          <img src="/dan-mercede-lockup-dark.svg" alt="" width="144" height="36" className="h-9 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex space-x-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium uppercase tracking-wider hover:text-copper-500 transition-colors ${normalizePath(location.pathname) === item.path ? 'text-copper-500' : 'text-slate-400'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          // #mobile-menu only mounts while open; only reference it when present
          // so collapsed state does not advertise a dangling aria-controls target.
          aria-controls={isOpen ? 'mobile-menu' : undefined}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          onKeyDown={(e) => { if (e.key === 'Escape') closeMenu(); }}
          className="md:hidden absolute top-20 w-full bg-slate-950 border-b border-copper-500/30"
        >
          <div className="flex flex-col p-6 space-y-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium text-slate-300 hover:text-copper-500"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="border-t border-white/5 bg-slate-950 py-12 mt-20">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center">
      <div className="mb-8 md:mb-0">
        <img src="/dm-mark.svg" alt="" aria-hidden="true" className="h-8 w-8 mb-3" />
        <p className="text-white font-bold tracking-widest uppercase mb-1">Dan Mercede</p>
        <p className="text-slate-400 text-xs font-mono mb-1">Founder & Systems Architect</p>
        <p className="text-slate-400 text-xs">{FOOTER_DATA.entity}</p>
      </div>
      <div className="flex flex-col items-start md:items-end gap-3 text-slate-400">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((l) =>
            l.href.endsWith('.xml') || /^https?:\/\//.test(l.href) ? (
              <a key={l.href} href={l.href} {...linkTargetProps(l.href)} className="text-xs hover:text-copper-500 transition-colors">{l.label}</a>
            ) : (
              <Link key={l.href} to={l.href} className="text-xs hover:text-copper-500 transition-colors">{l.label}</Link>
            ),
          )}
        </div>
        <div className="flex space-x-6">
        <Link to="/legal" className="text-xs hover:text-copper-500 cursor-pointer transition-colors">Legal</Link>
        <Link to="/privacy" className="text-xs hover:text-copper-500 cursor-pointer transition-colors">Privacy</Link>
        <Link to="/imprint" className="text-xs hover:text-copper-500 cursor-pointer transition-colors">Imprint</Link>
        </div>
      </div>
    </div>
  </footer>
);

// --- Pages ---

// Homepage intent-router: 4 cards that route each visitor to the surface fitting
// their intent (authority-router role). SMB card links out to OIA; the rest are
// in-hub routes. Rendered React-only (never baked into the identity `/` body).
const IntentRouter = () => (
  <Section className="pt-10 md:pt-16">
    <SectionHeader title="Where do you want to go?" subtitle="Find your path" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {INTENT_ROUTES.map((route, idx) => {
        const cardClass = "flex flex-col items-start p-6 border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 hover:border-copper-500/30 transition-all group h-full";
        const inner = (
          <>
            <p className="text-copper-400 text-xs font-mono uppercase tracking-widest mb-3">{route.audience}</p>
            <h3 className="text-white font-semibold mb-2">{route.prompt}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-grow">{route.description}</p>
            <span className="inline-flex items-center text-sm font-medium text-copper-500 group-hover:text-copper-400 transition-colors">
              {route.cta}
              {route.external
                ? <ExternalLink className="w-4 h-4 ml-2" />
                : <ArrowRight className="w-4 h-4 ml-2" />}
            </span>
          </>
        );
        return route.external ? (
          <a key={idx} href={route.href} target="_blank" rel="noopener noreferrer" className={cardClass}>{inner}</a>
        ) : (
          <Link key={idx} to={route.href} className={cardClass}>{inner}</Link>
        );
      })}
    </div>
  </Section>
);

const HomePage = () => {
  usePageMeta();
  return (
    <>
      {/* Hero */}
      <section className="min-h-[90vh] flex flex-col pt-20 relative">
        <div className="flex-grow flex items-center my-12 md:my-0">
          <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 mb-6 border border-copper-500/30 rounded-full bg-copper-500/5">
                <span className="text-copper-400 text-xs font-mono tracking-widest uppercase">Operator and Systems Builder</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tighter">
                {HERO_CONTENT.name}
              </h1>
              <p className="text-xl md:text-2xl text-slate-300 mb-4 font-light">
                {HERO_CONTENT.positioning}
              </p>
              <p className="text-slate-400 mb-10 max-w-md">
                {HERO_CONTENT.philosophy}
              </p>
              {/* Hero actions: the work first, then direct contact; OIA stays one line below */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#selected-work"
                  className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-copper-500 bg-copper-500 text-slate-950 hover:bg-copper-400"
                >
                  See selected work
                </a>
                <Link
                  to="/connect"
                  className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-slate-600 text-white hover:border-copper-500"
                >
                  Contact Dan
                </Link>
              </div>
              <p className="text-slate-400 text-sm mt-5 max-w-md">
                Business implementation work runs through{' '}
                <a href={READINESS_SCAN.href} target="_blank" rel="noopener noreferrer" className="text-copper-400 hover:text-copper-300 underline-offset-4 hover:underline">
                  Orion Intelligence Agency
                </a>.
              </p>
            </div>

            {/* Image Placeholder */}
            <div className="relative aspect-[4/5] bg-slate-900 border border-slate-800 rounded-sm overflow-hidden group">
              <img
                src="/dan-mercede-founder-headshot-hero.webp"
                alt={getImageMeta("/dan-mercede-founder-headshot-hero.webp").alt}
                title="Dan Mercede"
                width="1200"
                height="1500"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
              />
              {/* Subtle Dark Overlay (5%) */}
              <div className="absolute inset-0 bg-slate-950/5 pointer-events-none"></div>
              {/* Overlay for aesthetic */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
            </div>

          </div>
        </div>

        {/* Transition Band - Anchor (Text + Divider Only) */}
        <div className="w-full max-w-7xl mx-auto px-6 pb-8 md:pb-12">
          <div className="flex items-center gap-6 opacity-80">
            <div className="h-px w-16 bg-copper-500/40"></div>
            <span className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
              The teams that win with AI own the workflow, not just the model.
            </span>
            <div className="h-px flex-grow bg-white/5"></div>
          </div>
        </div>
      </section>

      {/* Selected Work */}
      <Section id="selected-work" className="pt-10 md:pt-16">
        <SectionHeader title="Selected work" subtitle="Built, running, and checked" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {SELECTED_WORK.map((work) => {
            const external = Boolean(linkTargetProps(work.href).target);
            return (
              <a
                key={work.title}
                href={work.href}
                {...linkTargetProps(work.href)}
                className="flex flex-col p-6 border border-white/10 bg-slate-900/40 hover:border-copper-500/50 transition-colors group h-full"
              >
                <span className="text-copper-400 text-xs font-mono uppercase tracking-widest mb-3">{work.status}</span>
                <h3 className="text-2xl font-bold text-white mb-3">{work.title}</h3>
                <p className="text-slate-300 leading-relaxed mb-4 flex-grow">{work.summary}</p>
                <p className="text-slate-400 text-sm mb-4">{work.evidence}</p>
                <span className="inline-flex items-center text-sm font-medium text-copper-500 group-hover:text-copper-400">
                  {external ? 'Source' : work.href.startsWith('/thoughts/') ? 'Read the case' : 'Project page'}
                  {external ? <ExternalLink className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                </span>
              </a>
            );
          })}
        </div>
        {/* Validation strip: external confirmation only */}
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/5 pt-6">
          {VALIDATION.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-slate-300 hover:text-copper-400 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-copper-500 mr-2" />
              {item.label}
            </a>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/works" className="text-copper-500 hover:text-copper-400 text-sm font-semibold inline-flex items-center">
            All projects <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </Section>

      {/* Intent Router - route visitors by intent (authority-router role) */}
      <IntentRouter />

      {/* Upcoming Speaking - third-party credential proof block */}
      <Section className="py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-4">{SPEAKING.label}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{SPEAKING.event}</h3>
          <p className="text-copper-500 font-mono text-xs uppercase tracking-widest mb-1">{SPEAKING.date}</p>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-4">{SPEAKING.time} · {SPEAKING.track} Track</p>
          <p className="text-slate-400 mb-2 max-w-xl mx-auto italic">"{SPEAKING.title}"</p>
          <p className="text-slate-400 text-sm mb-6 max-w-xl mx-auto">{SPEAKING.detail}</p>
          <a
            href={SPEAKING.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper-500 text-sm font-semibold tracking-wider uppercase hover:text-copper-400 transition-colors inline-flex items-center"
          >
            {SPEAKING.cta} <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>
      </Section>

      {/* Final CTA Strip - Single Conversion Path */}
      <Section className="py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-4">Ready to own one workflow?</p>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Work with OIA on one workflow
          </h3>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            A focused engagement with Orion Intelligence Agency that scopes one workflow, maps its failure modes, and delivers a 30/60/90 plan to a system your team owns.
          </p>
          <a
            href={READINESS_SCAN.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-10 py-4 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-copper-500 bg-copper-500 text-slate-950 hover:bg-copper-400"
          >
            {READINESS_SCAN.cta}
          </a>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {READINESS_SCAN.deliverables.map((d, i) => (
              <span key={i} className="text-slate-400 text-xs font-mono border border-white/5 px-3 py-1 rounded-sm">{d}</span>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
};

const AboutPage = () => {
  usePageMeta();
  return (
  <div className="pt-20">
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <SectionHeader as="h1" title="About Dan Mercede" subtitle="Operator, then builder" />
          <div className="prose prose-invert prose-lg text-slate-400">
            <p className="text-xl text-white font-light mb-10 leading-relaxed">{ABOUT_BIO.lead}</p>
            {ABOUT_BIO.sections.map((section) => (
              <div key={section.heading} className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4">{section.heading}</h2>
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
                ))}
              </div>
            ))}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4">Recognition and speaking</h2>
              <ul className="space-y-3 list-none pl-0">
                {ABOUT_BIO.recognition.map((item) => (
                  <li key={item.href} className="pl-0">
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-copper-400 hover:text-copper-300 inline-flex items-start gap-2">
                      <span>{item.label}</span>
                      <ExternalLink className="w-4 h-4 mt-1 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="text-2xl font-bold text-white mb-8">What I Believe</h3>
            <div className="space-y-6">
              {BELIEFS.map((belief, idx) => (
                <div key={idx} className="group">
                  <h4 className="text-copper-400 font-mono text-sm tracking-widest uppercase mb-2 group-hover:text-copper-300 transition-colors">
                    0{idx + 1} // {belief.statement}
                  </h4>
                  <p className="text-slate-400 pl-4 border-l border-slate-700 group-hover:border-copper-500 transition-colors">
                    {belief.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          {/* Secondary Portrait */}
          <div className="sticky top-28 aspect-[3/4] bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
            <img
              src="/dan-mercede-founder-working-portrait.png"
              alt={getImageMeta("/dan-mercede-founder-working-portrait.png").alt}
              title="Dan Mercede"
              width="1200"
              height="1500"
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 contrast-125"
            />
          </div>
        </div>
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
    <div className="col-span-1 md:col-span-2 bg-slate-950 border-y border-copper-500/30 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="absolute top-0 left-0 w-1 h-full bg-copper-500"></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 p-8 md:p-12 items-start">
        <div className="lg:col-span-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            {venture.name}
            <span className="text-slate-400 font-light">·</span>
            <span className="text-copper-400 font-light">{venture.role}</span>
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Role in the Ecosystem</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.ecosystemRole}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Relationship to the System</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.systemRelationship}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Operating Constraints</h4>
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
    </div>
  );

  return (
    <div className="pt-20">
      {/* Primary: Operator Stack */}
      <Section>
        <SectionHeader as="h1" title="Operator Stack" subtitle="Core Systems" />
        <p className="text-slate-400 mb-12 max-w-3xl -mt-10">
          The platform and the consulting arm. Cosmocrat is the Governed AI Operating System. Orion Intelligence Agency is SMB AI strategy consulting that builds and deploys with operators, not just advises.
        </p>

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
                  className={`group relative border p-8 transition-all duration-300 cursor-pointer flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 ${isCosmocrat
                    ? 'border-copper-500/30 bg-copper-500/5'
                    : isExpanded
                      ? 'border-copper-500/50 bg-slate-900/80'
                      : 'border-white/10 bg-slate-900/60 hover:border-copper-500/30 hover:bg-slate-800/40'
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
                        className="h-9 w-auto object-contain opacity-100"
                      />
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-sm uppercase tracking-widest ${isCosmocrat
                      ? 'bg-copper-500/20 text-copper-400 font-bold border border-copper-500/30'
                      : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                      {venture.status}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${isCosmocrat ? 'text-copper-500' : 'text-copper-400'}`}>
                      {venture.role}
                    </p>
                    <h2 className="text-2xl font-bold mb-4 text-white">
                      {venture.name}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {venture.description}
                    </p>
                  </div>
                  <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-4">
                    <span className={`text-xs font-mono uppercase tracking-widest transition-colors ${isExpanded ? 'text-copper-500' : 'text-slate-400 group-hover:text-copper-500'}`}>
                      {isExpanded ? 'Close Details' : 'View Details'}
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
      <div className="border-y border-copper-500/10 bg-slate-900/40 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-4">One Workflow Entry</p>
          <a
            href={READINESS_SCAN.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-copper-500 bg-copper-500 text-slate-950 hover:bg-copper-400"
          >
            {READINESS_SCAN.cta}
          </a>
          <p className="text-slate-400 text-xs font-mono mt-4">
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
          className="cursor-pointer flex items-center justify-between mb-8 group focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-500/50 rounded-sm"
        >
          <div className="border-l-2 border-slate-700 pl-6">
            <h2 className="text-2xl font-bold text-slate-400 group-hover:text-slate-300 transition-colors tracking-tight">Extended Ecosystem</h2>
            <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Supporting Ventures & Vehicles</p>
          </div>
          {showSecondary ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
          )}
        </div>

        {showSecondary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min animate-in fade-in slide-in-from-top-4 duration-300">
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
                    className={`group relative bg-slate-900/30 border p-6 transition-all duration-300 cursor-pointer flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 ${isExpanded
                      ? 'border-copper-500/50 bg-slate-900/80'
                      : 'border-white/5 hover:border-white/10 hover:bg-slate-800/30'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-2 rounded-md border border-white/10 bg-white/5 flex items-center justify-center">
                        <img
                          src={venture.logo}
                          alt={venture.name}
                          className="h-7 w-auto object-contain opacity-70 group-hover:opacity-90 transition-all"
                        />
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-1 rounded-sm uppercase tracking-widest ${isLive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {venture.status}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-xs font-mono uppercase tracking-widest mb-1 text-slate-400">{venture.role}</p>
                      <h3 className="text-xl font-bold mb-3 text-slate-300 group-hover:text-white transition-colors">{venture.name}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{venture.description}</p>
                    </div>
                    <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-3">
                      <span className={`text-xs font-mono uppercase tracking-widest transition-colors ${isExpanded ? 'text-copper-500' : 'text-slate-400 group-hover:text-slate-300'}`}>
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

      <div className="border-t border-white/5 bg-slate-900/30 py-16 text-center">
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest max-w-2xl mx-auto px-6">
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
  <div className="border border-copper-500/20 bg-copper-500/5 rounded-lg p-6 mt-10">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="text-white font-semibold mb-1">Start with one workflow and clear ownership.</p>
        <p className="text-sm text-slate-400">Workflow readiness map. Failure-mode heatmap. Ownership and handoff plan. 30/60/90 rollout roadmap.</p>
      </div>
      <a
        href={READINESS_SCAN.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-copper-500 hover:bg-copper-400 text-slate-950 text-sm font-mono rounded transition-colors whitespace-nowrap"
      >
        {READINESS_SCAN.cta}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  </div>
);

const RunnableProofCallout = () => (
  <div id="runnable-proof" className="mb-16">
    <div className="border border-copper-500/30 bg-gradient-to-br from-copper-500/[0.07] to-slate-900/40 rounded-lg p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono uppercase tracking-widest bg-copper-500/10 text-copper-400 border border-copper-500/20">
          <Layers className="w-3 h-3" />
          L1: Authority Gate
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Public · Runnable
        </span>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
        failclosed: the Authority Gate, made runnable
      </h2>
      <p className="text-slate-300 leading-relaxed max-w-3xl mb-2">
        failclosed applies the Authority Gate to the merge boundary. It runs an LLM reviewer, distrusts the verdict, and refuses to admit unparseable, schema-invalid, or self-contradictory output.
      </p>
      <p className="text-slate-400 text-sm font-mono mb-6">
        Public. Runnable in two minutes. Receipt-backed.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href="https://github.com/OrionArchitekton/failclosed"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-copper-500 hover:bg-copper-400 text-slate-950 text-sm font-semibold rounded transition-colors"
        >
          View on GitHub
          <ExternalLink className="w-4 h-4" />
        </a>
        <Link
          to="/thoughts"
          className="inline-flex items-center gap-2 text-sm text-copper-500 hover:text-copper-400 font-mono transition-colors"
        >
          Read the doctrine
          <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href={READINESS_SCAN.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-copper-400 font-mono transition-colors"
        >
          {READINESS_SCAN.cta}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  </div>
);

const EVIDENCE_TIER_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  independent: CheckCircle2,
  reproducible: Shield,
  'not-claimed': AlertTriangle,
};

const EvidenceSection = () => (
  <div id="evidence" className="mb-16">
    <div className="border-l-2 border-copper-500 pl-6 mb-8">
      <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">
        Evidence
      </span>
      <h2 className="text-2xl font-bold text-white mb-1">Checkable Claims</h2>
      <p className="text-sm text-slate-400">
        Every checkable claim below carries the command or source that confirms it. The limits are labelled as limits.
      </p>
    </div>

    <div className="space-y-8">
      {PROOF_EVIDENCE.map((tier) => {
        const Icon = EVIDENCE_TIER_ICON[tier.id] ?? CheckCircle2;
        const isLimits = tier.id === 'not-claimed';
        return (
          <div
            key={tier.id}
            className={`border rounded-lg p-6 ${
              isLimits
                ? 'border-white/5 bg-slate-900/40'
                : 'border-copper-500/20 bg-slate-900/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${isLimits ? 'text-slate-400' : 'text-copper-400'}`} />
              <h3 className="text-lg font-semibold text-white">{tier.title}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-5 max-w-3xl">{tier.note}</p>

            <ul className="space-y-4">
              {tier.claims.map((c, i) => (
                <li key={i} className="border-l border-white/10 pl-4">
                  <p className="text-slate-300 text-sm leading-relaxed mb-1.5">{c.claim}</p>
                  {c.kind === 'check' ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <code className="text-[11px] font-mono text-slate-500 min-w-0 max-w-full whitespace-pre-wrap break-words">
                        {c.verify}
                      </code>
                      {(c.sources ?? []).map((src, si) => {
                        const sourceLabel = (c.sources ?? []).length > 1 ? `source ${si + 1}` : 'check it';
                        return (
                          <a
                            key={si}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${sourceLabel}: ${c.claim}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-copper-500 hover:text-copper-400 transition-colors"
                          >
                            {sourceLabel}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
                      Stated limitation
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  </div>
);

// A plain download: says what the file is, never dresses it as an enforcement
// artifact (2026-09-29 site audit).
const DownloadCard = ({ resource }: { resource: Resource }) => (
  <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6 hover:border-copper-500/30 transition-all group flex flex-col">
    <span className="text-xs font-mono uppercase tracking-widest text-copper-400 mb-3">
      {resource.downloadLabel ?? resource.title} · {resource.fileType.toUpperCase()}
    </span>
    <h3 className="text-lg font-semibold text-white mb-2">{resource.title}</h3>
    <p className="text-sm text-slate-400 mb-5 leading-relaxed flex-grow">{resource.description}</p>
    <a
      href={resource.filePath}
      download={resource.fileName}
      className="inline-flex items-center gap-2 text-sm text-copper-500 hover:text-copper-400 font-mono transition-colors"
    >
      <Download className="w-4 h-4" />
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
    <div className="sticky top-16 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="Layer navigation">
          {LAYER_JUMP_LINKS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={e => {
                e.preventDefault();
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest transition-colors ${
                active === id
                  ? 'bg-copper-500/15 text-copper-400 border border-copper-500/30'
                  : 'text-slate-400 hover:text-slate-300 border border-transparent'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
};

const DiagramDownloads = ({ basePath, name }: { basePath: string; name: string }) => (
  <div className="flex items-center gap-4 mt-4">
    <a href={`${basePath}.svg`} download className="inline-flex items-center gap-2 text-sm font-mono text-copper-500 hover:text-copper-400 transition-colors">
      <Download className="w-4 h-4" /> {name} (SVG)
    </a>
    <a href={`${basePath}.png`} download className="inline-flex items-center gap-2 text-sm font-mono text-slate-400 hover:text-slate-300 transition-colors">
      <Download className="w-4 h-4" /> {name} (PNG)
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
  Pick<RouteMeta, 'title' | 'description' | 'ogImage' | 'ogType' | 'datePublished'>
>;

const usePageMeta = (override?: PageMetaOverride, opts?: { noindex?: boolean }) => {
  const { pathname } = useLocation();
  const noindex = opts?.noindex ?? false;
  const overrideTitle = override?.title;
  const overrideDescription = override?.description;
  const overrideOgImage = override?.ogImage;
  const overrideOgType = override?.ogType;
  const overrideDatePublished = override?.datePublished;

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

    // Type-scoped properties, from the SAME helper the static renderer uses, so
    // the hydrated head and the served head cannot disagree. Remove before add:
    // the sets are disjoint today, but this order stays correct if they overlap.
    const { add: typeScopedAdd, remove: typeScopedRemove } = typeScopedMetaTags({
      ogType,
      datePublished,
    });
    typeScopedRemove.forEach(removeMetaByProperty);
    typeScopedAdd.forEach(([prop, content]) => upsertMetaByProperty(prop, content));

    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:site", "@danmercede");
    upsertMetaByName("twitter:creator", "@danmercede");
    upsertMetaByName("twitter:title", title);
    upsertMetaByName("twitter:description", description);
    upsertMetaByName("twitter:image", ogImageUrl);

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
    overrideOgType,
    overrideDatePublished,
    noindex,
  ]);
};

const ResourcesPage = () => {
  usePageMeta();
  const layers = [1, 2, 3, 4] as const;

  return (
    <div className="pt-20">
      <LayerJumpBar />
      <Section>
        <SectionHeader as="h1" title="Proof" subtitle="Evidence, approach, and resources" />
        <p className="text-slate-300 text-lg max-w-3xl mb-12">
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
            <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">Approach</span>
            <h2 className="text-2xl font-bold text-white mb-1">How the systems are built</h2>
            <p className="text-sm text-slate-400">These diagrams explain the design. They are not measured outcomes.</p>
          </div>
        </div>

        {/* Signature Diagram, Runtime Execution Control Plane Architecture */}
        <div id="control-plane" className="mb-16">
          <div className="w-full rounded-lg border border-white/10 bg-slate-900/40 overflow-hidden mb-6">
            <img
              src="/assets/runtime-governance/diagrams/control-plane-architecture/runtime-governance-control-plane-architecture-v1.svg"
              alt="Runtime Execution Control Plane Architecture, four-layer deterministic enforcement cascade: Authority Gate, Immutable Receipts, Drift Guard, Gated Substrate"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
          <div className="max-w-4xl">
            <p className="text-base text-slate-300 leading-relaxed">
              Governance is enforced at four deterministic boundaries. Authority. Attestation. Behavioral Constraint. Physical Isolation.
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

        {/* 4-Layer Mini Diagram */}
        <div className="mb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {layers.map(layer => (
              <div key={layer} className="border border-white/5 bg-slate-900/30 rounded-lg p-4 text-center">
                <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">L{layer}</span>
                <span className="text-sm font-semibold text-white block mb-1">{LAYER_NAMES[layer]}</span>
                <span className="text-xs text-slate-400 leading-tight block">{LAYER_INVARIANTS[layer]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Diagram, Gated Execution Pipeline (between L1 and L2) */}
        <div id="gate-cascade" className="mb-16">
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">Enforcement Architecture</span>
            <h2 className="text-2xl font-bold text-white mb-1">Deterministic Gate Cascade</h2>
            <p className="text-sm text-slate-400">PLAN &rarr; EXECUTE &rarr; REVIEW &rarr; APPROVE: enforcement evaluated at every boundary.</p>
          </div>
          <p className="text-base text-slate-300 mb-6">Every state mutation traverses three deterministic gates.</p>
          <div className="w-full rounded-lg border border-white/10 bg-slate-900/40 overflow-hidden mb-4">
            <img
              src="/assets/runtime-governance/diagrams/gated-execution-pipeline/runtime-governance-gated-execution-pipeline-v1.svg"
              alt="Gated Execution Pipeline, deterministic gate cascade: PLAN, EXECUTE, REVIEW, APPROVE with enforcement points at each boundary"
              className="w-full h-auto"
              loading="lazy"
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

        {/* Diagram, Governance Economics Scorecard (above Case Studies) */}
        <div id="economics" className="mb-16">
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">Economics</span>
            <h2 className="text-2xl font-bold text-white mb-1">Governance Converts Risk Into Measurable Economics</h2>
            <p className="text-sm text-slate-400">Cost per successful task. Escalation rate. Cycle-time compression. Audit defensibility.</p>
          </div>
          <p className="text-base text-slate-300 mb-6">Governance converts operational risk into predictable unit economics.</p>
          <div className="w-full rounded-lg border border-white/10 bg-slate-900/40 overflow-hidden mb-4">
            <img
              src="/assets/runtime-governance/diagrams/governance-economics-scorecard/runtime-governance-governance-economics-scorecard-v1.svg"
              alt="Governance Economics Scorecard, ROI framework: cost per successful task, escalation rate reduction, cycle-time compression, audit defensibility metrics"
              className="w-full h-auto"
              loading="lazy"
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
              <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">Reference Architectures</span>
              <h2 className="text-2xl font-bold text-white mb-1">Reference Enforcement Architectures</h2>
              <p className="text-sm text-slate-400">Reference enforcement architectures by industry and regulatory surface. Illustrative patterns, not measured client outcomes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CASE_STUDIES.map((study, i) => (
                <Link
                  key={i}
                  to={`/case-studies/${study.slug}`}
                  className="border border-white/5 bg-slate-900/20 rounded-lg p-6 hover:border-copper-500/30 transition-all group block"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {study.enforcementLayers.map(l => (
                      <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-copper-500/10 text-copper-400 border border-copper-500/20">
                        L{l}
                      </span>
                    ))}
                    <span className="text-xs font-mono text-slate-400 ml-auto">{study.industry}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-copper-400 transition-colors">
                    {study.title}
                  </h3>
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${study.metrics?.length ? 'mb-4' : ''}`}>
                    {(study.metrics ?? []).map((m, mi) => (
                      <div key={mi} className="text-center p-3 rounded bg-slate-800/60 border border-copper-500/15">
                        <span className="text-xl font-bold text-copper-400 block tabular-nums">{m.value}</span>
                        <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">{study.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-copper-500 group-hover:text-copper-400 font-mono transition-colors">
                    View Enforcement Detail <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {RESOURCES.filter((r) => proofGroupFor(r) === 'resources').map((resource) => (
                <DownloadCard key={resource.fileName} resource={resource} />
              ))}
            </div>
          </div>
        )}

        {/* Commercial and speaking: the speaker one-sheet and the route to Contact, kept apart from evidence */}
        <div id="commercial" className="mb-16">
          <div className="border-l-2 border-copper-500 pl-6 mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-copper-500 block mb-1">Commercial and speaking</span>
            <h2 className="text-2xl font-bold text-white mb-1">Working together</h2>
            <p className="text-sm text-slate-400">The speaker one-sheet describes talks, not results. For hiring, collaboration, or implementation work, use the <Link to="/connect" className="text-copper-400 hover:text-copper-300">Contact page</Link>.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RESOURCES.filter((r) => proofGroupFor(r) === 'commercial').map((resource) => (
              <DownloadCard key={resource.fileName} resource={resource} />
            ))}
          </div>
          <ReadinessScanCTA />
        </div>
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

  return (
    <div className="pt-20">
      <Section>
        <div className="mb-6">
          <Link to="/proof" className="text-copper-500 hover:text-copper-400 font-mono text-xs uppercase tracking-widest inline-flex items-center gap-1">
            ← Proof
          </Link>
        </div>

        <div className="border-l-2 border-copper-500 pl-6 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-2">{study.industry}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{study.title}</h1>
          <p className="text-sm font-semibold text-copper-400 mb-4">{REFERENCE_ARCHITECTURE_NOTICE}</p>
          <p className="text-slate-400 max-w-3xl leading-relaxed">{study.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {(study.metrics ?? []).map((metric, i) => (
            <div key={i} className="border border-white/5 bg-slate-900/40 rounded-lg p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-copper-500 mb-1">{metric.value}</div>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-400">{metric.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6">
            <h2 className="text-sm font-mono uppercase tracking-widest text-copper-500 mb-4">Enforcement Layers</h2>
            <div className="space-y-3">
              {study.layerNames.map((name, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-copper-400 bg-slate-800/60 px-2 py-0.5 rounded border border-white/5">
                    L{study.enforcementLayers[i]}
                  </span>
                  <span className="text-slate-300 text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6">
            <h2 className="text-sm font-mono uppercase tracking-widest text-copper-500 mb-4">Enforcement Points</h2>
            <div className="space-y-2">
              {study.enforcementPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-copper-500/60 mt-0.5 shrink-0" />
                  <span className="text-slate-400 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6 mb-12">
          <h2 className="text-sm font-mono uppercase tracking-widest text-copper-500 mb-4">Commercial Mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {study.commercialMapping.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-copper-500/60 mt-0.5 shrink-0" />
                <span className="text-slate-400 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={study.filePath}
            download={study.fileName}
            className="inline-flex items-center gap-2 px-6 py-3 bg-copper-500 text-slate-950 rounded font-mono text-sm hover:bg-copper-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Reference Architecture
          </a>
          <a
            href={READINESS_SCAN.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-copper-500/30 text-copper-500 rounded font-mono text-sm hover:bg-copper-500/10 transition-colors"
          >
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
  return (
    <div className="pt-20">
      <Section>
        <SectionHeader as="h1" title="Works" subtitle="Build · Selected Essays · Signal" />

        <p className="text-slate-400 text-lg max-w-3xl mb-16">
          Open-source tooling and field-tested patterns from shipping governed agentic systems in production.
        </p>

        {/* Build, open source & tooling */}
        <h2 className="text-copper-500 font-mono text-xs uppercase tracking-widest mb-6">Build: Open Source &amp; Tooling</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Most important first (WORKS_PRIORITY in constants.ts), never by date. */}
          {worksByPriority('Open Source').map((work: Work) => (
            <WorkCard key={work.slug} work={work} />
          ))}
        </div>

        {/* Build, applied agent projects (hackathon-built agent systems;
            competition context lives in each card's description, not the heading). */}
        <h2 className="text-copper-500 font-mono text-xs uppercase tracking-widest mb-6 mt-16">Build: Applied Agent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {worksByPriority('Agent Project').map((work: Work) => (
            <WorkCard key={work.slug} work={work} />
          ))}
        </div>

        {/* Selected essays, a CAPPED pointer into /thoughts (no bodies, no filter) */}
        <h2 className="text-copper-500 font-mono text-xs uppercase tracking-widest mt-20 mb-6">Selected Essays</h2>
        <ul className="space-y-3 max-w-3xl">
          {featured.map((essay) => (
            <li key={essay.slug}>
              <Link
                to={`/thoughts/${essay.slug}`}
                className="group inline-flex items-baseline gap-2 text-slate-300 hover:text-copper-400 transition-colors"
              >
                <span className="text-copper-500/60 font-mono text-xs" aria-hidden="true">→</span>
                <span className="border-b border-transparent group-hover:border-copper-400/40">{essay.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 max-w-3xl">
          <Link to="/thoughts" className="inline-flex items-center text-copper-500/80 font-mono text-xs uppercase tracking-widest hover:text-copper-400">
            Full archive <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Signal, outbound rail */}
        <h2 className="text-copper-500 font-mono text-xs uppercase tracking-widest mt-20 mb-6">Signal</h2>
        <div className="flex flex-wrap gap-6 max-w-3xl">
          <a href={WORKS_HUB.signalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-copper-400 hover:text-copper-300">
            Live signal log <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
          </a>
          <a href={WORKS_HUB.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-copper-400 hover:text-copper-300">
            GitHub <ExternalLink className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
          </a>
        </div>

        {/* CTA, one action: availability → connect */}
        <div className="mt-20 border-l-2 border-copper-500 pl-6 max-w-2xl">
          <p className="text-xl text-white mb-3">{WORKS_HUB.availability}</p>
          <p className="text-base text-slate-300 mb-6">{WORKS_HUB.pilot}</p>
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
  // Operating-journal view. Default ('All lanes') is lane-grouped: a hub-side curation
  // orthogonal to the substrate `category` badge, with a default lane that catches every
  // unclaimed essay so no post is dropped. The substrate category filter (Architecture /
  // Enforcement / Doctrine) is PRESERVED: selecting a category switches to a flat
  // filtered grid (the documented /thoughts index filter).
  const [activeCategory, setActiveCategory] = useState<string>('all');
  // Free-text search over the corpus. Across only 3 substrate categories, the
  // default lane holds the large majority of the essays, so the taxonomy alone does
  // not let a reader find a specific piece. (Stated structurally on purpose: a hard
  // count here would rot on the next substrate refresh.) Search is a THIRD trigger for the flat
  // filtered grid that the category filter already drives (below): the
  // lane-grouped default view is preserved unchanged whenever the query is empty,
  // which is what keeps the AGENTS.md / lanes-spec contract intact.
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const categories = ['all', ...Array.from(new Set(THOUGHTS.map((t: Thought) => t.category)))];
  const claimed = new Set(
    THOUGHT_LANES.flatMap((lane) => (lane.isDefault ? [] : [...(lane.slugs ?? [])])),
  );

  // "/" focuses search, matching the /guides index affordance.
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

  // Category and query compose: the flat grid honours both at once. Both derivations
  // are pure functions in constants.ts so they are unit-testable and the call sites
  // below are source-asserted (no React harness in this repo).
  const matchingThoughts = selectThoughts(THOUGHTS, activeCategory, query);
  const isLaneGroupedView = isLaneGroupedThoughtsView(activeCategory, query);

  const renderCard = (thought: Thought, idx: number) => (
    <Link
      key={idx}
      to={`/thoughts/${thought.slug}`}
      className="block border border-white/5 bg-slate-900/20 rounded-lg p-6 hover:border-copper-500/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono uppercase tracking-widest text-copper-400">{thought.category}</span>
        <span className="text-xs font-mono text-slate-400">{thought.date}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-copper-400 transition-colors">{thought.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{thought.preview}</p>
      <span className="mt-4 inline-block text-copper-500/80 font-mono text-xs uppercase tracking-widest group-hover:text-copper-400">
        Read &rarr;
      </span>
    </Link>
  );

  return (
    <div className="pt-20">
      <Section>
        <SectionHeader as="h1" title="Thought Direction" subtitle="Notes from the operating layer" />

        <p className="text-slate-400 text-lg max-w-3xl mb-4">
          Essays on governed AI, workflow ownership, operator-led automation, and execution discipline, plus the failure modes that show up when systems meet reality. Same voice as always: enforcement mechanics and architectural proof, not hot takes.
        </p>
        <p className="text-slate-400 text-sm max-w-3xl mb-8">
          Looking for AI strategy or implementation help?{' '}
          <a href={READINESS_SCAN.href} target="_blank" rel="noopener noreferrer" className="text-copper-400 hover:text-copper-300 underline">
            Work with OIA on one workflow.
          </a>
        </p>

        {/* Start here: curated entry into the strongest practical material */}
        <div className="border border-copper-500/20 bg-copper-500/5 rounded-lg p-6 mb-10 max-w-4xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-xl font-bold text-white">Start here</h2>
            <div className="flex flex-wrap gap-4">
              <a href={NEWSLETTER.href} {...linkTargetProps(NEWSLETTER.href)} className="text-xs font-mono uppercase tracking-widest text-copper-400 hover:text-copper-300">Subscribe to {NEWSLETTER.name}</a>
              <a href="/feed.xml" className="text-xs font-mono uppercase tracking-widest text-copper-400 hover:text-copper-300">Follow via RSS</a>
            </div>
          </div>
          <ul className="space-y-4">
            {START_HERE.map((item) => {
              const title = item.kind === 'guide'
                ? GUIDES.find((g) => g.slug === item.slug)?.title
                : THOUGHTS.find((th) => th.slug === item.slug)?.title;
              const to = item.kind === 'guide' ? `/guides/${item.slug}` : `/thoughts/${item.slug}`;
              return (
                <li key={item.slug}>
                  <Link to={to} className="group block">
                    <span className="text-xs font-mono uppercase tracking-widest text-copper-400 mr-2">{item.kind === 'guide' ? 'Guide' : 'Essay'}</span>
                    <span className="text-white font-semibold group-hover:text-copper-400 transition-colors">{title}</span>
                    <span className="block text-sm text-slate-400 mt-1">{item.why}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Category filter (substrate taxonomy). 'All lanes' shows the lane-grouped view. */}
        {/* Spacing lives on this row, not on an empty spacer div: in the lane-grouped default
            view the count <p> below is empty and contributes no box, so this must carry the
            full gap (mb-12) to leave that view's rhythm exactly as it was before search existed. */}
        <div className={`grid gap-5 md:grid-cols-[1fr_22rem] md:items-center ${isLaneGroupedView ? 'mb-12' : 'mb-6'}`}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter essays by substrate category">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
                aria-pressed={activeCategory === cat}
                className={
                  'rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ' +
                  (activeCategory === cat
                    ? 'border-copper-500 bg-copper-500 text-slate-950'
                    : 'border-white/15 text-slate-400 hover:border-copper-500/50 hover:text-white')
                }
              >
                {cat === 'all' ? 'All lanes' : cat}
              </button>
            ))}
          </div>
          <label className="flex h-14 items-center gap-3 border border-white/15 bg-slate-900/30 px-4 focus-within:border-copper-500">
            {/* The kbd hint is aria-hidden: an implicit label concatenates its whole subtree
                into the control's accessible name, which otherwise reads "Search essays /". */}
            <span className="sr-only">Search essays. Press slash to focus.</span>
            <Search size={17} className="text-copper-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, category, or idea"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            <kbd aria-hidden="true" className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-slate-500">/</kbd>
          </label>
        </div>

        {/* Result count. The <p> is mounted UNCONDITIONALLY (only its text is conditional),
            matching the /guides index: an aria-live region inserted into the DOM in the same
            commit as its first content is not reliably announced, so a conditionally mounted
            region silently drops the announcement on the transition OUT of the lane view.
            Keeping one real box in flow also carries the spacing: an empty <div className="mb-6" />
            would self-collapse and its margin would collapse with the filter row's, halving the
            default view's gap rather than preserving it. */}
        <p
          className={`font-mono text-[10px] uppercase tracking-widest text-slate-500 ${isLaneGroupedView ? '' : 'mb-6'}`}
          aria-live="polite"
        >
          {isLaneGroupedView
            ? ''
            : `${matchingThoughts.length} ${matchingThoughts.length === 1 ? 'essay' : 'essays'}${
                normalizedQuery ? ` matching "${query.trim()}"` : ''
              }`}
        </p>

        {isLaneGroupedView ? (
          /* Lane-grouped essays (default operating-journal view) */
          <div className="space-y-16">
            {THOUGHT_LANES.map((lane) => {
              const essays = lane.isDefault
                ? THOUGHTS.filter((t: Thought) => !claimed.has(t.slug))
                : THOUGHTS.filter((t: Thought) => (lane.slugs ?? []).includes(t.slug));
              return (
                <div key={lane.name}>
                  <div className="mb-6 border-l-2 border-copper-500/40 pl-4">
                    <h2 className="text-2xl font-bold text-white">{lane.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">{lane.blurb}</p>
                  </div>
                  {essays.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {essays.map((thought: Thought, idx: number) => renderCard(thought, idx))}
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
          /* Flat grid filtered by the substrate category and/or the search query
             (the documented index filter, widened by search). */
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
        <div className="mt-16 border-l-2 border-copper-500/30 pl-6 max-w-2xl">
          <p className="text-slate-400 text-sm font-mono mb-2">Governing Principle</p>
          <p className="text-slate-300 italic">
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
  // Unknown slugs already get HTTP 404 from the server; keep the hydrated head
  // noindex too, matching the guide and diagram detail pages.
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

  // Full-markdown essay rendering (operator decision 2026-07-10): bodies are
  // authored markdown (headings, code fences, figures) and previously rendered
  // as literal text. The bake side mirrors this via the injector's rendered
  // HTML override, so the crawler-facing body stays content-equivalent.

  return (
    <div className="pt-20">
      <Section>
        <div className="mb-6">
          <Link to="/thoughts" className="text-copper-500 hover:text-copper-400 font-mono text-xs uppercase tracking-widest inline-flex items-center gap-1">
            ← Thoughts
          </Link>
        </div>

        <article className="border-l-2 border-copper-500 pl-6 max-w-3xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-copper-400">
              {thought.category}
            </span>
            <span className="text-xs font-mono text-slate-400">{thought.date}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{thought.title}</h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8 italic">{thought.preview}</p>
          <Markdown source={thought.body} />
        </article>
      </Section>
    </div>
  );
};

const guideSearchText = (guide: Guide) =>
  [guide.title, guide.category, guide.description, guide.lead].join(' ').toLowerCase();

const FEATURED_GUIDES = GUIDES.slice(0, 3);
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
        <div className="relative overflow-hidden border border-white/10 bg-slate-900/30 px-6 py-12 md:px-12 md:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
              maskImage: 'linear-gradient(to right, black, transparent 88%)',
            }}
          />
          <div className="relative z-10 max-w-5xl">
            <p className="mb-7 flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-copper-400">
              <span className="h-2 w-2 rounded-full bg-copper-500 shadow-[0_0_16px_rgba(230,130,73,.8)]" aria-hidden="true" />
              Field notes on governed AI
            </p>
            <h1 className="max-w-5xl text-4xl font-light leading-[1.02] tracking-[-0.045em] text-white md:text-6xl lg:text-7xl">
              Build agents that can act
              <span className="block text-copper-400">and prove what happened.</span>
            </h1>
            <div className="mt-9 grid gap-8 border-t border-white/10 pt-7 md:grid-cols-[1.5fr_1fr] md:items-end">
              <p className="max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
                Long-form technical guides for AI systems that remain legible under pressure:
                authority, evidence, observability, and fail-closed execution.
              </p>
              <dl className="grid grid-cols-3 gap-4 text-right">
                <div><dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Guides</dt><dd className="mt-1 text-2xl font-semibold text-white">{GUIDES.length}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Themes</dt><dd className="mt-1 text-2xl font-semibold text-white">{GUIDE_THEME_COUNT}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Latest</dt><dd className="mt-1 text-sm font-semibold text-white">{GUIDES[0]?.date ?? 'n/a'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-6 md:pt-8">
        <div className="mb-10 grid gap-5 md:grid-cols-[1fr_22rem] md:items-end">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-copper-400">01 / Selected work</p>
            <h2 className="text-3xl font-light tracking-tight text-white md:text-5xl">Start with the signal.</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">The newest field notes: the fastest route into the current body of work.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {FEATURED_GUIDES.map((guide: Guide, index: number) => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className="group flex min-h-[22rem] flex-col border border-white/10 bg-slate-900/25 transition-all duration-300 hover:-translate-y-1 hover:border-copper-500/40"
            >
              <div className={'relative h-32 overflow-hidden border-b border-white/10 ' + (index === 1 ? 'bg-copper-600/70' : index === 2 ? 'bg-slate-800' : 'bg-slate-900')}>
                <span className="absolute left-6 top-5 font-mono text-xs text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                <Layers size={48} className="absolute bottom-5 right-6 text-white/15" aria-hidden="true" />
                <span className="absolute bottom-5 left-6 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">{guide.category}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-copper-400">Guide · {guide.date}</p>
                <h3 className="text-xl font-semibold leading-snug text-white group-hover:text-copper-400">{guide.title}</h3>
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-400">{guide.lead}</p>
                <span className="mt-auto flex items-center justify-between border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-widest text-copper-400">
                  Read field note <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="guide-library" className="pt-8 md:pt-12">
        <div className="mb-9 grid gap-7 md:grid-cols-[1fr_minmax(20rem,32rem)] md:items-end">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-copper-400">02 / Guide library</p>
            <h2 className="text-3xl font-light tracking-tight text-white md:text-5xl">Follow the question.</h2>
          </div>
          <label className="flex h-14 items-center gap-3 border border-white/15 bg-slate-900/30 px-4 focus-within:border-copper-500">
            <span className="sr-only">Search guides</span>
            <Search size={17} className="text-copper-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, category, or idea"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            <kbd aria-hidden="true" className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-slate-500">/</kbd>
          </label>
        </div>

        <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Filter guides by recurring theme">
          {GUIDE_LENSES.map((lens) => (
            <button
              key={lens.id}
              type="button"
              onClick={() => setActiveLens(lens.id)}
              aria-pressed={activeLens === lens.id}
              className={'rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ' + (activeLens === lens.id ? 'border-copper-500 bg-copper-500 text-slate-950' : 'border-white/15 text-slate-400 hover:border-copper-500/50 hover:text-white')}
            >
              {lens.label}
            </button>
          ))}
        </div>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500" aria-live="polite">
          {visibleGuides.length} {visibleGuides.length === 1 ? 'guide' : 'guides'}
        </p>
        <div className="border-t border-white/15">
          {visibleGuides.map((guide: Guide, index: number) => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className="group grid min-h-28 grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-white/10 py-5 transition-colors hover:bg-white/[0.025] md:grid-cols-[4rem_9rem_1fr_7rem_2rem] md:px-3"
            >
              <span className="font-mono text-xs text-copper-400">{String(index + 1).padStart(2, '0')}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-slate-500 md:block">{guide.category}</span>
              <span className="text-lg font-medium leading-snug text-white group-hover:text-copper-400 md:text-2xl">{guide.title}</span>
              <span className="hidden text-right font-mono text-[10px] text-slate-500 md:block">{guide.date}</span>
              <ChevronRight size={18} className="text-copper-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />
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
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-copper-400">03 / Recurring themes</p>
            <h2 className="text-3xl font-light tracking-tight text-white md:text-4xl">The same hard questions, from different angles.</h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">The formats change. The doctrine does not. Use a theme as a lens into the corpus.</p>
          </div>
          <div className="grid gap-px bg-white/10 md:grid-cols-3">
            {GUIDE_LENSES.filter((lens) => lens.id !== 'all').map((lens, index) => (
              <button
                key={lens.id}
                type="button"
                onClick={() => {
                  setActiveLens(lens.id);
                  setQuery('');
                  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  document.getElementById('guide-library')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                }}
                className="group bg-slate-950 p-6 text-left hover:bg-slate-900"
              >
                <span className="font-mono text-xs text-copper-400">0{index + 1}</span>
                <span className="mt-8 block text-xl font-semibold text-white group-hover:text-copper-400">{lens.label}</span>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{lens.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
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
      </Section>
    </div>
  );
};

const GuideDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find((g: Guide) => g.slug === slug);
  // Unknown /guides/<slug> is thin "not found" content, noindex it (soft-404),
  // matching the catch-all 404 policy.
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

  return (
    <div className="pt-20">
      <Section>
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link to="/guides" className="text-copper-500 hover:text-copper-400 font-mono text-xs uppercase tracking-widest inline-flex items-center gap-1">
              ← Guides
            </Link>
          </div>

          <article>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-copper-400">{guide.category}</span>
              <span className="text-xs font-mono text-slate-400">{guide.date}</span>
              {guide.reviewed && (
                <span className="text-xs font-mono text-slate-400">Reviewed {guide.reviewed}</span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">{guide.title}</h1>
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-10 border-l-2 border-copper-500 pl-5">{guide.lead}</p>
            <Markdown source={guide.body} />
          </article>
        </div>
      </Section>
    </div>
  );
};

const DiagramsPage = () => {
  usePageMeta();
  return (
    <div className="pt-20">
      <Section>
        <SectionHeader as="h1" title="Diagrams" subtitle="Systems · Architecture · Agentic Patterns" />

        <p className="text-slate-400 text-lg max-w-3xl mb-12">
          Visual explainers for governed AI architecture: monitoring versus enforcement, non-repudiation, authority decay, the liability equation, and the systems patterns behind the doctrine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DIAGRAMS.map((diagram: Diagram) => (
            <Link
              key={diagram.slug}
              to={`/diagrams/${diagram.slug}`}
              className="block border border-white/5 bg-slate-900/20 rounded-lg overflow-hidden hover:border-copper-500/30 transition-all group"
            >
              <div className="bg-slate-900/40 border-b border-white/5">
                <img
                  src={diagram.src}
                  alt={diagram.alt}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-copper-400">Diagram</span>
                  <span className="text-xs font-mono text-slate-400">{diagram.date}</span>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-copper-400 transition-colors">{diagram.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{diagram.caption}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
};

const DiagramDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const diagram = DIAGRAMS.find((d: Diagram) => d.slug === slug);
  // Unknown /diagrams/<slug> is thin "not found" content, noindex it (soft-404),
  // matching the catch-all 404 + GuideDetailPage policy.
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
            <Link to="/diagrams" className="text-copper-500 hover:text-copper-400 font-mono text-xs uppercase tracking-widest inline-flex items-center gap-1">
              ← Diagrams
            </Link>
          </div>

          <article>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-copper-400">Diagram</span>
              <span className="text-xs font-mono text-slate-400">{diagram.date}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">{diagram.title}</h1>
            <figure>
              <div className="w-full rounded-lg border border-white/10 bg-slate-900/40 overflow-hidden">
                <img
                  src={diagram.src}
                  alt={diagram.alt}
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
              <figcaption className="text-slate-300 text-base md:text-lg leading-relaxed mt-5 border-l-2 border-copper-500 pl-5">
                {diagram.caption}
              </figcaption>
            </figure>
          </article>
        </div>
      </Section>
    </div>
  );
};

const ConnectPage = () => {
  usePageMeta();
  return (
  <div className="pt-20">
    <Section>
      <SectionHeader as="h1" title="Contact Dan" subtitle="Email and LinkedIn" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <p className="text-xl text-white">
            Email reaches me directly. Pick the reason that fits and the subject line fills in.
          </p>
          <p className="text-slate-400">
            Or write to <a href={`mailto:${CONTACT_EMAIL}`} onClick={() => trackEvent(window, 'generate_lead', { method: 'email' })} className="text-copper-400 hover:text-copper-300">{CONTACT_EMAIL}</a> with anything else.
          </p>
          <a href="https://www.linkedin.com/in/danmercede/" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent(window, 'connect_click', { method: 'linkedin' })} className="flex items-center group p-4 border border-slate-700 hover:border-copper-500 transition-colors bg-slate-950">
            <Linkedin className="w-6 h-6 text-slate-400 group-hover:text-copper-500 mr-4" />
            <div>
              <span className="block text-xs text-slate-400 uppercase tracking-wider">LinkedIn</span>
              <span className="text-white">linkedin.com/in/danmercede</span>
            </div>
          </a>
        </div>

        <div className="space-y-4">
          {CONTACT_INTENTS.map((intent) => {
            const external = Boolean(intent.href);
            const href = contactHref(intent);
            return (
              <a
                key={intent.id}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={external ? undefined : () => trackEvent(window, 'generate_lead', { method: 'email', intent: intent.id })}
                className="flex items-start group p-5 border border-slate-700 hover:border-copper-500 transition-colors bg-slate-950"
              >
                {external ? (
                  <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-copper-500 mr-4 mt-1 flex-shrink-0" />
                ) : (
                  <Mail className="w-5 h-5 text-slate-400 group-hover:text-copper-500 mr-4 mt-1 flex-shrink-0" />
                )}
                <div>
                  <span className="block text-white font-semibold">{intent.label}</span>
                  <span className="block text-sm text-slate-400 mt-1">{intent.detail}</span>
                </div>
              </a>
            );
          })}
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
      <div className="bg-slate-900/40 p-10 border border-white/5 max-w-2xl">
        <div className="space-y-6 text-slate-400">
          <div>
            <h2 className="text-white text-sm uppercase tracking-widest mb-1">Operating Entity</h2>
            <p>Orion Apex Capital</p>
          </div>

          <div>
            <h2 className="text-white text-sm uppercase tracking-widest mb-1">Responsible Person</h2>
            <p>Dan Mercede</p>
          </div>

          <div>
            <h2 className="text-white text-sm uppercase tracking-widest mb-1">Contact</h2>
            <p>contact@danmercede.com</p>
          </div>

          <div>
            <h2 className="text-white text-sm uppercase tracking-widest mb-1">Jurisdiction</h2>
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
  return (
    <>
      <ScrollToTop />
      <Analytics />
      <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-copper-500 selection:text-white overflow-hidden">
        <ConstellationBackground />
        <a
          href="#main-content"
          onClick={e => {
            // Focus the main region without writing #main-content into the route
            // hash, which the ecosystem page interprets as an expanded-venture slug.
            e.preventDefault();
            const main = document.getElementById('main-content');
            if (main) {
              main.focus();
              const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              main.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            }
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-copper-500 focus:text-white focus:rounded"
        >Skip to content</a>
        <Navigation />

        <main id="main-content" tabIndex={-1} className="relative z-10 focus:outline-none">
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
