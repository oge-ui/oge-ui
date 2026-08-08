import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/core': ['FilterExpr'] },
  dataset: 'employees',
  template: `<!-- filterRow    — per-column editors + operator menu
     headerFilter — distinct values with a search box
     searchPanel  — global search + highlighting
     filterPanel  — filter builder entry point
     filterValue  — programmatic and/or tree -->
<oge-grid [data]="employees" keyField="id"
          [filterRow]="true"
          [headerFilter]="true"
          [searchPanel]="true"
          [filterPanel]="true"
          [(filterValue)]="filter">
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
  body: `// filterValue is a serializable and/or expression tree
protected readonly filter = signal<FilterExpr | null>({
  type: 'and',
  operands: [
    { type: 'binary', field: 'department', op: 'eq', value: 'Engineering' },
    { type: 'binary', field: 'salary', op: 'ge', value: 60000 },
  ],
});`,
});
