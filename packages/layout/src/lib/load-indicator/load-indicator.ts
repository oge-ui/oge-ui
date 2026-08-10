import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  OGE_LOAD_INDICATOR_CONFIG,
  type OgeLoadIndicatorMessages,
} from './config';

/** Ring color — the card/toast severity vocabulary. */
export type OgeLoadIndicatorSeverity =
  'accent' | 'success' | 'warning' | 'danger';

/**
 * The suite's canonical indeterminate spinner — the accent ring every OGE
 * surface draws by hand today, as one component:
 *
 * ```html
 * <oge-load-indicator />
 * <oge-load-indicator size="lg" ariaLabel="Loading report" />
 * <button>… <oge-load-indicator [inheritSize]="true" /></button>
 * ```
 *
 * Deliberately indeterminate-only (dx, Kendo and PrimeNG all are): a circle
 * that fills toward completion is the progress bar's job. Announced as
 * `role="progressbar"` **without** `aria-valuenow` — the ARIA rule for the
 * indeterminate state. Under `prefers-reduced-motion` the spin slows rather
 * than stops: a frozen ring reads as finished.
 */
@Component({
  selector: 'oge-load-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-load-indicator',
    role: 'progressbar',
    '[class.oge-load-indicator-sm]': "size() === 'sm'",
    '[class.oge-load-indicator-lg]': "size() === 'lg'",
    '[class.oge-load-indicator-inherit]': 'inheritSize()',
    '[class.oge-load-indicator-success]': "severity() === 'success'",
    '[class.oge-load-indicator-warning]': "severity() === 'warning'",
    '[class.oge-load-indicator-danger]': "severity() === 'danger'",
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-label]': 'ariaLabel() ?? msg().loading',
  },
  template: `<span class="oge-load-indicator-ring" aria-hidden="true"></span>`,
  styleUrl: './load-indicator.scss',
})
export class OgeLoadIndicator {
  private readonly config = inject(OGE_LOAD_INDICATOR_CONFIG);

  /** Ring diameter preset — 16/24/32px. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** `1em` ring that scales with the surrounding font (inside buttons). */
  readonly inheritSize = input(false);
  /** Ring color — the card/toast severity vocabulary. */
  readonly severity = input<OgeLoadIndicatorSeverity>('accent');
  /** Accessible name; the localized `loading` message is the fallback. */
  readonly ariaLabel = input<string | undefined>(undefined);

  protected readonly msg = computed<OgeLoadIndicatorMessages>(
    () => this.config.messages,
  );
}
