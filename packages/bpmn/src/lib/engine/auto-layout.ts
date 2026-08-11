import type { BpmnDiagram, BpmnEdgeDi, BpmnShapeDi } from './bpmn-model';
import {
  DEFAULT_SIZES,
  POOL_DEFAULT_SIZE,
  POOL_HEADER_WIDTH,
  effectivePoolId,
  hiddenByCollapsed,
} from './bpmn-model';
import { routeOrthogonal } from './edge-routing';

const COLUMN_ORIGIN_X = 80;
const COLUMN_GAP = 180;
const ROW_ORIGIN_Y = 80;
const ROW_GAP = 120;
const POOL_GAP = 50;
const POOL_PADDING = 40;

/**
 * Fills in missing diagram-interchange data: nodes without a shape are placed by topological
 * layering over the sequence flows (cycles fall back to remaining document order), then edges
 * without waypoints are routed orthogonally. Children hidden inside collapsed sub-processes
 * are skipped entirely (they get positions when the container is expanded), boundary events
 * are docked onto their host's bottom border, and visible sub-process children without DI
 * are placed inside their parent's bounds. Pools without DI (v0.4) are stacked vertically
 * below the existing content, their members laid out inside the band and the pool bounds
 * fitted around them; lanes without DI split their pool's body evenly. Returns the same
 * reference when nothing is missing.
 */
export function placeMissingDi(model: BpmnDiagram): BpmnDiagram {
  const hidden = hiddenByCollapsed(model);
  const missingNodes = Object.keys(model.nodes).filter(
    (id) => !model.shapeDi[id] && !hidden.has(id),
  );
  const missingEdges = Object.keys(model.edges).filter((id) => {
    const edge = model.edges[id];
    return (
      !model.edgeDi[id] &&
      !hidden.has(edge.sourceRef) &&
      !hidden.has(edge.targetRef)
    );
  });
  const missingPools = Object.keys(model.pools).filter(
    (id) => !model.shapeDi[id],
  );
  const missingLanes: { poolId: string; laneId: string }[] = [];
  for (const pool of Object.values(model.pools)) {
    for (const lane of pool.lanes) {
      if (!model.shapeDi[lane.id]) {
        missingLanes.push({ poolId: pool.id, laneId: lane.id });
      }
    }
  }
  if (
    missingNodes.length === 0 &&
    missingEdges.length === 0 &&
    missingPools.length === 0 &&
    missingLanes.length === 0
  ) {
    return model;
  }

  let shapeDi: Record<string, BpmnShapeDi> = model.shapeDi as Record<
    string,
    BpmnShapeDi
  >;
  if (
    missingNodes.length > 0 ||
    missingPools.length > 0 ||
    missingLanes.length > 0
  ) {
    shapeDi = { ...model.shapeDi };
    const layers = layerNodes(model);
    const missingPoolSet = new Set(missingPools);
    // DI-less pools are stacked below everything that already has bounds.
    let bandCursor = ROW_ORIGIN_Y;
    for (const di of Object.values(shapeDi)) {
      bandCursor = Math.max(
        bandCursor,
        di.bounds.y + di.bounds.height + POOL_GAP,
      );
    }
    /** Vertical band origin per DI-less pool, assigned in pools order. */
    const bandTops = new Map<string, number>();
    const rowsUsed = new Map<string, number>();
    const childrenPlaced = new Map<string, number>();
    const boundariesPlaced = new Map<string, number>();
    const placeGeneric = (id: string, poolKey: string | undefined): void => {
      const node = model.nodes[id];
      if (!node) {
        return;
      }
      const size = DEFAULT_SIZES[node.type];
      const layer = layers.get(id) ?? 0;
      const rowKey = `${poolKey ?? ''}:${layer}`;
      const row = rowsUsed.get(rowKey) ?? 0;
      rowsUsed.set(rowKey, row + 1);
      const originY =
        poolKey !== undefined
          ? (bandTops.get(poolKey) ?? ROW_ORIGIN_Y) + POOL_PADDING
          : ROW_ORIGIN_Y;
      const originX =
        poolKey !== undefined
          ? COLUMN_ORIGIN_X + POOL_HEADER_WIDTH
          : COLUMN_ORIGIN_X;
      shapeDi[id] = {
        bounds: {
          x: originX + layer * COLUMN_GAP,
          y: originY + row * ROW_GAP,
          width: size.width,
          height: size.height,
        },
      };
    };
    // Pass 1: DI-less pools with their members, in pools order.
    for (const poolId of Object.keys(model.pools)) {
      if (!missingPoolSet.has(poolId)) {
        continue;
      }
      bandTops.set(poolId, bandCursor);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const id of model.order) {
        const node = model.nodes[id];
        if (!node || hidden.has(id) || effectivePoolId(model, id) !== poolId) {
          continue;
        }
        // Nested children and boundary events wait for pass 2 (they are
        // placed relative to their container/host inside the band).
        const deferred =
          node.parentId !== undefined ||
          (node.type !== 'textAnnotation' && node.attachedToRef !== undefined);
        if (!shapeDi[id] && !deferred) {
          placeGeneric(id, poolId);
        }
        const b = shapeDi[id]?.bounds;
        if (b) {
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.width);
          maxY = Math.max(maxY, b.y + b.height);
        }
      }
      const bounds =
        minX === Infinity
          ? {
              x: COLUMN_ORIGIN_X,
              y: bandCursor,
              width: POOL_DEFAULT_SIZE.width,
              height: POOL_DEFAULT_SIZE.height,
            }
          : {
              x: minX - POOL_HEADER_WIDTH - POOL_PADDING,
              y: minY - POOL_PADDING,
              width: Math.max(
                maxX - minX + POOL_HEADER_WIDTH + 2 * POOL_PADDING,
                POOL_DEFAULT_SIZE.width,
              ),
              height: Math.max(
                maxY - minY + 2 * POOL_PADDING,
                POOL_DEFAULT_SIZE.height,
              ),
            };
      shapeDi[poolId] = { bounds, horizontal: true };
      bandCursor = bounds.y + bounds.height + POOL_GAP;
    }
    // Pass 2: remaining nodes (boundary events, sub-process children, plain).
    for (const id of model.order) {
      const node = model.nodes[id];
      if (!node || shapeDi[id] || hidden.has(id)) {
        continue;
      }
      const size = DEFAULT_SIZES[node.type];
      // Boundary events dock onto the host's bottom border.
      if (node.type !== 'textAnnotation' && node.attachedToRef !== undefined) {
        const hostDi = shapeDi[node.attachedToRef];
        if (hostDi) {
          const index = boundariesPlaced.get(node.attachedToRef) ?? 0;
          boundariesPlaced.set(node.attachedToRef, index + 1);
          shapeDi[id] = {
            bounds: {
              x:
                hostDi.bounds.x +
                hostDi.bounds.width / 2 -
                size.width / 2 +
                index * (size.width + 6),
              y: hostDi.bounds.y + hostDi.bounds.height - size.height / 2,
              width: size.width,
              height: size.height,
            },
          };
          continue;
        }
      }
      // Visible children of an expanded sub-process are placed inside it.
      if (node.parentId !== undefined) {
        const parentDi = shapeDi[node.parentId];
        if (parentDi) {
          const index = childrenPlaced.get(node.parentId) ?? 0;
          childrenPlaced.set(node.parentId, index + 1);
          shapeDi[id] = {
            bounds: {
              x: parentDi.bounds.x + 30 + index * 120,
              y: parentDi.bounds.y + 50,
              width: size.width,
              height: size.height,
            },
          };
          continue;
        }
      }
      // Members of a pool that has DI are placed inside its band.
      const poolId = effectivePoolId(model, id);
      const poolDi = poolId !== undefined ? shapeDi[poolId] : undefined;
      if (poolDi !== undefined && node.parentId === undefined) {
        const index = childrenPlaced.get(`pool:${poolId}`) ?? 0;
        childrenPlaced.set(`pool:${poolId}`, index + 1);
        shapeDi[id] = {
          bounds: {
            x: poolDi.bounds.x + POOL_HEADER_WIDTH + 30 + index * 130,
            y: poolDi.bounds.y + POOL_PADDING,
            width: size.width,
            height: size.height,
          },
        };
        continue;
      }
      placeGeneric(id, undefined);
    }
    // Lanes without DI split their pool's body evenly, top to bottom.
    for (const pool of Object.values(model.pools)) {
      const poolDi = shapeDi[pool.id];
      if (
        poolDi === undefined ||
        pool.lanes.length === 0 ||
        pool.lanes.every((lane) => shapeDi[lane.id] !== undefined)
      ) {
        continue;
      }
      const laneHeight = poolDi.bounds.height / pool.lanes.length;
      for (let i = 0; i < pool.lanes.length; i++) {
        const lane = pool.lanes[i];
        if (shapeDi[lane.id] !== undefined) {
          continue;
        }
        shapeDi[lane.id] = {
          bounds: {
            x: poolDi.bounds.x + POOL_HEADER_WIDTH,
            y: Math.round(poolDi.bounds.y + i * laneHeight),
            width: poolDi.bounds.width - POOL_HEADER_WIDTH,
            height: Math.round(laneHeight),
          },
          horizontal: true,
        };
      }
    }
  }

  let edgeDi: Record<string, BpmnEdgeDi> = model.edgeDi as Record<
    string,
    BpmnEdgeDi
  >;
  if (missingEdges.length > 0) {
    edgeDi = { ...model.edgeDi };
    for (const id of missingEdges) {
      const edge = model.edges[id];
      const sourceDi = shapeDi[edge.sourceRef];
      const targetDi = shapeDi[edge.targetRef];
      if (!sourceDi || !targetDi) {
        continue;
      }
      edgeDi[id] = {
        waypoints: routeOrthogonal(sourceDi.bounds, targetDi.bounds),
      };
    }
  }

  return { ...model, shapeDi, edgeDi };
}

