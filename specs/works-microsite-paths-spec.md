# Spec — OSS microsites consolidated under danmercede.com/works/<slug>

Status: drafting · Owner-merge · Relates to [`works-dev-hub-spec.md`](works-dev-hub-spec.md)
(the /works dev hub) — this migrates the OSS microsite **spoke** URLs onto the brand domain.
Prove-on-one target: **mcp-context-budget**; the pattern then fans out to schemafit / orion-skills / failclosed.

## Problem

Each shipped OSS tool has a product microsite, today served on its own **subdomain**
(`<repo>.danmercede.com`) as an independent Vercel project. Subdomains split domain authority:
to Google, `mcp-context-budget.danmercede.com` and `www.danmercede.com` are different sites, so a
young brand domain never consolidates the authority/links its spokes earn. The brand wants the
microsites to live at `danmercede.com/works/<slug>` — one origin, one authority surface — **while
keeping each microsite as its own repo and Vercel project** (independent deploys, no monorepo).

## Goal & non-goals

- **Goal:** serve each OSS microsite at `https://www.danmercede.com/works/<slug>/` (200, same
  content), 301 the old subdomain to it, and make the path the canonical — consolidating authority
  on the brand domain.
- **Non-goal:** merging the microsites into the hub repo, a monorepo, or any change to their
  content/design. Each stays an independent repo + Vercel project.
- **Non-goal:** touching the hackathon cards (algorithm-reviews / proctor / orbit / quorum) — they
  point at vercel.app / gitlab / github, not microsites.

## Mechanism decision — runtime Vercel rewrite (validated)

The hub (which owns `www.danmercede.com`) **rewrites** `/works/<slug>/*` to the microsite's stable
Vercel production alias **with the `/works/<slug>` prefix STRIPPED** (`destination:
.vercel.app/:path*`); the microsite is **rebuilt with `base: '/works/<slug>/'`** so its reference
URLs carry that prefix. The strip is load-bearing: Vite's `base` only prefixes the *reference URLs*
in the built HTML — the files still land at `dist/` root and Vercel serves them at the origin root,
so `/works/<slug>/assets/x.js` must proxy to `.vercel.app/assets/x.js`. Validated empirically:

- A microsite built with `--base=/works/mcp-context-budget/` emits correct same-path refs
  (`/works/mcp-context-budget/assets/...`, favicon path-prefixed).
- `mcp-context-budget-site.vercel.app` returns **HTTP 200 with no deployment-protection auth wall**
  → it is a usable public proxy target.

Rejected alternative — **build-time static dist-merge** (hub build pulls the 4 microsite dists):
fragile cross-repo build coupling (hub deploy would depend on 4 external repo builds). The rewrite
keeps deploys independent and the hub change is a tiny reviewable `vercel.json` edit.

## Loop-avoidance (LOAD-BEARING)

- Hub rewrite target is the **`.vercel.app`** alias, NOT the custom subdomain.
- The microsite's 301 is **host-conditioned** to fire ONLY on `<repo>.danmercede.com`
  (`has: [{type:host, value:"<repo>.danmercede.com"}]`), so it never fires on `.vercel.app` →
  the proxy target is never redirected → no loop.

## Scenarios / acceptance criteria

1. **Path serves the microsite.** `GET https://www.danmercede.com/works/mcp-context-budget/`
   returns 200 with the microsite's content (its `<title>`, its assets load from
   `/works/mcp-context-budget/assets/...`).
2. **Path is canonical.** The served page's `<link rel="canonical">` and `og:url` =
   `https://www.danmercede.com/works/mcp-context-budget/`.
3. **Subdomain 301s to the path.** `GET https://mcp-context-budget.danmercede.com/` →
   301 → `https://www.danmercede.com/works/mcp-context-budget/`. The `.vercel.app` alias is NOT
   redirected (serves 200 at the path).
4. **No-slash normalizes.** `GET .../works/mcp-context-budget` (no trailing slash) →
   308/301 → `.../works/mcp-context-budget/`.
5. **/works links + sitemap point at the path** (final step). The hub `/works` card `link` and the
   hub sitemap reference `/works/mcp-context-budget/`, not the subdomain.
6. **No loop / no 404 gap** when merged in the documented order.
7. **No stale subdomain references in the served build.** `og:image`, `twitter:image`, JSON-LD
   `@id`/`url`, `sitemap.xml` `<loc>`, `robots.txt` `Sitemap:`, `constants.ts` canonical, and the
   `site.webmanifest` `icons`/`start_url` all point at the `/works/<slug>/` path — the ONLY
   remaining `<repo>.danmercede.com` occurrence is the vercel.json 301 host condition.

## Gap-free cutover order (the runbook is the contract)

See [`docs/runbooks/works-microsite-cutover.md`](../docs/runbooks/works-microsite-cutover.md).
Summary — three safe steps, each leaving the site working:

1. **Hub rewrite PR** (this repo): adds the `/works/<slug>/*` rewrite (+ no-slash redirect). Until
   the microsite is rebased, the path proxies to a 404 — but it is **unlinked and not in the
   sitemap**, so nothing user-facing breaks.
2. **Microsite PR** (`<repo>-site`): `base` + path-canonical + host-conditioned 301. Activates the
   path (proxy now 200) and the subdomain redirect. The `/works` card still links the subdomain →
   which now 301s to the working path (one extra hop, never broken).
3. **Hub link+sitemap PR** (this repo): repoint the `/works` card `link` to the path and add
   `/works/<slug>/` to the hub sitemap (removes the redirect hop, declares the canonical URL).

## Rollback

Per microsite, fully reversible: revert the microsite PR (base/canonical/301) and the hub
rewrite/link PRs. The 301 is a `vercel.json` redirect (no DNS change); reverting it restores the
subdomain as canonical. No data migration, no irreversible step.
