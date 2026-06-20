# danmercede.com Essay-Anchoring Foundation (PR1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the flagship long-form essays a real, baked, crawler-visible canonical home on danmercede.com (via a hub-side allowlist), align the lane syndication canonical to `/thoughts/<slug>`, and repair the 2 live dev.to posts whose canonical points at a soft-404.

**Architecture:** Reuse the hub's existing build-time bake (`injectRouteMeta` already emits per-route head + canonical + Article JSON-LD + crawlable body, including dynamic `thoughtPaths()`). The only change is *admission*: `compileContent.ts` admits substrate canonicals by `surface_targets ∋ danmercede.com`; add a curated `HUB_ESSAY_ALLOWLIST` that also admits flagship essays by slug (consumer-side opt-in; substrate untouched — mirrors the lane's `backfill_slugs`). Then a one-line lane canonical fix + an operational dev.to repair.

**Tech Stack:** danmercede.com — Vite 6 + React 19 + react-router 7 SPA, TypeScript, `tsx --test` (node:test) test suite, build = `vite build && tsx scripts/injectRouteMeta.ts`, prebuild = `tsx scripts/compileContent.ts`, deploy = Vercel (filesystem precedence for baked `/thoughts/<slug>/index.html`). dan-mercede-lane — Python 3.11, `pytest`, `ruff`.

**Spec:** `specs/com-essay-anchoring-foundation-spec.md` (AC1–AC7).
**Worktrees:** hub = `/home/orion/.worktrees/codex-com-essay-anchoring-20260620` (branch `codex/com-essay-anchoring-foundation-20260620`, off `danmercede.com` main). lane worktree = created in Part B.
**Commit identity:** danmercede.com → `Dan Mercede <dan@danmercede.com>`, **no Claude trailer** (public brand repo convention). lane → per lane convention (Claude trailer OK).

**Key facts (verified, do not re-derive):**
- The gate to change is `mapSubstrateToEntry` in `scripts/compileContent.ts` (~L284-289): returns null when `surface_targets` lacks `THIS_SURFACE = 'danmercede.com'`. The allowlist must be checked HERE (needs `data['slug']`, which is otherwise read later at ~L307). The allowlist overrides ONLY the surface_targets gate — `status='canonical'`, `type ∈ ACCEPTED_TYPES={'essay-long'}`, required-fields, and date gates STILL apply.
- The 2 essays are `type: essay-long`, `status: canonical` (assumed — verify), `layer: authority-gate` (→ category `'Architecture'` via `LAYER_TO_CATEGORY`), `surface_targets: [linkedin, danmercede.online]`, and carry `claim`. So they pass every gate except surface_targets.
- `mapSubstrateToEntry` is exported and unit-testable directly: `mapSubstrateToEntry(data, body, filename, diagnostics?)`.
- Regenerating `constants.generated.ts` runs `tsx scripts/compileContent.ts`, which resolves substrate via `SUBSTRATE_PATH` env OR the `../dan-mercede-substrate` sibling. **In a worktree the sibling does not exist → you MUST set `SUBSTRATE_PATH`** to the real substrate, or the compile drops the entire corpus (memory `brand_publish_worktree_drops_substrate`). Real substrate: `/home/orion/src/orion-estate/personal-brand/dan-mercede/dan-mercede-substrate`.
- Lane `hub_canonical_url` (`dan-mercede-lane/tools/_lib/syndication_body.py` L97-99) returns `f"{owned}/{slug}/"`.
- Live dev.to posts to repair: ids `3947128` (authority-gate-made-runnable) + `3947130` (pre-execution-authority-gates).

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `scripts/compileContent.ts` (modify) | danmercede.com | Add `HUB_ESSAY_ALLOWLIST` + allowlist admission in `mapSubstrateToEntry`. |
| `tests/compileContent.test.ts` (modify) | danmercede.com | Allowlist admit / still-skip / type-still-skip cases. |
| `constants.generated.ts` (regenerate) | danmercede.com | Now includes the 2 essays. |
| `tools/_lib/syndication_body.py` (modify) | dan-mercede-lane | `hub_canonical_url → /thoughts/<slug>`. |
| `tests/test_syndication_body.py` (+ render tests) (modify) | dan-mercede-lane | Updated canonical/backlink expectations. |
| `lane.toml` (modify) | dan-mercede-lane | `[syndication]` invariant note (`backfill_slugs ⊆` hub allowlist). |
| `specs/devto-hashnode-publish-spec.md` (modify) | dan-mercede-lane | Canonical-reference + invariant note. |

