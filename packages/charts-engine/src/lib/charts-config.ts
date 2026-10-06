/**
 * The charts' message catalog and configuration shape — single-sourced here so
 * the Angular `provideOgeChartsConfig()` and the React
 * `<OgeChartsConfigProvider>` resolve exactly the same defaults (ADR 0003).
 */

/** Aria strings; `{token}` placeholders formatted at render. */
export interface OgeChartsAriaMessages {
  /** SVG root label; `{title}`, `{count}` (series). */
  readonly chartLabel: string;
  /** Pie SVG root label; `{title}`, `{count}` (slices). */
  readonly pieLabel: string;
  /** Screen-reader data table caption. */
  readonly tableCaption: string;
  /** First column header of the sr table (arguments). */
  readonly argumentHeader: string;
  /** Focusable plot region hint for keyboard users. */
  readonly plotHint: string;
  /** Legend list label. */
  readonly legendLabel: string;
  /** Range-selector start handle label. */
  readonly rangeStart: string;
  /** Range-selector end handle label. */
  readonly rangeEnd: string;
  /** Range-selector window label. */
  readonly rangeWindow: string;
}

/** Live-region announcement templates. */
export interface OgeChartsAnnouncementMessages {
  /** Crosshair moved; `{series}`, `{argument}`, `{value}`. */
  readonly point: string;
  readonly seriesHidden: string;
  readonly seriesShown: string;
  readonly zoomed: string;
  readonly zoomReset: string;
  /** Point selected; `{series}`, `{argument}`. */
  readonly selected: string;
}

/**
 * The words of value texts (tooltips, announcements, the screen-reader
 * table) of the analytic series, plus the default indicator names.
 */
export interface OgeChartsValueMessages {
  /** boxPlot parts. */
  readonly low: string;
  readonly q1: string;
  readonly median: string;
  readonly q3: string;
  readonly high: string;
  /** boxPlot outlier count; `{count}`. */
  readonly outliers: string;
  /** waterfall point kinds. */
  readonly increase: string;
  readonly decrease: string;
  readonly intermediate: string;
  readonly total: string;
  /** pareto running share; `{value}`. */
  readonly cumulative: string;
  /** Bollinger / MACD parts. */
  readonly upper: string;
  readonly lower: string;
  readonly signal: string;
  readonly histogram: string;
  /** Trendline tooltip suffix; `{value}`, `{r2}`. */
  readonly trend: string;
  /** Histogram bin argument; `{start}`, `{end}`. */
  readonly bin: string;
  /**
   * Default indicator series names; `{period}`, `{stdDev}`, `{fast}`,
   * `{slow}`, `{signal}`.
   */
  readonly sma: string;
  readonly ema: string;
  readonly bollinger: string;
  readonly macd: string;
  readonly rsi: string;
}

/**
 * Range-selector period buttons: the visible short text and the
 * accessible name of each built-in period, plus the group label.
 */
export interface OgeChartsPeriodMessages {
  /** `role="group"` label of the period buttons. */
  readonly groupLabel: string;
  readonly month1: string;
  readonly month3: string;
  readonly month6: string;
  readonly yearToDate: string;
  readonly year1: string;
  readonly all: string;
  readonly month1Label: string;
  readonly month3Label: string;
  readonly month6Label: string;
  readonly yearToDateLabel: string;
  readonly year1Label: string;
  readonly allLabel: string;
}

/**
 * The strings of the gauges, the sparkline, the bullet chart and the
 * non-cartesian charts (funnel, heatmap, treemap, Sankey, sunburst, map).
 * Count-bearing labels are ICU plurals rendered by `ogeFormatMessage`.
 */
