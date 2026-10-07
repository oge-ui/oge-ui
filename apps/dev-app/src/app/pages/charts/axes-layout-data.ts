// Data + options of the "Axes & layout" demos, shared by the Angular page and
// its React twin (`../react-charts/axes-layout.ts`) so both render the same
// charts. Mirrors `axes-layout-snippets.ts` value for value.
import type {
  OgeChartAnimationOptions,
  OgeChartAxisOptions,
  OgeChartPane,
  OgeChartPeriod,
  OgeChartSeriesInput,
} from '@oge-ui/charts';

export const ROTATED_DATA = [
  { region: 'North', online: 420, retail: 310 },
  { region: 'East', online: 380, retail: 260 },
  { region: 'South', online: 290, retail: 340 },
  { region: 'West', online: 510, retail: 220 },
  { region: 'Central', online: 240, retail: 180 },
];
export const ROTATED_SERIES: OgeChartSeriesInput[] = [
  { type: 'stackedBar', valueField: 'online', name: 'Online' },
  { type: 'stackedBar', valueField: 'retail', name: 'Retail' },
];
export const ROTATED_VALUE_AXIS: OgeChartAxisOptions = {
  title: 'Units sold',
  abbreviate: false,
};

export const GUIDES_DATA = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
].map((month, i) => ({
  month,
  latency: 180 + Math.round(Math.sin(i / 1.7) * 70) + i * 4,
}));
export const GUIDES_SERIES: OgeChartSeriesInput[] = [
  {
    type: 'spline',
    argumentField: 'month',
    valueField: 'latency',
    name: 'p95 latency (ms)',
  },
];
export const GUIDES_VALUE_AXIS: OgeChartAxisOptions = {
  constantLines: [
    { value: 250, label: 'SLO 250 ms', color: 'var(--oge-danger)', width: 2 },
    { value: 150, label: 'Goal', dash: 'dot', position: 'outside' },
  ],
  strips: [{ start: 100, end: 150, label: 'Comfort zone' }],
};
export const GUIDES_ARGUMENT_AXIS: OgeChartAxisOptions = {
  constantLines: [
    {
      value: 'Jun',
      label: 'Release 2.0',
      color: 'var(--oge-accent)',
      dash: 'solid',
    },
  ],
  strips: [{ start: 'Sep', end: 'Oct', label: 'Freeze' }],
};

export const STOCK_DATA = Array.from({ length: 260 }, (_, i) => {
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
export const STOCK_PANES: OgeChartPane[] = [
  { name: 'price', height: 3 },
  { name: 'volume', height: 1 },
];
export const STOCK_VALUE_AXES: OgeChartAxisOptions[] = [
  { pane: 'price', title: 'Price' },
  { pane: 'volume', title: 'Volume' },
];
export const STOCK_SERIES: OgeChartSeriesInput[] = [
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
  {
    type: 'bar',
    argumentField: 'day',
    valueField: 'volume',
    name: 'Volume',
    pane: 'volume',
    opacity: 0.6,
  },
];
export const STOCK_NAVIGATOR: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'day', valueField: 'close', name: 'Close' },
];
export const STOCK_PERIODS: OgeChartPeriod[] = [
  '1M',
  '3M',
  '6M',
  'YTD',
  '1Y',
  'All',
];

export const BREAKS_DATA = [
  { team: 'Search', tickets: 84 },
  { team: 'Billing', tickets: 112 },
  { team: 'Platform', tickets: 1010 },
  { team: 'Mobile', tickets: 96 },
  { team: 'Data', tickets: 61 },
];
export const BREAKS_SERIES: OgeChartSeriesInput[] = [
  {
    type: 'bar',
    argumentField: 'team',
    valueField: 'tickets',
    name: 'Open tickets',
    showLabels: true,
  },
];
export const BREAKS_VALUE_AXIS: OgeChartAxisOptions = {
  breaks: [{ start: 140, end: 940 }],
};

export const TICKS_DATA = Array.from({ length: 70 }, (_, i) => ({
  day: new Date(2026, 2, 2 + i),
  temperature: 9 + Math.round(Math.sin(i / 9) * 5 + i / 8),
}));
export const TICKS_SERIES: OgeChartSeriesInput[] = [
  {
    type: 'stepLine',
    argumentField: 'day',
    valueField: 'temperature',
    name: 'Daily high',
  },
];
export const TICKS_ARGUMENT_AXIS: OgeChartAxisOptions = {
  tickInterval: { weeks: 1 },
  minorTicks: { count: 6 },
  grid: true,
  label: { format: { day: 'numeric', month: 'short' }, overlap: 'stagger' },
};
export const TICKS_VALUE_AXIS: OgeChartAxisOptions = {
  allowDecimals: false,
  tickInterval: 2,
  label: { template: '{value} °C' },
};

export const RTL_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  visits: 400 + Math.round(Math.sin(i / 3) * 120 + i * 8),
  orders: 60 + Math.round(Math.cos(i / 4) * 20 + i * 2),
}));
export const RTL_SERIES: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'day', valueField: 'visits', name: 'Visits' },
  { type: 'line', argumentField: 'day', valueField: 'orders', name: 'Orders' },
];

export const ANIMATION_DATA = [
  { quarter: 'Q1', revenue: 120, cost: 80 },
  { quarter: 'Q2', revenue: 150, cost: 92 },
  { quarter: 'Q3', revenue: 138, cost: 101 },
  { quarter: 'Q4', revenue: 190, cost: 110 },
];
export const ANIMATION_SERIES: OgeChartSeriesInput[] = [
  {
    type: 'bar',
    argumentField: 'quarter',
    valueField: 'revenue',
    name: 'Revenue',
  },
  {
    type: 'spline',
    argumentField: 'quarter',
    valueField: 'cost',
    name: 'Cost',
  },
];
export const ANIMATION_OPTIONS: OgeChartAnimationOptions = {
  duration: 1100,
  easing: 'easeInOut',
};

export const ROTATED_LABELS_DATA = [
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
].map((product, i) => ({
  product,
  revenue: 40 + ((i * 37) % 90),
}));
export const ROTATED_LABELS_SERIES: OgeChartSeriesInput[] = [
  {
    type: 'bar',
    argumentField: 'product',
    valueField: 'revenue',
    name: 'Revenue (k€)',
  },
];
export const ROTATED_LABELS_ARGUMENT_AXIS: OgeChartAxisOptions = {
  label: { overlap: 'hide' },
};
