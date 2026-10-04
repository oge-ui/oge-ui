'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  applyToggleGroupPress,
  buttonGroupNavIndex,
  buttonGroupRole,
  resolveDisabled,
  resolveDisplay,
  resolveValue,
  toggleGroupSelectedIndices,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectValueExpr,
  type OgeToggleGroupSelectionMode,
  ogeIsRtl,
} from '@oge-ui/behavior';
import { useOgeField, type OgeControlProps } from './use-field';

/** Payload of `onItemClick` — a segment was pressed by click or keyboard. */
export interface OgeToggleGroupItemClickEvent<TItem = unknown> {
  item: TItem;
  index: number;
  event: Event;
}

/** Payload of `onSelectionChange` — the delta of a user press. */
export interface OgeToggleGroupSelectionChangedEvent {
  /** The new value — a scalar (`single`) or an array (`multiple`). */
  value: unknown;
  addedValues: readonly unknown[];
  removedValues: readonly unknown[];
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeToggleGroupHandle {
  /** Moves keyboard focus to the roving-tabindex segment. */
  focus(): void;
  blur(): void;
}

export interface OgeToggleGroupProps<
  TItem = unknown,
> extends OgeControlProps<unknown> {
  /** The segments. */
  items?: readonly TItem[];
  /** Item → segment text. Omitted, the item itself is stringified. */
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  /** Item → committed value. Omitted, the whole item is the value. */
  valueExpr?: OgeSelectValueExpr<TItem>;
  /** Marks individual segments as non-pressable. */
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** One value (radio pattern) or many (toggle buttons). */
  selectionMode?: OgeToggleGroupSelectionMode;
  /** Visible label; also the accessible name of the segment track. */
  label?: string;
  /** Keeps `label` as the accessible name only (no visible caption). */
  hideLabel?: boolean;
  /** Helper text under the segments (hidden while an error shows). */
  hint?: string;
  /** Stretches the track to the container width, segments sharing it. */
  fluid?: boolean;
  /** Custom segment content (icons, badges). */
  renderItem?: (
    item: TItem,
    context: { index: number; selected: boolean },
  ) => ReactNode;
  /** A segment was pressed by click or keyboard (before any value change). */
  onItemClick?: (event: OgeToggleGroupItemClickEvent<TItem>) => void;
  /** The value changed through user interaction — with the delta. */
  onSelectionChange?: (event: OgeToggleGroupSelectionChangedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Segmented toggle buttons as a form editor — the React render of the Angular
 * `<oge-toggle-group>`: `single` is the WAI-ARIA radio group (arrows move
 * focus and selection, no unselect), `multiple` a group of `aria-pressed`
 * toggles; one roving tab stop either way. The selection rule and the arrow
 * arithmetic are the button group's own `@oge-ui/behavior` functions.
 *
 * ```tsx
 * <OgeToggleGroup label="Alignment" items={aligns} value={align} onValueChange={setAlign} />
 * ```
 */
export const OgeToggleGroup = forwardRef(function OgeToggleGroupRender<TItem>(
  props: OgeToggleGroupProps<TItem>,
  ref: React.ForwardedRef<OgeToggleGroupHandle>,
) {
  const {
    items = [],
    displayExpr,
    valueExpr,
    disabledExpr,
    selectionMode = 'single',
    label = '',
    hideLabel = false,
    hint,
    fluid = false,
    renderItem,
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const field = useOgeField<unknown>({
    props,
    emptyValue: selectionMode === 'multiple' ? [] : null,
    isEmpty: (value) =>
      Array.isArray(value) ? value.length === 0 : value == null,
    focusNative: () => focusSegment(focusTargetIndex),
  });
  const readonly = props.readonly ?? false;
  const role = buttonGroupRole(selectionMode);
  const radio = role === 'radiogroup';

  const isItemDisabled = (item: TItem): boolean =>
    resolveDisabled(disabledExpr, item);
  const itemValues = items.map((item) => resolveValue(valueExpr, item));
  const selected = new Set(
    toggleGroupSelectedIndices(selectionMode, itemValues, field.value),
  );

  /** Last segment that held focus — the roving-tabindex anchor. */
  const [focusedIndex, setFocusedIndex] = useState(-1);

  /** The one segment that carries the reachable tabindex (derived on render). */
  const focusTargetIndex = (() => {
    const enabled = (index: number): boolean =>
      index >= 0 && index < items.length && !isItemDisabled(items[index]);
    if (enabled(focusedIndex)) return focusedIndex;
    for (const index of selected) if (enabled(index)) return index;
    return items.findIndex((item) => !isItemDisabled(item));
  })();

  const focusSegment = (index: number): void => {
    hostRef.current
      ?.querySelectorAll<HTMLButtonElement>('.oge-toggle-group-item')
      [index]?.focus();
  };

  const press = (index: number, event: Event): void => {
    if (field.effectiveDisabled || readonly) return;
    const item = items[index];
    if (item === undefined || isItemDisabled(item)) return;
    setFocusedIndex(index);
    props.onItemClick?.({ item, index, event });
    const change = applyToggleGroupPress(
      selectionMode,
      itemValues,
      field.value,
      index,
    );
    if (!change) return;
    field.commit.commitNow(change.value, event);
    props.onSelectionChange?.(change);
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (field.effectiveDisabled) return;
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !isItemDisabled(item))
      .map(({ index }) => index);
    const rtl = hostRef.current !== null && ogeIsRtl(hostRef.current);
    // the wrap-around / RTL arithmetic is the button group's, from `behavior`
    const position = buttonGroupNavIndex(
      event.key,
      enabled.indexOf(focusTargetIndex),
      enabled.length,
      rtl,
    );
    if (position < 0) return;
    event.preventDefault();
    const next = enabled[position];
    setFocusedIndex(next);
    focusSegment(next);
    // WAI-ARIA radio-group pattern: arrows move the selection too.
    if (selectionMode === 'single' && !readonly) {
      press(next, event.nativeEvent);
    }
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

  useImperativeHandle(ref, () => ({
    focus: () => focusSegment(focusTargetIndex),
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
  }));

  const subscript =
    field.showError && field.resolvedErrorText
      ? { id: field.ids.errorId, text: field.resolvedErrorText, error: true }
      : hint
        ? { id: field.ids.hintId, text: hint, error: false }
        : null;

  const hostClasses = [
    'oge-toggle-group',
    fluid && 'oge-toggle-group-fluid',
    field.showError && 'oge-toggle-group-invalid',
    readonly && 'oge-toggle-group-readonly',
    props.size === 'sm' && 'oge-toggle-group-sm',
    props.size === 'lg' && 'oge-toggle-group-lg',
    field.effectiveDisabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const visibleLabel = !!label && !hideLabel;

  return (
    <div
      ref={hostRef}
      className={hostClasses}
      style={style}
      title={props.tooltip}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      {visibleLabel && (
        <span className="oge-toggle-group-label" id={field.ids.labelId}>
          {label}
        </span>
      )}
      <div
        className="oge-toggle-group-track"
        role={role}
        aria-labelledby={visibleLabel ? field.ids.labelId : undefined}
        aria-label={label && hideLabel ? label : undefined}
        aria-describedby={subscript?.id}
        aria-invalid={field.showError ? true : undefined}
        aria-required={props.required && radio ? true : undefined}
        aria-disabled={field.effectiveDisabled ? true : undefined}
        aria-readonly={readonly && radio ? true : undefined}
        onKeyDown={onKeyDown}
      >
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            className={[
              'oge-toggle-group-item',
              selected.has(index) && 'oge-toggle-group-item-selected',
            ]
              .filter(Boolean)
              .join(' ')}
            role={radio ? 'radio' : undefined}
            aria-checked={radio ? selected.has(index) : undefined}
            aria-pressed={radio ? undefined : selected.has(index)}
            disabled={field.effectiveDisabled || isItemDisabled(item)}
            tabIndex={index === focusTargetIndex ? (props.tabIndex ?? 0) : -1}
            onClick={(event) => press(index, event.nativeEvent)}
            onFocus={() => setFocusedIndex(index)}
          >
            {renderItem
              ? renderItem(item, { index, selected: selected.has(index) })
              : resolveDisplay(displayExpr, item)}
          </button>
        ))}
      </div>
      {subscript && (
        <div
          className={[
            'oge-toggle-group-subscript',
            subscript.error && 'oge-toggle-group-error',
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
}) as <TItem = unknown>(
  props: OgeToggleGroupProps<TItem> & {
    ref?: React.ForwardedRef<OgeToggleGroupHandle>;
  },
) => ReactNode;
