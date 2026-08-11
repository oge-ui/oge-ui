import type { BpmnDiagram } from './bpmn-model';

/**
 * Versioned JSON envelope for persisting a diagram to an application database.
 * The payload is the engine's immutable {@link BpmnDiagram} as-is; `version`
 * guards forward compatibility of the envelope shape.
 */
export interface BpmnDiagramJson {
  readonly version: 1;
  readonly diagram: BpmnDiagram;
}

/** Result of {@link fromBpmnJson}: the model, or null plus an error message. */
export interface BpmnJsonParseResult {
  readonly model: BpmnDiagram | null;
  readonly error?: string;
}

/** Wraps the diagram model in the versioned JSON persistence envelope. */
export function toBpmnJson(model: BpmnDiagram): BpmnDiagramJson {
  return { version: 1, diagram: model };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPoint(value: unknown): boolean {
  return (
    isRecord(value) && isFiniteNumber(value['x']) && isFiniteNumber(value['y'])
  );
}

function isRect(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value['x']) &&
    isFiniteNumber(value['y']) &&
    isFiniteNumber(value['width']) &&
    isFiniteNumber(value['height'])
  );
}

function fail(error: string): BpmnJsonParseResult {
  return { model: null, error };
}

/**
 * Structurally validates a value produced by {@link toBpmnJson} (typically
 * after a `JSON.parse` round trip through a database) and returns the diagram
 * model, or an error describing the first problem found. Unknown extra keys
 * anywhere in the envelope or diagram are tolerated for forward compatibility;
 * version mismatches, missing required maps and broken id cross-references
 * (order entries, edge endpoint refs, default-flow refs, DI keys) are not.
 */
export function fromBpmnJson(value: unknown): BpmnJsonParseResult {
  if (!isRecord(value)) {
    return fail('Not a JSON object');
  }
  if (value['version'] !== 1) {
    return fail(`Unsupported version: ${String(value['version'])}`);
  }
  const diagram = value['diagram'];
  if (!isRecord(diagram)) {
    return fail('Missing "diagram" object');
  }
  if (typeof diagram['processId'] !== 'string') {
    return fail('diagram.processId must be a string');
  }
  if (
    diagram['processName'] !== undefined &&
    typeof diagram['processName'] !== 'string'
  ) {
    return fail('diagram.processName must be a string when present');
  }
  if (typeof diagram['isExecutable'] !== 'boolean') {
    return fail('diagram.isExecutable must be a boolean');
  }
  for (const key of ['nodes', 'edges', 'shapeDi', 'edgeDi'] as const) {
    if (!isRecord(diagram[key])) {
      return fail(`diagram.${key} must be an object map`);
    }
  }
  const order = diagram['order'];
  if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
    return fail('diagram.order must be an array of strings');
  }
  if (
    diagram['collaborationId'] !== undefined &&
    typeof diagram['collaborationId'] !== 'string'
  ) {
    return fail('diagram.collaborationId must be a string when present');
  }
  const poolsRaw = diagram['pools'];
  if (poolsRaw !== undefined && !isRecord(poolsRaw)) {
    return fail('diagram.pools must be an object map when present');
  }
  const pools = (poolsRaw ?? {}) as Record<string, unknown>;
  const laneIds = new Set<string>();
  for (const [id, pool] of Object.entries(pools)) {
    if (!isRecord(pool) || !Array.isArray(pool['lanes'])) {
      return fail(`pool "${id}" is malformed`);
    }
    for (const lane of pool['lanes']) {
      if (
        !isRecord(lane) ||
        typeof lane['id'] !== 'string' ||
        !Array.isArray(lane['flowNodeRefs'])
      ) {
        return fail(`pool "${id}" has a malformed lane`);
      }
      laneIds.add(lane['id']);
    }
  }
  const nodes = diagram['nodes'] as Record<string, unknown>;
  const edges = diagram['edges'] as Record<string, unknown>;
  for (const id of order as string[]) {
    if (nodes[id] === undefined && edges[id] === undefined) {
      return fail(`order entry "${id}" is neither a node nor an edge`);
    }
  }
  for (const [id, node] of Object.entries(nodes)) {
    if (!isRecord(node) || typeof node['type'] !== 'string') {
      return fail(`node "${id}" is malformed`);
    }
    const defaultFlowId = node['defaultFlowId'];
    if (defaultFlowId !== undefined) {
      if (
        typeof defaultFlowId !== 'string' ||
        edges[defaultFlowId] === undefined
      ) {
        return fail(`node "${id}" references unknown default flow`);
      }
    }
  }
  for (const [id, edge] of Object.entries(edges)) {
    if (
      !isRecord(edge) ||
      typeof edge['sourceRef'] !== 'string' ||
      typeof edge['targetRef'] !== 'string'
    ) {
      return fail(`edge "${id}" is malformed`);
    }
    // Message-flow endpoints may be pool (participant) ids.
    if (
      nodes[edge['sourceRef']] === undefined &&
      pools[edge['sourceRef']] === undefined
    ) {
      return fail(
        `edge "${id}" references unknown source "${edge['sourceRef']}"`,
      );
    }
    if (
      nodes[edge['targetRef']] === undefined &&
      pools[edge['targetRef']] === undefined
    ) {
      return fail(
        `edge "${id}" references unknown target "${edge['targetRef']}"`,
      );
    }
  }
  const shapeDi = diagram['shapeDi'] as Record<string, unknown>;
  for (const [id, di] of Object.entries(shapeDi)) {
    if (
      nodes[id] === undefined &&
      pools[id] === undefined &&
      !laneIds.has(id)
    ) {
      return fail(`shapeDi entry "${id}" has no matching node, pool or lane`);
    }
    if (!isRecord(di) || !isRect(di['bounds'])) {
      return fail(`shapeDi entry "${id}" has invalid bounds`);
    }
  }
  const edgeDi = diagram['edgeDi'] as Record<string, unknown>;
  for (const [id, di] of Object.entries(edgeDi)) {
    if (edges[id] === undefined) {
      return fail(`edgeDi entry "${id}" has no matching edge`);
    }
    if (
      !isRecord(di) ||
      !Array.isArray(di['waypoints']) ||
      di['waypoints'].some((p) => !isPoint(p))
    ) {
      return fail(`edgeDi entry "${id}" has invalid waypoints`);
    }
  }
  const definitionsAttrs = isRecord(diagram['definitionsAttrs'])
    ? (diagram['definitionsAttrs'] as Record<string, string>)
    : {
        id: 'Definitions_1',
        targetNamespace: 'http://ogeui.com/schema/bpmn',
      };
  const foreignDefinitionsChildren = Array.isArray(
    diagram['foreignDefinitionsChildren'],
  )
    ? (diagram['foreignDefinitionsChildren'] as string[])
    : [];
  const model: BpmnDiagram = structuredClone({
    ...(diagram as unknown as BpmnDiagram),
    // Envelopes written before v0.4 carry no pools map; default to none.
    pools: (poolsRaw ?? {}) as BpmnDiagram['pools'],
    definitionsAttrs,
    foreignDefinitionsChildren,
  });
  return { model };
}
