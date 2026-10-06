import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import {
  GAUGE_BAR_LENGTH,
  buildCircularGaugeScene,
  type OgeCircularGaugeIndicator,
} from '@oge-ui/charts-engine';
import { OgeGaugeBase } from './gauge-base';

/**
 * `<oge-circular-gauge>` — a dial on the shared charts engine: a scale with
 * major/minor ticks and labels, coloured ranges, a needle, bar or marker
 * indicator, subvalue markers and the value text. It is a `role="meter"`
 * whose `aria-valuetext` speaks the value (and the labelled range it falls
 * in); the indicator sweeps in on the first render and transitions on
 * every change — never under `prefers-reduced-motion`. Commercial.
 *
 * ```html
 * <oge-circular-gauge
 *   [value]="72"
 *   [scale]="{ min: 0, max: 120 }"
 *   [ranges]="[{ start: 90, end: 120, label: 'Over limit' }]"
 *   title="Speed"
 * />
 * ```
 */
@Component({
  selector: 'oge-circular-gauge',
  styleUrls: ['./chart.scss', './gauge.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-gauge oge-circular-gauge',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[style]': 'animationVars()',
  },
  template: `
    @if (title()) {
      <div class="oge-chart-title">{{ title() }}</div>
    }
    <div
      #plotWrap
      class="oge-chart-plot-wrap oge-gauge-meter"
      role="meter"
      [attr.aria-label]="scene().aria.label"
      [attr.aria-valuenow]="scene().aria.valueNow"
      [attr.aria-valuemin]="scene().aria.valueMin"
      [attr.aria-valuemax]="scene().aria.valueMax"
      [attr.aria-valuetext]="scene().aria.valueText"
    >
      <svg
        #svgEl
        class="oge-chart-svg"
        aria-hidden="true"
        [attr.width]="width()"
        [attr.height]="height()"
        [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      >
        @for (range of scene().ranges; track $index) {
          <path
            class="oge-gauge-range"
            [attr.d]="range.path"
            [style.fill]="range.color"
          />
        }
        @if (scene().indicator === 'bar') {
          <path
            class="oge-gauge-track"
            [attr.d]="scene().trackPath"
            [attr.stroke-width]="scene().barWidth"
          />
          <path
            class="oge-gauge-bar"
            [attr.d]="scene().trackPath"
            [attr.pathLength]="barLength"
            [attr.stroke-width]="scene().barWidth"
            [style.stroke-dasharray]="scene().barDash"
            [style.stroke]="color() ?? null"
          />
        }
        @for (tick of scene().ticks; track $index) {
          <line
            class="oge-gauge-tick"
            [class.oge-gauge-tick-minor]="!tick.major"
            [attr.x1]="tick.x1"
            [attr.y1]="tick.y1"
            [attr.x2]="tick.x2"
            [attr.y2]="tick.y2"
          />
        }
        @for (label of scene().labels; track label.value) {
          <text
            class="oge-chart-axis-label oge-gauge-label"
            [attr.x]="label.x"
            [attr.y]="label.y"
            [attr.text-anchor]="label.anchor"
          >
            {{ label.text }}
          </text>
        }
        @for (angle of scene().subvalueAngles; track $index) {
          <path
            class="oge-gauge-subvalue"
            [attr.d]="scene().subvaluePath"
            [style.transform]="'rotate(' + angle + 'deg)'"
            [style.transform-origin]="scene().origin"
          />
        }
        @if (scene().indicatorAngle !== null) {
          @if (scene().indicator === 'needle') {
            <path
              class="oge-gauge-needle"
              [attr.d]="scene().needlePath"
              [style.transform]="'rotate(' + scene().indicatorAngle + 'deg)'"
              [style.transform-origin]="scene().origin"
              [style.fill]="color() ?? null"
            />
            <circle
              class="oge-gauge-hub"
              [attr.cx]="scene().cx"
              [attr.cy]="scene().cy"
              [attr.r]="scene().hubRadius"
            />
          } @else if (scene().indicator === 'marker') {
            <path
              class="oge-gauge-marker"
              [attr.d]="scene().markerPath"
              [style.transform]="'rotate(' + scene().indicatorAngle + 'deg)'"
              [style.transform-origin]="scene().origin"
              [style.fill]="color() ?? null"
            />
          }
        }
        @if (scene().valueText; as text) {
          <text
            class="oge-gauge-value"
            [attr.x]="text.x"
            [attr.y]="text.y"
            text-anchor="middle"
            [style.font-size.px]="text.size"
          >
            {{ text.text }}
          </text>
        }
      </svg>
    </div>
    <table class="oge-chart-sr-table">
      <caption>
        {{
          msg().aria.tableCaption
        }}
      </caption>
      <tbody>
        @for (row of scene().srRows; track $index) {
          <tr>
            <th scope="row">{{ row.header }}</th>
            <td>{{ row.cell }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class OgeCircularGauge extends OgeGaugeBase {
  /** `'needle'` (default), `'bar'` (a filled arc) or `'marker'` (a triangle on the scale). */
  readonly indicator = input<OgeCircularGaugeIndicator>('needle');
  /** Arc start in degrees; 0 = 12 o'clock, clockwise. Default -120. */
  readonly startAngle = input(-120);
  /** Arc end in degrees. Default 120. */
  readonly endAngle = input(120);
  /** Where the bar indicator starts; default the scale minimum. */
  readonly barBase = input<number | undefined>(undefined);
  /** Secondary readings drawn as small markers on the rim. */
  readonly subvalues = input<readonly number[]>([]);
  /** The value text under the hub. Default true. */
  readonly showValue = input(true);

  protected readonly barLength = GAUGE_BAR_LENGTH;

  protected initialSize(): { width: number; height: number } {
    return { width: 300, height: 260 };
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildCircularGaugeScene({
      value: this.value(),
      displayValue: this.displayValue(),
      subvalues: this.subvalues(),
      scale: this.scale(),
      ranges: this.ranges(),
      barBase: this.barBase(),
      showValue: this.showValue(),
      valueFormat: this.valueFormat(),
      startAngle: this.startAngle(),
      endAngle: this.endAngle(),
      indicator: this.indicator(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );
}
