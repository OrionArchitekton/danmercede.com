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
| `date` | ISO 8601 string OR `Date` (gray-matter parses unquoted dates) |
| `claim` | non-empty string |

Canonicals that fail any filter are silently skipped (logged, not fatal).
Substrate canonicals are operator-authored and trusted — no forbidden-content
scan runs on substrate-admitted entries.

### How substrate fields map to `Thought`

The `Thought` type lives in `types.ts` and is exactly four fields:

```ts
interface Thought {
  title: string;
  preview: string;
  date: string;
  category: string;
}
```

| Thought field | Substrate source |
|---|---|
| `title` | `title` (verbatim) |
| `preview` | `claim` (the substrate's thesis statement) |
| `date` | `date`, formatted as `YYYY-MM-DD` in `America/Los_Angeles` |
| `category` | derived from `layer` via `LAYER_TO_CATEGORY` (default: `"Doctrine"`) |

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

## Files

| File | Role |
|---|---|
| `scripts/compileContent.ts` | substrate reader + filter + mapper + output writer |
| `tests/compileContent.test.ts` | unit + integration tests (`npm test`) |
| `tests/fixtures/substrate/publishing/canonical/*.md` | test fixtures |
| `constants.generated.ts` | **GENERATED** — substrate-derived `THOUGHTS` bundle (committed) |
| `constants.ts` | static site constants; re-exports `THOUGHTS` from `constants.generated` |
| `types.ts` | shared types including `Thought` |
| `.github/workflows/ci.yml` | untrusted lane: tests + Vercel-equivalent build; NO secrets, NO substrate |
| `.github/workflows/substrate-verify.yml` | trusted lane: generated-bundle verification (`pull_request_target`, base code only) |
| `.github/workflows/substrate-sync.yml` | weekly sync workflow (FAIL-LOUD, opens review PR) |
| `.github/workflows/gitleaks-scan.yml` | secret scan (unchanged) |
| `.github/workflows/required-checks-fail-closed.yml` | required-check gate (`build,gitleaks`; add `substrate-verify` post-merge) |

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
