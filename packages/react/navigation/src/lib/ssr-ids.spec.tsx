import { act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { OgeDrawer } from './drawer';
import { OgeStepper } from './stepper';

/**
 * ARIA ids come from `useId()` (ARCHITECTURE → SSR-safe ids): the server and
 * the client must compute the same value, or hydration mismatches and
 * `aria-controls` points at nothing. A module counter fails this test the
 * moment a second render happens in the same process.
 */
const ids = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll('[id]')).map((element) => element.id);

async function hydrateMatches(tree: ReactNode): Promise<string[]> {
  // render once first, so a module-level counter would already have moved on
  renderToString(tree);
  const html = renderToString(tree);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const serverIds = ids(container);
  const onRecoverableError = vi.fn();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
    // a hydration mismatch is reported here — asserted below
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
  return serverIds;
}

describe('navigation ids (SSR / hydration)', () => {
  it('OgeStepper hydrates with matching, selector-safe ids', async () => {
    const serverIds = await hydrateMatches(
      <OgeStepper
        steps={[
          { key: 'a', label: 'One' },
          { key: 'b', label: 'Two' },
        ]}
      />,
    );
    expect(serverIds.length).toBeGreaterThan(0);
    for (const id of serverIds) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('OgeDrawer hydrates with matching, selector-safe ids', async () => {
    const serverIds = await hydrateMatches(
      <OgeDrawer mode="push" opened>
        <p>content</p>
      </OgeDrawer>,
    );
    for (const id of serverIds) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
