'use client';

import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
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
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

/** Payload of `onCompleted` — every cell is filled. */
export interface OgeOtpCompletedEvent {
  /** The complete code. */
  value: string;
  /** The keystroke, paste or autofill that completed it. */
  event: Event | undefined;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeOtpInputHandle {
  /** Focuses the caret cell (the first empty one). */
  focus(): void;
  blur(): void;
  /** Clears every cell and focuses the first. */
  clear(): void;
}

export interface OgeOtpInputProps extends OgeControlProps<string> {
  /** Number of cells (1–12). */
  length?: number;
  /** Accepted characters: digits, letters and digits, or letters only. */
  type?: OgeOtpInputType;
  /** Letter case applied to typed and pasted letters. */
  letterCase?: OgeOtpInputCase;
  /** Hides the characters like a password field (PINs). */
  masked?: boolean;
  /** Draws `separator` after every `groupSize` cells (`3` → 123-456); `0` = none. */
  groupSize?: number;
  /** Separator glyph between groups (decorative, hidden from assistive technology). */
  separator?: string;
  /** Placeholder character shown in empty cells. */
  placeholder?: string;
  /** Visible group label; also the group's accessible name. */
  label?: string;
  /** Helper text under the cells (hidden while an error shows). */
  hint?: string;
  /** Overrides the locale of the cell names' digits (config `locale` otherwise). */
  locale?: string;
  /** Every cell is filled — by typing, pasting or autofill. */
  onCompleted?: (event: OgeOtpCompletedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * One-time-code / PIN entry — the React render of the Angular
 * `<oge-otp-input>`: `length` cells in one labelled `role="group"`, a single
 * Tab stop on the caret cell, typing that fills and advances, Backspace that
 * steps back, paste and SMS autofill (`autocomplete="one-time-code"`)
 * distributed over the cells. The editing rules are `@oge-ui/behavior`'s
 * OTP core, shared with Angular.
 *
 * ```tsx
 * <OgeOtpInput label="Verification code" value={code} onValueChange={setCode}
 *   onCompleted={(e) => verify(e.value)} />
 * ```
 */
export const OgeOtpInput = forwardRef<OgeOtpInputHandle, OgeOtpInputProps>(
  function OgeOtpInputRender(props, ref) {
    const {
      length = 6,
      type = 'numeric',
      letterCase = 'none',
      masked = false,
      groupSize = 0,
      separator = '–',
      placeholder = '',
      label = '',
      hint,
      locale,
      className,
      style,
    } = props;

    const hostRef = useRef<HTMLDivElement>(null);
    const config = useOgeInputsConfig();
    const resolvedLength = normalizeOtpLength(length);
    const options: OgeOtpOptions = {
      length: resolvedLength,
      type,
      letterCase,
    };
    const [focusIndex, setFocusIndex] = useState(0);

    const cellElement = (index: number): HTMLInputElement | null =>
      hostRef.current?.querySelector<HTMLInputElement>(
        `.oge-otp-input-cell[data-index="${index}"]`,
      ) ?? null;

    const latest = useRef({ current: '' });

    const field = useOgeField<string>({
      props,
      emptyValue: '',
      isEmpty: (value) => !value,
      focusNative: () => cellElement(0)?.focus(),
    });
    const readonly = props.readonly ?? false;
    const editable = !field.effectiveDisabled && !readonly;
    const current = normalizeOtpValue(field.value, options);
    latest.current.current = current;
    const cells = otpCells(current, resolvedLength);
    const complete = Array.from(current).length === resolvedLength;
    // the Tab stop: the focused cell while focus is inside, else the first
    // empty cell — tabbing into a half-typed code resumes where it ended
    const caret = clampOtpFocus(
      field.focused ? focusIndex : Number.MAX_SAFE_INTEGER,
      current,
      resolvedLength,
    );

    const moveFocus = (index: number, value: string): void => {
      const target = clampOtpFocus(index, value, resolvedLength);
      setFocusIndex(target);
      const el = cellElement(target);
      if (!el) return;
      if (el.ownerDocument.activeElement !== el) el.focus();
      el.select?.();
    };

    const syncCells = (value: string): void => {
      otpCells(value, resolvedLength).forEach((text, index) => {
        const el = cellElement(index);
        if (el && el.value !== text) el.value = text;
      });
    };

    const apply = (edit: OgeOtpEdit, event: Event): void => {
      const before = latest.current.current;
      syncCells(edit.value);
      if (edit.value !== before) {
        latest.current.current = edit.value;
        field.commit.commitNow(edit.value, event);
      }
      moveFocus(edit.focusIndex, edit.value);
      if (edit.complete && edit.value !== before) {
        props.onCompleted?.({ value: edit.value, event });
      }
    };

    useImperativeHandle(ref, () => ({
      focus: () => cellElement(caret)?.focus(),
      blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
      clear: () => field.clear(),
    }));

    const onCellFocus = (index: number): void => {
      const limit = clampOtpFocus(
        index,
        latest.current.current,
        resolvedLength,
      );
      if (limit !== index) {
        // never leave the caret past the first empty cell
        moveFocus(limit, latest.current.current);
        return;
      }
      setFocusIndex(index);
      cellElement(index)?.select?.();
    };

    const onCellInput = (
      index: number,
      event: ReactFormEvent<HTMLInputElement>,
    ): void => {
      const el = event.currentTarget;
      const value = latest.current.current;
      if (!editable) {
        syncCells(value);
        return;
      }
      const inputType = (event.nativeEvent as InputEvent).inputType ?? '';
      if (inputType.startsWith('delete')) {
        // soft keyboards that never send a Backspace keydown
        apply(otpBackspace(value, index, options), event.nativeEvent);
        return;
      }
      const typed = otpTypedText(el.value, cells[index] ?? '', resolvedLength);
      apply(otpInsert(value, index, typed, options), event.nativeEvent);
    };

    const onCellKeyDown = (
      index: number,
      event: ReactKeyboardEvent<HTMLInputElement>,
    ): void => {
      if (event.key === 'Enter') {
        field.handleEnterKey(event);
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const value = latest.current.current;
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        if (!editable) return;
        apply(
          event.key === 'Backspace'
            ? otpBackspace(value, index, options)
            : otpDelete(value, index, options),
          event.nativeEvent,
        );
        return;
      }
      const target = otpNavigationTarget(
        event.key,
        index,
        value,
        resolvedLength,
        !!hostRef.current && ogeIsRtl(hostRef.current),
      );
      if (target === undefined) return;
      event.preventDefault();
      moveFocus(target, value);
    };

    const onCellPaste = (
      index: number,
      event: ReactClipboardEvent<HTMLInputElement>,
    ): void => {
      event.preventDefault();
      if (!editable) return;
      const text = event.clipboardData?.getData('text') ?? '';
      apply(
        otpInsert(latest.current.current, index, text, options),
        event.nativeEvent,
      );
    };

    const onFocusIn = (event: ReactFocusEvent): void => {
      const related = event.relatedTarget as Node | null;
      if (related && hostRef.current?.contains(related)) return;
      field.handleFocus(event);
    };
    const onFocusOut = (event: ReactFocusEvent): void => {
      const related = event.relatedTarget as Node | null;
      if (related && hostRef.current?.contains(related)) return;
      field.handleBlur(event);
    };

    const subscript =
      field.showError && field.resolvedErrorText
        ? { id: field.ids.errorId, text: field.resolvedErrorText, error: true }
        : hint
          ? { id: field.ids.hintId, text: hint, error: false }
          : null;

    const hostClasses = [
      'oge-otp-input',
      field.showError && 'oge-otp-input-invalid',
      readonly && 'oge-otp-input-readonly',
      complete && 'oge-otp-input-complete',
      props.size === 'sm' && 'oge-otp-input-sm',
      props.size === 'lg' && 'oge-otp-input-lg',
      field.effectiveDisabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const cellLocale = locale ?? config.locale;

    return (
      <div
        ref={hostRef}
        className={hostClasses}
        style={style}
        role="group"
        aria-labelledby={label ? field.ids.labelId : undefined}
        aria-label={label ? undefined : field.msg.otpLabel}
        aria-describedby={subscript?.id}
        aria-disabled={field.effectiveDisabled ? true : undefined}
        title={props.tooltip}
        onFocus={onFocusIn}
        onBlur={onFocusOut}
      >
        {label && (
          <span className="oge-otp-input-label" id={field.ids.labelId}>
            {label}
            {props.required && (
              <span className="oge-otp-input-required" aria-hidden="true">
                *
              </span>
            )}
          </span>
        )}
        <div className="oge-otp-input-cells">
          {cells.map((cell, index) => (
            <Fragment key={index}>
              <input
                className={[
                  'oge-otp-input-cell',
                  cell !== '' && 'oge-otp-input-cell-filled',
                ]
                  .filter(Boolean)
                  .join(' ')}
                id={
                  index === 0
                    ? field.ids.inputId
                    : `${field.ids.inputId}-${index}`
                }
                type={masked ? 'password' : 'text'}
                inputMode={otpInputMode(type)}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                name={index === 0 && props.name ? props.name : undefined}
                aria-label={otpCellLabel(
                  field.msg.otpCellLabel,
                  index,
                  resolvedLength,
                  cellLocale,
                )}
                aria-invalid={field.showError ? true : undefined}
                aria-required={props.required ? true : undefined}
                placeholder={placeholder || undefined}
                data-index={index}
                tabIndex={index === caret ? (props.tabIndex ?? 0) : -1}
                disabled={field.effectiveDisabled}
                readOnly={readonly}
                value={cell}
                autoFocus={props.autofocus && index === caret}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onFocus={() => onCellFocus(index)}
                onInput={(event) => onCellInput(index, event)}
                onChange={() => undefined}
                onKeyDown={(event) => onCellKeyDown(index, event)}
                onPaste={(event) => onCellPaste(index, event)}
              />
              {otpSeparatorAfter(index, resolvedLength, groupSize) && (
                <span className="oge-otp-input-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </Fragment>
          ))}
        </div>
        {subscript && (
          <div
            className={[
              'oge-otp-input-subscript',
              subscript.error && 'oge-otp-input-error',
            ]
              .filter(Boolean)
              .join(' ')}
            id={subscript.id}
          >
            {subscript.text}
          </div>
        )}
      </div>
    );
  },
);
