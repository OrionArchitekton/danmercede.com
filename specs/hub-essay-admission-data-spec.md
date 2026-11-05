# Hub essay admission data

The hub admits sealed essays through a protected, inert list. Per-edition admission changes data without changing compiler implementation identity. Existing surface-target, status, type, required-field, date and diagram rules retain their meaning.

## Scenarios and acceptance

1. A valid admission-data migration preserves every existing essay slug in its original order, the exported compiler list and generated content bytes. Strict JSON rejects duplicate keys, duplicate slugs, unknown fields, invalid versions, oversized input and invalid slugs. No data is evaluated as code.
2. A request for one unpublished-on-hub essay derives its plan from a fixed protected-main data blob and the pinned canonical/publication evidence. The proposed list appends exactly that requested slug, preserves earlier entries/order and binds original/proposed Git blob identities, SHA256 hashes, base commit and original request. Already admitted essays need no duplicate admission.
3. An injected bounded writer and authorizer may prepare a separate draft admission PR changing only the data blob. All other tree leaves stay identical. Missing authority/writer holds by default; the CLI has no authenticated writer fallback. Changed base or corrupted plan/data holds. Unknown writes are collected without resend. Merges remain HUMAN_REQUIRED.
4. After admission is separately merged, the strict sync creates a separate generated-content PR and trusted verification uses base-branch compiler and admission data. Existing unrelated entries and diagrams remain intact; public delivery is not inferred from a PR.
5. Missing/malformed admission configuration cannot create or partially overwrite content. Existing consumer fail-open and strict fail-loud postures remain, including the Vercel no-compile boundary.

## Test seams

Use the existing compiler tests and hub fake-GitHub plan/advance/reconcile seam. Exercise the real CLI in owned temporary roots for configuration/fail-mode behavior. No live writer, provider, dispatch, deployment or runtime admission participates. Existing reader qualification remains separate; pending PR239 endpoint repairs are not part of this feature.
