import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React Kanban overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../kanban/overview.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): the same eight sections, same order, same
 * example content, React idiom.
 */
export const KANBAN_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'TaskBoard',
      before: `const columns = [
  { key: 'todo', title: 'To do', color: '#64748b' },
  { key: 'doing', title: 'In progress', color: '#2563eb', wipLimit: 3 },
  { key: 'review', title: 'Review', color: '#d97706' },
  { key: 'done', title: 'Done', color: '#16a34a' },
];

const tasks = [
  {
    id: 1,
    status: 'doing',
    title: 'Checkout revamp',
    notes: 'New payment flow behind the feature flag',
    owner: 'Ada Lovelace',
    due: new Date(2026, 7, 21),
    priority: 'high',
    labels: ['feature'],
  },
  {
    id: 2,
    status: 'todo',
    title: 'Wallet UI polish',
    owner: ['Grace Hopper', 'Alan Turing'],
    priority: 'medium',
    labels: ['design'],
  },
  { id: 3, status: 'todo', title: 'Upgrade CI runners', priority: 'low' },
  {
    id: 4,
    status: 'review',
    title: 'Fix login crash',
    notes: 'Repro: expired refresh token',
    owner: 'Ada Lovelace',
    due: new Date(2026, 7, 5),
    priority: 'high',
    labels: ['bug'],
  },
  { id: 5, status: 'done', title: 'Q3 roadmap draft' },
];`,
      jsx: `<>
  {/* One element, a working board. Any item shape binds through the
      *Expr props — field names, dotted paths or getter functions. Columns can
      be declared (with titles, colors and WIP limits) or derived from the data.
      Drag a card between columns (Escape cancels mid-drag), double-click to
      edit, right-click for the built-in menu, type in the toolbar to search,
      and add a column at the board's end (allowColumnAdding). The edit
      dialog only offers editors for fields the board maps. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    descriptionExpr="notes"
    assigneeExpr="owner"
    dueDateExpr="due"
    priorityExpr="priority"
    tagsExpr="labels"
    columns={columns}
    allowColumnAdding
    style={{ height: 520 }}
  />
</>`,
    }),
  },
  {
    title: 'Swimlanes',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'TeamBoard',
      before: `const tasks = [
  { id: 1, team: 'Platform', status: 'doing', title: 'Sharding rollout' },
  { id: 2, team: 'Platform', status: 'todo', title: 'Postgres 18 upgrade' },
  { id: 3, team: 'Mobile', status: 'todo', title: 'Push notification opt-in' },
  { id: 4, team: 'Mobile', status: 'done', title: 'Biometric login' },
  { id: 5, team: 'Web', status: 'doing', title: 'Design token migration' },
];`,
      body: `const [collapsedLanes, setCollapsedLanes] = useState<readonly string[]>([]);`,
      jsx: `<>
  {/* swimlaneExpr turns the board into swimlane rows × columns. Lane
      headers collapse (collapsedSwimlanes + onCollapsedSwimlanesChange is a
      controlled pair, like collapsedColumns); every lane scrolls its column
      cells independently. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    swimlaneExpr="team"
    columns={[
      { key: 'todo', title: 'To do' },
      { key: 'doing', title: 'In progress' },
      { key: 'done', title: 'Done' },
    ]}
    collapsedSwimlanes={collapsedLanes}
    onCollapsedSwimlanesChange={setCollapsedLanes}
    style={{ height: 560 }}
  />
</>`,
    }),
  },
  {
    title: 'WIP limits',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'WipBoard',
      before: `const tasks = [
  { id: 1, status: 'doing', title: 'Payments API' },
  { id: 2, status: 'doing', title: 'Search relevance' },
  { id: 3, status: 'doing', title: 'One too many — WIP exceeded' },
  { id: 4, status: 'todo', title: 'Docs sweep' },
  { id: 5, status: 'done', title: 'Login rate limits' },
];`,
      jsx: `<>
  {/* wipLimit is a soft limit: the column count badge shows count/limit,
      turns to the danger tone on overflow, and previews the target column's
      +1 while a drag hovers it. Limits count real data — search filtering
      never changes them. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    columns={[
      { key: 'todo', title: 'To do' },
      { key: 'doing', title: 'In progress', wipLimit: 2 },
      { key: 'done', title: 'Done' },
    ]}
    style={{ height: 420 }}
  />
</>`,
    }),
  },
  {
    title: 'Drag & drop pipeline',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanCardMovingEvent'] },
      name: 'GuardedBoard',
      before: `const tasks = [
  { id: 1, status: 'todo', title: 'Refactor auth', rank: 0 },
  { id: 2, status: 'todo', title: 'Ship dark mode', rank: 1 },
  { id: 3, status: 'doing', title: 'Bundle size audit', rank: 0 },
  { id: 4, status: 'done', title: 'This card is locked in', rank: 0 },
];

function onMoving(event: OgeKanbanCardMovingEvent): void {
  // veto example: nothing may leave "done"
  if (event.fromColumn === 'done') event.cancel = true;
}`,
      body: `const [log, setLog] = useState('drag a card');`,
      jsx: `<>
  {/* Every move — drag, Ctrl+Arrow or moveCard() — runs the same
      cancelable pipeline: onCardMoving (set cancel = true to veto) then
      onCardMoved with {card, fromColumn, toColumn, fromIndex, toIndex}.
      Mid-drag Escape restores everything. orderExpr persists the in-column
      order back onto your items; without it the array order is the board
      order. Column headers drag too (allowColumnReordering). */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    orderExpr="rank"
    allowColumnReordering
    onCardMoving={onMoving}
    onCardMoved={(e) => setLog(\`moved: \${e.toColumn} @ \${e.toIndex}\`)}
    style={{ height: 420 }}
  />
  <p>{log}</p>
</>`,
    }),
  },
  {
    title: 'Keyboard moving & a11y',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'KeyboardBoard',
      before: `const tasks = [
  { id: 1, status: 'todo', title: 'Tab to the board, then arrow around' },
  { id: 2, status: 'todo', title: 'Ctrl+ArrowRight moves me' },
  { id: 3, status: 'doing', title: 'Enter opens my dialog' },
];`,
      jsx: `<>
  {/* Full keyboard board: arrows rove between cards and columns, Enter
      edits, Delete deletes, and Ctrl+Arrow MOVES the focused card — the
      exact keyboard twin of the drag, with a polite live-region
      announcement ("… moved to …, position 2 of 3") after every commit.
      Columns are labeled listboxes; cards are options. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    style={{ height: 420 }}
  />
</>`,
    }),
  },
  {
    title: 'Edit dialog & events',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanEditDialogShowingEvent'] },
      name: 'DialogBoard',
      before: `const tasks = [
  { id: 1, status: 'todo', title: 'Double-click me', notes: 'Custom form field below' },
  { id: 2, status: 'doing', title: 'Right-click me for the menu' },
];

function onDialogShowing(event: OgeKanbanEditDialogShowingEvent): void {
  // drop the color field and add a sprint picker
  event.formItems = [
    ...event.formItems.filter((item) => item.field !== 'color'),
    {
      field: 'sprint',
      label: 'Sprint',
      editorType: 'selectBox',
      editorOptions: { items: ['Sprint 41', 'Sprint 42', 'Sprint 43'] },
    },
  ];
}`,
      jsx: `<>
  {/* The built-in dialog (an <OgeForm>) covers the standard fields;
      onCardEditDialogShowing is both the veto and the customization point —
      formItems arrives pre-populated and may be mutated or replaced. Saves
      and deletes run the cancelable onCardUpdating / onCardDeleting
      pipelines; new cards go through onCardAdding. */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    descriptionExpr="notes"
    onCardEditDialogShowing={onDialogShowing}
    style={{ height: 420 }}
  />
</>`,
    }),
  },
  {
    title: 'Card template',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      types: { '@oge-ui/react-kanban': ['OgeKanbanCard'] },
      name: 'DeploymentBoard',
      before: `const deployments = [
  { id: 1, stage: 'staging', service: 'api-gateway', version: 'v2.14.0', health: 98 },
  { id: 2, stage: 'staging', service: 'search', version: 'v1.9.2', health: 74 },
  { id: 3, stage: 'production', service: 'billing', version: 'v3.1.1', health: 100 },
];

function field(card: OgeKanbanCard, name: string): string {
  return String((card.source as Record<string, unknown>)[name] ?? '');
}`,
      jsx: `<>
  {/* renderCard replaces the card body while drag, keyboard and ARIA stay
      on the board. card.source is your original item (typed unknown —
      narrow it in a helper). Rich templates usually pair with a matching
      cardHeight, or opt out of virtualization entirely
      (virtualScrolling={false}) when heights must vary. */}
  <OgeKanban
    dataSource={deployments}
    keyExpr="id"
    columnExpr="stage"
    titleExpr="service"
    cardHeight={96}
    style={{ height: 420 }}
    renderCard={({ card }) => (
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong>{card.title}</strong>
        <code style={{ fontSize: 11 }}>{field(card, 'version')}</code>
        <progress value={Number(field(card, 'health'))} max={100} style={{ width: '100%' }} />
      </div>
    )}
  />
</>`,
    }),
  },
  {
    title: 'Configuration & i18n',
    source: reactDemoSource({
      use: { '@oge-ui/react-kanban': ['OgeKanban'] },
      name: 'GermanBoard',
      before: `// App-wide (wrap the tree once; a new config object re-resolves every
// board below it, so switching the UI language is a state change):
// <OgeKanbanConfigProvider
//   config={{
//     locale: 'de-DE',
//     cardHeight: 104,
//     messages: {
//       toolbar: {
//         label: 'Kanban-Werkzeugleiste',
//         addCard: 'Neue Karte',
//         collapseAll: 'Alle einklappen',
//         expandAll: 'Alle ausklappen',
//         searchLabel: 'Karten durchsuchen',
//         searchPlaceholder: 'Suchen…',
//         clearSearch: 'Suche löschen',
//       },
//     },
//   }}
// >

const tasks = [
  { id: 1, status: 'Offen', title: 'Angebot schreiben', due: new Date(2026, 7, 14) },
  { id: 2, status: 'In Arbeit', title: 'Rechnung prüfen' },
  { id: 3, status: 'Fertig', title: 'Kickoff-Termin' },
];`,
      jsx: `<>
  {/* Every user-facing string — toolbar, menu, dialog, aria labels,
      live-region announcements — lives in OgeKanbanMessages. Provide once
      (OgeKanbanConfigProvider), override per instance with messages; locale
      drives every Intl format (due-date badges). */}
  <OgeKanban
    dataSource={tasks}
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    dueDateExpr="due"
    locale="de-DE"
    style={{ height: 380 }}
  />
</>`,
    }),
  },
];
