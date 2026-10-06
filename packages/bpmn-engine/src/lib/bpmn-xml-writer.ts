import type {
  BpmnDiagram,
  BpmnEdge,
  BpmnFlowNode,
  BpmnLane,
  BpmnNode,
  BpmnPool,
} from './bpmn-model';
import { isBpmnDataNodeType, isBpmnSubProcessType } from './bpmn-model';
import type { BpmnXmlElement } from './bpmn-xml-element';
import { writeBpmnXmlElement } from './bpmn-xml-element';
import type { Rect } from './geometry';

const XMLNS: readonly (readonly [string, string])[] = [
  ['xmlns:bpmn', 'http://www.omg.org/spec/BPMN/20100524/MODEL'],
  ['xmlns:bpmndi', 'http://www.omg.org/spec/BPMN/20100524/DI'],
  ['xmlns:dc', 'http://www.omg.org/spec/DD/20100524/DC'],
  ['xmlns:di', 'http://www.omg.org/spec/DD/20100524/DI'],
  ['xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance'],
];

/** Escapes a string for use inside a double-quoted XML attribute value. */
export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escapes a string for use as XML element text content. */
export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type AttrPair = readonly [string, string | undefined];

/** Fixed leading attribute order; anything else is appended alphabetically. */
const ATTR_ORDER: readonly string[] = [
  'id',
  'name',
  'sourceRef',
  'targetRef',
  'default',
  'isExecutable',
];

function formatAttrs(pairs: readonly AttrPair[]): string {
  const known: AttrPair[] = [];
  const rest: AttrPair[] = [];
  for (const pair of pairs) {
    if (pair[1] === undefined) {
      continue;
    }
    (ATTR_ORDER.includes(pair[0]) ? known : rest).push(pair);
  }
  known.sort((a, b) => ATTR_ORDER.indexOf(a[0]) - ATTR_ORDER.indexOf(b[0]));
  rest.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return [...known, ...rest]
    .map(([name, value]) => ` ${name}="${escapeXmlAttribute(value as string)}"`)
    .join('');
}

/** The preserved foreign attributes of an element as attribute pairs. */
function foreignPairs(
  attrs: Readonly<Record<string, string>> | undefined,
): AttrPair[] {
  return Object.entries(attrs ?? {});
}

/** Root bucket key of the default process in {@link groupByParent}. */
const DEFAULT_ROOT = '\u0000default';

/**
 * Serializes the model to deterministic BPMN 2.0 XML with a string builder: fixed namespace
 * prefixes, 2-space indentation, fixed attribute order and elements in `model.order`, so two
 * writes of the same model are byte-identical. Collaborations (v0.4) reconstruct one
 * `<bpmn:collaboration>` with participants and message flows plus one `<bpmn:process>` per
 * participant with a `processRef`, grouping nodes by their `poolId`; single-process models
 * serialize exactly as before.
 */
