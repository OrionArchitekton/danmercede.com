import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kitDir = path.join(root, 'brand-kit');

const REQUIRED_FILES = [
  'DESIGN.md',
  'tokens/brand.tokens.json',
  'positioning.yaml',
  'voice-profile.yaml',
  'claims-allowlist.yaml',
  'cta-library.yaml',
  'platform-policy.yaml',
  'assets/logos.manifest.json'
];

function sha256File(absPath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

test('danmercede-com brand-kit contains all standardized Layer-B contract files with zero long dashes', () => {
  for (const rel of REQUIRED_FILES) {
    const full = path.join(kitDir, rel);
    assert.ok(fs.existsSync(full), `missing required brand-kit file: brand-kit/${rel}`);
    const content = fs.readFileSync(full, 'utf8');
    assert.ok(content.trim().length > 0, `empty brand-kit file: brand-kit/${rel}`);
    assert.doesNotMatch(content, /[\u2013\u2014\u2015]/, `banned long dash in brand-kit/${rel}`);
  }
});

test('danmercede-com brand-kit YAML, W3C DTCG tokens, and SHA-256 asset manifest validate cleanly', () => {
  const tokens = JSON.parse(fs.readFileSync(path.join(kitDir, 'tokens/brand.tokens.json'), 'utf8'));
  assert.equal(tokens.$extensions?.['com.orion.brand']?.id, 'danmercede-com');
  assert.equal(tokens.color?.accent?.$value?.toUpperCase(), '#E68249');
  assert.equal(tokens.color?.accentFg?.$value?.toUpperCase(), '#020B29');

  const positioning = yaml.load(fs.readFileSync(path.join(kitDir, 'positioning.yaml'), 'utf8')) as Record<string, any>;
  const voice = yaml.load(fs.readFileSync(path.join(kitDir, 'voice-profile.yaml'), 'utf8')) as Record<string, any>;
  const claims = yaml.load(fs.readFileSync(path.join(kitDir, 'claims-allowlist.yaml'), 'utf8')) as Record<string, any>;
  const ctas = yaml.load(fs.readFileSync(path.join(kitDir, 'cta-library.yaml'), 'utf8')) as Record<string, any>;
  const policy = yaml.load(fs.readFileSync(path.join(kitDir, 'platform-policy.yaml'), 'utf8')) as Record<string, any>;

  assert.equal(voice.schema_version, 'VoiceProfile.v1');
  assert.equal(voice.ban_long_dashes, true);
  assert.ok(Array.isArray(positioning.forbidden_cross_brand_terms) && positioning.forbidden_cross_brand_terms.length >= 4);
  assert.ok(Array.isArray(claims.allowed_claims) && claims.allowed_claims.length >= 3);
  assert.ok(Array.isArray(ctas.ctas) && ctas.ctas.length >= 2);
  assert.equal(policy.browser_isolation?.profile_id, 'dan');

  const manifest = JSON.parse(fs.readFileSync(path.join(kitDir, 'assets/logos.manifest.json'), 'utf8'));
  assert.equal(manifest.vault_sync_gate, 'HUMAN_REQUIRED (Checkpoint G1)');
  assert.equal(manifest.voice_profile_sha256, sha256File(path.join(kitDir, 'voice-profile.yaml')));
  assert.equal(manifest.dtcg_pack_sha256, sha256File(path.join(kitDir, 'tokens/brand.tokens.json')));
  assert.ok(Array.isArray(manifest.assets) && manifest.assets.length >= 7);

  const requiredPresetRoles = new Set([
    'mark_primary',
    'avatar_square',
    'banner_youtube',
    'banner_linkedin',
    'banner_x',
    'banner_facebook',
    'banner_og'
  ]);

  for (const item of manifest.assets) {
    assert.equal(item.path.includes('..'), false, `traversal forbidden in ${item.path}`);
    const assetPath = path.join(kitDir, 'assets', item.path);
    assert.ok(fs.existsSync(assetPath), `missing manifest asset: ${item.path}`);
    assert.equal(fs.lstatSync(assetPath).isSymbolicLink(), false, `symlink forbidden: ${item.path}`);
    assert.equal(sha256File(assetPath), item.sha256, `SHA-256 mismatch on ${item.path}`);
    requiredPresetRoles.delete(item.role);
    if (assetPath.endsWith('.svg')) {
      const svg = fs.readFileSync(assetPath, 'utf8');
      assert.doesNotMatch(svg, /[\u2013\u2014\u2015]/, `long dash in ${item.path}`);
      assert.doesNotMatch(svg, /\bArial\b/i, `Arial font in ${item.path}`);
      const vbMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
      assert.ok(vbMatch, `missing viewBox on ${item.path}`);
      const vw = Number(vbMatch[1]);
      const vh = Number(vbMatch[2]);
      assert.deepEqual([item.width, item.height], [vw, vh], `viewBox mismatch on ${item.path}`);
      assert.ok(item.safe_zone.x >= 0 && item.safe_zone.y >= 0, `negative safe_zone origin on ${item.path}`);
      assert.ok(item.safe_zone.x + item.safe_zone.width <= vw, `safe_zone width exceeds viewBox on ${item.path}`);
      assert.ok(item.safe_zone.y + item.safe_zone.height <= vh, `safe_zone height exceeds viewBox on ${item.path}`);
    }
  }
  assert.deepEqual([...requiredPresetRoles], [], `missing required social preset roles: ${[...requiredPresetRoles].join(', ')}`);
});
