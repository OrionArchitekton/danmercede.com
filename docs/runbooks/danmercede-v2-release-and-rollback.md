---
verified: 2026-11-25
review_after: 2027-02-25
topics: [release, rollback, meridian-monograph, vercel, preservation]
references:
  - vercel.json
  - tests/v2DesignSystem.test.ts
  - specs/danmercede-v2-flagship-reinvention-spec.md
  - docs/runbooks/danmercede-v2-post-deploy-monitoring.md
---

# DanMercede.com v2.0 Release and Rollback Runbook

This runbook governs release, isolated preview verification, and instant rollback for `release/danmercede-v2.0` ("The Meridian Monograph") on `OrionArchitekton/danmercede.com` without mutating `main`.

## 1. Preserved Original State (`v1.0`)

- **Unmodified production branch:** `main` at commit `95d47d921ddf25d274891e410bd503dd99e4f4bc`
- **Immutable recovery git tag (pushed to `origin`):** `recovery/danmercede-v1.0-prod-20261125`
- **Preserved Vercel production deployment (`v1.0`):** `dpl_H1WcxtcLSc49TT2LmFwjwgyhP2P9` (`https://danmercede-d4ihg883t-dan-mercedes-projects.vercel.app`)
- **Versioned release branch (`v2.0`):** `release/danmercede-v2.0`

## 2. Pre-Release Qualification Gates

Before promoting any preview or running `vercel deploy --prod`:

1. `npx tsc --noEmit` exits `0`.
2. `npm test` passes completely (`792/792` declarations).
3. `npm run build && npm run test:built` succeeds (`113` baked HTML routes + feeds + sitemap, `33/33` built tests pass).
4. `orion-web-capture` returns `BLOCKING: 0` across `/`, `/works`, `/proof`, `/about`, `/ecosystem`, `/thoughts`, `/guides`, `/diagrams`, `/connect`.
5. `orion-web-audit` passes `Performance >= 0.95`, `Accessibility = 1.00`, `SEO = 1.00` on `/`, `/works/`, `/proof/`, `/about/`, `/connect/`.
6. `vercel.json` emits `X-Robots-Tag: noindex, nofollow` on `^.*\.vercel\.app$` and never on `www.danmercede.com` or `danmercede.com`.
7. Zero banned long dashes (`U+2013`, `U+2014`, `U+2015`) across authored code, copy, `<title>`, specs, and runbooks, and `gitleaks git` exits clean (`0` leaks).

## 3. Isolated Preview Deployment Procedure

```bash
export PATH="/home/orion/.local/bin:/mnt/c/Users/orion/AppData/Roaming/npm:$PATH"
cd /home/orion/.worktrees/codex/release-danmercede-v2-0
SHA=$(git rev-parse HEAD)
git push -u origin release/danmercede-v2.0
vercel deploy --scope dan-mercedes-projects --build-env VERCEL_GIT_COMMIT_SHA="$SHA" --yes
```

Verify preview headers & endpoints:

```bash
curl -sSI "<preview-url>/" | grep -iE "HTTP/|x-robots-tag"
curl -fsSL "<preview-url>/deployment-revision.json"
curl -sSI "<preview-url>/works/proctor/" | head -n 5
vercel inspect https://danmercede-d4ihg883t-dan-mercedes-projects.vercel.app --scope dan-mercedes-projects
```

## 4. Production Release Cutover

```bash
SHA=$(git rev-parse HEAD)
vercel deploy --prod --scope dan-mercedes-projects --build-env VERCEL_GIT_COMMIT_SHA="$SHA" --yes
```

Immediately verify live production headers & revision:

```bash
curl -sSI https://www.danmercede.com/
curl -fsSL https://www.danmercede.com/deployment-revision.json
curl -sSI https://danmercede.com/ | head -n 5
```

Confirm `https://www.danmercede.com/` returns HTTP `200`, omits `X-Robots-Tag: noindex`, serves the exact `HEAD` commit SHA in `deployment-revision.json`, and `https://danmercede.com/` redirects to `https://www.danmercede.com/`.

## 5. One-Command Instant Rollback (Vercel Promote)

If any post-cutover defect, `5xx`, missing asset, broken rewrite, or unintended `noindex` header appears:

```bash
vercel promote https://danmercede-d4ihg883t-dan-mercedes-projects.vercel.app --scope dan-mercedes-projects --yes
```

Re-verify live production:

```bash
curl -fsSL https://www.danmercede.com/deployment-revision.json
# Expected: {"schemaVersion":1,"sha":"95d47d921ddf25d274891e410bd503dd99e4f4bc"}
```

## 6. Secondary Emergency Rollback (Git Tag Redeploy)

If the preserved deployment `dpl_H1WcxtcLSc49TT2LmFwjwgyhP2P9` is ever expired or unavailable:

```bash
git worktree add /home/orion/.worktrees/codex/rollback-v1 recovery/danmercede-v1.0-prod-20261125
cd /home/orion/.worktrees/codex/rollback-v1
vercel deploy --prod --scope dan-mercedes-projects \
  --build-env VERCEL_GIT_COMMIT_SHA=95d47d921ddf25d274891e410bd503dd99e4f4bc --yes
```
