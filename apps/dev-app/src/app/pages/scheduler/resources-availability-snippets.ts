import { demoSource } from '../../shared/demo-source';

export const AVAILABILITY_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- disabledSlots hatches non-bookable time: lunch every weekday and a
     training day for one resource. Creating, moving, resizing, pasting or
     dropping there is refused and announced. Each resource's own workHours
     shade its column, and snapToWorkHours clamps moves into them. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="workWeek"
  [views]="['day', 'workWeek', 'timelineWeek']"
  [resources]="staff"
  [groups]="['ownerId']"
  [disabledSlots]="blocked"
  [snapToWorkHours]="true"
  [dayStartHour]="7"
  [dayEndHour]="19"
  [cellDuration]="60"
  style="height: 640px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly staff = [
  {
    fieldExpr: 'ownerId',
    label: 'Owner',
    useColorAsDefault: true,
    items: [
      { id: 'ada', text: 'Ada (8–14)', color: '#7c3aed', workHours: { start: 8, end: 14 } },
      {
        id: 'grace',
        text: 'Grace (12–18)',
        color: '#0891b2',
        workHours: { start: 12, end: 18 },
        workDays: [1, 2, 3, 4],
      },
    ],
  },
];
protected readonly blocked = [
  {
    startDate: new Date(2026, 7, 3, 12, 0),
    endDate: new Date(2026, 7, 3, 13, 0),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    text: 'Lunch',
  },
  {
    startDate: new Date(2026, 7, 7, 8, 0),
    endDate: new Date(2026, 7, 7, 18, 0),
    resources: { ownerId: 'ada' },
    text: 'Ada — training day',
  },
];
protected readonly appointments = [
  {
    id: 1,
    text: 'Ward round',
    startDate: new Date(2026, 7, 6, 9, 0),
    endDate: new Date(2026, 7, 6, 10, 30),
    ownerId: 'ada',
  },
  {
    id: 2,
    text: 'Clinic',
    startDate: new Date(2026, 7, 5, 14, 0),
    endDate: new Date(2026, 7, 5, 16, 0),
    ownerId: 'grace',
  },
];`,
});

export const CONFLICTS_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  types: {
    '@oge-ui/scheduler': ['OgeSchedulerAppointment'],
  },
  template: `<!-- allowOverlap=false refuses overlapping changes with a notice and an
     announcement; conflictCheck decides case by case and wins — here a
     change may overlap tentative holds, never a confirmed appointment. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="day"
  [allowOverlap]="false"
  [conflictCheck]="onlyTentative"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly appointments: Record<string, unknown>[] = [
  {
    id: 1,
    text: 'Surgery block',
    startDate: new Date(2026, 7, 6, 9, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
    color: '#dc2626',
  },
  {
    id: 2,
    text: 'Hold — maybe lunch',
    startDate: new Date(2026, 7, 6, 12, 0),
    endDate: new Date(2026, 7, 6, 13, 30),
    color: '#94a3b8',
    tentative: true,
  },
];

protected readonly onlyTentative = (
  _appointment: Record<string, unknown>,
  conflicts: readonly OgeSchedulerAppointment<Record<string, unknown>>[],
): boolean => conflicts.every((c) => c.source['tentative'] === true);`,
});

export const DRAG_IN_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler', 'OgeSchedulerDraggable'] },
  types: {
    '@oge-ui/scheduler': [
      'OgeSchedulerAppointmentDroppedEvent',
      'OgeSchedulerDragOutEvent',
    ],
  },
  template: `<!-- [ogeSchedulerDraggable] turns any element into an appointment
     source: drag it onto a slot, or press Enter / click to pick it up and
     Enter / click a cell to place it (the keyboard and single-pointer twin).
     appointmentDropped reports the built item; dragOut fires when a chip is
     dragged out and released elsewhere. -->
<ul class="mb-3 flex flex-wrap gap-2">
  @for (task of tasks(); track task.id) {
    <li
      [ogeSchedulerDraggable]="task"
      [ogeSchedulerDraggableDuration]="task.minutes"
      class="rounded border px-3 py-1 text-sm"
    >
      {{ task.text }} · {{ task.minutes }} min
    </li>
  }
</ul>
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="week"
  [dayStartHour]="8"
  [dayEndHour]="18"
  (appointmentDropped)="dropped($event)"
  (dragOut)="draggedOut($event)"
  style="height: 560px"
/>
<p class="mt-2 text-sm" aria-live="polite">{{ lastAction() }}</p>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly tasks = signal([
  { id: 't1', text: 'Write release notes', minutes: 60 },
  { id: 't2', text: 'Review pull requests', minutes: 90 },
  { id: 't3', text: 'Prepare demo', minutes: 120 },
]);
protected readonly lastAction = signal('');
protected readonly appointments: Record<string, unknown>[] = [];

protected dropped(event: OgeSchedulerAppointmentDroppedEvent<Record<string, unknown>>): void {
  if (!event.added) return;
  const task = event.itemData as { id: string; text: string };
  this.tasks.update((list) => list.filter((t) => t.id !== task.id));
  this.lastAction.set('Scheduled ' + task.text);
}

protected draggedOut(event: OgeSchedulerDragOutEvent<Record<string, unknown>>): void {
  this.lastAction.set('Dragged out: ' + event.appointment.text);
}`,
});

export const SELECTION_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- Ctrl/⌘-click toggles chips into the selection, Shift-click extends it;
     Ctrl+C copies, Ctrl+V on a focused cell pastes, Ctrl+Z / Ctrl+Y undo and
     redo every edit. The same actions are methods on the component. -->
<div class="mb-3 flex flex-wrap items-center gap-2">
  <button type="button" (click)="scheduler().undo()" [disabled]="!scheduler().canUndo()">Undo</button>
  <button type="button" (click)="scheduler().redo()" [disabled]="!scheduler().canRedo()">Redo</button>
  <button type="button" (click)="scheduler().clearSelection()">Clear selection</button>
  <span class="text-sm">{{ selected().length }} selected</span>
</div>
<oge-scheduler
  #cal
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="week"
  [(selectedAppointments)]="selected"
  [undoLimit]="100"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly scheduler = viewChild.required<OgeScheduler<Record<string, unknown>>>('cal');
protected readonly date = new Date(2026, 7, 6);
protected readonly selected = signal<readonly Record<string, unknown>[]>([]);
protected readonly appointments: Record<string, unknown>[] = [
  {
    id: 1,
    text: 'Design pairing',
    startDate: new Date(2026, 7, 6, 10, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
  },
  {
    id: 2,
    text: 'Release prep',
    startDate: new Date(2026, 7, 6, 13, 0),
    endDate: new Date(2026, 7, 6, 15, 30),
    color: '#16a34a',
  },
  {
    id: 3,
    text: 'Interviews',
    startDate: new Date(2026, 7, 7, 14, 0),
    endDate: new Date(2026, 7, 7, 16, 0),
    color: '#d97706',
  },
];`,
});
