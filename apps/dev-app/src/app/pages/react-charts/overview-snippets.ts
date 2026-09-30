import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React charts overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../charts/overview-snippets.ts` (the parity
 * standard, `docs/REACT-PARITY.md`): the same eleven sections, same order,
 * same data sets and options, React idiom — controlled `visualRange` /
 * `selectedPoints` pairs instead of `[(…)]`, a `ref` handle instead of a
 * template reference, and `<OgeChartsConfigProvider>` instead of
 * `provideOgeChartsConfig()`.
 */
export const CHARTS_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'QuarterlyRevenue',
      before: `const data = [
  { quarter: 'Q1', product: 120, services: 60 },
  { quarter: 'Q2', product: 150, services: 74 },
  { quarter: 'Q3', product: 138, services: 90 },
  { quarter: 'Q4', product: 190, services: 105 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'quarter', valueField: 'product', name: 'Product' },
  { type: 'line', argumentField: 'quarter', valueField: 'services', name: 'Services' },
];`,
      jsx: `// One element, a working chart: category axis auto-detected from the
// string arguments, nice-tick value axis, interactive legend (click hides a
// series), hover tooltip and crosshair. Everything is drawn as
// dependency-free SVG — no D3, no canvas library.
<OgeChart
  dataSource={data}
  series={series}
  title="Quarterly revenue"
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Series types',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'SeriesTypes',
      before: `const data = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  smooth: Math.sin(i / 2) * 30 + 60,
  lo: Math.sin(i / 2) * 12 + 22,
  hi: Math.sin(i / 2) * 12 + 42,
  dots: Math.cos(i / 1.5) * 25 + 55,
  weight: (i % 5) + 1,
}));

const series: OgeChartSeriesInput[] = [
  { type: 'rangeBar', value1Field: 'lo', value2Field: 'hi', name: 'Band' },
  { type: 'stepLine', valueField: 'smooth', name: 'Steps', width: 2.5 },
  {
    type: 'bubble',
    valueField: 'dots',
    sizeField: 'weight',
    name: 'Bubbles',
    opacity: 0.75,
  },
];`,
      jsx: `// Sixteen series types share one engine: line/spline/step lines, five
// area flavors, four bar flavors (incl. rangeBar spanning value1..value2),
// scatter, bubble (sizeField drives the AREA of each bubble), rangeArea
// and candlestick. showLabels prints SI-formatted values next to small
// series; null values become gaps, never fake zeros. Hovering a legend
// item spotlights its series.
<OgeChart
  dataSource={data}
  series={series}
  commonSeries={{ argumentField: 'day' }}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Time axis & strip lines',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartSeriesInput', 'OgeChartStripLine'],
      },
      name: 'VisitorsOverTime',
      before: `const data = Array.from({ length: 120 }, (_, i) => ({
  date: new Date(2026, 0, 1 + i),
  visitors: 400 + Math.sin(i / 9) * 150 + (i % 17) * 8,
}));

const series: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'date', valueField: 'visitors', name: 'Visitors' },
];

const stripLines: OgeChartStripLine[] = [
  { start: new Date(2026, 2, 1), end: new Date(2026, 2, 15), label: 'Campaign' },
  { start: new Date(2026, 3, 10), label: 'Release', color: '#dc2626' },
];`,
      jsx: `// Date arguments auto-detect the time axis: ticks are calendar-true (real
// month boundaries, DST-safe) and labels format through Intl in your
// locale. stripLines mark a deadline (line) or a window (band) on the
// argument axis.
<OgeChart
  dataSource={data}
  series={series}
  stripLines={stripLines}
  argumentAxis={{ grid: true }}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Stacked series',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'StackedSales',
      before: `const data = [
  { month: 'Jan', on: 40, off: 24, refunds: -6 },
  { month: 'Feb', on: 52, off: 28, refunds: -4 },
  { month: 'Mar', on: 47, off: 35, refunds: -9 },
  { month: 'Apr', on: 61, off: 31, refunds: -5 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'stackedBar', valueField: 'on', name: 'Online' },
  { type: 'stackedBar', valueField: 'off', name: 'Retail' },
  { type: 'stackedBar', valueField: 'refunds', name: 'Refunds' },
];`,
      jsx: `// stackedBar accumulates per argument (negatives stack downward
// separately); fullStackedBar normalizes each argument to 100%. The stack
// option splits series into independent stack groups.
<OgeChart
  dataSource={data}
  series={series}
  commonSeries={{ argumentField: 'month' }}
  valueAxis={{ abbreviate: false }}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Zoom, pan & tooltips',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartRange', 'OgeChartSeriesInput'],
      },
      name: 'ServerLoad',
      before: `const data = Array.from({ length: 50_000 }, (_, i) => ({
  t: new Date(2026, 0, 1, 0, i * 15),
  cpu: 40 + Math.sin(i / 60) * 25 + (i % 13),
  memory: 55 + Math.cos(i / 90) * 18 + (i % 7),
}));

