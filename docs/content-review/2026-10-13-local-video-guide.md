# Local video guide review

Date: 2026-10-13. Status: Dan approved this guide for commit and PR; publication
remains pending. His response was "approve" to the explicit draft-for-commit-and-PR
checkpoint. The approved article digest below is unchanged.

## Deliverable

`content/guides/quality-video-on-local-hardware.md` presents the established Elsewhere
Unfolds production method as a public tutorial. It covers the brief, continuity,
plates, Wan motion, short proofs, ACE-Step music, FFmpeg assembly, technical and
perceptual review, recovery, and vertical excerpts. Two original diagrams have
1536px and 768px WebP variants; editable SVG sources live in
`docs/guide-artwork/local-video/`.

Article SHA256: `1572de99368e2226cadad85553d9b0540acca5bb88d2de5ce9cfde4867b26164`.

No new application behavior, model generation, production mutation, dependency
manifest change, or publisher activation is included. The generated guides bundle
is regenerated from the article. Existing guide routes supply discovery, rendering,
schema, and sitemap behavior.

## Grounding and accuracy review

Elsewhere source was read at commit `17f1b5ef893cddd78c2951e3175e3e3f5fb200e6`.
Existing unrelated local files were not changed or used as acceptance evidence.

| Claim | Evidence read in the production repository |
| --- | --- |
| Established motion settings and recorded native raster | `production/orion-art-wan-film/20260907-moon-gardens/source/wan_shot.py`; `production/orion-art-wan-film/20260912-ocean-above-stars/source/prepare.py` |
| Local music baseline | `production/orion-art-wan-film/20260912-ocean-above-stars/source/compose_score.py` |
| Hosted starting images make some productions hybrid | `films/09-gardens-that-sail-between-moons/proof-art-provenance.json` |
| Frozen environment, repeated footage, highlight overflow, and continuity lessons | `docs/production/e6-continuation-lessons.md` |
| Precise audio-duration discrepancy | `docs/solutions/2026-09-13-preserve-ace-duration-grid-output.md` |
| Selected gentle cleanup belongs to one audition | `films/06-atlas-beneath-the-drowned-moon/shorts/accepted-audio.json` |
| Later playback-path diagnosis and vertical-edit constraints | `films/08-lantern-market-inside-a-comet/shorts/README.md` |
| Local baseline is distinct from newer comparison work | Established source recipes only; current experimental model comparisons are not used as production evidence |

Public documentation checked: Wan2.2 README and `generate.py`, ACE-Step repository
and v1 3.5B model card, FFmpeg filters and concat demuxer, and FFprobe documentation.
The article links those primary sources. The YouTube handle matches the production
channel record; the web fetch of YouTube failed, so no fresh public playback claim
is made.

The sequential skeptic reread checked these failure cases:

- The title could imply every historic asset was generated locally. The opening
  discloses hosted artwork and gives an entirely local input route.
- Hardware guidance could become a purchase guarantee. The 24 GB statement is
  attributed to the upstream example, with configuration limits stated.
- 121 frames could be mislabeled exactly five seconds. The guide distinguishes
  generated duration from the 120-frame edit.
- A size flag could be mistaken for output dimensions. Actual raster inspection
  is required, and enlargement is explicitly called an upscale.
- Cleanup could become an automatic preset. Playback diagnosis and comparative
  listening precede any selection.
- A successful command could be mistaken for quality. Technical, visual, and
  listening reviews remain separate throughout.
- An operational failure could discard a good clip. Recovery preserves completed
  artifacts and verifies resource restoration separately.

This is an author-side accuracy and leakage review, not an independent external
review verdict. Dan's subsequent approval covers the guide and PR, not any new
film, model run, merge, or publication.

## Validation

- `npm ci --ignore-scripts` restored the committed dependency lock before final checks.
- `npm test`: 457 passed.
- `npm run build`: passed with committed substrate-derived content preserved.
- `npm run test:built`: 19 passed.
- `git diff --check`: passed.
- All five FFmpeg/FFprobe article examples executed on synthetic inputs. Result:
  720 frames, 24 fps, 30.000000 seconds of picture, stereo 48 kHz audio, clean full
  decode. This tests commands, not the creative quality of a generated film.
- Wan generation was checked against production source and upstream CLI; it was
  not rerun for this writing task. No fresh GPU-performance claim is made.
- The 27 retained lane leakage/mutation markers, long dashes, IPv4 addresses, and
  excluded trial names were absent from the article and figure sources.
- Playwright inspected the built article at 1440px and 390px widths: correct
  title, no horizontal page overflow, readable article, responsive figure sources.
- Built HTML has the exact self-canonical, Article JSON-LD, server-rendered prose,
  and the matching sitemap entry. These are local build checks, not live release
  evidence.
- The four WebPs total 235,622 bytes; each is below the image budget. Diagram copy
  was simplified after the first mobile inspection to improve small-screen text.

The first build discovered an unrelated sibling substrate checkout and refreshed
existing generated content/assets. Those changes were restored to HEAD. The final
build sets `SUBSTRATE_PATH` to an empty review-only directory with
`publishing/canonical/`, exercising the existing fail-open path and preserving the
committed bundle as the production build does when substrate is unavailable.
No compiler behavior was changed. Initial image-budget failures caused by that
refresh disappeared after restoration. The first transient browser 404 occurred
during rebuilding; the final built route returned successfully.

The locked install reported eight existing dependency audit findings (two moderate,
six high). They are not introduced by this content diff. No dependency update or
claim of resolving those findings is included. Vite's existing large-chunk warning
also remains.

## Release and rollback

1. Guide-and-diff approval before commit was received on 2026-10-13.
2. Commit only the article, regenerated guide bundle, figure sources/exports, and
   this review record; push the task branch and open a PR. Bind any subsequent
   reviewer results to the final article bytes. Resolve actionable CI/review findings.
3. Obtain the applicable merge/deploy authority. After deployment, check the exact
   guide URL for its own canonical, rendered text, figures, sitemap, and playback
   link. HTTP 200 alone is not enough.
4. Only after the canonical is live, vendor that live source into the publishing
   lane, absolutize asset URLs, pin the digest, and follow the guide syndication
   runbook. Any arming/publication remains under its applicable approval gate.
5. Monitor the new route and image responses after release. If the article must be
   withdrawn, prepare a revert of this content commit and regenerate the guide
   bundle; merge/deploy the revert under the same authority. Existing guide code
   needs no migration or rollback.

Reusable lesson: content-only guide builds must keep unrelated substrate refreshes
out of the review diff. Image sources and renderer success must also remain distinct
from the guide's claim that a particular production stage runs locally.
