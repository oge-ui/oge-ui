import { demoSource } from '../../shared/demo-source';

export const ROTATED_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- rotated swaps the axes: the argument axis runs down the left,
     values grow to the right. Every series type follows — these
     stackedBar series become horizontal stacked bars — and so do the
     tooltip, crosshair, zoom and the keyboard (Up/Down walk the
     categories, Left/Right the series). -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [commonSeries]="{ argumentField: 'region' }"
  [rotated]="true"
  [tooltip]="{ shared: true }"
  [valueAxis]="{ title: 'Units sold', abbreviate: false }"
  style="height: 360px"
/>`,
  body: `protected readonly data = [
  { region: 'North', online: 420, retail: 310 },
  { region: 'East', online: 380, retail: 260 },
  { region: 'South', online: 290, retail: 340 },
  { region: 'West', online: 510, retail: 220 },
  { region: 'Central', online: 240, retail: 180 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'stackedBar', valueField: 'online', name: 'Online' },
  { type: 'stackedBar', valueField: 'retail', name: 'Retail' },
];`,
});

export const GUIDES_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: {
    '@oge-ui/charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'],
  },
  template: `<!-- constantLines draw a threshold at an axis value with a label
     (inside next to the line, or outside past the plot edge); strips shade
     a value band. Both work on the value AND the argument axis; labels
     never run off the plot. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [valueAxis]="valueAxis"
  [argumentAxis]="argumentAxis"
  style="height: 360px"
/>`,
  body: `protected readonly data = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
  (month, i) => ({ month, latency: 180 + Math.round(Math.sin(i / 1.7) * 70) + i * 4 }),
);

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'spline', argumentField: 'month', valueField: 'latency', name: 'p95 latency (ms)' },
];

protected readonly valueAxis: OgeChartAxisOptions = {
  constantLines: [
    { value: 250, label: 'SLO 250 ms', color: 'var(--oge-danger)', width: 2 },
    { value: 150, label: 'Goal', dash: 'dot', position: 'outside' },
  ],
  strips: [{ start: 100, end: 150, label: 'Comfort zone' }],
};

protected readonly argumentAxis: OgeChartAxisOptions = {
  constantLines: [{ value: 'Jun', label: 'Release 2.0', color: 'var(--oge-accent)', dash: 'solid' }],
  strips: [{ start: 'Sep', end: 'Oct', label: 'Freeze' }],
};`,
});

export const PANES_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart', 'OgeRangeSelector'] },
  types: {
    '@oge-ui/charts': [
      'OgeChartAxisOptions',
      'OgeChartPane',
      'OgeChartPeriod',
      'OgeChartRange',
      'OgeChartSeriesInput',
    ],
  },
  template: `<!-- panes stack plot areas over ONE shared argument axis: series and
     value axes pick theirs by name. The crosshair runs through every pane
     (its horizontal line stays in the hovered one) and zoom/pan move all of
     them. The range selector's period buttons set the same window. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [panes]="panes"
  [valueAxis]="valueAxes"
  [crosshair]="{ horizontal: true }"
  [tooltip]="{ shared: true }"
  [(visualRange)]="range"
  zoomEnabled="both"
  [panEnabled]="true"
  style="height: 420px"
/>
<oge-range-selector
  [dataSource]="data"
  [series]="navigator"
  [periods]="periods"
  [(value)]="range"
/>`,
  body: `protected readonly data = Array.from({ length: 260 }, (_, i) => {
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

protected readonly panes: OgeChartPane[] = [
  { name: 'price', height: 3 },
  { name: 'volume', height: 1 },
];

protected readonly valueAxes: OgeChartAxisOptions[] = [
  { pane: 'price', title: 'Price' },
  { pane: 'volume', title: 'Volume' },
];

protected readonly series: OgeChartSeriesInput[] = [
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

protected readonly navigator: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'day', valueField: 'close', name: 'Close' },
];

protected readonly periods: OgeChartPeriod[] = ['1M', '3M', '6M', 'YTD', '1Y', 'All'];
protected readonly range = signal<OgeChartRange | null>(null);`,
});

export const BREAKS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- One outlier would flatten every other bar. breaks skip a value
     range on a linear value axis — the gap is drawn with a zig-zag marker
     and no tick lands inside it. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [valueAxis]="{ breaks: [{ start: 140, end: 940 }] }"
  style="height: 340px"
/>`,
  body: `protected readonly data = [
  { team: 'Search', tickets: 84 },
  { team: 'Billing', tickets: 112 },
  { team: 'Platform', tickets: 1010 },
  { team: 'Mobile', tickets: 96 },
  { team: 'Data', tickets: 61 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'team', valueField: 'tickets', name: 'Open tickets', showLabels: true },
];`,
});