---

## Part A — Hub allowlist (`danmercede.com` worktree)

### Task A1: Allowlist admission in the compiler

**Files:**
- Modify: `scripts/compileContent.ts` (add const near L65; edit gate ~L284-289)
- Test: `tests/compileContent.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/compileContent.test.ts` (the file already `import`s from `'../scripts/compileContent.js'` — add `HUB_ESSAY_ALLOWLIST` to that import):

```typescript
test('mapSubstrateToEntry admits an allowlisted slug whose surface_targets exclude danmercede.com', () => {
  const slug = HUB_ESSAY_ALLOWLIST[0];
  const data = {
    slug, title: 'The Authority Gate', date: '2026-06-08', claim: 'A claim.',
    status: 'canonical', type: 'essay-long', layer: 'authority-gate',
    surface_targets: ['linkedin', 'danmercede.online'],
  };
  const entry = mapSubstrateToEntry(data, 'Essay body.', `${slug}.md`);
  assert.ok(entry, 'allowlisted essay should be admitted');
  assert.equal(entry?.slug, slug);
  assert.equal(entry?.category, 'Architecture'); // layer authority-gate -> Architecture
  assert.equal(entry?.body, 'Essay body.');
});

test('mapSubstrateToEntry still skips a non-allowlisted slug whose surface_targets exclude danmercede.com', () => {
  const data = {
    slug: 'not-allowlisted-slug', title: 'X', date: '2026-06-08', claim: 'C.',
    status: 'canonical', type: 'essay-long', surface_targets: ['linkedin'],
  };
  assert.equal(mapSubstrateToEntry(data, 'b', 'x.md'), null);
});

test('allowlist overrides ONLY surface_targets — an allowlisted slug of an unaccepted type is still skipped', () => {
  const slug = HUB_ESSAY_ALLOWLIST[0];
  const data = {
    slug, title: 'X', date: '2026-06-08', claim: 'C.',
    status: 'canonical', type: 'diagram', surface_targets: ['linkedin'],
  };
  assert.equal(mapSubstrateToEntry(data, 'b', 'x.md'), null);
});

test('HUB_ESSAY_ALLOWLIST contains the 2 flagship essays', () => {
  assert.ok(HUB_ESSAY_ALLOWLIST.includes('2026-06-08-authority-gate-made-runnable'));
  assert.ok(HUB_ESSAY_ALLOWLIST.includes('2026-05-20-pre-execution-authority-gates'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/orion/.worktrees/codex-com-essay-anchoring-20260620 && npm test 2>&1 | tail -20`
Expected: FAIL — `HUB_ESSAY_ALLOWLIST` is not exported (import error) / admit test returns null.

- [ ] **Step 3: Add the allowlist constant**

In `scripts/compileContent.ts`, immediately after `const THIS_SURFACE = 'danmercede.com';` (L64):

```typescript
// Hub-side consumer allowlist (mirrors the lane's [syndication] backfill_slugs +
// the distribution_opt_in_lane_side_not_sealed_substrate lesson). Flagship
// long-form essays whose substrate surface_targets do NOT include danmercede.com
// (substrate is immutable — frontmatter re-tagging is a no-op) are admitted to the
// hub /thoughts corpus by slug. This overrides ONLY the surface_targets gate; the
// status/type/required-field/date gates still apply. INVARIANT: the lane's
// [syndication] backfill_slugs MUST be a subset of this list (an essay may only
// carry a .com canonical if it has a .com page).
export const HUB_ESSAY_ALLOWLIST: readonly string[] = [
  '2026-06-08-authority-gate-made-runnable',
  '2026-05-20-pre-execution-authority-gates',
];
```

- [ ] **Step 4: Edit the surface_targets gate**

