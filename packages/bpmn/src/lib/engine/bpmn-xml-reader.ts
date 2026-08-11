import { placeMissingDi } from './auto-layout';
import type {
  BpmnActivityMarker,
  BpmnDiagram,
  BpmnEdge,
  BpmnEdgeDi,
  BpmnEventDefinitionKind,
  BpmnFlowNode,
  BpmnLane,
  BpmnNode,
  BpmnPool,
  BpmnShapeDi,
} from './bpmn-model';
import {
  hiddenByCollapsed,
  isBpmnSubProcessType,
  VALID_EVENT_DEFINITIONS,
} from './bpmn-model';
import type { Point, Rect } from './geometry';

/** Category of a non-fatal fidelity loss reported while importing BPMN XML. */
export type BpmnImportWarningCode =
  | 'unsupported-element'
  | 'missing-di'
  | 'multiple-processes'
  | 'dangling-ref'
  | 'event-definition-stripped'
  | 'invalid-event-definition'
  | 'nested-lanes-flattened';

/** A non-fatal fidelity loss reported while importing BPMN XML. */
export interface BpmnImportWarning {
  readonly code: BpmnImportWarningCode;
  readonly message: string;
  readonly elementId?: string;
  readonly localName?: string;
}

/** Result of importing BPMN XML: the model (null on fatal errors) plus fidelity warnings. */
export interface BpmnImportResult {
  readonly model: BpmnDiagram | null;
  readonly warnings: readonly BpmnImportWarning[];
  readonly error?: string;
}

const EVENT_TYPES: ReadonlySet<string> = new Set([
  'startEvent',
  'endEvent',
  'intermediateThrowEvent',
  'intermediateCatchEvent',
  'boundaryEvent',
]);

const ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  'task',
  'userTask',
  'serviceTask',
  'scriptTask',
  'callActivity',
]);

const GATEWAY_TYPES: ReadonlySet<string> = new Set([
  'exclusiveGateway',
  'parallelGateway',
]);

/** `<xxxEventDefinition>` localName → event definition kind. */
const EVENT_DEFINITION_KINDS: Readonly<
  Record<string, BpmnEventDefinitionKind>
> = {
  messageEventDefinition: 'message',
  timerEventDefinition: 'timer',
  errorEventDefinition: 'error',
  signalEventDefinition: 'signal',
  escalationEventDefinition: 'escalation',
  conditionalEventDefinition: 'conditional',
  linkEventDefinition: 'link',
  compensateEventDefinition: 'compensate',
  terminateEventDefinition: 'terminate',
};

/** Every localName parsed as a flow element inside a process or sub-process. */
function isFlowChild(localName: string): boolean {
  return (
    EVENT_TYPES.has(localName) ||
    ACTIVITY_TYPES.has(localName) ||
    GATEWAY_TYPES.has(localName) ||
    localName === 'subProcess' ||
    localName === 'transaction' ||
    localName === 'sequenceFlow' ||
    localName === 'association' ||
    localName === 'textAnnotation' ||
    localName === 'dataObject' ||
    localName === 'dataObjectReference' ||
    localName === 'dataStoreReference' ||
    localName === 'group'
  );
}

/**
 * Parses a BPMN 2.0 XML document into the diagram model. Matching is prefix-agnostic (by
 * localName), unsupported flow elements are dropped with warnings, and foreign children
 * AND unknown attributes of supported elements are preserved verbatim (v0.5) — attributes
 * by qualified name in `foreignAttributes`, with non-standard root `xmlns:*` declarations
 * carried in `definitionsAttrs` so the prefixes stay declared. Missing DI is auto-laid-out.
 * Collaborations import fully (v0.4): participants become pools, every referenced process
 * is parsed with its nodes carrying `poolId`, lanes and message flows are read, and a
 * participant without `processRef` imports as a black-box pool.
 */
