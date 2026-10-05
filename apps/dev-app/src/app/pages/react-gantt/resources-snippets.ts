import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const RESOURCE_DATA = `const resources: OgeGanttResource[] = [
  { id: 1, text: 'Ana' },
  { id: 2, text: 'Bora', capacity: 50 }, // half time
  { id: 3, text: 'Cem' },
];
const tasks = [
  { id: 1, title: 'API design', start: new Date(2026, 7, 3), end: new Date(2026, 7, 7), resourceId: [1], effort: 32 },
  {
    id: 2,
    title: 'Database',
    start: new Date(2026, 7, 5),
    end: new Date(2026, 7, 11),
    resourceId: [1, 2],
    units: [50, 100], // per assignment, in %
    effort: 40,
  },
  { id: 3, title: 'Monitoring', start: new Date(2026, 7, 6), end: new Date(2026, 7, 10), resourceId: [2], effort: 16 },
  { id: 4, title: 'Load tests', start: new Date(2026, 7, 11), end: new Date(2026, 7, 14), resourceId: [3], effort: 24 },
];`;

/**
 * Demo sources for the React "Resources" page — section-for-section mirror
 * of `../gantt/resources-snippets.ts`. Pure data.
 */
export const GANTT_RESOURCES_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Units, work & utilization',
    source: reactDemoSource({
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: { '@oge-ui/react-gantt': ['OgeGanttColumn', 'OgeGanttResource'] },
      name: 'Utilization',
      before: `// units (%) per assignment, work in hours and effortDriven: changing a
// task's people, units or work recomputes its finish. The histogram sums
// units per period against each resource's capacity line — over-allocated
// periods turn red.
const columns: OgeGanttColumn[] = [
  { field: 'title' },
  { field: 'resources' },
  { field: 'units' },
  { field: 'effort' },
];
${RESOURCE_DATA}`,
      jsx: `<OgeGantt
  tasks={tasks}
  resources={resources}
  columns={columns}
  effortDriven
  hoursPerDay={8}
  showResourceHistogram
  style={{ height: 460 }}
/>`,
    }),
  },
  {
    title: 'Resource view',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-gantt': ['OgeGantt'] },
      types: {
        '@oge-ui/react-gantt': ['OgeGanttResource', 'OgeGanttViewMode'],
      },
      name: 'ByPerson',
      before: `// viewMode 'resources' regroups the rows by resource (the toolbar's
// Resource view toggle flips it); assignment rows edit the real task.
${RESOURCE_DATA}`,
      body: `const [view, setView] = useState<OgeGanttViewMode>('resources');`,
      jsx: `<>
  <OgeGantt
    tasks={tasks}
    resources={resources}
    viewMode={view}
    onViewModeChange={setView}
    style={{ height: 420 }}
  />
  <p>View: {view}</p>
</>`,
    }),
  },
];
