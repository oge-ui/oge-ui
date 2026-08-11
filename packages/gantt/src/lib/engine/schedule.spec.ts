import type { GanttDependency, GanttTask } from './gantt-model';
import { autoScheduleForward, criticalPathKeys } from './schedule';

function task(
  key: number,
  start: Date,
  end: Date,
  isSummary = false,
): GanttTask {
  return {
    key,
    source: { key },
    parentKey: null,
    level: 0,
    title: `T${key}`,
    start,
    end,
    progress: 0,
    color: undefined,
    baselineStart: undefined,
    baselineEnd: undefined,
    isMilestone: start.getTime() === end.getTime(),
    isSummary,
    expanded: true,
    hasChildren: isSummary,
    resourceIds: [],
  };
}

function dep(
  from: number,
  to: number,
  type: GanttDependency['type'] = 'FS',
): GanttDependency {
  return {
    key: `${from}-${to}`,
    source: {},
    predecessorKey: from,
    successorKey: to,
    type,
  };
}

const d = (day: number, hour = 0) => new Date(2026, 0, day, hour);

describe('schedule', () => {
  it('forward pass shifts FS successors after their predecessor', () => {
    const tasks = [task(1, d(5), d(8)), task(2, d(6), d(9))];
    const changes = autoScheduleForward(tasks, [dep(1, 2)]);
    expect(changes).toHaveLength(1);
    expect(changes[0].key).toBe(2);
    expect(changes[0].start).toEqual(d(8));
    expect(changes[0].end).toEqual(d(11)); // duration preserved
  });

  it('propagates through chains and honors SS links', () => {
    const tasks = [
      task(1, d(5), d(8)),
      task(2, d(4), d(6)),
      task(3, d(4), d(5)),
    ];
    const changes = autoScheduleForward(tasks, [dep(1, 2, 'SS'), dep(2, 3)]);
    const two = changes.find((c) => c.key === 2);
    const three = changes.find((c) => c.key === 3);
    expect(two?.start).toEqual(d(5)); // SS: start aligns to predecessor start
    expect(three?.start).toEqual(two?.end);
  });

  it('returns [] when nothing violates its constraints', () => {
    const tasks = [task(1, d(5), d(8)), task(2, d(8), d(9))];
    expect(autoScheduleForward(tasks, [dep(1, 2)])).toEqual([]);
  });

  it('with a work calendar the pushed start rolls onto a working day and the duration is preserved in working days', () => {
    // 2026-01: 9th/10th are Sat/Sun. Predecessor ends Fri the 9th 00:00;
    // successor (2 working days) starts Mon the 5th -> pushed to Fri, but
    // Fri counts as day 1 and the weekend is skipped: end Tue the 13th.
    const tasks = [task(1, d(5), d(9)), task(2, d(5), d(7))];
    const changes = autoScheduleForward(tasks, [dep(1, 2)], {});
    const two = changes.find((c) => c.key === 2);
    expect(two?.start).toEqual(d(9)); // Friday is a working day
    expect(two?.end).toEqual(d(13)); // Fri + Mon = 2 working days
  });

  it('with a work calendar a weekend constraint start rolls to Monday', () => {
    // predecessor ends Sat the 10th; successor rolls to Mon the 12th
    const tasks = [task(1, d(5), d(10)), task(2, d(5), d(6))];
    const changes = autoScheduleForward(tasks, [dep(1, 2)], {});
    const two = changes.find((c) => c.key === 2);
    expect(two?.start).toEqual(d(12));
    expect(two?.end).toEqual(d(13));
  });

  it('critical path marks the zero-slack chain only', () => {
    // chain A(1→3) drives the finish; B is short with slack
    const tasks = [
      task(1, d(5), d(10)),
      task(2, d(10), d(20)), // critical successor
      task(3, d(5), d(7)), // slack: could slip 13 days
    ];
    const critical = criticalPathKeys(tasks, [dep(1, 2), dep(3, 2)]);
    expect(critical.has(1)).toBe(true);
    expect(critical.has(2)).toBe(true);
    expect(critical.has(3)).toBe(false);
  });

  it('with no dependencies only the latest-finishing tasks are critical', () => {
    const tasks = [task(1, d(5), d(20)), task(2, d(5), d(10))];
    const critical = criticalPathKeys(tasks, []);
    expect(critical.has(1)).toBe(true);
    expect(critical.has(2)).toBe(false);
  });
});
