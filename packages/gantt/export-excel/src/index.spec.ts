import type { OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';
import { buildGanttExcelWorkbook } from './index';

function task(
  key: number,
  title: string,
  start: Date,
  end: Date,
  overrides: Partial<OgeGanttTask> = {},
): OgeGanttTask {
  return {
    key,
    source: { key },
    parentKey: null,
    level: 0,
    title,
    start,
    end,
    progress: 0,
    color: undefined,
    baselineStart: undefined,
    baselineEnd: undefined,
    isMilestone: start.getTime() === end.getTime(),
    isSummary: false,
    expanded: true,
    hasChildren: false,
    resourceIds: [],
    ...overrides,
  };
}

const TASKS: OgeGanttTask[] = [
  task(1, 'Release', new Date(2026, 7, 3), new Date(2026, 7, 14), {
    isSummary: true,
    hasChildren: true,
    progress: 40,
  }),
  task(2, 'Design', new Date(2026, 7, 3), new Date(2026, 7, 7), {
    parentKey: 1,
    level: 1,
    progress: 100,
    resourceIds: ['ada'],
  }),
];

const DATA: OgeGanttExportData = {
  tasks: TASKS,
  columns: [
    { field: 'title', header: 'Task', text: (t) => t.title },
    { field: 'start', header: 'Start', text: (t) => t.start.toDateString() },
    { field: 'progress', header: 'Progress', text: (t) => `${t.progress}%` },
  ],
  rangeStart: new Date(2026, 7, 1),
  rangeEnd: new Date(2026, 7, 20),
  critical: new Set([2]),
  resourceText: (t) => (t.resourceIds.length > 0 ? 'Ada' : null),
};

describe('buildGanttExcelWorkbook', () => {
  it('writes tree-ordered rows: indented titles, bold summaries, typed cells', () => {
    const sheet = buildGanttExcelWorkbook(DATA, {
      sheetName: 'Plan',
    }).getWorksheet('Plan');
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).font?.bold).toBe(true);
    expect(sheet?.getRow(1).getCell(1).value).toBe('Task');
    // summary row is bold, child title is indented by level
    expect(sheet?.getRow(2).font?.bold).toBe(true);
    expect(sheet?.getRow(3).getCell(1).value).toBe('  Design');
    // start stays a Date, progress stays a number
    expect(sheet?.getRow(3).getCell(2).value).toBeInstanceOf(Date);
    expect(sheet?.getRow(3).getCell(3).value).toBe(100);
  });

  it('appends the resource column when any task has resources', () => {
    const sheet = buildGanttExcelWorkbook(DATA).getWorksheet('Tasks');
    expect(sheet?.getRow(1).getCell(4).value).toBe('Assigned');
    expect(sheet?.getRow(3).getCell(4).value).toBe('Ada');
  });

  it('omits the resource column with includeResources: false and honors indentTitles: false', () => {
    const sheet = buildGanttExcelWorkbook(DATA, {
      includeResources: false,
      indentTitles: false,
    }).getWorksheet('Tasks');
    expect(sheet?.getRow(1).cellCount).toBe(3);
    expect(sheet?.getRow(3).getCell(1).value).toBe('Design');
  });
});
