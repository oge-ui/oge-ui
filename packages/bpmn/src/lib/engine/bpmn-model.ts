import type { Point, Rect } from './geometry';

/** Event element kinds, including activity-border boundary events (v0.3). */
export type BpmnEventType =
  | 'startEvent'
  | 'endEvent'
  | 'intermediateThrowEvent'
  | 'intermediateCatchEvent'
  | 'boundaryEvent';

/** Activity element kinds, including sub-process containers (v0.3) and call activities (v0.4). */
export type BpmnActivityType =
  | 'task'
  | 'userTask'
  | 'serviceTask'
  | 'scriptTask'
  | 'callActivity'
  | 'subProcess'
  | 'eventSubProcess'
  | 'transaction';

/** The three sub-process container kinds (children carry `parentId`). */
export type BpmnSubProcessType =
  'subProcess' | 'eventSubProcess' | 'transaction';

/** The nine standard BPMN event definition kinds (single definition per event). */
export type BpmnEventDefinitionKind =
  | 'message'
  | 'timer'
  | 'error'
  | 'signal'
  | 'escalation'
  | 'conditional'
  | 'link'
  | 'compensate'
  | 'terminate';

/** Loop/multi-instance/compensation markers rendered at an activity's bottom center. */
export type BpmnActivityMarker =
  'loop' | 'multiInstanceParallel' | 'multiInstanceSequential' | 'compensation';

/** Gateway element kinds supported by the v0.1 semantic subset. */
export type BpmnGatewayType = 'exclusiveGateway' | 'parallelGateway';

/** Every flow-node kind: events, activities and gateways. */
export type BpmnFlowNodeType =
  BpmnEventType | BpmnActivityType | BpmnGatewayType;

/** Data element kinds (v0.4): the page-with-fold object and the cylinder store. */
export type BpmnDataNodeType = 'dataObject' | 'dataStore';

/** Every node kind that can appear on the canvas, including data elements and artifacts. */
export type BpmnNodeType =
  BpmnFlowNodeType | BpmnDataNodeType | 'group' | 'textAnnotation';

/**
 * Every edge kind: sequence flows, annotation associations, cross-pool
 * message flows and data associations (v0.4).
 */
export type BpmnEdgeType =
  'sequenceFlow' | 'association' | 'messageFlow' | 'dataAssociation';

/**
 * A non-annotation node of the diagram: a flow node (event, activity or
 * gateway), a data element (`dataObject`/`dataStore`) or a `group` artifact.
 * Data elements and groups reuse this interface for their shared fields
 * (`name`, `parentId`, `poolId`, `foreignChildren`); flow-node-only fields are
 * simply never set on them.
 */
