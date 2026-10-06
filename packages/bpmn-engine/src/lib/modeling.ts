/**
 * Re-parenting (G5b): moving elements into and out of pools, lanes and
 * expanded sub-processes. The pointer drop and the keyboard "Move to…"
 * alternative both end in {@link moveToContainerCommand} /
 * {@link reparentElementsCommand}, so either path produces the same model.
 * Lanes are geometric (membership follows the shape center —
 * `syncLaneMembership`), so a lane target is a pool target plus a position.
 */
import type { BpmnDiagram, BpmnEdge, BpmnNode } from './bpmn-model';
import {
  effectivePoolId,
  isBpmnSubProcessType,
  poolAtPoint,
} from './bpmn-model';
import type { BpmnCommand } from './command-stack';
import {
  expandMoveSet,
  moveElementsCommand,
  syncLaneMembership,
} from './commands';
import type { Point, Rect } from './geometry';
import { rectCenter, rectContainsPoint } from './geometry';

/** Where an element lives: the process root, a pool (process) or a sub-process. */
export type BpmnContainerRef =
  | { readonly kind: 'process' }
  | { readonly kind: 'pool'; readonly id: string }
  | { readonly kind: 'subProcess'; readonly id: string };

/** One entry of the "Move to…" list. */
export interface BpmnMoveTarget {
  /** Pool, lane or sub-process id — or the process id for the process root. */
  readonly id: string;
  readonly kind: 'process' | 'pool' | 'lane' | 'subProcess';
  /** The container's name (empty when unnamed). */
  readonly name: string;
  /** For lanes: the owning pool's id. */
  readonly poolId?: string;
  /** True for the element's current container. */
  readonly current: boolean;
}

function sameContainer(a: BpmnContainerRef, b: BpmnContainerRef): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'process' || a.id === (b as { id: string }).id;
}

/** The container an element currently belongs to. */
export function bpmnContainerOf(
  model: BpmnDiagram,
  id: string,
): BpmnContainerRef {
  const node = model.nodes[id];
  if (node?.parentId !== undefined && model.nodes[node.parentId]) {
    return { kind: 'subProcess', id: node.parentId };
  }
  const poolId = node === undefined ? undefined : effectivePoolId(model, id);
  return poolId !== undefined
    ? { kind: 'pool', id: poolId }
    : { kind: 'process' };
}

/** True when `candidate` is `id` itself or one of its descendants. */
function isSelfOrDescendant(
  model: BpmnDiagram,
  candidate: string,
  id: string,
): boolean {
  let cursor: string | undefined = candidate;
  for (let guard = 0; cursor !== undefined && guard < 100; guard++) {
    if (cursor === id) return true;
    cursor = model.nodes[cursor]?.parentId;
  }
  return false;
}

/** True for an expanded sub-process container (a valid drop target). */
function isExpandedContainer(node: BpmnNode | undefined): boolean {
  return (
    node !== undefined &&
    node.type !== 'textAnnotation' &&
    isBpmnSubProcessType(node.type) &&
    node.collapsed !== true
  );
}

/**
 * The container under a diagram point, ignoring the `excluded` ids (the moved
 * set): the innermost expanded sub-process containing it, else the pool band
 * (black-box pools excluded), else the process root. Returns null when the
 * diagram has pools and the point is outside all of them — a drop there keeps
 * the current container.
 */
export function bpmnContainerAt(
  model: BpmnDiagram,
  pt: Point,
  excluded: ReadonlySet<string> = new Set(),
): BpmnContainerRef | null {
  let best: { id: string; area: number } | null = null;
  for (const id of model.order) {
    const node = model.nodes[id];
    const di = model.shapeDi[id];
    if (!isExpandedContainer(node) || di === undefined || excluded.has(id)) {
      continue;
    }
    if (!rectContainsPoint(di.bounds, pt)) continue;
    const area = di.bounds.width * di.bounds.height;
    if (best === null || area < best.area) best = { id, area };
  }
  if (best !== null) return { kind: 'subProcess', id: best.id };
  const poolId = poolAtPoint(model, pt);
  if (poolId !== undefined) {
    return model.pools[poolId].processRef === undefined
      ? null
      : { kind: 'pool', id: poolId };
  }
  return Object.keys(model.pools).length > 0 ? null : { kind: 'process' };
}

/** Whether `ids` may move into `target` (no cycles, no black boxes, no boundary events alone). */
export function canReparent(
  model: BpmnDiagram,
  ids: readonly string[],
  target: BpmnContainerRef,
): boolean {
  const nodes = ids.filter((id) => model.nodes[id] !== undefined);
  if (nodes.length === 0) return false;
  if (target.kind === 'subProcess') {
    if (!isExpandedContainer(model.nodes[target.id])) return false;
    if (nodes.some((id) => isSelfOrDescendant(model, target.id, id))) {
      return false;
    }
  }
  if (target.kind === 'pool') {
    const pool = model.pools[target.id];
    if (pool === undefined || pool.processRef === undefined) return false;
  }
  return nodes.some((id) => {
    const node = model.nodes[id];
    return node.type !== 'boundaryEvent';
  });
}

