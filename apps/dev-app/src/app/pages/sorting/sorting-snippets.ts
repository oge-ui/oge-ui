import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id"
          [paging]="{ pageSize: 15, pageSizes: [15, 25, 50] }"
          [sorting]="{ mode: 'multi', allowUnsorting: true }">
  <oge-column field="id" caption="Id" [width]="80" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
});
