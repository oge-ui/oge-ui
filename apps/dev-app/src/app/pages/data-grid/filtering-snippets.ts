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

export const TOOLS_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeFilterCellTemplate', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- auto value lists, a range slider, a custom filter cell, quick dates,
     manual apply and saved views (stored under stateKey) -->
<oge-grid [data]="employees" keyField="id" stateKey="filter-tools"
          [filterRow]="true" [headerFilter]="{ auto: true }"
          [dateFilterPresets]="true" filterApplyMode="manual" [savedViews]="true">
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="department" caption="Department">
    <select *ogeFilterCellTemplate="let value; setValue as set"
            aria-label="Filter Department"
            [value]="value ?? ''" (change)="set($any($event.target).value)">
      <option value="">Any</option>
      <option>Engineering</option>
      <option>Sales</option>
    </select>
  </oge-column>
  <oge-column field="city" caption="City" />
  <oge-column field="salary" caption="Salary" dataType="number"
              [filterRange]="{ min: 30000, max: 150000, step: 5000 }" />
  <!-- a column may ask for its list: the date presets live in its menu -->
  <oge-column field="hireDate" caption="Hired" dataType="date" [headerFilter]="true" />
</oge-grid>`,
});

export const DISPLAY_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  before: `interface Person {
  id: number;
  firstName: string;
  lastName: string;
  status: number;
  city: string;
}`,
  template: `<!-- search and filters match what the cells show; text sorts the Turkish way -->
<oge-grid [data]="people" keyField="id" [filterRow]="true" [searchPanel]="true"
          [sorting]="{ locale: 'tr' }">
  <oge-column field="name" caption="Name"
              [calculateCellValue]="fullName" [calculateFilterValue]="fullName" />
  <oge-column field="status" caption="Status"
              [lookup]="{ dataSource: statuses, valueExpr: 'value', displayExpr: 'text' }" />
  <oge-column field="city" caption="City" />
  <!-- a server filters a derived column on another field:
       <oge-column field="customerName" filterField="customer.lastName" /> -->
</oge-grid>`,
  body: `readonly statuses = [
  { value: 0, text: 'Active' },
  { value: 1, text: 'On leave' },
  { value: 2, text: 'Former' },
];
readonly people: Person[] = [
  { id: 1, firstName: 'Ada', lastName: 'Kaya', status: 0, city: 'İzmir' },
  { id: 2, firstName: 'Can', lastName: 'Işık', status: 1, city: 'Iğdır' },
  { id: 3, firstName: 'Ece', lastName: 'Öz', status: 2, city: 'Isparta' },
];
readonly fullName = (row: Person) => \`\${row.firstName} \${row.lastName}\`;`,
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
