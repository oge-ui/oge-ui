import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  input,
  linkedSignal,
  model,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OgeFieldChrome } from '../field/field-chrome';
import { graphemeCount } from '../field/grapheme';
import { OGE_INPUT_HOST, type OgeInputCounterState } from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import type { OgeInputCounterMode } from '../field/input-types';

const supportsFieldSizing =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('field-sizing', 'content');

/**
 * Fallback auto-resize measurement (browsers without `field-sizing: content`).
 * Exported for direct unit coverage.
 */
export function measureTextAreaHeight(
  el: HTMLTextAreaElement,
  minRows: number,
  maxRows: number | undefined,
): number {
  const style = getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || 20;
  const padding =
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0);
  const min = minRows * lineHeight + padding;
  const max =
    maxRows !== undefined
      ? maxRows * lineHeight + padding
      : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(el.scrollHeight, min), max);
}

/**
 * Multi-line text editor sharing the full field chrome. `autoResize` grows
 * the field with its content between `minRows`/`maxRows`, using the native
 * CSS `field-sizing: content` where available and a measurement fallback
 * elsewhere:
 *
 * ```html
 * <oge-text-area label="Notes" [(value)]="notes" [autoResize]="true" [maxRows]="8" />
 * ```
 */
@Component({
  selector: 'oge-text-area',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeTextArea }],
  host: {
    class: 'oge-input oge-text-area',
    '[class.oge-text-area-auto]': 'autoResize()',
    '[style.--oge-ta-min-rows]': 'effectiveMinRows()',
    '[style.--oge-ta-max-rows]': 'maxRows() ?? null',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <textarea
        #native
        class="oge-input-native"
        [id]="inputId"
        [rows]="effectiveMinRows()"
        [value]="liveText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly()"
        [spellcheck]="spellcheck()"
        [attr.name]="name() || null"
        [attr.maxlength]="nativeMaxLength()"
        [attr.minlength]="minLength() ?? null"
        [attr.autocapitalize]="autocapitalize() ?? null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
        [attr.aria-labelledby]="
          labelMode() !== 'hidden' && label() ? labelId : null
        "
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (input)="onNativeInput($event)"
        (compositionstart)="handleCompositionStart()"
        (compositionend)="handleCompositionEnd($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
        (keydown.enter)="handleEnterKey($event)"
      ></textarea>
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
  `,
})
export class OgeTextArea
  extends OgeInputBase<string>
  implements FormValueControl<string>
{
  readonly value = model('');
  /** Visible rows when `autoResize` is off; the floor when it is on. */
  readonly rows = input(3);
  /** Grow/shrink with content between `minRows` and `maxRows`. */
  readonly autoResize = input(false);
  /** Defaults to `rows`. */
  readonly minRows = input<number | undefined>(undefined);
  /** `undefined` = unbounded growth. */
  readonly maxRows = input<number | undefined>(undefined);
  readonly maxLength = input<number | undefined>(undefined);
  readonly minLength = input<number | undefined>(undefined);
  readonly spellcheck = input(true);
  readonly autocapitalize = input<string | undefined>(undefined);
  readonly showCounter = input(false);
  readonly counterMode = input<OgeInputCounterMode>('limit');

  private readonly native =
    viewChild<ElementRef<HTMLTextAreaElement>>('native');

  protected readonly liveText = linkedSignal({
    source: this.value,
    computation: (v: string) => v,
  });

  protected readonly effectiveMinRows = computed(
    () => this.minRows() ?? this.rows(),
  );

  protected readonly nativeMaxLength = computed(() =>
    this.counterMode() === 'limit' ? (this.maxLength() ?? null) : null,
  );

  override readonly counter = computed<OgeInputCounterState | null>(() => {
    if (!this.showCounter()) return null;
    const count = graphemeCount(this.liveText());
    const max = this.maxLength();
    return { count, max, over: max !== undefined && count > max };
  });

  protected onNativeInput(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    this.liveText.set(text);
    this.inputChange.emit({ text, event });
    if (this.composing) return; // buffered until compositionend
    this.queueCommit(text, event);
  }

  protected override onCompositionCommit(event: Event): void {
    const el = this.nativeElement();
    if (el) this.queueCommit(el.value, event);
  }

  protected nativeElement(): HTMLTextAreaElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): string {
    return '';
  }

  protected valueIsEmpty(value: string): boolean {
    return value === '';
  }

  constructor() {
    super();
    if (!supportsFieldSizing) {
      // Measurement fallback — re-runs whenever the text or config changes.
      afterRenderEffect(() => {
        if (!this.autoResize()) return;
        this.liveText();
        const el = this.native()?.nativeElement;
        if (!el) return;
        el.style.height = 'auto';
        const height = measureTextAreaHeight(
          el,
          this.effectiveMinRows(),
          this.maxRows(),
        );
        el.style.height = `${height}px`;
      });
    }
  }
}