/**
 * Re-parents the given nodes (and everything that moves with them —
 * descendants, attached boundary events) into `target` without moving them:
 * `parentId` of the top-level nodes and `poolId` of the whole set are
 * rewritten, then connections that became invalid are removed — sequence
 * flows whose endpoints now sit in different pools or containers, and message
 * flows whose endpoints now share a pool. Boundary events follow their host.
 */
export function reparentElementsCommand(
  ids: readonly string[],
  target: BpmnContainerRef,
): BpmnCommand {
  return {
    label: 'Move to container',
    apply(model: BpmnDiagram): BpmnDiagram {
      return applyReparent(model, ids, target);
    },
  };
}

function applyReparent(
  model: BpmnDiagram,
  ids: readonly string[],
  target: BpmnContainerRef,
): BpmnDiagram {
  if (!canReparent(model, ids, target)) return model;
  const roots = ids.filter((id) => {
    const node = model.nodes[id];
    return node !== undefined && node.type !== 'boundaryEvent';
  });
  const moved = expandMoveSet(model, roots);
  const rootSet = new Set(roots);
  const poolId =
    target.kind === 'pool'
      ? target.id
      : target.kind === 'subProcess'
        ? model.nodes[target.id]?.poolId
        : undefined;
  const parentId = target.kind === 'subProcess' ? target.id : undefined;
  const nodes: Record<string, BpmnNode> = { ...model.nodes };
  let changed = false;
  for (const id of moved) {
    const node = model.nodes[id];
    if (node === undefined) continue;
    let next: BpmnNode = node;
    const isRoot =
      rootSet.has(id) ||
      (node.type === 'boundaryEvent' &&
        node.attachedToRef !== undefined &&
        rootSet.has(node.attachedToRef));
    if (isRoot && next.parentId !== parentId) {
      const { parentId: _old, ...rest } = next;
      next = (
        parentId === undefined ? rest : { ...rest, parentId }
      ) as BpmnNode;
    }
    if (next.poolId !== poolId) {
      const { poolId: _old, ...rest } = next;
      next = (poolId === undefined ? rest : { ...rest, poolId }) as BpmnNode;
    }
    if (next !== node) {
      nodes[id] = next;
      changed = true;
    }
  }
  if (!changed) return model;
  const staged: BpmnDiagram = { ...model, nodes };
  // Connections the new scope makes invalid.
  const doomed = new Set<string>();
  for (const [edgeId, edge] of Object.entries(staged.edges)) {
    if (!moved.has(edge.sourceRef) && !moved.has(edge.targetRef)) continue;
    if (invalidAfterReparent(staged, edge)) doomed.add(edgeId);
  }
  if (doomed.size === 0) return syncLaneMembership(staged);
  const edges: Record<string, BpmnEdge> = {};
  for (const [edgeId, edge] of Object.entries(staged.edges)) {
    if (!doomed.has(edgeId)) edges[edgeId] = edge;
  }
  const edgeDi = { ...staged.edgeDi };
  for (const edgeId of doomed) delete edgeDi[edgeId];
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (
      node.type !== 'textAnnotation' &&
      node.defaultFlowId !== undefined &&
      doomed.has(node.defaultFlowId)
    ) {
      const { defaultFlowId: _cleared, ...rest } = node;
      nodes[nodeId] = rest;
    }
  }
  return syncLaneMembership({
    ...staged,
    nodes,
    edges,
    edgeDi,
    order: staged.order.filter((entry) => !doomed.has(entry)),
  });
}

function invalidAfterReparent(model: BpmnDiagram, edge: BpmnEdge): boolean {
  if (edge.type === 'sequenceFlow') {
    const source = model.nodes[edge.sourceRef];
    const target = model.nodes[edge.targetRef];
    if (source === undefined || target === undefined) return false;
    const sourceParent =
      source.type === 'boundaryEvent' && source.attachedToRef !== undefined
        ? model.nodes[source.attachedToRef]?.parentId
        : source.parentId;
    return (
      effectivePoolId(model, source.id) !== effectivePoolId(model, target.id) ||
      sourceParent !== target.parentId
    );
  }
  if (edge.type === 'messageFlow') {
    const a = effectivePoolId(model, edge.sourceRef);
    const b = effectivePoolId(model, edge.targetRef);
    return a !== undefined && a === b;
  }
  return false;
}

/**
 * The targets the keyboard "Move to…" list offers for an element: the
 * process root (diagrams without pools), every pool with a process and its
 * lanes, and every expanded sub-process that is not the element itself or
 * one of its descendants. Empty for pools, edges and boundary events.
 */