In `mapSubstrateToEntry`, replace the gate (~L284-289):

```typescript
  const surfaceTargets = data['surface_targets'];
  if (!Array.isArray(surfaceTargets) || !surfaceTargets.includes(THIS_SURFACE)) {
    console.log(`   ℹ️  substrate canonical skipped (surface_targets): ${filename}`);
    pushDiag('skip', 'surface_targets does not include danmercede.com');
    return null;
  }
```

with:

```typescript
  const surfaceTargets = data['surface_targets'];
  const surfaceTargeted =
    Array.isArray(surfaceTargets) && surfaceTargets.includes(THIS_SURFACE);
  const slugRaw = data['slug'];
  const allowlisted =
    typeof slugRaw === 'string' && HUB_ESSAY_ALLOWLIST.includes(slugRaw);
  if (!surfaceTargeted && !allowlisted) {
    console.log(`   ℹ️  substrate canonical skipped (surface_targets): ${filename}`);
    pushDiag('skip', 'surface_targets does not include danmercede.com');
    return null;
  }
  if (allowlisted && !surfaceTargeted) {
    console.log(`   ✅ substrate canonical admitted via HUB_ESSAY_ALLOWLIST: ${filename}`);
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS (4 new tests + the existing suite green).

- [ ] **Step 6: Commit**

```bash
git add scripts/compileContent.ts tests/compileContent.test.ts
git commit -m "feat(compile): admit flagship essays via HUB_ESSAY_ALLOWLIST"
```
(Identity is `Dan Mercede <dan@danmercede.com>`, no trailer — repo default config already set.)

### Task A2: Regenerate the corpus + verify the bake

**Files:**
- Regenerate: `constants.generated.ts`

- [ ] **Step 1: Regenerate constants.generated.ts with SUBSTRATE_PATH set**

Run (SUBSTRATE_PATH is REQUIRED in a worktree — the sibling fallback path does not exist here):
```bash
SUBSTRATE_PATH=/home/orion/src/orion-estate/personal-brand/dan-mercede/dan-mercede-substrate npm run compile 2>&1 | tail -20
```
Expected: log includes `✅ ... admitted via HUB_ESSAY_ALLOWLIST` for both essays.

- [ ] **Step 2: Verify the 2 essays were added + review the full diff**

```bash
grep -c -E '2026-06-08-authority-gate-made-runnable|2026-05-20-pre-execution-authority-gates' constants.generated.ts
git diff --stat constants.generated.ts
```
Expected: the grep returns `2`. **Review `git diff constants.generated.ts`:** the 2 essays MUST appear. Any OTHER added/changed entries are substrate-forward-syncs (newer `.com`-targeted thoughts committed to substrate since the last sync) — confirm each is a legitimate `.com` essay; if anything unexpected appears, STOP and surface it before committing (do not silently widen the corpus).

- [ ] **Step 3: Run the full hub test suite + build**

```bash
npm test 2>&1 | tail -15
SUBSTRATE_PATH=/home/orion/src/orion-estate/personal-brand/dan-mercede/dan-mercede-substrate npm run build 2>&1 | tail -15
```
Expected: all tests pass (incl. `sitemapParity`, `headHygiene`, `bodyBake`, `identityCanonical`); build succeeds; `injectRouteMeta` log reports the thought count increased by 2.

- [ ] **Step 4: Verify the baked essay pages (the AC3/AC4 proof)**

```bash
for s in 2026-06-08-authority-gate-made-runnable 2026-05-20-pre-execution-authority-gates; do
  f="build/thoughts/$s/index.html"
  echo "== $f =="; test -f "$f" && grep -oE '<title>[^<]*</title>|<link rel="canonical"[^>]*>' "$f" | head -2 || echo "MISSING";
