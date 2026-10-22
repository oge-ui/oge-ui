/**
 * A chart part (`xl/charts/chartN.xml`, DrawingML Chart) read into
 * `OgeChartModel`: the plot area's chart groups with their series and the
 * values Excel cached, the axes, title and legend, and the fills, lines and
 * fonts of each, theme colours (with DrawingML's lumMod / lumOff / tint /
 * shade / alpha) and theme fonts resolved. Nothing here computes: what the
 * chart looks like is the view's (`view/chart-view.ts`).
 */
import type { OgeThemeColors, OgeThemeColorSlot } from '../color/color';
import type {
  OgeChartAxis,
  OgeChartCategories,
  OgeChartDataLabels,
  OgeChartFont,
  OgeChartGroup,
  OgeChartKind,
  OgeChartLegend,
  OgeChartManualLayout,
  OgeChartMarker,
  OgeChartModel,
  OgeChartNumbers,
  OgeChartSeries,
  OgeChartShape,
  OgeChartText,
  OgeChartTitle,
} from '../model/chart';
import {
  ogeXmlChild,
  ogeXmlChildren,
  ogeXmlIndex,
  ogeXmlNumber,
  type OgeXmlNode,
} from './xml-tree';

/** What resolving a chart's colours and fonts needs from the workbook. */
export interface OgeChartReadContext {
  readonly theme: OgeThemeColors;
  readonly majorFont?: string;
  readonly minorFont?: string;
}

const EMU_PER_PIXEL = 9525;

/** Scheme colour names → theme slots (`tx1` is Text 1, `bg1` Background 1). */
const SCHEME: Readonly<Record<string, OgeThemeColorSlot>> = {
  tx1: 'dk1',
  bg1: 'lt1',
  tx2: 'dk2',
  bg2: 'lt2',
  dk1: 'dk1',
  lt1: 'lt1',
  dk2: 'dk2',
  lt2: 'lt2',
  accent1: 'accent1',
  accent2: 'accent2',
  accent3: 'accent3',
  accent4: 'accent4',
  accent5: 'accent5',
  accent6: 'accent6',
  hlink: 'hlink',
  folHlink: 'folHlink',
};

/** The preset colours a chart part names most (`a:prstClr`). */
const PRESET: Readonly<Record<string, string>> = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  yellow: 'FFFF00',
  gray: '808080',
  grey: '808080',
  orange: 'FFA500',
};

const val = (node: OgeXmlNode | undefined, name: string) =>
  ogeXmlChild(node, name)?.attributes['val'];

const flag = (
  node: OgeXmlNode | undefined,
  name: string,
  fallback: boolean,
) => {
  const child = ogeXmlChild(node, name);
  if (!child) return fallback;
  const v = child.attributes['val'];
  // a bare element means true (CT_Boolean's default)
  return v === undefined ? true : v === '1' || v === 'true';
};

const number = (node: OgeXmlNode | undefined, name: string) =>
  ogeXmlNumber(val(node, name));

// ── colours ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

