'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { LookupItem, OgeDataType } from '@oge-ui/behavior';
import {
  OgeCheckBox,
  OgeDateBox,
  OgeNumberBox,
  OgeSelectBox,
  OgeTextBox,
} from '@oge-ui/react-inputs';

/** Where the editor renders — decides which keyboard/blur wiring the host binds. */
export type OgeCellEditorSurface = 'cell' | 'form' | 'popup';

export interface OgeCellEditorProps {
  /** The draft value held by the grid's editing model. */
  value: unknown;
  onValueChange: (value: unknown) => void;
  dataType?: OgeDataType;
  /** Lookup options; when set, a select box wins over `dataType`. */
  lookupItems?: readonly LookupItem[];
  /** Accessible name — the column caption. */
  label?: string;
  surface?: OgeCellEditorSurface;
  invalid?: boolean;
  /** Error text mirrored into the host `title` (cell surface). */
  errorTitle?: string | null;
  /** Takes DOM focus on mount — the cell surface opens focused. */
  autoFocus?: boolean;
  /** Enter that was not consumed by an open dropdown. */
  onEnterKey?: (event: KeyboardEvent) => void;
  onEscapeKey?: (event: KeyboardEvent) => void;
  /** Tab — the cell surface commits and moves to the next editable column. */
  onTabKey?: (event: KeyboardEvent) => void;
  /** Focus left the editor entirely (dropdown popups count as inside). */
  onFocusLeft?: (event: React.FocusEvent) => void;
}

/**
 * The one grid editor — the React render of `<oge-cell-editor>`: the
 * dataType/lookup-matched `@oge-ui/react-inputs` editor in the compact grid
 * shape (`size="sm"`, hidden label, no subscript) bound to the editing
 * model's draft value.
 *
 * The host keeps the load-bearing `.oge-editor` class (the click-to-edit
 * handler ignores events bubbling out of it; specs assert it). Keyboard and
 * blur events surface as callbacks — the grid binds them per surface — and
 * events an open dropdown already consumed (`defaultPrevented`) are not
 * re-emitted, so the second Escape closes the editor rather than the popup.
 */
export function OgeCellEditor(props: OgeCellEditorProps): ReactNode {
  const {
    value,
    onValueChange,
    dataType = 'string',
    lookupItems,
    label = '',
    invalid = false,
    errorTitle,
    autoFocus = false,
  } = props;
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const host = hostRef.current;
    if (!host) return;
    (
      host.querySelector<HTMLElement>('input, select, textarea, button') ?? host
    ).focus();
    // focus once, when the editor opens — not on every draft keystroke
  }, [autoFocus]);

  const onKeyDown = (event: KeyboardEvent): void => {
    // an open dropdown consumed the key (option commit, popup close) — the
    // next press reaches the grid
    if (event.defaultPrevented) return;
    switch (event.key) {
      case 'Enter':
        props.onEnterKey?.(event);
        return;
      case 'Escape':
        props.onEscapeKey?.(event);
        return;
      case 'Tab':
        props.onTabKey?.(event);
        return;
    }
  };

  const onBlur = (event: React.FocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    props.onFocusLeft?.(event);
  };

  const shared = {
    size: 'sm' as const,
    labelMode: 'hidden' as const,
    subscriptSizing: 'none' as const,
    fluid: true,
    label,
    invalid,
  };

  let control: ReactNode;
  if (lookupItems) {
    control = (
      <OgeSelectBox
        {...shared}
        items={lookupItems}
        displayExpr="text"
        valueExpr="value"
        value={value}
        onValueChange={onValueChange}
      />
    );
  } else {
    switch (dataType) {
      case 'boolean':
        control = (
          <OgeCheckBox
            label={label}
            invalid={invalid}
            value={value === true}
            onValueChange={onValueChange}
          />
        );
        break;
      case 'number':
        control = (
          <OgeNumberBox
            {...shared}
            value={typeof value === 'number' ? value : null}
            onValueChange={onValueChange}
          />
        );
        break;
      case 'date':
        control = (
          <OgeDateBox
            {...shared}
            value={value instanceof Date ? value : null}
            onValueChange={onValueChange}
          />
        );
        break;
      default:
        control = (
          <OgeTextBox
            {...shared}
            value={value == null ? '' : String(value)}
            onValueChange={onValueChange}
          />
        );
    }
  }

  return (
    <div
      ref={hostRef}
      className={`oge-editor oge-cell-editor${invalid ? ' oge-editor-invalid' : ''}`}
      title={errorTitle || undefined}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {control}
    </div>
  );
}
