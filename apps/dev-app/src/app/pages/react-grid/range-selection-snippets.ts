import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const EMPLOYEE = `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  salary: number;
  hireDate: Date;
}

declare const employees: Employee[];`;

/**
 * Demo source for the React range-selection page — mirror of
 * `../data-grid/range-selection-snippets.ts`. Pure data, no React imports.
 */
export const GRID_RANGE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Ranges, copy, paste & fill',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeGridCellRange'] },
      name: 'RangeGrid',
      before: `${EMPLOYEE}

const columns = [
  { field: 'firstName', caption: 'First name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
  { field: 'hireDate', caption: 'Hired', dataType: 'date' as const },
  { field: 'id', caption: 'Id', editable: false },
];`,
      body: `const [ranges, setRanges] = useState<readonly OgeGridCellRange[]>([]);
const [summary, setSummary] = useState('');`,
      jsx: `<>
  {/* click / Shift+click / drag / Shift+Arrow select; Ctrl+C copies TSV,
      Ctrl+V pastes from Excel, drag the corner handle (or Ctrl+D / Ctrl+R)
      to fill, Ctrl+Z / Ctrl+Y undo and redo */}
  <OgeGrid
    data={employees}
    keyField="id"
    columns={columns}
    selectionMode="cell"
    rangeSelection={{ copyHeaders: true, pasteAddsRows: true }}
    editing={{ mode: 'batch', allowUpdating: true }}
    selectedRanges={ranges}
    onSelectedRangesChange={setRanges}
    onRangeSelectionChanged={(event) =>
      setSummary(\`\${event.cellCount} cells in \${event.ranges.length} range(s)\`)
    }
  />
  <p>{summary}</p>
</>`,
    }),
  },
  {
    title: 'Async validation',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'AsyncValidationGrid',
      before: `${EMPLOYEE}

/** Pretends to ask a server whether the name is taken. */
const uniqueName = (value: unknown) =>
  new Promise<string | null>((resolve) =>
    setTimeout(() => resolve(value === 'Taken' ? 'This name is taken' : null), 600),
  );`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  editing={{ mode: 'row', allowUpdating: true }}
  columns={[
    // a rule returning a promise: the editor is aria-busy, Save waits for it
    { field: 'lastName', caption: 'Last name (unique)', validators: [uniqueName] },
    { field: 'hireDate', caption: 'Hired at', dataType: 'datetime' },
  ]}
/>`,
    }),
  },
];
