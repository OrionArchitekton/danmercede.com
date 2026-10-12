# Edition 12 production verification

## Released artifact

- Content-sync [PR #198](https://github.com/OrionArchitekton/danmercede.com/pull/198)
  merged October 12, 2026 at **22:13:55Z** as
  `c6dc97b9ae3f5a93879168b773b80208a0f4a654`.
- Its whole tree equals reviewed content head
  `a8ea34299958718f5a37e44e8f10a6c9ae7f5bb2` (squash merge).
- GitHub production deployment **7025138520**, bound to that exact merge SHA,
  reports success at **22:14:25Z**.
- Public consumer:
  [The Assistant Was Only Supposed to Read](https://www.danmercede.com/thoughts/2026-10-05-the-assistant-was-only-supposed-to-read).

## Independent public consumer check

At **2026-10-12T22:16:53.952Z**, unauthenticated production reads passed:

- HTTP 200 at the exact essay URL, with its exact rendered-path stamp. The
  complete initial rendered page equals the reviewed E12 build render, not
  merely a title match, head-script substring or generic SPA HTTP 200.
- The same render preserves the full body, title, headings, two images, alt
  text, captions and actual closing CTA anchor.
- Both served PNGs return HTTP 200/image/png and match reviewed source bytes:
  `reach.png` (2,243,299 bytes), SHA-256
  `c7f547028caa32612bb49b5c9e5198693476fd4ef6d52abb67c14f098c3d70e8`;
  `record.png` (2,010,107 bytes), SHA-256
  `922b11a12168be03f0cc23a69cb6f50b1baa7740732e64ff5ec387d1900b60b4`.
- The exact CTA URL preserves its LinkedIn attribution parameters and its
  destination returns HTTP 200 without changing the URL.
- The thoughts index links to the exact edition. Its self-canonical uses
  `https://www.danmercede.com`. The sitemap contains that exact canonical URL;
  the individual RSS item and Atom entry contain the opening, closing and CTA.
- The non-www essay URL redirects to that www canonical and returns HTTP 200.
- Negative control `/thoughts/fcn-e12-negative-control-20261012-not-an-edition`
  returns HTTP **404**, carries no E12 rendered-path stamp and no E12 article
  in its root. Thus the site-wide bundle containing E12 cannot falsely certify
  an invalid route as the edition.

This establishes the hub release at its public consumer. It does not certify
analytics, received leads, dev.to/Hashnode syndication, native LinkedIn scheduling
or the separate automated PR-writer credential. No such action was performed
as part of this public consumer check.

The later credential repair has its own
[verification record](../solutions/2026-10-12-substrate-sync-pr-credential.md).
Unlike content PR #198 (existing CLI authentication), documentation PR #199
was created by a direct REST request using the new writer credential itself,
before that credential was installed as the secret. Its HTTP 201 response
establishes direct PR-write capability, not the full Actions Git-push/PR path.
The subsequent strict main sync passed without drift and skipped PR writing;
the next genuine drift remains the full Actions canary.
