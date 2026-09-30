import type {
  BpmnActivityMarker,
  BpmnDiagram,
  BpmnEdge,
  BpmnEdgeDi,
  BpmnEdgeType,
  BpmnEventDefinitionKind,
  BpmnFlowNodeType,
  BpmnLane,
  BpmnNode,
  BpmnNodeType,
  BpmnPool,
  BpmnShapeDi,
} from './bpmn-model';
import {
  DEFAULT_SIZES,
  LANE_DEFAULT_HEIGHT,
  POOL_DEFAULT_SIZE,
  POOL_HEADER_WIDTH,
  SUBPROCESS_EXPANDED_SIZE,
  VALID_EVENT_DEFINITIONS,
  effectivePoolId,
  generateBpmnId,
  idPrefixFor,
  isBpmnActivityType,
  isBpmnEventType,
  isBpmnFlowNodeType,
  isBpmnSubProcessType,
  takenIds,
} from './bpmn-model';
import type { BpmnAlignMode, BpmnDistributeAxis } from './alignment';
import { alignElements, distributeElements } from './alignment';
import type { BpmnCommand } from './command-stack';
import { edgeLabelAnchor, routeOrthogonal } from './edge-routing';
import type { Point, Rect } from './geometry';
import {
  nearestPointOnRectPerimeter,
  rectCenter,
  rectContainsPoint,
  translateRect,
} from './geometry';
import { canMorph } from './rules';
import { snapPoint } from './snapping';

/** Optional placement details of {@link addNodeCommand}. */
export interface BpmnAddNodeOptions {
  /** Containing sub-process of the new node (context-pad append inheritance). */
  readonly parentId?: string;
  /** Pool (participant) whose process the new node joins. */
  readonly poolId?: string;
  /** Boundary events only: host activity the new event attaches to. */
  readonly attachedToRef?: string;
  /** Set false to place at the exact point without grid snapping. Default true. */
  readonly snap?: boolean;
}

/**
 * Recomputes lane membership from geometry for every pool that has lanes: a
 * top-level flow node whose shape center lies inside a lane's DI bounds joins
 * that lane's `flowNodeRefs` (in `model.order` order) and leaves it when
 * outside. Returns the same reference when nothing changed. Called by the
 * editing commands (add/move/resize/lane edits/paste) — imports keep the
 * file's memberships verbatim.
 */
export function syncLaneMembership(model: BpmnDiagram): BpmnDiagram {
  let pools = model.pools as Record<string, BpmnPool>;
  let poolsCopied = false;
  for (const [poolId, pool] of Object.entries(model.pools)) {
    if (pool.lanes.length === 0) {
      continue;
    }
    const refsByLane = new Map<string, string[]>();
    for (const lane of pool.lanes) {
      refsByLane.set(lane.id, []);
    }
    for (const id of model.order) {
      const node = model.nodes[id];
      const di = model.shapeDi[id];
      if (
        node === undefined ||
        di === undefined ||
        node.type === 'textAnnotation' ||
        node.parentId !== undefined ||
        !isBpmnFlowNodeType(node.type) ||
        effectivePoolId(model, id) !== poolId
      ) {
        continue;
      }
      const center = rectCenter(di.bounds);
      for (const lane of pool.lanes) {
        const laneDi = model.shapeDi[lane.id];
        if (laneDi !== undefined && rectContainsPoint(laneDi.bounds, center)) {
          refsByLane.get(lane.id)?.push(id);
          break;
        }
      }
    }
    const changed = pool.lanes.some((lane) => {
      const next = refsByLane.get(lane.id) ?? [];
      return (
        next.length !== lane.flowNodeRefs.length ||
        next.some((ref, i) => ref !== lane.flowNodeRefs[i])
      );
    });
    if (!changed) {
      continue;
    }
    if (!poolsCopied) {
      pools = { ...model.pools };
      poolsCopied = true;
    }
    pools[poolId] = {
      ...pool,
      lanes: pool.lanes.map((lane) => ({
        ...lane,
        flowNodeRefs: refsByLane.get(lane.id) ?? [],
      })),
    };
  }
  return poolsCopied ? { ...model, pools } : model;
}

/** Creates a command that adds a node of the given type centered at the snapped point. */
export function addNodeCommand(
  type: BpmnNodeType,
  at: Point,
  id?: string,
  options?: BpmnAddNodeOptions,
): BpmnCommand {
  return {
    label: 'Add element',
    apply(model: BpmnDiagram): BpmnDiagram {
      const nodeId = id ?? generateBpmnId(idPrefixFor(type), takenIds(model));
      if (model.nodes[nodeId] || model.edges[nodeId]) {
        return model;
      }
      const extras = {
        ...(options?.parentId !== undefined
          ? { parentId: options.parentId }
          : {}),
        ...(options?.poolId !== undefined && model.pools[options.poolId]
          ? { poolId: options.poolId }
          : {}),
        ...(type === 'boundaryEvent' && options?.attachedToRef !== undefined
          ? { attachedToRef: options.attachedToRef }
          : {}),
        ...(type === 'subProcess' ||
        type === 'eventSubProcess' ||
        type === 'transaction'
          ? { collapsed: true }
          : {}),
      };
      const node: BpmnNode =
        type === 'textAnnotation'
          ? { id: nodeId, type, text: '', ...extras }
          : { id: nodeId, type, ...extras };
      const size = DEFAULT_SIZES[type];
      const center = options?.snap === false ? at : snapPoint(at);
      const shape: BpmnShapeDi = {
        bounds: {
          x: center.x - size.width / 2,
          y: center.y - size.height / 2,
          width: size.width,
          height: size.height,
        },
      };
      return syncLaneMembership({
        ...model,
        nodes: { ...model.nodes, [nodeId]: node },
        order: [...model.order, nodeId],
        shapeDi: { ...model.shapeDi, [nodeId]: shape },
      });
    },
  };
}

/**
 * Expands a set of element ids with everything dragged along implicitly:
 * direct and transitive `parentId` descendants of the given nodes, boundary
 * events attached to any node of the growing set, and — when a pool id is in
 * the set — the pool's member nodes (by `poolId`) and its lanes.
 */
export function expandMoveSet(
  model: BpmnDiagram,
  ids: readonly string[],
): ReadonlySet<string> {
  const set = new Set(
    ids.filter(
      (id) => model.nodes[id] !== undefined || model.pools[id] !== undefined,
    ),
  );
  for (const [poolId, pool] of Object.entries(model.pools)) {
    if (!set.has(poolId)) {
      continue;
    }
    for (const lane of pool.lanes) {
      set.add(lane.id);
    }
    for (const [nodeId, node] of Object.entries(model.nodes)) {
      if (node.poolId === poolId) {
        set.add(nodeId);
      }
    }
  }
  for (;;) {
    let grew = false;
    for (const [nodeId, node] of Object.entries(model.nodes)) {
      if (set.has(nodeId)) {
        continue;
      }
      const follows =
        (node.parentId !== undefined && set.has(node.parentId)) ||
        (node.type !== 'textAnnotation' &&
          node.attachedToRef !== undefined &&
          set.has(node.attachedToRef));
      if (follows) {
        set.add(nodeId);
        grew = true;
      }
    }
    if (!grew) {
      return set;
    }
  }
}

