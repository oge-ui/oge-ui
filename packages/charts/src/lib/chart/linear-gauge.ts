import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import {
  GAUGE_BAR_LENGTH,
  buildLinearGaugeScene,
  type OgeGaugeOrientation,
  type OgeLinearGaugeIndicator,
} from '@oge-ui/charts-engine';
import { OgeGaugeBase } from './gauge-base';

/**
 * `<oge-linear-gauge>` — a horizontal or vertical scale with ranges, a bar
 * or marker indicator, subvalue ticks and the value text, mirrored in RTL.
 * A `role="meter"` like the circular gauge, with the same sweep-in and
 * value transitions (off under `prefers-reduced-motion`). Commercial.
 *
 * ```html
 * <oge-linear-gauge [value]="64" indicator="marker" title="Tank level" />
 * ```
 */
@Component({
  selector: 'oge-linear-gauge',
  styleUrls: ['./chart.scss', './gauge.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-gauge oge-linear-gauge',
    '[class.oge-linear-gauge-vertical]': "orientation() === 'vertical'",
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[attr.dir]': 'hostDir()',
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
        <line
          class="oge-gauge-track"
          [attr.x1]="scene().track.x1"
          [attr.y1]="scene().track.y1"
          [attr.x2]="scene().track.x2"
          [attr.y2]="scene().track.y2"
          [attr.stroke-width]="scene().barWidth"
        />
        @if (scene().indicator === 'bar') {
          <line
            class="oge-gauge-bar"
            [attr.x1]="scene().track.x1"
            [attr.y1]="scene().track.y1"
            [attr.x2]="scene().track.x2"
            [attr.y2]="scene().track.y2"
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
        @for (sub of scene().subvalues; track $index) {
          <line
            class="oge-gauge-subvalue"
            [attr.x1]="sub.x1"
            [attr.y1]="sub.y1"
            [attr.x2]="sub.x2"
            [attr.y2]="sub.y2"
          />
        }
        @if (scene().indicator === 'marker' && scene().markerOffset !== null) {
          <path
            class="oge-gauge-marker"
            [attr.d]="scene().markerPath"
            [style.transform]="scene().markerOffset"
            [style.fill]="color() ?? null"
          />
        }
        @if (scene().valueText; as text) {
          <text
            class="oge-gauge-value oge-gauge-value-linear"
            [attr.x]="text.x"
            [attr.y]="text.y"
            [attr.text-anchor]="text.anchor"
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
export class OgeLinearGauge extends OgeGaugeBase {
  readonly orientation = input<OgeGaugeOrientation>('horizontal');
  /** `'bar'` (default — fills the track) or `'marker'` (a triangle on it). */
  readonly indicator = input<OgeLinearGaugeIndicator>('bar');
  /** Where the bar starts; default the scale minimum. */
  readonly barBase = input<number | undefined>(undefined);
  /** Secondary readings drawn as ticks across the track. */
  readonly subvalues = input<readonly number[]>([]);
  /** The value text above the indicator. Default true. */
  readonly showValue = input(true);
  /** Mirrored layout (minimum on the right); unset follows the page `dir`. */
  readonly rtlEnabled = input<boolean | undefined>(undefined);

  protected readonly barLength = GAUGE_BAR_LENGTH;
  protected readonly rtl = computed(() => this.rtlEnabled() ?? this.autoRtl());
  protected readonly hostDir = computed(() => {
    const explicit = this.rtlEnabled();
    return explicit === undefined ? null : explicit ? 'rtl' : 'ltr';
  });

  protected initialSize(): { width: number; height: number } {
    return { width: 400, height: 96 };
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildLinearGaugeScene({
      value: this.value(),
      displayValue: this.displayValue(),
      subvalues: this.subvalues(),
      scale: this.scale(),
      ranges: this.ranges(),
      barBase: this.barBase(),
      showValue: this.showValue(),
      valueFormat: this.valueFormat(),
      orientation: this.orientation(),
      indicator: this.indicator(),
      rtl: this.rtl(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );
}