export function writeBpmnXml(model: BpmnDiagram): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');

  const definitionsAttrs: AttrPair[] = [...XMLNS];
  if (hasDiColors(model)) {
    definitionsAttrs.push([
      'xmlns:bioc',
      'http://bpmn.io/schema/bpmn/biocolor/1.0',
    ]);
  }
  const extra: Record<string, string> = { ...model.definitionsAttrs };
  const id = extra['id'] ?? 'Definitions_1';
  delete extra['id'];
  if (extra['targetNamespace'] === undefined) {
    extra['targetNamespace'] = 'http://ogeui.com/schema/bpmn';
  }
  definitionsAttrs.push(['id', id]);
  for (const name of Object.keys(extra).sort()) {
    definitionsAttrs.push([name, extra[name]]);
  }
  lines.push(`<bpmn:definitions${formatAttrs(definitionsAttrs)}>`);

  const pools = Object.values(model.pools);
  const collabId =
    pools.length > 0 ? (model.collaborationId ?? 'Collaboration_1') : undefined;
  if (collabId !== undefined) {
    writeCollaboration(lines, model, pools, collabId);
  }

  const byParent = groupByParent(model);
  const defaultPool = pools.find((pool) => pool.processRef === model.processId);
  // A default process nobody references, with no contents and default
  // attributes, is skipped entirely (a collaboration created on an empty
  // diagram round-trips without a phantom process).
  const skipDefault =
    defaultPool === undefined &&
    pools.length > 0 &&
    (byParent.get(DEFAULT_ROOT) ?? []).length === 0 &&
    model.processName === undefined &&
    !model.isExecutable;
  if (!skipDefault) {
    lines.push(
      `  <bpmn:process${formatAttrs([
        ['id', model.processId],
        ['name', model.processName],
        ['isExecutable', model.isExecutable ? 'true' : 'false'],
        ...foreignPairs(model.processForeignAttributes),
      ])}>`,
    );
    pushDocumentation(lines, '    ', model.processDocumentation);
    pushExtensions(lines, '    ', model.processExtensionElements);
    if (defaultPool !== undefined) {
      writeLaneSet(lines, model.processId, defaultPool.lanes, 2);
    }
    writeContainer(lines, model, byParent, DEFAULT_ROOT, 2);
    lines.push('  </bpmn:process>');
  }

  for (const pool of pools) {
    if (pool.processRef === undefined || pool.processRef === model.processId) {
      continue;
    }
    const bucket = byParent.get(`\u0000pool:${pool.id}`) ?? [];
    const empty = bucket.length === 0 && pool.lanes.length === 0;
    lines.push(
      `  <bpmn:process${formatAttrs([
        ['id', pool.processRef],
        ['name', pool.processName],
        ['isExecutable', pool.processExecutable === true ? 'true' : 'false'],
        ...foreignPairs(pool.processForeignAttributes),
      ])}${empty ? ' />' : '>'}`,
    );
    if (!empty) {
      writeLaneSet(lines, pool.processRef, pool.lanes, 2);
      writeContainer(lines, model, byParent, `\u0000pool:${pool.id}`, 2);
      lines.push('  </bpmn:process>');
    }
  }

  writeCategories(lines, model);
  writeRootElements(lines, model);

  for (const fragment of model.foreignDefinitionsChildren) {
    lines.push(`  ${fragment}`);
  }

  writeDi(lines, model, collabId);
  lines.push('</bpmn:definitions>');
  return lines.join('\n') + '\n';
}

function writeCollaboration(
  lines: string[],
  model: BpmnDiagram,
  pools: readonly BpmnPool[],
  collabId: string,
): void {
  lines.push(
    `  <bpmn:collaboration${formatAttrs([
      ['id', collabId],
      ...foreignPairs(model.collaborationForeignAttributes),
    ])}>`,
  );
  for (const pool of pools) {
    const attrs: AttrPair[] = [
      ['id', pool.id],
      ['name', pool.name],
      ['processRef', pool.processRef],
      ...foreignPairs(pool.foreignAttributes),
    ];
    const children: string[] = [];
    pushDocumentation(children, '      ', pool.documentation);
    for (const fragment of pool.foreignChildren ?? []) {
      children.push(`      ${fragment}`);
    }
    const open = `    <bpmn:participant${formatAttrs(attrs)}`;
    if (children.length === 0) {
      lines.push(`${open} />`);
    } else {
      lines.push(`${open}>`);
      lines.push(...children);
      lines.push('    </bpmn:participant>');
    }
  }
  for (const entryId of model.order) {
    const edge = model.edges[entryId];
    if (edge === undefined || edge.type !== 'messageFlow') {
      continue;
    }
    const attrs: AttrPair[] = [
      ['id', edge.id],
      ['name', edge.name],
      ['sourceRef', edge.sourceRef],
      ['targetRef', edge.targetRef],
      ...foreignPairs(edge.foreignAttributes),
    ];
    const children: string[] = [];
    pushDocumentation(children, '      ', edge.documentation);
    for (const fragment of edge.foreignChildren ?? []) {
      children.push(`      ${fragment}`);
    }
    const open = `    <bpmn:messageFlow${formatAttrs(attrs)}`;
    if (children.length === 0) {
      lines.push(`${open} />`);
    } else {
      lines.push(`${open}>`);
      lines.push(...children);
      lines.push('    </bpmn:messageFlow>');
    }
  }
  lines.push('  </bpmn:collaboration>');
}

