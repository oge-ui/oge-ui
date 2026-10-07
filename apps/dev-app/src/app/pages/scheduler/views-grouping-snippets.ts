import { demoSource } from '../../shared/demo-source';

const PEOPLE = `protected readonly people = [
  {
    fieldExpr: 'ownerId',
    label: 'Owner',
    useColorAsDefault: true,
    items: [
      { id: 'ada', text: 'Ada', color: '#7c3aed' },
      { id: 'grace', text: 'Grace', color: '#0891b2' },
      { id: 'linus', text: 'Linus', color: '#16a34a' },
    ],
  },
];`;

const APPOINTMENTS = `protected readonly appointments = [
  {
    id: 1,
    text: 'Daily standup',
    startDate: new Date(2026, 7, 3, 9, 0),
    endDate: new Date(2026, 7, 3, 9, 15),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    ownerId: 'ada',
    roomId: 'north',
  },
  {
    id: 2,
    text: 'Design pairing',
    startDate: new Date(2026, 7, 6, 10, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
    ownerId: 'grace',
    roomId: 'north',
  },
  {
    id: 3,
    text: 'Release prep',
    startDate: new Date(2026, 7, 6, 13, 0),
    endDate: new Date(2026, 7, 6, 15, 30),
    ownerId: 'linus',
    roomId: 'south',
  },
];`;

export const INTERVALS_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- intervalCount turns any view into an N-period view: a 3-day view,
     a fortnight, and the month / year timelines at day scale. Navigation
     steps by the whole interval; week numbers follow ISO 8601 by default
     (weekNumberRule="locale" uses the locale's own numbering). -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="timelineMonth"
  [views]="views"
  [resources]="people"
  [groups]="['ownerId']"
  [showWeekNumbers]="true"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly views = [
  { type: 'day', intervalCount: 3, name: '3 days' },
  { type: 'week', intervalCount: 2, name: 'Fortnight' },
  'month',
  'timelineWorkWeek',
  'timelineMonth',
  'timelineYear',
] as const;
${PEOPLE}
${APPOINTMENTS}`,
});

export const MULTI_LEVEL_SNIPPET = demoSource({
  use: {
    '@oge-ui/scheduler': ['OgeScheduler', 'OgeResourceHeaderTemplate'],
  },
  template: `<!-- groups nests the levels, outermost first: owners inside rooms.
     groupByDate=false lays each resource's days side by side (resource-major);
     the header template replaces every grouped header, level 0 = rooms. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="day"
  [views]="['day', 'week', 'timelineDay']"
  [resources]="resources"
  [groups]="['roomId', 'ownerId']"
  [groupByDate]="false"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 600px"
>
  <ng-template ogeResourceHeaderTemplate let-item let-level="level">
    <span [class.font-semibold]="level === 0">{{ item.text }}</span>
  </ng-template>
</oge-scheduler>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly resources = [
  {
    fieldExpr: 'roomId',
    label: 'Room',
    items: [
      { id: 'north', text: 'North room' },
      { id: 'south', text: 'South room' },
    ],
  },
  {
    fieldExpr: 'ownerId',
    label: 'Owner',
    useColorAsDefault: true,
    items: [
      { id: 'ada', text: 'Ada', color: '#7c3aed' },
      { id: 'grace', text: 'Grace', color: '#0891b2' },
      { id: 'linus', text: 'Linus', color: '#16a34a' },
    ],
  },
];
${APPOINTMENTS}`,
});

export const VERTICAL_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- groupOrientation="vertical" stacks one full time grid per resource
     under a group label column; drags across blocks reassign the owner. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="workWeek"
  [views]="['day', 'workWeek']"
  [resources]="people"
  [groups]="['ownerId']"
  groupOrientation="vertical"
  [dayStartHour]="9"
  [dayEndHour]="17"
  [cellDuration]="60"
  style="height: 640px; --oge-scheduler-slot-height: 48px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
${PEOPLE}
${APPOINTMENTS}`,
});

export const MORE_POPUP_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- A full day folds into "+N more": a Tab-reachable button that opens
     the day's list (Up/Down, Enter opens an entry, Escape returns) with a
     "Go to day" action. moreMode="drill" jumps to the day view instead. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="month"
  [views]="['day', 'month']"
  [maxAppointmentsPerCell]="2"
  moreMode="popup"
  style="height: 640px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly appointments = [
  { id: 1, text: 'Inbox zero', startDate: new Date(2026, 7, 5, 8, 0), endDate: new Date(2026, 7, 5, 9, 0) },
  { id: 2, text: 'Board prep', startDate: new Date(2026, 7, 5, 9, 0), endDate: new Date(2026, 7, 5, 10, 0) },
  { id: 3, text: 'Vendor call', startDate: new Date(2026, 7, 5, 10, 0), endDate: new Date(2026, 7, 5, 11, 0) },
  { id: 4, text: 'Roadmap', startDate: new Date(2026, 7, 5, 13, 0), endDate: new Date(2026, 7, 5, 14, 0) },
  { id: 5, text: 'Budget review', startDate: new Date(2026, 7, 5, 15, 0), endDate: new Date(2026, 7, 5, 16, 0) },
];`,
});
