import type { OgeGanttExportData, OgeGanttTask } from './lib/gantt-types';
import { buildGanttCanvas, ganttImageSize } from './export-image';

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
    wbs: '',
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

  describe('direction (recording 2D context)', () => {
    interface Call {
      readonly op: string;
      readonly args: readonly unknown[];
      readonly textAlign: string;
      readonly fillStyle: string;
    }
    let calls: Call[];

    beforeEach(() => {
      calls = [];
      const state: Record<string, unknown> = {
        textAlign: 'start',
        fillStyle: '#000',
      };
      const ctx = new Proxy(state, {
        get: (target, prop: string) =>
          prop in target
            ? target[prop]
            : (...args: unknown[]) => {
                calls.push({
                  op: prop,
                  args,
                  textAlign: String(target['textAlign']),
                  fillStyle: String(target['fillStyle']),
                });
              },
        set: (target, prop: string, value) => {
          target[prop] = value;
          return true;
        },
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
    });
    afterEach(() => vi.restoreAllMocks());

    const titleCall = (name: string) =>
      calls.find((call) => call.op === 'fillText' && call.args[0] === name);
    /** The full-height (14px) bar rect in the bar fill colour. */
    const barRect = () =>
      calls.find(
        (call) =>
          call.op === 'fillRect' &&
          call.fillStyle === '#c7d2fe' &&
          call.args[3] === 14,
      );
    const progressRect = () =>
      calls.find(
        (call) => call.op === 'fillRect' && call.fillStyle === '#4f46e5',
      );

    it('LTR: titles start at the left margin, the bar fills from its left edge', () => {
      buildGanttCanvas(DATA, { width: 1000, pixelRatio: 1 });
      expect(titleCall('T1')).toMatchObject({ textAlign: 'left' });
      expect(titleCall('T1')?.args[1]).toBe(24);
      const bar = barRect()?.args as number[];
      const fill = progressRect()?.args as number[];
      expect(bar[0]).toBeGreaterThan(24 + 220);
      expect(fill[0]).toBe(bar[0]);
    });

    it('RTL (from the snapshot): titles on the right, the timeline mirrored', () => {
      buildGanttCanvas({ ...DATA, rtl: true }, { width: 1000, pixelRatio: 1 });
      expect(titleCall('T1')).toMatchObject({ textAlign: 'right' });
      expect(titleCall('T1')?.args[1]).toBe(1000 - 24);
      const bar = barRect()?.args as number[];
      const fill = progressRect()?.args as number[];
      // the bar lies in the left band, mirrored about it
      const chartLeft = 24;
      const chartRight = 1000 - 24 - 220;
      const ltr = (date: Date) =>
        ((date.getTime() - DATA.rangeStart.getTime()) /
          (DATA.rangeEnd.getTime() - DATA.rangeStart.getTime())) *
        (chartRight - chartLeft);
      const task = DATA.tasks[0];
      expect(bar[0]).toBeCloseTo(chartRight - ltr(task.end));
      expect(bar[0] + bar[2]).toBeCloseTo(chartRight - ltr(task.start));
      // progress grows from the right (start) edge of the bar
      expect(fill[0] + fill[2]).toBeCloseTo(bar[0] + bar[2]);
    });

    it('the rtl option overrides the snapshot', () => {
      buildGanttCanvas({ ...DATA, rtl: true }, { pixelRatio: 1, rtl: false });
      expect(titleCall('T1')).toMatchObject({ textAlign: 'left' });
    });
  });

  it('honors a custom pixel ratio', () => {
    const canvas = buildGanttCanvas(DATA, { width: 500, pixelRatio: 1 });
    expect(canvas.width).toBe(500);
  });
});
