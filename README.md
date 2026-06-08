# danmercede.com

Personal brand and authority site for Dan Mercede — a React single-page app positioning his systems-architecture and governed-AI work.

**Live:** https://www.danmercede.com/

The site presents Dan Mercede's professional identity ("Systems & Intelligence"), his work on governed AI operating systems, and the surrounding ecosystem of ventures. It includes writing, a ventures overview, downloadable resources and case studies, and a way to get in touch. It is a client-side site with no backend.

---

## Stack

- React 19 + React Router DOM 7 (`BrowserRouter`, clean paths — no hash routing)
- TypeScript ~5.8
- Vite 6 (bundler, dev server)
- D3 7 — used only for the animated SVG "constellation" background
- lucide-react — icons
- Tailwind CSS — loaded via CDN in `index.html`, not built locally
- Hosted on Vercel

There is no backend and no live API. All content is defined statically in `constants.ts`.

---

## Local development

Prerequisites: Node 20 and npm.

```bash
git clone https://github.com/<owner>/danmercede.com.git
cd danmercede.com
npm install
npm run dev      # starts Vite on http://localhost:3000 (host 0.0.0.0)
```

Other scripts:

```bash
npm run build    # production build, output to ./build
npm run preview  # serve the production build locally
```

No test or lint scripts are defined. CI runs `npm ci` followed by `npm run build` on Node 20.

---

## Environment variables

None are required to run, build, or deploy the site.

`vite.config.ts` still defines `process.env.API_KEY` and `process.env.GEMINI_API_KEY` from a `GEMINI_API_KEY` env var. This is unused leftover scaffolding from the project's Google AI Studio origin — no code reads either value. It can be removed without affecting behavior.

---

## Deploy

Deployed on Vercel.

- Build output directory: `build` (set in both `vite.config.ts` and `vercel.json`).
- SPA fallback: all paths rewrite to `/index.html` so client-side routes resolve.
- Redirects defined in `vercel.json`:
  - apex `danmercede.com` → `https://www.danmercede.com/` (permanent)
  - `http` → `https` (permanent)
  - `/contact` → `/connect`, `/terms` → `/legal`, `/resources` → `/thoughts`
  - `/readiness-scan` → `https://www.orionintelligenceagency.com/readiness-scan`

The canonical surface is the `www` host (`https://www.danmercede.com/`), matched by the apex redirect and the structured-data URLs in `index.html`.

---

## Pages

| Route | Page |
|-------|------|
| `/` | Home |
| `/about` | About |
| `/ecosystem` | Ecosystem — ventures and how they relate |
| `/thoughts` | Thoughts — dated writing feed |
| `/proof` | Proof — downloadable resources and case studies |
| `/case-studies/:slug` | Individual case study |
| `/connect` | Connect — contact (static `mailto:contact@danmercede.com`) |
| `/legal`, `/privacy`, `/imprint` | Legal pages |

Content highlights:

- **Thoughts** — a dated writing feed (posts in `constants.ts`).
- **Ecosystem** — ventures Dan is involved in, including links out to Orion Intelligence Agency and other sites.
- **Proof** — downloadable PDFs, DOCX, and PPTX (executive deck, speaking one-sheet, case studies, blueprints). Some are gated; some are open. Source files live in `public/assets/`.
- **Calls to action** — e.g. "Book a Runtime Governance Readiness Scan," linking to orionintelligenceagency.com.

This is a marketing, portfolio, and lead-generation site. Contact runs through a static `mailto:` link; there is no form handler or backend.

---

## Project structure

```
.
├── App.tsx              # routes and all page components
├── constants.ts         # site content: nav, ventures, thoughts, resources, case studies
├── types.ts             # shared TypeScript interfaces
├── index.tsx            # React entry point
├── index.html           # HTML shell, Tailwind CDN, schema.org metadata
├── components/          # shared UI components
├── public/              # static assets, icons, sitemap, robots.txt
│   └── assets/          # downloadable resources (PDF/DOCX/PPTX) and diagrams
├── vite.config.ts       # Vite config (build outDir, dev server, aliases)
├── vercel.json          # Vercel redirects, SPA rewrite, caching headers
└── .github/workflows/   # CI
```

---

## Ecosystem context

Each domain in Dan Mercede's web presence serves a distinct role:

- **danmercede.com** — primary professional site and authority surface (this repo)
- **danielmercede.com** — long-form biographical narrative
- **danmercede.info** — identity verification and disambiguation
- **danmercede.online** — working log / living signal surface

Product and platform sites (e.g. Cosmocrat, Orion Apex Capital) are maintained in separate repositories.

---

## CI

GitHub Actions run on push and pull request to `main`:

- **build** — `npm ci` + `npm run build` on Node 20 (`.github/workflows/ci.yml`)
- **gitleaks** — secret scanning (`.github/workflows/gitleaks-scan.yml`)
- **required-checks-fail-closed** — gate requiring `build` and `gitleaks` to pass (`REQUIRED_CHECKS: "build,gitleaks"`)

## Contributing

This is a personal site. External issues and pull requests are not accepted; internal automation PRs are gated by the CI checks above.

## License

No license is currently provided. All rights reserved unless a `LICENSE` file is added.

© 2026 Dan Mercede
