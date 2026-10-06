import { demoSource } from '../../shared/demo-source';

export const CIRCULAR_GAUGE_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeCircularGauge'] },
  types: { '@oge-ui/charts': ['OgeChartValueRange'] },
  template: `<!-- A dial: scale ticks and labels, coloured ranges, a needle (or a bar /
     marker indicator) and the value text. It is a role="meter": the value
     and the labelled range it falls in are spoken (aria-valuetext). The
     needle sweeps in on the first render and glides on every change —
     never under prefers-reduced-motion. -->
<div class="grid gap-3 sm:grid-cols-3">
  <oge-circular-gauge
    [value]="speed()"
    [scale]="{ min: 0, max: 160, tickInterval: 20 }"
    [ranges]="speedRanges"
    [valueFormat]="kmh"
    title="Speed"
    style="height: 240px"
  />
  <oge-circular-gauge
    [value]="cpu()"
    indicator="bar"
    [ranges]="cpuRanges"
    [startAngle]="-90"
    [endAngle]="90"
    [valueFormat]="percent"
    title="CPU"
    style="height: 240px"
  />
  <oge-circular-gauge
    [value]="cpu()"
    indicator="marker"
    [subvalues]="[40, 85]"
    [startAngle]="-135"
    [endAngle]="135"
    title="Load"
    style="height: 240px"
  />
</div>
<button type="button" (click)="randomize()">New reading</button>`,
  body: `protected readonly speed = signal(96);
protected readonly cpu = signal(64);

protected readonly speedRanges: OgeChartValueRange[] = [
  { start: 0, end: 90, label: 'Normal' },
  { start: 90, end: 120, label: 'Fast' },
  { start: 120, end: 160, label: 'Over the limit' },
];

protected readonly cpuRanges: OgeChartValueRange[] = [
  { start: 0, end: 70, color: 'var(--oge-success)', label: 'Healthy' },
  { start: 70, end: 90, color: 'var(--oge-warning)', label: 'Busy' },
  { start: 90, end: 100, color: 'var(--oge-danger)', label: 'Saturated' },
];

protected readonly kmh = (value: number) => \`\${Math.round(value)} km/h\`;
protected readonly percent = (value: number) => \`\${Math.round(value)}%\`;

protected randomize(): void {
  this.speed.set(Math.round(Math.random() * 160));
  this.cpu.set(Math.round(Math.random() * 100));
}`,
});

export const LINEAR_GAUGE_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeLinearGauge'] },
  types: { '@oge-ui/charts': ['OgeChartValueRange'] },
  template: `<!-- The same scale, ranges and meter semantics on a straight track:
     horizontal or vertical, a filling bar or a sliding marker, subvalue
     ticks, mirrored in right-to-left pages. -->
<oge-linear-gauge
  [value]="level"
  [ranges]="refill"
  [subvalues]="[25, 80]"
  [valueFormat]="litres"
  [scale]="{ min: 0, max: 100 }"
  title="Water tank"
/>
<oge-linear-gauge
  [value]="level"
  indicator="marker"
  orientation="vertical"
  title="Level"
  style="height: 260px; width: 140px"
/>`,
  body: `protected readonly level = 62;

protected readonly refill: OgeChartValueRange[] = [
  { start: 0, end: 15, color: 'var(--oge-danger)', label: 'Refill' },
];

protected readonly litres = (value: number) => \`\${value} L\`;`,
});

export const BULLET_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeBulletChart'] },
  types: { '@oge-ui/charts': ['OgeChartValueRange'] },
  template: `<!-- Stephen Few's bullet graph: qualitative bands (darkest = poor), the
     value bar and the target marker on one compact scale. The svg's label
     speaks value and target; the sr table lists the bands. -->
@for (row of rows; track row.kpi) {
  <oge-bullet-chart
    [value]="row.value"
    [target]="row.target"
    [ranges]="row.ranges"
    [title]="row.kpi"
  />
}`,
  body: `protected readonly rows: { kpi: string; value: number; target: number; ranges: OgeChartValueRange[] }[] = [
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
});

export const SPARKLINE_SNIPPET = demoSource({
  use: { '@oge-ui/charts/sparkline': ['OgeSparkline'] },
  template: `<!-- Word-sized charts for table cells and KPI tiles. The sparkline is its
     own entry point (@oge-ui/charts/sparkline) and never loads the
     cartesian chart. Its svg label summarizes the series: count, first,
     last, low and high. -->
<table>
  <thead>
    <tr><th>Symbol</th><th>Price</th><th>7 days</th><th>Trend</th><th>Up / down days</th></tr>
  </thead>
  <tbody>
    @for (row of rows; track row.symbol) {
      <tr>
        <td>{{ row.symbol }}</td>
        <td>{{ row.price }}</td>
        <td><oge-sparkline [dataSource]="row.week" [markers]="{ min: true, max: true }" [tooltipEnabled]="true" [title]="row.symbol" /></td>
        <td><oge-sparkline [dataSource]="row.week" type="area" [title]="row.symbol" /></td>
        <td><oge-sparkline [dataSource]="row.results" type="winloss" [title]="row.symbol" /></td>
      </tr>
    }
  </tbody>
</table>`,
  body: `protected readonly rows = [
  { symbol: 'ACME', price: 182.4, week: [171, 174, 173, 178, 176, 181, 182], results: [1, 1, -1, 1, -1, 1, 1] },
  { symbol: 'GLOBX', price: 64.1, week: [70, 69, 66, 67, 65, 63, 64], results: [-1, -1, -1, 1, -1, -1, 1] },
  { symbol: 'INITECH', price: 23.9, week: [22, 22.5, 23, 22.8, 23.4, 23.7, 23.9], results: [1, 1, 1, -1, 1, 1, 1] },
];`,
});
