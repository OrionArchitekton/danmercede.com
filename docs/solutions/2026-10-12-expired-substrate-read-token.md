---
title: Expired substrate read token blocked the weekly hub sync
date: 2026-10-12
category: docs/solutions/incidents
module: substrate-consumer-authentication
problem_type: integration-issue
component: github-actions-private-substrate-checkout
severity: medium
applies_when:
  - The hub sync cannot fetch the private substrate repository
symptoms:
  - Actions checkout fails with terminal prompts disabled after three attempts
  - Trusted verification can appear green while its substrate fetch fails
root_cause: expired-fine-grained-substrate-read-token
resolution_type: credential-replacement
operational_status: checkout-repair-verified
related_components: [substrate-sync, substrate-verify]
tags: [github-actions, substrate, authentication, token-expiry]
---

# Expired substrate read token

## Failure and root cause

The [October 12 scheduled sync](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38270302649)
failed before compilation while fetching the private substrate, after three
attempts with `could not read Username ... terminal prompts disabled`, exit 128.
Dan's signed-in native GitHub token inventory independently showed the existing
fine-grained `SUBSTRATE_READ_TOKEN` PAT as expired. The error alone would not
distinguish expiry from revoked access, wrong resource scope or an absent secret.

## Authorized repair

Dan explicitly authorized replacing this hub repository's `SUBSTRATE_READ_TOKEN`.
He handled sign-in and native generation after GitHub refused the automated click.
The replacement selects only the private substrate repository, Contents read-only
and required Metadata read-only, with January 10, 2027 expiry. A private source
file read passed before installation. The token moved only through memory and
encrypted `gh secret set` stdin, never chat, disk, command arguments or commits.
The generated-token page was cleared and the browser released. Secret metadata
changed from July 8 to `2026-10-12T20:34:42Z`.

The separate PR-writing credential was not rotated or assumed healthy during
this read-token repair. Its later, separately authorized replacement is recorded
in [the writer incident](2026-10-12-substrate-sync-pr-credential.md).

## Independent verification and limit

[Trusted Actions verification 38298024701, attempt 2](https://github.com/OrionArchitekton/danmercede.com/actions/runs/38298024701/attempts/2)
passed the actual private-substrate checkout, base-code compile and comparison
against substrate truth. The credential repair is verified at its Actions consumer.
Earlier green checks were not recovery proof: this verifier permits checkout
failure and can compare an unchanged base bundle instead.

This does not establish strict-sync success, PR-creation credential health,
generated-content merge, production deployment or E12 publication. Those are
distinct steps, subsequently observed and recorded in the
[E12 release runbook](../runbooks/edition-12-hub-release.md).

## Prevention and rollback

Use the [authentication recovery runbook](../runbooks/private-substrate-checkout-authentication.md)
to diagnose and renew narrowly before expiry. No timer or auth-export mechanism
was added. Revoke an incorrect replacement only under explicit credential authority
and restore a separately verified narrow credential; the expired old token is not
a working rollback. Never weaken required checks or broaden repository scope to
make a fetch pass. Secret repair does not roll back already published content.
