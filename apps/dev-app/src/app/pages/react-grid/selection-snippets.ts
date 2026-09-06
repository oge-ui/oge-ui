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
 * Demo source for the React selection page — mirror of
 * `../data-grid/selection-snippets.ts`. Pure data, no React imports.
 */
export const GRID_SELECTION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Checkbox selection & context menu',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/core': ['RowKey'] },
      name: 'SelectableGrid',
      before: `${EMPLOYEE}

const columns = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
];`,
      body: `const [selected, setSelected] = useState<RowKey[]>([]);
const [lastAction, setLastAction] = useState('');`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  selectionMode="checkbox"
  selectedKeys={selected}
  onSelectedKeysChange={setSelected}
  filterRow
  filterDebounce={200}
  virtualScroll
  style={{ height: 480 }}
  // push items to open the grid's own menu at the pointer; leave the array
  // empty and the browser's native menu is left alone
  onRowContextMenu={(event) => {
    event.items.push(
      {
        text: \`Copy "\${event.row.firstName} \${event.row.lastName}"\`,
        action: () => setLastAction(\`copied #\${event.row.id}\`),
      },
      {
        text: 'Select this row only',
        action: () => setSelected([event.key]),
      },
      { text: 'Delete (disabled)', disabled: true },
    );
  }}
/>`,
    }),
  },
  {
    title: 'Deferred selection',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/core': ['FilterExpr'] },
      name: 'DeferredSelection',
      before: `${EMPLOYEE}

const columns = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      body: `// the selection *is* the expression — no key list is ever materialized,
// so select-all over a million remote rows costs nothing
const [selectionFilter, setSelectionFilter] = useState<FilterExpr | null>(null);`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  selectionMode="checkbox"
  selectionDeferred
  selectionFilter={selectionFilter}
  onSelectionFilterChange={setSelectionFilter}
  paging={{ pageSize: 8 }}
/>`,
    }),
  },
];
