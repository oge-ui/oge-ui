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
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  clampOtpFocus,
  normalizeOtpLength,
  normalizeOtpValue,
  ogeIsRtl,
  otpBackspace,
  otpCellLabel,
  otpCells,
  otpDelete,
  otpInputMode,
  otpInsert,
  otpNavigationTarget,
  otpSeparatorAfter,
  otpTypedText,
  type OgeOtpEdit,
  type OgeOtpInputCase,
  type OgeOtpInputType,
  type OgeOtpOptions,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';

/** Every cell is filled — the code is ready to verify. */
export interface OgeOtpCompletedEvent {
  /** The complete code. */
  value: string;
  /** The keystroke, paste or autofill that completed it. */
  event: Event | undefined;
}

/**
 * One-time-code / PIN entry — `length` single-character cells that behave
 * as one field:
 *
 * ```html
 * <oge-otp-input label="Verification code" [(value)]="code" (completed)="verify($event.value)" />
 * <oge-otp-input type="alphanumeric" letterCase="upper" [length]="8" [groupSize]="4" />
 * <oge-otp-input [masked]="true" [length]="4" label="PIN" />
 * ```
 *
 * The cells form one `role="group"` named by the label, each cell an input
 * named "Character n of m"; only one cell is in the Tab sequence (the caret
 * cell), arrows (RTL-mirrored) and Home/End move between cells. Typing fills
 * and advances, Backspace clears and steps back, Delete closes the gap, and
 * a paste — or the browser's SMS autofill through
 * `autocomplete="one-time-code"` on the first cell — distributes over the
 * cells. The value is always the contiguous characters entered, so
 * `value.length === length` means complete; `completed` fires then.
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`,
 * and with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-otp-input',
    role: 'group',
    '[class.oge-otp-input-invalid]': 'showError()',
    '[class.oge-otp-input-readonly]': 'readonly()',
    '[class.oge-otp-input-complete]': 'complete()',
    '[class.oge-otp-input-sm]': "size() === 'sm'",
    '[class.oge-otp-input-lg]': "size() === 'lg'",
    '[attr.aria-labelledby]': 'label() ? labelId : null',
    '[attr.aria-label]': 'label() ? null : msg().otpLabel',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '[attr.title]': 'tooltip() ?? null',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (label()) {
      <span class="oge-otp-input-label" [id]="labelId"
        >{{ label() }}
        @if (required()) {
          <span class="oge-otp-input-required" aria-hidden="true">*</span>
        }
      </span>
    }
    <div class="oge-otp-input-cells">
      @for (cell of cells(); track $index) {
        <input
          class="oge-otp-input-cell"
          [class.oge-otp-input-cell-filled]="cell !== ''"
          [id]="$index === 0 ? inputId : inputId + '-' + $index"
          [type]="masked() ? 'password' : 'text'"
          [attr.inputmode]="inputMode()"
          [attr.autocomplete]="$index === 0 ? 'one-time-code' : 'off'"
          [attr.name]="$index === 0 && name() ? name() : null"
          [attr.aria-label]="cellLabel($index)"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          [attr.placeholder]="placeholder() || null"
          [attr.data-index]="$index"
          [tabindex]="$index === caret() ? tabIndex() : -1"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly()"
          [value]="cell"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          (focus)="onCellFocus($index)"
          (input)="onCellInput($index, $event)"
          (keydown)="onCellKeydown($index, $event)"
          (paste)="onCellPaste($index, $event)"
        />
        @if (separatorAfter($index)) {
          <span class="oge-otp-input-separator" aria-hidden="true">{{
            separator()
          }}</span>
        }
      }
    </div>
    @if (subscript(); as sub) {
      <div
        class="oge-otp-input-subscript"
        [class.oge-otp-input-error]="sub.error"
        [id]="sub.id"
      >
        {{ sub.text }}
      </div>
    }
  `,
  styleUrl: './otp-input.scss',
})
export class OgeOtpInput
  extends OgeControlBase<string>
  implements FormValueControl<string>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly localeId = inject(LOCALE_ID);

  /** The characters entered so far (a contiguous prefix) — two-way. */
  readonly value = model('');
  /** Number of cells (1–12). */
  readonly length = input(6);
  /** Accepted characters: digits, letters and digits, or letters only. */
  readonly type = input<OgeOtpInputType>('numeric');
  /** Letter case applied to typed and pasted letters. */
  readonly letterCase = input<OgeOtpInputCase>('none');
  /** Hides the characters like a password field (PINs). */
  readonly masked = input(false);
  /** Draws `separator` after every `groupSize` cells (`3` → 123-456); `0` = none. */
  readonly groupSize = input(0);
  /** Separator glyph between groups (decorative, hidden from assistive technology). */
  readonly separator = input('–');
  /** Placeholder character shown in empty cells. */
  readonly placeholder = input('');
  /** Visible group label; also the group's accessible name. */
  readonly label = input('');
  /** Helper text under the cells (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /** Overrides the locale of the cell names' digits (`LOCALE_ID` / config otherwise). */
  readonly locale = input<string | undefined>(undefined);

  /** Every cell is filled — by typing, pasting or autofill. */
  readonly completed = output<OgeOtpCompletedEvent>();

  /** The cell that owns the Tab stop (and the caret). */
  protected readonly focusIndex = signal(0);

  protected readonly resolvedLength = computed(() =>
    normalizeOtpLength(this.length()),
  );
  private readonly options = computed<OgeOtpOptions>(() => ({
    length: this.resolvedLength(),
    type: this.type(),
    letterCase: this.letterCase(),
  }));
  private readonly current = computed(() =>
    normalizeOtpValue(this.value(), this.options()),
  );
  protected readonly cells = computed(() =>
    otpCells(this.current(), this.resolvedLength()),
  );
  /** `true` once every cell holds a character. */
  protected readonly complete = computed(
    () => Array.from(this.current()).length === this.resolvedLength(),
  );
  /**
   * The Tab-stop cell: the focused cell while the focus is inside, else the
   * first empty cell — tabbing into a half-typed code resumes where it ended.
   */
  protected readonly caret = computed(() =>
    clampOtpFocus(
      this.focusedSig() ? this.focusIndex() : Number.MAX_SAFE_INTEGER,
      this.current(),
      this.resolvedLength(),
    ),
  );
  protected readonly inputMode = computed(() => otpInputMode(this.type()));
  private readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );

  protected readonly subscript = computed(() => {
    if (this.showError() && this.resolvedErrorText()) {
      return { id: this.errorId, text: this.resolvedErrorText(), error: true };
    }
    const hint = this.hint();
    return hint ? { id: this.hintId, text: hint, error: false } : null;
  });

  protected readonly describedBy = computed(() => this.subscript()?.id ?? null);

  protected cellLabel(index: number): string {
    return otpCellLabel(
      this.msg().otpCellLabel,
      index,
      this.resolvedLength(),
      this.effectiveLocale(),
    );
  }

  protected separatorAfter(index: number): boolean {
    return otpSeparatorAfter(index, this.resolvedLength(), this.groupSize());
  }

  // --- interactions ----------------------------------------------------------

  private editable(): boolean {
    return !this.effectiveDisabled() && !this.readonly();
  }

  private cellElement(index: number): HTMLInputElement | null {
    return this.hostEl.nativeElement.querySelector<HTMLInputElement>(
      `.oge-otp-input-cell[data-index="${index}"]`,
    );
  }

  /** Writes every cell's native text — a rejected keystroke must not stick. */
  private syncCells(value: string): void {
    const cells = otpCells(value, this.resolvedLength());
    cells.forEach((text, index) => {
      const el = this.cellElement(index);
      if (el && el.value !== text) el.value = text;
    });
  }

  private moveFocus(index: number): void {
    const target = clampOtpFocus(index, this.current(), this.resolvedLength());
    this.focusIndex.set(target);
    const el = this.cellElement(target);
    if (!el) return;
    if (el.ownerDocument.activeElement !== el) el.focus();
    el.select?.();
  }

  private apply(edit: OgeOtpEdit, event: Event): void {
    const before = this.current();
    this.syncCells(edit.value);
    if (edit.value !== before) this.commitNow(edit.value, event);
    this.focusIndex.set(edit.focusIndex);
    this.moveFocus(edit.focusIndex);
    if (edit.complete && edit.value !== before) {
      this.completed.emit({ value: edit.value, event });
    }
  }

  protected onCellFocus(index: number): void {
    const limit = clampOtpFocus(index, this.current(), this.resolvedLength());
    if (limit !== index) {
      // never leave the caret past the first empty cell
      this.moveFocus(limit);
      return;
    }
    this.focusIndex.set(index);
    this.cellElement(index)?.select?.();
  }

  protected onCellInput(index: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    if (!this.editable()) {
      this.syncCells(this.current());
      return;
    }
    const inputType = (event as InputEvent).inputType ?? '';
    if (inputType.startsWith('delete')) {
      // soft keyboards that never send a Backspace keydown
      this.apply(otpBackspace(this.current(), index, this.options()), event);
      return;
    }
    const typed = otpTypedText(
      el.value,
      this.cells()[index] ?? '',
      this.resolvedLength(),
    );
    this.apply(otpInsert(this.current(), index, typed, this.options()), event);
  }

  protected onCellKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleEnterKey(event);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const value = this.current();
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (!this.editable()) return;
      const edit =
        event.key === 'Backspace'
          ? otpBackspace(value, index, this.options())
          : otpDelete(value, index, this.options());
      this.apply(edit, event);
      return;
    }
    const target = otpNavigationTarget(
      event.key,
      index,
      value,
      this.resolvedLength(),
      ogeIsRtl(this.hostEl.nativeElement),
    );
    if (target === undefined) return;
    event.preventDefault();
    this.moveFocus(target);
  }

  protected onCellPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault();
    if (!this.editable()) return;
    const text = event.clipboardData?.getData('text') ?? '';
    this.apply(otpInsert(this.current(), index, text, this.options()), event);
  }

  protected onFocusIn(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleFocus(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleBlur(event);
  }

  // --- base contract -----------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    return this.cellElement(this.caret());
  }

  protected emptyValue(): string {
    return '';
  }

  protected valueIsEmpty(value: string): boolean {
    return !value;
  }

  protected override normalizeWrite(value: unknown): string {
    return normalizeOtpValue(value, this.options());
  }

  protected override onValueWritten(): void {
    this.focusIndex.set(
      clampOtpFocus(this.focusIndex(), this.current(), this.resolvedLength()),
    );
  }
}
