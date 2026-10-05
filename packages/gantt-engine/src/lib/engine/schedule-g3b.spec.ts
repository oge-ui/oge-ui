import type {
  GanttConstraintType,
  GanttDependency,
  GanttTask,
} from './gantt-model';
import {
  applyGanttLag,
  autoScheduleForward,
  computeGanttSlack,
  criticalPathKeys,
  detectGanttConflicts,
  scheduleGanttProject,
} from './schedule';

const d = (day: number, hour = 0) => new Date(2026, 0, day, hour);

function task(
  key: string,
  start: Date,
  end: Date,
  extra: Partial<GanttTask> = {},
): GanttTask {
  return {
    key,
    source: { key },
    parentKey: null,
    level: 0,
    title: key.toUpperCase(),
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
    wbs: '',
    manuallyScheduled: false,
    constraintType: 'ASAP',
    constraintDate: undefined,
    deadline: undefined,
    segments: [],
    baselines: [],
    units: [],
    effort: undefined,
    ...extra,
  };
}

function link(
  from: string,
  to: string,
  type: GanttDependency['type'] = 'FS',
  lag = 0,
  lagUnit: GanttDependency['lagUnit'] = 'days',
): GanttDependency {
  return {
    key: `${from}-${to}`,
    source: {},
    predecessorKey: from,
    successorKey: to,
    type,
    lag,
    lagUnit,
  };
}

const constrained = (
  type: GanttConstraintType,
  date: Date,
): Partial<GanttTask> => ({ constraintType: type, constraintDate: date });

const moved = (
  result: ReturnType<typeof scheduleGanttProject>,
  key: string,
) => result.changes.find((change) => change.key === key);

describe('applyGanttLag', () => {
  it('adds calendar days, hours and fractions without a calendar', () => {
    expect(applyGanttLag(d(5), 2, 'days')).toEqual(d(7));
    expect(applyGanttLag(d(5), -1, 'days')).toEqual(d(4));
    expect(applyGanttLag(d(5), 6, 'hours')).toEqual(d(5, 6));
    expect(applyGanttLag(d(5), 0.5, 'days')).toEqual(d(5, 12));
  });

  it('counts working days on a calendar (weekend skipped, base rolled first)', () => {
    // Fri 9th + 1 working day = Mon 12th; Sat 10th rolls to Mon, +1 = Tue
    expect(applyGanttLag(d(9), 1, 'days', {})).toEqual(d(12));
    expect(applyGanttLag(d(10), 1, 'days', {})).toEqual(d(13));
    // a lead walks back over the weekend: Mon 12th - 1 = Fri 9th
    expect(applyGanttLag(d(12), -1, 'days', {})).toEqual(d(9));
  });
});

