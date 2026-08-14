import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OgeTreeView, type OgeTreeViewHandle } from './tree-view';
import { OgeTreeViewConfigProvider } from './navigation-config';

/** Flat fixture row. */
interface Node {
  id: number;
  parentId: number | null;
  name: string;
  disabled?: boolean;
  hasItems?: boolean;
}

interface NestedNode {
  id: number;
  name: string;
  children?: NestedNode[];
}

/**
 * ```
 * 1 Documents        4 Photos
 *   2 Reports          5 Holiday
 *     3 Q1.pdf
 * ```
 */
const FLAT: Node[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

const NESTED: NestedNode[] = [
  {
    id: 1,
    name: 'Documents',
    children: [
      { id: 2, name: 'Reports', children: [{ id: 3, name: 'Q1.pdf' }] },
    ],
  },
  { id: 4, name: 'Photos', children: [{ id: 5, name: 'Holiday' }] },
];

const rows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-tree-view-item'));

const labels = (): string[] =>
  rows()
    .filter((row) => !row.classList.contains('oge-tree-view-item-filler'))
    .map((row) => row.textContent?.trim() ?? '');

const rowFor = (name: string): HTMLElement | undefined =>
  rows().find((row) => row.textContent?.trim().startsWith(name));

const checkOf = (name: string): HTMLElement | null =>
  rowFor(name)?.querySelector<HTMLElement>('.oge-tree-view-check') ?? null;

const stateOf = (name: string): string | null | undefined =>
  checkOf(name)?.getAttribute('data-state');

const focusedLabel = (): string | null => {
  const active = document.activeElement;
  return active instanceof HTMLElement
    ? (active.textContent?.trim() ?? null)
    : null;
};

/** Focus moves the roving tab stop, which is React state — hence the act(). */
const focusRow = (name: string): void => {
  act(() => {
    rowFor(name)?.focus();
  });
};

const press = (key: string, init: KeyboardEventInit = {}): void => {
  const target = document.activeElement ?? document.body;
  fireEvent.keyDown(target, { key, ...init });
};

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('OgeTreeView data binding', () => {
  it('renders only the roots until something is expanded', () => {
    render(<OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />);
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('exposes the APG hierarchy attributes on a flat DOM', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1]}
      />,
    );
    const [documents, reports, photos] = rows();
    expect(documents.getAttribute('role')).toBe('treeitem');
    expect(documents.getAttribute('aria-level')).toBe('1');
    expect(documents.getAttribute('aria-posinset')).toBe('1');
    expect(documents.getAttribute('aria-setsize')).toBe('2');
    expect(documents.getAttribute('aria-expanded')).toBe('true');

    expect(reports.getAttribute('aria-level')).toBe('2');
    // a collapsed parent still advertises expandability
    expect(reports.getAttribute('aria-expanded')).toBe('false');

    expect(photos.getAttribute('aria-level')).toBe('1');
    expect(photos.getAttribute('aria-posinset')).toBe('2');
  });

  it('omits aria-expanded on leaves', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[4]}
      />,
    );
    expect(rowFor('Holiday')?.getAttribute('aria-expanded')).toBeNull();
  });

  it('accepts nested children through itemsExpr', () => {
    render(
      <OgeTreeView<NestedNode>
        items={NESTED}
        itemsExpr="children"
        displayExpr="name"
        defaultExpandedKeys={[1, 2]}
      />,
    );
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf', 'Photos']);
  });

  it('indents by level', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1, 2]}
      />,
    );
    const indent = (name: string) =>
      rowFor(name)?.style.getPropertyValue('padding-inline-start');
    expect(indent('Documents')).toBe('8px');
    expect(indent('Reports')).toBe('24px');
    expect(indent('Q1.pdf')).toBe('40px');
  });

  it('marks disabled nodes and keeps them out of the Tab sequence', () => {
    render(
      <OgeTreeView
        items={[
          { id: 1, parentId: null, name: 'Documents' },
          { id: 4, parentId: null, name: 'Photos', disabled: true },
        ]}
        displayExpr="name"
        rootValue={null}
      />,
    );
    expect(rowFor('Photos')?.getAttribute('aria-disabled')).toBe('true');
    expect(rowFor('Photos')?.getAttribute('tabindex')).toBe('-1');
  });

  it('shows the empty message when there are no nodes', () => {
    render(<OgeTreeView items={[]} displayExpr="name" rootValue={null} />);
    expect(
      document.querySelector('.oge-tree-view-empty')?.textContent,
    ).toContain('No items to display');
  });

  it('drops nodes whose parent is missing', () => {
    render(
      <OgeTreeView
        items={[
          { id: 1, parentId: null, name: 'Documents' },
          { id: 9, parentId: 99, name: 'Orphan' },
        ]}
        displayExpr="name"
        rootValue={null}
      />,
    );
    expect(labels()).toEqual(['Documents']);
  });

  it('renders a per-node icon from iconExpr', () => {
    render(
      <OgeTreeView
        items={[{ id: 1, parentId: null, name: 'Documents', icon: 'M0 0h4' }]}
        displayExpr="name"
        iconExpr="icon"
        rootValue={null}
      />,
    );
    expect(document.querySelector('.oge-tree-view-icon path')).toHaveAttribute(
      'd',
      'M0 0h4',
    );
  });
});

