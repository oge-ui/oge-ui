import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OgeFieldChrome } from '../field/field-chrome';
import { OGE_INPUT_HOST, type OgeInputSpinApi } from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import type { OgeNumberBoxMode } from '../field/input-types';
import {
  clampNumber,
  createNumberFormatter,
  offsetByStep,
} from './number-format';

/**
 * Locale-aware numeric editor: `null` means empty (never `0`), display
 * formatting via `Intl.NumberFormat` applies on blur while focus shows the
 * raw editable number, values clamp to `min`/`max` on commit, and spin
 * buttons / arrow keys step by `step` with hold-to-repeat:
 *
 * ```html
 * <oge-number-box
 *   label="Price"
 *   [(value)]="price"
 *   [min]="0"
 *   [step]="0.5"
 *   [showSpinButtons]="true"
 *   [format]="{ style: 'currency', currency: 'EUR' }"
 * />
 * ```
 *
 * Note: `style: 'percent'` formats the display only — the model value is not
 * rescaled.
 */
@Component({
  selector: 'oge-number-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeNumberBox }],
  host: { class: 'oge-input oge-number-box' },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        [id]="inputId"
        [type]="mode()"
        inputmode="decimal"
        [value]="displayText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly()"
        [attr.name]="name() || null"
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
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
        (keydown)="onKeydown($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
  `,
})
export class OgeNumberBox
  extends OgeInputBase<number | null>
  implements FormValueControl<number | null>
{
  /** `null` is the empty state — never `0`. */
  readonly value = model<number | null>(null);
  /** Lower bound — values clamp on commit (typing is never blocked). */
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  /** Spin/arrow-key increment. */
  readonly step = input(1);
  readonly showSpinButtons = input(false);
  /** Display formatting applied while unfocused; focus shows the raw number. */
  readonly format = input<Intl.NumberFormatOptions | undefined>(undefined);
  /** Overrides the application locale (`LOCALE_ID`). */
  readonly locale = input<string | undefined>(undefined);
  /** Native `type` attr; keyboards vary by device. `inputmode` is always decimal. */
  readonly mode = input<OgeNumberBoxMode>('text');

  private readonly localeId = inject(LOCALE_ID);
  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');

  // Cached by content key — inline `[format]="{...}"` literals produce a new
  // reference every CD, and Intl.NumberFormat construction is expensive.
  private readonly formatterKey = computed(
    () =>
      `${this.locale() ?? this.localeId}|${JSON.stringify(this.format() ?? null)}`,
  );
  private cachedFormatter: {
    key: string;
    formatter: ReturnType<typeof createNumberFormatter>;
  } | null = null;

  private formatter(): ReturnType<typeof createNumberFormatter> {
    const key = this.formatterKey();
    if (this.cachedFormatter?.key !== key) {
      this.cachedFormatter = {
        key,
        formatter: createNumberFormatter(
          this.locale() ?? this.localeId,
          this.format(),
        ),
      };
    }
    return this.cachedFormatter.formatter;
  }

  /** Raw text while focused. */
  private readonly editingText = signal('');

  protected readonly displayText = computed(() => {
    if (this.focusedSig()) return this.editingText();
    const value = this.value();
    if (value === null) return '';
    return this.format() !== undefined
      ? this.formatter().format(value)
      : this.formatter().formatEditable(value);
  });

  // --- spin -----------------------------------------------------------------

  private spinDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private spinIntervalTimer: ReturnType<typeof setInterval> | null = null;

  override readonly spin: OgeInputSpinApi = {
    visible: computed(
      () =>
        this.showSpinButtons() && !this.effectiveDisabled() && !this.readonly(),
    ),
    canUp: computed(() => {
      if (this.effectiveDisabled() || this.readonly()) return false;
      const value = this.value();
      const max = this.max();
      return max === undefined || value === null || value < max;
    }),
    canDown: computed(() => {
      if (this.effectiveDisabled() || this.readonly()) return false;
      const value = this.value();
      const min = this.min();
      return min === undefined || value === null || value > min;
    }),
    press: (dir, event) => {
      // Keep focus wherever it is — spinning must not blur the input.
      event.preventDefault();
      this.startSpin(dir, event);
    },
    release: () => this.stopSpin(),
  };

  private startSpin(dir: 1 | -1, event?: Event): void {
    if (dir === 1 ? !this.spin.canUp() : !this.spin.canDown()) return;
    this.stepBy(dir, event);
    this.spinDelayTimer = setTimeout(() => {
      this.spinDelayTimer = null;
      this.spinIntervalTimer = setInterval(() => {
        if (dir === 1 ? !this.spin.canUp() : !this.spin.canDown()) {
          this.stopSpin();
          return;
        }
        this.stepBy(dir, event);
      }, this.config.spinRepeatIntervalMs);
    }, this.config.spinRepeatDelayMs);
  }

  private stopSpin(): void {
    if (this.spinDelayTimer !== null) {
      clearTimeout(this.spinDelayTimer);
      this.spinDelayTimer = null;
    }
    if (this.spinIntervalTimer !== null) {
      clearInterval(this.spinIntervalTimer);
      this.spinIntervalTimer = null;
    }
  }

  /** Spin commits immediately — it is a discrete action, not typing. */
  private stepBy(dir: 1 | -1, event?: Event): void {
    // A staged debounced keystroke must land before stepping from it.
    this.flushCommit();
    const next = offsetByStep(
      this.value(),
      dir,
      this.step(),
      this.min(),
      this.max(),
    );
    this.parseInvalid.set(false);
    this.commitNow(next, event);
    if (this.focusedSig()) {
      this.editingText.set(this.formatter().formatEditable(next));
    }
  }

  // --- typing / commit --------------------------------------------------------

  protected onNativeInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.editingText.set(text);
    this.inputChange.emit({ text, event });
    const parsed = this.formatter().parse(text);
    if (!parsed.ok) {
      this.parseInvalid.set(true);
      // an older staged value must not commit underneath the visible error
      this.cancelCommit();
      return;
    }
    this.parseInvalid.set(false);
    // Un-clamped while typing — clamping mid-keystroke would make values past
    // the bound impossible to type through; the clamp lands on blur.
    this.queueCommit(parsed.value, event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleEnterKey(event);
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (this.effectiveDisabled() || this.readonly()) return;
    event.preventDefault();
    this.stepBy(event.key === 'ArrowUp' ? 1 : -1, event);
  }

  /** Blur/Enter flushes land pre-clamped — no transient out-of-range commit. */
  protected override transformFlushValue(value: number | null): number | null {
    return value === null ? null : clampNumber(value, this.min(), this.max());
  }

  protected override onFocusChanged(focused: boolean): void {
    if (focused) {
      const value = this.value();
      this.editingText.set(
        value === null ? '' : this.formatter().formatEditable(value),
      );
      this.parseInvalid.set(false);
      return;
    }
    // blur — pending commits were flushed by the base already
    if (this.parseInvalid()) {
      // unparseable text reverts to the last committed value
      this.parseInvalid.set(false);
      return;
    }
    const value = this.value();
    if (value !== null) {
      const clamped = clampNumber(value, this.min(), this.max());
      if (clamped !== value) this.commitNow(clamped);
    }
  }

  protected override onValueWritten(): void {
    if (this.focusedSig()) {
      const value = this.value();
      this.editingText.set(
        value === null ? '' : this.formatter().formatEditable(value),
      );
    }
  }

  protected override normalizeWrite(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): number | null {
    return null;
  }

  protected valueIsEmpty(value: number | null): boolean {
    return value === null;
  }

  constructor() {
    super();
    this.destroyRef.onDestroy(() => this.stopSpin());
  }
}
