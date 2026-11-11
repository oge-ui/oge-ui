import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import type { LoadOptions, OgeStateMigration } from '@oge-ui/core';
import { CustomDataSource } from '@oge-ui/core';
import type { OgeRowDragStartEvent } from '@oge-ui/behavior';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps, OgeGridHandle } from './grid-types';

interface Person {
  id: number;
  first: string;
  last: string;
  status: number;
  city: string;
}

const STATUS = [
  { value: 0, text: 'Active' },
  { value: 1, text: 'On leave' },
  { value: 2, text: 'Former' },
];

const PEOPLE: Person[] = [
  { id: 1, first: 'Ada', last: 'Kaya', status: 2, city: 'İzmir' },
  { id: 2, first: 'Can', last: 'Öz', status: 0, city: 'Ilgın' },
  { id: 3, first: 'Ece', last: 'Işık', status: 1, city: 'ırmak' },
  { id: 4, first: 'Ali', last: 'Kaya', status: 0, city: 'irmik' },
];

const fullName = (row: Person) => `${row.first} ${row.last}`;
const columns: OgeGridColumnProps<Person>[] = [
  { field: 'first' },
  {
    field: 'name',
    caption: 'Name',
    calculateCellValue: fullName,
    calculateFilterValue: fullName,
  },
  {
    field: 'status',
    lookup: { dataSource: STATUS, valueExpr: 'value', displayExpr: 'text' },
  },
  { field: 'city' },
];
// v0 → v1: the "town" column became "city"
const migrations: OgeStateMigration[] = [
  (state) => JSON.parse(JSON.stringify(state).replaceAll('"town"', '"city"')),
];

const firstNames = () =>
  Array.from(document.querySelectorAll('.oge-rows .oge-row')).map(
    (row) =>
      row.querySelectorAll('.oge-cell:not(.oge-drag-cell)')[0]?.textContent,
  );

function setup(stored?: unknown) {
  const ref = createRef<OgeGridHandle<Person>>();
  const store = new Map<string, string>();
  if (stored) store.set('oge-grid:people', JSON.stringify(stored));
  const drags: OgeRowDragStartEvent<Person>[] = [];
  render(
    <OgeGrid
      ref={ref}
      data={PEOPLE}
      keyField="id"
      columns={columns}
      stateKey="people"
      stateStorage={{
        get: (key) => store.get(key) ?? null,
        set: (key, value) => {
          store.set(key, value);
        },
      }}
      searchPanel
      sorting={{ locale: 'tr' }}
      stateMigrations={migrations}
      rowDragging
      rowDragExternal
      selectionMode="multiple"
      defaultSelectedKeys={[1, 4]}
      onRowDragStart={(event) => drags.push(event)}
    />,
  );
  return { ref, drags };
}

async function search(text: string) {
  fireEvent.change(document.querySelector('.oge-search-input')!, {
    target: { value: text },
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
}

describe('<OgeGrid> display values', () => {
  it('searches lookup labels and calculated filter values', async () => {
    setup();
    await waitFor(() => expect(firstNames()).toHaveLength(4));
    await search('leave');
    await waitFor(() => expect(firstNames()).toEqual(['Ece']));
    await search('ali kaya');
    await waitFor(() => expect(firstNames()).toEqual(['Ali']));
  });

  it('filters a calculated column and sorts in the sorting locale', async () => {
    const { ref } = setup();
    await waitFor(() => expect(firstNames()).toHaveLength(4));
    act(() =>
      ref.current?.applyState({ sort: [{ field: 'city', dir: 'asc' }] }),
    );
    // Turkish: I is the capital of ı, which sorts before i (and İ)
    await waitFor(() =>
      expect(firstNames()).toEqual(['Can', 'Ece', 'Ali', 'Ada']),
    );
    act(() =>
      ref.current?.applyState({
        filter: {
          row: [
            [
              'name',
              { type: 'binary', field: 'name', op: 'contains', value: 'kaya' },
            ],
          ],
        },
      }),
    );
    await waitFor(() => expect(firstNames()).toEqual(['Ali', 'Ada']));
  });

  it('upgrades a stored state and keeps its widths', async () => {
    const { ref } = setup({
      sort: [{ field: 'town', dir: 'desc' }],
      columns: { widths: [['town', 222]] },
    });
    await waitFor(() => expect(ref.current?.state().version).toBe(1));
    const state = ref.current!.state();
    expect(state.sort).toEqual([{ field: 'city', dir: 'desc' }]);
    expect(state.columns?.widths).toEqual([['city', 222]]);
  });

  it('exports the rows the active filters and search leave', async () => {
    const { ref } = setup();
    await waitFor(() => expect(firstNames()).toHaveLength(4));
    act(() =>
      ref.current?.applyState({
        filter: { header: [['status', [0]]], searchText: 'kaya' },
      }),
    );
    await waitFor(() => expect(firstNames()).toEqual(['Ali']));
    const exported = await ref.current!.getExportData();
    expect(exported.rows.map((row) => row.first)).toEqual(['Ali']);
  });

  it('drags rows out with the browser drag data', async () => {
    const { drags } = setup();
    await waitFor(() => expect(firstNames()).toHaveLength(4));
    const handle = document.querySelector(
      '.oge-rows .oge-row .oge-drag-handle',
    ) as HTMLElement;
    expect(handle.getAttribute('draggable')).toBe('true');
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'all',
      setData: (type: string, value: string) => data.set(type, value),
      setDragImage: () => undefined,
    };
    fireEvent.dragStart(handle, { dataTransfer });
    const lines = data.get('text/plain')!.split('\r\n');
    expect(lines[0]).toBe('First\tName\tStatus\tCity');
    expect(lines.slice(1)).toEqual([
      'Ada\tAda Kaya\tFormer\tİzmir',
      'Ali\tAli Kaya\tActive\tirmik',
    ]);
    expect(
      JSON.parse(data.get('application/json')!).map((r: Person) => r.id),
    ).toEqual([1, 4]);
    expect(drags[0].rows?.map((row) => row.id)).toEqual([1, 4]);
  });
});

describe('<OgeGrid> filterField on a server source', () => {
  it('sends filters and value lists under the server field', async () => {
    const loads: LoadOptions[] = [];
    const distinct: string[] = [];
    const source = new CustomDataSource<Person>({
      key: 'id',
      load: async (options) => {
        loads.push(options);
        return { data: PEOPLE, totalCount: PEOPLE.length };
      },
      distinct: async (field) => {
        distinct.push(field);
        return [];
      },
    });
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={source}
        keyField="id"
        headerFilter
        columns={[
          { field: 'name', filterField: 'lastName' },
          { field: 'city' },
        ]}
      />,
    );
    await waitFor(() => expect(loads.length).toBeGreaterThan(0));
    act(() =>
      ref.current?.applyState({
        filter: {
          row: [
            [
              'name',
              { type: 'binary', field: 'name', op: 'startswith', value: 'K' },
            ],
          ],
        },
      }),
    );
    await waitFor(() =>
      expect(loads.at(-1)?.filter).toEqual({
        type: 'binary',
        field: 'lastName',
        op: 'startswith',
        value: 'K',
      }),
    );
    expect(ref.current?.state().filter?.row?.[0][0]).toBe('name');
    fireEvent.click(
      document.querySelector(
        '.oge-header-cell[data-colid="name"] .oge-header-filter-btn',
      )!,
    );
    await waitFor(() => expect(distinct).toEqual(['lastName']));
  });
});