const series: OgeChartSeriesInput[] = [
  { type: 'line', argumentField: 't', valueField: 'cpu', name: 'CPU' },
  { type: 'line', argumentField: 't', valueField: 'memory', name: 'Memory' },
];`,
      body: `const [range, setRange] = useState<OgeChartRange | null>(null);`,
      jsx: `// 50,000 points per series stay fluid: paths auto-downsample with LTTB
// (Largest-Triangle-Three-Buckets — peaks survive) to roughly one point per
// pixel, hit-testing is a binary search over the FULL data and pointer work
// is rAF-coalesced. Wheel zooms around the cursor, dragging selects a
// range, Shift+drag pans, Escape resets; visualRange is controlled; shared
// tooltips list every series.
<OgeChart
  dataSource={data}
  series={series}
  visualRange={range}
  onVisualRangeChange={setRange}
  zoomEnabled="both"
  panEnabled
  tooltip={{ shared: true }}
  crosshair={{ horizontal: true }}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Candlestick & multi-axis',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'StockChart',
      before: `const data = Array.from({ length: 30 }, (_, i) => {
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

const series: OgeChartSeriesInput[] = [
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
      jsx: `// Candlesticks read OHLC fields; a second value axis (position: 'end')
// carries the volume bars so the two scales stay independent.
// Rising/falling bodies color via the theme tokens.
<OgeChart
  dataSource={data}
  series={series}
  valueAxis={[{ title: 'Price' }, { position: 'end', title: 'Volume' }]}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Pie & doughnut',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgePieChart'] },
      name: 'BrowserShare',
      before: `const data = [
  { browser: 'Chrome', share: 62 },
  { browser: 'Safari', share: 20 },
  { browser: 'Edge', share: 6 },
  { browser: 'Firefox', share: 5 },
  { browser: 'Samsung', share: 3 },
  { browser: 'Opera', share: 2 },
  { browser: 'Other', share: 2 },
];`,
      jsx: `// Pie and doughnut share the engine: outside labels with connector
// lines, small-value grouping folds the tail into an "Others" slice,
// clicking (or the legend) selects and explodes.
<OgePieChart
  dataSource={data}
  argumentField="browser"
  valueField="share"
  type="doughnut"
  innerRadius={0.55}
  smallValuesGrouping={{ mode: 'topN', topCount: 4 }}
  title="Browser share"
  style={{ height: 360 }}
/>`,
    }),
  },
  {
    title: 'Polar & radar',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgePolarChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'TeamSkills',
      before: `const data = [
  { skill: 'TypeScript', ada: 9, grace: 7 },
  { skill: 'CSS', ada: 6, grace: 8 },
  { skill: 'SQL', ada: 7, grace: 5 },
  { skill: 'Rust', ada: 4, grace: 6 },
  { skill: 'Go', ada: 5, grace: 9 },
  { skill: 'Testing', ada: 8, grace: 7 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'area', valueField: 'ada', name: 'Ada' },
  { type: 'line', valueField: 'grace', name: 'Grace', width: 2.5 },
];`,
      jsx: `// Radar/polar on the same engine: categories slot around the circle,
// values map radially with nice ticks. line/area draw closed radar loops
// (a null value breaks the loop into a gap), scatter renders markers, bar
// renders sectors. spider swaps circular rings for polygons.
<OgePolarChart
  dataSource={data}
  series={series}
  commonSeries={{ argumentField: 'skill' }}
  spider
  title="Team skills"
  style={{ height: 400 }}
/>`,
    }),
  },
  {
    title: 'Annotations',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartAnnotation', 'OgeChartSeriesInput'],
      },
      name: 'PriceAnnotations',
      before: `const data = Array.from({ length: 40 }, (_, i) => ({
  day: i + 1,
  price: 80 + Math.sin(i / 5) * 20 + i / 2,
}));

const series: OgeChartSeriesInput[] = [
  { type: 'spline', argumentField: 'day', valueField: 'price', name: 'Price' },
];

const annotations: OgeChartAnnotation[] = [
  { type: 'point', text: 'All-time high', argument: 34, value: 116.9 },
  { type: 'point', text: 'Correction', argument: 22, value: 76.1, offsetY: 24 },
  { type: 'text', text: 'Q1 guidance', argument: 8 },
];`,
      jsx: `// Annotations anchor on the plot: 'point' draws a marker dot with a
// connector into a label box at (argument, value); 'text' places the label
// alone (top of the plot without a value). renderAnnotation — the React
// form of *ogeChartAnnotationTemplate — swaps in arbitrary markup.
<OgeChart
  dataSource={data}
  series={series}
  annotations={annotations}
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Range selector',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-charts': ['OgeChart', 'OgeRangeSelector'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartRange', 'OgeChartSeriesInput'],
      },
      name: 'SalesOverview',
      before: `const data = Array.from({ length: 365 }, (_, i) => ({
  date: new Date(2026, 0, 1 + i),
  sales: 200 + Math.sin(i / 20) * 80 + (i % 11) * 6,
}));

