'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  OgeInputCommit,
  messageForFieldError,
  type OgeFieldError,
  type OgeInputErrorDisplay,
  type OgeInputsMessages,
} from '@oge-ui/behavior';
import { useOgeInputsConfig } from './inputs-config';

/**
 * The state/forms props every oge React editor shares — the React face of the
 * Angular `OgeControlBase` inputs. Value handling is the standard React
 * controlled/uncontrolled pair instead of a two-way model; Angular's
 * `formField`/`formControl` bindings have no React counterpart (controlled
 * props are the integration point for form libraries).
 */
export interface OgeControlProps<T> {
  /** Editor value — controlled when provided. */
  value?: T;
  /** Uncontrolled initial value. */
  defaultValue?: T;
  /** Fires on every committed change (the controlled-pair callback). */
  onValueChange?: (value: T) => void;
  /**
   * Fires on every committed change with `previousValue` and the originating
   * DOM event (`undefined` for programmatic writes) — the rich payload for
   * cross-field rules.
   */
  onValueCommitted?: (event: {
    value: T;
    previousValue: T;
    event: Event | undefined;
  }) => void;

  /** Base for the generated element ids (input/label/hint/error/counter). */
  id?: string;
  /** Control height preset — 28/34/42px, the button scale. */
  size?: 'sm' | 'md' | 'lg';
  /** Native `title` attribute of the control element. */
  tooltip?: string;
  tabIndex?: number;
  /** Focuses the control after its first render. */
  autofocus?: boolean;
  /** Per-instance overrides of user-facing strings. */
  messages?: Partial<OgeInputsMessages>;

  disabled?: boolean;
  /** Focusable but not editable. */
  readonly?: boolean;
  required?: boolean;
  /** Native `name` attribute. */
  name?: string;
  /** External invalid override — combined with the errors props. */
  invalid?: boolean;
  /** Async-validation indicator. */
  pending?: boolean;
  touched?: boolean;
  dirty?: boolean;
  /** Validation errors in the shared `OgeFieldError` shape. */
  errors?: readonly OgeFieldError[];
  /** Explicit error message — always wins over resolved messages. */
  errorText?: string;
  errorDisplay?: OgeInputErrorDisplay;
  /** Commit delay in ms for value updates; blur and Enter flush. */
  debounce?: number;

