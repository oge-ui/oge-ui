import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React infinite-scroll page — mirror of
 * `../infinite-scroll/infinite-scroll-snippets.ts`: remote virtual scrolling
 * that fetches sparse 100-row blocks over one million rows. Pure data, no
 * React imports.
 */
export const GRID_INFINITE_SCROLL_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Remote virtual scrolling',
    source: reactDemoSource({
      react: ['useMemo'],
      use: {
        '@oge-ui/core': ['CustomDataSource'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      name: 'MillionEmployees',
      before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
}

const TOTAL = 1_000_000;

const columns = [
  { field: 'id', caption: 'Id', width: 110, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      body: `// The grid asks for 100-row blocks as you scroll; nothing else is fetched.
const employees = useMemo(
  () =>
    new CustomDataSource<Employee>({
      key: 'id',
      load: async ({ skip = 0, take = 100 }) => {
        const response = await fetch(\`/api/employees?skip=\${skip}&take=\${take}\`);
        const { data } = (await response.json()) as { data: Employee[] };
        return { data, totalCount: TOTAL };
      },
    }),
  [],
);`,
      jsx: `// remote virtual scrolling: sparse 100-row blocks over 1M rows
<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  scrolling={{ mode: 'virtual', remote: true }}
  sortable={false}
  style={{ height: 560 }}
/>`,
    }),
  },
];
