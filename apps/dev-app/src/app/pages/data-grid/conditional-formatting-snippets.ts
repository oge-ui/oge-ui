import { demoSource } from '../../shared/demo-source';

export const FORMATS_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: {
    '@oge-ui/grid': [
      'OgeCellPreparedEvent',
      'OgeConditionalFormat',
      'OgeGridColumnInfo',
    ],
  },
  dataset: 'employees',
  before: `interface Employee {
  id: number;
  firstName: string;
  department: string;
  salary: number;
}`,
  template: `<oge-grid [data]="employees" keyField="id"
          [rowClass]="rowClass" [cellClass]="cellClass"
          (cellPrepared)="onCellPrepared($event)">
  <oge-column field="firstName" caption="Name" />
  <oge-column field="department" caption="Department" />
  <!-- token-only formats: rule classes, a data bar, an icon set -->
  <oge-column field="salary" caption="Salary" dataType="number"
              [conditionalFormats]="salaryFormats" />
</oge-grid>`,
  body: `protected readonly rowClass = (row: Employee) => ({
  'is-engineering': row.department === 'Engineering',
});

protected readonly cellClass = (row: Employee, column: OgeGridColumnInfo) =>
  column.field === 'firstName' && row.salary > 8500 ? 'is-top-earner' : null;

protected readonly salaryFormats: OgeConditionalFormat<Employee>[] = [
  { when: { operator: 'ge', value: 9000 }, style: { tone: 'success', bold: true } },
  { when: (value) => (value as number) < 6000, style: { background: 'danger' } },
  { type: 'dataBar' },
  { type: 'iconSet', icons: 'arrows' },
];

protected onCellPrepared(event: OgeCellPreparedEvent<Employee>): void {
  // the imperative escape hatch: decorate the element itself
  if (event.field === 'salary') event.element.title = String(event.value);
}`,
});

export const SPANS_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeGridColumnInfo'] },
  dataset: 'employees',
  before: `interface Employee {
  id: number;
  department: string;
  city: string;
}`,
  template: `<!-- equal adjacent values merge (aria-rowspan); cellSpan spans columns -->
<oge-grid [data]="employees" keyField="id" [cellSpan]="cellSpan"
          [cellHintEnabled]="true" [columnAutoWidth]="true">
  <oge-column field="department" caption="Department" [mergeCells]="true" />
  <oge-column field="city" caption="City" />
  <oge-column field="firstName" caption="First name" />
  <oge-column field="lastName" caption="Last name" />
</oge-grid>`,
  body: `protected readonly cellSpan = (row: Employee, column: OgeGridColumnInfo) =>
  column.field === 'firstName' && row.id === 1 ? { colSpan: 2 } : null;`,
});