export interface OgeChartsVisualMessages {
  /** Circular / linear gauge `role="meter"` label; `{title}`. */
  readonly gaugeLabel: string;
  /** Gauge `aria-valuetext` when the value sits in a labelled range; `{value}`, `{range}`. */
  readonly gaugeValueInRange: string;
  /** Bullet chart label; `{title}`, `{value}`, `{target}`. */
  readonly bulletLabel: string;
  /** Sparkline label; `{title}`, `{count}` (plural), `{first}`, `{last}`, `{min}`, `{max}`. */
  readonly sparklineLabel: string;
  /** Funnel label; `{title}`, `{count}` (plural). */
  readonly funnelLabel: string;
  /** Pyramid label; `{title}`, `{count}` (plural). */
  readonly pyramidLabel: string;
  /** Heatmap label; `{title}`, `{rows}`, `{columns}` (plurals). */
  readonly heatmapLabel: string;
  /** Treemap label; `{title}`, `{count}` (plural). */
  readonly treemapLabel: string;
  /** Sankey label; `{title}`, `{nodes}`, `{links}` (plurals). */
  readonly sankeyLabel: string;
  /** Sunburst label; `{title}`, `{count}` (plural). */
  readonly sunburstLabel: string;
  /** Map label; `{title}`, `{count}` (plural). */
  readonly mapLabel: string;
  /** Keyboard hint of the drill-down charts (treemap, sunburst). */
  readonly drillHint: string;
  /** Keyboard hint of the map. */
  readonly mapHint: string;
  /** `<nav>` label of the drill-down breadcrumb. */
  readonly breadcrumbLabel: string;
  /** Label of the colour-scale legend (heatmap, map). */
  readonly colorScaleLabel: string;
  /** Map zoom buttons. */
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly resetZoom: string;
  /** Screen-reader table headers. */
  readonly valueHeader: string;
  readonly shareHeader: string;
  readonly sourceHeader: string;
  readonly targetHeader: string;
  /** Bullet target text; `{value}`. */
  readonly target: string;
  /** A value range; `{start}`, `{end}`. */
  readonly range: string;
  /** Funnel conversion vs. the first stage; `{percent}`. */
  readonly percentOfFirst: string;
  /** Funnel conversion vs. the previous stage; `{percent}`. */
  readonly percentOfPrevious: string;
  /** Sankey node totals; `{value}`. */
  readonly inflow: string;
  readonly outflow: string;
  /** Sankey link; `{source}`, `{target}`. */
  readonly flow: string;
  /** Root crumb of the drill-down breadcrumb. */
  readonly root: string;
  /** A region / cell without a value. */
  readonly noValue: string;
  /** Live region: an item became active; `{name}`, `{value}`. */
  readonly item: string;
  /** Live region: a heatmap cell became active; `{row}`, `{column}`, `{value}`. */
  readonly cell: string;
  /** Live region: drilled into a group; `{name}`. */
  readonly drilledDown: string;
  /** Live region: drilled back up; `{name}`. */
  readonly drilledUp: string;
}

/** Every user-facing string of the charts (house i18n rule). */
export interface OgeChartsMessages {
  readonly aria: OgeChartsAriaMessages;
  readonly announcements: OgeChartsAnnouncementMessages;
  readonly values: OgeChartsValueMessages;
  readonly periods: OgeChartsPeriodMessages;
  readonly visuals: OgeChartsVisualMessages;
  readonly noData: string;
}

