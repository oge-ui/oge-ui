import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import type {
  OgeGridRowToggleEvent,
  OgeGridRowTogglingEvent,
} from '@oge-ui/behavior';
import { OgeGrid } from './grid';
import type {
  OgeContextMenuEvent,
  OgeGridColumnProps,
  OgeGridHandle,
  OgeHeaderContextMenuEvent,
} from './grid-types';

/**
 * Mirror of the Angular `grid-console-parity.spec.ts`: keyboard context
 * menus, immediate sort/page callbacks, column alignment, evented
 * group/detail toggles, focused-cell callbacks, the imperative column chooser
 * and programmatic total-summary values.
 */

interface Sale {
  id: number;
  region: string;
  city: string;
  amount: number;
  code: number;
}

const SALES: Sale[] = [
  { id: 1, region: 'EU', city: 'Berlin', amount: 100, code: 7 },
  { id: 2, region: 'EU', city: 'Paris', amount: 200, code: 8 },
  { id: 3, region: 'US', city: 'NYC', amount: 300, code: 9 },
];

const COLUMNS: OgeGridColumnProps<Sale>[] = [
  { field: 'id', dataType: 'number', width: 70 },
  { field: 'region', alignment: 'center' },
  { field: 'city' },
  { field: 'amount', dataType: 'number', totalSummary: 'sum' },
  { field: 'code', dataType: 'number', alignment: 'start' },
];

const dataRows = () =>
  [...document.querySelectorAll('.oge-rows .oge-row')] as HTMLElement[];
const header = (id: string) =>
  document.querySelector(`.oge-header-cell[data-colid="${id}"]`) as HTMLElement;

