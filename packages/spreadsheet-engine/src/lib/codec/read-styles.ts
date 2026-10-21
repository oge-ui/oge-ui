/**
 * `xl/styles.xml`: number formats, fonts, fills, borders, the cell formats
 * (`cellXfs`) cells point at, the differential formats (`dxfs`) conditional
 * formatting applies, and a custom legacy palette.
 *
 * Rendering follows what Excel does, measured: a cell paints with its own
 * `cellXfs` entry's font, fill and border — the `apply*` flags and the parent
 * cell style (`xfId`) never change what is shown.
 */
import type { OgeColor } from '../color/color';
import { ogeBuiltinNumberFormat } from '../format/number-format';
import type {
  OgeAlignment,
  OgeBorder,
  OgeBorderEdge,
  OgeBorderStyle,
  OgeCellStyle,
  OgeFill,
  OgeFont,
  OgeHorizontalAlignment,
  OgePatternType,
  OgeProtection,
  OgeUnderline,
  OgeVerticalAlignment,
} from '../model/style';
import {
  ogeXmlBool,
  ogeXmlChild,
  ogeXmlChildren,
  ogeXmlIndex,
  ogeXmlNumber,
  type OgeXmlNode,
} from './xml-tree';

/** What the style sheet yields. */
export interface OgeStyleSheet {
  /** One cell style per `cellXfs` entry (index = the cells' `s`). */
  readonly cellFormats: readonly OgeCellStyle[];
  /** Differential formats (`dxfs`). */
  readonly differential: readonly OgeCellStyle[];
  /** The Normal style's font (`cellStyleXfs` of the built-in Normal style). */
  readonly normalFont: OgeFont | undefined;
  /** A custom indexed palette, `RRGGBB`. */
  readonly indexedColors: readonly string[] | undefined;
}

/** A colour element (`color`, `fgColor`, `bgColor`, `tabColor`). */
export function readOgeColor(
  node: OgeXmlNode | undefined,
): OgeColor | undefined {
  if (!node) return undefined;
  const a = node.attributes;
  const tint = ogeXmlNumber(a['tint']);
  const withTint = (color: OgeColor): OgeColor =>
    tint ? { ...color, tint } : color;
  if (a['rgb'] !== undefined) return withTint({ rgb: a['rgb'] });
  const theme = ogeXmlIndex(a['theme']);
  if (theme !== undefined) return withTint({ theme });
  const indexed = ogeXmlIndex(a['indexed']);
  if (indexed !== undefined) return withTint({ indexed });
  if (ogeXmlBool(a['auto'], false)) return { auto: true };
  return undefined;
}

const UNDERLINES: readonly OgeUnderline[] = [
  'single',
  'double',
  'singleAccounting',
  'doubleAccounting',
];

/** A boolean font property element: `<b/>` is on, `<b val="0"/>` off. */
function flag(node: OgeXmlNode | undefined): boolean | undefined {
  return node ? ogeXmlBool(node.attributes['val'], true) : undefined;
}

/** A font (`font`, or a rich-text run's `rPr` where the name is `rFont`). */
export function readOgeFont(node: OgeXmlNode): OgeFont {
  const font: {
    -readonly [K in keyof OgeFont]: OgeFont[K];
  } = {};
  for (const child of node.children) {
    const val = child.attributes['val'];
    switch (child.name) {
      case 'name':
      case 'rFont':
        if (val) font.name = val;
        break;
      case 'sz': {
        const size = ogeXmlNumber(val);
        if (size !== undefined && size > 0) font.size = size;
        break;
      }
      case 'b':
        font.bold = flag(child);
        break;
      case 'i':
        font.italic = flag(child);
        break;
      case 'strike':
        font.strike = flag(child);
        break;
      case 'outline':
        font.outline = flag(child);
        break;
      case 'shadow':
        font.shadow = flag(child);
        break;
      case 'u': {
        const kind = (val ?? 'single') as OgeUnderline | 'none';
        if (kind !== 'none' && UNDERLINES.includes(kind)) font.underline = kind;
        break;
      }
      case 'vertAlign':
        if (val === 'superscript' || val === 'subscript') font.vertAlign = val;
        break;
      case 'color':
        font.color = readOgeColor(child);
        break;
      case 'family':
        font.family = ogeXmlIndex(val);
        break;
      case 'charset':
        font.charset = ogeXmlIndex(val);
        break;
      case 'scheme':
        if (val === 'major' || val === 'minor') font.scheme = val;
        break;
    }
  }
  // false flags are the default: drop them so equal fonts intern equal
  for (const key of [
    'bold',
    'italic',
    'strike',
    'outline',
    'shadow',
  ] as const) {
    if (!font[key]) delete font[key];
  }
  return font;
}

