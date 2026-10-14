# Operator identity copy audit and release evidence

Baseline: `bbac063` (current main when work began). Search is case-insensitive
across every Git-tracked UTF-8 file, including SVG and generated bundles:
`Governed AI Architect|Orion Apex Capital|Cosmocrat|Founder & Systems Architect|Building Cosmocrat|Governed AI Operating System`.
Each occurrence below has its original line number; multiple matches on a line
have separate rows. Image binaries were not modified.

## Before and after

- Home title, og:title, twitter:title: `Dan Mercede: Operator, Systems Builder, and Governed AI Architect` → `Dan Mercede: Operator and Systems Builder`.
- Home description, og:description, twitter:description: `Dan Mercede is an operator and systems builder who helps teams turn AI from experiments into owned, governed workflows they can actually run. Governance and reliability are proof depth, not the pitch.` → `Dan Mercede is an operator and systems builder. He turns AI experiments into workflows teams can actually run, with builds, guides, and writing to show how.`
- Footer: `Dan Mercede / Founder & Systems Architect / Orion Apex Capital` → `Dan Mercede / Operator and systems builder`.
- Hero identity: `I'm an operator and systems builder. I build AI workflows with clear ownership, from the first working version to the tools, controls, and handoffs that keep it running.` → `Operator and systems builder. I turn AI experiments into workflows teams can actually run.`
- Person jobTitle: `Founder & AI Systems Architect` → `Operator and systems builder`. Person/WebSite descriptions and home ProfilePage name/description now match the requested metadata. Holding-company worksFor and holding-company/platform affiliations were removed from shared Person identity only; other affiliations and all sameAs URLs remain.
- Portrait alt text and descriptions (all 12 registered portraits) and shared OG/Twitter alt text now use Dan's name and the exact identity line. Filenames and image bytes are unchanged.
- Footer links retain Ecosystem, Diagrams, RSS, Newsletter, Legal, Privacy, and Imprint; add LinkedIn, X (@danmercede), GitHub (OrionArchitekton), YouTube (@danmercede), and Sessionize from existing Person.sameAs URLs.
- Works gains three Start here cards before its original lists. Existing cards, ordering, featured essay cap, outbound rail, and CTA remain.

## Claim verification

Fetched the current Proctor, failclosed, and knowledge-graph pages directly.
Proctor confirms non-deterministic behavioral regression testing and UiPath
AgentHack 2026 finalist status. It does **not** contain “31 of 203 judged entries”
or the numbers 31/203, so that count is omitted under the existing-claims-only
constraint. failclosed describes running an LLM reviewer and distrusting its
verdict. The knowledge-graph essay route exists with its own canonical URL.
No new metrics or pages were added.

## Every baseline search hit

