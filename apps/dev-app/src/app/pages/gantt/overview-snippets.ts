import { demoSource } from '../../shared/demo-source';

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  template: `<!-- One element, a working Gantt: task tree pane + timeline chart
     with summary brackets, milestone diamonds and dependency arrows. Drag a
     bar to move it (Escape cancels mid-drag), pull its edges to resize, drag
     the bottom knob to set progress, drag a link dot onto another bar to draw
     a dependency. Double-click opens the task dialog. -->
<oge-gantt
  [tasks]="tasks"
  [dependencies]="links"
  style="height: 480px"
/>`,
  body: `protected readonly tasks = [
  { id: 1, title: 'Release 1.0', start: new Date(2026, 7, 3), end: new Date(2026, 7, 21) },
  {
    id: 2,
    parentId: 1,
    title: 'Design',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 7),
    progress: 100,
  },
  {
    id: 3,
    parentId: 1,
    title: 'Implementation',
    start: new Date(2026, 7, 7),
    end: new Date(2026, 7, 17),
    progress: 45,
  },
  {
    id: 4,
    parentId: 1,
    title: 'Ship',
    start: new Date(2026, 7, 21),
    end: new Date(2026, 7, 21), // zero-length => milestone diamond
  },
];

protected readonly links = [
  { id: 'a', predecessorId: 2, successorId: 3 }, // FS is the default type
  { id: 'b', predecessorId: 3, successorId: 4 },
];`,
});

export const FIELD_MAPPING_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  template: `<!-- Any item shape binds through the *Expr inputs — field names,
     dotted paths or getter functions — for tasks AND dependency links.
     String dates parse as local wall time and write back in the same
     storage shape after edits. -->
<oge-gantt
  [tasks]="workItems"
  [dependencies]="relations"
  keyExpr="code"
  parentKeyExpr="parentCode"
  titleExpr="subject"
  startExpr="plan.begin"
  endExpr="plan.finish"
  progressExpr="done"
  dependencyKeyExpr="relId"
  predecessorKeyExpr="fromCode"
  successorKeyExpr="toCode"
  style="height: 360px"
/>`,
  body: `protected readonly workItems = [
  {
    code: 'EPIC-1',
    subject: 'Checkout revamp',
    plan: { begin: '2026-08-03', finish: '2026-08-14' },
  },
  {
    code: 'T-1',
    parentCode: 'EPIC-1',
    subject: 'Payment API',
    plan: { begin: '2026-08-03', finish: '2026-08-07' },
    done: 80,
  },
  {
    code: 'T-2',
    parentCode: 'EPIC-1',
    subject: 'Wallet UI',
    plan: { begin: '2026-08-07', finish: '2026-08-14' },
    done: 20,
  },
];

protected readonly relations = [{ relId: 1, fromCode: 'T-1', toCode: 'T-2' }];`,
});

export const CRITICAL_PATH_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  template: `<!-- showCriticalPath outlines the tasks with zero slack;
     autoScheduling pushes successors forward whenever a predecessor moves
     (FS/SS/FF/SF respected). Drawing a link that would close a cycle is
     rejected and announced — try dragging a link dot backwards. -->
<oge-gantt
  [tasks]="tasks"
  [dependencies]="links"
  [showCriticalPath]="true"
  [autoScheduling]="true"
  style="height: 420px"
/>`,
  body: `protected readonly tasks = [
  { id: 1, title: 'Foundation', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6), progress: 100 },
  { id: 2, title: 'Framing', start: new Date(2026, 7, 6), end: new Date(2026, 7, 12), progress: 60 },
  { id: 3, title: 'Electrical', start: new Date(2026, 7, 12), end: new Date(2026, 7, 15) },
  { id: 4, title: 'Landscaping', start: new Date(2026, 7, 6), end: new Date(2026, 7, 10) },
  { id: 5, title: 'Inspection', start: new Date(2026, 7, 17), end: new Date(2026, 7, 18) },
];

protected readonly links = [
  { id: 1, predecessorId: 1, successorId: 2 },
  { id: 2, predecessorId: 2, successorId: 3 },
  { id: 3, predecessorId: 3, successorId: 5 },
  { id: 4, predecessorId: 4, successorId: 5 },
];`,
});

export const BASELINES_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttStripLine'] },
  template: `<!-- Baseline bars render the original plan under the live bars;
     stripLines mark deadlines (a line) or freeze windows (a range) on the
     chart; resources label the bars. Weekends shade automatically and
     holidays add to the off-day shading. -->
<oge-gantt
  [tasks]="tasks"
  [stripLines]="stripLines"
  [resources]="people"
  [holidays]="holidays"
  style="height: 380px"
/>`,
  body: `protected readonly tasks = [
  {
    id: 1,
    title: 'Data migration',
    start: new Date(2026, 7, 4),
    end: new Date(2026, 7, 11),
    baselineStart: new Date(2026, 7, 3),
    baselineEnd: new Date(2026, 7, 7),
    progress: 70,
    resourceId: 'ada',
  },
  {
    id: 2,
    title: 'Cutover rehearsal',
    start: new Date(2026, 7, 11),
    end: new Date(2026, 7, 14),
    baselineStart: new Date(2026, 7, 10),
    baselineEnd: new Date(2026, 7, 12),
    resourceId: 'grace',
  },
];

protected readonly stripLines: OgeGanttStripLine[] = [
  { start: new Date(2026, 7, 18), label: 'Go-live', color: '#dc2626' },
  {
    start: new Date(2026, 7, 14),
    end: new Date(2026, 7, 17),
    label: 'Freeze',
  },
];

protected readonly people = [
  { id: 'ada', text: 'Ada', color: '#7c3aed' },
  { id: 'grace', text: 'Grace', color: '#0891b2' },
];

protected readonly holidays = [new Date(2026, 7, 10)];`,
});

