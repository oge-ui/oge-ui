import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources of the React charts "depth" sections — section-for-section
 * mirror of `../charts/analytics-snippets.ts` (same data, same options),
 * React idiom: a controlled `visualRange` pair instead of `[(…)]`, a `ref`
 * handle instead of a template reference. Pure data, no React imports.
 */
export const CHARTS_ANALYTICS_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Data labels',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-charts': ['OgeChart', 'OgePieChart', 'OgePolarChart'],
      },
      types: {
        '@oge-ui/react-charts': [
          'OgeChartLabelOptions',
          'OgeChartSeriesInput',
          'OgePieSeriesInput',
        ],
      },
      name: 'DataLabels',
      before: `interface SalesRow {
  region: string;
  sales: number;
  target: number;
}

interface ChannelRow {
  channel: string;
  y2025: number;
  y2026: number;
}

const sales: SalesRow[] = [
  { region: 'North', sales: 182, target: 160 },
  { region: 'South', sales: 96, target: 140 },
  { region: 'East', sales: 151, target: 150 },
  { region: 'West', sales: 128, target: 130 },
  { region: 'Central', sales: 204, target: 170 },
];

const salesSeries: OgeChartSeriesInput<SalesRow>[] = [
  {
    type: 'bar',
    argumentField: 'region',
    valueField: 'sales',
    name: 'Sales',
    label: { visible: true, position: 'insideEnd' },
    customizePoint: (info) =>
      info.source !== undefined && info.source.sales < info.source.target
        ? { color: '#ef4444', description: 'below target' }
        : undefined,
  },
];

const channels: ChannelRow[] = [
  { channel: 'Online', y2025: 42, y2026: 55 },
  { channel: 'Retail', y2025: 38, y2026: 30 },
  { channel: 'Partners', y2025: 20, y2026: 15 },
];

const rings: OgePieSeriesInput<ChannelRow>[] = [
  { name: '2025', valueField: 'y2025' },
  { name: '2026', valueField: 'y2026' },
];

const percentLabels: OgeChartLabelOptions<ChannelRow> = {
  visible: true,
  position: 'inside',
  format: (info) => \`\${Math.round((info.percent ?? 0) * 100)}%\`,
};

const goals = [
  { team: 'Design', done: 72 },
  { team: 'Web', done: 88 },
  { team: 'Mobile', done: 54 },
  { team: 'QA', done: 93 },
];

const goalSeries: OgeChartSeriesInput[] = [
  {
    type: 'radialBar',
    argumentField: 'team',
    valueField: 'done',
    name: 'Done',
    label: { visible: true, format: (info) => \`\${info.value}%\` },
  },
];`,
      jsx: `<>
  {/* Data labels on any series: position (outside / inside / center /
      insideEnd / insideBase), format, showForZero and overlap resolution
      (hide / shift / none). customizePoint colours single points — and its
      description is spoken in the tooltip and the screen-reader table, so
      colour is never the only channel. */}
  <OgeChart
    dataSource={sales}
    series={salesSeries}
    title="Sales vs target (k€)"
    style={{ height: 320 }}
  />
  <div className="mt-4 grid gap-4 md:grid-cols-2">
    {/* Nested doughnut: one ring per series entry; slices of one argument
        share a colour and a legend button across rings. */}
    <OgePieChart
      dataSource={channels}
      argumentField="channel"
      type="doughnut"
      innerRadius={0.35}
      series={rings}
      label={percentLabels}
      title="Revenue by channel, 2025 → 2026"
      style={{ height: 320 }}
    />
    {/* Radial bars: one ring per category, the arc is the value. */}
    <OgePolarChart
      dataSource={goals}
      series={goalSeries}
      valueAxis={{ max: 100 }}
      title="Sprint goals done"
      style={{ height: 320 }}
    />
  </div>
</>`,
    }),
  },
  {
    title: 'Trendlines & indicators',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartRange', 'OgeChartSeriesInput'],
      },
      name: 'Indicators',
      before: `const prices = Array.from({ length: 60 }, (_, i) => {
  const base = 100 + Math.sin(i / 6) * 8 + i * 0.4;
  return {
    day: new Date(2026, 0, 1 + i),
    open: base - 1,
    high: base + 2.5,
    low: base - 3,
    close: base + Math.sin(i) * 1.5,
  };
});

const priceSeries: OgeChartSeriesInput[] = [
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
];

const rsiSeries: OgeChartSeriesInput[] = [
  {
    type: 'indicator',
    argumentField: 'day',
    closeField: 'close',
    indicator: { type: 'rsi', period: 14 },
  },
];

const campaigns = Array.from({ length: 24 }, (_, i) => ({
  spend: 5 + i * 2,
  revenue: 20 + (5 + i * 2) * 3.1 + Math.sin(i * 1.7) * 9,
}));

const campaignSeries: OgeChartSeriesInput[] = [
  {
    type: 'scatter',
    argumentField: 'spend',
    valueField: 'revenue',
    name: 'Campaigns',
    trendline: { type: 'linear', showR2: true },
  },
];`,
      body: `const [range, setRange] = useState<OgeChartRange | null>(null);`,
      jsx: `<>
  {/* Technical indicators are series: type 'indicator' computes SMA, EMA,
      Bollinger Bands, MACD or RSI from the close prices (the same pure
      ogeSma/ogeEma/ogeBollingerBands/ogeMacd/ogeRsi you can import). The
      RSI sits in a second chart that shares the zoom window. */}
  <OgeChart
    dataSource={prices}
    series={priceSeries}
    visualRange={range}
    onVisualRangeChange={setRange}
    zoomEnabled="wheel"
    tooltip={{ shared: true }}
    style={{ height: 320 }}
  />
  <OgeChart
    dataSource={prices}
    series={rsiSeries}
    visualRange={range}
    onVisualRangeChange={setRange}
    valueAxis={{ min: 0, max: 100 }}
    legend={{ visible: false }}
    style={{ height: 150 }}
  />
  {/* Trendlines: linear, exponential, logarithmic, polynomial or moving
      average over any series; showR2 adds the fit to the tooltip. */}
  <OgeChart
    dataSource={campaigns}
    series={campaignSeries}
    argumentAxis={{ title: 'Ad spend (k€)' }}
    valueAxis={{ title: 'Revenue (k€)' }}
    style={{ height: 300 }}
  />
</>`,
    }),
  },
  {
    title: 'Waterfall & Pareto',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'],
      },
      name: 'WaterfallPareto',
      before: `const cashFlow = [
  { step: 'Opening', amount: 120 },
  { step: 'Sales', amount: 85 },
  { step: 'Services', amount: 34 },
  { step: 'Payroll', amount: -72 },
  { step: 'Rent', amount: -18 },
  { step: 'Q1', sum: 'intermediate' },
  { step: 'Tax', amount: -26 },
  { step: 'Closing', sum: 'total' },
];

const cashSeries: OgeChartSeriesInput[] = [
  {
    type: 'waterfall',
    argumentField: 'step',
    valueField: 'amount',
    summaryField: 'sum',
    name: 'Cash flow',
    label: { visible: true },
  },
];

const defects = [
  { cause: 'Dents', count: 8 },
  { cause: 'Scratches', count: 46 },
  { cause: 'Wrong part', count: 12 },
  { cause: 'Misalignment', count: 31 },
  { cause: 'Other', count: 5 },
];

const defectSeries: OgeChartSeriesInput[] = [
  {
    type: 'pareto',
    argumentField: 'cause',
    valueField: 'count',
    name: 'Defects',
    cumulativeAxis: 1,
  },
];

const paretoAxes: OgeChartAxisOptions[] = [
  { title: 'Count' },
  {
    position: 'end',
    title: 'Cumulative',
    max: 100,
    labelFormat: (value) => \`\${String(value)}%\`,
  },
];`,
      jsx: `<>
  {/* waterfall: deltas float from the running total; summaryField marks
      'intermediate' subtotals and the 'total'. Rising, falling and sum bars
      colour by kind, dashed connectors join them, and the screen-reader
      table says "increase" / "decrease" / "total". */}
  <OgeChart
    dataSource={cashFlow}
    series={cashSeries}
    legend={{ visible: false }}
    title="Cash flow (k€)"
    style={{ height: 320 }}
  />
  {/* pareto: bars sort by value and a cumulative-% line runs over them on
      a second value axis. */}
  <OgeChart
    dataSource={defects}
    series={defectSeries}
    valueAxis={paretoAxes}
    title="Defects by cause"
    style={{ height: 320 }}
  />
</>`,
    }),
  },
  {
    title: 'Box plot & histogram',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'Distributions',
      before: `const latency = ['API', 'Web', 'Worker', 'DB'].map((service, s) => ({
  service,
  samples: Array.from(
    { length: 40 },
    (_, i) => 20 + s * 12 + ((i * 37) % 29) + (i % 13 === 0 ? 55 : 0),
  ),
}));

const latencySeries: OgeChartSeriesInput[] = [
  { type: 'boxPlot', argumentField: 'service', valuesField: 'samples', name: 'Latency' },
];

/** Deterministic pseudo-random 0..1 (the demo needs stable data). */
const noise = (k: number): number =>
  Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;

const heights = Array.from({ length: 240 }, (_, i) => ({
  height: 150 + 20 * (noise(i) + noise(i + 1000) + noise(i + 2000)),
}));

const heightSeries: OgeChartSeriesInput[] = [
  {
    type: 'histogram',
    valueField: 'height',
    name: 'People',
    bins: { width: 5 },
    label: { visible: true },
  },
];`,
      jsx: `<>
  {/* boxPlot from raw samples: quartiles, Tukey whiskers (1.5 × IQR) and
      outlier dots — or from precomputed q1/median/q3 fields. The tooltip
      and the screen-reader table read Min, Q1, Median, Q3, Max. */}
  <OgeChart
    dataSource={latency}
    series={latencySeries}
    valueAxis={{ title: 'ms' }}
    title="Response time by service"
    style={{ height: 320 }}
  />
  {/* histogram: bins the values (count, width or explicit thresholds);
      bars span their bins and the argument reads "165 – 170". */}
  <OgeChart
    dataSource={heights}
    series={heightSeries}
    argumentAxis={{ title: 'Height (cm)' }}
    title="Height distribution"
    style={{ height: 300 }}
  />
</>`,
    }),
  },
  {
    title: 'Export & print',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartHandle', 'OgeChartSeriesInput'],
      },
      name: 'EnergyExport',
      before: `const energy = [
  { month: 'Jan', solar: 12, wind: 30, hydro: 18 },
  { month: 'Feb', solar: 16, wind: 27, hydro: 17 },
  { month: 'Mar', solar: 24, wind: 25, hydro: 20 },
  { month: 'Apr', solar: 31, wind: 22, hydro: 22 },
  { month: 'May', solar: 38, wind: 18, hydro: 24 },
  { month: 'Jun', solar: 42, wind: 16, hydro: 21 },
];

const energySeries: OgeChartSeriesInput[] = [
  { type: 'stackedSplineArea', argumentField: 'month', valueField: 'solar', name: 'Solar' },
  { type: 'stackedSplineArea', argumentField: 'month', valueField: 'wind', name: 'Wind' },
  { type: 'stackedSplineArea', argumentField: 'month', valueField: 'hydro', name: 'Hydro' },
];`,
      body: `const chart = useRef<OgeChartHandle>(null);

const exportPng = async (): Promise<void> => {
  const { exportChartToPng } = await import('@oge-ui/react-charts/export-image');
  if (chart.current) await exportChartToPng(chart.current, { filename: 'energy.png' });
};
const exportJpeg = async (): Promise<void> => {
  const { exportChartToJpeg } = await import('@oge-ui/react-charts/export-image');
  if (chart.current) {
    await exportChartToJpeg(chart.current, { filename: 'energy.jpeg', quality: 0.9 });
  }
};
// Non-WinAnsi titles (Turkish ğ ş ı İ, Greek, Cyrillic) need a Unicode font:
// pass \`font\`, or register one once with setOgePdfDefaultFont() from
// @oge-ui/behavior — every OGE PDF export then uses it.
const exportPdf = async (): Promise<void> => {
  const { exportChartToPdf } = await import('@oge-ui/react-charts/export-pdf');
  if (chart.current) {
    await exportChartToPdf(chart.current, {
      filename: 'energy.pdf',
      title: 'Energy mix',
      subtitle: 'Generation by source, GWh',
    });
  }
};`,
      jsx: `<>
  {/* Export without a chart library: PNG/JPEG rasterize the live SVG
      (styles inlined), PDF embeds that image under a real-text title in a
      jsPDF page (an optional peer, loaded only by /export-pdf), and print()
      opens the browser dialog for the chart alone. */}
  <div className="mb-2 flex flex-wrap gap-2">
    <button type="button" onClick={() => void exportPng()}>PNG</button>
    <button type="button" onClick={() => void exportJpeg()}>JPEG</button>
    <button type="button" onClick={() => void exportPdf()}>PDF</button>
    <button type="button" onClick={() => void chart.current?.print()}>Print</button>
  </div>
  <OgeChart
    ref={chart}
    dataSource={energy}
    series={energySeries}
    title="Energy mix (GWh)"
    style={{ height: 340 }}
  />
</>`,
    }),
  },
];