/**
 * Creates a command that moves the given nodes by a delta and re-routes every edge touching
 * any moved node. Descendants of moved sub-processes and boundary events attached to moved
 * activities move implicitly ({@link expandMoveSet}); a boundary event moved on its own is
 * clamped back onto its host's border. A zero delta or a selection without movable shapes
 * is a no-op.
 *
 * Hand-edited edges (`BpmnEdgeDi.manual`) follow an honest simple rule: when BOTH endpoints
 * move together the waypoints are translated and the flag survives; when only one endpoint
 * moves the edge is re-routed and the flag is cleared.
 */
export function moveElementsCommand(
  ids: readonly string[],
  dx: number,
  dy: number,
): BpmnCommand {
  return {
    label: 'Move elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      const moved = [...expandMoveSet(model, ids)].filter(
        (id) => model.shapeDi[id] !== undefined,
      );
      if (moved.length === 0 || (dx === 0 && dy === 0)) {
        return model;
      }
      const movedSet = new Set(moved);
      const shapeDi: Record<string, BpmnShapeDi> = { ...model.shapeDi };
      for (const id of moved) {
        const di = shapeDi[id];
        shapeDi[id] = {
          ...di,
          bounds: translateRect(di.bounds, dx, dy),
          ...(di.labelBounds
            ? { labelBounds: translateRect(di.labelBounds, dx, dy) }
            : {}),
        };
      }
      // A boundary event slides along its host border: clamp its center back
      // onto the host perimeter (a no-op when the host moved by the same
      // delta, since the relative position is already on the border).
      for (const id of moved) {
        const node = model.nodes[id];
        if (
          node === undefined ||
          node.type !== 'boundaryEvent' ||
          node.attachedToRef === undefined
        ) {
          continue;
        }
        const hostDi = shapeDi[node.attachedToRef];
        const di = shapeDi[id];
        if (hostDi === undefined || di === undefined) {
          continue;
        }
        const clamped = nearestPointOnRectPerimeter(
          hostDi.bounds,
          rectCenter(di.bounds),
        );
        shapeDi[id] = {
          ...di,
          bounds: {
            x: Math.round(clamped.x - di.bounds.width / 2),
            y: Math.round(clamped.y - di.bounds.height / 2),
            width: di.bounds.width,
            height: di.bounds.height,
          },
        };
      }
      let edgeDi: Record<string, BpmnEdgeDi> = model.edgeDi as Record<
        string,
        BpmnEdgeDi
      >;
      let edgeDiCopied = false;
      for (const [edgeId, edge] of Object.entries(model.edges)) {
        const touchesSource = movedSet.has(edge.sourceRef);
        const touchesTarget = movedSet.has(edge.targetRef);
        if (!touchesSource && !touchesTarget) {
          continue;
        }
        const sourceDi = shapeDi[edge.sourceRef];
        const targetDi = shapeDi[edge.targetRef];
        if (!sourceDi || !targetDi) {
          continue;
        }
        if (!edgeDiCopied) {
          edgeDi = { ...model.edgeDi };
          edgeDiCopied = true;
        }
        const previous = model.edgeDi[edgeId];
        if (previous?.manual === true && touchesSource && touchesTarget) {
          edgeDi[edgeId] = {
            ...previous,
            waypoints: previous.waypoints.map((p) => ({
              x: p.x + dx,
              y: p.y + dy,
            })),
            ...(previous.labelBounds
              ? { labelBounds: translateRect(previous.labelBounds, dx, dy) }
              : {}),
          };
          continue;
        }
        const labelBounds =
          previous?.labelBounds && touchesSource && touchesTarget
            ? translateRect(previous.labelBounds, dx, dy)
            : previous?.labelBounds;
        edgeDi[edgeId] = {
          waypoints: routeOrthogonal(sourceDi.bounds, targetDi.bounds),
          ...(labelBounds ? { labelBounds } : {}),
        };
      }
      return syncLaneMembership({ ...model, shapeDi, edgeDi });
    },
  };
}

/**
 * Applies independent per-element move deltas in one step: each keyed element
 * moves by its own delta, implicit followers (descendants, attached boundary
 * events, pool members — {@link expandMoveSet}) inherit the delta of the
 * first element that pulled them in, boundary events are clamped back onto
 * their host border, and every touched edge is re-routed once. Manual edges
 * whose endpoints moved by the same delta are translated instead (same rule
 * as {@link moveElementsCommand}). Shared by the align / distribute commands.
 */
function applyShapeDeltas(
  model: BpmnDiagram,
  deltas: ReadonlyMap<string, Point>,
): BpmnDiagram {
  const full = new Map<string, Point>();
  for (const [id, delta] of deltas) {
    for (const member of expandMoveSet(model, [id])) {
      if (!full.has(member) && model.shapeDi[member] !== undefined) {
        full.set(member, delta);
      }
    }
  }
  let changed = false;
  const shapeDi: Record<string, BpmnShapeDi> = { ...model.shapeDi };
  for (const [id, delta] of full) {
    if (delta.x === 0 && delta.y === 0) {
      continue;
    }
    changed = true;
    const di = shapeDi[id];
    shapeDi[id] = {
      ...di,
      bounds: translateRect(di.bounds, delta.x, delta.y),
      ...(di.labelBounds
        ? { labelBounds: translateRect(di.labelBounds, delta.x, delta.y) }
        : {}),
    };
  }
  if (!changed) {
    return model;
  }
  for (const [id] of full) {
    const node = model.nodes[id];
    if (
      node === undefined ||
      node.type !== 'boundaryEvent' ||
      node.attachedToRef === undefined
    ) {
      continue;
    }
    const hostDi = shapeDi[node.attachedToRef];
    const di = shapeDi[id];
    if (hostDi === undefined || di === undefined) {
      continue;
    }
    const clamped = nearestPointOnRectPerimeter(
      hostDi.bounds,
      rectCenter(di.bounds),
    );
    shapeDi[id] = {
      ...di,
      bounds: {
        x: Math.round(clamped.x - di.bounds.width / 2),
        y: Math.round(clamped.y - di.bounds.height / 2),
        width: di.bounds.width,
        height: di.bounds.height,
      },
    };
  }
  let edgeDi = model.edgeDi as Record<string, BpmnEdgeDi>;
  let edgeDiCopied = false;
  for (const [edgeId, edge] of Object.entries(model.edges)) {
    const ds = full.get(edge.sourceRef);
    const dt = full.get(edge.targetRef);
    if (ds === undefined && dt === undefined) {
      continue;
    }
    const sourceDi = shapeDi[edge.sourceRef];
    const targetDi = shapeDi[edge.targetRef];
    if (!sourceDi || !targetDi) {
      continue;
    }
    if (!edgeDiCopied) {
      edgeDi = { ...model.edgeDi };
      edgeDiCopied = true;
    }
    const together =
      ds !== undefined && dt !== undefined && ds.x === dt.x && ds.y === dt.y;
    const previous = model.edgeDi[edgeId];
    if (previous?.manual === true && together) {
      edgeDi[edgeId] = {
        ...previous,
        waypoints: previous.waypoints.map((p) => ({
          x: p.x + ds.x,
          y: p.y + ds.y,
        })),
        ...(previous.labelBounds
          ? { labelBounds: translateRect(previous.labelBounds, ds.x, ds.y) }
          : {}),
      };
      continue;
    }
    const labelBounds =
      previous?.labelBounds && together
        ? translateRect(previous.labelBounds, ds.x, ds.y)
        : previous?.labelBounds;
    edgeDi[edgeId] = {
      waypoints: routeOrthogonal(sourceDi.bounds, targetDi.bounds),
      ...(labelBounds ? { labelBounds } : {}),
    };
  }
  return syncLaneMembership({ ...model, shapeDi, edgeDi });
}

