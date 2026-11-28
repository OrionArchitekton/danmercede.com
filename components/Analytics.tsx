import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  resolveGaConfig,
  resolveGaDebugMode,
  createGtag,
  redactUrlForAnalytics,
  redactEventUrl,
  trackEvent,
  type GaRuntimeConfig,
} from '../analytics/gaConfig';
import { guideNextStep } from '../analytics/guideJourney';
import { resolveCfBeaconToken, ensureCfBeacon } from '../analytics/cfBeacon';

const VercelAnalytics = (_props: { beforeSend?: typeof redactEventUrl }) => null;
const SpeedInsights = (_props: { beforeSend?: typeof redactEventUrl }) => null;

// Resolved once from the build-time env. Null => GA is a no-op everywhere (dev,
// preview, or any deploy without VITE_GA_MEASUREMENT_ID). See analytics/gaConfig.
const gaConfig = resolveGaConfig(import.meta.env.VITE_GA_MEASUREMENT_ID);

// Cloudflare Web Analytics beacon token. Null => no beacon anywhere. Independent
// of GA: either can be switched on or off by its own Production env var.
const cfBeaconToken = resolveCfBeaconToken(import.meta.env.VITE_CF_BEACON_TOKEN);

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

  const debugMode = resolveGaDebugMode(window);
  gtag('consent', 'default', cfg.consentDefaults);
  gtag('js', new Date());
  gtag('config', cfg.measurementId, debugMode ? { ...cfg.configParams, debug_mode: true } : cfg.configParams);

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
  const analyticsPath = redactUrlForAnalytics(`${pathname}${search}`);

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
        page_path: analyticsPath,
        page_location: redactUrlForAnalytics(window.location.href),
        page_title: document.title,
        ...(resolveGaDebugMode(window) ? { debug_mode: true } : {}),
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [analyticsPath]);

  useEffect(() => {
    if (!gaConfig || !pathname.startsWith('/guides/')) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[data-guide-next-step][href]') : null;
      if (!anchor) return;
      const step = guideNextStep(pathname, anchor.getAttribute('href') ?? '');
      if (step) trackEvent(window, 'guide_next_step', {
        ...step,
        page_location: redactUrlForAnalytics(window.location.href),
      });
    };
    // Capture before a client-side Link consumes the click. One listener per
    // current route, removed on navigation; native and keyboard clicks both work.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  return null;
};

// Single mount point for all site instrumentation. GA4 and the Vercel widgets are
// gated on the production-only VITE_GA_MEASUREMENT_ID switch (via gaConfig); the
// Cloudflare beacon is gated on VITE_CF_BEACON_TOKEN plus a production-host
// check (via cfBeacon). Dev and preview deploys mount or load nothing.
// Loads the Cloudflare beacon once, after hydration (an effect, so the baked HTML
// and the first client render stay identical). The host and debug checks run in
// the browser, so a prerendered page served on a preview host never loads it.
// spa:true lets the beacon count react-router navigations by itself.
const CloudflareWebAnalytics = () => {
  useEffect(() => {
    ensureCfBeacon(window, cfBeaconToken);
  }, []);
  return null;
};

const Analytics = () => (
  <>
    {cfBeaconToken ? <CloudflareWebAnalytics /> : null}
    {gaConfig ? (
      <>
        <GoogleAnalytics />
        <VercelAnalytics beforeSend={redactEventUrl} />
        <SpeedInsights beforeSend={redactEventUrl} />
      </>
    ) : null}
  </>
);

export default Analytics;
