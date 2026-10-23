# NODES registration link

A visitor reading the homepage's NODES 2026 speaking section can register for
the November 12 event and separately inspect Dan's speaker profile.

1. The speaking section offers Register free beside Speaker profile in the
   initial HTML and the hydrated page, including on mobile. The profile remains
   the person-specific credential target, including in the site's identity data.
2. Registration uses the exact personalized URL emitted by Neo4j's generator.
   The current generator produces an ambiguous campaign query. Matching that
   external format establishes compatibility with the generator, not referral
   credit. The hub makes no claim that the organizer's attribution was verified.
3. Promotion is maintained as dated editorial content. On November 13, 2026,
   remove registration and change the section to past tense through a reviewed
   source change and deploy. This PR does not implement automatic expiration.
   The published date and speaker-profile credential remain available.

Use the existing speaking-sheet tests for the configured targets and the
built-page rendering tests for both anchors within the speaking section.
Check the production build in a browser at desktop and mobile widths. This
keeps the verification at the rendered consumer boundary without a new framework.
