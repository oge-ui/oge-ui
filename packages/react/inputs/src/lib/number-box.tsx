'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  clampNumber,
  createNumberFormatter,
  offsetByStep,
} from '@oge-ui/behavior';
import { OgeFieldChrome, type OgeInputSpinState } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

/** Underlying native type of the number box (`inputmode` is always decimal). */
export type OgeNumberBoxMode = 'text' | 'tel';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeNumberBoxHandle {
  focus(): void;
  blur(): void;
  clear(): void;
}

export interface OgeNumberBoxProps
  extends OgeControlProps<number | null>, OgeFieldExtrasProps {
  /** Lower bound — values clamp on commit (typing is never blocked). */
  min?: number;
  max?: number;
  /** Spin/arrow-key increment. */
  step?: number;
  showSpinButtons?: boolean;
  /** Display formatting applied while unfocused; focus shows the raw number. */
  format?: Intl.NumberFormatOptions;
  /** Overrides the application locale (config `locale`). */
  locale?: string;
  /** Native `type` attr; keyboards vary by device. `inputmode` stays decimal. */
  mode?: OgeNumberBoxMode;
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  showClearButton?: boolean;
  /** Raw text on every keystroke, regardless of the commit policy. */
  onInputChange?: (event: { text: string; event: Event }) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Locale-aware numeric editor — the React render of the Angular
 * `<oge-number-box>`: `null` means empty (never `0`), display formatting via
 * `Intl.NumberFormat` applies on blur while focus shows the raw editable
 * number, values clamp to `min`/`max` on commit, and spin buttons / arrow
 * keys step by `step` with hold-to-repeat — all over the shared
 * `@oge-ui/behavior` arithmetic, so stepping and parsing cannot drift from
 * the Angular editor.
 *
 * ```tsx
 * <OgeNumberBox label="Price" value={price} onValueChange={setPrice} min={0} step={0.5} showSpinButtons />
 * ```
 */
export const OgeNumberBox = forwardRef<OgeNumberBoxHandle, OgeNumberBoxProps>(
  function OgeNumberBoxRender(props, ref) {
    const {
      min,
      max,
      step = 1,
      showSpinButtons = false,
      format,
      locale,
      mode = 'text',
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
      prefix,
      suffix,
      className,
      style,
    } = props;

    const config = useOgeInputsConfig();
    const nativeRef = useRef<HTMLInputElement>(null);
    const field = useOgeField<number | null>({
      props,
      emptyValue: null,
      isEmpty: (value) => value === null,
      transformFlushValue: (value) =>
        value === null ? null : clampNumber(value, min, max),
      focusNative: () => nativeRef.current?.focus(),
    });

    // Cached by content key — inline `format={{...}}` literals produce a new
    // reference every render, and Intl.NumberFormat construction is expensive.
    const resolvedLocale = locale ?? config.locale ?? undefined;
    const formatterKey = `${resolvedLocale ?? ''}|${JSON.stringify(format ?? null)}`;
    const formatter = useMemo(
      () =>
        createNumberFormatter(
          resolvedLocale ?? new Intl.NumberFormat().resolvedOptions().locale,
          format,
        ),
      // deps keyed by content, not identity — see formatterKey above
      [formatterKey],
    );

    /** Raw text while focused. */
    const [editingText, setEditingText] = useState('');

    // A committed/programmatic value change while focused refreshes the raw
    // editing text (spin, external write).
    const [prevValue, setPrevValue] = useState(field.value);
    if (prevValue !== field.value) {
      setPrevValue(field.value);
      if (field.focused) {
        setEditingText(
          field.value === null ? '' : formatter.formatEditable(field.value),
        );
      }
    }

    const displayText = field.focused
      ? editingText
      : field.value === null
        ? ''
        : format !== undefined
          ? formatter.format(field.value)
          : formatter.formatEditable(field.value);

    // --- spin ---------------------------------------------------------------

    const readonly = props.readonly ?? false;
    const spinDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const spinIntervalTimer = useRef<ReturnType<typeof setInterval> | null>(
      null,
    );
    const latestSpin = useRef({ min, max, step, field, formatter });
    latestSpin.current = { min, max, step, field, formatter };

    const canUp = (() => {
      if (field.effectiveDisabled || readonly) return false;
      return max === undefined || field.value === null || field.value < max;
    })();
    const canDown = (() => {
      if (field.effectiveDisabled || readonly) return false;
      return min === undefined || field.value === null || field.value > min;
    })();
    const canStep = (dir: 1 | -1): boolean => {
      const { min: lo, max: hi, field: f } = latestSpin.current;
      if (f.effectiveDisabled) return false;
      const value = f.value;
      return dir === 1
        ? hi === undefined || value === null || value < hi
        : lo === undefined || value === null || value > lo;
    };

    /** Spin commits immediately — it is a discrete action, not typing. */
    const stepBy = (dir: 1 | -1, event?: Event): void => {
      const {
        min: lo,
        max: hi,
        step: by,
        field: f,
        formatter: fmt,
      } = latestSpin.current;
      // A staged debounced keystroke must land before stepping from it.
      f.flush();
      const next = offsetByStep(f.value, dir, by, lo, hi);
      f.setParseInvalid(false);
      f.commit.commitNow(next, event);
      if (f.focused) setEditingText(fmt.formatEditable(next));
    };

    const stopSpin = (): void => {
      if (spinDelayTimer.current !== null) {
        clearTimeout(spinDelayTimer.current);
        spinDelayTimer.current = null;
      }
      if (spinIntervalTimer.current !== null) {
        clearInterval(spinIntervalTimer.current);
        spinIntervalTimer.current = null;
      }
    };
    useEffect(() => stopSpin, []);

    const startSpin = (dir: 1 | -1, event?: Event): void => {
      if (!canStep(dir)) return;
      stepBy(dir, event);
      spinDelayTimer.current = setTimeout(() => {
        spinDelayTimer.current = null;
        spinIntervalTimer.current = setInterval(() => {
          if (!canStep(dir)) {
            stopSpin();
            return;
          }
          stepBy(dir, event);
        }, config.spinRepeatIntervalMs);
      }, config.spinRepeatDelayMs);
    };

    const spin: OgeInputSpinState | null = showSpinButtons
      ? {
          visible: !field.effectiveDisabled && !readonly,
          canUp,
          canDown,
          press: (dir: 1 | -1, event: ReactPointerEvent) => {
            // Keep focus wherever it is — spinning must not blur the input.
            event.preventDefault();
            startSpin(dir, event.nativeEvent);
          },
          release: stopSpin,
        }
      : null;

    // --- typing / keys ------------------------------------------------------

    const onKeyDown = (event: ReactKeyboardEvent): void => {
      if (event.key === 'Enter') {
        field.handleEnterKey(event);
        return;
      }
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      if (field.effectiveDisabled || readonly) return;
      event.preventDefault();
      stepBy(event.key === 'ArrowUp' ? 1 : -1, event.nativeEvent);
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        blur: () => nativeRef.current?.blur(),
        clear: () => {
          field.clear();
          setEditingText('');
        },
      }),
      [],
    );

    const floatUp = field.focused || !field.isEmpty;
    const placeholderText =
      labelMode === 'floating' && label && !floatUp ? '' : placeholder;

    const describedBy = (() => {
      const parts: string[] = [];
      if (subscriptSizing !== 'none') {
        if (field.showError && field.resolvedErrorText) {
          parts.push(field.ids.errorId);
        } else if (hint) parts.push(field.ids.hintId);
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
      'oge-number-box',
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
              setEditingText('');
            },
            subscriptSizing,
            showError: field.showError,
            resolvedErrorText: field.resolvedErrorText,
            hint,
            counter: null,
            reveal: null,
            copy: null,
            spin,
            dropdown: null,
          }}
          prefix={prefix}
          suffix={suffix}
        >
          <input
            {...extraAttrs}
            ref={nativeRef}
            className="oge-input-native"
            id={field.ids.inputId}
            type={mode}
            inputMode="decimal"
            value={displayText}
            placeholder={placeholderText}
            disabled={field.effectiveDisabled}
            readOnly={readonly}
            name={props.name || undefined}
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
              setEditingText(text);
              props.onInputChange?.({ text, event: event.nativeEvent });
              const parsed = formatter.parse(text);
              if (!parsed.ok) {
                field.setParseInvalid(true);
                // an older staged value must not commit under the error
                field.commit.cancel();
                return;
              }
              field.setParseInvalid(false);
              // Un-clamped while typing — clamping mid-keystroke would make
              // values past the bound impossible to type through; the clamp
              // lands on blur.
              field.commit.queue(parsed.value, event.nativeEvent);
            }}
            onFocus={(event) => {
              setEditingText(
                field.value === null
                  ? ''
                  : formatter.formatEditable(field.value),
              );
              field.setParseInvalid(false);
              if (selectOnFocus) nativeRef.current?.select();
              field.handleFocus(event);
            }}
            onBlur={(event) => {
              field.handleBlur(event); // flushes pre-clamped
              if (field.parseInvalid) {
                // unparseable text reverts to the last committed value
                field.setParseInvalid(false);
                return;
              }
              const value = latestSpin.current.field.value;
              if (value !== null) {
                const clamped = clampNumber(value, min, max);
                if (clamped !== value) field.commit.commitNow(clamped);
              }
            }}
            onKeyDown={onKeyDown}
          />
        </OgeFieldChrome>
      </span>
    );
  },
);
