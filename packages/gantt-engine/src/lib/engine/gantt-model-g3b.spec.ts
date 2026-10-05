import {
  buildGanttDependencies,
  buildGanttTasks,
  ganttTaskPatch,
  normalizeGanttUnits,
  parseGanttConstraintType,
  parseGanttLag,
  resolveGanttFields,
} from './gantt-model';
import { buildGanttScale } from './time-scale';

interface Item {
  id: string;
  parentId?: string;
  title: string;
  start: Date | string;
  end: Date | string;
  segments?: unknown;
  baselines?: unknown;
  constraintType?: string;
  constraintDate?: string;
  deadline?: Date;
  manuallyScheduled?: boolean;
  resourceId?: unknown;
  units?: unknown;
  effort?: number;
  baselineStart?: Date;
  baselineEnd?: Date;
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

describe('gantt model (G3b fields)', () => {
  it('numbers the outline from the store order', () => {
    const tasks = buildGanttTasks<Item>(
      [
        { id: 'a', title: 'A', start: d(1), end: d(2) },
        { id: 'a1', parentId: 'a', title: 'A1', start: d(1), end: d(2) },
        { id: 'a2', parentId: 'a', title: 'A2', start: d(1), end: d(2) },
        { id: 'a21', parentId: 'a2', title: 'A21', start: d(1), end: d(2) },
        { id: 'b', title: 'B', start: d(1), end: d(2) },
      ],
      fields,
      new Set(['a2']),
    );
    expect(tasks.map((task) => [task.key, task.wbs])).toEqual([
      ['a', '1'],
      ['a1', '1.1'],
      ['a2', '1.2'],
      ['b', '2'],
    ]);
  });

  it('spans a split task over its pieces and keeps them sorted', () => {
    const [task] = buildGanttTasks<Item>(
      [
        {
          id: 's',
          title: 'S',
          start: d(1),
          end: d(2),
          segments: [
            { start: '2026-01-08', end: '2026-01-10' },
            { start: d(3), end: d(5) },
            { start: 'bad', end: d(9) },
          ],
        },
      ],
      fields,
      new Set(),
    );
    expect(task.start).toEqual(d(3));
    expect(task.end).toEqual(d(10));
    expect(task.segments).toEqual([
      { start: d(3), end: d(5) },
      { start: d(8), end: d(10) },
    ]);
  });

  it('reads baselines (array wins over the legacy pair), constraints, deadlines and units', () => {
    const [legacy, many] = buildGanttTasks<Item>(
      [
        {
          id: 'l',
          title: 'L',
          start: d(1),
          end: d(2),
          baselineStart: d(1),
          baselineEnd: d(3),
          constraintType: 'snet',
          constraintDate: '2026-01-04',
          resourceId: ['x', 'y'],
          units: { y: 50 },
        },
        {
          id: 'm',
          title: 'M',
          start: d(1),
          end: d(2),
          baselines: [
            { start: d(2), end: d(4) },
            { start: d(3), end: d(6) },
          ],
          baselineStart: d(1),
          baselineEnd: d(3),
          constraintType: 'MSO', // no date: reads as ASAP
          deadline: d(9),
          manuallyScheduled: true,
          effort: 24,
        },
      ],
      fields,
      new Set(),
    );
    expect(legacy.baselines).toEqual([{ start: d(1), end: d(3) }]);
    expect(legacy.constraintType).toBe('SNET');
    expect(legacy.constraintDate).toEqual(d(4));
    expect(legacy.units).toEqual([100, 50]);
    expect(many.baselines).toHaveLength(2);
    expect(many.baselineStart).toEqual(d(2));
    expect(many.constraintType).toBe('ASAP');
    expect(many.deadline).toEqual(d(9));
    expect(many.manuallyScheduled).toBe(true);
    expect(many.effort).toBe(24);
  });

  it('normalizes units and constraint types', () => {
    expect(normalizeGanttUnits(50, ['a', 'b'])).toEqual([50, 50]);
    expect(normalizeGanttUnits([25], ['a', 'b'])).toEqual([25, 100]);
    expect(normalizeGanttUnits(-1, ['a'])).toEqual([100]);
    expect(parseGanttConstraintType('fnlt')).toBe('FNLT');
    expect(parseGanttConstraintType('later')).toBe('ASAP');
    expect(parseGanttLag('2.5')).toBe(2.5);
    expect(parseGanttLag('x')).toBe(0);
  });

  it('writes the new fields back in the stored date shape', () => {
    const original: Item = {
      id: 'o',
      title: 'O',
      start: '2026-01-01',
      end: '2026-01-02',
      segments: [{ start: '2026-01-01', end: '2026-01-02' }],
    };
    const patch = ganttTaskPatch(
      original,
      {
        segments: [{ start: d(5), end: d(6) }],
        constraintType: 'FNET',
        constraintDate: d(7),
        deadline: null,
        units: [50, 75],
        effort: 8,
        manuallyScheduled: false,
      },
      fields,
    );
    expect(patch).toEqual({
      segments: [{ start: '2026-01-05', end: '2026-01-06' }],
      constraintType: 'FNET',
      constraintDate: '2026-01-07',
      deadline: null,
      units: [50, 75],
      effort: 8,
      manuallyScheduled: false,
    });
  });

  it('reads dependency lag and unit', () => {
    const [link, plain] = buildGanttDependencies(
      [
        { id: 'x', from: 'a', to: 'b', type: 'SS', lag: -2, lagUnit: 'hours' },
        { id: 'y', from: 'b', to: 'c', lag: 'oops' },
      ],
      {
        keyExpr: 'id',
        predecessorKeyExpr: 'from',
        successorKeyExpr: 'to',
        typeExpr: 'type',
      },
      new Set(['a', 'b', 'c']),
    );
    expect([link.lag, link.lagUnit]).toEqual([-2, 'hours']);
    expect([plain.type, plain.lag, plain.lagUnit]).toEqual(['FS', 0, 'days']);
  });
});

describe('quarter and year scales', () => {
  it('ticks per quarter under year headers', () => {
    const scale = buildGanttScale(d(20), new Date(2026, 7, 1), 'quarters', 1);
    expect(scale.ticks.map((tick) => tick.date.getMonth())).toEqual([
      9, 0, 3, 6, 9,
    ]);
    expect(scale.majorTicks.map((tick) => tick.date.getFullYear())).toEqual([
      2025, 2026,
    ]);
  });

  it('ticks per year under decade headers', () => {
    const scale = buildGanttScale(d(5), new Date(2031, 5, 1), 'years', 1);
    expect(scale.ticks[0].date).toEqual(new Date(2025, 0, 1));
    expect(scale.ticks.at(-1)?.date).toEqual(new Date(2032, 0, 1));
    expect(scale.majorTicks.map((tick) => tick.date.getFullYear())).toEqual([
      2020, 2030,
    ]);
  });
});