/** The movable elements (nodes and pools with shape DI) among the given ids. */
function movableRects(
  model: BpmnDiagram,
  ids: readonly string[],
): Record<string, Rect> {
  const rects: Record<string, Rect> = {};
  for (const id of ids) {
    const di = model.shapeDi[id];
    if (
      di !== undefined &&
      (model.nodes[id] !== undefined || model.pools[id] !== undefined)
    ) {
      rects[id] = di.bounds;
    }
  }
  return rects;
}

/**
 * Creates a command that aligns the movable elements of the selection (nodes
 * and pools) to a shared edge or center axis (see {@link alignElements} for
 * the exact semantics). Each element moves independently by its own delta;
 * edges re-route once. Fewer than 2 movable elements is a no-op.
 */
export function alignElementsCommand(
  ids: readonly string[],
  mode: BpmnAlignMode,
): BpmnCommand {
  return {
    label: 'Align elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      const deltas = alignElements(movableRects(model, ids), mode);
      return applyShapeDeltas(model, new Map(Object.entries(deltas)));
    },
  };
}

/**
 * Creates a command that distributes the movable elements of the selection at
 * equal center gaps along one axis (see {@link distributeElements}). The
 * outermost two elements stay fixed. Fewer than 3 movable elements is a no-op.
 */
export function distributeElementsCommand(
  ids: readonly string[],
  axis: BpmnDistributeAxis,
): BpmnCommand {
  return {
    label: 'Distribute elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      const deltas = distributeElements(movableRects(model, ids), axis);
      return applyShapeDeltas(model, new Map(Object.entries(deltas)));
    },
  };
}

/**
 * Creates a command implementing the space tool: every node and pool whose
 * shape center lies strictly beyond `origin` on the given axis shifts by
 * `delta` (positive inserts space, negative removes it). Implicit followers
 * and edge re-routing/translation follow the exact move-command rules. A zero
 * delta or an empty affected set is a no-op.
 */
export function makeSpaceCommand(
  origin: Point,
  axis: 'x' | 'y',
  delta: number,
): BpmnCommand {
  return {
    label: 'Make space',
    apply(model: BpmnDiagram): BpmnDiagram {
      if (delta === 0) {
        return model;
      }
      const threshold = axis === 'x' ? origin.x : origin.y;
      const ids: string[] = [];
      for (const id of [...Object.keys(model.pools), ...model.order]) {
        const di = model.shapeDi[id];
        if (
          di === undefined ||
          (model.nodes[id] === undefined && model.pools[id] === undefined)
        ) {
          continue;
        }
        const center = rectCenter(di.bounds);
        if ((axis === 'x' ? center.x : center.y) > threshold) {
          ids.push(id);
        }
      }
      if (ids.length === 0) {
        return model;
      }
      return moveElementsCommand(
        ids,
        axis === 'x' ? delta : 0,
        axis === 'y' ? delta : 0,
      ).apply(model);
    },
  };
}

/**
 * The default external-label bounds of an element without stored label DI:
 * nodes get a 90×20 box centered below the shape (matching the editor's
 * rendered below-shape label), edges a 90×14 box above their label anchor.
 * Null for unknown ids and elements without geometry.
 */
export function estimateLabelBounds(
  model: BpmnDiagram,
  id: string,
): Rect | null {
  const shape = model.shapeDi[id];
  if (shape !== undefined) {
    const b = shape.bounds;
    return {
      x: b.x + b.width / 2 - 45,
      y: b.y + b.height + 2,
      width: 90,
      height: 20,
    };
  }
  const edge = model.edgeDi[id];
  if (edge !== undefined && edge.waypoints.length >= 2) {
    const anchor = edgeLabelAnchor(edge.waypoints);
    return { x: anchor.x - 45, y: anchor.y - 17, width: 90, height: 14 };
  }
  return null;
}

/**
 * Creates a command that moves an element's external label by a delta,
 * updating the DI `labelBounds` (creating one from
 * {@link estimateLabelBounds} when the element has none yet). Works for
 * shapes (nodes, pools) and edges alike; label positions round-trip through
 * the existing `BPMNLabel` DI serialization. Unknown ids and zero deltas are
 * no-ops.
 */
export function moveLabelCommand(
  id: string,
  dx: number,
  dy: number,
): BpmnCommand {
  return {
    label: 'Move label',
    apply(model: BpmnDiagram): BpmnDiagram {
      if (dx === 0 && dy === 0) {
        return model;
      }
      const shape = model.shapeDi[id];
      if (shape !== undefined) {
        const base = shape.labelBounds ?? estimateLabelBounds(model, id);
        if (base === null) {
          return model;
        }
        return {
          ...model,
          shapeDi: {
            ...model.shapeDi,
            [id]: { ...shape, labelBounds: translateRect(base, dx, dy) },
          },
        };
      }
      const edge = model.edgeDi[id];
      if (edge !== undefined) {
        const base = edge.labelBounds ?? estimateLabelBounds(model, id);
        if (base === null) {
          return model;
        }
        return {
          ...model,
          edgeDi: {
            ...model.edgeDi,
            [id]: { ...edge, labelBounds: translateRect(base, dx, dy) },
          },
        };
      }
      return model;
    },
  };
}

/** Creates a command that connects two elements with an edge of the given kind and routes it. */
export function connectCommand(
  kind: BpmnEdgeType,
  sourceId: string,
  targetId: string,
  id?: string,
): BpmnCommand {
  return {
    label: 'Connect elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      const sourceDi = model.shapeDi[sourceId];
      const targetDi = model.shapeDi[targetId];
      const sourceKnown =
        model.nodes[sourceId] !== undefined ||
        (kind === 'messageFlow' && model.pools[sourceId] !== undefined);
      const targetKnown =
        model.nodes[targetId] !== undefined ||
        (kind === 'messageFlow' && model.pools[targetId] !== undefined);
      if (!sourceKnown || !targetKnown || !sourceDi || !targetDi) {
        return model;
      }
      const edgeId = id ?? generateBpmnId(idPrefixFor(kind), takenIds(model));
      if (model.nodes[edgeId] || model.edges[edgeId]) {
        return model;
      }
      // Every edge kind shares the {id, type, sourceRef, targetRef} shape.
      const edge = {
        id: edgeId,
        type: kind,
        sourceRef: sourceId,
        targetRef: targetId,
      } as BpmnEdge;
      return {
        ...model,
        edges: { ...model.edges, [edgeId]: edge },
        order: [...model.order, edgeId],
        edgeDi: {
          ...model.edgeDi,
          [edgeId]: {
            waypoints: routeOrthogonal(sourceDi.bounds, targetDi.bounds),
          },
        },
      };
    },
  };
}

/**
 * Creates a command that deletes the given elements, cascading to edges attached to deleted
 * nodes, clearing dangling `defaultFlowId` references and removing DI and order entries.
 */
