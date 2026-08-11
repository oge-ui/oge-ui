import {
  buildGanttDependencies,
  buildGanttTasks,
  ganttTaskPatch,
  resolveGanttFields,
  wouldCreateCycle,
  type GanttTaskExprs,
} from './gantt-model';

interface Item {
  id: number;
  parentId?: number | null;
  title?: string;
  start?: unknown;
  end?: unknown;
  progress?: number;
  color?: string;
  resourceId?: unknown;
}

const EXPRS: GanttTaskExprs<Item> = {
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
};

const fields = resolveGanttFields(EXPRS);

const DATA: Item[] = [
  {
    id: 1,
    title: 'Phase',
    start: new Date(2026, 0, 1),
    end: new Date(2026, 0, 2),
  },
  {
    id: 2,
    parentId: 1,
    title: 'Design',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 9),
    progress: 100,
  },
  {
    id: 3,
    parentId: 1,
    title: 'Build',
    start: new Date(2026, 0, 9),
    end: new Date(2026, 0, 21),
    progress: 25,
  },
  {
    id: 4,
    parentId: 1,
    title: 'Kickoff',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 5),
  },
];

describe('gantt-model', () => {
  it('builds the visible tree with levels and summary/milestone flags', () => {
    const tasks = buildGanttTasks(DATA, fields, new Set());
    expect(tasks.map((task) => task.key)).toEqual([1, 2, 3, 4]);
    expect(tasks[0].isSummary).toBe(true);
    expect(tasks[0].level).toBe(0);
    expect(tasks[1].level).toBe(1);
    expect(tasks[3].isMilestone).toBe(true);
    expect(tasks[1].isMilestone).toBe(false);
  });

  it('rolls up summary dates and duration-weighted progress', () => {
    const tasks = buildGanttTasks(DATA, fields, new Set());
    const summary = tasks[0];
    expect(summary.start).toEqual(new Date(2026, 0, 5)); // own dates ignored
    expect(summary.end).toEqual(new Date(2026, 0, 21));
    // 4 days at 100% + 12 days at 25% ≈ 44%
    expect(summary.progress).toBe(44);
  });

  it('collapsing a summary hides its subtree', () => {
    const tasks = buildGanttTasks(DATA, fields, new Set([1]));
    expect(tasks.map((task) => task.key)).toEqual([1]);
    expect(tasks[0].expanded).toBe(false);
  });

  it('drops rows with unparseable dates and clamps progress', () => {
    const tasks = buildGanttTasks(
      [
        {
          id: 1,
          title: 'ok',
          start: '2026-01-05',
          end: '2026-01-06',
          progress: 140,
        },
        { id: 2, title: 'bad', start: 'garbage' },
      ],
      fields,
      new Set(),
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].progress).toBe(100);
    expect(tasks[0].start).toEqual(new Date(2026, 0, 5));
  });

  it('ganttTaskPatch keeps string storage shapes', () => {
    const original: Item = { id: 9, start: '2026-01-05', end: '2026-01-06' };
    const patch = ganttTaskPatch(
      original,
      { start: new Date(2026, 0, 7), end: new Date(2026, 0, 8), progress: 350 },
      fields,
    );
    expect(patch).toEqual({
      start: '2026-01-07',
      end: '2026-01-08',
      progress: 100,
    });
  });

  it('normalizes resource ids: scalar wraps, arrays pass through', () => {
    const items: (Item & { resourceId?: unknown })[] = [
      {
        id: 1,
        title: 'A',
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 2),
        resourceId: 'ada',
      },
      {
        id: 2,
        title: 'B',
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 2),
        resourceId: ['ada', 'grace'],
      },
      {
        id: 3,
        title: 'C',
        start: new Date(2026, 0, 1),
        end: new Date(2026, 0, 2),
      },
    ];
    const tasks = buildGanttTasks(items, fields, new Set());
    expect(tasks[0].resourceIds).toEqual(['ada']);
    expect(tasks[1].resourceIds).toEqual(['ada', 'grace']);
    expect(tasks[2].resourceIds).toEqual([]);
  });

  it('ganttTaskPatch preserves the resource storage shape', () => {
    const base = {
      id: 1,
      start: new Date(2026, 0, 1),
      end: new Date(2026, 0, 2),
    };
    // scalar store + one id stays scalar
    expect(
      ganttTaskPatch(
        { ...base, resourceId: 'ada' },
        { resourceIds: ['grace'] },
        fields,
      ),
    ).toEqual({ resourceId: 'grace' });
    // scalar store + several ids becomes an array (documented)
    expect(
      ganttTaskPatch(
        { ...base, resourceId: 'ada' },
        { resourceIds: ['ada', 'grace'] },
        fields,
      ),
    ).toEqual({ resourceId: ['ada', 'grace'] });
    // array store stays an array even for one id
    expect(
      ganttTaskPatch(
        { ...base, resourceId: ['ada'] },
        { resourceIds: ['grace'] },
        fields,
      ),
    ).toEqual({ resourceId: ['grace'] });
    // clearing a scalar store writes null
    expect(
      ganttTaskPatch(
        { ...base, resourceId: 'ada' },
        { resourceIds: [] },
        fields,
      ),
    ).toEqual({ resourceId: null });
  });

  it('normalizes dependencies and drops broken links', () => {
    const deps = buildGanttDependencies(
      [
        { id: 'a', from: 2, to: 3, type: 'FS' },
        { id: 'b', from: 2, to: 2 }, // self
        { id: 'c', from: 99, to: 3 }, // unknown task
        { id: 'd', from: 3, to: 4, type: 'XX' }, // bad type → FS
      ],
      {
        keyExpr: 'id',
        predecessorKeyExpr: 'from',
        successorKeyExpr: 'to',
        typeExpr: 'type',
      },
      new Set([1, 2, 3, 4]),
    );
    expect(deps.map((dep) => dep.key)).toEqual(['a', 'd']);
    expect(deps[1].type).toBe('FS');
  });

  it('wouldCreateCycle detects direct and transitive cycles', () => {
    const deps = buildGanttDependencies(
      [
        { id: 1, from: 1, to: 2 },
        { id: 2, from: 2, to: 3 },
      ],
      {
        keyExpr: 'id',
        predecessorKeyExpr: 'from',
        successorKeyExpr: 'to',
        typeExpr: 'type',
      },
      new Set([1, 2, 3]),
    );
    expect(wouldCreateCycle(deps, 3, 1)).toBe(true); // 1→2→3→1
    expect(wouldCreateCycle(deps, 1, 3)).toBe(false);
    expect(wouldCreateCycle(deps, 2, 2)).toBe(true);
  });
});