describe('OgeTreeView expansion', () => {
  it('expands and collapses on row click', async () => {
    render(<OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />);
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);

    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('expands on double click when expandEvent is dblclick', async () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        expandEvent="dblclick"
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Photos']);

    fireEvent.doubleClick(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
  });

  it('expands from the chevron even when expandEvent is dblclick', async () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        expandEvent="dblclick"
      />,
    );
    fireEvent.click(
      rowFor('Documents')?.querySelector('.oge-tree-view-toggle') as Element,
    );
    await flush();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
  });

  it('drives expandedKeys as a controlled prop', async () => {
    const changes: readonly (readonly (string | number)[])[] = [];
    const seen: (string | number)[][] = [];
    function Host() {
      const [keys, setKeys] = useState<readonly (string | number)[]>([1, 2]);
      return (
        <OgeTreeView
          items={FLAT}
          displayExpr="name"
          rootValue={null}
          expandedKeys={keys}
          onExpandedKeysChange={(next) => {
            seen.push([...next]);
            setKeys(next);
          }}
        />
      );
    }
    render(<Host />);
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf', 'Photos']);

    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(seen.at(-1)).toEqual([2]);
    expect(changes).toEqual([]);
  });

  it('honors the cancelable onItemExpanding pre-event', async () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        onItemExpanding={(event) => (event.cancel = true)}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('expandAll and collapseAll cover every expandable node', async () => {
    const handle = createRef<OgeTreeViewHandle>();
    render(
      <OgeTreeView
        ref={handle}
        items={FLAT}
        displayExpr="name"
        rootValue={null}
      />,
    );
    await act(async () => handle.current?.expandAll());
    expect(labels()).toEqual([
      'Documents',
      'Reports',
      'Q1.pdf',
      'Photos',
      'Holiday',
    ]);

    await act(async () => handle.current?.collapseAll());
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('expand() pulls the ancestors open, and reports unknown keys', async () => {
    const handle = createRef<OgeTreeViewHandle>();
    render(
      <OgeTreeView
        ref={handle}
        items={FLAT}
        displayExpr="name"
        rootValue={null}
      />,
    );
    await act(async () => {
      await expect(handle.current?.expand(3)).resolves.toBe(true);
    });
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf', 'Photos']);

    await act(async () => {
      await expect(handle.current?.expand(999)).resolves.toBe(false);
      await expect(handle.current?.expand(1)).resolves.toBe(true);
    });
  });

  it('ignores interaction while disabled', async () => {
    render(
      <OgeTreeView items={FLAT} displayExpr="name" rootValue={null} disabled />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Photos']);
  });
});

describe('OgeTreeView selection', () => {
  it('selects a single node and exposes aria-selected', async () => {
    const keys: (string | number)[][] = [];
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="single"
        defaultExpandedKeys={[1]}
        onSelectedKeysChange={(next) => keys.push([...next])}
      />,
    );
    fireEvent.click(rowFor('Reports') as HTMLElement);
    await flush();
    expect(keys.at(-1)).toEqual([2]);
    expect(rowFor('Reports')?.getAttribute('aria-selected')).toBe('true');
    expect(rowFor('Documents')?.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(keys.at(-1)).toEqual([1]);
  });

  it('uses aria-checked instead of aria-selected in checkbox mode', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
      />,
    );
    // APG: expose selection through one of the two, never both
    expect(rowFor('Documents')?.getAttribute('aria-checked')).toBe('false');
    expect(rowFor('Documents')?.getAttribute('aria-selected')).toBeNull();
  });

  it('never nests a focusable control inside a treeitem', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
      />,
    );
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
  const WITH_SIBLING: Node[] = [
    { id: 1, parentId: null, name: 'Documents' },
    { id: 2, parentId: 1, name: 'Reports' },
    { id: 3, parentId: 2, name: 'Q1.pdf' },
    { id: 6, parentId: 1, name: 'Notes' },
    { id: 4, parentId: null, name: 'Photos' },
  ];

  function Cascade({
    onKeys,
  }: {
    onKeys: (keys: readonly (string | number)[]) => void;
  }) {
    return (
      <OgeTreeView
        items={WITH_SIBLING}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
        defaultExpandedKeys={[1, 2]}
        onSelectedKeysChange={onKeys}
      />
    );
  }

  it('cascades a checkbox down to descendants and up to full parents', async () => {
    const keys: (string | number)[][] = [];
    render(<Cascade onKeys={(next) => keys.push([...next])} />);
    fireEvent.click(checkOf('Reports') as HTMLElement);
    await flush();

    // 2 and its descendant 3; 1 is only partly covered, so indeterminate
    expect([...(keys.at(-1) ?? [])].sort()).toEqual([2, 3]);
    expect(stateOf('Reports')).toBe('checked');
    expect(stateOf('Q1.pdf')).toBe('checked');
    expect(stateOf('Documents')).toBe('indeterminate');
    expect(rowFor('Documents')?.getAttribute('aria-checked')).toBe('mixed');
    expect(stateOf('Photos')).toBe('unchecked');
  });

  it('checking the last missing sibling promotes the parent to checked', async () => {
    const keys: (string | number)[][] = [];
    render(<Cascade onKeys={(next) => keys.push([...next])} />);
    fireEvent.click(checkOf('Reports') as HTMLElement);
    await flush();
    fireEvent.click(checkOf('Notes') as HTMLElement);
    await flush();
    expect([...(keys.at(-1) ?? [])].sort()).toEqual([1, 2, 3, 6]);
    expect(stateOf('Documents')).toBe('checked');
  });

  it('unchecking a node normalizes its ancestors off', async () => {
    const keys: (string | number)[][] = [];
    render(<Cascade onKeys={(next) => keys.push([...next])} />);
    fireEvent.click(checkOf('Documents') as HTMLElement);
    await flush();
    expect([...(keys.at(-1) ?? [])].sort()).toEqual([1, 2, 3, 6]);

    fireEvent.click(checkOf('Q1.pdf') as HTMLElement);
    await flush();
    // 3 off → 2 no longer full → 1 no longer full; only the untouched 6 stays
    expect([...(keys.at(-1) ?? [])].sort()).toEqual([6]);
  });

  it('reports leavesOnly and excludeRecursive projections', async () => {
    const handle = createRef<OgeTreeViewHandle>();
    const keys: (string | number)[][] = [];
    render(
      <OgeTreeView
        ref={handle}
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
        selectedKeysMode="leavesOnly"
        onSelectedKeysChange={(next) => keys.push([...next])}
      />,
    );
    await act(async () => handle.current?.select(1));
    // 1 → 2 → 3 cascade; only the leaf is reported
    expect(keys.at(-1)).toEqual([3]);
    expect(handle.current?.getSelectedKeys('all')).toEqual([1, 2, 3]);
    expect(handle.current?.getSelectedKeys('excludeRecursive')).toEqual([1]);
  });

  it('skips the cascade when selectNodesRecursive is off', async () => {
    const handle = createRef<OgeTreeViewHandle>();
    const keys: (string | number)[][] = [];
    render(
      <OgeTreeView
        ref={handle}
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
        selectNodesRecursive={false}
        onSelectedKeysChange={(next) => keys.push([...next])}
      />,
    );
    await act(async () => handle.current?.select(1));
    expect(keys.at(-1)).toEqual([1]);
  });

  it('honors the cancelable onSelectionChanging pre-event', async () => {
    const changed: unknown[] = [];
    const keys: unknown[] = [];
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="single"
        onSelectionChanging={(event) => (event.cancel = true)}
        onSelectionChanged={(event) => changed.push(event)}
        onSelectedKeysChange={(next) => keys.push(next)}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(changed).toEqual([]);
    expect(keys).toEqual([]);
  });

  it('emits onSelectionChanged with the previous keys', async () => {
    const changed: {
      keys: readonly unknown[];
      previousKeys: readonly unknown[];
    }[] = [];
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="single"
        onSelectionChanged={(event) => changed.push(event)}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    fireEvent.click(rowFor('Photos') as HTMLElement);
    await flush();
    expect(changed.at(-1)?.keys).toEqual([4]);
    expect(changed.at(-1)?.previousKeys).toEqual([1]);
  });

  it('drives the select-all row from the root states', async () => {
    const keys: (string | number)[][] = [];
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="selectAll"
        onSelectedKeysChange={(next) => keys.push([...next])}
      />,
    );
    const selectAll = document.querySelector<HTMLElement>(
      '.oge-tree-view-select-all',
    );
    expect(selectAll?.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(selectAll as HTMLElement);
    await flush();
    expect(selectAll?.getAttribute('aria-checked')).toBe('true');
    expect(keys.at(-1)).toHaveLength(5);

    fireEvent.click(selectAll as HTMLElement);
    await flush();
    expect(keys.at(-1)).toEqual([]);
  });

  it('does not select a row click away when checkboxes own the selection', async () => {
    const keys: unknown[] = [];
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
        onSelectedKeysChange={(next) => keys.push(next)}
      />,
    );
    // selectByClick defaults to false whenever the checkbox column is on
    fireEvent.click(
      rowFor('Documents')?.querySelector('.oge-tree-view-text') as Element,
    );
    await flush();
    expect(keys).toEqual([]);
  });
});

