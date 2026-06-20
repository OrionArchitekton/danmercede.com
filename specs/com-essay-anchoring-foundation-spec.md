# danmercede.com essay-anchoring foundation — IMPLEMENTATION SPEC (PR1)

**Status:** APPROVED implementation packet (operator, 2026-06-20). Foundation PR1 of the
brand-consolidation arc; PR2 (the `/works` dev hub) is a separate, later packet. Spans two
repos (`danmercede.com` primary + `dan-mercede-lane`) plus a one-off operational repair.

## Problem / root cause

The dev.to syndication (dan-mercede-lane PR #57) published 2 flagship essays with
`rel=canonical → https://www.danmercede.com/<slug>/`. That canonical does not resolve:

1. The hub serves essays at **`/thoughts/<slug>`**, not top-level `/<slug>/` (only
   `/thoughts/:slug` is a route; `/<slug>/` hits the SPA `*`→NotFound, served as the
   homepage shell).
2. More fundamentally, those essays' substrate frontmatter is
   `surface_targets: [linkedin, danmercede.online]` — **no `danmercede.com`** — so the hub
   compiler (`scripts/compileContent.ts`, which admits only canonicals whose
   `surface_targets` include `"danmercede.com"`) correctly excludes them. They were never
   meant to be on `.com`.

Net: the syndication's canonical points at a soft-404, transferring ~zero SEO/ownership —
and, generally, the **flagship long-form essays have no canonical home on the authority
domain**, which is the exact fragmentation the consolidation exists to end.

## Goal

Give flagship long-form essays a real, baked, crawler-visible canonical home on
danmercede.com, and align the syndication canonical to it — so `.com` accrues the
indexable authority. Reuse the hub's existing build-time bake (`injectRouteMeta` already
emits per-route head + canonical + Article JSON-LD + crawlable body for no-JS engines).

## §1 — Decisions (locked, do NOT re-ask)

- **Anchor flagship essays on `.com`** (not re-point the canonical at non-indexable
  `.online`).
- **Mechanism = hub-side consumer allowlist.** Substrate is immutable (`surface_targets`
  frontmatter edits are no-ops), so admission is done in the *consumer* (the hub compiler),
  mirroring the lane's `backfill_slugs` pattern and the
  `distribution_opt_in_lane_side_not_sealed_substrate` lesson. Substrate is untouched.
- **Essays land in the existing `/thoughts` corpus** (reuse the bake + route); a dedicated
  `/writing` section is NOT created here. The `/works` dev hub (PR2) curates the index.
- **Repair the 2 already-live dev.to posts via an operational `PUT`** — no general update
  path is built into the lane (YAGNI; only 2 posts).
- **`danmercede.com#person` is the canonical "Dan Mercede" entity.** Repointing the
  business brands' `sameAs → danmercede.com#person` is DEFERRED and coordinated *after* the
  concurrent AEO arc's 4 PRs merge (handoff pack `2026-06-20T091032Z-orion-aeo-followons`).
  Not in this PR.

## §2 — Scope

**In scope:**
- `danmercede.com`: a `HUB_ESSAY_ALLOWLIST` in `scripts/compileContent.ts` + admission
  change; regenerated `constants.generated.ts`; test coverage.
- `dan-mercede-lane`: `hub_canonical_url` fix (`/thoughts/<slug>`) + tests + a documented
  `backfill_slugs ⊆ hub allowlist` invariant; canonical-reference note in the syndication
  spec.
- Operational: repair the 2 live dev.to posts (corrected canonical + body backlink).

**Out of scope:**
- The `/works` dev-hub content (PR2).
- Business-brand entity repoint (deferred; coordinate with the AEO arc).
- Any substrate change; any general dev.to update capability in the lane.

## §3 — Design

### 3.1 Hub allowlist (`danmercede.com` repo)

`scripts/compileContent.ts` today: `mapCanonicalToThought` reads `data['surface_targets']`
and skips a canonical whose targets exclude `THIS_SURFACE` (`'danmercede.com'`, ~L284-287).

Change:
- Add `export const HUB_ESSAY_ALLOWLIST: readonly string[] = [...]` (curated slugs), seeded
  with `2026-06-08-authority-gate-made-runnable` and `2026-05-20-pre-execution-authority-gates`.
