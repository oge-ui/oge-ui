import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeBulletChart,
  OgeCircularGauge,
  OgeLinearGauge,
} from '@oge-ui/charts';
import { OgeSparkline } from '@oge-ui/charts/sparkline';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_CHARTS_GAUGES_SECTIONS,
  ReactChartsGaugesDemos,
} from '../react-charts/gauges';
import {
  BULLET_ROWS,
  CPU_RANGES,
  SPEED_RANGES,
  STOCK_ROWS,
  TANK_RANGES,
} from './gauges-data';
import {
  BULLET_SNIPPET,
  CIRCULAR_GAUGE_SNIPPET,
  LINEAR_GAUGE_SNIPPET,
  SPARKLINE_SNIPPET,
} from './gauges-snippets';

const SECTIONS = [
  'Circular gauge',
  'Linear gauge',
  'Bullet chart',
  'Sparklines',
] as const;

@Component({
  selector: 'app-charts-gauges',
  imports: [
    DemoCard,
    DocHeader,
    OgeBulletChart,
    OgeCircularGauge,
    OgeLinearGauge,
    OgeSparkline,
    PageToc,
    ReactChartsGaugesDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Gauges & sparklines"
      category="Charts"
      categoryLink="/components/charts"
      [chips]="['role=meter', 'ranges', 'bullet graph', 'sparkline entry']"
    >
      <p>
        Dashboard-sized readings on the same engine as the charts:
        <strong>circular</strong> and <strong>linear gauges</strong> with
        scales, coloured ranges and needle / bar / marker indicators that sweep
        in and glide between values (never under
        <code>prefers-reduced-motion</code>), the
        <strong>bullet chart</strong> for value-versus-target, and word-sized
        <strong>sparklines</strong>
        that ship as their own entry point. Gauges are
        <code>role="meter"</code>s whose <code>aria-valuetext</code> speaks the
        value and the labelled range it falls in; every chart carries a
        screen-reader table. The cartesian charts are on the
        <a
          routerLink="/components/charts"
          class="text-indigo-600 underline dark:text-indigo-400"
          >overview</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-charts-gauges-demos />
    } @else {
      <app-demo-card
        [chips]="['needle', 'bar', 'marker', 'half gauge']"
        heading="Circular gauge"
        description="Ticks, labels and coloured <code>ranges</code> around an arc from <code>startAngle</code> to <code>endAngle</code> (degrees, 0 = 12 o'clock). The <code>indicator</code> is a needle, a filled <code>bar</code> (from <code>barBase</code>) or a <code>marker</code>; <code>subvalues</code> add small rim markers. Press the button — the indicators glide to the new readings."
        [code]="circularSnippet"
        language="ts"
      >
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
        <button
          type="button"
          class="mt-2 rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600"
          (click)="randomize()"
        >
          New reading
        </button>
      </app-demo-card>

      <app-demo-card
        [chips]="['horizontal', 'vertical', 'marker', 'RTL']"
        heading="Linear gauge"
        description="The same scale, ranges and meter semantics on a straight track — <code>orientation</code> horizontal or vertical, a filling <code>bar</code> or a sliding <code>marker</code>, subvalue ticks across the track. A horizontal gauge mirrors in right-to-left pages (<code>rtlEnabled</code> overrides)."
        [code]="linearSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-3">
          <div class="min-w-0 flex-1">
            <oge-linear-gauge
              [value]="level()"
              [ranges]="tankRanges"
              [subvalues]="[25, 80]"
              [valueFormat]="litres"
              title="Water tank"
            />
          </div>
          <oge-linear-gauge
            [value]="level()"
            indicator="marker"
            orientation="vertical"
            title="Level"
            style="height: 260px; width: 140px"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['target', 'qualitative bands', 'compact']"
        heading="Bullet chart"
        description="Value against target on one compact scale: the qualitative <code>ranges</code> (darkest = poorest by default, or your own colours), the value bar and the <code>target</code> marker. Hover shows both; the svg's accessible name speaks them and the screen-reader table lists the bands."
        [code]="bulletSnippet"
        language="ts"
      >
        <div class="flex flex-col gap-2">
          @for (row of bulletRows; track row.kpi) {
            <oge-bullet-chart
              [value]="row.value"
              [target]="row.target"
              [ranges]="row.ranges"
              [title]="row.kpi"
            />
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['line / area', 'winloss', 'markers', 'own entry point']"
        heading="Sparklines"
        description="Word-sized charts for cells and tiles — <code>line</code>, <code>area</code>, <code>bar</code> or <code>winloss</code>, with first / last / min / max <code>markers</code> and an optional hover tooltip. Import it from <code>&amp;#64;oge-ui/charts/sparkline</code>: that entry never loads the cartesian chart."
        [code]="sparklineSnippet"
        language="ts"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left">
              <th class="py-1">Symbol</th>
              <th>Price</th>
              <th>7 days</th>
              <th>Trend</th>
              <th>Up / down days</th>
            </tr>
          </thead>
          <tbody>
            @for (row of stockRows; track row.symbol) {
              <tr>
                <td class="py-1 font-medium">{{ row.symbol }}</td>
                <td>{{ row.price }}</td>
                <td>
                  <oge-sparkline
                    [dataSource]="row.week"
                    [markers]="{ min: true, max: true }"
                    [tooltipEnabled]="true"
                    [title]="row.symbol"
                  />
                </td>
                <td>
                  <oge-sparkline
                    [dataSource]="row.week"
                    type="area"
                    [title]="row.symbol"
                  />
                </td>
                <td>
                  <oge-sparkline
                    [dataSource]="row.results"
                    type="winloss"
                    [title]="row.symbol"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-demo-card>
    }
  `,
})
export class ChartsGaugesPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_CHARTS_GAUGES_SECTIONS;

  protected readonly speed = signal(96);
  protected readonly cpu = signal(64);
  protected readonly level = signal(62);
  protected readonly speedRanges = SPEED_RANGES;
  protected readonly cpuRanges = CPU_RANGES;
  protected readonly tankRanges = TANK_RANGES;
  protected readonly bulletRows = BULLET_ROWS;
  protected readonly stockRows = STOCK_ROWS;
  protected readonly kmh = (value: number): string =>
    `${Math.round(value)} km/h`;
  protected readonly percent = (value: number): string =>
    `${Math.round(value)}%`;
  protected readonly litres = (value: number): string => `${value} L`;

  protected randomize(): void {
    this.speed.set(Math.round(Math.random() * 160));
    this.cpu.set(Math.round(Math.random() * 100));
  }

  protected readonly circularSnippet = CIRCULAR_GAUGE_SNIPPET;
  protected readonly linearSnippet = LINEAR_GAUGE_SNIPPET;
  protected readonly bulletSnippet = BULLET_SNIPPET;
  protected readonly sparklineSnippet = SPARKLINE_SNIPPET;
}
