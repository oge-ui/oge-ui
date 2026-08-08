import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeDetailTemplate', 'OgeGrid'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id">
  <oge-column field="id" caption="Id" [width]="70" dataType="number" />
  <oge-column field="firstName" caption="First Name" />

  <!-- "of: employees" only feeds type inference — "employee" is fully typed -->
  <div *ogeDetailTemplate="let employee; of: employees" class="grid grid-cols-3 gap-4">
    <div>{{ employee.firstName }} {{ employee.lastName }}</div>
    <div>{{ employee.department }}</div>
    <div>{{ employee.city }}</div>
  </div>
</oge-grid>`,
});
