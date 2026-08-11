import type { OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';
import { buildGanttPdfDocument } from './index';

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
    progress: 50,
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

function data(tasks: OgeGanttTask[]): OgeGanttExportData {
  return {
    tasks,
    columns: [{ field: 'title', header: 'Task', text: (t) => t.title }],
    rangeStart: new Date(2026, 7, 1),
    rangeEnd: new Date(2026, 8, 1),
    critical: new Set([1]),
    resourceText: () => null,
  };
}

describe('buildGanttPdfDocument', () => {
  it('draws a landscape single-page document for a small plan', () => {
    const doc = buildGanttPdfDocument(
      data([
        task(1, 'Build', new Date(2026, 7, 3), new Date(2026, 7, 14)),
        task(2, 'Ship', new Date(2026, 7, 14), new Date(2026, 7, 14)),
      ]),
      { title: 'Plan' },
    );
    expect(doc.getNumberOfPages()).toBe(1);
    const { width, height } = doc.internal.pageSize;
    expect(width).toBeGreaterThan(height); // landscape default
  });

  it('paginates long plans and repeats the scale header', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      task(i + 1, `Task ${i + 1}`, new Date(2026, 7, 3), new Date(2026, 7, 5)),
    );
    const doc = buildGanttPdfDocument(data(many));
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('honors portrait orientation', () => {
    const doc = buildGanttPdfDocument(
      data([task(1, 'Solo', new Date(2026, 7, 3), new Date(2026, 7, 5))]),
      { orientation: 'portrait' },
    );
    const { width, height } = doc.internal.pageSize;
    expect(height).toBeGreaterThan(width);
  });
});
