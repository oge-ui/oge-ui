import { act, render } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { OgeTabPanel } from './tab-panel';
import type { OgeTabDefinition } from './tabs-types';

const TABS: OgeTabDefinition[] = [
  { key: 'a', text: 'Alpha', content: <p>Alpha body</p> },
  { key: 'b', text: 'Beta', content: <p>Beta body</p> },
];

const ids = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll('[id]')).map((element) => element.id);

describe('<OgeTabPanel> ids (SSR / hydration)', () => {
  it('hydrates server markup without an id mismatch', async () => {
    const tree = (
      <div>
        <OgeTabPanel tabs={TABS} />
        <OgeTabPanel tabs={TABS} />
      </div>
    );
    const html = renderToString(tree);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    const serverIds = ids(container);
    expect(serverIds.length).toBeGreaterThan(0);

    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // a hydration mismatch is reported here — the assertion below fails on it
    });
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(ids(container)).toEqual(serverIds);
    consoleError.mockRestore();
    act(() => root?.unmount());
    container.remove();
  });

  it('gives each instance its own, selector-safe ids', () => {
    const { container } = render(
      <div>
        <OgeTabPanel tabs={TABS} />
        <OgeTabPanel tabs={TABS} />
      </div>,
    );
    const all = ids(container);
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
