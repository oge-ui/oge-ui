import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeChart,
  OgePieChart,
  OgePolarChart,
  type OgeChartAxisOptions,
  type OgeChartHandle,
  type OgeChartLabelOptions,
  type OgeChartRange,
  type OgeChartSeriesInput,
  type OgePieSeriesInput,
} from '@oge-ui/react-charts';
import { DemoCard } from '../../shared/demo-card';
import { loadDocsPdfFont } from '../../shared/pdf-font';
import { ReactHost } from '../../shared/react-host';
import { CHARTS_ANALYTICS_DEMOS } from './analytics-snippets';

/** TOC entries of these sections — the Angular page's, verbatim. */
export const REACT_CHARTS_ANALYTICS_SECTIONS = [
  'Data labels',
  'Trendlines & indicators',
  'Waterfall & Pareto',
  'Box plot & histogram',
  'Export & print',
] as const;

/* ------------------------------------------------------------------ */
/* data — identical to the Angular page's                              */
/* ------------------------------------------------------------------ */

interface SalesRow {
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
  format: (info) => `${Math.round((info.percent ?? 0) * 100)}%`,
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
    label: { visible: true, format: (info) => `${info.value}%` },
  },
];

const prices = Array.from({ length: 60 }, (_, i) => {
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
];

const cashFlow = [
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
    labelFormat: (value) => `${String(value)}%`,
  },
];

const latency = ['API', 'Web', 'Worker', 'DB'].map((service, s) => ({
  service,
  samples: Array.from(
    { length: 40 },
    (_, i) => 20 + s * 12 + ((i * 37) % 29) + (i % 13 === 0 ? 55 : 0),
  ),
}));
const latencySeries: OgeChartSeriesInput[] = [
  {
    type: 'boxPlot',
    argumentField: 'service',
    valuesField: 'samples',
    name: 'Latency',
  },
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
];

const energy = [
  { month: 'Jan', solar: 12, wind: 30, hydro: 18 },
  { month: 'Feb', solar: 16, wind: 27, hydro: 17 },
  { month: 'Mar', solar: 24, wind: 25, hydro: 20 },
  { month: 'Apr', solar: 31, wind: 22, hydro: 22 },
  { month: 'May', solar: 38, wind: 18, hydro: 24 },
  { month: 'Jun', solar: 42, wind: 16, hydro: 21 },
];
const energySeries: OgeChartSeriesInput[] = [
  {
    type: 'stackedSplineArea',
    argumentField: 'month',
    valueField: 'solar',
    name: 'Solar',
  },
  {
    type: 'stackedSplineArea',
    argumentField: 'month',
    valueField: 'wind',
    name: 'Wind',
  },
  {
    type: 'stackedSplineArea',
    argumentField: 'month',
    valueField: 'hydro',
    name: 'Hydro',
  },
];

const buttonClass =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800';

/* ------------------------------------------------------------------ */
/* demos                                                               */
/* ------------------------------------------------------------------ */

function DataLabelsDemo(): ReactNode {
  return createElement(
    'div',
    null,
    createElement(OgeChart<SalesRow>, {
      dataSource: sales,
      series: salesSeries,
      title: 'Sales vs target (k€)',
      style: { height: 320 },
    }),
    createElement(
      'div',
      { className: 'mt-4 grid gap-4 md:grid-cols-2' },
      createElement(OgePieChart<ChannelRow>, {
        dataSource: channels,
        argumentField: 'channel',
        type: 'doughnut',
        innerRadius: 0.35,
        series: rings,
        label: percentLabels,
        title: 'Revenue by channel, 2025 → 2026',
        style: { height: 320 },
      }),
      createElement(OgePolarChart, {
        dataSource: goals,
        series: goalSeries,
        valueAxis: { max: 100 },
        title: 'Sprint goals done',
        style: { height: 320 },
      }),
    ),
  );
}

function IndicatorsDemo(): ReactNode {
  const [range, setRange] = useState<OgeChartRange | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeChart, {
      dataSource: prices,
      series: priceSeries,
      visualRange: range,
      onVisualRangeChange: setRange,
      zoomEnabled: 'wheel',
      tooltip: { shared: true },
      style: { height: 320 },
    }),
    createElement(OgeChart, {
      dataSource: prices,
      series: rsiSeries,
      visualRange: range,
      onVisualRangeChange: setRange,
      valueAxis: { min: 0, max: 100 },
      legend: { visible: false },
      style: { height: 150 },
    }),
    createElement(OgeChart, {
      dataSource: campaigns,
      series: campaignSeries,
      argumentAxis: { title: 'Ad spend (k€)' },
      valueAxis: { title: 'Revenue (k€)' },
      style: { height: 300 },
    }),
  );
}

function ExportDemo(): ReactNode {
  const chart = useRef<OgeChartHandle>(null);
  const exportPng = async (): Promise<void> => {
    const { exportChartToPng } =
      await import('@oge-ui/react-charts/export-image');
    if (chart.current) {
      await exportChartToPng(chart.current, { filename: 'energy.png' });
    }
  };
  const exportJpeg = async (): Promise<void> => {
    const { exportChartToJpeg } =
      await import('@oge-ui/react-charts/export-image');
    if (chart.current) {
      await exportChartToJpeg(chart.current, {
        filename: 'energy.jpeg',
        quality: 0.9,
      });
    }
  };
  const exportPdf = async (): Promise<void> => {
    await loadDocsPdfFont();
    const { exportChartToPdf } =
      await import('@oge-ui/react-charts/export-pdf');
    if (chart.current) {
      await exportChartToPdf(chart.current, {
        filename: 'energy.pdf',
        title: 'Energy mix',
        subtitle: 'Generation by source, GWh',
      });
    }
  };
  const button = (label: string, onClick: () => void): ReactNode =>
    createElement(
      'button',
      { type: 'button', className: buttonClass, onClick },
      label,
    );
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap gap-2' },
      button('PNG', () => void exportPng()),
      button('JPEG', () => void exportJpeg()),
      button('PDF', () => void exportPdf()),
      button('Print', () => void chart.current?.print()),
    ),
    createElement(OgeChart, {
      ref: chart,
      dataSource: energy,
      series: energySeries,
      title: 'Energy mix (GWh)',
      style: { height: 340 },
    }),
  );
}

