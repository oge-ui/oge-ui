import {
  DestroyRef,
  Directive,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import {
  NgControl,
  type ControlValueAccessor,
  type ValidationErrors,
} from '@angular/forms';
import { OGE_INPUTS_CONFIG, type OgeInputsMessages } from '../config';
import { resolveErrorMessage } from './error-messages';
import type {
  OgeInputCounterState,
  OgeInputCopyApi,
  OgeInputHost,
  OgeInputRevealApi,
  OgeInputSpinApi,
} from './input-host';
import type {
  OgeFieldError,
  OgeInputErrorDisplay,
  OgeInputFocusEvent,
  OgeInputKeyEvent,
  OgeInputLabelMode,
  OgeInputRawEvent,
  OgeInputValueCommittedEvent,
  OgeInputShowSuccessIcon,
  OgeInputSize,
  OgeInputStylingMode,
  OgeInputSubscriptSizing,
} from './input-types';

let nextInputUid = 0;

/**
 * Shared behavior of every oge editor: the field chrome contract, the
 * commit/debounce pipeline and the triple forms integration —
 * standalone `[(value)]`, Signal Forms (`FormValueControl` contract member
 * names) and a ControlValueAccessor bridge for reactive/template forms.
 *
 * CVA house pattern (first in this repo): there is **no** `NG_VALUE_ACCESSOR`
 * provider — the constructor assigns `ngControl.valueAccessor = this`
 * (constructor-assignment pattern), which lets the component inject `NgControl` to
 * render validation state without a circular DI.
 */
@Directive({
  host: {
    '[class.oge-input-focused]': 'focusedSig()',
    '[class.oge-input-invalid]': 'showError()',
    '[class.oge-disabled]': 'effectiveDisabled()',
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
  implements ControlValueAccessor, OgeInputHost
{
  protected readonly config = inject(OGE_INPUTS_CONFIG);
  protected readonly destroyRef = inject(DestroyRef);
  /** Present when the editor is bound via reactive/template forms. */
  readonly ngControl = inject(NgControl, { optional: true, self: true });

  /** Editor value — declared in each subclass so the type is concrete. */
  abstract readonly value: ModelSignal<T>;

  // --- chrome inputs ---------------------------------------------------------

  /** Base for the generated element ids (input/label/hint/error/counter). */
  readonly id = input<string | undefined>(undefined);
  readonly label = input('');
  readonly labelMode = input<OgeInputLabelMode>('static');
  readonly stylingMode = input<OgeInputStylingMode>('outlined');
  /** Container height preset — 28/34/42px, the button scale. */
  readonly size = input<OgeInputSize>('md');
  readonly placeholder = input('');
  /** Helper text in the subscript region (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /** Native `title` attribute of the input element. */
  readonly tooltip = input<string | undefined>(undefined);
  readonly subscriptSizing = input<OgeInputSubscriptSizing>('fixed');
  /** Stretches the field to 100% width (default width: 240px via `--oge-input-width`). */
  readonly fluid = input(false);
  readonly showClearButton = input(false);
  readonly showSuccessIcon = input<OgeInputShowSuccessIcon>(false);
  readonly tabIndex = input(0);
  /** Focuses the editor after its first render. */
  readonly autofocus = input(false);
  /** Selects the whole text when the input receives focus. */
  readonly selectOnFocus = input(false);
  /** Escape hatch: extra attributes rendered onto the native input. */
  readonly inputAttr = input<Record<string, string>>({});
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<Partial<OgeInputsMessages> | undefined>(undefined);

  // --- state/forms inputs (names fixed by the FormValueControl contract) -----

  readonly disabled = input(false);
  /** Focusable but not editable. (Contract name — not `readOnly`.) */
  readonly readonly = input(false);
  readonly required = input(false);
  /** Native `name` attribute. */
  readonly name = input('');
  /** External invalid override — combined with forms state. */
  readonly invalid = input(false);
  /** Async-validation indicator; spinner shows in the rail while `true`. */
  readonly pending = input(false);
  readonly touched = input(false);
  readonly dirty = input(false);
  /** Signal Forms validation errors (auto-bound by `[formField]`). */
  readonly errors = input<readonly OgeFieldError[]>([]);
  /** Explicit error message — always wins over resolved messages. */
  readonly errorText = input<string | undefined>(undefined);
  readonly errorDisplay = input<OgeInputErrorDisplay>('touched');
  /** Commit delay in ms for `value`/forms updates; blur and Enter flush. */
  readonly debounce = input<number | undefined>(undefined);

  // --- outputs ---------------------------------------------------------------

  /** Raw text on every keystroke, regardless of the commit policy. */
  readonly inputChange = output<OgeInputRawEvent>();
  /**
   * Fires on every committed change with `previousValue` and the originating
   * DOM event (`undefined` for programmatic writes) — the rich payload for
   * cross-field rules.
   */
  readonly valueCommitted = output<OgeInputValueCommittedEvent<T>>();
  readonly cleared = output<void>();
  /** Enter pressed inside the editor (pending debounce is flushed first). */
  readonly enterKey = output<OgeInputKeyEvent>();
  readonly focused = output<OgeInputFocusEvent>();
  readonly blurred = output<OgeInputFocusEvent>();
  /** FormValueControl contract — emitted once per blur. */
  readonly touch = output<void>();

  // --- ids -------------------------------------------------------------------

  private readonly uid = `oge-input-${nextInputUid++}`;
  private readonly baseId = computed(() => this.id() ?? this.uid);
  get inputId(): string {
    return this.baseId();
  }
  get labelId(): string {
    return `${this.baseId()}-label`;
  }
  get hintId(): string {
    return `${this.baseId()}-hint`;
  }
  get errorId(): string {
    return `${this.baseId()}-error`;
  }
  get counterId(): string {
    return `${this.baseId()}-counter`;
  }

  // --- derived state ---------------------------------------------------------

  readonly msg = computed<OgeInputsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly focusedSig = signal(false);
  protected readonly selfTouched = signal(false);
  protected readonly selfDirty = signal(false);
  /** Set by subclasses whose text cannot be parsed (number box). */
  protected readonly parseInvalid = signal(false);
  private readonly formsDisabled = signal(false);
  private readonly cvaState = signal<{
    invalid: boolean;
    touched: boolean;
    dirty: boolean;
    errors: ValidationErrors | null;
  }>({ invalid: false, touched: false, dirty: false, errors: null });

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.formsDisabled(),
  );
  readonly effectiveTouched = computed(
    () => this.touched() || this.selfTouched() || this.cvaState().touched,
  );
  readonly effectiveDirty = computed(
    () => this.dirty() || this.selfDirty() || this.cvaState().dirty,
  );
  readonly effectiveInvalid = computed(
    () =>
      this.invalid() ||
      this.errors().length > 0 ||
      this.cvaState().invalid ||
      this.parseInvalid(),
  );

  readonly showError = computed(() => {
    // Parse errors describe what is being typed right now — always visible.
    if (this.parseInvalid()) return true;
    if (!this.effectiveInvalid()) return false;
    switch (this.errorDisplay()) {
      case 'always':
        return true;
      case 'dirty':
        return this.effectiveDirty();
      default:
        return this.effectiveTouched();
    }
  });

  readonly resolvedErrorText = computed<string | null>(() => {
    const explicit = this.errorText();
    if (explicit) return explicit;
    if (this.parseInvalid()) return this.msg().invalidNumberError;
    const resolved = resolveErrorMessage(
      this.errors(),
      this.cvaState().errors,
      this.msg(),
    );
    if (resolved) return resolved;
    return this.effectiveInvalid() ? this.msg().invalidError : null;
  });

  readonly isEmpty = computed(() => this.valueIsEmpty(this.value()));
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

  // --- commit pipeline -------------------------------------------------------

  private onChangeFn: ((value: T) => void) | null = null;
  private onTouchedFn: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCommit: { value: T; event: Event | undefined } | null = null;

  protected queueCommit(value: T, event?: Event): void {
    const ms = this.debounce();
    if (!ms) {
      this.commitNow(value, event);
      return;
    }
    this.pendingCommit = { value, event };
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      const staged = this.pendingCommit;
      this.pendingCommit = null;
      if (staged) this.commitNow(staged.value, staged.event);
    }, ms);
  }

  /** Commits any staged debounced value synchronously (blur/Enter). */
  protected flushCommit(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    const staged = this.pendingCommit;
    this.pendingCommit = null;
    if (staged) {
      this.commitNow(this.transformFlushValue(staged.value), staged.event);
    }
  }

  /** Subclass hook applied to flushed values (number box clamps here). */
  protected transformFlushValue(value: T): T {
    return value;
  }

  protected cancelCommit(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingCommit = null;
  }

  private committing = false;

  protected commitNow(value: T, event?: Event): void {
    // A direct commit supersedes anything staged (spin during debounce etc.).
    this.cancelCommit();
    const previousValue = this.value();
    this.committing = true;
    try {
      this.value.set(value);
    } finally {
      this.committing = false;
    }
    this.onChangeFn?.(value);
    this.selfDirty.set(true);
    if (!Object.is(previousValue, value)) {
      this.valueCommitted.emit({ value, previousValue, event });
    }
  }

  // --- event handlers (wired from subclass templates) ------------------------

  protected handleFocus(event: FocusEvent): void {
    this.focusedSig.set(true);
    if (this.selectOnFocus()) this.nativeElement()?.select();
    this.onFocusChanged(true);
    this.focused.emit({ event });
  }

  protected handleBlur(event: FocusEvent): void {
    this.focusedSig.set(false);
    this.flushCommit();
    this.onFocusChanged(false);
    this.selfTouched.set(true);
    this.onTouchedFn?.();
    this.touch.emit();
    this.blurred.emit({ event });
  }

  protected handleEnterKey(event: Event): void {
    this.flushCommit();
    this.enterKey.emit({ event: event as KeyboardEvent });
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

  /** Subclass hook — number box swaps raw/formatted display here. */
  protected onFocusChanged(_focused: boolean): void {
    // no-op by default
  }

  // --- public API ------------------------------------------------------------

  /** Moves keyboard focus to the native input. */
  focus(): void {
    this.nativeElement()?.focus();
  }

  blur(): void {
    this.nativeElement()?.blur();
  }

  /** Clears the value (commits immediately), keeps focus in the field. */
  clear(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.cancelCommit();
    this.commitNow(this.emptyValue());
    this.onValueWritten();
    this.cleared.emit();
    this.focus();
  }

  /**
   * Returns the field to a pristine state: sets `value` (default: empty),
   * clears touched/dirty/parse-error state and cancels pending commits.
   * On a reactive-forms-bound editor this resets the control itself.
   * `valueCommitted` fires with `event: undefined` when the value changed.
   */
  reset(value?: T): void {
    this.cancelCommit();
    const next = arguments.length > 0 ? (value as T) : this.emptyValue();
    const control = this.ngControl?.control;
    if (
      control &&
      typeof (control as { events?: { subscribe?: unknown } }).events
        ?.subscribe === 'function'
    ) {
      // The control is the authority — its reset flows back through
      // writeValue and the events bridge (touched/dirty included).
      control.reset(next);
      return;
    }
    const previousValue = this.value();
    untracked(() => this.value.set(next));
    this.parseInvalid.set(false);
    this.selfTouched.set(false);
    this.selfDirty.set(false);
    this.onValueWritten();
    if (!Object.is(previousValue, next)) {
      this.valueCommitted.emit({
        value: next,
        previousValue,
        event: undefined,
      });
    }
  }

  // --- ControlValueAccessor --------------------------------------------------

  writeValue(value: unknown): void {
    // A form reset must not be overwritten by a stale debounced commit.
    this.cancelCommit();
    const normalized = this.normalizeWrite(value);
    const previousValue = this.value();
    untracked(() => this.value.set(normalized));
    this.parseInvalid.set(false);
    // The bound control is the authority on touched/dirty after programmatic
    // writes (covers form resets); its state flows back via the events bridge.
    this.selfTouched.set(false);
    this.selfDirty.set(false);
    this.onValueWritten();
    // Suppress the initial form-binding write — the first programmatic
    // assignment is not a change consumers should react to.
    if (this.rendered && !Object.is(previousValue, normalized)) {
      this.valueCommitted.emit({
        value: normalized,
        previousValue,
        event: undefined,
      });
    }
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChangeFn = fn;
    // setUpControl re-runs when [formControl] is re-bound to a new instance —
    // rebind the events bridge to the current control.
    this.bindNgControlEvents();
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formsDisabled.set(disabled);
  }

  /** Subclass hook — refresh derived display state after programmatic writes. */
  protected onValueWritten(): void {
    // no-op by default
  }

  protected normalizeWrite(value: unknown): T {
    return value == null ? this.emptyValue() : (value as T);
  }

  // --- subclass contract -----------------------------------------------------

  protected abstract nativeElement():
    HTMLInputElement | HTMLTextAreaElement | null;
  protected abstract emptyValue(): T;
  protected abstract valueIsEmpty(value: T): boolean;

  private rendered = false;
  private boundControl: object | null = null;
  private bridgeSubscription: { unsubscribe(): void } | null = null;

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
    // The form directive attaches its control after construction — bind the
    // (non-signal) NgControl state to a signal once rendering settles.
    afterNextRender(() => {
      this.rendered = true;
      this.bindNgControlEvents();
      if (this.autofocus()) this.focus();
    });
    // An external model write (parent [(value)] set, Signal Forms
    // field.value.set) supersedes anything the user had staged in a debounce.
    effect(() => {
      this.value();
      untracked(() => {
        if (!this.committing) this.cancelCommit();
      });
    });
    // The bound form is the authority: when it reports untouched/pristine
    // (markAsUntouched, form/field reset), our self flags must follow. Only
    // true→false transitions matter — standalone editors keep their state.
    let wasTouched = false;
    let wasDirty = false;
    effect(() => {
      const cva = this.cvaState();
      const touchedNow = this.touched() || cva.touched;
      const dirtyNow = this.dirty() || cva.dirty;
      untracked(() => {
        if (wasTouched && !touchedNow) this.selfTouched.set(false);
        if (wasDirty && !dirtyNow) this.selfDirty.set(false);
        wasTouched = touchedNow;
        wasDirty = dirtyNow;
      });
    });
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
    // Flush (not drop) a staged commit on teardown — closing a dialog must
    // not silently lose the last keystrokes.
    this.destroyRef.onDestroy(() => this.flushCommit());
  }

  private bindNgControlEvents(): void {
    const control = this.ngControl?.control;
    // Guard on the classic AbstractControl shape — Signal Forms' FormField
    // can surface as an NgControl whose control is a FieldNode (no `events`);
    // its state flows through the bound inputs instead.
    if (
      !control ||
      typeof (control as { events?: { subscribe?: unknown } }).events
        ?.subscribe !== 'function'
    ) {
      return;
    }
    if (this.boundControl === control) return;
    this.bridgeSubscription?.unsubscribe();
    this.boundControl = control;
    const sync = (): void =>
      this.cvaState.set({
        invalid: control.invalid,
        touched: control.touched,
        dirty: control.dirty,
        errors: control.errors,
      });
    sync();
    const subscription = control.events.subscribe(sync);
    this.bridgeSubscription = subscription;
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
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
]);
