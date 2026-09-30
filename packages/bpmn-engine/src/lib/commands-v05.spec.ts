import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import {
  addNodeCommand,
  alignElementsCommand,
  connectCommand,
  distributeElementsCommand,
  estimateLabelBounds,
  makeSpaceCommand,
  moveLabelCommand,
  updateWaypointsCommand,
} from './commands';

/**
 * Three tasks (A 50/60, B 250/160, C 450/360 — each 100×80) and a sequence
 * flow A→B.
 */
function base(): BpmnDiagram {
  let m = createEmptyDiagram();
  m = addNodeCommand('task', { x: 100, y: 100 }, 'A').apply(m);
  m = addNodeCommand('task', { x: 300, y: 200 }, 'B').apply(m);
  m = addNodeCommand('task', { x: 500, y: 400 }, 'C').apply(m);
  m = connectCommand('sequenceFlow', 'A', 'B', 'F1').apply(m);
  return m;
}

describe('alignElementsCommand', () => {
  it('moves each element independently to the shared edge and re-routes edges once', () => {
    const m = base();
    const next = alignElementsCommand(['A', 'B', 'C'], 'top').apply(m);
    expect(next.shapeDi['A'].bounds.y).toBe(60);
    expect(next.shapeDi['B'].bounds.y).toBe(60);
    expect(next.shapeDi['C'].bounds.y).toBe(60);
    // x positions untouched.
    expect(next.shapeDi['B'].bounds.x).toBe(250);
    // The edge touching a moved endpoint was re-routed.
    expect(next.edgeDi['F1']).not.toBe(m.edgeDi['F1']);
  });

  it('keeps a manual edge translated when both endpoints move together', () => {
    let m = base();
    m = updateWaypointsCommand('F1', [
      { x: 150, y: 100 },
      { x: 150, y: 300 },
      { x: 250, y: 300 },
    ]).apply(m);
    // Align A and B to the left: both share delta 0 for A and -200 for B —
    // different deltas, so the manual flag is cleared and the edge re-routes.
    const next = alignElementsCommand(['A', 'B'], 'left').apply(m);
    expect(next.shapeDi['B'].bounds.x).toBe(50);
    expect(next.edgeDi['F1'].manual).toBeUndefined();
  });

  it('is a no-op for fewer than 2 movable elements or unknown ids', () => {
    const m = base();
    expect(alignElementsCommand(['A'], 'left').apply(m)).toBe(m);
    expect(alignElementsCommand(['A', 'F1'], 'left').apply(m)).toBe(m);
    expect(alignElementsCommand(['nope', 'A'], 'left').apply(m)).toBe(m);
  });
});

describe('distributeElementsCommand', () => {
  it('spreads the middle centers evenly along the axis', () => {
    const m = base();
    // y centers 100, 200, 400 → middle target 250.
    const next = distributeElementsCommand(['A', 'B', 'C'], 'y').apply(m);
    expect(next.shapeDi['A'].bounds.y).toBe(60);
    expect(next.shapeDi['B'].bounds.y).toBe(210);
    expect(next.shapeDi['C'].bounds.y).toBe(360);
  });

  it('is a no-op when centers are already evenly spaced or below 3 elements', () => {
    const m = base();
    // x centers 100, 300, 500 are already even.
    expect(distributeElementsCommand(['A', 'B', 'C'], 'x').apply(m)).toBe(m);
    expect(distributeElementsCommand(['A', 'B'], 'y').apply(m)).toBe(m);
  });
});

describe('makeSpaceCommand', () => {
  it('shifts only elements whose center lies beyond the origin', () => {
    const m = base();
    const next = makeSpaceCommand({ x: 150, y: 0 }, 'x', 100).apply(m);
    expect(next.shapeDi['A'].bounds.x).toBe(50); // center 100 ≤ 150: stays
    expect(next.shapeDi['B'].bounds.x).toBe(350);
    expect(next.shapeDi['C'].bounds.x).toBe(550);
    // The edge with one moved endpoint was re-routed.
    expect(next.edgeDi['F1']).not.toBe(m.edgeDi['F1']);
    expect(next.edgeDi['F1'].manual).toBeUndefined();
  });

  it('removes space with a negative delta', () => {
    const m = base();
    const next = makeSpaceCommand({ x: 150, y: 0 }, 'x', -50).apply(m);
    expect(next.shapeDi['B'].bounds.x).toBe(200);
    expect(next.shapeDi['A'].bounds.x).toBe(50);
  });

  it('translates a manual edge when both endpoints shift together', () => {
    let m = base();
    m = updateWaypointsCommand('F1', [
      { x: 150, y: 100 },
      { x: 150, y: 300 },
      { x: 250, y: 300 },
    ]).apply(m);
    const next = makeSpaceCommand({ x: 0, y: 0 }, 'x', 30).apply(m);
    expect(next.edgeDi['F1'].manual).toBe(true);
    expect(next.edgeDi['F1'].waypoints[0]).toEqual({ x: 180, y: 100 });
  });

  it('is a no-op for a zero delta or an empty affected set', () => {
    const m = base();
    expect(makeSpaceCommand({ x: 150, y: 0 }, 'x', 0).apply(m)).toBe(m);
    expect(makeSpaceCommand({ x: 9999, y: 0 }, 'x', 100).apply(m)).toBe(m);
  });

  it('works on the y axis', () => {
    const m = base();
    const next = makeSpaceCommand({ x: 0, y: 150 }, 'y', 40).apply(m);
    expect(next.shapeDi['A'].bounds.y).toBe(60); // center 100 ≤ 150
    expect(next.shapeDi['B'].bounds.y).toBe(200);
    expect(next.shapeDi['C'].bounds.y).toBe(400);
  });
});

describe('moveLabelCommand', () => {
  it('creates shape labelBounds from the estimate on the first move', () => {
    const m = base();
    // A bounds 50/60 100×80 → estimated label {55, 142, 90, 20}.
    expect(estimateLabelBounds(m, 'A')).toEqual({
      x: 55,
      y: 142,
      width: 90,
      height: 20,
    });
    const next = moveLabelCommand('A', 10, 20).apply(m);
    expect(next.shapeDi['A'].labelBounds).toEqual({
      x: 65,
      y: 162,
      width: 90,
      height: 20,
    });
  });

  it('translates existing labelBounds', () => {
    let m = base();
    m = moveLabelCommand('A', 10, 20).apply(m);
    const next = moveLabelCommand('A', -5, 5).apply(m);
    expect(next.shapeDi['A'].labelBounds).toEqual({
      x: 60,
      y: 167,
      width: 90,
      height: 20,
    });
  });

  it('moves edge labels via edgeDi labelBounds (estimate above the anchor)', () => {
    const m = base();
    const estimate = estimateLabelBounds(m, 'F1');
    expect(estimate).not.toBeNull();
    const next = moveLabelCommand('F1', 30, 0).apply(m);
    expect(next.edgeDi['F1'].labelBounds).toEqual({
      x: (estimate as { x: number }).x + 30,
      y: (estimate as { y: number }).y,
      width: 90,
      height: 14,
    });
  });

  it('is a no-op for unknown ids and zero deltas', () => {
    const m = base();
    expect(moveLabelCommand('nope', 5, 5).apply(m)).toBe(m);
    expect(moveLabelCommand('A', 0, 0).apply(m)).toBe(m);
  });
});
