'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { withInputWidth } from './field-extras';
import {
  OgeMaskCore,
  graphemeCount,
  ogeMaskInputMode,
  type OgeMaskCompletedEvent,
  type OgeMaskEdit,
  type OgeMaskRules,
  type OgeMaskShowMode,
} from '@oge-ui/behavior';
import {
  OgeFieldChrome,
  type OgeInputCopyState,
  type OgeInputCounterState,
  type OgeInputRevealState,
} from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

/** SSR-safe layout effect (client components still server-render). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Native input types supported by the text box. */
export type OgeTextBoxMode =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTextBoxHandle {
  focus(): void;
  blur(): void;
  /** Clears the value (commits immediately), keeps focus in the field. */
  clear(): void;
  /** `true` unless a mask is set and a required slot of the entered value is empty. */
  isMaskComplete(): boolean;
}

export interface OgeTextBoxProps
  extends OgeControlProps<string>, OgeFieldExtrasProps {
  /** Native input type. `password` auto-enables the reveal toggle. */
  mode?: OgeTextBoxMode;
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  /** Helper text in the subscript region (hidden while an error shows). */
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  /** Stretches the field to 100% width. */
  fluid?: boolean;
  showClearButton?: boolean;
  /** Counter denominator; enforced natively while `counterMode` is `limit`. */
  maxLength?: number;
  minLength?: number;
  autocomplete?: string;
  inputMode?: string;
  enterKeyHint?: string;
  autocapitalize?: string;
  spellcheck?: boolean;
  /** Renders the grapheme-accurate counter in the subscript end slot. */
  showCounter?: boolean;
  counterMode?: 'limit' | 'soft';
  /** Password reveal toggle; on by default for `mode="password"`. */
  revealable?: boolean;
  /** Copy-to-clipboard rail button (API keys, tokens…). */
  showCopyButton?: boolean;
  /**
   * Input mask — `0` digit, `9` optional digit, `#` digit/space/sign, `L`/`l`
   * letter (required/optional), `A`/`a` letter or digit, `C`/`c` any
   * character, a backslash escapes a literal; every other character is a
   * literal. Typing overwrites slot by slot, skipping literals; paste accepts
   * raw or formatted text. Unset = a plain text box.
   */
  mask?: string;
  /** Extra or overriding single-character mask rules (always required slots). Memoize it. */
  maskRules?: OgeMaskRules;
  /** Placeholder character of empty mask slots. Default `'_'`. */
  maskChar?: string;
  /** `'always'` shows the mask while blurred too; `'onFocus'` only while focused or filled. */
  showMaskMode?: OgeMaskShowMode;
  /** The value carries the mask literals (`(555) 123-4567`) instead of the raw characters. */
  includeLiterals?: boolean;
  /** Error shown while required mask slots are empty; falls back to `messages.maskInvalidError`. */
  maskInvalidMessage?: string;
  /**
   * The built-in "required slots are filled" check (Kendo `maskValidation`).
   * `false` leaves completeness to your own validation. Default `true`.
   */
  maskValidation?: boolean;
  /** Fires when the last required mask slot is filled. */
  onMaskCompleted?: (event: OgeMaskCompletedEvent) => void;
  /** Raw text on every keystroke, regardless of the commit policy. */
  onInputChange?: (event: { text: string; event: Event }) => void;
  /** Content of the `[ogeInputPrefix]` slot. */
  prefix?: ReactNode;
  /** Content of the `[ogeInputSuffix]` slot. */
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Single-line text editor with the full oge field chrome — the React render
 * of the Angular `<oge-text-box>`: label modes, prefix/suffix slots, clear
 * button, validation subscript, grapheme-accurate character counter, password
 * reveal and copy-to-clipboard, over the same `@oge-ui/behavior` commit
 * pipeline, the same messages and the same stylesheet.
 *
 * ```tsx
 * <OgeTextBox label="E-mail" mode="email" value={email} onValueChange={setEmail} showClearButton />
 * ```
 */
export const OgeTextBox = forwardRef<OgeTextBoxHandle, OgeTextBoxProps>(
  function OgeTextBoxRender(props, ref) {
    const {
      mode = 'text',
      label = '',
      labelMode = 'static',
      stylingMode = 'outlined',
      placeholder = '',
      hint,
      subscriptSizing = 'fixed',
      fluid = false,
      showClearButton = false,
      showSuccessIcon = false,
      selectOnFocus = false,
      inputAttr,
      maxLength,
      minLength,
      autocomplete,
      inputMode,
      enterKeyHint,
      autocapitalize,
      spellcheck,
      showCounter = false,
      counterMode = 'limit',
      revealable = true,
      showCopyButton = false,
      mask,
      maskRules,
      maskChar = '_',
      showMaskMode = 'always',
      includeLiterals = false,
      maskInvalidMessage,
      maskValidation = true,
      prefix,
      suffix,
      className,
      style,
    } = props;

    const config = useOgeInputsConfig();
    const nativeRef = useRef<HTMLInputElement>(null);

    // --- mask ---------------------------------------------------------------

    const maskCore = useMemo(
      () =>
        mask ? new OgeMaskCore({ mask, rules: maskRules, maskChar }) : null,
      [mask, maskRules, maskChar],
    );
    const [, bumpMask] = useReducer((n: number) => n + 1, 0);
    // Model → mask: a new pattern or an external value write re-fills the
    // slots. Compared with the last value *seen*, not the core's own value,
    // so a debounced commit in flight never wipes what is being typed.
    const maskSync = useRef<{ core: OgeMaskCore | null; value: unknown }>({
      core: null,
      value: undefined,
    });
    const maskMessages = { ...config.messages, ...props.messages };
    const maskFormatError =
      maskCore &&
      maskValidation &&
      !maskCore.isEmpty() &&
      !maskCore.isComplete()
        ? (maskInvalidMessage ?? maskMessages.maskInvalidError)
        : null;

    const field = useOgeField<string>({
      props,
      emptyValue: '',
      isEmpty: (value) => value === '',
      focusNative: () => nativeRef.current?.focus(),
      formatError: maskFormatError,
    });

    if (maskCore) {
      const sync = maskSync.current;
      if (sync.core !== maskCore || !Object.is(sync.value, field.value)) {
        // idempotent for the same (core, value) pair — StrictMode-safe
        const refill =
          sync.core !== maskCore ||
          maskCore.value(includeLiterals) !== field.value;
        maskSync.current = { core: maskCore, value: field.value };
        if (refill) {
          const errorBefore = maskFormatError;
          maskCore.setValue(field.value ?? '', includeLiterals);
          const errorAfter =
            maskValidation && !maskCore.isEmpty() && !maskCore.isComplete()
              ? (maskInvalidMessage ?? maskMessages.maskInvalidError)
              : null;
          // the error above was derived before the refill — re-render once
          // (a same-component update during render; converges next pass)
          if (errorAfter !== errorBefore) bumpMask();
        }
      }
    }
    /** The natively rendered IME text while a composition is in progress. */
    const [compositionText, setCompositionText] = useState<string | null>(null);
    const compositionRange = useRef<[number, number] | null>(null);
    const pendingCaret = useRef<number | null>(null);
    useIsomorphicLayoutEffect(() => {
      const caret = pendingCaret.current;
      const el = nativeRef.current;
      if (caret === null || !el) return;
      pendingCaret.current = null;
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        // non-fatal
      }
    });

    const applyMaskEdit = (
      core: OgeMaskCore,
      el: HTMLInputElement,
      edit: OgeMaskEdit,
      event: Event,
      wasComplete: boolean,
    ) => {
      el.value = edit.text;
      try {
        el.setSelectionRange(edit.caret, edit.caret);
      } catch {
        // detached / hidden inputs refuse selection writes — non-fatal
      }
      pendingCaret.current = edit.caret;
      // maskSync keeps the last *model* value: a debounced commit still in
      // flight must not look like an external write on the next render
      const value = core.value(includeLiterals);
      setLiveText(value);
      bumpMask();
      props.onInputChange?.({ text: edit.text, event });
      if (edit.changed) field.commit.queue(value, event);
      if (!wasComplete && !core.isEmpty() && core.isComplete()) {
        props.onMaskCompleted?.({
          value,
          rawValue: core.rawValue(),
          maskedValue: core.maskedValue(),
        });
      }
    };
    const latestMask = useRef({ maskCore, applyMaskEdit, readonly: false });
    latestMask.current = {
      maskCore,
      applyMaskEdit,
      readonly: props.readonly ?? false,
    };

    // React's onBeforeInput is a keypress polyfill without `inputType` (no
    // deletions), so the mask listens to the native event.
    useEffect(() => {
      const el = nativeRef.current;
      if (!el) return;
      const onBeforeInput = (event: Event) => {
        const {
          maskCore: core,
          applyMaskEdit: apply,
          readonly,
        } = latestMask.current;
        if (!core || readonly) return;
        const native = event as InputEvent;
        const data =
          native.data ?? native.dataTransfer?.getData('text/plain') ?? null;
        const wasComplete = !core.isEmpty() && core.isComplete();
        const edit = core.beforeInput(
          native.inputType ?? 'insertText',
          data,
          el.selectionStart ?? 0,
          el.selectionEnd ?? 0,
        );
        if (!edit) return; // IME composition — applied at compositionend
        event.preventDefault();
        apply(core, el, edit, event, wasComplete);
      };
      el.addEventListener('beforeinput', onBeforeInput);
      return () => el.removeEventListener('beforeinput', onBeforeInput);
    }, []);

    const maskEmpty = maskCore ? maskCore.isEmpty() : true;
    const effectiveInputMode =
      inputMode ?? (mask ? ogeMaskInputMode(mask, maskRules) : undefined);

    /** Text as typed — follows `value` on committed/programmatic writes. */
    const [liveText, setLiveText] = useState(field.value);
    const [prevValue, setPrevValue] = useState(field.value);
    if (prevValue !== field.value) {
      setPrevValue(field.value);
      setLiveText(field.value);
    }

    const composing = useRef(false);

    // --- reveal -------------------------------------------------------------

    const [revealActive, setRevealActive] = useState(false);
    const reveal: OgeInputRevealState | null =
      mode === 'password'
        ? {
            visible: revealable && !field.effectiveDisabled,
            active: revealActive,
            toggle: () => {
              const el = nativeRef.current;
              const next = !revealActive;
              // Toggle the type in place (never re-create the input — that
              // would lose the caret and break password managers) and
              // restore the selection.
              let start: number | null = null;
              let end: number | null = null;
              try {
                start = el?.selectionStart ?? null;
                end = el?.selectionEnd ?? null;
              } catch {
                // some engines refuse selection reads on type=password
              }
              if (el) el.type = next ? 'text' : 'password';
              setRevealActive(next);
              try {
                if (el && start !== null && end !== null) {
                  el.setSelectionRange(start, end);
                }
              } catch {
                // non-fatal — caret restore is best-effort
              }
              el?.focus();
            },
          }
        : null;

    const effectiveType = mode === 'password' && revealActive ? 'text' : mode;

    // --- copy ---------------------------------------------------------------

    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
      () => () => {
        if (copiedTimer.current !== null) clearTimeout(copiedTimer.current);
      },
      [],
    );
    const copy: OgeInputCopyState | null = showCopyButton
      ? {
          visible:
            typeof navigator !== 'undefined' &&
            !!navigator.clipboard &&
            liveText !== '',
          copied,
          trigger: () => {
            // liveText, not value — a pending debounce must not stale the
            // clipboard
            navigator.clipboard.writeText(liveText).then(
              () => {
                setCopied(true);
                if (copiedTimer.current !== null) {
                  clearTimeout(copiedTimer.current);
                }
                copiedTimer.current = setTimeout(() => {
                  copiedTimer.current = null;
                  setCopied(false);
                }, config.copiedResetMs);
              },
              () => undefined,
            );
          },
        }
      : null;

    // --- counter ------------------------------------------------------------

    const counter: OgeInputCounterState | null = showCounter
      ? (() => {
          const count = graphemeCount(liveText);
          return {
            count,
            max: maxLength,
            over: maxLength !== undefined && count > maxLength,
          };
        })()
      : null;

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        blur: () => nativeRef.current?.blur(),
        clear: () => {
          field.clear();
          setLiveText('');
        },
        isMaskComplete: () => {
          const core = latestMask.current.maskCore;
          return !core || core.isEmpty() || core.isComplete();
        },
      }),
      [],
    );

    const readonly = props.readonly ?? false;
    const floatUp = field.focused || !field.isEmpty;
    const displayText = !maskCore
      ? liveText
      : compositionText !== null
        ? compositionText
        : maskEmpty &&
            !(showMaskMode === 'always' && labelMode !== 'floating') &&
            !field.focused
          ? ''
          : maskCore.text();
    const placeholderText =
      labelMode === 'floating' && label && !floatUp ? '' : placeholder;

    const successVisible = successIconVisible(showSuccessIcon, {
      pending: props.pending ?? false,
      invalid: field.effectiveInvalid,
      empty: field.isEmpty,
      touched: field.effectiveTouched,
    });

    const describedBy = (() => {
      const parts: string[] = [];
      if (subscriptSizing !== 'none') {
        if (field.showError && field.resolvedErrorText) {
          parts.push(field.ids.errorId);
        } else if (hint) parts.push(field.ids.hintId);
        if (counter) parts.push(field.ids.counterId);
      }
      return parts.length ? parts.join(' ') : undefined;
    })();

    const hostClasses = [
      'oge-input',
      'oge-text-box',
      field.effectiveDisabled && 'oge-disabled',
      field.focused && 'oge-input-focused',
      field.showError && 'oge-input-invalid',
      readonly && 'oge-input-readonly',
      field.isEmpty && 'oge-input-empty',
      fluid && 'oge-input-fluid',
      floatUp && 'oge-input-float-up',
      props.size === 'sm' && 'oge-input-sm',
      props.size === 'lg' && 'oge-input-lg',
      stylingMode === 'filled' && 'oge-input-filled',
      stylingMode === 'underlined' && 'oge-input-underlined',
      labelMode === 'floating' && 'oge-input-label-floating',
      labelMode === 'outside' && 'oge-input-label-outside',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const extraAttrs = nativeInputAttrs(inputAttr);

    return (
      <span className={hostClasses} style={withInputWidth(style, props.width)}>
        <OgeFieldChrome
          host={{
            msg: field.msg,
            ...field.ids,
            label,
            labelMode,
            required: props.required ?? false,
            pendingVisible: props.pending ?? false,
            successVisible,
            showClear:
              showClearButton &&
              !field.isEmpty &&
              !field.effectiveDisabled &&
              !readonly,
            clear: () => {
              field.clear();
              setLiveText('');
            },
            subscriptSizing,
            showError: field.showError,
            resolvedErrorText: field.resolvedErrorText,
            hint,
            counter,
            reveal,
            copy,
            spin: null,
            dropdown: null,
          }}
          prefix={prefix}
          suffix={suffix}
        >
          <input
            ref={nativeRef}
            className="oge-input-native"
            id={field.ids.inputId}
            type={effectiveType}
            value={displayText}
            placeholder={placeholderText}
            disabled={field.effectiveDisabled}
            readOnly={readonly}
            name={props.name || undefined}
            maxLength={
              counterMode === 'limit' && !maskCore ? maxLength : undefined
            }
            minLength={minLength}
            autoComplete={autocomplete}
            inputMode={
              effectiveInputMode as OgeTextBoxProps['inputMode'] & undefined
            }
            enterKeyHint={enterKeyHint as 'enter' | 'done' | 'go' | undefined}
            autoCapitalize={autocapitalize}
            spellCheck={spellcheck}
            title={props.tooltip}
            tabIndex={props.tabIndex ?? 0}
            autoFocus={props.autofocus}
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            {...extraAttrs}
            onChange={(event) => {
              const text = event.target.value;
              if (maskCore) {
                if (composing.current) {
                  // keep the native composition on screen until it settles
                  setCompositionText(text);
                  return;
                }
                // input no beforeinput announced (autofill, some keyboards)
                const wasComplete =
                  !maskCore.isEmpty() && maskCore.isComplete();
                applyMaskEdit(
                  maskCore,
                  event.target,
                  maskCore.reconcile(
                    text,
                    event.target.selectionStart ?? undefined,
                  ),
                  event.nativeEvent,
                  wasComplete,
                );
                return;
              }
              setLiveText(text);
              props.onInputChange?.({ text, event: event.nativeEvent });
              if (composing.current) return; // buffered until compositionend
              field.commit.queue(text, event.nativeEvent);
            }}
            onCompositionStart={() => {
              composing.current = true;
              const el = nativeRef.current;
              compositionRange.current =
                maskCore && el
                  ? [el.selectionStart ?? 0, el.selectionEnd ?? 0]
                  : null;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              const el = nativeRef.current;
              if (maskCore && el) {
                const [start, end] = compositionRange.current ?? [0, 0];
                compositionRange.current = null;
                setCompositionText(null);
                const wasComplete =
                  !maskCore.isEmpty() && maskCore.isComplete();
                applyMaskEdit(
                  maskCore,
                  el,
                  maskCore.insert(start, end, event.data ?? ''),
                  event.nativeEvent,
                  wasComplete,
                );
                return;
              }
              if (el) field.commit.queue(el.value, event.nativeEvent);
            }}
            onClick={(event) => {
              const el = event.currentTarget;
              if (!maskCore || el.selectionStart !== el.selectionEnd) return;
              const caret = maskCore.normalizeCaret(el.selectionStart ?? 0);
              if (caret !== el.selectionStart)
                el.setSelectionRange(caret, caret);
            }}
            onFocus={(event) => {
              field.handleFocus(event);
              if (selectOnFocus) nativeRef.current?.select();
              else if (maskCore) {
                // show the mask now and park the caret on the first empty slot
                const el = event.currentTarget;
                el.value = maskCore.text();
                const caret = maskCore.normalizeCaret(el.selectionStart ?? 0);
                pendingCaret.current = caret;
                try {
                  el.setSelectionRange(caret, caret);
                } catch {
                  // non-fatal
                }
              }
            }}
            onBlur={field.handleBlur}
            onKeyDown={field.handleEnterKey}
          />
        </OgeFieldChrome>
      </span>
    );
  },
);
