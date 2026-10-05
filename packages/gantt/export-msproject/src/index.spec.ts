import type { OgeGantt, OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';
import { exportGanttToMsProject, importMsProjectXml } from './index';

function task(key: number, start: Date, end: Date): OgeGanttTask {
  return {
    key,
    source: { key },
    parentKey: null,
    level: 0,
    title: `T${key}`,
    start,
    end,
    progress: 30,
    color: undefined,
    baselineStart: undefined,
    baselineEnd: undefined,
    isMilestone: start.getTime() === end.getTime(),
    isSummary: false,
    expanded: true,
    hasChildren: false,
    resourceIds: [],
    wbs: String(key),
    manuallyScheduled: false,
    constraintType: 'ASAP',
    constraintDate: undefined,
    deadline: undefined,
    segments: [],
    baselines: [],
    units: [],
    effort: undefined,
  };
}

const DATA: OgeGanttExportData = {
  tasks: [
    task(1, new Date(2026, 7, 3), new Date(2026, 7, 10)),
    task(2, new Date(2026, 7, 10), new Date(2026, 7, 10)),
  ],
  columns: [{ field: 'title', header: 'Task', text: (t) => t.title }],
  rangeStart: new Date(2026, 7, 1),
  rangeEnd: new Date(2026, 8, 1),
  critical: new Set([1]),
  resourceText: () => null,
  dependencies: [
    {
      key: 'l',
      source: {},
      predecessorKey: 1,
      successorKey: 2,
      type: 'FS',
      lag: 2,
      lagUnit: 'days',
    },
  ],
};

describe('exportGanttToMsProject', () => {
  it('returns MSPDI without downloading and round-trips through the import', () => {
    const gantt = { getExportData: () => DATA } as unknown as OgeGantt<
      Record<string, unknown>
    >;
    const xml = exportGanttToMsProject(gantt, { download: false, title: 'Q3' });
    expect(xml).toContain('<Title>Q3</Title>');
    const result = importMsProjectXml(xml);
    expect(result.tasks.map((item) => item.title)).toEqual(['T1', 'T2']);
    expect(result.dependencies[0]).toMatchObject({ type: 'FS', lag: 2 });
  });
});
