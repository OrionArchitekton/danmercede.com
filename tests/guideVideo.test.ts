import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileGuides, YOUTUBE_ID } from '../scripts/compileGuides.mjs';
import GuideVideo, {
  GuideVideoFrame,
  isYouTubeId,
  YOUTUBE_EMBED_ORIGIN,
  YOUTUBE_THUMB_ORIGIN,
} from '../components/GuideVideo';

// Guide video player (specs/guide-video-embed-spec.md).
// Seam 1: the guide compile, run over a temporary content folder.

const GOOD_ID = 'Ab3_d-F9hJk';

// Ids the compiler and the player must both reject (spec AC2, AC5).
const BAD_IDS = [
  '',
  `https://www.youtube.com/watch?v=${GOOD_ID}`,
  `youtu.be/${GOOD_ID}`,
  'Ab3_d-F9hJ', // 10 characters
  'Ab3_d-F9hJkk', // 12 characters
  'Ab3_d-F9h.k', // disallowed character
  'Ab3_d-F9h k', // inner space
];
const GOOD_IDS = [GOOD_ID, 'a-b_c-d_e-f', '___________', '-----------'];

function guideMd(extraFrontmatter = ''): string {
  return [
    '---',
    'title: "A test guide: with a colon"',
    'slug: test-guide',
    'date: 2026-10-15',
    'reviewed: 2026-10-15',
    'category: Testing',
    'description: A guide used only by tests.',
    'lead: The lead line.',
    ...(extraFrontmatter === '' ? [] : [extraFrontmatter]),
    '---',
    '',
    '## Body',
    '',
    'Some text.',
  ].join('\n');
}

async function compileOne(md: string): Promise<Record<string, unknown>> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-video-'));
  try {
    fs.writeFileSync(path.join(dir, 'test-guide.md'), md);
    const guides = await compileGuides(dir);
    assert.equal(guides.length, 1);
    return guides[0];
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('a guide with a valid youtube line compiles to an entry carrying the id (AC1)', async () => {
  const g = await compileOne(guideMd(`youtube: ${GOOD_ID}`));
  assert.equal(g.youtube, GOOD_ID);
  const quoted = await compileOne(guideMd(`youtube: "${GOOD_ID}"`));
  assert.equal(quoted.youtube, GOOD_ID, 'a quoted id is accepted like any other frontmatter value');
});

test('a guide without a youtube line compiles to an entry with no video key (AC1)', async () => {
  const g = await compileOne(guideMd());
  assert.ok(!('youtube' in g), 'no empty or undefined video key is emitted');
  assert.deepEqual(Object.keys(g), ['title', 'slug', 'date', 'reviewed', 'category', 'description', 'lead', 'body']);
});

test('the video key sits after reviewed and before category, so existing bundle entries keep their shape', async () => {
  const g = await compileOne(guideMd(`youtube: ${GOOD_ID}`));
  assert.deepEqual(Object.keys(g), ['title', 'slug', 'date', 'reviewed', 'youtube', 'category', 'description', 'lead', 'body']);
});

test('a present but invalid youtube value fails the compile and names the file (AC2)', async () => {
  for (const bad of BAD_IDS) {
    await assert.rejects(
      compileOne(guideMd(`youtube: ${bad}`)),
      (err: Error) => {
        assert.match(err.message, /test-guide\.md/, `error names the guide file for ${JSON.stringify(bad)}`);
        assert.match(err.message, /youtube/, 'error names the field');
        assert.match(err.message, /11/, 'error states the expected form');
        return true;
      },
      `expected ${JSON.stringify(bad)} to be rejected`,
    );
  }
});

test('a repeated youtube line fails the compile, whichever occurrence is valid (AC2)', async () => {
  const cases = [
    ['youtube: not-an-id', `youtube: ${GOOD_ID}`], // a malformed line must not be overwritten by a later valid one
    [`youtube: ${GOOD_ID}`, 'youtube: not-an-id'],
    [`youtube: ${GOOD_ID}`, `youtube: ${GOOD_ID}`], // even an identical repeat is ambiguous authoring
  ];
  for (const lines of cases) {
    await assert.rejects(
      compileOne(guideMd(lines.join('\n'))),
      (err: Error) => {
        assert.match(err.message, /test-guide\.md/, 'error names the guide file');
        assert.match(err.message, /"youtube" appears 2 times/, 'error says the field is repeated');
        return true;
      },
      `expected ${JSON.stringify(lines)} to be rejected`,
    );
  }
});

// Answers a review claim that `$` lets a trailing newline through: in JavaScript, `$`
// without the m flag matches only at the end of the input. The compile path cannot
// carry a newline in a value anyway (frontmatter is split into lines first), so this
// pins both validators directly.
test('an id with a trailing or leading newline is rejected by both validators', () => {
  for (const v of [`${GOOD_ID}\n`, `${GOOD_ID}\r\n`, `${GOOD_ID}\r`, `\n${GOOD_ID}`]) {
    assert.equal(YOUTUBE_ID.test(v), false, `compiler pattern rejects ${JSON.stringify(v)}`);
    assert.equal(isYouTubeId(v), false, `player rejects ${JSON.stringify(v)}`);
  }
});

test('the compiler accepts every well-formed id (AC5, compiler half)', async () => {
  for (const good of GOOD_IDS) {
    const g = await compileOne(guideMd(`youtube: ${good}`));
    assert.equal(g.youtube, good);
  }
});

// Seam 2: the player component, rendered statically (the Markdown renderer's seam).

const TITLE = 'Run a multi-agent browser pool & keep "sessions" apart';
const facade = (id = GOOD_ID, title = TITLE) => renderToStaticMarkup(React.createElement(GuideVideo, { id, title }));
const decode = (html: string) =>
  html.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

test('the facade is a named play button over the preview image, with no YouTube frame (AC3)', () => {
  const html = facade();
  const button = /<button\b[^>]*>/.exec(html);
  assert.ok(button, 'a real <button> element');
  assert.match(button![0], /type="button"/);
  assert.equal(
    decode(/aria-label="([^"]*)"/.exec(button![0])?.[1] ?? ''),
    `Play video: ${TITLE}`,
    'the button carries the accessible name "Play video: <title>"',
  );
  // A visible focus indicator, not just any focus-visible utility: focus:outline-hidden
  // removes the browser outline, so the ring must replace it.
  const buttonClasses = (/class="([^"]*)"/.exec(button![0])?.[1] ?? '').split(/\s+/);
  assert.ok(buttonClasses.includes('focus-visible:ring-2'), 'keyboard focus draws a 2px ring');
  assert.ok(buttonClasses.includes('focus-visible:ring-copper-500'), 'in the site accent color');
  const img = /<img\b[^>]*>/.exec(html);
  assert.ok(img, 'a preview image');
  assert.match(img![0], new RegExp(`src="${YOUTUBE_THUMB_ORIGIN}/vi/${GOOD_ID}/hqdefault\\.jpg"`));
  assert.match(img![0], /loading="lazy"/);
  assert.match(img![0], /alt=""/, 'decorative image: the button already names the action');
  assert.match(html, /aspect-video/, '16:9 area that scales with the column');
  assert.doesNotMatch(html, /<iframe/i, 'no frame at rest');
  assert.doesNotMatch(html, /<script/i, 'no script at rest');
  assert.ok(!html.includes(YOUTUBE_EMBED_ORIGIN), 'the privacy-enhanced player host is not referenced at rest');
});

