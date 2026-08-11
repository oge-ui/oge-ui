import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeChart,
  OgePieChart,
  OgePolarChart,
  OgeRangeSelector,
  type OgeChartAnnotation,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartRange,
  type OgeChartSeriesInput,
  type OgeChartStripLine,
} from '@oge-ui/charts';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  ANNOTATIONS_SNIPPET,
  EVENTS_EXPORT_SNIPPET,
  FINANCIAL_SNIPPET,
  GETTING_STARTED_SNIPPET,
  PIE_SNIPPET,
  POLAR_SNIPPET,
  RANGE_SELECTOR_SNIPPET,
  SERIES_TYPES_SNIPPET,
  STACKS_SNIPPET,
  TIME_AXIS_SNIPPET,
  ZOOM_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
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

@Component({
  selector: 'app-charts-overview',
  imports: [
    DemoCard,
    DocHeader,
    OgeChart,
    OgePieChart,
    OgePolarChart,
    OgeRangeSelector,
    PageToc,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Charts"
      category="Charts"
      categoryLink="/components/charts"
      [chips]="[
        '11 series types',
        'time & log axes',
        'zoom & pan',
        'crosshair',
        'dependency-free SVG',
      ]"
    >
      <p>
        Data visualization on a dependency-free SVG kernel — no D3, no Chart.js,
        no canvas library. Eleven cartesian series types
        (line/spline/area/spline-area/stacked-area/bar/stacked/full-stacked/
        scatter/range-area/candlestick) plus pie and doughnut share pure engines
        for 1-2-5 nice-tick scales, calendar-true time axes, log axes, stacking
        with separate negative branches and single-path rendering that stays
        fluid at 10k+ points. Wheel and drag-select zoom (cursor-centered,
        Escape resets), crosshair, shared tooltips, an interactive legend and
        point/series selection are built in. No WAI-ARIA APG chart pattern
        exists, so the widget composes:
        <code>role="img"</code> with a generated label, a screen-reader-only
        data table, real legend buttons, and
        <strong>keyboard point inspection</strong> — arrows walk arguments and
        series with polite live-region announcements.
      </p>
      <p>
        <code>&#64;oge-ui/charts</code> is a commercial package — free for
        evaluation and development, with no watermark and no runtime license
        checks. See
        <a routerLink="/license" class="text-indigo-600 dark:text-indigo-400"
          >licensing</a
        >
        for the terms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['auto axes', 'legend', 'tooltip', 'crosshair']"
      heading="Getting started"
      description="One element, a working chart: the category axis auto-detects from the string arguments, the value axis picks nice ticks, the legend toggles series, and hovering shows the crosshair and tooltip."
      [code]="gettingStartedSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="basicData"
        [series]="basicSeries"
        title="Quarterly revenue"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['spline', 'splineArea', 'scatter', 'commonSeries']"
      heading="Series types"
      description="Eleven series types share one kernel: splines are Catmull-Rom curves, areas fill to the zero line, scatter renders markers only — and null values become gaps rather than fake zeros. <code>commonSeries</code> sets shared defaults."
      [code]="seriesTypesSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="mixData"
        [series]="mixSeries"
        [commonSeries]="{ argumentField: 'day' }"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['time axis', 'Intl labels', 'stripLines']"
      heading="Time axis & strip lines"
      description="Date arguments auto-detect the time axis: ticks are calendar-true (real month boundaries, DST-safe) and labels format through <code>Intl</code> in your locale. <code>stripLines</code> mark a deadline (line) or a window (band)."
      [code]="timeAxisSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="timeData"
        [series]="timeSeries"
        [stripLines]="timeStripLines"
        [argumentAxis]="{ grid: true }"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['stackedBar', 'negative stacks', 'stack groups']"
      heading="Stacked series"
      description="<code>stackedBar</code> accumulates per argument with negatives stacking downward separately; <code>fullStackedBar</code> normalizes each argument to 100%; the <code>stack</code> option splits independent groups."
      [code]="stacksSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="stackData"
        [series]="stackSeries"
        [commonSeries]="{ argumentField: 'month' }"
        [valueAxis]="{ abbreviate: false }"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['5000 points', 'wheel zoom', 'drag-select', 'shared tooltip']"
      heading="Zoom, pan & tooltips"
      description="5000 points stay fluid: one SVG path per series, binary-search hit-testing and rAF-coalesced pointer work. Wheel zooms around the cursor, dragging selects a range, Shift+drag pans, Escape resets — <code>[(visualRange)]</code> is two-way and shared tooltips list every series at the hovered argument."
      [code]="zoomSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="perfData"
        [series]="perfSeries"
        [(visualRange)]="perfRange"
        zoomEnabled="both"
        [panEnabled]="true"
        [tooltip]="{ shared: true }"
        [crosshair]="{ horizontal: true }"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['candlestick', 'OHLC', 'multi value axes']"
      heading="Candlestick & multi-axis"
      description="Candlesticks read OHLC fields; a second value axis (<code>position: 'end'</code>) carries the volume bars so the two scales stay independent. Rising/falling bodies color via the theme tokens."
      [code]="financialSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="ohlcData"
        [series]="ohlcSeries"
        [valueAxis]="[{ title: 'Price' }, { position: 'end', title: 'Volume' }]"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['doughnut', 'smallValuesGrouping', 'explode']"
      heading="Pie & doughnut"
      description='Pie and doughnut share the kernel: outside labels with connector lines, small-value grouping folds the tail into an "Others" slice, and clicking a slice (or its legend button) selects and explodes it.'
      [code]="pieSnippet"
      language="ts"
    >
      <oge-pie-chart
        [dataSource]="pieData"
        argumentField="browser"
        valueField="share"
        type="doughnut"
        [innerRadius]="0.55"
        [smallValuesGrouping]="{ mode: 'topN', topCount: 4 }"
        title="Browser share"
        style="height: 360px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['radar', 'spider grid', 'polar bar']"
      heading="Polar & radar"
      description="Radar/polar on the same kernel: categories slot around the circle, values map radially with nice-tick rings. <code>line</code>/<code>area</code> draw closed radar loops (a null value breaks the loop into a gap), <code>scatter</code> renders markers, <code>bar</code> renders sectors — and <code>spider</code> swaps circular rings for polygons."
      [code]="polarSnippet"
      language="ts"
    >
      <oge-polar-chart
        [dataSource]="polarData"
        [series]="polarSeries"
        [commonSeries]="{ argumentField: 'skill' }"
        [spider]="true"
        title="Team skills"
        style="height: 400px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['point annotations', 'text annotations', 'template']"
      heading="Annotations"
      description="Annotations anchor on the plot: <code>point</code> draws a marker dot with a connector into a label box at (argument, value); <code>text</code> places the label alone. <code>*ogeChartAnnotationTemplate</code> swaps in arbitrary HTML."
      [code]="annotationsSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="annoData"
        [series]="annoSeries"
        [annotations]="annotations"
        style="height: 380px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['overview strip', '[(value)]', 'slider handles']"
      heading="Range selector"
      description="The overview strip: a mini background chart with a draggable window and two WAI-ARIA slider handles (arrows adjust, Home/End jump, Escape mid-drag restores). Bound to the chart's <code>[(visualRange)]</code>, the two stay in lockstep — drag the window and the chart zooms."
      [code]="rangeSelectorSnippet"
      language="ts"
    >
      <oge-chart
        [dataSource]="rangeData"
        [series]="rangeSeries"
        [(visualRange)]="linkedRange"
        zoomEnabled="both"
        style="height: 300px"
      />
      <oge-range-selector
        [dataSource]="rangeData"
        [series]="rangeMiniSeries"
        [(value)]="linkedRange"
        style="display: block; margin-top: 8px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectionMode', 'locale', 'export-image', 'PNG/SVG']"
      heading="Selection, i18n & export"
      description='<code>selectionMode="point"</code> rings clicked points (Ctrl adds to the set). Every user-facing string, aria labels included, lives in <code>OgeChartsMessages</code> (<code>provideOgeChartsConfig()</code>, <code>locale</code>). The dependency-free <code>&#64;oge-ui/charts/export-image</code> entry serializes the live SVG with inlined styles — PNG via canvas rasterization, or the standalone <code>.svg</code> itself.'
      [code]="eventsExportSnippet"
      language="ts"
    >
      <div class="mb-2 flex gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          (click)="exportPng(chart)"
        >
          Export PNG
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          (click)="exportSvg(chart)"
        >
          Export SVG
        </button>
      </div>
      <oge-chart
        #chart
        [dataSource]="selectData"
        [series]="selectSeries"
        selectionMode="point"
        [(selectedPoints)]="selected"
        locale="de"
        (pointClick)="lastPoint = $event"
        style="height: 340px"
      />
    </app-demo-card>
  `,
})
export class ChartsOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly seriesTypesSnippet = SERIES_TYPES_SNIPPET;
  protected readonly timeAxisSnippet = TIME_AXIS_SNIPPET;
  protected readonly stacksSnippet = STACKS_SNIPPET;
  protected readonly zoomSnippet = ZOOM_SNIPPET;
  protected readonly financialSnippet = FINANCIAL_SNIPPET;
  protected readonly pieSnippet = PIE_SNIPPET;
  protected readonly polarSnippet = POLAR_SNIPPET;
  protected readonly annotationsSnippet = ANNOTATIONS_SNIPPET;
  protected readonly rangeSelectorSnippet = RANGE_SELECTOR_SNIPPET;
  protected readonly eventsExportSnippet = EVENTS_EXPORT_SNIPPET;

  protected readonly basicData = [
    { quarter: 'Q1', product: 120, services: 60 },
    { quarter: 'Q2', product: 150, services: 74 },
    { quarter: 'Q3', product: 138, services: 90 },
    { quarter: 'Q4', product: 190, services: 105 },
  ];
  protected readonly basicSeries: OgeChartSeriesInput[] = [
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

  protected readonly mixData = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    smooth: Math.sin(i / 2) * 30 + 60,
    band: Math.sin(i / 2) * 20 + 40,
    dots: Math.cos(i / 1.5) * 25 + 55,
  }));
  protected readonly mixSeries: OgeChartSeriesInput[] = [
    { type: 'splineArea', valueField: 'band', name: 'Range', opacity: 0.8 },
    { type: 'spline', valueField: 'smooth', name: 'Trend', width: 3 },
    { type: 'scatter', valueField: 'dots', name: 'Samples' },
  ];

  protected readonly timeData = Array.from({ length: 120 }, (_, i) => ({
    date: new Date(2026, 0, 1 + i),
    visitors: 400 + Math.sin(i / 9) * 150 + (i % 17) * 8,
  }));
  protected readonly timeSeries: OgeChartSeriesInput[] = [
    {
      type: 'area',
      argumentField: 'date',
      valueField: 'visitors',
      name: 'Visitors',
    },
  ];
  protected readonly timeStripLines: OgeChartStripLine[] = [
    {
      start: new Date(2026, 2, 1),
      end: new Date(2026, 2, 15),
      label: 'Campaign',
    },
    { start: new Date(2026, 3, 10), label: 'Release', color: '#dc2626' },
  ];

  protected readonly stackData = [
    { month: 'Jan', on: 40, off: 24, refunds: -6 },
    { month: 'Feb', on: 52, off: 28, refunds: -4 },
    { month: 'Mar', on: 47, off: 35, refunds: -9 },
    { month: 'Apr', on: 61, off: 31, refunds: -5 },
  ];
  protected readonly stackSeries: OgeChartSeriesInput[] = [
    { type: 'stackedBar', valueField: 'on', name: 'Online' },
    { type: 'stackedBar', valueField: 'off', name: 'Retail' },
    { type: 'stackedBar', valueField: 'refunds', name: 'Refunds' },
  ];

  protected readonly perfRange = signal<OgeChartRange | null>(null);
  protected readonly perfData = Array.from({ length: 5000 }, (_, i) => ({
    t: new Date(2026, 0, 1, 0, i * 15),
    cpu: 40 + Math.sin(i / 60) * 25 + (i % 13),
    memory: 55 + Math.cos(i / 90) * 18 + (i % 7),
  }));
  protected readonly perfSeries: OgeChartSeriesInput[] = [
    { type: 'line', argumentField: 't', valueField: 'cpu', name: 'CPU' },
    { type: 'line', argumentField: 't', valueField: 'memory', name: 'Memory' },
  ];

  protected readonly ohlcData = Array.from({ length: 30 }, (_, i) => {
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
  protected readonly ohlcSeries: OgeChartSeriesInput[] = [
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

  protected readonly pieData = [
    { browser: 'Chrome', share: 62 },
    { browser: 'Safari', share: 20 },
    { browser: 'Edge', share: 6 },
    { browser: 'Firefox', share: 5 },
    { browser: 'Samsung', share: 3 },
    { browser: 'Opera', share: 2 },
    { browser: 'Other', share: 2 },
  ];

  protected readonly polarData = [
    { skill: 'TypeScript', ada: 9, grace: 7 },
    { skill: 'CSS', ada: 6, grace: 8 },
    { skill: 'SQL', ada: 7, grace: 5 },
    { skill: 'Rust', ada: 4, grace: 6 },
    { skill: 'Go', ada: 5, grace: 9 },
    { skill: 'Testing', ada: 8, grace: 7 },
  ];
  protected readonly polarSeries: OgeChartSeriesInput[] = [
    { type: 'area', valueField: 'ada', name: 'Ada' },
    { type: 'line', valueField: 'grace', name: 'Grace', width: 2.5 },
  ];

  protected readonly annoData = Array.from({ length: 40 }, (_, i) => ({
    day: i + 1,
    price: 80 + Math.sin(i / 5) * 20 + i / 2,
  }));
  protected readonly annoSeries: OgeChartSeriesInput[] = [
    {
      type: 'spline',
      argumentField: 'day',
      valueField: 'price',
      name: 'Price',
    },
  ];
  protected readonly annotations: OgeChartAnnotation[] = [
    { type: 'point', text: 'All-time high', argument: 34, value: 116.9 },
    {
      type: 'point',
      text: 'Correction',
      argument: 22,
      value: 76.1,
      offsetY: 24,
    },
    { type: 'text', text: 'Q1 guidance', argument: 8 },
  ];

  protected readonly linkedRange = signal<OgeChartRange | null>(null);
  protected readonly rangeData = Array.from({ length: 365 }, (_, i) => ({
    date: new Date(2026, 0, 1 + i),
    sales: 200 + Math.sin(i / 20) * 80 + (i % 11) * 6,
  }));
  protected readonly rangeSeries: OgeChartSeriesInput[] = [
    { type: 'line', argumentField: 'date', valueField: 'sales', name: 'Sales' },
  ];
  protected readonly rangeMiniSeries: OgeChartSeriesInput[] = [
    { type: 'area', argumentField: 'date', valueField: 'sales', name: 'Sales' },
  ];

  protected readonly selected = signal<readonly OgeChartPointRef[]>([]);
  protected lastPoint: OgeChartPointEvent<Record<string, unknown>> | null =
    null;
  protected readonly selectData = [
    { month: 'Jan', value: 12 },
    { month: 'Feb', value: 31 },
    { month: 'Mar', value: 24 },
    { month: 'Apr', value: 42 },
  ];
  protected readonly selectSeries: OgeChartSeriesInput[] = [
    {
      type: 'bar',
      argumentField: 'month',
      valueField: 'value',
      name: 'Value',
    },
  ];

  /** The exporter loads lazily and needs no third-party library at all. */
  protected async exportPng<T extends object>(
    chart: OgeChart<T>,
  ): Promise<void> {
    const { exportChartToPng } = await import('@oge-ui/charts/export-image');
    await exportChartToPng(chart, { filename: 'chart.png' });
  }

  protected async exportSvg<T extends object>(
    chart: OgeChart<T>,
  ): Promise<void> {
    const { exportChartToSvg } = await import('@oge-ui/charts/export-image');
    exportChartToSvg(chart, { filename: 'chart.svg' });
  }
}