export function deleteElementsCommand(ids: readonly string[]): BpmnCommand {
  return {
    label: 'Delete elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      const doomed = new Set(
        ids.filter(
          (id) => model.nodes[id] || model.edges[id] || model.pools[id],
        ),
      );
      if (doomed.size === 0) {
        return model;
      }
      // Deleting a pool cascades to its member nodes (and their lanes' DI).
      for (const [poolId, pool] of Object.entries(model.pools)) {
        if (!doomed.has(poolId)) {
          continue;
        }
        for (const lane of pool.lanes) {
          doomed.add(lane.id);
        }
        for (const [nodeId, node] of Object.entries(model.nodes)) {
          if (node.poolId === poolId) {
            doomed.add(nodeId);
          }
        }
      }
      // Deleting a sub-process cascades to its descendants, deleting an
      // activity cascades to its attached boundary events (transitively).
      for (;;) {
        let grew = false;
        for (const [nodeId, node] of Object.entries(model.nodes)) {
          if (doomed.has(nodeId)) {
            continue;
          }
          const cascades =
            (node.parentId !== undefined && doomed.has(node.parentId)) ||
            (node.type !== 'textAnnotation' &&
              node.attachedToRef !== undefined &&
              doomed.has(node.attachedToRef));
          if (cascades) {
            doomed.add(nodeId);
            grew = true;
          }
        }
        if (!grew) {
          break;
        }
      }
      for (const [edgeId, edge] of Object.entries(model.edges)) {
        if (doomed.has(edge.sourceRef) || doomed.has(edge.targetRef)) {
          doomed.add(edgeId);
        }
      }
      const nodes: Record<string, BpmnNode> = {};
      for (const [nodeId, node] of Object.entries(model.nodes)) {
        if (doomed.has(nodeId)) {
          continue;
        }
        if (
          node.type !== 'textAnnotation' &&
          node.defaultFlowId !== undefined &&
          doomed.has(node.defaultFlowId)
        ) {
          const { defaultFlowId: _cleared, ...rest } = node;
          nodes[nodeId] = rest;
        } else {
          nodes[nodeId] = node;
        }
      }
      const edges: Record<string, BpmnEdge> = {};
      for (const [edgeId, edge] of Object.entries(model.edges)) {
        if (!doomed.has(edgeId)) {
          edges[edgeId] = edge;
        }
      }
      const shapeDi: Record<string, BpmnShapeDi> = {};
      for (const [shapeId, di] of Object.entries(model.shapeDi)) {
        if (!doomed.has(shapeId)) {
          shapeDi[shapeId] = di;
        }
      }
      const edgeDi: Record<string, BpmnEdgeDi> = {};
      for (const [edgeId, di] of Object.entries(model.edgeDi)) {
        if (!doomed.has(edgeId)) {
          edgeDi[edgeId] = di;
        }
      }
      let pools = model.pools;
      let poolsChanged = false;
      const nextPools: Record<string, BpmnPool> = {};
      for (const [poolId, pool] of Object.entries(model.pools)) {
        if (doomed.has(poolId)) {
          poolsChanged = true;
          continue;
        }
        // Surviving pools drop lane references to deleted nodes.
        const lanes = pool.lanes.map((lane) => {
          const kept = lane.flowNodeRefs.filter((ref) => !doomed.has(ref));
          return kept.length === lane.flowNodeRefs.length
            ? lane
            : { ...lane, flowNodeRefs: kept };
        });
        const lanesChanged = lanes.some((lane, i) => lane !== pool.lanes[i]);
        nextPools[poolId] = lanesChanged ? { ...pool, lanes } : pool;
        poolsChanged = poolsChanged || lanesChanged;
      }
      if (poolsChanged) {
        pools = nextPools;
      }
      const result: BpmnDiagram = {
        ...model,
        pools,
        nodes,
        edges,
        order: model.order.filter((entry) => !doomed.has(entry)),
        shapeDi,
        edgeDi,
      };
      if (
        Object.keys(pools).length === 0 &&
        result.collaborationId !== undefined
      ) {
        // The last pool is gone: drop the collaboration envelope too.
        const { collaborationId: _cleared, ...rest } = result;
        return rest;
      }
      return result;
    },
  };
}

/**
 * Creates a command that renames an element: a node's, sequence flow's, message flow's or
 * pool's `name`, or a text annotation's `text`. Unknown ids, associations and unchanged
 * text are no-ops.
 */
export function updateLabelCommand(id: string, text: string): BpmnCommand {
  return {
    label: 'Edit label',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (node) {
        if (node.type === 'textAnnotation') {
          if (node.text === text) {
            return model;
          }
          return {
            ...model,
            nodes: { ...model.nodes, [id]: { ...node, text } },
          };
        }
        if ((node.name ?? '') === text) {
          return model;
        }
        return {
          ...model,
          nodes: { ...model.nodes, [id]: { ...node, name: text } },
        };
      }
      const edge = model.edges[id];
      if (
        edge &&
        (edge.type === 'sequenceFlow' || edge.type === 'messageFlow')
      ) {
        if ((edge.name ?? '') === text) {
          return model;
        }
        return {
          ...model,
          edges: { ...model.edges, [id]: { ...edge, name: text } },
        };
      }
      const pool = model.pools[id];
      if (pool) {
        if ((pool.name ?? '') === text) {
          return model;
        }
        return {
          ...model,
          pools: { ...model.pools, [id]: { ...pool, name: text } },
        };
      }
      return model;
    },
  };
}

/**
 * Creates a command that marks one of a gateway's outgoing sequence flows as its default flow,
 * or clears the marker when `flowId` is undefined.
 */
export function setDefaultFlowCommand(
  gatewayId: string,
  flowId: string | undefined,
): BpmnCommand {
  return {
    label: 'Set default flow',
    apply(model: BpmnDiagram): BpmnDiagram {
      const gateway = model.nodes[gatewayId];
      if (!gateway || gateway.type === 'textAnnotation') {
        return model;
      }
      if (flowId !== undefined) {
        const flow = model.edges[flowId];
        if (
          !flow ||
          flow.type !== 'sequenceFlow' ||
          flow.sourceRef !== gatewayId
        ) {
          return model;
        }
      }
      if (gateway.defaultFlowId === flowId) {
        return model;
      }
      const { defaultFlowId: _previous, ...rest } = gateway;
      const updated =
        flowId === undefined ? rest : { ...rest, defaultFlowId: flowId };
      return { ...model, nodes: { ...model.nodes, [gatewayId]: updated } };
    },
  };
}

/**
 * Creates a command that sets or clears a sequence flow's condition expression. Unknown flows,
 * associations and unchanged expressions are no-ops.
 */
export function setConditionCommand(
  flowId: string,
  expression: string | undefined,
): BpmnCommand {
  return {
    label: 'Set condition',
    apply(model: BpmnDiagram): BpmnDiagram {
      const flow = model.edges[flowId];
      if (
        !flow ||
        flow.type !== 'sequenceFlow' ||
        flow.conditionExpression === expression
      ) {
        return model;
      }
      const { conditionExpression: _previous, ...rest } = flow;
      const updated =
        expression === undefined
          ? rest
          : { ...rest, conditionExpression: expression };
      return { ...model, edges: { ...model.edges, [flowId]: updated } };
    },
  };
}

