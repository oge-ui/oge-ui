import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React scheduler overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../scheduler/overview-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same nine sections, same
 * order, same example content, React idiom.
 */
export const SCHEDULER_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { '@oge-ui/react-scheduler': ['OgeSchedulerView'] },
      name: 'TeamCalendar',
      before: `const appointments = [
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
      body: `const [date, setDate] = useState(new Date(2026, 7, 6));
const [view, setView] = useState<OgeSchedulerView>('week');`,
      jsx: `// One element, a working scheduler: week view with an all-day strip,
// drag-move / edge-resize (Escape cancels mid-gesture), double-click or
// Enter creates through the form dialog, single click opens the summary
// popup. Dates are plain local Dates — no date library, no adapter.
<OgeScheduler
  dataSource={appointments}
  currentDate={date}
  onCurrentDateChange={setDate}
  currentView={view}
  onCurrentViewChange={setView}
  dayStartHour={8}
  dayEndHour={19}
  style={{ height: 640 }}
/>`,
    }),
  },
  {
    title: 'Field mapping',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'MappedMeetings',
      before: `const meetings = [
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
      jsx: `// Any item shape binds through the *Expr props (field names, dotted
// paths or getter functions). String dates parse as LOCAL wall time and
// write back in the SAME storage shape — a string-dated store never
// silently turns into Date objects after an edit.
<OgeScheduler
  dataSource={meetings}
  keyExpr="meetingId"
  textExpr="subject"
  startDateExpr="slot.begin"
  endDateExpr="slot.finish"
  colorExpr="badge"
  defaultCurrentDate={new Date(2026, 7, 6)}
  dayStartHour={8}
  dayEndHour={18}
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Editing pipeline',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: {
        '@oge-ui/react-scheduler': [
          'OgeSchedulerAppointmentAddingEvent',
          'OgeSchedulerAppointmentDeletingEvent',
        ],
      },
      name: 'GuardedScheduler',
      before: `const appointments = [
  {
    id: 1,
    text: 'Release',
    startDate: new Date(2026, 7, 7, 14, 0),
    endDate: new Date(2026, 7, 7, 15, 0),
  },
];

function blockWeekends(
  event: OgeSchedulerAppointmentAddingEvent<Record<string, unknown>>,
): void {
  const day = (event.appointmentData['startDate'] as Date).getDay();
  if (day === 0 || day === 6) event.cancel = true;
}

function confirmDelete(
  event: OgeSchedulerAppointmentDeletingEvent<Record<string, unknown>>,
): void {
  event.cancel = !confirm('Delete this appointment?');
}`,
      jsx: `// Every mutation runs a cancelable '-ing' callback before the store
// changes; set cancel = true to veto (weekends here). The matching
// past-tense callback fires only for applied changes — persist from there.
// allowAdding/Updating/Deleting/Dragging/Resizing gate each capability.
<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  dayStartHour={8}
  dayEndHour={18}
  allowResizing={false}
  onAppointmentAdding={blockWeekends}
  onAppointmentDeleting={confirmDelete}
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Planner ergonomics',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'PlannerWeek',
      before: `const appointments = [
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
      jsx: `// Planner ergonomics in one place: the workWeek view drops the weekend,
// workHours shades off-hours cells, shadeUntilCurrentTime dims the elapsed
// part of today, scrollTime opens the grid at 08:00 instead of midnight,
// min/max clamp navigation (prev/next disable at the bounds), and
// snapDuration makes drag/resize snap at 15 minutes on a 30-minute raster.
// Drag over empty cells to select a range — the create dialog opens
// prefilled (onRangeSelected fires first). readOnly turns it all off.
<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="workWeek"
  views={['day', 'workWeek', 'week', 'month']}
  scrollTime={8}
  workHours={{ start: 9, end: 17 }}
  shadeUntilCurrentTime
  snapDuration={15}
  min={new Date(2026, 6, 1)}
  max={new Date(2026, 8, 30)}
  style={{ height: 640 }}
/>`,
    }),
  },
  {
    title: 'Teams, recurrence & timeline',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { '@oge-ui/react-scheduler': ['OgeSchedulerResource'] },
      name: 'TeamTimeline',
      before: `const resources: OgeSchedulerResource[] = [
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

const appointments = [
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
      jsx: `// Recurring series (RFC 5545 subset) expand into occurrences in every
// view; editing or deleting one asks "this appointment or the entire
// series?" (recurrenceEditMode). resources drive the editor's assignment
// selects, default colors (useColorAsDefault) and the timeline rows
// (groups). The agenda view lists the coming days; onReminderTriggered
// fires when a reminder lead time is reached.
<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="timelineWeek"
  views={['week', 'timelineDay', 'timelineWeek', 'agenda', 'month']}
  resources={resources}
  groups={['ownerId']}
  dayStartHour={8}
  dayEndHour={18}
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Views',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'MonthOverview',
      before: `const appointments = [
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
      jsx: `// views takes plain names or per-view option objects: a compact
// 'Office hours' day view with 15-minute slots next to the stock week and
// month views. The month '+N more' overflow drills into the day view.
<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="month"
  views={[
    { type: 'day', name: 'Office hours', dayStartHour: 9, dayEndHour: 17, cellDuration: 15 },
    'week',
    'month',
  ]}
  maxAppointmentsPerCell={2}
  style={{ height: 640 }}
/>`,
    }),
  },
  {
    title: 'Appointment template',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'TemplatedDay',
      before: `const appointments = [
  {
    id: 1,
    text: 'Usability session',
    description: 'Recording — join muted',
    startDate: new Date(2026, 7, 6, 9, 0),
    endDate: new Date(2026, 7, 6, 11, 0),
    color: '#0f766e',
  },
];`,
      jsx: `// renderAppointment replaces the chip content; the colored surface,
// drag/resize handles and keyboard semantics stay with the component.
// renderCell / renderDateHeader exist too.
<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="day"
  dayStartHour={8}
  dayEndHour={16}
  style={{ height: 560 }}
  renderAppointment={({ appointment }) => (
    <>
      <strong>{appointment.text}</strong>
      {appointment.description && (
        <em className="block text-[11px] opacity-80">{appointment.description}</em>
      )}
    </>
  )}
/>`,
    }),
  },
  {
    title: 'RTL',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'RtlScheduler',
      before: `const appointments = [
  {
    id: 1,
    text: 'Design review',
    startDate: new Date(2026, 7, 4, 9, 30),
    endDate: new Date(2026, 7, 4, 11, 0),
  },
  {
    id: 2,
    text: 'Sprint planning',
    startDate: new Date(2026, 7, 6, 10, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
  },
];`,
      jsx: `// rtlEnabled unset follows the page's dir (and its changes); true/false
// forces a direction and sets dir on the host. Columns, month cells and the
// timeline run right-to-left, Left/Right keys and horizontal drags mirror.
<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="week"
  views={['week', 'month', 'timelineWeek']}
  dayStartHour={8}
  dayEndHour={18}
  rtlEnabled
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Configuration & i18n',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-scheduler': [
          'OgeScheduler',
          'OgeSchedulerConfigProvider',
        ],
      },
      name: 'GermanScheduler',
      before: `// Typically once near the app root — shown per-component here. The merge
// is shallow per top-level key: replace whole nested blocks, not single
// strings. A messages prop on one instance overrides the provider the same
// way, and a new config object re-resolves the subtree at runtime.
const config = {
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
};`,
      jsx: `<OgeSchedulerConfigProvider config={config}>
  <OgeScheduler
    dataSource={[]}
    defaultCurrentDate={new Date(2026, 7, 6)}
    locale="de"
    style={{ height: 480 }}
  />
</OgeSchedulerConfigProvider>`,
    }),
  },
];
