---
title: "Quality video on local hardware: the Elsewhere Unfolds workflow"
slug: quality-video-on-local-hardware
date: 2026-10-13
reviewed: 2026-10-13
youtube: o_-x318-PaM
category: Video
description: "A practical local video workflow drawn from Elsewhere Unfolds: plan a coherent world, animate with Wan, score with ACE-Step, edit with FFmpeg, and review the finished film."
lead: "Local models can produce beautiful shots. A finished film needs more: a world that stays coherent, movement that feels intentional, music that holds together, and an edit worth watching. This is the production method we have been developing with Elsewhere Unfolds."
---

An early Elsewhere Unfolds cut had an attractive world, a complete timeline, and a successful render. It also had water that barely moved and clouds that stayed fixed while the camera drifted past them.

The shot manifest was satisfied. The scene did not feel alive.

That correction changed how we produced the next passages. We separated camera movement from environmental movement, tested short motion clips at normal speed, and watched them before committing to the rest of the film. The improvement came from a clearer creative requirement and a smaller review loop.

[Elsewhere Unfolds](https://www.youtube.com/@ElsewhereUnfolds) makes fantasy and cosmic visual journeys with instrumental music. This guide explains the reusable production method behind that work, from the first visual promise to a finished master and vertical excerpts.

**The boundary matters:** our established motion, music, editing, and finishing pipeline uses local resources. Some starting images were made with a hosted image tool. That makes those productions hybrid. For an entirely local version, supply your own photographs, drawings, local 3D renders, or images from a model running on your machine. The workflow below starts with those local image files. It does not require a hosted video generator.

The examples use the Wan 2.2 TI2V-5B and ACE-Step v1 stack from our production recipes. They are a concrete baseline, not a claim that every newer model has been evaluated or that these settings suit every GPU.

## The production loop

Work in three sizes: one shot, one short sequence, then the complete film. Each answers a different question.

| Size | What you are learning | What to review |
| --- | --- | --- |
| One native motion take | Can the intended action work? | Geometry, feet, motion direction, unwanted objects |
| A 30 to 60 second sequence | Do the shots and music belong together? | Orientation, pacing, transitions, emotional tone |
| The complete film | Does the experience hold up over time? | Repetition, later continuity, score joins, ending |

![Production proceeds from a brief and local artwork to a short motion test, an opening sequence, and a full film. Review separates each expansion; music joins the opening and the final edit.](/assets/guides/local-video/production-loop.webp "Prove the shot, then the sequence, then the film. Keep accepted work when expanding the next stage.")

Our longer episodes have used an 8:01 format. That is an editorial choice, not a recommended starting assignment. Begin with a 30-second film you can finish, inspect, and revise. Padding a weak minute into eight minutes only gives you more weak material to fix.

## What needs to run locally

You do not need a cluster. You need a machine that can run the chosen model, space for its weights and intermediate files, and a way to edit and review the result.

| Job | Our established tool or method | Output to keep |
| --- | --- | --- |
| World and shot planning | Written brief, storyboard, reference images | Selected brief and shot list |
| Starting artwork | Approved image files; source can vary | Original plate and provenance |
| Image-to-video motion | Wan 2.2 TI2V-5B | Native take, prompt, seed, settings |
| Instrumental music | ACE-Step v1 3.5B | Raw WAVs and selected arrangement |
| Assembly and finishing | Python orchestration and FFmpeg | Edit decisions, review copy, final master |
| Inspection | FFprobe, frame samples, normal playback | Technical results and review decisions |

Wan's documented single-GPU TI2V-5B example targets at least 24 GB of VRAM with model offloading and the text encoder on CPU. Treat that as the reference for that command, not a universal minimum or a guarantee of success. CPU RAM, free VRAM, software versions, and the selected settings still matter. Check the [official Wan setup instructions](https://github.com/Wan-Video/Wan2.2#run-text-image-to-video-generation) against your hardware before downloading a large checkpoint.

For a first project, keep motion generation and music generation sequential. A background model can consume memory that a video job needs. If the GPU is shared, agree on an available window; do not terminate somebody else's work to make room. A waiting job is cheaper than losing an accepted take or disrupting another workload.

Initial installation and model downloads need network access. Local inference means the generation runs on your equipment. It does not make electricity, storage, setup time, or retakes free.

Record the model revision, source revision, environment, settings, and input image for each run. A seed helps repeat an experiment, but it does not guarantee identical output across different software and hardware.

## 1. Write the experience before writing prompts

A useful brief explains what the viewer will experience and what will change. “Beautiful cinematic fantasy, ultra detailed” cannot do that work.

Here is an illustrative brief for a small film:

> We board a floating garden before it leaves a quiet dock. A gardener crosses the terrace. The gap behind us widens, and a pale arch appears at our destination. Copper, emerald, and pearl remain the visual palette. The mood is calm anticipation. The final image resolves the journey rather than introducing another location.

Turn it into a few fixed decisions:

- **The promise:** a garden really leaves one place for another.
- **The route:** boarding terrace, departure view, onboard path, destination.
- **The continuity anchors:** the same moon placement, architecture, clothing, and direction of travel.
- **The movement:** leaves and water move; the dock recedes; a person performs one readable action.
- **The exclusions:** no crowds, complicated hand exchanges, or unexplained new landmarks.

Make the thumbnail and first shot agree about the film's promise. If the packaging promises a moving island, establish that island and its departure early. A long logo introduction spends attention before delivering the thing the viewer selected.

For Elsewhere, a recognizable route matters more than a collection of unrelated beautiful locations. Each shot should tell us where we are, what has changed, or where we are going.

## 2. Build a world that survives the next camera angle

Call the approved starting image for a shot its **plate**. Keep a small set of reference plates that establish materials, light, landmarks, and any recurring people.

Review the plates together before animating them. A contact sheet makes inconsistencies easier to see: a second moon appears, the destination moves behind the traveler, or a bridge no longer connects to the same terrace.

We have caught all of those classes of problem during production. One reverse view placed another complete moon outside a doorway even though the camera was already inside that moon. Another reference combination duplicated the sun. Attractive individual images can still describe an impossible route.

Use a compact shot table:

| Shot | Purpose | Action | Must remain stable |
| --- | --- | --- | --- |
| Terrace wide | Establish the world | Water ripples and leaves move | Island silhouette, moon position |
| Gardener profile | Establish habitation | One walk from left to right | Clothing, ground contact, path |
| Stern view | Prove departure | The distant dock recedes | Foreground rail, open gap |
| Bow view | Reveal destination | Gentle camera reveal | Travel direction, destination arch |

Simplify a plate when it asks too much of motion generation. Give a walking person visible feet, clear ground, and empty space ahead. Separate actions that would otherwise compete. A close hand exchange, turning crowd, and moving camera in the same five seconds create several opportunities for failure.

If you want the whole process to stay local, this is where you choose your image source. A scene rendered in a local 3D application or a drawing you made yourself is a valid plate. A local image model is another option, but it is a separate tool to qualify. We are not claiming that substituting one reproduces our hosted artwork automatically.

## 3. Generate one motion take with a clear job

For image-to-video work, let the plate describe the appearance. Use the motion prompt to describe the action, camera, and things that must stay stable.

An illustrative prompt:

> Locked medium-wide side view. One gardener walks naturally from left to right along the level stone path. Both feet remain visible and contact the ground. Leaves move gently in the background. Preserve the copper railing, architecture, clothing, and lighting. No additional people, no camera orbit, no cuts.

After following the upstream installation instructions and downloading the TI2V-5B checkpoint, this is the shape of a run from the Wan source directory. Replace the example input and checkpoint paths with your local files. Use a new output filename for each attempt.

```bash
python generate.py \
  --task ti2v-5B \
  --size '1280*704' \
  --ckpt_dir ./Wan2.2-TI2V-5B \
  --image ./inputs/gardener.png \
  --prompt 'Locked side view. One gardener walks left to right on a level path. Feet remain visible. Leaves move gently. Preserve the railing and clothing. No extra people or cuts.' \
  --frame_num 121 \
  --sample_steps 50 \
  --sample_solver unipc \
  --sample_shift 5.0 \
  --sample_guide_scale 5.0 \
  --base_seed 42 \
  --offload_model True \
  --convert_model_dtype \
  --t5_cpu \
  --save_file ./gardener-take-01.mp4
```

These controls follow the [upstream command-line interface](https://github.com/Wan-Video/Wan2.2/blob/main/generate.py) and our established recipe. This is an adapted example, not a fresh performance benchmark. It does not enable a hosted prompt-expansion service.

At 24 fps, 121 encoded frames occupy about 5.04 seconds. An exact five-second edit uses 120 frames. Check the generated file's actual dimensions and timing: our image-conditioned production outputs have included 1248 × 704, despite the `1280*704` size setting. Do not infer the output raster from the command alone.

Watch the native take before slowing, enlarging, or stitching it. Check the start, middle, and end, then play the entire clip. Look for foot sliding, changing faces, bending rails, sudden foreground figures, and movement in the wrong direction. If the action fails, simplify the action or repair the plate before launching a large batch.

## 4. Treat three kinds of motion separately

**Camera motion** changes the viewpoint. **Environmental motion** changes water, mist, foliage, light, and other scene elements. **Performed action** is a person walking, turning, or doing something.

An image can have a convincing camera move while its waterfall remains frozen. A scene can have moving fog while its traveler slides without taking a step. Review each kind independently.

![Three separate review lanes distinguish camera movement, environmental movement, and performed action. Each names what should move and a characteristic failure to inspect.](/assets/guides/local-video/three-kinds-of-motion.webp "A moving camera cannot prove moving water. A changed pose cannot prove a convincing walk.")

For a calm environmental shot, forward slow motion can be useful if it still looks natural. For walking or other recognizable human actions, start with native speed. Watch any interpolation for doubled limbs, smeared edges, and unstable occlusions.

Five seconds of generated movement do not become twenty seconds of new action because the editor can repeat or slow them. A reverse loop can make a person walk backward; a repeated wave or bird can reveal the loop. If a passage needs more time, generate a distinct take, cut to another angle, or shorten the passage.

Continuing from the last frame of a previous take can help connect movement, but it can also carry defects forward. Inspect that frame before making it the next input. Stop a continuation when geometry starts to drift instead of extending the error through the film.

## 5. Finish a short opening before expanding the film

Assemble a 30 to 60 second proof with real motion, representative music, and the intended edit rhythm. A slideshow of selected plates cannot answer whether the finished motion works.

The proof should contain the hard part. If departure is the central promise, include departure. If a recurring traveler makes the world feel inhabited, include a real walking shot. An easy landscape does not qualify a harder action later.

Review the sequence without pausing first. Does it make sense? Does the first shot deliver the promise? Is there a reason to keep watching? Then examine technical defects and individual transitions.

Once a sequence is accepted, keep its exact files and settings. Expand around it. We preserve accepted openings while generating later passages so a new render cannot silently replace the part that already worked.

Keep a simple project layout:

```text
film/
  brief.md
  shots.csv
  plates/
  motion/raw/
  motion/selected/
  music/raw/
  music/selected/
  edit/
  review/
  exports/
```

The labels are less important than the separation. Raw sources stay intact; selected sources are explicit; review exports are disposable derivatives. Save a rejection reason beside a failed take so the next attempt changes something useful.

## 6. Compose and review the soundtrack as a whole

Our established music recipes use [ACE-Step v1 3.5B](https://huggingface.co/ACE-Step/ACE-Step-v1-3.5B) locally. Keep the version explicit: a later release may have different installation, controls, and behavior. Use the [project's documentation](https://github.com/ace-step/ACE-Step) for the environment matching your selected release.

A music brief should describe the experience and the arrangement. For this style, we ask for warm, spacious instrumental ambience, gradual harmony, and sparse melody. We also describe what would break the mood: lyrics, voice-like passages, a strong beat, abrupt motifs, or a trailer-style crescendo.

Start with a short audition against the opening. Choose where the cue enters and whether it leaves enough space for the imagery. Then review the full arrangement, including every join and the final tail. An attractive first minute does not establish a clean ending.

Keep lossless WAV sources. Build an arrangement from selected cues with measured overlaps, deliberate fades, and enough headroom. The finished duration is the sum of the cue durations minus their overlaps. The same arithmetic applies to overlapping video transitions.

Measure the generated audio rather than assuming a requested duration is exact. We encountered a cue that was roughly 73 milliseconds short because of the installed model's duration grid. The composition had succeeded. The useful response was to preserve it, diagnose the precise discrepancy, and make a small documented finishing correction. That is different from concealing a missing passage with silence.

### Check the playback path before removing noise

When static is reported, compare the original WAV, the finished export, and playback in another native player or device. In one later Elsewhere review, native Windows playback sounded correct while the WSL playback path did not. Filtering the accepted source would have changed music that was already satisfactory.

For a different batch of Shorts, a gentle cleanup was accepted after direct comparison. This was the filter used for that case:

```bash
ffmpeg -n -i source.wav \
  -af 'afftdn=nr=6:nf=-48:tn=0:gs=8' \
  -c:a pcm_s24le audition-clean.wav
```

Treat this as an audition candidate, never an automatic mastering preset. FFmpeg documents these controls under [afftdn](https://ffmpeg.org/ffmpeg-filters.html#afftdn). Denoising can soften wanted texture. Compare original and cleaned versions at comparable listening levels, preserve both, and choose by listening. Waveform similarity and successful decoding cannot establish that something sounds good.

## 7. Edit to a timeline, not a requested runtime

Give every shot an editorial purpose and an explicit frame allocation. At 24 fps, an 8:01 film contains 11,544 presentation frames. Resolve transitions and overlaps in that frame budget rather than rounding each shot independently.

For a first 30-second exercise, prepare six accepted five-second shots at 24 fps, all with matching dimensions, codec settings, and no audio. Put the filenames in `edit/shots.txt`, relative to that list:

```text
file '../motion/selected/shot-01.mp4'
file '../motion/selected/shot-02.mp4'
file '../motion/selected/shot-03.mp4'
file '../motion/selected/shot-04.mp4'
file '../motion/selected/shot-05.mp4'
file '../motion/selected/shot-06.mp4'
```

From the project root, assemble a straight-cut picture track:

```bash
ffmpeg -n -f concat -safe 0 -i edit/shots.txt \
  -map 0:v:0 -an -c:v copy edit/picture.mp4
```

This simple stream-copy path requires compatible, independently prepared clips. Mixed time bases, encoders, or track layouts need normalization in your editing stage; a concat command is not a general repair tool. Keep crossfades out of the first exercise so its duration stays easy to audit. See the [concat demuxer documentation](https://ffmpeg.org/ffmpeg-formats.html#concat).

After preparing a 30-second score with its entrance and ending already shaped, make a review export:

```bash
ffmpeg -n -i edit/picture.mp4 -i music/selected/score-30s.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart exports/review-30s.mp4
```

Both sources must cover the intended duration. Avoid adding `-shortest` as a reflex: it can hide an unexpectedly short input by cutting the other track. Inspect the result and listen to its ending.

Keep the native generation size distinct from the delivery size. A 3840 × 2160 export made from lower-resolution motion is an upscale. It can be a useful delivery format, but enlarging a warped railing makes a larger warped railing. Finish motion and continuity before paying for a high-resolution encode.

## 8. Make quality control answer specific questions

Automated checks are useful when they tell you exactly what they established. Use [FFprobe](https://ffmpeg.org/ffprobe.html) to inspect the exported file:

```bash
ffprobe -v error -count_frames \
  -show_entries 'stream=index,codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,duration,sample_rate,channels:format=duration' \
  -of json exports/review-30s.mp4
```

For the exercise, expect 720 video frames at 24 fps and the planned audio channels and sample rate. AAC/container timing can differ slightly from the exact picture duration; investigate meaningful mismatches instead of treating every reported duration as identical.

Decode the entire export, including audio:

```bash
ffmpeg -v error -xerror -i exports/review-30s.mp4 \
  -map 0:v:0 -map 0:a:0 -f null -
```

A clean decode establishes readable media. It does not establish pleasing images, good pacing, or acceptable sound. Complete three reviews:

| Review | Questions |
| --- | --- |
| Technical | Does it decode? Are the streams, dimensions, frame count, and duration correct? |
| Visual | Does the world stay coherent? Do feet, rails, water, and transitions behave? |
| Listening | Are cue joins, noise, dynamics, and the ending acceptable on real playback? |

Sample frames around transitions and at the middle of procedural effects, not just the first and last frames. We caught a highlight problem at the peak of a light treatment: an 8-bit color calculation exceeded its valid range and wrapped. The endpoints looked fine. The fix was in the finishing calculation, not another generation attempt.

When replacing one part of an accepted film, verify that the parts meant to stay unchanged did stay unchanged. File hashes identify exact copies. Decoded-frame comparisons can check preserved picture across a container change. Neither substitutes for watching the new result.

## 9. Expand, recover, and keep the good work

A long render has more than one kind of success. Generation can finish even if a later copy, collection, or resource-restoration step fails. Inspect the output before rerunning the expensive part.

Save completed takes as they arrive. Record the input plate, prompt, seed, model revision, native output, and selected derivative for each shot. If a job is interrupted, resume from the missing work instead of regenerating everything that already passed review.

On shared hardware, record what resource settings you changed and restore those settings after the run. Check that restoration separately from the video artifact. A good clip does not prove the machine was returned to its previous state.

Agents and scripts are helpful for preparing shot packets, tracking outputs, making contact sheets, checking files, and assembling review pages. Give them explicit limits on retries, durations, and replacement scope. Keep creative selection with the person watching and listening. A process reporting success cannot decide that a walk feels natural.

The useful efficiency measure is accepted footage per production session. A faster model that creates more unusable takes may cost more time overall. Track rejected takes and the reasons for rejection before changing models or increasing concurrency.

## 10. Derive Shorts from the accepted film

Choose excerpts that contain a complete visual idea: a reveal, an arrival, a short action, or a change in the world. Reframe deliberately for vertical output. A centered crop can remove the destination, the feet, or the object that makes the action understandable.

Elsewhere's vertical edits reuse the accepted picture and soundtrack. Review the new crop, text placement, entrance, and ending as a separate edit. Keep a clean version as well as any version carrying a short hook or invitation to the full film. Captions belong where there is speech or useful context; an instrumental film does not need invented narration.

Watch the export at phone size with the platform's interface area in mind. Keep the important action visible, and listen to the actual exported audio. A short excerpt can expose a rough music boundary that was unnoticeable inside a longer cue.

Publication adds another review: correct file, title, thumbnail, links, visibility, processing, and playback. Follow the platform's current disclosure requirements. Local generation and an original prompt do not settle every source or usage question; retain the provenance and applicable licenses for the material you use.

Measure the audience response separately from production quality. Compare retention and traffic sources at similar release ages where possible. A Short's views do not prove that viewers continued to the full film, and a small audience sample does not establish why one opening performed differently.

## Your first local film

Make the first deliverable small enough to finish:

1. Write one paragraph describing a place, an action, and an ending.
2. Select a small set of locally sourced plates that agree about the world.
3. Prove the hardest action in one native motion take.
4. Build six distinct five-second shots with consistent technical settings.
5. Select or compose a local 30-second soundtrack and shape its ending.
6. Assemble, probe, decode, watch, and listen to the complete export.
7. Preserve the accepted version before trying a longer film or a vertical cut.

The lasting part of the Elsewhere workflow is the ability to inspect and revise each decision. You can replace a model, change an editor, or improve the hardware while keeping that method: define the experience, test its hardest part, preserve what works, and judge the film that the viewer will actually see.
