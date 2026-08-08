import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id"
          [groupPanel]="true" [groupBy]="['department']" [columnChooser]="true">
  <oge-column field="id" caption="Id" [width]="80" dataType="number" pinned="left" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number"
              groupSummary="avg" totalSummary="sum" [format]="money" />
</oge-grid>`,
  body: `protected readonly money = (value: unknown): string =>
  Number(value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });`,
});

export const SUMMARY_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  before: `interface Employee {
  city: string;
  salary: number;
}`,
  template: `<oge-grid [data]="employees" keyField="id" [groupBy]="['department']">
  <!-- custom aggregate: any reducer over the group's rows -->
  <oge-column field="city" groupSummary="custom"
              [calculateCustomSummary]="distinctCities" />
  <!-- several aggregates at once, rendered on a footer row after the group -->
  <oge-column field="salary" dataType="number"
              [groupSummary]="['min', 'max']" groupSummaryPosition="footer"
              [totalSummary]="['sum', 'avg']" />
</oge-grid>`,
  body: `protected readonly distinctCities = (rows: readonly Employee[]): string =>
  \`\${new Set(rows.map((r) => r.city)).size} cities\`;`,
});

export const DEFERRED_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  city: string;
  department: string;
  salary: number;
}`,
  template: `<oge-grid [data]="source" keyField="id"
          [groupBy]="['department']"
          [grouping]="{ autoExpandAll: false }">
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="city" caption="City" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
  body: `// grouped request → headers only (items: null, count);
// expanding a group fetches its rows with an eq-filter
protected readonly source = new CustomDataSource<Employee>({
  key: 'id',
  load: async (options) => {
    if (options.group?.length) {
      const groups = await fetch('/api/employees/groups?by=department');
      return { data: await groups.json() }; // [{ key, items: null, count }]
    }
    const rows = await fetch(
      '/api/employees?' + JSON.stringify(options.filter ?? null),
    );
    return { data: await rows.json() };
  },
});`,
});
