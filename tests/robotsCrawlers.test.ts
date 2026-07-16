import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Crawler-access citation-eligibility (aeo-parity arc; benchmark
// orion-research-registers#65/#66, TIER 1 finding T1-9). Anthropic runs three
// distinct crawlers: ClaudeBot (TRAINING, confers NO AI-answer citation
// eligibility), Claude-User (user-directed retrieval) and Claude-SearchBot
// (search indexing), the two that DO. Claude-Web is deprecated. The served
// robots.txt must name the two retrieval bots and must not name the dead one,
// or this surface looks allowlisted while having zero Claude citation
// eligibility. Tokens verified against Anthropic support.claude.com article
// 8896518 and shipped first on oia-web#77.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const robots = readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
const uaLine = (name: string) =>
  new RegExp(`^User-agent:\\s*${name}\\s*$`, 'm');

test('robots.txt names Claude-User (user-directed retrieval)', () => {
  assert.match(robots, uaLine('Claude-User'));
});

test('robots.txt names Claude-SearchBot (search indexing)', () => {
  assert.match(robots, uaLine('Claude-SearchBot'));
});

test('robots.txt does NOT name the deprecated Claude-Web agent', () => {
  assert.doesNotMatch(robots, uaLine('Claude-Web'));
});

test('robots.txt retains the already-correct answer-engine + training allowlist', () => {
  for (const bot of [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'Perplexity-User',
    'ClaudeBot',
    'Google-Extended',
  ]) {
    assert.match(robots, uaLine(bot), `missing User-agent: ${bot}`);
  }
});
