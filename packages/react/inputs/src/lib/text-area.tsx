'use client';

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { graphemeCount } from '@oge-ui/behavior';
import { OgeFieldChrome, type OgeInputCounterState } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';

const supportsFieldSizing =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('field-sizing', 'content');

/**
 * Fallback auto-resize measurement (browsers without `field-sizing: content`).
 * Exported for direct unit coverage — the same arithmetic the Angular
 * component runs.
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

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTextAreaHandle {
  focus(): void;
  blur(): void;
  clear(): void;
}

export interface OgeTextAreaProps
  extends OgeControlProps<string>, OgeFieldExtrasProps {
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  showClearButton?: boolean;
  /** Visible rows when `autoResize` is off; the floor when it is on. */
  rows?: number;
  /** Grow/shrink with content between `minRows` and `maxRows`. */
  autoResize?: boolean;
  /** Defaults to `rows`. */
  minRows?: number;
  /** `undefined` = unbounded growth. */
  maxRows?: number;
  maxLength?: number;
  minLength?: number;
  spellcheck?: boolean;
  autocapitalize?: string;
  showCounter?: boolean;
  counterMode?: 'limit' | 'soft';
  /** Raw text on every keystroke, regardless of the commit policy. */
  onInputChange?: (event: { text: string; event: Event }) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Multi-line text editor sharing the full field chrome — the React render of
 * the Angular `<oge-text-area>`. `autoResize` grows the field with its
 * content between `minRows`/`maxRows`, using the native CSS
 * `field-sizing: content` where available and the same measurement fallback
 * elsewhere.
 *
 * ```tsx
 * <OgeTextArea label="Notes" value={notes} onValueChange={setNotes} autoResize maxRows={8} />
 * ```
 */
export const OgeTextArea = forwardRef<OgeTextAreaHandle, OgeTextAreaProps>(
  function OgeTextAreaRender(props, ref) {
    const {
      showSuccessIcon = false,
      selectOnFocus = false,
      inputAttr,
      label = '',
      labelMode = 'static',
      stylingMode = 'outlined',
      placeholder = '',
      hint,
      subscriptSizing = 'fixed',
      fluid = false,
      showClearButton = false,
      rows = 3,
      autoResize = false,
      minRows,
      maxRows,
      maxLength,
      minLength,
      spellcheck = true,
      autocapitalize,
      showCounter = false,
      counterMode = 'limit',
      prefix,
      suffix,
      className,
      style,
    } = props;

    const nativeRef = useRef<HTMLTextAreaElement>(null);
    const field = useOgeField<string>({
      props,
      emptyValue: '',
      isEmpty: (value) => value === '',
      focusNative: () => nativeRef.current?.focus(),
    });

    const [liveText, setLiveText] = useState(field.value);
    const [prevValue, setPrevValue] = useState(field.value);
    if (prevValue !== field.value) {
      setPrevValue(field.value);
      setLiveText(field.value);
    }

    const composing = useRef(false);
    const effectiveMinRows = minRows ?? rows;

    // Measurement fallback — re-runs whenever the text or config changes.
    useLayoutEffect(() => {
      if (supportsFieldSizing || !autoResize) return;
      const el = nativeRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${measureTextAreaHeight(el, effectiveMinRows, maxRows)}px`;
    }, [liveText, autoResize, effectiveMinRows, maxRows]);

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

    const successVisible = successIconVisible(showSuccessIcon, {
      pending: props.pending ?? false,
      invalid: field.effectiveInvalid,
      empty: field.isEmpty,
      touched: field.effectiveTouched,
    });
    const extraAttrs = nativeInputAttrs(inputAttr);

    const hostClasses = [
      'oge-input',
      'oge-text-area',
      autoResize && 'oge-text-area-auto',
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

    return (
      <span
        className={hostClasses}
        style={
          {
            ...style,
            '--oge-ta-min-rows': effectiveMinRows,
            '--oge-ta-max-rows': maxRows,
          } as CSSProperties
        }
      >
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
            reveal: null,
            copy: null,
            spin: null,
            dropdown: null,
          }}
          prefix={prefix}
          suffix={suffix}
        >
          <textarea
            {...extraAttrs}
            ref={nativeRef}
            className="oge-input-native"
            id={field.ids.inputId}
            rows={effectiveMinRows}
            value={liveText}
            placeholder={placeholderText}
            disabled={field.effectiveDisabled}
            readOnly={readonly}
            spellCheck={spellcheck}
            name={props.name || undefined}
            maxLength={counterMode === 'limit' ? maxLength : undefined}
            minLength={minLength}
            autoCapitalize={autocapitalize}
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
            onChange={(event) => {
              const text = event.target.value;
              setLiveText(text);
              props.onInputChange?.({ text, event: event.nativeEvent });
              if (composing.current) return;
              field.commit.queue(text, event.nativeEvent);
            }}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={(event) => {
              composing.current = false;
              const el = nativeRef.current;
              if (el) field.commit.queue(el.value, event.nativeEvent);
            }}
            onFocus={(event) => {
              if (selectOnFocus) nativeRef.current?.select();
              field.handleFocus(event);
            }}
            onBlur={field.handleBlur}
            onKeyDown={field.handleEnterKey}
          />
        </OgeFieldChrome>
      </span>
    );
  },
);
