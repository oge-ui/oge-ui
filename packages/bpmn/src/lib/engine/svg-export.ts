import type { BpmnDiagram, BpmnNode } from './bpmn-model';
import {
  POOL_HEADER_WIDTH,
  hiddenByCollapsed,
  isBpmnSubProcessType,
} from './bpmn-model';
import {
  activityMarkerPaths,
  collapsedMarkerPath,
  dataObjectPath,
  dataStorePath,
  eventDefinitionFilled,
  eventDefinitionPath,
} from './glyphs';
import { edgeLabelAnchor } from './edge-routing';
import type { Rect } from './geometry';
import { boundsOfRects } from './geometry';
import { escapeXmlAttribute, escapeXmlText } from './bpmn-xml-writer';

/** Options of {@link renderDiagramSvg}. */
export interface BpmnSvgExportOptions {
  /** Padding in diagram units added around the content bounds. Default 20. */
  readonly padding?: number;
}

// The exported artifact leaves the token system, so neutral colors are
// hardcoded: white fills, slate strokes/text, lighter slate for edges.
const FILL = '#fff';
const STROKE = '#334155';
const EDGE = '#64748b';

/**
 * Renders the diagram as a self-contained static `<svg>` string: shapes,
 * edges (with an arrowhead marker) and labels re-rendered from the model with
 * inline fill/stroke attributes, `viewBox` fitted to the content bounds plus
 * padding. No grid, no selection state, no external CSS — the string can be
 * written to a file or embedded as-is.
 */
export function renderDiagramSvg(
  model: BpmnDiagram,
  options?: BpmnSvgExportOptions,
): string {
  const padding = options?.padding ?? 20;
  const rects: Rect[] = Object.values(model.shapeDi).map((di) => di.bounds);
  for (const di of Object.values(model.edgeDi)) {
    for (const p of di.waypoints) {
      rects.push({ x: p.x, y: p.y, width: 0, height: 0 });
    }
  }
  const content = boundsOfRects(rects) ?? {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };
  const vb = {
    x: Math.floor(content.x - padding),
    y: Math.floor(content.y - padding),
    width: Math.ceil(content.width + 2 * padding),
    height: Math.ceil(content.height + 2 * padding),
  };
  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" ` +
      `width="${vb.width}" height="${vb.height}" fill="none" font-family="sans-serif">`,
  );
  lines.push(
    '  <defs><marker id="oge-bpmn-svg-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" ' +
      'orient="auto-start-reverse" markerUnits="userSpaceOnUse">' +
      `<path d="M0 0 L10 5 L0 10 Z" fill="${EDGE}" /></marker>` +
      '<marker id="oge-bpmn-svg-open-arrow" markerWidth="12" markerHeight="12" refX="10" refY="5" ' +
      'orient="auto-start-reverse" markerUnits="userSpaceOnUse">' +
      `<path d="M1 1 L10 5 L1 9 Z" fill="${FILL}" stroke="${EDGE}" stroke-width="1" /></marker></defs>`,
  );
  const hidden = hiddenByCollapsed(model);
  for (const pool of Object.values(model.pools)) {
    renderPool(lines, model, pool.id);
  }
  for (const id of model.order) {
    const edge = model.edges[id];
    const di = model.edgeDi[id];
    if (
      !edge ||
      !di ||
      di.waypoints.length < 2 ||
      hidden.has(edge.sourceRef) ||
      hidden.has(edge.targetRef)
    ) {
      continue;
    }
    const points = di.waypoints.map((p) => `${p.x},${p.y}`).join(' ');
    const dash =
      edge.type === 'association'
        ? ' stroke-dasharray="4 4"'
        : edge.type === 'messageFlow'
          ? ' stroke-dasharray="8 5"'
          : edge.type === 'dataAssociation'
            ? ' stroke-dasharray="2 4"'
            : '';
    const marker =
      edge.type === 'association'
        ? ''
        : edge.type === 'messageFlow' || edge.type === 'dataAssociation'
          ? ' marker-end="url(#oge-bpmn-svg-open-arrow)"'
          : ' marker-end="url(#oge-bpmn-svg-arrow)"';
    const stroke =
      di.stroke !== undefined ? escapeXmlAttribute(di.stroke) : EDGE;
    lines.push(
      `  <polyline points="${points}" stroke="${stroke}" stroke-width="1.5"${dash}${marker} />`,
    );
    if (edge.type === 'messageFlow') {
      // BPMN convention: a small open circle marks the message-flow source.
      const start = di.waypoints[0];
      lines.push(
        `  <circle cx="${start.x}" cy="${start.y}" r="4" fill="${FILL}" stroke="${stroke}" stroke-width="1.5" />`,
      );
    }
    if (
      (edge.type === 'sequenceFlow' || edge.type === 'messageFlow') &&
      edge.name
    ) {
      const anchor = edgeLabelAnchor(di.waypoints);
      lines.push(
        `  <text x="${anchor.x}" y="${anchor.y - 6}" text-anchor="middle" ` +
          `font-size="11" fill="${STROKE}">${escapeXmlText(edge.name)}</text>`,
      );
    }
  }
  for (const id of model.order) {
    const node = model.nodes[id];
    const di = model.shapeDi[id];
    if (!node || !di || hidden.has(id)) {
      continue;
    }
    renderNode(
      lines,
      node,
      di.bounds,
      di.fill !== undefined ? escapeXmlAttribute(di.fill) : FILL,
      di.stroke !== undefined ? escapeXmlAttribute(di.stroke) : STROKE,
    );
  }
  lines.push('</svg>');
  return lines.join('\n') + '\n';
}

