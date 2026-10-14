# Operator identity and Works entry points

## Scope

Apply Dan's requested copy and information architecture corrections using the
existing design. Keep all routes, existing project listings, ecosystem content,
and essay and guide bodies. Add no public pages or dependencies.

## Scenarios and acceptance criteria

1. A visitor or crawler opens the home page. The title, Open Graph title, and
   Twitter title are `Dan Mercede: Operator and Systems Builder`. All three
   descriptions are `Dan Mercede is an operator and systems builder. He turns AI
   experiments into workflows teams can actually run, with builds, guides, and
   writing to show how.` The visible identity line is `Operator and systems
   builder. I turn AI experiments into workflows teams can actually run.`
   Shared identity metadata and portrait descriptions use this positioning;
   legacy founder, company, and platform identities are removed from shared
   chrome and Person identity metadata.
2. A visitor opens any page and reaches the footer. Dan's role reads `Operator
   and systems builder`. Existing links remain, with LinkedIn, X (@danmercede),
   GitHub (OrionArchitekton), YouTube (@danmercede), and Sessionize added using
   URLs already declared by the site. The existing newsletter stays linked.
3. A visitor opens Works. A `Start here` block precedes the existing lists and
   links to the existing Proctor and failclosed pages and `The knowledge graph
   my agents stopped asking` essay. Proctor is described as QA for
   non-deterministic AI automations and a UiPath AgentHack 2026 finalist;
   failclosed is an LLM code reviewer that refuses to trust its own reviewer.
   Publish only claims verified on the target pages. The Proctor page does not
   contain the proposed 31-of-203 count, so omit that count. Crawler and visible
   renders expose the same pointers. Keep the existing capped essay selection. The explicitly requested fixed
   Start here pointer is additional to that existing list; validate its essay
   through the same resolver. Project links must make full document requests
   so the hosting rewrites serve their existing microsites with JavaScript on.

## Validation seams

Use the existing route render and built-output seams to exercise the visible
home and Works pages, footer links, metadata, and shared Person schema together.
Keep the identity-contract and built Works render checks aligned with the
new copy. Run the existing tests, extractability lint, typecheck, build, and built
tests. Verify hydrated project-card clicks reach the existing microsites. Confirm
the home page and Works from the production domain after deploy.
Inventory every legacy-identity search hit, including preserved content, and
verify the committed essay and guide bundles and sources remain byte-identical.