export const EDITING_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: {
    '@oge-ui/gantt': ['OgeGanttTaskDeletingEvent', 'OgeGanttTaskUpdatingEvent'],
  },
  template: `<!-- Every mutation runs a cancelable '-ing' event before the
     store changes; the past-tense event fires only for applied changes —
     persist from there. allow* flags gate each capability; readOnly turns
     the whole widget display-only. This demo protects finished tasks and
     asks before deleting. -->
<oge-gantt
  [tasks]="tasks"
  [allowDependencyAdding]="false"
  (taskUpdating)="protectDone($event)"
  (taskDeleting)="confirmDelete($event)"
  style="height: 360px"
/>`,
  body: `protected readonly tasks = [
  { id: 1, title: 'Audit (done — locked)', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6), progress: 100 },
  { id: 2, title: 'Remediation', start: new Date(2026, 7, 6), end: new Date(2026, 7, 13), progress: 30 },
];

protected protectDone(
  event: OgeGanttTaskUpdatingEvent<Record<string, unknown>>,
): void {
  if ((event.oldData['progress'] as number) === 100) event.cancel = true;
}

protected confirmDelete(
  event: OgeGanttTaskDeletingEvent<Record<string, unknown>>,
): void {
  event.cancel = !confirm('Delete this task?');
}`,
});

export const TOOLBAR_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttScaleType'] },
  template: `<!-- The toolbar adds tasks, zooms between hour/day/week/month
     scales (Ctrl+wheel on the chart works too), fits the whole plan,
     expands/collapses the tree and drives snapshot undo/redo — every edit,
     including drags, is one undo step. scaleType is two-way. The task list
     is a virtualized treegrid: columns are configurable and the splitter
     between the panes drags. -->
<oge-gantt
  [tasks]="tasks"
  [(scaleType)]="scale"
  [columns]="columns"
  [taskListWidth]="300"
  style="height: 420px"
/>`,
  body: `protected readonly scale = signal<OgeGanttScaleType>('weeks');
protected readonly columns = [
  { field: 'title' },
  { field: 'progress' },
  { field: 'owner', header: 'Owner' },
] as const;

protected readonly tasks = [
  { id: 1, title: 'Discovery', start: new Date(2026, 6, 6), end: new Date(2026, 6, 24), progress: 100, owner: 'Ada' },
  { id: 2, title: 'Build', start: new Date(2026, 6, 27), end: new Date(2026, 8, 4), progress: 40, owner: 'Grace' },
  { id: 3, title: 'Rollout', start: new Date(2026, 8, 7), end: new Date(2026, 8, 25), owner: 'Ada' },
];`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt', 'OgeGanttTaskTemplate'] },
  template: `<!-- *ogeGanttTaskTemplate replaces the bar's title content while
     the bar surface, gestures and keyboard semantics stay with the
     component. -->
<oge-gantt [tasks]="tasks" style="height: 300px">
  <ng-template ogeGanttTaskTemplate let-task>
    <strong>{{ task.title }}</strong>
    <span class="opacity-75"> · {{ task.progress }}%</span>
  </ng-template>
</oge-gantt>`,
  body: `protected readonly tasks = [
  { id: 1, title: 'Usability study', start: new Date(2026, 7, 3), end: new Date(2026, 7, 12), progress: 55, color: '#0f766e' },
  { id: 2, title: 'Findings report', start: new Date(2026, 7, 12), end: new Date(2026, 7, 17), progress: 10 },
];`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  helpers: { '@oge-ui/gantt': ['provideOgeGanttConfig'] },
  template: `<!-- Every user-facing string, aria labels included, lives in
     OgeGanttMessages — provide once with provideOgeGanttConfig() or override
     per instance with [messages]. locale drives every Intl date format;
     rowHeight and undoLimit are config-level too. -->
<oge-gantt [tasks]="tasks" locale="de" style="height: 300px" />`,
  body: `// App-wide (main.ts / route providers):
// provideOgeGanttConfig({
//   locale: 'de',
//   rowHeight: 32,
//   messages: {
//     toolbar: { ...germanToolbar },
//   },
// })

protected readonly tasks = [
  { id: 1, title: 'Planung', start: new Date(2026, 7, 3), end: new Date(2026, 7, 10), progress: 25 },
];`,
});
