import type { GanttTask } from './gantt-model';
import { buildResourceWorkload } from './workload';

function task(
  key: number,
  start: Date,
  end: Date,
  resourceIds: unknown[],
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
    resourceIds,
  };
}

const d = (day: number) => new Date(2026, 0, day);

describe('buildResourceWorkload', () => {
  it('merges overlapping assignments into counted segments', () => {
    const workload = buildResourceWorkload(
      [task(1, d(5), d(10), ['ada']), task(2, d(8), d(12), ['ada'])],
      ['ada'],
    );
    expect(workload.get('ada')).toEqual([
      { start: d(5), end: d(8), count: 1 },
      { start: d(8), end: d(10), count: 2 }, // overallocated
      { start: d(10), end: d(12), count: 1 },
    ]);
  });

  it('keeps disjoint assignments as separate single-count segments', () => {
    const workload = buildResourceWorkload(
      [task(1, d(5), d(7), ['ada']), task(2, d(9), d(11), ['ada'])],
      ['ada'],
    );
    expect(workload.get('ada')).toEqual([
      { start: d(5), end: d(7), count: 1 },
      { start: d(9), end: d(11), count: 1 },
    ]);
  });

  it('skips summaries and milestones, honors multi-assignment arrays', () => {
    const workload = buildResourceWorkload(
      [
        task(1, d(5), d(20), ['ada'], true), // summary — ignored
        task(2, d(5), d(5), ['ada']), // milestone — ignored
        task(3, d(6), d(8), ['ada', 'grace']),
      ],
      ['ada', 'grace'],
    );
    expect(workload.get('ada')).toEqual([{ start: d(6), end: d(8), count: 1 }]);
    expect(workload.get('grace')).toEqual([
      { start: d(6), end: d(8), count: 1 },
    ]);
  });

  it('returns an empty list for unassigned resources', () => {
    const workload = buildResourceWorkload(
      [task(1, d(5), d(7), ['ada'])],
      ['grace'],
    );
    expect(workload.get('grace')).toEqual([]);
  });
});
