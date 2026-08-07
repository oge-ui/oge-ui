import {
  Directive,
  computed,
  effect,
  input,
  output,
  untracked,
  type Signal,
} from '@angular/core';
import { OgeControlBase } from './control-base';
import type {
  OgeInputCounterState,
  OgeInputCopyApi,
  OgeInputDropDownApi,
  OgeInputHost,
  OgeInputRevealApi,
  OgeInputSpinApi,
} from './input-host';
import type {
  OgeInputLabelMode,
  OgeInputRawEvent,
  OgeInputShowSuccessIcon,
  OgeInputStylingMode,
  OgeInputSubscriptSizing,
} from './input-types';

/**
 * Shared behavior of every oge *field-chrome* editor: extends the chrome-free
 * `OgeControlBase` (commit pipeline, CVA constructor-assignment, Signal Forms
 * contract) with the field chrome contract — label modes, placeholder,
 * subscript (hint/error/counter), rail feature blocks and the `inputAttr`
 * escape hatch. Bare controls (check box, switch, radio group) skip this
 * class and extend `OgeControlBase` directly.
 */
@Directive({
  host: {
    '[class.oge-input-focused]': 'focusedSig()',
    '[class.oge-input-invalid]': 'showError()',
    '[class.oge-input-readonly]': 'readonly()',
    '[class.oge-input-empty]': 'isEmpty()',
    '[class.oge-input-fluid]': 'fluid()',
    '[class.oge-input-float-up]': 'floatUp()',
    '[class.oge-input-sm]': "size() === 'sm'",
    '[class.oge-input-lg]': "size() === 'lg'",
    '[class.oge-input-filled]': "stylingMode() === 'filled'",
    '[class.oge-input-underlined]': "stylingMode() === 'underlined'",
    '[class.oge-input-label-floating]': "labelMode() === 'floating'",
    '[class.oge-input-label-outside]': "labelMode() === 'outside'",
  },
})
export abstract class OgeInputBase<T>
  extends OgeControlBase<T>
  implements OgeInputHost
{
  // --- chrome inputs ---------------------------------------------------------

  readonly label = input('');
  readonly labelMode = input<OgeInputLabelMode>('static');
  readonly stylingMode = input<OgeInputStylingMode>('outlined');
  readonly placeholder = input('');
  /** Helper text in the subscript region (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  readonly subscriptSizing = input<OgeInputSubscriptSizing>('fixed');
  /** Stretches the field to 100% width (default width: 240px via `--oge-input-width`). */
  readonly fluid = input(false);
  readonly showClearButton = input(false);
  readonly showSuccessIcon = input<OgeInputShowSuccessIcon>(false);
  /** Selects the whole text when the input receives focus. */
  readonly selectOnFocus = input(false);
  /** Escape hatch: extra attributes rendered onto the native input. */
  readonly inputAttr = input<Record<string, string>>({});

  // --- outputs ---------------------------------------------------------------

  /** Raw text on every keystroke, regardless of the commit policy. */
  readonly inputChange = output<OgeInputRawEvent>();

  // --- derived chrome state --------------------------------------------------

  readonly showClear = computed(
    () =>
      this.showClearButton() &&
      !this.isEmpty() &&
      !this.effectiveDisabled() &&
      !this.readonly(),
  );
  readonly pendingVisible = computed(() => this.pending());
  readonly successVisible = computed(() => {
    const mode = this.showSuccessIcon();
    if (
      mode === false ||
      this.pending() ||
      this.effectiveInvalid() ||
      this.isEmpty()
    ) {
      return false;
    }
    return mode === 'always' || this.effectiveTouched();
  });

  /** Floating label lifted state. */
  protected readonly floatUp = computed(
    () => this.focusedSig() || !this.isEmpty(),
  );
  /** Suppressed while a floating label occupies the placeholder position. */
  protected readonly placeholderText = computed(() => {
    if (this.labelMode() === 'floating' && this.label() && !this.floatUp()) {
      return '';
    }
    return this.placeholder();
  });

  readonly describedBy = computed<string | null>(() => {
    const parts: string[] = [];
    if (this.subscriptSizing() !== 'none') {
      if (this.showError() && this.resolvedErrorText())
        parts.push(this.errorId);
      else if (this.hint()) parts.push(this.hintId);
      if (this.counter()) parts.push(this.counterId);
    }
    return parts.length ? parts.join(' ') : null;
  });

  // --- feature blocks (subclasses override where supported) ------------------

  readonly counter: Signal<OgeInputCounterState | null> = computed(() => null);
  readonly reveal: OgeInputRevealApi | null = null;
  readonly copy: OgeInputCopyApi | null = null;
  readonly spin: OgeInputSpinApi | null = null;
  readonly dropdown: OgeInputDropDownApi | null = null;

  // --- event plumbing --------------------------------------------------------

  protected override afterFocusGained(): void {
    if (this.selectOnFocus()) this.nativeElement()?.select();
  }

  // --- IME composition -------------------------------------------------------
  // Intermediate composition states must not hit the model/validators
  // (Angular's DefaultValueAccessor buffers the same way).

  protected composing = false;

  protected handleCompositionStart(): void {
    this.composing = true;
  }

  protected handleCompositionEnd(event: Event): void {
    this.composing = false;
    this.onCompositionCommit(event);
  }

  /** Subclass hook: commit the settled composed text. */
  protected onCompositionCommit(_event: Event): void {
    // no-op by default
  }

  // --- subclass contract -----------------------------------------------------

  protected abstract override nativeElement():
    HTMLInputElement | HTMLTextAreaElement | null;

  constructor() {
    super();
    // Escape-hatch attributes onto the native element, reconciled on change.
    // Attributes the templates bind themselves are ignored to avoid fights.
    let appliedAttrs: string[] = [];
    effect(() => {
      const attrs = this.inputAttr();
      const el = this.nativeElement();
      if (!el) return;
      untracked(() => {
        for (const key of appliedAttrs) {
          if (!(key in attrs)) el.removeAttribute(key);
        }
        for (const [key, attrValue] of Object.entries(attrs)) {
          if (TEMPLATE_BOUND_ATTRS.has(key.toLowerCase())) continue;
          el.setAttribute(key, attrValue);
        }
        appliedAttrs = Object.keys(attrs).filter(
          (key) => !TEMPLATE_BOUND_ATTRS.has(key.toLowerCase()),
        );
      });
    });
  }
}

/** Attributes owned by the editor templates — `inputAttr` may not override. */
const TEMPLATE_BOUND_ATTRS = new Set([
  'id',
  'type',
  'value',
  'disabled',
  'readonly',
  'placeholder',
  'title',
  'tabindex',
  'name',
  'maxlength',
  'minlength',
  'rows',
  'spellcheck',
  'autocomplete',
  'inputmode',
  'enterkeyhint',
  'autocapitalize',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-invalid',
  'aria-required',
  // combobox pattern attributes owned by the select box template
  'role',
  'aria-haspopup',
  'aria-expanded',
  'aria-controls',
  'aria-autocomplete',
  'aria-activedescendant',
]);