- In the surface-targets gate, admit a canonical when
  `surfaceTargetsIncludesThisSurface OR HUB_ESSAY_ALLOWLIST.includes(slug)`. On
  allowlist-admit, continue the existing mapping unchanged (title/preview/date, full body,
  `category` via `deriveCategoryFromLayer(data['layer'])` — the 2 essays' `layer` is
  `authority-gate`). Emit a distinct diagnostic (`admitted via HUB_ESSAY_ALLOWLIST`).
- Keep all OTHER skip reasons intact (status/type filters, missing required fields) — the
  allowlist only overrides the *surface_targets* gate, nothing else.
- Regenerate `constants.generated.ts` by running `npm run compile` against the mounted
  substrate at the pinned sha; commit the regenerated file with the 2 new entries.

No change to `scripts/injectRouteMeta.ts` is needed: it derives `thoughtPaths()` from the
corpus, so the 2 new essays automatically get `build/thoughts/<slug>/index.html` (per-route
head + `canonical = self` + Article JSON-LD + crawlable body) and sitemap entries.

### 3.2 Lane canonical fix (`dan-mercede-lane` repo)

`tools/_lib/syndication_body.py` `hub_canonical_url` currently returns `f"{owned}/{slug}/"`.
Change it to the resolving baked path under `/thoughts/`. **It MUST byte-match the hub's own
emitted self-canonical** for a `/thoughts/<slug>` page (so the dev.to canonical and the hub's
`<link rel="canonical">` agree exactly — a trailing-slash or host mismatch creates a broken
canonical chain). Verify the exact form against a baked page / `renderSeoBlock` output before
finalizing (e.g. `https://www.danmercede.com/thoughts/<slug>` vs `…/<slug>/`), and use that
form. Update:
- `tests/test_syndication_body.py` and any render tests asserting the canonical/backlink
  format.
- The syndication spec(s) (`specs/devto-hashnode-syndication-spec.md` /
  `devto-hashnode-publish-spec.md`) canonical references.
- **New invariant (documented):** a slug may only be syndicated with a `.com` canonical if
  it is `.com`-published — i.e. `lane.toml [syndication] backfill_slugs` MUST be a subset of
  the hub's `HUB_ESSAY_ALLOWLIST`. The lane cannot import the hub list (separate repo), so
  this is an operator invariant noted in `lane.toml` + the spec; a cross-repo automated
  guard is a future improvement (§9). This generalizes the root cause so it cannot recur.

### 3.3 Operational repair of the 2 live dev.to posts

After 3.1 deploys (the `/thoughts/<slug>` pages are live + verified) AND 3.2 merges +
deploys to hermes:
- Re-render the 2 queue artifacts with the corrected canonical (re-run the lane backfill on
  hermes), then `PUT https://dev.to/api/articles/{id}` for ids `3947128` and `3947130`,
  updating `article.canonical_url` and `article.body_markdown` (corrected `/thoughts/<slug>`
  backlink). One-off, using `DEV_TO_API_KEY` via Doppler on hermes (a small script or
  `curl`); not a committed lane capability.
- Verify each post's `canonical_url` now resolves (HTTP 200 → the baked essay page).

## §4 — Acceptance criteria

- **AC1** — `compileContent` admits a slug in `HUB_ESSAY_ALLOWLIST` even when its
  `surface_targets` exclude `danmercede.com`; a non-allowlisted, non-`.com` slug is still
  skipped; other skip reasons (status/type/missing-fields) still apply. Proven by test.
- **AC2** — Regenerated `constants.generated.ts` contains both essays (slug, title, non-empty
  body, category derived from `layer`). Proven by test/inspection.
- **AC3** — After `npm run build`, `build/thoughts/<slug>/index.html` exists for each, with
  `<title>` = the essay title (not the homepage title), `<link rel="canonical">` = the
  self URL `https://www.danmercede.com/thoughts/<slug>`, an Article JSON-LD node, and the
  crawlable body. Proven by the `injectRouteMeta`/`headHygiene`/`bodyBake` tests + post-deploy
  curl.
