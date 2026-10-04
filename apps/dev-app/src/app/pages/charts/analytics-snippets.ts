import { demoSource } from '../../shared/demo-source';

// Demo sources of the charts "depth" sections (data labels, analytics, the
// analytic series types and export/print) — rendered by `analytics-demos.ts`
// on the charts overview. Pure data: the llms generator and the compile gate
// load this module in plain Node.

export const DATA_LABELS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart', 'OgePieChart', 'OgePolarChart'] },
  types: {
    '@oge-ui/charts': [
      'OgeChartLabelOptions',
      'OgeChartPointInfo',
      'OgeChartSeriesInput',
      'OgePieSeriesInput',
    ],
  },
  before: `interface SalesRow {
  region: string;
  sales: number;
  target: number;
}

interface ChannelRow {
  channel: string;
  y2025: number;
  y2026: number;
}`,
  template: `<!-- Data labels on any series: position (outside / inside / center /
     insideEnd / insideBase), format, showForZero and overlap resolution
     (hide / shift / none). customizePoint colours single points — and its
     description is spoken in the tooltip and the screen-reader table, so
     colour is never the only channel. -->
<oge-chart
  [dataSource]="sales"
  [series]="salesSeries"
  title="Sales vs target (k€)"
  style="height: 320px"
/>
<div class="mt-4 grid gap-4 md:grid-cols-2">
  <!-- Nested doughnut: one ring per series entry; slices of one argument
       share a colour and a legend button across rings. -->
  <oge-pie-chart
    [dataSource]="channels"
    argumentField="channel"
    type="doughnut"
    [innerRadius]="0.35"
    [series]="rings"
    [label]="percentLabels"
    title="Revenue by channel, 2025 → 2026"
    style="height: 320px"
  />
  <!-- Radial bars: one ring per category, the arc is the value. -->
  <oge-polar-chart
    [dataSource]="goals"
    [series]="goalSeries"
    [valueAxis]="{ max: 100 }"
    title="Sprint goals done"
    style="height: 320px"
  />
</div>`,
  body: `protected readonly sales: SalesRow[] = [
  { region: 'North', sales: 182, target: 160 },
  { region: 'South', sales: 96, target: 140 },
  { region: 'East', sales: 151, target: 150 },
  { region: 'West', sales: 128, target: 130 },
  { region: 'Central', sales: 204, target: 170 },
];

protected readonly salesSeries: OgeChartSeriesInput<SalesRow>[] = [
  {
    type: 'bar',
    argumentField: 'region',
    valueField: 'sales',
    name: 'Sales',
    label: { visible: true, position: 'insideEnd' },
    customizePoint: (info: OgeChartPointInfo<SalesRow>) =>
      info.source !== undefined && info.source.sales < info.source.target
        ? { color: '#ef4444', description: 'below target' }
        : undefined,
  },
];

protected readonly channels: ChannelRow[] = [
  { channel: 'Online', y2025: 42, y2026: 55 },
  { channel: 'Retail', y2025: 38, y2026: 30 },
  { channel: 'Partners', y2025: 20, y2026: 15 },
];

protected readonly rings: OgePieSeriesInput<ChannelRow>[] = [
  { name: '2025', valueField: 'y2025' },
  { name: '2026', valueField: 'y2026' },
];

protected readonly percentLabels: OgeChartLabelOptions<ChannelRow> = {
  visible: true,
  position: 'inside',
  format: (info) => \`\${Math.round((info.percent ?? 0) * 100)}%\`,
};

protected readonly goals = [
  { team: 'Design', done: 72 },
  { team: 'Web', done: 88 },
  { team: 'Mobile', done: 54 },
  { team: 'QA', done: 93 },
];

protected readonly goalSeries: OgeChartSeriesInput[] = [
  {
    type: 'radialBar',
    argumentField: 'team',
    valueField: 'done',
    name: 'Done',
    label: { visible: true, format: (info) => \`\${info.value}%\` },
  },
];`,
});

