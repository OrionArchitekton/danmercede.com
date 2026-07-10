# Spec — Essay in-body asset rewrite (danmercede.com)

Status: drafting · Owner-merge · Surfaced by the hub-feed arc (PR #103's feed
sanitizer had to DROP these figures); root cause fixed here.

## Problem

Essay bodies carry substrate-root-relative image refs
(`publishing/assets/<slug>/<file>`). The served site has no such path: every
in-body figure renders broken on live essay pages (SPA soft-404 behind the
img src), answer engines ingest dead image URLs, and the hub feed must strip
the figures entirely.

## Goal & non-goals

- **Goal:** every resolvable in-body image ref is rewritten at compile time to
  a served src (`/assets/thoughts/<slug>/<file>`) with the binary copied from
  the substrate, using the same guard chain as the existing diagram asset copy.
- **Non-goal:** changing diagram-entry handling, substrate authoring
  conventions, or the feed sanitizer (it keeps guarding whatever remains
  unresolvable).

## Behavior

1. **Compile-time rewrite.** During a substrate compile, each admitted essay's
   body markdown is scanned for `![...](publishing/assets/...)` refs; each
   resolvable asset is copied to `public/assets/thoughts/<slug>/<basename>`
   and the ref rewritten to the served root-relative src. Downstream surfaces
   (baked pages, per-slug pages, the feed) inherit the fix with zero changes.
2. **Prose-first failure mode.** A missing, unsafe (path escape), unsupported
   extension, or uncopyable asset leaves the ref UNREWRITTEN and records a
   'skip' diagnostic. Unlike a diagram entry (image IS the content, loss is
   FATAL), an essay still publishes as prose; `--strict` does not refuse the
   bundle over an embellishment.
3. **Safety parity.** Same guards as `copyDiagramAsset`: safe-relative-path
   check, extension allowlist, substrate-root and destination-dir escape
   checks; nothing is written unless every guard passes.
4. **Inbox-only parity.** With no reachable substrate the body is returned
   verbatim (the compiler already skip-preserves the whole bundle then).

## Test seams

`rewriteEssayBodyAssets` exported from `scripts/compileContent.ts`, exercised
with tmp-dir substrate fixtures in `tests/essayBodyAssets.test.ts` (roster:
`npm test`). CI's existing gate covers the wiring.

## Acceptance criteria

- [ ] Live corpus: zero `publishing/assets` refs remain in
      `constants.generated.ts`; all rewritten refs resolve to copied files.
- [ ] Entry count parity with HEAD (no essay lost to the rewrite).
- [ ] Built essay pages serve working figure srcs; the feed carries the
      figures (absolutized) instead of dropping them.
- [ ] Escape/missing/unsupported cases: ref untouched, 'skip' diagnostic,
      nothing written outside `public/assets/thoughts/<slug>/`.
