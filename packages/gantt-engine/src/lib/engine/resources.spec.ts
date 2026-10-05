import { buildGanttTasks, resolveGanttFields } from './gantt-model';
import {
  buildResourceHistogram,
  buildResourceViewRows,
  effortDrivenEnd,
  GANTT_RESOURCE_ROW_PREFIX,
} from './resources';

interface Item {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: unknown;
  units?: unknown;
  parentId?: string;
}

const fields = resolveGanttFields<Item>({
  keyExpr: 'id',
  parentKeyExpr: 'parentId',
  titleExpr: 'title',
  startExpr: 'start',
  endExpr: 'end',
  progressExpr: 'progress',
  colorExpr: 'color',
  baselineStartExpr: 'baselineStart',
  baselineEndExpr: 'baselineEnd',
  resourceIdExpr: 'resourceId',
});
const d = (day: number) => new Date(2026, 0, day);

describe('resource kernel', () => {
  it('derives effort-driven finishes from work, units and hours per day', () => {
    // 16h at 100% and 8h/day = 2 days
    expect(effortDrivenEnd(d(5), 16, 100, 8)).toEqual(d(7));
    // two resources double the rate: 1 day
    expect(effortDrivenEnd(d(5), 16, 200, 8)).toEqual(d(6));
    // half time: 4 days; rounding up a partial day
    expect(effortDrivenEnd(d(5), 16, 50, 8)).toEqual(d(9));
    expect(effortDrivenEnd(d(5), 9, 100, 8)).toEqual(d(7));
    // on a calendar the days are working days (Fri 9th + 2 → Tue 13th)
    expect(effortDrivenEnd(d(9), 16, 100, 8, {})).toEqual(d(13));
    expect(effortDrivenEnd(d(5), undefined, 100, 8)).toBeNull();
    expect(effortDrivenEnd(d(5), 8, 0, 8)).toBeNull();
  });

  it('builds a per-period utilization histogram with units and capacity', () => {
    const tasks = buildGanttTasks<Item>(
      [
        { id: '1', title: 'A', start: d(5), end: d(7), resourceId: 'ann' },
        {
          id: '2',
          title: 'B',
          start: d(6),
          end: d(8),
          resourceId: ['ann', 'bo'],
          units: [50, 100],
        },
      ],
      fields,
      new Set(),
    );
    const periods = [d(5), d(6), d(7), d(8)];
    const [ann, bo] = buildResourceHistogram(
      tasks,
      [
        { id: 'ann', text: 'Ann' },
        { id: 'bo', text: 'Bo', capacity: 50 },
      ],
      periods,
    );
    expect(ann.cells.map((cell) => cell.load)).toEqual([100, 150, 50]);
    expect(ann.cells.map((cell) => cell.over)).toEqual([false, true, false]);
    expect(ann.peak).toBe(150);
    expect(ann.overCount).toBe(1);
    expect(bo.cells.map((cell) => cell.load)).toEqual([0, 100, 100]);
    expect(bo.overCount).toBe(2);
  });

  it('builds resource-view rows: groups, copies under composite keys, unassigned', () => {
    const tasks = buildGanttTasks<Item>(
      [
        { id: '1', title: 'A', start: d(5), end: d(7), resourceId: 'ann' },
        { id: '2', title: 'B', start: d(6), end: d(9), resourceId: ['ann', 'bo'] },
        { id: '3', title: 'C', start: d(6), end: d(8) },
      ],
      fields,
      new Set(),
    );
    const rows = buildResourceViewRows(
      tasks,
      [
        { id: 'ann', text: 'Ann' },
        { id: 'bo', text: 'Bo' },
      ],
      new Set([`${GANTT_RESOURCE_ROW_PREFIX}bo`]),
      'Unassigned',
    );
    expect(rows.map((row) => [row.task.key, row.realKey])).toEqual([
      [`${GANTT_RESOURCE_ROW_PREFIX}ann`, null],
      [`${GANTT_RESOURCE_ROW_PREFIX}ann:1`, '1'],
      [`${GANTT_RESOURCE_ROW_PREFIX}ann:2`, '2'],
      [`${GANTT_RESOURCE_ROW_PREFIX}bo`, null], // collapsed
      [`${GANTT_RESOURCE_ROW_PREFIX}`, null],
      [`${GANTT_RESOURCE_ROW_PREFIX}:3`, '3'],
    ]);
    const ann = rows[0].task;
    expect(ann.isSummary).toBe(true);
    expect(ann.start).toEqual(d(5));
    expect(ann.end).toEqual(d(9));
    expect(rows[1].task.source.title).toBe('A');
    expect(rows[1].task.level).toBe(1);
    expect(rows[3].task.expanded).toBe(false);
  });
});