describe('scheduleGanttProject', () => {
  it('honours lag and lead for every link type', () => {
    const tasks = [
      task('a', d(5), d(8)),
      task('b', d(1), d(3)),
      task('c', d(1), d(2)),
      task('e', d(1), d(3)),
      task('f', d(1), d(2)),
    ];
    const result = scheduleGanttProject(tasks, [
      link('a', 'b', 'FS', 2), // b.start >= a.end + 2
      link('a', 'c', 'SS', -1), // c.start >= a.start - 1
      link('a', 'e', 'FF', 1), // e.end >= a.end + 1
      link('a', 'f', 'SF', 3), // f.end >= a.start + 3
    ]);
    expect(moved(result, 'b')?.start).toEqual(d(10));
    expect(moved(result, 'c')?.start).toEqual(d(4));
    expect(moved(result, 'e')?.end).toEqual(d(9));
    expect(moved(result, 'f')?.end).toEqual(d(8));
    expect(result.conflicts).toEqual([]);
  });

  it('pulls a successor earlier when its predecessor finishes sooner', () => {
    const tasks = [task('a', d(5), d(7)), task('b', d(12), d(14))];
    const result = scheduleGanttProject(tasks, [link('a', 'b')]);
    expect(moved(result, 'b')).toEqual({ key: 'b', start: d(7), end: d(9) });
    // the 1.x pass never pulls
    expect(autoScheduleForward(tasks, [link('a', 'b')])).toEqual([]);
  });

  it('keeps unlinked ASAP tasks unless a project start is given', () => {
    const tasks = [task('a', d(8), d(9))];
    expect(scheduleGanttProject(tasks, []).changes).toEqual([]);
    const result = scheduleGanttProject(tasks, [], { projectStart: d(5) });
    expect(moved(result, 'a')).toEqual({ key: 'a', start: d(5), end: d(6) });
  });

  it('never moves a manually scheduled task and reports its broken link', () => {
    const tasks = [
      task('a', d(5), d(10)),
      task('b', d(6), d(8), { manuallyScheduled: true }),
    ];
    const result = scheduleGanttProject(tasks, [link('a', 'b')]);
    expect(result.changes).toEqual([]);
    expect(result.conflicts).toEqual([
      { key: 'b', kind: 'dependency', dependencyKey: 'a-b', date: d(10) },
    ]);
  });

  it('applies SNET / FNET floors and MSO / MFO pins', () => {
    const tasks = [
      task('snet', d(5), d(7), constrained('SNET', d(9))),
      task('fnet', d(5), d(7), constrained('FNET', d(20))),
      task('mso', d(5), d(7), constrained('MSO', d(12))),
      task('mfo', d(5), d(7), constrained('MFO', d(15))),
    ];
    const result = scheduleGanttProject(tasks, []);
    expect(moved(result, 'snet')?.start).toEqual(d(9));
    expect(moved(result, 'fnet')?.end).toEqual(d(20));
    expect(moved(result, 'mso')?.start).toEqual(d(12));
    expect(moved(result, 'mfo')?.end).toEqual(d(15));
    expect(result.conflicts).toEqual([]);
  });

  it('lets links win over SNLT / FNLT / MSO and reports the constraint', () => {
    const tasks = [
      task('a', d(5), d(12)),
      task('snlt', d(5), d(6), constrained('SNLT', d(10))),
      task('mso', d(5), d(6), constrained('MSO', d(8))),
    ];
    const result = scheduleGanttProject(tasks, [
      link('a', 'snlt'),
      link('a', 'mso'),
    ]);
    expect(moved(result, 'snlt')?.start).toEqual(d(12));
    expect(result.conflicts.map((c) => [c.key, c.kind])).toEqual([
      ['snlt', 'constraint'],
      ['mso', 'dependency'],
    ]);
  });

  it('slides ALAP tasks as late as their successors allow (backward pass)', () => {
    const tasks = [
      task('alap', d(5), d(7), { constraintType: 'ALAP' }),
      task('long', d(5), d(15)),
      task('end', d(15), d(16)),
    ];
    const result = scheduleGanttProject(tasks, [
      link('alap', 'end'),
      link('long', 'end'),
    ]);
    // must finish by end.start (15th) → starts on the 13th
    expect(moved(result, 'alap')).toEqual({
      key: 'alap',
      start: d(13),
      end: d(15),
    });
    // an unlinked ALAP task finishes with the project
    const lone = scheduleGanttProject(
      [task('x', d(5), d(6), { constraintType: 'ALAP' }), task('y', d(5), d(9))],
      [],
    );
    expect(moved(lone, 'x')?.end).toEqual(d(9));
  });

  it('reports a missed deadline', () => {
    const tasks = [task('a', d(5), d(10), { deadline: d(8) })];
    expect(scheduleGanttProject(tasks, []).conflicts).toEqual([
      { key: 'a', kind: 'deadline', date: d(8) },
    ]);
  });

  it('keeps working-day durations and lags on a calendar', () => {
    // a ends Fri 9th; FS+1 working day → Tue 13th (Mon is the lag day)
    const tasks = [task('a', d(5), d(9)), task('b', d(1), d(2))];
    const result = scheduleGanttProject(tasks, [link('a', 'b', 'FS', 1)], {
      calendar: {},
    });
    expect(moved(result, 'b')).toEqual({ key: 'b', start: d(12), end: d(13) });
  });
});

describe('detectGanttConflicts', () => {
  it('flags violations of the current dates only', () => {
    const tasks = [
      task('a', d(5), d(8)),
      task('b', d(7), d(9)), // starts before a ends
      task('c', d(5), d(6), constrained('SNET', d(6))), // starts too early
      task('ok', d(9), d(10), constrained('FNLT', d(12))),
    ];
    const conflicts = detectGanttConflicts(tasks, [link('a', 'b')]);
    expect(conflicts.map((c) => `${String(c.key)}:${c.kind}`).sort()).toEqual([
      'b:dependency',
      'c:constraint',
    ]);
  });
});

describe('computeGanttSlack', () => {
  it('returns total and free slack in days (lag-aware)', () => {
    // a(5-10) → c(12-20) with FS+2: critical; b(5-7) → c: 3 days free
    const tasks = [
      task('a', d(5), d(10)),
      task('b', d(5), d(7)),
      task('c', d(12), d(20)),
    ];
    const deps = [link('a', 'c', 'FS', 2), link('b', 'c')];
    const slack = computeGanttSlack(tasks, deps);
    expect(slack.get('a')).toEqual({ totalSlack: 0, freeSlack: 0 });
    expect(slack.get('b')).toEqual({ totalSlack: 5, freeSlack: 5 });
    expect(slack.get('c')).toEqual({ totalSlack: 0, freeSlack: 0 });
    expect([...criticalPathKeys(tasks, deps)].sort()).toEqual(['a', 'c']);
  });

  it('free slack stops at the successor while total slack reaches the finish', () => {
    const tasks = [
      task('a', d(5), d(6)),
      task('b', d(8), d(9)),
      task('z', d(5), d(20)),
    ];
    const slack = computeGanttSlack(tasks, [link('a', 'b')]);
    expect(slack.get('a')).toEqual({ totalSlack: 13, freeSlack: 2 });
    expect(slack.get('b')).toEqual({ totalSlack: 11, freeSlack: 11 });
  });

  it('counts working days on a calendar', () => {
    // b ends Fri 9th, the project Tue 13th: two working days of slack
    const tasks = [task('a', d(5), d(13)), task('b', d(5), d(9))];
    const slack = computeGanttSlack(tasks, [], {});
    expect(slack.get('b')?.totalSlack).toBe(2);
  });
});
