# danmercede.com — Agent Guide

## Role

`danmercede.com` is the canonical personal-authority hub for Dan Mercede. It is
a Vite + React 19 SPA. It does NOT author content; it CONSUMES substrate
canonicals via a compile step that produces `constants.generated.ts`.

Repo identity:

- **Repo name:** `OrionArchitekton/danmercede.com` (GitHub) — unchanged across
  the Spec 5 PR-A rename
- **Local home:** `personal-brand/dan-mercede/danmercede-com/` (renamed from
  `web/` on 2026-06-08; see `orion-estate-audit/estate_home_registry.yaml` row
  `personal-brand-dan-mercede-web`)
- **Deploy target:** Vercel project `danmercede-com`

## Content Surfaces — `/works` vs `/thoughts`

These two surfaces have separate, non-overlapping jobs — keep them that way.

- **`/thoughts` = the writing.** The full essay corpus — every `/thoughts/<slug>`
  page plus the index with its category filter. Substrate-sourced (`THOUGHTS`).
  This is the sole home of the essays; `/works` must never re-create the library.
- **`/works` = the building.** Open-source artifacts (`WORKS`) plus a **hard-capped
  (3–5) curated pointer** to flagship essays — `FEATURED_ESSAY_SLUGS` resolved by
  `featuredEssays()` (fail-loud: throws on any slug absent from `THOUGHTS`, so a
  typo can never ship a dangling link). `/works` carries NO essay bodies and NO
  second filter/library; it links out to `/thoughts/<slug>` and to the full
  archive. The 3–5 cap is **code-enforced** (`tests/worksHub.test.ts` asserts
  `3 ≤ FEATURED_ESSAY_SLUGS.length ≤ 5`) — it is the guardrail that stops `/works`
  drifting into a second `/thoughts`. To change the featured set, edit
  `FEATURED_ESSAY_SLUGS` in `constants.ts` (stay within the cap).
- **Dual-render parity.** Every crawl-relevant element on `/works` (the availability
  line, the featured deep-links, the outbound rail) is baked into the
  `renderBodyBlock` prerender block in `seoMeta.ts` so no-JS answer engines read it.
  The React `WorksPage` and the bake both read the SAME `featuredEssays()` /
  `WORKS_HUB` constants — a parity test asserts the baked set equals
  `featuredEssays()`, so the visible and crawler renders cannot drift. This is
  prerender fallback, not cloaking.

## Guides surface (`/guides`)

A third content surface for **long-form technical guides** (code/diagram-heavy
tutorials), dev-lane — distinct from `/thoughts` (terse substrate doctrine) and
`/works` (link-out index). STATIC + in-repo, **NOT** substrate-sourced.

- **Source of truth:** `content/guides/<slug>.md` (frontmatter: `title`, `slug`,
  `date`, `category`, `description`, `lead`, then the markdown body).
- **Compile:** `npm run compile:guides` (`scripts/compileGuides.mjs`) regenerates
  the COMMITTED `constants.guides.generated.ts` (`GUIDES: Guide[]`, body embedded as
  a JSON-safe string so backticks/`${}` survive). **Edit the `.md`, then regenerate
  and commit** — `tests/guidesBundle.test.ts` fails CI if the committed bundle is
  stale relative to its `.md` source.
- **Render:** `components/Markdown.tsx` — a dep-free Markdown renderer (no markdown
  library, consistent with the lean / externalized-React build). `GuideDetailPage`
  renders the body; `seoMeta.guideBodyToParagraphs` bakes a clean-prose crawl body
  (code/tables/figures dropped) for no-JS answer engines.
- **Routes:** `/guides` (index, a static `ROUTE_META` route) + `/guides/:slug`
  (per-guide, derived from `GUIDES` via `guidePaths()`/`guideMeta()`); baked by
  `injectRouteMeta.ts` with `Article` JSON-LD + sitemap entries (mirrors `thoughts`).
- **Figures:** responsive WebP (1536w + 768w) under `public/assets/guides/<topic>/`,
  embedded as `![alt](src "caption")`; re-optimize via `npm run optimize:images`.
- Guides are PUBLIC: teach generalized patterns only, never estate-specific
  hostnames, IPs, tunnel/account IDs, secret names, or node names.

## Substrate-Consumer Contract

This repo consumes substrate canonicals via `scripts/compileContent.ts`. The
contract is intentionally narrow.

### What the consumer reads

Substrate canonicals live in
`dan-mercede-substrate/publishing/canonical/*.md`. A canonical is admitted as
a danmercede.com `Thought` only when ALL of the following hold:

