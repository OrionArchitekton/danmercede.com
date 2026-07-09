import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERSON_ID, WEBSITE_ID, SITE_ORIGIN } from '../seoMeta';

// O7 — spoke -> hub identity guardrail (hub side).
//
// The hub danmercede.com is the single canonical entity authority for the Dan
// Mercede footprint: it owns the one `Person` node (`#person`); every spoke
// (danmercede.info / .online / danielmercede.com / .info) backlinks to it via
// sameAs and emits NO local Person node. This test locks the hub end of that
// contract so a future edit cannot silently fork the canonical identity.
//
// Full contract: docs/identity-contract.md.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

/** Extract every application/ld+json block as parsed objects. */
function jsonLdBlocks(): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]));
  }
  return blocks;
}

/** Flatten @graph wrappers into a flat node list. */
function allNodes(): Array<Record<string, unknown>> {
  const nodes: Array<Record<string, unknown>> = [];
  for (const b of jsonLdBlocks()) {
    const obj = b as Record<string, unknown>;
    if (Array.isArray(obj['@graph'])) {
      nodes.push(...(obj['@graph'] as Array<Record<string, unknown>>));
    } else {
      nodes.push(obj);
    }
  }
  return nodes;
}

test('hub declares exactly one Person node and it is the canonical #person', () => {
  const persons = allNodes().filter((n) => n['@type'] === 'Person');
  assert.equal(persons.length, 1, 'the hub must declare exactly one Person node');
  assert.equal(persons[0]['@id'], PERSON_ID, `the Person @id must be ${PERSON_ID}`);
});

test('hub declares exactly one WebSite node and it is the canonical site', () => {
  const websites = allNodes().filter((n) => n['@type'] === 'WebSite');
  assert.equal(websites.length, 1, 'the hub must declare exactly one WebSite node');
  assert.equal(websites[0]['@id'], WEBSITE_ID, `the WebSite @id must be ${WEBSITE_ID}`);
  assert.equal(
    String(websites[0].url).replace(/\/+$/, ''),
    SITE_ORIGIN,
    `the canonical WebSite url must equal SITE_ORIGIN (${SITE_ORIGIN})`,
  );
});

test('PERSON_ID / WEBSITE_ID are anchored to the canonical www host', () => {
  assert.equal(PERSON_ID, `${SITE_ORIGIN}/#person`);
  assert.equal(WEBSITE_ID, `${SITE_ORIGIN}/#website`);
  assert.equal(SITE_ORIGIN, 'https://www.danmercede.com');
});

test('canonical Person.sameAs covers all four spokes plus GitHub and the live dev.to syndication spoke', () => {
  const person = allNodes().find((n) => n['@type'] === 'Person');
  assert.ok(person, 'Person node must be declared');
  const sameAs = ((person.sameAs as string[]) || []).map((u) => u.replace(/\/+$/, ''));
  const required = [
    'https://www.danielmercede.com',
    'https://www.danmercede.info',
    'https://www.danielmercede.info',
    'https://www.danmercede.online',
    'https://github.com/OrionArchitekton',
    // A4 — the dev.to author profile we actually publish to via /syndicate
    // (live: dev.to user 3923648 "Dan Mercede", github OrionArchitekton). Locking
    // it here keeps the Person emitter and this contract in lockstep so the live
    // syndication spoke cannot silently drop out of the canonical identity graph.
    // Hashnode is DEFERRED (built but Pro-gated, not live-publishing per
    // /syndicate); Wikipedia/Wikidata/Crunchbase are REJECTED (notability
    // mismatch — a thin self-authored entity backfires).
    'https://dev.to/danmercede',
  ];
  for (const r of required) {
    assert.ok(sameAs.includes(r), `Person.sameAs must include ${r}`);
  }
});

test('per-route ProfilePage/Article nodes reference the canonical #person, never a new Person', () => {
  // The homepage ROUTE_JSONLD block carries a ProfilePage whose mainEntity is
  // the canonical person; assert it does not introduce a second Person @id.
  const nodes = allNodes();
  const profilePages = nodes.filter((n) => n['@type'] === 'ProfilePage');
  for (const pp of profilePages) {
    const mainEntity = pp.mainEntity as { '@id'?: string } | undefined;
    assert.equal(mainEntity?.['@id'], PERSON_ID, 'ProfilePage.mainEntity must be the canonical #person');
  }
  // Still exactly one Person across the whole document.
  assert.equal(nodes.filter((n) => n['@type'] === 'Person').length, 1);
});

test('the Orion Intelligence Agency affiliation carries OIA’s canonical Organization @id so the graphs merge', () => {
  // F3 — cross-entity graph merge (spoke side, danmercede.com -> OIA).
  //
  // OIA emits its own Organization node under a stable @id
  // (`${SITE_ORIGIN}/#organization` in oia-web/web/lib/structuredData.ts, where
  // SITE_ORIGIN defaults to https://www.orionintelligenceagency.com). When the
  // hub Person references OIA by that SAME @id here, an answer engine merges the
  // two descriptions into one entity instead of treating "Orion Intelligence
  // Agency" on danmercede.com as a separate, thinner org. A bare name+url
  // affiliation (no @id) does not merge. Lock the @id so a future edit cannot
  // silently re-fragment the cluster.
  const OIA_ORG_ID = 'https://www.orionintelligenceagency.com/#organization';
  const person = allNodes().find((n) => n['@type'] === 'Person');
  assert.ok(person, 'Person node must be declared');
  const affiliations = (person.affiliation as Array<Record<string, unknown>>) || [];
  const oia = affiliations.find((a) => a.name === 'Orion Intelligence Agency');
  assert.ok(oia, 'the Person must declare an Orion Intelligence Agency affiliation');
  assert.equal(
    oia['@id'],
    OIA_ORG_ID,
    `the OIA affiliation @id must equal OIA’s canonical Organization @id (${OIA_ORG_ID})`,
  );
});
