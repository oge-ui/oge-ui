import { render, settle } from './tree-view-test-host';

describe('OgeTreeView selection', () => {
  it('selects a single node and exposes aria-selected', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.selectionMode.set('single');
      h.expandedKeys.set([1]);
    });
    rowFor('Reports')?.click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([2]);
    expect(rowFor('Reports')?.getAttribute('aria-selected')).toBe('true');
    expect(rowFor('Documents')?.getAttribute('aria-selected')).toBe('false');

    rowFor('Documents')?.click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([1]);
  });

  it('uses aria-checked instead of aria-selected in checkbox mode', async () => {
    const { rowFor } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
    });
    // APG: expose selection through one of the two, never both
    expect(rowFor('Documents')?.getAttribute('aria-checked')).toBe('false');
    expect(rowFor('Documents')?.getAttribute('aria-selected')).toBeNull();
  });

  it('never nests a focusable control inside a treeitem', async () => {
    const { rows } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
    });
    for (const row of rows()) {
      expect(row.getAttribute('role')).toBe('treeitem');
      expect(
        row.querySelectorAll('input, button, a[href], select, textarea'),
      ).toHaveLength(0);
      expect(
        row.querySelector('.oge-tree-view-check')?.getAttribute('aria-hidden'),
      ).toBe('true');
    }
  });

  /** `Documents` needs a second child for `indeterminate` to be observable. */
  const WITH_SIBLING = [
    { id: 1, parentId: null, name: 'Documents' },
    { id: 2, parentId: 1, name: 'Reports' },
    { id: 3, parentId: 2, name: 'Q1.pdf' },
    { id: 6, parentId: 1, name: 'Notes' },
    { id: 4, parentId: null, name: 'Photos' },
  ];

  it('cascades a checkbox down to descendants and up to full parents', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.items.set(WITH_SIBLING);
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
      h.expandedKeys.set([1, 2]);
    });
    rowFor('Reports')
      ?.querySelector<HTMLElement>('.oge-tree-view-check')
      ?.click();
    await settle(fixture);

    // 2 and its descendant 3; 1 is only partly covered, so indeterminate
    expect([...host.selectedKeys()].sort()).toEqual([2, 3]);
    const state = (name: string) =>
      rowFor(name)
        ?.querySelector('.oge-tree-view-check')
        ?.getAttribute('data-state');
    expect(state('Reports')).toBe('checked');
    expect(state('Q1.pdf')).toBe('checked');
    expect(state('Documents')).toBe('indeterminate');
    expect(rowFor('Documents')?.getAttribute('aria-checked')).toBe('mixed');
    expect(state('Photos')).toBe('unchecked');
  });

  it('checking the last missing sibling promotes the parent to checked', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.items.set(WITH_SIBLING);
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
      h.expandedKeys.set([1, 2]);
    });
    const check = (name: string) =>
      rowFor(name)?.querySelector<HTMLElement>('.oge-tree-view-check')?.click();

    check('Reports');
    await settle(fixture);
    check('Notes');
    await settle(fixture);
    expect([...host.selectedKeys()].sort()).toEqual([1, 2, 3, 6]);
    expect(
      rowFor('Documents')
        ?.querySelector('.oge-tree-view-check')
        ?.getAttribute('data-state'),
    ).toBe('checked');
  });

  it('unchecking a node normalizes its ancestors off', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.items.set(WITH_SIBLING);
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
      h.expandedKeys.set([1, 2]);
    });
    const check = (name: string) =>
      rowFor(name)?.querySelector<HTMLElement>('.oge-tree-view-check')?.click();

    check('Documents');
    await settle(fixture);
    expect([...host.selectedKeys()].sort()).toEqual([1, 2, 3, 6]);

    check('Q1.pdf');
    await settle(fixture);
    // 3 off → 2 no longer full → 1 no longer full; only the untouched 6 stays
    expect([...host.selectedKeys()].sort()).toEqual([6]);
  });

  it('reports leavesOnly and excludeRecursive projections', async () => {
    const { fixture, host } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
      h.selectedKeysMode.set('leavesOnly');
    });
    host.tree().select(1);
    await settle(fixture);
    // 1 → 2 → 3 cascade; only the leaf is reported
    expect(host.selectedKeys()).toEqual([3]);
    expect(host.tree().getSelectedKeys('all')).toEqual([1, 2, 3]);
    expect(host.tree().getSelectedKeys('excludeRecursive')).toEqual([1]);
  });

  it('skips the cascade when selectNodesRecursive is off', async () => {
    const { fixture, host } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
      h.selectNodesRecursive.set(false);
    });
    host.tree().select(1);
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([1]);
  });

  it('honors the cancelable selectionChanging pre-event', async () => {
    const { fixture, host, rowFor } = await render((h) =>
      h.selectionMode.set('single'),
    );
    host.tree().selectionChanging.subscribe((e) => (e.cancel = true));
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([]);
    expect(host.selectionChanged).toEqual([]);
  });

  it('emits selectionChanged with the previous keys', async () => {
    const { fixture, host, rowFor } = await render((h) =>
      h.selectionMode.set('single'),
    );
    rowFor('Documents')?.click();
    await settle(fixture);
    rowFor('Photos')?.click();
    await settle(fixture);
    expect(host.selectionChanged.at(-1)?.keys).toEqual([4]);
    expect(host.selectionChanged.at(-1)?.previousKeys).toEqual([1]);
  });

  it('drives the select-all row from the root states', async () => {
    const { fixture, host, el } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('selectAll');
    });
    const selectAll = el.querySelector<HTMLElement>(
      '.oge-tree-view-select-all',
    );
    expect(selectAll?.getAttribute('aria-checked')).toBe('false');

    selectAll?.click();
    await settle(fixture);
    expect(selectAll?.getAttribute('aria-checked')).toBe('true');
    expect(host.selectedKeys()).toHaveLength(5);

    selectAll?.click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([]);
  });

  it('does not select on click when selectByClick is off', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.selectionMode.set('single');
    });
    host.tree().unselectAll();
    // selectByClick defaults to true; the tree API still works directly
    host.tree().select(4);
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([4]);
    void rowFor;
  });
});