| Substrate frontmatter field | Required value |
|---|---|
| `surface_targets` | array including `"danmercede.com"` |
| `status` | `"canonical"` |
| `type` | `"essay-long"` |
| `slug` | non-empty string |
| `title` | non-empty string |
| `date` | one of: date-only `YYYY-MM-DD` (rendered as that literal calendar day); a strict ISO 8601 instant **with explicit timezone** (`Z` / `±HH:MM` / `±HHMM`, e.g. `2026-05-20T07:00:00-07:00`, rendered as the PT-local day); or a `Date` object. Offset-less datetimes (`2026-05-20T14:30:00`) and engine-dependent shapes (`May 20 2026`) are REJECTED as fatal — they parse in the process timezone and would render differently per runner. Impossible calendar fields (`2026-02-30…`) are fatal, not normalized. |
| `claim` | non-empty string |

Canonicals that fail any filter are silently skipped (logged, not fatal).
Substrate canonicals are operator-authored and trusted — no forbidden-content
scan runs on substrate-admitted entries.

### How substrate fields map to `Thought`

The `Thought` type lives in `types.ts`. Round-2 R1 (full essay-body corpus bake)
widened it from the original 4 fields to carry the slug and full essay body, so
per-thought pages (`/thoughts/<slug>`) bake the full corpus, not just the preview:

```ts
interface Thought {
  title: string;
  preview: string;
  date: string;
  category: string;
  slug: string;   // round-2 R2: drives /thoughts/<slug> routing + sitemap
  body: string;   // round-2 R1: full essay body (substrate markdown content)
}
```

