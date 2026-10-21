/**
 * Pictures of a worksheet's drawing part (`xl/drawings/drawingN.xml`):
 * where each picture is anchored and which media part it shows. Charts,
 * shapes and other drawing objects are counted for the import issues; the
 * drawing part itself stays opaque so a save keeps every object.
 *
 * Offsets are EMUs in the file (914,400 per inch); the model keeps CSS
 * pixels at 96 dpi (9,525 EMU each).
 */
import type { OgePicture, OgePictureCorner } from '../model/sheet-features';
import type { OgePackageParts } from './package';
import {
  ogeXmlAttribute,
  ogeXmlBool,
  ogeXmlChild,
  ogeXmlIndex,
  ogeXmlNumber,
  type OgeXmlNode,
} from './xml-tree';

const EMU_PER_PIXEL = 9525;

/** Media a browser can show; EMF/WMF (vector Office formats) cannot. */
const SHOWABLE = /\.(png|jpe?g|gif|bmp|webp|svg|tiff?)$/i;

/** What a drawing part holds. */
export interface OgeDrawingContent {
  readonly pictures: OgePicture[];
  /** Objects that are not pictures (charts, shapes, groups, controls). */
  readonly others: number;
  /** Pictures whose media a browser cannot show (EMF, WMF). */
  readonly unshowable: number;
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

/** Reads the pictures of a drawing part. */
export function readOgeDrawing(
  root: OgeXmlNode,
  path: string,
  pkg: OgePackageParts,
): OgeDrawingContent {
  const rels = pkg.relationships(path);
  const pictures: OgePicture[] = [];
  let others = 0;
  let unshowable = 0;
  for (const anchor of root.children) {
    if (
      anchor.name !== 'twoCellAnchor' &&
      anchor.name !== 'oneCellAnchor' &&
      anchor.name !== 'absoluteAnchor'
    )
      continue;
    const pic = findPicture(anchor);
    if (!pic) {
      others++;
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
    const from = corner(ogeXmlChild(anchor, 'from'));
    const to = corner(ogeXmlChild(anchor, 'to'));
    const extent =
      size(ogeXmlChild(anchor, 'ext')) ?? size(ogeXmlChild(transform, 'ext'));
    const position = ogeXmlChild(anchor, 'pos');
    const editAs = anchor.attributes['editAs'];
    const kind: OgePicture['anchor']['kind'] =
      anchor.name === 'absoluteAnchor'
        ? 'absolute'
        : anchor.name === 'oneCellAnchor'
          ? 'oneCell'
          : editAs === 'absolute' || editAs === 'oneCell'
            ? editAs
            : 'twoCell';
    let placement: OgePicture['anchor'] | undefined;
    if (anchor.name === 'absoluteAnchor' && position && extent) {
      placement = {
        kind: 'absolute',
        x: (ogeXmlNumber(position.attributes['x']) ?? 0) / EMU_PER_PIXEL,
        y: (ogeXmlNumber(position.attributes['y']) ?? 0) / EMU_PER_PIXEL,
        ...extent,
      };
    } else if (from && to && anchor.name === 'twoCellAnchor') {
      placement = { kind, from, to };
    } else if (from && extent) {
      placement = { kind, from, ...extent };
    }
    if (!placement) {
      others++;
      continue;
    }
    const fraction = (name: string) =>
      (ogeXmlNumber(crop?.attributes[name]) ?? 0) / 100000;
    const rotation = (ogeXmlNumber(transform?.attributes['rot']) ?? 0) / 60000;
    pictures.push({
      anchor: placement,
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
  return { pictures, others, unshowable };
}
