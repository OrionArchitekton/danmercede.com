// Single decision point for whether Google Analytics 4 runs, and with what
// consent posture. The <Analytics> component and tests both consume this, so the
// enable/no-op rule and the privacy posture cannot drift from what is asserted.
//
// Fail-safe by construction: only a well-formed GA4 measurement id (`G-` + base36
// stream id) enables analytics. Anything else — unset env, blank, a stale UA-…
// id, a GTM id, a typo — resolves to null and the component is a no-op. So dev,
// preview, and any deploy where VITE_GA_MEASUREMENT_ID is not set emit nothing.

export interface GaConsentDefaults {
  ad_storage: 'denied';
  ad_user_data: 'denied';
  ad_personalization: 'denied';
  analytics_storage: 'granted';
}

export interface GaConfigParams {
  // GA4 anonymizes IPs by default; the flag is set explicitly for auditability.
  anonymize_ip: true;
  // SPA: suppress the automatic load-time page_view; route changes fire it
  // manually off useLocation so navigations are not double-counted.
  send_page_view: false;
  // Marks non-production / preview / headless-browser sessions as debug traffic
  // so GA4 filters automated checks out of production conversion metrics.
  debug_mode?: true;
}

export interface GaDebugTarget {
  location?: { hostname?: string | null; search?: string | null } | null;
  navigator?: { webdriver?: boolean | null } | null;
}

export interface GaRuntimeConfig {
  measurementId: string;
  consentDefaults: GaConsentDefaults;
  configParams: GaConfigParams;
}

// GA4 measurement ids are `G-` followed by an uppercase-alphanumeric stream id.
const GA4_ID = /^G-[A-Z0-9]+$/;
const DEBUG_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const PRODUCTION_HOSTS = new Set([
  'www.danmercede.com',
  'danmercede.com',
  'www.danmercede.online',
  'danmercede.online',
  'danmercede-com.vercel.app',
]);
const DEBUG_QUERY_KEYS = ['ga_debug', 'debug_mode', 'test_traffic'] as const;

function isPreviewVercelHost(host: string): boolean {
  return (
    host.endsWith('.vercel.app') &&
    !PRODUCTION_HOSTS.has(host) &&
    (host.includes('-git-') || host.includes('-dan-mercedes-projects.vercel.app') || host.includes('preview'))
  );
}

function isProductionHost(host: string): boolean {
  if (!host) return false;
  if (PRODUCTION_HOSTS.has(host)) return true;
  if (host.endsWith('.danmercede.com') || host.endsWith('.danmercede.online')) return true;
  if (host.endsWith('.vercel.app') && !isPreviewVercelHost(host)) return true;
  return false;
}

export function resolveGaDebugMode(target?: GaDebugTarget | null): boolean {
  if (!target) return false;
  if (target.navigator?.webdriver === true) return true;
  const host = (target.location?.hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (
    host &&
    (DEBUG_HOSTS.has(host) || host.endsWith('.local') || isPreviewVercelHost(host))
  ) {
    return true;
  }
  if (!host || isProductionHost(host)) {
    return false;
  }
  const rawSearch = (target.location?.search ?? '').trim();
  if (rawSearch) {
    const query = rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch;
    const params = new URLSearchParams(query);
    for (const key of DEBUG_QUERY_KEYS) {
      const val = (params.get(key) ?? '').trim().toLowerCase();
      if (val === '1' || val === 'true') return true;
    }
  }
  return false;
}

export function resolveGaConfig(
  measurementId: string | undefined | null,
  debugTarget?: GaDebugTarget | null,
): GaRuntimeConfig | null {
  const id = (measurementId ?? '').trim();
  if (!GA4_ID.test(id)) return null;
  const configParams: GaConfigParams = {
    anonymize_ip: true,
    send_page_view: false,
  };
  if (resolveGaDebugMode(debugTarget)) {
    configParams.debug_mode = true;
  }
  return {
    measurementId: id,
    consentDefaults: {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    },
    configParams,
  };
}

// Canonical gtag stub. gtag.js processes ONLY `arguments` objects pushed to
// window.dataLayer; an Array (the rest-params `(...args) => push(args)` form) is
// silently IGNORED, so no consent/config/event command is ever applied and ZERO
// hits are sent. This factory returns the exact stub Google ships and is unit-
// tested against the array-form regression. Pass the global (window) as target.
export function createGtag(target: { dataLayer?: unknown[] }): (...args: unknown[]) => void {
  target.dataLayer = target.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  const gtag = function gtag() {
    target.dataLayer!.push(arguments);
  } as (...args: unknown[]) => void;
  return gtag;
}

// Fire a GA4 event through the installed gtag. A NO-OP when gtag is absent (dev,
// preview, unconfigured, or a browser where analytics never initialized), so
// call sites can wire it unconditionally. Pass the global (window) as target so
// the call is unit-testable without a real browser.
export function trackEvent(
  target: ({ gtag?: (...args: unknown[]) => void } & GaDebugTarget) | null | undefined,
  event: string,
  params?: Record<string, unknown>,
): void {
  if (!target?.gtag) return;
  const payload = params ? { ...params } : {};
  if (resolveGaDebugMode(target) && payload.debug_mode === undefined) {
    payload.debug_mode = true;
  }
  target.gtag('event', event, payload);
}

// Page views carry only the path and campaign tags. Any other query value (an email
// address, a token, a search term) and the fragment are dropped before the hit
// leaves the browser, so a link that carries personal data cannot forward it to
// Google Analytics. Works for absolute URLs and for path+search strings.
const CAMPAIGN_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']);

export function redactUrlForAnalytics(href: string): string {
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(href);
  const url = new URL(href, 'https://www.danmercede.com');
  const kept = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    // Campaign values are free text; one carrying an email address is dropped too.
    if (CAMPAIGN_PARAMS.has(key) && !value.includes('@')) kept.append(key, value);
  });
  const query = kept.toString();
  const rest = `${url.pathname}${query ? `?${query}` : ''}`;
  return absolute ? `${url.origin}${rest}` : rest;
}

// beforeSend hook for the Vercel Web Analytics and Speed Insights widgets, so they
// send the same redacted URL that the GA4 page_view carries.
export function redactEventUrl<T extends { url: string }>(event: T): T {
  return { ...event, url: redactUrlForAnalytics(event.url) };
}