export const OGE_DEFAULT_CHARTS_MESSAGES: OgeChartsMessages = {
  aria: {
    chartLabel: '{title} chart with {count} series',
    pieLabel: '{title} pie chart with {count} slices',
    tableCaption: 'Chart data',
    argumentHeader: 'Argument',
    plotHint: 'Use arrow keys to inspect points, Enter to select',
    legendLabel: 'Chart legend',
    rangeStart: 'Range start',
    rangeEnd: 'Range end',
    rangeWindow: 'Selected range',
  },
  announcements: {
    point: '{series}, {argument}: {value}',
    seriesHidden: '{series} hidden',
    seriesShown: '{series} shown',
    zoomed: 'Zoomed',
    zoomReset: 'Zoom reset',
    selected: '{series}, {argument} selected',
  },
  values: {
    low: 'Min',
    q1: 'Q1',
    median: 'Median',
    q3: 'Q3',
    high: 'Max',
    outliers: '{count} outliers',
    increase: 'increase',
    decrease: 'decrease',
    intermediate: 'subtotal',
    total: 'total',
    cumulative: 'cumulative {value}',
    upper: 'upper',
    lower: 'lower',
    signal: 'signal',
    histogram: 'histogram',
    trend: 'trend {value}, R² {r2}',
    bin: '{start} – {end}',
    sma: 'SMA ({period})',
    ema: 'EMA ({period})',
    bollinger: 'Bollinger ({period}, {stdDev})',
    macd: 'MACD ({fast}, {slow}, {signal})',
    rsi: 'RSI ({period})',
  },
  periods: {
    groupLabel: 'Zoom period',
    month1: '1M',
    month3: '3M',
    month6: '6M',
    yearToDate: 'YTD',
    year1: '1Y',
    all: 'All',
    month1Label: '1 month',
    month3Label: '3 months',
    month6Label: '6 months',
    yearToDateLabel: 'Year to date',
    year1Label: '1 year',
    allLabel: 'All data',
  },
  visuals: {
    gaugeLabel: '{title} gauge',
    gaugeValueInRange: '{value}, {range}',
    bulletLabel: '{title} bullet chart: value {value}, target {target}',
    sparklineLabel:
      '{title} sparkline, {count, plural, one {# point} other {# points}}: first {first}, last {last}, low {min}, high {max}',
    funnelLabel:
      '{title} funnel chart, {count, plural, one {# stage} other {# stages}}',
    pyramidLabel:
      '{title} pyramid chart, {count, plural, one {# level} other {# levels}}',
    heatmapLabel:
      '{title} heatmap, {rows, plural, one {# row} other {# rows}} by {columns, plural, one {# column} other {# columns}}',
    treemapLabel:
      '{title} treemap, {count, plural, one {# tile} other {# tiles}}',
    sankeyLabel:
      '{title} Sankey diagram, {nodes, plural, one {# node} other {# nodes}}, {links, plural, one {# link} other {# links}}',
    sunburstLabel:
      '{title} sunburst chart, {count, plural, one {# segment} other {# segments}}',
    mapLabel: '{title} map, {count, plural, one {# region} other {# regions}}',
    drillHint:
      'Arrow keys move between items, Enter opens a group, Escape goes up a level',
    mapHint:
      'Arrow keys move between regions, plus and minus zoom, Shift with an arrow key pans',
    breadcrumbLabel: 'Drill-down path',
    colorScaleLabel: 'Colour scale',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset zoom',
    valueHeader: 'Value',
    shareHeader: 'Share',
    sourceHeader: 'Source',
    targetHeader: 'Target',
    target: 'target {value}',
    range: '{start} – {end}',
    percentOfFirst: '{percent} of first stage',
    percentOfPrevious: '{percent} of previous stage',
    inflow: 'in {value}',
    outflow: 'out {value}',
    flow: '{source} → {target}',
    root: 'All',
    noValue: 'no data',
    item: '{name}: {value}',
    cell: '{row}, {column}: {value}',
    drilledDown: '{name} opened',
    drilledUp: 'Back to {name}',
  },
  noData: 'No data',
};

/** Configuration of every chart in scope (DI in Angular, context in React). */
export interface OgeChartsConfig {
  readonly messages: OgeChartsMessages;
  /** BCP 47 locale for every `Intl` format; unset = the browser locale. */
  readonly locale?: string;
  /** Rows of the screen-reader data table. */
  readonly a11yTableLimit?: number;
  /** Marker circles render only up to this many points per series. */
  readonly markerThreshold?: number;
}

export const OGE_DEFAULT_CHARTS_CONFIG: OgeChartsConfig = {
  messages: OGE_DEFAULT_CHARTS_MESSAGES,
  a11yTableLimit: 50,
  markerThreshold: 200,
};

/** What a provider accepts: every key optional, `messages` per block. */
export type OgeChartsConfigInput = Partial<
  Omit<OgeChartsConfig, 'messages'>
> & {
  messages?: Partial<OgeChartsMessages>;
};

/**
 * Merges a config input over `base` (the defaults, or an outer provider's
 * resolved config) — shallow per top-level key; a partial `messages` replaces
 * whole nested blocks.
 */
export function resolveOgeChartsConfig(
  config: OgeChartsConfigInput | undefined,
  base: OgeChartsConfig = OGE_DEFAULT_CHARTS_CONFIG,
): OgeChartsConfig {
  const { messages, ...rest } = config ?? {};
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}

/**
 * A component's effective messages: its per-instance override over the
 * configured catalog, merged one level deeper (`aria`, `announcements`,
 * `values`, `periods` and `visuals` key by key).
 */
export function mergeOgeChartsMessages(
  configured: OgeChartsMessages,
  override: Partial<OgeChartsMessages> | undefined,
): OgeChartsMessages {
  const local = override ?? {};
  return {
    ...configured,
    ...local,
    aria: { ...configured.aria, ...local.aria },
    announcements: { ...configured.announcements, ...local.announcements },
    values: { ...configured.values, ...local.values },
    periods: { ...configured.periods, ...local.periods },
    visuals: { ...configured.visuals, ...local.visuals },
  };
}

/** Fills `{token}` placeholders (first occurrence each, like the templates). */
export function formatOgeChartMessage(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  let text = template;
  for (const [token, value] of Object.entries(tokens)) {
    text = text.replace(`{${token}}`, value);
  }
  return text;
}
