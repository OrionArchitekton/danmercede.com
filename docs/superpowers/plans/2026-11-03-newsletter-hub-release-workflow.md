# Newsletter Hub Release Workflow Implementation Plan

> Execute inline using the TDD implementation loop. Parent owns independent
> architecture/final reviews, source delivery and any later production gate.

**Goal:** Prepare/reconcile the real two-PR workflow and exact reader proof, with
durable once-only intents, while retaining current human merge/runtime gates.

**Architecture:** A hub-specific TypeScript coordinator reuses the merged
readiness checker, compiler mapper, Markdown renderer, newest-order function and
production observer. A small append-only private record store reserves native
sub-writes with exclusive creates and never resets unknown effects. Fixed native
adapters have an injected authorizer; the CLI default denies mutations.

**Stack:** Node built-ins and existing tsx, TypeScript, js-yaml, React and jsdom.
No package, service, workflow, credential or classifier addition.

## Vertical slices

- [ ] Add a failing private-plan test for exact input pin/time and strict request
  binding. Implement request loading, reuse readiness and output an actual hashed
  private stage artifact. Repeat RED/GREEN for E15 DST/E16 precise boundary,
  invalid evidence and strict read-only inspect.
- [ ] Add a failing end-to-end admission preparation fixture. Add the smallest
  default-preserving optional allowlist/compiler preview seam, AST one-entry
  patch and fixed Git object/ref/PR API bodies. Require injected authority;
  default CLI execution remains `runtime-authority-unadmitted`.
- [ ] Add exclusive immutable logical/sub-write intents and verified readbacks.
  RED/GREEN restart after each sub-write, partial budgets, uncertain effects,
  concurrent callers and foreign/stale branch preservation. No force/reset path.
- [ ] RED/GREEN admission merge reconciliation, existing global run/PR holds and
  one missed-sync dispatch after nominal grace. Unknown dispatch stays
  unattributed, held and verification-only across restarts or main movement.
- [ ] RED/GREEN native content PR parity and merge gates: exact intended addition,
  unchanged unrelated corpus/diagrams/assets, preserve newer edition/latest order,
  correct base/current checks and complete review threads. No merge API exists.
- [ ] RED/GREEN exact merged-source Production+revision+initial-reader parity
  through injected real HTML/feeds/CTA responses. A subset proof must remain
  unknown. Reuse actual renderer and latest selector, not duplicate display logic.
- [ ] Persist operational runbook and actual validation receipts. Run typecheck,
  complete tests, `VERCEL=1 npm run build`, built tests, whitespace and secret
  scans. Commit only after parent-directed independent reviews; no push/PR/merge
  or live native mutation in this worker task.

## Review decisions already bound

Parent approved unknown dispatch without a correlation workflow edit. Mapper
preview may add an optional allowlist argument only if existing defaults and
generated bundle remain identical. Existing installed tsx is used directly;
`npx` may not fetch a runtime. One advance handles one semantic action and an
explicit budget of its constituent native writes. Current estate merge
classification is never downgraded; source/runtime activation remains distinct.

## Implementation and review evidence

The coordinator, private journal, fixed browser recipe, independent reader,
behavior spec and operator runbook are implemented as source. The above checklist
records the original intended coverage rather than a claim that every proposed
probe has run. The current registered suite includes exact boundary and input pins,
actual CLI plan/inspect/default denial, protected canonical ancestry/file parity,
minimal admission tree and request bodies, partial budgets and uncertain-response
reconciliation, one recovery reservation across restarts, separate strict content
PR parity/native gates/newer preservation, simulated content merge, initial versus
hydrated reader parity and default mapper byte parity.

Three independent reviews of index tree
`f1ba3f56efbfa1966ae6e0d2378917ad1c24abf9` found required fixes. Subsequent
regressions reproduce publication file substitution, private-root ancestor
substitution, absolute external artifacts, mixed-offset inspection order, emitted
CTA regex escaping and effective ancestor visibility. Native E15 GET projections
also proved empty run/suite PR arrays are valid; trusted provenance now uses exact
check/run/suite/head/repository/workflow association instead. Those repairs each
have focused test evidence. The parent owns exact final-generation re-review and
controller-consumer integration against actual unchanged CLI output.

Production writer, mutation authorizer and public-browser executor are still
unadmitted and unbound. The authenticated writer fallback was rejected and has
not been retried or installed. A private prose-only checkpoint preserves the
reason and remaining activation capability outside executable source. No live
admission, sync dispatch, PR, merge, deployment, runtime or timer change occurred.
