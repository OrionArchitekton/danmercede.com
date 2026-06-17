# Build-time Body Bake + Per-Route JSON-LD — Spec

Supersedes the **"Out: prerendering page body content"** line of
`per-route-seo-meta-spec.md`. That earlier spec baked per-route `<head>` meta
only; this one extends the same browserless build-time injector from `<head>`
into `<body>` and adds per-route structured data. Rows W1 + W4 of the Dan
Mercede brand-engine MAP (2026-06-17).

## Problem

danmercede.com serves an empty-body client render: the production `<body>` is
`<div id="root"></div>` (h1=0, p=0). The 2026 evidence is decisive —
ChatGPT/Perplexity/Claude fetch raw HTML and execute no JavaScript, so they see
nothing on this page; only Google AI Overviews renders the SPA (fragile,
second-class). The brand's entire corpus is invisible to exactly the answer
engines it targets. Separately, every content route carries only the homepage's
JSON-LD (`Person`/`WebSite`/`Org`/`ImageObject`) — there is no per-route
`Article`/`ProfilePage`/`BreadcrumbList`, the structured layer AEO rewards.

## Approach (chosen)

**No-SSR, build-time body bake** — NOT a framework/SSR migration. The hub
already runs a browserless, no-React HTML emitter (`scripts/injectRouteMeta.ts`)
that coexists with the "Vercel never recompiles content" guard. Extend it:

1. `seoMeta.ts` gains a `body` field per route (`h1` + `lead` + `paragraphs`,
   authored from the rendered page copy) and a `schemaType`
   (`Article` | `ProfilePage`). It is the single source of truth — runtime and
   build-time both consume it, so they cannot drift.
2. `renderBodyBlock(path, meta)` emits a real `<h1>` + `<p>` set inside a
   visually-hidden, `aria-hidden`, crawlable `<div id="prerender-content">` that
   is a **sibling of `#root`** (React never collides with it; `index.tsx`
   removes it on hydration so users never see duplicate content).
3. `renderRouteJsonLd(path, meta)` emits an `Article` or `ProfilePage` node plus
   a `BreadcrumbList`, both linked to the canonical homepage entity graph
   (`#person` / `#website`). **FAQPage is never emitted** (rich result
   deprecated 2026-05-07).
4. The injector writes per-route `build/<route>/index.html` with all three
   blocks (head meta + JSON-LD + body), served by Vercel filesystem precedence.

React is externalized via the esm.sh importmap and never executes in Node, so
the injector is importmap-agnostic. Deploy topology: Vercel runs
`npm run build` (`vite build && tsx scripts/injectRouteMeta.ts`) on deploy, so this
source change reaches production without a committed-bundle regen.

## Scope

- **In:** `seoMeta.ts` (body + schema render), `scripts/injectRouteMeta.ts`
  (bake body + JSON-LD), `index.html` (`BODY_BLOCK` + `ROUTE_JSONLD` anchors +
  homepage bake), `index.tsx` (remove prerender node on hydration), tests.
- **In (W3 cache scope):** `vercel.json` — the `/assets` immutable cache rule
  IS intentionally in scope. It is now scoped to content-hashed static assets
  only (Vite-emitted `js`/`css`/fonts/images/`map`); the stable-named human
  download artifacts that also live under `/assets/` (proof `pdf`/`docx`/`pptx`
  + case-study docs from `constants.ts`, linked via `App.tsx` download anchors)
  must NOT be year-cached `immutable` — if such an artifact is corrected under
  the same filename, a year-long `immutable` cache would never revalidate. Docs
  fall to a short-TTL `max-age=300, must-revalidate` rule. The
  `runtime-governance/diagrams` rules keep their exact headers but are reordered
  ABOVE the broad `/assets` rules so first-match (Vercel) semantics still give
  diagram SVGs their explicit `Content-Type: image/svg+xml` (the broad rule also
  matches `*.svg`, so without the reorder it would shadow that content type).
- **Out:** SSR/SSG framework; the esm.sh importmap; runtime React rendering;
  the other four brand surfaces (separate spoke work); regenerating the
  committed `build/` bundle in this PR (HUB substrate-verify rail).

## Acceptance criteria

1. The built homepage `build/index.html` `<body>` carries ≥1 `<h1>` and ≥1 `<p>`
   of real copy, outside the empty `#root` shell.
2. Each per-route file `build/<route>/index.html` carries that route's own
   `<h1>` + paragraphs (not the homepage's) and its own `<title>`.
3. Content routes (`/proof`, `/thoughts`, case studies) emit an `Article` node;
   bio routes (`/`, `/about`, `/ecosystem`) emit a `ProfilePage` node; both link
   to the canonical `#person` / `#website`. Every route emits a `BreadcrumbList`.
4. No route emits `FAQPage`.
5. The baked body and JSON-LD are escaped (`< > &`) — no markup breakout.
6. The homepage `index.html` `BODY_BLOCK` equals `renderBodyBlock('/')` and its
   `ROUTE_JSONLD` block equals `renderRouteJsonLd('/')` (no drift; locked by
   test).
7. The injector fails the build loudly if any anchor is missing from
   `build/index.html`.
8. `index.tsx` removes `#prerender-content` on hydration (users never see the
   crawl block).

## Rollout / verification / rollback

- **Rollout:** merge → Vercel `npm run build` emits per-route files into
  `build/` → served by filesystem precedence.
- **Verify (mechanism):** local `npm run build`, then count `<h1>`/`<p>` in
  `build/index.html` and `build/proof/index.html` (`> 0`, real text); confirm
  `build/proof/index.html` carries `Article` + `BreadcrumbList` JSON-LD.
- **Verify (outcome):** `curl https://www.danmercede.com/proof` shows the route's
  `<h1>` and Article schema in raw HTML (no JS).
- **Rollback:** revert the `seoMeta.ts`/`injectRouteMeta.ts`/`index.html` body +
  JSON-LD additions (drop the two new injected blocks); the head-only injector
  and committed bundle behavior return. The one `vercel.json` change in this PR
  is the W3 `/assets` cache-scope narrowing (immutable now matches hashed static
  assets only; documents get a short TTL); reverting it restores the prior broad
  `/assets/(.*)` immutable rule. No runtime or data changes to undo.
