import {
  dependencyAnchors,
  dependencyPath,
  routeDependency,
} from './dependency-routing';
import { proposeTaskMove, proposeTaskProgress, proposeTaskResize } from './gantt-gesture-math';
import { buildGanttScale } from './time-scale';
import type { GanttTask } from './gantt-model';

describe('dependency-routing', () => {
  it('anchors per type follow finish/start semantics', () => {
    expect(dependencyAnchors('FS')).toEqual({ fromEnd: true, toEnd: false });
    expect(dependencyAnchors('SS')).toEqual({ fromEnd: false, toEnd: false });
    expect(dependencyAnchors('FF')).toEqual({ fromEnd: true, toEnd: true });
    expect(dependencyAnchors('SF')).toEqual({ fromEnd: false, toEnd: true });
  });

  it('routes a simple forward FS link as a Z shape', () => {
    const points = routeDependency({ x: 100, y: 10 }, { x: 200, y: 40 }, 'FS');
    expect(points[0]).toEqual({ x: 100, y: 10 });
    expect(points.at(-1)).toEqual({ x: 200, y: 40 });
    // orthogonal: consecutive points share an axis
    for (let i = 1; i < points.length; i++) {
      const same =
        points[i].x === points[i - 1].x || points[i].y === points[i - 1].y;
      expect(same).toBe(true);
    }
  });

  it('routes a backward link with an S detour', () => {
    const points = routeDependency({ x: 200, y: 10 }, { x: 100, y: 40 }, 'FS');
    expect(points.length).toBeGreaterThanOrEqual(5);
    expect(points.at(-1)).toEqual({ x: 100, y: 40 });
  });

  it('dependencyPath emits an SVG polyline path', () => {
    const path = dependencyPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(path).toBe('M 0 0 L 10 0');
  });
});

describe('gantt-gesture-math', () => {
  const scale = buildGanttScale(new Date(2026, 0, 5), new Date(2026, 0, 20), 'days', 1);
  const base: GanttTask = {
    key: 1,
    source: {},
    parentKey: null,
    level: 0,
    title: 'T',
    start: new Date(2026, 0, 6),
    end: new Date(2026, 0, 9),
    progress: 50,
    color: undefined,
    baselineStart: undefined,
    baselineEnd: undefined,
    isMilestone: false,
    isSummary: false,
    expanded: true,
    hasChildren: false,
  };

  it('proposeTaskMove shifts snapped whole units preserving duration', () => {
    const proposal = proposeTaskMove(base, 80, scale, 1); // 2 day-ticks
    expect(proposal.start).toEqual(new Date(2026, 0, 8));
    expect(proposal.end).toEqual(new Date(2026, 0, 11));
  });

  it('proposeTaskResize never inverts the range', () => {
    const grow = proposeTaskResize(base, 'end', 40, scale, 1);
    expect(grow.end).toEqual(new Date(2026, 0, 10));
    const collapse = proposeTaskResize(base, 'end', -400, scale, 1);
    expect(collapse.end).toEqual(base.start);
    const front = proposeTaskResize(base, 'start', -40, scale, 1);
    expect(front.start).toEqual(new Date(2026, 0, 5));
  });

  it('proposeTaskProgress clamps and rounds to 5', () => {
    expect(proposeTaskProgress(100, 200, 153)).toBe(55);
    expect(proposeTaskProgress(100, 200, 20)).toBe(0);
    expect(proposeTaskProgress(100, 200, 260)).toBe(100);
  });
});