export function readBpmnXml(xml: string): BpmnImportResult {
  const warnings: BpmnImportWarning[] = [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = findParseError(doc);
  if (parseError !== null) {
    return { model: null, warnings, error: parseError };
  }
  const definitions = doc.documentElement;
  if (definitions.localName !== 'definitions') {
    return {
      model: null,
      warnings,
      error: `Expected a <definitions> root element but found <${definitions.localName}>.`,
    };
  }

  const categoryValues = readCategories(definitions);
  const collab = readCollaboration(definitions, warnings);
  const processes = descendantsByLocalName(definitions, 'process');
  if (processes.length === 0 && collab === null) {
    return {
      model: null,
      warnings,
      error: 'No <process> element found in the document.',
    };
  }

  const definitionsAttrs = readDefinitionsAttrs(definitions);
  const foreignDefinitionsChildren: string[] = [];
  for (const child of elementChildren(definitions)) {
    if (
      child.localName === 'process' ||
      child.localName === 'collaboration' ||
      child.localName === 'category' ||
      child.localName === 'BPMNDiagram'
    ) {
      continue;
    }
    foreignDefinitionsChildren.push(serialize(child));
  }

  const pools: Record<string, BpmnPool> = {};
  const acc: ParseAccumulator = {
    nodes: {},
    edges: {},
    order: [],
    anonymousCounter: 0,
    referencedBackings: new Set<string>(),
    categoryValues,
  };
  if (collab !== null) {
    for (const pool of collab.pools) {
      pools[pool.id] = pool;
    }
    for (const flow of collab.messageFlows) {
      acc.edges[flow.id] = flow;
      acc.order.push(flow.id);
    }
  }

  const participantByProcess = new Map<string, string>();
  for (const pool of Object.values(pools)) {
    if (
      pool.processRef !== undefined &&
      !participantByProcess.has(pool.processRef)
    ) {
      participantByProcess.set(pool.processRef, pool.id);
    }
  }

  let defaultInfo: ParsedProcessInfo | null = null;
  for (let index = 0; index < processes.length; index++) {
    const process = processes[index];
    const pid = process.getAttribute('id') ?? `Process_${index + 1}`;
    const participantId = participantByProcess.get(pid);
    if (index === 0) {
      defaultInfo = readProcessInto(process, warnings, participantId, acc);
      if (participantId !== undefined) {
        pools[participantId] = {
          ...pools[participantId],
          lanes: defaultInfo.lanes,
        };
      } else if (defaultInfo.lanes.length > 0) {
        warnLanesDropped(pid, warnings);
        defaultInfo = { ...defaultInfo, lanes: [] };
      }
      continue;
    }
    if (participantId !== undefined) {
      const info = readProcessInto(process, warnings, participantId, acc);
      pools[participantId] = {
        ...pools[participantId],
        lanes: info.lanes,
        ...(info.processName !== undefined
          ? { processName: info.processName }
          : {}),
        processExecutable: info.isExecutable,
        ...(info.foreignAttributes !== undefined
          ? { processForeignAttributes: info.foreignAttributes }
          : {}),
      };
      continue;
    }
    warnings.push({
      code: 'multiple-processes',
      message:
        'Only the first process is imported; additional processes were dropped.',
      elementId: process.getAttribute('id') ?? undefined,
      localName: 'process',
    });
  }

  removeReferencedBackings(acc);
  dropDanglingEdges(acc.nodes, acc.edges, acc.order, warnings, pools);
  filterLaneRefs(pools, acc.nodes, warnings);

  const laneIds = new Set<string>();
  for (const pool of Object.values(pools)) {
    for (const lane of pool.lanes) {
      laneIds.add(lane.id);
    }
  }
  const { shapeDi, edgeDi, expandedShapes } = readDi(
    definitions,
    acc.nodes,
    acc.edges,
    pools,
    laneIds,
  );

  // Sub-process collapse state comes from the DI `isExpanded` attribute
  // (BPMN DI default: not expanded → collapsed).
  for (const [id, node] of Object.entries(acc.nodes)) {
    if (
      node.type !== 'textAnnotation' &&
      isBpmnSubProcessType(node.type) &&
      expandedShapes[id] !== true
    ) {
      acc.nodes[id] = { ...node, collapsed: true };
    }
  }

  const base: BpmnDiagram = {
    processId: defaultInfo?.processId ?? 'Process_1',
    ...(defaultInfo?.processName !== undefined
      ? { processName: defaultInfo.processName }
      : {}),
    isExecutable: defaultInfo?.isExecutable ?? false,
    ...(defaultInfo?.foreignAttributes !== undefined
      ? { processForeignAttributes: defaultInfo.foreignAttributes }
      : {}),
    ...(collab !== null ? { collaborationId: collab.id } : {}),
    ...(collab?.foreignAttributes !== undefined
      ? { collaborationForeignAttributes: collab.foreignAttributes }
      : {}),
    pools,
    nodes: acc.nodes,
    edges: acc.edges,
    order: acc.order,
    shapeDi,
    edgeDi,
    definitionsAttrs,
    foreignDefinitionsChildren,
  };
  const hidden = hiddenByCollapsed(base);

  for (const poolId of Object.keys(pools)) {
    if (shapeDi[poolId] === undefined) {
      warnings.push({
        code: 'missing-di',
        message: `Pool "${poolId}" has no diagram interchange; bounds were generated.`,
        elementId: poolId,
      });
    }
  }
  for (const id of acc.order) {
    if (
      acc.nodes[id] !== undefined &&
      shapeDi[id] === undefined &&
      !hidden.has(id)
    ) {
      warnings.push({
        code: 'missing-di',
        message: `Element "${id}" has no diagram interchange; a position was generated.`,
        elementId: id,
      });
    }
    const edge = acc.edges[id];
    if (
      edge !== undefined &&
      edgeDi[id] === undefined &&
      !hidden.has(edge.sourceRef) &&
      !hidden.has(edge.targetRef)
    ) {
      warnings.push({
        code: 'missing-di',
        message: `Edge "${id}" has no diagram interchange; waypoints were generated.`,
        elementId: id,
      });
    }
  }

  const model = placeMissingDi(base);
  return { model, warnings };
}

function warnLanesDropped(
  processId: string,
  warnings: BpmnImportWarning[],
): void {
  warnings.push({
    code: 'unsupported-element',
    message: `Lanes of process "${processId}" have no participant (pool) and were dropped.`,
    elementId: processId,
    localName: 'laneSet',
  });
}

function findParseError(doc: Document): string | null {
  const errors = doc.getElementsByTagNameNS('*', 'parsererror');
  if (errors.length > 0) {
    return (
      errors[0].textContent?.trim() || 'The document is not well-formed XML.'
    );
  }
  if (doc.documentElement === null) {
    return 'The document is empty.';
  }
  return null;
}

function elementChildren(element: Element): readonly Element[] {
  return Array.from(element.children);
}

function descendantsByLocalName(root: Element, localName: string): Element[] {
  const found: Element[] = [];
  const visit = (element: Element): void => {
    for (const child of elementChildren(element)) {
      if (child.localName === localName) {
        found.push(child);
      }
      visit(child);
    }
  };
  visit(root);
  return found;
}

function serialize(element: Element): string {
  return new XMLSerializer().serializeToString(element);
}

/** Reads definitions-level `<bpmn:category>` elements: categoryValue id → value string. */
function readCategories(definitions: Element): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (const child of elementChildren(definitions)) {
    if (child.localName !== 'category') {
      continue;
    }
    for (const value of elementChildren(child)) {
      if (value.localName !== 'categoryValue') {
        continue;
      }
      const id = value.getAttribute('id');
      const text = value.getAttribute('value');
      if (id !== null && text !== null) {
        values.set(id, text);
      }
    }
  }
  return values;
}