function writeLaneSet(
  lines: string[],
  processId: string,
  lanes: readonly BpmnLane[],
  depth: number,
): void {
  if (lanes.length === 0) {
    return;
  }
  const indent = '  '.repeat(depth);
  lines.push(
    `${indent}<bpmn:laneSet id="${escapeXmlAttribute(processId)}_laneSet">`,
  );
  for (const lane of lanes) {
    const open = `${indent}  <bpmn:lane${formatAttrs([
      ['id', lane.id],
      ['name', lane.name],
      ...foreignPairs(lane.foreignAttributes),
    ])}`;
    if (lane.flowNodeRefs.length === 0) {
      lines.push(`${open} />`);
      continue;
    }
    lines.push(`${open}>`);
    for (const ref of lane.flowNodeRefs) {
      lines.push(
        `${indent}    <bpmn:flowNodeRef>${escapeXmlText(ref)}</bpmn:flowNodeRef>`,
      );
    }
    lines.push(`${indent}  </bpmn:lane>`);
  }
  lines.push(`${indent}</bpmn:laneSet>`);
}

/** Emits the definitions-level category/categoryValue pair of every labeled group. */
function writeCategories(lines: string[], model: BpmnDiagram): void {
  for (const entryId of model.order) {
    const node = model.nodes[entryId];
    if (
      node === undefined ||
      node.type !== 'group' ||
      node.name === undefined
    ) {
      continue;
    }
    const escapedId = escapeXmlAttribute(node.id);
    lines.push(`  <bpmn:category id="${escapedId}_cat">`);
    lines.push(
      `    <bpmn:categoryValue id="${escapedId}_val" value="${escapeXmlAttribute(node.name)}" />`,
    );
    lines.push('  </bpmn:category>');
  }
}

/** The root bucket key of the process a top-level node belongs to. */
function rootKeyOf(model: BpmnDiagram, node: BpmnNode): string {
  const poolId = node.poolId;
  if (poolId === undefined) {
    return DEFAULT_ROOT;
  }
  const pool = model.pools[poolId];
  if (pool === undefined || pool.processRef === model.processId) {
    return DEFAULT_ROOT;
  }
  if (pool.processRef === undefined) {
    return DEFAULT_ROOT; // black-box pools have no process to write into
  }
  return `\u0000pool:${poolId}`;
}

/**
 * Groups `model.order` into per-container child lists: nested nodes by their
 * `parentId`, top-level nodes by their pool's process bucket, and edges by
 * their source node's bucket. Message flows (serialized in the collaboration)
 * and data associations (serialized inside their host activity) are excluded.
 * Relative order is preserved.
 */
function groupByParent(model: BpmnDiagram): Map<string, string[]> {
  const byParent = new Map<string, string[]>();
  const bucketOf = (entryId: string): string | null => {
    const node = model.nodes[entryId];
    if (node !== undefined) {
      return node.parentId ?? rootKeyOf(model, node);
    }
    const edge = model.edges[entryId];
    if (edge === undefined) {
      return null;
    }
    if (edge.type === 'messageFlow' || edge.type === 'dataAssociation') {
      return null;
    }
    const source = model.nodes[edge.sourceRef];
    if (source === undefined) {
      return DEFAULT_ROOT;
    }
    return source.parentId ?? rootKeyOf(model, source);
  };
  for (const entryId of model.order) {
    const bucket = bucketOf(entryId);
    if (bucket === null) {
      continue;
    }
    const list = byParent.get(bucket);
    if (list === undefined) {
      byParent.set(bucket, [entryId]);
    } else {
      list.push(entryId);
    }
  }
  return byParent;
}

function writeContainer(
  lines: string[],
  model: BpmnDiagram,
  byParent: Map<string, string[]>,
  bucket: string,
  depth: number,
): void {
  for (const entryId of byParent.get(bucket) ?? []) {
    const node = model.nodes[entryId];
    if (node !== undefined) {
      writeNode(lines, model, byParent, node, depth);
      continue;
    }
    const edge = model.edges[entryId];
    if (edge !== undefined) {
      writeEdge(lines, edge, depth);
    }
  }
}