/**
 * The React half of the charts "depth" sections — the same five demos as
 * `../charts/analytics-demos.ts`, with the same data and options, rendered
 * as real React trees inside `/components/charts` when the reader has chosen
 * React (ADR 0002). The chart styles arrive with
 * `ReactChartsOverviewDemos`, which always renders right above.
 */
@Component({
  selector: 'app-react-charts-analytics-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-demo-card
      [chips]="[
        'label positions',
        'customizePoint',
        'nested doughnut',
        'radialBar',
      ]"
      heading="Data labels"
      description="Data labels on any series — <code>position</code> outside, inside, center, insideEnd or insideBase (inside labels pick a contrasting text colour), <code>format</code>, <code>showForZero</code> and overlap resolution (<code>hide</code> / <code>shift</code> / <code>none</code>), always clipped to the plot. <code>customizePoint</code> colours the regions below target red and says so in the tooltip and the screen-reader table. The nested doughnut draws one ring per <code>series</code> entry; radial bars draw one ring per category; <code>renderLabel</code> swaps in custom label markup."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="dataLabels" />
    </app-demo-card>

    <app-demo-card
      [chips]="['Bollinger', 'EMA', 'RSI', 'linear trendline', 'R²']"
      heading="Trendlines & indicators"
      description="<code>type: 'indicator'</code> series compute SMA, EMA, Bollinger Bands, MACD or RSI from the close prices — the same pure <code>ogeSma</code>/<code>ogeEma</code>/<code>ogeBollingerBands</code>/<code>ogeMacd</code>/<code>ogeRsi</code> you can import. The RSI chart below shares the zoom window (wheel over the price chart). <code>trendline</code> fits linear, exponential, logarithmic, polynomial or moving-average lines; <code>showR2</code> adds the fit to the tooltip."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="indicators" />
    </app-demo-card>

    <app-demo-card
      [chips]="['waterfall', 'subtotals', 'pareto', 'cumulative %']"
      heading="Waterfall & Pareto"
      description="<code>waterfall</code> floats each delta from the running total; <code>summaryField</code> marks intermediate subtotals and the total. Rising, falling and sum bars colour by kind with dashed connectors, and the screen-reader table says <em>increase</em>, <em>decrease</em> or <em>total</em>. <code>pareto</code> sorts the bars by value and runs a cumulative-% line over them on a second value axis."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="waterfall" />
    </app-demo-card>

    <app-demo-card
      [chips]="['boxPlot', 'Tukey whiskers', 'outliers', 'histogram', 'bins']"
      heading="Box plot & histogram"
      description="<code>boxPlot</code> computes quartiles, Tukey whiskers (1.5 × IQR) and outlier dots from raw samples — or reads precomputed <code>q1Field</code>/<code>medianField</code>/<code>q3Field</code>. <code>histogram</code> bins the values by <code>count</code>, <code>width</code> or <code>thresholds</code>; the tooltip reads the bin range."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="distributions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['PNG', 'JPEG', 'PDF', 'print()', 'stackedSplineArea']"
      heading="Export & print"
      description="No chart library involved: PNG and JPEG rasterize the live SVG with its styles inlined, <code>&#64;oge-ui/react-charts/export-pdf</code> embeds that image under a real-text title in a jsPDF page (an optional peer — the docs register Noto Sans through <code>setOgePdfDefaultFont()</code>, so Turkish titles work), and the handle's <code>print()</code> opens the browser dialog for the chart alone. The chart itself is a <code>stackedSplineArea</code>."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="exportDemo" />
    </app-demo-card>
  `,
})
export class ReactChartsAnalyticsDemos {
  protected readonly demos = CHARTS_ANALYTICS_DEMOS;

  protected readonly dataLabels = () => createElement(DataLabelsDemo);
  protected readonly indicators = () => createElement(IndicatorsDemo);
  protected readonly waterfall = () =>
    createElement(
      'div',
      null,
      createElement(OgeChart, {
        dataSource: cashFlow,
        series: cashSeries,
        legend: { visible: false },
        title: 'Cash flow (k€)',
        style: { height: 320 },
      }),
      createElement(OgeChart, {
        dataSource: defects,
        series: defectSeries,
        valueAxis: paretoAxes,
        title: 'Defects by cause',
        style: { height: 320 },
      }),
    );
  protected readonly distributions = () =>
    createElement(
      'div',
      null,
      createElement(OgeChart, {
        dataSource: latency,
        series: latencySeries,
        valueAxis: { title: 'ms' },
        title: 'Response time by service',
        style: { height: 320 },
      }),
      createElement(OgeChart, {
        dataSource: heights,
        series: heightSeries,
        argumentAxis: { title: 'Height (cm)' },
        title: 'Height distribution',
        style: { height: 300 },
      }),
    );
  protected readonly exportDemo = () => createElement(ExportDemo);
}
