import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeBulletChart,
  OgeCircularGauge,
  OgeLinearGauge,
} from '@oge-ui/react-charts';
import { OgeSparkline } from '@oge-ui/react-charts/sparkline';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  BULLET_ROWS,
  CPU_RANGES,
  SPEED_RANGES,
  STOCK_ROWS,
  TANK_RANGES,
} from '../charts/gauges-data';
import { CHARTS_GAUGES_DEMOS } from './gauges-snippets';

/** TOC of the React view — the same four sections as the Angular page. */
export const REACT_CHARTS_GAUGES_SECTIONS = [
  'Circular gauge',
  'Linear gauge',
  'Bullet chart',
  'Sparklines',
] as const;

const kmh = (value: number): string => `${Math.round(value)} km/h`;
const percent = (value: number): string => `${Math.round(value)}%`;
const litres = (value: number): string => `${value} L`;

function CircularDemo(): ReactNode {
  const [speed, setSpeed] = useState(96);
  const [cpu, setCpu] = useState(64);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'grid gap-3 sm:grid-cols-3' },
      createElement(OgeCircularGauge, {
        value: speed,
        scale: { min: 0, max: 160, tickInterval: 20 },
        ranges: SPEED_RANGES,
        valueFormat: kmh,
        title: 'Speed',
        style: { height: 240 },
      }),
      createElement(OgeCircularGauge, {
        value: cpu,
        indicator: 'bar',
        ranges: CPU_RANGES,
        startAngle: -90,
        endAngle: 90,
        valueFormat: percent,
        title: 'CPU',
        style: { height: 240 },
      }),
      createElement(OgeCircularGauge, {
        value: cpu,
        indicator: 'marker',
        subvalues: [40, 85],
        startAngle: -135,
        endAngle: 135,
        title: 'Load',
        style: { height: 240 },
      }),
    ),
    createElement(
      'button',
      {
        type: 'button',
        className:
          'mt-2 rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600',
        onClick: () => {
          setSpeed(Math.round(Math.random() * 160));
          setCpu(Math.round(Math.random() * 100));
        },
      },
      'New reading',
    ),
  );
}

/**
 * The React half of the "Gauges & sparklines" page — the same sections,
 * data and options as the Angular page, rendered as real React trees.
 */
@Component({
  selector: 'app-react-charts-gauges-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/charts/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['needle', 'bar', 'marker', 'half gauge']"
      heading="Circular gauge"
      description="Ticks, labels and coloured <code>ranges</code> around an arc from <code>startAngle</code> to <code>endAngle</code> (degrees, 0 = 12 o'clock). The <code>indicator</code> is a needle, a filled <code>bar</code> (from <code>barBase</code>) or a <code>marker</code>; <code>subvalues</code> add small rim markers. Press the button — the indicators glide to the new readings."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="circular" />
    </app-demo-card>

    <app-demo-card
      [chips]="['horizontal', 'vertical', 'marker', 'RTL']"
      heading="Linear gauge"
      description="The same scale, ranges and meter semantics on a straight track — <code>orientation</code> horizontal or vertical, a filling <code>bar</code> or a sliding <code>marker</code>, subvalue ticks across the track. A horizontal gauge mirrors in right-to-left pages (<code>rtlEnabled</code> overrides)."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="linear" />
    </app-demo-card>

    <app-demo-card
      [chips]="['target', 'qualitative bands', 'compact']"
      heading="Bullet chart"
      description="Value against target on one compact scale: the qualitative <code>ranges</code> (darkest = poorest by default, or your own colours), the value bar and the <code>target</code> marker. Hover shows both; the svg's accessible name speaks them and the screen-reader table lists the bands."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="bullet" />
    </app-demo-card>

    <app-demo-card
      [chips]="['line / area', 'winloss', 'markers', 'own entry point']"
      heading="Sparklines"
      description="Word-sized charts for cells and tiles — <code>line</code>, <code>area</code>, <code>bar</code> or <code>winloss</code>, with first / last / min / max <code>markers</code> and an optional hover tooltip. Import it from <code>&amp;#64;oge-ui/react-charts/sparkline</code>: that entry never loads the cartesian chart."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="sparklines" />
    </app-demo-card>
  `,
})
export class ReactChartsGaugesDemos {
  protected readonly demos = CHARTS_GAUGES_DEMOS;

  protected readonly circular = () => createElement(CircularDemo);
  protected readonly linear = () =>
    createElement(
      'div',
      { className: 'flex flex-wrap items-start gap-3' },
      createElement(
        'div',
        { className: 'min-w-0 flex-1' },
        createElement(OgeLinearGauge, {
          value: 62,
          ranges: TANK_RANGES,
          subvalues: [25, 80],
          valueFormat: litres,
          title: 'Water tank',
        }),
      ),
      createElement(OgeLinearGauge, {
        value: 62,
        indicator: 'marker',
        orientation: 'vertical',
        title: 'Level',
        style: { height: 260, width: 140 },
      }),
    );
  protected readonly bullet = () =>
    createElement(
      'div',
      { className: 'flex flex-col gap-2' },
      ...BULLET_ROWS.map((row) =>
        createElement(OgeBulletChart, {
          key: row.kpi,
          value: row.value,
          target: row.target,
          ranges: row.ranges,
          title: row.kpi,
        }),
      ),
    );
  protected readonly sparklines = () =>
    createElement(
      'table',
      { className: 'w-full text-sm' },
      createElement(
        'thead',
        null,
        createElement(
          'tr',
          { className: 'text-left' },
          ...['Symbol', 'Price', '7 days', 'Trend', 'Up / down days'].map(
            (label) =>
              createElement('th', { key: label, className: 'py-1' }, label),
          ),
        ),
      ),
      createElement(
        'tbody',
        null,
        ...STOCK_ROWS.map((row) =>
          createElement(
            'tr',
            { key: row.symbol },
            createElement('td', { className: 'py-1 font-medium' }, row.symbol),
            createElement('td', null, String(row.price)),
            createElement(
              'td',
              null,
              createElement(OgeSparkline, {
                dataSource: row.week,
                markers: { min: true, max: true },
                tooltipEnabled: true,
                title: row.symbol,
              }),
            ),
            createElement(
              'td',
              null,
              createElement(OgeSparkline, {
                dataSource: row.week,
                type: 'area',
                title: row.symbol,
              }),
            ),
            createElement(
              'td',
              null,
              createElement(OgeSparkline, {
                dataSource: row.results,
                type: 'winloss',
                title: row.symbol,
              }),
            ),
          ),
        ),
      ),
    );
}
