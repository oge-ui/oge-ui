import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  formatOgeAiValue,
  type OgeAiCellMessages,
  type OgeAiCellState,
  type OgeAiColumn,
} from '@oge-ui/behavior';
import { OGE_AI_CONFIG } from '../config';

/** The retry glyph (24 × 24 view box). */
const RETRY_PATH =
  'M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9M19.5 4.5V9H15M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15M4.5 19.5V15H9';

/**
 * One row's AI-computed value, for a grid column's cell template: a shimmer
 * while the model works, the value when it is known, a retry when it failed.
 * Every cell of the column shares one {@link OgeAiColumn} — `createOgeAiColumn()`
 * — which batches the visible rows into a few requests and caches the results.
 *
 * ```html
 * <oge-column field="sentiment" caption="Sentiment">
 *   <ng-template ogeCellTemplate let-row="row">
 *     <oge-ai-cell [column]="sentiment" [row]="row" />
 *   </ng-template>
 * </oge-column>
 * ```
 *
 * The model reads only the fields the column names in `inputs`.
 */
@Component({
  selector: 'oge-ai-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-ai-cell',
    '[class.oge-ai-cell-pending]': 'busy()',
    '[class.oge-ai-cell-failed]': "state().status === 'error'",
    '[attr.aria-busy]': 'busy() || null',
  },
  styleUrl: './ai-cell.scss',
  template: `
    @switch (state().status) {
      @case ('done') {
        <span class="oge-ai-cell-value">{{ text() }}</span>
      }
      @case ('error') {
        <span class="oge-ai-cell-error">{{ msg().error }}</span>
        <button
          type="button"
          class="oge-ai-cell-retry"
          [attr.aria-label]="msg().retry"
          [attr.title]="msg().retry"
          (click)="retry($event)"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="retryPath" />
          </svg>
        </button>
      }
      @default {
        <span class="oge-ai-cell-skeleton" aria-hidden="true"></span>
        <span class="oge-sr-only">{{ msg().generating }}</span>
      }
    }
  `,
})
export class OgeAiCell {
  private readonly config = inject(OGE_AI_CONFIG);
  private readonly appLocale = inject(LOCALE_ID);

  /** The column's shared machine (`createOgeAiColumn()`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any row type
  readonly column = input.required<OgeAiColumn<any>>();
  /** The row whose value this cell shows. */
  readonly row = input.required<object>();
  /** BCP 47 locale of number and date values; falls back to the config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /** Per-instance message overrides, merged over the catalog. */
  readonly messages = input<Partial<OgeAiCellMessages> | undefined>(undefined);

  protected readonly retryPath = RETRY_PATH;
  protected readonly msg = computed<OgeAiCellMessages>(() => ({
    ...this.config.messages.aiCell,
    ...this.messages(),
  }));
  private readonly version = signal(0);
  private readonly key = computed(() => this.column().key(this.row()));
  protected readonly state = computed<OgeAiCellState>(() => {
    this.version();
    return this.column().state(this.key());
  });
  protected readonly busy = computed(() => {
    const status = this.state().status;
    return status === 'pending' || status === 'idle';
  });
  protected readonly text = computed(() => {
    const column = this.column();
    const m = this.msg();
    return formatOgeAiValue(this.state().value, {
      dataType: column.options.dataType,
      values: column.options.values,
      locale: this.locale() ?? this.config.locale ?? this.appLocale,
      yes: m.yes,
      no: m.no,
      empty: m.empty,
    });
  });

  constructor() {
    effect((onCleanup) => {
      const column = this.column();
      const row = this.row();
      const key = this.key();
      const unsubscribe = column.subscribe(key, () => {
        this.version.update((v) => v + 1);
        // a refreshed value asks again while the cell is shown
        if (column.state(key).status === 'idle') column.request(row);
      });
      untracked(() => {
        column.useTransport(this.config.transport);
        column.request(row);
        this.version.update((v) => v + 1);
      });
      onCleanup(unsubscribe);
    });
  }

  protected retry(event: Event): void {
    // the click must not select or activate the row
    event.stopPropagation();
    this.column().refresh(this.key());
  }
}
