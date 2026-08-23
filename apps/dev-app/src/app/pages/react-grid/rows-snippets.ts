import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React rows page — section-for-section mirror of
 * `../data-grid/rows-snippets.ts`: the row render prop, row drag + focused
 * row, and the empty state + load panel. Pure data, no React imports.
 */
export const GRID_ROWS_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Row render prop',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'EmployeeCards',
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

const initials = (employee: Employee) => \`\${employee.firstName[0] ?? ''}\${employee.lastName[0] ?? ''}\`;

// the declared columns still drive sorting, filtering and selection
const columns = [
  { field: 'firstName', caption: 'Employee' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  rowAlternation
  paging={{ pageSize: 6 }}
  // renderRow replaces the whole data row — the React form of *ogeRowTemplate
  renderRow={({ row }) => (
    <div className="flex w-full items-center gap-3 px-3 py-1.5">
      <span className="avatar">{initials(row)}</span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{row.firstName} {row.lastName}</div>
        <div className="truncate text-xs text-gray-500">{row.department} · {row.city}</div>
      </div>
      <span className="ms-auto font-mono text-sm tabular-nums">{money(row.salary)}</span>
    </div>
  )}
/>`,
    }),
  },
  {
    title: 'Row drag & drop + focused row',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/core': ['RowKey'] },
      name: 'ReorderableEmployees',
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
  { field: 'department', caption: 'Department' },
];`,
      body: `const [focusedKey, setFocusedKey] = useState<RowKey | null>(null);
const [lastReorder, setLastReorder] = useState('');`,
      jsx: `<>
  <p>
    Focused row key: <strong>{focusedKey ?? '—'}</strong>
    {lastReorder ? <code>{lastReorder}</code> : null}
  </p>
  <OgeGrid
    data={employees}
    keyField="id"
    columns={columns}
    rowDragging
    onRowReordered={(event) => setLastReorder(\`#\${String(event.key)} → index \${event.toIndex}\`)}
    focusedRowEnabled
    focusedRowKey={focusedKey}
    onFocusedRowKeyChange={setFocusedKey}
  />
</>`,
    }),
  },
  {
    title: 'Empty state & loading panel',
    source: reactDemoSource({
      react: ['useMemo', 'useRef'],
      use: {
        '@oge-ui/core': ['CustomDataSource'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { '@oge-ui/react-grid': ['OgeGridHandle'] },
      name: 'EmptyEmployees',
      before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}

const columns = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
];`,
      body: `const grid = useRef<OgeGridHandle<Employee>>(null);
// always-empty remote source with latency, to show loadPanel + the empty state
const source = useMemo(
  () =>
    new CustomDataSource<Employee>({
      key: 'id',
      load: async () => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { data: [], totalCount: 0 };
      },
    }),
  [],
);`,
      jsx: `<>
  <button type="button" onClick={() => grid.current?.refresh()}>
    Reload (watch the panel)
  </button>
  <OgeGrid
    ref={grid}
    data={source}
    columns={columns}
    loadPanel
    style={{ minHeight: 180 }}
    // renderNoData is the React form of *ogeNoDataTemplate
    renderNoData={() => (
      <div className="flex flex-col items-center gap-2 py-6 text-gray-500">
        <span>No employees match — adjust the filter or add a new record.</span>
      </div>
    )}
  />
</>`,
    }),
  },
];
