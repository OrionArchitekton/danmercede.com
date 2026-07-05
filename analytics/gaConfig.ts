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
}

export interface GaRuntimeConfig {
  measurementId: string;
  consentDefaults: GaConsentDefaults;
  configParams: GaConfigParams;
}

// GA4 measurement ids are `G-` followed by an uppercase-alphanumeric stream id.
const GA4_ID = /^G-[A-Z0-9]+$/;

export function resolveGaConfig(
  measurementId: string | undefined | null,
): GaRuntimeConfig | null {
  const id = (measurementId ?? '').trim();
  if (!GA4_ID.test(id)) return null;
  return {
    measurementId: id,
    consentDefaults: {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    },
    configParams: {
      anonymize_ip: true,
      send_page_view: false,
    },
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
  target: { gtag?: (...args: unknown[]) => void } | null | undefined,
  event: string,
  params?: Record<string, unknown>,
): void {
  target?.gtag?.('event', event, params ?? {});
}
