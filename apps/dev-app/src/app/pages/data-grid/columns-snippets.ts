import { demoSource } from '../../shared/demo-source';

export const ADAPTIVE_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- a narrow grid: columns with a hidingPriority leave the row, and each
     row's + toggle reveals their caption / value pairs (columnHidingMode
     'detail' is the default — 'hide' drops the data instead) -->
<div style="max-width: 420px">
  <oge-grid [data]="employees" keyField="id" columnHidingMode="detail">
    <oge-column field="firstName" caption="First Name" [width]="140" />
    <oge-column field="lastName" caption="Last Name" [width]="140" [hidingPriority]="3" />
    <oge-column field="department" caption="Department" [width]="140" [hidingPriority]="2" />
    <oge-column field="city" caption="City" [width]="120" [hidingPriority]="1" />
    <oge-column field="salary" caption="Salary" dataType="number" [width]="120"
                [format]="money" [hidingPriority]="0" />
  </oge-grid>
</div>`,
  body: `protected readonly money = (value: unknown): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value),
  );`,
});

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeColumnGroup', 'OgeGrid'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" [wordWrap]="true"
          [editing]="{ mode: 'cell' }" [filterRow]="true">
  <oge-column field="id" [width]="70" dataType="number" sortOrder="desc" />

  <!-- banded columns: one shared header over several columns -->
  <oge-column-group caption="Person">
    <oge-column field="firstName" />
    <oge-column field="lastName" [hidingPriority]="1" />
  </oge-column-group>

  <!-- lookup: store a code, display (and edit/filter with) a label -->
  <oge-column field="department" caption="Department"
              [lookup]="{ dataSource: departments, valueExpr: 'code', displayExpr: 'label' }" />

  <!-- calculated column: display-only derived value -->
  <oge-column caption="Yearly" dataType="number" [calculateCellValue]="yearly" />

  <!-- responsive: lowest hidingPriority disappears first on narrow screens -->
  <oge-column field="city" [hidingPriority]="0" />
</oge-grid>`,
  body: `protected readonly departments = [
  { code: 'Engineering', label: 'Engineering' },
  { code: 'Sales', label: 'Sales' },
  { code: 'Finance', label: 'Finance' },
  { code: 'Support', label: 'Support' },
];

protected readonly yearly = (row: { salary: number }): number => row.salary * 12;`,
});
