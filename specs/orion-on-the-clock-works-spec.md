# orion-on-the-clock Works entry

A reader can find orion-on-the-clock, the MIT pipeline that turns yesterday's AI
coding agent work into a daily YouTube Short, from the existing Works index and
reach its product page at a Works URL.

Prepared 2026-10-23 and released 2026-10-24: Dan made the source repository public
and the product page's origin serves public HTML (checked anonymously) before this
entry merged.

## Scenarios and acceptance

1. A reader opens Works and finds one orion-on-the-clock card in Open Source,
   right after orion-pm. Its link reaches the product page; its repository link
   names the public source repository, and its structured data carries the MIT
   license and the code repository.
2. A reader opens the product page with or without a trailing slash, or follows
   its asset URLs. The hub normalizes the page URL and strips the Works prefix
   when proxying to the independent static site, including the bare page path. A
   physical hub page must not shadow this proxy.
3. The card's claims match the source repository's README: an allowlisted
   ledger, fourteen fail-closed checks, a cloned voice, a 9:16 render, and private
   uploads unless the operator switches on public mode. It states no other numbers.
4. Existing works, guides, substrate constants and routes are unchanged.

## Test seams

Use the existing Works, priority, JSON-LD, sitemap parity and route guards
(`npm test`) and the built-route render (`npm run test:built`). For the external
site, verify canonical HTML and one JavaScript asset both at its origin and
through the deployed hub route. Only the latter proves the final URL.

## Delivery

Product canonical: https://www.danmercede.com/works/orion-on-the-clock/

Public source: https://github.com/OrionArchitekton/orion-on-the-clock-oss

The hub change is human-merged. Rollback is an ordinary revert of the card,
its priority slot, the sitemap line and the proxy mappings.