/**
 * Creates a command that updates process-level properties: `name` (empty string
 * clears it) and/or `isExecutable`. Unchanged values are no-ops.
 */
export function updateProcessCommand(patch: {
  readonly name?: string;
  readonly isExecutable?: boolean;
}): BpmnCommand {
  return {
    label: 'Edit process',
    apply(model: BpmnDiagram): BpmnDiagram {
      let next = model;
      if (patch.name !== undefined) {
        const name = patch.name === '' ? undefined : patch.name;
        if (name !== next.processName) {
          const { processName: _previous, ...rest } = next;
          next = name === undefined ? rest : { ...rest, processName: name };
        }
      }
      if (
        patch.isExecutable !== undefined &&
        patch.isExecutable !== next.isExecutable
      ) {
        next = { ...next, isExecutable: patch.isExecutable };
      }
      return next;
    },
  };
}

/**
 * Creates a command that replaces an edge's waypoints with a hand-edited
 * polyline and marks the edge DI as `manual`, so subsequent moves translate
 * instead of re-routing it (see `moveElementsCommand` for the exact rule).
 * Unknown edges, fewer than 2 waypoints and unchanged polylines are no-ops.
 */
export function updateWaypointsCommand(
  edgeId: string,
  waypoints: readonly Point[],
): BpmnCommand {
  return {
    label: 'Edit waypoints',
    apply(model: BpmnDiagram): BpmnDiagram {
      const di = model.edgeDi[edgeId];
      if (!model.edges[edgeId] || !di || waypoints.length < 2) {
        return model;
      }
      const unchanged =
        di.manual === true &&
        di.waypoints.length === waypoints.length &&
        di.waypoints.every(
          (p, i) => p.x === waypoints[i].x && p.y === waypoints[i].y,
        );
      if (unchanged) {
        return model;
      }
      return {
        ...model,
        edgeDi: {
          ...model.edgeDi,
          [edgeId]: {
            ...di,
            waypoints: waypoints.map((p) => ({ x: p.x, y: p.y })),
            manual: true,
          },
        },
      };
    },
  };
}

/**
 * A deep-cloned diagram subgraph held by the editor's internal clipboard:
 * the copied nodes plus every edge whose both endpoints were copied, with
 * their DI. Ids still refer to the source diagram; `pasteCommand` remaps them.
 */
export interface BpmnClipboard {
  readonly nodes: readonly BpmnNode[];
  readonly edges: readonly BpmnEdge[];
  readonly shapeDi: Readonly<Record<string, BpmnShapeDi>>;
  readonly edgeDi: Readonly<Record<string, BpmnEdgeDi>>;
}

/**
 * Extracts the copyable subgraph of the given ids: every selected node, plus
 * every edge whose source AND target are both among the selected nodes
 * (whether or not the edge itself was selected). Returns null when the
 * selection contains no nodes. The result is deep-cloned and safe to hold
 * across later model changes.
 */
export function extractClipboard(
  model: BpmnDiagram,
  ids: readonly string[],
): BpmnClipboard | null {
  // A selected pool contributes its member nodes (the band itself is not
  // copyable — pasting duplicates the members, not the participant).
  const expanded: string[] = [];
  for (const id of ids) {
    if (model.pools[id] !== undefined) {
      for (const [nodeId, node] of Object.entries(model.nodes)) {
        if (node.poolId === id) {
          expanded.push(nodeId);
        }
      }
    } else {
      expanded.push(id);
    }
  }
  const nodeIds = expanded.filter((id) => model.nodes[id] !== undefined);
  if (nodeIds.length === 0) {
    return null;
  }
  // Copying a sub-process copies its descendants, copying an activity copies
  // its attached boundary events — same implicit closure as moving.
  const picked = new Set(expandMoveSet(model, nodeIds));
  // A boundary event without its host is not copyable.
  for (const id of [...picked]) {
    const node = model.nodes[id];
    if (
      node !== undefined &&
      node.type !== 'textAnnotation' &&
      node.attachedToRef !== undefined &&
      !picked.has(node.attachedToRef)
    ) {
      picked.delete(id);
    }
  }
  const nodes: BpmnNode[] = [];
  const edges: BpmnEdge[] = [];
  const shapeDi: Record<string, BpmnShapeDi> = {};
  const edgeDi: Record<string, BpmnEdgeDi> = {};
  for (const id of model.order) {
    const node = model.nodes[id];
    if (node && picked.has(id)) {
      // A child copied without its container is pasted at the process root.
      const cloned =
        node.parentId !== undefined && !picked.has(node.parentId)
          ? stripParentId(node)
          : node;
      nodes.push(cloned);
      if (model.shapeDi[id]) {
        shapeDi[id] = model.shapeDi[id];
      }
      continue;
    }
    const edge = model.edges[id];
    if (edge && picked.has(edge.sourceRef) && picked.has(edge.targetRef)) {
      edges.push(edge);
      if (model.edgeDi[id]) {
        edgeDi[id] = model.edgeDi[id];
      }
    }
  }
  if (nodes.length === 0) {
    return null;
  }
  return structuredClone({ nodes, edges, shapeDi, edgeDi });
}

function stripParentId(node: BpmnNode): BpmnNode {
  const { parentId: _stripped, ...rest } = node;
  return rest as BpmnNode;
}

/**
 * Creates a command that pastes a clipboard subgraph at the given offset:
 * every node and edge receives a fresh generated id, internal edge endpoint
 * references are remapped, `defaultFlowId` references are remapped when the
 * flow was copied too and dropped otherwise, and all bounds and waypoints are
 * translated by the offset (hand-edited waypoint shapes survive verbatim).
 */
