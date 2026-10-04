import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React Gantt overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../gantt/overview-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same ten sections, same
 * order, same headings, same example content, React idiom.
 */
export const GANTT_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      name: 'ReleasePlan',
      before: `const tasks = [
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

const links = [
  { id: 'a', predecessorId: 2, successorId: 3 }, // FS is the default type
  { id: 'b', predecessorId: 3, successorId: 4 },
];`,
      jsx: `// One component, a working Gantt: task tree pane + timeline chart with
// summary brackets, milestone diamonds and dependency arrows. Drag a bar to
// move it (Escape cancels mid-drag), pull its edges to resize, drag the
// bottom knob to set progress, drag a link dot onto another bar to draw a
// dependency. Double-click opens the task dialog.
<OgeGantt tasks={tasks} dependencies={links} style={{ height: 480 }} />`,
    }),
  },
  {
    title: 'Field mapping',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      name: 'MappedPlan',
      before: `const workItems = [
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

const relations = [{ relId: 1, fromCode: 'T-1', toCode: 'T-2' }];`,
      jsx: `// Any item shape binds through the *Expr props — field names, dotted
// paths or getter functions — for tasks AND dependency links. String dates
// parse as local wall time and write back in the same storage shape after
// edits.
<OgeGantt
  tasks={workItems}
  dependencies={relations}
  keyExpr="code"
  parentKeyExpr="parentCode"
  titleExpr="subject"
  startExpr="plan.begin"
  endExpr="plan.finish"
  progressExpr="done"
  dependencyKeyExpr="relId"
  predecessorKeyExpr="fromCode"
  successorKeyExpr="toCode"
  style={{ height: 360 }}
/>`,
    }),
  },
  {
    title: 'Dependencies & critical path',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      name: 'CriticalPlan',
      before: `const tasks = [
  { id: 1, title: 'Foundation', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6), progress: 100 },
  { id: 2, title: 'Framing', start: new Date(2026, 7, 6), end: new Date(2026, 7, 12), progress: 60 },
  { id: 3, title: 'Electrical', start: new Date(2026, 7, 12), end: new Date(2026, 7, 15) },
  { id: 4, title: 'Landscaping', start: new Date(2026, 7, 6), end: new Date(2026, 7, 10) },
  { id: 5, title: 'Inspection', start: new Date(2026, 7, 17), end: new Date(2026, 7, 18) },
];

const links = [
  { id: 1, predecessorId: 1, successorId: 2 },
  { id: 2, predecessorId: 2, successorId: 3 },
  { id: 3, predecessorId: 3, successorId: 5 },
  { id: 4, predecessorId: 4, successorId: 5 },
];`,
      jsx: `// showCriticalPath outlines the tasks with zero slack; autoScheduling
// pushes successors forward whenever a predecessor moves (FS/SS/FF/SF
// respected). Drawing a link that would close a cycle is rejected and
// announced — try dragging a link dot backwards.
<OgeGantt
  tasks={tasks}
  dependencies={links}
  showCriticalPath
  autoScheduling
  style={{ height: 420 }}
/>`,
    }),
  },
  {
    title: 'Baselines, strip lines & resources',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: { '@oge-ui/react-gantt': ['OgeGanttStripLine'] },
      name: 'BaselinePlan',
      before: `const tasks = [
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

const stripLines: OgeGanttStripLine[] = [
  { start: new Date(2026, 7, 18), label: 'Go-live', color: '#dc2626' },
  {
    start: new Date(2026, 7, 14),
    end: new Date(2026, 7, 17),
    label: 'Freeze',
  },
];

const people = [
  { id: 'ada', text: 'Ada', color: '#7c3aed' },
  { id: 'grace', text: 'Grace', color: '#0891b2' },
];

const holidays = [new Date(2026, 7, 10)];`,
      jsx: `// Baseline bars render the original plan under the live bars;
// stripLines mark deadlines (a line) or freeze windows (a range) on the
// chart; resources label the bars. Weekends shade automatically and
// holidays add to the off-day shading.
<OgeGantt
  tasks={tasks}
  stripLines={stripLines}
  resources={people}
  holidays={holidays}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Editing pipeline',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': [
          'OgeGanttTaskDeletingEvent',
          'OgeGanttTaskUpdatingEvent',
        ],
      },
      name: 'GuardedPlan',
      before: `type DemoTask = Record<string, unknown>;

const tasks: DemoTask[] = [
  { id: 1, title: 'Audit (done — locked)', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6), progress: 100 },
  { id: 2, title: 'Remediation', start: new Date(2026, 7, 6), end: new Date(2026, 7, 13), progress: 30 },
];

