import { demoSource } from '../../shared/demo-source';

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  types: { '@oge-ui/scheduler': ['OgeSchedulerView'] },
  template: `<!-- One element, a working scheduler: week view with an all-day
     strip, drag-move / edge-resize (Escape cancels mid-gesture), double-click
     or Enter creates through the form dialog, single click opens the summary
     popup. Dates are plain local Dates — no date library, no adapter. -->
<oge-scheduler
  [dataSource]="appointments"
  [(currentDate)]="date"
  [(currentView)]="view"
  [dayStartHour]="8"
  [dayEndHour]="19"
  style="height: 640px"
/>`,
  body: `protected readonly date = signal(new Date(2026, 7, 6));
protected readonly view = signal<OgeSchedulerView>('week');
protected readonly appointments = [
  {
    id: 1,
    text: 'Design review',
    startDate: new Date(2026, 7, 4, 9, 30),
    endDate: new Date(2026, 7, 4, 11, 0),
    color: '#2563eb',
  },
  {
    id: 2,
    text: 'Sprint planning',
    startDate: new Date(2026, 7, 6, 10, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
    color: '#16a34a',
  },
  {
    id: 3,
    text: 'Customer workshop',
    startDate: new Date(2026, 7, 5),
    endDate: new Date(2026, 7, 7),
    allDay: true,
    color: '#d97706',
  },
];`,
});

export const FIELD_MAPPING_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- Any item shape binds through the *Expr inputs (field names,
     dotted paths or getter functions). String dates parse as LOCAL wall time
     and write back in the SAME storage shape — a string-dated store never
     silently turns into Date objects after an edit. -->
<oge-scheduler
  [dataSource]="meetings"
  keyExpr="meetingId"
  textExpr="subject"
  startDateExpr="slot.begin"
  endDateExpr="slot.finish"
  colorExpr="badge"
  [currentDate]="date"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly meetings = [
  {
    meetingId: 'a',
    subject: 'Standup',
    slot: { begin: '2026-08-06T09:00', finish: '2026-08-06T09:15' },
    badge: '#7c3aed',
  },
  {
    meetingId: 'b',
    subject: '1:1',
    slot: { begin: '2026-08-06T09:00', finish: '2026-08-06T10:00' },
    badge: '#0891b2',
  },
];`,
});

export const EDITING_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  types: {
    '@oge-ui/scheduler': [
      'OgeSchedulerAppointmentAddingEvent',
      'OgeSchedulerAppointmentDeletingEvent',
    ],
  },
  template: `<!-- Every mutation runs a cancelable '-ing' event before the
     store changes; set cancel = true to veto (weekends here). The matching
     past-tense event fires only for applied changes — persist from there.
     allowAdding/Updating/Deleting/Dragging/Resizing gate each capability. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  [dayStartHour]="8"
  [dayEndHour]="18"
  [allowResizing]="false"
  (appointmentAdding)="blockWeekends($event)"
  (appointmentDeleting)="confirmDelete($event)"
  style="height: 560px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly appointments = [
  {
    id: 1,
    text: 'Release',
    startDate: new Date(2026, 7, 7, 14, 0),
    endDate: new Date(2026, 7, 7, 15, 0),
  },
];

protected blockWeekends(
  event: OgeSchedulerAppointmentAddingEvent<Record<string, unknown>>,
): void {
  const day = (event.appointmentData['startDate'] as Date).getDay();
  if (day === 0 || day === 6) event.cancel = true;
}

protected confirmDelete(
  event: OgeSchedulerAppointmentDeletingEvent<Record<string, unknown>>,
): void {
  event.cancel = !confirm('Delete this appointment?');
}`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: {
    '@oge-ui/scheduler': ['OgeScheduler', 'OgeAppointmentTemplate'],
  },
  template: `<!-- *ogeAppointmentTemplate replaces the chip content; the colored
     surface, drag/resize handles and keyboard semantics stay with the
     component. ogeCellTemplate / ogeDateHeaderTemplate exist too. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="day"
  [dayStartHour]="8"
  [dayEndHour]="16"
  style="height: 560px"
>
  <ng-template ogeAppointmentTemplate let-appointment>
    <strong>{{ appointment.text }}</strong>
    @if (appointment.description) {
      <em class="block text-[11px] opacity-80">{{
        appointment.description
      }}</em>
    }
  </ng-template>
