import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React data-grid overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Mirrors `../data-grid/overview.ts`'s quick-start demo (the parity standard,
 * `docs/REACT-PARITY.md`): the same 50-row employee set, paging, a cell
 * render prop for the department chip and the CSV export — reached through
 * the `ref` handle instead of a projected toolbar button (a recorded
 * exception until the toolbar slot lands).
 */
export const GRID_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Quick start',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: {
        '@oge-ui/react-grid': ['OgeGridColumnProps', 'OgeGridHandle'],
      },
      name: 'EmployeesGrid',
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

const money = (value: unknown): string =>
  typeof value === 'number' ? \`₺\${value.toLocaleString('tr-TR')}\` : String(value ?? '');

const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  {
    field: 'department',
    caption: 'Department',
    // renderCell is the React form of *ogeCellTemplate
    renderCell: ({ value }) => <span className="chip">{String(value)}</span>,
  },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number', format: money },
  { field: 'hireDate', caption: 'Hire Date', dataType: 'date', width: 120 },
];`,
      body: `const grid = useRef<OgeGridHandle<Employee>>(null);`,
      jsx: `<>
  <OgeGrid
    ref={grid}
    data={employees}
    keyField="id"
    columns={columns}
    paging={{ pageSize: 10 }}
  />
  {/* the handle mirrors the Angular component's public methods */}
  <button type="button" onClick={() => grid.current?.exportCsv('employees.csv')}>
    Export CSV
  </button>
</>`,
    }),
  },
];