const protectDone = (event: OgeGanttTaskUpdatingEvent<DemoTask>) => {
  if ((event.oldData['progress'] as number) === 100) event.cancel = true;
};

const confirmDelete = (event: OgeGanttTaskDeletingEvent<DemoTask>) => {
  event.cancel = !confirm('Delete this task?');
};`,
      jsx: `// Every mutation runs a cancelable '-ing' callback before the store
// changes; the past-tense callback fires only for applied changes — persist
// from there. allow* props gate each capability; readOnly turns the whole
// widget display-only. This demo protects finished tasks and asks before
// deleting.
<OgeGantt
  tasks={tasks}
  allowDependencyAdding={false}
  onTaskUpdating={protectDone}
  onTaskDeleting={confirmDelete}
  style={{ height: 360 }}
/>`,
    }),
  },
  {
    title: 'Toolbar, scales & undo/redo',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: { '@oge-ui/react-gantt': ['OgeGanttScaleType'] },
      name: 'ZoomablePlan',
      before: `const columns = [
  { field: 'title' },
  { field: 'progress' },
  { field: 'owner', header: 'Owner' },
];

const tasks = [
  { id: 1, title: 'Discovery', start: new Date(2026, 6, 6), end: new Date(2026, 6, 24), progress: 100, owner: 'Ada' },
  { id: 2, title: 'Build', start: new Date(2026, 6, 27), end: new Date(2026, 8, 4), progress: 40, owner: 'Grace' },
  { id: 3, title: 'Rollout', start: new Date(2026, 8, 7), end: new Date(2026, 8, 25), owner: 'Ada' },
];`,
      body: `// scaleType is a controlled pair — the toolbar zoom writes it back
const [scale, setScale] = useState<OgeGanttScaleType>('weeks');`,
      jsx: `// The toolbar adds tasks, zooms between hour/day/week/month scales
// (Ctrl+wheel on the chart works too), fits the whole plan,
// expands/collapses the tree and drives snapshot undo/redo — every edit,
// including drags, is one undo step. The task list is a virtualized
// treegrid: columns are configurable and the splitter between the panes
// drags.
<OgeGantt
  tasks={tasks}
  scaleType={scale}
  onScaleTypeChange={setScale}
  columns={columns}
  taskListWidth={300}
  style={{ height: 420 }}
/>`,
    }),
  },
  {
    title: 'Work calendar, teams & export',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': ['OgeGanttHandle', 'OgeGanttWorkCalendar'],
      },
      name: 'TeamPlan',
      before: `type DemoTask = Record<string, unknown>;

const calendar: OgeGanttWorkCalendar = {
  workingDays: [1, 2, 3, 4], // four-day week
  holidays: [new Date(2026, 7, 12)],
};

const people = [
  { id: 'ada', text: 'Ada', color: '#7c3aed' },
  {
    id: 'grace',
    text: 'Grace',
    color: '#0891b2',
    // per-resource calendar: overrides workCalendar for Grace's tasks
    calendar: { workingDays: [1, 2, 3, 4, 5] },
  },
];

const tasks: DemoTask[] = [
  {
    id: 1,
    title: 'Prototype',
    start: new Date(2026, 7, 3),
    end: new Date(2026, 7, 6),
    progress: 80,
    resourceId: ['ada', 'grace'], // multi-assignment
  },
  {
    id: 2,
    title: 'Field test',
    start: new Date(2026, 7, 6),
    end: new Date(2026, 7, 11),
    resourceId: 'grace',
  },
];

const links: DemoTask[] = [{ id: 1, predecessorId: 1, successorId: 2 }];`,
      body: `const plan = useRef<OgeGanttHandle<DemoTask, DemoTask>>(null);

/** exceljs stays out of the initial bundle — loaded on first click. */
const exportExcel = async () => {
  const { exportGanttToExcel } = await import('@oge-ui/react-gantt/export-excel');
  if (plan.current) await exportGanttToExcel(plan.current, { filename: 'plan.xlsx' });
};

/** jspdf loads lazily the same way. */
const exportPdf = async () => {
  const { exportGanttToPdf } = await import('@oge-ui/react-gantt/export-pdf');
  if (plan.current) await exportGanttToPdf(plan.current, { filename: 'plan.pdf', title: 'Plan' });
};

