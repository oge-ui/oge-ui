import type {
  BpmnDiagram,
  BpmnEdgeType,
  BpmnFlowNodeType,
  BpmnNode,
} from './bpmn-model';
import {
  effectivePoolId,
  isBpmnActivityType,
  isBpmnDataNodeType,
  isBpmnEventType,
} from './bpmn-model';

/** Why a requested connection is not allowed. */
export type BpmnConnectDenialReason =
  | 'self-connection'
  | 'source-is-end-event'
  | 'target-is-start-event'
  | 'duplicate-flow'
  | 'annotation-needs-association'
  | 'association-needs-annotation'
  | 'boundary-cannot-receive'
  | 'cross-boundary-flow'
  | 'cross-pool-flow'
  | 'message-flow-same-pool'
  | 'message-flow-invalid-endpoint'
  | 'data-association-needs-data'
  | 'data-association-needs-activity'
  | 'sequence-flow-needs-flow-node'
  | 'unknown-element';

/** Why a requested type morph is not allowed. */
export type BpmnMorphDenialReason =
  | 'not-in-morph-group'
  | 'source-is-end-event'
  | 'target-is-start-event'
  | 'unknown-element';

/** Result of a rule check (connection or morph). */
export interface BpmnRuleResult {
  readonly allowed: boolean;
  readonly reason?: BpmnConnectDenialReason | BpmnMorphDenialReason;
}

const ALLOWED: BpmnRuleResult = { allowed: true };

function deny(
  reason: BpmnConnectDenialReason | BpmnMorphDenialReason,
): BpmnRuleResult {
  return { allowed: false, reason };
}

function duplicateOf(
  model: BpmnDiagram,
  kind: BpmnEdgeType,
  sourceId: string,
  targetId: string,
  bidirectional: boolean,
): boolean {
  for (const edge of Object.values(model.edges)) {
    if (edge.type !== kind) {
      continue;
    }
    if (edge.sourceRef === sourceId && edge.targetRef === targetId) {
      return true;
    }
    if (
      bidirectional &&
      edge.sourceRef === targetId &&
      edge.targetRef === sourceId
    ) {
      return true;
    }
  }
  return false;
}

/** True for element kinds a message flow may start or end at: pools, activities and events. */
function isMessageFlowEndpoint(
  model: BpmnDiagram,
  id: string,
  node: BpmnNode | undefined,
): boolean {
  if (model.pools[id] !== undefined) {
    return true;
  }
  if (node === undefined || node.type === 'textAnnotation') {
    return false;
  }
  return isBpmnActivityType(node.type) || isBpmnEventType(node.type);
}

/**
 * Checks whether an edge of the given kind may connect `sourceId` to
 * `targetId`. Endpoints may be node ids or — for message flows — pool ids.
 */
export function canConnect(
  model: BpmnDiagram,
  kind: BpmnEdgeType,
  sourceId: string,
  targetId: string,
): BpmnRuleResult {
  const source = model.nodes[sourceId];
  const target = model.nodes[targetId];
  const sourceKnown =
    source !== undefined || model.pools[sourceId] !== undefined;
  const targetKnown =
    target !== undefined || model.pools[targetId] !== undefined;
  if (!sourceKnown || !targetKnown) {
    return deny('unknown-element');
  }
  if (sourceId === targetId) {
    return deny('self-connection');
  }
  if (kind === 'messageFlow') {
    if (
      !isMessageFlowEndpoint(model, sourceId, source) ||
      !isMessageFlowEndpoint(model, targetId, target)
    ) {
      return deny('message-flow-invalid-endpoint');
    }
    const sourcePool = effectivePoolId(model, sourceId);
    const targetPool = effectivePoolId(model, targetId);
    if (
      sourcePool === targetPool ||
      sourcePool === undefined ||
      targetPool === undefined
    ) {
      return deny('message-flow-same-pool');
    }
    if (duplicateOf(model, 'messageFlow', sourceId, targetId, false)) {
      return deny('duplicate-flow');
    }
    return ALLOWED;
  }
  if (source === undefined || target === undefined) {
    // Pools are valid endpoints for message flows only.
    return kind === 'sequenceFlow'
      ? deny('sequence-flow-needs-flow-node')
      : kind === 'association'
        ? deny('association-needs-annotation')
        : deny('data-association-needs-data');
  }
  if (kind === 'sequenceFlow') {
    if (source.type === 'textAnnotation' || target.type === 'textAnnotation') {
      return deny('annotation-needs-association');
    }
    if (
      isBpmnDataNodeType(source.type) ||
      isBpmnDataNodeType(target.type) ||
      source.type === 'group' ||
      target.type === 'group'
    ) {
      return deny('sequence-flow-needs-flow-node');
    }
    if (source.type === 'endEvent') {
      return deny('source-is-end-event');
    }
    if (target.type === 'startEvent') {
      return deny('target-is-start-event');
    }
    if (target.type === 'boundaryEvent') {
      return deny('boundary-cannot-receive');
    }
    if (effectivePoolId(model, sourceId) !== effectivePoolId(model, targetId)) {
      return deny('cross-pool-flow');
    }
    if (source.parentId !== target.parentId) {
      return deny('cross-boundary-flow');
    }
    if (duplicateOf(model, 'sequenceFlow', sourceId, targetId, false)) {
      return deny('duplicate-flow');
    }
    return ALLOWED;
  }
  if (kind === 'dataAssociation') {
    const sourceIsData = isBpmnDataNodeType(source.type);
    const targetIsData = isBpmnDataNodeType(target.type);
    if ((sourceIsData ? 1 : 0) + (targetIsData ? 1 : 0) !== 1) {
      return deny('data-association-needs-data');
    }
    const other = sourceIsData ? target : source;
    if (other.type === 'textAnnotation' || !isBpmnActivityType(other.type)) {
      // v0.4 honest cut: the non-data endpoint must be an activity so the
      // edge can serialize as an in-activity data input/output association.
      return deny('data-association-needs-activity');
    }
    if (effectivePoolId(model, sourceId) !== effectivePoolId(model, targetId)) {
      return deny('cross-pool-flow');
    }
    if (duplicateOf(model, 'dataAssociation', sourceId, targetId, false)) {
      return deny('duplicate-flow');
    }
    return ALLOWED;
  }
  const annotationEnds =
    (source.type === 'textAnnotation' ? 1 : 0) +
    (target.type === 'textAnnotation' ? 1 : 0);
  if (annotationEnds !== 1) {
    return deny('association-needs-annotation');
  }
  if (duplicateOf(model, 'association', sourceId, targetId, true)) {
    return deny('duplicate-flow');
  }
  return ALLOWED;
}

