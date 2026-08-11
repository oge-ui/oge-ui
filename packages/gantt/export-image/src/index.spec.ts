import type { OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';
import { buildGanttCanvas, ganttImageSize } from './index';

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
};

describe('ganttImageSize', () => {
  it('derives the height from the row count', () => {
    expect(ganttImageSize(0)).toEqual({ width: 1600, height: 76 });
    expect(ganttImageSize(10).height).toBe(76 + 10 * 26);
    expect(ganttImageSize(2, 800).width).toBe(800);
  });
});

describe('buildGanttCanvas', () => {
  it('sizes the canvas by row count and pixel ratio (jsdom: undrawn)', () => {
    const canvas = buildGanttCanvas(DATA, { width: 800, pixelRatio: 2 });
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe((76 + 2 * 26) * 2);
  });

  it('honors a custom pixel ratio', () => {
    const canvas = buildGanttCanvas(DATA, { width: 500, pixelRatio: 1 });
    expect(canvas.width).toBe(500);
  });
});