describe('OgeTreeView search', () => {
  it('keeps matches reachable by auto-expanding their ancestors', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultSearchValue="Q1"
      />,
    );
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf']);
  });

  it('is accent- and locale-insensitive', () => {
    render(
      <OgeTreeView
        items={[
          { id: 1, parentId: null, name: 'Ödemeler' },
          { id: 2, parentId: null, name: 'Raporlar' },
        ]}
        displayExpr="name"
        rootValue={null}
        defaultSearchValue="odeme"
      />,
    );
    expect(labels()).toEqual(['Ödemeler']);
  });

  it('honors startsWith and equals modes', () => {
    const { rerender } = render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        searchMode="startsWith"
        searchValue="rep"
      />,
    );
    expect(labels()).toEqual(['Documents', 'Reports']);

    rerender(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        searchMode="equals"
        searchValue="rep"
      />,
    );
    expect(labels()).toEqual([]);

    rerender(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        searchMode="equals"
        searchValue="Reports"
      />,
    );
    expect(labels()).toEqual(['Documents', 'Reports']);
  });

  it('fullBranch also keeps the descendants of a match', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        filterMode="fullBranch"
        defaultSearchValue="Reports"
      />,
    );
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf']);
  });

  it('highlights the matched substring', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultSearchValue="port"
      />,
    );
    expect(rowFor('Reports')?.innerHTML).toContain(
      '<mark class="oge-highlight">port</mark>',
    );
  });

  it('shows the no-results message and restores on clear', () => {
    const { rerender } = render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        searchValue="zzz"
      />,
    );
    expect(
      document.querySelector('.oge-tree-view-empty')?.textContent,
    ).toContain('No matching items');

    rerender(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        searchValue=""
      />,
    );
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('renders the built-in search box and feeds the model', async () => {
    const seen: string[] = [];
    function Host() {
      const [value, setValue] = useState('');
      return (
        <OgeTreeView
          items={FLAT}
          displayExpr="name"
          rootValue={null}
          searchEnabled
          searchValue={value}
          onSearchValueChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Host />);
    const input = document.querySelector<HTMLInputElement>(
      '.oge-tree-view-search-input',
    );
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-label')).toBe('Search the tree');

    fireEvent.change(input as HTMLInputElement, {
      target: { value: 'Holiday' },
    });
    await flush();
    expect(seen.at(-1)).toBe('Holiday');
    expect(labels()).toEqual(['Photos', 'Holiday']);
  });
});

