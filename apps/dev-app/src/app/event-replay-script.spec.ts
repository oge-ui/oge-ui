import {
  EVENT_DISPATCH_CONTRACT_ID,
  REPLAYED_EVENTS,
  normalizeReplayBootstrap,
  prepareReplayScripts,
} from './event-replay-script';

const call = (regular: string[], capture: string[]) =>
  `window.__jsaction_bootstrap(document.body,"ng",${JSON.stringify(regular)},${JSON.stringify(capture)});`;

describe('event-replay script preparation', () => {
  it('normalizes every page to the same call', () => {
    const a = normalizeReplayBootstrap(call(['click', 'input'], []));
    const b = normalizeReplayBootstrap(
      call(['keydown', 'click', 'input', 'wheel'], ['focus']),
    );
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(a).toBe(
      call([...REPLAYED_EVENTS.regular], [...REPLAYED_EVENTS.capture]),
    );
  });

  it('keeps a type the list does not know (so the CSP hash changes)', () => {
    const normalized = normalizeReplayBootstrap(call(['click', 'scroll'], []));
    expect(normalized).toContain('"scroll"');
  });

  it('ignores scripts that are not the bootstrap call', () => {
    expect(normalizeReplayBootstrap('console.log(1)')).toBeNull();
  });

  it('folds the call into the contract and removes its own script', () => {
    document.body.innerHTML =
      `<!--nghm--><script type="text/javascript" id="${EVENT_DISPATCH_CONTRACT_ID}">contract();</script>` +
      `<script>${call(['click'], [])}</script>\n<app-root></app-root>`;
    const before = document.body.childNodes.length;

    prepareReplayScripts(document);

    // the child list is back to what the hydration annotations counted
    expect(document.body.childNodes.length).toBe(before - 1);
    expect(document.querySelectorAll('script')).toHaveLength(1);
    const contract = document.getElementById(EVENT_DISPATCH_CONTRACT_ID);
    expect(contract?.textContent).toBe(
      `contract();\n${normalizeReplayBootstrap(call(['click'], []))}`,
    );
    document.body.innerHTML = '';
  });

  it('leaves a page without the contract alone', () => {
    document.body.innerHTML = `<script>${call(['click'], [])}</script>`;
    prepareReplayScripts(document);
    expect(document.querySelectorAll('script')).toHaveLength(1);
    document.body.innerHTML = '';
  });
});
