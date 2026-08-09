import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { formatPattern } from '@oge-ui/inputs';
import { OGE_FORMS_CONFIG, type OgeFormsMessages } from '../config';
import type { OgeFormErrorEntry } from '../form/form-types';

/**
 * The form-level error list. Renders `role="alert"` so a failed submit is
 * announced, and each row is a real button that focuses its field.
 *
 * `<oge-form [showValidationSummary]="true">` renders one automatically; use
 * the component directly to place the summary somewhere else on the page.
 *
 * ```html
 * <oge-validation-summary [errors]="errors()" (errorClick)="form.focus($event.field)" />
 * ```
 */
@Component({
  selector: 'oge-validation-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-validation-summary',
    role: 'alert',
    '[attr.aria-label]': 'msg().validationSummaryLabel',
    '[hidden]': 'errors().length === 0',
  },
  template: `
    @if (errors().length > 0) {
      <p class="oge-validation-summary-title">{{ title() }}</p>
      <ul class="oge-validation-summary-list">
        @for (entry of errors(); track entry.field) {
          <li class="oge-validation-summary-item">
            <button
              type="button"
              class="oge-validation-summary-link"
              (click)="errorClick.emit(entry)"
            >
              <span class="oge-validation-summary-field">{{
                entry.label
              }}</span>
              <span class="oge-validation-summary-message">{{
                entry.message
              }}</span>
            </button>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './validation-summary.scss',
})
export class OgeValidationSummary {
  private readonly config = inject(OGE_FORMS_CONFIG);

  /** One entry per invalid field, in layout order. */
  readonly errors = input<readonly OgeFormErrorEntry[]>([]);
  /** Per-instance string overrides. */
  readonly messages = input<Partial<OgeFormsMessages> | undefined>(undefined);

  /** A summary row was activated — focus that field. */
  readonly errorClick = output<OgeFormErrorEntry>();

  protected readonly msg = computed<OgeFormsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly title = computed(() => {
    const count = this.errors().length;
    if (count === 1) return this.msg().validationSummaryTitleOne;
    return formatPattern(this.msg().validationSummaryTitle, {
      count: String(count),
    });
  });
}