function writeNode(
  lines: string[],
  model: BpmnDiagram,
  byParent: Map<string, string[]>,
  node: BpmnNode,
  depth: number,
): void {
  const indent = '  '.repeat(depth);
  const inner = `${indent}  `;
  if (node.type === 'textAnnotation') {
    const children: string[] = [];
    pushDocumentation(children, inner, node.documentation);
    for (const fragment of node.foreignChildren ?? []) {
      children.push(`${inner}${fragment}`);
    }
    if (node.text !== '') {
      children.push(
        `${inner}<bpmn:text>${escapeXmlText(node.text)}</bpmn:text>`,
      );
    }
    writeElement(
      lines,
      'textAnnotation',
      [['id', node.id], ...foreignPairs(node.foreignAttributes)],
      children,
      indent,
    );
    return;
  }
  if (node.type === 'dataObject') {
    // The node is the reference; a deterministic backing element is emitted
    // alongside it (`{id}_ref`) so validators see a real dataObject.
    lines.push(
      `${indent}<bpmn:dataObject id="${escapeXmlAttribute(node.id)}_ref" />`,
    );
    const children = withDocumentation(node, inner);
    writeElement(
      lines,
      'dataObjectReference',
      [
        ['id', node.id],
        ['name', node.name],
        ['dataObjectRef', `${node.id}_ref`],
        ...foreignPairs(node.foreignAttributes),
      ],
      children,
      indent,
    );
    return;
  }
  if (node.type === 'dataStore') {
    const children = withDocumentation(node, inner);
    writeElement(
      lines,
      'dataStoreReference',
      [
        ['id', node.id],
        ['name', node.name],
        ...foreignPairs(node.foreignAttributes),
      ],
      children,
      indent,
    );
    return;
  }
  if (node.type === 'group') {
    const children = withDocumentation(node, inner);
    writeElement(
      lines,
      'group',
      [
        ['id', node.id],
        [
          'categoryValueRef',
          node.name !== undefined ? `${node.id}_val` : undefined,
        ],
        ...foreignPairs(node.foreignAttributes),
      ],
      children,
      indent,
    );
    return;
  }
  const children: string[] = [];
  pushDocumentation(children, inner, node.documentation);
  pushExtensions(children, inner, node.extensionElements);
  for (const fragment of node.foreignChildren ?? []) {
    children.push(`${inner}${fragment}`);
  }
  if (node.eventDefinition !== undefined) {
    writeEventDefinition(children, node, inner);
  }
  const markers = node.markers ?? [];
  if (markers.includes('loop')) {
    children.push(`${inner}<bpmn:standardLoopCharacteristics />`);
  }
  if (markers.includes('multiInstanceParallel')) {
    children.push(`${inner}<bpmn:multiInstanceLoopCharacteristics />`);
  }
  if (markers.includes('multiInstanceSequential')) {
    children.push(
      `${inner}<bpmn:multiInstanceLoopCharacteristics isSequential="true" />`,
    );
  }
  for (const edge of sequenceFlowsInOrder(model)) {
    if (edge.targetRef === node.id) {
      children.push(
        `${inner}<bpmn:incoming>${escapeXmlText(edge.id)}</bpmn:incoming>`,
      );
    }
  }
  for (const edge of sequenceFlowsInOrder(model)) {
    if (edge.sourceRef === node.id) {
      children.push(
        `${inner}<bpmn:outgoing>${escapeXmlText(edge.id)}</bpmn:outgoing>`,
      );
    }
  }
  writeDataAssociations(children, model, node.id, inner);
  const isContainer = isBpmnSubProcessType(node.type);
  const localName =
    node.type === 'transaction'
      ? 'transaction'
      : isContainer
        ? 'subProcess'
        : node.type;
  const attrs: AttrPair[] = [
    ['id', node.id],
    ['name', node.name],
    ['default', node.defaultFlowId],
    ...foreignPairs(node.foreignAttributes),
  ];
  if (node.type === 'boundaryEvent') {
    attrs.push(['attachedToRef', node.attachedToRef]);
    if (node.cancelActivity === false) {
      attrs.push(['cancelActivity', 'false']);
    }
  }
  if (node.type === 'callActivity') {
    attrs.push(['calledElement', node.calledElement]);
  }
  if (node.type === 'eventSubProcess') {
    attrs.push(['triggeredByEvent', 'true']);
  }
  if (markers.includes('compensation')) {
    attrs.push(['isForCompensation', 'true']);
  }
  if (!isContainer) {
    writeElement(lines, localName, attrs, children, indent);
    return;
  }
  // Sub-process containers nest their flow elements after the plain children.
  const nested: string[] = [];
  writeContainer(nested, model, byParent, node.id, depth + 1);
  writeElement(lines, localName, attrs, [...children, ...nested], indent);
}

