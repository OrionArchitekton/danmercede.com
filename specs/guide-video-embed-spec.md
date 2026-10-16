# Spec: Guide video player (danmercede.com /guides)

Status: in review · Owner-merge (merge deploys; Dan's gate) · Requested by Dan
2026-10-15: each guide page carries its video in an inline player. First consumer:
the multi-agent browser pool guide, whose video is not uploaded yet.

## Problem

Guides are getting companion videos on YouTube. A reader who lands on the guide
page has no way to watch the video there; the guide and its video live apart. A
plain YouTube embed would load YouTube's player scripts, and set YouTube storage,
on every guide page view, whether or not the reader ever watches.

## Terms

- **Guide video id:** the 11-character YouTube video id (the `v=` value of a watch
  URL), letters, digits, `-` and `_` only. One canonical term; "video key" and
  "YouTube URL" are not accepted synonyms in frontmatter.
- **Player:** the inline video area on a guide page.
- **Facade:** the player's resting state: a preview image with a play button.
  Nothing from YouTube runs until the reader presses play.
- **Live player:** the YouTube player frame that replaces the facade on press.

## Behavior

1. **Opt-in per guide.** A guide declares its video with one frontmatter line,
   `youtube: <guide video id>`. A guide without the line renders exactly as it did
   before this feature: same page markup, no request to any YouTube host.
2. **Fail loud on a bad id.** If the line is present, its value must be exactly a
   guide video id. Anything else (empty, a full URL, wrong length, other
   characters) fails the guide compile with an error naming the guide file and
   showing the expected form. A `youtube:` line that appears more than once also
   fails the compile, even when one occurrence is valid, so a malformed line can
   never hide behind a later good one. The bundle is not written. Rationale: guides
   are operator-authored, and a silently dropped video is worse than a red build.
3. **Placement.** The player sits under the guide's title and lead line, above
   the guide body, at the same width as the guide's figures.
4. **Facade at rest.** The player is a 16:9 area that scales with the column. It
   shows YouTube's standard preview image for the video (loaded lazily from the
   YouTube image host) and a play button. The button is a real button, reachable
   by keyboard, with the accessible name "Play video: <guide title>" and a visible
   focus ring. No YouTube frame and no YouTube script are on the page at rest.
5. **Press to play.** Pressing the button (click, Enter, or Space) swaps the
   facade for the live player, loaded from YouTube's privacy-enhanced host
   (`youtube-nocookie.com`) with autoplay, so one press starts playback. Keyboard
   focus moves to the live player so a keyboard user can keep controlling it. The
   frame has the accessible name "Video: <guide title>", allows full screen, and
   sends the page origin as referrer (YouTube refuses to play embeds without it).
6. **No-JS and crawler fallback.** Under the player, a "Watch on YouTube" link
   opens the video's watch page in a new tab. It works without JavaScript and
   gives crawlers a plain link to the video.
7. **Hydration-safe.** The build-time page render and the browser's first render
   of a guide page with a player are identical (facade state); the swap happens
   only after a press.
8. **One press per guide.** A press plays only the video it was made on. Moving
   to another guide inside the site (client-side navigation, no page load) shows
   that guide's facade; its player never loads without its own press, and coming
   back to the first guide shows the facade again.
8. **Privacy disclosure follows the code.** The /privacy policy states that some
   guide pages include a YouTube video, that at rest only the preview image loads
   from YouTube's image host, and that pressing play loads YouTube's player from
   the privacy-enhanced host, after which YouTube's own policy applies. The hosts
   named in the policy are derived from the player's own constants, so changing
   a host without updating the policy fails CI.

## Constraints

- No new dependencies; no third-party script on page load.
- No Content-Security-Policy change: the site sets no page-level CSP. The only
  CSP header is scoped to diagram SVG files and does not govern guide pages.
- The id is validated twice: at compile (the fail-loud gate) and again in the
  player before any URL is built from it (defense in depth: an invalid id renders
  no player rather than a malformed URL).
- No analytics event for plays (a new event would need its own disclosure).

## Non-goals

- Adding the id to any guide in this change (the first video is not uploaded).
- Video structured data (`VideoObject` JSON-LD). It needs an upload date and
  description per video; a follow-up once a video is live.
- Self-hosting the preview image (would remove the at-rest request to YouTube's
  image host). A possible follow-up.

## Acceptance criteria

- AC1: A guide with a valid `youtube:` line compiles to a bundle entry carrying
  that id; a guide without the line compiles to an entry with no video key (the
  existing bundle is byte-identical).
- AC2: A present but invalid `youtube:` value (empty, URL, 10 or 12 characters,
  disallowed characters), or a repeated `youtube:` line, fails the compile with an
  error naming the file.
- AC3: The facade markup carries a button named "Play video: <title>", the
  preview image for that id, and a "Watch on YouTube" link, and carries no iframe
  and no `youtube-nocookie.com` URL.
- AC4: The player renders nothing for an invalid id.
- AC5: The compiler and the player accept and reject the same ids.
- AC6: Every built guide page without a video carries no YouTube host; every
  built guide page with a video carries the facade for its id and no live player.
  Built pages of existing guides are unchanged by this feature.
- AC7: The privacy policy names both YouTube hosts the player uses and the
  press-to-play behavior.
- AC8: After a press on one guide's video, showing another guide's video renders
  that video's facade and no live player; returning to the first does too. The
  guide page mounts a fresh player per guide.
- AC9: After a press, the live player is on the page, the facade button is gone,
  and keyboard focus is inside the live player.

## Test seams (decision)

Four seams, highest available, existing ones preferred:

1. **Guide compile** (`compileGuides` over a temporary content folder): AC1, AC2.
   Plus the existing bundle drift guard, which proves AC1's byte-identical half.
2. **Player render** (static render of the player component, the same seam the
   Markdown renderer's tests use): AC3, AC4, AC5.
2b. **Player in a DOM** (the player mounted in jsdom and driven by presses): AC8,
   AC9. A static render cannot press a button or hold focus, and the unit runner
   has no DOM, so this seam adds `jsdom` as an exact-pinned dev dependency (test
   only; never in the site bundle). jsdom fetches no subresources by default, so
   no YouTube host is contacted. The guide page's per-guide key is checked in the
   page source, since the whole app cannot render in the unit runner.
3. **Built guide pages** (`npm run test:built`, which reads the real build
   output): AC6. Rendering the whole app in the unit runner is not available (the
   app reads build-time environment values only Vite provides), so the built
   output is the page-level seam. It is data-driven from the guide corpus, so it
   starts asserting the facade the day a guide gains an id.

AC7 rides the existing privacy-disclosure seam (policy text checked against
constants exported by the code).

## Adding a video to a guide

1. Upload the video; copy the id from its watch URL
   (`https://www.youtube.com/watch?v=<id>`, the 11 characters after `v=`).
2. Add `youtube: <id>` to the guide's frontmatter (any position in the block).
3. `npm run compile:guides`, commit the `.md` and the regenerated bundle.
