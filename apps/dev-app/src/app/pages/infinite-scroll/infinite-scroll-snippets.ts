import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  selector: 'app-employees',
  className: 'EmployeesComponent',
  before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
}

const TOTAL = 1_000_000;`,
  template: `<!-- remote virtual scrolling: sparse 100-row blocks over 1M rows -->
<oge-grid [data]="employees" keyField="id"
          [scrolling]="{ mode: 'virtual', remote: true }"
          [sortable]="false" class="h-[560px]">
  <oge-column field="id" caption="Id" [width]="110" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="department" caption="Department" />
  <oge-column field="city" caption="City" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
  body: `// The grid asks for 100-row blocks as you scroll; nothing else is fetched.
readonly employees = new CustomDataSource<Employee>({
  key: 'id',
  load: async ({ skip = 0, take = 100 }) => {
    const response = await fetch(\`/api/employees?skip=\${skip}&take=\${take}\`);
    const { data } = await response.json();
    return { data, totalCount: TOTAL };
  },
});`,
});