export interface BpmnFlowNode {
  readonly id: string;
  readonly type: Exclude<BpmnNodeType, 'textAnnotation'>;
  readonly name?: string;
  /** Id of the outgoing sequence flow marked as this gateway's/activity's default flow. */
  readonly defaultFlowId?: string;
  /** Id of the containing sub-process; undefined = direct child of the process. */
  readonly parentId?: string;
  /**
   * Id of the pool (participant) whose process this node belongs to;
   * undefined = the diagram's default process (`BpmnDiagram.processId`).
   * Nested sub-process children carry the same `poolId` as their container.
   */
  readonly poolId?: string;
  /** Call activities only: the `calledElement` process reference. */
  readonly calledElement?: string;
  /** The event's single event definition kind (multiple definitions are not modeled). */
  readonly eventDefinition?: BpmnEventDefinitionKind;
  /** Boundary events only: id of the host activity this event is attached to. */
  readonly attachedToRef?: string;
  /** Boundary events only: false = non-interrupting (dashed rendering). Default true. */
  readonly cancelActivity?: boolean;
  /** Sub-process containers only: true renders the compact [+] form and hides children. */
  readonly collapsed?: boolean;
  /** Activity markers (loop / multi-instance / compensation), rendered bottom-center. */
  readonly markers?: readonly BpmnActivityMarker[];
  /** Serialized child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name (e.g. `camunda:asyncBefore`). */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/** A text-annotation artifact attached to the diagram. */
export interface BpmnTextAnnotation {
  readonly id: string;
  readonly type: 'textAnnotation';
  readonly text: string;
  /** Id of the containing sub-process; undefined = direct child of the process. */
  readonly parentId?: string;
  /** Id of the pool (participant) whose process this annotation belongs to. */
  readonly poolId?: string;
  /** Serialized child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/** Any node of the diagram. */
export type BpmnNode = BpmnFlowNode | BpmnTextAnnotation;

/** A directed sequence flow between two flow nodes. */
export interface BpmnSequenceFlow {
  readonly id: string;
  readonly type: 'sequenceFlow';
  readonly sourceRef: string;
  readonly targetRef: string;
  readonly name?: string;
  readonly conditionExpression?: string;
  /** Serialized child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/** An association connecting a text annotation with another element. */
export interface BpmnAssociation {
  readonly id: string;
  readonly type: 'association';
  readonly sourceRef: string;
  readonly targetRef: string;
  /** Serialized child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/**
 * A message flow between elements of different pools. Either endpoint may be
 * a participant (pool) id or a flow-node id; serialized inside the
 * `<bpmn:collaboration>` element.
 */
export interface BpmnMessageFlow {
  readonly id: string;
  readonly type: 'messageFlow';
  readonly sourceRef: string;
  readonly targetRef: string;
  readonly name?: string;
  /** Serialized child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/**
 * A data association between a data element (`dataObject`/`dataStore`) and an
 * activity. v0.4 serialization simplification (documented in the roadmap):
 * the edge is written as `<bpmn:dataOutputAssociation>` inside the source
 * activity or `<bpmn:dataInputAssociation>` inside the target activity.
 */
export interface BpmnDataAssociation {
  readonly id: string;
  readonly type: 'dataAssociation';
  readonly sourceRef: string;
  readonly targetRef: string;
  /** Serialized child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/** Any edge of the diagram. */
export type BpmnEdge =
  BpmnSequenceFlow | BpmnAssociation | BpmnMessageFlow | BpmnDataAssociation;

/** A swimlane of a pool; membership is the ordered `flowNodeRefs` id list. */
export interface BpmnLane {
  readonly id: string;
  readonly name?: string;
  /** Ids of the top-level flow nodes assigned to this lane, in document order. */
  readonly flowNodeRefs: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/**
 * A pool (collaboration participant). A pool without a `processRef` is a
 * black-box pool: it renders as an empty band and is a valid message-flow
 * endpoint, but has no process contents.
 */
export interface BpmnPool {
  readonly id: string;
  readonly name?: string;
  /** Id of the participant's process; undefined = black-box pool. */
  readonly processRef?: string;
  /** The pool's lanes, top to bottom. Empty when the pool has no lane set. */
  readonly lanes: readonly BpmnLane[];
  /**
   * `name` attribute of this pool's own `<bpmn:process>`. Unused for the pool
   * whose `processRef` equals `BpmnDiagram.processId` — the default process
   * carries its name in `BpmnDiagram.processName`.
   */
  readonly processName?: string;
  /** `isExecutable` of this pool's own process (same default-process caveat). */
  readonly processExecutable?: boolean;
  /** Unknown attributes of this pool's own `<bpmn:process>`, preserved verbatim. */
  readonly processForeignAttributes?: Readonly<Record<string, string>>;
  /** Serialized `<bpmn:participant>` child fragments preserved verbatim. */
  readonly foreignChildren?: readonly string[];
  /** Unknown attributes preserved verbatim by qualified name. */
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

/** Diagram-interchange data of a node, pool or lane shape. */
export interface BpmnShapeDi {
  readonly bounds: Rect;
  readonly labelBounds?: Rect;
  /** Pools and lanes only: DI `isHorizontal`. Absent on the wire when undefined. */
  readonly horizontal?: boolean;
  /** Custom fill color (any CSS color string), serialized as `bioc:fill`. */
  readonly fill?: string;
  /** Custom stroke color (any CSS color string), serialized as `bioc:stroke`. */
  readonly stroke?: string;
}

/** Diagram-interchange data of an edge. */
export interface BpmnEdgeDi {
  readonly waypoints: readonly Point[];
  readonly labelBounds?: Rect;
  /** Custom fill color (any CSS color string), serialized as `bioc:fill`. */
  readonly fill?: string;
  /** Custom stroke color (any CSS color string), serialized as `bioc:stroke`. */
  readonly stroke?: string;
  /**
   * True after the waypoints were hand-edited (`updateWaypointsCommand`).
   * Manual edges are translated instead of re-routed when both endpoints move
   * together; moving a single endpoint re-routes and clears the flag. Runtime
   * only — the flag is not serialized to BPMN XML (the DI waypoints carry the
   * geometry), so it is lost on an XML export/import round trip.
   */
  readonly manual?: boolean;
}

/**
 * The complete immutable diagram model: the default process, optional
 * collaboration pools and the diagram-interchange data. All nodes and edges
 * of every pool's process live in the single flat maps; a node's `poolId`
 * decides which `<bpmn:process>` it is serialized into.
 */
export interface BpmnDiagram {
  readonly processId: string;
  readonly processName?: string;
  readonly isExecutable: boolean;
  /** Unknown attributes of the default `<bpmn:process>`, preserved verbatim. */
  readonly processForeignAttributes?: Readonly<Record<string, string>>;
  /** Unknown attributes of the `<bpmn:collaboration>`, preserved verbatim. */
  readonly collaborationForeignAttributes?: Readonly<Record<string, string>>;
  /** Id of the `<bpmn:collaboration>` element; undefined when there are no pools. */
  readonly collaborationId?: string;
  /** Pools (participants) by id, in participant document order. */
  readonly pools: Readonly<Record<string, BpmnPool>>;
  readonly nodes: Readonly<Record<string, BpmnNode>>;
  readonly edges: Readonly<Record<string, BpmnEdge>>;
  /** Document order of every node and edge id, used for deterministic serialization. */
  readonly order: readonly string[];
  readonly shapeDi: Readonly<Record<string, BpmnShapeDi>>;
  readonly edgeDi: Readonly<Record<string, BpmnEdgeDi>>;
  /**
   * Attributes carried on `<definitions>`: id, targetNamespace, exporter,
   * exporterVersion, every unknown attribute (preserved verbatim) and every
   * non-standard `xmlns:*` declaration (e.g. `xmlns:camunda`), so preserved
   * prefixed attributes stay declared on export.
   */
  readonly definitionsAttrs: Readonly<Record<string, string>>;
  /** Serialized definitions-level child fragments preserved verbatim for round-trip fidelity. */
  readonly foreignDefinitionsChildren: readonly string[];
}

/** Default shape sizes per node type, matching bpmn-js conventions. */
export const DEFAULT_SIZES: Readonly<
  Record<BpmnNodeType, { width: number; height: number }>
> = {
  task: { width: 100, height: 80 },
  userTask: { width: 100, height: 80 },
  serviceTask: { width: 100, height: 80 },
  scriptTask: { width: 100, height: 80 },
  callActivity: { width: 100, height: 80 },
  subProcess: { width: 100, height: 80 },
  eventSubProcess: { width: 100, height: 80 },
  transaction: { width: 100, height: 80 },
  startEvent: { width: 36, height: 36 },
  endEvent: { width: 36, height: 36 },
  intermediateThrowEvent: { width: 36, height: 36 },
  intermediateCatchEvent: { width: 36, height: 36 },
  boundaryEvent: { width: 36, height: 36 },
  exclusiveGateway: { width: 50, height: 50 },
  parallelGateway: { width: 50, height: 50 },
  dataObject: { width: 36, height: 50 },
  dataStore: { width: 50, height: 50 },
  group: { width: 300, height: 200 },
  textAnnotation: { width: 100, height: 30 },
};

/** Default bounds of a sub-process expanded via `toggleSubProcessCollapseCommand`. */
export const SUBPROCESS_EXPANDED_SIZE = { width: 350, height: 200 } as const;

/** Default bounds of a pool created via `addPoolCommand` (horizontal, no lanes). */
export const POOL_DEFAULT_SIZE = { width: 600, height: 250 } as const;

/** Minimum pool size enforced by the resize gesture. */
export const POOL_MIN_SIZE = { width: 300, height: 150 } as const;

/** Width of the vertical name strip on the left edge of a horizontal pool. */
export const POOL_HEADER_WIDTH = 30;

/** Height of a lane appended to a pool that already has lanes. */
export const LANE_DEFAULT_HEIGHT = 120;

/**
 * Minimum shape sizes for the resizable node types. Only activities and text
 * annotations are resizable (events and gateways have a fixed BPMN size, as in
 * bpmn-js), so only those types have an entry.
 */
export const MIN_SIZES: Readonly<
  Partial<Record<BpmnNodeType, { width: number; height: number }>>
> = {
  task: { width: 80, height: 60 },
  userTask: { width: 80, height: 60 },
  serviceTask: { width: 80, height: 60 },
  scriptTask: { width: 80, height: 60 },
  callActivity: { width: 80, height: 60 },
  subProcess: { width: 200, height: 120 },
  eventSubProcess: { width: 200, height: 120 },
  transaction: { width: 200, height: 120 },
  group: { width: 100, height: 80 },
  textAnnotation: { width: 60, height: 24 },
};

/** True for every event node type (including boundary events). */
export function isBpmnEventType(type: string): type is BpmnEventType {
  return (
    type === 'startEvent' ||
    type === 'endEvent' ||
    type === 'intermediateThrowEvent' ||
    type === 'intermediateCatchEvent' ||
    type === 'boundaryEvent'
  );
}

/** True for every activity node type (tasks, call activities and sub-process containers). */
export function isBpmnActivityType(type: string): type is BpmnActivityType {
  return (
    type === 'task' ||
    type === 'userTask' ||
    type === 'serviceTask' ||
    type === 'scriptTask' ||
    type === 'callActivity' ||
    isBpmnSubProcessType(type)
  );
}

/** True for the two data element node types. */
export function isBpmnDataNodeType(type: string): type is BpmnDataNodeType {
  return type === 'dataObject' || type === 'dataStore';
}

/** True for every flow-node type (events, activities, gateways) — the lane-assignable kinds. */
export function isBpmnFlowNodeType(type: string): type is BpmnFlowNodeType {
  return (
    isBpmnEventType(type) ||
    isBpmnActivityType(type) ||
    type === 'exclusiveGateway' ||
    type === 'parallelGateway'
  );
}

/** True for the three sub-process container types. */
export function isBpmnSubProcessType(type: string): type is BpmnSubProcessType {
  return (
    type === 'subProcess' ||
    type === 'eventSubProcess' ||
    type === 'transaction'
  );
}

/**
 * Which event definition kinds each event position accepts (BPMN 2.0 table
 * 10.87 subset). v0.3 simplification: `error` on a start event is allowed
 * unconditionally although the spec restricts it to event sub-processes.
 */
export const VALID_EVENT_DEFINITIONS: Readonly<
  Record<BpmnEventType, readonly BpmnEventDefinitionKind[]>
> = {
  startEvent: [
    'message',
    'timer',
    'signal',
    'conditional',
    'escalation',
    'error',
  ],
  endEvent: [
    'message',
    'error',
    'signal',
    'escalation',
    'terminate',
    'compensate',
  ],
  intermediateCatchEvent: ['message', 'timer', 'signal', 'conditional', 'link'],
  intermediateThrowEvent: [
    'message',
    'signal',
    'escalation',
    'link',
    'compensate',
  ],
  boundaryEvent: [
    'message',
    'timer',
    'error',
    'signal',
    'escalation',
    'conditional',
    'compensate',
  ],
};

/**
 * Collects every node hidden by a collapsed ancestor sub-process: direct and
 * transitive children (by `parentId`) of any collapsed container. A boundary
 * event attached to a collapsed sub-process stays visible — its `parentId` is
 * the host's parent, not the host. Rendering, export DI and auto-layout skip
 * hidden nodes (edges touching a hidden node are hidden too).
 */
export function hiddenByCollapsed(model: BpmnDiagram): ReadonlySet<string> {
  const hidden = new Set<string>();
  const isHidden = (id: string, guard: number): boolean => {
    if (guard > 100) {
      return false; // defensive: broken parent cycles never hide anything
    }
    const node = model.nodes[id];
    if (!node || node.parentId === undefined) {
      return false;
    }
    const parent = model.nodes[node.parentId];
    if (parent === undefined) {
      return false;
    }
    if (parent.type !== 'textAnnotation' && parent.collapsed === true) {
      return true;
    }
    return isHidden(node.parentId, guard + 1);
  };
  for (const id of Object.keys(model.nodes)) {
    if (isHidden(id, 0)) {
      hidden.add(id);
    }
  }
  return hidden;
}

/** Creates an empty diagram with default `<definitions>` attributes. */
export function createEmptyDiagram(processId = 'Process_1'): BpmnDiagram {
  return {
    processId,
    isExecutable: false,
    pools: {},
    nodes: {},
    edges: {},
    order: [],
    shapeDi: {},
    edgeDi: {},
    definitionsAttrs: {
      id: 'Definitions_1',
      targetNamespace: 'http://ogeui.com/schema/bpmn',
    },
    foreignDefinitionsChildren: [],
  };
}

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Generates a bpmn-js-style id like `Activity_0h1x2y3`, retrying while the id is taken. */
export function generateBpmnId(
  prefix: string,
  taken: ReadonlySet<string>,
  random: () => number = Math.random,
): string {
  for (;;) {
    let suffix = '';
    for (let i = 0; i < 7; i++) {
      suffix += BASE36[Math.floor(random() * 36) % 36];
    }
    const id = `${prefix}_${suffix}`;
    if (!taken.has(id)) {
      return id;
    }
  }
}

/**
 * Collects every id already used by the model: order entries, the process id,
 * the collaboration id and every pool, lane and pool-process id.
 */
export function takenIds(model: BpmnDiagram): ReadonlySet<string> {
  const ids = new Set<string>(model.order);
  ids.add(model.processId);
  if (model.collaborationId !== undefined) {
    ids.add(model.collaborationId);
  }
  for (const pool of Object.values(model.pools)) {
    ids.add(pool.id);
    if (pool.processRef !== undefined) {
      ids.add(pool.processRef);
    }
    for (const lane of pool.lanes) {
      ids.add(lane.id);
    }
  }
  return ids;
}

/**
 * The effective pool of an element: the id itself when it is a pool, a node's
 * `poolId`, or — for nodes without one — the pool whose `processRef` is the
 * diagram's default process. Undefined when the element belongs to no pool.
 */
export function effectivePoolId(
  model: BpmnDiagram,
  id: string,
): string | undefined {
  if (model.pools[id] !== undefined) {
    return id;
  }
  const node = model.nodes[id];
  if (node === undefined) {
    return undefined;
  }
  if (node.poolId !== undefined && model.pools[node.poolId] !== undefined) {
    return node.poolId;
  }
  for (const pool of Object.values(model.pools)) {
    if (pool.processRef === model.processId) {
      return pool.id;
    }
  }
  return undefined;
}

/** The topmost pool whose DI bounds contain the point, or undefined. */
export function poolAtPoint(model: BpmnDiagram, pt: Point): string | undefined {
  let found: string | undefined;
  for (const poolId of Object.keys(model.pools)) {
    const di = model.shapeDi[poolId];
    if (
      di !== undefined &&
      pt.x >= di.bounds.x &&
      pt.x <= di.bounds.x + di.bounds.width &&
      pt.y >= di.bounds.y &&
      pt.y <= di.bounds.y + di.bounds.height
    ) {
      found = poolId;
    }
  }
  return found;
}

/** Returns the id prefix used when generating ids for the given element type. */
export function idPrefixFor(type: BpmnNodeType | BpmnEdgeType): string {
  switch (type) {
    case 'task':
    case 'userTask':
    case 'serviceTask':
    case 'scriptTask':
    case 'callActivity':
    case 'subProcess':
    case 'eventSubProcess':
    case 'transaction':
      return 'Activity';
    case 'startEvent':
    case 'endEvent':
    case 'intermediateThrowEvent':
    case 'intermediateCatchEvent':
    case 'boundaryEvent':
      return 'Event';
    case 'exclusiveGateway':
    case 'parallelGateway':
      return 'Gateway';
    case 'sequenceFlow':
    case 'messageFlow':
      return 'Flow';
    case 'dataObject':
      return 'DataObjectReference';
    case 'dataStore':
      return 'DataStoreReference';
    case 'group':
      return 'Group';
    case 'textAnnotation':
      return 'TextAnnotation';
    case 'association':
      return 'Association';
    case 'dataAssociation':
      return 'DataAssociation';
  }
}
