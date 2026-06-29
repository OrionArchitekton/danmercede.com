# Spec — Diagram content type: .com canonical route family + cross-surface POSSE

Status: DRAFT for review · Date: 2026-06-28 · Arc: 2 repos (danmercede-com, danmercede-online) — substrate untouched, see REFINEMENT 3
Companion build scope: `diagram-feed-canonical-and-plan.md`. Locked decisions below are settled — assert, don't re-litigate.

## Purpose

Give the personal brand a **diagram content type** whose **SEO canonical lives on the danmercede.com hub** as a per-route indexable page, so architecture/agentic diagrams consolidate search authority to the hub (the same canonical model the essays use), are syndicated (POSSE) to LinkedIn/X, and retain an AEO presence on danmercede.online that points back. Covers both the **21 already-published** diagrams (consolidate their canonical onto .com) and **net-new** diagrams (author → drip).

## Locked decisions

1. **Admission:** a diagram is admitted to the .com hub by SLUG via the `.com`-side `HUB_DIAGRAM_ALLOWLIST` (mirrors the existing `HUB_ESSAY_ALLOWLIST`), which overrides only the `surface_targets` gate. **ZERO substrate edits.** (Superseded 2026-06-28 — see REFINEMENT 3: the original "add `danmercede.com` to the 21 canonicals' `surface_targets`" is infeasible because substrate canonicals are immutable — `tools/promote.py` has no retarget mode and hand-edits are forbidden by `VAULT_SCHEMA.md`. The allowlist is the doctrine-compliant equivalent and needs no `substrate.lock.toml` re-pin.)
2. **Route shape:** a `/diagrams` index page + a `/diagrams/<slug>/` detail page per diagram (mirrors `/thoughts` + `/guides`).
3. **Slug:** the existing date-prefixed substrate slug (1:1 map across surfaces).
4. **Structured data:** the detail page's primary entity is an `ImageObject`; `author`/`publisher` reference the single hub `#person` by `@id` (no second Person node).
5. **Backfill vs drip:** all 21 existing diagrams bake on .com immediately at their real backdated dates; net-new diagrams drip ≤2/week through the authoring pipeline.
6. **.online:** the existing per-slug diagram page is **kept** as an AEO teaser whose `rel=canonical` (and entry JSON-LD) point to the .com detail page; `.com` owns the `<image:image>` sitemap entry (the .online diagram entries drop theirs). The .online demote **ships in the same PR** as the .com pages go live.
7. **Assets:** diagram images are optimized/compressed to stay within `.com`'s `imageBudget`; carve-out only if compression degrades legibility.

## Ubiquitous language

- **Diagram** — a `type: diagram` substrate canonical with `alt_text`, `caption`, `asset_path`, a date-prefixed slug, and the rendered image binary.
- **Hub / canonical surface** — danmercede.com; the per-route indexable page that owns the `rel=canonical` and the image-sitemap entry.
- **AEO teaser** — the danmercede.online per-slug page; renders the diagram for answer-engine retrieval but `rel=canonical`s to the hub.
- **POSSE** — Publish (on hub) Once, Syndicate Everywhere: LinkedIn carousel + X image thread, each linking the hub canonical.

## Scenarios (vertical slices — each end-to-end, independently demoable, dependency-ordered)

**S1 — A diagram canonical becomes an indexable hub page (core tracer bullet).**
Given a substrate diagram canonical whose `surface_targets` includes `danmercede.com`, when the hub site builds, then `https://www.danmercede.com/diagrams/<slug>/` exists as a baked, crawlable page that: renders the diagram image with its `alt_text` and a visible `caption`; declares a self-`rel=canonical` to its own .com URL; emits `ImageObject` JSON-LD referencing `#person` by `@id`; and bakes the alt/caption as crawlable prose (hydrated body matches baked body).
*Acceptance:* the baked `index.html` for one diagram slug passes all of the above; a non-`danmercede.com`-targeted diagram does NOT produce a hub page.

**S2 — The hub exposes a diagram index + image sitemap.**
Given ≥1 admitted diagram, when the hub builds, then a `/diagrams` index page lists the diagrams (newest first) and the sitemap declares the image namespace, includes the static `/diagrams` URL, and carries one build-generated `<image:image>` child per diagram detail URL (image loc + caption).
*Acceptance:* `sitemapParity` passes with `/diagrams` in the committed sitemap and per-slug diagram entries present only in the build-generated output (never hand-committed); the single-Person identity invariant still holds.