describe('OgeTreeView keyboard (APG treeview)', () => {
  const open = (extra: Record<string, unknown> = {}) =>
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1, 2, 4]}
        {...extra}
      />,
    );

  it('keeps exactly one node in the Tab sequence', () => {
    open();
    const tabbable = rows().filter(
      (row) => row.getAttribute('tabindex') === '0',
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].textContent?.trim()).toBe('Documents');
  });

  it('moves down and up over the visible nodes without wrapping', async () => {
    open();
    focusRow('Documents');
    press('ArrowDown');
    await flush();
    expect(focusedLabel()).toBe('Reports');

    press('ArrowDown');
    await flush();
    expect(focusedLabel()).toBe('Q1.pdf');

    press('ArrowUp');
    await flush();
    expect(focusedLabel()).toBe('Reports');

    // APG trees do not wrap at the ends
    focusRow('Documents');
    press('ArrowUp');
    await flush();
    expect(focusedLabel()).toBe('Documents');
  });

  it('ArrowRight opens a collapsed parent, then moves to its first child', async () => {
    render(<OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />);
    focusRow('Documents');
    press('ArrowRight');
    await flush();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
    expect(focusedLabel()).toBe('Documents');

    press('ArrowRight');
    await flush();
    expect(focusedLabel()).toBe('Reports');
  });

  it('ArrowRight does nothing on a leaf', async () => {
    open();
    focusRow('Q1.pdf');
    press('ArrowRight');
    await flush();
    expect(focusedLabel()).toBe('Q1.pdf');
  });

  it('ArrowLeft closes an open parent, then moves to the parent node', async () => {
    open();
    focusRow('Reports');
    press('ArrowLeft');
    await flush();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos', 'Holiday']);
    expect(focusedLabel()).toBe('Reports');

    press('ArrowLeft');
    await flush();
    expect(focusedLabel()).toBe('Documents');
  });

  it('ArrowLeft on a leaf moves to its parent', async () => {
    open();
    focusRow('Q1.pdf');
    press('ArrowLeft');
    await flush();
    expect(focusedLabel()).toBe('Reports');
  });

  it('Home and End jump to the first and last visible node', async () => {
    open();
    focusRow('Reports');
    press('End');
    await flush();
    expect(focusedLabel()).toBe('Holiday');

    press('Home');
    await flush();
    expect(focusedLabel()).toBe('Documents');
  });

  it('skips disabled nodes while navigating', async () => {
    render(
      <OgeTreeView
        items={[
          { id: 1, parentId: null, name: 'Documents' },
          { id: 2, parentId: 1, name: 'Reports', disabled: true },
          { id: 4, parentId: null, name: 'Photos' },
        ]}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1]}
      />,
    );
    focusRow('Documents');
    press('ArrowDown');
    await flush();
    expect(focusedLabel()).toBe('Photos');
  });

  it('type-ahead moves to the next matching node', async () => {
    open();
    focusRow('Documents');
    press('h');
    await flush();
    expect(focusedLabel()).toBe('Holiday');
  });

  it('Enter toggles a parent and selects a leaf', async () => {
    const keys: (string | number)[][] = [];
    open({
      selectionMode: 'single',
      onSelectedKeysChange: (next: readonly (string | number)[]) =>
        keys.push([...next]),
    });
    focusRow('Documents');
    press('Enter');
    await flush();
    expect(labels()).toEqual(['Documents', 'Photos', 'Holiday']);

    focusRow('Holiday');
    press('Enter');
    await flush();
    expect(keys.at(-1)).toEqual([5]);
  });

  it('Space toggles selection on the focused node', async () => {
    const keys: (string | number)[][] = [];
    open({
      selectionMode: 'multiple',
      onSelectedKeysChange: (next: readonly (string | number)[]) =>
        keys.push([...next]),
    });
    focusRow('Reports');
    press(' ');
    await flush();
    expect(keys.at(-1)).toContain(2);

    press(' ');
    await flush();
    expect(keys.at(-1)).not.toContain(2);
  });

  it('asterisk expands every sibling at the level', async () => {
    render(<OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />);
    focusRow('Documents');
    press('*');
    await flush();
    // both roots open, their children do not
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos', 'Holiday']);
  });

  it('Ctrl+A selects everything in multiple mode', async () => {
    const keys: (string | number)[][] = [];
    open({
      selectionMode: 'multiple',
      onSelectedKeysChange: (next: readonly (string | number)[]) =>
        keys.push([...next]),
    });
    focusRow('Documents');
    press('a', { ctrlKey: true });
    await flush();
    expect(keys.at(-1)).toHaveLength(5);
  });

  it('Ctrl+Shift+End selects from the focused node downwards', async () => {
    const keys: (string | number)[][] = [];
    open({
      selectionMode: 'multiple',
      onSelectedKeysChange: (next: readonly (string | number)[]) =>
        keys.push([...next]),
    });
    focusRow('Photos');
    press('End', { ctrlKey: true, shiftKey: true });
    await flush();
    expect([...(keys.at(-1) ?? [])].sort()).toEqual([4, 5]);
  });

  it('does nothing while disabled', async () => {
    open({ disabled: true });
    focusRow('Documents');
    press('ArrowDown');
    await flush();
    expect(focusedLabel()).toBe('Documents');
  });
});