export function pasteCommand(clip: BpmnClipboard, offset: Point): BpmnCommand {
  return {
    label: 'Paste elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      if (clip.nodes.length === 0) {
        return model;
      }
      const taken = new Set(takenIds(model));
      taken.add(model.processId);
      const idMap = new Map<string, string>();
      const remap = (
        oldId: string,
        type: BpmnNodeType | BpmnEdgeType,
      ): string => {
        const newId = generateBpmnId(idPrefixFor(type), taken);
        taken.add(newId);
        idMap.set(oldId, newId);
        return newId;
      };
      const nodes: Record<string, BpmnNode> = { ...model.nodes };
      const edges: Record<string, BpmnEdge> = { ...model.edges };
      const shapeDi: Record<string, BpmnShapeDi> = { ...model.shapeDi };
      const edgeDi: Record<string, BpmnEdgeDi> = { ...model.edgeDi };
      const order = [...model.order];
      const copiedEdgeIds = new Set(clip.edges.map((e) => e.id));
      for (const node of clip.nodes) {
        remap(node.id, node.type);
      }
      for (const edge of clip.edges) {
        remap(edge.id, edge.type);
      }
      for (const node of clip.nodes) {
        const newId = idMap.get(node.id) as string;
        let cloned: BpmnNode = { ...node, id: newId };
        if (cloned.parentId !== undefined) {
          const mappedParent = idMap.get(cloned.parentId);
          const { parentId: _oldParent, ...restParent } = cloned;
          cloned = (
            mappedParent === undefined
              ? restParent
              : { ...restParent, parentId: mappedParent }
          ) as BpmnNode;
        }
        if (
          cloned.poolId !== undefined &&
          model.pools[cloned.poolId] === undefined
        ) {
          // The source pool no longer exists: paste into the default process.
          const { poolId: _oldPool, ...restPool } = cloned;
          cloned = restPool as BpmnNode;
        }
        if (
          cloned.type !== 'textAnnotation' &&
          cloned.attachedToRef !== undefined
        ) {
          // extractClipboard guarantees the host was copied too.
          cloned = {
            ...cloned,
            attachedToRef: idMap.get(cloned.attachedToRef) as string,
          };
        }
        if (
          cloned.type !== 'textAnnotation' &&
          cloned.defaultFlowId !== undefined
        ) {
          const mapped = copiedEdgeIds.has(cloned.defaultFlowId)
            ? idMap.get(cloned.defaultFlowId)
            : undefined;
          const { defaultFlowId: _old, ...rest } = cloned;
          cloned =
            mapped === undefined ? rest : { ...rest, defaultFlowId: mapped };
        }
        nodes[newId] = cloned;
        order.push(newId);
        const di = clip.shapeDi[node.id];
        if (di) {
          shapeDi[newId] = {
            bounds: translateRect(di.bounds, offset.x, offset.y),
            ...(di.labelBounds
              ? {
                  labelBounds: translateRect(
                    di.labelBounds,
                    offset.x,
                    offset.y,
                  ),
                }
              : {}),
          };
        }
      }
      for (const edge of clip.edges) {
        const newId = idMap.get(edge.id) as string;
        edges[newId] = {
          ...edge,
          id: newId,
          sourceRef: idMap.get(edge.sourceRef) as string,
          targetRef: idMap.get(edge.targetRef) as string,
        };
        order.push(newId);
        const di = clip.edgeDi[edge.id];
        if (di) {
          edgeDi[newId] = {
            ...di,
            waypoints: di.waypoints.map((p) => ({
              x: p.x + offset.x,
              y: p.y + offset.y,
            })),
            ...(di.labelBounds
              ? {
                  labelBounds: translateRect(
                    di.labelBounds,
                    offset.x,
                    offset.y,
                  ),
                }
              : {}),
          };
        }
      }
      return syncLaneMembership({
        ...model,
        nodes,
        edges,
        order,
        shapeDi,
        edgeDi,
      });
    },
  };
}

/** Patch applied by {@link setElementColorsCommand}: `null` clears, `undefined` leaves. */
export interface BpmnColorPatch {
  readonly fill?: string | null;
  readonly stroke?: string | null;
}

function patchColors<T extends { fill?: string; stroke?: string }>(
  di: T,
  colors: BpmnColorPatch,
): T {
  let next = di;
  for (const key of ['fill', 'stroke'] as const) {
    const value = colors[key];
    if (value === undefined || (value ?? undefined) === next[key]) {
      continue;
    }
    if (value === null) {
      const { [key]: _cleared, ...rest } = next;
      next = rest as T;
    } else {
      next = { ...next, [key]: value };
    }
  }
  return next;
}

/**
 * Creates a command that sets or clears the custom fill/stroke colors of the
 * given elements' DI (nodes and edges alike): a string sets the color, `null`
 * clears it and `undefined` leaves it untouched. Unknown ids and unchanged
 * values are no-ops (same reference).
 */
export function setElementColorsCommand(
  ids: readonly string[],
  colors: BpmnColorPatch,
): BpmnCommand {
  return {
    label: 'Set colors',
    apply(model: BpmnDiagram): BpmnDiagram {
      let shapeDi = model.shapeDi as Record<string, BpmnShapeDi>;
      let edgeDi = model.edgeDi as Record<string, BpmnEdgeDi>;
      let shapeCopied = false;
      let edgeCopied = false;
      for (const id of ids) {
        const shape = model.shapeDi[id];
        if (shape !== undefined) {
          const next = patchColors(shape, colors);
          if (next !== shape) {
            if (!shapeCopied) {
              shapeDi = { ...model.shapeDi };
              shapeCopied = true;
            }
            shapeDi[id] = next;
          }
          continue;
        }
        const edge = model.edgeDi[id];
        if (edge !== undefined) {
          const next = patchColors(edge, colors);
          if (next !== edge) {
            if (!edgeCopied) {
              edgeDi = { ...model.edgeDi };
              edgeCopied = true;
            }
            edgeDi[id] = next;
          }
        }
      }
      if (!shapeCopied && !edgeCopied) {
        return model;
      }
      return { ...model, shapeDi, edgeDi };
    },
  };
}

/**
 * Creates a command that resizes a node's shape DI to the given bounds and
 * re-routes every attached non-manual edge (hand-edited waypoints are left
 * untouched — the shape anchor moves but the polyline stays authoritative).
 * Unknown ids and unchanged bounds are no-ops (same reference).
 */
export function resizeNodeCommand(id: string, bounds: Rect): BpmnCommand {
  return {
    label: 'Resize element',
    apply(model: BpmnDiagram): BpmnDiagram {
      const di = model.shapeDi[id];
      const pool = model.pools[id];
      if ((!model.nodes[id] && !pool) || !di) {
        return model;
      }
      const b = di.bounds;
      if (
        b.x === bounds.x &&
        b.y === bounds.y &&
        b.width === bounds.width &&
        b.height === bounds.height
      ) {
        return model;
      }
      const shapeDi: Record<string, BpmnShapeDi> = {
        ...model.shapeDi,
        [id]: { ...di, bounds: { ...bounds } },
      };
      if (pool !== undefined && pool.lanes.length > 0) {
        // Lanes follow the pool: full body width, heights scaled to the new
        // pool height (the last lane absorbs rounding gaps).
        const scale = bounds.height / b.height;
        let laneTop = bounds.y;
        for (let i = 0; i < pool.lanes.length; i++) {
          const lane = pool.lanes[i];
          const laneDi = model.shapeDi[lane.id];
          if (laneDi === undefined) {
            continue;
          }
          const isLast = i === pool.lanes.length - 1;
          const height = isLast
            ? bounds.y + bounds.height - laneTop
            : Math.round(laneDi.bounds.height * scale);
          shapeDi[lane.id] = {
            ...laneDi,
            bounds: {
              x: bounds.x + POOL_HEADER_WIDTH,
              y: laneTop,
              width: bounds.width - POOL_HEADER_WIDTH,
              height,
            },
          };
          laneTop += height;
        }
      }
      let edgeDi = model.edgeDi as Record<string, BpmnEdgeDi>;
      let edgeDiCopied = false;
      for (const [edgeId, edge] of Object.entries(model.edges)) {
        if (edge.sourceRef !== id && edge.targetRef !== id) {
          continue;
        }
        const previous = model.edgeDi[edgeId];
        if (previous?.manual === true) {
          continue;
        }
        const sourceDi = shapeDi[edge.sourceRef];
        const targetDi = shapeDi[edge.targetRef];
        if (!sourceDi || !targetDi) {
          continue;
        }
        if (!edgeDiCopied) {
          edgeDi = { ...model.edgeDi };
          edgeDiCopied = true;
        }
        edgeDi[edgeId] = {
          ...(previous ?? { waypoints: [] }),
          waypoints: routeOrthogonal(sourceDi.bounds, targetDi.bounds),
        };
      }
      return syncLaneMembership({ ...model, shapeDi, edgeDi });
    },
  };
}

