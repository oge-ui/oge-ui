import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React editing page — mirror of
 * `../data-grid/editing-snippets.ts`. Pure data, no React imports.
 */
export const GRID_EDITING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Five edit modes',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: {
        '@oge-ui/react-grid': ['OgeEditMode', 'OgeGridColumnProps'],
      },
      name: 'EditableGrid',
      before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  salary: number;
}

declare const employees: Employee[];

// annotated so \`renderEditor\`'s context arrives typed rather than \`any\`
const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number', editable: false },
  { field: 'firstName', caption: 'First Name', required: true },
  { field: 'lastName', caption: 'Last Name', required: true },
  {
    field: 'department',
    caption: 'Department',
    // renderEditor is the React form of *ogeEditTemplate: the draft value,
    // a setter, the validation message and commit/cancel arrive typed
    renderEditor: ({ value, setValue, commit, cancel }) => (
      <select
        className="oge-editor w-full rounded border px-2 py-1 text-sm"
        value={String(value ?? '')}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') cancel();
        }}
      >
        {['Engineering', 'Sales', 'HR', 'Finance', 'Support'].map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    ),
  },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];`,
      body: `const [mode, setMode] = useState<OgeEditMode>('batch');`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  editing={{
    mode,
    allowUpdating: true,
    allowAdding: true,
    allowDeleting: true,
    confirmDelete: true,
  }}
  paging={{ pageSize: 10 }}
  // cancelable: inspect or rewrite the change set before it reaches the
  // DataSource — batch mode sends every staged change as one ordered list
  onSavingChanges={(event) => console.log(event.changes)}
/>`,
    }),
  },
  {
    title: 'Cascading lookups & command buttons',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeCommandButton'] },
      name: 'AssignmentsGrid',
      before: `interface Assignment {
  id: number;
  title: string;
  countryId: number;
  cityId: number;
  done: boolean;
}

declare const assignments: Assignment[];

const countries = [
  { id: 1, name: 'Türkiye' },
  { id: 2, name: 'Germany' },
];

const cities = [
  { id: 1, countryId: 1, name: 'İstanbul' },
  { id: 2, countryId: 1, name: 'Ankara' },
  { id: 3, countryId: 2, name: 'Berlin' },
  { id: 4, countryId: 2, name: 'Munich' },
];

const columns = [
  { field: 'title', caption: 'Task' },
  { field: 'countryId', caption: 'Country',
    lookup: { dataSource: countries, valueExpr: 'id', displayExpr: 'name' } },
  { field: 'cityId', caption: 'City',
    // a lookup dataSource may be a function of the row: while editing it
    // receives the *draft* values, so picking a country re-filters the cities
    lookup: {
      dataSource: (row: Assignment) =>
        cities.filter((city) => city.countryId === row.countryId),
      valueExpr: 'id',
      displayExpr: 'name',
    } },
  { field: 'done', caption: 'Done', dataType: 'boolean' as const, width: 90 },
];`,
      body: `const [lastCommand, setLastCommand] = useState('');

const commandButtons: OgeCommandButton<Assignment>[] = [
  { name: 'edit' },
  { name: 'delete' },
  {
    name: 'archive',
    text: 'Archive',
    visible: (row) => !row.done,
    onClick: ({ row }) => setLastCommand(\`archive #\${row.id} (\${row.title})\`),
  },
];`,
      jsx: `<OgeGrid
  data={assignments}
  keyField="id"
  columns={columns}
  editing={{ mode: 'row', allowUpdating: true, allowDeleting: true }}
  commandButtons={commandButtons}
/>`,
    }),
  },
];