**S3 — The .online diagram page demotes to a hub-pointing teaser.**
Given a diagram that now has a hub canonical, when the .online site builds, then its per-slug diagram page `rel=canonical`s to the .com detail URL (and its entry JSON-LD `url`/`@id`/`mainEntityOfPage` point to .com), while essay/note pages keep self-canonicaling; the .online diagram sitemap entry no longer claims the image.
*Acceptance:* the .online per-slug spec/test asserts diagram-type pages canonical to .com (the prior "every entry self-canonical" invariant is updated for the carve-out); essays unaffected.

**S4 — All 21 published diagrams consolidate onto the hub.**
Given the 21 existing diagram canonicals, when their slugs are added to `HUB_DIAGRAM_ALLOWLIST` (zero substrate edits) and the bundle is regenerated, then all 21 bake on .com at their real backdated dates with the S1 guarantees.
*Acceptance:* the substrate is untouched (no `validate`/`check_substrate_lock` change needed); 21 hub pages exist; no slug collides with a reserved path / `/thoughts` slug / `/works` microsite rewrite.

**S5 — Diagram assets stay within the hub image budget.**
Given the diagram binaries copied into the hub, when the image-budget check runs, then it passes (assets optimized), with no legibility regression.
*Acceptance:* `imageBudget` green; spot-check that optimized images remain legible.

**S6 — Net-new diagrams flow through authoring → drip (the "Both" half).**
Given a curated, redaction-cleared net-new diagram, when it is authored into substrate with `surface_targets = [danmercede.online, danmercede.com]` and required fields, then it flows through the same S1–S3 guarantees on a ≤2/week backdated drip; the POSSE convention emits a LinkedIn carousel (via the lane `threads-carousel-skill`) + an X image thread, each linking the hub canonical.
*Acceptance:* one net-new diagram travels end-to-end (substrate → hub page + .online teaser) on the drip schedule; the POSSE links resolve to the hub canonical (which returns 200, not soft-404).

## Test seams (fewest, highest — extend existing)

1. **Hub baked-output assertions (primary)** — extend `sitemapParity` / `identityCanonical` and add diagram-route tests that assert against the built `index.html` + generated sitemap (covers S1, S2, S4, S5). This is the one high seam exercising compile→seoMeta→injectRouteMeta→route render.
2. **Substrate `validate` gate** — admission + required-field + path-traversal-on-asset-copy (S4, S6).
3. **.online per-slug output** — diagram-type canonical carve-out (S3).

## Out of scope

- No new lane posting channel (POSSE is a copy/link convention; `surface_admission` maps `danmercede.com` to no channel).
- No Instagram, no X-Articles, no Medium automation (Medium API archived).
- No redesign of the essay/guide families; no client-side router on .online.

## Rollout / sequencing / risk

- **Sequencing (2-repo, revised per REFINEMENT 3):** PR-com-1 (hub compiler + route family + EMPTY allowlist; admits 0 → bundle unchanged → substrate-verify green) → admission PR (populate `HUB_DIAGRAM_ALLOWLIST` with the 21 slugs; the `substrate-sync` regen produces the 21-diagram bundle) **co-shipped with** the .online demote to close the competing-canonical window. Net-new drip (S6) follows. The substrate is never edited; there is no PR-sub and no lock re-pin.
- **Fail-closed gates that must stay green:** `sitemapParity`, `identityCanonical`, `imageBudget`; `.com` `substrate-verify`. Vercel prebuild deploy-truth — verify the committed bundle == live before declaring done. (Substrate `validate` / lane `check_substrate_lock` are NOT touched — zero substrate churn.)
- **Risks:** competing canonicals if .online demote lags .com (mitigate: co-ship the demote with the admission/regen PR); large assets tripping imageBudget (mitigate: optimize, relevant once binaries are copied at regen); slug shadowing (mitigate: verify slugs vs reserved/thought/works paths before populating the allowlist).

---

## VERIFIED RECON + REFINEMENTS (2026-06-28, live-code-grounded)

Recon against the live repos confirmed the premise and forced two refinements to the build mechanism (WHAT we build is unchanged; HOW the compile/CI integrates is refined).

