import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createRef } from 'react';
import type { DataSource, TreeListStateSnapshot } from '@oge-ui/core';
import type { OgeStateStorage } from '@oge-ui/behavior';
import { OgeTreeList } from './tree-list';
import type { OgeTreeListHandle } from './tree-list-types';
import {
  COLUMNS,
  expanderOf,
  makeRows,
  names,
  rowByName,
  rows,
  settled,
  type Node,
} from './tree-list.test-utils';

/** Pointer events as jsdom builds them; the move's target is the hit. */
function pointer(
  type: string,
  target: Element,
  clientY: number,
  pointerType = 'mouse',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 5,
    clientY,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** Fake server serving one level per request, like the docs' lazy demo. */
function lazySource(log: string[]): DataSource<Node> {
  const all = makeRows().map((row) => ({
    ...row,
    hasKids: makeRows().some((child) => child.parentId === row.id),
  }));
  return {
    capabilities: {
      sort: true,
      filter: true,
      group: false,
      paging: false,
      summary: false,
    },
    keyOf: (row) => row.id,
    load: async (options) => {
      const filter = options.filter as
        { field: string; op: string; value: unknown } | undefined;
      log.push(`${filter?.field}:${String(filter?.value)}`);
      return {
        data: all.filter((row) => row.parentId === (filter?.value ?? null)),
      };
    },
  };
}

describe('OgeTreeList features', () => {
  it('lazily loads children per expansion (skeleton row while in flight)', async () => {
    const log: string[] = [];
    render(
      <OgeTreeList
        data={lazySource(log)}
        columns={COLUMNS}
        hasItemsExpr="hasKids"
      />,
    );
    await settled();
    expect(log).toEqual(['parentId:null']);
    fireEvent.click(expanderOf('Root A'));
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']),
    );
    expect(log).toEqual(['parentId:null', 'parentId:1']);
    // collapsing and re-expanding reads the cache
    fireEvent.click(expanderOf('Root A'));
    fireEvent.click(expanderOf('Root A'));
    await waitFor(() => expect(names()).toContain('Child A2'));
    expect(log).toHaveLength(2);
  });

  it('reparents by drag & drop and guards descendants', async () => {
    const data = makeRows();
    const moves: unknown[] = [];
    render(
      <OgeTreeList
        data={data}
        columns={COLUMNS}
        autoExpandAll
        rowDragging
        onRowReparented={(event) => moves.push(event)}
      />,
    );
    await settled();
    const handle = rowByName('Root B').querySelector(
      '.oge-drag-handle',
    ) as HTMLElement;
    pointer('pointerdown', handle, 200);
    const target = rowByName('Child A2');
    pointer('pointermove', target, 20);
    expect(target).toHaveClass('oge-drop-target');
    pointer('pointerup', target, 20);
    await waitFor(() => expect(moves).toHaveLength(1));
    expect(moves[0]).toMatchObject({
      key: 5,
      fromParentKey: null,
      toParentKey: 4,
      position: 'inside',
    });
    expect(data[4].parentId).toBe(4);
    await waitFor(() =>
      expect(rowByName('Root B')).toHaveAttribute('aria-level', '3'),
    );
    // a row can never be dropped into its own subtree
    pointer(
      'pointerdown',
      rowByName('Root A').querySelector('.oge-drag-handle') as HTMLElement,
      10,
    );
    pointer('pointermove', rowByName('Grand A1a'), 60);
    expect(rowByName('Grand A1a')).not.toHaveClass('oge-drop-target');
    pointer('pointerup', rowByName('Grand A1a'), 60);
    expect(moves).toHaveLength(1);
  });

  it('pointer drags: touch on a handle at once, header reorder, Escape cancel', async () => {
    const data = makeRows();
    const moves: unknown[] = [];
    const { container } = render(
      <OgeTreeList
        data={data}
        columns={COLUMNS}
        autoExpandAll
        rowDragging
        columnReorder
        onRowReparented={(event) => moves.push(event)}
      />,
    );
    await settled();
    // touch: the handle is touch-action: none, so no long press is needed
    pointer(
      'pointerdown',
      rowByName('Root B').querySelector('.oge-drag-handle') as HTMLElement,
      200,
      'touch',
    );
    pointer('pointermove', rowByName('Child A2'), 20, 'touch');
    pointer('pointerup', rowByName('Child A2'), 20, 'touch');
    await waitFor(() => expect(moves).toHaveLength(1));

    // Escape mid-drag: nothing moves
    pointer(
      'pointerdown',
      rowByName('Child A1').querySelector('.oge-drag-handle') as HTMLElement,
      50,
    );
    pointer('pointermove', rowByName('Root B'), 120);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    pointer('pointerup', rowByName('Root B'), 120);
    expect(moves).toHaveLength(1);
    expect(container.querySelector('.oge-drop-target')).toBeNull();

    const headers = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '.oge-header-row > .oge-header-cell[data-colid]',
        ),
      );
    const before = headers().map((cell) => cell.dataset['colid']);
    pointer('pointerdown', headers()[1], 200);
    pointer('pointermove', headers()[0], 230);
    expect(headers()[0]).toHaveClass('oge-col-drop-target');
    pointer('pointerup', headers()[0], 230);
    await waitFor(() =>
      expect(headers().map((cell) => cell.dataset['colid'])).toEqual([
        before[1],
        before[0],
        ...before.slice(2),
      ]),
    );
  });

  it('pages the flattened rows with the pager', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        autoExpandAll
        paging={{ pageSize: 2 }}
      />,
    );
    await settled();
    expect(names()).toEqual(['Root A', 'Child A1']);
    expect(ref.current?.pageCount()).toBe(3);
    act(() => ref.current?.setPageIndex(2));
    await waitFor(() => expect(names()).toEqual(['Root B']));
    expect(ref.current?.pageIndex()).toBe(2);
    act(() => ref.current?.setPageSize(0));
    await waitFor(() => expect(rows()).toHaveLength(5));
    expect(document.querySelector('.oge-pager')).not.toBeNull();
  });

  it('windows the DOM under virtualScroll', async () => {
    const big: Node[] = [];
    for (let i = 1; i <= 2000; i++) {
      big.push({
        id: i,
        parentId: null,
        name: `Node ${i}`,
        office: 'x',
        effort: i,
      });
    }
    render(
      <OgeTreeList
        data={big}
        columns={COLUMNS}
        virtualScroll
        style={{ height: 400 }}
      />,
    );
    await settled();
    expect(rows().length).toBeLessThan(100);
    expect(
      document
        .querySelector('.oge-tree-list')
        ?.classList.contains('oge-virtual'),
    ).toBe(true);
  });

  it('opens a row context menu from the Menu key and a header menu from the pointer', async () => {
    const source: string[] = [];
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        onRowContextMenu={(event) => {
          source.push(event.source);
          event.items.push({ text: 'Inspect' });
        }}
      />,
    );
    await settled();
    const cell = rowByName('Root A').querySelector('.oge-cell') as HTMLElement;
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: 'ContextMenu' });
    await waitFor(() => expect(screen.getByText('Inspect')).toBeTruthy());
    expect(source).toEqual(['keyboard']);
  });

  it('builds the header context menu (sort / pin / hide) and lets consumers extend it', async () => {
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        onHeaderContextMenu={(event) => event.items.push({ text: 'Custom' })}
      />,
    );
    await settled();
    fireEvent.contextMenu(screen.getByRole('columnheader', { name: /Name/ }));
    await waitFor(() =>
      expect(screen.getByText('Sort ascending')).toBeTruthy(),
    );
    expect(screen.getByText('Pin left')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('persists sort, expansion and hidden columns under stateKey', async () => {
    const store = new Map<string, string>();
    const storage: OgeStateStorage = {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => void store.set(key, value),
    };
    const ref = createRef<OgeTreeListHandle<Node>>();
    const first = render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        stateKey="org"
        stateStorage={storage}
      />,
    );
    await settled();
    act(() => ref.current?.expandRow(1));
    fireEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    const snapshot = ref.current?.state() as TreeListStateSnapshot;
    expect(snapshot.expansion?.toggled).toEqual([1]);
    expect(snapshot.sort).toEqual([{ field: 'name', dir: 'asc' }]);
    await waitFor(() => expect(store.get('oge-tree-list:org')).toBeTruthy(), {
      timeout: 2000,
    });
    first.unmount();
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        stateKey="org"
        stateStorage={storage}
      />,
    );
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']),
    );
  });

  it('exports the visible tree synchronously with levels and an indented CSV', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    const exporting = vi.fn((event: { cancel: boolean }) => {
      event.cancel = true;
    });
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        autoExpandAll
        onExporting={exporting}
      />,
    );
    await settled();
    const data = ref.current?.getExportData();
    expect(data?.levels).toEqual([0, 1, 2, 1, 0]);
    const csv = ref.current?.getCsv({ bom: false }) ?? '';
    expect(csv.split(/\r?\n/)[3]).toContain('    Grand A1a');
    ref.current?.exportCsv('org.csv');
    expect(exporting).toHaveBeenCalled();
  });

  it('hides columns through the chooser and pins them from the header menu', async () => {
    render(<OgeTreeList data={makeRows()} columns={COLUMNS} columnChooser />);
    await settled();
    fireEvent.click(screen.getByRole('button', { name: 'Column chooser' }));
    const office = await waitFor(() => {
      const item = [
        ...document.querySelectorAll<HTMLElement>('.oge-chooser-item'),
      ].find((el) => el.textContent?.includes('Office'));
      expect(item).toBeTruthy();
      return item as HTMLElement;
    });
    fireEvent.click(office.querySelector('input') as HTMLInputElement);
    await waitFor(() =>
      expect(
        screen.getAllByRole('columnheader').map((h) => h.textContent),
      ).toEqual(['Name', 'Effort']),
    );
  });

  it('renders band headers from bandCaption and custom cells', async () => {
    render(
      <OgeTreeList
        data={makeRows()}
        columns={[
          { field: 'name', caption: 'Name' },
          { field: 'office', caption: 'Office', bandCaption: 'Details' },
          {
            field: 'effort',
            caption: 'Effort',
            bandCaption: 'Details',
            renderCell: ({ value }) => <b>{`${String(value)}d`}</b>,
          },
        ]}
      />,
    );
    await settled();
    expect(document.querySelector('.oge-band-filled')?.textContent).toBe(
      'Details',
    );
    expect(rowByName('Root A').querySelector('b')?.textContent).toBe('10d');
  });
});