const series: OgeChartSeriesInput[] = [
  { type: 'line', argumentField: 'date', valueField: 'sales', name: 'Sales' },
];

const miniSeries: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'date', valueField: 'sales', name: 'Sales' },
];`,
      body: `const [range, setRange] = useState<OgeChartRange | null>(null);`,
      jsx: `<>
  {/* The overview strip: a mini background chart with a draggable window
      and two WAI-ARIA slider handles (arrows adjust, Home/End jump, Escape
      mid-drag restores). Share one state between the chart's visualRange
      and the selector's value and the two stay in lockstep. */}
  <OgeChart
    dataSource={data}
    series={series}
    visualRange={range}
    onVisualRangeChange={setRange}
    zoomEnabled="both"
    style={{ height: 300 }}
  />
  <OgeRangeSelector
    dataSource={data}
    series={miniSeries}
    value={range}
    onValueChange={setRange}
    style={{ display: 'block', marginTop: 8 }}
  />
</>`,
    }),
  },
  {
    title: 'Selection, i18n & export',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': [
          'OgeChartHandle',
          'OgeChartPointEvent',
          'OgeChartPointRef',
          'OgeChartSeriesInput',
        ],
      },
      name: 'SelectableChart',
      before: `const data = [
  { month: 'Jan', value: 12 },
  { month: 'Feb', value: 31 },
  { month: 'Mar', value: 24 },
  { month: 'Apr', value: 42 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'month', valueField: 'value', name: 'Value' },
];`,
      body: `// App-wide: wrap the tree in
// <OgeChartsConfigProvider config={{ locale: 'de', a11yTableLimit: 100 }}>
const chart = useRef<OgeChartHandle>(null);
const [selected, setSelected] = useState<readonly OgeChartPointRef[]>([]);
const lastPoint = useRef<OgeChartPointEvent | null>(null);

/** The exporter loads lazily and needs no third-party library at all. */
const exportPng = async (): Promise<void> => {
  const { exportChartToPng } = await import('@oge-ui/react-charts/export-image');
  if (chart.current) await exportChartToPng(chart.current, { filename: 'chart.png' });
};
const exportSvg = async (): Promise<void> => {
  const { exportChartToSvg } = await import('@oge-ui/react-charts/export-image');
  if (chart.current) exportChartToSvg(chart.current, { filename: 'chart.svg' });
};`,
      jsx: `<>
  {/* selectionMode="point" rings clicked points (Ctrl adds); onLegendClick
      is cancelable. Every user-facing string, aria included, lives in
      OgeChartsMessages (OgeChartsConfigProvider, locale). The
      dependency-free export entry serializes the SVG with inlined styles —
      PNG via canvas rasterization, or the standalone .svg itself. */}
  <div className="mb-2 flex gap-2">
    <button type="button" onClick={() => void exportPng()}>Export PNG</button>
    <button type="button" onClick={() => void exportSvg()}>Export SVG</button>
  </div>
  <OgeChart
    ref={chart}
    dataSource={data}
    series={series}
    selectionMode="point"
    selectedPoints={selected}
    onSelectedPointsChange={setSelected}
    locale="de"
    onPointClick={(event) => {
      lastPoint.current = event;
    }}
    style={{ height: 340 }}
  />
</>`,
    }),
  },
];
