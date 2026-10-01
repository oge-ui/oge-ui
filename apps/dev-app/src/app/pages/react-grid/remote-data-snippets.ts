import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React remote-data page — section-for-section mirror of
 * `../remote-data/remote-data-snippets.ts`: a server-side `CustomDataSource`
 * that posts `LoadOptions` as-is, and a `CursorDataSource` over a
 * cursor-paginated endpoint. Pure data, no React imports.
 */
export const GRID_REMOTE_DATA_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Server-side data',
    source: reactDemoSource({
      react: ['useMemo'],
      use: {
        '@oge-ui/core': ['CustomDataSource'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { '@oge-ui/core': ['LoadResult'] },
      name: 'RemoteEmployees',
      before: `interface Employee {
  id: number;
  firstName: string;
  department: string;
}

const columns = ['firstName', 'department'];`,
      body: `const source = useMemo(
  () =>
    new CustomDataSource<Employee>({
      key: 'id',
      // options = { skip, take, sort, filter, searchText, signal, … } — post as-is;
      // the signal aborts a stale request when the grid state changes mid-flight
      load: async ({ signal, ...options }) => {
        const response = await fetch('/api/employees/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
          signal,
        });
        return (await response.json()) as LoadResult<Employee>;
      },
    }),
  [],
);`,
      jsx: `<OgeGrid data={source} keyField="id" columns={columns} filterRow searchPanel />`,
    }),
  },
  {
    title: 'Cursor-paginated endpoints',
    source: reactDemoSource({
      react: ['useMemo'],
      use: {
        '@oge-ui/core': ['CursorDataSource'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { '@oge-ui/core': ['CursorPage'] },
      name: 'CursorAccounts',
      before: `interface Account {
  id: string;
  email: string;
  createdAt: string;
}

const columns = [
  { field: 'email' },
  { field: 'createdAt', dataType: 'date' as const },
];`,
      body: `// The endpoint pages with a cursor (\`?after=…&limit=50\` → { items, nextCursor }),
// not with an offset. The source walks the chain as the grid scrolls, fetches
// every page once per query and restarts from the first page when the sort,
// filter or search changes.
const source = useMemo(
  () =>
    new CursorDataSource<Account, string>({
      key: 'id',
      pageSize: 50,
      fetchPage: async ({ cursor, pageSize, sort, filter, searchText }) => {
        const response = await fetch('/api/accounts/page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ after: cursor, limit: pageSize, sort, filter, searchText }),
        });
        return (await response.json()) as CursorPage<Account, string>;
      },
    }),
  [],
);`,
      jsx: `<OgeGrid
  data={source}
  keyField="id"
  columns={columns}
  scrolling={{ mode: 'infinite' }}
  style={{ height: 420 }}
/>`,
    }),
  },
];
