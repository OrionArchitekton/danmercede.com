import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Menu, X, ExternalLink, Linkedin, Mail, Shield, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Download, FileText, Layers } from 'lucide-react';
import ConstellationBackground from './components/ConstellationBackground';
import { NAV_ITEMS, HERO_CONTENT, PILLARS, BUILD_AREAS, SIGNALS, BELIEFS, VENTURES, PRIMARY_VENTURES, READINESS_SCAN, TARGET_AUDIENCE, FOOTER_DATA, getImageMeta, RESOURCES, CASE_STUDIES, THOUGHTS } from './constants';

import { Venture, Resource, CaseStudy, Thought } from './types';

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

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-16 border-l-2 border-copper-500 pl-6">
    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{title}</h2>
    {subtitle && <p className="text-copper-400 font-mono text-sm tracking-widest uppercase">{subtitle}</p>}
  </div>
);

// --- Layout Components ---

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tighter text-white">
          DAN<span className="text-copper-500">MERCEDE</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex space-x-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium uppercase tracking-wider hover:text-copper-500 transition-colors ${location.pathname === item.path ? 'text-copper-500' : 'text-slate-400'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-20 w-full bg-slate-950 border-b border-copper-500/30">
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
        <h4 className="text-white font-bold tracking-widest uppercase mb-1">Dan Mercede</h4>
        <p className="text-slate-500 text-xs font-mono mb-1">Founder & Systems Architect</p>
        <p className="text-slate-600 text-xs">{FOOTER_DATA.entity}</p>
      </div>
      <div className="flex space-x-6 text-slate-500">
        <Link to="/legal" className="text-xs hover:text-copper-500 cursor-pointer transition-colors">Legal</Link>
        <Link to="/privacy" className="text-xs hover:text-copper-500 cursor-pointer transition-colors">Privacy</Link>
        <Link to="/imprint" className="text-xs hover:text-copper-500 cursor-pointer transition-colors">Imprint</Link>
      </div>
    </div>
  </footer>
);

// --- Pages ---

