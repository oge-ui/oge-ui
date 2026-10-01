import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React virtual-scroll page — section-for-section mirror
 * of `../virtual-scroll/virtual-scroll-snippets.ts`: row virtualization over
 * 100k rows, column virtualization over 200 columns, and measured variable
 * row heights. Pure data, no React imports.
 */
export const GRID_VIRTUAL_SCROLL_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Row virtualization',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'VirtualEmployees',
      before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}

declare const employees: Employee[]; // 100.000 rows

const columns = [
  { field: 'id', caption: 'Id', width: 90, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      jsx: `// give the grid a bounded height and switch virtualScroll on
<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  virtualScroll
  rowHeight={36}
  overscan={6}
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Column virtualization',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps'] },
      name: 'WideGrid',
      before: `type WideRow = Record<string, number>;

// 200 columns: only the ones near the horizontal viewport are rendered
const wideColumns: OgeGridColumnProps<WideRow>[] = Array.from(
  { length: 200 },
  (_, i) => ({ field: \`c\${i}\`, caption: \`Column \${i}\`, width: 120 }),
);

const wideRows: WideRow[] = Array.from({ length: 500 }, (_, row) =>
  Object.fromEntries(
    wideColumns.map((column, i) => [column.field, row * 200 + i]),
  ),
);`,
      jsx: `<OgeGrid
  data={wideRows}
  keyField="c0"
  columns={wideColumns}
  scrolling={{ mode: 'virtual', columnRenderingMode: 'virtual' }}
  style={{ height: 420 }}
/>`,
    }),
  },
  {
    title: 'Variable row heights',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'WrappedNotes',
      before: `interface Note {
  id: number;
  title: string;
  body: string;
}

const notes: Note[] = [
  { id: 1, title: 'Kickoff', body: 'Short note.' },
  { id: 2, title: 'Retro', body: 'A much longer note that wraps over several lines and makes the row taller than its neighbours.' },
];

const columns = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const },
  { field: 'title', caption: 'Title', width: 180 },
  { field: 'body', caption: 'Body' },
];`,
      jsx: `// rows size to their content; measured heights feed the virtualizer
<OgeGrid
  data={notes}
  keyField="id"
  columns={columns}
  virtualScroll
  autoRowHeight
  wordWrap
  style={{ height: 420 }}
/>`,
    }),
  },
];