/** Assigns a topological layer to every node via Kahn's algorithm over the sequence flows. */
function layerNodes(model: BpmnDiagram): Map<string, number> {
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const id of Object.keys(model.nodes)) {
    inDegree.set(id, 0);
    outgoing.set(id, []);
  }
  for (const edge of Object.values(model.edges)) {
    if (edge.type !== 'sequenceFlow') {
      continue;
    }
    if (!inDegree.has(edge.sourceRef) || !inDegree.has(edge.targetRef)) {
      continue;
    }
    inDegree.set(edge.targetRef, (inDegree.get(edge.targetRef) ?? 0) + 1);
    outgoing.get(edge.sourceRef)?.push(edge.targetRef);
  }

  const layers = new Map<string, number>();
  let frontier = model.order.filter(
    (id) => model.nodes[id] && inDegree.get(id) === 0,
  );
  let layer = 0;
  const remainingDegree = new Map(inDegree);
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      layers.set(id, layer);
      for (const targetId of outgoing.get(id) ?? []) {
        const degree = (remainingDegree.get(targetId) ?? 0) - 1;
        remainingDegree.set(targetId, degree);
        if (degree === 0) {
          next.push(targetId);
        }
      }
    }
    frontier = next;
    layer++;
  }

  // Cycle fallback: nodes never reaching in-degree 0 get successive layers in document order.
  for (const id of model.order) {
    if (model.nodes[id] && !layers.has(id)) {
      layers.set(id, layer);
      layer++;
    }
  }
  return layers;
}