/** Renders one pool band with its name strip, lanes and dividers. */
function renderPool(lines: string[], model: BpmnDiagram, poolId: string): void {
  const pool = model.pools[poolId];
  const di = model.shapeDi[poolId];
  if (!pool || !di) {
    return;
  }
  const b = di.bounds;
  const fill = di.fill !== undefined ? escapeXmlAttribute(di.fill) : FILL;
  const stroke =
    di.stroke !== undefined ? escapeXmlAttribute(di.stroke) : STROKE;
  lines.push(
    `  <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" ` +
      `fill="${fill}" stroke="${stroke}" stroke-width="1.5" />`,
  );
  lines.push(
    `  <line x1="${b.x + POOL_HEADER_WIDTH}" y1="${b.y}" x2="${b.x + POOL_HEADER_WIDTH}" ` +
      `y2="${b.y + b.height}" stroke="${stroke}" stroke-width="1.5" />`,
  );
  if (pool.name) {
    const cx = b.x + POOL_HEADER_WIDTH / 2;
    const cy = b.y + b.height / 2;
    lines.push(
      `  <text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="${STROKE}" ` +
        `transform="rotate(-90 ${cx} ${cy})">${escapeXmlText(pool.name)}</text>`,
    );
  }
  for (const lane of pool.lanes) {
    const laneDi = model.shapeDi[lane.id];
    if (!laneDi) {
      continue;
    }
    const lb = laneDi.bounds;
    lines.push(
      `  <rect x="${lb.x}" y="${lb.y}" width="${lb.width}" height="${lb.height}" ` +
        `fill="none" stroke="${stroke}" stroke-width="1" />`,
    );
    if (lane.name) {
      const lx = lb.x + 10;
      const ly = lb.y + lb.height / 2;
      lines.push(
        `  <text x="${lx}" y="${ly}" text-anchor="middle" font-size="11" fill="${STROKE}" ` +
          `transform="rotate(-90 ${lx} ${ly})">${escapeXmlText(lane.name)}</text>`,
      );
    }
  }
}

