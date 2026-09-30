'use client';

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactNode,
} from 'react';
import { bpmnFieldKey } from '@oge-ui/bpmn-engine';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/**
 * Form fields with the Angular panel's exact commit semantics.
 *
 * The Angular properties panel binds `[value]` / `[checked]` and commits on
 * the native `change` event — blur or Enter for text, the pick for a select
 * or a checkbox — so every commit is exactly one undoable command. React's
 * `onChange` is the `input` event (one command per keystroke), and a
 * controlled field would snap back when a command is denied, which the
 * Angular field does not. These fields are therefore uncontrolled: the model
 * value is written to the DOM property whenever it changes (what Angular's
 * property binding does) and a native `change` listener commits.
 */
function useNativeChange<E extends HTMLElement>(
  onCommit: (element: E) => void,
) {
  const ref = useRef<E>(null);
  const latest = useRef(onCommit);
  latest.current = onCommit;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = () => latest.current(element);
    element.addEventListener('change', listener);
    return () => element.removeEventListener('change', listener);
  }, []);
  return ref;
}

/** Escape reverts to the model value, Enter commits a single-line input. */
function fieldKeydown(
  event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  modelValue: string,
): void {
  event.stopPropagation();
  if (bpmnFieldKey(event.key, event.currentTarget, modelValue) !== null) {
    event.preventDefault();
  }
}

/** A text input or textarea committing on the native `change` event. */
export function NativeTextField({
  id,
  className,
  value,
  multiline = false,
  ariaLabel,
  onCommit,
}: {
  id?: string;
  className: string;
  value: string;
  multiline?: boolean;
  ariaLabel?: string;
  onCommit: (value: string) => void;
}): ReactNode {
  const ref = useNativeChange<HTMLInputElement | HTMLTextAreaElement>((el) =>
    onCommit(el.value),
  );
  useIsomorphicLayoutEffect(() => {
    if (ref.current) ref.current.value = value;
  }, [value]);
  const shared = {
    id,
    className,
    defaultValue: value,
    'aria-label': ariaLabel,
    onKeyDown: (
      event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => fieldKeydown(event, value),
  };
  return multiline ? (
    <textarea ref={ref as RefObject<HTMLTextAreaElement>} {...shared} />
  ) : (
    <input ref={ref as RefObject<HTMLInputElement>} type="text" {...shared} />
  );
}

/** A checkbox committing on the native `change` event. */
export function NativeCheckbox({
  className,
  checked,
  onCommit,
}: {
  className?: string;
  checked: boolean;
  onCommit: (checked: boolean) => void;
}): ReactNode {
  const ref = useNativeChange<HTMLInputElement>((el) => onCommit(el.checked));
  useIsomorphicLayoutEffect(() => {
    if (ref.current) ref.current.checked = checked;
  }, [checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={className}
      defaultChecked={checked}
    />
  );
}

/** A select committing on the native `change` event. */
export function NativeSelect({
  id,
  className,
  value,
  onCommit,
  children,
}: {
  id: string;
  className: string;
  value: string;
  onCommit: (value: string) => void;
  children: ReactNode;
}): ReactNode {
  const ref = useNativeChange<HTMLSelectElement>((el) => onCommit(el.value));
  useIsomorphicLayoutEffect(() => {
    if (ref.current) ref.current.value = value;
  }, [value]);
  return (
    <select ref={ref} id={id} className={className} defaultValue={value}>
      {children}
    </select>
  );
}

/** A native color input committing on the native `change` event. */
export function NativeColor({
  id,
  className,
  value,
  onCommit,
}: {
  id: string;
  className: string;
  value: string;
  onCommit: (value: string) => void;
}): ReactNode {
  const ref = useNativeChange<HTMLInputElement>((el) => onCommit(el.value));
  useIsomorphicLayoutEffect(() => {
    if (ref.current) ref.current.value = value;
  }, [value]);
  return (
    <input
      ref={ref}
      id={id}
      className={className}
      type="color"
      defaultValue={value}
    />
  );
}