interface ParsedCollaboration {
  readonly id: string;
  readonly pools: readonly BpmnPool[];
  readonly messageFlows: readonly BpmnEdge[];
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

function readCollaboration(
  definitions: Element,
  warnings: BpmnImportWarning[],
): ParsedCollaboration | null {
  let collaboration: Element | null = null;
  for (const child of elementChildren(definitions)) {
    if (child.localName !== 'collaboration') {
      continue;
    }
    if (collaboration === null) {
      collaboration = child;
    } else {
      warnings.push({
        code: 'unsupported-element',
        message:
          'Only the first collaboration is imported; additional collaborations were dropped.',
        elementId: child.getAttribute('id') ?? undefined,
        localName: 'collaboration',
      });
    }
  }
  if (collaboration === null) {
    return null;
  }
  const collabForeign = foreignAttributesOf(collaboration, ['id']);
  const pools: BpmnPool[] = [];
  const messageFlows: BpmnEdge[] = [];
  for (const child of elementChildren(collaboration)) {
    if (child.localName === 'participant') {
      const foreignAttributes = foreignAttributesOf(child, [
        'id',
        'name',
        'processRef',
      ]);
      const foreignChildren = elementChildren(child).map(serialize);
      const name = child.getAttribute('name');
      const processRef = child.getAttribute('processRef');
      pools.push({
        id: child.getAttribute('id') ?? `Participant_${pools.length + 1}`,
        ...(name !== null ? { name } : {}),
        ...(processRef !== null ? { processRef } : {}),
        lanes: [],
        ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
        ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
      });
      continue;
    }
    if (child.localName === 'messageFlow') {
      const foreignAttributes = foreignAttributesOf(child, [
        'id',
        'name',
        'sourceRef',
        'targetRef',
      ]);
      const foreignChildren = elementChildren(child).map(serialize);
      const name = child.getAttribute('name');
      messageFlows.push({
        id:
          child.getAttribute('id') ?? `MessageFlow_${messageFlows.length + 1}`,
        type: 'messageFlow',
        sourceRef: child.getAttribute('sourceRef') ?? '',
        targetRef: child.getAttribute('targetRef') ?? '',
        ...(name !== null ? { name } : {}),
        ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
        ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
      });
      continue;
    }
    warnings.push({
      code: 'unsupported-element',
      message: `Element <${child.localName}> inside the collaboration is not supported and was dropped.`,
      elementId: child.getAttribute('id') ?? undefined,
      localName: child.localName,
    });
  }
  return {
    id: collaboration.getAttribute('id') ?? 'Collaboration_1',
    pools,
    messageFlows,
    ...(collabForeign !== undefined
      ? { foreignAttributes: collabForeign }
      : {}),
  };
}

/** Namespace prefixes the writer declares itself; their decls are never copied. */
const WRITER_PREFIXES: ReadonlySet<string> = new Set([
  'bpmn',
  'bpmndi',
  'dc',
  'di',
  'xsi',
  'bioc',
]);

/** Namespace URIs the writer declares under its own fixed prefixes. */
const WRITER_NAMESPACES: ReadonlySet<string> = new Set([
  'http://www.omg.org/spec/BPMN/20100524/MODEL',
  'http://www.omg.org/spec/BPMN/20100524/DI',
  'http://www.omg.org/spec/DD/20100524/DC',
  'http://www.omg.org/spec/DD/20100524/DI',
  'http://www.w3.org/2001/XMLSchema-instance',
  'http://bpmn.io/schema/bpmn/biocolor/1.0',
]);

function readDefinitionsAttrs(definitions: Element): Record<string, string> {
  const attrs: Record<string, string> = {
    id: definitions.getAttribute('id') ?? 'Definitions_1',
    targetNamespace:
      definitions.getAttribute('targetNamespace') ??
      'http://ogeui.com/schema/bpmn',
  };
  for (const attr of Array.from(definitions.attributes)) {
    if (attrs[attr.name] !== undefined) {
      continue;
    }
    if (attr.name === 'xmlns') {
      continue; // the writer emits prefixed elements; a default ns would clash
    }
    if (attr.name.startsWith('xmlns:')) {
      // Preserve non-standard namespace declarations (e.g. xmlns:camunda) so
      // preserved prefixed attributes stay declared; the writer's own fixed
      // prefixes/URIs are skipped to avoid duplicate declarations.
      const prefix = attr.name.slice('xmlns:'.length);
      if (WRITER_PREFIXES.has(prefix) || WRITER_NAMESPACES.has(attr.value)) {
        continue;
      }
    }
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

/**
 * Collects the element's attributes not consumed by the parser, verbatim by
 * qualified name (namespace declarations excluded), or undefined when there
 * are none. Nothing is dropped — the writer re-emits them alphabetically.
 */
function foreignAttributesOf(
  element: Element,
  consumed: readonly string[],
): Readonly<Record<string, string>> | undefined {
  let attrs: Record<string, string> | undefined;
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
      continue;
    }
    if (consumed.includes(attr.name)) {
      continue;
    }
    attrs = attrs ?? {};
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

interface ParseAccumulator {
  readonly nodes: Record<string, BpmnNode>;
  readonly edges: Record<string, BpmnEdge>;
  readonly order: string[];
  anonymousCounter: number;
  /** Ids of bare `<dataObject>` elements consumed by a `<dataObjectReference>`. */
  readonly referencedBackings: Set<string>;
  readonly categoryValues: ReadonlyMap<string, string>;
}

interface ParsedProcessInfo {
  readonly processId: string;
  readonly processName?: string;
  readonly isExecutable: boolean;
  readonly lanes: readonly BpmnLane[];
  readonly foreignAttributes?: Readonly<Record<string, string>>;
}

function readProcessInto(
  process: Element,
  warnings: BpmnImportWarning[],
  poolId: string | undefined,
  acc: ParseAccumulator,
): ParsedProcessInfo {
  const processForeign = foreignAttributesOf(process, [
    'id',
    'name',
    'isExecutable',
  ]);

  const idOf = (element: Element): string => {
    const id = element.getAttribute('id');
    if (id !== null) {
      return id;
    }
    acc.anonymousCounter++;
    return `_anonymous_${acc.anonymousCounter}`;
  };

  const lanes: BpmnLane[] = [];
  const readLanes = (laneSet: Element): void => {
    for (const lane of elementChildren(laneSet)) {
      if (lane.localName !== 'lane') {
        continue;
      }
      const laneForeign = foreignAttributesOf(lane, ['id', 'name']);
      const laneId = idOf(lane);
      const flowNodeRefs: string[] = [];
      let flattened = false;
      for (const child of elementChildren(lane)) {
        if (child.localName === 'flowNodeRef') {
          const ref = child.textContent?.trim() ?? '';
          if (ref !== '') {
            flowNodeRefs.push(ref);
          }
        } else if (child.localName === 'childLaneSet') {
          flattened = true;
          readLanes(child);
        }
      }
      if (flattened) {
        warnings.push({
          code: 'nested-lanes-flattened',
          message: `Nested lanes of lane "${laneId}" were flattened to one level.`,
          elementId: laneId,
          localName: 'childLaneSet',
        });
      }
      const name = lane.getAttribute('name');
      lanes.push({
        id: laneId,
        ...(name !== null ? { name } : {}),
        flowNodeRefs,
        ...(laneForeign !== undefined
          ? { foreignAttributes: laneForeign }
          : {}),
      });
    }
  };

  const readFlowElements = (
    container: Element,
    parentId: string | undefined,
  ): void => {
    for (const child of elementChildren(container)) {
      const localName = child.localName;
      if (
        EVENT_TYPES.has(localName) ||
        ACTIVITY_TYPES.has(localName) ||
        GATEWAY_TYPES.has(localName)
      ) {
        const type =
          localName === 'callActivity'
            ? 'callActivity'
            : (localName as BpmnFlowNode['type']);
        const node = readFlowNode(
          child,
          type,
          idOf(child),
          parentId,
          poolId,
          warnings,
        );
        acc.nodes[node.id] = node;
        acc.order.push(node.id);
        readActivityDataAssociations(child, node.id, warnings, acc, idOf);
      } else if (localName === 'subProcess' || localName === 'transaction') {
        const type =
          localName === 'transaction'
            ? 'transaction'
            : child.getAttribute('triggeredByEvent') === 'true'
              ? 'eventSubProcess'
              : 'subProcess';
        const node = readFlowNode(
          child,
          type,
          idOf(child),
          parentId,
          poolId,
          warnings,
        );
        acc.nodes[node.id] = node;
        acc.order.push(node.id);
        readActivityDataAssociations(child, node.id, warnings, acc, idOf);
        readFlowElements(child, node.id);
      } else if (localName === 'sequenceFlow') {
        const edge = readSequenceFlow(child, idOf(child));
        acc.edges[edge.id] = edge;
        acc.order.push(edge.id);
      } else if (localName === 'association') {
        const edge = readAssociation(child, idOf(child));
        acc.edges[edge.id] = edge;
        acc.order.push(edge.id);
      } else if (localName === 'textAnnotation') {
        const node = readTextAnnotation(child, idOf(child), parentId, poolId);
        acc.nodes[node.id] = node;
        acc.order.push(node.id);
      } else if (localName === 'dataObjectReference') {
        const node = readDataElement(
          child,
          'dataObject',
          idOf(child),
          parentId,
          poolId,
          ['id', 'name', 'dataObjectRef'],
        );
        const backing = child.getAttribute('dataObjectRef');
        if (backing !== null) {
          acc.referencedBackings.add(backing);
        }
        acc.nodes[node.id] = node;
        acc.order.push(node.id);
      } else if (localName === 'dataObject') {
        const node = readDataElement(
          child,
          'dataObject',
          idOf(child),
          parentId,
          poolId,
          ['id', 'name'],
        );
        acc.nodes[node.id] = node;
        acc.order.push(node.id);
      } else if (localName === 'dataStoreReference') {
        const node = readDataElement(
          child,
          'dataStore',
          idOf(child),
          parentId,
          poolId,
          ['id', 'name', 'dataStoreRef'],
        );
        acc.nodes[node.id] = node;
        acc.order.push(node.id);
      } else if (localName === 'group') {
        const foreignAttributes = foreignAttributesOf(child, [
          'id',
          'categoryValueRef',
        ]);
        const id = idOf(child);
        const valueRef = child.getAttribute('categoryValueRef');
        const name =
          valueRef !== null ? acc.categoryValues.get(valueRef) : undefined;
        const foreignChildren = elementChildren(child).map(serialize);
        acc.nodes[id] = {
          id,
          type: 'group',
          ...(name !== undefined ? { name } : {}),
          ...(parentId !== undefined ? { parentId } : {}),
          ...(poolId !== undefined ? { poolId } : {}),
          ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
          ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
        };
        acc.order.push(id);
      } else if (localName === 'laneSet') {
        if (parentId === undefined) {
          readLanes(child);
        }
      } else if (parentId === undefined) {
        // Inside a sub-process the non-flow children were already consumed by
        // `readFlowNode` (foreign children, markers, event definitions).
        warnings.push({
          code: 'unsupported-element',
          message: `Element <${localName}> is not supported and was dropped.`,
          elementId: child.getAttribute('id') ?? undefined,
          localName,
        });
      }
    }
  };
  readFlowElements(process, undefined);

  return {
    processId: process.getAttribute('id') ?? 'Process_1',
    ...(process.getAttribute('name') !== null
      ? { processName: process.getAttribute('name') as string }
      : {}),
    isExecutable: process.getAttribute('isExecutable') === 'true',
    lanes,
    ...(processForeign !== undefined
      ? { foreignAttributes: processForeign }
      : {}),
  };
}

/** Removes bare `<dataObject>` backing nodes consumed by a `<dataObjectReference>`. */
function removeReferencedBackings(acc: ParseAccumulator): void {
  if (acc.referencedBackings.size === 0) {
    return;
  }
  const removed = new Set<string>();
  for (const backing of acc.referencedBackings) {
    const node = acc.nodes[backing];
    if (node !== undefined && node.type === 'dataObject') {
      delete acc.nodes[backing];
      removed.add(backing);
    }
  }
  if (removed.size > 0) {
    for (let i = acc.order.length - 1; i >= 0; i--) {
      if (removed.has(acc.order[i])) {
        acc.order.splice(i, 1);
      }
    }
  }
}

function readDataElement(
  element: Element,
  type: 'dataObject' | 'dataStore',
  id: string,
  parentId: string | undefined,
  poolId: string | undefined,
  consumed: readonly string[],
): BpmnNode {
  const foreignAttributes = foreignAttributesOf(element, consumed);
  const foreignChildren = elementChildren(element).map(serialize);
  const name = element.getAttribute('name');
  return {
    id,
    type,
    ...(name !== null ? { name } : {}),
    ...(parentId !== undefined ? { parentId } : {}),
    ...(poolId !== undefined ? { poolId } : {}),
    ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
    ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
  };
}

/**
 * Reads the `<bpmn:dataInputAssociation>` / `<bpmn:dataOutputAssociation>`
 * children of an activity into `dataAssociation` edges: an input association's
 * `<sourceRef>` child names the data element and the activity is the target;
 * an output association's `<targetRef>` child names the data element and the
 * activity is the source.
 */
function readActivityDataAssociations(
  element: Element,
  activityId: string,
  warnings: BpmnImportWarning[],
  acc: ParseAccumulator,
  idOf: (element: Element) => string,
): void {
  for (const child of elementChildren(element)) {
    const localName = child.localName;
    const isInput = localName === 'dataInputAssociation';
    const isOutput = localName === 'dataOutputAssociation';
    if (!isInput && !isOutput) {
      continue;
    }
    const id = idOf(child);
    let ref: string | null = null;
    const foreignChildren: string[] = [];
    for (const grand of elementChildren(child)) {
      if (
        (isInput && grand.localName === 'sourceRef') ||
        (isOutput && grand.localName === 'targetRef')
      ) {
        ref = grand.textContent?.trim() ?? '';
      } else {
        foreignChildren.push(serialize(grand));
      }
    }
    if (ref === null || ref === '') {
      warnings.push({
        code: 'dangling-ref',
        message: `Data association "${id}" names no data element and was dropped.`,
        elementId: id,
        localName,
      });
      continue;
    }
    acc.edges[id] = {
      id,
      type: 'dataAssociation',
      sourceRef: isInput ? ref : activityId,
      targetRef: isInput ? activityId : ref,
      ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
    };
    acc.order.push(id);
  }
}

function dropDanglingEdges(
  nodes: Record<string, BpmnNode>,
  edges: Record<string, BpmnEdge>,
  order: string[],
  warnings: BpmnImportWarning[],
  pools: Readonly<Record<string, BpmnPool>>,
): void {
  const dropped = new Set<string>();
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (
      node.type === 'boundaryEvent' &&
      (node.attachedToRef === undefined ||
        nodes[node.attachedToRef] === undefined)
    ) {
      warnings.push({
        code: 'dangling-ref',
        message: `Boundary event "${nodeId}" is not attached to a known activity and was dropped.`,
        elementId: nodeId,
        localName: 'boundaryEvent',
      });
      dropped.add(nodeId);
      delete nodes[nodeId];
    }
  }
  const knownEndpoint = (ref: string): boolean =>
    nodes[ref] !== undefined || pools[ref] !== undefined;
  for (const [edgeId, edge] of Object.entries(edges)) {
    const poolsAllowed = edge.type === 'messageFlow';
    const sourceKnown = poolsAllowed
      ? knownEndpoint(edge.sourceRef)
      : nodes[edge.sourceRef] !== undefined;
    const targetKnown = poolsAllowed
      ? knownEndpoint(edge.targetRef)
      : nodes[edge.targetRef] !== undefined;
    if (!sourceKnown || !targetKnown) {
      warnings.push({
        code: 'dangling-ref',
        message: `Edge "${edgeId}" references a missing or dropped element and was dropped.`,
        elementId: edgeId,
        localName: edge.type,
      });
      dropped.add(edgeId);
      delete edges[edgeId];
    }
  }
  if (dropped.size > 0) {
    for (let i = order.length - 1; i >= 0; i--) {
      if (dropped.has(order[i])) {
        order.splice(i, 1);
      }
    }
  }
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (
      node.type !== 'textAnnotation' &&
      node.defaultFlowId !== undefined &&
      edges[node.defaultFlowId] === undefined
    ) {
      const { defaultFlowId: _cleared, ...rest } = node;
      nodes[nodeId] = rest;
    }
  }
}

/** Drops lane `flowNodeRef` entries pointing at unknown nodes, with a warning. */
function filterLaneRefs(
  pools: Record<string, BpmnPool>,
  nodes: Readonly<Record<string, BpmnNode>>,
  warnings: BpmnImportWarning[],
): void {
  for (const [poolId, pool] of Object.entries(pools)) {
    if (
      pool.lanes.every((lane) => lane.flowNodeRefs.every((ref) => nodes[ref]))
    ) {
      continue;
    }
    pools[poolId] = {
      ...pool,
      lanes: pool.lanes.map((lane) => {
        const kept = lane.flowNodeRefs.filter((ref) => {
          if (nodes[ref] !== undefined) {
            return true;
          }
          warnings.push({
            code: 'dangling-ref',
            message: `Lane "${lane.id}" references unknown flow node "${ref}"; the reference was dropped.`,
            elementId: lane.id,
            localName: 'flowNodeRef',
          });
          return false;
        });
        return kept.length === lane.flowNodeRefs.length
          ? lane
          : { ...lane, flowNodeRefs: kept };
      }),
    };
  }
}

function readFlowNode(
  element: Element,
  type: BpmnFlowNode['type'],
  id: string,
  parentId: string | undefined,
  poolId: string | undefined,
  warnings: BpmnImportWarning[],
): BpmnFlowNode {
  const isEvent = EVENT_TYPES.has(type);
  const isActivity = !isEvent && !GATEWAY_TYPES.has(type);
  const isContainer = isBpmnSubProcessType(type);
  const consumed = ['id', 'name'];
  if (!isEvent) {
    consumed.push('default');
  }
  if (isActivity) {
    consumed.push('isForCompensation');
  }
  if (type === 'boundaryEvent') {
    consumed.push('attachedToRef', 'cancelActivity');
  }
  if (type === 'callActivity') {
    consumed.push('calledElement');
  }
  if (isContainer) {
    consumed.push('triggeredByEvent');
  }
  const foreignAttributes = foreignAttributesOf(element, consumed);

  const foreignChildren: string[] = [];
  let eventDefinition: BpmnEventDefinitionKind | undefined;
  const markerSet = new Set<BpmnActivityMarker>();
  for (const child of elementChildren(element)) {
    const localName = child.localName;
    if (localName === 'incoming' || localName === 'outgoing') {
      continue; // Derived from the sequence flows; regenerated on export.
    }
    if (
      isActivity &&
      (localName === 'dataInputAssociation' ||
        localName === 'dataOutputAssociation')
    ) {
      continue; // Consumed as dataAssociation edges by the caller.
    }
    if (isContainer && isFlowChild(localName)) {
      continue; // Parsed as nested flow elements by the caller's recursion.
    }
    if (isEvent && localName.endsWith('EventDefinition')) {
      const kind = EVENT_DEFINITION_KINDS[localName];
      if (kind === undefined) {
        warnings.push({
          code: 'event-definition-stripped',
          message: `<${localName}> on event "${id}" is not supported and was dropped.`,
          elementId: id,
          localName,
        });
      } else if (eventDefinition !== undefined) {
        warnings.push({
          code: 'event-definition-stripped',
          message: `Event "${id}" carries multiple event definitions; only the first (${eventDefinition}) was kept.`,
          elementId: id,
          localName,
        });
      } else if (
        !VALID_EVENT_DEFINITIONS[
          type as keyof typeof VALID_EVENT_DEFINITIONS
        ]?.includes(kind)
      ) {
        warnings.push({
          code: 'invalid-event-definition',
          message: `<${localName}> is not valid on a <${type}> and was dropped from "${id}".`,
          elementId: id,
          localName,
        });
      } else {
        eventDefinition = kind;
        warnDroppedGrandchildren(child, id, warnings);
      }
      continue;
    }
    if (isActivity && localName === 'standardLoopCharacteristics') {
      markerSet.add('loop');
      warnDroppedGrandchildren(child, id, warnings);
      continue;
    }
    if (isActivity && localName === 'multiInstanceLoopCharacteristics') {
      markerSet.add(
        child.getAttribute('isSequential') === 'true'
          ? 'multiInstanceSequential'
          : 'multiInstanceParallel',
      );
      warnDroppedGrandchildren(child, id, warnings);
      continue;
    }
    foreignChildren.push(serialize(child));
  }
  if (isActivity && element.getAttribute('isForCompensation') === 'true') {
    markerSet.add('compensation');
  }
  const markers = MARKER_ORDER.filter((marker) => markerSet.has(marker));

  const name = element.getAttribute('name');
  const defaultFlow = isEvent ? null : element.getAttribute('default');
  const attachedToRef =
    type === 'boundaryEvent' ? element.getAttribute('attachedToRef') : null;
  const calledElement =
    type === 'callActivity' ? element.getAttribute('calledElement') : null;
  const nonInterrupting =
    type === 'boundaryEvent' &&
    element.getAttribute('cancelActivity') === 'false';
  return {
    id,
    type,
    ...(name !== null ? { name } : {}),
    ...(defaultFlow !== null ? { defaultFlowId: defaultFlow } : {}),
    ...(parentId !== undefined ? { parentId } : {}),
    ...(poolId !== undefined ? { poolId } : {}),
    ...(eventDefinition !== undefined ? { eventDefinition } : {}),
    ...(attachedToRef !== null ? { attachedToRef } : {}),
    ...(calledElement !== null ? { calledElement } : {}),
    ...(nonInterrupting ? { cancelActivity: false } : {}),
    ...(markers.length > 0 ? { markers } : {}),
    ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
    ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
  };
}

/** Canonical serialization order of activity markers. */
const MARKER_ORDER: readonly BpmnActivityMarker[] = [
  'loop',
  'multiInstanceParallel',
  'multiInstanceSequential',
  'compensation',
];

/** Warns about element children of a loop-characteristics element being dropped. */
function warnDroppedGrandchildren(
  element: Element,
  ownerId: string,
  warnings: BpmnImportWarning[],
): void {
  for (const child of elementChildren(element)) {
    warnings.push({
      code: 'unsupported-element',
      message: `<${child.localName}> inside <${element.localName}> of "${ownerId}" is not supported and was dropped.`,
      elementId: ownerId,
      localName: child.localName,
    });
  }
}

function readSequenceFlow(element: Element, id: string): BpmnEdge {
  const foreignAttributes = foreignAttributesOf(element, [
    'id',
    'name',
    'sourceRef',
    'targetRef',
  ]);
  const foreignChildren: string[] = [];
  let conditionExpression: string | undefined;
  for (const child of elementChildren(element)) {
    if (
      child.localName === 'conditionExpression' &&
      conditionExpression === undefined
    ) {
      conditionExpression = child.textContent ?? '';
    } else {
      foreignChildren.push(serialize(child));
    }
  }
  const name = element.getAttribute('name');
  return {
    id,
    type: 'sequenceFlow',
    sourceRef: element.getAttribute('sourceRef') ?? '',
    targetRef: element.getAttribute('targetRef') ?? '',
    ...(name !== null ? { name } : {}),
    ...(conditionExpression !== undefined ? { conditionExpression } : {}),
    ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
    ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
  };
}

function readAssociation(element: Element, id: string): BpmnEdge {
  const foreignAttributes = foreignAttributesOf(element, [
    'id',
    'sourceRef',
    'targetRef',
  ]);
  const foreignChildren: string[] = [];
  for (const child of elementChildren(element)) {
    foreignChildren.push(serialize(child));
  }
  return {
    id,
    type: 'association',
    sourceRef: element.getAttribute('sourceRef') ?? '',
    targetRef: element.getAttribute('targetRef') ?? '',
    ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
    ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
  };
}

function readTextAnnotation(
  element: Element,
  id: string,
  parentId: string | undefined,
  poolId: string | undefined,
): BpmnNode {
  const foreignAttributes = foreignAttributesOf(element, ['id']);
  const foreignChildren: string[] = [];
  let text = '';
  let textSeen = false;
  for (const child of elementChildren(element)) {
    if (child.localName === 'text' && !textSeen) {
      text = child.textContent ?? '';
      textSeen = true;
    } else {
      foreignChildren.push(serialize(child));
    }
  }
  return {
    id,
    type: 'textAnnotation',
    text,
    ...(parentId !== undefined ? { parentId } : {}),
    ...(poolId !== undefined ? { poolId } : {}),
    ...(foreignChildren.length > 0 ? { foreignChildren } : {}),
    ...(foreignAttributes !== undefined ? { foreignAttributes } : {}),
  };
}

function readDi(
  definitions: Element,
  nodes: Readonly<Record<string, BpmnNode>>,
  edges: Readonly<Record<string, BpmnEdge>>,
  pools: Readonly<Record<string, BpmnPool>>,
  laneIds: ReadonlySet<string>,
): {
  shapeDi: Record<string, BpmnShapeDi>;
  edgeDi: Record<string, BpmnEdgeDi>;
  expandedShapes: Record<string, boolean>;
} {
  const shapeDi: Record<string, BpmnShapeDi> = {};
  const edgeDi: Record<string, BpmnEdgeDi> = {};
  const expandedShapes: Record<string, boolean> = {};
  const planes = descendantsByLocalName(definitions, 'BPMNPlane');
  if (planes.length === 0) {
    return { shapeDi, edgeDi, expandedShapes };
  }
  for (const child of elementChildren(planes[0])) {
    const ref = child.getAttribute('bpmnElement');
    if (ref === null) {
      continue;
    }
    const isPoolOrLane = pools[ref] !== undefined || laneIds.has(ref);
    if (
      child.localName === 'BPMNShape' &&
      (nodes[ref] !== undefined || isPoolOrLane)
    ) {
      const isExpanded = child.getAttribute('isExpanded');
      if (isExpanded !== null) {
        expandedShapes[ref] = isExpanded === 'true';
      }
      const bounds = readBounds(child);
      if (bounds !== null) {
        const labelBounds = readLabelBounds(child);
        const isHorizontal = isPoolOrLane
          ? child.getAttribute('isHorizontal')
          : null;
        shapeDi[ref] = {
          bounds,
          ...(labelBounds !== null ? { labelBounds } : {}),
          ...(isHorizontal !== null
            ? { horizontal: isHorizontal === 'true' }
            : {}),
          ...readDiColors(child),
        };
      }
    } else if (child.localName === 'BPMNEdge' && edges[ref] !== undefined) {
      const waypoints: Point[] = [];
      for (const wp of elementChildren(child)) {
        if (wp.localName === 'waypoint') {
          waypoints.push({ x: readNumber(wp, 'x'), y: readNumber(wp, 'y') });
        }
      }
      if (waypoints.length >= 2) {
        const labelBounds = readLabelBounds(child);
        edgeDi[ref] = {
          waypoints,
          ...(labelBounds !== null ? { labelBounds } : {}),
          ...readDiColors(child),
        };
      }
    }
  }
  return { shapeDi, edgeDi, expandedShapes };
}

/**
 * Reads custom DI colors from a BPMNShape/BPMNEdge element: any attribute
 * whose localName is `stroke` or `fill`, regardless of its namespace prefix —
 * this covers bpmn.io's `bioc:stroke`/`bioc:fill` interop attributes.
 */
function readDiColors(element: Element): {
  fill?: string;
  stroke?: string;
} {
  const colors: { fill?: string; stroke?: string } = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.localName === 'fill' && colors.fill === undefined) {
      colors.fill = attr.value;
    } else if (attr.localName === 'stroke' && colors.stroke === undefined) {
      colors.stroke = attr.value;
    }
  }
  return colors;
}

function readBounds(element: Element): Rect | null {
  for (const child of elementChildren(element)) {
    if (child.localName === 'Bounds') {
      return {
        x: readNumber(child, 'x'),
        y: readNumber(child, 'y'),
        width: readNumber(child, 'width'),
        height: readNumber(child, 'height'),
      };
    }
  }
  return null;
}

function readLabelBounds(element: Element): Rect | null {
  for (const child of elementChildren(element)) {
    if (child.localName === 'BPMNLabel') {
      return readBounds(child);
    }
  }
  return null;
}

function readNumber(element: Element, name: string): number {
  const value = Number.parseFloat(element.getAttribute(name) ?? '');
  return Number.isFinite(value) ? value : 0;
}