/**
 * Appends the activity's data input/output associations (v0.4 serialization:
 * a data-source edge becomes `<bpmn:dataInputAssociation>` inside the target
 * activity, everything else `<bpmn:dataOutputAssociation>` inside the source).
 */
function writeDataAssociations(
  children: string[],
  model: BpmnDiagram,
  nodeId: string,
  inner: string,
): void {
  const isData = (ref: string): boolean => {
    const node = model.nodes[ref];
    return node !== undefined && isBpmnDataNodeType(node.type);
  };
  for (const entryId of model.order) {
    const edge = model.edges[entryId];
    if (edge === undefined || edge.type !== 'dataAssociation') {
      continue;
    }
    const asInput = isData(edge.sourceRef);
    if (asInput && edge.targetRef === nodeId) {
      children.push(
        `${inner}<bpmn:dataInputAssociation id="${escapeXmlAttribute(edge.id)}">`,
      );
      pushDocumentation(children, `${inner}  `, edge.documentation);
      for (const fragment of edge.foreignChildren ?? []) {
        children.push(`${inner}  ${fragment}`);
      }
      children.push(
        `${inner}  <bpmn:sourceRef>${escapeXmlText(edge.sourceRef)}</bpmn:sourceRef>`,
      );
      children.push(`${inner}</bpmn:dataInputAssociation>`);
    } else if (!asInput && edge.sourceRef === nodeId) {
      children.push(
        `${inner}<bpmn:dataOutputAssociation id="${escapeXmlAttribute(edge.id)}">`,
      );
      pushDocumentation(children, `${inner}  `, edge.documentation);
      for (const fragment of edge.foreignChildren ?? []) {
        children.push(`${inner}  ${fragment}`);
      }
      children.push(
        `${inner}  <bpmn:targetRef>${escapeXmlText(edge.targetRef)}</bpmn:targetRef>`,
      );
      children.push(`${inner}</bpmn:dataOutputAssociation>`);
    }
  }
}

function sequenceFlowsInOrder(model: BpmnDiagram): BpmnEdge[] {
  const flows: BpmnEdge[] = [];
  for (const entryId of model.order) {
    const edge = model.edges[entryId];
    if (edge !== undefined && edge.type === 'sequenceFlow') {
      flows.push(edge);
    }
  }
  return flows;
}

function writeEdge(lines: string[], edge: BpmnEdge, depth: number): void {
  const indent = '  '.repeat(depth);
  const inner = `${indent}  `;
  const children: string[] = [];
  pushDocumentation(children, inner, edge.documentation);
  if (edge.type === 'sequenceFlow') {
    pushExtensions(children, inner, edge.extensionElements);
  }
  for (const fragment of edge.foreignChildren ?? []) {
    children.push(`${inner}${fragment}`);
  }
  if (edge.type === 'sequenceFlow') {
    if (edge.conditionExpression !== undefined) {
      children.push(
        `${inner}<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">` +
          `${escapeXmlText(edge.conditionExpression)}</bpmn:conditionExpression>`,
      );
    }
    writeElement(
      lines,
      'sequenceFlow',
      [
        ['id', edge.id],
        ['name', edge.name],
        ['sourceRef', edge.sourceRef],
        ['targetRef', edge.targetRef],
        ...foreignPairs(edge.foreignAttributes),
      ],
      children,
      indent,
    );
    return;
  }
  writeElement(
    lines,
    'association',
    [
      ['id', edge.id],
      ['sourceRef', edge.sourceRef],
      ['targetRef', edge.targetRef],
      ...foreignPairs(edge.foreignAttributes),
    ],
    children,
    indent,
  );
}

function writeElement(
  lines: string[],
  localName: string,
  attrs: readonly AttrPair[],
  children: readonly string[],
  indent: string,
): void {
  const open = `${indent}<bpmn:${localName}${formatAttrs(attrs)}`;
  if (children.length === 0) {
    lines.push(`${open} />`);
    return;
  }
  lines.push(`${open}>`);
  lines.push(...children);
  lines.push(`${indent}</bpmn:${localName}>`);
}