describe('OgeTreeView lazy children', () => {
  /** Only the roots are supplied up front; `hasItems` advertises the rest. */
  const ROOTS: Node[] = [
    { id: 1, parentId: null, name: 'Documents', hasItems: true },
    { id: 4, parentId: null, name: 'Photos', hasItems: false },
  ];

  it('shows an expand toggle from the hasItems hint alone', () => {
    render(
      <OgeTreeView
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        loadChildren={() => Promise.resolve([])}
      />,
    );
    expect(rowFor('Documents')?.getAttribute('aria-expanded')).toBe('false');
    expect(rowFor('Photos')?.getAttribute('aria-expanded')).toBeNull();
  });

  it('renders a loading placeholder, then the fetched children', async () => {
    let resolve!: (rows: Node[]) => void;
    render(
      <OgeTreeView
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        loadChildren={() => new Promise<Node[]>((r) => (resolve = r))}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(
      document.querySelector('.oge-tree-view-item-filler')?.textContent,
    ).toContain('Loading…');
    expect(
      document.querySelector('[role="tree"]')?.getAttribute('aria-busy'),
    ).toBe('true');
    // the placeholder is not part of the treeitem set
    const filler = document.querySelector('.oge-tree-view-item-filler');
    expect(filler?.getAttribute('role')).toBeNull();
    expect(filler?.getAttribute('tabindex')).toBe('-1');

    await act(async () => {
      resolve([{ id: 2, parentId: 1, name: 'Reports' }]);
    });
    expect(document.querySelector('.oge-tree-view-item-filler')).toBeNull();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
    expect(
      document.querySelector('[role="tree"]')?.getAttribute('aria-busy'),
    ).toBeNull();
  });

  it('fetches once per node across collapse and re-expand', async () => {
    let calls = 0;
    render(
      <OgeTreeView
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        loadChildren={() => {
          calls++;
          return Promise.resolve([{ id: 2, parentId: 1, name: 'Reports' }]);
        }}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(calls).toBe(1);
  });

  it('surfaces the real error on rejection', async () => {
    const failure = new Error('offline');
    const errors: unknown[] = [];
    render(
      <OgeTreeView
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        loadChildren={() => Promise.reject(failure)}
        onChildrenLoadFailed={(event) => errors.push(event.error)}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(errors).toEqual([failure]);
    expect(
      document.querySelector('.oge-tree-view-item-filler')?.textContent,
    ).toContain('Could not load these items.');
  });

  it('treats a synchronous throw as a failure', async () => {
    const errors: unknown[] = [];
    render(
      <OgeTreeView
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        loadChildren={() => {
          throw new Error('boom');
        }}
        onChildrenLoadFailed={(event) => errors.push(event.error)}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(errors).toHaveLength(1);
    expect(document.querySelector('.oge-tree-view-item-filler')).not.toBeNull();
  });

  it('indexes fetched children so selection cascades reach them', async () => {
    const keys: (string | number)[][] = [];
    render(
      <OgeTreeView
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        showCheckBoxes="normal"
        onSelectedKeysChange={(next) => keys.push([...next])}
        loadChildren={() =>
          Promise.resolve([
            { id: 2, parentId: 1, name: 'Reports' },
            { id: 3, parentId: 1, name: 'Notes' },
          ])
        }
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    fireEvent.click(checkOf('Documents') as HTMLElement);
    await flush();
    expect([...(keys.at(-1) ?? [])].sort()).toEqual([1, 2, 3]);
  });

  it('awaits the fetch in the expand() promise', async () => {
    const handle = createRef<OgeTreeViewHandle>();
    render(
      <OgeTreeView
        ref={handle}
        items={ROOTS}
        displayExpr="name"
        rootValue={null}
        loadChildren={() =>
          Promise.resolve([{ id: 2, parentId: 1, name: 'Reports' }])
        }
      />,
    );
    await act(async () => {
      await expect(handle.current?.expand(1)).resolves.toBe(true);
    });
  });
});

describe('OgeTreeView virtual scrolling', () => {
  /** 200 flat roots — enough that only a window can be rendered. */
  const MANY: Node[] = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    parentId: null,
    name: `Node ${i + 1}`,
  }));

  let raf: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(0), 0);
        return 0;
      });
  });

  afterEach(() => raf.mockRestore());

  it('renders every row when virtualization is off', () => {
    render(<OgeTreeView items={MANY} displayExpr="name" rootValue={null} />);
    expect(rows()).toHaveLength(200);
  });

  it('renders only a window while reserving the full scroll height', () => {
    render(
      <OgeTreeView
        items={MANY}
        displayExpr="name"
        rootValue={null}
        virtualScroll
        height="300px"
      />,
    );
    const rendered = rows().length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(200);
    const list = document.querySelector<HTMLElement>('.oge-tree-view-list');
    // the default 30px row height drives the spacer
    expect(list?.style.blockSize).toBe('6000px');
  });

  it('moves the window and the offset on scroll', async () => {
    render(
      <OgeTreeView
        items={MANY}
        displayExpr="name"
        rootValue={null}
        virtualScroll
        height="300px"
      />,
    );
    expect(labels()[0]).toBe('Node 1');

    const scroll = document.querySelector<HTMLElement>('.oge-tree-view-scroll');
    Object.defineProperty(scroll, 'scrollTop', { value: 1500, writable: true });
    await act(async () => {
      fireEvent.scroll(scroll as HTMLElement);
    });

    expect(labels()[0]).not.toBe('Node 1');
    const viewport = document.querySelector<HTMLElement>(
      '.oge-tree-view-viewport',
    );
    expect(viewport?.style.transform).toMatch(/translateY\(\d+px\)/);
  });

  it('applies an explicit row height', () => {
    render(
      <OgeTreeView
        items={MANY}
        displayExpr="name"
        rootValue={null}
        virtualScroll={{ itemHeight: 40 }}
        height="300px"
      />,
    );
    const list = document.querySelector<HTMLElement>('.oge-tree-view-list');
    expect(list?.style.blockSize).toBe('8000px');
  });

  it('scrollToItem moves the window to an unrendered node', async () => {
    const handle = createRef<OgeTreeViewHandle>();
    render(
      <OgeTreeView
        ref={handle}
        items={MANY}
        displayExpr="name"
        rootValue={null}
        virtualScroll
        height="300px"
      />,
    );
    expect(labels()).not.toContain('Node 150');

    await act(async () => handle.current?.scrollToItem(150));
    expect(labels()).toContain('Node 150');
  });
});

