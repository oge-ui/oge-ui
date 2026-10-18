import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Order {
  id: number;
  city: string;
  status: number;
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id">
      <oge-column field="id" dataType="number" [sortable]="false" />
      <oge-column field="city" caption="Office" [visible]="false" />
      <oge-column
        field="status"
        dataType="number"
        [lookup]="{
          dataSource: statuses,
          valueExpr: 'id',
          displayExpr: 'label',
        }"
      />
      <oge-column caption="Actions" />
    </oge-grid>
  `,
})
class Host {
  readonly data: Order[] = [{ id: 1, city: 'İzmir', status: 2 }];
  readonly statuses = [
    { id: 1, label: 'Open' },
    { id: 2, label: 'Shipped' },
  ];
  readonly grid = viewChild.required(OgeGrid);
}

describe('OgeGrid describeColumns()', () => {
  it('describes every column with a field, hidden ones included', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(fixture.componentInstance.grid().describeColumns()).toEqual([
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