function formatBounds(indent: string, tag: string, bounds: Rect): string {
  return (
    `${indent}<${tag} x="${Math.round(bounds.x)}" y="${Math.round(bounds.y)}"` +
    ` width="${Math.round(bounds.width)}" height="${Math.round(bounds.height)}" />`
  );
}

function hasDiColors(model: BpmnDiagram): boolean {
  return (
    Object.values(model.shapeDi).some(
      (di) => di.fill !== undefined || di.stroke !== undefined,
    ) ||
    Object.values(model.edgeDi).some(
      (di) => di.fill !== undefined || di.stroke !== undefined,
    )
  );
}

/** Formats bpmn.io-compatible `bioc:stroke`/`bioc:fill` attributes of a DI entry. */
function formatDiColors(di: {
  readonly fill?: string;
  readonly stroke?: string;
}): string {
  let attrs = '';
  if (di.stroke !== undefined) {
    attrs += ` bioc:stroke="${escapeXmlAttribute(di.stroke)}"`;
  }
  if (di.fill !== undefined) {
    attrs += ` bioc:fill="${escapeXmlAttribute(di.fill)}"`;
  }
  return attrs;
}

/** Writes the BPMNShape of a pool or lane, including `isHorizontal`. */
function writePoolShape(
  lines: string[],
  model: BpmnDiagram,
  elementId: string,
): void {
  const di = model.shapeDi[elementId];
  if (di === undefined) {
    return;
  }
  const escapedId = escapeXmlAttribute(elementId);
  const horizontal =
    di.horizontal !== undefined
      ? ` isHorizontal="${di.horizontal ? 'true' : 'false'}"`
      : '';
  lines.push(
    `      <bpmndi:BPMNShape id="${escapedId}_di" bpmnElement="${escapedId}"${horizontal}${formatDiColors(di)}>`,
  );
  lines.push(formatBounds('        ', 'dc:Bounds', di.bounds));
  lines.push('      </bpmndi:BPMNShape>');
}

function writeDi(
  lines: string[],
  model: BpmnDiagram,
  collabId: string | undefined,
): void {
  lines.push('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">');
  lines.push(
    `    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${escapeXmlAttribute(collabId ?? model.processId)}">`,
  );
  for (const pool of Object.values(model.pools)) {
    writePoolShape(lines, model, pool.id);
    for (const lane of pool.lanes) {
      writePoolShape(lines, model, lane.id);
    }
  }
  for (const entryId of model.order) {
    const escapedId = escapeXmlAttribute(entryId);
    const node = model.nodes[entryId];
    const shape = node !== undefined ? model.shapeDi[entryId] : undefined;
    if (shape !== undefined && node !== undefined) {
      const expanded =
        node.type !== 'textAnnotation' && isBpmnSubProcessType(node.type)
          ? ` isExpanded="${node.collapsed === true ? 'false' : 'true'}"`
          : '';
      lines.push(
        `      <bpmndi:BPMNShape id="${escapedId}_di" bpmnElement="${escapedId}"${expanded}${formatDiColors(shape)}>`,
      );
      lines.push(formatBounds('        ', 'dc:Bounds', shape.bounds));
      if (shape.labelBounds !== undefined) {
        lines.push('        <bpmndi:BPMNLabel>');
        lines.push(formatBounds('          ', 'dc:Bounds', shape.labelBounds));
        lines.push('        </bpmndi:BPMNLabel>');
      }
      lines.push('      </bpmndi:BPMNShape>');
      continue;
    }
    const edgeShape =
      model.edges[entryId] !== undefined ? model.edgeDi[entryId] : undefined;
    if (edgeShape !== undefined) {
      lines.push(
        `      <bpmndi:BPMNEdge id="${escapedId}_di" bpmnElement="${escapedId}"${formatDiColors(edgeShape)}>`,
      );
      for (const waypoint of edgeShape.waypoints) {
        lines.push(
          `        <di:waypoint x="${Math.round(waypoint.x)}" y="${Math.round(waypoint.y)}" />`,
        );
      }
      if (edgeShape.labelBounds !== undefined) {
        lines.push('        <bpmndi:BPMNLabel>');
        lines.push(
          formatBounds('          ', 'dc:Bounds', edgeShape.labelBounds),
        );
        lines.push('        </bpmndi:BPMNLabel>');
      }
      lines.push('      </bpmndi:BPMNEdge>');
    }
  }
  lines.push('    </bpmndi:BPMNPlane>');
  lines.push('  </bpmndi:BPMNDiagram>');
}

