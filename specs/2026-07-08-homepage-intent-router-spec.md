# Spec: Homepage intent-router

**Feature:** danmercede.com homepage routes visitors by intent (the authority-router role).
**Status:** shipped 2026-07-08 (top-funnel reposition, STEP-2 PR-B).
**Domain terms:** *intent-router* (the homepage card grid that sends a visitor to the surface fitting their intent); *authority router* (danmercede.com's role, distinct from OIA the commercial lane).

## Why

danmercede.com is the authority and trust layer, not a second OIA sales site. A visitor
arrives with one of a few intents; the homepage should route each to the right surface
rather than pushing everyone into one enterprise CTA.

## Scenarios

- **A SMB buyer who wants help** sees a card that routes to Orion Intelligence Agency
  (the commercial lane), opening the OIA engagement surface in a new tab. This is the
  only outbound card.
- **A technical reader** sees a card that routes in-hub to the engineering surfaces
  (Guides, and by extension Thoughts and Works).
- **A reliability or governance reader** sees a card that routes in-hub to the proof
  surface (the reliability and governance archive).
- **An investor or operator** sees a card that routes in-hub to the Orion ecosystem
  and Orion Apex Capital.

## Constraints / acceptance criteria

- The intent-router renders on the homepage only, below the hero, above the deeper
  content sections. It is a navigational element, not decorative content.
- Exactly one card is outbound (the SMB to OIA card). The other three route to existing
  in-hub routes (`/guides`, `/proof`, `/ecosystem`). No card links to a route that does
  not exist.
- The router is client-rendered only; it is never baked into the homepage crawler body,
  so the `/` identity body stays free of call-to-action copy (contentBoundary guard).
- Governance is preserved as credibility, not deleted: the governance/reliability card
  remains a first-class route.

## Test seam

Exercised at the existing `routeCoverage` seam (internal links resolve to real routes)
plus the `contentBoundary` seam (the `/` baked body stays identity-only). No new test
harness is introduced; the router is data-driven from `INTENT_ROUTES` in `constants.ts`.
