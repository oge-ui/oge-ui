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
  {
    title: 'Filter chips and column summaries',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'FilterChipsGrid',
      before: `interface Employee {
  id: number;
  firstName: string;
  city: string;
  salary: number;
}

declare const employees: Employee[];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  filterRow
  headerFilter
  searchPanel
  filterChips   // one removable chip per active filter, plus "Clear all"
  summaryMenu   // right-click a header → Summary → Count / Sum / Avg / Min / Max
  columns={[
    { field: 'firstName', caption: 'First Name' },
    { field: 'city', caption: 'City' },
    { field: 'salary', caption: 'Salary', dataType: 'number', totalSummary: 'sum' },
  ]}
/>`,
    }),
  },
  {
    title: 'Filter tools',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'FilterToolsGrid',
      before: `interface Employee {
  id: number;
  firstName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: Date;
}

declare const employees: Employee[];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  stateKey="filter-tools"
  filterRow
  headerFilter={{ auto: true }}   // lists only where values repeat
  dateFilterPresets                // quick dates in a date column’s menu
  filterApplyMode="manual"         // edits wait for "Apply filters"
  savedViews                       // save / open / delete named views
  columns={[
    { field: 'firstName', caption: 'First Name' },
    {
      field: 'department',
      caption: 'Department',
      renderFilterCell: ({ value, setValue }) => (
        <select
          aria-label="Filter Department"
          value={(value as string) ?? ''}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="">Any</option>
          <option>Engineering</option>
          <option>Sales</option>
        </select>
      ),
    },
    { field: 'city', caption: 'City' },
    { field: 'salary', caption: 'Salary', dataType: 'number',
      filterRange: { min: 30000, max: 150000, step: 5000 } },
    // a column may ask for its list: the date presets live in its menu
    { field: 'hireDate', caption: 'Hired', dataType: 'date', headerFilter: true },
  ]}
/>`,
    }),
  },
  {
    title: 'Excel-style filter menu',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'FilterMenuGrid',
      before: `interface Employee {
  id: number;
  firstName: string;
  salary: number;
  hireDate: Date;
}

declare const employees: Employee[];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  // mode 'both': two conditions (And / Or) above the value list;
  // a date column lists its values as a year → month → day tree
  headerFilter={{ mode: 'both' }}
  columns={[
    { field: 'firstName', caption: 'First Name' },
    { field: 'salary', caption: 'Salary', dataType: 'number' },
    { field: 'hireDate', caption: 'Hired', dataType: 'date' },
  ]}
/>`,
    }),
  },
];