function renderNode(
  lines: string[],
  node: BpmnNode,
  b: Rect,
  fill: string,
  stroke: string,
): void {
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const type = node.type;
  if (
    type === 'startEvent' ||
    type === 'endEvent' ||
    type === 'intermediateThrowEvent' ||
    type === 'intermediateCatchEvent' ||
    type === 'boundaryEvent'
  ) {
    const width = type === 'endEvent' ? 4 : 1.5;
    const dash =
      type === 'boundaryEvent' &&
      node.type === 'boundaryEvent' &&
      node.cancelActivity === false
        ? ' stroke-dasharray="4 3"'
        : '';
    lines.push(
      `  <circle cx="${cx}" cy="${cy}" r="${b.width / 2}" fill="${fill}" ` +
        `stroke="${stroke}" stroke-width="${width}"${dash} />`,
    );
    if (
      type === 'intermediateThrowEvent' ||
      type === 'intermediateCatchEvent' ||
      type === 'boundaryEvent'
    ) {
      lines.push(
        `  <circle cx="${cx}" cy="${cy}" r="${b.width / 2 - 4}" fill="none" ` +
          `stroke="${stroke}" stroke-width="1.5"${dash} />`,
      );
    }
    if (
      type === 'intermediateThrowEvent' &&
      node.eventDefinition === undefined
    ) {
      lines.push(`  <circle cx="${cx}" cy="${cy}" r="4" fill="${stroke}" />`);
    }
    if (node.eventDefinition !== undefined) {
      const filled = eventDefinitionFilled(type, node.eventDefinition);
      lines.push(
        `  <path d="${eventDefinitionPath(node.eventDefinition, cx, cy)}" ` +
          `fill="${filled ? stroke : 'none'}" stroke="${stroke}" stroke-width="1.5" ` +
          'stroke-linejoin="round" />',
      );
    }
    label(lines, node, cx, b.y + b.height + 14, 'middle');
    return;
  }
  if (type === 'exclusiveGateway' || type === 'parallelGateway') {
    const d = `M${cx} ${b.y} L${b.x + b.width} ${cy} L${cx} ${b.y + b.height} L${b.x} ${cy} Z`;
    lines.push(
      `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />`,
    );
    const mark =
      type === 'exclusiveGateway'
        ? `M${cx - 8} ${cy - 8} L${cx + 8} ${cy + 8} M${cx + 8} ${cy - 8} L${cx - 8} ${cy + 8}`
        : `M${cx} ${cy - 9} V${cy + 9} M${cx - 9} ${cy} H${cx + 9}`;
    lines.push(
      `  <path d="${mark}" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" />`,
    );
    label(lines, node, cx, b.y + b.height + 14, 'middle');
    return;
  }
  if (type === 'textAnnotation') {
    lines.push(
      `  <path d="M${b.x + 15} ${b.y} H${b.x} V${b.y + b.height} H${b.x + 15}" ` +
        `stroke="${stroke}" stroke-width="1.5" fill="none" />`,
    );
    label(lines, node, b.x + 8, b.y + 16, 'start');
    return;
  }
  if (type === 'dataObject' || type === 'dataStore') {
    const path =
      type === 'dataObject'
        ? dataObjectPath(b.width, b.height)
        : dataStorePath(b.width, b.height);
    lines.push(
      `  <g transform="translate(${b.x} ${b.y})"><path d="${path}" fill="${fill}" ` +
        `stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" /></g>`,
    );
    label(lines, node, cx, b.y + b.height + 14, 'middle');
    return;
  }
  if (type === 'group') {
    lines.push(
      `  <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="10" ` +
        `fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="8 3 1 3" />`,
    );
    label(lines, node, cx, b.y + 16, 'middle');
    return;
  }
  const isContainer = isBpmnSubProcessType(type);
  const containerDash =
    type === 'eventSubProcess' ? ' stroke-dasharray="3 3"' : '';
  // Call activities render with the BPMN thick border.
  const borderWidth = type === 'callActivity' ? 3 : 1.5;
  lines.push(
    `  <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="10" ` +
      `fill="${fill}" stroke="${stroke}" stroke-width="${borderWidth}"${containerDash} />`,
  );
  if (type === 'transaction') {
    lines.push(
      `  <rect x="${b.x + 3}" y="${b.y + 3}" width="${b.width - 6}" height="${b.height - 6}" rx="7" ` +
        `fill="none" stroke="${stroke}" stroke-width="1.5" />`,
    );
  }
  const collapsed = isContainer && node.collapsed === true;
  // Glyph paths are shape-local; wrap them in a translated group.
  if (collapsed) {
    lines.push(
      `  <g transform="translate(${b.x} ${b.y})"><path d="${collapsedMarkerPath(b.width, b.height)}" ` +
        `fill="none" stroke="${stroke}" stroke-width="1.5" /></g>`,
    );
  }
  if ((node.markers?.length ?? 0) > 0) {
    for (const path of activityMarkerPaths(
      node.markers ?? [],
      b.width,
      b.height,
    )) {
      lines.push(
        `  <g transform="translate(${b.x} ${b.y})"><path d="${path}" fill="none" ` +
          `stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" /></g>`,
      );
    }
  }
  if (isContainer && !collapsed) {
    label(lines, node, b.x + 10, b.y + 18, 'start');
  } else {
    label(lines, node, cx, cy + 4, 'middle');
  }
}

function label(
  lines: string[],
  node: BpmnNode,
  x: number,
  y: number,
  anchor: 'middle' | 'start',
): void {
  const text = node.type === 'textAnnotation' ? node.text : (node.name ?? '');
  if (text.trim() === '') {
    return;
  }
  lines.push(
    `  <text x="${x}" y="${y}" text-anchor="${escapeXmlAttribute(anchor)}" ` +
      `font-size="12" fill="${STROKE}">${escapeXmlText(text)}</text>`,
  );
}
