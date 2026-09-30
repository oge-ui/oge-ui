import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeChart,
  OgePieChart,
  OgePolarChart,
  OgeRangeSelector,
  type OgeChartAnnotation,
  type OgeChartHandle,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartRange,
  type OgeChartSeriesInput,
  type OgeChartStripLine,
} from '@oge-ui/react-charts';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { CHARTS_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same eleven sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_CHARTS_OVERVIEW_SECTIONS = [
  'Getting started',
  'Series types',
  'Time axis & strip lines',
  'Stacked series',
  'Zoom, pan & tooltips',
  'Candlestick & multi-axis',
  'Pie & doughnut',
  'Polar & radar',
  'Annotations',
  'Range selector',
  'Selection, i18n & export',
] as const;

/* ------------------------------------------------------------------ */
/* data — identical to the Angular page's                              */
/* ------------------------------------------------------------------ */

const basicData = [
  { quarter: 'Q1', product: 120, services: 60 },
  { quarter: 'Q2', product: 150, services: 74 },
  { quarter: 'Q3', product: 138, services: 90 },
  { quarter: 'Q4', product: 190, services: 105 },
];
const basicSeries: OgeChartSeriesInput[] = [
  {
    type: 'bar',
    argumentField: 'quarter',
    valueField: 'product',
    name: 'Product',
  },
  {
    type: 'line',
    argumentField: 'quarter',
    valueField: 'services',
    name: 'Services',
  },
];

const mixData = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  smooth: Math.sin(i / 2) * 30 + 60,
  lo: Math.sin(i / 2) * 12 + 22,
  hi: Math.sin(i / 2) * 12 + 42,
  dots: Math.cos(i / 1.5) * 25 + 55,
  weight: (i % 5) + 1,
}));
const mixSeries: OgeChartSeriesInput[] = [
  { type: 'rangeBar', value1Field: 'lo', value2Field: 'hi', name: 'Band' },
  { type: 'stepLine', valueField: 'smooth', name: 'Steps', width: 2.5 },
  {
    type: 'bubble',
    valueField: 'dots',
    sizeField: 'weight',
    name: 'Bubbles',
    opacity: 0.75,
  },
];

const timeData = Array.from({ length: 120 }, (_, i) => ({
  date: new Date(2026, 0, 1 + i),
  visitors: 400 + Math.sin(i / 9) * 150 + (i % 17) * 8,
}));
const timeSeries: OgeChartSeriesInput[] = [
  {
    type: 'area',
    argumentField: 'date',
    valueField: 'visitors',
    name: 'Visitors',
  },
];
const timeStripLines: OgeChartStripLine[] = [
  {
    start: new Date(2026, 2, 1),
    end: new Date(2026, 2, 15),
    label: 'Campaign',
  },
  { start: new Date(2026, 3, 10), label: 'Release', color: '#dc2626' },
];

const stackData = [
  { month: 'Jan', on: 40, off: 24, refunds: -6 },
  { month: 'Feb', on: 52, off: 28, refunds: -4 },
  { month: 'Mar', on: 47, off: 35, refunds: -9 },
  { month: 'Apr', on: 61, off: 31, refunds: -5 },
];
const stackSeries: OgeChartSeriesInput[] = [
  { type: 'stackedBar', valueField: 'on', name: 'Online' },
  { type: 'stackedBar', valueField: 'off', name: 'Retail' },
  { type: 'stackedBar', valueField: 'refunds', name: 'Refunds' },
];

const perfData = Array.from({ length: 50_000 }, (_, i) => ({
  t: new Date(2026, 0, 1, 0, i * 15),
  cpu: 40 + Math.sin(i / 60) * 25 + (i % 13),
  memory: 55 + Math.cos(i / 90) * 18 + (i % 7),
}));
const perfSeries: OgeChartSeriesInput[] = [
  { type: 'line', argumentField: 't', valueField: 'cpu', name: 'CPU' },
  { type: 'line', argumentField: 't', valueField: 'memory', name: 'Memory' },
];

