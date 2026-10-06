import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  buildBulletScene,
  type OgeChartValueRange,
  type OgeGaugeOrientation,
  type OgeGaugeScaleOptions,
} from '@oge-ui/charts-engine';
import { OgeChartVisualRtlBase } from './visual-base';

/**
 * `<oge-bullet-chart>` — Stephen Few's bullet graph: qualitative range
 * bands (darkest = poorest by default), the value bar and a target marker
 * on one scale, horizontal or vertical, mirrored in RTL. The svg is a
 * `role="img"` whose label speaks the value and the target, with a
 * screen-reader table of the bands. Commercial.
 *
 * ```html
 * <oge-bullet-chart
 *   [value]="270"
 *   [target]="250"
 *   [ranges]="[{ start: 0, end: 150 }, { start: 150, end: 225 }, { start: 225, end: 300 }]"
 *   title="Revenue"
 * />
 * ```
 */
@Component({
  selector: 'oge-bullet-chart',
  styleUrls: ['./chart.scss', './gauge.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-bullet-chart',
    '[class.oge-bullet-chart-vertical]': "orientation() === 'vertical'",
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
      class="oge-chart-plot-wrap"
      (pointerenter)="hover.set(true)"
      (pointerleave)="hover.set(false)"
    >
      <svg
        #svgEl
        class="oge-chart-svg"
        role="img"
        [attr.aria-label]="scene().ariaLabel"
        [attr.width]="width()"
        [attr.height]="height()"
        [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      >
        <g [class.oge-chart-visual-enter]="drawingIn()">
          @for (range of scene().ranges; track $index) {
            <rect
              class="oge-bullet-range"
              [attr.x]="range.x"
              [attr.y]="range.y"
              [attr.width]="range.width"
              [attr.height]="range.height"
              [style.fill]="range.color"
            />
          }
          @if (scene().bar; as bar) {
            <rect
              class="oge-bullet-bar"
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.width"
              [attr.height]="bar.height"
              [style.fill]="color() ?? null"
            />
          }
          @if (scene().target; as target) {
            <line
              class="oge-bullet-target"
              [attr.x1]="target.x1"
              [attr.y1]="target.y1"
              [attr.x2]="target.x2"
              [attr.y2]="target.y2"
              [style.stroke]="targetColor() ?? null"
            />
          }
        </g>
        @for (tick of scene().ticks; track $index) {
          <line
            class="oge-gauge-tick"
            [attr.x1]="tick.x1"
            [attr.y1]="tick.y1"
            [attr.x2]="tick.x2"
            [attr.y2]="tick.y2"
          />
        }
        @for (label of scene().labels; track label.value) {
          <text
            class="oge-chart-axis-label"
            [attr.x]="label.x"
            [attr.y]="label.y"
            [attr.text-anchor]="label.anchor"
          >
            {{ label.text }}
          </text>
        }
      </svg>
      @if (tooltipEnabled() && hover()) {
        <div class="oge-chart-tooltip oge-bullet-tooltip" aria-hidden="true">
          @if (title()) {
            <span class="oge-chart-tooltip-arg">{{ title() }}</span>
          }
          <span class="oge-chart-tooltip-row">{{ scene().valueText }}</span>
          <span class="oge-chart-tooltip-row">{{ scene().targetText }}</span>
        </div>
      }
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
export class OgeBulletChart extends OgeChartVisualRtlBase {
  /** The measure; `null` draws the bands and the target alone. */
  readonly value = input<number | null>(null);
  /** The comparative measure (the target marker). */
  readonly target = input<number | null>(null);
  /** Qualitative bands, low → high; unset colours are shades of the muted colour. */
  readonly ranges = input<readonly OgeChartValueRange[]>([]);
  /** `min`/`max` default to 0 and the nice ceiling of the data. */
  readonly scale = input<OgeGaugeScaleOptions>({});
  readonly orientation = input<OgeGaugeOrientation>('horizontal');
  /** Value-bar colour; default the text colour. */
  readonly color = input<string | undefined>(undefined);
  /** Target-marker colour; default the text colour. */
  readonly targetColor = input<string | undefined>(undefined);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Hovering shows the value and the target. Default true. */
  readonly tooltipEnabled = input(true);

  protected readonly hover = signal(false);

  protected initialSize(): { width: number; height: number } {
    return { width: 400, height: 64 };
  }

  protected hasData(): boolean {
    return this.value() !== null || this.target() !== null;
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildBulletScene({
      value: this.value(),
      target: this.target(),
      ranges: this.ranges(),
      scale: this.scale(),
      orientation: this.orientation(),
      rtl: this.rtl(),
      valueFormat: this.valueFormat(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );
}
