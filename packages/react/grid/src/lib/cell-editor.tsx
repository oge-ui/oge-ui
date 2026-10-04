'use client';

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  syncOgeEditorErrorAria,
  type LookupItem,
  type OgeDataType,
} from '@oge-ui/behavior';
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
  /** Locale the number / date editors format and parse in (the grid's). */
  locale?: string;
  surface?: OgeCellEditorSurface;
  invalid?: boolean;
  /** Error text mirrored into the host `title` (cell surface). */
  errorTitle?: string | null;
  /**
   * An async validator is running: the host is `aria-busy` and a visually
   * hidden `pendingLabel` says so; commits wait for the result.
   */
  pending?: boolean;
  /** Status text while `pending`. */
  pendingLabel?: string;
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
 *
 * While invalid with an error text, the editor renders that text in a
 * visually hidden element (the host `title` shows it as a tooltip) and points
 * the native control at it — `aria-invalid`, `aria-errormessage` and an
 * `aria-describedby` entry — because the compact shape has no subscript for
 * the input components' own error wiring to reference.
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
    pending = false,
    pendingLabel = '',
  } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const errorId = `oge-cell-editor-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-error`;
  const errorMessage = invalid ? errorTitle || null : null;

  // the inner editor's own render may replace its control — re-wire after
  // every render (the helper only touches what changed)
  useEffect(() => {
    const host = hostRef.current;
    if (host) syncOgeEditorErrorAria(host, errorMessage ? errorId : null);
  });

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
            locale={props.locale}
            value={typeof value === 'number' ? value : null}
            onValueChange={onValueChange}
          />
        );
        break;
      case 'date':
      case 'datetime':
        control = (
          <OgeDateBox
            {...shared}
            locale={props.locale}
            type={dataType === 'datetime' ? 'datetime' : 'date'}
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
      className={`oge-editor oge-cell-editor${invalid ? ' oge-editor-invalid' : ''}${pending ? ' oge-editor-pending' : ''}`}
      aria-busy={pending || undefined}
      title={errorTitle || undefined}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {pending && pendingLabel ? (
        <span className="oge-sr-only oge-cell-editor-pending">
          {pendingLabel}
        </span>
      ) : null}
      {errorMessage && (
        <span className="oge-sr-only oge-cell-editor-error" id={errorId}>
          {errorMessage}
        </span>
      )}
      {control}
    </div>
  );
}
