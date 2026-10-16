import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';

// Guide video player (specs/guide-video-embed-spec.md).
//
// A click-to-load facade: at rest the page carries only YouTube's preview image
// (lazy) and a play button. Pressing play swaps in the YouTube player from the
// privacy-enhanced host, so no YouTube script or frame runs on a page view that
// never plays. The privacy policy names both hosts below; tests/privacyDisclosure
// reads these constants, so a host change without a policy change fails CI.
//
// Renders in the browser and in the build-time page render: the first render is
// always the facade, and nothing here reads window or document while rendering.

// Kept in step with YOUTUBE_ID in scripts/compileGuides.mjs (the compile-time
// gate); tests/guideVideo.test.ts feeds both the same ids. Checked again here so
// an invalid id renders no player instead of a malformed URL.
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const YOUTUBE_THUMB_ORIGIN = 'https://i.ytimg.com';
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
const YOUTUBE_WATCH_ORIGIN = 'https://www.youtube.com';

export const isYouTubeId = (id: unknown): id is string => typeof id === 'string' && YOUTUBE_ID_PATTERN.test(id);

interface VideoProps {
  id: string;
  title: string;
}

// The live player. autoplay=1 so the one press on the facade starts playback.
// YouTube refuses to play embeds that arrive without a referrer, so the frame
// sends the page origin explicitly. The ref travels as `frameRef`, a plain prop
// handed to the <iframe>, so it reaches the element on any React version (a prop
// literally named `ref` reaches a function component only from React 19 on).
export const GuideVideoFrame = ({ id, title, frameRef }: VideoProps & { frameRef?: React.Ref<HTMLIFrameElement> }) => {
  if (!isYouTubeId(id)) return null;
  return (
    <iframe
      ref={frameRef}
      src={`${YOUTUBE_EMBED_ORIGIN}/embed/${id}?autoplay=1&rel=0`}
      title={`Video: ${title}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 h-full w-full border-0"
    />
  );
};

export const GuideVideo = ({ id, title }: VideoProps) => {
  // Which video the reader pressed play on. Playing is tied to the id, so a new
  // video (client-side navigation to another guide) shows its facade at once, and
  // the effect below forgets the press so returning to the first guide does not
  // resume it either. The guide page also keys the player by guide slug.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playing = playingId === id;
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setPlayingId(null);
  }, [id]);

  // The button the keyboard user pressed is gone after the swap; hand focus to
  // the live player so they can keep controlling it.
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  if (!isYouTubeId(id)) return null;

  return (
    // Same breakout width as the guide's figures (components/Markdown.tsx). A plain
    // div, not a <figure>: a figcaption would name the whole player "Watch on YouTube".
    <div className="mb-10 lg:-mx-20 lg:w-[calc(100%+10rem)]">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950">
        {playing ? (
          <GuideVideoFrame frameRef={frameRef} id={id} title={title} />
        ) : (
          <button
            type="button"
            onClick={() => setPlayingId(id)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-copper-500"
          >
            {/* hqdefault exists for every public video (480x360, letterboxed);
                object-cover crops the letterbox bars inside the 16:9 frame. */}
            <img
              src={`${YOUTUBE_THUMB_ORIGIN}/vi/${id}/hqdefault.jpg`}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-copper-500 text-slate-950 shadow-lg shadow-black/40 transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110 md:h-20 md:w-20"
            >
              <Play size={30} fill="currentColor" className="ml-1" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-sm text-slate-400">
        <a
          href={`${YOUTUBE_WATCH_ORIGIN}/watch?v=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-copper-400 underline decoration-copper-500/40 underline-offset-2 hover:text-copper-300"
        >
          Watch on YouTube
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </p>
    </div>
  );
};

export default GuideVideo;
