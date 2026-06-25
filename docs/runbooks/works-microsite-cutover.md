---
verified: 2026-06-24
review_after: 2026-09-24
topics: [works, microsite, vercel, rewrite, redirect, cutover, danmercede.com, seo, domain-authority]
references:
  - vercel.json
  - constants.ts
  - public/sitemap.xml
  - specs/works-microsite-paths-spec.md
---

# Runbook — OSS microsite subdomain → /works/<slug> cutover

Migrate an OSS product microsite from `<repo>.danmercede.com` to
`https://www.danmercede.com/works/<slug>/` via a runtime Vercel rewrite, with a
host-conditioned 301 on the old subdomain. Spec:
[`specs/works-microsite-paths-spec.md`](../../specs/works-microsite-paths-spec.md).
Prove-on-one done for **mcp-context-budget**; repeat per microsite.

## Preconditions (verify once per microsite)

```bash
# the microsite's stable .vercel.app alias must be PUBLIC (no deployment-protection auth wall)
curl -s -o /dev/null -w "%{http_code}\n" https://<repo>-site.vercel.app/    # expect 200
curl -s https://<repo>-site.vercel.app/ | grep -ci 'vercel.com/sso'         # expect 0
```
If the alias is auth-walled, the rewrite target won't work — turn off Vercel
Authentication for that project's production, or use a different public target.

## The three merge steps (ORDER IS LOAD-BEARING — gap-free only in this order)

### Step 1 — Hub rewrite PR (this repo)
`vercel.json`: prepend **TWO** rewrites, **before** the SPA catch-all `/(.*) → /index.html`:
```json
{ "source": "/works/<slug>/",       "destination": "https://<repo>-site.vercel.app/" },
{ "source": "/works/<slug>/:path*", "destination": "https://<repo>-site.vercel.app/:path*" }
```
plus a no-slash normalizer redirect `/works/<slug>` → `/works/<slug>/`.

**CRITICAL — the bare-path rewrite is REQUIRED (Vercel `:path*` gap).** `/works/<slug>/:path*` does
NOT match the bare `/works/<slug>/` (empty `:path*` after the trailing slash) — that request falls
through to the SPA catch-all and serves the HUB homepage. The explicit `/works/<slug>/` rewrite (no
`:path*`) handles the index; the `:path*` rule handles every sub-path/asset. (Live-verified: with
only the `:path*` rule, sub-paths like `/works/<slug>/index.html` and `/og-card.png` proxy correctly
but `/works/<slug>/` returns the hub homepage.)

**CRITICAL — the rewrite STRIPS the `/works/<slug>` prefix** (target is `.vercel.app/:path*`, NOT
`.vercel.app/works/<slug>/:path*`). Vite's `base` only prefixes the *reference URLs* in the built
HTML; the actual files still land at `dist/` root (`dist/assets/...`, `dist/og-card.png`), and
Vercel serves them at the origin root (`<repo>-site.vercel.app/assets/...`). So a ref of
`/works/<slug>/assets/x.js` must be proxied to `.vercel.app/assets/x.js` — the prefix is stripped.
A prefix-*preserving* rewrite 404s every asset, favicon, and image. (Verified: the base build emits
`dist/assets/...` with no `dist/works/` nesting.)
**Safe to merge first:** until Step 2, the path proxies to a 404, but it is unlinked
and not in the sitemap, so nothing user-facing breaks. Verify after deploy:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.danmercede.com/works/<slug>/   # 404 until Step 2 — expected
```

### Step 2 — Microsite PR (`<repo>-site`)
- `vite.config.ts`: `base: '/works/<slug>/'`
- `vercel.json`: host-conditioned 301 (fires ONLY on the custom subdomain, never `.vercel.app`):
```json
{ "redirects": [ { "source": "/(.*)",
  "has": [{ "type": "host", "value": "<repo>.danmercede.com" }],
  "destination": "https://www.danmercede.com/works/<slug>/$1", "permanent": true } ] }
```
- the asset cache header `source` **stays `/assets/(.*)`** — the origin (`.vercel.app`) receives the
  **stripped** path (`/assets/...`), so a `/works/<slug>/assets/...` source would never match.
- **Move EVERY hard-coded subdomain/absolute reference to the path** (Vite rewrites *bundled* asset
  refs and the `<link>`/`<script>` tags, but NOT meta/JSON-LD/manifest content). Audit with
  `grep -rn '<repo>.danmercede.com'` (the ONLY allowed remaining hit is the vercel.json 301 host
  condition) and fix:
  - `index.html`: `canonical`, `og:url`, **`og:image`, `twitter:image`**, **JSON-LD `@id` + `url`**
    → `https://www.danmercede.com/works/<slug>/...`
  - `public/sitemap.xml` `<loc>` and `public/robots.txt` `Sitemap:` → the path (note: a robots.txt at
    a subpath is non-authoritative — the host-root robots governs — but keep it consistent).
  - `constants.ts` `canonical` field → the path.
  - **`public/site.webmanifest`**: `icons[].src` + `start_url` → path-prefixed
    (`/works/<slug>/android-chrome-...`). Vite does NOT rewrite manifest JSON, so its root-absolute
    icon paths would otherwise resolve to the hub root and 404.
**Activates the cutover.** Verify after both deploys:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.danmercede.com/works/<slug>/        # 200
curl -s -o /dev/null -w "%{redirect_url}\n" https://<repo>.danmercede.com/               # → www.danmercede.com/works/<slug>/
curl -s -o /dev/null -w "%{http_code}\n" https://<repo>-site.vercel.app/works/<slug>/    # 200 (NOT redirected — loop check)
curl -s https://www.danmercede.com/works/<slug>/ | grep -o 'rel="canonical"[^>]*'        # canonical = the path
```

### Step 3 — Hub link + sitemap PR (this repo)
- `constants.ts`: repoint the `/works` card `link` → `https://www.danmercede.com/works/<slug>/`.
- hub sitemap: add `<url><loc>https://www.danmercede.com/works/<slug>/</loc></url>`.
Removes the redirect hop and declares the canonical URL. Verify `/works` card click lands on the
path with no redirect, and the sitemap lists it.

## Operational note — external-rewrite CDN caching
Vercel caches upstream responses on external rewrites (projects created on/after 2026-04-06),
honoring the upstream `Cache-Control`. The microsite's `/assets/(.*)` are content-hashed +
`immutable` (safe), but the HTML/og-card carry no explicit cache header — so after a **microsite
redeploy**, the hub CDN may briefly serve stale HTML/og-card at `/works/<slug>/` until the edge TTL
lapses. Not a cutover blocker; if a redeploy must reflect immediately, purge or wait out the TTL.

## Rollback
Revert Step 2 (microsite) + Steps 1/3 (hub). The 301 is a `vercel.json` redirect (no DNS change);
reverting restores the subdomain as canonical. No irreversible step. (A `permanent: true` 301 is
cached hard by browsers — during the cutover window that is the intent; on rollback, the subdomain
serves 200 again but already-cached clients may need the redirect to expire.)

## Loop / 404 failure modes (and why this design avoids them)
- **Redirect loop** — would happen if the rewrite targeted the custom subdomain while the subdomain
  301s. Avoided: rewrite targets `.vercel.app`; the 301 is host-conditioned to the subdomain only.
- **404 gap** — would happen if Step 2 (or the link-repoint) lands before Step 1. Avoided by the
  order above: rewrite first (harmless 404, unlinked), then microsite, then link/sitemap.
- **Asset 404s** — would happen if the microsite is NOT rebuilt with the `base`. The `base` is what
  makes `/works/<slug>/assets/...` resolve through the proxy.
