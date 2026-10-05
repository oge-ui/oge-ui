import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Multi-select & cross-board" page —
 * section-for-section mirror of `../kanban/multi-select.ts`.
 */
export const KANBAN_MULTI_SELECT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Multi-select & undo',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'MultiSelectBoard',
      before: `const tasks = [
  { id: 1, status: 'todo', title: 'Ctrl-click me' },
  { id: 2, status: 'todo', title: '…and me' },
  { id: 3, status: 'todo', title: 'Shift-click for a range' },
  { id: 4, status: 'doing', title: 'Drag a selected card' },
  { id: 5, status: 'done', title: 'Ctrl+Z undoes the last step' },
];`,
      body: `const [selected, setSelected] = useState<readonly unknown[]>([]);`,
      jsx: `<>
  {/* Ctrl/⌘-click toggles, Shift-click selects a range in the column,
      Ctrl+A on a card selects its column, Ctrl+Space toggles, Shift+↑/↓
      extends, Escape collapses. A drag of a selected card carries the
      selection (the ghost shows the count); Ctrl+←/→ and Delete act on all
      of it — each one undoable step (Ctrl+Z). */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    selectedCardKeys={selected}
    onSelectedCardKeysChange={setSelected}
    style={{ height: 420 }}
  />
  <p>Selected: {selected.length}</p>
</>`,
    }),
  },
  {
    title: 'Cross-board drag',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanCardTransferredEvent'] },
      name: 'PlanningBoards',
      before: `interface Task {
  id: number;
  status: string;
  title: string;
}`,
      body: `const [backlog, setBacklog] = useState<Task[]>([
  { id: 1, status: 'todo', title: 'Dark mode' },
  { id: 2, status: 'todo', title: 'CSV import' },
  { id: 3, status: 'todo', title: 'Audit log' },
]);
const [sprint, setSprint] = useState<Task[]>([
  { id: 10, status: 'todo', title: 'Login rate limits' },
]);
// both boards report the transfer — idempotent updates make that harmless
const onTransferred = (event: OgeKanbanCardTransferredEvent<Task>) => {
  const moved = new Set(event.sourceCards.map((task) => task.id));
  const [setFrom, setTo] =
    event.fromBoard === 'Backlog' ? [setBacklog, setSprint] : [setSprint, setBacklog];
  setFrom((list) => list.filter((task) => !moved.has(task.id)));
  setTo((list) => [...list.filter((task) => !moved.has(task.id)), ...event.cards]);
};`,
      jsx: `<div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
  {/* Boards sharing a dragGroup exchange cards by drag or the card menu's
      "Move to …" entry (the keyboard twin). The target calls the cancelable
      onCardTransferring; both boards call onCardTransferred. */}
  <OgeKanban
    dataSource={backlog}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    dragGroup="planning"
    boardId="Backlog"
    columns={[{ key: 'todo', title: 'Ideas' }]}
    onCardTransferred={onTransferred}
    style={{ height: 360 }}
  />
  <OgeKanban
    dataSource={sprint}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    dragGroup="planning"
    boardId="Sprint"
    columns={[{ key: 'todo', title: 'To do' }, { key: 'doing', title: 'In progress' }]}
    onCardTransferred={onTransferred}
    style={{ height: 360 }}
  />
</div>`,
    }),
  },
  {
    title: 'Swimlane WIP limits',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'LaneWipBoard',
      before: `const tasks = [
  { id: 1, team: 'Web', status: 'doing', title: 'Token migration' },
  { id: 2, team: 'Web', status: 'todo', title: 'Navigation audit' },
  { id: 3, team: 'Mobile', status: 'doing', title: 'Push opt-in' },
  { id: 4, team: 'Mobile', status: 'doing', title: 'Biometric login — over the cell limit' },
  { id: 5, team: 'Mobile', status: 'todo', title: 'Offline mode — over the lane limit' },
];`,
      jsx: `<>
  {/* swimlaneWipLimit caps a column inside every lane; swimlaneWipLimits
      caps a lane's total, keyed by lane value. Both count real data. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    swimlaneExpr="team"
    columns={[
      { key: 'todo', title: 'To do' },
      { key: 'doing', title: 'In progress', swimlaneWipLimit: 1 },
      { key: 'done', title: 'Done' },
    ]}
    swimlaneWipLimits={{ Mobile: 2 }}
    style={{ height: 520 }}
  />
</>`,
    }),
  },
  {
    title: 'Quick add, inline titles & checklists',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanHandle'] },
      name: 'ChecklistBoard',
      before: `interface Task {
  id: number;
  status: string;
  title: string;
  todo?: { text: string; done: boolean }[];
}

const tasks: Task[] = [
  {
    id: 1,
    status: 'doing',
    title: 'Payments API',
    todo: [
      { text: 'Design endpoints', done: true },
      { text: 'Write tests', done: false },
      { text: 'Roll out', done: false },
    ],
  },
  { id: 2, status: 'todo', title: 'Press F2 to rename me' },
];`,
      body: `const board = useRef<OgeKanbanHandle<Task>>(null);`,
      jsx: `<>
  {/* quickAdd turns the column footer into an inline composer (Enter adds
      and stays open, Escape closes); F2 — or a title double-click with
      inlineTitleEditing — renames in place; checklistExpr maps { text, done }
      sub-tasks to a progress badge. */}
  <OgeKanban
    ref={board}
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    checklistExpr="todo"
    quickAdd
    inlineTitleEditing
    style={{ height: 420 }}
  />
  <button type="button" onClick={() => board.current?.toggleChecklistItem(1, 1)}>
    Tick “Write tests” on the first card
  </button>
</>`,
    }),
  },
];