const HomePage = () => {
  return (
    <>
      {/* Hero */}
      <section className="min-h-[90vh] flex flex-col pt-20 relative">
        <div className="flex-grow flex items-center my-12 md:my-0">
          <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 mb-6 border border-copper-500/30 rounded-full bg-copper-500/5">
                <span className="text-copper-400 text-xs font-mono tracking-widest uppercase">Runtime Governance Architect</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tighter">
                {HERO_CONTENT.name}
              </h1>
              <p className="text-xl md:text-2xl text-slate-300 mb-4 font-light">
                {HERO_CONTENT.positioning}
              </p>
              <p className="text-slate-500 mb-10 max-w-md">
                {HERO_CONTENT.philosophy}
              </p>
              {/* Hero CTA - Single Conversion Path */}
              <div className="flex flex-col gap-4">
                <a
                  href={READINESS_SCAN.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-copper-500 bg-copper-500 text-slate-950 hover:bg-copper-400"
                >
                  {READINESS_SCAN.cta}
                </a>
                <p className="text-slate-600 text-xs font-mono max-w-md">
                  Deliverables: {READINESS_SCAN.deliverables.join(' · ')}
                </p>
              </div>
            </div>

            {/* Image Placeholder */}
            <div className="relative aspect-[4/5] bg-slate-900 border border-slate-800 rounded-sm overflow-hidden group">
              <img
                src="/dan-mercede-founder-headshot-sm.png"
                alt={getImageMeta("/dan-mercede-founder-headshot-sm.png").alt}
                title="Dan Mercede — Founder of Cosmocrat"
                width="1200"
                height="1500"
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
            <span className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
              If governance isn't enforced at runtime, it isn't governance.
            </span>
            <div className="h-px flex-grow bg-white/5"></div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <Section className="bg-slate-900/20 pt-10 md:pt-16 border-t border-white/5 md:border-t-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((pillar, idx) => (
            <div key={idx} className="p-6 border border-white/5 hover:border-copper-500/30 transition-colors group">
              <pillar.icon className="w-8 h-8 text-copper-500 mb-4 group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-white font-semibold mb-2">{pillar.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* What I Build */}
      <Section>
        <SectionHeader title="Architecture" subtitle="Core Competencies" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {BUILD_AREAS.map((area, idx) => (
            <div key={idx} className="flex flex-col items-start p-6 border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 hover:border-copper-500/30 transition-all group h-full">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-slate-800/50 rounded-sm mr-4 group-hover:bg-copper-500/10 transition-colors">
                  <area.icon className="w-6 h-6 text-slate-400 group-hover:text-copper-500 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{area.label}</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed border-l border-slate-800 pl-4 group-hover:border-copper-500/50 transition-colors">
                {area.description}
              </p>
            </div>
          ))}
        </div>

        {/* System Interoperability Anchor */}
        <div className="border-t border-white/5 pt-8">
          <p className="text-center text-slate-500 text-sm max-w-3xl mx-auto">
            Each entity operates independently but shares a common governance framework and capital structure managed by <span className="text-slate-400">Orion Apex Capital</span>.
          </p>
        </div>
      </Section>

      {/* Signal Strip */}
      <div className="border-y border-white/5 bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16">
          {SIGNALS.map((signal, idx) => (
            <span key={idx} className="text-slate-500 font-mono text-xs md:text-sm uppercase tracking-widest">
              {signal}
            </span>
          ))}
        </div>
      </div>

      {/* Final CTA Strip - Single Conversion Path */}
      <Section className="py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-4">Ready to harden your AI stack?</p>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Runtime Governance Readiness Scan
          </h3>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            A focused assessment that maps your control-plane gaps, identifies failure modes, and delivers a 30/60/90 hardening roadmap.
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
              <span key={i} className="text-slate-600 text-xs font-mono border border-white/5 px-3 py-1 rounded-sm">{d}</span>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
};

const AboutPage = () => (
  <div className="pt-20">
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <SectionHeader title="The Throughline" subtitle="Canonical Narrative" />
          <div className="prose prose-invert prose-lg text-slate-400">
            <p className="text-xl text-white font-light mb-4">
              From operations to architecture, the mission has remained constant: <span className="text-copper-400">Governance over chaos.</span>
            </p>
            <p className="text-lg text-white/90 font-normal mb-8 leading-relaxed">
              I build governed AI operating systems — systems that remember, decide, execute, and remain auditable under real conditions.
            </p>
            <p className="mb-6">
              I don't believe in disruption for its own sake. I believe in systems that endure. My background isn't a straight line, but a thematic progression from managing complex human workflows to building the digital substrates that automate them.
            </p>
            <div className="flex items-center space-x-4 my-12 p-6 border border-copper-500/20 bg-copper-500/5 rounded-sm">
              <Shield className="w-12 h-12 text-copper-500 flex-shrink-0" />
              <div>
                <h4 className="text-white font-bold uppercase tracking-wide text-sm">Core Philosophy</h4>
                <p className="text-sm text-slate-300 mt-1">
                  Governance is the seatbelt. Execution is the engine. Without constraints, intelligence becomes liability.
                </p>
              </div>
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
              title="Dan Mercede — Founder of Cosmocrat"
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

const EcosystemPage = () => {
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

  const renderVentureDetail = (venture: Venture) => (
    <div className="col-span-1 md:col-span-2 bg-slate-950 border-y border-copper-500/30 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="absolute top-0 left-0 w-1 h-full bg-copper-500"></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 p-8 md:p-12 items-start">
        <div className="lg:col-span-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            {venture.name}
            <span className="text-slate-500 font-light">—</span>
            <span className="text-copper-400 font-light">{venture.role}</span>
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Role in the Ecosystem</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.ecosystemRole}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Relationship to the System</h4>
              <p className="text-slate-300 leading-relaxed max-w-2xl">{venture.systemRelationship}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Operating Constraints</h4>
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
              <span className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Entity Status</span>
              <span className="text-white font-mono text-sm">{venture.status}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Canonical Ref</span>
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
      {/* Primary: Runtime Governance Stack */}
      <Section>
        <SectionHeader title="Runtime Governance Stack" subtitle="Core Systems" />
        <p className="text-slate-400 mb-12 max-w-3xl -mt-10">
          The platform and the implementation arm. Cosmocrat is the Governed AI Operating System. Orion Intelligence Agency deploys and hardens it in production.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min">
          {primaryVentures.map((venture) => {
            const isCosmocrat = venture.name === 'Cosmocrat';
            const isExpanded = expandedSlug === venture.slug;

            return (
              <React.Fragment key={venture.slug}>
                <div
                  onClick={() => toggleExpand(venture.slug)}
                  className={`group relative border p-8 transition-all duration-300 cursor-pointer flex flex-col h-full ${isCosmocrat
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
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      {venture.name}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {venture.description}
                    </p>
                  </div>
                  <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-4">
                    <span className={`text-xs font-mono uppercase tracking-widest transition-colors ${isExpanded ? 'text-copper-500' : 'text-slate-600 group-hover:text-copper-500'}`}>
                      {isExpanded ? 'Close Details' : 'View Details'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-copper-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600 group-hover:text-copper-500 transition-colors" />
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
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-4">Enterprise Entry Point</p>
          <a
            href={READINESS_SCAN.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 border border-copper-500 bg-copper-500 text-slate-950 hover:bg-copper-400"
          >
            {READINESS_SCAN.cta}
          </a>
          <p className="text-slate-600 text-xs font-mono mt-4">
            {READINESS_SCAN.deliverables.join(' · ')}
          </p>
        </div>
      </div>

      {/* Secondary: Extended Ecosystem */}
      <Section>
        <div
          onClick={() => setShowSecondary(!showSecondary)}
          className="cursor-pointer flex items-center justify-between mb-8 group"
        >
          <div className="border-l-2 border-slate-700 pl-6">
            <h2 className="text-2xl font-bold text-slate-400 group-hover:text-slate-300 transition-colors tracking-tight">Extended Ecosystem</h2>
            <p className="text-slate-600 font-mono text-sm tracking-widest uppercase">Supporting Ventures & Vehicles</p>
          </div>
          {showSecondary ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
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
                    onClick={() => toggleExpand(venture.slug)}
                    className={`group relative bg-slate-900/30 border p-6 transition-all duration-300 cursor-pointer flex flex-col h-full ${isExpanded
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
                      <p className="text-xs font-mono uppercase tracking-widest mb-1 text-slate-600">{venture.role}</p>
                      <h3 className="text-xl font-bold mb-3 text-slate-300 group-hover:text-white transition-colors">{venture.name}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{venture.description}</p>
                    </div>
                    <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-3">
                      <span className={`text-xs font-mono uppercase tracking-widest transition-colors ${isExpanded ? 'text-copper-500' : 'text-slate-700 group-hover:text-slate-500'}`}>
                        {isExpanded ? 'Close' : 'Details'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-copper-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
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
        <p className="text-slate-600 font-mono text-xs uppercase tracking-widest max-w-2xl mx-auto px-6">
          Each entity operates independently under a shared governance framework. The runtime stack (Cosmocrat + OIA) is the enterprise entry point.
        </p>
      </div>
    </div>
  );
};

// --- Resources Page ---
const LAYER_NAMES: Record<number, string> = {
  1: 'Authority Gate',
  2: 'Immutable Receipts',
  3: 'Drift Guard',
  4: 'Gated Substrate',
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  pptx: 'PowerPoint',
};

const CATEGORY_LABELS: Record<string, string> = {
  'lead-magnet': 'Lead Magnet',
  'template': 'Template',
  'sales-collateral': 'Sales Collateral',
  'diagram': 'Diagram',
  'deck': 'Deck',
};

const ResourcesPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const categories = ['all', ...Array.from(new Set(RESOURCES.map(r => r.category)))];

  const filtered = activeCategory === 'all'
    ? RESOURCES
    : RESOURCES.filter(r => r.category === activeCategory);

  return (
    <div className="pt-20">
      <Section>
        <SectionHeader title="Resources" subtitle="Enforcement Artifacts" />
        <p className="text-slate-400 max-w-3xl mb-12">
          Downloadable artifacts mapped to the four-layer enforcement stack. Each resource references runtime enforcement points, produces audit-ready evidence, and maps to enterprise risk reduction.
        </p>

        <div className="flex flex-wrap gap-2 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-widest transition-all ${
                activeCategory === cat
                  ? 'bg-copper-500 text-white'
                  : 'border border-white/10 text-slate-500 hover:text-slate-300 hover:border-copper-500/30'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((resource, i) => (
            <div
              key={i}
              className="border border-white/5 bg-slate-900/20 rounded-lg p-6 hover:border-copper-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-copper-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    {CATEGORY_LABELS[resource.category] || resource.category}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  {FILE_TYPE_LABELS[resource.fileType] || resource.fileType} · {resource.fileSize}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-copper-400 transition-colors">
                {resource.title}
              </h3>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                {resource.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {resource.enforcementLayers.map(layer => (
                  <span
                    key={layer}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-slate-800/60 text-slate-400 border border-white/5"
                  >
                    <Layers className="w-3 h-3 text-copper-500/60" />
                    L{layer}
                  </span>
                ))}
              </div>

              <a
                href={resource.filePath}
                download={resource.fileName}
                className="inline-flex items-center gap-2 text-sm text-copper-500 hover:text-copper-400 font-mono transition-colors"
              >
                <Download className="w-4 h-4" />
                Download {FILE_TYPE_LABELS[resource.fileType] || resource.fileType}
              </a>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// --- Case Study Page ---
const CaseStudyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const study = CASE_STUDIES.find(cs => cs.slug === slug);

  if (!study) {
    return (
      <div className="pt-20 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Case Study Not Found</h2>
          <Link to="/resources" className="text-copper-500 hover:text-copper-400 font-mono text-sm">
            ← Back to Resources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <Section>
        <div className="mb-6">
          <Link to="/resources" className="text-copper-500 hover:text-copper-400 font-mono text-xs uppercase tracking-widest inline-flex items-center gap-1">
            ← Resources
          </Link>
        </div>

        <div className="border-l-2 border-copper-500 pl-6 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500 block mb-2">{study.industry}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{study.title}</h1>
          <p className="text-slate-400 max-w-3xl leading-relaxed">{study.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {study.metrics.map((metric, i) => (
            <div key={i} className="border border-white/5 bg-slate-900/40 rounded-lg p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-copper-500 mb-1">{metric.value}</div>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500">{metric.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-copper-500 mb-4">Enforcement Layers</h3>
            <div className="space-y-3">
              {study.layerNames.map((name, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-copper-500/80 bg-slate-800/60 px-2 py-0.5 rounded border border-white/5">
                    L{study.enforcementLayers[i]}
                  </span>
                  <span className="text-slate-300 text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/5 bg-slate-900/20 rounded-lg p-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-copper-500 mb-4">Enforcement Points</h3>
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
          <h3 className="text-sm font-mono uppercase tracking-widest text-copper-500 mb-4">Commercial Mapping</h3>
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-copper-500 text-white rounded font-mono text-sm hover:bg-copper-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Full Case Study
          </a>
          <Link
            to="/connect"
            className="inline-flex items-center gap-2 px-6 py-3 border border-copper-500/30 text-copper-500 rounded font-mono text-sm hover:bg-copper-500/10 transition-colors"
          >
            Schedule Your Readiness Scan
          </Link>
        </div>
      </Section>
    </div>
  );
};

const ThoughtsPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const categories = ['all', ...Array.from(new Set(THOUGHTS.map((t: Thought) => t.category)))];

  const filtered = activeCategory === 'all'
    ? THOUGHTS
    : THOUGHTS.filter((t: Thought) => t.category === activeCategory);

  return (
    <div className="pt-20">
      <Section>
        <SectionHeader title="Thought Direction" subtitle="Doctrine + Architecture" />

        <p className="text-slate-400 text-lg max-w-3xl mb-12">
          Essays on runtime governance, enforcement architecture, and the structural requirements for governed intelligence at scale. No hot takes — only enforcement mechanics and architectural proof.
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded text-sm font-mono uppercase tracking-widest transition-all ${
                activeCategory === cat
                  ? 'bg-copper-500/20 text-copper-400 border border-copper-500/40'
                  : 'bg-slate-900/40 text-slate-500 border border-white/5 hover:border-copper-500/30 hover:text-slate-300'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Thoughts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((thought: Thought, idx: number) => (
            <div
              key={idx}
              className="border border-white/5 bg-slate-900/20 rounded-lg p-6 hover:border-copper-500/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-copper-500/70">
                  {thought.category}
                </span>
                <span className="text-xs font-mono text-slate-600">{thought.date}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-copper-400 transition-colors">
                {thought.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{thought.preview}</p>
            </div>
          ))}
        </div>

        {/* Doctrine anchor */}
        <div className="mt-16 border-l-2 border-copper-500/30 pl-6 max-w-2xl">
          <p className="text-slate-500 text-sm font-mono mb-2">Governing Principle</p>
          <p className="text-slate-300 italic">
            "If governance is not deterministically enforced before state mutation, it is not governance."
          </p>
        </div>
      </Section>
    </div>
  );
};

const ConnectPage = () => (
  <div className="pt-20">
    <Section>
      <SectionHeader title="Connect" subtitle="Initiate Protocol" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <p className="text-xl text-white">
            I engage with builders, operators, and enterprise teams looking to implement governed intelligence systems.
          </p>

          <div className="space-y-4">
            <h4 className="text-copper-500 font-mono text-xs uppercase tracking-widest">Who should reach out</h4>
            <ul className="space-y-2">
              {TARGET_AUDIENCE.map((target, idx) => (
                <li key={idx} className="flex items-center text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-slate-600 mr-3" />
                  {target}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-900/50 p-8 border border-white/5">
          <div className="space-y-6">
            <a href="mailto:contact@danmercede.com" className="flex items-center group p-4 border border-slate-700 hover:border-copper-500 transition-colors bg-slate-950">
              <Mail className="w-6 h-6 text-slate-400 group-hover:text-copper-500 mr-4" />
              <div>
                <span className="block text-xs text-slate-500 uppercase tracking-wider">Email</span>
                <span className="text-white">Direct Contact</span>
              </div>
            </a>

            <a href="https://www.linkedin.com/in/danmercede/" target="_blank" rel="noopener noreferrer" className="flex items-center group p-4 border border-slate-700 hover:border-copper-500 transition-colors bg-slate-950">
              <Linkedin className="w-6 h-6 text-slate-400 group-hover:text-copper-500 mr-4" />
              <div>
                <span className="block text-xs text-slate-500 uppercase tracking-wider">Social</span>
                <span className="text-white">LinkedIn</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Section>
  </div>
);

const LegalPage = () => (
  <div className="pt-20">
    <Section>
      <SectionHeader title="Legal Notice" subtitle="Terms & Conditions" />
      <div className="prose prose-invert prose-lg text-slate-400 max-w-4xl">
        <p className="mb-6">
          <strong>1. Information on this Website</strong><br />
          The content on danmercede.com is provided for informational purposes only. No representations or warranties are made regarding accuracy, completeness, or suitability for any purpose. Any reliance on the information is at your own risk.
        </p>
        <p className="mb-6">
          <strong>2. Intellectual Property</strong><br />
          All systems, methodologies, architectures, and branding referenced on this site are the intellectual property of Orion Apex Capital or their respective operating entities. Unauthorized reproduction, distribution, or use without written permission is prohibited.
        </p>
        <p className="mb-6">
          <strong>3. Limitation of Liability</strong><br />
          The owner is not liable for any direct or indirect loss, damage, or injury arising from the use or inability to use the information provided on this site.
        </p>
      </div>
    </Section>
  </div>
);

const PrivacyPage = () => (
  <div className="pt-20">
    <Section>
      <SectionHeader title="Privacy Policy" subtitle="Data Governance" />
      <div className="prose prose-invert prose-lg text-slate-400 max-w-4xl">
        <p className="mb-6">
          <strong>1. General</strong><br />
          We respect your privacy and treat personal data in accordance with applicable data protection regulations.
        </p>
        <p className="mb-6">
          <strong>2. Data Collection</strong><br />
          This site is a static informational website. We do not collect personal data unless you voluntarily provide it via direct contact (e.g., email).
        </p>
        <p className="mb-6">
          <strong>3. Cookies & Tracking</strong><br />
          We do not use advertising or behavioral tracking cookies. Any local storage used is strictly for essential technical functionality.
        </p>
      </div>
    </Section>
  </div>
);

const ImprintPage = () => (
  <div className="pt-20">
    <Section>
      <SectionHeader title="Imprint" subtitle="Entity Details" />
      <div className="bg-slate-900/40 p-10 border border-white/5 max-w-2xl">
        <div className="space-y-6 text-slate-400">
          <div>
            <h4 className="text-white text-sm uppercase tracking-widest mb-1">Operating Entity</h4>
            <p>Orion Apex Capital</p>
          </div>

          <div>
            <h4 className="text-white text-sm uppercase tracking-widest mb-1">Responsible Person</h4>
            <p>Dan Mercede</p>
          </div>

          <div>
            <h4 className="text-white text-sm uppercase tracking-widest mb-1">Contact</h4>
            <p>contact@danmercede.com</p>
          </div>

          <div>
            <h4 className="text-white text-sm uppercase tracking-widest mb-1">Jurisdiction</h4>
            <p>United States</p>
          </div>
        </div>
      </div>
    </Section>
  </div>
);

// --- App Layout ---

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-copper-500 selection:text-white overflow-hidden">
        <ConstellationBackground />
        <Navigation />

        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/ecosystem" element={<EcosystemPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
            <Route path="/thoughts" element={<ThoughtsPage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/imprint" element={<ImprintPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;