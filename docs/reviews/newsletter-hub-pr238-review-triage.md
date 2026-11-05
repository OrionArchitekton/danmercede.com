# Hub release PR 238 review triage

This source repair addresses the native review threads and cycle-one advisory
findings without changing GitHub mutation authority or performing a release.
The earlier advisory result remains `FINDINGS_REMAIN`; later source validation
and review must be reported separately rather than rewriting that result.

| Native thread | Disposition | Source evidence |
| --- | --- | --- |
| `PRRT_kwDOQ-1Kjc6zXkCe` | Fixed | Runbook describes native read requests accurately: REST GET and read-only GraphQL query sent as POST. Private artifact writes remain explicit. |
| `PRRT_kwDOQ-1Kjc6zXkDH` | Declined: deliberate incompatible-runtime hold | The review correctly identifies that divergent mapper semantics can hold a valid newer-main result. The expectation mapper deliberately executes reviewed local code under static closure pins. Mapper/main incompatibility must hold; it never permits a mismatched content row. A newer compiler requires normal reviewed runtime adoption. No digest comparison is claimed to eliminate semantic incompatibility. The separate native strict workflow still executes its trusted base compiler. |
| `PRRT_kwDOQ-1Kjc6zXkDK` | Fixed | Reconcile reads the existing sync intent before admission replay and reports unattributed dispatch as unknown. Independently observed downstream results retain that uncertainty alongside effect evidence. A regression confirms zero additional writes. |
| `PRRT_kwDOQ-1Kjc6zXkDU` | Fixed with narrow private recovery | Mutating private operations can remove the sole crash-left `.hub-*` link only after exact same-inode, ownership, bounded strict JSON/schema and record checks. Payloads and unrelated work are preserved. Strict inspection performs no recovery writes. |
| `PRRT_kwDOQ-1Kjc6zXkDa` | Fixed | Atom comparison validates alternate-link href values, treating missing rel as alternate; changed or duplicate destinations hold. RSS comparisons retain existing behavior. |

The two cycle-one advisory findings are also fixed: reconciliation verifies the
fresh artifact's exact content-addressed name, envelope digest and operation
binding before semantic use; hydrated image verification decodes lazy images
within a bounded deadline and checks every nested image's load/dimensions and
effective visibility. Regression tests exercise replacement and broken/hidden/
lazy image cases using the actual source paths and emitted browser script.

Independent installed-reader review also found protocol, ownership and cleanup
defects. The runner now preserves real browser WebSocket endpoint paths, binds
a nonce-created persistent CDP target through owned loopback read-only discovery
and expected URL, and disconnects its unique client independently of tab cleanup.
A detected replacement tab is held and never closed as the owned one. Installed CLI actions remain index-based; surrounding identity checks rely on the exclusive lease and do not claim an atomic transaction against an actor racing inside one command interval. No capabilities or
raw discovery URLs are written to evidence.

A related controller review found that generated corpora could execute during
CLI import. A pure feed-core/shared-origin extraction removes both generated
modules from the actual hub import graph while preserving default feed APIs,
CLI and fixed-fixture bytes. An actual CLI-import regression proves malicious
replacement corpora do not execute. This source proof is separate from later
native read-only reader qualification, merge, deployment or runtime activation.


Cycle two also ended `FINDINGS_REMAIN`: both code engines completed, retaining the
intentional compiler-compatibility decline and identifying one genuine endpoint
guard issue. The guard now admits only exact numeric loopback literals and a valid
explicit port; hostname aliases are refused before discovery/CDP commands. Tests
cover localhost, other addresses, credentials, invalid/missing ports, paths and
URL additions, and preserve a numeric IPv6 positive case. Raw cycle-two output
and context were copied and SHA256-bound privately before any later cycle; that
historical result is not relabeled clean. Final source review/native qualification
of the narrowed guard remain separately observed.
