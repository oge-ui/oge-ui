/**
 * Pictures, charts and shapes of a worksheet's drawing part
 * (`xl/drawings/drawingN.xml`): where each is anchored, which media part a
 * picture shows, what a chart's part says (`read-chart.ts`) and what a shape,
 * connector, group or text box draws (the slide reader's DrawingML support).
 * Controls and linked pictures are counted for the import issues; the drawing
 * part itself stays opaque so a save keeps every object.
 *
 * Offsets are EMUs in the file (914,400 per inch); the model keeps CSS
 * pixels at 96 dpi (9,525 EMU each).
 */
import type { OgeSheetChart } from '../model/chart';
import { OGE_DRAWN_CHART_KINDS } from './drawn-chart-kinds';
import type {
  OgePicture,
  OgePictureAnchor,
  OgePictureCorner,
  OgeSheetShape,
} from '../model/sheet-features';
import type { OgeDrawingShapeReader } from '../powerpoint/read-pptx';
import type { OgePackageParts } from './package';
import { readOgeChart, type OgeChartReadContext } from './read-chart';
import {
  ogeXmlAttribute,
  ogeXmlBool,
  ogeXmlChild,
  ogeXmlIndex,
  ogeXmlNumber,
  parseOgeXmlTree,
  type OgeXmlNode,
} from './xml-tree';

const CHART_URI = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
/** Excel 2016's charts (waterfall, treemap, sunburst, histogram, box and whisker, funnel, map). */
const CHARTEX_URI = 'http://schemas.microsoft.com/office/drawing/2014/chartex';

export { OGE_DRAWN_CHART_KINDS } from './drawn-chart-kinds';

const EMU_PER_PIXEL = 9525;

/** Media a browser can show; EMF/WMF (vector Office formats) cannot. */
const SHOWABLE = /\.(png|jpe?g|gif|bmp|webp|svg|tiff?)$/i;

/** What a drawing part holds. */
export interface OgeDrawingContent {
  readonly pictures: OgePicture[];
  readonly charts: OgeSheetChart[];
  /** Shapes, connectors, groups and text boxes (with a shape reader). */
  readonly shapes: OgeSheetShape[];
  /** Objects that are none of these (controls, linked pictures, unreadable shapes). */
  readonly others: number;
  /** Pictures whose media a browser cannot show (EMF, WMF). */
  readonly unshowable: number;
  /**
   * Charts of a kind the viewer does not draw, by kind: radar, stock,
   * surface, ofPie, or an Excel 2016 chart's layout (waterfall, treemap, …).
   */
  readonly undrawnCharts: readonly string[];
}

function corner(node: OgeXmlNode | undefined): OgePictureCorner | undefined {
  if (!node) return undefined;
  const value = (name: string) =>
    ogeXmlIndex(ogeXmlChild(node, name)?.text.trim());
  const col = value('col');
  const row = value('row');
  if (col === undefined || row === undefined) return undefined;
  return {
    col,
    row,
    colOffset:
      (ogeXmlNumber(ogeXmlChild(node, 'colOff')?.text.trim()) ?? 0) /
      EMU_PER_PIXEL,
    rowOffset:
      (ogeXmlNumber(ogeXmlChild(node, 'rowOff')?.text.trim()) ?? 0) /
      EMU_PER_PIXEL,
  };
}

function size(
  node: OgeXmlNode | undefined,
): { width: number; height: number } | undefined {
  const cx = ogeXmlNumber(node?.attributes['cx']);
  const cy = ogeXmlNumber(node?.attributes['cy']);
  return cx === undefined || cy === undefined
    ? undefined
    : { width: cx / EMU_PER_PIXEL, height: cy / EMU_PER_PIXEL };
}

/** The picture inside an anchor (possibly in a group); `undefined` if none. */
function findPicture(node: OgeXmlNode): OgeXmlNode | undefined {
  for (const child of node.children) {
    if (child.name === 'pic') return child;
    if (child.name === 'AlternateContent') {
      const choice =
        child.children.find((c) => c.name === 'Choice') ??
        child.children.find((c) => c.name === 'Fallback');
      const inner = choice ? findPicture(choice) : undefined;
      if (inner) return inner;
    }
  }
  return undefined;
}

/**
 * The chart of a graphic frame in an anchor — its relationship id, and
 * whether it is an Excel 2016 chart (`cx:`); `undefined` if it holds none.
 */
function findChart(
  node: OgeXmlNode,
): { readonly id: string; readonly extended: boolean } | undefined {
  for (const child of node.children) {
    if (child.name === 'graphicFrame') {
      const data = ogeXmlChild(ogeXmlChild(child, 'graphic'), 'graphicData');
      const uri = data?.attributes['uri'];
      if (uri !== CHART_URI && uri !== CHARTEX_URI) return undefined;
      const chart = ogeXmlChild(data, 'chart');
      const id = chart
        ? ogeXmlAttribute(chart.attributes, 'id', true)
        : undefined;
      return id ? { id, extended: uri === CHARTEX_URI } : undefined;
    }
    if (child.name === 'AlternateContent') {
      const choice =
        child.children.find((c) => c.name === 'Choice') ??
        child.children.find((c) => c.name === 'Fallback');
      const inner = choice ? findChart(choice) : undefined;
      if (inner) return inner;
    }
  }
  return undefined;
}