done
grep -c -E 'thoughts/2026-06-08-authority-gate-made-runnable|thoughts/2026-05-20-pre-execution-authority-gates' build/sitemap.xml
```
Expected: each `index.html` exists with the **essay title** (not the homepage title) and `rel="canonical"` = the self `/thoughts/<slug>` URL; sitemap grep returns `2`. (Capture the exact canonical form here — it is the byte-match target for the lane fix, Part B.)

- [ ] **Step 5: Commit**

```bash
git add constants.generated.ts
git commit -m "content: anchor 2 flagship essays on .com via hub allowlist (regenerate corpus)"
```

> **After Part A merges + Vercel deploys:** independently verify `curl -s https://www.danmercede.com/thoughts/2026-06-08-authority-gate-made-runnable | grep -oE '<title>[^<]*</title>'` shows the essay title (not homepage). This is the gate before Part B/C.

---

## Part B — Lane canonical fix (`dan-mercede-lane` worktree)

> Do Part B only AFTER Part A is merged + deployed and the `/thoughts/<slug>` pages verified live. Create a fresh lane worktree off `dan-mercede-lane` main first (`superpowers:using-git-worktrees`): `git -C /home/orion/src/orion-estate/personal-brand/dan-mercede/lane fetch origin && git -C ... worktree add /home/orion/.worktrees/codex-lane-canonical-thoughts-20260620 -b codex/lane-canonical-thoughts-20260620 origin/main`.

### Task B1: Point hub_canonical_url at /thoughts/<slug>

**Files:**
- Modify: `tools/_lib/syndication_body.py` (`hub_canonical_url`, L97-99)
- Test: `tests/test_syndication_body.py` (+ `tests/test_render_devto.py` / `test_render_hashnode.py` if they assert the canonical/backlink)
- Modify: `lane.toml` (`[syndication]` note), `specs/devto-hashnode-publish-spec.md` (note)

- [ ] **Step 1: Update the failing test first**

In `tests/test_syndication_body.py`, change the canonical expectation to the byte-exact form verified in Part A Task A2 Step 4 (shown here as the no-trailing-slash `/thoughts/<slug>` form; **use whatever Part A confirmed**):

```python
def test_hub_canonical_url_points_at_thoughts_route() -> None:
    url = syndication_body.hub_canonical_url("2026-06-08-authority-gate-made-runnable")
    assert url == "https://www.danmercede.com/thoughts/2026-06-08-authority-gate-made-runnable"
```
Also grep the test files for the old `/<slug>/` canonical and update every assertion:
```bash
grep -rn 'danmercede.com/{' tools/_lib/syndication_body.py; grep -rn 'canonical' tests/test_syndication_body.py tests/test_render_devto.py tests/test_render_hashnode.py
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd <lane worktree> && /usr/local/bin/python3.11 -m pytest tests/test_syndication_body.py -q 2>&1 | tail -15`
Expected: FAIL (current return is `…/<slug>/`).

- [ ] **Step 3: Implement**

