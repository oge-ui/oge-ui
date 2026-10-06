import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Gauges & sparklines" page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module
 * in plain Node. Section-for-section mirror of `../charts/gauges-snippets.ts`.
 */
export const CHARTS_GAUGES_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Circular gauge',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeCircularGauge'] },
      types: { '@oge-ui/react-charts': ['OgeChartValueRange'] },
      react: ['useState'],
      name: 'CircularGauges',
      before: `const speedRanges: OgeChartValueRange[] = [
  { start: 0, end: 90, label: 'Normal' },
  { start: 90, end: 120, label: 'Fast' },
  { start: 120, end: 160, label: 'Over the limit' },
];

const cpuRanges: OgeChartValueRange[] = [
  { start: 0, end: 70, color: 'var(--oge-success)', label: 'Healthy' },
  { start: 70, end: 90, color: 'var(--oge-warning)', label: 'Busy' },
  { start: 90, end: 100, color: 'var(--oge-danger)', label: 'Saturated' },
];

const kmh = (value: number) => \`\${Math.round(value)} km/h\`;
const percent = (value: number) => \`\${Math.round(value)}%\`;`,
      body: `const [speed, setSpeed] = useState(96);
const [cpu, setCpu] = useState(64);
const randomize = () => {
  setSpeed(Math.round(Math.random() * 160));
  setCpu(Math.round(Math.random() * 100));
};`,
      jsx: `// A role="meter" dial: the value and the labelled range it falls in are
// spoken (aria-valuetext); the indicator sweeps in and glides on change —
// never under prefers-reduced-motion.
<>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
    <OgeCircularGauge
      value={speed}
      scale={{ min: 0, max: 160, tickInterval: 20 }}
      ranges={speedRanges}
      valueFormat={kmh}
      title="Speed"
      style={{ height: 240 }}
    />
    <OgeCircularGauge
      value={cpu}
      indicator="bar"
      ranges={cpuRanges}
      startAngle={-90}
      endAngle={90}
      valueFormat={percent}
      title="CPU"
      style={{ height: 240 }}
    />
    <OgeCircularGauge
      value={cpu}
      indicator="marker"
      subvalues={[40, 85]}
      startAngle={-135}
      endAngle={135}
      title="Load"
      style={{ height: 240 }}
    />
  </div>
  <button type="button" onClick={randomize}>New reading</button>
</>`,
    }),
  },
  {
    title: 'Linear gauge',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeLinearGauge'] },
      types: { '@oge-ui/react-charts': ['OgeChartValueRange'] },
      name: 'LinearGauges',
      before: `const refill: OgeChartValueRange[] = [
  { start: 0, end: 15, color: 'var(--oge-danger)', label: 'Refill' },
];

const litres = (value: number) => \`\${value} L\`;`,
      jsx: `// The same scale, ranges and meter semantics on a straight track —
// horizontal or vertical, a bar or a marker, mirrored in RTL pages.
<>
  <OgeLinearGauge
    value={62}
    ranges={refill}
    subvalues={[25, 80]}
    valueFormat={litres}
    scale={{ min: 0, max: 100 }}
    title="Water tank"
  />
  <OgeLinearGauge
    value={62}
    indicator="marker"
    orientation="vertical"
    title="Level"
    style={{ height: 260, width: 140 }}
  />
</>`,
    }),
  },
  {
    title: 'Bullet chart',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeBulletChart'] },
      types: { '@oge-ui/react-charts': ['OgeChartValueRange'] },
      name: 'BulletCharts',
      before: `const rows: { kpi: string; value: number; target: number; ranges: OgeChartValueRange[] }[] = [
  {
    kpi: 'Revenue (k$)',
    value: 270,
    target: 250,
    ranges: [
      { start: 0, end: 150, label: 'Poor' },
      { start: 150, end: 225, label: 'Satisfactory' },
      { start: 225, end: 300, label: 'Good' },
    ],
  },
  {
    kpi: 'Profit (%)',
    value: 22,
    target: 27,
    ranges: [{ start: 0, end: 20 }, { start: 20, end: 25 }, { start: 25, end: 30 }],
  },
  {
    kpi: 'New customers',
    value: 1650,
    target: 2100,
    ranges: [{ start: 0, end: 1400 }, { start: 1400, end: 2000 }, { start: 2000, end: 2500 }],
  },
];`,
      jsx: `// Value against target: qualitative bands (darkest = poor), the bar and
// the target marker; the svg's name speaks value and target.
<>
  {rows.map((row) => (
    <OgeBulletChart
      key={row.kpi}
      value={row.value}
      target={row.target}
      ranges={row.ranges}
      title={row.kpi}
    />
  ))}
</>`,
    }),
  },
  {
    title: 'Sparklines',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts/sparkline': ['OgeSparkline'] },
      name: 'Sparklines',
      before: `const rows = [
  { symbol: 'ACME', price: 182.4, week: [171, 174, 173, 178, 176, 181, 182], results: [1, 1, -1, 1, -1, 1, 1] },
  { symbol: 'GLOBX', price: 64.1, week: [70, 69, 66, 67, 65, 63, 64], results: [-1, -1, -1, 1, -1, -1, 1] },
  { symbol: 'INITECH', price: 23.9, week: [22, 22.5, 23, 22.8, 23.4, 23.7, 23.9], results: [1, 1, 1, -1, 1, 1, 1] },
];`,
      jsx: `// Word-sized charts from their own entry (@oge-ui/react-charts/sparkline),
// which never loads the cartesian chart.
<table>
  <thead>
    <tr><th>Symbol</th><th>Price</th><th>7 days</th><th>Trend</th><th>Up / down days</th></tr>
  </thead>
  <tbody>
    {rows.map((row) => (
      <tr key={row.symbol}>
        <td>{row.symbol}</td>
        <td>{row.price}</td>
        <td><OgeSparkline dataSource={row.week} markers={{ min: true, max: true }} tooltipEnabled title={row.symbol} /></td>
        <td><OgeSparkline dataSource={row.week} type="area" title={row.symbol} /></td>
        <td><OgeSparkline dataSource={row.results} type="winloss" title={row.symbol} /></td>
      </tr>
    ))}
  </tbody>
</table>`,
    }),
  },
];
