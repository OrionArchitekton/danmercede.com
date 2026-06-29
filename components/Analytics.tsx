import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { resolveGaConfig, createGtag, type GaRuntimeConfig } from '../analytics/gaConfig';

// Resolved once from the build-time env. Null => GA is a no-op everywhere (dev,
// preview, or any deploy without VITE_GA_MEASUREMENT_ID). See analytics/gaConfig.
const gaConfig = resolveGaConfig(import.meta.env.VITE_GA_MEASUREMENT_ID);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gtagLoaded = false;

// Idempotent: install the gtag stub + Consent Mode default + config and inject
// the loader <script> exactly once. The consent default is pushed BEFORE config
// so GA's very first hit already reflects the privacy posture (ad signals denied,
// analytics granted). anonymize_ip + send_page_view:false live in cfg.configParams.
function ensureGtagLoaded(cfg: GaRuntimeConfig): void {
  if (gtagLoaded || typeof window === 'undefined') return;
  gtagLoaded = true;

  // Canonical arguments-form stub: gtag.js ignores array-form dataLayer entries,
  // so commands must be pushed as `arguments` objects (see createGtag).
  const gtag = createGtag(window);
  window.gtag = gtag;

  gtag('consent', 'default', cfg.consentDefaults);
  gtag('js', new Date());
  gtag('config', cfg.measurementId, cfg.configParams);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.measurementId)}`;
  document.head.appendChild(script);
}

// Fires a GA4 page_view on initial mount and on every in-app navigation. Because
// the config sets send_page_view:false, this is the ONLY page_view source, so a
// react-router navigation is counted exactly once (no auto+manual double-count).
const GoogleAnalytics = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!gaConfig) return;
    ensureGtagLoaded(gaConfig);
    // Defer the send one frame: this <Analytics> effect runs BEFORE the routed
    // page's usePageMeta effect in the same commit (it is a sibling mounted
    // earlier in the tree), so document.title still holds the PREVIOUS route's
    // title here. requestAnimationFrame fires after the commit's effects flush,
    // once usePageMeta has set the new title — so page_path and page_title agree.
    const raf = requestAnimationFrame(() => {
      window.gtag?.('event', 'page_view', {
        page_path: `${pathname}${search}`,
        page_location: window.location.href,
        page_title: document.title,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, search]);

  return null;
};

// Single mount point for all site instrumentation. ALL of it — GA4 and the Vercel
// widgets — is gated on the production-only VITE_GA_MEASUREMENT_ID switch (via
// gaConfig), so dev and preview deploys mount nothing and emit nothing. The
// Vercel widgets are otherwise cookieless and per-environment.
const Analytics = () => {
  if (!gaConfig) return null;
  return (
    <>
      <GoogleAnalytics />
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
};

export default Analytics;
