/**
 * Shared datasets of the Gantt depth pages (scheduling, resources, task list,
 * import / export) — used by the Angular demos and their React twins in
 * `../react-gantt/`, so both layers show the same plan.
 */
import type {
  OgeGanttColumn,
  OgeGanttResource,
  OgeGanttWorkCalendar,
  OgeGanttZoomPreset,
} from '@oge-ui/gantt';

/** The item shape every depth demo binds (default field names). */
export interface DepthTask {
  id: number;
  parentId?: number | null;
  title: string;
  start: Date;
  end: Date;
  progress?: number;
  resourceId?: number | number[];
  units?: number | number[];
  effort?: number;
  manuallyScheduled?: boolean;
  constraintType?: string;
  constraintDate?: Date;
  deadline?: Date;
  segments?: { start: Date; end: Date }[];
  baselines?: { start: Date; end: Date }[];
  owner?: string;
}

/** The link shape (default field names, with lag). */
export interface DepthLink {
  id: string;
  predecessorId: number;
  successorId: number;
  type?: string;
  lag?: number;
  lagUnit?: string;
}

const d = (month: number, day: number) => new Date(2026, month, day);

/** Mon 2026-08-03 … — the depth plans start here. */
export const DEPTH_START = d(7, 3);

export const DEPTH_CALENDAR: OgeGanttWorkCalendar = {
  workingDays: [1, 2, 3, 4, 5],
  holidays: [d(7, 31)],
};

/** A launch plan with lag / lead links on every link type. */
export function schedulingTasks(): DepthTask[] {
  return [
    { id: 1, title: 'Launch', start: d(7, 3), end: d(7, 3) },
    {
      id: 2,
      parentId: 1,
      title: 'Specs',
      start: d(7, 3),
      end: d(7, 7),
      progress: 100,
    },
    {
      id: 3,
      parentId: 1,
      title: 'Prototype',
      start: d(7, 12),
      end: d(7, 19),
      progress: 40,
    },
    { id: 4, parentId: 1, title: 'User tests', start: d(7, 17), end: d(7, 21) },
    { id: 5, parentId: 1, title: 'Docs', start: d(7, 10), end: d(7, 14) },
    { id: 6, parentId: 1, title: 'Release', start: d(7, 28), end: d(7, 28) },
  ];
}

export function schedulingLinks(): DepthLink[] {
  return [
    // FS + 2 working days: the prototype waits for sign-off
    { id: 'a', predecessorId: 2, successorId: 3, lag: 2 },
    // SS with a one-day lead... tests start before the prototype is done
    { id: 'b', predecessorId: 3, successorId: 4, type: 'SS', lag: 3 },
    { id: 'c', predecessorId: 2, successorId: 5, type: 'FS', lag: -1 },
    { id: 'd', predecessorId: 4, successorId: 6, lag: 4, lagUnit: 'hours' },
    { id: 'e', predecessorId: 5, successorId: 6 },
  ];
}

/** Constraints, deadlines and a manual task — a plan with conflicts. */
export function constraintTasks(): DepthTask[] {
  return [
    { id: 1, title: 'Build', start: d(7, 3), end: d(7, 3) },
    {
      id: 2,
      parentId: 1,
      title: 'Backend',
      start: d(7, 3),
      end: d(7, 12),
      progress: 60,
    },
    {
      id: 3,
      parentId: 1,
      title: 'Security review (SNET)',
      start: d(7, 3),
      end: d(7, 5),
      constraintType: 'SNET',
      constraintDate: d(7, 10),
    },
    {
      id: 4,
      parentId: 1,
      title: 'Frontend (deadline)',
      start: d(7, 12),
      end: d(7, 19),
      deadline: d(7, 18),
    },
    {
      id: 5,
      parentId: 1,
      title: 'Translations (ALAP)',
      start: d(7, 3),
      end: d(7, 5),
      constraintType: 'ALAP',
    },
    {
      id: 6,
      parentId: 1,
      title: 'Vendor install (manual)',
      start: d(7, 10),
      end: d(7, 12),
      manuallyScheduled: true,
    },
    {
      id: 7,
      parentId: 1,
      title: 'Go-live (must finish on)',
      start: d(7, 24),
      end: d(7, 24),
      constraintType: 'MFO',
      constraintDate: d(7, 21),
    },
  ];
}

export function constraintLinks(): DepthLink[] {
  return [
    { id: 'a', predecessorId: 2, successorId: 4 },
    { id: 'b', predecessorId: 2, successorId: 6 }, // the manual task breaks it
    { id: 'c', predecessorId: 4, successorId: 7 },
    { id: 'd', predecessorId: 5, successorId: 7 },
  ];
}

