import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Axes & layout" page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module
 * in plain Node. Section-for-section mirror of
 * `../charts/axes-layout-snippets.ts` (same data and options, React idiom:
 * controlled `visualRange` / `value` pairs instead of `[(…)]`).
 */
export const CHARTS_AXES_LAYOUT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Rotated bars',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'RotatedBars',
      before: `const data = [
  { region: 'North', online: 420, retail: 310 },
  { region: 'East', online: 380, retail: 260 },
  { region: 'South', online: 290, retail: 340 },
  { region: 'West', online: 510, retail: 220 },
  { region: 'Central', online: 240, retail: 180 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'stackedBar', valueField: 'online', name: 'Online' },
  { type: 'stackedBar', valueField: 'retail', name: 'Retail' },
];`,
      jsx: `// rotated swaps the axes: the argument axis runs down the left, values
// grow to the right. Every series type follows — these stackedBar series
// become horizontal stacked bars — and so do the tooltip, crosshair, zoom
// and the keyboard (Up/Down walk the categories, Left/Right the series).
<OgeChart
  dataSource={data}
  series={series}
  commonSeries={{ argumentField: 'region' }}
  rotated
  tooltip={{ shared: true }}
  valueAxis={{ title: 'Units sold', abbreviate: false }}
  style={{ height: 360 }}
/>`,
    }),
  },
  {
    title: 'Constant lines & strips',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'],
      },
      name: 'ConstantLines',
      before: `const data = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
  (month, i) => ({ month, latency: 180 + Math.round(Math.sin(i / 1.7) * 70) + i * 4 }),
);

const series: OgeChartSeriesInput[] = [
  { type: 'spline', argumentField: 'month', valueField: 'latency', name: 'p95 latency (ms)' },
];

const valueAxis: OgeChartAxisOptions = {
  constantLines: [
    { value: 250, label: 'SLO 250 ms', color: 'var(--oge-danger)', width: 2 },
    { value: 150, label: 'Goal', dash: 'dot', position: 'outside' },
  ],
  strips: [{ start: 100, end: 150, label: 'Comfort zone' }],
};

const argumentAxis: OgeChartAxisOptions = {
  constantLines: [{ value: 'Jun', label: 'Release 2.0', color: 'var(--oge-accent)', dash: 'solid' }],
  strips: [{ start: 'Sep', end: 'Oct', label: 'Freeze' }],
};`,
      jsx: `// constantLines draw a threshold at an axis value with a label (inside
// next to the line, or outside past the plot edge); strips shade a value
// band. Both work on the value AND the argument axis; labels never run
// off the plot.
<OgeChart
  dataSource={data}
  series={series}
  valueAxis={valueAxis}
  argumentAxis={argumentAxis}
  style={{ height: 360 }}
/>`,
    }),
  },
  {
    title: 'Panes (price + volume)',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-charts': ['OgeChart', 'OgeRangeSelector'] },
      types: {
        '@oge-ui/react-charts': [
          'OgeChartAxisOptions',
          'OgeChartPane',
          'OgeChartPeriod',
          'OgeChartRange',
          'OgeChartSeriesInput',
        ],
      },
      name: 'PriceAndVolume',
      before: `const data = Array.from({ length: 260 }, (_, i) => {
  const open = 100 + Math.sin(i / 14) * 18 + i * 0.12;
  const close = open + Math.sin(i * 1.7) * 3;
  return {
    day: new Date(2025, 8, 1 + i),
    open,
    close,
    high: Math.max(open, close) + 2,
    low: Math.min(open, close) - 2,
    volume: 1800 + Math.round(Math.abs(Math.cos(i / 3)) * 2400),
  };
});

const panes: OgeChartPane[] = [
  { name: 'price', height: 3 },
  { name: 'volume', height: 1 },
];

const valueAxes: OgeChartAxisOptions[] = [
  { pane: 'price', title: 'Price' },
  { pane: 'volume', title: 'Volume' },
];

const series: OgeChartSeriesInput[] = [
  {
    type: 'candlestick',
    argumentField: 'day',
    openField: 'open',
    highField: 'high',
    lowField: 'low',
    closeField: 'close',
    name: 'OGE',
    pane: 'price',
  },
  { type: 'bar', argumentField: 'day', valueField: 'volume', name: 'Volume', pane: 'volume', opacity: 0.6 },
];

const navigator: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'day', valueField: 'close', name: 'Close' },
];

const periods: OgeChartPeriod[] = ['1M', '3M', '6M', 'YTD', '1Y', 'All'];`,
      body: `const [range, setRange] = useState<OgeChartRange | null>(null);`,
      jsx: `// panes stack plot areas over ONE shared argument axis: series and value
// axes pick theirs by name. The crosshair runs through every pane (its
// horizontal line stays in the hovered one) and zoom/pan move all of them.
// The range selector's period buttons set the same window.
<>
  <OgeChart
    dataSource={data}
    series={series}
    panes={panes}
    valueAxis={valueAxes}
    crosshair={{ horizontal: true }}
    tooltip={{ shared: true }}
    visualRange={range}
    onVisualRangeChange={setRange}
    zoomEnabled="both"
    panEnabled
    style={{ height: 420 }}
  />
  <OgeRangeSelector
    dataSource={data}
    series={navigator}
    periods={periods}
    value={range}
    onValueChange={setRange}
  />
</>`,
    }),
  },
  {
    title: 'Axis breaks',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'AxisBreaks',
      before: `const data = [
  { team: 'Search', tickets: 84 },
  { team: 'Billing', tickets: 112 },
  { team: 'Platform', tickets: 1010 },
  { team: 'Mobile', tickets: 96 },
  { team: 'Data', tickets: 61 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'team', valueField: 'tickets', name: 'Open tickets', showLabels: true },
];`,
      jsx: `// One outlier would flatten every other bar. breaks skip a value range on
// a linear value axis — the gap is drawn with a zig-zag marker and no tick
// lands inside it.
<OgeChart
  dataSource={data}
  series={series}
  valueAxis={{ breaks: [{ start: 140, end: 940 }] }}
  style={{ height: 340 }}
/>`,
    }),
  },
  {
    title: 'Ticks & labels',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'],
      },
      name: 'TicksAndLabels',
      before: `const data = Array.from({ length: 70 }, (_, i) => ({
  day: new Date(2026, 2, 2 + i),
  temperature: 9 + Math.round(Math.sin(i / 9) * 5 + i / 8),
}));

const series: OgeChartSeriesInput[] = [
  { type: 'stepLine', argumentField: 'day', valueField: 'temperature', name: 'Daily high' },
];

const argumentAxis: OgeChartAxisOptions = {
  tickInterval: { weeks: 1 },
  minorTicks: { count: 6 },
  grid: true,
  label: { format: { day: 'numeric', month: 'short' }, overlap: 'stagger' },
};

const valueAxis: OgeChartAxisOptions = {
  allowDecimals: false,
  tickInterval: 2,
  label: { template: '{value} °C' },
};`,
      jsx: `// tickInterval fixes the tick distance — a number in axis units or a
// calendar interval such as { weeks: 1 }; minorTicks adds the ticks (and
// grid lines) in between; allowDecimals: false keeps whole numbers.
// label.format takes Intl options (or a function), label.template wraps
// the text and label.overlap picks rotate / stagger / hide / skip.
<OgeChart
  dataSource={data}
  series={series}
  argumentAxis={argumentAxis}
  valueAxis={valueAxis}
  style={{ height: 340 }}
/>`,
    }),
  },
  {
    title: 'RTL & touch',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartSeriesInput'] },
      name: 'RightToLeft',
      before: `const data = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  visits: 400 + Math.round(Math.sin(i / 3) * 120 + i * 8),
  orders: 60 + Math.round(Math.cos(i / 4) * 20 + i * 2),
}));

const series: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'day', valueField: 'visits', name: 'Visits' },
  { type: 'line', argumentField: 'day', valueField: 'orders', name: 'Orders' },
];`,
      jsx: `// rtlEnabled (unset = follow the page's dir) mirrors the argument axis,
// moves the value axis to the right, flips the legend and the tooltip side
// and swaps the Left/Right arrow keys. On touch screens two fingers
// pinch-zoom and pan the plot; one finger pans when panEnabled is on,
// otherwise it drag-zooms.
<OgeChart
  dataSource={data}
  series={series}
  rtlEnabled
  zoomEnabled="both"
  panEnabled
  legend={{ position: 'top' }}
  style={{ height: 340 }}
/>`,
    }),
  },
  {
    title: 'Draw-in animation',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-charts': ['OgeChart'] },
      types: {
        '@oge-ui/react-charts': [
          'OgeChartAnimationOptions',
          'OgeChartSeriesInput',
        ],
      },
      name: 'DrawIn',
      before: `const data = [
  { quarter: 'Q1', revenue: 120, cost: 80 },
  { quarter: 'Q2', revenue: 150, cost: 92 },
  { quarter: 'Q3', revenue: 138, cost: 101 },
  { quarter: 'Q4', revenue: 190, cost: 110 },
];

const series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'quarter', valueField: 'revenue', name: 'Revenue' },
  { type: 'spline', argumentField: 'quarter', valueField: 'cost', name: 'Cost' },
];

const animation: OgeChartAnimationOptions = { duration: 1100, easing: 'easeInOut' };`,
      body: `// a new key re-mounts the chart, which plays the draw-in again
const [run, setRun] = useState(0);`,
      jsx: `// The first render draws each series in from its value baseline: bars
// grow, lines rise. animation takes true / false or { enabled, duration,
// easing }; prefers-reduced-motion always switches it off.
<>
  <button type="button" onClick={() => setRun(run + 1)}>
    Replay
  </button>
  <OgeChart
    key={run}
    dataSource={data}
    series={series}
    animation={animation}
    style={{ height: 320 }}
  />
</>`,
    }),
  },
];
