import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React grouping page — section-for-section mirror of
 * `../data-grid/grouping-snippets.ts` (`docs/REACT-PARITY.md`): the group
 * panel, multiple/custom/footer summaries and deferred group loading. Pure
 * data, no React imports.
 */
export const GRID_GROUPING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Group panel',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps'] },
      name: 'GroupedEmployees',
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
declare const money: (value: unknown) => string;

const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number', pinned: 'left' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  // groupSummary renders on the group row, totalSummary on the sticky total row
  { field: 'salary', caption: 'Salary', dataType: 'number', format: money, groupSummary: 'avg', totalSummary: 'sum' },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  groupPanel
  groupBy={['department']}
  style={{ height: 540 }}
/>`,
    }),
  },
  {
    title: 'Multiple, custom and group-footer summaries',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps'] },
      name: 'SummaryEmployees',
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
declare const money: (value: unknown) => string;

// custom summary: distinct city count per group
const distinctCities = (rows: readonly Employee[]): string =>
  \`\${new Set(rows.map((row) => row.city)).size} cities\`;

const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'city', caption: 'City', groupSummary: 'custom', calculateCustomSummary: distinctCities },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    format: money,
    groupSummary: ['min', 'max'],
    groupSummaryPosition: 'footer',
    totalSummary: ['sum', 'avg'],
  },
];`,
      jsx: `<OgeGrid data={employees} keyField="id" columns={columns} groupBy={['department']} />`,
    }),
  },
  {
    title: 'Deferred group loading',
    source: reactDemoSource({
      react: ['useMemo'],
      use: {
        '@oge-ui/core': ['CustomDataSource'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      name: 'DeferredGroups',
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
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      body: `// Fake deferred server: group headers only (items: null + count);
// a group's rows are fetched the moment it is expanded, filtered by the
// group value, and cached for later toggles.
const source = useMemo(
  () =>
    new CustomDataSource<Employee>({
      key: 'id',
      load: async (options) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (options.group?.length) {
          const counts = new Map<string, number>();
          for (const row of employees) counts.set(row.department, (counts.get(row.department) ?? 0) + 1);
          return {
            data: [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, items: null, count })),
            totalCount: employees.length,
          };
        }
        const filter = options.filter;
        const value = filter?.type === 'binary' ? filter.value : undefined;
        return { data: employees.filter((row) => row.department === value) };
      },
    }),
  [],
);`,
      jsx: `<OgeGrid
  data={source}
  columns={columns}
  groupBy={['department']}
  grouping={{ autoExpandAll: false }}
/>`,
    }),
  },
];
