---
verified: 2026-06-17
review_after: 2026-09-17
topics: [works, open-source, working-log, ship, danmercede.com, danmercede.online, gist, json-ld, identity]
references:
  - constants.ts
  - types.ts
  - seoMeta.ts
  - scripts/injectRouteMeta.ts
  - tests/worksJsonLd.test.ts
  - public/sitemap.xml
---

# Update-on-ship — Works page + working-log

## TL;DR

Whenever a new public work ships (a repo, a tool, a package), update **two
surfaces in the same session**: the canonical **Works** page on this hub
(`danmercede.com/works`) and the dated **working-log** entry on the spoke
(`danmercede.online`). Optionally publish a **supporting gist**. Each surface is
its own reviewed PR; **merge + Vercel deploy is a human gate** — this procedure
gets PRs green and reviewed, it does not deploy.

This is a manual operator procedure, not automation. The canonical record of a
work is the hub Works entry; the working-log entry is the dated announcement.

## Identity rail (every commit, both repos)

- Local git identity **`Dan Mercede <dan@danmercede.com>`**, set in each fresh
  worktree before the first commit. The global default is the Orion Apex Capital
  email — it must **never** enter brand history.
- **No `Co-Authored-By:` / Claude trailer** on brand commits.
- Fresh worktree per repo from current `main` under `/home/orion/.worktrees`;
  open a PR (never push `main`); one `git push` per command; never force-push.

## Surface 1 — Works page (this repo, danmercede.com)

1. Append one entry to `WORKS` in `constants.ts` (static `Work[]`, like
   `VENTURES`/`CASE_STUDIES`): `title`, `description`, `category`, `repo`
   (GitHub URL — drives the JSON-LD `codeRepository`), optional `link`/`gist`/
   `license`/`date`, and a unique `slug`.
2. No route/JSON-LD change is needed for an additional work — the `/works`
   `CollectionPage` in `seoMeta.ts` (`renderRouteJsonLd`) maps over `WORKS`
   automatically, emitting one `SoftwareSourceCode` per entry, each
   `creator → #person`. **Never add a `Person` node.** (If the page itself is
   new, both `seoMeta.ts` edits are required — the `RouteMeta.schemaType` union
   *and* the `renderRouteJsonLd` branch — or the route injects only a
   BreadcrumbList: a silent no-op that still builds green.)
3. Add the route's `<loc>` to `public/sitemap.xml` only if it is a new route
   (the `sitemapParity` test enforces ROUTE_META ↔ sitemap parity).
4. Verify locally: `npm test` (the identity + `worksJsonLd` tests must pass) and
   `npm run build`; confirm the `CollectionPage` node is present in
   `build/works/index.html` and that exactly **one** `Person` (the canonical
   `#person`) appears.

## Surface 2 — working-log entry (danmercede.online)

1. Create `inbox/<YYYY-MM-DD>-<slug>.md` as a `status-update` (model:
   `inbox/2026-06-09-failclosed-is-public.md`): required `status:"Active"`,
   `whatChanged`, `whatBroke`, `nextStep` + base `slug`/`title`/`date`
   (ISO-8601 **with timezone**)/`type`/`tags` (≤3 from the allowed set)/`context`.
2. **Plain operator voice** — the `.online` compiler (`scripts/compileContent.ts`)
   fails the build on marketing language, financial claims, or client names
   (fail-closed validation).
3. Link in-body to the hub `/works` surface and the work's repo; add **no** local
   `Person` (the spoke backrefs the hub `#person`).
4. Run `npm run compile`; commit the new `inbox/*.md` **and** the regenerated
   `constants.generated.ts` + `public/posts.json`. `post-publish.yml` verifies
   the slug is live in `posts.json` post-deploy.

## Supporting gist (optional)

- Pick a first-party snippet (e.g. one published `SKILL.md`). **Manually scrub
  it** — gists bypass the gitleaks gate, and a "secret" gist is unlisted, not
  access-controlled. Create **public**: `gh gist create <file> --public --desc …`.
- Wire the gist URL into the matching `WORKS` entry's `gist` field.

## Review + merge gate

- Open one PR per change (base `main`). These are real-source brand PRs — **run
  the post-push review pipeline** per the estate CLAUDE.md (it has caught a
  hub/spoke identity-contract violation before). Do not skip it.
- Required checks: hub — `build`, `gitleaks`, `required-checks-fail-closed`,
  `substrate-verify`; spoke — `test`, `drift-check`, `build`.
- **Merge to `main` + the Vercel deploy is the human gate.** Terminal state of an
  automated run is *PRs ready + green + reviewed* — never a forced merge, never
  "the site is live."

## Rollback

- A surface is reverted by reverting its PR (or `git revert <sha>` on `main` +
  redeploy). The two surfaces are independent — reverting the Works entry does
  not require reverting the working-log entry, though for a retracted work do
  both. The working-log is append-only; correct a published entry with a new
  follow-up entry, do not rewrite history.
