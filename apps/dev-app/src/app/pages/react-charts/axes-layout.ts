import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeChart,
  OgeRangeSelector,
  type OgeChartRange,
} from '@oge-ui/react-charts';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
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
  ROTATED_LABELS_ARGUMENT_AXIS,
  ROTATED_LABELS_DATA,
  ROTATED_LABELS_SERIES,
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
} from '../charts/axes-layout-data';
import { CHARTS_AXES_LAYOUT_DEMOS } from './axes-layout-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_CHARTS_AXES_LAYOUT_SECTIONS = [
  'Rotated bars',
  'Constant lines & strips',
  'Panes (price + volume)',
  'Axis breaks',
  'Ticks & labels',
  'RTL & touch',
  'Draw-in animation',
  'Rotated labels',
] as const;

function PanesDemo(): ReactNode {
  const [range, setRange] = useState<OgeChartRange | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeChart, {
      dataSource: STOCK_DATA,
      series: STOCK_SERIES,
      panes: STOCK_PANES,
      valueAxis: STOCK_VALUE_AXES,
      crosshair: { horizontal: true },
      tooltip: { shared: true },
      visualRange: range,
      onVisualRangeChange: setRange,
      zoomEnabled: 'both',
      panEnabled: true,
      style: { height: 420 },
    }),
    createElement(OgeRangeSelector, {
      dataSource: STOCK_DATA,
      series: STOCK_NAVIGATOR,
      periods: STOCK_PERIODS,
      value: range,
      onValueChange: setRange,
    }),
  );
}

function AnimationDemo(): ReactNode {
  const [run, setRun] = useState(0);
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        type: 'button',
        className:
          'mb-2 rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600',
        onClick: () => setRun(run + 1),
      },
      'Replay',
    ),
    createElement(OgeChart, {
      key: run,
      dataSource: ANIMATION_DATA,
      series: ANIMATION_SERIES,
      animation: ANIMATION_OPTIONS,
      style: { height: 320 },
    }),
  );
}

