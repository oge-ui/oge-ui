import { buildGanttTasks, resolveGanttFields } from './gantt-model';
import type { GanttDependency } from './gantt-model';
import {
  clampGanttColumnWidth,
  formatGanttLag,
  formatGanttPredecessors,
  ganttDateInputValue,
  ganttFilterKeys,
  moveGanttColumn,
  nextGanttSelection,
  parseGanttDateInput,
  parseGanttPredecessors,
  sortGanttItems,
} from './task-list';

interface Item {
  id: string;
  parentId?: string;
  title: string;
  start: Date;
  end: Date;
  progress?: number;
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
const ITEMS: Item[] = [
  { id: 'p', title: 'Phase', start: d(1), end: d(1) },
  {
    id: 'b',
    parentId: 'p',
    title: 'Build',
    start: d(6),
    end: d(9),
    progress: 10,
  },
  {
    id: 'a',
    parentId: 'p',
    title: 'Analyse',
    start: d(2),
    end: d(5),
    progress: 90,
  },
  { id: 'z', title: 'Zeta', start: d(3), end: d(4) },
];

const tasks = () => buildGanttTasks(ITEMS, fields, new Set());

describe('task list kernel', () => {
  it('sorts siblings by a column and keeps the WBS from the store order', () => {
    const all = tasks();
    const order = sortGanttItems(all, { field: 'title', direction: 'asc' });
    const sorted = buildGanttTasks(ITEMS, fields, new Set(), { order });
    expect(sorted.map((task) => task.key)).toEqual(['p', 'a', 'b', 'z']);
    expect(sorted.map((task) => task.wbs)).toEqual(['1', '1.2', '1.1', '2']);
    const byStartDesc = sortGanttItems(all, {
      field: 'start',
      direction: 'desc',
    });
    expect(
      buildGanttTasks(ITEMS, fields, new Set(), { order: byStartDesc }).map(
        (task) => task.key,
      ),
    ).toEqual(['z', 'p', 'b', 'a']);
  });

  it('filters fold-insensitively and keeps the ancestors of matches', () => {
    const all = tasks();
    const text = (task: (typeof all)[number], field: string) =>
      field === 'title' ? task.title : '';
    const keys = ganttFilterKeys(all, ['title'], {}, 'ANAL', text);
    expect([...(keys ?? [])].sort()).toEqual(['a', 'p']);
    const column = ganttFilterKeys(all, ['title'], { title: 'zé' }, '', text);
    expect(column).not.toBeNull();
    expect(
      ganttFilterKeys(all, ['title'], { title: ' ' }, '', text),
    ).toBeNull();
    const visible = buildGanttTasks(ITEMS, fields, new Set(['p']), {
      include: keys,
    });
    // a filter opens collapsed ancestors
    expect(visible.map((task) => task.key)).toEqual(['p', 'a']);
  });

  it('parses predecessor cells against the known keys', () => {
    const keys = ['1', '2', 'task-1', 10];
    expect(parseGanttPredecessors('1, 2SS+2d; task-1FF-1.5h', keys)).toEqual([
      { key: '1', type: 'FS', lag: 0, lagUnit: 'days' },
      { key: '2', type: 'SS', lag: 2, lagUnit: 'days' },
      { key: 'task-1', type: 'FF', lag: -1.5, lagUnit: 'hours' },
    ]);
    expect(parseGanttPredecessors('10sf +3', keys)).toEqual([
      { key: 10, type: 'SF', lag: 3, lagUnit: 'days' },
    ]);
    expect(parseGanttPredecessors('', keys)).toEqual([]);
    expect(parseGanttPredecessors('nope', keys)).toBeNull();
    expect(parseGanttPredecessors('1XX', keys)).toBeNull();
  });

  it('formats lags and predecessor cells', () => {
    const suffix = { days: '{value}d', hours: '{value}h' };
    expect(formatGanttLag(0, 'days', suffix)).toBe('');
    expect(formatGanttLag(2, 'days', suffix)).toBe('+2d');
    expect(formatGanttLag(-4, 'hours', suffix)).toBe('-4h');
    const links = [
      { predecessorKey: 3, type: 'FS', lag: 0, lagUnit: 'days' },
      { predecessorKey: 5, type: 'SS', lag: 2, lagUnit: 'days' },
      { predecessorKey: 7, type: 'FS', lag: -1, lagUnit: 'hours' },
    ] as GanttDependency[];
    expect(formatGanttPredecessors(links, suffix)).toBe('3, 5SS+2d, 7FS-1h');
  });

  it('round-trips date input values', () => {
    expect(ganttDateInputValue(new Date(2026, 2, 7, 13))).toBe('2026-03-07');
    expect(parseGanttDateInput('2026-03-07')).toEqual(new Date(2026, 2, 7));
    expect(parseGanttDateInput('7.3.2026')).toBeNull();
  });

  it('moves and clamps columns', () => {
    expect(moveGanttColumn(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveGanttColumn(['a', 'b', 'c'], 'c', -5)).toEqual(['c', 'a', 'b']);
    expect(moveGanttColumn(['a'], 'x', 0)).toEqual(['a']);
    expect(clampGanttColumnWidth(5)).toBe(40);
    expect(clampGanttColumnWidth(5000)).toBe(600);
  });

  it('computes plain, toggle and range selections', () => {
    const visible = ['a', 'b', 'c', 'd'];
    const none = { toggle: false, range: false };
    expect(nextGanttSelection(['a'], visible, 'a', 'c', none)).toEqual(['c']);
    expect(
      nextGanttSelection(['a'], visible, 'a', 'c', {
        toggle: true,
        range: false,
      }),
    ).toEqual(['a', 'c']);
    expect(
      nextGanttSelection(['a', 'c'], visible, 'a', 'c', {
        toggle: true,
        range: false,
      }),
    ).toEqual(['a']);
    expect(
      nextGanttSelection(['b'], visible, 'b', 'd', {
        toggle: false,
        range: true,
      }),
    ).toEqual(['b', 'c', 'd']);
    expect(
      nextGanttSelection(['a'], visible, 'd', 'b', {
        toggle: true,
        range: true,
      }),
    ).toEqual(['a', 'b', 'c', 'd']);
  });
});
