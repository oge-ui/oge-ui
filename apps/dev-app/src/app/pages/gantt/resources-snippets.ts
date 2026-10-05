import { demoSource } from '../../shared/demo-source';

const RESOURCE_DATA = `protected readonly resources: OgeGanttResource[] = [
  { id: 1, text: 'Ana' },
  { id: 2, text: 'Bora', capacity: 50 }, // half time
  { id: 3, text: 'Cem' },
];
protected readonly tasks = [
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

export const UTILIZATION_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttColumn', 'OgeGanttResource'] },
  template: `<!-- units (%) per assignment, work in hours and effortDriven: changing
     a task's people, units or work recomputes its finish. The histogram
     sums units per period against each resource's capacity line —
     over-allocated periods turn red. -->
<oge-gantt
  [tasks]="tasks"
  [resources]="resources"
  [columns]="columns"
  [effortDriven]="true"
  [hoursPerDay]="8"
  [showResourceHistogram]="true"
  style="height: 460px"
/>`,
  body: `protected readonly columns: OgeGanttColumn[] = [
  { field: 'title' },
  { field: 'resources' },
  { field: 'units' },
  { field: 'effort' },
];
${RESOURCE_DATA}`,
});

export const RESOURCE_VIEW_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: { '@oge-ui/gantt': ['OgeGanttResource', 'OgeGanttViewMode'] },
  template: `<!-- viewMode 'resources' regroups the rows by resource (the toolbar's
     Resource view toggle flips it); assignment rows edit the real task. -->
<oge-gantt
  [tasks]="tasks"
  [resources]="resources"
  [(viewMode)]="view"
  style="height: 420px"
/>
<p>View: {{ view() }}</p>`,
  body: `protected readonly view = signal<OgeGanttViewMode>('resources');
${RESOURCE_DATA}`,
});
