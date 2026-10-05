import { demoSource } from '../../shared/demo-source';

export const MULTI_SELECT_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  template: `<!-- Ctrl/⌘-click toggles, Shift-click selects a range in the column,
     Ctrl+A on a card selects its column, Ctrl+Space toggles, Shift+↑/↓
     extends, Escape collapses. Dragging a selected card carries the whole
     selection (the ghost shows the count); Ctrl+←/→ moves it from the
     keyboard and Delete removes it — each one undoable step (Ctrl+Z). -->
<oge-kanban
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  [(selectedCardKeys)]="selected"
  style="height: 420px"
/>
<p>Selected: {{ selected().length }}</p>`,
  body: `protected readonly selected = signal<readonly unknown[]>([]);

protected readonly tasks = [
  { id: 1, status: 'todo', title: 'Ctrl-click me' },
  { id: 2, status: 'todo', title: '…and me' },
  { id: 3, status: 'todo', title: 'Shift-click for a range' },
  { id: 4, status: 'doing', title: 'Drag a selected card' },
  { id: 5, status: 'done', title: 'Ctrl+Z undoes the last step' },
];`,
});

export const CROSS_BOARD_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  types: { '@oge-ui/kanban': ['OgeKanbanCardTransferredEvent'] },
  before: `interface Task {
  id: number;
  status: string;
  title: string;
}`,
  template: `<!-- Boards sharing a dragGroup exchange cards: drag a card (or a
     selection) onto the other board, or use the card menu's "Move to …"
     entry — the keyboard and single-pointer twin. The target board fires
     the cancelable cardTransferring; both fire cardTransferred, so each
     host updates its own array. -->
<div style="display: grid; gap: 12px; grid-template-columns: 1fr 1fr">
  <oge-kanban
    [dataSource]="backlog()"
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    dragGroup="planning"
    boardId="Backlog"
    [columns]="[{ key: 'todo', title: 'Ideas' }]"
    (cardTransferred)="onTransferred($event)"
    style="height: 360px"
  />
  <oge-kanban
    [dataSource]="sprint()"
    keyExpr="id"
    columnExpr="status"
    titleExpr="title"
    dragGroup="planning"
    boardId="Sprint"
    [columns]="[{ key: 'todo', title: 'To do' }, { key: 'doing', title: 'In progress' }]"
    (cardTransferred)="onTransferred($event)"
    style="height: 360px"
  />
</div>`,
  body: `protected readonly backlog = signal<Task[]>([
  { id: 1, status: 'todo', title: 'Dark mode' },
  { id: 2, status: 'todo', title: 'CSV import' },
  { id: 3, status: 'todo', title: 'Audit log' },
]);
protected readonly sprint = signal<Task[]>([
  { id: 10, status: 'todo', title: 'Login rate limits' },
]);

// both boards report the transfer; each side updates its own array once
protected onTransferred(event: OgeKanbanCardTransferredEvent<Task>): void {
  const moved = new Set(event.sourceCards.map((task) => task.id));
  const from = event.fromBoard === 'Backlog' ? this.backlog : this.sprint;
  const to = event.toBoard === 'Backlog' ? this.backlog : this.sprint;
  if (from().some((task) => moved.has(task.id))) {
    from.set(from().filter((task) => !moved.has(task.id)));
    to.set([...to(), ...event.cards]);
  }
}`,
});

export const SWIMLANE_WIP_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  template: `<!-- swimlaneWipLimit caps a column inside every lane (the cell badge
     turns danger on overflow); swimlaneWipLimits caps a lane's total, keyed
     by lane value (the lane header's count). Both count real data. -->
<oge-kanban
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  swimlaneExpr="team"
  [columns]="[
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress', swimlaneWipLimit: 1 },
    { key: 'done', title: 'Done' },
  ]"
  [swimlaneWipLimits]="{ Mobile: 2 }"
  style="height: 520px"
/>`,
  body: `protected readonly tasks = [
  { id: 1, team: 'Web', status: 'doing', title: 'Token migration' },
  { id: 2, team: 'Web', status: 'todo', title: 'Navigation audit' },
  { id: 3, team: 'Mobile', status: 'doing', title: 'Push opt-in' },
  { id: 4, team: 'Mobile', status: 'doing', title: 'Biometric login — over the cell limit' },
  { id: 5, team: 'Mobile', status: 'todo', title: 'Offline mode — over the lane limit' },
];`,
});

export const QUICK_ADD_SNIPPET = demoSource({
  use: { '@oge-ui/kanban': ['OgeKanban'] },
  template: `<!-- quickAdd turns the column footer's "New card" into an inline
     composer: type a title, Enter adds it (and keeps the composer open),
     Escape closes. F2 on a card — or a double-click on its title with
     inlineTitleEditing — edits the title in place. checklistExpr maps
     { text, done } sub-tasks to a progress badge; toggleChecklistItem()
     writes back through cardUpdating. -->
<oge-kanban
  #board
  [dataSource]="tasks"
  keyExpr="id"
  columnExpr="status"
  titleExpr="title"
  checklistExpr="todo"
  [quickAdd]="true"
  [inlineTitleEditing]="true"
  style="height: 420px"
/>
<button type="button" (click)="board.toggleChecklistItem(1, 1)">
  Tick “Write tests” on the first card
</button>`,
  body: `protected readonly tasks = [
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
});