const PATTERNS: ReadonlySet<string> = new Set<OgePatternType>([
  'none',
  'solid',
  'mediumGray',
  'darkGray',
  'lightGray',
  'darkHorizontal',
  'darkVertical',
  'darkDown',
  'darkUp',
  'darkGrid',
  'darkTrellis',
  'lightHorizontal',
  'lightVertical',
  'lightDown',
  'lightUp',
  'lightGrid',
  'lightTrellis',
  'gray125',
  'gray0625',
]);

/**
 * A fill. In a differential format Excel stores a solid fill's colour in
 * `bgColor` (and may omit `patternType`): `differential` reads it that way.
 */
export function readOgeFill(
  node: OgeXmlNode,
  differential = false,
): OgeFill | undefined {
  const pattern = ogeXmlChild(node, 'patternFill');
  if (pattern) {
    const type = pattern.attributes['patternType'];
    const fg = readOgeColor(ogeXmlChild(pattern, 'fgColor'));
    const bg = readOgeColor(ogeXmlChild(pattern, 'bgColor'));
    if (differential && (type === undefined || type === 'solid')) {
      const color = bg ?? fg;
      return color
        ? { type: 'pattern', pattern: 'solid', fgColor: color }
        : undefined;
    }
    const kind = (type ?? 'none') as OgePatternType;
    if (!PATTERNS.has(kind) || kind === 'none') return undefined;
    return {
      type: 'pattern',
      pattern: kind,
      ...(fg ? { fgColor: fg } : {}),
      ...(bg ? { bgColor: bg } : {}),
    };
  }
  const gradient = ogeXmlChild(node, 'gradientFill');
  if (gradient) {
    const a = gradient.attributes;
    const stops = ogeXmlChildren(gradient, 'stop')
      .map((stop) => ({
        position: ogeXmlNumber(stop.attributes['position']) ?? 0,
        color: readOgeColor(ogeXmlChild(stop, 'color')),
      }))
      .filter(
        (stop): stop is { position: number; color: OgeColor } => !!stop.color,
      );
    if (stops.length === 0) return undefined;
    const path = a['type'] === 'path';
    const edge = (name: string) => ogeXmlNumber(a[name]);
    return {
      type: 'gradient',
      gradient: path ? 'path' : 'linear',
      ...(path
        ? {
            left: edge('left') ?? 0,
            right: edge('right') ?? 0,
            top: edge('top') ?? 0,
            bottom: edge('bottom') ?? 0,
          }
        : { degree: edge('degree') ?? 0 }),
      stops,
    };
  }
  return undefined;
}

const BORDER_STYLES: ReadonlySet<string> = new Set<OgeBorderStyle>([
  'thin',
  'medium',
  'thick',
  'dashed',
  'dotted',
  'double',
  'hair',
  'mediumDashed',
  'dashDot',
  'mediumDashDot',
  'dashDotDot',
  'mediumDashDotDot',
  'slantDashDot',
]);

function edge(node: OgeXmlNode | undefined): OgeBorderEdge | undefined {
  const style = node?.attributes['style'];
  if (!style || !BORDER_STYLES.has(style)) return undefined;
  const color = readOgeColor(ogeXmlChild(node, 'color'));
  return color
    ? { style: style as OgeBorderStyle, color }
    : { style: style as OgeBorderStyle };
}

