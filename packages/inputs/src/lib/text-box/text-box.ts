import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  input,
  linkedSignal,
  model,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OgeFieldChrome } from '../field/field-chrome';
import { graphemeCount } from '../field/grapheme';
import {
  OGE_INPUT_HOST,
  type OgeInputCopyApi,
  type OgeInputCounterState,
  type OgeInputRevealApi,
} from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import type { OgeInputCounterMode, OgeTextBoxMode } from '../field/input-types';

/**
 * Single-line text editor with the full oge field chrome — label modes,
 * prefix/suffix slots, clear button, validation subscript, grapheme-accurate
 * character counter, password reveal and copy-to-clipboard:
 *
 * ```html
 * <oge-text-box label="E-mail" mode="email" [(value)]="email" [showClearButton]="true" />
 * <oge-text-box label="Password" mode="password" [formField]="form.password" />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-text-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeTextBox }],
  host: { class: 'oge-input oge-text-box' },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        [id]="inputId"
        [type]="effectiveType()"
        [value]="liveText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly()"
        [attr.name]="name() || null"
        [attr.maxlength]="nativeMaxLength()"
        [attr.minlength]="minLength() ?? null"
        [attr.autocomplete]="autocomplete() ?? null"
        [attr.inputmode]="inputMode() ?? null"
        [attr.enterkeyhint]="enterKeyHint() ?? null"
        [attr.autocapitalize]="autocapitalize() ?? null"
        [attr.spellcheck]="spellcheck() ?? null"
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
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
  `,
})
export class OgeTextBox
  extends OgeInputBase<string>
  implements FormValueControl<string>
{
  readonly value = model('');
  /** Native input type. `password` auto-enables the reveal toggle. */
  readonly mode = input<OgeTextBoxMode>('text');
  /** Counter denominator; enforced natively while `counterMode` is `limit`. */
  readonly maxLength = input<number | undefined>(undefined);
  readonly minLength = input<number | undefined>(undefined);
  readonly autocomplete = input<string | undefined>(undefined);
  /** Native `inputmode` attribute. */
  readonly inputMode = input<string | undefined>(undefined);
  readonly enterKeyHint = input<string | undefined>(undefined);
  readonly autocapitalize = input<string | undefined>(undefined);
  /** `undefined` omits the attribute (browser default). */
  readonly spellcheck = input<boolean | undefined>(undefined);
  /** Renders the grapheme-accurate counter in the subscript end slot. */
  readonly showCounter = input(false);
  readonly counterMode = input<OgeInputCounterMode>('limit');
  /** Password reveal toggle; on by default for `mode="password"`. */
  readonly revealable = input(true);
  /** Copy-to-clipboard rail button (API keys, tokens…). */
  readonly showCopyButton = input(false);

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');

  /** Text as typed — follows `value` on programmatic writes. */
  protected readonly liveText = linkedSignal({
    source: this.value,
    computation: (v: string) => v,
  });

  protected readonly nativeMaxLength = computed(() =>
    this.counterMode() === 'limit' ? (this.maxLength() ?? null) : null,
  );

  // --- reveal ---------------------------------------------------------------

  private readonly revealActive = signal(false);
  override readonly reveal: OgeInputRevealApi = {
    visible: computed(
      () =>
        this.mode() === 'password' &&
        this.revealable() &&
        !this.effectiveDisabled(),
    ),
    active: this.revealActive.asReadonly(),
    toggle: () => this.toggleReveal(),
  };

  protected readonly effectiveType = computed(() =>
    this.mode() === 'password' && this.revealActive() ? 'text' : this.mode(),
  );

  private toggleReveal(): void {
    const el = this.native()?.nativeElement;
    const next = !this.revealActive();
    // Toggle the type in place (never re-create the input — that would lose
    // the caret and break password managers) and restore the selection.
    let start: number | null = null;
    let end: number | null = null;
    try {
      start = el?.selectionStart ?? null;
      end = el?.selectionEnd ?? null;
    } catch {
      // some engines refuse selection reads on type=password
    }
    if (el) el.type = next ? 'text' : 'password';
    this.revealActive.set(next);
    try {
      if (el && start !== null && end !== null) {
        el.setSelectionRange(start, end);
      }
    } catch {
      // non-fatal — caret restore is best-effort
    }
    el?.focus();
  }

  // --- copy -----------------------------------------------------------------

  private readonly copiedSig = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;
  override readonly copy: OgeInputCopyApi = {
    visible: computed(
      () =>
        this.showCopyButton() &&
        typeof navigator !== 'undefined' &&
        !!navigator.clipboard &&
        !this.isEmpty(),
    ),
    copied: this.copiedSig.asReadonly(),
    trigger: () => this.copyValue(),
  };

  private copyValue(): void {
    // liveText, not value — a pending debounce must not stale the clipboard
    navigator.clipboard.writeText(this.liveText()).then(
      () => {
        this.copiedSig.set(true);
        if (this.copiedTimer !== null) clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => {
          this.copiedTimer = null;
          this.copiedSig.set(false);
        }, this.config.copiedResetMs);
      },
      () => undefined,
    );
  }

  // --- counter --------------------------------------------------------------

  override readonly counter = computed<OgeInputCounterState | null>(() => {
    if (!this.showCounter()) return null;
    const count = graphemeCount(this.liveText());
    const max = this.maxLength();
    return { count, max, over: max !== undefined && count > max };
  });

  // --- plumbing -------------------------------------------------------------

  protected onNativeInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.liveText.set(text);
    this.inputChange.emit({ text, event });
    if (this.composing) return; // buffered until compositionend
    this.queueCommit(text, event);
  }

  protected override onCompositionCommit(event: Event): void {
    const el = this.nativeElement();
    if (el) this.queueCommit(el.value, event);
  }

  protected nativeElement(): HTMLInputElement | null {
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
    this.destroyRef.onDestroy(() => {
      if (this.copiedTimer !== null) clearTimeout(this.copiedTimer);
    });
  }
}