/**
 * The morph (replace) groups: a flow node may change its type only within its
 * group, so its size class and edge semantics survive the morph.
 */
export const MORPH_GROUPS: readonly (readonly BpmnFlowNodeType[])[] = [
  ['task', 'userTask', 'serviceTask', 'scriptTask', 'callActivity'],
  ['exclusiveGateway', 'parallelGateway'],
  [
    'startEvent',
    'endEvent',
    'intermediateThrowEvent',
    'intermediateCatchEvent',
  ],
  // Boundary events are deliberately in no group: their attachment semantics
  // do not survive a morph — the event definition is changed via the panel.
  ['subProcess', 'eventSubProcess', 'transaction'],
];

/** Returns the morph group containing the given type, or null for annotations. */
export function morphGroupOf(type: string): readonly BpmnFlowNodeType[] | null {
  for (const group of MORPH_GROUPS) {
    if ((group as readonly string[]).includes(type)) {
      return group;
    }
  }
  return null;
}

/**
 * Checks whether the given flow node may morph into `newType`: same morph
 * group only, and the node's existing sequence flows must stay legal — a node
 * with outgoing flows cannot become an end event, one with incoming flows
 * cannot become a start event (same reasons as {@link canConnect}).
 */
export function canMorph(
  model: BpmnDiagram,
  id: string,
  newType: BpmnFlowNodeType,
): BpmnRuleResult {
  const node = model.nodes[id];
  if (!node || node.type === 'textAnnotation') {
    return deny('unknown-element');
  }
  const group = morphGroupOf(node.type);
  if (group === null || !group.includes(newType)) {
    return deny('not-in-morph-group');
  }
  if (newType === node.type) {
    return ALLOWED;
  }
  for (const edge of Object.values(model.edges)) {
    if (edge.type !== 'sequenceFlow') {
      continue;
    }
    if (newType === 'endEvent' && edge.sourceRef === id) {
      return deny('source-is-end-event');
    }
    if (newType === 'startEvent' && edge.targetRef === id) {
      return deny('target-is-start-event');
    }
  }
  return ALLOWED;
}

/**
 * Picks the edge kind that may connect the two elements, or null when none is
 * allowed — the single decision point of the connect tool: annotation
 * endpoints yield an association, data endpoints a data association, pool
 * endpoints and cross-pool pairs a message flow, everything else a sequence
 * flow.
 */
export function connectionKindFor(
  model: BpmnDiagram,
  sourceId: string,
  targetId: string,
): BpmnEdgeType | null {
  const source = model.nodes[sourceId];
  const target = model.nodes[targetId];
  const sourceIsPool = model.pools[sourceId] !== undefined;
  const targetIsPool = model.pools[targetId] !== undefined;
  if ((!source && !sourceIsPool) || (!target && !targetIsPool)) {
    return null;
  }
  if (sourceIsPool || targetIsPool) {
    return canConnect(model, 'messageFlow', sourceId, targetId).allowed
      ? 'messageFlow'
      : null;
  }
  if (source?.type === 'textAnnotation' || target?.type === 'textAnnotation') {
    return canConnect(model, 'association', sourceId, targetId).allowed
      ? 'association'
      : null;
  }
  if (
    (source !== undefined && isBpmnDataNodeType(source.type)) ||
    (target !== undefined && isBpmnDataNodeType(target.type))
  ) {
    return canConnect(model, 'dataAssociation', sourceId, targetId).allowed
      ? 'dataAssociation'
      : null;
  }
  if (effectivePoolId(model, sourceId) !== effectivePoolId(model, targetId)) {
    return canConnect(model, 'messageFlow', sourceId, targetId).allowed
      ? 'messageFlow'
      : null;
  }
  return canConnect(model, 'sequenceFlow', sourceId, targetId).allowed
    ? 'sequenceFlow'
    : null;
}