describe('OgeTreeView drag & drop', () => {
  /** jsdom has no layout: lay the rows out as 20px slots stacked from y=0. */
  function stubRects(): void {
    rows().forEach((row, index) => {
      row.getBoundingClientRect = () =>
        ({
          top: index * 20,
          bottom: index * 20 + 20,
          left: 0,
          right: 200,
          width: 200,
          height: 20,
          x: 0,
          y: index * 20,
          toJSON: () => ({}),
        }) as DOMRect;
    });
  }

  /** jsdom ships no `PointerEvent`, so the pointer gestures ride a MouseEvent. */
  function pointer(
    target: Element,
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    clientY: number,
    clientX = 10,
  ): void {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 0,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    fireEvent(target, event);
  }

  const draggable = (extra: Record<string, unknown> = {}) => {
    const result = render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        allowDragging
        defaultExpandedKeys={[1, 4]}
        {...extra}
      />,
    );
    stubRects();
    return result;
  };

  it('does not start a drag below the movement threshold', async () => {
    const reordered: unknown[] = [];
    draggable({ onItemReordered: (event: unknown) => reordered.push(event) });
    pointer(rows()[0], 'pointerdown', 10);
    pointer(rows()[0], 'pointermove', 12);
    pointer(rows()[0], 'pointerup', 12);
    await flush();
    expect(reordered).toEqual([]);
  });

  it('drops a node inside another and reports the reparent', async () => {
    const reordered: Record<string, unknown>[] = [];
    draggable({
      onItemReordered: (event: Record<string, unknown>) =>
        reordered.push(event),
    });
    // rows: 0 Documents, 1 Reports, 2 Photos, 3 Holiday
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50); // past the threshold, over Photos
    await flush();
    pointer(rows()[1], 'pointerup', 50);
    await flush();

    expect(reordered).toHaveLength(1);
    expect(reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 4,
      position: 'inside',
    });
  });

  it('resolves the edge zones to before / after', async () => {
    const reordered: Record<string, unknown>[] = [];
    draggable({
      onItemReordered: (event: Record<string, unknown>) =>
        reordered.push(event),
    });
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 41); // top edge of the Photos row
    await flush();
    pointer(rows()[1], 'pointerup', 41);
    await flush();
    expect(reordered[0]).toMatchObject({ dropKey: 4, position: 'before' });
  });

  it('refuses to drop a node into its own subtree', async () => {
    const reordered: unknown[] = [];
    draggable({ onItemReordered: (event: unknown) => reordered.push(event) });
    // drag Documents (row 0) onto its child Reports (row 1)
    pointer(rows()[0], 'pointerdown', 10);
    pointer(rows()[0], 'pointermove', 30);
    await flush();
    pointer(rows()[0], 'pointerup', 30);
    await flush();
    expect(reordered).toEqual([]);
  });

  it('marks the drop target while dragging', async () => {
    draggable();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await flush();
    expect(
      document.querySelector('.oge-tree-view-item-drop-inside'),
    ).not.toBeNull();
    expect(
      document.querySelector('.oge-tree-view-item-dragging'),
    ).not.toBeNull();

    pointer(rows()[1], 'pointerup', 50);
    await flush();
    expect(
      document.querySelector('.oge-tree-view-item-drop-inside'),
    ).toBeNull();
  });

  it('honors the cancelable onItemReordering pre-event', async () => {
    const reordered: unknown[] = [];
    draggable({
      onItemReordering: (event: { cancel: boolean }) => (event.cancel = true),
      onItemReordered: (event: unknown) => reordered.push(event),
    });
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await flush();
    pointer(rows()[1], 'pointerup', 50);
    await flush();
    expect(reordered).toEqual([]);
  });

  it('Escape cancels an in-flight drag', async () => {
    draggable();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await flush();
    fireEvent.keyDown(rows()[1], { key: 'Escape' });
    await flush();
    expect(document.querySelector('.oge-tree-view-item-dragging')).toBeNull();
  });

  it('does nothing while dragging is disabled', async () => {
    const reordered: unknown[] = [];
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1, 4]}
        onItemReordered={(event) => reordered.push(event)}
      />,
    );
    stubRects();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await flush();
    pointer(rows()[1], 'pointerup', 50);
    await flush();
    expect(reordered).toEqual([]);
  });
});

