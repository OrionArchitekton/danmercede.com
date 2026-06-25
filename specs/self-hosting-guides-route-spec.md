# Spec — `/guides` route + long-form guide surface (danmercede.com)

Status: implemented · Owner-merge · Surface: new dev-lane content section on the authority hub

## Problem / intent

danmercede.com has two content surfaces — `/thoughts` (terse substrate-sourced doctrine
essays) and `/works` (a dev-hub index that links out). Neither hosts **long-form technical
guides** (multi-thousand-word, code/diagram-heavy tutorials). This adds a third, dev-lane
surface — `/guides` — so flagship evergreen guides live on the authority domain (SEO + AEO
consolidation) without diluting the founder/operator-facing main pages or overloading
`/thoughts`. Placement decision: a route on `.com`, not a separate domain — because `.online`
serves only non-indexable `/#slug` fragments and would bury an SEO asset.

## Constraints

- **Static, in-repo content — NOT the substrate rail.** A guide is authored as
  `content/guides/<slug>.md` (frontmatter + markdown body) and compiled to the committed
  `constants.guides.generated.ts` by `scripts/compileGuides.mjs`. No substrate, no
  `substrate-verify` gate. (Decision: mirror the static `WORKS` model, not substrate-sourced
  `THOUGHTS`, for speed + reversibility.)
- **Dep-free Markdown rendering.** The repo deliberately stays lean (React externalized via
  esm.sh importmap; no markdown library). Guide bodies render through an in-house
  `components/Markdown.tsx` (bounded subset: headings, fenced code, inline code/bold/italic/
  links, ordered/unordered lists with nested blocks, tables, blockquotes, rules, and
  `![alt](src "caption")` figures).
- **Dual-render parity (crawl + visible).** The visible page renders the full markdown; the
  crawlable answer-engine body is baked separately as clean prose (`seoMeta.guideBodyToParagraphs`
  drops code/tables/figures), mirroring the existing W1 body-bake. Per-route head, Article
  JSON-LD, and breadcrumb are baked by `scripts/injectRouteMeta.ts`.
- **Public-safe.** Guide content teaches generalized patterns only — never estate-specific
  hostnames, IPs, tunnel IDs, account IDs, secret names, or node names.

## Scenarios / acceptance criteria

1. **A guide is reachable at its own indexable URL.** `/guides` lists every published guide;
   `/guides/<slug>` renders the full guide (title h1, lead, markdown body with figures). Each
   detail route bakes a static `build/guides/<slug>/index.html` with a self-canonical and an
   `Article` JSON-LD authored by the canonical `#person`.
2. **Answer engines see the prose.** The baked `<body>` crawl block carries the guide's h1 +
   full prose paragraphs (code/tables/figures stripped), so no-JS crawlers read the content.
3. **Figures are responsive and accessible.** Each `![alt](src "caption")` renders a `<figure>`
   with a 1536w/768w WebP `srcset`, lazy-loaded, alt text (SEO/AEO/a11y) + caption.
4. **Sitemap stays in lockstep with zero hand-maintenance.** The committed `public/sitemap.xml`
   carries the static `/guides` index; per-guide detail entries are generated at build from the
   `GUIDES` corpus. A new guide is sitemap-covered automatically.
5. **Content can never silently drift from its source.** The committed
   `constants.guides.generated.ts` must equal a fresh compile of `content/guides/*.md`; editing
   the markdown without regenerating fails CI.
6. **No new runtime dependency.** The build, tests, and bundle add no package to `package.json`.

## Test seams (fewest, highest)

- `tests/sitemapParity.test.ts` — the committed sitemap covers `/guides` (static); generated
  guide entries equal `guidePaths()` (criterion 4).
- `tests/bodyBake.test.ts` / `tests/injectRouteMeta.test.ts` — per-route bake (criteria 1–2).
- `tests/guidesBundle.test.ts` — corpus non-empty + committed-bundle-equals-fresh-compile
  drift guard (criterion 5).
- `tests/imageBudget.test.ts` — figure WebP assets stay under the per-type byte budget
  (criterion 3 sizing).
- Visual figure placement (criterion 3 layout) is verified by operator review of the Vercel
  preview — the seam tests cover structure, not pixels.

## Out of scope

- Migrating guides to the substrate rail (reversible later; plumbing is identical).
- A `HowTo`/`TechArticle` JSON-LD subtype (uses `Article` today; a 1-line upgrade later).
- Syntax highlighting in code blocks (dep-free monospace render today).
- A guides category filter / pagination (single guide today; add when the corpus grows).
