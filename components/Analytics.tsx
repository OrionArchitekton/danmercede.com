import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { resolveGaConfig, type GaRuntimeConfig } from '../analytics/gaConfig';

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

  window.dataLayer = window.dataLayer || [];
  const gtag: (...args: unknown[]) => void = (...args) => {
    window.dataLayer!.push(args);
  };
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
    window.gtag?.('event', 'page_view', {
      page_path: `${pathname}${search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
};

// Single mount point for all site instrumentation. GA4 is env-gated (above); the
// Vercel widgets are cookieless and auto-no-op when not on Vercel production.
const Analytics = () => (
  <>
    <GoogleAnalytics />
    <VercelAnalytics />
    <SpeedInsights />
  </>
);

export default Analytics;
