/**
 * A sheet's chart drawn as Excel draws it (ADR 0005, P1b): the chart model
 * (`model/chart.ts`) laid out the way Excel lays a chart out — the title,
 * the legend, the plot area with its axes, gridlines and tick labels, the
 * series and their data labels — into SVG paths and texts both render
 * layers draw as they are. The layout's numbers are Excel's own, measured on
 * its pictures of the corpus's charts (`testing/corpus/charts.*`); what a
 * part leaves unformatted takes the look Excel gives it (chart style 2).
 */
import type { OgeThemeColors } from '../color/color';
import type { OgeFormatLocale } from '../format/format-locale';
import { formatOgeCellValue } from '../format/number-format';
import { ogeFontMetrics } from '../metrics/font-metrics';
import type {
  OgeChartAxis,
  OgeChartDataLabels,
  OgeChartFont,
  OgeChartGroup,
  OgeChartManualLayout,
  OgeChartMarker,
  OgeChartModel,
  OgeChartSeries,
  OgeChartShape,
  OgeSheetChart,
} from '../model/chart';
import {
  OGE_ESTIMATING_MEASURER,
  type OgeTextMeasurer,
} from '../paint/cell-text';
import { ogeFontFamily, type OgePaintFont } from '../paint/resolve-style';
import type { OgeCss } from './render';

/** A filled or stroked path of a chart. */
export interface OgeChartPathMark {
  readonly d: string;
  /** `#RRGGBB`; unset: unfilled. */
  readonly fill?: string;
  readonly fillOpacity?: number;
  /** `#RRGGBB`; unset: no outline. */
  readonly stroke?: string;
  readonly strokeWidth?: number;
  /** `stroke-dasharray`. */
  readonly dash?: string;
  /** On the pixel grid (gridlines, axes, bars, the frame): drawn crisp. */
  readonly crisp?: boolean;
  /** Round joins and caps (a series' line). */
  readonly round?: boolean;
}

/** A text of a chart — a title, a tick label, a legend entry, a data label. */
export interface OgeChartTextMark {
  /** Where its baseline is anchored. */
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  /** Font and colour. */
  readonly style: OgeCss;
  /** An SVG transform about the anchor (a rotated axis title). */
  readonly transform?: string;
}

/** A chart as the render layers draw it: an SVG of the chart's box. */
export interface OgeSpreadsheetChartView {
  /** The box, px at the zoom. */
  readonly width: number;
  readonly height: number;
  /** In paint order: the chart area, the plot, the series, the axes, the legend's keys. */
  readonly paths: readonly OgeChartPathMark[];
  readonly texts: readonly OgeChartTextMark[];
  /** Its title, or its first series' name. */
  readonly label: string;
  /** The plot area's inner box (a pie's square), px — where the series draw. */
  readonly plot?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

/** What drawing a chart needs. */
export interface OgeChartViewInput {
  readonly chart: OgeChartModel;
  /** The chart's box at the zoom, px. */
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly theme: OgeThemeColors;
  /** The theme's body font, which a chart's text uses unless it names one. Default: Calibri. */
  readonly bodyFont?: string;
  readonly locale?: OgeFormatLocale;
  /** Measures the tick labels and legend entries the layout spaces. Default: an estimate. */
  readonly measurer?: OgeTextMeasurer;
}

/**
 * Excel's layout of a chart's parts, px at 100% (font-relative ones in em) —
 * measured on Excel's pictures of the corpus charts, legacy and current
 * style alike.
 */
const LAYOUT = {
  /** The chart's edge → a column of tick labels, an axis title's box. */
  edge: 9,
  /** The title's box: its top, its text inset; → the plot's top. */
  titleTop: 7.67,
  titleInset: 1.7,
  titleGap: 15.2,
  /** No title: the chart's top → the plot's (half a tick label included). */
  plainTop: 20,
  /** Tick labels → the plot's edge. */
  labelGap: 11.2,
  /** The plot's edge → the chart's, on a side without labels. */
  side: 14,
  /** The legend's (last) baseline above the chart's bottom edge. */
  legendBottom: 17,
  /** The legend's text → whatever sits above it: tick labels, an axis title, a pie. */
  labelsToLegend: 11.4,
  axisTitleToLegend: 18.7,
  pieToLegend: 17.5,
  /** A row of tick labels: its baseline below the plot, em. */
  labelRow: 1.6,
  /** Tick labels → the axis title under them. */
  labelsToAxisTitle: 5,
  /** An axis title's box inset; a rotated axis title → its tick labels. */
  axisTitleInset: 8,
  axisTitleToLabels: 4.2,
  /** A label outside a pie: its gap to the edge, and the room the pie gives it (em). */
  pieLabelGap: 7,
  pieLabelRoom: 1.07,
  /**
   * Legend keys: a square (em) and its gap to the text (em); a line's length
   * between its round caps, and the gap after them. A legend with a line key
   * draws its squares as bars as long.
   */
  squareKey: 0.57,
  squareGap: 0.24,
  lineKey: 26,
  lineGap: 2,
  /** Legend entries: text → the next key (em), after a square or a line key. */
  squareAfter: 0.81,
  lineAfter: 0.9,
  /** A right or left legend → the plot. */
  legendSide: 9,
  /** A tick mark's length. */
  tick: 5,
  /** A label over a bar or a point. */
  dataLabelGap: 3,
  /** A chart area's rounded corner. */
  corner: 9,
} as const;

/** What Excel draws where a part states no formatting — chart style 2, measured. */
const DEFAULTS = {
  text: '#000000',
  size: 10,
  /** Titles: 18 pt Arial (`charts.Data.chart1.png`: 175 px for "Sales by quarter"). */
  titleSize: 18,
  titleFace: 'Arial',
  line: '#000000',
  border: '#898989',
  fill: '#FFFFFF',
  /** A series' line, px (1.5 pt). */
  seriesLine: 2,
  /** A marker, pt. */
  markerSize: 5,
} as const;

/** A face's ascent and descent, em (its Windows metrics): where its text sits on a line. */
const FACES: Readonly<Record<string, readonly [number, number]>> = {
  calibri: [0.952, 0.269],
  'calibri light': [0.952, 0.269],
  // measured: Excel spaces Arial titles 1.15 em, the baseline 0.96 em down
  arial: [0.96, 0.19],
  'times new roman': [0.891, 0.216],
  'segoe ui': [1.079, 0.251],
  verdana: [1.005, 0.21],
  tahoma: [1.0, 0.207],
  cambria: [0.95, 0.222],
};

/** Excel's automatic markers, in series order. */
const AUTO_MARKERS = [
  'diamond',
  'square',
  'triangle',
  'x',
  'star',
  'circle',
  'plus',
] as const;

const PT = 4 / 3;
const r2 = (v: number) => Math.round(v * 100) / 100;

const SLOTS = [
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
] as const;

/**
 * Excel's automatic colours: the six accents, then the same six darker
 * (lumMod 60%), then lighter (lumMod 80% lumOff 20%) — the default chart
 * style's colour sequence.
 */
export function ogeChartPalette(
  theme: OgeThemeColors,
  count: number,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(count, 6); i++) {
    const base = `#${theme[SLOTS[i % 6]]}`;
    const round = Math.floor(i / 6) % 3;
    out.push(
      round === 0
        ? base
        : shadeOf(base, round === 1 ? 0.6 : 0.8, round === 1 ? 0 : 0.2),
    );
  }
  return out;
}

