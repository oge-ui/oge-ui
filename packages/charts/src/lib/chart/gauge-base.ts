import { Directive, computed, input, signal, type Signal } from '@angular/core';
import type {
  OgeChartValueRange,
  OgeGaugeScaleOptions,
} from '@oge-ui/charts-engine';
import { OgeChartVisualBase } from './visual-base';

/**
 * What every gauge shares (circular, linear): the reading, the scale and
 * its ranges, the value format and colour, and the first-render sweep —
 * the indicator paints once at the scale minimum, then transitions to the
 * value. Abstract; not public API.
 */
@Directive()
export abstract class OgeGaugeBase extends OgeChartVisualBase {
  /** The reading; `null` draws the scale alone. */
  readonly value = input<number | null>(null);
  /** `min`/`max`, tick intervals, label visibility and format. */
  readonly scale = input<OgeGaugeScaleOptions>({});
  /** Coloured bands (`{ start, end, color?, label? }`); a label is spoken with the value. */
  readonly ranges = input<readonly OgeChartValueRange[]>([]);
  /** Value text and `aria-valuetext`; default the locale number. */
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Indicator / bar colour (any CSS colour); default the accent. */
  readonly color = input<string | undefined>(undefined);

  /** False until the first frame has painted at the minimum (the sweep). */
  private readonly swept = signal(false);
  /** The value the indicator is drawn at. */
  protected readonly displayValue: Signal<number | null> = computed(() =>
    this.swept() || !this.resolvedAnimation().drawIn
      ? this.value()
      : (this.scale().min ?? 0),
  );

  protected hasData(): boolean {
    return this.value() !== null;
  }

  protected override afterFirstRender(): void {
    if (!this.isBrowser) return;
    // let the minimum paint once, then transition to the value
    const frame = requestAnimationFrame(() => this.swept.set(true));
    this.destroyRef.onDestroy(() => cancelAnimationFrame(frame));
  }
}
