import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OgeMaskCore,
  ogeMaskComplete,
  ogeMaskInputMode,
  type OgeMaskCompletedEvent,
  type OgeMaskEdit,
  type OgeMaskRules,
  type OgeMaskShowMode,
} from '@oge-ui/behavior';
import { OgeFieldChrome } from '@oge-ui/inputs/field';
import { graphemeCount } from '@oge-ui/inputs/field';
import {
  OGE_INPUT_HOST,
  type OgeInputCopyApi,
  type OgeInputCounterState,
  type OgeInputRevealApi,
} from '@oge-ui/inputs/field';
import { OgeInputBase } from '@oge-ui/inputs/field';
import type { OgeInputCounterMode, OgeTextBoxMode } from '@oge-ui/inputs/field';

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
 * with reactive/template forms via `formControl`/`ngModel`. A `mask` turns it
 * into a masked editor (`@oge-ui/inputs/masked-text-box` is the mask-first
 * twin):
 *
 * ```html
 * <oge-text-box label="Phone" mask="(000) 000-0000" [(value)]="phone" />
 * ```
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
        [value]="displayText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly()"
        [attr.name]="name() || null"
        [attr.maxlength]="nativeMaxLength()"
        [attr.minlength]="minLength() ?? null"
        [attr.autocomplete]="autocomplete() ?? null"
        [attr.inputmode]="effectiveInputMode()"
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
        (beforeinput)="onBeforeInput($event)"
        (input)="onNativeInput($event)"
        (click)="onMaskClick($event)"
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

  // --- mask -------------------------------------------------------------------

  /**
   * Input mask — `0` digit, `9` optional digit, `#` digit/space/sign, `L`/`l`
   * letter (required/optional), `A`/`a` letter or digit, `C`/`c` any
   * character, a backslash escapes a literal; every other character is a
   * literal. Typing overwrites slot by slot, skipping literals; paste accepts
   * raw or formatted text. `undefined` = a plain text box.
   */
  readonly mask = input<string | undefined>(undefined);
  /** Extra or overriding single-character mask rules (always required slots). */
  readonly maskRules = input<OgeMaskRules | undefined>(undefined);
  /** Placeholder character of empty mask slots. */
  readonly maskChar = input('_');
  /** `'always'` shows the mask while blurred too; `'onFocus'` only while focused or filled. */
  readonly showMaskMode = input<OgeMaskShowMode>('always');
  /** The value carries the mask literals (`(555) 123-4567`) instead of the raw characters. */
  readonly includeLiterals = input(false);
  /** Error shown while required mask slots are empty; falls back to `messages.maskInvalidError`. */
  readonly maskInvalidMessage = input<string | undefined>(undefined);
  /**
   * The built-in "required slots are filled" check (Kendo `maskValidation`):
   * the field error and the reactive-forms `{ mask }` validator. `false`
   * leaves completeness to your own validators.
   */
  readonly maskValidation = input(true);
  /** Fires when the last required mask slot is filled. */
  readonly maskCompleted = output<OgeMaskCompletedEvent>();

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');

  /** Text as typed — follows `value` on programmatic writes. */
  protected readonly liveText = linkedSignal({
    source: this.value,
    computation: (v: string) => v,
  });

  protected readonly nativeMaxLength = computed(() =>
    this.counterMode() === 'limit' && !this.maskCore()
      ? (this.maxLength() ?? null)
      : null,
  );

  // --- mask state ---------------------------------------------------------------

  /** The compiled mask machine; a new one whenever the pattern changes. */
  protected readonly maskCore = computed(() => {
    const mask = this.mask();
    if (!mask) return null;
    return new OgeMaskCore({
      mask,
      rules: this.maskRules(),
      maskChar: this.maskChar(),
    });
  });
  /** Display text of the mask (literals + entered + placeholders). */
  private readonly maskText = signal('');
  private readonly maskStatus = signal({ empty: true, complete: true });

  /** What the native input shows — the mask text or the typed text. */
  protected readonly displayText = computed(() => {
    if (!this.maskCore()) return this.liveText();
    const { empty } = this.maskStatus();
    const showBlurred =
      this.showMaskMode() === 'always' && this.labelMode() !== 'floating';
    return empty && !showBlurred && !this.focusedSig() ? '' : this.maskText();
  });

  protected readonly effectiveInputMode = computed(() => {
    const explicit = this.inputMode();
    if (explicit) return explicit;
    const mask = this.mask();
    return mask ? (ogeMaskInputMode(mask, this.maskRules()) ?? null) : null;
  });

  /** `true` unless a mask is set and a required slot of the entered value is empty. */
  isMaskComplete(): boolean {
    const core = this.maskCore();
    return !core || core.isEmpty() || core.isComplete();
  }

  private compositionRange: [number, number] | null = null;

  private syncMask(core: OgeMaskCore): void {
    this.maskText.set(core.text());
    this.maskStatus.set({ empty: core.isEmpty(), complete: core.isComplete() });
  }

  private applyMaskEdit(
    core: OgeMaskCore,
    el: HTMLInputElement,
    edit: OgeMaskEdit,
    event: Event,
  ): void {
    // the core is already edited — the last synced status is the "before"
    const before = this.maskStatus();
    const wasComplete = !before.empty && before.complete;
    el.value = edit.text;
    try {
      el.setSelectionRange(edit.caret, edit.caret);
    } catch {
      // detached / hidden inputs refuse selection writes — non-fatal
    }
    this.syncMask(core);
    const value = core.value(this.includeLiterals());
    this.liveText.set(value);
    this.inputChange.emit({ text: edit.text, event });
    if (edit.changed) this.queueCommit(value, event);
    if (!wasComplete && !core.isEmpty() && core.isComplete()) {
      this.maskCompleted.emit({
        value,
        rawValue: core.rawValue(),
        maskedValue: core.maskedValue(),
      });
    }
  }

  protected onBeforeInput(event: Event): void {
    const core = this.maskCore();
    if (!core || this.readonly()) return;
    const native = event as InputEvent;
    const el = event.target as HTMLInputElement;
    const data =
      native.data ?? native.dataTransfer?.getData('text/plain') ?? null;
    const edit = core.beforeInput(
      native.inputType ?? 'insertText',
      data,
      el.selectionStart ?? 0,
      el.selectionEnd ?? 0,
    );
    if (!edit) return; // IME composition — applied at compositionend
    event.preventDefault();
    this.applyMaskEdit(core, el, edit, event);
  }

  protected onMaskClick(event: MouseEvent): void {
    const core = this.maskCore();
    const el = event.target as HTMLInputElement;
    if (!core || el.selectionStart !== el.selectionEnd) return;
    const caret = core.normalizeCaret(el.selectionStart ?? 0);
    if (caret !== el.selectionStart) el.setSelectionRange(caret, caret);
  }

  protected override handleCompositionStart(): void {
    const el = this.nativeElement();
    this.compositionRange =
      this.maskCore() && el
        ? [el.selectionStart ?? 0, el.selectionEnd ?? 0]
        : null;
    super.handleCompositionStart();
  }

  /** Reactive-forms validator mirroring the editor's mask rule (`{ mask: message }`). */
  private readonly maskValidator = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const mask = untracked(this.mask);
    const value = control.value as unknown;
    if (!mask || !untracked(this.maskValidation)) return null;
    if (typeof value !== 'string' || !value) return null;
    const complete = ogeMaskComplete(mask, value, {
      rules: untracked(this.maskRules),
      includeLiterals: untracked(this.includeLiterals),
    });
    return complete
      ? null
      : {
          mask:
            untracked(this.maskInvalidMessage) ??
            untracked(this.msg).maskInvalidError,
        };
  };

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
    const core = this.maskCore();
    if (core) {
      if (this.composing) return; // the composed text lands at compositionend
      // input no beforeinput announced (autofill, some virtual keyboards)
      const el = event.target as HTMLInputElement;
      this.applyMaskEdit(
        core,
        el,
        core.reconcile(el.value, el.selectionStart ?? undefined),
        event,
      );
      return;
    }
    const text = (event.target as HTMLInputElement).value;
    this.liveText.set(text);
    this.inputChange.emit({ text, event });
    if (this.composing) return; // buffered until compositionend
    this.queueCommit(text, event);
  }

  protected override onCompositionCommit(event: Event): void {
    const el = this.nativeElement();
    const core = this.maskCore();
    if (core && el) {
      const [start, end] = this.compositionRange ?? [0, 0];
      this.compositionRange = null;
      // the composed text was rendered natively — rebuild from the mask
      const data = (event as CompositionEvent).data ?? '';
      this.applyMaskEdit(core, el, core.insert(start, end, data), event);
      return;
    }
    if (el) this.queueCommit(el.value, event);
  }

  protected override afterFocusGained(): void {
    super.afterFocusGained();
    const core = this.maskCore();
    const el = this.nativeElement();
    if (!core || !el || this.selectOnFocus()) return;
    // show the mask now (showMaskMode 'onFocus') and park the caret on the
    // first empty slot
    el.value = core.text();
    const caret = core.normalizeCaret(el.selectionStart ?? 0);
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      // non-fatal
    }
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
    // Model → mask: a new pattern or an external value write re-fills the
    // slots; our own commits round-trip unchanged and are skipped.
    let lastCore: OgeMaskCore | null = null;
    effect(() => {
      const core = this.maskCore();
      const value = this.value();
      const includeLiterals = this.includeLiterals();
      untracked(() => {
        if (!core) {
          lastCore = null;
          return;
        }
        if (core !== lastCore || core.value(includeLiterals) !== value) {
          core.setValue(value ?? '', includeLiterals);
          lastCore = core;
        }
        this.syncMask(core);
      });
    });
    effect(() => {
      const core = this.maskCore();
      const { empty, complete } = this.maskStatus();
      const message =
        core && this.maskValidation() && !empty && !complete
          ? (this.maskInvalidMessage() ?? this.msg().maskInvalidError)
          : null;
      untracked(() => this.formatError.set(message));
    });
    // Reactive forms see the same rule as a plain validator (never
    // NG_VALIDATORS — that next to the self-injected NgControl is a DI cycle).
    afterNextRender(() => {
      const control = this.ngControl?.control as
        (AbstractControl & { addValidators?: unknown }) | null | undefined;
      if (!control || typeof control.addValidators !== 'function') return;
      control.addValidators(this.maskValidator);
      control.updateValueAndValidity({ emitEvent: false });
      this.destroyRef.onDestroy(() =>
        control.removeValidators(this.maskValidator),
      );
    });
  }
}
