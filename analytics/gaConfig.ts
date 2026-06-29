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
