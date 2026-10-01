import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React sorting page — mirror of
 * `../sorting/sorting-snippets.ts`: multi-sort with unsorting over 10k rows,
 * paged, with the state persisted under a `stateKey`. Pure data, no React
 * imports.
 */
export const GRID_SORTING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Sorting & paging',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'SortedEmployees',
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
  { field: 'id', caption: 'Id', width: 80, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  // sort, reload the page — the state comes back from localStorage
  stateKey="docs-sorting"
  paging={{ pageSize: 15, pageSizes: [15, 25, 50] }}
  sorting={{ mode: 'multi', allowUnsorting: true }}
/>`,
    }),
  },
];