- **AC4** — The built sitemap includes both `/thoughts/<slug>` entries (`sitemapParity`).
- **AC5** — (lane) `hub_canonical_url(slug)` returns `https://www.danmercede.com/thoughts/<slug>`;
  lane tests updated to assert it; the `backfill_slugs ⊆ HUB_ESSAY_ALLOWLIST` invariant is
  documented in `lane.toml` + the spec.
- **AC6** — Post-repair, both dev.to posts' `canonical_url` and in-body backlink point at
  `/thoughts/<slug>` and resolve (HTTP 200 → essay). Operational verification.
- **AC7** — Hub test suite green (`npm test`); lane suite green (`pytest` under
  `/usr/local/bin/python3.11`) + `ruff` clean.

## §5 — Invariants

1. **Substrate untouched** — admission is consumer-side (hub allowlist), substrate is
   immutable and unmodified.
2. **Syndicate-to-`.com`-canonical ⟹ `.com`-published** — `backfill_slugs ⊆ HUB_ESSAY_ALLOWLIST`
   (documented operator invariant; the generalized fix for the root cause).
3. **`danmercede.com#person` is the canonical entity** — business-brand repoint deferred.
4. **No `/works` content change** in this PR (that is PR2).
5. **Existing `.com`-targeted corpus is unaffected** — the allowlist only *adds*; the
   surface_targets path for already-admitted thoughts is unchanged.

## §6 — Files touched

**`danmercede.com`:**
- `scripts/compileContent.ts` — `HUB_ESSAY_ALLOWLIST` + admission change + diagnostic.
- `constants.generated.ts` — regenerated (now includes the 2 essays).
- `tests/compileContent.test.ts` — allowlist-admit + still-skip cases (extend);
  `tests/sitemapParity.test.ts` / `tests/identityCanonical.test.ts` if assertions enumerate
  the corpus.
- `specs/com-essay-anchoring-foundation-spec.md` — this spec.

**`dan-mercede-lane`:**
- `tools/_lib/syndication_body.py` — `hub_canonical_url` → `/thoughts/<slug>`.
- `tests/test_syndication_body.py` (+ `test_render_devto.py`/`test_render_hashnode.py` if
  they assert the canonical/backlink) — updated expectations.
- `lane.toml` — `[syndication]` note: `backfill_slugs ⊆` the hub allowlist.
- `specs/devto-hashnode-publish-spec.md` — canonical-reference + invariant note.

**Operational (not committed):** a one-off dev.to `PUT` repair for ids 3947128 / 3947130.

## §7 — Testing & quality bar

- Hub: `npm test` (the `tsx --test` suite: `compileContent`, `headHygiene`, `bodyBake`,
  `sitemapParity`, `identityCanonical`, `worksJsonLd`, `contentBoundary`, …) green; `npm run
  build` succeeds (compile + vite + injectRouteMeta).
- Lane: `pytest -q` under `/usr/local/bin/python3.11` green; `ruff check` + `ruff format
  --check` clean.
- Post-deploy: `curl https://www.danmercede.com/thoughts/<slug>` shows the baked essay title
  + self canonical (not homepage); sitemap includes both; the 2 dev.to canonicals resolve.

## §8 — Sequencing

1. **Hub allowlist PR** (`danmercede.com`) → merge → Vercel auto-deploy → **verify the 2
   `/thoughts/<slug>` pages are live + correctly baked**.
2. **Lane canonical-fix PR** (`dan-mercede-lane`) → review pipeline → merge → deploy to
   hermes.
3. **Operational repair** of the 2 live dev.to posts → verify resolution.

(Step 1 must land first — the canonical target must exist before the lane points at it and
before the dev.to posts are repaired.)

## §9 — Deferred / coordination

- **`/works` dev hub (PR2)** — Build + essay index + outbound rail + single CTA; note the
  concurrent `/works` activity (`#32` schemafit just merged) — rebase/coordinate.
- **Business-brand entity repoint** (`sameAs → danmercede.com#person`) — after the AEO arc's
  4 PRs merge; coordinate to avoid fighting that live entity-graph work.
- **Cross-repo `backfill_slugs ⊆ allowlist` automated guard** — a future check (e.g. a lane
  test that reads a published copy of the hub allowlist, or a shared manifest) so the
  invariant is enforced, not just documented.
