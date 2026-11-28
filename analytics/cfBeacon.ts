// Single decision point for whether the Cloudflare Web Analytics beacon loads.
//
// Fail-safe by construction, like gaConfig: only a well-formed beacon token
// (32 hex characters, from Cloudflare dashboard > Web Analytics > site > JS
// snippet) enables it. Unset, blank, or malformed => null => no-op. Even with a
// valid token the beacon loads only on danmercede.com or one of its subdomains
// and never for debug traffic (GA's resolveGaDebugMode: localhost, .local, Vercel
// previews, WebDriver). Cloudflare accepts a site token only from hostnames that
// share the registered apex (postfix match), so the .vercel.app alias and
// danmercede.online would be rejected; they load nothing rather than send hits
// Cloudflare drops.
//
// The beacon is cookieless. `spa: true` makes it follow History API navigations
// itself, so it is injected once per page load and never per route change.

import { resolveGaDebugMode, type GaDebugTarget } from './gaConfig';

// The apex the Cloudflare Web Analytics site (and so the token) is registered for.
export const CF_BEACON_APEX = 'danmercede.com';

export function isCfBeaconHost(hostname: string | null | undefined): boolean {
  const host = (hostname ?? '').trim().toLowerCase().replace(/\.$/, '');
  return host === CF_BEACON_APEX || host.endsWith(`.${CF_BEACON_APEX}`);
}

export const CF_BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

const CF_BEACON_TOKEN = /^[0-9a-f]{32}$/;

export function resolveCfBeaconToken(raw: string | undefined | null): string | null {
  const token = (raw ?? '').trim().toLowerCase();
  return CF_BEACON_TOKEN.test(token) ? token : null;
}

export function shouldLoadCfBeacon(token: string | null, target?: GaDebugTarget | null): boolean {
  if (!token || !target) return false;
  if (!isCfBeaconHost(target.location?.hostname)) return false;
  return !resolveGaDebugMode(target);
}

export interface CfBeaconDocument {
  head: { appendChild(node: unknown): unknown };
  createElement(tag: 'script'): {
    defer: boolean;
    src: string;
    setAttribute(name: string, value: string): void;
  };
  querySelector(selector: string): unknown;
}

export interface CfBeaconTarget extends GaDebugTarget {
  document?: CfBeaconDocument | null;
}

// Injects the beacon <script> at most once per document. Returns true only when
// this call added it. The existing-script check also covers a page that already
// carries the tag (for example a second mount of the component).
export function ensureCfBeacon(target: CfBeaconTarget | null | undefined, token: string | null): boolean {
  if (!target?.document || !shouldLoadCfBeacon(token, target)) return false;
  const doc = target.document;
  if (doc.querySelector(`script[src="${CF_BEACON_SRC}"]`)) return false;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = CF_BEACON_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token, spa: true }));
  doc.head.appendChild(script);
  return true;
}