const ohlcData = Array.from({ length: 30 }, (_, i) => {
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
const ohlcSeries: OgeChartSeriesInput[] = [
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
];

const pieData = [
  { browser: 'Chrome', share: 62 },
  { browser: 'Safari', share: 20 },
  { browser: 'Edge', share: 6 },
  { browser: 'Firefox', share: 5 },
  { browser: 'Samsung', share: 3 },
  { browser: 'Opera', share: 2 },
  { browser: 'Other', share: 2 },
];

const polarData = [
  { skill: 'TypeScript', ada: 9, grace: 7 },
  { skill: 'CSS', ada: 6, grace: 8 },
  { skill: 'SQL', ada: 7, grace: 5 },
  { skill: 'Rust', ada: 4, grace: 6 },
  { skill: 'Go', ada: 5, grace: 9 },
  { skill: 'Testing', ada: 8, grace: 7 },
];
const polarSeries: OgeChartSeriesInput[] = [
  { type: 'area', valueField: 'ada', name: 'Ada' },
  { type: 'line', valueField: 'grace', name: 'Grace', width: 2.5 },
];

const annoData = Array.from({ length: 40 }, (_, i) => ({
  day: i + 1,
  price: 80 + Math.sin(i / 5) * 20 + i / 2,
}));
const annoSeries: OgeChartSeriesInput[] = [
  { type: 'spline', argumentField: 'day', valueField: 'price', name: 'Price' },
];
const annotations: OgeChartAnnotation[] = [
  { type: 'point', text: 'All-time high', argument: 34, value: 116.9 },
  { type: 'point', text: 'Correction', argument: 22, value: 76.1, offsetY: 24 },
  { type: 'text', text: 'Q1 guidance', argument: 8 },
];

const rangeData = Array.from({ length: 365 }, (_, i) => ({
  date: new Date(2026, 0, 1 + i),
  sales: 200 + Math.sin(i / 20) * 80 + (i % 11) * 6,
}));
const rangeSeries: OgeChartSeriesInput[] = [
  { type: 'line', argumentField: 'date', valueField: 'sales', name: 'Sales' },
];
const rangeMiniSeries: OgeChartSeriesInput[] = [
  { type: 'area', argumentField: 'date', valueField: 'sales', name: 'Sales' },
];

const selectData = [
  { month: 'Jan', value: 12 },
  { month: 'Feb', value: 31 },
  { month: 'Mar', value: 24 },
  { month: 'Apr', value: 42 },
];
const selectSeries: OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'month', valueField: 'value', name: 'Value' },
];

/* ------------------------------------------------------------------ */
/* demos — real React components running the code the snippets show     */
/* ------------------------------------------------------------------ */

function ZoomDemo(): ReactNode {
  const [range, setRange] = useState<OgeChartRange | null>(null);
  return createElement(OgeChart, {
    dataSource: perfData,
    series: perfSeries,
    visualRange: range,
    onVisualRangeChange: setRange,
    zoomEnabled: 'both',
    panEnabled: true,
    tooltip: { shared: true },
    crosshair: { horizontal: true },
    style: { height: 380 },
  });
}

function RangeSelectorDemo(): ReactNode {
  const [range, setRange] = useState<OgeChartRange | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeChart, {
      dataSource: rangeData,
      series: rangeSeries,
      visualRange: range,
      onVisualRangeChange: setRange,
      zoomEnabled: 'both',
      style: { height: 300 },
    }),
    createElement(OgeRangeSelector, {
      dataSource: rangeData,
      series: rangeMiniSeries,
      value: range,
      onValueChange: setRange,
      style: { display: 'block', marginTop: 8 },
    }),
  );
}

const buttonClass =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800';