/** Baselines, a split task, child milestones and progress for tracking. */
export function trackingTasks(): DepthTask[] {
  const baseline = (start: Date, end: Date, slip: number) => [
    { start, end },
    {
      start: new Date(start.getTime() + slip * 86_400_000),
      end: new Date(end.getTime() + slip * 86_400_000),
    },
  ];
  return [
    { id: 1, title: 'Migration', start: d(7, 3), end: d(7, 3) },
    {
      id: 2,
      parentId: 1,
      title: 'Inventory',
      start: d(7, 3),
      end: d(7, 7),
      progress: 100,
      baselines: baseline(d(7, 3), d(7, 6), 1),
    },
    {
      id: 3,
      parentId: 1,
      title: 'Plan approved',
      start: d(7, 7),
      end: d(7, 7),
    },
    {
      id: 4,
      parentId: 1,
      title: 'Data copy (split)',
      start: d(7, 10),
      end: d(7, 19),
      progress: 50,
      segments: [
        { start: d(7, 10), end: d(7, 13) },
        { start: d(7, 17), end: d(7, 19) },
      ],
      baselines: baseline(d(7, 10), d(7, 15), 2),
    },
    {
      id: 5,
      parentId: 1,
      title: 'Cut-over',
      start: d(7, 19),
      end: d(7, 21),
      progress: 10,
      baselines: baseline(d(7, 17), d(7, 19), 1),
    },
    { id: 6, parentId: 1, title: 'Switched', start: d(7, 21), end: d(7, 21) },
  ];
}

export function trackingLinks(): DepthLink[] {
  return [
    { id: 'a', predecessorId: 2, successorId: 3 },
    { id: 'b', predecessorId: 3, successorId: 4, lag: 1 },
    { id: 'c', predecessorId: 4, successorId: 5 },
    { id: 'd', predecessorId: 5, successorId: 6 },
  ];
}

/** The status date of the progress-line demo. */
export const STATUS_DATE = d(7, 14);

export const DEPTH_RESOURCES: OgeGanttResource[] = [
  { id: 1, text: 'Ana', color: '#2563eb' },
  { id: 2, text: 'Bora', color: '#16a34a', capacity: 50 },
  { id: 3, text: 'Cem', color: '#d97706' },
];

/** Assignments with units and work (effort-driven demo). */
export function resourceTasks(): DepthTask[] {
  return [
    { id: 1, title: 'Platform', start: d(7, 3), end: d(7, 3) },
    {
      id: 2,
      parentId: 1,
      title: 'API design',
      start: d(7, 3),
      end: d(7, 7),
      resourceId: [1],
      effort: 32,
    },
    {
      id: 3,
      parentId: 1,
      title: 'Database',
      start: d(7, 5),
      end: d(7, 11),
      resourceId: [1, 2],
      units: [50, 100],
      effort: 40,
    },
    {
      id: 4,
      parentId: 1,
      title: 'Monitoring',
      start: d(7, 6),
      end: d(7, 10),
      resourceId: [2],
      effort: 16,
    },
    {
      id: 5,
      parentId: 1,
      title: 'Load tests',
      start: d(7, 11),
      end: d(7, 14),
      resourceId: [3],
      effort: 24,
    },
    { id: 6, parentId: 1, title: 'Hand-over', start: d(7, 14), end: d(7, 15) },
  ];
}

/** A flat backlog for the task-list demos (owners, WBS, many columns). */
export function listTasks(): DepthTask[] {
  const owners = ['Ana', 'Bora', 'Cem', 'Deniz'];
  const rows: DepthTask[] = [];
  let id = 1;
  for (const [phase, title] of ['Discovery', 'Delivery', 'Rollout'].entries()) {
    const parent = id++;
    rows.push({
      id: parent,
      title,
      start: d(7, 3 + phase * 7),
      end: d(7, 3 + phase * 7),
    });
    for (let i = 0; i < 4; i++) {
      const start = d(7, 3 + phase * 7 + i);
      rows.push({
        id: id++,
        parentId: parent,
        title: `${title} task ${i + 1}`,
        start,
        end: new Date(start.getTime() + (2 + (i % 3)) * 86_400_000),
        progress: (i * 30) % 100,
        owner: owners[(phase + i) % owners.length],
      });
    }
  }
  return rows;
}

export function listLinks(): DepthLink[] {
  return [
    { id: 'a', predecessorId: 2, successorId: 5 },
    { id: 'b', predecessorId: 3, successorId: 4, type: 'SS', lag: 1 },
    { id: 'c', predecessorId: 7, successorId: 8, type: 'SS' },
  ];
}

