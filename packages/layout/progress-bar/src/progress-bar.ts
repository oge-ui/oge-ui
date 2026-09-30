import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { OGE_PROGRESS_BAR_CONFIG, type OgeProgressBarMessages } from './config';
import type {
  OgeProgressBarCompletedEvent,
  OgeProgressBarSeverity,
} from './progress-bar-types';

/**
 * A `role="progressbar"` bar for progress toward completion — a loading
 * region, an upload, a multi-step task:
 *
 * ```html
 * <oge-progress-bar [value]="uploaded()" [max]="total()" />
 * ```
 *
 * `value: null` (the default) renders the **indeterminate** sliding bar, and
 * — per the ARIA guidance — `aria-valuenow` is then omitted entirely rather
 * than pinned to a sentinel. `bufferValue` adds Material's second layer
 * (media buffering), `chunkCount` renders Kendo's segmented variant.
 *
 * Not a meter: a current measurement within a known range (battery, disk
 * usage) is `role="meter"`, which this deliberately is not — the APG's own
 * distinction.
 */
@Component({
  selector: 'oge-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-progress-bar',
    role: 'progressbar',
    '[class.oge-progress-bar-indeterminate]': 'value() === null',
    '[class.oge-progress-bar-success]': "resolvedSeverity() === 'success'",
    '[class.oge-progress-bar-warning]': "resolvedSeverity() === 'warning'",
    '[class.oge-progress-bar-danger]': "resolvedSeverity() === 'danger'",
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    // Indeterminate omits aria-valuenow entirely — never a sentinel value.
    // Determinate clamps into [min, max] — a now beyond max is invalid ARIA.
    '[attr.aria-valuenow]': 'ariaNow()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-label]': 'ariaLabel() ?? msg().progress',
  },
  template: `
    <div class="oge-progress-bar-track">
      @if (chunkCount(); as chunks) {
        @for (chunk of chunkList(); track $index) {
          <span
            class="oge-progress-bar-chunk"
            [class.oge-progress-bar-chunk-filled]="$index < filledChunks()"
          ></span>
        }
      } @else {
        @if (bufferValue() !== undefined && value() !== null) {
          <div
            class="oge-progress-bar-buffer"
            [style.transform]="'scaleX(' + bufferRatio() + ')'"
          ></div>
        }
        <div
          class="oge-progress-bar-fill"
          [style.transform]="
            value() === null ? null : 'scaleX(' + ratio() + ')'
          "
        ></div>
      }
    </div>
    @if (resolvedShowLabel() && value() !== null) {
      <span class="oge-progress-bar-label">{{ label() }}</span>
    }
  `,
  styleUrl: './progress-bar.scss',
})
export class OgeProgressBar {
  private readonly config = inject(OGE_PROGRESS_BAR_CONFIG);

  /** Current value; `null` renders the indeterminate sliding bar. */
  readonly value = input<number | null>(null);
  readonly min = input(0);
  readonly max = input(100);
  /** Material's buffer layer — media pre-loading behind the primary fill. */
  readonly bufferValue = input<number | undefined>(undefined);
  /** Renders the bar as N discrete segments (Kendo's chunk progress bar). */
  readonly chunkCount = input<number | undefined>(undefined);
  /** Fill color — the card/toast severity vocabulary. */
  readonly severity = input<OgeProgressBarSeverity | undefined>(undefined);
  /** Renders the formatted value next to the bar. */
  readonly showLabel = input<boolean | undefined>(undefined);
  /**
   * Formats the visible label **and** `aria-valuetext` (dx `statusFormat`,
   * house argument order). Default label: the rounded percentage.
   */
  readonly formatLabel = input<
    ((value: number, ratio: number) => string) | undefined
  >(undefined);
  /** Accessible name; the localized `progress` message is the fallback. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** The value reached `max` — once per completion (dx `onComplete`). */
  readonly completed = output<OgeProgressBarCompletedEvent>();

  protected readonly msg = computed<OgeProgressBarMessages>(
    () => this.config.messages,
  );
  protected readonly resolvedSeverity = computed<OgeProgressBarSeverity>(
    () => this.severity() ?? this.config.severity ?? 'accent',
  );
  protected readonly resolvedShowLabel = computed(
    () => this.showLabel() ?? this.config.showLabel ?? false,
  );

  protected readonly ariaNow = computed<number | null>(() => {
    const value = this.value();
    if (value === null) return null;
    return Math.min(Math.max(value, this.min()), this.max());
  });

  protected readonly ratio = computed(() => {
    const value = this.value();
    if (value === null) return 0;
    const min = this.min();
    const max = this.max();
    if (max <= min) return 0;
    return Math.min(Math.max((value - min) / (max - min), 0), 1);
  });
  protected readonly bufferRatio = computed(() => {
    const buffer = this.bufferValue();
    if (buffer === undefined) return 0;
    const min = this.min();
    const max = this.max();
    if (max <= min) return 0;
    return Math.min(Math.max((buffer - min) / (max - min), 0), 1);
  });

  protected readonly chunkList = computed<readonly number[]>(() => {
    const count = this.chunkCount();
    if (!count || count <= 0) return [];
    return Array.from({ length: Math.min(count, 100) }, (_, i) => i);
  });
  protected readonly filledChunks = computed(() =>
    Math.round(this.ratio() * this.chunkList().length),
  );

  protected readonly label = computed(() => {
    const value = this.value();
    if (value === null) return '';
    const fn = this.formatLabel();
    return fn ? fn(value, this.ratio()) : `${Math.round(this.ratio() * 100)}%`;
  });
  /** `aria-valuetext` only exists when the number alone is not the meaning. */
  protected readonly valueText = computed(() =>
    this.formatLabel() && this.value() !== null ? this.label() : null,
  );

  private previousComplete: boolean | null = null;

  constructor() {
    // One `completed` per arrival at max — re-crossing after a reset fires
    // again, staying at max does not (the drawer modeChanged guard pattern).
    effect(() => {
      const value = this.value();
      const complete = value !== null && value >= this.max();
      untracked(() => {
        if (this.previousComplete === null) {
          this.previousComplete = complete;
          if (complete && value !== null) this.completed.emit({ value });
          return;
        }
        if (complete === this.previousComplete) return;
        this.previousComplete = complete;
        if (complete && value !== null) this.completed.emit({ value });
      });
    });
  }
}