/** A border; `start`/`end` (Strict, right-to-left aware) read as left/right. */
export function readOgeBorder(node: OgeXmlNode): OgeBorder | undefined {
  const border: { -readonly [K in keyof OgeBorder]: OgeBorder[K] } = {};
  const left = edge(ogeXmlChild(node, 'left') ?? ogeXmlChild(node, 'start'));
  const right = edge(ogeXmlChild(node, 'right') ?? ogeXmlChild(node, 'end'));
  const top = edge(ogeXmlChild(node, 'top'));
  const bottom = edge(ogeXmlChild(node, 'bottom'));
  const diagonal = edge(ogeXmlChild(node, 'diagonal'));
  if (left) border.left = left;
  if (right) border.right = right;
  if (top) border.top = top;
  if (bottom) border.bottom = bottom;
  if (diagonal) {
    const up = ogeXmlBool(node.attributes['diagonalUp'], false);
    const down = ogeXmlBool(node.attributes['diagonalDown'], false);
    if (up || down) {
      border.diagonal = diagonal;
      if (up) border.diagonalUp = true;
      if (down) border.diagonalDown = true;
    }
  }
  return Object.keys(border).length ? border : undefined;
}

const HORIZONTAL: ReadonlySet<string> = new Set<OgeHorizontalAlignment>([
  'general',
  'left',
  'center',
  'right',
  'fill',
  'justify',
  'centerContinuous',
  'distributed',
]);
const VERTICAL: ReadonlySet<string> = new Set<OgeVerticalAlignment>([
  'top',
  'center',
  'bottom',
  'justify',
  'distributed',
]);

function readAlignment(node: OgeXmlNode | undefined): OgeAlignment | undefined {
  if (!node) return undefined;
  const a = node.attributes;
  const alignment: { -readonly [K in keyof OgeAlignment]: OgeAlignment[K] } =
    {};
  // `start`/`end` are the Strict spellings of left/right
  const horizontal =
    a['horizontal'] === 'start'
      ? 'left'
      : a['horizontal'] === 'end'
        ? 'right'
        : a['horizontal'];
  if (horizontal && horizontal !== 'general' && HORIZONTAL.has(horizontal))
    alignment.horizontal = horizontal as OgeHorizontalAlignment;
  if (
    a['vertical'] &&
    a['vertical'] !== 'bottom' &&
    VERTICAL.has(a['vertical'])
  )
    alignment.vertical = a['vertical'] as OgeVerticalAlignment;
  if (ogeXmlBool(a['wrapText'], false)) alignment.wrapText = true;
  if (ogeXmlBool(a['shrinkToFit'], false)) alignment.shrinkToFit = true;
  const indent = ogeXmlIndex(a['indent']);
  if (indent) alignment.indent = Math.min(indent, 250);
  const rotation = ogeXmlIndex(a['textRotation']);
  if (rotation && (rotation <= 180 || rotation === 255))
    alignment.textRotation = rotation;
  const order = a['readingOrder'];
  if (order === '1') alignment.readingOrder = 'ltr';
  else if (order === '2') alignment.readingOrder = 'rtl';
  return Object.keys(alignment).length ? alignment : undefined;
}

function readProtection(
  node: OgeXmlNode | undefined,
): OgeProtection | undefined {
  if (!node) return undefined;
  const locked = ogeXmlBool(node.attributes['locked'], true);
  const hidden = ogeXmlBool(node.attributes['hidden'], false);
  if (locked && !hidden) return undefined;
  return {
    ...(locked ? {} : { locked: false }),
    ...(hidden ? { hidden: true } : {}),
  };
}

/** Same font, compared field by field (fonts are small, flat records). */
function sameFont(a: OgeFont, b: OgeFont): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const x = (a as Record<string, unknown>)[key];
    const y = (b as Record<string, unknown>)[key];
    if (JSON.stringify(x) !== JSON.stringify(y)) return false;
  }
  return true;
}