/** A colour's HSL lightness scaled and offset (DrawingML lumMod / lumOff). */
function shadeOf(hex: string, mod: number, off: number): string {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    d === 0
      ? 0
      : (max === r
          ? (g - b) / d + (g < b ? 6 : 0)
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4) / 6;
  const l2 = Math.min(1, Math.max(0, l * mod + off));
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s;
  const p = 2 * l2 - q;
  const hue = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const rgb = s === 0 ? [l2, l2, l2] : [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
  return (
    '#' +
    rgb
      .map((c) =>
        Math.round(c * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

/** Excel's automatic value scale: where an axis starts, ends and puts its gridlines. */
export interface OgeChartScale {
  readonly min: number;
  readonly max: number;
  readonly majorUnit: number;
}

const NICE = [1, 2, 5];

/**
 * Excel's automatic scale of a value axis over `[dataMin, dataMax]` drawn
 * `length` px long (measured on Excel, `testing/corpus/charts.excel.json`):
 * it starts at 0 unless the data spans less than a sixth of its largest
 * magnitude — then half the span below the data — ends 5% of the span past
 * the data, and steps by the finest 1-2-5 unit that keeps its gridlines at
 * least 16 px apart up an axis, 64 px along one. Fixed `min` / `max` /
 * `majorUnit` win.
 */
export function ogeChartScale(
  dataMin: number,
  dataMax: number,
  length: number,
  vertical: boolean,
  fixed: {
    readonly min?: number;
    readonly max?: number;
    readonly majorUnit?: number;
  } = {},
): OgeChartScale {
  let lo = Math.min(dataMin, dataMax);
  let hi = Math.max(dataMin, dataMax);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (lo === hi) {
    if (lo === 0) hi = 1;
    else if (lo > 0) lo = 0;
    else hi = 0;
  }
  const span = hi - lo;
  let start: number;
  if (fixed.min !== undefined) start = fixed.min;
  else if (lo >= 0) start = span / hi > 1 / 6 ? 0 : lo - span / 2;
  else if (hi <= 0) start = lo - span * 0.05;
  else start = lo - span * 0.05;
  let end: number;
  if (fixed.max !== undefined) end = fixed.max;
  else if (hi <= 0) end = span / -lo > 1 / 6 ? 0 : hi + span / 2;
  else end = hi + span * 0.05;
  const gap = vertical ? 16 : 64;
  const intervals = Math.max(1, Math.floor(Math.max(1, length) / gap));
  const bounds = (unit: number) => {
    const snap = (value: number) => Math.round((value / unit) * 1e9) / 1e9;
    return {
      min: fixed.min !== undefined ? fixed.min : Math.floor(snap(start)) * unit,
      max: fixed.max !== undefined ? fixed.max : Math.ceil(snap(end)) * unit,
    };
  };
  let unit = fixed.majorUnit;
  if (unit === undefined || !(unit > 0)) {
    // the finest 1-2-5 step whose snapped scale still fits the gridlines in
    const raw = (end - start) / intervals;
    let power = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    let chosen: number | undefined;
    for (let guard = 0; guard < 40 && chosen === undefined; guard++) {
      for (const step of NICE) {
        const candidate = step * power;
        if (candidate < raw * 0.999) continue;
        const b = bounds(candidate);
        if ((b.max - b.min) / candidate <= intervals + 1e-9) {
          chosen = candidate;
          break;
        }
      }
      power *= 10;
    }
    unit = chosen ?? end - start;
  }
  const { min, max } = bounds(unit);
  const clean = (value: number) => Number(value.toPrecision(12));
  return { min: clean(min), max: clean(max), majorUnit: clean(unit) };
}

/** A face to measure and draw a chart's text in, at the zoom. */
interface Face {
  readonly paint: OgePaintFont;
  /** Size, px. */
  readonly px: number;
  /** Above and below the baseline, px. */
  readonly ascent: number;
  readonly descent: number;
  readonly style: OgeCss;
}

interface FontSpec {
  readonly family: string;
  /** Points. */
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly color: string;
}

const CALIBRI = [0.952, 0.269] as const;

function faceOf(spec: FontSpec, scale: number): Face {
  const px = spec.size * PT * scale;
  const family = ogeFontFamily(spec.family);
  const weight = spec.bold ? '700' : '400';
  const metrics = ogeFontMetrics(spec.family, spec.size);
  const [ascent, descent] = FACES[spec.family.toLowerCase()] ?? CALIBRI;
  return {
    paint: {
      name: spec.family,
      family,
      sizePt: spec.size,
      sizePx: px,
      bold: spec.bold,
      italic: spec.italic,
      strike: false,
      color: spec.color,
      css: `${spec.italic ? 'italic ' : ''}${weight} ${r2(px)}px ${family}`,
      maxDigitWidth: metrics.maxDigitWidth * scale,
      lineHeight: metrics.lineHeight * scale,
      source: { name: spec.family, size: spec.size },
    },
    px,
    ascent: ascent * px,
    descent: descent * px,
    style: {
      fontFamily: family,
      fontSize: `${r2(px)}px`,
      fontWeight: weight,
      ...(spec.italic ? { fontStyle: 'italic' } : {}),
      fill: spec.color,
    },
  };
}

const rectPath = (x: number, y: number, w: number, h: number) =>
  `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}Z`;

function roundRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): string {
  const k = r2(Math.max(0, Math.min(radius, w / 2, h / 2)));
  const arc = (ex: number, ey: number) =>
    `A${k} ${k} 0 0 1 ${r2(ex)} ${r2(ey)}`;
  return (
    `M${r2(x + k)} ${r2(y)}H${r2(x + w - k)}${arc(x + w, y + k)}` +
    `V${r2(y + h - k)}${arc(x + w - k, y + h)}H${r2(x + k)}${arc(x, y + h - k)}` +
    `V${r2(y + k)}${arc(x + k, y)}Z`
  );
}

/** A coordinate of a line `width` px thick, on the pixel grid. */
const onGrid = (v: number, width: number) =>
  Math.round(width) % 2 === 1 ? Math.floor(v) + 0.5 : Math.round(v);

/** A marker's outline: closed symbols fill, the others (x, plus, star, dash) only stroke. */
function markerPath(
  symbol: string,
  cx: number,
  cy: number,
  size: number,
): { readonly d: string; readonly open: boolean } {
  const h = size / 2;
  const p = (x: number, y: number) => `${r2(x)} ${r2(y)}`;
  const circle = (r: number) =>
    `M${p(cx - r, cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`;
  switch (symbol) {
    case 'square':
      return { d: rectPath(cx - h, cy - h, size, size), open: false };
    case 'diamond':
      return {
        d: `M${p(cx, cy - h)}L${p(cx + h, cy)}L${p(cx, cy + h)}L${p(cx - h, cy)}Z`,
        open: false,
      };
    case 'triangle':
      return {
        d: `M${p(cx, cy - h)}L${p(cx + h, cy + h)}L${p(cx - h, cy + h)}Z`,
        open: false,
      };
    case 'x':
      return {
        d: `M${p(cx - h, cy - h)}L${p(cx + h, cy + h)}M${p(cx + h, cy - h)}L${p(cx - h, cy + h)}`,
        open: true,
      };
    case 'plus':
      return {
        d: `M${p(cx - h, cy)}L${p(cx + h, cy)}M${p(cx, cy - h)}L${p(cx, cy + h)}`,
        open: true,
      };
    case 'star':
      return {
        d:
          `M${p(cx - h, cy - h)}L${p(cx + h, cy + h)}M${p(cx + h, cy - h)}L${p(cx - h, cy + h)}` +
          `M${p(cx, cy - h)}L${p(cx, cy + h)}`,
        open: true,
      };
    case 'dash':
      return { d: `M${p(cx - h, cy)}L${p(cx + h, cy)}`, open: true };
    case 'dot':
      return { d: circle(h / 2), open: false };
    default:
      return { d: circle(h), open: false };
  }
}

/** A shape's fill, or the fallback; `undefined` when it is unfilled. */
const fillOf = (shape: OgeChartShape | undefined, fallback?: string) =>
  shape?.fill === 'none' ? undefined : (shape?.fill ?? fallback);

/** A shape's line, or the fallback; `undefined` when it has none. */
const lineOf = (shape: OgeChartShape | undefined, fallback?: string) =>
  shape?.line === 'none' ? undefined : (shape?.line ?? fallback);

/** A dash pattern for a line `width` px thick. */
const dashOf = (dash: OgeChartShape['dash'], width: number) =>
  dash === 'dash'
    ? `${r2(width * 4)} ${r2(width * 3)}`
    : dash === 'dot'
      ? `${r2(width)} ${r2(width)}`
      : undefined;

/** Text of a number in a format code, in the viewer's locale. */
function formatterOf(
  code: string | undefined,
  locale: OgeFormatLocale | undefined,
): (value: number) => string {
  const options = locale ? { locale } : {};
  return (value) => formatOgeCellValue(value, code || 'General', options).text;
}

/** The colour a series draws in: its own, else the palette's for its index. */
function seriesColor(
  group: OgeChartGroup,
  series: OgeChartSeries,
  palette: readonly string[],
): string {
  const lineLike = group.kind === 'line' || group.kind === 'scatter';
  const own = lineLike ? series.shape.line : series.shape.fill;
  if (own && own !== 'none') return own;
  const marker = series.marker?.shape?.fill;
  if (lineLike && marker && marker !== 'none') return marker;
  return palette[series.index % palette.length] ?? '#4472C4';
}

/** The marker a series' points carry: its own, Excel's automatic one, or none. */
function markerSpec(
  group: OgeChartGroup,
  series: OgeChartSeries,
): { readonly symbol: string; readonly size: number } | undefined {
  const own: OgeChartMarker | undefined = series.marker;
  if (own?.symbol === 'none') return undefined;
  const auto = AUTO_MARKERS[series.index % AUTO_MARKERS.length] ?? 'circle';
  if (group.kind === 'line' && !own && !group.markers) return undefined;
  if (group.kind === 'scatter' && !own) {
    const style = group.scatterStyle ?? 'marker';
    if (style === 'line' || style === 'smooth') return undefined;
  }
  if (group.kind !== 'line' && group.kind !== 'scatter') return undefined;
  return {
    symbol: !own || own.symbol === 'auto' ? auto : own.symbol,
    size: own?.size ?? DEFAULTS.markerSize,
  };
}

/** Whether a line or scatter series joins its points. */
function joins(group: OgeChartGroup, series: OgeChartSeries): boolean {
  if (series.shape.line === 'none') return false;
  if (group.kind === 'line' || series.shape.line) return true;
  const style = group.scatterStyle ?? 'marker';
  return style !== 'marker' && style !== 'none';
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A path through points — straight, or smoothed as Excel smooths (a
 * Catmull-Rom curve: each Bézier control a sixth of its neighbours' span
 * away); a `null` point breaks it.
 */
function linePath(points: readonly (Point | null)[], smooth: boolean): string {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (const point of points) {
    if (point) run.push(point);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  let d = '';
  for (const pts of runs) {
    pts.forEach((p2, i) => {
      if (i === 0) {
        d += `M${r2(p2.x)} ${r2(p2.y)}`;
        return;
      }
      const p1 = pts[i - 1] ?? p2;
      if (!smooth || pts.length < 3) {
        d += `L${r2(p2.x)} ${r2(p2.y)}`;
        return;
      }
      const p0 = pts[i - 2] ?? p1;
      const p3 = pts[i + 1] ?? p2;
      d +=
        `C${r2(p1.x + (p2.x - p0.x) / 6)} ${r2(p1.y + (p2.y - p0.y) / 6)} ` +
        `${r2(p2.x - (p3.x - p1.x) / 6)} ${r2(p2.y - (p3.y - p1.y) / 6)} ` +
        `${r2(p2.x)} ${r2(p2.y)}`;
    });
  }
  return d;
}

/** A legend entry: its text and its key — a square of a fill, a line with its marker, or a marker. */
interface LegendEntry {
  readonly text: string;
  readonly key: 'square' | 'line' | 'marker';
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: string;
  readonly marker?: {
    readonly symbol: string;
    readonly size: number;
    readonly fill?: string;
    readonly stroke?: string;
  };
}

/** A data label's text: the parts it shows, joined Excel's way (`, `). */
function labelText(
  labels: OgeChartDataLabels,
  parts: {
    readonly value: number;
    readonly category: string;
    readonly series: string;
    readonly percent?: number;
  },
  format: (value: number) => string,
  percent: (value: number) => string,
): string {
  const out: string[] = [];
  if (labels.showSeries && parts.series) out.push(parts.series);
  if (labels.showCategory && parts.category) out.push(parts.category);
  if (labels.showValue) out.push(format(parts.value));
  if (labels.showPercent && parts.percent !== undefined)
    out.push(percent(parts.percent));
  return out.join(', ');
}

/** Where the file puts a box by hand (`OgeChartManualLayout`), px; else where Excel would. */
function placed(
  layout: OgeChartManualLayout | undefined,
  auto: Point,
  width: number,
  height: number,
): Point {
  if (!layout) return auto;
  const x =
    layout.x === undefined
      ? auto.x
      : layout.xMode === 'edge'
        ? layout.x * width
        : auto.x + layout.x * width;
  const y =
    layout.y === undefined
      ? auto.y
      : layout.yMode === 'edge'
        ? layout.y * height
        : auto.y + layout.y * height;
  return { x, y };
}

/** The title a chart shows: its own, or — Excel's automatic title — its only series' name. */
function shownTitle(chart: OgeChartModel): string {
  const series = chart.groups.flatMap((g) => g.series);
  return (
    chart.title?.text?.text ??
    (chart.title && series.length === 1 ? (series[0].name?.text ?? '') : '')
  );
}

/** What assistive tech hears for a chart: its alt text, else its title, else its name. */
export function ogeChartLabel(sheetChart: OgeSheetChart): string {
  return (
    sheetChart.description ||
    shownTitle(sheetChart.chart) ||
    sheetChart.name ||
    ''
  );
}

/**
 * A pie's shares as its percent labels show them: rounded to the format's
 * places so that they add up to 100% — Excel gives the hundredths left over
 * to the largest remainders (`charts.Data.chart4.png`: 34, 27, 17, 22 of
 * 33.8, 26.8, 16.9, 22.5).
 */
function roundedShares(shares: readonly number[], code: string): number[] {
  const places = /^0(?:\.(0+))?%$/.exec(code.trim());
  if (!places) return [...shares];
  const unit = 100 * 10 ** (places[1]?.length ?? 0);
  const floors = shares.map((v) => Math.floor(v * unit + 1e-9));
  let left = Math.round(unit - floors.reduce((a, b) => a + b, 0));
  const order = shares
    .map((v, i) => ({ i, rest: v * unit - Math.floor(v * unit + 1e-9) }))
    .filter(({ i }) => (shares[i] ?? 0) > 0)
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    left--;
  }
  return floors.map((f) => f / unit);
}

/** A slice of a pie or a doughnut, clockwise from `a0` to `a1` (radians from 12 o'clock). */
function slicePath(
  cx: number,
  cy: number,
  radius: number,
  hole: number,
  a0: number,
  a1: number,
): string {
  const pt = (a: number, r: number) =>
    `${r2(cx + r * Math.sin(a))} ${r2(cy - r * Math.cos(a))}`;
  const R = r2(radius);
  const h = r2(hole);
  if (a1 - a0 >= 2 * Math.PI - 1e-6) {
    // the whole disc (or ring): two half arcs, the hole the other way round
    const disc = `M${pt(a0, radius)}A${R} ${R} 0 1 1 ${pt(a0 + Math.PI, radius)}A${R} ${R} 0 1 1 ${pt(a0, radius)}Z`;
    return hole > 0
      ? `${disc}M${pt(a0, hole)}A${h} ${h} 0 1 0 ${pt(a0 + Math.PI, hole)}A${h} ${h} 0 1 0 ${pt(a0, hole)}Z`
      : disc;
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return hole > 0
    ? `M${pt(a0, radius)}A${R} ${R} 0 ${large} 1 ${pt(a1, radius)}L${pt(a1, hole)}A${h} ${h} 0 ${large} 0 ${pt(a0, hole)}Z`
    : `M${r2(cx)} ${r2(cy)}L${pt(a0, radius)}A${R} ${R} 0 ${large} 1 ${pt(a1, radius)}Z`;
}

/** A value axis as drawn: its scale and its labels' texts. */
interface ValueAxis {
  readonly model?: OgeChartAxis;
  readonly min: number;
  readonly max: number;
  readonly unit: number;
  readonly ticks: readonly number[];
  readonly labels: readonly string[];
  readonly face: Face;
  /** Its labels show. */
  readonly shown: boolean;
  /** Its labels' widest text, px. */
  readonly widest: number;
}

/** Draws a chart as Excel draws it: its title, legend, plot, axes and series, into paths and texts. */
export function ogeChartView(
  input: OgeChartViewInput,
): OgeSpreadsheetChartView {
  const { chart, locale } = input;
  const s = input.zoom / 100;
  const W = input.width;
  const H = input.height;
  const measurer = input.measurer ?? OGE_ESTIMATING_MEASURER;
  const body = input.bodyFont ?? 'Calibri';
  const paths: OgeChartPathMark[] = [];
  const texts: OgeChartTextMark[] = [];
  const all = chart.groups.flatMap((g) => g.series);
  const pointCount = Math.max(0, ...all.map((x) => x.values.values.length));
  const palette = ogeChartPalette(
    input.theme,
    Math.max(1, pointCount, ...all.map((x) => x.index + 1)),
  );
  const measure = (value: string, face: Face) =>
    value ? measurer.measure(value, face.paint) : 0;
  const fontOf = (
    own: OgeChartFont | undefined,
    size: number,
    family: string = body,
  ): FontSpec => ({
    family: own?.family ?? chart.font.family ?? family,
    size: own?.size ?? chart.font.size ?? size,
    bold: own?.bold ?? chart.font.bold ?? false,
    italic: own?.italic ?? chart.font.italic ?? false,
    color: own?.color ?? chart.font.color ?? DEFAULTS.text,
  });
  // a title states its size, or takes Excel's — larger than the chart's text
  const titleFontOf = (own: OgeChartFont | undefined): FontSpec => ({
    ...fontOf(own, DEFAULTS.size, DEFAULTS.titleFace),
    size:
      own?.size ??
      (chart.font.size !== undefined
        ? chart.font.size * 1.2
        : DEFAULTS.titleSize),
  });
  const write = (
    x: number,
    y: number,
    value: string,
    face: Face,
    anchor: OgeChartTextMark['anchor'] = 'middle',
    transform?: string,
  ) => {
    if (!value) return;
    texts.push({
      x: r2(x),
      y: r2(y),
      text: value,
      anchor,
      style: face.style,
      ...(transform ? { transform } : {}),
    });
  };
  /** A thin line's width at the zoom: whole pixels, so it stays crisp. */
  const thin = (width: number | undefined) =>
    Math.max(1, Math.round((width ?? 1) * s));
  const pointFill = (
    group: OgeChartGroup,
    series: OgeChartSeries,
    at: number,
  ): string | undefined => {
    const own = series.points?.get(at);
    if (own?.fill === 'none') return undefined;
    return (
      own?.fill ??
      (group.varyColors && all.length === 1
        ? (palette[at % palette.length] ?? '#4472C4')
        : fillOf(series.shape, seriesColor(group, series, palette)))
    );
  };
  const markerColors = (group: OgeChartGroup, series: OgeChartSeries) => {
    const color = seriesColor(group, series, palette);
    const shape = series.marker?.shape;
    return {
      fill: fillOf(shape, color),
      stroke: lineOf(shape, color),
    };
  };
  const drawMarker = (
    marker: {
      readonly symbol: string;
      readonly size: number;
      readonly fill?: string;
      readonly stroke?: string;
    },
    cx: number,
    cy: number,
  ) => {
    const { d, open } = markerPath(marker.symbol, cx, cy, marker.size * PT * s);
    const stroke = marker.stroke ?? (open ? marker.fill : undefined);
    paths.push({
      d,
      ...(!open && marker.fill ? { fill: marker.fill } : {}),
      ...(stroke ? { stroke, strokeWidth: r2(Math.max(1, s)) } : {}),
    });
  };

  // ── the chart area ──
  const areaLine = lineOf(chart.area, DEFAULTS.border);
  const areaFill = fillOf(chart.area, DEFAULTS.fill);
  const frame = areaLine ? thin(chart.area.lineWidth) : 0;
  paths.push({
    d: chart.roundedCorners
      ? roundRectPath(
          frame / 2,
          frame / 2,
          W - frame,
          H - frame,
          LAYOUT.corner * s,
        )
      : rectPath(frame / 2, frame / 2, W - frame, H - frame),
    ...(areaFill ? { fill: areaFill } : {}),
    ...(areaFill && chart.area.fillOpacity !== undefined
      ? { fillOpacity: chart.area.fillOpacity }
      : {}),
    ...(areaLine ? { stroke: areaLine, strokeWidth: frame } : {}),
    ...(chart.roundedCorners ? {} : { crisp: true }),
  });

  // ── the title, centred at the top ──
  let top = LAYOUT.plainTop * s;
  let titleBottom = 0;
  const titleText = shownTitle(chart);
  if (chart.title && titleText) {
    const face = faceOf(titleFontOf(chart.title.font), s);
    const lines = titleText.split('\n');
    const lineHeight = face.ascent + face.descent;
    const inset = LAYOUT.titleInset * s;
    const boxW = Math.max(...lines.map((l) => measure(l, face))) + 2 * inset;
    const boxH = lines.length * lineHeight + 2 * inset;
    const box = placed(
      chart.title.layout,
      { x: (W - boxW) / 2, y: LAYOUT.titleTop * s },
      W,
      H,
    );
    lines.forEach((line, i) =>
      write(
        box.x + boxW / 2,
        box.y + inset + face.ascent + i * lineHeight,
        line,
        face,
      ),
    );
    if (!chart.title.overlay) {
      titleBottom = box.y + boxH;
      top = Math.max(top, titleBottom + LAYOUT.titleGap * s);
    }
  }

  // ── the legend: one entry a series, or a point when the colours vary ──
  const round = chart.groups.find(
    (g) => g.kind === 'pie' || g.kind === 'doughnut',
  );
  const first = chart.groups[0];
  const byPoint = !!round || (!!first && first.varyColors && all.length === 1);
  const entries: LegendEntry[] = [];
  if (chart.legend) {
    if (byPoint) {
      const group = round ?? first;
      const series = group?.series[0];
      if (group && series) {
        const names = series.categories?.labels ?? [];
        series.values.values.forEach((_, i) => {
          const fill = pointFill(group, series, i);
          // a key is drawn as its point is, outline included
          const own = series.points?.get(i);
          const stroke = lineOf(own, lineOf(series.shape));
          entries.push({
            text: names[i] ?? String(i + 1),
            key: 'square',
            ...(fill ? { fill } : {}),
            ...(stroke
              ? {
                  stroke,
                  strokeWidth: r2(
                    (own?.lineWidth ?? series.shape.lineWidth ?? 1) * s,
                  ),
                }
              : {}),
          });
        });
      }
    } else {
      for (const group of chart.groups) {
        for (const series of group.series) {
          const color = seriesColor(group, series, palette);
          const text = series.name?.text ?? `Series${series.index + 1}`;
          if (group.kind === 'line' || group.kind === 'scatter') {
            const spec = markerSpec(group, series);
            const marker = spec
              ? { ...spec, ...markerColors(group, series) }
              : undefined;
            const width = r2(
              (series.shape.lineWidth ?? DEFAULTS.seriesLine) * s,
            );
            entries.push(
              joins(group, series)
                ? {
                    text,
                    key: 'line',
                    stroke: color,
                    strokeWidth: width,
                    ...(dashOf(series.shape.dash, width)
                      ? { dash: dashOf(series.shape.dash, width) }
                      : {}),
                    ...(marker ? { marker } : {}),
                  }
                : { text, key: 'marker', ...(marker ? { marker } : {}) },
            );
          } else {
            const fill = fillOf(series.shape, color);
            const stroke = lineOf(series.shape);
            entries.push({
              text,
              key: 'square',
              ...(fill ? { fill } : {}),
              ...(stroke
                ? {
                    stroke,
                    strokeWidth: r2((series.shape.lineWidth ?? 1) * s),
                  }
                : {}),
            });
          }
        }
      }
    }
  }
  const hidden = new Set(chart.legend?.hidden ?? []);
  const shownEntries = entries.filter((_, i) => !hidden.has(i));
  let left = 0;
  let right = W;
  /** The top of the legend's text when it sits under the plot. */
  let legendTop: number | undefined;
  if (chart.legend && shownEntries.length) {
    const legend = chart.legend;
    const face = faceOf(fontOf(legend.font, DEFAULTS.size), s);
    const lineHeight = face.ascent + face.descent;
    const bars = shownEntries.some((e) => e.key === 'line');
    const keyOf = (e: LegendEntry) =>
      e.key === 'line'
        ? LAYOUT.lineKey * s + (e.strokeWidth ?? 0)
        : bars && e.key === 'square'
          ? LAYOUT.lineKey * s
          : LAYOUT.squareKey * face.px;
    const gapOf = (e: LegendEntry) =>
      e.key === 'line' ? LAYOUT.lineGap * s : LAYOUT.squareGap * face.px;
    const afterOf = (e: LegendEntry) =>
      (e.key === 'line' ? LAYOUT.lineAfter : LAYOUT.squareAfter) * face.px;
    const widthOf = (e: LegendEntry) =>
      keyOf(e) + gapOf(e) + measure(e.text, face);
    const drawEntry = (e: LegendEntry, x: number, baseline: number) => {
      const key = keyOf(e);
      const middle = baseline - 0.28 * face.px;
      if (e.key === 'line') {
        const cap = (e.strokeWidth ?? 0) / 2;
        if (e.stroke)
          paths.push({
            d: `M${r2(x + cap)} ${r2(middle)}H${r2(x + key - cap)}`,
            stroke: e.stroke,
            strokeWidth: e.strokeWidth ?? 1,
            ...(e.dash ? { dash: e.dash } : {}),
            round: true,
          });
        if (e.marker) drawMarker(e.marker, x + key / 2, middle);
      } else if (e.key === 'marker') {
        if (e.marker) drawMarker(e.marker, x + key / 2, middle);
      } else {
        const side = LAYOUT.squareKey * face.px;
        // an outlined point's key: a thin outline inside the square
        // (a pie's 2 px white slice edges leave a 5 px key, measured)
        const outline = e.stroke ? Math.max(1, Math.round(s)) : 0;
        paths.push({
          d: rectPath(
            x + outline / 2,
            baseline + 0.04 * face.px - side + outline / 2,
            key - outline,
            side - outline,
          ),
          ...(e.fill ? { fill: e.fill } : {}),
          ...(e.stroke ? { stroke: e.stroke, strokeWidth: outline } : {}),
          crisp: true,
        });
      }
      write(x + key + gapOf(e), baseline, e.text, face, 'start');
    };
    if (legend.position === 'b' || legend.position === 't') {
      // rows, each centred: as many entries a row as fit
      const room = W - 2 * LAYOUT.edge * s;
      const rows: LegendEntry[][] = [];
      let used = 0;
      for (const e of shownEntries) {
        const row = rows[rows.length - 1];
        const last = row?.[row.length - 1];
        const need = (last ? afterOf(last) : 0) + widthOf(e);
        if (!row || (last && used + need > room)) {
          rows.push([e]);
          used = widthOf(e);
        } else {
          row.push(e);
          used += need;
        }
      }
      const rowWidth = (row: readonly LegendEntry[]) =>
        row.reduce(
          (sum, e, i) =>
            sum + widthOf(e) + (i < row.length - 1 ? afterOf(e) : 0),
          0,
        );
      const blockTop =
        legend.position === 'b'
          ? H -
            LAYOUT.legendBottom * s -
            (rows.length - 1) * lineHeight -
            face.ascent
          : (titleBottom || LAYOUT.titleTop * s) + LAYOUT.titleInset * s;
      const at = placed(legend.layout, { x: 0, y: blockTop }, W, H);
      rows.forEach((row, r) => {
        let x = legend.layout?.x !== undefined ? at.x : (W - rowWidth(row)) / 2;
        const baseline = at.y + face.ascent + r * lineHeight;
        for (const e of row) {
          drawEntry(e, x, baseline);
          x += widthOf(e) + afterOf(e);
        }
      });
      if (!legend.overlay && !legend.layout) {
        if (legend.position === 'b') legendTop = blockTop;
        else
          top = Math.max(
            top,
            blockTop + rows.length * lineHeight + LAYOUT.titleGap * s,
          );
      }
    } else {
      // a column at a side, centred on the plot's height
      const widest = Math.max(...shownEntries.map(widthOf));
      const step = lineHeight * 1.25;
      const blockH = shownEntries.length * step;
      const x0 =
        legend.position === 'l'
          ? LAYOUT.edge * s
          : W - LAYOUT.edge * s - widest;
      const y0 =
        legend.position === 'tr'
          ? top - LAYOUT.titleGap * s + LAYOUT.titleInset * s
          : (top + H - blockH) / 2;
      const at = placed(legend.layout, { x: x0, y: y0 }, W, H);
      shownEntries.forEach((e, i) =>
        drawEntry(e, at.x, at.y + face.ascent + i * step),
      );
      if (!legend.overlay && !legend.layout) {
        if (legend.position === 'l') left = x0 + widest + LAYOUT.legendSide * s;
        else right = x0 - LAYOUT.legendSide * s;
      }
    }
  }

  const label = titleText || all[0]?.name?.text || '';
  let plotBox: OgeSpreadsheetChartView['plot'];
  const view = (): OgeSpreadsheetChartView => ({
    width: W,
    height: H,
    paths,
    texts,
    label,
    ...(plotBox ? { plot: plotBox } : {}),
  });
  if (round) {
    drawPie(round);
    return view();
  }
  drawCartesian();
  return view();

  // ── a pie or a doughnut ──
  function drawPie(group: OgeChartGroup): void {
    const series = group.series[0];
    if (!series) return;
    const values = series.values.values.map((v) => Math.abs(v ?? 0));
    const total = values.reduce((a, b) => a + b, 0);
    const labels = series.labels ?? group.labels;
    const shows =
      !!labels &&
      (labels.showValue ||
        labels.showPercent ||
        labels.showCategory ||
        labels.showSeries);
    const labelFace = faceOf(fontOf(labels?.font, DEFAULTS.size), s);
    const outside = shows && labels?.position === 'outEnd';
    const regionTop = top;
    const regionBottom =
      legendTop !== undefined
        ? legendTop - LAYOUT.pieToLegend * s
        : H - LAYOUT.side * s;
    const regionLeft = left + LAYOUT.edge * s;
    const regionRight = right - LAYOUT.edge * s;
    let diameter = Math.min(regionRight - regionLeft, regionBottom - regionTop);
    let cx = (regionLeft + regionRight) / 2;
    let cy = (regionTop + regionBottom) / 2;
    const manual = chart.plotLayout;
    if (manual?.w !== undefined && manual.h !== undefined) {
      const at = placed(
        manual,
        { x: cx - diameter / 2, y: cy - diameter / 2 },
        W,
        H,
      );
      const w = manual.w * W;
      const h = manual.h * H;
      diameter = Math.min(w, h);
      cx = at.x + w / 2;
      cy = at.y + h / 2;
    } else if (outside) {
      diameter -= 2 * LAYOUT.pieLabelRoom * labelFace.px;
    }
    const radius = Math.max(0, diameter / 2);
    plotBox = {
      x: r2(cx - radius),
      y: r2(cy - radius),
      width: r2(2 * radius),
      height: r2(2 * radius),
    };
    const hole =
      group.kind === 'doughnut' ? (radius * (group.holeSize ?? 50)) / 100 : 0;
    const names = series.categories?.labels ?? [];
    const format = formatterOf(labels?.format ?? series.values.format, locale);
    const percent = formatterOf(labels?.format ?? '0%', locale);
    const shares = roundedShares(
      values.map((v) => (total > 0 ? v / total : 0)),
      labels?.format ?? '0%',
    );
    let angle = ((group.firstSliceAngle ?? 0) * Math.PI) / 180;
    values.forEach((v, i) => {
      if (!(total > 0) || !(v > 0)) return;
      const a0 = angle;
      const a1 = angle + (v / total) * 2 * Math.PI;
      angle = a1;
      const own = series.points?.get(i);
      const fill = pointFill(group, series, i);
      const stroke = lineOf(own, lineOf(series.shape));
      paths.push({
        d: slicePath(cx, cy, radius, hole, a0, a1),
        ...(fill ? { fill } : {}),
        ...(stroke
          ? {
              stroke,
              strokeWidth: r2(
                (own?.lineWidth ?? series.shape.lineWidth ?? 1) * s,
              ),
            }
          : {}),
      });
      if (!shows || !labels) return;
      const value = labelText(
        labels,
        {
          value: series.values.values[i] ?? 0,
          category: names[i] ?? '',
          series: series.name?.text ?? '',
          percent: shares[i] ?? v / total,
        },
        format,
        percent,
      );
      if (!value) return;
      const mid = (a0 + a1) / 2;
      const dx = Math.sin(mid);
      const dy = -Math.cos(mid);
      const w = measure(value, labelFace);
      const h = (labelFace.ascent + labelFace.descent) * 0.8;
      const support = (Math.abs(dx) * w) / 2 + (Math.abs(dy) * h) / 2;
      const distance =
        labels.position === 'outEnd'
          ? radius + LAYOUT.pieLabelGap * s + support
          : labels.position === 'inEnd'
            ? radius - LAYOUT.pieLabelGap * s - support
            : hole > 0
              ? (radius + hole) / 2
              : radius * 0.6;
      write(
        cx + dx * distance,
        cy + dy * distance + (labelFace.ascent - labelFace.descent) / 2,
        value,
        labelFace,
      );
    });
  }

  // ── bars, lines, areas, scatter and bubbles over axes ──
  function drawCartesian(): void {
    const xy = chart.groups.some(
      (g) => g.kind === 'scatter' || g.kind === 'bubble',
    );
    const rotated =
      !xy &&
      chart.groups.some((g) => g.kind === 'bar' && g.direction === 'bar');
    const axisById = new Map(chart.axes.map((a) => [a.id, a]));
    // each group's category (or x) axis and value axis
    const axesOf = chart.groups.map((g) => {
      const own = g.axes
        .map((id) => axisById.get(id))
        .filter((a): a is OgeChartAxis => !!a);
      if (xy) {
        const across = own.find(
          (a) => a.position === 'b' || a.position === 't',
        );
        return { cat: across, val: own.find((a) => a !== across) };
      }
      return {
        cat: own.find((a) => a.kind !== 'value'),
        val: own.find((a) => a.kind === 'value'),
      };
    });
    const primary = axesOf[0]?.val;
    const catModel = axesOf[0]?.cat;
    const secondary = axesOf
      .map((a) => a.val)
      .find((v) => v !== undefined && v !== primary);
    const onAxis = (gi: number, axis: OgeChartAxis | undefined) => {
      const val = axesOf[gi]?.val;
      return axis === primary ? !val || val === primary : val === axis;
    };

    // the value extents an axis scales over: stacks add up, full stacks run to 100%
    const extent = (axis: OgeChartAxis | undefined): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      chart.groups.forEach((g, gi) => {
        if (!onAxis(gi, axis)) return;
        if (g.grouping === 'percentStacked') {
          const negative = g.series.some((x) =>
            x.values.values.some((v) => (v ?? 0) < 0),
          );
          lo = Math.min(lo, negative ? -1 : 0);
          hi = Math.max(hi, 1);
          return;
        }
        if (g.grouping === 'stacked') {
          const pos: number[] = [];
          const neg: number[] = [];
          for (const x of g.series)
            x.values.values.forEach((v, i) => {
              if (v === null) return;
              if (v >= 0) pos[i] = (pos[i] ?? 0) + v;
              else neg[i] = (neg[i] ?? 0) + v;
            });
          for (const v of [...pos, ...neg])
            if (v !== undefined) {
              lo = Math.min(lo, v);
              hi = Math.max(hi, v);
            }
          return;
        }
        for (const x of g.series)
          for (const v of x.values.values)
            if (v !== null) {
              lo = Math.min(lo, v);
              hi = Math.max(hi, v);
            }
      });
      return [lo, hi];
    };
    const xExtent = (): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const g of chart.groups)
        for (const x of g.series)
          x.values.values.forEach((_, i) => {
            const v = x.categories?.numbers?.[i] ?? i + 1;
            if (v === null) return;
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
          });
      return [lo, hi];
    };

    const labelFaceOf = (axis: OgeChartAxis | undefined) =>
      faceOf(fontOf(axis?.font, DEFAULTS.size), s);
    const shows = (axis: OgeChartAxis | undefined) =>
      !!axis && !axis.deleted && axis.labelPosition !== 'none';
    const titleOf = (axis: OgeChartAxis | undefined) => {
      const value = axis?.title?.text?.text;
      return value && axis?.title
        ? { text: value, face: faceOf(titleFontOf(axis.title.font), s) }
        : undefined;
    };
    const valueAxis = (
      axis: OgeChartAxis | undefined,
      length: number,
      vertical: boolean,
      range: [number, number],
    ): ValueAxis => {
      const full = chart.groups.some(
        (g, gi) => onAxis(gi, axis) && g.grouping === 'percentStacked',
      );
      const fixed = {
        ...(axis?.min !== undefined ? { min: axis.min } : {}),
        ...(axis?.max !== undefined ? { max: axis.max } : {}),
        ...(axis?.majorUnit !== undefined ? { majorUnit: axis.majorUnit } : {}),
      };
      const scale = ogeChartScale(range[0], range[1], length, vertical, fixed);
      const ticks: number[] = [];
      const steps = Math.round((scale.max - scale.min) / scale.majorUnit);
      for (let i = 0; i <= Math.min(steps, 1000); i++)
        ticks.push(Number((scale.min + i * scale.majorUnit).toPrecision(12)));
      const code =
        axis?.format && !axis.format.sourceLinked
          ? axis.format.code
          : full
            ? '0%'
            : (all.find((x) => x.values.format)?.values.format ??
              axis?.format?.code);
      const format = formatterOf(code, locale);
      const face = labelFaceOf(axis);
      const labels = ticks.map((t) => format(t));
      const shown = shows(axis);
      return {
        ...(axis ? { model: axis } : {}),
        min: scale.min,
        max: scale.max,
        unit: scale.majorUnit,
        ticks,
        labels,
        face,
        shown,
        widest: shown ? Math.max(0, ...labels.map((l) => measure(l, face))) : 0,
      };
    };

    // the category axis' labels (or an x value axis')
    const series0 = all[0];
    const categories =
      all.find((x) => x.categories)?.categories ?? series0?.categories;
    const catFace = labelFaceOf(catModel);
    const catShown = shows(catModel);
    const catFormat = formatterOf(
      catModel?.format && !catModel.format.sourceLinked
        ? catModel.format.code
        : categories?.format,
      locale,
    );
    const catLabels: string[] = [];
    for (let i = 0; i < pointCount; i++) {
      const n = categories?.numbers?.[i];
      catLabels.push(
        categories
          ? n !== undefined && n !== null && categories.format
            ? catFormat(n)
            : (categories.labels[i] ?? '')
          : String(i + 1),
      );
    }

    // ── the vertical extent: the title on top, rows of labels and the legend below ──
    const plotTop = top;
    const acrossModel = rotated ? primary : catModel;
    const acrossFace = rotated ? labelFaceOf(primary) : catFace;
    const acrossShown = rotated ? shows(primary) : catShown;
    const acrossTitle = titleOf(acrossModel);
    let cursor: number;
    let acrossTitleBaseline: number | undefined;
    if (legendTop !== undefined) {
      if (acrossTitle) {
        acrossTitleBaseline =
          legendTop - LAYOUT.axisTitleToLegend * s - acrossTitle.face.descent;
        cursor =
          acrossTitleBaseline -
          acrossTitle.face.ascent -
          LAYOUT.labelsToAxisTitle * s;
      } else cursor = legendTop - LAYOUT.labelsToLegend * s;
    } else if (acrossTitle) {
      acrossTitleBaseline = H - LAYOUT.legendBottom * s;
      cursor =
        acrossTitleBaseline -
        acrossTitle.face.ascent -
        LAYOUT.labelsToAxisTitle * s;
    } else {
      cursor = H - LAYOUT.legendBottom * s + acrossFace.descent;
    }
    const plotBottom = acrossShown
      ? cursor - acrossFace.descent - LAYOUT.labelRow * acrossFace.px
      : cursor - LAYOUT.side * s;
    let plotH = Math.max(1, plotBottom - plotTop);

    // ── the horizontal extent: a title and labels on the left, labels or room on the right ──
    const upModel = rotated ? catModel : primary;
    const upTitle = titleOf(upModel);
    let x = left + LAYOUT.edge * s;
    let upTitleBaseline: number | undefined;
    if (upTitle) {
      upTitleBaseline = x + LAYOUT.axisTitleInset * s + upTitle.face.ascent;
      x = upTitleBaseline + upTitle.face.descent + LAYOUT.axisTitleToLabels * s;
    }
    const firstUp = rotated
      ? undefined
      : valueAxis(primary, plotH, true, extent(primary));
    const firstUp2 =
      secondary && !rotated
        ? valueAxis(secondary, plotH, true, extent(secondary))
        : undefined;
    const upWidest = rotated
      ? catShown
        ? Math.max(0, ...catLabels.map((l) => measure(l, catFace)))
        : 0
      : (firstUp?.widest ?? 0);
    const upShown = rotated ? catShown : !!firstUp?.shown;
    let plotLeft = upShown
      ? x + upWidest + LAYOUT.labelGap * s
      : Math.max(x, left + LAYOUT.side * s);
    let plotRight = firstUp2?.shown
      ? right - LAYOUT.edge * s - firstUp2.widest - LAYOUT.labelGap * s
      : right - LAYOUT.side * s;
    // categories on the axis' crossings: the last label's half hangs past the plot
    const midCat =
      !xy &&
      !chart.groups.some((g) => g.kind === 'bar') &&
      primary?.crossBetween === 'midCat';
    if (midCat && catShown && !rotated)
      plotRight = Math.min(
        plotRight,
        right -
          LAYOUT.side * s -
          measure(catLabels[catLabels.length - 1] ?? '', catFace) / 2,
      );
    // a value axis along the bottom: its last label's half hangs past the plot, too
    let across: ValueAxis | undefined;
    if (rotated || xy) {
      const model = rotated ? primary : catModel;
      const range = rotated ? extent(primary) : xExtent();
      across = valueAxis(model, plotRight - plotLeft, false, range);
      const lastHalf = across.shown
        ? measure(across.labels[across.labels.length - 1] ?? '', across.face) /
          2
        : 0;
      plotRight = Math.min(plotRight, right - LAYOUT.side * s - lastHalf);
      across = valueAxis(model, plotRight - plotLeft, false, range);
    }
    // the file's own plot area, inner or with its labels
    const manual = chart.plotLayout;
    if (manual?.w !== undefined && manual.h !== undefined) {
      const at = placed(manual, { x: plotLeft, y: plotTop }, W, H);
      const w = manual.w * W;
      const h = manual.h * H;
      if (manual.target === 'inner') {
        plotLeft = at.x;
        plotRight = at.x + w;
        plotH = h;
      } else {
        plotLeft = Math.max(at.x, plotLeft);
        plotRight = Math.min(at.x + w, plotRight);
        plotH = Math.max(1, Math.min(h, plotH));
      }
    }
    const plot = {
      x: plotLeft,
      y:
        manual?.target === 'inner' && manual.y !== undefined
          ? placed(manual, { x: plotLeft, y: plotTop }, W, H).y
          : plotTop,
      w: Math.max(1, plotRight - plotLeft),
      h: plotH,
    };
    plotBox = {
      x: r2(plot.x),
      y: r2(plot.y),
      width: r2(plot.w),
      height: r2(plot.h),
    };
    // the value axes again, at the plot's final size
    const up = rotated
      ? undefined
      : valueAxis(primary, plot.h, true, extent(primary));
    const up2 =
      secondary && !rotated
        ? valueAxis(secondary, plot.h, true, extent(secondary))
        : undefined;
    if (across && (rotated || xy)) {
      across = valueAxis(
        rotated ? primary : catModel,
        plot.w,
        false,
        rotated ? extent(primary) : xExtent(),
      );
    }

    // positions along the category axis and up a value axis, px in the chart
    const catLength = rotated ? plot.h : plot.w;
    const bars = chart.groups.some((g) => g.kind === 'bar');
    const between = bars || (primary?.crossBetween ?? 'between') === 'between';
    const band = between
      ? catLength / Math.max(1, pointCount)
      : catLength / Math.max(1, pointCount - 1);
    const catReversed = !!catModel?.reversed;
    const along = (offset: number) => {
      const v = catReversed ? catLength - offset : offset;
      // categories run up a rotated chart, from its bottom
      return rotated ? plot.y + plot.h - v : plot.x + v;
    };
    const catAt = (i: number) => along(between ? (i + 0.5) * band : i * band);
    const valueAt = (axis: ValueAxis | undefined, v: number) => {
      if (!axis) return rotated ? plot.x : plot.y + plot.h;
      const span = axis.max - axis.min || 1;
      let f = (v - axis.min) / span;
      if (axis.model?.reversed) f = 1 - f;
      return rotated || axis === across
        ? plot.x + f * plot.w
        : plot.y + plot.h - f * plot.h;
    };
    const axisFor = (gi: number) => {
      const val = axesOf[gi]?.val;
      if (rotated) return across;
      return val && val === secondary ? up2 : up;
    };
    const xAt = (v: number) => valueAt(across, v);
    const clampTo = (axis: ValueAxis | undefined, v: number) =>
      axis ? Math.min(axis.max, Math.max(axis.min, v)) : v;
    // where an axis (the category one by default) crosses a value axis: at 0, or the scale's end
    const crossing = (
      axis: ValueAxis | undefined,
      by: OgeChartAxis | undefined = catModel,
    ) => {
      if (!axis) return 0;
      if (by?.crossesAt !== undefined) return clampTo(axis, by.crossesAt);
      if (by?.crosses === 'max') return axis.max;
      if (by?.crosses === 'min') return axis.min;
      return clampTo(axis, 0);
    };
    const mainValue = rotated ? across : up;

    // ── the plot area, gridlines ──
    const plotFill = fillOf(chart.plotArea);
    const plotLine = lineOf(chart.plotArea);
    if (plotFill || plotLine)
      paths.push({
        d: rectPath(plot.x, plot.y, plot.w, plot.h),
        ...(plotFill ? { fill: plotFill } : {}),
        ...(plotLine
          ? { stroke: plotLine, strokeWidth: thin(chart.plotArea.lineWidth) }
          : {}),
        crisp: true,
      });
    const gridline = (
      shape: OgeChartShape,
      at: number,
      runsAcross: boolean,
    ) => {
      const color = lineOf(shape, DEFAULTS.line);
      if (!color) return;
      const width = thin(shape.lineWidth);
      const c = onGrid(at, width);
      paths.push({
        d: runsAcross
          ? `M${r2(plot.x)} ${c}H${r2(plot.x + plot.w)}`
          : `M${c} ${r2(plot.y)}V${r2(plot.y + plot.h)}`,
        stroke: color,
        strokeWidth: width,
        ...(dashOf(shape.dash, width)
          ? { dash: dashOf(shape.dash, width) }
          : {}),
        crisp: true,
      });
    };
    // gridlines of the axis across the plot (categories, or x values)
    const catGrid = catModel?.majorGridlines;
    if (catGrid) {
      if (across && xy) {
        for (const t of across.ticks) gridline(catGrid, xAt(t), false);
      } else {
        const count = between ? pointCount : pointCount - 1;
        for (let i = 0; i <= count; i++)
          gridline(catGrid, along(i * band), rotated);
      }
    }
    for (const axis of [mainValue, rotated ? undefined : up2]) {
      const grid = axis?.model?.majorGridlines;
      if (!axis || !grid) continue;
      for (const t of axis.ticks) gridline(grid, valueAt(axis, t), !rotated);
    }

    // ── the series: areas behind bars behind lines and points ──
    const order = ['area', 'bar', 'bubble', 'line', 'scatter'];
    const groups = chart.groups
      .map((g, gi) => ({ g, gi }))
      .sort((a, b) => order.indexOf(a.g.kind) - order.indexOf(b.g.kind));
    const dataLabels: (() => void)[] = [];
    for (const { g, gi } of groups) {
      const axis = axisFor(gi);
      if (g.kind === 'bar') drawBars(g, axis);
      else if (g.kind === 'area') drawAreas(g, axis);
      else if (g.kind === 'line') drawLines(g, axis);
      else if (g.kind === 'scatter' || g.kind === 'bubble') drawPoints(g, axis);
    }

    // ── the axes: lines, tick marks, labels, titles ──
    const axisLine = (
      model: OgeChartAxis | undefined,
      at: number,
      runsAcross: boolean,
    ) => {
      if (!model || model.deleted) return;
      const color = lineOf(model.shape, DEFAULTS.line);
      if (!color) return;
      const width = thin(model.shape.lineWidth);
      const c = onGrid(at, width);
      paths.push({
        d: runsAcross
          ? `M${r2(plot.x)} ${c}H${r2(plot.x + plot.w)}`
          : `M${c} ${r2(plot.y)}V${r2(plot.y + plot.h)}`,
        stroke: color,
        strokeWidth: width,
        crisp: true,
      });
    };
    // marks across a line at `at`: vertical ones along a horizontal axis
    const tickMarks = (
      model: OgeChartAxis | undefined,
      positions: readonly number[],
      at: number,
      marksVertical: boolean,
      outward: 1 | -1,
    ) => {
      if (!model || model.deleted || model.majorTicks === 'none') return;
      const color = lineOf(model.shape, DEFAULTS.line);
      if (!color) return;
      const width = thin(model.shape.lineWidth);
      const length = LAYOUT.tick * s;
      const from =
        model.majorTicks === 'in'
          ? 0
          : model.majorTicks === 'cross'
            ? -length
            : 0;
      const to = model.majorTicks === 'in' ? -length : length;
      const c0 = at + outward * from;
      const c1 = at + outward * to;
      let d = '';
      for (const p of positions) {
        const q = onGrid(p, width);
        d += marksVertical
          ? `M${q} ${r2(c0)}V${r2(c1)}`
          : `M${r2(c0)} ${q}H${r2(c1)}`;
      }
      if (d) paths.push({ d, stroke: color, strokeWidth: width, crisp: true });
    };
    // the category axis line, where it crosses the value axis
    const catCross = mainValue ? valueAt(mainValue, crossing(mainValue)) : 0;
    if (!xy) {
      const boundaries: number[] = [];
      const count = between ? pointCount : pointCount - 1;
      for (let i = 0; i <= count; i++) boundaries.push(along(i * band));
      if (rotated) {
        axisLine(catModel, catCross, false);
        tickMarks(catModel, boundaries, catCross, false, -1);
      } else {
        axisLine(catModel, catCross, true);
        tickMarks(catModel, boundaries, catCross, true, 1);
      }
    }
    // the value axes' lines: the primary at the categories' start (or end), the secondary across
    const valueLine = (axis: ValueAxis | undefined, far: boolean) => {
      if (!axis?.model) return;
      const runsAcross = rotated || axis === across;
      const at = runsAcross
        ? far
          ? plot.y
          : xy && up
            ? valueAt(up, crossing(up))
            : plot.y + plot.h
        : far
          ? plot.x + plot.w
          : xy && across
            ? xAt(crossing(across, primary))
            : plot.x;
      axisLine(axis.model, at, runsAcross);
      tickMarks(
        axis.model,
        axis.ticks.map((t) => valueAt(axis, t)),
        at,
        runsAcross,
        runsAcross ? (far ? -1 : 1) : far ? 1 : -1,
      );
    };
    const farPrimary = primary?.crosses === 'max';
    if (rotated) valueLine(across, false);
    else {
      valueLine(up, farPrimary);
      if (up2) valueLine(up2, secondary?.crosses !== 'min');
      if (xy && across) valueLine(across, false);
    }

    // tick labels
    const sideLabels = (axis: ValueAxis | undefined, far: boolean) => {
      if (!axis?.shown) return;
      const xLabel = far
        ? plot.x + plot.w + LAYOUT.labelGap * s
        : plot.x - LAYOUT.labelGap * s;
      axis.ticks.forEach((t, i) =>
        write(
          xLabel,
          valueAt(axis, t) + 0.3 * axis.face.px,
          axis.labels[i] ?? '',
          axis.face,
          far ? 'start' : 'end',
        ),
      );
    };
    const rowLabels = (
      values: readonly { readonly at: number; readonly text: string }[],
      face: Face,
    ) => {
      const baseline = plot.y + plot.h + LAYOUT.labelRow * face.px;
      // Excel's automatic interval: every n-th label, so none overlaps
      const widest = Math.max(0, ...values.map((v) => measure(v.text, face)));
      const spacing =
        values.length > 1
          ? Math.abs((values[1]?.at ?? 0) - (values[0]?.at ?? 0))
          : Infinity;
      const every = Math.max(
        1,
        Math.ceil((widest + 0.3 * face.px) / Math.max(1, spacing)),
      );
      values.forEach((v, i) => {
        if (i % every === 0) write(v.at, baseline, v.text, face);
      });
    };
    if (rotated) {
      if (catShown)
        catLabels.forEach((l, i) =>
          write(
            plot.x - LAYOUT.labelGap * s,
            catAt(i) + 0.3 * catFace.px,
            l,
            catFace,
            'end',
          ),
        );
      if (across?.shown)
        rowLabels(
          across.ticks.map((t, i) => ({
            at: xAt(t),
            text: across?.labels[i] ?? '',
          })),
          across.face,
        );
    } else {
      sideLabels(up, farPrimary);
      if (up2) sideLabels(up2, secondary?.crosses !== 'min');
      if (xy && across?.shown)
        rowLabels(
          across.ticks.map((t, i) => ({
            at: xAt(t),
            text: across?.labels[i] ?? '',
          })),
          across.face,
        );
      else if (catShown)
        rowLabels(
          catLabels.map((l, i) => ({ at: catAt(i), text: l })),
          catFace,
        );
    }
    // axis titles: under the plot, and rotated up its left
    if (acrossTitle && acrossTitleBaseline !== undefined)
      write(
        plot.x + plot.w / 2,
        acrossTitleBaseline,
        acrossTitle.text,
        acrossTitle.face,
      );
    if (upTitle && upTitleBaseline !== undefined) {
      const cy = plot.y + plot.h / 2;
      write(
        upTitleBaseline,
        cy,
        upTitle.text,
        upTitle.face,
        'middle',
        `rotate(-90 ${r2(upTitleBaseline)} ${r2(cy)})`,
      );
    }
    for (const draw of dataLabels) draw();

    // ── series drawers ──
    function drawBars(g: OgeChartGroup, axis: ValueAxis | undefined): void {
      const clustered =
        g.grouping !== 'stacked' && g.grouping !== 'percentStacked';
      const slots = clustered ? Math.max(1, g.series.length) : 1;
      const gap = (g.gapWidth ?? 150) / 100;
      const overlap = clustered ? (g.overlap ?? 0) / 100 : 1;
      const width = band / (slots - (slots - 1) * overlap + gap);
      const base = crossing(axis);
      const pos: number[] = [];
      const neg: number[] = [];
      const totals: number[] = [];
      if (g.grouping === 'percentStacked')
        for (const x of g.series)
          x.values.values.forEach((v, i) => {
            totals[i] = (totals[i] ?? 0) + Math.abs(v ?? 0);
          });
      g.series.forEach((series, k) => {
        const stroke = lineOf(series.shape);
        const strokeWidth = stroke ? r2((series.shape.lineWidth ?? 1) * s) : 0;
        series.values.values.forEach((raw, i) => {
          if (raw === null) return;
          const v =
            g.grouping === 'percentStacked'
              ? totals[i]
                ? raw / (totals[i] ?? 1)
                : 0
              : raw;
          let from = base;
          if (!clustered) {
            from = v >= 0 ? (pos[i] ?? 0) : (neg[i] ?? 0);
            if (v >= 0) pos[i] = from + v;
            else neg[i] = from + v;
          }
          const to = from + v;
          const start =
            i * band +
            (gap * width) / 2 +
            (clustered ? k * width * (1 - overlap) : 0);
          const a = along(start);
          const b = along(start + width);
          const p = valueAt(axis, clampTo(axis, from));
          const q = valueAt(axis, clampTo(axis, to));
          const [x0, x1] = rotated ? [p, q] : [a, b];
          const [y0, y1] = rotated ? [a, b] : [p, q];
          const left = Math.round(Math.min(x0, x1));
          const right = Math.round(Math.max(x0, x1));
          const topY = Math.round(Math.min(y0, y1));
          const bottomY = Math.round(Math.max(y0, y1));
          if (right - left <= 0 || bottomY - topY <= 0) return;
          const fill = pointFill(g, series, i);
          const own = series.points?.get(i);
          const pointStroke = lineOf(own, stroke);
          paths.push({
            d: rectPath(left, topY, right - left, bottomY - topY),
            ...(fill ? { fill } : {}),
            ...(pointStroke
              ? { stroke: pointStroke, strokeWidth: strokeWidth || 1 }
              : {}),
            crisp: true,
          });
          const labels = series.labels ?? g.labels;
          if (
            labels &&
            (labels.showValue || labels.showCategory || labels.showSeries)
          )
            dataLabels.push(() =>
              barLabel(
                labels,
                series,
                i,
                raw,
                {
                  x: (left + right) / 2,
                  y: v >= 0 ? topY : bottomY,
                  left,
                  right,
                  top: topY,
                  bottom: bottomY,
                },
                clustered,
                v < 0,
              ),
            );
        });
      });
    }

    function barLabel(
      labels: OgeChartDataLabels,
      series: OgeChartSeries,
      at: number,
      value: number,
      box: {
        x: number;
        y: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
      },
      clustered: boolean,
      negative: boolean,
    ): void {
      const face = faceOf(fontOf(labels.font, DEFAULTS.size), s);
      const value_ = labelText(
        labels,
        {
          value,
          category: catLabels[at] ?? '',
          series: series.name?.text ?? '',
        },
        formatterOf(labels.format ?? series.values.format, locale),
        formatterOf('0%', locale),
      );
      const position = labels.position ?? (clustered ? 'outEnd' : 'ctr');
      const gap = LAYOUT.dataLabelGap * s;
      if (rotated) {
        const y = (box.top + box.bottom) / 2 + (face.ascent - face.descent) / 2;
        if (position === 'ctr')
          write((box.left + box.right) / 2, y, value_, face);
        else if (position === 'inEnd')
          write(
            negative ? box.left + gap : box.right - gap,
            y,
            value_,
            face,
            negative ? 'start' : 'end',
          );
        else if (position === 'inBase')
          write(
            negative ? box.right - gap : box.left + gap,
            y,
            value_,
            face,
            negative ? 'end' : 'start',
          );
        else
          write(
            negative ? box.left - gap : box.right + gap,
            y,
            value_,
            face,
            negative ? 'end' : 'start',
          );
        return;
      }
      if (position === 'ctr')
        write(
          box.x,
          (box.top + box.bottom) / 2 + (face.ascent - face.descent) / 2,
          value_,
          face,
        );
      else if (position === 'inEnd')
        write(
          box.x,
          negative
            ? box.bottom - gap - face.descent
            : box.top + gap + face.ascent,
          value_,
          face,
        );
      else if (position === 'inBase')
        write(
          box.x,
          negative
            ? box.top + gap + face.ascent
            : box.bottom - gap - face.descent,
          value_,
          face,
        );
      else
        write(
          box.x,
          negative
            ? box.bottom + gap + face.ascent
            : box.top - gap - face.descent,
          value_,
          face,
        );
    }

    function pointLabel(
      labels: OgeChartDataLabels,
      series: OgeChartSeries,
      at: number,
      value: number,
      p: Point,
    ): void {
      const face = faceOf(fontOf(labels.font, DEFAULTS.size), s);
      const text = labelText(
        labels,
        {
          value,
          category: catLabels[at] ?? '',
          series: series.name?.text ?? '',
        },
        formatterOf(labels.format ?? series.values.format, locale),
        formatterOf('0%', locale),
      );
      const gap = LAYOUT.dataLabelGap * s + 3 * s;
      const middle = p.y + (face.ascent - face.descent) / 2;
      switch (labels.position) {
        case 't':
          write(p.x, p.y - gap - face.descent, text, face);
          break;
        case 'b':
          write(p.x, p.y + gap + face.ascent, text, face);
          break;
        case 'l':
          write(p.x - gap, middle, text, face, 'end');
          break;
        case 'ctr':
          write(p.x, middle, text, face);
          break;
        default:
          write(p.x + gap, middle, text, face, 'start');
      }
    }

    function drawAreas(g: OgeChartGroup, axis: ValueAxis | undefined): void {
      const base = crossing(axis);
      const sums: number[] = [];
      const totals: number[] = [];
      const stacked =
        g.grouping === 'stacked' || g.grouping === 'percentStacked';
      if (g.grouping === 'percentStacked')
        for (const x of g.series)
          x.values.values.forEach((v, i) => {
            totals[i] = (totals[i] ?? 0) + Math.abs(v ?? 0);
          });
      for (const series of g.series) {
        const upper: Point[] = [];
        const lower: Point[] = [];
        for (let i = 0; i < pointCount; i++) {
          const raw = series.values.values[i] ?? 0;
          const v =
            g.grouping === 'percentStacked'
              ? totals[i]
                ? raw / (totals[i] ?? 1)
                : 0
              : raw;
          const from = stacked ? (sums[i] ?? 0) : base;
          const to = stacked ? from + v : v;
          if (stacked) sums[i] = to;
          const c = catAt(i);
          const hi = valueAt(axis, clampTo(axis, to));
          const lo = valueAt(axis, clampTo(axis, from));
          upper.push(rotated ? { x: hi, y: c } : { x: c, y: hi });
          lower.push(rotated ? { x: lo, y: c } : { x: c, y: lo });
        }
        if (!upper.length) continue;
        const d =
          linePath(upper, false) +
          [...lower]
            .reverse()
            .map((p) => `L${r2(p.x)} ${r2(p.y)}`)
            .join('') +
          'Z';
        const color = seriesColor(g, series, palette);
        const fill = fillOf(series.shape, color);
        const stroke = lineOf(series.shape);
        paths.push({
          d,
          ...(fill ? { fill } : {}),
          ...(series.shape.fillOpacity !== undefined
            ? { fillOpacity: series.shape.fillOpacity }
            : {}),
          ...(stroke
            ? { stroke, strokeWidth: r2((series.shape.lineWidth ?? 1) * s) }
            : {}),
        });
      }
    }

    function drawLines(g: OgeChartGroup, axis: ValueAxis | undefined): void {
      const sums: number[] = [];
      const totals: number[] = [];
      const stacked =
        g.grouping === 'stacked' || g.grouping === 'percentStacked';
      if (g.grouping === 'percentStacked')
        for (const x of g.series)
          x.values.values.forEach((v, i) => {
            totals[i] = (totals[i] ?? 0) + Math.abs(v ?? 0);
          });
      for (const series of g.series) {
        const pts: (Point | null)[] = [];
        const kept: { point: Point; at: number; value: number }[] = [];
        for (let i = 0; i < pointCount; i++) {
          let raw = series.values.values[i] ?? null;
          if (raw === null) {
            if (chart.blanksAs === 'zero' || stacked) raw = 0;
            else {
              if (chart.blanksAs === 'gap') pts.push(null);
              continue;
            }
          }
          const v =
            g.grouping === 'percentStacked'
              ? totals[i]
                ? raw / (totals[i] ?? 1)
                : 0
              : raw;
          const total = stacked ? (sums[i] ?? 0) + v : v;
          if (stacked) sums[i] = total;
          const c = catAt(i);
          const y = valueAt(axis, clampTo(axis, total));
          const point = rotated ? { x: y, y: c } : { x: c, y };
          pts.push(point);
          kept.push({ point, at: i, value: raw });
        }
        strokeSeries(g, series, pts, kept);
      }
    }

    function drawPoints(g: OgeChartGroup, axis: ValueAxis | undefined): void {
      const bubbles = g.kind === 'bubble';
      const maxSize = bubbles
        ? Math.max(
            0,
            ...g.series.flatMap((x) =>
              (x.sizes?.values ?? []).map((v) => Math.abs(v ?? 0)),
            ),
          )
        : 0;
      const maxRadius = (Math.min(plot.w, plot.h) * 0.25) / 2;
      for (const series of g.series) {
        const pts: (Point | null)[] = [];
        const kept: { point: Point; at: number; value: number }[] = [];
        series.values.values.forEach((v, i) => {
          const xValue = series.categories?.numbers?.[i] ?? i + 1;
          if (v === null || xValue === null) {
            if (chart.blanksAs === 'gap') pts.push(null);
            return;
          }
          const point = { x: xAt(xValue), y: valueAt(axis, v) };
          pts.push(point);
          kept.push({ point, at: i, value: v });
        });
        if (bubbles) {
          const color = seriesColor(g, series, palette);
          kept.forEach(({ point, at }) => {
            const size = Math.abs(series.sizes?.values[at] ?? 0);
            const r = maxSize > 0 ? Math.sqrt(size / maxSize) * maxRadius : 0;
            if (!(r > 0)) return;
            const fill = pointFill(g, series, at) ?? color;
            paths.push({
              d: markerPath('circle', point.x, point.y, 2 * r).d,
              fill,
              ...(series.shape.fillOpacity !== undefined
                ? { fillOpacity: series.shape.fillOpacity }
                : {}),
              ...(lineOf(series.shape)
                ? { stroke: lineOf(series.shape), strokeWidth: r2(s) }
                : {}),
            });
          });
          continue;
        }
        strokeSeries(g, series, pts, kept);
      }
    }

    function strokeSeries(
      g: OgeChartGroup,
      series: OgeChartSeries,
      pts: readonly (Point | null)[],
      kept: readonly { point: Point; at: number; value: number }[],
    ): void {
      const color = seriesColor(g, series, palette);
      if (joins(g, series)) {
        const width = r2((series.shape.lineWidth ?? DEFAULTS.seriesLine) * s);
        const smooth =
          series.smooth ??
          (g.kind === 'scatter' && (g.scatterStyle ?? '').startsWith('smooth'));
        paths.push({
          d: linePath(pts, smooth),
          stroke: lineOf(series.shape, color) ?? color,
          strokeWidth: width,
          ...(dashOf(series.shape.dash, width)
            ? { dash: dashOf(series.shape.dash, width) }
            : {}),
          round: true,
        });
      }
      const spec = markerSpec(g, series);
      if (spec) {
        const colors = markerColors(g, series);
        for (const { point, at } of kept) {
          const own = series.points?.get(at);
          drawMarker(
            {
              ...spec,
              ...colors,
              ...(own?.fill && own.fill !== 'none' ? { fill: own.fill } : {}),
            },
            point.x,
            point.y,
          );
        }
      }
      const labels = series.labels ?? g.labels;
      if (
        labels &&
        (labels.showValue || labels.showCategory || labels.showSeries)
      )
        for (const { point, at, value } of kept)
          dataLabels.push(() => pointLabel(labels, series, at, value, point));
    }
  }
}