test('the facade carries a Watch on YouTube link that works without JavaScript (AC3)', () => {
  const html = facade();
  const link = /<a\b[^>]*>([^<]*)</.exec(html);
  assert.ok(link, 'a plain link');
  assert.match(link![0], new RegExp(`href="https://www\\.youtube\\.com/watch\\?v=${GOOD_ID}"`));
  assert.match(link![0], /target="_blank"/);
  assert.match(link![0], /rel="noopener noreferrer"/);
  assert.match(link![1], /Watch on YouTube/);
});

test('the live player loads the privacy-enhanced host with autoplay and a named, full-screen frame', () => {
  const html = renderToStaticMarkup(React.createElement(GuideVideoFrame, { id: GOOD_ID, title: TITLE }));
  const frame = /<iframe\b[^>]*>/.exec(html);
  assert.ok(frame, 'an iframe');
  const src = decode(/src="([^"]*)"/.exec(frame![0])?.[1] ?? '');
  const url = new URL(src);
  assert.equal(url.origin, YOUTUBE_EMBED_ORIGIN);
  assert.equal(url.hostname, 'www.youtube-nocookie.com');
  assert.equal(url.pathname, `/embed/${GOOD_ID}`);
  assert.equal(url.searchParams.get('autoplay'), '1', 'one press starts playback');
  assert.equal(decode(/title="([^"]*)"/.exec(frame![0])?.[1] ?? ''), `Video: ${TITLE}`);
  assert.match(frame![0], /allowfullscreen/i);
  assert.match(frame![0], /allow="[^"]*autoplay[^"]*"/);
  assert.match(frame![0], /referrerpolicy="strict-origin-when-cross-origin"/i, 'YouTube refuses embeds without a referrer');
});

test('the player renders nothing for an invalid id (AC4)', () => {
  for (const bad of BAD_IDS) {
    assert.equal(facade(bad), '', `facade for ${JSON.stringify(bad)}`);
    assert.equal(
      renderToStaticMarkup(React.createElement(GuideVideoFrame, { id: bad, title: TITLE })),
      '',
      `live player for ${JSON.stringify(bad)}`,
    );
  }
});

test('the compiler and the player accept and reject the same ids (AC5)', async () => {
  for (const good of GOOD_IDS) {
    assert.equal(isYouTubeId(good), true, `player accepts ${good}`);
    const g = await compileOne(guideMd(`youtube: ${good}`));
    assert.equal(g.youtube, good, `compiler accepts ${good}`);
  }
  for (const bad of BAD_IDS) {
    assert.equal(isYouTubeId(bad), false, `player rejects ${JSON.stringify(bad)}`);
    await assert.rejects(compileOne(guideMd(`youtube: ${bad}`)), `compiler rejects ${JSON.stringify(bad)}`);
  }
});

test('the player reads no window, document, clock, or randomness while rendering (hydration-safe)', () => {
  const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'components', 'GuideVideo.tsx'), 'utf8');
  // Strip comments, then look for render-time reads outside effects.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bwindow\.|\bdocument\.|Date\.now|new Date|Math\.random/);
  assert.equal(facade(), facade(), 'two renders are identical');
});
