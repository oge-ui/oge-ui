import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Import / export" page — section-for-section
 * mirror of `../gantt/import-export-snippets.ts`. Pure data.
 */
export const GANTT_IMPORT_EXPORT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'MS Project XML',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': [
          'OgeGanttHandle',
          'OgeGanttResource',
          'OgeGanttWorkCalendar',
        ],
      },
      name: 'ProjectFiles',
      before: `// /export-msproject has no dependencies: MSPDI XML with WBS, outline
// levels, manual mode, constraints, deadlines, baselines, links with lag,
// resources, assignments with units and the calendar. The import returns
// plain data in the default field names — set it as props.
type Item = Record<string, unknown>;`,
      body: `const gantt = useRef<OgeGanttHandle<Item, Item>>(null);
const [tasks, setTasks] = useState<Item[]>([
  { id: 1, title: 'Pack', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6) },
  { id: 2, title: 'Move', start: new Date(2026, 7, 7), end: new Date(2026, 7, 8) },
]);
const [links, setLinks] = useState<Item[]>([
  { id: 'a', predecessorId: 1, successorId: 2, lag: 1 },
]);
const [resources, setResources] = useState<OgeGanttResource[]>([]);
const [calendar, setCalendar] = useState<OgeGanttWorkCalendar | null>(null);

const exportXml = async () => {
  const { exportGanttToMsProject } = await import('@oge-ui/react-gantt/export-msproject');
  if (gantt.current) {
    exportGanttToMsProject(gantt.current, { filename: 'plan.xml', title: 'Office move' });
  }
};

const importXml = async (file: File | undefined) => {
  if (!file) return;
  const { importMsProjectXml } = await import('@oge-ui/react-gantt/export-msproject');
  const plan = importMsProjectXml(await file.text());
  setTasks(plan.tasks as unknown as Item[]);
  setLinks(plan.dependencies as unknown as Item[]);
  setResources(plan.resources);
  setCalendar(plan.workCalendar);
};`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap gap-2">
    <button type="button" onClick={exportXml}>Download .xml</button>
    <input type="file" accept=".xml" onChange={(event) => importXml(event.target.files?.[0])} />
  </div>
  <OgeGantt
    ref={gantt}
    tasks={tasks}
    dependencies={links}
    resources={resources}
    workCalendar={calendar}
    style={{ height: 420 }}
  />
</>`,
    }),
  },
];