describe('OgeTreeView accessibility, slots and config', () => {
  it('wires the tree/treeitem roles and advertises multiselectability', () => {
    const { rerender } = render(
      <OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />,
    );
    expect(document.querySelector('[role="tree"]')).not.toBeNull();
    expect(document.querySelectorAll('[role="treeitem"]')).toHaveLength(2);
    expect(
      document
        .querySelector('[role="tree"]')
        ?.getAttribute('aria-multiselectable'),
    ).toBeNull();

    rerender(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
      />,
    );
    expect(
      document
        .querySelector('[role="tree"]')
        ?.getAttribute('aria-multiselectable'),
    ).toBe('true');
  });

  it('puts treeId on the tree element, not the host', () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        treeId="picker-tree"
        ariaLabel="Folders"
      />,
    );
    const tree = document.getElementById('picker-tree');
    expect(tree?.getAttribute('role')).toBe('tree');
    expect(tree?.getAttribute('aria-label')).toBe('Folders');
  });

  it('replaces the label, the chevron and the empty state through render props', () => {
    const { rerender } = render(
      <OgeTreeView<Node>
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        renderItem={({ item, level }) => (
          <span className="custom-label">{`${item.name}@${level}`}</span>
        )}
        renderExpandIcon={({ expanded }) => (
          <span className="custom-icon">{expanded ? '-' : '+'}</span>
        )}
        renderNoData={() => <span className="custom-empty">Nothing here</span>}
      />,
    );
    expect(document.querySelector('.custom-label')?.textContent).toBe(
      'Documents@0',
    );
    expect(document.querySelectorAll('.custom-icon')).toHaveLength(2);
    expect(document.querySelector('.custom-icon')?.textContent).toBe('+');

    rerender(
      <OgeTreeView<Node>
        items={[]}
        displayExpr="name"
        rootValue={null}
        renderNoData={() => <span className="custom-empty">Nothing here</span>}
      />,
    );
    expect(document.querySelector('.custom-empty')).not.toBeNull();
  });

  it('honors OgeTreeViewConfigProvider message overrides', () => {
    render(
      <OgeTreeViewConfigProvider config={{ messages: { noData: 'Öğe yok' } }}>
        <OgeTreeView items={[]} displayExpr="name" rootValue={null} />
      </OgeTreeViewConfigProvider>,
    );
    expect(screen.getByText('Öğe yok')).toBeInTheDocument();
  });

  it('lets per-instance messages win over the provider', () => {
    render(
      <OgeTreeViewConfigProvider config={{ messages: { noData: 'Öğe yok' } }}>
        <OgeTreeView
          items={[]}
          displayExpr="name"
          rootValue={null}
          messages={{ noData: 'Boş' }}
        />
      </OgeTreeViewConfigProvider>,
    );
    expect(screen.getByText('Boş')).toBeInTheDocument();
  });

  it('survives a StrictMode double-mount', async () => {
    render(
      <StrictMode>
        <OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />
      </StrictMode>,
    );
    expect(labels()).toEqual(['Documents', 'Photos']);
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
  });
});
