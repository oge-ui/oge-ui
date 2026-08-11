import { demoSource } from '../../shared/demo-source';

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- One element, a working chart: category axis auto-detected
     from the string arguments, nice-tick value axis, interactive legend
     (click hides a series), hover tooltip and crosshair. Everything is
     drawn as dependency-free SVG — no D3, no canvas library. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  title="Quarterly revenue"
  style="height: 380px"
/>`,
  body: `protected readonly data = [
  { quarter: 'Q1', product: 120, services: 60 },
  { quarter: 'Q2', product: 150, services: 74 },
  { quarter: 'Q3', product: 138, services: 90 },
  { quarter: 'Q4', product: 190, services: 105 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'quarter', valueField: 'product', name: 'Product' },
  { type: 'line', argumentField: 'quarter', valueField: 'services', name: 'Services' },
];`,
});

export const SERIES_TYPES_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- Eleven series types share one kernel. splines are
     Catmull-Rom curves, areas fill to the zero line, scatter renders
     markers only; null values become gaps rather than fake zeros.
     commonSeries sets shared defaults (dx commonSeriesSettings parity). -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [commonSeries]="{ argumentField: 'day' }"
  style="height: 380px"
/>`,
  body: `protected readonly data = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  smooth: Math.sin(i / 2) * 30 + 60,
  band: Math.sin(i / 2) * 20 + 40,
  dots: Math.cos(i / 1.5) * 25 + 55,
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'splineArea', valueField: 'band', name: 'Range', opacity: 0.8 },
  { type: 'spline', valueField: 'smooth', name: 'Trend', width: 3 },
  { type: 'scatter', valueField: 'dots', name: 'Samples' },
];`,
});

export const TIME_AXIS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput', 'OgeChartStripLine'] },
  template: `<!-- Date arguments auto-detect the time axis: ticks are
     calendar-true (real month boundaries, DST-safe) and labels format
     through Intl in your locale. stripLines mark a deadline (line) or a
     window (band) on the argument axis. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [stripLines]="stripLines"
  [argumentAxis]="{ grid: true }"
  style="height: 380px"
/>`,
  body: `protected readonly data = Array.from({ length: 120 }, (_, i) => ({
  date: new Date(2026, 0, 1 + i),
  visitors: 400 + Math.sin(i / 9) * 150 + (i % 17) * 8,
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'date', valueField: 'visitors', name: 'Visitors' },
];

protected readonly stripLines: OgeChartStripLine[] = [
  { start: new Date(2026, 2, 1), end: new Date(2026, 2, 15), label: 'Campaign' },
  { start: new Date(2026, 3, 10), label: 'Release', color: '#dc2626' },
];`,
});

export const STACKS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- stackedBar accumulates per argument (negatives stack
     downward separately); fullStackedBar normalizes each argument to
     100%. The stack option splits series into independent stack groups. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [commonSeries]="{ argumentField: 'month' }"
  [valueAxis]="{ abbreviate: false }"
  style="height: 380px"
/>`,
  body: `protected readonly data = [
  { month: 'Jan', on: 40, off: 24, refunds: -6 },
  { month: 'Feb', on: 52, off: 28, refunds: -4 },
  { month: 'Mar', on: 47, off: 35, refunds: -9 },
  { month: 'Apr', on: 61, off: 31, refunds: -5 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'stackedBar', valueField: 'on', name: 'Online' },
  { type: 'stackedBar', valueField: 'off', name: 'Retail' },
  { type: 'stackedBar', valueField: 'refunds', name: 'Refunds' },
];`,
});

export const ZOOM_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartRange', 'OgeChartSeriesInput'] },
  template: `<!-- 5000 points stay fluid: every series is a single SVG path,
     hit-testing is a binary search and pointer work is rAF-coalesced.
     Wheel zooms around the cursor, dragging selects a range, Shift+drag
     pans, Escape resets; visualRange is two-way. shared tooltips list
     every series at the hovered argument. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [(visualRange)]="range"
  zoomEnabled="both"
  [panEnabled]="true"
  [tooltip]="{ shared: true }"
  [crosshair]="{ horizontal: true }"
  style="height: 380px"