**Verified substrate state (dan-mercede-substrate `main`):**
- 21 `type: diagram` canonicals EXIST on `main/publishing/canonical/` (PR #14, merged 2026-06-18, not reverted). They use JSON-quoted-key frontmatter (`"type": "diagram"`) — a naive `grep 'type:'` false-negatives ([[feedback_frontmatter_quoted_key_breaks_naive_grep]]).
- Each carries: `slug`, `title`, `date` (ISO-8601 w/ offset), `type: diagram`, `surface_targets: ["danmercede.online"]` (stays as-is — admission is now `.com`-side by slug, REFINEMENT 3), `layer`, `tags`, `alt_text`, `caption`, `asset_path` (`publishing/assets/<slug>/diagram.{jpg,svg,png}`), `lineage_sources` (+sha256), `wiki_refs`, `status: canonical`, `gate_report`.
- The `.online` feed is LIVE (42 diagram refs baked in its `constants.generated.ts`; 21 binaries in `public/assets/diagrams/`).

**REFINEMENT 1 — fold diagrams into the VERIFIED `constants.generated.ts`, NOT a separate `constants.diagrams.generated.ts`.** The `substrate-verify` trusted lane (pull_request_target, base-compiler, byte-compares `constants.generated.ts`) is the security anchor of the substrate-consumer contract. A separate generated file would be UNVERIFIED → a PR could hand-inject baked content (the exact hole substrate-verify closes). So `compileContent.ts` admits `type: diagram` and emits a `DIAGRAMS` array INTO the same verified bundle. (Supersedes the build-scope's "separate file" suggestion.)

**REFINEMENT 2 — compiler-change/bundle-regen sequencing (AGENTS.md "Compiler-change caveat").** `substrate-verify` runs the BASE compiler; a PR that changes the compiler's output shape AND regenerates the bundle fails verification. Doctrine-compliant sequence (admission path revised by REFINEMENT 3):
1. **PR-com-1 (compiler):** teach `.com` the diagram type (compileContent admit + `DiagramEntry` + seoMeta diagram fns + injectRouteMeta loop + `/diagrams` routes + an EMPTY `HUB_DIAGRAM_ALLOWLIST` + tests), bundle UNCHANGED (allowlist empty ⇒ 0 diagrams admitted; base + new compiler both emit thoughts-only). substrate-verify green. ← this PR (#62).
2. **admission PR (`.com`):** populate `HUB_DIAGRAM_ALLOWLIST` with the 21 diagram slugs (zero substrate edits).
3. **bundle regen:** the `substrate-sync` workflow runs the NOW-merged diagram-aware compiler against the UNCHANGED substrate → admits the 21 allowlisted diagrams → regenerates `constants.generated.ts` with the 21 diagrams + copies the binaries → review PR → merge. (Co-ship the `.online` demote in this window to close the competing-canonical gap. Steps 2+3 can be one PR.)

**REFINEMENT 3 — admission is `.com`-side allowlist, NOT a substrate `surface_targets` edit (2026-06-28, doctrine conflict resolved with Dan).** The original decision #1 ("add `danmercede.com` to the 21 canonicals' `surface_targets`") is INFEASIBLE: substrate canonicals are immutable (`VAULT_SCHEMA.md` "Canonical Immutability"; `tools/promote.py` has no retarget mode — only supersession; hand-edits forbidden). Re-promoting 21 new canonicals would change every slug and supersede the `.online`-live originals (destructive). Resolution (Dan-ratified): admit by slug via `HUB_DIAGRAM_ALLOWLIST`, exactly mirroring the existing `HUB_ESSAY_ALLOWLIST` (which already admits 6 `.com` essays whose substrate `surface_targets` lack `.com`). Consequences: the arc drops from 3 repos to **2** (substrate untouched — no PR-sub, no `substrate.lock.toml` re-pin); `.com` owns the full admission record (an allowlist file) instead of the substrate frontmatter.

**S1 micro-slice decomposition (one RED→GREEN each):** S1a compiler admits `type: diagram` → `DiagramEntry` (asset-copy + path-traversal guard); S1b `DIAGRAMS` into the verified bundle + `Diagram` type + constants re-export; S1c seoMeta `diagramMeta`/`diagramPaths`/`renderDiagramSitemapEntries`(+`<image:image>`)/`ImageObject` JSON-LD/breadcrumb; S1d injectRouteMeta diagram loop (bakes `build/diagrams/<slug>/index.html`); S1e `App.tsx` `/diagrams` index + detail routes (hydration parity).

**Resume point:** worktree `/home/orion/.worktrees/dmcom-diagram-route-family` on `codex/diagram-canonical-route-family-20260628` (off `origin/main` dc15454). Next action = **S1a RED**: a failing test that `compileContent` admits a `type: diagram` fixture (currently skipped — `ACCEPTED_TYPES = {'essay-long'}`). Test seam = `tests/compileContent.test.ts` (fixture-driven, calls the mapper directly).
