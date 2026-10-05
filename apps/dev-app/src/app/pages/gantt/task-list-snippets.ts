import { demoSource } from '../../shared/demo-source';

const BACKLOG = `protected readonly tasks = [
  { id: 1, title: 'Discovery', start: new Date(2026, 7, 3), end: new Date(2026, 7, 3) },
  { id: 2, parentId: 1, title: 'Interviews', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6), owner: 'Ana' },
  { id: 3, parentId: 1, title: 'Survey', start: new Date(2026, 7, 4), end: new Date(2026, 7, 8), owner: 'Bora' },
  { id: 4, title: 'Delivery', start: new Date(2026, 7, 10), end: new Date(2026, 7, 10) },
  { id: 5, parentId: 4, title: 'Build', start: new Date(2026, 7, 10), end: new Date(2026, 7, 14), owner: 'Cem' },
  { id: 6, parentId: 4, title: 'Review', start: new Date(2026, 7, 14), end: new Date(2026, 7, 15), owner: 'Ana' },
];
protected readonly links = [{ id: 'a', predecessorId: 5, successorId: 6 }];`;

export const INLINE_EDIT_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttColumn'] },
  template: `<!-- inlineEditing: double-click a cell or press F2 on a row; Enter
     commits, Escape cancels, Tab / Shift+Tab move along the row. Every
     commit runs the cancelable update pipeline and is one undo step. -->
<oge-gantt
  [tasks]="tasks"
  [dependencies]="links"
  [columns]="columns"
  [inlineEditing]="true"
  style="height: 360px"
/>`,
  body: `protected readonly columns: OgeGanttColumn[] = [
  { field: 'wbs', editor: false },
  { field: 'title' },
  { field: 'start' },
  { field: 'duration' },
  { field: 'progress' },
  { field: 'predecessors' },
  { field: 'owner' }, // a data field: a text editor by default
];
${BACKLOG}`,
});

export const SORT_FILTER_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttColumn', 'OgeGanttSortChangedEvent'] },
  template: `<!-- header click / Enter sorts siblings; the filter row and the search
     box keep the ancestors of matches. Drag a header edge (Alt+Arrow) to
     resize, drag a header (Ctrl+Shift+Arrow) to move it; frozen columns
     stay pinned while the pane scrolls sideways. -->
<oge-gantt
  [tasks]="tasks"
  [dependencies]="links"
  [columns]="columns"
  [allowSorting]="true"
  [allowColumnResizing]="true"
  [allowColumnReordering]="true"
  [filterRow]="true"
  [searchPanel]="true"
  style="height: 400px"
  (sortChanged)="lastSort.set($event)"
/>
<p>Sorted by: {{ lastSort()?.field ?? 'store order' }}</p>`,
  body: `protected readonly lastSort = signal<OgeGanttSortChangedEvent | null>(null);
protected readonly columns: OgeGanttColumn[] = [
  { field: 'wbs', frozen: true, allowSorting: false },
  { field: 'title', frozen: true },
  { field: 'owner' },
  { field: 'start' },
  { field: 'end' },
  { field: 'duration' },
];
${BACKLOG}`,
});

export const MULTI_SELECT_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/core': ['RowKey'], '@oge-ui/gantt': ['OgeGanttTask'] },
  template: `<!-- selectionMode 'multiple': Ctrl/Cmd-click toggles, Shift-click and
     Shift+Up/Down extend, Ctrl+A selects all. Delete, Alt+Shift+Left/Right
     and the context menu act on the whole selection — one undo step. -->
<button type="button" (click)="gantt.indentTasks(gantt.getSelectedTasks())">Indent selected</button>
<button type="button" (click)="gantt.deleteTasks(sourcesOf(gantt.getSelectedTasks()))">
  Delete selected
</button>
<oge-gantt
  #gantt
  [tasks]="tasks"
  [dependencies]="links"
  selectionMode="multiple"
  [(selectedTaskKeys)]="selected"
  style="height: 360px"
/>
<p>{{ selected().length }} selected</p>`,
  body: `protected readonly selected = signal<readonly RowKey[]>([]);
protected sourcesOf<T>(tasks: readonly OgeGanttTask<T>[]): T[] {
  return tasks.map((task) => task.source);
}
${BACKLOG}`,
});
