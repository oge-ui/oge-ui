import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import {
  addLaneCommand,
  addNodeCommand,
  addPoolCommand,
  connectCommand,
  resizeNodeCommand,
  toggleSubProcessCollapseCommand,
  updateLabelCommand,
} from './commands';
import {
  bpmnContainerAt,
  bpmnContainerOf,
  bpmnMoveTargets,
  canReparent,
  moveToContainerCommand,
  reparentElementsCommand,
} from './modeling';
import { writeBpmnXml } from './bpmn-xml-writer';
import { readBpmnXml } from './bpmn-xml-reader';

/** A process with an expanded sub-process (300×200 at 400,0) and two tasks. */
function withSubProcess(): BpmnDiagram {
  let m = createEmptyDiagram();
  m = addNodeCommand('task', { x: 100, y: 100 }, 'A').apply(m);
  m = addNodeCommand('task', { x: 100, y: 300 }, 'B').apply(m);
  m = connectCommand('sequenceFlow', 'A', 'B', 'F').apply(m);
  m = addNodeCommand('subProcess', { x: 550, y: 100 }, 'Sub').apply(m);
  m = toggleSubProcessCollapseCommand('Sub', false).apply(m);
  m = resizeNodeCommand('Sub', { x: 400, y: 0, width: 300, height: 200 }).apply(
    m,
  );
  return m;
}

describe('re-parenting', () => {
  it('finds the innermost container under a point', () => {
    const m = withSubProcess();
    expect(bpmnContainerAt(m, { x: 500, y: 100 })).toEqual({
      kind: 'subProcess',
      id: 'Sub',
    });
    expect(bpmnContainerAt(m, { x: 50, y: 50 })).toEqual({ kind: 'process' });
    expect(bpmnContainerAt(m, { x: 500, y: 100 }, new Set(['Sub']))).toEqual({
      kind: 'process',
    });
  });

  it('moves a node into a sub-process and removes the flow that now crosses scopes', () => {
    const m = withSubProcess();
    const next = reparentElementsCommand(['A'], {
      kind: 'subProcess',
      id: 'Sub',
    }).apply(m);
    expect(next.nodes['A'].parentId).toBe('Sub');
    expect(next.edges['F']).toBeUndefined();
    expect(next.order).not.toContain('F');
    // the writer now nests A inside the sub-process
    const x = writeBpmnXml(next);
    expect(x.indexOf('<bpmn:task id="A"')).toBeGreaterThan(
      x.indexOf('<bpmn:subProcess id="Sub"'),
    );
    expect(readBpmnXml(x).model?.nodes['A'].parentId).toBe('Sub');
  });

  it('refuses cycles, collapsed targets and lone boundary events', () => {
    let m = withSubProcess();
    expect(canReparent(m, ['Sub'], { kind: 'subProcess', id: 'Sub' })).toBe(
      false,
    );
    m = addNodeCommand('boundaryEvent', { x: 100, y: 140 }, 'Bd', {
      attachedToRef: 'A',
    }).apply(m);
    expect(canReparent(m, ['Bd'], { kind: 'process' })).toBe(false);
    const collapsed = toggleSubProcessCollapseCommand('Sub', true).apply(m);
    expect(
      canReparent(collapsed, ['A'], { kind: 'subProcess', id: 'Sub' }),
    ).toBe(false);
  });

  it('carries attached boundary events along', () => {
    let m = withSubProcess();
    m = addNodeCommand('boundaryEvent', { x: 100, y: 140 }, 'Bd', {
      attachedToRef: 'A',
    }).apply(m);
    const next = reparentElementsCommand(['A'], {
      kind: 'subProcess',
      id: 'Sub',
    }).apply(m);
    expect(next.nodes['Bd'].parentId).toBe('Sub');
  });

  it('moves a node between pools and drops the sequence flow across them', () => {
    let m = createEmptyDiagram();
    m = addPoolCommand({ x: 300, y: 125 }, 'P1').apply(m);
    m = addPoolCommand({ x: 300, y: 425 }, 'P2').apply(m);
    m = addNodeCommand('task', { x: 200, y: 125 }, 'A', { poolId: 'P1' }).apply(
      m,
    );
    m = addNodeCommand('task', { x: 400, y: 125 }, 'B', { poolId: 'P1' }).apply(
      m,
    );
    m = connectCommand('sequenceFlow', 'A', 'B', 'F').apply(m);
    expect(bpmnContainerOf(m, 'B')).toEqual({ kind: 'pool', id: 'P1' });
    const next = moveToContainerCommand('B', 'P2').apply(m);
    expect(next.nodes['B'].poolId).toBe('P2');
    expect(next.edges['F']).toBeUndefined();
    // moved inside the target pool's band
    const pool = next.shapeDi['P2'].bounds;
    const b = next.shapeDi['B'].bounds;
    expect(b.y).toBeGreaterThanOrEqual(pool.y);
    expect(b.y + b.height).toBeLessThanOrEqual(pool.y + pool.height);
  });

  it('lists move targets, lanes and the current container', () => {
    let m = createEmptyDiagram();
    m = addPoolCommand({ x: 300, y: 125 }, 'P').apply(m);
    m = updateLabelCommand('P', 'Sales').apply(m);
    m = addLaneCommand('P', 'L1').apply(m);
    m = addLaneCommand('P', 'L2').apply(m);
    m = addNodeCommand('task', { x: 200, y: 60 }, 'A', { poolId: 'P' }).apply(
      m,
    );
    const targets = bpmnMoveTargets(m, 'A');
    expect(targets.map((t) => [t.kind, t.id])).toEqual([
      ['pool', 'P'],
      ['lane', 'L1'],
      ['lane', 'L2'],
    ]);
    const current = targets.filter((t) => t.current).map((t) => t.id);
    expect(current).toHaveLength(1);
    const lane2 = m.shapeDi['L2'].bounds;
    const moved = moveToContainerCommand('A', 'L2').apply(m);
    const b = moved.shapeDi['A'].bounds;
    expect(b.y).toBeGreaterThanOrEqual(lane2.y);
    expect(moved.pools['P'].lanes[1].flowNodeRefs).toContain('A');
  });

  it('is a no-op for an unknown target', () => {
    const m = withSubProcess();
    expect(moveToContainerCommand('A', 'Nope').apply(m)).toBe(m);
  });
});
