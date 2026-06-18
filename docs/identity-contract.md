# Spoke → Hub Identity Contract (O7)

**Status:** active · **Owner:** danmercede.com (hub) · **Added:** 2026-06-17

## Purpose

The Dan Mercede footprint is five domains, one person. For answer engines and
search to resolve a single, authoritative entity (not five competing ones), the
identity graph must converge on exactly one canonical `Person` node. This
contract is the durable guardrail that keeps the 5-domain footprint from
drifting into competing Person nodes — the "streamline for independent roles"
deconfliction the brand-engine audit (MAP 2026-06-17, row O7) called for.

## The canonical Person

- **Authority:** `danmercede.com` (the hub) is the sole entity authority.
- **Canonical id:** `https://www.danmercede.com/#person` (exported as
  `PERSON_ID` from `seoMeta.ts`).
- The hub declares **exactly one** `Person` node. Its `sameAs` enumerates every
  spoke plus the off-domain identity edges (LinkedIn, X, Instagram, Facebook,
  GitHub).

## Spoke obligations

Each spoke (`danmercede.info`, `danmercede.online`, `danielmercede.com`,
`danielmercede.info`) MUST:

1. **Emit no local `Person` node.** A spoke that mints its own `Person`
   (even with the same name) forks the entity graph. This was explicitly
   reverted once (commits `cf2e6f9` / `71ae5b2`) — do not reintroduce it.
2. **Backlink to the hub Person** via `sameAs` and/or by referencing
   `https://www.danmercede.com/#person` as the `mainEntity` of a `ProfilePage`
   (the doctrine-compatible enrichment — no local Person, see hub row W17).
3. **Keep the canonical job title and name consistent** with the hub
   (`Dan Mercede`, `Founder & AI Systems Architect`).

## Hub obligations

The hub MUST:

1. Keep `PERSON_ID` anchored to the `www` host
   (`https://www.danmercede.com/#person`).
2. Keep `Person.sameAs` covering all four spokes + GitHub.
3. Reference the canonical `#person` from every per-route `ProfilePage` /
   `Article` / `CollectionPage` node (`mainEntity` / `author` / `creator`),
   never introduce a second Person. The `/works` `CollectionPage` and its nested
   `SoftwareSourceCode` items backref `#person` by `@id` (`creator`); they add no
   Person node.

## Enforcement

- **Hub side (enforced here):** `tests/identityCanonical.test.ts` asserts the
  hub declares exactly one `Person`, that it is `#person` on the `www` host,
  that `sameAs` covers the four spokes + GitHub, and that per-route
  `ProfilePage` nodes reference the canonical `#person`.
- **Spoke side (follow-up):** the spokes have no CI/test harness today
  (`npm install`, no lockfile, no protection). A spoke-side assertion — a small
  check that the served JSON-LD contains no local `Person` `@type` and links
  back to `#person` — is a noted follow-up to add when (if) the spokes grow a
  test lane. Until then this contract doc + the hub-side test are the guardrail;
  spoke drift is caught by review against this document.

## Change protocol

Editing the canonical identity (renaming `#person`, moving the host, dropping a
spoke from `sameAs`) is a contract change: update this doc and
`tests/identityCanonical.test.ts` in the same PR, and confirm no spoke begins
emitting a local `Person`.
