import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Resources & availability" page —
 * section-for-section mirror of
 * `../scheduler/resources-availability-snippets.ts`. Pure data.
 */
export const SCHEDULER_RESOURCES_AVAILABILITY_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Disabled slots & work hours',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'StaffRota',
      before: `// disabledSlots hatches non-bookable time: lunch every weekday and a
// training day for one resource. Creating, moving, resizing, pasting or
// dropping there is refused and announced. Each resource's own workHours
// shade its column, and snapToWorkHours clamps moves into them.
const staff = [
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
const blocked = [
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
const appointments = [
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
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="workWeek"
  views={['day', 'workWeek', 'timelineWeek']}
  resources={staff}
  groups={['ownerId']}
  disabledSlots={blocked}
  snapToWorkHours
  dayStartHour={7}
  dayEndHour={19}
  cellDuration={60}
  style={{ height: 640 }}
/>`,
    }),
  },
  {
    title: 'Conflicts',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { '@oge-ui/react-scheduler': ['OgeSchedulerAppointment'] },
      name: 'OperatingRoom',
      before: `// allowOverlap={false} refuses overlapping changes with a notice and an
// announcement; conflictCheck decides case by case and wins — here a change
// may overlap tentative holds, never a confirmed appointment.
type Appt = Record<string, unknown>;

const appointments: Appt[] = [
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

const onlyTentative = (
  _appointment: Appt,
  conflicts: readonly OgeSchedulerAppointment<Appt>[],
): boolean => conflicts.every((c) => c.source['tentative'] === true);`,
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="day"
  allowOverlap={false}
  conflictCheck={onlyTentative}
  dayStartHour={8}
  dayEndHour={18}
  style={{ height: 560 }}
/>`,
    }),
  },
  {
    title: 'Drag in from outside',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-scheduler': ['OgeScheduler', 'useOgeSchedulerDraggable'],
      },
      types: {
        '@oge-ui/react-scheduler': ['OgeSchedulerAppointmentDroppedEvent'],
      },
      name: 'Backlog',
      before: `// useOgeSchedulerDraggable turns any element into an appointment source:
// drag it onto a slot, or press Enter / click to pick it up and Enter / click
// a cell to place it (the keyboard and single-pointer twin).
// onAppointmentDropped reports the built item; onDragOut fires when a chip
// is dragged out and released elsewhere.
interface Task {
  id: string;
  text: string;
  minutes: number;
}

const backlog: Task[] = [
  { id: 't1', text: 'Write release notes', minutes: 60 },
  { id: 't2', text: 'Review pull requests', minutes: 90 },
  { id: 't3', text: 'Prepare demo', minutes: 120 },
];

function TaskChip({ task }: { task: Task }) {
  const drag = useOgeSchedulerDraggable({ data: task, duration: task.minutes });
  return (
    <div {...drag} className={drag.className + ' rounded border px-3 py-1 text-sm'}>
      {task.text} · {task.minutes} min
    </div>
  );
}`,
      body: `const [tasks, setTasks] = useState(backlog);
const [lastAction, setLastAction] = useState('');
const [appointments] = useState<Record<string, unknown>[]>([]);

const dropped = (event: OgeSchedulerAppointmentDroppedEvent<Record<string, unknown>>) => {
  if (!event.added) return;
  const task = event.itemData as Task;
  setTasks((list) => list.filter((t) => t.id !== task.id));
  setLastAction('Scheduled ' + task.text);
};`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Backlog">
    {tasks.map((task) => (
      <TaskChip key={task.id} task={task} />
    ))}
  </div>
  <OgeScheduler
    dataSource={appointments}
    defaultCurrentDate={new Date(2026, 7, 6)}
    defaultCurrentView="week"
    dayStartHour={8}
    dayEndHour={18}
    onAppointmentDropped={dropped}
    onDragOut={(event) => setLastAction('Dragged out: ' + event.appointment.text)}
    style={{ height: 560 }}
  />
  <p className="mt-2 text-sm" aria-live="polite">{lastAction}</p>
</>`,
    }),
  },
  {
    title: 'Selection, clipboard & undo',
    source: reactDemoSource({
      react: ['useReducer', 'useRef', 'useState'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { '@oge-ui/react-scheduler': ['OgeSchedulerHandle'] },
      name: 'SelectAndUndo',
      before: `// Ctrl/⌘-click toggles chips into the selection, Shift-click extends it;
// Ctrl+C copies, Ctrl+V on a focused cell pastes, Ctrl+Z / Ctrl+Y undo and
// redo every edit. The same actions are methods on the ref handle.
type Appt = Record<string, unknown>;

const appointments: Appt[] = [
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
      body: `const scheduler = useRef<OgeSchedulerHandle<Appt>>(null);
const [selected, setSelected] = useState<readonly Appt[]>([]);
// canUndo() / canRedo() read the history as of the last render
const [, refresh] = useReducer((n: number) => n + 1, 0);`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => { scheduler.current?.undo(); refresh(); }}
      disabled={!scheduler.current?.canUndo()}
    >
      Undo
    </button>
    <button
      type="button"
      onClick={() => { scheduler.current?.redo(); refresh(); }}
      disabled={!scheduler.current?.canRedo()}
    >
      Redo
    </button>
    <button type="button" onClick={() => scheduler.current?.clearSelection()}>
      Clear selection
    </button>
    <span className="text-sm">{selected.length} selected</span>
  </div>
  <OgeScheduler
    ref={scheduler}
    dataSource={appointments}
    defaultCurrentDate={new Date(2026, 7, 6)}
    defaultCurrentView="week"
    selectedAppointments={selected}
    onSelectedAppointmentsChange={setSelected}
    onAppointmentAdded={refresh}
    onAppointmentUpdated={refresh}
    onAppointmentDeleted={refresh}
    undoLimit={100}
    dayStartHour={8}
    dayEndHour={18}
    style={{ height: 560 }}
  />
</>`,
    }),
  },
];