/>`,
  body: `protected readonly range = signal<OgeChartRange | null>(null);

protected readonly data = Array.from({ length: 5000 }, (_, i) => ({
  t: new Date(2026, 0, 1, 0, i * 15),
  cpu: 40 + Math.sin(i / 60) * 25 + (i % 13),
  memory: 55 + Math.cos(i / 90) * 18 + (i % 7),
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'line', argumentField: 't', valueField: 'cpu', name: 'CPU' },
  { type: 'line', argumentField: 't', valueField: 'memory', name: 'Memory' },
];`,
});

export const FINANCIAL_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- Candlesticks read OHLC fields; a second value axis
     (position: 'end') carries the volume bars so the two scales stay
     independent. Rising/falling bodies color via the theme tokens. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [valueAxis]="[
    { title: 'Price' },
    { position: 'end', title: 'Volume' },
  ]"
  style="height: 380px"
/>`,
  body: `protected readonly data = Array.from({ length: 30 }, (_, i) => {
  const open = 100 + Math.sin(i / 4) * 12 + (i % 5);
  const close = open + Math.sin(i / 2) * 6 - 2;
  return {
    day: new Date(2026, 6, 1 + i),
    o: open,
    h: Math.max(open, close) + 4,
    l: Math.min(open, close) - 4,
    c: close,
    vol: 800 + (i % 9) * 120,
  };
});

protected readonly series: OgeChartSeriesInput[] = [
  {
    type: 'candlestick',
    argumentField: 'day',
    openField: 'o',
    highField: 'h',
    lowField: 'l',
    closeField: 'c',
    name: 'OGE',
  },
  {
    type: 'bar',
    argumentField: 'day',
    valueField: 'vol',
    name: 'Volume',
    axis: 1,
    opacity: 0.4,
  },
];`,
});

export const PIE_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgePieChart'] },
  template: `<!-- Pie and doughnut share the kernel: outside labels with
     connector lines, small-value grouping folds the tail into an
     "Others" slice, clicking (or the legend) selects and explodes. -->
<oge-pie-chart
  [dataSource]="data"
  argumentField="browser"
  valueField="share"
  type="doughnut"
  [innerRadius]="0.55"
  [smallValuesGrouping]="{ mode: 'topN', topCount: 4 }"
  title="Browser share"
  style="height: 360px"
/>`,
  body: `protected readonly data = [
  { browser: 'Chrome', share: 62 },
  { browser: 'Safari', share: 20 },
  { browser: 'Edge', share: 6 },
  { browser: 'Firefox', share: 5 },
  { browser: 'Samsung', share: 3 },
  { browser: 'Opera', share: 2 },
  { browser: 'Other', share: 2 },
];`,
});

export const EVENTS_EXPORT_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  helpers: { '@oge-ui/charts': ['provideOgeChartsConfig'] },
  types: {
    '@oge-ui/charts': [
      'OgeChartPointEvent',
      'OgeChartPointRef',
      'OgeChartSeriesInput',
    ],
  },
  template: `<!-- selectionMode="point" rings clicked points (Ctrl adds);
     legendClick is cancelable. Every user-facing string, aria included,
     lives in OgeChartsMessages (provideOgeChartsConfig, locale). The
     dependency-free export entry serializes the SVG with inlined styles
     — PNG via canvas rasterization, or the standalone .svg itself. -->
<div class="mb-2 flex gap-2">
  <button type="button" (click)="exportPng(chart)">Export PNG</button>
  <button type="button" (click)="exportSvg(chart)">Export SVG</button>
</div>
<oge-chart
  #chart
  [dataSource]="data"
  [series]="series"
  selectionMode="point"
  [(selectedPoints)]="selected"
  locale="de"
  (pointClick)="lastPoint = $event"
  style="height: 340px"
/>`,
  body: `// App-wide (main.ts / route providers):
// provideOgeChartsConfig({ locale: 'de', a11yTableLimit: 100 })

protected readonly selected = signal<readonly OgeChartPointRef[]>([]);
protected lastPoint: OgeChartPointEvent<Record<string, unknown>> | null =
  null;

protected readonly data = [
  { month: 'Jan', value: 12 },
  { month: 'Feb', value: 31 },
  { month: 'Mar', value: 24 },
  { month: 'Apr', value: 42 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'month', valueField: 'value', name: 'Value' },
];

/** The exporter loads lazily and needs no third-party library at all. */
protected async exportPng<T extends object>(
  chart: OgeChart<T>,
): Promise<void> {
  const { exportChartToPng } = await import('@oge-ui/charts/export-image');
  await exportChartToPng(chart, { filename: 'chart.png' });
}

protected async exportSvg<T extends object>(
  chart: OgeChart<T>,
): Promise<void> {
  const { exportChartToSvg } = await import('@oge-ui/charts/export-image');
  exportChartToSvg(chart, { filename: 'chart.svg' });
}`,
});