/** A small MS Project XML file for the import demo. */
export const SAMPLE_MSPDI = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Title>Office move</Title>
  <CalendarUID>1</CalendarUID>
  <Calendars>
    <Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar>
      <WeekDays>
        <WeekDay><DayType>1</DayType><DayWorking>0</DayWorking></WeekDay>
        <WeekDay><DayType>2</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>3</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>4</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>5</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>6</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>7</DayType><DayWorking>0</DayWorking></WeekDay>
      </WeekDays>
    </Calendar>
  </Calendars>
  <Tasks>
    <Task><UID>0</UID><ID>0</ID><Name>Office move</Name><OutlineLevel>0</OutlineLevel><Start>2026-08-03T08:00:00</Start></Task>
    <Task><UID>1</UID><ID>1</ID><Name>Pack</Name><OutlineLevel>1</OutlineLevel><Start>2026-08-03T08:00:00</Start><Finish>2026-08-05T17:00:00</Finish><PercentComplete>30</PercentComplete></Task>
    <Task><UID>2</UID><ID>2</ID><Name>Move furniture</Name><OutlineLevel>1</OutlineLevel><Start>2026-08-06T08:00:00</Start><Finish>2026-08-07T17:00:00</Finish>
      <PredecessorLink><PredecessorUID>1</PredecessorUID><Type>1</Type><LinkLag>4800</LinkLag><LagFormat>7</LagFormat></PredecessorLink></Task>
    <Task><UID>3</UID><ID>3</ID><Name>Network ready</Name><OutlineLevel>1</OutlineLevel><Start>2026-08-10T08:00:00</Start><Finish>2026-08-10T08:00:00</Finish><Milestone>1</Milestone>
      <ConstraintType>2</ConstraintType><ConstraintDate>2026-08-10T08:00:00</ConstraintDate>
      <PredecessorLink><PredecessorUID>2</PredecessorUID><Type>1</Type></PredecessorLink></Task>
  </Tasks>
  <Resources>
    <Resource><UID>1</UID><ID>1</ID><Name>Movers</Name><MaxUnits>2.00</MaxUnits></Resource>
  </Resources>
  <Assignments>
    <Assignment><UID>1</UID><TaskUID>2</TaskUID><ResourceUID>1</ResourceUID><Units>2</Units></Assignment>
  </Assignments>
</Project>`;

/** Columns of the lag demo. */
export const LAG_COLUMNS: OgeGanttColumn[] = [
  { field: 'wbs', widthPx: 48 },
  { field: 'title', widthPx: 140 },
  { field: 'start' },
  { field: 'predecessors' },
  { field: 'totalSlack' },
  { field: 'freeSlack' },
];

export const CONSTRAINT_COLUMNS: OgeGanttColumn[] = [
  { field: 'title', widthPx: 210 },
  { field: 'constraint' },
  { field: 'deadline' },
];

export const ROADMAP_PRESETS: OgeGanttZoomPreset[] = [
  { scaleType: 'weeks', label: 'Sprint view' },
  { scaleType: 'months', tickWidth: 64, label: 'Compact months' },
  { scaleType: 'quarters', label: 'Quarters' },
  { scaleType: 'years', label: 'Roadmap (years)' },
];

export function roadmapTasks(): DepthTask[] {
  return [
    {
      id: 1,
      title: 'Platform v2',
      start: new Date(2026, 0, 12),
      end: new Date(2026, 5, 30),
    },
    {
      id: 2,
      title: 'Mobile apps',
      start: new Date(2026, 3, 1),
      end: new Date(2026, 11, 18),
    },
    {
      id: 3,
      title: 'EU region',
      start: new Date(2026, 8, 1),
      end: new Date(2027, 2, 31),
    },
  ];
}

/** The task-list columns of the utilization demo. */
export const RESOURCE_COLUMNS: OgeGanttColumn[] = [
  { field: 'title', widthPx: 130 },
  { field: 'resources', widthPx: 110 },
  { field: 'units' },
  { field: 'effort' },
];

/** Columns of the inline-editing demo. */
export const LIST_EDIT_COLUMNS: OgeGanttColumn[] = [
  { field: 'wbs', widthPx: 48, editor: false },
  { field: 'title', widthPx: 150 },
  { field: 'start' },
  { field: 'duration' },
  { field: 'progress' },
  { field: 'predecessors' },
  { field: 'owner', widthPx: 80 },
];

/** Columns of the sort / filter / columns demo. */
export const LIST_SORT_COLUMNS: OgeGanttColumn[] = [
  { field: 'wbs', widthPx: 48, frozen: true, allowSorting: false },
  { field: 'title', widthPx: 150, frozen: true },
  { field: 'owner', widthPx: 80 },
  { field: 'start' },
  { field: 'end' },
  { field: 'duration' },
];
