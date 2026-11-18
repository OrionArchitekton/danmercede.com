import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GUIDES, NEWSLETTER } from '../constants';
import { GUIDE_JOURNEYS, GROKBOT_EXAMPLE_URL, KNOWLEDGE_GRAPH_CONTEXT, PRIORITY_GUIDE_SLUGS, guideJourney } from '../contentDiscovery';
import { guideNextStep, taggedShareUrl } from '../analytics/guideJourney';
import { guideMeta, thoughtMeta, renderThoughtSitemapEntries, SITE_ORIGIN } from '../seoMeta';
import { checkInvoice, fixtures } from '../public/examples/agent-regression/invoice-contract.mjs';
import { validateConversation, conversationPaths, selectedTranscript, toCypher } from '../public/examples/conversation-branches/branches.mjs';

test('every guide has a resolvable, different related read and valid curated project', () => {
  const known = new Set(GUIDES.map((guide) => guide.slug));
  for (const guide of GUIDES) {
    const journey = guideJourney(guide.slug);
    assert.ok(journey, `Missing editorial relationship: ${guide.slug}`);
    assert.notEqual(journey.read.slug, guide.slug);
  }
  for (const slug of Object.keys(GUIDE_JOURNEYS)) assert.ok(known.has(slug), `Stale source slug: ${slug}`);
  assert.equal(guideJourney('where-claude-code-usage-goes')!.read.slug, 'claude-code-controls-grok-bot');
  assert.equal(guideJourney('claude-code-controls-grok-bot')!.read.slug, 'where-claude-code-usage-goes');
});

test('priority metadata names the actual published figure rather than the shared site card', () => {
  const images = new Set<string>();
  for (const slug of [...PRIORITY_GUIDE_SLUGS, 'preserving-conversation-branches-neo4j', 'the-fail-closed-harness']) {
    const guide = GUIDES.find((entry) => entry.slug === slug)!;
    assert.ok(guide?.image && guide.imageAlt, `Representative image: ${slug}`);
    assert.ok(existsSync(new URL(`../public${guide.image}`, import.meta.url)));
    assert.ok(guide.body.includes(`](${guide.image}`), `The social figure is visible in ${slug}`);
    assert.equal(guideMeta(slug).ogImage, guide.image);
    images.add(guide.image);
  }
  assert.equal(images.size, 5, 'Priority pages must not all share the same image');
});

test('the graph context update changes freshness without rewriting its publication date', () => {
  const meta = thoughtMeta(KNOWLEDGE_GRAPH_CONTEXT.slug);
  assert.equal(meta.datePublished, '2026-09-30');
  assert.equal(meta.dateModified, KNOWLEDGE_GRAPH_CONTEXT.modified);
  assert.equal(meta.ogImage, KNOWLEDGE_GRAPH_CONTEXT.image);
  assert.ok(renderThoughtSitemapEntries().includes(`<loc>${SITE_ORIGIN}/thoughts/${KNOWLEDGE_GRAPH_CONTEXT.slug}</loc>\n    <lastmod>${KNOWLEDGE_GRAPH_CONTEXT.modified}</lastmod>`));
});

test('guide continuation events carry bounded destinations, never arbitrary query or fragment data', () => {
  const source = '/guides/claude-code-controls-grok-bot';
  assert.deepEqual(guideNextStep(source, '/connect?email=private%40example.com#private'), {
    guide_slug: 'claude-code-controls-grok-bot', destination_kind: 'contact', destination_path: '/connect',
  });
  assert.equal(guideNextStep(source, NEWSLETTER.href)?.destination_kind, 'newsletter');
  assert.deepEqual(guideNextStep(source, `${GROKBOT_EXAMPLE_URL}?token=private#private`), {
    guide_slug: 'claude-code-controls-grok-bot', destination_kind: 'example', destination_path: '/examples/grokbot-source',
  });
  for (const href of ['https://github.com/someone/arbitrary', GROKBOT_EXAMPLE_URL.replace('github.com', 'github.com.example.org'), 'mailto:private@example.org', `${source}#within-page`, 'javascript:alert(1)']) {
    assert.equal(guideNextStep(source, href), null, href);
  }
  assert.equal(guideNextStep('/connect', '/works/proctor/'), null);
  assert.equal(guideNextStep(source, '/works/proctor/?token=private')?.destination_path, '/works/proctor');
  assert.equal(guideNextStep(source, '/proof?scenario=proctor-drift#gate-simulator')?.destination_kind, 'proof');
});