export const TRENDLINES_INDICATORS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: {
    '@oge-ui/charts': [
      'OgeChartAxisOptions',
      'OgeChartPane',
      'OgeChartSeriesInput',
    ],
  },
  template: `<!-- Technical indicators are series: type 'indicator' computes SMA,
     EMA, Bollinger Bands, MACD or RSI from the close prices (the same pure
     ogeSma/ogeEma/ogeBollingerBands/ogeMacd/ogeRsi you can import). The
     RSI draws in its own pane under the price, sharing the argument axis. -->
<oge-chart
  [dataSource]="prices"
  [series]="priceSeries"
  [panes]="panes"
  [valueAxis]="paneAxes"
  zoomEnabled="wheel"
  [tooltip]="{ shared: true }"
  style="height: 440px"
/>
<!-- Trendlines: linear, exponential, logarithmic, polynomial or moving
     average over any series; showR2 adds the fit to the tooltip. -->
<oge-chart
  [dataSource]="campaigns"
  [series]="campaignSeries"
  [argumentAxis]="{ title: 'Ad spend (k€)' }"
  [valueAxis]="{ title: 'Revenue (k€)' }"
  style="height: 300px"
/>`,
  body: `protected readonly panes: OgeChartPane[] = [
  { name: 'price', height: 3 },
  { name: 'rsi', height: 1 },
];

protected readonly paneAxes: OgeChartAxisOptions[] = [
  { pane: 'price', title: 'Price' },
  { pane: 'rsi', title: 'RSI', min: 0, max: 100 },
];

protected readonly prices = Array.from({ length: 60 }, (_, i) => {
  const base = 100 + Math.sin(i / 6) * 8 + i * 0.4;
  return {
    day: new Date(2026, 0, 1 + i),
    open: base - 1,
    high: base + 2.5,
    low: base - 3,
    close: base + Math.sin(i) * 1.5,
  };
});

protected readonly priceSeries: OgeChartSeriesInput[] = [
  {
    type: 'ohlc',
    argumentField: 'day',
    openField: 'open',
    highField: 'high',
    lowField: 'low',
    closeField: 'close',
    name: 'OGE',
  },
  {
    type: 'indicator',
    argumentField: 'day',
    closeField: 'close',
    indicator: { type: 'bollinger', period: 20, stdDev: 2 },
  },
  {
    type: 'indicator',
    argumentField: 'day',
    closeField: 'close',
    indicator: { type: 'ema', period: 10 },
    dashStyle: 'dash',
  },
  {
    type: 'indicator',
    argumentField: 'day',
    closeField: 'close',
    indicator: { type: 'rsi', period: 14 },
    pane: 'rsi',
  },
];

protected readonly campaigns = Array.from({ length: 24 }, (_, i) => ({
  spend: 5 + i * 2,
  revenue: 20 + (5 + i * 2) * 3.1 + Math.sin(i * 1.7) * 9,
}));

protected readonly campaignSeries: OgeChartSeriesInput[] = [
  {
    type: 'scatter',
    argumentField: 'spend',
    valueField: 'revenue',
    name: 'Campaigns',
    trendline: { type: 'linear', showR2: true },
  },
];`,
});

export const WATERFALL_PARETO_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'] },
  template: `<!-- waterfall: deltas float from the running total; summaryField marks
     'intermediate' subtotals and the 'total'. Rising, falling and sum bars
     colour by kind, dashed connectors join them, and the screen-reader
     table says "increase" / "decrease" / "total". -->
<oge-chart
  [dataSource]="cashFlow"
  [series]="cashSeries"
  [legend]="{ visible: false }"
  title="Cash flow (k€)"
  style="height: 320px"
/>
<!-- pareto: bars sort by value and a cumulative-% line runs over them on
     a second value axis. -->
<oge-chart
  [dataSource]="defects"
  [series]="defectSeries"
  [valueAxis]="paretoAxes"
  title="Defects by cause"
  style="height: 320px"
/>`,
  body: `protected readonly cashFlow = [
  { step: 'Opening', amount: 120 },
  { step: 'Sales', amount: 85 },
  { step: 'Services', amount: 34 },
  { step: 'Payroll', amount: -72 },
  { step: 'Rent', amount: -18 },
  { step: 'Q1', sum: 'intermediate' },
  { step: 'Tax', amount: -26 },
  { step: 'Closing', sum: 'total' },
];

protected readonly cashSeries: OgeChartSeriesInput[] = [
  {
    type: 'waterfall',
    argumentField: 'step',
    valueField: 'amount',
    summaryField: 'sum',
    name: 'Cash flow',
    label: { visible: true },
  },
];

protected readonly defects = [
  { cause: 'Dents', count: 8 },
  { cause: 'Scratches', count: 46 },
  { cause: 'Wrong part', count: 12 },
  { cause: 'Misalignment', count: 31 },
  { cause: 'Other', count: 5 },
];

protected readonly defectSeries: OgeChartSeriesInput[] = [
  {
    type: 'pareto',
    argumentField: 'cause',
    valueField: 'count',
    name: 'Defects',
    cumulativeAxis: 1,
  },
];

protected readonly paretoAxes: OgeChartAxisOptions[] = [
  { title: 'Count' },
  {
    position: 'end',
    title: 'Cumulative',
    max: 100,
    labelFormat: (value) => \`\${String(value)}%\`,
  },
];`,
});

