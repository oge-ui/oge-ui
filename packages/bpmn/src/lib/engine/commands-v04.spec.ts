import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import {
  addLaneCommand,
  addNodeCommand,
  addPoolCommand,
  connectCommand,
  deleteElementsCommand,
  extractClipboard,
  morphNodeCommand,
  moveElementsCommand,
  pasteCommand,
  removeLaneCommand,
  renameLaneCommand,
  resizeNodeCommand,
  setCalledElementCommand,
  updateLabelCommand,
} from './commands';

/** One pool at (100,75)-(700,325) with a generated process, no lanes. */
function withPool(): { model: BpmnDiagram; poolId: string } {
  const model = addPoolCommand({ x: 400, y: 200 }, 'Pool_1').apply(
    createEmptyDiagram(),
  );
  return { model, poolId: 'Pool_1' };
}

describe('commands v0.4 — pools, lanes, call activities', () => {
  it('addPoolCommand creates a horizontal pool with its own process', () => {
    const { model } = withPool();
    const pool = model.pools['Pool_1'];
    expect(pool.processRef).toBeDefined();
    expect(pool.processRef).not.toBe(model.processId);
    expect(pool.lanes).toEqual([]);
    expect(model.collaborationId).toBeDefined();
    expect(model.shapeDi['Pool_1']).toEqual({
      bounds: { x: 100, y: 75, width: 600, height: 250 },
      horizontal: true,
    });
    // A second pool reuses the collaboration id.
    const two = addPoolCommand({ x: 400, y: 600 }, 'Pool_2').apply(model);
    expect(two.collaborationId).toBe(model.collaborationId);
  });

  it('addLaneCommand covers the body first, then splits by growing the pool', () => {
    const { model, poolId } = withPool();
    const one = addLaneCommand(poolId, 'Lane_1').apply(model);
    expect(one.pools[poolId].lanes.map((l) => l.id)).toEqual(['Lane_1']);
    expect(one.shapeDi['Lane_1'].bounds).toEqual({
      x: 130,
      y: 75,
      width: 570,
      height: 250,
    });
    expect(one.shapeDi[poolId].bounds.height).toBe(250);

    const two = addLaneCommand(poolId, 'Lane_2').apply(one);
    expect(two.shapeDi['Lane_2'].bounds).toEqual({
      x: 130,
      y: 325,
      width: 570,
      height: 120,
    });
    expect(two.shapeDi[poolId].bounds.height).toBe(370);
  });

  it('maintains lane membership on add and move (geometry-driven)', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = addLaneCommand(poolId, 'Lane_2').apply(m);
    m = addNodeCommand('task', { x: 300, y: 150 }, 'T1', { poolId }).apply(m);
    expect(m.pools[poolId].lanes[0].flowNodeRefs).toEqual(['T1']);
    expect(m.pools[poolId].lanes[1].flowNodeRefs).toEqual([]);

    m = moveElementsCommand(['T1'], 0, 230).apply(m);
    expect(m.pools[poolId].lanes[0].flowNodeRefs).toEqual([]);
    expect(m.pools[poolId].lanes[1].flowNodeRefs).toEqual(['T1']);
  });

  it('data elements and annotations never join lanes', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = addNodeCommand('dataObject', { x: 300, y: 150 }, 'D1', {
      poolId,
    }).apply(m);
    m = addNodeCommand('group', { x: 300, y: 150 }, 'G1', { poolId }).apply(m);
    expect(m.pools[poolId].lanes[0].flowNodeRefs).toEqual([]);
  });

  it('removeLaneCommand shifts lower lanes and their members up', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = addLaneCommand(poolId, 'Lane_2').apply(m);
    m = addNodeCommand('task', { x: 300, y: 380 }, 'T2', { poolId }).apply(m);
    expect(m.pools[poolId].lanes[1].flowNodeRefs).toEqual(['T2']);

    m = removeLaneCommand(poolId, 'Lane_1').apply(m);
    expect(m.pools[poolId].lanes.map((l) => l.id)).toEqual(['Lane_2']);
    expect(m.shapeDi['Lane_1']).toBeUndefined();
    // Lane_2 moved up by the removed height (250) and the pool shrank.
    expect(m.shapeDi['Lane_2'].bounds.y).toBe(75);
    expect(m.shapeDi[poolId].bounds.height).toBe(120);
    // The member moved with its lane and is still assigned to it.
    expect(m.shapeDi['T2'].bounds.y).toBe(380 - 40 - 250);
    expect(m.pools[poolId].lanes[0].flowNodeRefs).toEqual(['T2']);
  });

  it('removing the last lane keeps the pool size', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = removeLaneCommand(poolId, 'Lane_1').apply(m);
    expect(m.pools[poolId].lanes).toEqual([]);
    expect(m.shapeDi[poolId].bounds.height).toBe(250);
  });

  it('renameLaneCommand renames and updateLabelCommand names the pool', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = renameLaneCommand(poolId, 'Lane_1', 'Front').apply(m);
    expect(m.pools[poolId].lanes[0].name).toBe('Front');
    m = updateLabelCommand(poolId, 'Customer').apply(m);
    expect(m.pools[poolId].name).toBe('Customer');
  });

  it('moving a pool carries its member nodes and lane bands', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = addNodeCommand('task', { x: 300, y: 150 }, 'T1', { poolId }).apply(m);
    m = moveElementsCommand([poolId], 50, 30).apply(m);
    expect(m.shapeDi[poolId].bounds).toMatchObject({ x: 150, y: 105 });
    expect(m.shapeDi['Lane_1'].bounds).toMatchObject({ x: 180, y: 105 });
    expect(m.shapeDi['T1'].bounds).toMatchObject({ x: 300, y: 140 });
  });

  it('resizing a pool stretches its lanes proportionally', () => {
    const { model, poolId } = withPool();
    let m = addLaneCommand(poolId, 'Lane_1').apply(model);
    m = addLaneCommand(poolId, 'Lane_2').apply(m);
    // Pool is now 600×370 at (100,75); double the height, widen to 800.
    m = resizeNodeCommand(poolId, {
      x: 100,
      y: 75,
      width: 800,
      height: 740,
    }).apply(m);
    expect(m.shapeDi['Lane_1'].bounds).toEqual({
      x: 130,
      y: 75,
      width: 770,
      height: 500,
    });
    expect(m.shapeDi['Lane_2'].bounds).toEqual({
      x: 130,
      y: 575,
      width: 770,
      height: 240,
    });
  });

  it('deleting a pool cascades to members, lanes and message flows', () => {
    let m = addPoolCommand({ x: 400, y: 200 }, 'Pool_1').apply(
      createEmptyDiagram(),
    );
    m = addPoolCommand({ x: 400, y: 600 }, 'Pool_2').apply(m);
    m = addLaneCommand('Pool_1', 'Lane_1').apply(m);
    m = addNodeCommand('task', { x: 300, y: 150 }, 'T1', {
      poolId: 'Pool_1',
    }).apply(m);
    m = addNodeCommand('task', { x: 300, y: 600 }, 'T2', {
      poolId: 'Pool_2',
    }).apply(m);
    m = connectCommand('messageFlow', 'T1', 'T2', 'Msg_1').apply(m);
    m = connectCommand('messageFlow', 'T2', 'Pool_1', 'Msg_2').apply(m);

    const afterDelete = deleteElementsCommand(['Pool_1']).apply(m);
    expect(afterDelete.pools['Pool_1']).toBeUndefined();
    expect(afterDelete.nodes['T1']).toBeUndefined();
    expect(afterDelete.shapeDi['Lane_1']).toBeUndefined();
    expect(afterDelete.edges['Msg_1']).toBeUndefined();
    expect(afterDelete.edges['Msg_2']).toBeUndefined();
    expect(afterDelete.nodes['T2']).toBeDefined();
    expect(afterDelete.collaborationId).toBeDefined();

    // Deleting the last pool drops the collaboration envelope too.
    const empty = deleteElementsCommand(['Pool_2']).apply(afterDelete);
    expect(Object.keys(empty.pools)).toHaveLength(0);
    expect(empty.collaborationId).toBeUndefined();
  });

  it('copying a pool copies its members; paste keeps the surviving pool', () => {
    const { model, poolId } = withPool();
    let m = addNodeCommand('task', { x: 300, y: 150 }, 'T1', { poolId }).apply(
      model,
    );
    m = addNodeCommand('task', { x: 500, y: 150 }, 'T2', { poolId }).apply(m);
    m = connectCommand('sequenceFlow', 'T1', 'T2', 'F1').apply(m);

    const clip = extractClipboard(m, [poolId]);
    expect(clip).not.toBeNull();
    expect(clip?.nodes.map((n) => n.id).sort()).toEqual(['T1', 'T2']);
    expect(clip?.edges.map((e) => e.id)).toEqual(['F1']);

    const pasted = pasteCommand(clip as NonNullable<typeof clip>, {
      x: 20,
      y: 20,
    }).apply(m);
    const newTasks = Object.values(pasted.nodes).filter(
      (n) => n.type === 'task' && n.id !== 'T1' && n.id !== 'T2',
    );
    expect(newTasks).toHaveLength(2);
    for (const task of newTasks) {
      expect(task.poolId).toBe(poolId);
    }
  });

  it('connectCommand routes message flows between pool bands', () => {
    let m = addPoolCommand({ x: 400, y: 200 }, 'Pool_1').apply(
      createEmptyDiagram(),
    );
    m = addPoolCommand({ x: 400, y: 600 }, 'Pool_2').apply(m);
    m = connectCommand('messageFlow', 'Pool_1', 'Pool_2', 'Msg').apply(m);
    expect(m.edges['Msg']).toMatchObject({
      type: 'messageFlow',
      sourceRef: 'Pool_1',
      targetRef: 'Pool_2',
    });
    expect(m.edgeDi['Msg'].waypoints.length).toBeGreaterThanOrEqual(2);
  });

  it('setCalledElementCommand sets, clears and survives only on call activities', () => {
    let m = addNodeCommand('callActivity', { x: 200, y: 200 }, 'CA').apply(
      createEmptyDiagram(),
    );
    m = setCalledElementCommand('CA', 'Process_x').apply(m);
    expect(m.nodes['CA']).toMatchObject({ calledElement: 'Process_x' });
    // Morphing away from callActivity drops the reference.
    const morphed = morphNodeCommand('CA', 'task').apply(m);
    expect(morphed.nodes['CA']).not.toHaveProperty('calledElement');
    // Clearing.
    const cleared = setCalledElementCommand('CA', undefined).apply(m);
    expect(cleared.nodes['CA']).not.toHaveProperty('calledElement');
    // No-op on plain tasks.
    expect(setCalledElementCommand('CA', 'X').apply(morphed)).toBe(morphed);
  });
});
