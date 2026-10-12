# orion-browser guide and Works entry

The reader can learn how an identity-based browser pool works, obtain the MIT
source release, and reach it from the existing Works index.

## Scenarios and acceptance

1. A reader opens the guide directly or through the Agent systems lens. The
   complete tutorial is visible in initial HTML and in the browser, with its own
   canonical URL, Article structured data, responsive figures, and a sitemap entry.
2. A reader opens Works and finds one orion-browser card in Open Source. Its link
   reaches the product page; its repository link names the public source export.
3. A reader opens the product page without a trailing slash, or follows its asset
   URLs. The hub normalizes the page URL and strips the Works prefix when proxying
   to the independent static site. A physical hub page must not shadow this proxy.
4. The guide and product page distinguish different identities from different
   holders, one MCP process from its subagents, and expiry from a takeover. Neither
   claims that a lease grants publishing authority or isolates hostile local users.

## Boundaries

The public package is a clean export of the existing implementation. Private
profiles, live configuration, session data, internal identifiers, and repository
history are excluded. Existing runtime installations and browser sessions are
unaffected. Package publication does not imply hub publication.

## Test seams

Use the existing guide bundle, route rendering, Works, sitemap, and Vercel guards.
The built HTML plus browser navigation is the consumer seam for the guide and tile.
For the external site, verify canonical HTML and a JavaScript asset both at its
origin and through the deployed hub route. Only the latter proves the final URL.

## Delivery

Guide canonical: https://www.danmercede.com/guides/multi-agent-browser-pool

Product canonical: https://www.danmercede.com/works/orion-browser/

Public source: https://github.com/OrionArchitekton/orion-browser-oss

The hub change is human-merged. Syndication follows a verified live canonical.
