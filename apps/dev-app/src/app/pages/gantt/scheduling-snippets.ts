import { demoSource } from '../../shared/demo-source';

export const LAG_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttColumn', 'OgeGanttWorkCalendar'] },
  template: `<!-- lag (negative = lead) on any link type, in working days on the
     calendar or in hours; auto-scheduling pulls tasks earlier as well as
     pushing them later. Edit a link: double-click its arrow, or type
     "2FS+2d" into the Predecessors cell. -->
<button type="button" (click)="gantt.scheduleProject()">Recalculate</button>
<oge-gantt
  #gantt
  [tasks]="tasks"
  [dependencies]="links"
  [columns]="columns"
  [workCalendar]="calendar"
  [autoScheduling]="true"
  [showCriticalPath]="true"
  [inlineEditing]="true"
  style="height: 420px"
/>`,
  body: `protected readonly calendar: OgeGanttWorkCalendar = { workingDays: [1, 2, 3, 4, 5] };
protected readonly columns: OgeGanttColumn[] = [
  { field: 'wbs' },
  { field: 'title' },
  { field: 'start' },
  { field: 'predecessors' },
  { field: 'totalSlack' },
  { field: 'freeSlack' },
];
protected readonly tasks = [
  { id: 1, title: 'Specs', start: new Date(2026, 7, 3), end: new Date(2026, 7, 7) },
  { id: 2, title: 'Prototype', start: new Date(2026, 7, 12), end: new Date(2026, 7, 19) },
  { id: 3, title: 'User tests', start: new Date(2026, 7, 17), end: new Date(2026, 7, 21) },
  { id: 4, title: 'Release', start: new Date(2026, 7, 28), end: new Date(2026, 7, 28) },
];
protected readonly links = [
  { id: 'a', predecessorId: 1, successorId: 2, lag: 2 }, // FS + 2 working days
  { id: 'b', predecessorId: 2, successorId: 3, type: 'SS', lag: 3 },
  { id: 'c', predecessorId: 3, successorId: 4, lag: 4, lagUnit: 'hours' },
];`,
});

export const CONSTRAINTS_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: {
    '@oge-ui/gantt': ['OgeGanttColumn', 'OgeGanttSchedulingConflictEvent'],
  },
  template: `<!-- constraintType + constraintDate (ASAP, ALAP, SNET, SNLT, FNET,
     FNLT, MSO, MFO), a deadline marker and manual tasks the engine never
     moves. Whatever the engine cannot satisfy comes back as a conflict:
     a dashed outline, a "!" badge, the row label — and this event. -->
<oge-gantt
  [tasks]="tasks"
  [dependencies]="links"
  [columns]="columns"
  [autoScheduling]="true"
  style="height: 420px"
  (schedulingConflict)="onConflicts($event)"
/>
<ul aria-live="polite">
  @for (message of messages(); track message) {
    <li>{{ message }}</li>
  }
</ul>`,
  body: `protected readonly messages = signal<string[]>([]);
protected readonly columns: OgeGanttColumn[] = [
  { field: 'title', widthPx: 200 },
  { field: 'constraint' },
  { field: 'deadline' },
];
protected readonly tasks = [
  { id: 1, title: 'Backend', start: new Date(2026, 7, 3), end: new Date(2026, 7, 12) },
  {
    id: 2,
    title: 'Security review',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 5),
    constraintType: 'SNET',
    constraintDate: new Date(2026, 7, 10),
  },
  {
    id: 3,
    title: 'Frontend',
    start: new Date(2026, 7, 12),
    end: new Date(2026, 7, 19),
    deadline: new Date(2026, 7, 18),
  },
  { id: 4, title: 'Translations', start: new Date(2026, 7, 3), end: new Date(2026, 7, 5), constraintType: 'ALAP' },
  {
    id: 5,
    title: 'Vendor install',
    start: new Date(2026, 7, 10),
    end: new Date(2026, 7, 12),
    manuallyScheduled: true,
  },
];
protected readonly links = [
  { id: 'a', predecessorId: 1, successorId: 3 },
  { id: 'b', predecessorId: 1, successorId: 5 }, // the manual task breaks this link
];

protected onConflicts(event: OgeGanttSchedulingConflictEvent<Record<string, unknown>>): void {
  this.messages.set(event.conflicts.map((conflict) => conflict.message));
}`,
});

export const TRACKING_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  template: `<!-- several baselines (toolbar chooser), a split task, the progress
     line through the status date and child milestones rolled up onto the
     summary bar. setBaseline(i) saves the current dates as baseline i. -->
<button type="button" (click)="gantt.setBaseline(2)">Save as baseline 3</button>
<oge-gantt
  #gantt
  [tasks]="tasks"
  [dependencies]="links"
  [showProgressLine]="true"
  [statusDate]="statusDate"
  [showRollups]="true"
  [(baselineIndex)]="baseline"
  style="height: 360px"
/>`,
  body: `protected readonly baseline = signal(0);
protected readonly statusDate = new Date(2026, 7, 14);
protected readonly tasks = [
  { id: 1, title: 'Migration', start: new Date(2026, 7, 3), end: new Date(2026, 7, 3) },
  {
    id: 2,
    parentId: 1,
    title: 'Inventory',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 7),
    progress: 100,
    baselines: [
      { start: new Date(2026, 7, 3), end: new Date(2026, 7, 6) },
      { start: new Date(2026, 7, 4), end: new Date(2026, 7, 7) },
    ],
  },
  { id: 3, parentId: 1, title: 'Plan approved', start: new Date(2026, 7, 7), end: new Date(2026, 7, 7) },
  {
    id: 4,
    parentId: 1,
    title: 'Data copy',
    start: new Date(2026, 7, 10),
    end: new Date(2026, 7, 19),
    progress: 50,
    segments: [
      { start: new Date(2026, 7, 10), end: new Date(2026, 7, 13) },
      { start: new Date(2026, 7, 17), end: new Date(2026, 7, 19) },
    ],
  },
];
protected readonly links = [
  { id: 'a', predecessorId: 2, successorId: 3 },
  { id: 'b', predecessorId: 3, successorId: 4, lag: 1 },
];`,
});

export const SCALES_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttScaleType', 'OgeGanttZoomPreset'] },
  template: `<!-- quarters and years extend the zoom ladder; zoomPresets fills the
     toolbar's scale chooser (a scale plus an optional tick width). -->
<oge-gantt
  [tasks]="tasks"
  [zoomPresets]="presets"
  [(scaleType)]="scale"
  style="height: 300px"
/>`,
  body: `protected readonly scale = signal<OgeGanttScaleType>('quarters');
protected readonly presets: OgeGanttZoomPreset[] = [
  { scaleType: 'weeks', label: 'Sprint view' },
  { scaleType: 'months', tickWidth: 64, label: 'Compact months' },
  { scaleType: 'quarters', label: 'Quarters' },
  { scaleType: 'years', label: 'Roadmap (years)' },
];
protected readonly tasks = [
  { id: 1, title: 'Platform v2', start: new Date(2026, 0, 12), end: new Date(2026, 5, 30) },
  { id: 2, title: 'Mobile apps', start: new Date(2026, 3, 1), end: new Date(2026, 11, 18) },
  { id: 3, title: 'EU region', start: new Date(2026, 8, 1), end: new Date(2027, 2, 31) },
];`,
});
