import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const BACKLOG = `const tasks: Task[] = [
  { id: 1, title: 'Discovery', start: new Date(2026, 7, 3), end: new Date(2026, 7, 3) },
  { id: 2, parentId: 1, title: 'Interviews', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6), owner: 'Ana' },
  { id: 3, parentId: 1, title: 'Survey', start: new Date(2026, 7, 4), end: new Date(2026, 7, 8), owner: 'Bora' },
  { id: 4, title: 'Delivery', start: new Date(2026, 7, 10), end: new Date(2026, 7, 10) },
  { id: 5, parentId: 4, title: 'Build', start: new Date(2026, 7, 10), end: new Date(2026, 7, 14), owner: 'Cem' },
  { id: 6, parentId: 4, title: 'Review', start: new Date(2026, 7, 14), end: new Date(2026, 7, 15), owner: 'Ana' },
];
const links = [{ id: 'a', predecessorId: 5, successorId: 6 }];`;

/**
 * Demo sources for the React "Task list editing" page — section-for-section
 * mirror of `../gantt/task-list-snippets.ts`. Pure data.
 */
export const GANTT_TASK_LIST_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Inline editing',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: { '@oge-ui/react-gantt': ['OgeGanttColumn'] },
      name: 'EditableList',
      before: `// inlineEditing: double-click a cell or press F2 on a row; Enter
// commits, Escape cancels, Tab / Shift+Tab move along the row. Every commit
// runs the cancelable update pipeline and is one undo step.
type Task = Record<string, unknown>;

const columns: OgeGanttColumn[] = [
  { field: 'wbs', editor: false },
  { field: 'title' },
  { field: 'start' },
  { field: 'duration' },
  { field: 'progress' },
  { field: 'predecessors' },
  { field: 'owner' }, // a data field: a text editor by default
];
${BACKLOG}`,
      jsx: `<OgeGantt
  tasks={tasks}
  dependencies={links}
  columns={columns}
  inlineEditing
  style={{ height: 360 }}
/>`,
    }),
  },
  {
    title: 'Sort, filter & columns',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': ['OgeGanttColumn', 'OgeGanttSortChangedEvent'],
      },
      name: 'SortableList',
      before: `// header click / Enter sorts siblings; the filter row and the search box
// keep the ancestors of matches. Drag a header edge (Alt+Arrow) to resize,
// drag a header (Ctrl+Shift+Arrow) to move it; frozen columns stay pinned
// while the pane scrolls sideways.
type Task = Record<string, unknown>;

const columns: OgeGanttColumn[] = [
  { field: 'wbs', frozen: true, allowSorting: false },
  { field: 'title', frozen: true },
  { field: 'owner' },
  { field: 'start' },
  { field: 'end' },
  { field: 'duration' },
];
${BACKLOG}`,
      body: `const [lastSort, setLastSort] = useState<OgeGanttSortChangedEvent | null>(null);`,
      jsx: `<>
  <OgeGantt
    tasks={tasks}
    dependencies={links}
    columns={columns}
    allowSorting
    allowColumnResizing
    allowColumnReordering
    filterRow
    searchPanel
    style={{ height: 400 }}
    onSortChanged={setLastSort}
  />
  <p>Sorted by: {lastSort?.field ?? 'store order'}</p>
</>`,
    }),
  },
  {
    title: 'Multi-select & bulk edits',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/core': ['RowKey'],
        '@oge-ui/react-gantt': ['OgeGanttHandle'],
      },
      name: 'BulkEdits',
      before: `// selectionMode 'multiple': Ctrl/Cmd-click toggles, Shift-click and
// Shift+Up/Down extend, Ctrl+A selects all. Delete, Alt+Shift+Left/Right and
// the context menu act on the whole selection — one undo step.
type Task = Record<string, unknown>;

${BACKLOG}`,
      body: `const gantt = useRef<OgeGanttHandle<Task>>(null);
const [selected, setSelected] = useState<readonly RowKey[]>([]);

const indent = () => {
  const handle = gantt.current;
  if (handle) handle.indentTasks(handle.getSelectedTasks());
};
const remove = () => {
  const handle = gantt.current;
  if (handle) handle.deleteTasks(handle.getSelectedTasks().map((task) => task.source));
};`,
      jsx: `<>
  <button type="button" onClick={indent}>Indent selected</button>
  <button type="button" onClick={remove}>Delete selected</button>
  <OgeGantt
    ref={gantt}
    tasks={tasks}
    dependencies={links}
    selectionMode="multiple"
    selectedTaskKeys={selected}
    onSelectedTaskKeysChange={setSelected}
    style={{ height: 360 }}
  />
  <p>{selected.length} selected</p>
</>`,
    }),
  },
];