function press(target: Element, init: KeyboardEventInit): boolean {
  return fireEvent.keyDown(target, {
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

describe('OgeGrid (React) — console parity', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('column alignment: numbers default to end, explicit values win', async () => {
    render(<OgeGrid data={SALES} keyField="id" columns={COLUMNS} />);
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const classes = (el: Element) => ({
      end: el.classList.contains('oge-align-end'),
      center: el.classList.contains('oge-align-center'),
    });
    expect(classes(header('id'))).toEqual({ end: true, center: false });
    expect(classes(header('region'))).toEqual({ end: false, center: true });
    expect(classes(header('city'))).toEqual({ end: false, center: false });
    expect(classes(header('code'))).toEqual({ end: false, center: false });
    const cells = dataRows()[0].querySelectorAll('.oge-cell');
    expect(cells[0].classList.contains('oge-align-end')).toBe(true);
    expect(cells[1].classList.contains('oge-align-center')).toBe(true);
    expect(cells[4].classList.contains('oge-cell-number')).toBe(true);
    expect(cells[4].classList.contains('oge-align-end')).toBe(false);
  });

  it('Shift+F10 on a body cell opens the row menu from the keyboard, echo swallowed', async () => {
    const events: OgeContextMenuEvent<Sale>[] = [];
    render(
      <OgeGrid
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        onRowContextMenu={(e) => {
          events.push(e);
          e.items.push({ text: 'Open' });
        }}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const cell = dataRows()[1].querySelector('.oge-cell') as HTMLElement;
    const notPrevented = press(cell, { key: 'F10', shiftKey: true });
    expect(notPrevented).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      key: 2,
      row: SALES[1],
      source: 'keyboard',
    });
    await waitFor(() =>
      expect(document.querySelector('.oge-menu-list')?.textContent).toContain(
        'Open',
      ),
    );
    // the native echo is swallowed …
    fireEvent.contextMenu(cell, { button: 0 });
    expect(events).toHaveLength(1);
    // … a real right-click is not
    fireEvent.contextMenu(cell, { button: 2 });
    expect(events.map((e) => e.source)).toEqual(['keyboard', 'pointer']);
  });

  it('the Menu key on a header opens the header menu with the built-ins', async () => {
    const events: OgeHeaderContextMenuEvent[] = [];
    render(
      <OgeGrid
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        onHeaderContextMenu={(e) => events.push(e)}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    press(header('city'), { key: 'ContextMenu' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ field: 'city', source: 'keyboard' });
    expect(events[0].items.length).toBeGreaterThan(0);
  });

  it('a right-click on a standard data row reaches onRowContextMenu', async () => {
    const events: OgeContextMenuEvent<Sale>[] = [];
    render(
      <OgeGrid
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        onRowContextMenu={(e) => events.push(e)}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    fireEvent.contextMenu(
      dataRows()[2].querySelector('.oge-cell') as HTMLElement,
      {
        button: 2,
        clientX: 40,
        clientY: 50,
      },
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      key: 3,
      source: 'pointer',
      clientX: 40,
      clientY: 50,
    });
  });

  it('leaves the keys alone outside a cell', async () => {
    const events: unknown[] = [];
    render(
      <OgeGrid
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        columnChooser
        onRowContextMenu={(e) => events.push(e)}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const button = document.querySelector('.oge-chooser-button') as HTMLElement;
    expect(press(button, { key: 'F10', shiftKey: true })).toBe(true);
    expect(events).toHaveLength(0);
  });

  it('onSortChanged fires with the previous sort; the initial sort is not a change', async () => {
    const onSortChanged = vi.fn();
    const ref = createRef<OgeGridHandle<Sale>>();
    render(
      <OgeGrid
        ref={ref}
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        onSortChanged={onSortChanged}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    expect(onSortChanged).not.toHaveBeenCalled();
    fireEvent.click(header('city'));
    await waitFor(() =>
      expect(onSortChanged).toHaveBeenCalledWith({
        sort: [{ field: 'city', dir: 'asc' }],
        previousSort: [],
      }),
    );
    act(() => ref.current?.clearSorting());
    await waitFor(() =>
      expect(onSortChanged).toHaveBeenLastCalledWith({
        sort: [],
        previousSort: [{ field: 'city', dir: 'asc' }],
      }),
    );
  });

  it('onPageChanged reports index moves', async () => {
    const onPageChanged = vi.fn();
    const ref = createRef<OgeGridHandle<Sale>>();
    render(
      <OgeGrid
        ref={ref}
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        paging={{ pageSize: 2 }}
        onPageChanged={onPageChanged}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    expect(onPageChanged).not.toHaveBeenCalled();
    act(() => ref.current?.setPageIndex(1));
    await waitFor(() =>
      expect(onPageChanged).toHaveBeenCalledWith({
        pageIndex: 1,
        pageSize: 2,
        previousPageIndex: 0,
        previousPageSize: 2,
      }),
    );
  });

  it('group toggles are evented and vetoable', async () => {
    const log: string[] = [];
    let veto = true;
    render(
      <OgeGrid
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        groupBy={['region']}
        onRowCollapsing={(e: OgeGridRowTogglingEvent<Sale>) => {
          log.push(`collapsing:${e.kind}`);
          e.cancel = veto;
        }}
        onRowCollapsed={(e) => log.push(`collapsed:${e.kind}`)}
        onRowExpanding={(e) => log.push(`expanding:${e.kind}`)}
        onRowExpanded={(e) => log.push(`expanded:${e.kind}`)}
      />,
    );
    const group = () => document.querySelector('.oge-group-row') as HTMLElement;
    await waitFor(() => expect(group()).toBeTruthy());
    fireEvent.click(group());
    expect(log).toEqual(['collapsing:group']);
    expect(group().getAttribute('aria-expanded')).toBe('true');
    veto = false;
    fireEvent.click(group());
    await waitFor(() =>
      expect(group().getAttribute('aria-expanded')).toBe('false'),
    );
    fireEvent.click(group());
    expect(log).toEqual([
      'collapsing:group',
      'collapsing:group',
      'collapsed:group',
      'expanding:group',
      'expanded:group',
    ]);
  });

  it('detail toggles carry the row, from the expander and expandRow()', async () => {
    const expanded: OgeGridRowToggleEvent<Sale>[] = [];
    const ref = createRef<OgeGridHandle<Sale>>();
    render(
      <OgeGrid
        ref={ref}
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        renderDetail={({ row }) => <p>detail {row.id}</p>}
        onRowExpanded={(e) => expanded.push(e)}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    fireEvent.click(document.querySelector('.oge-expander-btn') as HTMLElement);
    act(() => ref.current?.expandRow(3));
    act(() => ref.current?.expandRow(3)); // already expanded: no event
    expect(expanded).toEqual([
      { key: 1, kind: 'detail', row: SALES[0] },
      { key: 3, kind: 'detail', row: SALES[2] },
    ]);
  });

  it('onFocusedCellChanged reports the cell, its row and its field', async () => {
    const onFocusedCellChanged = vi.fn();
    render(
      <OgeGrid
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        onFocusedCellChanged={onFocusedCellChanged}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const cells = dataRows()[0].querySelectorAll('.oge-cell');
    fireEvent.focus(cells[0]);
    await waitFor(() => expect(onFocusedCellChanged).toHaveBeenCalledTimes(1));
    fireEvent.focus(cells[1]);
    await waitFor(() =>
      expect(onFocusedCellChanged).toHaveBeenLastCalledWith({
        rowIndex: 0,
        columnIndex: 1,
        key: 1,
        row: SALES[0],
        field: 'region',
      }),
    );
  });

  it('showColumnChooser() / hideColumnChooser() and getTotalSummaryValue()', async () => {
    const ref = createRef<OgeGridHandle<Sale>>();
    render(
      <OgeGrid
        ref={ref}
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        columnChooser
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    act(() => ref.current?.showColumnChooser());
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-chooser-popup')).toHaveLength(1),
    );
    act(() => ref.current?.showColumnChooser()); // idempotent
    expect(document.querySelectorAll('.oge-chooser-popup')).toHaveLength(1);
    act(() => ref.current?.hideColumnChooser());
    await waitFor(() =>
      expect(document.querySelector('.oge-chooser-popup')).toBeNull(),
    );

    expect(ref.current?.getTotalSummaryValue('amount')).toBe(600);
    expect(ref.current?.getTotalSummaryValue('amount', 'sum')).toBe(600);
    expect(ref.current?.getTotalSummaryValue('amount', 'avg')).toBeUndefined();
    expect(ref.current?.getTotalSummaryValue('city')).toBeUndefined();
  });
});
