import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React filtering page — mirror of
 * `../data-grid/filtering-snippets.ts`. Pure data, no React imports.
 */
export const GRID_FILTERING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Every filter surface',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/core': ['FilterExpr'] },
      name: 'FilteredGrid',
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
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const, filterable: false },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
  { field: 'hireDate', caption: 'Hire Date', dataType: 'date' as const, width: 120 },
];`,
      body: `// filterValue is a serializable and/or expression tree — the same
// shape every surface produces, and the same one the builder edits
const [filter, setFilter] = useState<FilterExpr | null>(null);`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  filterRow          // per-column editors + operator menu
  headerFilter       // distinct values with a search box
  searchPanel        // global search + highlighting
  filterPanel        // filter builder entry point
  filterValue={filter}
  onFilterValueChange={setFilter}
  paging={{ pageSize: 12 }}
/>`,
    }),
  },
];