/** Reads the style sheet. */
export function readOgeStyleSheet(root: OgeXmlNode): OgeStyleSheet {
  const formats = new Map<number, string>();
  for (const numFmt of ogeXmlChildren(ogeXmlChild(root, 'numFmts'), 'numFmt')) {
    const id = ogeXmlIndex(numFmt.attributes['numFmtId']);
    const code = numFmt.attributes['formatCode'];
    if (id !== undefined && code !== undefined) formats.set(id, code);
  }
  const fonts = ogeXmlChildren(ogeXmlChild(root, 'fonts'), 'font').map(
    readOgeFont,
  );
  const fills = ogeXmlChildren(ogeXmlChild(root, 'fills'), 'fill').map((fill) =>
    readOgeFill(fill),
  );
  const borders = ogeXmlChildren(ogeXmlChild(root, 'borders'), 'border').map(
    readOgeBorder,
  );

  // the Normal style: the cell style with builtinId 0, else the first one
  const styleXfs = ogeXmlChildren(ogeXmlChild(root, 'cellStyleXfs'), 'xf');
  const normalStyle = ogeXmlChildren(
    ogeXmlChild(root, 'cellStyles'),
    'cellStyle',
  ).find((style) => style.attributes['builtinId'] === '0');
  const normalXf = styleXfs[ogeXmlIndex(normalStyle?.attributes['xfId']) ?? 0];
  const normalFont =
    fonts[ogeXmlIndex(normalXf?.attributes['fontId']) ?? 0] ?? fonts[0];

  const numberFormat = (id: number | undefined): Partial<OgeCellStyle> => {
    if (id === undefined || id === 0) return {};
    const custom = formats.get(id);
    if (custom !== undefined)
      return custom === 'General' ? {} : { numberFormat: custom };
    const builtin = ogeBuiltinNumberFormat(id);
    // an unknown id below 164 is a locale-specific built-in (East Asian
    // dates): keep the id so a locale can supply it; render as General
    return builtin === undefined
      ? { numberFormatId: id }
      : { numberFormat: builtin, numberFormatId: id };
  };

  const cellFormats = ogeXmlChildren(ogeXmlChild(root, 'cellXfs'), 'xf').map(
    (xf) => {
      const a = xf.attributes;
      const font = fonts[ogeXmlIndex(a['fontId']) ?? 0];
      const fill = fills[ogeXmlIndex(a['fillId']) ?? 0];
      const border = borders[ogeXmlIndex(a['borderId']) ?? 0];
      const alignment = readAlignment(ogeXmlChild(xf, 'alignment'));
      const protection = readProtection(ogeXmlChild(xf, 'protection'));
      const style: OgeCellStyle = {
        ...numberFormat(ogeXmlIndex(a['numFmtId'])),
        ...(font && !(normalFont && sameFont(font, normalFont))
          ? { font }
          : {}),
        ...(fill ? { fill } : {}),
        ...(border ? { border } : {}),
        ...(alignment ? { alignment } : {}),
        ...(protection ? { protection } : {}),
        ...(ogeXmlBool(a['quotePrefix'], false) ? { quotePrefix: true } : {}),
      };
      return style;
    },
  );

  const differential = ogeXmlChildren(ogeXmlChild(root, 'dxfs'), 'dxf').map(
    (dxf) => {
      const font = ogeXmlChild(dxf, 'font');
      const fill = ogeXmlChild(dxf, 'fill');
      const border = ogeXmlChild(dxf, 'border');
      const numFmt = ogeXmlChild(dxf, 'numFmt');
      const alignment = readAlignment(ogeXmlChild(dxf, 'alignment'));
      const style: OgeCellStyle = {
        ...(numFmt?.attributes['formatCode'] !== undefined
          ? { numberFormat: numFmt.attributes['formatCode'] }
          : {}),
        ...(font ? { font: readOgeFont(font) } : {}),
        ...(fill ? { fill: readOgeFill(fill, true) } : {}),
        ...(border ? { border: readOgeBorder(border) } : {}),
        ...(alignment ? { alignment } : {}),
      };
      return style;
    },
  );

  const palette = ogeXmlChildren(
    ogeXmlChild(ogeXmlChild(root, 'colors'), 'indexedColors'),
    'rgbColor',
  )
    .map((color) => color.attributes['rgb'] ?? '')
    .map((rgb) => (rgb.length === 8 ? rgb.slice(2) : rgb).toUpperCase());

  return {
    cellFormats,
    differential,
    normalFont,
    indexedColors: palette.length ? palette : undefined,
  };
}