/** An Excel 2016 chart's layout (`cx:series/@layoutId`: waterfall, treemap, …). */
function extendedKind(xml: string | undefined): string {
  if (!xml) return 'chartex';
  try {
    const region = ogeXmlChild(
      ogeXmlChild(ogeXmlChild(parseOgeXmlTree(xml), 'chart'), 'plotArea'),
      'plotAreaRegion',
    );
    const series = region?.children.find((c) => c.name === 'series');
    return series?.attributes['layoutId'] || 'chartex';
  } catch {
    return 'chartex';
  }
}

/** Where an anchor puts its object; `undefined` when it says too little. */
function placementOf(
  anchor: OgeXmlNode,
  transform: OgeXmlNode | undefined,
): OgePictureAnchor | undefined {
  const from = corner(ogeXmlChild(anchor, 'from'));
  const to = corner(ogeXmlChild(anchor, 'to'));
  const extent =
    size(ogeXmlChild(anchor, 'ext')) ?? size(ogeXmlChild(transform, 'ext'));
  const position = ogeXmlChild(anchor, 'pos');
  const editAs = anchor.attributes['editAs'];
  const kind: OgePictureAnchor['kind'] =
    anchor.name === 'absoluteAnchor'
      ? 'absolute'
      : anchor.name === 'oneCellAnchor'
        ? 'oneCell'
        : editAs === 'absolute' || editAs === 'oneCell'
          ? editAs
          : 'twoCell';
  if (anchor.name === 'absoluteAnchor' && position && extent) {
    return {
      kind: 'absolute',
      x: (ogeXmlNumber(position.attributes['x']) ?? 0) / EMU_PER_PIXEL,
      y: (ogeXmlNumber(position.attributes['y']) ?? 0) / EMU_PER_PIXEL,
      ...extent,
    };
  }
  if (from && to && anchor.name === 'twoCellAnchor') return { kind, from, to };
  if (from && extent) return { kind, from, ...extent };
  return undefined;
}

const SHAPE_NODES = new Set(['sp', 'cxnSp', 'grpSp']);

/** The shape, connector or group of an anchor, through `AlternateContent`. */
function findShape(node: OgeXmlNode): OgeXmlNode | undefined {
  for (const child of node.children) {
    if (SHAPE_NODES.has(child.name)) return child;
    if (child.name === 'AlternateContent') {
      // the fallback is what a consumer without the extension shows
      const branch =
        child.children.find((c) => c.name === 'Fallback') ??
        child.children.find((c) => c.name === 'Choice');
      const inner = branch ? findShape(branch) : undefined;
      if (inner) return inner;
    }
  }
  return undefined;
}

/**
 * The box a shape covers, EMU: its frame turned by its rotation — which is
 * what the anchor spans (a connector turned 90° is anchored tall, not wide).
 */
