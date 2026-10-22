/**
 * Charts of a worksheet (ADR 0005, P1b): what a chart part
 * (`xl/charts/chartN.xml`) says, read into plain data — the chart groups
 * and their series with the values Excel cached, the axes, title and legend,
 * and the fills, lines and text formatting of each — with theme colours and
 * fonts already resolved. `view/chart-view.ts` draws them as Excel does; the
 * parts themselves stay opaque, so a save keeps them as Excel wrote them.
 */
import type { OgePictureAnchor } from './sheet-features';

/** Text formatting of a chart element (`a:defRPr` / `a:rPr`). */
export interface OgeChartFont {
  /** Points. */
  readonly size?: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  /** `#RRGGBB`. */
  readonly color?: string;
  /** The face, theme fonts (`+mn-lt`) resolved. */
  readonly family?: string;
}

/** Fill and outline of a chart element (`c:spPr`). Unset: the chart style's default. */
export interface OgeChartShape {
  /** `#RRGGBB`, or `none` (`a:noFill`). */
  readonly fill?: string;
  /** 0–1, when the fill is translucent. */
  readonly fillOpacity?: number;
  /** `#RRGGBB`, or `none`. */
  readonly line?: string;
  /** Outline width, px. */
  readonly lineWidth?: number;
  readonly dash?: 'solid' | 'dash' | 'dot';
}

/** A chart's text: its own, or a cell's as Excel cached it. */
export interface OgeChartText {
  readonly text: string;
  /** The cell it comes from (`Sheet1!$B$1`). */
  readonly ref?: string;
}

/** Numbers of a series (`c:val`, `c:yVal`, `c:xVal`, `c:bubbleSize`), as Excel cached them. */
export interface OgeChartNumbers {
  readonly ref?: string;
  /** One per point; `null` for a blank. */
  readonly values: readonly (number | null)[];
  /** The source cells' number format (`c:formatCode`). */
  readonly format?: string;
}

/** Category labels of a series (`c:cat`), as Excel cached them. */
export interface OgeChartCategories {
  readonly ref?: string;
  readonly labels: readonly string[];
  /** Numeric or date categories: the numbers, with their format. */
  readonly numbers?: readonly (number | null)[];
  readonly format?: string;
}

/** Data labels (`c:dLbls`). */
export interface OgeChartDataLabels {
  readonly showValue: boolean;
  readonly showCategory: boolean;
  readonly showSeries: boolean;
  readonly showPercent: boolean;
  readonly position?: string;
  /** Number format of the values (`c:numFmt`, not linked to the source). */
  readonly format?: string;
  readonly font?: OgeChartFont;
}

/** A series' marker (`c:marker`). */
export interface OgeChartMarker {
  /** `none`, `auto`, `circle`, `square`, `diamond`, `triangle`, `x`, `star`, `dash`, `dot`, `plus`. */
  readonly symbol: string;
  /** Points, 2–72. */
  readonly size?: number;
  readonly shape?: OgeChartShape;
}

/** One series of a chart group (`c:ser`). */
export interface OgeChartSeries {
  /** `c:idx`: the series' colour slot when it states none. */
  readonly index: number;
  readonly order: number;
  readonly name?: OgeChartText;
  /** Categories (`c:cat`) or, in a scatter or bubble chart, the x values (`c:xVal`). */
  readonly categories?: OgeChartCategories;
  /** Values (`c:val`, `c:yVal`). */
  readonly values: OgeChartNumbers;
  /** Bubble sizes (`c:bubbleSize`). */
  readonly sizes?: OgeChartNumbers;
  readonly shape: OgeChartShape;
  readonly marker?: OgeChartMarker;
  readonly smooth?: boolean;
  /** Points formatted on their own (`c:dPt`), by point index. */
  readonly points?: ReadonlyMap<number, OgeChartShape>;
  readonly labels?: OgeChartDataLabels;
}

/** Chart kinds of a plot area's chart groups (3-D groups read as their 2-D kind). */
export type OgeChartKind =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'doughnut'
  | 'scatter'
  | 'bubble'
  | 'radar'
  | 'stock'
  | 'surface'
  | 'ofPie';

/** One chart group of a plot area (`c:barChart`, `c:lineChart`, …). */
export interface OgeChartGroup {
  readonly kind: OgeChartKind;
  /** Bars run up (`column`) or sideways (`bar`). */
  readonly direction?: 'column' | 'bar';
  readonly grouping: 'standard' | 'clustered' | 'stacked' | 'percentStacked';
  /** Each point its own colour (a pie's default). */
  readonly varyColors: boolean;
  /** Bar gap and overlap, percent. */
  readonly gapWidth?: number;
  readonly overlap?: number;
  /** Doughnut hole, percent of the diameter. */
  readonly holeSize?: number;
  /** Degrees clockwise from the top. */
  readonly firstSliceAngle?: number;
  /** Scatter: `marker`, `lineMarker`, `line`, `smooth`, `smoothMarker`. */
  readonly scatterStyle?: string;
  /** A line chart's markers on by default (`c:lineChart/c:marker`). */
  readonly markers?: boolean;
  /** The 3-D group it was (`bar3DChart`, …), drawn flat. */
  readonly threeD?: boolean;
  /** The axes it plots on (`c:axId`). */
  readonly axes: readonly number[];
  readonly series: readonly OgeChartSeries[];
  readonly labels?: OgeChartDataLabels;
}