function rgbToHex([r, g, b]: readonly number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.round(Math.max(0, Math.min(1, c)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

function toHsl([r, g, b]: readonly number[]): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl([h, s, l]: readonly number[]): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

/** A colour element (`a:srgbClr`, `a:schemeClr`, …) with its modifiers. */
function colorOf(
  node: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): { hex: string; alpha?: number } | undefined {
  for (const child of node?.children ?? []) {
    let base: string | undefined;
    const v = child.attributes['val'];
    switch (child.name) {
      case 'srgbClr':
        base = v;
        break;
      case 'schemeClr': {
        const slot = v ? SCHEME[v] : undefined;
        base = slot ? context.theme[slot] : undefined;
        break;
      }
      case 'sysClr':
        base =
          child.attributes['lastClr'] ?? (v === 'window' ? 'FFFFFF' : '000000');
        break;
      case 'prstClr':
        base = v ? PRESET[v] : undefined;
        break;
      case 'scrgbClr': {
        const pct = (name: string) =>
          (ogeXmlNumber(child.attributes[name]) ?? 0) / 100000;
        // linear RGB → sRGB
        const gamma = (c: number) =>
          c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        base = rgbToHex([pct('r'), pct('g'), pct('b')].map(gamma)).slice(1);
        break;
      }
      default:
        continue;
    }
    if (!base || !/^[0-9A-Fa-f]{6}$/.test(base)) return undefined;
    let rgb = hexToRgb(base.toUpperCase());
    let alpha: number | undefined;
    for (const mod of child.children) {
      const amount = (ogeXmlNumber(mod.attributes['val']) ?? 0) / 100000;
      switch (mod.name) {
        case 'lumMod': {
          const [h, s, l] = toHsl(rgb);
          rgb = fromHsl([h, s, l * amount]);
          break;
        }
        case 'lumOff': {
          const [h, s, l] = toHsl(rgb);
          rgb = fromHsl([h, s, Math.min(1, Math.max(0, l + amount))]);
          break;
        }
        case 'tint':
          rgb = rgb.map((c) => c * amount + (1 - amount)) as typeof rgb;
          break;
        case 'shade':
          rgb = rgb.map((c) => c * amount) as typeof rgb;
          break;
        case 'satMod': {
          const [h, s, l] = toHsl(rgb);
          rgb = fromHsl([h, Math.min(1, s * amount), l]);
          break;
        }
        case 'alpha':
          alpha = amount;
          break;
      }
    }
    return { hex: rgbToHex(rgb), ...(alpha !== undefined ? { alpha } : {}) };
  }
  return undefined;
}

/** Fill and outline of `c:spPr`; unset fields: the chart style's defaults. */
function shapeOf(
  spPr: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartShape {
  if (!spPr) return {};
  const out: {
    fill?: string;
    fillOpacity?: number;
    line?: string;
    lineWidth?: number;
    dash?: OgeChartShape['dash'];
  } = {};
  for (const child of spPr.children) {
    if (child.name === 'noFill') out.fill = 'none';
    else if (child.name === 'solidFill') {
      const c = colorOf(child, context);
      if (c) {
        out.fill = c.hex;
        if (c.alpha !== undefined) out.fillOpacity = c.alpha;
      }
    } else if (child.name === 'gradFill') {
      // a gradient draws as its first stop
      const stop = ogeXmlChild(ogeXmlChild(child, 'gsLst'), 'gs');
      const c = colorOf(stop, context);
      if (c) out.fill = c.hex;
    } else if (child.name === 'pattFill') {
      const c = colorOf(ogeXmlChild(child, 'fgClr'), context);
      if (c) out.fill = c.hex;
    } else if (child.name === 'ln') {
      const width = ogeXmlNumber(child.attributes['w']);
      if (width !== undefined) out.lineWidth = width / EMU_PER_PIXEL;
      for (const part of child.children) {
        if (part.name === 'noFill') out.line = 'none';
        else if (part.name === 'solidFill') {
          const c = colorOf(part, context);
          if (c) out.line = c.hex;
        } else if (part.name === 'prstDash') {
          const dash = part.attributes['val'] ?? 'solid';
          out.dash =
            dash === 'solid'
              ? 'solid'
              : /dot/i.test(dash) && !/dash/i.test(dash)
                ? 'dot'
                : 'dash';
        }
      }
    }
  }
  return out;
}

/** A text run's or paragraph default's formatting (`a:rPr`, `a:defRPr`). */
function runFont(
  node: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartFont {
  if (!node) return {};
  const a = node.attributes;
  const size = ogeXmlNumber(a['sz']);
  const typeface = ogeXmlChild(node, 'latin')?.attributes['typeface'];
  const family =
    typeface === '+mn-lt'
      ? context.minorFont
      : typeface === '+mj-lt'
        ? context.majorFont
        : typeface || undefined;
  const color = colorOf(ogeXmlChild(node, 'solidFill'), context);
  return {
    ...(size !== undefined ? { size: size / 100 } : {}),
    ...(a['b'] !== undefined ? { bold: a['b'] === '1' } : {}),
    ...(a['i'] !== undefined ? { italic: a['i'] === '1' } : {}),
    ...(color ? { color: color.hex } : {}),
    ...(family ? { family } : {}),
  };
}

/** The default text of a text body (`c:txPr` / `c:rich`): its first paragraph's `defRPr`. */
function bodyFont(
  body: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartFont {
  const paragraph = ogeXmlChild(body, 'p');
  return runFont(ogeXmlChild(ogeXmlChild(paragraph, 'pPr'), 'defRPr'), context);
}

/** Cached string points (`c:strCache`, `c:strLit`, a multi-level cache's first level). */
function stringPoints(cache: OgeXmlNode | undefined): string[] {
  const count = ogeXmlIndex(val(cache, 'ptCount')) ?? 0;
  const out = new Array<string>(count).fill('');
  for (const pt of ogeXmlChildren(cache, 'pt')) {
    const at = ogeXmlIndex(pt.attributes['idx']);
    if (at === undefined || at >= count) continue;
    out[at] = ogeXmlChild(pt, 'v')?.text ?? '';
  }
  return out;
}

/** Cached number points (`c:numCache`, `c:numLit`); blanks are `null`. */
function numberPoints(cache: OgeXmlNode | undefined): (number | null)[] {
  const count = ogeXmlIndex(val(cache, 'ptCount')) ?? 0;
  const out = new Array<number | null>(count).fill(null);
  for (const pt of ogeXmlChildren(cache, 'pt')) {
    const at = ogeXmlIndex(pt.attributes['idx']);
    const v = ogeXmlNumber(ogeXmlChild(pt, 'v')?.text.trim());
    if (at === undefined || at >= count || v === undefined) continue;
    out[at] = v;
  }
  return out;
}

const formatCodeOf = (cache: OgeXmlNode | undefined) => {
  const code = ogeXmlChild(cache, 'formatCode')?.text;
  return code ? { format: code } : {};
};

/** Numbers of a `c:val`-like element: a reference with its cache, or a literal. */
function numbersOf(node: OgeXmlNode | undefined): OgeChartNumbers | undefined {
  if (!node) return undefined;
  const ref = ogeXmlChild(node, 'numRef');
  if (ref) {
    const cache = ogeXmlChild(ref, 'numCache');
    const f = ogeXmlChild(ref, 'f')?.text;
    return {
      ...(f ? { ref: f } : {}),
      values: numberPoints(cache),
      ...formatCodeOf(cache),
    };
  }
  const literal = ogeXmlChild(node, 'numLit');
  if (literal)
    return { values: numberPoints(literal), ...formatCodeOf(literal) };
  return undefined;
}

/** Categories (`c:cat`, `c:xVal`): strings, numbers, or a multi-level reference's first level. */
function categoriesOf(
  node: OgeXmlNode | undefined,
): OgeChartCategories | undefined {
  if (!node) return undefined;
  const str = ogeXmlChild(node, 'strRef');
  if (str) {
    const f = ogeXmlChild(str, 'f')?.text;
    return {
      ...(f ? { ref: f } : {}),
      labels: stringPoints(ogeXmlChild(str, 'strCache')),
    };
  }
  const num = numbersOf(node);
  if (num) {
    return {
      ...(num.ref ? { ref: num.ref } : {}),
      labels: num.values.map((v) => (v === null ? '' : String(v))),
      numbers: num.values,
      ...(num.format ? { format: num.format } : {}),
    };
  }
  const multi = ogeXmlChild(node, 'multiLvlStrRef');
  if (multi) {
    const f = ogeXmlChild(multi, 'f')?.text;
    const level = ogeXmlChild(ogeXmlChild(multi, 'multiLvlStrCache'), 'lvl');
    const count =
      ogeXmlIndex(val(ogeXmlChild(multi, 'multiLvlStrCache'), 'ptCount')) ?? 0;
    const labels = new Array<string>(count).fill('');
    for (const pt of ogeXmlChildren(level, 'pt')) {
      const at = ogeXmlIndex(pt.attributes['idx']);
      if (at !== undefined && at < count)
        labels[at] = ogeXmlChild(pt, 'v')?.text ?? '';
    }
    return { ...(f ? { ref: f } : {}), labels };
  }
  const literal = ogeXmlChild(node, 'strLit');
  return literal ? { labels: stringPoints(literal) } : undefined;
}

/** A series' or title's text: a cell reference with its cache, or its own. */
function textOf(tx: OgeXmlNode | undefined): OgeChartText | undefined {
  if (!tx) return undefined;
  const ref = ogeXmlChild(tx, 'strRef');
  if (ref) {
    const f = ogeXmlChild(ref, 'f')?.text;
    return {
      text: stringPoints(ogeXmlChild(ref, 'strCache')).join(' '),
      ...(f ? { ref: f } : {}),
    };
  }
  const rich = ogeXmlChild(tx, 'rich');
  if (rich) {
    const lines = ogeXmlChildren(rich, 'p').map((p) =>
      p.children
        .filter((c) => c.name === 'r' || c.name === 'fld')
        .map((r) => ogeXmlChild(r, 't')?.text ?? '')
        .join(''),
    );
    return { text: lines.join('\n') };
  }
  const v = ogeXmlChild(tx, 'v');
  return v ? { text: v.text } : undefined;
}

/** A chart element's `c:layout/c:manualLayout`; `undefined` for Excel's automatic layout. */
function layoutOf(
  node: OgeXmlNode | undefined,
): OgeChartManualLayout | undefined {
  const manual = ogeXmlChild(ogeXmlChild(node, 'layout'), 'manualLayout');
  if (!manual) return undefined;
  const fraction = (name: string) => {
    const value = number(manual, name);
    return value !== undefined && Number.isFinite(value)
      ? { [name]: value }
      : {};
  };
  const layout = {
    ...fraction('x'),
    ...fraction('y'),
    ...fraction('w'),
    ...fraction('h'),
  };
  if (!Object.keys(layout).length) return undefined;
  return {
    ...layout,
    xMode: val(manual, 'xMode') === 'edge' ? 'edge' : 'factor',
    yMode: val(manual, 'yMode') === 'edge' ? 'edge' : 'factor',
    target: val(manual, 'layoutTarget') === 'inner' ? 'inner' : 'outer',
  };
}

function titleOf(
  node: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartTitle | undefined {
  if (!node) return undefined;
  const tx = ogeXmlChild(node, 'tx');
  const text = textOf(tx);
  const rich = ogeXmlChild(tx, 'rich');
  // the first run's own formatting wins over the paragraph's default, as Excel draws it
  const run = ogeXmlChild(ogeXmlChild(ogeXmlChild(rich, 'p'), 'r'), 'rPr');
  const font = {
    ...bodyFont(ogeXmlChild(node, 'txPr'), context),
    ...bodyFont(rich, context),
    ...runFont(run, context),
  };
  const layout = layoutOf(node);
  return {
    ...(text ? { text } : {}),
    font,
    overlay: flag(node, 'overlay', false),
    ...(layout ? { layout } : {}),
  };
}

function labelsOf(
  node: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartDataLabels | undefined {
  if (!node || flag(node, 'delete', false)) return undefined;
  const format = ogeXmlChild(node, 'numFmt');
  const position = val(node, 'dLblPos');
  return {
    showValue: flag(node, 'showVal', false),
    showCategory: flag(node, 'showCatName', false),
    showSeries: flag(node, 'showSerName', false),
    showPercent: flag(node, 'showPercent', false),
    ...(position ? { position } : {}),
    ...(format?.attributes['formatCode'] &&
    format.attributes['sourceLinked'] !== '1'
      ? { format: format.attributes['formatCode'] }
      : {}),
    font: bodyFont(ogeXmlChild(node, 'txPr'), context),
  };
}

function markerOf(
  node: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartMarker | undefined {
  if (!node) return undefined;
  const size = number(node, 'size');
  return {
    symbol: val(node, 'symbol') ?? 'auto',
    ...(size !== undefined ? { size } : {}),
    shape: shapeOf(ogeXmlChild(node, 'spPr'), context),
  };
}

function seriesOf(
  ser: OgeXmlNode,
  kind: OgeChartKind,
  context: OgeChartReadContext,
): OgeChartSeries | undefined {
  const xy = kind === 'scatter' || kind === 'bubble';
  const values = numbersOf(ogeXmlChild(ser, xy ? 'yVal' : 'val'));
  if (!values) return undefined;
  const points = new Map<number, OgeChartShape>();
  for (const dPt of ogeXmlChildren(ser, 'dPt')) {
    const at = ogeXmlIndex(val(dPt, 'idx'));
    if (at !== undefined)
      points.set(at, shapeOf(ogeXmlChild(dPt, 'spPr'), context));
  }
  const name = textOf(ogeXmlChild(ser, 'tx'));
  const categories = categoriesOf(ogeXmlChild(ser, xy ? 'xVal' : 'cat'));
  const sizes = numbersOf(ogeXmlChild(ser, 'bubbleSize'));
  const marker = markerOf(ogeXmlChild(ser, 'marker'), context);
  const labels = labelsOf(ogeXmlChild(ser, 'dLbls'), context);
  const smooth = ogeXmlChild(ser, 'smooth');
  const index = ogeXmlIndex(val(ser, 'idx')) ?? 0;
  return {
    index,
    order: ogeXmlIndex(val(ser, 'order')) ?? index,
    ...(name ? { name } : {}),
    ...(categories ? { categories } : {}),
    values,
    ...(sizes ? { sizes } : {}),
    shape: shapeOf(ogeXmlChild(ser, 'spPr'), context),
    ...(marker ? { marker } : {}),
    // a line series without `c:smooth` is smoothed (Excel saves it so: `charts.xlsx`)
    ...(smooth
      ? { smooth: flag(ser, 'smooth', false) }
      : kind === 'line'
        ? { smooth: true }
        : {}),
    ...(points.size ? { points } : {}),
    ...(labels ? { labels } : {}),
  };
}

/** Plot-area elements and the chart kind each is. */
const GROUPS: Readonly<
  Record<string, { kind: OgeChartKind; threeD?: boolean }>
> = {
  barChart: { kind: 'bar' },
  bar3DChart: { kind: 'bar', threeD: true },
  lineChart: { kind: 'line' },
  line3DChart: { kind: 'line', threeD: true },
  areaChart: { kind: 'area' },
  area3DChart: { kind: 'area', threeD: true },
  pieChart: { kind: 'pie' },
  pie3DChart: { kind: 'pie', threeD: true },
  doughnutChart: { kind: 'doughnut' },
  ofPieChart: { kind: 'ofPie' },
  scatterChart: { kind: 'scatter' },
  bubbleChart: { kind: 'bubble' },
  radarChart: { kind: 'radar' },
  stockChart: { kind: 'stock' },
  surfaceChart: { kind: 'surface' },
  surface3DChart: { kind: 'surface', threeD: true },
};

function groupOf(
  node: OgeXmlNode,
  context: OgeChartReadContext,
): OgeChartGroup | undefined {
  const known = GROUPS[node.name];
  if (!known) return undefined;
  const { kind } = known;
  const series = ogeXmlChildren(node, 'ser')
    .map((ser) => seriesOf(ser, kind, context))
    .filter((s): s is OgeChartSeries => s !== undefined)
    .sort((a, b) => a.order - b.order);
  const grouping = val(node, 'grouping');
  const direction = val(node, 'barDir');
  const gapWidth = number(node, 'gapWidth');
  const overlap = number(node, 'overlap');
  const holeSize = number(node, 'holeSize');
  const firstSliceAngle = number(node, 'firstSliceAng');
  const scatterStyle = val(node, 'scatterStyle');
  const labels = labelsOf(ogeXmlChild(node, 'dLbls'), context);
  return {
    kind,
    ...(kind === 'bar'
      ? { direction: direction === 'bar' ? 'bar' : 'column' }
      : {}),
    grouping:
      grouping === 'stacked' ||
      grouping === 'percentStacked' ||
      grouping === 'clustered'
        ? grouping
        : kind === 'bar'
          ? 'clustered'
          : 'standard',
    // pies and doughnuts vary their colours unless they say otherwise
    varyColors: flag(node, 'varyColors', kind === 'pie' || kind === 'doughnut'),
    ...(gapWidth !== undefined ? { gapWidth } : {}),
    ...(overlap !== undefined ? { overlap } : {}),
    ...(holeSize !== undefined ? { holeSize } : {}),
    ...(firstSliceAngle !== undefined ? { firstSliceAngle } : {}),
    ...(scatterStyle ? { scatterStyle } : {}),
    ...(kind === 'line' ? { markers: flag(node, 'marker', true) } : {}),
    ...(known.threeD ? { threeD: true } : {}),
    axes: ogeXmlChildren(node, 'axId')
      .map((a) => ogeXmlNumber(a.attributes['val']))
      .filter((id): id is number => id !== undefined),
    series,
    ...(labels ? { labels } : {}),
  };
}

const AXES: Readonly<Record<string, OgeChartAxis['kind']>> = {
  catAx: 'category',
  valAx: 'value',
  dateAx: 'date',
  serAx: 'series',
};

function axisOf(
  node: OgeXmlNode,
  context: OgeChartReadContext,
): OgeChartAxis | undefined {
  const kind = AXES[node.name];
  const id = number(node, 'axId');
  if (!kind || id === undefined) return undefined;
  const scaling = ogeXmlChild(node, 'scaling');
  const format = ogeXmlChild(node, 'numFmt');
  const position = val(node, 'axPos');
  const crosses = val(node, 'crosses');
  const labelPosition = val(node, 'tickLblPos');
  const majorTicks = val(node, 'majorTickMark');
  const crossBetween = val(node, 'crossBetween');
  const optional = (name: string, value: number | undefined) =>
    value !== undefined ? { [name]: value } : {};
  const grid = (name: string) => {
    const g = ogeXmlChild(node, name);
    return g ? shapeOf(ogeXmlChild(g, 'spPr'), context) : undefined;
  };
  const majorGridlines = grid('majorGridlines');
  const minorGridlines = grid('minorGridlines');
  const title = titleOf(ogeXmlChild(node, 'title'), context);
  return {
    id,
    kind,
    position:
      position === 'l' || position === 'r' || position === 't' ? position : 'b',
    deleted: flag(node, 'delete', false),
    ...optional('crossAxis', number(node, 'crossAx')),
    ...(crosses === 'autoZero' || crosses === 'min' || crosses === 'max'
      ? { crosses }
      : {}),
    ...optional('crossesAt', number(node, 'crossesAt')),
    ...(title ? { title } : {}),
    ...(format?.attributes['formatCode']
      ? {
          format: {
            code: format.attributes['formatCode'],
            sourceLinked: format.attributes['sourceLinked'] === '1',
          },
        }
      : {}),
    ...optional('min', number(scaling, 'min')),
    ...optional('max', number(scaling, 'max')),
    ...optional('majorUnit', number(node, 'majorUnit')),
    ...optional('minorUnit', number(node, 'minorUnit')),
    ...optional('logBase', number(scaling, 'logBase')),
    reversed: val(scaling, 'orientation') === 'maxMin',
    ...(majorGridlines ? { majorGridlines } : {}),
    ...(minorGridlines ? { minorGridlines } : {}),
    shape: shapeOf(ogeXmlChild(node, 'spPr'), context),
    labelPosition:
      labelPosition === 'low' ||
      labelPosition === 'high' ||
      labelPosition === 'none'
        ? labelPosition
        : 'nextTo',
    majorTicks:
      majorTicks === 'none' || majorTicks === 'in' || majorTicks === 'cross'
        ? majorTicks
        : 'out',
    font: bodyFont(ogeXmlChild(node, 'txPr'), context),
    ...(crossBetween === 'between' || crossBetween === 'midCat'
      ? { crossBetween }
      : {}),
  };
}

function legendOf(
  node: OgeXmlNode | undefined,
  context: OgeChartReadContext,
): OgeChartLegend | undefined {
  if (!node) return undefined;
  const position = val(node, 'legendPos');
  const layout = layoutOf(node);
  return {
    position:
      position === 'l' ||
      position === 't' ||
      position === 'b' ||
      position === 'tr'
        ? position
        : 'r',
    overlay: flag(node, 'overlay', false),
    font: bodyFont(ogeXmlChild(node, 'txPr'), context),
    hidden: ogeXmlChildren(node, 'legendEntry')
      .filter((entry) => flag(entry, 'delete', false))
      .map((entry) => ogeXmlIndex(val(entry, 'idx')))
      .filter((at): at is number => at !== undefined),
    ...(layout ? { layout } : {}),
  };
}

/** The chart style: `c14:style` (style + 100) under the compatibility block, else `c:style`. */
function styleOf(space: OgeXmlNode): number {
  const direct = number(space, 'style');
  if (direct !== undefined) return direct;
  for (const block of ogeXmlChildren(space, 'AlternateContent')) {
    for (const branch of block.children) {
      const style = number(branch, 'style');
      if (style !== undefined) return style > 100 ? style - 100 : style;
    }
  }
  return 2;
}

/** Reads a chart part's `c:chartSpace`. */
export function readOgeChart(
  space: OgeXmlNode,
  part: string,
  context: OgeChartReadContext,
): OgeChartModel {
  const chart = ogeXmlChild(space, 'chart');
  const plot = ogeXmlChild(chart, 'plotArea');
  const groups: OgeChartGroup[] = [];
  const axes: OgeChartAxis[] = [];
  for (const child of plot?.children ?? []) {
    const group = groupOf(child, context);
    if (group) {
      groups.push(group);
      continue;
    }
    const axis = axisOf(child, context);
    if (axis) axes.push(axis);
  }
  const title = titleOf(ogeXmlChild(chart, 'title'), context);
  const legend = legendOf(ogeXmlChild(chart, 'legend'), context);
  const blanks = val(chart, 'dispBlanksAs');
  const plotLayout = layoutOf(plot);
  return {
    part,
    ...(title ? { title } : {}),
    groups,
    axes,
    ...(legend ? { legend } : {}),
    plotVisibleOnly: flag(chart, 'plotVisOnly', true),
    blanksAs: blanks === 'zero' || blanks === 'span' ? blanks : 'gap',
    area: shapeOf(ogeXmlChild(space, 'spPr'), context),
    plotArea: shapeOf(ogeXmlChild(plot, 'spPr'), context),
    ...(plotLayout ? { plotLayout } : {}),
    font: bodyFont(ogeXmlChild(space, 'txPr'), context),
    roundedCorners: flag(space, 'roundedCorners', true),
    style: styleOf(space),
  };
}