function SelectionDemo(): ReactNode {
  const chart = useRef<OgeChartHandle>(null);
  const [selected, setSelected] = useState<readonly OgeChartPointRef[]>([]);
  const lastPoint = useRef<OgeChartPointEvent | null>(null);
  const exportPng = async (): Promise<void> => {
    const { exportChartToPng } =
      await import('@oge-ui/react-charts/export-image');
    if (chart.current) {
      await exportChartToPng(chart.current, { filename: 'chart.png' });
    }
  };
  const exportSvg = async (): Promise<void> => {
    const { exportChartToSvg } =
      await import('@oge-ui/react-charts/export-image');
    if (chart.current) {
      exportChartToSvg(chart.current, { filename: 'chart.svg' });
    }
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex gap-2' },
      createElement(
        'button',
        {
          type: 'button',
          className: buttonClass,
          onClick: () => void exportPng(),
        },
        'Export PNG',
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: buttonClass,
          onClick: () => void exportSvg(),
        },
        'Export SVG',
      ),
    ),
    createElement(OgeChart, {
      ref: chart,
      dataSource: selectData,
      series: selectSeries,
      selectionMode: 'point',
      selectedPoints: selected,
      onSelectedPointsChange: setSelected,
      locale: 'de',
      onPointClick: (event: OgeChartPointEvent) => {
        lastPoint.current = event;
      },
      style: { height: 340 },
    }),
  );
}