test('sharing tags an exact article while dropping any incoming query or section identifier', () => {
  const shared = new URL(taggedShareUrl('/guides/where-claude-code-usage-goes?token=private#cost', 'linkedin'));
  assert.equal(shared.origin, SITE_ORIGIN);
  assert.equal(shared.pathname, '/guides/where-claude-code-usage-goes');
  assert.equal(shared.searchParams.get('utm_source'), 'linkedin');
  assert.equal(shared.searchParams.get('utm_content'), 'where-claude-code-usage-goes');
  assert.equal(shared.searchParams.has('token'), false);
  assert.equal(shared.hash, '');
});

test('the downloadable invoice example accepts harmless wording and blocks a same-shape incorrect total', () => {
  assert.equal(checkInvoice(fixtures.baseline).passed, true);
  assert.equal(checkInvoice(fixtures.formatting).passed, true);
  assert.equal(checkInvoice(fixtures.regressed).passed, false);
  assert.equal(checkInvoice({ ...fixtures.baseline, lineItems: [] }).passed, false);
  assert.equal(checkInvoice({ ...fixtures.baseline, totalCents: NaN }).passed, false);
  const script = new URL('../public/examples/agent-regression/invoice-contract.mjs', import.meta.url);
  for (const [fixture, code] of [['baseline', 0], ['regressed', 1], ['unknown', 2]] as const) {
    const run = spawnSync(process.execPath, [fileURLToPath(script), '--check', fixture], { encoding: 'utf8' });
    assert.equal(run.status, code, `${fixture}: ${run.stdout} ${run.stderr}`);
  }
});

const fixture = JSON.parse(readFileSync(new URL('../public/examples/conversation-branches/fixture.json', import.meta.url), 'utf8'));

test('branch selection preserves both histories and does not depend on input order', () => {
  const before = JSON.stringify(fixture);
  assert.deepEqual(conversationPaths(fixture), [['u1', 'a1', 'u2'], ['u1', 'a2', 'u3']]);
  assert.deepEqual(selectedTranscript(fixture).map((m) => m.id), ['u1', 'a2', 'u3']);
  assert.deepEqual(selectedTranscript({ ...fixture, selected_leaf: 'u2', messages: [...fixture.messages].reverse() }).map((m) => m.id), ['u1', 'a1', 'u2']);
  assert.equal(JSON.stringify(fixture), before, 'Reading a path must not rewrite stored history');
});

test('malformed graph ancestry is refused before Cypher generation', () => {
  const variants = [
    { ...fixture, messages: [...fixture.messages, fixture.messages[0]] },
    { ...fixture, messages: fixture.messages.map((m) => m.id === 'a2' ? { ...m, parent_id: 'missing' } : m) },
    { ...fixture, messages: fixture.messages.map((m) => m.id === 'u1' ? { ...m, parent_id: 'u3' } : m) },
    { ...fixture, selected_leaf: 'u1' },
  ];
  for (const invalid of variants) {
    assert.throws(() => validateConversation(invalid));
    assert.throws(() => toCypher(invalid));
  }
  const cypher = toCypher(fixture);
  assert.match(cypher, /\(m\.conversation_id, m\.id\) IS UNIQUE/);
  assert.match(cypher, /REPLIES_TO/);
  assert.doesNotMatch(cypher, /\bDETACH DELETE\b|\bDELETE\b/);
});
