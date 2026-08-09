import { demoSource } from '../../shared/demo-source';

export const QUICK_START_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeCellTemplate', 'OgeColumn', 'OgeGrid'] },
  selector: 'app-employees',
  className: 'EmployeesPage',
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" [paging]="{ pageSize: 10 }">
  <oge-column field="id" caption="Id" [width]="70" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="department" caption="Department">
    <!-- cell templates are plain Angular templates — Tailwind classes just work -->
    <span *ogeCellTemplate="let value"
          class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {{ value }}
    </span>
  </oge-column>
  <oge-column field="salary" caption="Salary" dataType="number" [format]="money" />
</oge-grid>`,
  body: `protected readonly money = (value: unknown): string =>
  \`₺\${(value as number).toLocaleString('tr-TR')}\`;`,
});