/**
 * Creates a command that morphs a flow node into another type of the same
 * morph group (see `MORPH_GROUPS`), preserving id, name, edges, colors and
 * bounds. Denied morphs (cross-group, end event with outgoing flows, start
 * event with incoming flows — see `canMorph`) and unchanged types are no-ops.
 */
export function morphNodeCommand(
  id: string,
  newType: BpmnFlowNodeType,
): BpmnCommand {
  return {
    label: 'Change element type',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (
        !node ||
        node.type === 'textAnnotation' ||
        node.type === newType ||
        !canMorph(model, id, newType).allowed
      ) {
        return model;
      }
      let updated = { ...node, type: newType };
      // Drop an event definition the new position does not accept.
      if (
        updated.eventDefinition !== undefined &&
        (!isBpmnEventType(newType) ||
          !VALID_EVENT_DEFINITIONS[newType].includes(updated.eventDefinition))
      ) {
        const { eventDefinition: _dropped, ...rest } = updated;
        updated = rest;
      }
      // `calledElement` is meaningful on call activities only.
      if (updated.calledElement !== undefined && newType !== 'callActivity') {
        const { calledElement: _droppedRef, ...rest } = updated;
        updated = rest;
      }
      return {
        ...model,
        nodes: { ...model.nodes, [id]: updated },
      };
    },
  };
}

/**
 * Creates a command that sets or clears an event's single event definition.
 * Unknown ids, non-event nodes, kinds invalid for the event's position (see
 * `VALID_EVENT_DEFINITIONS`) and unchanged kinds are no-ops.
 */
export function setEventDefinitionCommand(
  id: string,
  kind: BpmnEventDefinitionKind | undefined,
): BpmnCommand {
  return {
    label: 'Set event definition',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (
        !node ||
        node.type === 'textAnnotation' ||
        !isBpmnEventType(node.type) ||
        node.eventDefinition === kind
      ) {
        return model;
      }
      if (
        kind !== undefined &&
        !VALID_EVENT_DEFINITIONS[node.type].includes(kind)
      ) {
        return model;
      }
      const { eventDefinition: _previous, ...rest } = node;
      const updated =
        kind === undefined ? rest : { ...rest, eventDefinition: kind };
      return { ...model, nodes: { ...model.nodes, [id]: updated } };
    },
  };
}

/**
 * Creates a command that replaces an activity's marker set (loop /
 * multi-instance / compensation), normalized to a canonical order. Unknown
 * ids, non-activities and unchanged sets are no-ops.
 */
export function setActivityMarkersCommand(
  id: string,
  markers: readonly BpmnActivityMarker[],
): BpmnCommand {
  return {
    label: 'Set activity markers',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (
        !node ||
        node.type === 'textAnnotation' ||
        !isBpmnActivityType(node.type)
      ) {
        return model;
      }
      const order: readonly BpmnActivityMarker[] = [
        'loop',
        'multiInstanceParallel',
        'multiInstanceSequential',
        'compensation',
      ];
      const requested = new Set(markers);
      const normalized = order.filter((marker) => requested.has(marker));
      const current = node.markers ?? [];
      if (
        current.length === normalized.length &&
        current.every((marker, index) => marker === normalized[index])
      ) {
        return model;
      }
      const { markers: _previous, ...rest } = node;
      const updated =
        normalized.length === 0 ? rest : { ...rest, markers: normalized };
      return { ...model, nodes: { ...model.nodes, [id]: updated } };
    },
  };
}

/**
 * Creates a command that flips a boundary event between interrupting
 * (`cancelActivity` true, the default) and non-interrupting (false, rendered
 * dashed). Unknown ids, non-boundary nodes and unchanged values are no-ops.
 */
export function setBoundaryInterruptingCommand(
  id: string,
  interrupting: boolean,
): BpmnCommand {
  return {
    label: 'Set interrupting',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (!node || node.type !== 'boundaryEvent') {
        return model;
      }
      if ((node.cancelActivity ?? true) === interrupting) {
        return model;
      }
      const { cancelActivity: _previous, ...rest } = node;
      const updated = interrupting ? rest : { ...rest, cancelActivity: false };
      return { ...model, nodes: { ...model.nodes, [id]: updated } };
    },
  };
}

/**
 * Creates a command that collapses or expands a sub-process container.
 * Collapsing shrinks the shape to the default compact size and hides the
 * children (they stay in the model and the XML); expanding grows the shape to
 * at least `SUBPROCESS_EXPANDED_SIZE`, generates positions inside the parent
 * for children that never had DI, and re-routes attached non-manual edges.
 * Unknown ids, non-containers and an unchanged state are no-ops.
 */
export function toggleSubProcessCollapseCommand(
  id: string,
  collapsed: boolean,
): BpmnCommand {
  return {
    label: 'Toggle sub-process collapse',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      const di = model.shapeDi[id];
      if (
        !node ||
        node.type === 'textAnnotation' ||
        !isBpmnSubProcessType(node.type) ||
        !di ||
        (node.collapsed === true) === collapsed
      ) {
        return model;
      }
      const { collapsed: _previous, ...rest } = node;
      const updated = collapsed ? { ...rest, collapsed: true } : rest;
      const bounds: Rect = collapsed
        ? { ...di.bounds, ...DEFAULT_SIZES[node.type] }
        : {
            x: di.bounds.x,
            y: di.bounds.y,
            width: Math.max(di.bounds.width, SUBPROCESS_EXPANDED_SIZE.width),
            height: Math.max(di.bounds.height, SUBPROCESS_EXPANDED_SIZE.height),
          };
      const shapeDi: Record<string, BpmnShapeDi> = {
        ...model.shapeDi,
        [id]: { ...di, bounds },
      };
      if (!collapsed) {
        // Children imported under a collapsed container may have no DI at
        // all; give them simple positions inside the expanded bounds.
        let placed = 0;
        for (const childId of model.order) {
          const child = model.nodes[childId];
          if (
            !child ||
            child.parentId !== id ||
            shapeDi[childId] !== undefined
          ) {
            continue;
          }
          const size = DEFAULT_SIZES[child.type];
          shapeDi[childId] = {
            bounds: {
              x: bounds.x + 30 + placed * 120,
              y: bounds.y + 50,
              width: size.width,
              height: size.height,
            },
          };
          placed++;
        }
      }
      let edgeDi = model.edgeDi as Record<string, BpmnEdgeDi>;
      let edgeDiCopied = false;
      for (const [edgeId, edge] of Object.entries(model.edges)) {
        if (edge.sourceRef !== id && edge.targetRef !== id) {
          continue;
        }
        const previous = model.edgeDi[edgeId];
        if (previous?.manual === true) {
          continue;
        }
        const sourceDi = shapeDi[edge.sourceRef];
        const targetDi = shapeDi[edge.targetRef];
        if (!sourceDi || !targetDi) {
          continue;
        }
        if (!edgeDiCopied) {
          edgeDi = { ...model.edgeDi };
          edgeDiCopied = true;
        }
        edgeDi[edgeId] = {
          ...(previous ?? { waypoints: [] }),
          waypoints: routeOrthogonal(sourceDi.bounds, targetDi.bounds),
        };
      }
      return {
        ...model,
        nodes: { ...model.nodes, [id]: updated },
        shapeDi,
        edgeDi,
      };
    },
  };
}

