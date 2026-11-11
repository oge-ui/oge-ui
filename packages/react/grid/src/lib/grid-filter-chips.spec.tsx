import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { ArrayDataSource, CustomDataSource } from '@oge-ui/core';
import type { OgeMenuItem } from '@oge-ui/behavior';
import { OgeGrid } from './grid';
import type { OgeGridHandle } from './grid-types';

interface Line {
  id: number;
  name: string | null;
  city: string | null;
  qty: number;
}

const LINES: Line[] = [
  { id: 1, name: 'Ali Kaya', city: 'Ankara', qty: 2 },
  { id: 2, name: 'Ayşe Demir', city: 'İzmir', qty: 5 },
  { id: 3, name: 'Kaya, Mehmet', city: '', qty: 7 },
  { id: 4, name: 'Zeynep', city: null, qty: 1 },
];

const columns = [
  { field: 'name', caption: 'Name' },
  { field: 'city', caption: 'City' },
  {
    field: 'qty',
    caption: 'Qty',
    dataType: 'number' as const,
    totalSummary: 'sum' as const,
  },
];

const rows = () => document.querySelectorAll('.oge-rows .oge-row');
const names = () =>
  Array.from(rows()).map(
    (row) => row.querySelector('.oge-cell')?.textContent?.trim() ?? '',
  );
const chips = () =>
  Array.from(document.querySelectorAll('.oge-filter-chip')).map((chip) =>
    Array.from(chip.querySelectorAll('span'))
      .map((part) => part.textContent?.trim())
      .join(' '),
  );
const totals = () =>
  Array.from(document.querySelectorAll('.oge-total-cell')).map((cell) =>
    cell.textContent?.trim(),
  );

function setup() {
  const ref = createRef<OgeGridHandle<Line>>();
  const menus: OgeMenuItem[][] = [];
  render(
    <OgeGrid
      ref={ref}
      data={new ArrayDataSource(LINES, { key: 'id' })}
      keyField="id"
      columns={columns}
      filterRow
      filterDebounce={0}
      headerFilter
      searchPanel
      filterChips
      summaryMenu
      onHeaderContextMenu={(event) => menus.push(event.items)}
    />,
  );
  const openMenu = (field: string): OgeMenuItem[] => {
    fireEvent.contextMenu(
      document.querySelector(`.oge-header-cell[data-colid="${field}"]`)!,
    );
    return menus.at(-1) ?? [];
  };
  return { ref, openMenu };
}

describe('<OgeGrid> summary menu, filter chips and value lists', () => {
  it('picks a total from the header menu and persists it', async () => {
    const { ref, openMenu } = setup();
    await waitFor(() => expect(rows().length).toBe(4));
    expect(totals()).toContain('Sum: 15');
    const summary = openMenu('qty').find((item) => item.text === 'Summary');
    expect(summary?.items?.map((item) => item.text)).toEqual([
      'Column default',
      'None',
      'Count',
      'Sum',
      'Avg',
      'Min',
      'Max',
    ]);
    act(() => summary?.items?.find((i) => i.text === 'Max')?.action?.());
    await waitFor(() => expect(totals()).toContain('Max: 7'));
    const text = openMenu('name').find((item) => item.text === 'Summary');
    expect(text?.items?.map((item) => item.text)).toEqual([
      'Column default',
      'None',
      'Count',
    ]);
    act(() => text?.items?.find((i) => i.text === 'Count')?.action?.());
    await waitFor(() => expect(totals()).toContain('Count: 4'));
    expect(ref.current?.state().summaries).toEqual([
      ['qty', 'max'],
      ['name', 'count'],
    ]);
  });

  it('shows a chip per narrowing filter and removes one at a time', async () => {
    const { ref } = setup();
    await waitFor(() => expect(rows().length).toBe(4));
    const input = document.querySelector(
      '.oge-filter-cell input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'kaya' } });
    act(() =>
      ref.current?.applyState({
        ...ref.current.state(),
        filter: {
          ...ref.current.state().filter,
          header: [['city', ['Ankara', null]]],
        },
      }),
    );
    await waitFor(() =>
      expect(chips()).toEqual([
        'Name · Contains · kaya',
        'City · Is any of · Ankara, (Blank)',
      ]),
    );
    expect(names()).toEqual(['Ali Kaya', 'Kaya, Mehmet']);
    const remove = document.querySelector(
      '[data-chip="row:name"] .oge-filter-chip-remove',
    ) as HTMLButtonElement;
    expect(remove.getAttribute('aria-label')).toBe(
      'Remove filter: Name · Contains · kaya',
    );
    fireEvent.click(remove);
    await waitFor(() =>
      expect(chips()).toEqual(['City · Is any of · Ankara, (Blank)']),
    );
    expect(
      (document.querySelector('.oge-filter-cell input') as HTMLInputElement)
        .value,
    ).toBe('');
    fireEvent.click(document.querySelector('.oge-filter-chips-clear')!);
    await waitFor(() =>
      expect(document.querySelector('.oge-filter-chips')).toBeNull(),
    );
    expect(rows()).toHaveLength(4);
  });

  it('lists one "(Blank)" item and says when a list was cut', async () => {
    setup();
    await waitFor(() => expect(rows().length).toBe(4));
    fireEvent.click(document.querySelectorAll('.oge-header-filter-btn')[1]);
    await waitFor(() =>
      expect(
        Array.from(
          document.querySelectorAll('.oge-hf-item:not(.oge-hf-all)'),
        ).map((item) => item.lastElementChild?.textContent?.trim()),
      ).toEqual(['Ankara', 'İzmir', '(Blank)']),
    );
    expect(document.querySelector('.oge-hf-note')).toBeNull();
  });

  it('says when a server value list was cut at valueLimit', async () => {
    const source = new CustomDataSource<Line>({
      key: 'id',
      load: async () => ({ data: LINES, totalCount: LINES.length }),
      distinct: async (_field, options = {}) =>
        Array.from({ length: (options.take ?? 10) + 5 }, (_, i) => `City ${i}`),
    });
    render(
      <OgeGrid
        data={source}
        keyField="id"
        columns={columns}
        headerFilter={{ valueLimit: 3 }}
      />,
    );
    await waitFor(() => expect(rows().length).toBe(4));
    fireEvent.click(document.querySelectorAll('.oge-header-filter-btn')[1]);
    await waitFor(() =>
      expect(document.querySelector('.oge-hf-note')?.textContent).toBe(
        'Showing the first 3 values — type to narrow the list.',
      ),
    );
    expect(
      document.querySelectorAll('.oge-hf-item:not(.oge-hf-all)'),
    ).toHaveLength(3);
  });
});

describe('<OgeGrid> server totals', () => {
  it('asks the server for totals over the filtered set and shows its answer', async () => {
    const asked: unknown[] = [];
    const source = new CustomDataSource<Line>({
      key: 'id',
      load: async (options) => {
        asked.push(options.totalSummary);
        return { data: LINES.slice(0, 2), totalCount: 4, summary: [999] };
      },
    });
    render(
      <OgeGrid
        data={source}
        keyField="id"
        columns={columns}
        paging={{ pageSize: 2 }}
      />,
    );
    await waitFor(() => expect(totals()).toContain('Sum: 999'));
    expect(asked.at(-1)).toEqual([{ field: 'qty', type: 'sum' }]);
  });
});
