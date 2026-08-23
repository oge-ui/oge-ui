import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import type { DataSource, LoadOptions, RowKey } from '@oge-ui/core';
import { OgeGrid } from './grid';
import { OgeGridConfigProvider } from './grid-config';
import type { OgeGridHandle } from './grid-types';

interface Person {
  id: number;
  name: string;
  age: number;
  active: boolean;
}

const people: Person[] = [
  { id: 1, name: 'Ada', age: 36, active: true },
  { id: 2, name: 'Grace', age: 85, active: false },
  { id: 3, name: 'Linus', age: 54, active: true },
  { id: 4, name: 'Margaret', age: 87, active: true },
];

const columns = [
  { field: 'id', caption: '#', dataType: 'number' as const, width: 60 },
  { field: 'name', caption: 'Name' },
  { field: 'age', caption: 'Age', dataType: 'number' as const },
];

const rows = () =>
  screen.getAllByRole('row').filter((row) => row.classList.contains('oge-row'));
const cellTexts = (col: number) =>
  rows().map((row) => within(row).getAllByRole('gridcell')[col].textContent);

async function settled(): Promise<void> {
  await waitFor(() => expect(rows().length).toBeGreaterThan(0));
}

describe('OgeGrid', () => {
  it('renders array data with the declared columns', async () => {
    render(<OgeGrid data={people} keyField="id" columns={columns} />);
    await settled();
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent),
    ).toEqual(['#', 'Name', 'Age']);
    expect(cellTexts(1)).toEqual(['Ada', 'Grace', 'Linus', 'Margaret']);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5');
  });

  it('derives columns from the first row and humanizes captions', async () => {
    render(<OgeGrid data={[{ firstName: 'Ada', id: 1 }]} keyField="id" />);
    await settled();
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent),
    ).toEqual(['First Name', 'Id']);
  });

  it('sorts on header click, cycles through desc and clears, and chains with shift', async () => {
    render(<OgeGrid data={people} keyField="id" columns={columns} />);
    await settled();
    const age = screen.getByRole('columnheader', { name: /Age/ });
    fireEvent.click(age);
    await waitFor(() => expect(cellTexts(2)).toEqual(['36', '54', '85', '87']));
    expect(age).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(age);
    await waitFor(() => expect(cellTexts(2)).toEqual(['87', '85', '54', '36']));
    expect(age).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(age);
    await waitFor(() => expect(age).toHaveAttribute('aria-sort', 'none'));
    // multi-sort keeps the first field in the chain
    fireEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    fireEvent.click(age, { shiftKey: true });
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('columnheader')
          .filter((h) => h.getAttribute('aria-sort') !== 'none'),
      ).toHaveLength(2),
    );
  });

  it('pages with the pager and reports counts through the handle', async () => {
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={people}
        keyField="id"
        columns={columns}
        paging={{ pageSize: 3 }}
      />,
    );
    await settled();
    expect(cellTexts(1)).toEqual(['Ada', 'Grace', 'Linus']);
    expect(ref.current?.pageCount()).toBe(2);
    expect(ref.current?.totalCount()).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(cellTexts(1)).toEqual(['Margaret']));
    expect(ref.current?.pageIndex()).toBe(1);
    act(() => ref.current?.setPageSize(0));
    await waitFor(() => expect(rows()).toHaveLength(4));
  });

  it('filters through the filter row and resets the page', async () => {
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        filterRow
        filterDebounce={0}
        paging={{ pageSize: 2 }}
      />,
    );
    await settled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(cellTexts(1)).toEqual(['Linus', 'Margaret']));
    const nameFilter = screen.getByLabelText('Filter Name');
    fireEvent.change(nameFilter, { target: { value: 'ar' } });
    await waitFor(() => expect(cellTexts(1)).toEqual(['Margaret']));
    expect(screen.getByText('1 rows')).toBeInTheDocument();
  });

  it('searches across the visible columns from the search panel', async () => {
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        searchPanel
        filterDebounce={0}
      />,
    );
    await settled();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'lin' },
    });
    await waitFor(() => expect(cellTexts(1)).toEqual(['Linus']));
  });

  it('selects rows: click, ctrl-toggle, shift-range and the callbacks', async () => {
    const onSelectionChanged = vi.fn();
    const onSelectedKeysChange = vi.fn();
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        selectionMode="multiple"
        onSelectionChanged={onSelectionChanged}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await settled();
    fireEvent.click(rows()[0]);
    await waitFor(() =>
      expect(rows()[0]).toHaveAttribute('aria-selected', 'true'),
    );
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith([1]);
    fireEvent.click(rows()[2], { ctrlKey: true });
    await waitFor(() =>
      expect(onSelectedKeysChange).toHaveBeenLastCalledWith([1, 3]),
    );
    expect(onSelectionChanged).toHaveBeenLastCalledWith({
      selectedKeys: [1, 3],
      addedKeys: [3],
      removedKeys: [],
    });
    fireEvent.click(rows()[3], { shiftKey: true });
    await waitFor(() =>
      expect(onSelectedKeysChange).toHaveBeenLastCalledWith([3, 4]),
    );
  });

  it('checkbox mode: header select-all and Ctrl+A', async () => {
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={people}
        keyField="id"
        columns={columns}
        selectionMode="checkbox"
      />,
    );
    await settled();
    const boxes = () => rows().map((row) => within(row).getByRole('checkbox'));
    fireEvent.click(boxes()[1]);
    await waitFor(() => expect(boxes()[1]).toBeChecked());
    expect(ref.current?.getSelectedRowsData()).toEqual([people[1]]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    await waitFor(() =>
      expect(ref.current?.getSelectedRowsData()).toHaveLength(4),
    );
    act(() => ref.current?.clearSelection());
    await waitFor(() =>
      expect(boxes().every((b) => !(b as HTMLInputElement).checked)).toBe(true),
    );
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'a', ctrlKey: true });
    await waitFor(() =>
      expect(ref.current?.getSelectedRowsData()).toHaveLength(4),
    );
  });

  it('controlled selectedKeys drive the selection', async () => {
    function Owner() {
      const [keys, setKeys] = useState<readonly RowKey[]>([2]);
      return (
        <>
          <button type="button" onClick={() => setKeys([4])}>
            pick
          </button>
          <OgeGrid
            data={people}
            keyField="id"
            columns={columns}
            selectionMode="single"
            selectedKeys={keys}
            onSelectedKeysChange={setKeys}
          />
        </>
      );
    }
    render(<Owner />);
    await settled();
    expect(rows()[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByText('pick'));
    await waitFor(() =>
      expect(rows()[3]).toHaveAttribute('aria-selected', 'true'),
    );
    expect(rows()[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('roving tabindex + arrow keys move the focused cell and the focused row', async () => {
    const onFocusedRowChanged = vi.fn();
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        focusedRowEnabled
        onFocusedRowChanged={onFocusedRowChanged}
      />,
    );
    await settled();
    const firstCell = within(rows()[0]).getAllByRole('gridcell')[0];
    expect(firstCell).toHaveAttribute('tabindex', '0');
    act(() => firstCell.focus());
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowDown' });
    await waitFor(() =>
      expect(within(rows()[1]).getAllByRole('gridcell')[0]).toHaveAttribute(
        'tabindex',
        '0',
      ),
    );
    expect(rows()[1]).toHaveClass('oge-row-focused');
    expect(onFocusedRowChanged).toHaveBeenCalledWith({
      key: 2,
      row: people[1],
    });
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'End' });
    await waitFor(() =>
      expect(within(rows()[1]).getAllByRole('gridcell')[2]).toHaveAttribute(
        'tabindex',
        '0',
      ),
    );
  });

  it('render props replace cell and header content', async () => {
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={[
          {
            field: 'name',
            renderHeader: ({ caption }) => <em>{caption}!</em>,
            renderCell: ({ value, row }) => (
              <b>
                {String(value)}-{row.age}
              </b>
            ),
          },
        ]}
      />,
    );
    await settled();
    expect(screen.getByRole('columnheader')).toHaveTextContent('Name!');
    expect(cellTexts(0)).toEqual([
      'Ada-36',
      'Grace-85',
      'Linus-54',
      'Margaret-87',
    ]);
  });

  it('shows the no-data state and the config messages', async () => {
    render(
      <OgeGridConfigProvider config={{ messages: { noData: 'Veri yok' } }}>
        <OgeGrid data={[]} columns={columns} />
      </OgeGridConfigProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Veri yok')).toBeInTheDocument(),
    );
  });

  it('loads from a DataSource with switchMap semantics and reports errors', async () => {
    const calls: LoadOptions[] = [];
    const source: DataSource<Person> = {
      capabilities: {
        sort: true,
        filter: true,
        group: false,
        paging: true,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: (options) => {
        calls.push(options);
        if (options.sort?.length) return Promise.reject(new Error('boom'));
        return Promise.resolve({ data: people.slice(0, 2), totalCount: 4 });
      },
    };
    const onDataErrorOccurred = vi.fn();
    render(
      <OgeGrid
        data={source}
        columns={columns}
        paging={{ pageSize: 2 }}
        onDataErrorOccurred={onDataErrorOccurred}
      />,
    );
    await settled();
    expect(calls[0]).toMatchObject({
      skip: 0,
      take: 2,
      requireTotalCount: true,
    });
    expect(screen.getByText('4 rows')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    await waitFor(() =>
      expect(onDataErrorOccurred).toHaveBeenCalledWith({
        error: expect.any(Error),
      }),
    );
  });

  it('virtualizes rows inside a bounded viewport', async () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      name: `p${i}`,
      age: i,
      active: true,
    }));
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 200,
    });
    render(
      <OgeGrid
        data={many}
        keyField="id"
        columns={columns}
        virtualScroll
        rowHeight={20}
        overscan={2}
        style={{ height: 200 }}
      />,
    );
    await settled();
    expect(rows().length).toBeLessThan(30);
    const grid = screen.getByRole('grid');
    Object.defineProperty(grid, 'scrollTop', {
      configurable: true,
      value: 4000,
    });
    fireEvent.scroll(grid);
    await waitFor(() => expect(cellTexts(1)[0]).not.toBe('p0'));
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 0,
    });
  });

  it('persists and restores state under a stateKey', async () => {
    const store = new Map<string, string>();
    const storage = {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, v: string) => void store.set(k, v),
    };
    const first = render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        stateKey="t"
        stateStorage={storage}
      />,
    );
    await settled();
    fireEvent.click(screen.getByRole('columnheader', { name: /Age/ }));
    await waitFor(
      () => expect(store.get('oge-grid:t')).toContain('"field":"age"'),
      { timeout: 1500 },
    );
    first.unmount();
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        stateKey="t"
        stateStorage={storage}
      />,
    );
    await waitFor(() => expect(cellTexts(2)).toEqual(['36', '54', '85', '87']));
  });

  it('exports CSV of the filtered set and the selection', async () => {
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={people}
        keyField="id"
        columns={columns}
        selectionMode="multiple"
        paging={{ pageSize: 2 }}
      />,
    );
    await settled();
    const handle = ref.current as OgeGridHandle<Person>;
    const csv = await handle.getCsv({ bom: false });
    expect(csv.split(/\r?\n/).filter(Boolean)).toHaveLength(5);
    fireEvent.click(rows()[0]);
    await waitFor(() => expect(ref.current?.isRowSelected(1)).toBe(true));
    const selection = await handle.getCsv({ bom: false, scope: 'selection' });
    expect(selection).toContain('Ada');
    expect(selection).not.toContain('Grace');
  });

  it('survives StrictMode double effects', async () => {
    render(
      <StrictMode>
        <OgeGrid data={people} keyField="id" columns={columns} />
      </StrictMode>,
    );
    await settled();
    expect(rows()).toHaveLength(4);
  });
});
