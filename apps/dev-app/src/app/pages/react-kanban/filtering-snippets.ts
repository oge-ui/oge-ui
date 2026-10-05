import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Filtering & sorting" page — section-for-section
 * mirror of `../kanban/filtering.ts`. Pure data, loaded by the generator and
 * the compile gate in plain Node.
 */
export const KANBAN_FILTERING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Filter chips & search',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanFilterExpression'] },
      name: 'ChipBoard',
      before: `const columns = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress', wipLimit: 3 },
  { key: 'done', title: 'Done' },
];

const tasks = [
  { id: 1, status: 'todo', title: 'Checkout revamp', labels: ['feature'], owner: 'Ada Lovelace', priority: 'high' },
  { id: 2, status: 'todo', title: 'Wallet UI polish', labels: ['design'], owner: 'Grace Hopper', priority: 'medium' },
  { id: 3, status: 'doing', title: 'Fix login crash', labels: ['bug'], owner: 'Ada Lovelace', priority: 'high' },
  { id: 4, status: 'doing', title: 'Upgrade CI runners', labels: ['infra'], owner: 'Alan Turing', priority: 'low' },
  { id: 5, status: 'done', title: 'Search relevance', labels: ['feature'], owner: 'Grace Hopper', priority: 'medium' },
];`,
      body: `const [chips, setChips] = useState<OgeKanbanFilterExpression>({
  priorities: ['high'],
});
const active = [
  ...(chips.tags ?? []),
  ...(chips.assignees ?? []),
  ...(chips.priorities ?? []),
];`,
      jsx: `<>
  {/* showFilterBar renders one toggle chip per distinct tag, assignee and
      priority; chips in a group are alternatives, groups combine with AND,
      and the toolbar search narrows further. filterValue +
      onFilterValueChange is the controlled chip state. WIP counts keep
      counting the real data. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    tagsExpr="labels"
    assigneeExpr="owner"
    priorityExpr="priority"
    columns={columns}
    showFilterBar
    filterValue={chips}
    onFilterValueChange={setChips}
    style={{ height: 460 }}
  />
  <p>Active chips: {active.length > 0 ? active.join(', ') : 'none'}</p>
</>`,
    }),
  },
  {
    title: 'Programmatic filter',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanFilter'] },
      name: 'FilteredBoard',
      before: `interface Task {
  id: number;
  status: string;
  title: string;
  owner: string;
  due?: Date;
}

const tasks: Task[] = [
  { id: 1, status: 'todo', title: 'Quarterly report', owner: 'Ada Lovelace', due: new Date(2020, 0, 10) },
  { id: 2, status: 'todo', title: 'Vendor review', owner: 'Grace Hopper', due: new Date(2099, 5, 1) },
  { id: 3, status: 'doing', title: 'Hiring plan', owner: 'Ada Lovelace' },
  { id: 4, status: 'done', title: 'Offsite booking', owner: 'Alan Turing', due: new Date(2020, 3, 2) },
];`,
      body: `const [onlyMine, setOnlyMine] = useState(false);
const [onlyOverdue, setOnlyOverdue] = useState(false);
const filter: OgeKanbanFilter<Task> | undefined = onlyOverdue
  ? { overdue: true }
  : onlyMine
    ? (card) => card.assignees.includes('Ada Lovelace')
    : undefined;`,
      jsx: `<>
  {/* filter takes a predicate over the normalized card (its source is your
      item) or a declarative expression ({ tags, assignees, priorities,
      columns, swimlanes, text, overdue }); it ANDs with chips and search. */}
  <label>
    <input type="checkbox" checked={onlyMine} onChange={() => setOnlyMine(!onlyMine)} />
    Only my cards
  </label>
  <label>
    <input type="checkbox" checked={onlyOverdue} onChange={() => setOnlyOverdue(!onlyOverdue)} />
    Only overdue
  </label>
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    assigneeExpr="owner"
    dueDateExpr="due"
    filter={filter}
    style={{ height: 400 }}
  />
</>`,
    }),
  },
  {
    title: 'Column sort',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanColumnSort'] },
      name: 'SortedBoard',
      before: `interface Task {
  id: number;
  status: string;
  title: string;
  priority: string;
  due: Date;
}

const tasks: Task[] = [
  { id: 1, status: 'todo', title: 'Polish onboarding', priority: 'low', due: new Date(2026, 9, 20) },
  { id: 2, status: 'todo', title: 'Payment outage', priority: 'blocker', due: new Date(2026, 9, 6) },
  { id: 3, status: 'todo', title: 'Audit log export', priority: 'medium', due: new Date(2026, 9, 12) },
  { id: 4, status: 'done', title: 'Sprint 41 review', priority: 'medium', due: new Date(2026, 8, 18) },
  { id: 5, status: 'done', title: 'Sprint 42 review', priority: 'medium', due: new Date(2026, 9, 2) },
];`,
      body: `const [sort, setSort] = useState<OgeKanbanColumnSort<Task>>({
  todo: { field: 'priority' },
  done: { field: 'dueDate', direction: 'desc' },
});`,
      jsx: `<>
  {/* columnSort sorts each column on its own ('*' = every column). The
      header's sort button (or a right-click on the header) opens the column
      menu — Manual order / Title / Priority / Due date and the direction —
      which calls onColumnSortChange. priorityOrder ranks custom values. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    priorityExpr="priority"
    dueDateExpr="due"
    columnSort={sort}
    onColumnSortChange={setSort}
    priorityOrder={['blocker', 'high', 'medium', 'low']}
    style={{ height: 420 }}
  />
</>`,
    }),
  },
  {
    title: 'Export',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanHandle'] },
      name: 'ExportBoard',
      before: `interface Task {
  id: number;
  status: string;
  title: string;
  labels: string[];
  todo?: { text: string; done: boolean }[];
}

const tasks: Task[] = [
  { id: 1, status: 'todo', title: 'Release notes', labels: ['docs'], todo: [{ text: 'Draft', done: true }, { text: 'Review', done: false }] },
  { id: 2, status: 'doing', title: '=SUM(A1) is exported as text', labels: ['security'] },
  { id: 3, status: 'done', title: 'Changelog', labels: ['docs'] },
];`,
      body: `const board = useRef<OgeKanbanHandle<Task>>(null);
const exportExcel = async () => {
  const { exportKanbanToExcel } = await import('@oge-ui/react-kanban/export-excel');
  if (board.current) await exportKanbanToExcel(board.current, { filename: 'cards.xlsx' });
};`,
      jsx: `<>
  {/* exportToCsv() downloads a formula-guarded CSV (core's buildCsv) in
      board order and returns the text; the lazy export-excel entry builds an
      .xlsx through the optional exceljs peer. { visibleOnly: true } exports
      only what the filters show. */}
  <button type="button" onClick={() => board.current?.exportToCsv('cards.csv')}>Export CSV</button>
  <button type="button" onClick={exportExcel}>Export Excel</button>
  <OgeKanban
    ref={board}
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    tagsExpr="labels"
    checklistExpr="todo"
    style={{ height: 360 }}
  />
</>`,
    }),
  },
];