/**
 * Creates a command that adds a horizontal pool (participant) centered at the
 * snapped point: a fresh participant with its own empty process, a
 * 600×250 DI band and no lanes (as in bpmn-js — lanes are added explicitly).
 * The first pool also assigns the diagram's collaboration id. Existing
 * elements keep their process; they are not absorbed into the new pool.
 */
export function addPoolCommand(at: Point, id?: string): BpmnCommand {
  return {
    label: 'Add pool',
    apply(model: BpmnDiagram): BpmnDiagram {
      const taken = new Set(takenIds(model));
      const poolId = id ?? generateBpmnId('Participant', taken);
      if (model.nodes[poolId] || model.edges[poolId] || model.pools[poolId]) {
        return model;
      }
      taken.add(poolId);
      const processRef = generateBpmnId('Process', taken);
      taken.add(processRef);
      const collaborationId =
        model.collaborationId ?? generateBpmnId('Collaboration', taken);
      const center = snapPoint(at);
      const pool: BpmnPool = {
        id: poolId,
        processRef,
        lanes: [],
        processExecutable: false,
      };
      const shape: BpmnShapeDi = {
        bounds: {
          x: center.x - POOL_DEFAULT_SIZE.width / 2,
          y: center.y - POOL_DEFAULT_SIZE.height / 2,
          width: POOL_DEFAULT_SIZE.width,
          height: POOL_DEFAULT_SIZE.height,
        },
        horizontal: true,
      };
      return {
        ...model,
        collaborationId,
        pools: { ...model.pools, [poolId]: pool },
        shapeDi: { ...model.shapeDi, [poolId]: shape },
      };
    },
  };
}

/**
 * Creates a command that adds a lane to a pool: the first lane covers the
 * pool's whole body (right of the name strip), each further lane is appended
 * at the bottom with the default lane height, growing the pool. Lane
 * membership is recomputed from geometry afterwards.
 */
export function addLaneCommand(poolId: string, id?: string): BpmnCommand {
  return {
    label: 'Add lane',
    apply(model: BpmnDiagram): BpmnDiagram {
      const pool = model.pools[poolId];
      const poolDi = model.shapeDi[poolId];
      if (pool === undefined || poolDi === undefined) {
        return model;
      }
      const laneId = id ?? generateBpmnId('Lane', takenIds(model));
      if (
        model.nodes[laneId] ||
        model.edges[laneId] ||
        model.pools[laneId] ||
        model.shapeDi[laneId]
      ) {
        return model;
      }
      const b = poolDi.bounds;
      const first = pool.lanes.length === 0;
      const laneBounds: Rect = first
        ? {
            x: b.x + POOL_HEADER_WIDTH,
            y: b.y,
            width: b.width - POOL_HEADER_WIDTH,
            height: b.height,
          }
        : {
            x: b.x + POOL_HEADER_WIDTH,
            y: b.y + b.height,
            width: b.width - POOL_HEADER_WIDTH,
            height: LANE_DEFAULT_HEIGHT,
          };
      const shapeDi: Record<string, BpmnShapeDi> = {
        ...model.shapeDi,
        [laneId]: { bounds: laneBounds, horizontal: true },
      };
      if (!first) {
        shapeDi[poolId] = {
          ...poolDi,
          bounds: { ...b, height: b.height + LANE_DEFAULT_HEIGHT },
        };
      }
      const lane: BpmnLane = { id: laneId, flowNodeRefs: [] };
      return syncLaneMembership({
        ...model,
        pools: {
          ...model.pools,
          [poolId]: { ...pool, lanes: [...pool.lanes, lane] },
        },
        shapeDi,
      });
    },
  };
}

/**
 * Creates a command that removes a lane from a pool: lanes below it shift up
 * by the removed height, member nodes of the shifted lanes move up with them
 * (edges re-route via the same rules as a move), and the pool shrinks. The
 * last remaining lane is simply removed without resizing the pool.
 */
export function removeLaneCommand(poolId: string, laneId: string): BpmnCommand {
  return {
    label: 'Remove lane',
    apply(model: BpmnDiagram): BpmnDiagram {
      const pool = model.pools[poolId];
      const poolDi = model.shapeDi[poolId];
      const laneDi = model.shapeDi[laneId];
      const index = pool?.lanes.findIndex((lane) => lane.id === laneId) ?? -1;
      if (
        pool === undefined ||
        poolDi === undefined ||
        laneDi === undefined ||
        index < 0
      ) {
        return model;
      }
      const removedHeight = laneDi.bounds.height;
      const lastLane = pool.lanes.length === 1;
      let next: BpmnDiagram = model;
      if (!lastLane) {
        // Members of the lanes below the removed one move up with their lane.
        const movedNodeIds: string[] = [];
        for (const lane of pool.lanes.slice(index + 1)) {
          movedNodeIds.push(...lane.flowNodeRefs);
        }
        if (movedNodeIds.length > 0) {
          next = moveElementsCommand(movedNodeIds, 0, -removedHeight).apply(
            next,
          );
        }
      }
      const shapeDi: Record<string, BpmnShapeDi> = { ...next.shapeDi };
      delete shapeDi[laneId];
      if (!lastLane) {
        for (const lane of pool.lanes.slice(index + 1)) {
          const di = shapeDi[lane.id];
          if (di !== undefined) {
            shapeDi[lane.id] = {
              ...di,
              bounds: translateRect(di.bounds, 0, -removedHeight),
            };
          }
        }
        shapeDi[poolId] = {
          ...(shapeDi[poolId] ?? poolDi),
          bounds: {
            ...poolDi.bounds,
            height: poolDi.bounds.height - removedHeight,
          },
        };
      }
      return syncLaneMembership({
        ...next,
        pools: {
          ...next.pools,
          [poolId]: {
            ...pool,
            lanes: pool.lanes.filter((lane) => lane.id !== laneId),
          },
        },
        shapeDi,
      });
    },
  };
}

/** Creates a command that renames a lane. Unknown ids and unchanged names are no-ops. */
export function renameLaneCommand(
  poolId: string,
  laneId: string,
  name: string,
): BpmnCommand {
  return {
    label: 'Rename lane',
    apply(model: BpmnDiagram): BpmnDiagram {
      const pool = model.pools[poolId];
      const lane = pool?.lanes.find((entry) => entry.id === laneId);
      if (pool === undefined || lane === undefined) {
        return model;
      }
      if ((lane.name ?? '') === name) {
        return model;
      }
      return {
        ...model,
        pools: {
          ...model.pools,
          [poolId]: {
            ...pool,
            lanes: pool.lanes.map((entry) =>
              entry.id === laneId ? { ...entry, name } : entry,
            ),
          },
        },
      };
    },
  };
}

/**
 * Creates a command that sets or clears a call activity's `calledElement`
 * reference. Unknown ids, non-call-activities and unchanged values are no-ops.
 */
export function setCalledElementCommand(
  id: string,
  calledElement: string | undefined,
): BpmnCommand {
  return {
    label: 'Set called element',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (
        !node ||
        node.type !== 'callActivity' ||
        node.calledElement === calledElement
      ) {
        return model;
      }
      const { calledElement: _previous, ...rest } = node;
      const updated =
        calledElement === undefined ? rest : { ...rest, calledElement };
      return { ...model, nodes: { ...model.nodes, [id]: updated } };
    },
  };
}