</oge-scheduler>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly appointments = [
  {
    id: 1,
    text: 'Usability session',
    description: 'Recording — join muted',
    startDate: new Date(2026, 7, 6, 9, 0),
    endDate: new Date(2026, 7, 6, 11, 0),
    color: '#0f766e',
  },
];`,
});

export const VIEWS_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- views takes plain names or per-view option objects: a compact
     'Office hours' day view with 15-minute slots next to the stock week and
     month views. The month '+N more' overflow drills into the day view. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="month"
  [views]="[
    { type: 'day', name: 'Office hours', dayStartHour: 9, dayEndHour: 17, cellDuration: 15 },
    'week',
    'month',
  ]"
  [maxAppointmentsPerCell]="2"
  style="height: 640px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly appointments = [
  {
    id: 1,
    text: 'Board meeting',
    startDate: new Date(2026, 7, 3, 9, 0),
    endDate: new Date(2026, 7, 3, 10, 0),
  },
  {
    id: 2,
    text: 'Audit',
    startDate: new Date(2026, 7, 3, 10, 0),
    endDate: new Date(2026, 7, 3, 11, 0),
    color: '#dc2626',
  },
  {
    id: 3,
    text: 'Retro',
    startDate: new Date(2026, 7, 3, 15, 0),
    endDate: new Date(2026, 7, 3, 16, 0),
    color: '#16a34a',
  },
  {
    id: 4,
    text: 'Conference',
    startDate: new Date(2026, 7, 12),
    endDate: new Date(2026, 7, 15),
    allDay: true,
    color: '#7c3aed',
  },
];`,
});

export const PLANNING_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- Planner ergonomics in one place: the workWeek view drops the
     weekend, workHours shades off-hours cells, shadeUntilCurrentTime dims the
     elapsed part of today, scrollTime opens the grid at 08:00 instead of
     midnight, min/max clamp navigation (prev/next disable at the bounds), and
     snapDuration makes drag/resize snap at 15 minutes on a 30-minute raster.
     Drag over empty cells to select a range — the create dialog opens
     prefilled (rangeSelected fires first). readOnly turns it all off at once. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="workWeek"
  [views]="['day', 'workWeek', 'week', 'month']"
  [scrollTime]="8"
  [workHours]="{ start: 9, end: 17 }"
  [shadeUntilCurrentTime]="true"
  [snapDuration]="15"
  [min]="min"
  [max]="max"
  style="height: 640px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly min = new Date(2026, 6, 1);
protected readonly max = new Date(2026, 8, 30);
protected readonly appointments = [
  {
    id: 1,
    text: 'Architecture sync',
    startDate: new Date(2026, 7, 6, 9, 30),
    endDate: new Date(2026, 7, 6, 10, 30),
  },
  {
    id: 2,
    text: 'Late incident review',
    startDate: new Date(2026, 7, 6, 18, 0),
    endDate: new Date(2026, 7, 6, 19, 0),
    color: '#dc2626',
  },
];`,
});

export const TEAMS_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  types: { '@oge-ui/scheduler': ['OgeSchedulerResource'] },
  template: `<!-- Recurring series (RFC 5545 subset) expand into occurrences in
     every view; editing or deleting one asks "this appointment or the entire
     series?" (recurrenceEditMode). resources drive the editor's assignment
     selects, default colors (useColorAsDefault) and the timeline rows
     (groups). The agenda view lists the coming days; reminderTriggered fires
     when a reminder lead time is reached. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="timelineWeek"
  [views]="['week', 'timelineDay', 'timelineWeek', 'agenda', 'month']"
  [resources]="resources"
  [groups]="['ownerId']"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly resources: OgeSchedulerResource[] = [
  {
    fieldExpr: 'ownerId',
    label: 'Owner',
    useColorAsDefault: true,
    items: [
      { id: 'ada', text: 'Ada', color: '#7c3aed' },
      { id: 'grace', text: 'Grace', color: '#0891b2' },
    ],
  },
];
protected readonly appointments = [
  {
    id: 1,
    text: 'Daily standup',
    startDate: new Date(2026, 7, 3, 9, 0),
    endDate: new Date(2026, 7, 3, 9, 15),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    ownerId: 'ada',
    reminder: 5,
  },
  {
    id: 2,
    text: 'Design pairing',
    startDate: new Date(2026, 7, 5, 14, 0),
    endDate: new Date(2026, 7, 5, 16, 0),
    ownerId: 'grace',
  },
  {
    id: 3,
    text: 'Ops review',
    startDate: new Date(2026, 7, 6, 11, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
  },
];`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  helpers: { '@oge-ui/scheduler': ['provideOgeSchedulerConfig'] },
  before: `// Typically in app.config.ts — shown per-component here. The merge is
// shallow per top-level key: replace whole nested blocks, not single strings.
// A [messages] input on one instance overrides the DI value the same way.`,
  template: `<oge-scheduler
  [dataSource]="[]"
  [currentDate]="date"
  locale="de"
  style="height: 480px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);`,
  after: `export const appConfig = {
  providers: [
    provideOgeSchedulerConfig({
      messages: {
        toolbar: {
          label: 'Terminplaner',
          today: 'Heute',
          previous: 'Zurück',
          next: 'Weiter',
          viewSwitcherLabel: 'Ansichten',
          dateNavigatorLabel: 'Datum wählen',
          newAppointment: 'Neu',
          viewNames: {
            day: 'Tag',
            week: 'Woche',
            workWeek: 'Arbeitswoche',
            month: 'Monat',
            agenda: 'Agenda',
            timelineDay: 'Zeitachse Tag',
            timelineWeek: 'Zeitachse Woche',
            year: 'Jahr',
          },
        },
      },
    }),
  ],
};`,
});