export function bpmnMoveTargets(
  model: BpmnDiagram,
  id: string,
): readonly BpmnMoveTarget[] {
  const node = model.nodes[id];
  if (node === undefined || node.type === 'boundaryEvent') return [];
  const current = bpmnContainerOf(model, id);
  const di = model.shapeDi[id];
  const center = di !== undefined ? rectCenter(di.bounds) : null;
  const targets: BpmnMoveTarget[] = [];
  if (Object.keys(model.pools).length === 0) {
    targets.push({
      id: model.processId,
      kind: 'process',
      name: model.processName ?? '',
      current: current.kind === 'process',
    });
  }
  for (const pool of Object.values(model.pools)) {
    if (pool.processRef === undefined) continue;
    const inPool = current.kind === 'pool' && current.id === pool.id;
    targets.push({
      id: pool.id,
      kind: 'pool',
      name: pool.name ?? '',
      current: inPool && pool.lanes.length === 0,
    });
    for (const lane of pool.lanes) {
      const laneDi = model.shapeDi[lane.id];
      targets.push({
        id: lane.id,
        kind: 'lane',
        name: lane.name ?? '',
        poolId: pool.id,
        current:
          inPool &&
          center !== null &&
          laneDi !== undefined &&
          rectContainsPoint(laneDi.bounds, center),
      });
    }
  }
  for (const entry of model.order) {
    const candidate = model.nodes[entry];
    if (
      !isExpandedContainer(candidate) ||
      isSelfOrDescendant(model, entry, id)
    ) {
      continue;
    }
    targets.push({
      id: entry,
      kind: 'subProcess',
      name: candidate.type !== 'textAnnotation' ? (candidate.name ?? '') : '',
      current: current.kind === 'subProcess' && current.id === entry,
    });
  }
  return targets;
}

/** The delta that brings `bounds` fully inside `area` (centered when it does not fit). */
function deltaInto(bounds: Rect, area: Rect, inset: number): Point {
  const inner: Rect = {
    x: area.x + inset,
    y: area.y + inset,
    width: Math.max(area.width - 2 * inset, 0),
    height: Math.max(area.height - 2 * inset, 0),
  };
  const axis = (pos: number, size: number, start: number, length: number) => {
    if (size > length) return start + (length - size) / 2 - pos;
    if (pos < start) return start - pos;
    if (pos + size > start + length) return start + length - size - pos;
    return 0;
  };
  return {
    x: Math.round(axis(bounds.x, bounds.width, inner.x, inner.width)),
    y: Math.round(axis(bounds.y, bounds.height, inner.y, inner.height)),
  };
}

/**
 * The keyboard twin of the drag re-parent ("Move to…"): moves the element
 * (with everything that follows it) inside the target's bounds when it is
 * outside them, then re-parents it — one undoable step. `targetId` is a pool,
 * lane or expanded sub-process id, or the process id for the process root.
 */
export function moveToContainerCommand(
  id: string,
  targetId: string,
): BpmnCommand {
  return {
    label: 'Move to container',
    apply(model: BpmnDiagram): BpmnDiagram {
      const di = model.shapeDi[id];
      if (model.nodes[id] === undefined || di === undefined) return model;
      let target: BpmnContainerRef;
      let area: Rect | undefined;
      let inset = 10;
      if (targetId === model.processId && model.pools[targetId] === undefined) {
        target = { kind: 'process' };
      } else if (model.pools[targetId] !== undefined) {
        target = { kind: 'pool', id: targetId };
        const poolDi = model.shapeDi[targetId];
        area =
          poolDi === undefined
            ? undefined
            : {
                ...poolDi.bounds,
                x: poolDi.bounds.x + 30,
                width: poolDi.bounds.width - 30,
              };
      } else if (model.nodes[targetId] !== undefined) {
        target = { kind: 'subProcess', id: targetId };
        area = model.shapeDi[targetId]?.bounds;
        inset = 20;
      } else {
        const pool = Object.values(model.pools).find((p) =>
          p.lanes.some((lane) => lane.id === targetId),
        );
        if (pool === undefined) return model;
        target = { kind: 'pool', id: pool.id };
        area = model.shapeDi[targetId]?.bounds;
        inset = 6;
      }
      if (!canReparent(model, [id], target)) return model;
      let next = model;
      if (area !== undefined) {
        const delta = deltaInto(di.bounds, area, inset);
        if (delta.x !== 0 || delta.y !== 0) {
          next = moveElementsCommand([id], delta.x, delta.y).apply(next);
        }
      }
      if (!sameContainer(bpmnContainerOf(next, id), target)) {
        next = applyReparent(next, [id], target);
      }
      return next;
    },
  };
}
