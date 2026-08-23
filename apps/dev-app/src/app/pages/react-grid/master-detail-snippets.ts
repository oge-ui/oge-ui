import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React master-detail page — mirror of
 * `../data-grid/master-detail-snippets.ts`. Pure data, no React imports.
 */
export const GRID_MASTER_DETAIL_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Master-detail',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'EmployeeDetails',
      before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}

declare const employees: Employee[];

const columns = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  // renderDetail is the React form of *ogeDetailTemplate: its presence adds
  // the expander column, and the row arrives fully typed
  renderDetail={({ row }) => (
    <div className="grid grid-cols-3 gap-4">
      <section>
        <h4>Employee</h4>
        <p>{row.firstName} {row.lastName}</p>
        <p>#{row.id} · {row.department}</p>
      </section>
      <section>
        <h4>Location</h4>
        <p>{row.city}</p>
      </section>
      <section>
        <h4>Compensation</h4>
        <p>₺{row.salary.toLocaleString('tr-TR')}</p>
        <p>since {row.hireDate}</p>
      </section>
    </div>
  )}
/>`,
    }),
  },
];
