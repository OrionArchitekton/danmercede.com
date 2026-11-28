/// <reference types="vite/client" />

interface ImportMetaEnv {
  // GA4 measurement id (G-XXXX). Set in Vercel project env (Production) to enable
  // analytics; absent/blank => the <Analytics> component is a no-op. Must carry
  // the VITE_ prefix to be exposed to client code by Vite.
  readonly VITE_GA_MEASUREMENT_ID?: string;
  // Cloudflare Web Analytics beacon token (32 hex chars, from the site's JS
  // snippet; NOT the site tag). Absent/malformed => no beacon. Production only.
  readonly VITE_CF_BEACON_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