export const BOX_HISTOGRAM_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- boxPlot from raw samples: quartiles, Tukey whiskers (1.5 × IQR)
     and outlier dots — or from precomputed q1/median/q3 fields. The tooltip
     and the screen-reader table read Min, Q1, Median, Q3, Max. -->
<oge-chart
  [dataSource]="latency"
  [series]="latencySeries"
  [valueAxis]="{ title: 'ms' }"
  title="Response time by service"
  style="height: 320px"
/>
<!-- histogram: bins the values (count, width or explicit thresholds);
     bars span their bins and the argument reads "165 – 170". -->
<oge-chart
  [dataSource]="heights"
  [series]="heightSeries"
  [argumentAxis]="{ title: 'Height (cm)' }"
  title="Height distribution"
  style="height: 300px"
/>`,
  body: `protected readonly latency = ['API', 'Web', 'Worker', 'DB'].map(
  (service, s) => ({
    service,
    samples: Array.from(
      { length: 40 },
      (_, i) => 20 + s * 12 + ((i * 37) % 29) + (i % 13 === 0 ? 55 : 0),
    ),
  }),
);

protected readonly latencySeries: OgeChartSeriesInput[] = [
  {
    type: 'boxPlot',
    argumentField: 'service',
    valuesField: 'samples',
    name: 'Latency',
  },
];

/** Deterministic pseudo-random 0..1 (the demo needs stable data). */
private readonly noise = (k: number): number =>
  Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;

protected readonly heights = Array.from({ length: 240 }, (_, i) => ({
  height:
    150 +
    20 * (this.noise(i) + this.noise(i + 1000) + this.noise(i + 2000)),
}));

protected readonly heightSeries: OgeChartSeriesInput[] = [
  {
    type: 'histogram',
    valueField: 'height',
    name: 'People',
    bins: { width: 5 },
    label: { visible: true },
  },
];`,
});

export const EXPORT_PRINT_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- Export without a chart library: PNG/JPEG rasterize the live SVG
     (styles inlined), PDF embeds that image under a real-text title in a
     jsPDF page (an optional peer, loaded only by /export-pdf), and print()
     opens the browser dialog for the chart alone. -->
<div class="mb-2 flex flex-wrap gap-2">
  <button type="button" (click)="exportPng(chart)">PNG</button>
  <button type="button" (click)="exportJpeg(chart)">JPEG</button>
  <button type="button" (click)="exportPdf(chart)">PDF</button>
  <button type="button" (click)="chart.print()">Print</button>
</div>
<oge-chart
  #chart
  [dataSource]="energy"
  [series]="energySeries"
  title="Energy mix (GWh)"
  style="height: 340px"
/>`,
  body: `protected readonly energy = [
  { month: 'Jan', solar: 12, wind: 30, hydro: 18 },
  { month: 'Feb', solar: 16, wind: 27, hydro: 17 },
  { month: 'Mar', solar: 24, wind: 25, hydro: 20 },
  { month: 'Apr', solar: 31, wind: 22, hydro: 22 },
  { month: 'May', solar: 38, wind: 18, hydro: 24 },
  { month: 'Jun', solar: 42, wind: 16, hydro: 21 },
];

protected readonly energySeries: OgeChartSeriesInput[] = [
  { type: 'stackedSplineArea', argumentField: 'month', valueField: 'solar', name: 'Solar' },
  { type: 'stackedSplineArea', argumentField: 'month', valueField: 'wind', name: 'Wind' },
  { type: 'stackedSplineArea', argumentField: 'month', valueField: 'hydro', name: 'Hydro' },
];

protected async exportPng<T extends object>(chart: OgeChart<T>): Promise<void> {
  const { exportChartToPng } = await import('@oge-ui/charts/export-image');
  await exportChartToPng(chart, { filename: 'energy.png' });
}

protected async exportJpeg<T extends object>(chart: OgeChart<T>): Promise<void> {
  const { exportChartToJpeg } = await import('@oge-ui/charts/export-image');
  await exportChartToJpeg(chart, { filename: 'energy.jpeg', quality: 0.9 });
}

/**
 * Non-WinAnsi titles (Turkish ğ ş ı İ, Greek, Cyrillic) need a Unicode font:
 * pass \`font\`, or register one once with setOgePdfDefaultFont() from
 * @oge-ui/behavior — every OGE PDF export then uses it.
 */
protected async exportPdf<T extends object>(chart: OgeChart<T>): Promise<void> {
  const { exportChartToPdf } = await import('@oge-ui/charts/export-pdf');
  await exportChartToPdf(chart, {
    filename: 'energy.pdf',
    title: 'Energy mix',
    subtitle: 'Generation by source, GWh',
  });
}`,
});
