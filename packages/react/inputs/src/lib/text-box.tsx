'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { graphemeCount } from '@oge-ui/behavior';
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

/** Native input types supported by the text box. */
export type OgeTextBoxMode =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTextBoxHandle {
  focus(): void;
  blur(): void;
  /** Clears the value (commits immediately), keeps focus in the field. */
  clear(): void;
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
      prefix,
      suffix,
      className,
      style,
    } = props;

    const config = useOgeInputsConfig();
    const nativeRef = useRef<HTMLInputElement>(null);
    const field = useOgeField<string>({
      props,
      emptyValue: '',
      isEmpty: (value) => value === '',
      focusNative: () => nativeRef.current?.focus(),
    });

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
      }),
      [],
    );

    const readonly = props.readonly ?? false;
    const floatUp = field.focused || !field.isEmpty;
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
      <span className={hostClasses} style={style}>
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
            value={liveText}
            placeholder={placeholderText}
            disabled={field.effectiveDisabled}
            readOnly={readonly}
            name={props.name || undefined}
            maxLength={counterMode === 'limit' ? maxLength : undefined}
            minLength={minLength}
            autoComplete={autocomplete}
            inputMode={inputMode as OgeTextBoxProps['inputMode'] & undefined}
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
              setLiveText(text);
              props.onInputChange?.({ text, event: event.nativeEvent });
              if (composing.current) return; // buffered until compositionend
              field.commit.queue(text, event.nativeEvent);
            }}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={(event) => {
              composing.current = false;
              const el = nativeRef.current;
              if (el) field.commit.queue(el.value, event.nativeEvent);
            }}
            onFocus={(event) => {
              field.handleFocus(event);
              if (selectOnFocus) nativeRef.current?.select();
            }}
            onBlur={field.handleBlur}
            onKeyDown={field.handleEnterKey}
          />
        </OgeFieldChrome>
      </span>
    );
  },
);
