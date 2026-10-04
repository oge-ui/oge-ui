import { render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps, OgeGridHandle } from './grid-types';

interface Sale {
  id: number;
  region: string;
  city: string;
  amount: number;
  note: string;
}

const SALES: Sale[] = [
  { id: 1, region: 'US', city: 'NYC', amount: 300, note: 'a' },
  { id: 2, region: 'EU', city: 'Berlin', amount: 100, note: 'b' },
  { id: 3, region: 'EU', city: 'Paris', amount: 200, note: 'c' },
];

const COLUMNS: OgeGridColumnProps<Sale>[] = [
  { field: 'id', dataType: 'number', width: 70, pinned: 'left' },
  { field: 'region', bandCaption: 'Place' },
  { field: 'city', bandCaption: 'Place' },
  {
    field: 'amount',
    dataType: 'number',
    groupSummary: 'sum',
    groupSummaryPosition: 'footer',
    totalSummary: 'sum',
  },
  { field: 'note', visible: false },
];

describe('OgeGrid (React) export structure', () => {
  async function renderGrid(selectedKeys: number[] = []) {
    const ref = createRef<OgeGridHandle<Sale>>();
    render(
      <OgeGrid<Sale>
        ref={ref}
        data={SALES}
        keyField="id"
        columns={COLUMNS}
        groupBy={['region']}
        selectionMode="multiple"
        selectedKeys={selectedKeys}
      />,
    );
    await waitFor(() => expect(ref.current).not.toBeNull());
    return ref;
  }

  it('carries layout facts, group lines in group order and totals', async () => {
    const ref = await renderGrid();
    const data = await ref.current!.getExportData();
    expect(data.columns.map((column) => column.field)).toEqual([
      'id',
      'region',
      'city',
      'amount',
    ]);
    expect(data.columns[0]).toMatchObject({ width: 70, pinned: 'left' });
    expect(data.columns[1].bandCaption).toBe('Place');
    expect(
      data.items?.map((item) =>
        item.kind === 'group' ? item.text : item.kind,
      ),
    ).toEqual([
      'Region: EU (2)',
      'data',
      'data',
      'groupFooter',
      'Region: US (1)',
      'data',
      'groupFooter',
      'total',
    ]);
  });

  it('honours visibleColumnsOnly, selectedRowsOnly and the flat switches', async () => {
    const ref = await renderGrid([3]);
    const handle = ref.current!;
    expect(
      (await handle.getExportData({ visibleColumnsOnly: false })).columns.map(
        (column) => column.field,
      ),
    ).toContain('note');
    expect(
      (await handle.getExportData({ groups: false, summaries: false })).items,
    ).toBeUndefined();
    expect(
      (await handle.getExportData({ selectedRowsOnly: true })).rows.map(
        (row) => row.id,
      ),
    ).toEqual([3]);
  });
});
