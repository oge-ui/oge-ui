import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Views & grouping" page — section-for-section
 * mirror of `../scheduler/views-grouping-snippets.ts`. Pure data.
 */

const PEOPLE = `const people = [
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

const APPOINTMENTS = `const appointments = [
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

export const SCHEDULER_VIEWS_GROUPING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Timelines & custom intervals',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: {
        '@oge-ui/react-scheduler': [
          'OgeSchedulerView',
          'OgeSchedulerViewOptions',
        ],
      },
      name: 'IntervalViews',
      before: `// intervalCount turns any view into an N-period view: a 3-day view, a
// fortnight, and the month / year timelines at day scale. Navigation steps
// by the whole interval; week numbers follow ISO 8601 by default.
const views: (OgeSchedulerView | OgeSchedulerViewOptions)[] = [
  { type: 'day', intervalCount: 3, name: '3 days' },
  { type: 'week', intervalCount: 2, name: 'Fortnight' },
  'month',
  'timelineWorkWeek',
  'timelineMonth',
  'timelineYear',
];
${PEOPLE}
${APPOINTMENTS}`,
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="timelineMonth"
  views={views}
  resources={people}
  groups={['ownerId']}
  showWeekNumbers
  dayStartHour={8}
  dayEndHour={18}
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Multi-level groups',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'RoomsAndOwners',
      before: `// groups nests the levels, outermost first: owners inside rooms.
// groupByDate={false} lays each resource's days side by side; the render
// prop replaces every grouped header (level 0 = rooms).
const resources = [
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
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="day"
  views={['day', 'week', 'timelineDay']}
  resources={resources}
  groups={['roomId', 'ownerId']}
  groupByDate={false}
  dayStartHour={8}
  dayEndHour={18}
  renderResourceHeader={({ item, level }) => (
    <span className={level === 0 ? 'font-semibold' : undefined}>{item.text}</span>
  )}
  style={{ height: 600 }}
/>`,
    }),
  },
  {
    title: 'Vertical grouping',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { react: ['CSSProperties'] },
      name: 'StackedOwners',
      before: `// groupOrientation="vertical" stacks one full time grid per resource
// under a group label column; drags across blocks reassign the owner.
${PEOPLE}
${APPOINTMENTS}`,
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="workWeek"
  views={['day', 'workWeek']}
  resources={people}
  groups={['ownerId']}
  groupOrientation="vertical"
  dayStartHour={9}
  dayEndHour={17}
  cellDuration={60}
  style={{ height: 640, '--oge-scheduler-slot-height': '48px' } as CSSProperties}
/>`,
    }),
  },
  {
    title: '"+N more" popup',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'BusyMonth',
      before: `// A full day folds into "+N more": a Tab-reachable button that opens the
// day's list (Up/Down, Enter opens an entry, Escape returns) with a
// "Go to day" action. moreMode="drill" jumps to the day view instead.
const appointments = [
  { id: 1, text: 'Inbox zero', startDate: new Date(2026, 7, 5, 8, 0), endDate: new Date(2026, 7, 5, 9, 0) },
  { id: 2, text: 'Board prep', startDate: new Date(2026, 7, 5, 9, 0), endDate: new Date(2026, 7, 5, 10, 0) },
  { id: 3, text: 'Vendor call', startDate: new Date(2026, 7, 5, 10, 0), endDate: new Date(2026, 7, 5, 11, 0) },
  { id: 4, text: 'Roadmap', startDate: new Date(2026, 7, 5, 13, 0), endDate: new Date(2026, 7, 5, 14, 0) },
  { id: 5, text: 'Budget review', startDate: new Date(2026, 7, 5, 15, 0), endDate: new Date(2026, 7, 5, 16, 0) },
];`,
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="month"
  views={['day', 'month']}
  maxAppointmentsPerCell={2}
  moreMode="popup"
  style={{ height: 640 }}
/>`,
    }),
  },
];
