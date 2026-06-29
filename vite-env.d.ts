/// <reference types="vite/client" />

interface ImportMetaEnv {
  // GA4 measurement id (G-XXXX). Set in Vercel project env (Production) to enable
  // analytics; absent/blank => the <Analytics> component is a no-op. Must carry
  // the VITE_ prefix to be exposed to client code by Vite.
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
