import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import type { FilterExpr } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_COLUMNS_DEMOS } from './columns-snippets';

const employees = makeEmployees(200, 3);

const DEPARTMENTS = [
  { code: 'Engineering', label: 'Mühendislik' },
  { code: 'Sales', label: 'Satış' },
  { code: 'HR', label: 'İnsan Kaynakları' },
  { code: 'Finance', label: 'Finans' },
  { code: 'Support', label: 'Destek' },
];

const departmentLabel = (row: Employee): string =>
  DEPARTMENTS.find((department) => department.code === row.department)?.label ??
  row.department;

const thousandsBand = (value: unknown): string =>
  typeof value === 'number'
    ? `${Math.floor(value / 1000)}k`
    : String(value ?? '');

const salaryBandFilter = (value: unknown): FilterExpr | null => {
  const band = Number(value);
  if (value == null || value === '' || Number.isNaN(band)) return null;
  return {
    type: 'and',
    operands: [
      { type: 'binary', field: 'salary', op: 'ge', value: band * 1000 },
      { type: 'binary', field: 'salary', op: 'lt', value: (band + 1) * 1000 },
    ],
  };
};

const BANDED_COLUMNS: OgeGridColumnProps<Employee>[] = [
  {
    field: 'id',
    caption: 'Id',
    width: 70,
    dataType: 'number',
    sortOrder: 'desc',
    editable: false,
  },
  { field: 'firstName', caption: 'First Name', bandCaption: 'Person' },
  {
    field: 'lastName',
    caption: 'Last Name',
    bandCaption: 'Person',
    hidingPriority: 1,
  },
  {
    field: 'department',
    caption: 'Department',
    lookup: {
      dataSource: DEPARTMENTS,
      valueExpr: 'code',
      displayExpr: 'label',
    },
  },
  {
    caption: 'Yearly',
    dataType: 'number',
    width: 110,
    calculateCellValue: (row) => row.salary * 12,
  },
  { field: 'city', caption: 'City', hidingPriority: 0 },
];

const CALC_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  {
    field: 'department',
    caption: 'Department',
    lookup: {
      dataSource: DEPARTMENTS,
      valueExpr: 'code',
      displayExpr: 'label',
    },
    calculateSortValue: departmentLabel,
  },
  {
    field: 'salary',
    caption: 'Salary Band (k)',
    dataType: 'number',
    format: thousandsBand,
    calculateFilterExpression: salaryBandFilter,
  },
];

const RTL_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'No', width: 70, dataType: 'number', pinned: 'left' },
  { field: 'firstName', caption: 'Ad' },
  { field: 'lastName', caption: 'Soyad' },
  { field: 'city', caption: 'Şehir' },
  { field: 'salary', caption: 'Maaş', dataType: 'number' },
];

/**
 * The React half of the columns page — bands, lookups, calculated columns,
 * adaptive hiding, custom sort/filter expressions and RTL, rendered as real
 * React trees inside `/components/data-grid/columns` when the reader has
 * chosen React.
 */
@Component({
  selector: 'app-react-grid-columns-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['banded', 'lookup edit', 'adaptive']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="banded" />
    </app-demo-card>

    <h3>Custom sort keys & filter expressions</h3>
    <p>
      <code>calculateSortValue</code> replaces the value a column sorts by —
      here the department lookup sorts by its Turkish <em>label</em> instead of
      the stored code. <code>calculateFilterExpression</code> rewrites what the
      filter row produces: typing a number into Salary Band filters the
      underlying salary by <em>thousands</em>.
    </p>

    <app-demo-card
      [chips]="['calculateSortValue', 'calculateFilterExpression']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="calculated" />
    </app-demo-card>

    <h3>Right-to-left</h3>
    <p>
      Set <code>rtlEnabled</code> (or wrap the grid in a
      <code>dir="rtl"</code> container — it auto-detects the inherited
      direction). Layout, pinned columns, chevrons and keyboard arrows all
      mirror; the library uses CSS logical properties throughout.
    </p>

    <app-demo-card
      [chips]="['rtlEnabled', 'pinned']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="rtl" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <strong>Lookup</strong> columns keep the raw value in your data;
        display, the filter select, the header filter and the default editor all
        speak the label. CSV export writes the label too.
      </li>
      <li>
        <strong>Calculated</strong> columns (<code>calculateCellValue</code>)
        are display-only: without a <code>field</code> they can't sort or filter
        (server contracts stay serializable).
      </li>
      <li>
        <strong>Bands</strong> come from <code>bandCaption</code> rather than a
        wrapper element — adjacent columns sharing a caption merge into one
        spanning cell. They are purely visual: resize, pinning and the column
        chooser keep working on the leaf columns.
      </li>
      <li>
        <code>sortOrder</code>/<code>sortIndex</code>/<code>groupIndex</code>
        only seed the initial state; user interaction and
        <code>stateKey</code> restores always win.
      </li>
    </ul>
  `,
})
export class ReactGridColumnsDemos {
  protected readonly demos = GRID_COLUMNS_DEMOS;

  protected readonly banded = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: BANDED_COLUMNS,
      wordWrap: true,
      editing: { mode: 'cell' },
      filterRow: true,
      filterDebounce: 200,
      paging: { pageSize: 10 },
    });

  protected readonly calculated = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: CALC_COLUMNS,
      filterRow: true,
      paging: { pageSize: 8 },
    });

  protected readonly rtl = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: RTL_COLUMNS,
      rtlEnabled: true,
      paging: { pageSize: 6, displayMode: 'compact' },
    });
}
