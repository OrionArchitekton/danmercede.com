import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Exercise the public deep-link promise: static /proof markup must hydrate at a
// scenario URL, and changing a selection must survive browser history. No network
// or subresources are loaded by jsdom. Compare scalar values, never DOM objects.
const entry = '/proof?scenario=proctor-drift&utm_source=linkedin&token=secret#gate-simulator';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: `https://www.danmercede.com${entry}`,
});
const globals = globalThis as Record<string, unknown>;
globals.window = dom.window;
globals.document = dom.window.document;
globals.IS_REACT_ACT_ENVIRONMENT = true;
if (!('navigator' in globalThis)) {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator, configurable: true, writable: true,
  });
}

const React = await import('react');
const { renderToString } = await import('react-dom/server');
const { hydrateRoot } = await import('react-dom/client');
const { StaticRouter, MemoryRouter, useNavigate, useLocation } = await import('react-router-dom');
const { default: GateSimulator } = await import('../components/GateSimulator');

test('guide scenario links hydrate, preserve campaign tags, and follow back/forward without duplicate active entries', async () => {
  let navigate!: ReturnType<typeof useNavigate>;
  let location!: ReturnType<typeof useLocation>;
  function RouteProbe() {
    navigate = useNavigate();
    location = useLocation();
    return null;
  }
  function Harness() {
    return React.createElement(React.Fragment, null,
      React.createElement(RouteProbe), React.createElement(GateSimulator));
  }
  const serverHtml = (url: string) => renderToString(
    React.createElement(StaticRouter, { location: url }, React.createElement(Harness)),
  );
  const initialHtml = serverHtml('/proof');
  assert.equal(serverHtml(entry), initialHtml, 'query selection must not change the initial server render');

  const container = dom.window.document.getElementById('root') as HTMLElement;
  container.innerHTML = initialHtml;
  const hydrationErrors: string[] = [];
  let root: ReturnType<typeof hydrateRoot> | undefined;
  const receipt = () => {
    const text = [...container.querySelectorAll('pre code')].at(-1)?.textContent;
    assert.equal(typeof text, 'string', 'the simulator must show its JSON receipt');
    return JSON.parse(text!) as Record<string, unknown>;
  };
  const press = async (label: string) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
    assert.equal(Boolean(button), true, `missing simulator control: ${label}`);
    await React.act(async () => { button!.click(); });
  };

  try {
    await React.act(async () => {
      root = hydrateRoot(container,
        React.createElement(MemoryRouter, { initialEntries: [entry] }, React.createElement(Harness)),
        { onRecoverableError: (error) => hydrationErrors.push(String(error)) },
      );
    });
    assert.deepEqual(hydrationErrors, [], 'the deep link must not discard the prerendered DOM');
    assert.equal(receipt().fixture, 'inv-001');
    assert.equal(receipt().decision, 'PAUSE_FOR_APPROVAL');
    assert.equal(receipt().simulation, true);

    const gtagCalls: unknown[][] = [];
    (dom.window as unknown as { gtag?: (...args: unknown[]) => void }).gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
    };

    await press('Clean run');
    assert.equal(receipt().decision, 'ALLOW');
    assert.equal(new URLSearchParams(location.search).get('utm_source'), 'linkedin');
    assert.equal(new URLSearchParams(location.search).get('scenario'), 'proctor-clean');
    assert.equal(location.hash, '#gate-simulator');
    assert.deepEqual(gtagCalls, [
      [
        'event',
        'gate_simulator_run',
        {
          scenario: 'proctor',
          outcome_mode: 'clean',
          page_location: 'https://www.danmercede.com/proof?utm_source=linkedin',
        },
      ],
    ]);

    const cleanKey = location.key;
    await press('Clean run');
    assert.equal(location.key, cleanKey, 'an already-selected mode must not add an identical history entry');
    await press('Proctor');
    assert.equal(location.key, cleanKey, 'an already-selected tool must not add an identical history entry');
    assert.equal(gtagCalls.length, 1, 'duplicate selection must not emit duplicate gate_simulator_run events');

    await press('failclosed');
    assert.deepEqual(gtagCalls[1], [
      'event',
      'gate_simulator_run',
      {
        scenario: 'failclosed',
        outcome_mode: 'clean',
        page_location: 'https://www.danmercede.com/proof?utm_source=linkedin',
      },
    ]);

    // Rapid synchronous repeat selection before router location state settles must emit once.
    const countBeforeRapid = gtagCalls.length;
    const rapidButton = [...container.querySelectorAll('button')].find((item) => item.textContent === 'Proctor');
    assert.equal(Boolean(rapidButton), true);
    await React.act(async () => {
      rapidButton!.click();
      rapidButton!.click();
    });
    assert.equal(gtagCalls.length, countBeforeRapid + 1, 'rapid double-click must emit only one gate_simulator_run');

    // Non-canonical scenario URL matching the default failclosed-drift must not emit when re-selecting failclosed.
    await React.act(async () => { navigate('/proof?scenario=unknown'); });
    const countBeforeUnchanged = gtagCalls.length;
    await press('failclosed');
    assert.equal(gtagCalls.length, countBeforeUnchanged, 'unchanged selection on non-canonical URL must not count as a run');
    delete (dom.window as unknown as { gtag?: unknown }).gtag;

    // Reset back to proctor-clean -> navigate back to verify proctor-drift -> forward to proctor-clean.
    await React.act(async () => { navigate(entry); });
    await press('Clean run');
    await React.act(async () => { navigate(-1); });
    assert.equal(receipt().decision, 'PAUSE_FOR_APPROVAL', 'back restores the linked failure scenario');
    await React.act(async () => { navigate(1); });
    assert.equal(receipt().decision, 'ALLOW', 'forward restores the chosen clean scenario');

    const cases = [
      ['sandbox-drift', 'FAIL_CLOSED'], ['sandbox-clean', 'ALLOW'],
      ['failclosed-drift', 'FAIL_CLOSED'], ['failclosed-clean', 'ALLOW'],
      ['proctor-drift', 'PAUSE_FOR_APPROVAL'], ['proctor-clean', 'ALLOW'],
    ] as const;
    for (const [selection, decision] of cases) {
      await React.act(async () => { navigate(`/proof?scenario=${selection}`); });
      assert.equal(receipt().decision, decision, `in-app URL selection: ${selection}`);
    }

    await React.act(async () => { navigate('/proof?scenario=unknown'); });
    assert.equal(receipt().gate, 'merge-admission', 'invalid selection returns to the documented default');
    assert.equal(receipt().decision, 'FAIL_CLOSED');
    assert.deepEqual(hydrationErrors, []);
  } finally {
    if (root) await React.act(async () => { root!.unmount(); });
    dom.window.close();
  }
});
