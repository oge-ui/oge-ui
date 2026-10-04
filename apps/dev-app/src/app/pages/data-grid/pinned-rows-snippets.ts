import { demoSource } from '../../shared/demo-source';

export const PINNED_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid', 'OgePagerInfoTemplate'] },
  dataset: 'employees',
  template: `<!-- key 3 moves out of the body into the sticky top section;
     the totals object is a display row in the sticky footer -->
<oge-grid [data]="employees" keyField="id"
          [pinnedTopRows]="[3]"
          [pinnedBottomRows]="[totals]"
          [paging]="{ pageSize: 3, showFirstLastButtons: true, showPageInput: true }">
  <oge-column field="firstName" caption="Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
  <span *ogePagerInfoTemplate="let info">
    {{ info.firstRow }}–{{ info.lastRow }} of {{ info.totalCount }}
  </span>
</oge-grid>`,
  body: `protected readonly totals = { id: 0, firstName: 'Total', salary: 36900 };`,
});

export const STICKY_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- the enclosing group rows stay under the header while you scroll -->
<oge-grid [data]="employees" keyField="id" style="height: 360px"
          [virtualScroll]="true" [stickyGroupRows]="true"
          [groupBy]="['department', 'hireDate']">
  <oge-column field="department" caption="Department" />
  <!-- quarter buckets: "Q2 2026"; numeric columns take a width, e.g. [groupInterval]="10000" -->
  <oge-column field="hireDate" caption="Hired" dataType="date" groupInterval="quarter" />
  <oge-column field="firstName" caption="Name" />
</oge-grid>`,
});

export const DRAG_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeRowDropEvent'] },
  before: `interface Task {
  id: number;
  title: string;
}`,
  template: `<!-- rows of one rowDragGroup move between the grids -->
<oge-grid id="todo" [data]="todo()" keyField="id"
          [rowDragging]="true" rowDragGroup="tasks" (rowDrop)="onDrop($event)">
  <oge-column field="title" caption="To do" />
</oge-grid>
<oge-grid id="done" [data]="done()" keyField="id"
          [rowDragging]="true" rowDragGroup="tasks" (rowDrop)="onDrop($event)">
  <oge-column field="title" caption="Done" />
</oge-grid>`,
  body: `protected readonly todo = signal<Task[]>([
  { id: 1, title: 'Write specs' },
  { id: 2, title: 'Ship it' },
]);
protected readonly done = signal<Task[]>([{ id: 3, title: 'Plan' }]);

protected onDrop(event: OgeRowDropEvent): void {
  if (event.sameComponent) return; // a reorder: the grid already moved it
  const from = event.sourceComponentId === 'todo' ? this.todo : this.done;
  const to = event.targetComponentId === 'todo' ? this.todo : this.done;
  const row = event.sourceRow as Task;
  from.update((rows) => rows.filter((r) => r.id !== row.id));
  to.update((rows) => {
    const next = [...rows];
    next.splice(event.toIndex, 0, row);
    return next;
  });
}`,
});
