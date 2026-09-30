import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import type { RowKey } from '@oge-ui/core';
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

describe('OgeTreeList', () => {
  it('renders flat parentId data as a collapsed treegrid with full ARIA', async () => {
    render(<OgeTreeList data={makeRows()} columns={COLUMNS} ariaLabel="Org" />);
    await settled();
    expect(names()).toEqual(['Root A', 'Root B']);
    const tree = screen.getByRole('treegrid', { name: 'Org' });
    expect(tree).toHaveAttribute('aria-rowcount', '3');
    const rootA = rowByName('Root A');
    expect(rootA).toHaveAttribute('aria-level', '1');
    expect(rootA).toHaveAttribute('aria-posinset', '1');
    expect(rootA).toHaveAttribute('aria-setsize', '2');
    expect(rootA).toHaveAttribute('aria-expanded', 'false');
    expect(rowByName('Root B')).not.toHaveAttribute('aria-expanded');
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent),
    ).toEqual(['Name', 'Office', 'Effort']);
  });

  it('expands via the expander with the cancelable pipeline and reports it', async () => {
    const log: string[] = [];
    let veto = true;
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        onRowExpanding={(event) => {
          log.push(`expanding:${String(event.key)}`);
          event.cancel = veto;
        }}
        onRowExpanded={(event) => log.push(`expanded:${String(event.key)}`)}
        onRowCollapsed={(event) => log.push(`collapsed:${String(event.key)}`)}
      />,
    );
    await settled();
    fireEvent.click(expanderOf('Root A'));
    expect(names()).toEqual(['Root A', 'Root B']);
    veto = false;
    fireEvent.click(expanderOf('Root A'));
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']),
    );
    expect(rowByName('Child A1')).toHaveAttribute('aria-level', '2');
    fireEvent.click(expanderOf('Root A'));
    await waitFor(() => expect(names()).toEqual(['Root A', 'Root B']));
    expect(log).toEqual([
      'expanding:1',
      'expanding:1',
      'expanded:1',
      'collapsed:1',
    ]);
  });

  it('autoExpandAll starts open and the controlled expandedRowKeys pair round-trips', async () => {
    const changes: RowKey[][] = [];
    function Host() {
      const [keys, setKeys] = useState<readonly RowKey[]>([1]);
      return (
        <>
          <button type="button" onClick={() => setKeys([1, 2])}>
            deep
          </button>
          <OgeTreeList
            data={makeRows()}
            columns={COLUMNS}
            expandedRowKeys={keys}
            onExpandedRowKeysChange={(next) => {
              changes.push(next);
              setKeys(next);
            }}
          />
        </>
      );
    }
    render(<Host />);
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']),
    );
    fireEvent.click(screen.getByText('deep'));
    await waitFor(() => expect(names()).toContain('Grand A1a'));
    fireEvent.click(expanderOf('Root A'));
    await waitFor(() => expect(names()).toEqual(['Root A', 'Root B']));
    expect(changes.at(-1)?.sort()).toEqual([2]);

    const auto = render(
      <OgeTreeList data={makeRows()} columns={COLUMNS} autoExpandAll />,
    );
    await waitFor(() =>
      expect(auto.container.querySelectorAll('.oge-row')).toHaveLength(5),
    );
  });

  it('sorts siblings within their parent (the hierarchy never breaks)', async () => {
    render(<OgeTreeList data={makeRows()} columns={COLUMNS} autoExpandAll />);
    await waitFor(() => expect(rows()).toHaveLength(5));
    const name = screen.getByRole('columnheader', { name: /Name/ });
    fireEvent.click(name);
    fireEvent.click(name);
    await waitFor(() =>
      expect(names()).toEqual([
        'Root B',
        'Root A',
        'Child A2',
        'Child A1',
        'Grand A1a',
      ]),
    );
    expect(name).toHaveAttribute('aria-sort', 'descending');
  });

  it('navigates the treegrid with the keyboard (Right/Left expand, collapse, parent jump)', async () => {
    render(<OgeTreeList data={makeRows()} columns={COLUMNS} />);
    await settled();
    const firstCell = rowByName('Root A').querySelector(
      '[data-cell="0-0"]',
    ) as HTMLElement;
    // roving tabindex: exactly one cell is in the Tab sequence at first paint
    expect(firstCell).toHaveAttribute('tabindex', '0');
    act(() => firstCell.focus());
    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']),
    );
    fireEvent.keyDown(firstCell, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        rowByName('Child A1').querySelector('[data-cell="1-0"]'),
      ),
    );
    // Left on a collapsed child jumps to its parent
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'ArrowLeft',
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        rowByName('Root A').querySelector('[data-cell="0-0"]'),
      ),
    );
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'ArrowLeft',
    });
    await waitFor(() => expect(names()).toEqual(['Root A', 'Root B']));
  });

  it('supports nested payloads through itemsExpr', async () => {
    const nested = [
      {
        id: 1,
        name: 'Root',
        items: [
          { id: 2, name: 'Leaf 1' },
          { id: 3, name: 'Leaf 2', items: [{ id: 4, name: 'Deep' }] },
        ],
      },
    ];
    render(
      <OgeTreeList
        data={nested}
        itemsExpr="items"
        autoExpandAll
        columns={[{ field: 'name' }]}
      />,
    );
    await waitFor(() =>
      expect(names()).toEqual(['Root', 'Leaf 1', 'Leaf 2', 'Deep']),
    );
    expect(rowByName('Deep')).toHaveAttribute('aria-level', '3');
  });

  it('exposes the imperative handle (expand/collapse, focusRow, nodes, counts)', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(<OgeTreeList ref={ref} data={makeRows()} columns={COLUMNS} />);
    await settled();
    const handle = ref.current as OgeTreeListHandle<Node>;
    act(() => handle.expandAll());
    await waitFor(() => expect(rows()).toHaveLength(5));
    expect(handle.isRowExpanded(2)).toBe(true);
    act(() => handle.collapseAll());
    await waitFor(() => expect(rows()).toHaveLength(2));
    act(() => handle.focusRow(3));
    await waitFor(() => expect(names()).toContain('Grand A1a'));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        rowByName('Grand A1a').querySelector('.oge-cell'),
      ),
    );
    expect(handle.getNodeByKey(3)?.name).toBe('Grand A1a');
    const seen: [RowKey, RowKey | null][] = [];
    handle.forEachNode((_row, key, parent) => seen.push([key, parent]));
    expect(seen).toContainEqual([3, 2]);
    // focusRow expanded the whole ancestor chain (Root A and Child A1)
    expect(handle.totalCount()).toBe(5);
    expect(handle.getVisibleRows().map((row) => row.name)).toEqual([
      'Root A',
      'Child A1',
      'Grand A1a',
      'Child A2',
      'Root B',
    ]);
  });

  it('shows the no-data state and the custom load panel', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={[]}
        columns={COLUMNS}
        renderNoData={() => <em>Nothing here</em>}
      />,
    );
    await waitFor(() => expect(screen.getByText('Nothing here')).toBeTruthy());
    act(() => ref.current?.beginCustomLoading('Crunching'));
    expect(screen.getByRole('status')).toHaveTextContent('Crunching');
    act(() => ref.current?.endCustomLoading());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('fires onContentReady once per result set', async () => {
    const ready = vi.fn();
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        onContentReady={ready}
      />,
    );
    await settled();
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1));
  });

  it('survives StrictMode double effects', async () => {
    render(
      <StrictMode>
        <OgeTreeList data={makeRows()} columns={COLUMNS} autoExpandAll />
      </StrictMode>,
    );
    await waitFor(() => expect(rows()).toHaveLength(5));
    fireEvent.click(expanderOf('Root A'));
    await waitFor(() => expect(names()).toEqual(['Root A', 'Root B']));
  });
});
