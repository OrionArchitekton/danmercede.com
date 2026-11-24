import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKS, BELIEFS } from '../constants';
import { THOUGHTS } from '../constants.generated';
import { GUIDES } from '../constants.guides.generated';
import {
  CREATIVE_BRIEF_SCHEMA,
  CREATIVE_KIT_VERSION,
  VOICE_PROFILE_ID,
  guideToCreativeBrief,
  scanDanMercedeCopy,
  thoughtToCreativeBrief,
  validateCreativeBrief,
} from '../scripts/creativeBrandCheck';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('.orion-creative.yaml pins kit 0.2.0 and scripts/_orion_creative_adapter.py matches kit', () => {
  const marker = fs.readFileSync(path.join(ROOT, '.orion-creative.yaml'), 'utf8');
  assert.match(marker, /kit_version:\s*["']0\.2\.0["']/);
  assert.match(marker, /brand_id:\s*dan_mercede/);
  assert.match(marker, /policy_pack:\s*technical_founder/);
  assert.match(marker, /brief_schema:\s*CreativeBrief\.v1/);

  const adapter = fs.readFileSync(path.join(ROOT, 'scripts', '_orion_creative_adapter.py'), 'utf8');
  assert.match(adapter, /KIT_VERSION\s*=\s*"0\.2\.0"/);
  assert.match(adapter, /ADAPTER_SCHEMA\s*=\s*"orion-creative-adapter\/v1"/);
});

test('all shipped GUIDES, THOUGHTS, and WORKS pass Dan Mercede voice + CreativeBrief.v1 checks', () => {
  assert.ok(GUIDES.length > 0, 'GUIDES corpus must be non-empty');
  assert.ok(THOUGHTS.length > 0, 'THOUGHTS corpus must be non-empty');
  assert.ok(WORKS.length > 0, 'WORKS corpus must be non-empty');
  assert.ok(BELIEFS.length > 0, 'BELIEFS corpus must be non-empty');

  for (const guide of GUIDES) {
    const brief = guideToCreativeBrief(guide);
    const briefCheck = validateCreativeBrief(brief);
    assert.equal(
      briefCheck.ok,
      true,
      `guide ${guide.slug} failed CreativeBrief.v1 check: ${briefCheck.errors.join('; ')}`,
    );
    const bodyScan = scanDanMercedeCopy(guide.body);
    assert.equal(
      bodyScan.ok,
      true,
      `guide ${guide.slug} body failed Dan Mercede voice scan: ${JSON.stringify(bodyScan.hardHits)}`,
    );
  }

  for (const thought of THOUGHTS) {
    const brief = thoughtToCreativeBrief(thought);
    const briefCheck = validateCreativeBrief(brief);
    assert.equal(
      briefCheck.ok,
      true,
      `thought ${thought.slug} failed CreativeBrief.v1 check: ${briefCheck.errors.join('; ')}`,
    );
    const bodyScan = scanDanMercedeCopy(thought.body);
    assert.equal(
      bodyScan.ok,
      true,
      `thought ${thought.slug} body failed Dan Mercede voice scan: ${JSON.stringify(bodyScan.hardHits)}`,
    );
  }

  for (const work of WORKS) {
    const scan = scanDanMercedeCopy(`${work.title}\n${work.description}`);
    assert.equal(
      scan.ok,
      true,
      `work ${work.slug} failed Dan Mercede voice scan: ${JSON.stringify(scan.hardHits)}`,
    );
  }

  for (const belief of BELIEFS) {
    const scan = scanDanMercedeCopy(`${belief.statement}\n${belief.detail}`);
    assert.equal(
      scan.ok,
      true,
      `belief failed Dan Mercede voice scan: ${JSON.stringify(scan.hardHits)}`,
    );
  }
});

test('NON-VACUITY: banned long dashes, AI-slop, Dan Mercede taboos, plea CTAs, and incomplete briefs fail closed', () => {
  const emDash = String.fromCodePoint(0x2014);
  const badSamples: Array<{ name: string; text: string; expectedRule: string }> = [
    {
      name: 'banned_em_dash',
      text: `CI passed on the wrong checkout ${emDash} check GIT_WORK_TREE.`,
      expectedRule: 'banned_dash',
    },
    {
      name: 'ai_slop_delve',
      text: 'Let us delve into the multifaceted tapestry of governed workflows.',
      expectedRule: 'ai_slop_lexeme',
    },
    {
      name: 'dan_mercede_taboo_workflows',
      text: 'Orion leverages autonomous workflows for seamless enterprise alignment.',
      expectedRule: 'dan_mercede_taboo',
    },
    {
      name: 'dan_mercede_taboo_paraphrase',
      text: 'The failure traced back to a redirecting setting in the version control system.',
      expectedRule: 'dan_mercede_taboo',
    },
    {
      name: 'low_status_plea_cta',
      text: 'Make sure you watch until the end and share this architecture guide.',
      expectedRule: 'meta_announcement',
    },
  ];

  for (const sample of badSamples) {
    const res = scanDanMercedeCopy(sample.text);
    assert.equal(res.ok, false, `${sample.name} must fail scanDanMercedeCopy`);
    assert.ok(
      res.hardHits.some((h) => h.rule === sample.expectedRule),
      `${sample.name} missing expected rule ${sample.expectedRule}: ${JSON.stringify(res.hardHits)}`,
    );
  }

  const invalidBrief = validateCreativeBrief({
    schema_version: CREATIVE_BRIEF_SCHEMA,
    brief_id: 'bad-brief',
    brand_id: VOICE_PROFILE_ID,
    content_format: 'guide',
    title: 'CI failure from leaked GIT_WORK_TREE',
    claim: 'Short.',
    implication: '',
    target_audience: 'Engineers',
  });
  assert.equal(invalidBrief.ok, false);
  assert.ok(invalidBrief.errors.some((e) => e.includes('implication')));
  assert.ok(invalidBrief.errors.some((e) => e.includes('claim is too short')));
  assert.equal(CREATIVE_KIT_VERSION, '0.2.0');
});