// ------------------------------------------------------- G5b payload writers

/** Appends `<bpmn:documentation>` when the element has documentation text. */
function pushDocumentation(
  lines: string[],
  indent: string,
  text: string | undefined,
): void {
  if (text === undefined) return;
  lines.push(
    `${indent}<bpmn:documentation>${escapeXmlText(text)}</bpmn:documentation>`,
  );
}

/** Appends `<bpmn:extensionElements>` with the element tree, when non-empty. */
function pushExtensions(
  lines: string[],
  indent: string,
  elements: readonly BpmnXmlElement[] | undefined,
): void {
  if (elements === undefined || elements.length === 0) return;
  lines.push(`${indent}<bpmn:extensionElements>`);
  for (const element of elements) {
    writeBpmnXmlElement(element, `${indent}  `, lines);
  }
  lines.push(`${indent}</bpmn:extensionElements>`);
}

/** The documentation line plus the verbatim fragments of a data node or group. */
function withDocumentation(
  node: {
    readonly documentation?: string;
    readonly foreignChildren?: readonly string[];
  },
  inner: string,
): string[] {
  const children: string[] = [];
  pushDocumentation(children, inner, node.documentation);
  for (const fragment of node.foreignChildren ?? []) {
    children.push(`${inner}${fragment}`);
  }
  return children;
}

/**
 * Writes an event's definition with its payload: the timer expression, the
 * root-element reference, the condition or the link name. The definition id
 * is the imported one when it was not the derived `{eventId}_def`.
 */
function writeEventDefinition(
  children: string[],
  node: BpmnFlowNode,
  inner: string,
): void {
  const kind = node.eventDefinition;
  if (kind === undefined) return;
  const details = node.eventDetails;
  const attrs: AttrPair[] = [
    ['id', details?.id ?? `${node.id}_def`],
    ...foreignPairs(details?.foreignAttributes),
  ];
  if (
    details?.ref !== undefined &&
    (kind === 'message' ||
      kind === 'signal' ||
      kind === 'error' ||
      kind === 'escalation')
  ) {
    attrs.push([`${kind}Ref`, details.ref]);
  }
  if (kind === 'link' && details?.linkName !== undefined) {
    attrs.push(['name', details.linkName]);
  }
  const body: string[] = [];
  if (
    kind === 'timer' &&
    details?.timer !== undefined &&
    TIMER_TAGS.has(details.timer.kind)
  ) {
    body.push(
      `${inner}  <bpmn:${details.timer.kind} xsi:type="bpmn:tFormalExpression">` +
        `${escapeXmlText(details.timer.expression)}</bpmn:${details.timer.kind}>`,
    );
  }
  if (kind === 'conditional' && details?.condition !== undefined) {
    body.push(
      `${inner}  <bpmn:condition xsi:type="bpmn:tFormalExpression">` +
        `${escapeXmlText(details.condition)}</bpmn:condition>`,
    );
  }
  for (const fragment of details?.foreignChildren ?? []) {
    body.push(`${inner}  ${fragment}`);
  }
  writeElement(children, `${kind}EventDefinition`, attrs, body, inner);
}

const TIMER_TAGS: ReadonlySet<string> = new Set([
  'timeDate',
  'timeDuration',
  'timeCycle',
]);

const ROOT_TAGS: ReadonlySet<string> = new Set([
  'message',
  'signal',
  'error',
  'escalation',
]);

/** Emits the definitions-level messages, signals, errors and escalations. */
function writeRootElements(lines: string[], model: BpmnDiagram): void {
  for (const root of model.rootElements ?? []) {
    if (!ROOT_TAGS.has(root.type)) continue;
    const attrs: AttrPair[] = [
      ['id', root.id],
      ['name', root.name],
      ...foreignPairs(root.foreignAttributes),
    ];
    if (root.code !== undefined && root.type === 'error') {
      attrs.push(['errorCode', root.code]);
    }
    if (root.code !== undefined && root.type === 'escalation') {
      attrs.push(['escalationCode', root.code]);
    }
    const children = (root.foreignChildren ?? []).map(
      (fragment) => `    ${fragment}`,
    );
    writeElement(lines, root.type, attrs, children, '  ');
  }
}