In `tools/_lib/syndication_body.py` `hub_canonical_url` (L97-99):
```python
def hub_canonical_url(slug: str, *, lane_toml_path: Path = LANE_TOML) -> str:
    owned = str(_load_identity(lane_toml_path)["owned_domain"]).rstrip("/")
    return f"{owned}/thoughts/{slug}"
```
(Use the EXACT form Part A confirmed for the hub's self-canonical — if the hub emits a trailing slash, match it.)

- [ ] **Step 4: Run tests to verify pass + full suite + lint**

```bash
/usr/local/bin/python3.11 -m pytest -q 2>&1 | tail -6
/usr/local/bin/python3.11 -m ruff check tools/ tests/ && /usr/local/bin/python3.11 -m ruff format --check tools/ tests/
```
Expected: all pass; ruff clean.

- [ ] **Step 5: Document the invariant**

In `lane.toml` `[syndication]`, add a comment above `backfill_slugs`:
```toml
# INVARIANT: every backfill slug MUST also be in the danmercede.com hub allowlist
# (scripts/compileContent.ts HUB_ESSAY_ALLOWLIST) so its rel=canonical
# (hub_canonical_url -> /thoughts/<slug>) resolves to a real baked .com page.
# Syndicating a non-.com-published essay yields a soft-404 canonical (the PR #57
# defect this fixes).
```
In `specs/devto-hashnode-publish-spec.md`, add a one-line note under the canonical section that the canonical is `/thoughts/<slug>` and the `backfill_slugs ⊆ hub allowlist` invariant.

- [ ] **Step 6: Commit**

```bash
git add tools/_lib/syndication_body.py tests/ lane.toml specs/devto-hashnode-publish-spec.md
git commit -m "$(cat <<'EOF'
fix(syndication): canonical -> /thoughts/<slug> (resolving hub page)

PR #57 set the dev.to canonical to www.danmercede.com/<slug>/ which is a
soft-404 (the hub serves essays at /thoughts/<slug>, and these essays weren't
.com-published). Point hub_canonical_url at the resolving /thoughts/<slug> page
(now baked via the hub allowlist) + document the backfill_slugs ⊆ hub-allowlist
invariant so a non-.com essay can't get a .com canonical again.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Part C — Operational repair of the 2 live dev.to posts (post-merge, NOT a TDD task)

> Do Part C only AFTER Part A deployed (pages live) AND Part B merged + deployed to hermes. Runs on hermes-01 (where the queue + Doppler key live).

- [ ] **Step 1: Re-render the 2 artifacts with the corrected canonical**

On hermes, re-run the backfill so the queued artifacts carry the new `/thoughts/<slug>` canonical + body backlink:
```bash
ssh hermes@hermes-01 'cd /home/hermes/dan-mercede-lane && git pull --ff-only && doppler run -- .venv/bin/python -m tools.syndicate_backfill --json' 2>&1 | tail -20
```
Confirm the re-rendered artifacts' `canonical_url` is `…/thoughts/<slug>`.

- [ ] **Step 2: PUT-update the 2 live dev.to articles**

The publish path is publish-once (won't re-POST), so update the LIVE articles directly. For ids `3947128` and `3947130`, read the re-rendered artifact (title/body/tags) and `PUT https://dev.to/api/articles/{id}` with `{"article": {"canonical_url": "<.../thoughts/<slug>>", "body_markdown": "<re-rendered body>"}}` (headers: `api-key`, `Accept: application/vnd.forem.api-v1+json`, `Content-Type: application/json`). A small one-off python/urllib or `requests` script run via `doppler run` on hermes; no committed lane capability.

- [ ] **Step 3: Verify resolution (AC6)**

```bash
for id in 3947128 3947130; do
  ssh hermes@hermes-01 "cd /home/hermes/dan-mercede-lane && doppler run -- .venv/bin/python - <<PY
import os,requests
r=requests.get('https://dev.to/api/articles/$id',headers={'api-key':os.environ['DEV_TO_API_KEY'].strip(),'Accept':'application/vnd.forem.api-v1+json'},timeout=20)
print($id, r.json().get('canonical_url'))
PY"
done
```
Expected: each `canonical_url` is `https://www.danmercede.com/thoughts/<slug>`. Then `curl -s <that url> | grep -oE '<title>[^<]*</title>'` shows the essay title (resolves, not homepage).

---

## Self-Review

**Spec coverage:** AC1 (allowlist admit/skip) → A1; AC2 (corpus has 2 essays) → A2 S2; AC3 (baked pages head+canonical+body) → A2 S4 + existing bake tests; AC4 (sitemap) → A2 S4 + `sitemapParity`; AC5 (lane canonical + invariant) → B1; AC6 (dev.to resolves) → C3; AC7 (suites green) → A2 S3 + B1 S4. All covered.

**Placeholder scan:** none — exact files, commands, code, and the SUBSTRATE_PATH/canonical-byte-match gotchas are inlined.

**Type/name consistency:** `HUB_ESSAY_ALLOWLIST` (exported const) used in A1 code + tests; `mapSubstrateToEntry(data, body, filename)` signature matches the source; `hub_canonical_url(slug)` matches the lane source; category `'Architecture'` matches `LAYER_TO_CATEGORY['authority-gate']`.

**Implementer flags:** (1) confirm the 2 essays' substrate `status` is `canonical` (assumed; if not, they won't admit — surface it). (2) The lane canonical must byte-match the hub's emitted self-canonical from A2 S4 — if the hub uses a trailing slash, use it in B1. (3) Watch the A2 corpus diff for unexpected substrate-forward-syncs.