/**
 * Where the file puts a chart element instead of Excel's automatic layout
 * (`c:layout/c:manualLayout`), as fractions of the chart's size: `edge`
 * positions from the chart's left / top edge, `factor` offsets from the
 * automatic position; `w` / `h` are the element's size.
 */
export interface OgeChartManualLayout {
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
  readonly xMode: 'edge' | 'factor';
  readonly yMode: 'edge' | 'factor';
  /** A plot area's box is its inner one (the plot) or the outer one (with the tick labels). */
  readonly target: 'inner' | 'outer';
}

/** A chart's title (`c:title`). */
export interface OgeChartTitle {
  /** Unset: Excel's automatic title (the only series' name). */
  readonly text?: OgeChartText;
  readonly font: OgeChartFont;
  readonly overlay: boolean;
  readonly layout?: OgeChartManualLayout;
}

/** An axis (`c:catAx`, `c:valAx`, `c:dateAx`, `c:serAx`). */
export interface OgeChartAxis {
  readonly id: number;
  readonly kind: 'category' | 'value' | 'date' | 'series';
  readonly position: 'b' | 'l' | 'r' | 't';
  /** Hidden (`c:delete`): it still scales its series. */
  readonly deleted: boolean;
  readonly crossAxis?: number;
  readonly crosses?: 'autoZero' | 'min' | 'max';
  readonly crossesAt?: number;
  readonly title?: OgeChartTitle;
  readonly format?: { readonly code: string; readonly sourceLinked: boolean };
  /** Fixed scale; unset parts are automatic. */
  readonly min?: number;
  readonly max?: number;
  readonly majorUnit?: number;
  readonly minorUnit?: number;
  readonly logBase?: number;
  /** `maxMin` orientation. */
  readonly reversed: boolean;
  readonly majorGridlines?: OgeChartShape;
  readonly minorGridlines?: OgeChartShape;
  /** The axis line and fill (`c:spPr`). */
  readonly shape: OgeChartShape;
  readonly labelPosition: 'nextTo' | 'low' | 'high' | 'none';
  readonly majorTicks: 'none' | 'in' | 'out' | 'cross';
  readonly font: OgeChartFont;
  /** A value axis: categories sit between its crossings (`between`) or on them (`midCat`). */
  readonly crossBetween?: 'between' | 'midCat';
}

/** A chart's legend (`c:legend`). */
export interface OgeChartLegend {
  readonly position: 'r' | 'l' | 't' | 'b' | 'tr';
  readonly overlay: boolean;
  readonly font: OgeChartFont;
  /** Entries deleted from it (`c:legendEntry/c:delete`), by index. */
  readonly hidden: readonly number[];
  readonly layout?: OgeChartManualLayout;
}

/** A chart part. */
export interface OgeChartModel {
  /** The part (`xl/charts/chart1.xml`). */
  readonly part: string;
  /** Unset: no title; see `OgeChartTitle.text` for the automatic one. */
  readonly title?: OgeChartTitle;
  readonly groups: readonly OgeChartGroup[];
  readonly axes: readonly OgeChartAxis[];
  readonly legend?: OgeChartLegend;
  /** Only the visible cells' data is plotted (`c:plotVisOnly`). */
  readonly plotVisibleOnly: boolean;
  readonly blanksAs: 'gap' | 'zero' | 'span';
  /** The chart area (`c:chartSpace/c:spPr`) and the plot area. */
  readonly area: OgeChartShape;
  readonly plotArea: OgeChartShape;
  readonly plotLayout?: OgeChartManualLayout;
  /** The chart's default text (`c:chartSpace/c:txPr`). */
  readonly font: OgeChartFont;
  readonly roundedCorners: boolean;
  /** The chart style (`c:style`, 1–48; Excel's default 2) — the defaults of what states no formatting. */
  readonly style: number;
}

/** A chart floating over a sheet: a graphic frame of the sheet's drawing. */
export interface OgeSheetChart {
  readonly anchor: OgePictureAnchor;
  readonly chart: OgeChartModel;
  readonly name?: string;
  /** Alternative text (`descr`). */
  readonly description?: string;
  readonly hidden?: boolean;
}
