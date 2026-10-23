# Thoughts latest releases

## Outcome and approved design

Dan requested the newest releases at the top of Thoughts and selected
"Latest releases above the lanes" on October 20, 2026. Add that section to the
default index ahead of Start here and the curated lanes. Keep the lanes as the
complete archive and preserve their existing editorial classification.

## Scenarios and acceptance

1. A reader opening Thoughts sees a Latest releases heading and up to three
   published essay cards before the curated entry points and lanes. Cards use
   the existing title, category, date, preview and essay link presentation.
2. The cards are the three newest essays by their published display date,
   regardless of lane or input-array order. Equal dates have deterministic slug
   ordering. Selection never mutates the published corpus; a smaller or empty
   corpus produces no duplicates or blank cards.
3. A reader applying a category or search query gets the existing filtered
   results view. The unfiltered Latest releases section is hidden while either
   filter is active and returns when both are cleared.
4. The full archive stays in its existing lanes, so an essay can appear in
   Latest releases and again in its lane. Titles and dates update automatically
   from the admitted corpus; no release list is maintained by hand.
5. The initial HTML and hydrated page show the same latest cards in the same
   order. Only essays already admitted to the hub may appear. Edition 14 stays
   held under its separate October 26 admission PR.

## Validation seams and delivery

Use the existing Thoughts selector tests for order, ties, limits, non-mutation
and filter behavior, then the built-page rendering seam for actual card order,
links and location before the lanes. Use the existing browser preview to check
desktop/mobile layout and live filter transitions; no new test framework.

Edition 13 source recovery and hub admission remain separate source/content
steps. This UI change does not authorize source rewriting, fabricated review
evidence, early admission of held editions or a protected-branch bypass. Keep
generated content out of the admission/UI PR; use the merged compiler for the
later reviewed content sync. Both repositories retain human merge gates.