/** PNG needs no third-party library at all — plain canvas drawing. */
const exportPng = async () => {
  const { exportGanttToPng } = await import('@oge-ui/react-gantt/export-image');
  if (plan.current) await exportGanttToPng(plan.current, { filename: 'plan.png' });
};`,
      jsx: `<>
  {/* workCalendar shades every off day (custom working week + holidays)
      and makes auto-scheduling roll pushed starts onto working days,
      preserving durations in working days. resourceId may hold an ARRAY of
      ids — the dialog edits assignments with a tag editor and the bar label
      joins the names. The export entry points load exceljs/jspdf lazily:
      Excel writes the task tree as a typed worksheet, PDF draws the chart
      as vector graphics. */}
  <div className="mb-2 flex gap-2">
    <button type="button" onClick={exportExcel}>Export Excel</button>
    <button type="button" onClick={exportPdf}>Export PDF</button>
    <button type="button" onClick={exportPng}>Export PNG</button>
  </div>
  <OgeGantt
    ref={plan}
    tasks={tasks}
    dependencies={links}
    resources={people}
    workCalendar={calendar}
    showResourceWorkload
    autoScheduling
    style={{ height: 400 }}
  />
</>`,
    }),
  },
  {
    title: 'Task template',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      name: 'TemplatedPlan',
      before: `const tasks = [
  { id: 1, title: 'Usability study', start: new Date(2026, 7, 3), end: new Date(2026, 7, 12), progress: 55, color: '#0f766e' },
  { id: 2, title: 'Findings report', start: new Date(2026, 7, 12), end: new Date(2026, 7, 17), progress: 10 },
];`,
      jsx: `// renderTask replaces the bar's title content; renderTooltip replaces the
// hover tooltip (default: title, dates + duration, progress, resources).
// Bar surface, gestures and keyboard semantics stay with the component.
<OgeGantt
  tasks={tasks}
  style={{ height: 300 }}
  renderTask={({ task }) => (
    <>
      <strong>{task.title}</strong>
      <span className="opacity-75"> · {task.progress}%</span>
    </>
  )}
  renderTooltip={({ task }) => (
    <>
      <strong>{task.title}</strong>
      <em>{task.progress}% complete</em>
    </>
  )}
/>`,
    }),
  },
  {
    title: 'Configuration & i18n',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-gantt': ['OgeGantt', 'OgeGanttConfigProvider'],
      },
      name: 'LocalizedPlan',
      before: `const tasks = [
  { id: 1, title: 'Planung', start: new Date(2026, 7, 3), end: new Date(2026, 7, 10), progress: 25 },
];`,
      jsx: `<>
  {/* Every user-facing string, aria labels included, lives in
      OgeGanttMessages — provide once with <OgeGanttConfigProvider> (a new
      config object re-resolves, so switching the UI language is a state
      change) or override per instance with messages. locale drives every
      Intl date format; rowHeight and undoLimit are config-level too. */}
  {/* App-wide, e.g. around the router:
      config={{ locale: 'de', rowHeight: 32, messages: { toolbar: { ...germanToolbar } } }} */}
  <OgeGanttConfigProvider config={{ locale: 'de' }}>
    <OgeGantt tasks={tasks} locale="de" style={{ height: 300 }} />
  </OgeGanttConfigProvider>
</>`,
    }),
  },
  {
    title: 'RTL',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      name: 'RtlPlan',
      before: `const tasks = [
  { id: 1, title: 'Release 1.0', start: new Date(2026, 7, 3), end: new Date(2026, 7, 21) },
  { id: 2, parentId: 1, title: 'Design', start: new Date(2026, 7, 3), end: new Date(2026, 7, 7), progress: 100 },
  { id: 3, parentId: 1, title: 'Implementation', start: new Date(2026, 7, 7), end: new Date(2026, 7, 17), progress: 45 },
  { id: 4, parentId: 1, title: 'Ship', start: new Date(2026, 7, 21), end: new Date(2026, 7, 21) },
];

const links = [
  { id: 'a', predecessorId: 2, successorId: 3 },
  { id: 'b', predecessorId: 3, successorId: 4 },
];`,
      jsx: `<>
  {/* rtlEnabled (unset = follow the page's dir) mirrors the whole chart:
      the task tree sits on the right, the timeline runs right to left,
      dependency arrows and drags follow, and the Left/Right keys swap —
      Left expands a summary, Alt+Shift+Left indents, Ctrl+Left moves a
      bar later. */}
  <OgeGantt tasks={tasks} dependencies={links} rtlEnabled style={{ height: 300 }} />
</>`,
    }),
  },
];
