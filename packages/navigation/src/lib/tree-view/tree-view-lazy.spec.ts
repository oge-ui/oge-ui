import { render, settle, type Node } from './tree-view-test-host';

/** Only the roots are supplied up front; `hasItems` advertises the rest. */
const ROOTS: Node[] = [
  { id: 1, parentId: null, name: 'Documents', hasItems: true },
  { id: 4, parentId: null, name: 'Photos', hasItems: false },
];

describe('OgeTreeView lazy children', () => {
  it('shows an expand toggle from the hasItems hint alone', async () => {
    const { rowFor } = await render((h) => {
      h.items.set(ROOTS);
      h.loadChildren.set(() => Promise.resolve([]));
    });
    expect(rowFor('Documents')?.getAttribute('aria-expanded')).toBe('false');
    expect(rowFor('Photos')?.getAttribute('aria-expanded')).toBeNull();
  });

  it('renders a loading placeholder, then the fetched children', async () => {
    let resolve!: (rows: Node[]) => void;
    const { fixture, el, rowFor, labels } = await render((h) => {
      h.items.set(ROOTS);
      h.loadChildren.set(() => new Promise<Node[]>((r) => (resolve = r)));
    });
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(
      el.querySelector('.oge-tree-view-item-filler')?.textContent,
    ).toContain('Loading…');

    resolve([{ id: 2, parentId: 1, name: 'Reports' }]);
    await settle(fixture);
    expect(el.querySelector('.oge-tree-view-item-filler')).toBeNull();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
  });

  it('fetches once per node across collapse and re-expand', async () => {
    let calls = 0;
    const { fixture, rowFor } = await render((h) => {
      h.items.set(ROOTS);
      h.loadChildren.set(() => {
        calls++;
        return Promise.resolve([{ id: 2, parentId: 1, name: 'Reports' }]);
      });
    });
    rowFor('Documents')?.click();
    await settle(fixture);
    rowFor('Documents')?.click();
    await settle(fixture);
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(calls).toBe(1);
  });

  it('surfaces the real error on rejection', async () => {
    const failure = new Error('offline');
    const errors: unknown[] = [];
    const { fixture, el, host, rowFor } = await render((h) => {
      h.items.set(ROOTS);
      h.loadChildren.set(() => Promise.reject(failure));
    });
    host.tree().childrenLoadFailed.subscribe((e) => errors.push(e.error));
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(errors).toEqual([failure]);
    expect(
      el.querySelector('.oge-tree-view-item-filler')?.textContent,
    ).toContain('Could not load these items.');
  });

  it('treats a synchronous throw as a failure', async () => {
    const errors: unknown[] = [];
    const { fixture, host, el, rowFor } = await render((h) => {
      h.items.set(ROOTS);
      h.loadChildren.set(() => {
        throw new Error('boom');
      });
    });
    host.tree().childrenLoadFailed.subscribe((e) => errors.push(e.error));
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(errors).toHaveLength(1);
    expect(el.querySelector('.oge-tree-view-item-filler')).not.toBeNull();
  });

  it('indexes fetched children so selection cascades reach them', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.items.set(ROOTS);
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
      h.loadChildren.set(() =>
        Promise.resolve([
          { id: 2, parentId: 1, name: 'Reports' },
          { id: 3, parentId: 1, name: 'Notes' },
        ]),
      );
    });
    rowFor('Documents')?.click();
    await settle(fixture);

    rowFor('Documents')
      ?.querySelector<HTMLElement>('.oge-tree-view-check')
      ?.click();
    await settle(fixture);
    expect([...host.selectedKeys()].sort()).toEqual([1, 2, 3]);
  });

  it('awaits the fetch in the expand() promise', async () => {
    const { host } = await render((h) => {
      h.items.set(ROOTS);
      h.loadChildren.set(() =>
        Promise.resolve([{ id: 2, parentId: 1, name: 'Reports' }]),
      );
    });
    await expect(host.tree().expand(1)).resolves.toBe(true);
  });
});
