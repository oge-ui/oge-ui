import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Scheduling & constraints" page — section-for-
 * section mirror of `../gantt/scheduling-snippets.ts`. Pure data.
 */
export const GANTT_SCHEDULING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Lag, lead & slack',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': [
          'OgeGanttColumn',
          'OgeGanttHandle',
          'OgeGanttWorkCalendar',
        ],
      },
      name: 'LaggedPlan',
      before: `// lag (negative = lead) on any link type, in working days on the
// calendar or in hours; auto-scheduling pulls tasks earlier as well as
// pushing them later. Edit a link: double-click its arrow, or type "2FS+2d"
// into the Predecessors cell.
type Task = Record<string, unknown>;

const calendar: OgeGanttWorkCalendar = { workingDays: [1, 2, 3, 4, 5] };
const columns: OgeGanttColumn[] = [
  { field: 'wbs' },
  { field: 'title' },
  { field: 'start' },
  { field: 'predecessors' },
  { field: 'totalSlack' },
  { field: 'freeSlack' },
];
const tasks: Task[] = [
  { id: 1, title: 'Specs', start: new Date(2026, 7, 3), end: new Date(2026, 7, 7) },
  { id: 2, title: 'Prototype', start: new Date(2026, 7, 12), end: new Date(2026, 7, 19) },
  { id: 3, title: 'User tests', start: new Date(2026, 7, 17), end: new Date(2026, 7, 21) },
  { id: 4, title: 'Release', start: new Date(2026, 7, 28), end: new Date(2026, 7, 28) },
];
const links = [
  { id: 'a', predecessorId: 1, successorId: 2, lag: 2 }, // FS + 2 working days
  { id: 'b', predecessorId: 2, successorId: 3, type: 'SS', lag: 3 },
  { id: 'c', predecessorId: 3, successorId: 4, lag: 4, lagUnit: 'hours' },
];`,
      body: `const gantt = useRef<OgeGanttHandle<Task>>(null);`,
      jsx: `<>
  <button type="button" onClick={() => gantt.current?.scheduleProject()}>
    Recalculate
  </button>
  <OgeGantt
    ref={gantt}
    tasks={tasks}
    dependencies={links}
    columns={columns}
    workCalendar={calendar}
    autoScheduling
    showCriticalPath
    inlineEditing
    style={{ height: 420 }}
  />
</>`,
    }),
  },
  {
    title: 'Constraints, deadlines & conflicts',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: { '@oge-ui/react-gantt': ['OgeGanttColumn'] },
      name: 'ConstrainedPlan',
      before: `// constraintType + constraintDate (ASAP, ALAP, SNET, SNLT, FNET, FNLT,
// MSO, MFO), a deadline marker and manual tasks the engine never moves.
// Whatever cannot be satisfied comes back as a conflict: a dashed outline,
// a "!" badge, the row label — and onSchedulingConflict.
const columns: OgeGanttColumn[] = [
  { field: 'title', widthPx: 200 },
  { field: 'constraint' },
  { field: 'deadline' },
];
const tasks = [
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
const links = [
  { id: 'a', predecessorId: 1, successorId: 3 },
  { id: 'b', predecessorId: 1, successorId: 5 }, // the manual task breaks this link
];`,
      body: `const [messages, setMessages] = useState<string[]>([]);`,
      jsx: `<>
  <OgeGantt
    tasks={tasks}
    dependencies={links}
    columns={columns}
    autoScheduling
    style={{ height: 420 }}
    onSchedulingConflict={(event) =>
      setMessages(event.conflicts.map((conflict) => conflict.message))
    }
  />
  <ul aria-live="polite">
    {messages.map((message) => (
      <li key={message}>{message}</li>
    ))}
  </ul>
</>`,
    }),
  },
  {
    title: 'Baselines, split tasks & progress line',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: { '@oge-ui/react-gantt': ['OgeGanttHandle'] },
      name: 'TrackedPlan',
      before: `// several baselines (toolbar chooser), a split task, the progress line
// through the status date and child milestones rolled up onto the summary
// bar. setBaseline(i) saves the current dates as baseline i.
type Task = Record<string, unknown>;

const statusDate = new Date(2026, 7, 14);
const tasks: Task[] = [
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
const links = [
  { id: 'a', predecessorId: 2, successorId: 3 },
  { id: 'b', predecessorId: 3, successorId: 4, lag: 1 },
];`,
      body: `const gantt = useRef<OgeGanttHandle<Task>>(null);
const [baseline, setBaseline] = useState(0);`,
      jsx: `<>
  <button type="button" onClick={() => gantt.current?.setBaseline(2)}>
    Save as baseline 3
  </button>
  <OgeGantt
    ref={gantt}
    tasks={tasks}
    dependencies={links}
    showProgressLine
    statusDate={statusDate}
    showRollups
    baselineIndex={baseline}
    onBaselineIndexChange={setBaseline}
    style={{ height: 360 }}
  />
</>`,
    }),
  },
  {
    title: 'Quarter & year scales',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': ['OgeGanttScaleType', 'OgeGanttZoomPreset'],
      },
      name: 'Roadmap',
      before: `// quarters and years extend the zoom ladder; zoomPresets fills the
// toolbar's scale chooser (a scale plus an optional tick width).
const presets: OgeGanttZoomPreset[] = [
  { scaleType: 'weeks', label: 'Sprint view' },
  { scaleType: 'months', tickWidth: 64, label: 'Compact months' },
  { scaleType: 'quarters', label: 'Quarters' },
  { scaleType: 'years', label: 'Roadmap (years)' },
];
const tasks = [
  { id: 1, title: 'Platform v2', start: new Date(2026, 0, 12), end: new Date(2026, 5, 30) },
  { id: 2, title: 'Mobile apps', start: new Date(2026, 3, 1), end: new Date(2026, 11, 18) },
  { id: 3, title: 'EU region', start: new Date(2026, 8, 1), end: new Date(2027, 2, 31) },
];`,
      body: `const [scale, setScale] = useState<OgeGanttScaleType>('quarters');`,
      jsx: `<OgeGantt
  tasks={tasks}
  zoomPresets={presets}
  scaleType={scale}
  onScaleTypeChange={setScale}
  style={{ height: 300 }}
/>`,
    }),
  },
];