  onCleared?: () => void;
  /** Enter pressed inside the editor (pending debounce is flushed first). */
  onEnterKey?: (event: KeyboardEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

export interface UseOgeFieldOptions<T> {
  props: OgeControlProps<T>;
  emptyValue: T;
  isEmpty(value: T): boolean;
  /** Applied to flushed debounced values (the number box clamps here). */
  transformFlushValue?: (value: T) => T;
  /** The message shown while `parseInvalid` (number/date boxes). */
  parseErrorMessage?: (msg: OgeInputsMessages) => string;
  /** Refocus target for `clear()`. */
  focusNative(): void;
}

/**
 * Shared behavior of every oge React editor: the `@oge-ui/behavior` commit
 * machine (the exact pipeline the Angular `OgeControlBase` runs), the
 * controlled/uncontrolled value pair, touched/dirty/focus state, error
 * resolution and the id family — everything `OgeFieldChrome` reads.
 */
export function useOgeField<T>(options: UseOgeFieldOptions<T>) {
  const { props } = options;
  const config = useOgeInputsConfig();
  const msg: OgeInputsMessages = { ...config.messages, ...props.messages };

  const reactId = useId().replace(/:/g, '');
  const baseId = props.id ?? `oge-input-${reactId}`;
  const ids = {
    inputId: baseId,
    labelId: `${baseId}-label`,
    hintId: `${baseId}-hint`,
    errorId: `${baseId}-error`,
    counterId: `${baseId}-counter`,
  };

  const [uncontrolled, setUncontrolled] = useState<T>(
    props.defaultValue ?? options.emptyValue,
  );
  const value = props.value !== undefined ? props.value : uncontrolled;

  const [focused, setFocused] = useState(false);
  const [selfTouched, setSelfTouched] = useState(false);
  const [selfDirty, setSelfDirty] = useState(false);
  const [parseInvalid, setParseInvalidState] = useState(false);

  const latest = useRef({ props, options, value });
  latest.current = { props, options, value };

  const commitRef = useRef<OgeInputCommit<T>>(undefined);
  commitRef.current ??= new OgeInputCommit<T>({
    debounceMs: () => latest.current.props.debounce,
    current: () => latest.current.value,
    onCommit: (next, previousValue, event) => {
      if (latest.current.props.value === undefined) setUncontrolled(next);
      latest.current.props.onValueChange?.(next);
      setSelfDirty(true);
      if (!Object.is(previousValue, next)) {
        latest.current.props.onValueCommitted?.({
          value: next,
          previousValue,
          event,
        });
      }
    },
  });
  const commit = commitRef.current;

  // Flush (not drop) a staged commit on unmount — closing a dialog must not
  // silently lose the last keystrokes. (The machine has no terminal state, so
  // StrictMode's unmount/remount needs no revive.)
  useEffect(
    () => () =>
      commit.flush((staged) =>
        latest.current.options.transformFlushValue
          ? latest.current.options.transformFlushValue(staged)
          : staged,
      ),
    [commit],
  );

  // An external controlled write supersedes anything staged in a debounce.
  const lastControlled = useRef(props.value);
  useEffect(() => {
    if (
      props.value !== undefined &&
      !Object.is(lastControlled.current, props.value)
    ) {
      commit.cancel();
      setParseInvalidState(false);
    }
    lastControlled.current = props.value;
  }, [props.value, commit]);

  const effectiveDisabled = props.disabled ?? false;
  const effectiveTouched = (props.touched ?? false) || selfTouched;
  const effectiveDirty = (props.dirty ?? false) || selfDirty;
  const errors = props.errors ?? [];
  const effectiveInvalid =
    (props.invalid ?? false) || errors.length > 0 || parseInvalid;

  const showError = (() => {
    if (parseInvalid) return true;
    if (!effectiveInvalid) return false;
    switch (props.errorDisplay ?? 'touched') {
      case 'always':
        return true;
      case 'dirty':
        return effectiveDirty;
      default:
        return effectiveTouched;
    }
  })();

  const resolvedErrorText = (() => {
    if (props.errorText) return props.errorText;
    if (parseInvalid) {
      return options.parseErrorMessage
        ? options.parseErrorMessage(msg)
        : msg.invalidNumberError;
    }
    const first = errors[0];
    if (first) return first.message ?? messageForFieldError(first, msg);
    return effectiveInvalid ? msg.invalidError : null;
  })();

  const isEmpty = options.isEmpty(value);

  const flush = useCallback(
    () =>
      commit.flush((staged) =>
        latest.current.options.transformFlushValue
          ? latest.current.options.transformFlushValue(staged)
          : staged,
      ),
    [commit],
  );

  const handleFocus = (event: ReactFocusEvent) => {
    setFocused(true);
    latest.current.props.onFocus?.(event.nativeEvent);
  };

  const handleBlur = (event: ReactFocusEvent) => {
    setFocused(false);
    flush();
    setSelfTouched(true);
    latest.current.props.onBlur?.(event.nativeEvent);
  };

  const handleEnterKey = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Enter') return;
    flush();
    latest.current.props.onEnterKey?.(event.nativeEvent);
  };

  const clear = useCallback(() => {
    const { props: p, options: o } = latest.current;
    if ((p.disabled ?? false) || (p.readonly ?? false)) return;
    commit.cancel();
    commit.commitNow(o.emptyValue);
    setParseInvalidState(false);
    p.onCleared?.();
    o.focusNative();
  }, [commit]);

  return {
    msg,
    ids,
    value,
    focused,
    isEmpty,
    effectiveDisabled,
    effectiveTouched,
    effectiveInvalid,
    parseInvalid,
    setParseInvalid: setParseInvalidState,
    showError,
    resolvedErrorText,
    commit,
    flush,
    clear,
    handleFocus,
    handleBlur,
    handleEnterKey,
  };
}
