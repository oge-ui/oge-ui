import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import type { OgeChartColorScaleLegend } from '@oge-ui/charts-engine';

/**
 * The colour-scale legend of the heatmap, the treemap and the map: a
 * gradient bar with ticks (linear scales) or a swatch row (segmented).
 * Decorative for screen readers — the value of every cell / region is in
 * the screen-reader table — so it carries a label but no live content.
 * Internal (not exported from the package).
 */
@Component({
  selector: 'oge-chart-color-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart-color-legend',
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
  template: `
    @if (legend().type === 'linear') {
      <div
        class="oge-chart-color-bar"
        [style.background]="rtl() ? legend().gradientRtl : legend().gradient"
      ></div>
      <div class="oge-chart-color-ticks">
        @for (tick of legend().ticks; track $index) {
          <span
            class="oge-chart-color-tick"
            [style.inset-inline-start.%]="tick.offset * 100"
            >{{ tick.text }}</span
          >
        }
      </div>
    } @else {
      <ul class="oge-chart-color-segments">
        @for (segment of legend().segments; track $index) {
          <li class="oge-chart-color-segment">
            <span
              class="oge-chart-legend-marker"
              [style.background]="segment.color"
            ></span>
            {{ segment.text }}
          </li>
        }
      </ul>
    }
  `,
})
export class OgeChartColorLegend {
  readonly legend = input.required<OgeChartColorScaleLegend>();
  readonly label = input('');
  readonly rtl = input(false);
}
