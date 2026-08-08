import { demoSource } from '../../shared/demo-source';

export const ROW_TEMPLATE_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid', 'OgeRowTemplate'] },
  dataset: 'employees',
  before: `interface Employee {
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
}`,
  template: `<oge-grid [data]="employees" keyField="id" [rowAlternation]="true">
  <oge-column field="firstName" caption="Employee" />
  <oge-column field="department" caption="Department" />
  <oge-column field="salary" caption="Salary" dataType="number" />
  <!-- replaces the whole row; columns still drive header, sorting & filtering -->
  <div *ogeRowTemplate="let employee; of: employees; index as i" class="flex items-center gap-3 px-3 py-2">
    <span class="avatar">{{ initials(employee) }}</span>
    <div>
      <div>{{ employee.firstName }} {{ employee.lastName }}</div>
      <div class="muted">{{ employee.department }} · {{ employee.city }}</div>
    </div>
    <span class="ml-auto">{{ money(employee.salary) }}</span>
  </div>
</oge-grid>`,
  body: `protected initials(employee: Employee): string {
  return \`\${employee.firstName[0]}\${employee.lastName[0]}\`;
}

protected money(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}`,
});

export const DRAG_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: {
    '@oge-ui/core': ['RowKey'],
    '@oge-ui/grid': ['OgeRowReorderedEvent'],
  },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id"
          [rowDragging]="true" (rowReordered)="onReordered($event)"
          [focusedRowEnabled]="true" [(focusedRowKey)]="focusedKey">
  <oge-column field="firstName" />
</oge-grid>`,
  body: `protected readonly focusedKey = signal<RowKey | null>(null);

protected onReordered(event: OgeRowReorderedEvent<unknown>): void {
  console.log(event.fromIndex, '→', event.toIndex);
}`,
});

export const NODATA_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid', 'OgeNoDataTemplate'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" [loadPanel]="true">
  <oge-column field="firstName" />
  <div *ogeNoDataTemplate class="empty-state">
    No employees match — adjust the filter or add a new record.
  </div>
</oge-grid>`,
});
