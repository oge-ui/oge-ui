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

export const CHIPS_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- filterChips: one removable chip per active filter, plus "Clear all".
     summaryMenu: right-click a header → Summary → Count / Sum / Avg / Min / Max;
     the pick is part of state() and is computed over the filtered set -->
<oge-grid [data]="employees" keyField="id"
          [filterRow]="true" [headerFilter]="true" [searchPanel]="true"
          [filterChips]="true" [summaryMenu]="true">
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="city" caption="City" />
  <oge-column field="salary" caption="Salary" dataType="number" totalSummary="sum" />
</oge-grid>`,
});

export const MENU_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- mode 'both': two conditions (And / Or) above the value list;
     a date column lists its values as a year → month → day tree -->
<oge-grid [data]="employees" keyField="id"
          [headerFilter]="{ mode: 'both' }">
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
  <oge-column field="hireDate" caption="Hired" dataType="date" />
</oge-grid>`,
});