| Original source | Match | Action | Context |
| --- | --- | --- | --- |
| `App.tsx:153` | Founder & Systems Architect | Replaced with the shared operator role. | e-400 text-xs font-mono mb-1">Founder & Systems Architect</p> |
| `App.tsx:554` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | tform and the consulting arm. Cosmocrat is the Governed AI Operating System. Orion Intelligence Age |
| `App.tsx:554` | Governed AI Operating System | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | sulting arm. Cosmocrat is the Governed AI Operating System. Orion Intelligence Agency is SMB AI strategy consulting th |
| `App.tsx:559` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | const isCosmocrat = venture.name === 'Cosmocrat'; |
| `App.tsx:559` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | Cosmocrat = venture.name === 'Cosmocrat'; |
| `App.tsx:570` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | s-visible:ring-copper-500 ${isCosmocrat |
| `App.tsx:578` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | ems-center justify-center ${isCosmocrat |
| `App.tsx:588` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | uppercase tracking-widest ${isCosmocrat |
| `App.tsx:596` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | case tracking-widest mb-1 ${isCosmocrat ? 'text-copper-500' : 'text-copper-400'}\`}> |
| `App.tsx:725` | Cosmocrat | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | hared ownership architecture. Cosmocrat is the platform. OIA is the SMB consulting and delivery arm |
| `App.tsx:2046` | governed AI architect | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | Visual explainers for governed AI architecture: monitoring versus enforcement, non-repudiation, authori |
| `App.tsx:2204` | Orion Apex Capital | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | anding on this site belong to Orion Apex Capital or its operating entities. Reproducing them without written |
| `App.tsx:2249` | Orion Apex Capital | Preserved: ecosystem content, implementation identifier, legal ownership, or imprint; not site chrome or Dan identity. | <p>Orion Apex Capital</p> |
| `README.md:7` | governed AI operating system | Preserved: documentation or test reference, not served identity copy. | & Intelligence"), his work on governed AI operating systems, and the surrounding ecosystem of ventures. It includes wr |
| `README.md:124` | Cosmocrat | Preserved: documentation or test reference, not served identity copy. | duct and platform sites (e.g. Cosmocrat, Orion Apex Capital) are maintained in separate repositorie |
| `README.md:124` | Orion Apex Capital | Preserved: documentation or test reference, not served identity copy. | atform sites (e.g. Cosmocrat, Orion Apex Capital) are maintained in separate repositories. |
| `constants.ts:70` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | name: "Cosmocrat", |
| `constants.ts:71` | Governed AI Operating System | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | role: "Governed AI Operating System", |
| `constants.ts:72` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | description: "Cosmocrat is a Governed AI Operating System that enforces auditabilit |
| `constants.ts:72` | Governed AI Operating System | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | description: "Cosmocrat is a Governed AI Operating System that enforces auditability, policy control, and human overs |
| `constants.ts:73` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | ecosystemRole: "Cosmocrat is the Governed AI Operating System that serves as the cont |
| `constants.ts:73` | Governed AI Operating System | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | systemRole: "Cosmocrat is the Governed AI Operating System that serves as the control plane for human-owned intelligen |
| `constants.ts:74` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | systemRelationship: "Cosmocrat is the core system originated and owned by Orion Apex Capit |
| `constants.ts:74` | Orion Apex Capital | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | ystem originated and owned by Orion Apex Capital. All other entities in the ecosystem either deploy, validat |
| `constants.ts:74` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | y, validate, or operate under Cosmocrat’s governance model.", |
| `constants.ts:77` | cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | logo: "/cosmocrat-.png", |
| `constants.ts:78` | cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | slug: "cosmocrat", |
| `constants.ts:79` | cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | link: "https://www.cosmocrat.ai" |
| `constants.ts:86` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | shipped, adopted, and owned. Cosmocrat remains the Governed AI Operating System product when a con |
| `constants.ts:86` | Governed AI Operating System | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | owned. Cosmocrat remains the Governed AI Operating System product when a control-plane substrate is the right fit.", |
| `constants.ts:94` | Orion Apex Capital | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | name: "Orion Apex Capital", |
| `constants.ts:96` | Orion Apex Capital | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | description: "Orion Apex Capital is a systems architecture and holding firm that originates, |
| `constants.ts:96` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | originates, owns, and governs Cosmocrat, the Governed AI Operating System.", |
| `constants.ts:96` | Governed AI Operating System | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | s, and governs Cosmocrat, the Governed AI Operating System.", |
| `constants.ts:97` | Orion Apex Capital | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | ecosystemRole: "Orion Apex Capital is the holding and architecture firm responsible for origin |
| `constants.ts:98` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | AC is the origin authority of Cosmocrat and oversees how the operating system is deployed, validate |
| `constants.ts:110` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | ution principles derived from Cosmocrat, validated through Orion Intelligence Agency.", |
| `constants.ts:122` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | ves as internal validation of Cosmocrat’s governance model under continuous, adversarial conditions |
| `constants.ts:307` | Cosmocrat | Preserved: venture content, asset path, slug, or selection identifier; no content removed. | rt const PRIMARY_VENTURES = ['Cosmocrat', 'Orion Intelligence Agency']; |
| `constants.ts:393` | Orion Apex Capital | Replaced footer company field with the shared operator role. | entity: "Orion Apex Capital", |
| `constants.ts:402` | Founder & Systems Architect | Replaced portrait identity with Dan Mercede and the exact identity line. | alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system", |
| `constants.ts:402` | governed AI operating system | Replaced portrait identity with Dan Mercede and the exact identity line. | nder & Systems Architect of a governed AI operating system", |
| `constants.ts:407` | Founder & Systems Architect | Replaced portrait identity with Dan Mercede and the exact identity line. | alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system", |
| `constants.ts:407` | governed AI operating system | Replaced portrait identity with Dan Mercede and the exact identity line. | nder & Systems Architect of a governed AI operating system", |
| `constants.ts:412` | Founder & Systems Architect | Replaced portrait identity with Dan Mercede and the exact identity line. | alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system", |
| `constants.ts:412` | governed AI operating system | Replaced portrait identity with Dan Mercede and the exact identity line. | nder & Systems Architect of a governed AI operating system", |
| `docs/runbooks/works-update-on-ship.md:31` | Orion Apex Capital | Preserved: documentation or test reference, not served identity copy. | it. The global default is the Orion Apex Capital |
| `index.html:20` | Governed AI Architect | Replaced with Dan Mercede: Operator and Systems Builder. | perator, Systems Builder, and Governed AI Architect</title> |
| `index.html:26` | Governed AI Architect | Replaced with Dan Mercede: Operator and Systems Builder. | perator, Systems Builder, and Governed AI Architect" /> |
| `index.html:39` | Governed AI Architect | Replaced with Dan Mercede: Operator and Systems Builder. | perator, Systems Builder, and Governed AI Architect" /> |
| `index.html:73` | Governed AI Operating System | Replaced Person subject label with AI Workflow Delivery. | "Governed AI Operating Systems", |
| `index.html:96` | Orion Apex Capital | Removed holding-company/platform identity association from shared Person schema; ecosystem content retained. | "name": "Orion Apex Capital", |
| `index.html:100` | Orion Apex Capital | Removed holding-company/platform identity association from shared Person schema; ecosystem content retained. | .com/#organization", "name": "Orion Apex Capital", "url": "https://www.orionapexcapital.com/" }, |
| `index.html:105` | cosmocrat | Removed holding-company/platform identity association from shared Person schema; ecosystem content retained. | ization", "@id": "https://www.cosmocrat.ai/#organization", "name": "Cosmocrat", "url": "https://www |
| `index.html:105` | Cosmocrat | Removed holding-company/platform identity association from shared Person schema; ecosystem content retained. | t.ai/#organization", "name": "Cosmocrat", "url": "https://www.cosmocrat.ai/" } |
| `index.html:105` | cosmocrat | Removed holding-company/platform identity association from shared Person schema; ecosystem content retained. | smocrat", "url": "https://www.cosmocrat.ai/" } |
| `index.html:170` | Governed AI Architect | Replaced with Dan Mercede: Operator and Systems Builder. | perator, Systems Builder, and Governed AI Architect", |
| `public/llms.txt:11` | Cosmocrat | Replaced navigation summary with independent ventures, their roles, and shared ownership architecture. | tem): The Orion entity stack (Cosmocrat, Orion Intelligence Agency, and supporting ventures) under |
| `seoMeta.ts:16` | Governed AI Architect | Replaced with Dan Mercede: Operator and Systems Builder. | perator, Systems Builder, and Governed AI Architect'; |
| `seoMeta.ts:177` | Cosmocrat | Preserved: Ecosystem page body copy, not shared metadata or identity. | 'Cosmocrat is the Governed AI Operating System that serves as the cont |
| `seoMeta.ts:177` | Governed AI Operating System | Preserved: Ecosystem page body copy, not shared metadata or identity. | 'Cosmocrat is the Governed AI Operating System that serves as the control plane for human-owned intelligen |
| `seoMeta.ts:178` | Orion Apex Capital | Preserved: Ecosystem page body copy, not shared metadata or identity. | 'Orion Apex Capital originates, owns, and governs the ecosystem. Orion Intellig |
| `specs/2026-07-08-homepage-intent-router-spec.md:23` | Orion Apex Capital | Preserved: documentation or test reference, not served identity copy. | and Orion Apex Capital. |
| `specs/visible-initial-html-spec.md:93` | cosmocrat | Preserved: documentation or test reference, not served identity copy. | e case study) plus /ecosystem#cosmocrat hydrated with |
| `tests/builtPageRender.test.ts:158` | Orion Apex Capital | Preserved: documentation or test reference, not served identity copy. | ssert.doesNotMatch(homeMain, /Orion Apex Capital/, 'homepage: entity-structure copy belongs on /ecosystem'); |
| `tests/contentBoundary.test.ts:39` | governed AI operating system | Preserved: documentation or test reference, not served identity copy. | // identity (e.g. "governed AI operating systems", "runtime", "Cosmocrat") is |
| `tests/contentBoundary.test.ts:39` | Cosmocrat | Preserved: documentation or test reference, not served identity copy. | erating systems", "runtime", "Cosmocrat") is |
| `tests/contentBoundary.test.ts:120` | governed ai operating system | Preserved: documentation or test reference, not served identity copy. | he throughline</h1><p>i build governed ai operating systems that endure.</p>'.toLowerCase(); |
| `tests/extractability.test.ts:34` | Governed AI Operating System | Preserved: documentation or test reference, not served identity copy. | <h1>Governed AI Operating Systems</h1> |
| `tests/extractability.test.ts:94` | Governed AI Operating System | Preserved: documentation or test reference, not served identity copy. | <h1>Governed AI Operating Systems</h1> |
| `tests/frontDoor.test.ts:76` | Cosmocrat | Preserved: documentation or test reference, not served identity copy. | doesNotMatch(app, /Founder of Cosmocrat/); |
| `tests/homepage.test.ts:77` | Orion Apex Capital | Preserved: documentation or test reference, not served identity copy. | assert.doesNotMatch(body, /Orion Apex Capital/, 'entity-structure copy belongs on /ecosystem, not the hom |
| `tests/identityCanonical.test.ts:158` | Orion Apex Capital | Updated contract expectation to omit holding-company/platform identity associations; preserved remaining affiliation anchors. | 'Orion Apex Capital': OAC_ORG_ID, |
| `tests/identityCanonical.test.ts:166` | Cosmocrat | Updated contract expectation to omit holding-company/platform identity associations; preserved remaining affiliation anchors. | 'Cosmocrat': 'https://www.cosmocrat.ai/#organization', |
| `tests/identityCanonical.test.ts:166` | cosmocrat | Updated contract expectation to omit holding-company/platform identity associations; preserved remaining affiliation anchors. | 'Cosmocrat': 'https://www.cosmocrat.ai/#organization', |

Total: 75 occurrences.

## Preserved body content

No requested legacy-identity search terms occur in the committed essay bundle,
guide bundle, or guide Markdown sources. Those files remain byte-identical to
baseline. Existing ecosystem venture descriptions and their prerender body,
legal ownership copy, and imprint company details are content and are retained.
The spelling `governed AI architecture` in the Diagrams introduction is a subject
label, not the exact identity phrase `Governed AI Architect`, and is retained.
Historical specs, README text, and test fixtures remain except for the identity
contract expectation updated to match this request. No routes were added or
removed. Sitemap generation continues to derive URLs from the unchanged routes.

## Validation and release

Local validation passes: 457 existing tests; TypeScript (`npx tsc --noEmit`);
15 extractability lint checks; production build; 19 built-output tests. An
existing default-description assertion was updated for the requested copy.
Direct built-HTML assertions verify all three exact titles/descriptions, hero
identity, both rendered footers and six profile/newsletter links, Works card
order/targets, parseable JSON-LD, and no forbidden identity in home/Works/sitemap.
All essay/guide source and generated bundles and all content assets are
byte-identical to baseline.

The first local build discovered a stale sibling substrate checkout and
regenerated unrelated corpus/assets. Those side effects were restored; the
final verified build uses the existing `VERCEL=1` guard so the consumer keeps
the committed bundle, matching the Vercel production path. No compiler,
workflow, dependency, or content changes were made. Vite retains its existing
chunk-size warning; npm reports eight pre-existing dependency advisories
(two moderate, six high), outside this copy-only scope.

The first Vercel preview passed authenticated home/Works HTML checks. Review
then caught that React Router intercepted the new microsite links: a hydrated
browser click reproduced Page Not Found. The cards now use ordinary anchors
so the request reaches the hosting rewrite. An agent-browser session clicked
both corrected cards with JavaScript active and reached the actual production
Proctor and failclosed pages with their expected H1s. The browser test server
used the identical built client and redirected each document request to its
production microsite; the pre-fix SPA click made no document request and failed. The fixed third starting pointer
resolves via the existing essay resolver, failing the build if its target leaves
the corpus. Dan explicitly requested that additional pointer and preservation
of existing content, so the original capped five-item selection remains intact.
Production verification and release receipt will be recorded after deployment.
Rollout: release this scoped PR through the existing Vercel main-branch deploy.
Monitor/validate: read production home metadata, Person JSON-LD, footer, Works
card targets, and the existing project/essay routes. Rollback: revert the scoped
release commit via PR and redeploy the prior main revision.

## Changed files

- `App.tsx`: footer role, shared role badge, and the three Works cards.
- `constants.ts`: exact identity, existing social URLs, starting pointers, portrait metadata.
- `seoMeta.ts`: default metadata, shared image alt, and crawler pointers.
- `index.html`: source metadata, Person/WebSite/ProfilePage schema, fallback identity.
- `metadata.json`: matching project name and description.
- `public/llms.txt`: matching identity and generic ecosystem navigation summary.
- `tests/identityCanonical.test.ts`: requested operator identity schema contract.
- `tests/injectRouteMeta.test.ts`: requested default description expectation.
- `tests/worksHub.test.ts`: parity for added starting pointers, preserving essay cap.
- `docs/identity-contract.md`: canonical operator job title and association boundary.
- `specs/operator-identity-and-works-spec.md`: scoped behavior and validation seam.
- `docs/operator-identity-copy-audit.md`: every search hit, before/after, evidence, rollback.