function shapeBox(
  node: OgeXmlNode,
):
  | { xfrm: OgeXmlNode; x: number; y: number; width: number; height: number }
  | undefined {
  const properties = ogeXmlChild(
    node,
    node.name === 'grpSp' ? 'grpSpPr' : 'spPr',
  );
  const xfrm = ogeXmlChild(properties, 'xfrm');
  const off = ogeXmlChild(xfrm, 'off');
  const ext = ogeXmlChild(xfrm, 'ext');
  if (!xfrm || !off || !ext) return undefined;
  const x = ogeXmlNumber(off.attributes['x']) ?? 0;
  const y = ogeXmlNumber(off.attributes['y']) ?? 0;
  const width = ogeXmlNumber(ext.attributes['cx']) ?? 0;
  const height = ogeXmlNumber(ext.attributes['cy']) ?? 0;
  const radians =
    (((ogeXmlNumber(xfrm.attributes['rot']) ?? 0) / 60000) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  // round away float noise: 90° leaves cos at ~6e-17
  const turnedWidth = Math.round(width * cos + height * sin);
  const turnedHeight = Math.round(width * sin + height * cos);
  return {
    xfrm,
    x: x + (width - turnedWidth) / 2,
    y: y + (height - turnedHeight) / 2,
    width: turnedWidth,
    height: turnedHeight,
  };
}

/**
 * Reads the pictures, charts and shapes of a drawing part; charts need the
 * theme for their colours, shapes a reader built on it.
 */
export function readOgeDrawing(
  root: OgeXmlNode,
  path: string,
  pkg: OgePackageParts,
  context?: OgeChartReadContext,
  shapeReader?: OgeDrawingShapeReader | null,
): OgeDrawingContent {
  const rels = pkg.relationships(path);
  const pictures: OgePicture[] = [];
  const charts: OgeSheetChart[] = [];
  const shapes: OgeSheetShape[] = [];
  const undrawnCharts: string[] = [];
  let others = 0;
  let unshowable = 0;
  let order = -1;
  for (const anchor of root.children) {
    if (
      anchor.name !== 'twoCellAnchor' &&
      anchor.name !== 'oneCellAnchor' &&
      anchor.name !== 'absoluteAnchor'
    )
      continue;
    // the anchors' order is the drawing's stacking order
    order++;
    const shapeNode = shapeReader ? findShape(anchor) : undefined;
    if (shapeNode && shapeReader) {
      const box = shapeBox(shapeNode);
      const placement = box ? placementOf(anchor, box.xfrm) : undefined;
      const elements =
        box && placement ? shapeReader.read(shapeNode, path, box) : [];
      if (!box || !placement || elements.length === 0) {
        others++;
        continue;
      }
      const properties = ogeXmlChild(
        shapeNode.children.find((c) => c.name.startsWith('nv')),
        'cNvPr',
      );
      shapes.push({
        anchor: placement,
        order,
        width: box.width,
        height: box.height,
        elements,
        ...(properties?.attributes['name']
          ? { name: properties.attributes['name'] }
          : {}),
        ...(properties?.attributes['descr']
          ? { description: properties.attributes['descr'] }
          : {}),
        ...(ogeXmlBool(properties?.attributes['hidden'], false)
          ? { hidden: true }
          : {}),
      });
      continue;
    }
    const pic = findPicture(anchor);
    if (!pic) {
      const found = context ? findChart(anchor) : undefined;
      const chartRel = found
        ? rels.find((r) => r.id === found.id && !r.external)
        : undefined;
      const xml = chartRel ? pkg.text(chartRel.target) : undefined;
      if (found?.extended) {
        undrawnCharts.push(extendedKind(xml));
        continue;
      }
      const frame = anchor.children.find((c) => c.name === 'graphicFrame');
      const properties = ogeXmlChild(
        ogeXmlChild(frame, 'nvGraphicFramePr'),
        'cNvPr',
      );
      const placement = placementOf(anchor, ogeXmlChild(frame, 'xfrm'));
      let model: OgeSheetChart['chart'] | undefined;
      if (chartRel && xml && context && placement) {
        try {
          model = readOgeChart(parseOgeXmlTree(xml), chartRel.target, context);
        } catch {
          model = undefined;
        }
      }
      if (!model || !placement) {
        others++;
        continue;
      }
      const undrawn = model.groups.find(
        (g) => !OGE_DRAWN_CHART_KINDS.has(g.kind),
      );
      if (undrawn || !model.groups.length) {
        undrawnCharts.push(undrawn?.kind ?? 'empty');
        continue;
      }
      charts.push({
        anchor: placement,
        order,
        chart: model,
        ...(properties?.attributes['name']
          ? { name: properties.attributes['name'] }
          : {}),
        ...(properties?.attributes['descr']
          ? { description: properties.attributes['descr'] }
          : {}),
        ...(ogeXmlBool(properties?.attributes['hidden'], false)
          ? { hidden: true }
          : {}),
      });
      continue;
    }
    const blip = ogeXmlChild(ogeXmlChild(pic, 'blipFill'), 'blip');
    const embed = blip
      ? ogeXmlAttribute(blip.attributes, 'embed', true)
      : undefined;
    const rel = embed ? rels.find((r) => r.id === embed) : undefined;
    if (!rel || rel.external) {
      // a linked (external) picture is never fetched
      others++;
      continue;
    }
    if (!SHOWABLE.test(rel.target)) {
      unshowable++;
      continue;
    }
    const properties = ogeXmlChild(ogeXmlChild(pic, 'nvPicPr'), 'cNvPr');
    const transform = ogeXmlChild(ogeXmlChild(pic, 'spPr'), 'xfrm');
    const crop = ogeXmlChild(ogeXmlChild(pic, 'blipFill'), 'srcRect');
    const placement = placementOf(anchor, transform);
    if (!placement) {
      others++;
      continue;
    }
    const fraction = (name: string) =>
      (ogeXmlNumber(crop?.attributes[name]) ?? 0) / 100000;
    const rotation = (ogeXmlNumber(transform?.attributes['rot']) ?? 0) / 60000;
    pictures.push({
      anchor: placement,
      order,
      image: rel.target,
      ...(properties?.attributes['name']
        ? { name: properties.attributes['name'] }
        : {}),
      ...(properties?.attributes['descr']
        ? { description: properties.attributes['descr'] }
        : {}),
      ...(ogeXmlBool(properties?.attributes['hidden'], false)
        ? { hidden: true }
        : {}),
      ...(crop &&
      (fraction('l') || fraction('t') || fraction('r') || fraction('b'))
        ? {
            crop: {
              left: fraction('l'),
              top: fraction('t'),
              right: fraction('r'),
              bottom: fraction('b'),
            },
          }
        : {}),
      ...(rotation ? { rotation } : {}),
      ...(ogeXmlBool(transform?.attributes['flipH'], false)
        ? { flipH: true }
        : {}),
      ...(ogeXmlBool(transform?.attributes['flipV'], false)
        ? { flipV: true }
        : {}),
    });
  }
  return { pictures, charts, shapes, others, unshowable, undrawnCharts };
}
