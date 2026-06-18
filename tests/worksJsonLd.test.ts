import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRouteJsonLd, ROUTE_META, PERSON_ID } from '../seoMeta';

// /works Works-surface identity guardrail.
//
// The hub-wide identityCanonical.test.ts reads the homepage index.html only and
// never sees the per-route /works JSON-LD (it is injected into
// dist/works/index.html at build time). This test locks the /works
// CollectionPage shape directly: it must backref the canonical #person and add
// NO second Person — and it also guards the W3 silent-no-op (extending
// RouteMeta.schemaType without a renderRouteJsonLd branch would emit only a
// BreadcrumbList, which this test would catch as a missing CollectionPage).

function graphFor(path: string): Array<Record<string, unknown>> {
  const block = renderRouteJsonLd(path, ROUTE_META[path]);
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(block);
  assert.ok(m, 'route JSON-LD block must render');
  const doc = JSON.parse(m![1]) as { '@graph': Array<Record<string, unknown>> };
  return doc['@graph'];
}

test('/works emits exactly one CollectionPage whose mainEntity is the canonical #person', () => {
  const nodes = graphFor('/works');
  const collection = nodes.filter((n) => n['@type'] === 'CollectionPage');
  assert.equal(collection.length, 1, 'the /works route must emit exactly one CollectionPage node');
  const mainEntity = collection[0].mainEntity as { '@id'?: string } | undefined;
  assert.equal(mainEntity?.['@id'], PERSON_ID, 'CollectionPage.mainEntity must be the canonical #person');
});

test('/works introduces NO second Person node', () => {
  const nodes = graphFor('/works');
  assert.equal(
    nodes.filter((n) => n['@type'] === 'Person').length,
    0,
    'the /works route must add zero Person nodes (the single canonical Person lives in index.html)',
  );
});

test('every /works SoftwareSourceCode item backrefs #person via creator and carries a codeRepository', () => {
  const nodes = graphFor('/works');
  const collection = nodes.find((n) => n['@type'] === 'CollectionPage') as Record<string, unknown>;
  const items = (collection.hasPart as Array<Record<string, unknown>>) || [];
  assert.ok(items.length >= 1, 'the Works collection must list at least one work item');
  for (const it of items) {
    assert.equal(it['@type'], 'SoftwareSourceCode', 'each work item must be a SoftwareSourceCode');
    assert.equal(
      (it.creator as { '@id'?: string })?.['@id'],
      PERSON_ID,
      'each work item.creator must reference the canonical #person',
    );
    assert.ok(
      typeof it.codeRepository === 'string' && (it.codeRepository as string).length > 0,
      'each work item must carry a codeRepository URL',
    );
  }
});
