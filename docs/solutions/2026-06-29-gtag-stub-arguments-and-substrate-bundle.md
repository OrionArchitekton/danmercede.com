---
title: "gtag stub arguments form and substrate bundle freshness"
status: "fix-prepared"
date: "2026-06-29"
review_after: "2026-07-29"
topics:
  - analytics
  - ga4
  - substrate-verify
  - generated-content
references:
  - analytics/gaConfig.ts
  - components/Analytics.tsx
  - tests/analytics.test.ts
  - constants.generated.ts
  - public/assets/diagrams/
  - .github/workflows/substrate-verify.yml
---

# gtag stub arguments form and substrate bundle freshness

## Summary

Production GA4 loaded `gtag.js`, but the local stub pushed a JavaScript array
into `window.dataLayer`. The GA runtime expects the canonical `arguments`
object, so consent/config/page-view commands were not applied and no collection
beacons were sent.

The code fix was ready, but PR #68 was still blocked because the trusted
`substrate-verify` lane compiled current substrate truth and found the PR's
committed `constants.generated.ts` stale. The branch now carries the analytics
fix, a strict compile of the current substrate bundle, and re-encoded copied
diagram assets that stay inside the repo's public image budget.

## Root Cause

`components/Analytics.tsx` used the rest-parameter form:

```ts
const gtag = (...args) => {
  window.dataLayer!.push(args);
};
```

That creates a plain array entry. GA's shipped stub pushes `arguments` instead,
and the runtime silently ignores array-form command entries.

Separately, the trusted verifier is intentionally stricter than the app build:
it compares the PR bundle to current substrate output, not just to the PR base.
When substrate had newer diagram truth, an otherwise unrelated analytics PR
could not merge until the generated bundle and copied diagram assets were
refreshed.

The fresh substrate copy also exposed that several source diagram JPGs exceeded
the site's committed public-image budget after copy. The budget test is correct:
the served consumer assets should be optimized in the site repo even when the
authoritative source image lives in substrate.

## Resolution

- Extracted `createGtag()` in `analytics/gaConfig.ts`; it initializes/reuses
  `dataLayer` and pushes the canonical `arguments` object.
- Updated `components/Analytics.tsx` to use `createGtag()`.
- Added regression coverage in `tests/analytics.test.ts` that fails if the
  stub pushes a plain array.
- Regenerated `constants.generated.ts` and `public/assets/diagrams/*` from the
  current local substrate checkout using strict compile mode.
- Re-encoded oversized copied diagram JPGs after generation so
  `tests/imageBudget.test.ts` remains a deployment guard instead of being
  weakened for substrate-sourced assets.

## Verification

Prepared verification:

- `SUBSTRATE_PATH=/home/orion/src/orion-estate/personal-brand/dan-mercede/dan-mercede-substrate npm run compile -- --strict --require-matches`
- `npm test`
- `npm run build`
- `git diff --check`
- `gitleaks protect --no-banner --redact --source .`

Pending verification:

- PR #68 CI must pass, including `build`, `gitleaks`,
  `required-checks-fail-closed`, and `substrate-verify`.
- After merge and Vercel production deployment, verify the served bundle sends
  GA4 collection traffic with the expected measurement ID.

## Durable Lesson

Analytics bootstraps are protocol adapters, not harmless shims. Keep them as
small exported helpers with tests against the exact wire shape expected by the
third-party runtime. For substrate consumers, refresh generated substrate truth
before shipping unrelated app changes whenever the trusted verifier reports
current-substrate drift, and treat copied media as deploy assets that must still
meet the consumer repo's image budgets.