export const TICKS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: {
    '@oge-ui/charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'],
  },
  template: `<!-- tickInterval fixes the tick distance — a number in axis units or a
     calendar interval such as { weeks: 1 }; minorTicks adds the ticks (and
     grid lines) in between; allowDecimals: false keeps whole numbers.
     label.format takes Intl options (or a function), label.template wraps
     the text and label.overlap picks rotate / stagger / hide / skip. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [argumentAxis]="argumentAxis"
  [valueAxis]="valueAxis"
  style="height: 340px"
/>`,
  body: `protected readonly data = Array.from({ length: 70 }, (_, i) => ({
  day: new Date(2026, 2, 2 + i),
  temperature: 9 + Math.round(Math.sin(i / 9) * 5 + i / 8),
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'stepLine', argumentField: 'day', valueField: 'temperature', name: 'Daily high' },
];

protected readonly argumentAxis: OgeChartAxisOptions = {
  tickInterval: { weeks: 1 },
  minorTicks: { count: 6 },
  grid: true,
  label: { format: { day: 'numeric', month: 'short' }, overlap: 'stagger' },
};

protected readonly valueAxis: OgeChartAxisOptions = {
  allowDecimals: false,
  tickInterval: 2,
  label: { template: '{value} °C' },
};`,
});

export const RTL_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: { '@oge-ui/charts': ['OgeChartSeriesInput'] },
  template: `<!-- rtlEnabled (unset = follow the page's dir) mirrors the argument
     axis, moves the value axis to the right, flips the legend and the
     tooltip side and swaps the Left/Right arrow keys. On touch screens two
     fingers pinch-zoom and pan the plot; one finger pans when panEnabled is
     on, otherwise it drag-zooms. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [rtlEnabled]="true"
  zoomEnabled="both"
  [panEnabled]="true"
  [legend]="{ position: 'top' }"
  style="height: 340px"
/>`,
  body: `protected readonly data = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  visits: 400 + Math.round(Math.sin(i / 3) * 120 + i * 8),
  orders: 60 + Math.round(Math.cos(i / 4) * 20 + i * 2),
}));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'day', valueField: 'visits', name: 'Visits' },
  { type: 'line', argumentField: 'day', valueField: 'orders', name: 'Orders' },
];`,
});

export const ANIMATION_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: {
    '@oge-ui/charts': ['OgeChartAnimationOptions', 'OgeChartSeriesInput'],
  },
  template: `<!-- The first render draws each series in from its value baseline:
     bars grow, lines rise. animation takes true / false or { enabled,
     duration, easing }; prefers-reduced-motion always switches it off. -->
<button type="button" (click)="replay()">Replay</button>
@if (visible()) {
  <oge-chart
    [dataSource]="data"
    [series]="series"
    [animation]="animation"
    style="height: 320px"
  />
}`,
  body: `protected readonly data = [
  { quarter: 'Q1', revenue: 120, cost: 80 },
  { quarter: 'Q2', revenue: 150, cost: 92 },
  { quarter: 'Q3', revenue: 138, cost: 101 },
  { quarter: 'Q4', revenue: 190, cost: 110 },
];

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'quarter', valueField: 'revenue', name: 'Revenue' },
  { type: 'spline', argumentField: 'quarter', valueField: 'cost', name: 'Cost' },
];

protected readonly animation: OgeChartAnimationOptions = { duration: 1100, easing: 'easeInOut' };
protected readonly visible = signal(true);

/** Re-mounting the chart plays the draw-in again. */
protected replay(): void {
  this.visible.set(false);
  setTimeout(() => this.visible.set(true));
}`,
});

export const ROTATED_LABELS_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeChart'] },
  types: {
    '@oge-ui/charts': ['OgeChartAxisOptions', 'OgeChartSeriesInput'],
  },
  template: `<!-- Down a vertical axis, labels collide by their height. The chart
     measures every label in its own svg: a name wider than the side band
     wraps (up to three lines, centred on its bar) and label.overlap then
     works on the real boxes — 'hide' keeps the labels that clear each
     other, 'skip' thins by the tallest one, 'stagger' alternates two
     columns. -->
<oge-chart
  [dataSource]="data"
  [series]="series"
  [rotated]="true"
  [argumentAxis]="argumentAxis"
  style="height: 320px"
/>`,
  body: `protected readonly data = [
  'Enterprise support renewals (annual)',
  'Cloud storage',
  'Professional services and onboarding',
  'Mobile',
  'Hardware leasing',
  'Training and certification programmes',
  'Analytics add-on',
  'Marketplace commissions from partners',
  'Consulting',
  'Premium SLA upgrades for regulated industries',
  'API usage',
  'Desktop licences',
  'Security audits',
  'Data migration packages',
  'Custom integrations',
  'Community edition sponsorships',
  'Managed backups',
  'Developer seats',
].map((product, i) => ({ product, revenue: 40 + ((i * 37) % 90) }));

protected readonly series: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'product', valueField: 'revenue', name: 'Revenue (k€)' },
];

protected readonly argumentAxis: OgeChartAxisOptions = {
  label: { overlap: 'hide' },
};`,
});
