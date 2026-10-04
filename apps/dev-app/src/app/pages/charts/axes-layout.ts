import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeChart, OgeRangeSelector, type OgeChartRange } from '@oge-ui/charts';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_CHARTS_AXES_LAYOUT_SECTIONS,
  ReactChartsAxesLayoutDemos,
} from '../react-charts/axes-layout';
import {
  ANIMATION_DATA,
  ANIMATION_OPTIONS,
  ANIMATION_SERIES,
  BREAKS_DATA,
  BREAKS_SERIES,
  BREAKS_VALUE_AXIS,
  GUIDES_ARGUMENT_AXIS,
  GUIDES_DATA,
  GUIDES_SERIES,
  GUIDES_VALUE_AXIS,
  ROTATED_DATA,
  ROTATED_SERIES,
  ROTATED_VALUE_AXIS,
  RTL_DATA,
  RTL_SERIES,
  STOCK_DATA,
  STOCK_NAVIGATOR,
  STOCK_PANES,
  STOCK_PERIODS,
  STOCK_SERIES,
  STOCK_VALUE_AXES,
  TICKS_ARGUMENT_AXIS,
  TICKS_DATA,
  TICKS_SERIES,
  TICKS_VALUE_AXIS,
} from './axes-layout-data';
import {
  ANIMATION_SNIPPET,
  BREAKS_SNIPPET,
  GUIDES_SNIPPET,
  PANES_SNIPPET,
  ROTATED_SNIPPET,
  RTL_SNIPPET,
  TICKS_SNIPPET,
} from './axes-layout-snippets';

const SECTIONS = [
  'Rotated bars',
  'Constant lines & strips',
  'Panes (price + volume)',
  'Axis breaks',
  'Ticks & labels',
  'RTL & touch',
  'Draw-in animation',
] as const;

