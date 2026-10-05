import { demoSource } from '../../shared/demo-source';

export const CHIPS_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  types: { '@oge-ui/kanban': ['OgeKanbanFilterExpression'] },
  template: `<!-- showFilterBar renders one toggle chip per distinct tag, assignee
     and priority. Inside a group the chips are alternatives (any of),
     groups combine with AND, and the toolbar search narrows further.
     [(filterValue)] is the chip state — bind it to persist or preset.
     WIP counts keep counting the real data. -->
<oge-kanban
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  tagsExpr="labels"
  assigneeExpr="owner"
  priorityExpr="priority"
  [columns]="columns"
  [showFilterBar]="true"
  [(filterValue)]="chips"
  style="height: 460px"
/>
<p>Active chips: {{ describe(chips()) }}</p>`,
  body: `protected readonly chips = signal<OgeKanbanFilterExpression>({
  priorities: ['high'],
});

protected readonly columns = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress', wipLimit: 3 },
  { key: 'done', title: 'Done' },
];

protected readonly tasks = [
  { id: 1, status: 'todo', title: 'Checkout revamp', labels: ['feature'], owner: 'Ada Lovelace', priority: 'high' },
  { id: 2, status: 'todo', title: 'Wallet UI polish', labels: ['design'], owner: 'Grace Hopper', priority: 'medium' },
  { id: 3, status: 'doing', title: 'Fix login crash', labels: ['bug'], owner: 'Ada Lovelace', priority: 'high' },
  { id: 4, status: 'doing', title: 'Upgrade CI runners', labels: ['infra'], owner: 'Alan Turing', priority: 'low' },
  { id: 5, status: 'done', title: 'Search relevance', labels: ['feature'], owner: 'Grace Hopper', priority: 'medium' },
];

protected describe(value: OgeKanbanFilterExpression): string {
  const parts = [
    ...(value.tags ?? []),
    ...(value.assignees ?? []),
    ...(value.priorities ?? []),
  ];
  return parts.length > 0 ? parts.join(', ') : 'none';
}`,
});

export const PREDICATE_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  types: { '@oge-ui/kanban': ['OgeKanbanFilter'] },
  template: `<!-- filter takes a predicate over the normalized card (its source is
     your item) or a declarative expression ({ tags, assignees, priorities,
     columns, swimlanes, text, overdue }). It ANDs with the chips and the
     search. -->
<label>
  <input type="checkbox" [checked]="onlyMine()" (change)="onlyMine.set(!onlyMine())" />
  Only my cards
</label>
<label>
  <input type="checkbox" [checked]="onlyOverdue()" (change)="onlyOverdue.set(!onlyOverdue())" />
  Only overdue
</label>
<oge-kanban
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  assigneeExpr="owner"
  dueDateExpr="due"
  [filter]="filter()"
  style="height: 400px"
/>`,
  body: `protected readonly onlyMine = signal(false);
protected readonly onlyOverdue = signal(false);

protected readonly filter = computed<OgeKanbanFilter | undefined>(() => {
  if (this.onlyOverdue()) return { overdue: true };
  if (this.onlyMine()) return (card) => card.assignees.includes('Ada Lovelace');
  return undefined;
});

protected readonly tasks = [
  { id: 1, status: 'todo', title: 'Quarterly report', owner: 'Ada Lovelace', due: new Date(2020, 0, 10) },
  { id: 2, status: 'todo', title: 'Vendor review', owner: 'Grace Hopper', due: new Date(2099, 5, 1) },
  { id: 3, status: 'doing', title: 'Hiring plan', owner: 'Ada Lovelace' },
  { id: 4, status: 'done', title: 'Offsite booking', owner: 'Alan Turing', due: new Date(2020, 3, 2) },
];`,
});

export const SORT_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  types: { '@oge-ui/kanban': ['OgeKanbanColumnSort'] },
  template: `<!-- columnSort sorts each column independently: { field, direction } per
     column key ('*' = every column) or a comparator. The header's sort
     button (or a right-click on the header) opens the column menu —
     Manual order / Title / Priority / Due date and the direction — which
     writes [(columnSort)]. priorityOrder ranks custom priority values. -->
<oge-kanban
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  priorityExpr="priority"
  dueDateExpr="due"
  [(columnSort)]="sort"
  [priorityOrder]="['blocker', 'high', 'medium', 'low']"
  style="height: 420px"
/>`,
  body: `protected readonly sort = signal<OgeKanbanColumnSort>({
  todo: { field: 'priority' },
  done: { field: 'dueDate', direction: 'desc' },
});

protected readonly tasks = [
  { id: 1, status: 'todo', title: 'Polish onboarding', priority: 'low', due: new Date(2026, 9, 20) },
  { id: 2, status: 'todo', title: 'Payment outage', priority: 'blocker', due: new Date(2026, 9, 6) },
  { id: 3, status: 'todo', title: 'Audit log export', priority: 'medium', due: new Date(2026, 9, 12) },
  { id: 4, status: 'done', title: 'Sprint 41 review', priority: 'medium', due: new Date(2026, 8, 18) },
  { id: 5, status: 'done', title: 'Sprint 42 review', priority: 'medium', due: new Date(2026, 9, 2) },
];`,
});

export const EXPORT_SNIPPET = demoSource({
  use: {
    '@oge-ui/kanban': ['OgeKanban'],
  },
  template: `<!-- exportToCsv() downloads a formula-guarded CSV (core's buildCsv) in
     board order and returns the text; the lazy @oge-ui/kanban/export-excel
     entry builds an .xlsx through the optional exceljs peer. Pass
     { visibleOnly: true } to export only what the filters show. -->
<button type="button" (click)="board.exportToCsv('cards.csv')">Export CSV</button>
<button type="button" (click)="exportExcel(board)">Export Excel</button>
<oge-kanban
  #board
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  tagsExpr="labels"
  checklistExpr="todo"
  style="height: 360px"
/>`,
  body: `protected readonly tasks = [
  { id: 1, status: 'todo', title: 'Release notes', labels: ['docs'], todo: [{ text: 'Draft', done: true }, { text: 'Review', done: false }] },
  { id: 2, status: 'doing', title: '=SUM(A1) is exported as text', labels: ['security'] },
  { id: 3, status: 'done', title: 'Changelog', labels: ['docs'] },
];

protected async exportExcel<T extends object>(board: OgeKanban<T>): Promise<void> {
  const { exportKanbanToExcel } = await import('@oge-ui/kanban/export-excel');
  await exportKanbanToExcel(board, { filename: 'cards.xlsx' });
}`,
});
