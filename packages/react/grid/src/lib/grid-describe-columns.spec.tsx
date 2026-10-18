import { render } from '@testing-library/react';
import { createRef } from 'react';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps, OgeGridHandle } from './grid-types';

interface Order {
  id: number;
  city: string;
  status: number;
}

const STATUSES = [
  { id: 1, label: 'Open' },
  { id: 2, label: 'Shipped' },
];

const COLUMNS: OgeGridColumnProps<Order>[] = [
  { field: 'id', dataType: 'number', sortable: false },
  { field: 'city', caption: 'Office', visible: false },
  {
    field: 'status',
    dataType: 'number',
    lookup: { dataSource: STATUSES, valueExpr: 'id', displayExpr: 'label' },
  },
  { caption: 'Actions' },
];

describe('OgeGrid (React) describeColumns()', () => {
  it('matches the Angular grid: every column with a field, hidden ones included', () => {
    const ref = createRef<OgeGridHandle<Order>>();
    render(
      <OgeGrid
        ref={ref}
        data={[{ id: 1, city: 'İzmir', status: 2 }]}
        keyField="id"
        columns={COLUMNS}
      />,
    );
    expect(ref.current?.describeColumns()).toEqual([
      {
        field: 'id',
        caption: 'Id',
        dataType: 'number',
        visible: true,
        sortable: false,
        filterable: true,
        groupable: true,
      },
      {
        field: 'city',
        caption: 'Office',
        dataType: 'string',
        visible: false,
        sortable: true,
        filterable: true,
        groupable: true,
      },
      {
        field: 'status',
        caption: 'Status',
        dataType: 'number',
        visible: true,
        sortable: true,
        filterable: true,
        groupable: true,
        values: [
          { value: 1, text: 'Open' },
          { value: 2, text: 'Shipped' },
        ],
      },
    ]);
  });
});