/**
 * The React half of the "Axes & layout" page — the same eight sections, data
 * and options as the Angular page, rendered as real React trees when the
 * reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-charts-axes-layout-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/charts/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['rotated', 'stackedBar', 'Up/Down keys']"
      heading="Rotated bars"
      description="<code>rotated</code> swaps the axes: the argument axis runs down the left and values grow to the right. Every series type follows — these <code>stackedBar</code> series become horizontal stacked bars — and so do the tooltip, the crosshair, zoom and the keyboard (Up/Down walk the categories, Left/Right the series)."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="rotated" />
    </app-demo-card>

    <app-demo-card
      [chips]="['constantLines', 'strips', 'inside / outside labels']"
      heading="Constant lines & strips"
      description="<code>constantLines</code> draw a threshold or target at an axis value with a label — inside beside the line, or <code>position: 'outside'</code> past the plot edge — and <code>strips</code> shade a band. Both work on the value and on the argument axis, take any colour (theme tokens included) and keep their labels clear of the plot edges."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="guides" />
    </app-demo-card>

    <app-demo-card
      [chips]="['panes', 'shared crosshair', 'period buttons']"
      heading="Panes (price + volume)"
      description="<code>panes</code> stack plot areas over one shared argument axis; series and value axes pick theirs by <code>pane</code> name, and each pane gets its own height ratio. The crosshair runs through every pane, zoom and pan move them together, and the range selector's <code>periods</code> (1M / 3M / 6M / YTD / 1Y / All) set the same window."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="panes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['breaks', 'zig-zag marker', 'outliers']"
      heading="Axis breaks"
      description="One outlier would flatten every other bar. <code>breaks</code> skip value ranges on a linear value axis: the gap is drawn with a zig-zag marker, no tick lands inside it and bars crossing it show the cut."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="breaks" />
    </app-demo-card>

    <app-demo-card
      [chips]="['tickInterval', 'minorTicks', 'label template', 'stagger']"
      heading="Ticks & labels"
      description="<code>tickInterval</code> fixes the tick distance — axis units, or a calendar interval such as <code>{ weeks: 1 }</code> on time axes; <code>minorTicks</code> adds ticks and grid lines between; <code>allowDecimals: false</code> keeps whole numbers. <code>label.format</code> takes <code>Intl</code> options or a function, <code>label.template</code> wraps the text and <code>label.overlap</code> picks <code>rotate</code> / <code>stagger</code> / <code>hide</code> / <code>skip</code>."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="ticks" />
    </app-demo-card>

    <app-demo-card
      [chips]="['rtlEnabled', 'pinch zoom', 'two-finger pan']"
      heading="RTL & touch"
      description="<code>rtlEnabled</code> (unset follows the page's <code>dir</code>) mirrors the argument axis, moves the value axis to the right, flips the legend and the tooltip side and swaps the Left/Right arrow keys. On touch screens two fingers pinch-zoom and pan the plot; one finger pans when <code>panEnabled</code> is on, otherwise it drag-zooms."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="rtl" />
    </app-demo-card>

    <app-demo-card
      [chips]="['animation', 'duration', 'easing', 'reduced motion']"
      heading="Draw-in animation"
      description="The first render draws each series in from its value baseline — bars grow, lines rise. <code>animation</code> takes <code>true</code> / <code>false</code> or <code>{ enabled, duration, easing }</code>; <code>prefers-reduced-motion</code> always switches it off."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="animation" />
    </app-demo-card>

    <app-demo-card
      [chips]="['rotated', 'label.overlap', 'wrap', 'measured labels']"
      heading="Rotated labels"
      description="Down a vertical axis the labels collide by their <em>height</em>. The chart measures every label in its own svg: a name wider than the side band wraps (up to three lines, centred on its bar) and <code>label.overlap</code> works on the real boxes — <code>hide</code> keeps the labels that clear each other, <code>skip</code> thins by the tallest one, <code>stagger</code> alternates two columns."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="rotatedLabels" />
    </app-demo-card>
  `,
})
export class ReactChartsAxesLayoutDemos {
  protected readonly demos = CHARTS_AXES_LAYOUT_DEMOS;

  protected readonly rotated = () =>
    createElement(OgeChart, {
      dataSource: ROTATED_DATA,
      series: ROTATED_SERIES,
      commonSeries: { argumentField: 'region' },
      rotated: true,
      tooltip: { shared: true },
      valueAxis: ROTATED_VALUE_AXIS,
      style: { height: 360 },
    });
  protected readonly guides = () =>
    createElement(OgeChart, {
      dataSource: GUIDES_DATA,
      series: GUIDES_SERIES,
      valueAxis: GUIDES_VALUE_AXIS,
      argumentAxis: GUIDES_ARGUMENT_AXIS,
      style: { height: 360 },
    });
  protected readonly panes = () => createElement(PanesDemo);
  protected readonly breaks = () =>
    createElement(OgeChart, {
      dataSource: BREAKS_DATA,
      series: BREAKS_SERIES,
      valueAxis: BREAKS_VALUE_AXIS,
      style: { height: 340 },
    });
  protected readonly ticks = () =>
    createElement(OgeChart, {
      dataSource: TICKS_DATA,
      series: TICKS_SERIES,
      argumentAxis: TICKS_ARGUMENT_AXIS,
      valueAxis: TICKS_VALUE_AXIS,
      style: { height: 340 },
    });
  protected readonly rtl = () =>
    createElement(OgeChart, {
      dataSource: RTL_DATA,
      series: RTL_SERIES,
      rtlEnabled: true,
      zoomEnabled: 'both',
      panEnabled: true,
      legend: { position: 'top' },
      style: { height: 340 },
    });
  protected readonly animation = () => createElement(AnimationDemo);
  protected readonly rotatedLabels = () =>
    createElement(OgeChart, {
      dataSource: ROTATED_LABELS_DATA,
      series: ROTATED_LABELS_SERIES,
      rotated: true,
      argumentAxis: ROTATED_LABELS_ARGUMENT_AXIS,
      style: { height: 320 },
    });
}