export const POLAR_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgePolarChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- Radar/polar on the same kernel: categories slot around the
     circle, values map radially with nice ticks. line/area draw closed
     radar loops (a null value breaks the loop into a gap), scatter renders
     markers, bar renders sectors. spider swaps circular rings for
     polygons. -->
<oge-polar-chart
  [dataSource]="data"
  [series]="series"
  [commonSeries]="{ argumentField: 'skill' }"
  [spider]="true"
  title="Team skills"
  style="height: 400px"
/>`,
  body: `protected readonly data = [
  { skill: 'TypeScript', ada: 9, grace: 7 },
  { skill: 'CSS', ada: 6, grace: 8 },
  { skill: 'SQL', ada: 7, grace: 5 },
  { skill: 'Rust', ada: 4, grace: 6 },
  { skill: 'Go', ada: 5, grace: 9 },
  { skill: 'Testing', ada: 8, grace: 7 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'area', valueField: 'ada', name: 'Ada' },
  { type: 'line', valueField: 'grace', name: 'Grace', width: 2.5 },
];`,
});

export const ANNOTATIONS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartAnnotation', 'OgeChartSeriesInput'] },
  template: `<!-- Annotations anchor on the plot: 'point' draws a marker dot
     with a connector into a label box at (argument, value); 'text' places
     the label alone (top of the plot without a value).
     *ogeChartAnnotationTemplate swaps in arbitrary HTML. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [annotations]="annotations"
  style="height: 380px"
/>`,
  body: `protected readonly data = Array.from({ length: 40 }, (_, i) => ({
  day: i + 1,
  price: 80 + Math.sin(i / 5) * 20 + i / 2,
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'spline', argumentField: 'day', valueField: 'price', name: 'Price' },
];

protected readonly annotations: OgeChartAnnotation[] = [
  { type: 'point', text: 'All-time high', argument: 34, value: 116.9 },
  { type: 'point', text: 'Correction', argument: 22, value: 76.1, offsetY: 24 },
  { type: 'text', text: 'Q1 guidance', argument: 8 },
];`,
});

export const RANGE_SELECTOR_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart', 'OgeRangeSelector'] },
  types: { '@oge-ui/charts': ['OgeChartRange', 'OgeChartSeriesInput'] },
  template: `<!-- The overview strip: a mini background chart with a draggable
     window and two WAI-ARIA slider handles (arrows adjust, Home/End jump,
     Escape mid-drag restores). Bind the same range to a chart's
     [(visualRange)] and the two stay in lockstep. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [(visualRange)]="range"
  zoomEnabled="both"
  style="height: 300px"
/>
<oge-range-selector
  [dataSource]="data"
  [series]="miniSeries"
  [(value)]="range"
  style="display: block; margin-top: 8px"
/>`,
  body: `protected readonly range = signal<OgeChartRange | null>(null);

protected readonly data = Array.from({ length: 365 }, (_, i) => ({
  date: new Date(2026, 0, 1 + i),
  sales: 200 + Math.sin(i / 20) * 80 + (i % 11) * 6,
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'line', argumentField: 'date', valueField: 'sales', name: 'Sales' },
];

protected readonly miniSeries: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'date', valueField: 'sales', name: 'Sales' },
];`,
});