@Component({
  selector: 'app-charts-axes-layout',
  imports: [
    DemoCard,
    DocHeader,
    OgeChart,
    OgeRangeSelector,
    PageToc,
    ReactChartsAxesLayoutDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Axes & layout"
      category="Charts"
      categoryLink="/components/charts"
      [chips]="[
        'rotated',
        'panes',
        'constant lines',
        'axis breaks',
        'RTL',
        'pinch zoom',
      ]"
    >
      <p>
        Layout depth of the cartesian chart: <strong>rotated</strong> charts
        (horizontal bars, top-down lines), <strong>panes</strong> stacked over
        one argument axis, value- and argument-axis
        <strong>constant lines and strips</strong>,
        <strong>axis breaks</strong>, fixed tick intervals with minor ticks and
        label templates, <strong>right-to-left</strong> layout, two-finger
        <strong>pinch zoom</strong> on touch screens and a first-render draw-in
        animation. Everything is computed by the framework-free engine both
        render layers share; the series geometry stays the same and only the
        frame turns, so every series type rotates. The basics are on the
        <a
          routerLink="/components/charts"
          class="text-indigo-600 underline dark:text-indigo-400"
          >overview</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-charts-axes-layout-demos />
    } @else {
      <app-demo-card
        [chips]="['rotated', 'stackedBar', 'Up/Down keys']"
        heading="Rotated bars"
        description='<code>[rotated]="true"</code> swaps the axes: the argument axis runs down the left and values grow to the right. Every series type follows — these <code>stackedBar</code> series become horizontal stacked bars — and so do the tooltip, the crosshair, zoom and the keyboard (Up/Down walk the categories, Left/Right the series).'
        [code]="rotatedSnippet"
        language="ts"
      >
        <oge-chart
          [dataSource]="rotatedData"
          [series]="rotatedSeries"
          [commonSeries]="{ argumentField: 'region' }"
          [rotated]="true"
          [tooltip]="{ shared: true }"
          [valueAxis]="rotatedValueAxis"
          style="height: 360px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['constantLines', 'strips', 'inside / outside labels']"
        heading="Constant lines & strips"
        description="<code>constantLines</code> draw a threshold or target at an axis value with a label — inside beside the line, or <code>position: 'outside'</code> past the plot edge — and <code>strips</code> shade a band. Both work on the value and on the argument axis, take any colour (theme tokens included) and keep their labels clear of the plot edges."
        [code]="guidesSnippet"
        language="ts"
      >
        <oge-chart
          [dataSource]="guidesData"
          [series]="guidesSeries"
          [valueAxis]="guidesValueAxis"
          [argumentAxis]="guidesArgumentAxis"
          style="height: 360px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['panes', 'shared crosshair', 'period buttons']"
        heading="Panes (price + volume)"
        description="<code>panes</code> stack plot areas over one shared argument axis; series and value axes pick theirs by <code>pane</code> name, and each pane gets its own height ratio. The crosshair runs through every pane, zoom and pan move them together, and the range selector's <code>periods</code> (1M / 3M / 6M / YTD / 1Y / All) set the same window."
        [code]="panesSnippet"
        language="ts"
      >
        <oge-chart
          [dataSource]="stockData"
          [series]="stockSeries"
          [panes]="stockPanes"
          [valueAxis]="stockValueAxes"
          [crosshair]="{ horizontal: true }"
          [tooltip]="{ shared: true }"
          [(visualRange)]="stockRange"
          zoomEnabled="both"
          [panEnabled]="true"
          style="height: 420px"
        />
        <oge-range-selector
          [dataSource]="stockData"
          [series]="stockNavigator"
          [periods]="stockPeriods"
          [(value)]="stockRange"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['breaks', 'zig-zag marker', 'outliers']"
        heading="Axis breaks"
        description="One outlier would flatten every other bar. <code>breaks</code> skip value ranges on a linear value axis: the gap is drawn with a zig-zag marker, no tick lands inside it and bars crossing it show the cut."
        [code]="breaksSnippet"
        language="ts"
      >
        <oge-chart
          [dataSource]="breaksData"
          [series]="breaksSeries"
          [valueAxis]="breaksValueAxis"
          style="height: 340px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['tickInterval', 'minorTicks', 'label template', 'stagger']"
        heading="Ticks & labels"
        description="<code>tickInterval</code> fixes the tick distance — axis units, or a calendar interval such as <code>{ weeks: 1 }</code> on time axes; <code>minorTicks</code> adds ticks and grid lines between; <code>allowDecimals: false</code> keeps whole numbers. <code>label.format</code> takes <code>Intl</code> options or a function, <code>label.template</code> wraps the text and <code>label.overlap</code> picks <code>rotate</code> / <code>stagger</code> / <code>hide</code> / <code>skip</code>."
        [code]="ticksSnippet"
        language="ts"
      >
        <oge-chart
          [dataSource]="ticksData"
          [series]="ticksSeries"
          [argumentAxis]="ticksArgumentAxis"
          [valueAxis]="ticksValueAxis"
          style="height: 340px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['rtlEnabled', 'pinch zoom', 'two-finger pan']"
        heading="RTL & touch"
        description="<code>rtlEnabled</code> (unset follows the page's <code>dir</code>) mirrors the argument axis, moves the value axis to the right, flips the legend and the tooltip side and swaps the Left/Right arrow keys. On touch screens two fingers pinch-zoom and pan the plot; one finger pans when <code>panEnabled</code> is on, otherwise it drag-zooms."
        [code]="rtlSnippet"
        language="ts"
      >
        <oge-chart
          [dataSource]="rtlData"
          [series]="rtlSeries"
          [rtlEnabled]="true"
          zoomEnabled="both"
          [panEnabled]="true"
          [legend]="{ position: 'top' }"
          style="height: 340px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['animation', 'duration', 'easing', 'reduced motion']"
        heading="Draw-in animation"
        description="The first render draws each series in from its value baseline — bars grow, lines rise. <code>animation</code> takes <code>true</code> / <code>false</code> or <code>{ enabled, duration, easing }</code>; <code>prefers-reduced-motion</code> always switches it off."
        [code]="animationSnippet"
        language="ts"
      >
        <button
          type="button"
          class="mb-2 rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600"
          (click)="replay()"
        >
          Replay
        </button>
        @if (animationVisible()) {
          <oge-chart
            [dataSource]="animationData"
            [series]="animationSeries"
            [animation]="animationOptions"
            style="height: 320px"
          />
        }
      </app-demo-card>
    }
  `,
})
export class ChartsAxesLayoutPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_CHARTS_AXES_LAYOUT_SECTIONS;

  protected readonly rotatedSnippet = ROTATED_SNIPPET;
  protected readonly guidesSnippet = GUIDES_SNIPPET;
  protected readonly panesSnippet = PANES_SNIPPET;
  protected readonly breaksSnippet = BREAKS_SNIPPET;
  protected readonly ticksSnippet = TICKS_SNIPPET;
  protected readonly rtlSnippet = RTL_SNIPPET;
  protected readonly animationSnippet = ANIMATION_SNIPPET;

  protected readonly rotatedData = ROTATED_DATA;
  protected readonly rotatedSeries = ROTATED_SERIES;
  protected readonly rotatedValueAxis = ROTATED_VALUE_AXIS;
  protected readonly guidesData = GUIDES_DATA;
  protected readonly guidesSeries = GUIDES_SERIES;
  protected readonly guidesValueAxis = GUIDES_VALUE_AXIS;
  protected readonly guidesArgumentAxis = GUIDES_ARGUMENT_AXIS;
  protected readonly stockData = STOCK_DATA;
  protected readonly stockSeries = STOCK_SERIES;
  protected readonly stockPanes = STOCK_PANES;
  protected readonly stockValueAxes = STOCK_VALUE_AXES;
  protected readonly stockNavigator = STOCK_NAVIGATOR;
  protected readonly stockPeriods = STOCK_PERIODS;
  protected readonly stockRange = signal<OgeChartRange | null>(null);
  protected readonly breaksData = BREAKS_DATA;
  protected readonly breaksSeries = BREAKS_SERIES;
  protected readonly breaksValueAxis = BREAKS_VALUE_AXIS;
  protected readonly ticksData = TICKS_DATA;
  protected readonly ticksSeries = TICKS_SERIES;
  protected readonly ticksArgumentAxis = TICKS_ARGUMENT_AXIS;
  protected readonly ticksValueAxis = TICKS_VALUE_AXIS;
  protected readonly rtlData = RTL_DATA;
  protected readonly rtlSeries = RTL_SERIES;
  protected readonly animationData = ANIMATION_DATA;
  protected readonly animationSeries = ANIMATION_SERIES;
  protected readonly animationOptions = ANIMATION_OPTIONS;
  protected readonly animationVisible = signal(true);

  /** Re-mounting the chart plays the draw-in again. */
  protected replay(): void {
    this.animationVisible.set(false);
    setTimeout(() => this.animationVisible.set(true));
  }
}
