import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const EMPLOYEE = `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
}

declare const employees: Employee[];`;

/**
 * Demo source for the React persistence page — mirror of
 * `../data-grid/persistence-snippets.ts`. Pure data, no React imports.
 */
export const GRID_PERSISTENCE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'stateKey',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'PersistedGrid',
      before: `${EMPLOYEE}

const columns = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  // sorting, filters, grouping, column widths/order/pins/visibility and the
  // page size are one serializable snapshot, saved under this key
  stateKey="docs-persistence"
  groupPanel
  filterRow
  columnChooser
  paging={{ pageSize: 8 }}
/>`,
    }),
  },
  {
    title: 'Custom backend',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-grid': ['OgeGrid', 'OgeGridStateStorageProvider'],
      },
      types: {
        '@oge-ui/react-grid': ['OgeGridColumnProps', 'OgeStateStorage'],
      },
      name: 'ApiPersistedGrid',
      before: `${EMPLOYEE}

declare const columns: OgeGridColumnProps<Employee>[];

// both methods may return promises, so an HTTP backend plugs in directly
const apiStorage: OgeStateStorage = {
  get: (key) => fetch(\`/api/grid-state/\${key}\`).then((r) => r.text()),
  set: (key, value) =>
    fetch(\`/api/grid-state/\${key}\`, { method: 'PUT', body: value }).then(
      () => undefined,
    ),
};`,
      jsx: `<OgeGridStateStorageProvider storage={apiStorage}>
  <OgeGrid
    data={employees}
    keyField="id"
    columns={columns}
    stateKey="api-demo"
    filterRow
    paging={{ pageSize: 6 }}
  />
</OgeGridStateStorageProvider>`,
    }),
  },
  {
    title: 'Imperative state',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: {
        '@oge-ui/core': ['GridStateSnapshot'],
        '@oge-ui/react-grid': ['OgeGridColumnProps', 'OgeGridHandle'],
      },
      name: 'ImperativeState',
      before: `${EMPLOYEE}

declare const columns: OgeGridColumnProps<Employee>[];`,
      body: `const grid = useRef<OgeGridHandle<Employee>>(null);
const [captured, setCaptured] = useState<GridStateSnapshot | null>(null);`,
      jsx: `<>
  <button onClick={() => setCaptured(grid.current?.state() ?? null)}>
    Capture view
  </button>
  <button
    disabled={!captured}
    onClick={() => captured && grid.current?.applyState(captured)}
  >
    Restore captured view
  </button>
  <OgeGrid
    ref={grid}
    data={employees}
    keyField="id"
    columns={columns}
    filterRow
    groupPanel
    paging={{ pageSize: 6 }}
    // debounced: rapid interactions produce one notification
    onStateChange={(snapshot) => console.log(snapshot)}
  />
</>`,
    }),
  },
];