| Thought field | Substrate source |
|---|---|
| `title` | `title` (verbatim) |
| `preview` | `claim` (the substrate's thesis statement) |
| `date` | `date`, formatted as `YYYY-MM-DD` in `America/Los_Angeles` |
| `category` | derived from `layer` via `LAYER_TO_CATEGORY` (default: `"Doctrine"`) |
| `slug` | `slug` (verbatim) — the per-thought route + sitemap key |
| `body` | the canonical markdown body below the frontmatter (`parsed.content.trim()`), blank-line-separated paragraphs |

Adding new layer values: extend `LAYER_TO_CATEGORY` in
`scripts/compileContent.ts`. The default is intentionally lenient — an
unmapped layer renders under `"Doctrine"` rather than crashing or hiding.

### Substrate root resolution

`scripts/compileContent.ts:resolveSubstratePath()`:

1. If `SUBSTRATE_PATH` env is set AND points to an existing directory, use it.
2. Else if `../dan-mercede-substrate` exists relative to this repo, use it.
3. Else return `null` (consumer treats as unreachable).

## Fail-Mode Asymmetry

The compile script has two modes with deliberately asymmetric postures.

### Consumer mode (default — Vercel prebuild)

**FAIL-OPEN.** If substrate is unreachable OR yields 0 matches, the script
logs the condition and exits 0 WITHOUT overwriting `constants.generated.ts`.
The site continues to render whatever was last committed.

Triggered by `npm run compile` (also wired into `prebuild`). The Vercel build
runs `npm run build`, which triggers prebuild → compile. The untrusted CI
lane (`ci.yml`) takes the identical path: no substrate is present there, so
compile SKIPs and the committed bundle is served.

### Sync workflow mode (`--strict`)

**FAIL-LOUD.** If substrate is unreachable OR yields 0 matches, the script
exits 1. The sync workflow halts; no PR is opened.

Triggered by `.github/workflows/substrate-sync.yml`, weekly cron +
workflow_dispatch. Strict mode is the only path that should mutate the
committed `constants.generated.ts` on `main` — and even then, only via a
human-reviewed PR.

### Why the asymmetry

- Substrate goes down → site must stay up → consumer fail-open is correct.
- Sync workflow sees 0 matches → would silently strip all entries from the
  committed bundle → strict halt is correct.

The committed `constants.generated.ts` is the durable source of truth that
Vercel serves; the workflow regenerates it only when substrate confirms a
non-empty match set.

### Compile-status marker (`.compile-status`)

`scripts/compileContent.ts:main()` writes a single-token marker to
`.compile-status` at project root after `decideOutput` returns:

- `WROTE`   — compile produced a fresh bundle from substrate matches
- `SKIPPED` — compile preserved the committed bundle (substrate unreachable,
              0 matches under default mode, or a fatal diagnostic fired)

(`fail` actions exit 1 before the marker is written; no subsequent CI step
runs in that case.)

The trusted verification lane reads the marker to pick its truth source
(see "CI trust split" below):

- `WROTE`   → truth = the freshly substrate-compiled bundle; the PR's
              committed bundle must match it byte-for-byte.
- `SKIPPED` → truth = the base branch's committed bundle; the PR must not
              have mutated the file (refuses hand-edits during the
              zero-match seed period — only the substrate-sync workflow
              is the legitimate mutator).

The marker is gitignored. The trusted-lane workflow
(`.github/workflows/substrate-verify.yml`) is the only intended consumer;
the filename is exported as `COMPILE_STATUS_FILENAME` from
`scripts/compileContent.ts` and a test locks the value so a rename here
can't silently desync the workflow.

### CI trust split (Finding B hardening, 2026-06-09)

CI is split into two lanes so that PR-controlled code can never read
private substrate content or the substrate credential:

**Untrusted lane — `.github/workflows/ci.yml` (`pull_request` + `push`):**
runs PR-controlled code (npm lifecycle scripts, tests, vite config) and
therefore carries NO secrets and never checks out substrate. Build uses
`npm run build` (prebuild → fail-open compile → SKIPPED → committed
bundle), which is exactly the Vercel production path.

**Trusted lane — `.github/workflows/substrate-verify.yml`
(`pull_request_target`):** holds `SUBSTRATE_READ_TOKEN` and therefore
NEVER executes PR-controlled code:

- The workflow definition itself comes from the base branch
  (`pull_request_target` semantics) — a PR cannot rewrite it to leak
  secrets.
- The checkout is pinned to the PR's base commit; the compiler that runs
  is the base branch's compiler.
- The PR's `constants.generated.ts` is extracted as DATA: the workflow
  first runs `git fetch --no-tags origin "refs/pull/N/head"` (required —
  `actions/checkout` only fetches the base commit, not the PR ref), then
  `git show FETCH_HEAD:constants.generated.ts`. No PR script, test,
  config, or dependency manifest is evaluated.
- `npm ci` (base lockfile) runs before the substrate checkout, so
  dependency install scripts never coexist with substrate content.
- The substrate PAT is confined to its checkout step with
  `persist-credentials: false`.

Verification is a single decision table: truth = compiled bundle when the
marker says `WROTE`, else the base branch's bundle; the PR bundle must
equal truth. If the base branch has no `constants.generated.ts` at all,
the bootstrap admit passes the PR (one-time, self-disabling — after the
file exists on `main`, the admit cannot re-fire; the only re-arm path is
a deletion-from-main PR, which is itself review-worthy).

**Compiler-change caveat:** the trusted lane runs the BASE compiler. A PR
that changes the compiler's output shape must NOT regenerate the bundle in
the same PR (verification would compare against old-compiler truth and
fail). Sequence instead: merge the compiler change with the bundle
untouched, then let the substrate-sync workflow regenerate under the new
compiler. If a compiler change breaks the committed bundle's types (rare),
the untrusted lane's build will catch it and the PR must regenerate the
bundle in-PR; `substrate-verify` will then fail by design. The operator
resolves with an explicit override: admin-merge past the
`substrate-verify` check (or temporarily remove it from branch
protection / `REQUIRED_CHECKS` for that one merge), after personally
reviewing the regenerated bundle diff. Verification self-heals on the
next sync-workflow PR, which recompiles under the now-merged compiler.

### Branch-protection anchor + gate trust posture (CI-hardening-2, 2026-06-10)

The fail-closed gate (`required-checks-fail-closed.yml`) runs on
`pull_request`, i.e. PR-controlled code — so it can NOT be the sole
enforcer of a security property. The root anchor is branch protection on
`main` requiring the individual checks **by name**:
`build, gitleaks, required-checks-fail-closed, substrate-verify`. This is
robust for `substrate-verify` specifically because that job runs on
`pull_request_target` (base-branch definition), so a PR cannot edit what
it does — requiring it by name means editing the aggregate gate can no
longer bypass the substrate-consumer contract.

Two reinforcing hardenings on the untrusted lane:

- `ci.yml` pins `permissions: contents: read` and
  `persist-credentials: false`. PR-controlled code in that job therefore
  has no `statuses:write` token and no persisted credential to extract —
  it cannot POST a forged required-check success status.
- The gate computes its verdict ONLY from GitHub Actions check-runs
  (filtered to the `github-actions` app), never from legacy commit
  statuses. Every required check here is an Actions job, so this loses no
  signal while removing the forged-status shadowing vector entirely.
- `substrate-verify` — the one check whose forgery would bypass the
  substrate contract — is resolved NOT by name but from the Actions
  workflow-runs API pinned to BOTH `substrate-verify.yml` AND
  `event=pull_request_target`. App+name matching alone is insufficient: a
  PR can add its own `pull_request` workflow with a job named
  `substrate-verify`, producing a second `github-actions` check-run of
  that name (latest-timestamp-wins could accept the forged pass). A
  PR-added workflow lives at a different file `path`, so it cannot appear
  in the pinned query. `build`/`gitleaks` keep name+app matching.

  **Why build/gitleaks are not (and cannot be) pinned like substrate-verify:**
  both run on `pull_request` — i.e. PR-controlled code. A PR can neuter
  them by editing their own workflow files (`ci.yml`, `gitleaks-scan.yml`)
  to pass trivially, so they are forgeable regardless of whether the gate
  matches by name or by workflow file. Only a `pull_request_target` check
  (base-branch code) can be made unforgeable, which is exactly why
  `substrate-verify` is the sole security anchor of the substrate-consumer
  contract. `build`/`gitleaks` are quality/advisory: build forgery is
  self-defeating (it is the PR's own build), and a forged `gitleaks` pass
  is still visible via the external GitGuardian app (PR-uneditable). The
  broader fix for "don't trust PR-controlled required checks" is the
  deferred ruleset migration below.

**Residual (branch-protection layer, operator decision).** Classic branch
protection requires `substrate-verify` by name with `app_id=15368`. But
app-pinning does NOT disambiguate two `github-actions` check-runs of the
same name, so the duplicate-named-check-run forgery above also applies to
branch protection's own evaluation (latest-wins). The gate is now
hardened against it, but the gate is advisory; the wall is branch
protection. The fully robust fix is a **repository ruleset** with a
"required workflows" rule pinning `.github/workflows/substrate-verify.yml`
(rulesets can pin a required check to a specific workflow file; classic
required-status-checks cannot). Deferred: practical risk is zero under
the solo-operator model (the attack requires push access to a repo
branch), and matters only once semi-trusted contributors exist — the same
horizon as `SUBSTRATE_READ_TOKEN`.

## Files

| File | Role |
|---|---|
| `scripts/compileContent.ts` | substrate reader + filter + mapper + output writer |
| `tests/compileContent.test.ts` | unit + integration tests (`npm test`) |
| `tests/fixtures/substrate/publishing/canonical/*.md` | test fixtures |
| `constants.generated.ts` | **GENERATED** — substrate-derived `THOUGHTS` bundle (committed) |
| `constants.ts` | static site constants; re-exports `THOUGHTS` from `constants.generated` |
| `types.ts` | shared types including `Thought` |
| `.github/workflows/ci.yml` | untrusted lane: tests + Vercel-equivalent build; NO secrets, NO substrate; `permissions: contents: read` + `persist-credentials: false` |
| `.github/workflows/substrate-verify.yml` | trusted lane: generated-bundle verification (`pull_request_target`, base code only) |
| `.github/workflows/substrate-sync.yml` | weekly sync workflow (FAIL-LOUD, opens review PR) |
| `.github/workflows/gitleaks-scan.yml` | secret scan (unchanged) |
| `.github/workflows/required-checks-fail-closed.yml` | required-check gate: `build,gitleaks` + self-arming `substrate-verify`; verdict from GitHub Actions check-runs only (no commit statuses). NOT a standalone enforcer — branch protection requires these by name |

## Initial Seed (2026-06-08)

At Spec 5 PR-B landing, `constants.generated.ts` is hand-seeded with the
6 thoughts that previously lived inline in `constants.ts`. Substrate has
zero canonicals matching `danmercede.com` today, so:

- Consumer build: compile no-ops; seeded 6 render.
- Sync workflow: strict compile exits 1; no PR opens.

Forward migration path: as the operator authors substrate canonicals with
`surface_targets` including `danmercede.com`, the sync workflow will pick
them up and open a review PR. The first such PR will REPLACE the seeded 6
with the substrate match set (the seed is not preserved as a floor —
substrate becomes the single source of truth at first match). To migrate
the original 6 without losing them, author them as substrate canonicals
BEFORE the sync workflow runs against a non-empty substrate match set.

## Editing Rules

- Do not edit `constants.generated.ts` by hand. Update substrate, run
  `npm run compile`, commit the regenerated file.
- Do not duplicate substrate-frontmatter validation here; it belongs in
  `scripts/compileContent.ts`.
- Do not extract `scripts/compileContent.ts` into a shared package with
  `danmercede.online`. Both surfaces have intentionally different mappers,
  type targets, and validation budgets. A shared package was explicitly
  declined at Spec 5 design checkpoint.
- Keep `constants.ts` for static site constants only; the only `THOUGHTS`
  reference is the re-export from `./constants.generated`.

## Commands

| Command | Effect |
|---|---|
| `npm run compile` | regenerate `constants.generated.ts` from substrate (fail-open) |
| `npm run compile -- --strict` | strict-mode compile (fail-loud) |
| `npm test` | run `tsx --test tests/compileContent.test.ts` |
| `npm run build` | runs `prebuild` (= compile) then `vite build` |
| `npm run dev` | Vite dev server |

## Estate Authority

See `orion-estate-audit/AGENTS.md` for cross-repo doctrine. This repo is a
personal-brand surface under `personal-brand/dan-mercede/`. Its admission and
canonical home are tracked in
`orion-estate-audit/estate_home_registry.yaml` (row
`personal-brand-dan-mercede-web`) and the
`dan_mercede_personal_brand_repo_contract_20260318.md` repo contract.