/**
 * The React half of the charts overview — the same eleven demo sections as
 * the Angular page, with the same data and options, rendered as real React
 * trees inside `/components/charts` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-charts-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React charts carry the class names but no styles of their own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/charts/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['auto axes', 'legend', 'tooltip', 'crosshair']"
      heading="Getting started"
      description="One element, a working chart: the category axis auto-detects from the string arguments, the value axis picks nice ticks, the legend toggles series, and hovering shows the crosshair and tooltip."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['stepLine', 'bubble', 'rangeBar', 'showLabels']"
      heading="Series types"
      description="Sixteen series types share one kernel — line/spline/step lines, five area flavors, four bar flavors (incl. <code>rangeBar</code> spanning value1..value2), scatter, <code>bubble</code> (<code>sizeField</code> drives each bubble's area), rangeArea and candlestick. <code>showLabels</code> prints values next to small series, null values become gaps, and hovering a legend item spotlights its series."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="seriesTypes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['time axis', 'Intl labels', 'stripLines']"
      heading="Time axis & strip lines"
      description="Date arguments auto-detect the time axis: ticks are calendar-true (real month boundaries, DST-safe) and labels format through <code>Intl</code> in your locale. <code>stripLines</code> mark a deadline (line) or a window (band)."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="timeAxis" />
    </app-demo-card>

    <app-demo-card
      [chips]="['stackedBar', 'negative stacks', 'stack groups']"
      heading="Stacked series"
      description="<code>stackedBar</code> accumulates per argument with negatives stacking downward separately; <code>fullStackedBar</code> normalizes each argument to 100%; the <code>stack</code> option splits independent groups."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="stacks" />
    </app-demo-card>

    <app-demo-card
      [chips]="['50k points', 'LTTB downsampling', 'wheel zoom', 'drag-select']"
      heading="Zoom, pan & tooltips"
      description="50,000 points per series stay fluid: paths auto-downsample with <strong>LTTB</strong> (Largest-Triangle-Three-Buckets — peaks survive) to roughly one point per pixel, while hit-testing stays a binary search over the <em>full</em> data. Wheel zooms around the cursor, dragging selects a range, Shift+drag pans, Escape resets — <code>visualRange</code> + <code>onVisualRangeChange</code> are a controlled pair and shared tooltips list every series."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="zoom" />
    </app-demo-card>

    <app-demo-card
      [chips]="['candlestick', 'OHLC', 'multi value axes']"
      heading="Candlestick & multi-axis"
      description="Candlesticks read OHLC fields; a second value axis (<code>position: 'end'</code>) carries the volume bars so the two scales stay independent. Rising/falling bodies color via the theme tokens."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="financial" />
    </app-demo-card>

    <app-demo-card
      [chips]="['doughnut', 'smallValuesGrouping', 'explode']"
      heading="Pie & doughnut"
      description='Pie and doughnut share the kernel: outside labels with connector lines, small-value grouping folds the tail into an "Others" slice, and clicking a slice (or its legend button) selects and explodes it.'
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="pie" />
    </app-demo-card>

    <app-demo-card
      [chips]="['radar', 'spider grid', 'polar bar']"
      heading="Polar & radar"
      description="Radar/polar on the same kernel: categories slot around the circle, values map radially with nice-tick rings. <code>line</code>/<code>area</code> draw closed radar loops (a null value breaks the loop into a gap), <code>scatter</code> renders markers, <code>bar</code> renders sectors — and <code>spider</code> swaps circular rings for polygons."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="polar" />
    </app-demo-card>

    <app-demo-card
      [chips]="['point annotations', 'text annotations', 'render prop']"
      heading="Annotations"
      description="Annotations anchor on the plot: <code>point</code> draws a marker dot with a connector into a label box at (argument, value); <code>text</code> places the label alone. <code>renderAnnotation</code> swaps in arbitrary markup."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="annotationsDemo" />
    </app-demo-card>

    <app-demo-card
      [chips]="['overview strip', 'value / onValueChange', 'slider handles']"
      heading="Range selector"
      description="The overview strip: a mini background chart with a draggable window and two WAI-ARIA slider handles (arrows adjust, Home/End jump, Escape mid-drag restores). Sharing one state with the chart's <code>visualRange</code> keeps the two in lockstep — drag the window and the chart zooms."
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="rangeSelector" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectionMode', 'locale', 'export-image', 'PNG/SVG']"
      heading="Selection, i18n & export"
      description='<code>selectionMode="point"</code> rings clicked points (Ctrl adds to the set). Every user-facing string, aria labels included, lives in <code>OgeChartsMessages</code> (<code>&amp;lt;OgeChartsConfigProvider&amp;gt;</code>, <code>locale</code>). The dependency-free <code>&#64;oge-ui/react-charts/export-image</code> entry serializes the live SVG with inlined styles — PNG via canvas rasterization, or the standalone <code>.svg</code> itself.'
      [code]="demos[10].source"
      language="tsx"
    >
      <app-react-host [render]="selection" />
    </app-demo-card>
  `,
})
export class ReactChartsOverviewDemos {
  protected readonly demos = CHARTS_OVERVIEW_DEMOS;

  protected readonly gettingStarted = () =>
    createElement(OgeChart, {
      dataSource: basicData,
      series: basicSeries,
      title: 'Quarterly revenue',
      style: { height: 380 },
    });
  protected readonly seriesTypes = () =>
    createElement(OgeChart, {
      dataSource: mixData,
      series: mixSeries,
      commonSeries: { argumentField: 'day' },
      style: { height: 380 },
    });
  protected readonly timeAxis = () =>
    createElement(OgeChart, {
      dataSource: timeData,
      series: timeSeries,
      stripLines: timeStripLines,
      argumentAxis: { grid: true },
      style: { height: 380 },
    });
  protected readonly stacks = () =>
    createElement(OgeChart, {
      dataSource: stackData,
      series: stackSeries,
      commonSeries: { argumentField: 'month' },
      valueAxis: { abbreviate: false },
      style: { height: 380 },
    });
  protected readonly zoom = () => createElement(ZoomDemo);
  protected readonly financial = () =>
    createElement(OgeChart, {
      dataSource: ohlcData,
      series: ohlcSeries,
      valueAxis: [{ title: 'Price' }, { position: 'end', title: 'Volume' }],
      style: { height: 380 },
    });
  protected readonly pie = () =>
    createElement(OgePieChart, {
      dataSource: pieData,
      argumentField: 'browser',
      valueField: 'share',
      type: 'doughnut',
      innerRadius: 0.55,
      smallValuesGrouping: { mode: 'topN', topCount: 4 },
      title: 'Browser share',
      style: { height: 360 },
    });
  protected readonly polar = () =>
    createElement(OgePolarChart, {
      dataSource: polarData,
      series: polarSeries,
      commonSeries: { argumentField: 'skill' },
      spider: true,
      title: 'Team skills',
      style: { height: 400 },
    });
  protected readonly annotationsDemo = () =>
    createElement(OgeChart, {
      dataSource: annoData,
      series: annoSeries,
      annotations,
      style: { height: 380 },
    });
  protected readonly rangeSelector = () => createElement(RangeSelectorDemo);
  protected readonly selection = () => createElement(SelectionDemo);
}
