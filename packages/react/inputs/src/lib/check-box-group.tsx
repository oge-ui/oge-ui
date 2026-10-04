'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type ReactNode,
} from 'react';
import {
  applySelectAll,
  choiceIncludes,
  resolveDisabled,
  resolveDisplay,
  resolveValue,
  selectAllState,
  toggleChoiceValue,
  type OgeCheckBoxGroupLayout,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import { OgeCheckBox } from './check-box';
import { useOgeField, type OgeControlProps } from './use-field';

/** Payload of `onItemClick` — one check box was toggled by the user. */
export interface OgeCheckBoxGroupItemClickEvent<TItem = unknown> {
  item: TItem;
  index: number;
  /** The item's new checked state. */
  checked: boolean;
  event: Event | undefined;
}

/** Payload of `onSelectAllChange` — the "select all" box was toggled. */
export interface OgeCheckBoxGroupSelectAllEvent {
  /** `true` — every selectable item was checked; `false` — all were unchecked. */
  checked: boolean;
  event: Event | undefined;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeCheckBoxGroupHandle {
  /** Moves keyboard focus to the first enabled check box. */
  focus(): void;
  blur(): void;
  /** Checks every enabled item (disabled items keep their state). */
  selectAll(): void;
  /** Unchecks every enabled item (disabled items keep their state). */
  unselectAll(): void;
}

export interface OgeCheckBoxGroupProps<TItem = unknown> extends OgeControlProps<
  readonly unknown[]
> {
  /** The items, one check box each. */
  items?: readonly TItem[];
  /** Item → label text. Omitted, the item itself is stringified. */
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  /** Item → value in the array. Omitted, the whole item is the value. */
  valueExpr?: OgeSelectValueExpr<TItem>;
  /** Marks individual items as non-editable (their state is kept). */
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** Vertical list (default), wrapping row, or a `columns`-column grid. */
  layout?: OgeCheckBoxGroupLayout;
  /** Column count of `layout: 'columns'`. */
  columns?: number;
  /** Visible group label; also the group's accessible name. */
  label?: string;
  /** Helper text under the items (hidden while an error shows). */
  hint?: string;
  /** Renders a tri-state "select all" box above the items. */
  showSelectAll?: boolean;
  /** Text of the "select all" box; `undefined` = the messages catalog. */
  selectAllText?: string;
  /** Custom item label rendering (the check box glyph stays). */
  renderItem?: (
    item: TItem,
    context: { index: number; checked: boolean },
  ) => ReactNode;
  /** One check box was toggled by the user. */
  onItemClick?: (event: OgeCheckBoxGroupItemClickEvent<TItem>) => void;
  /** The "select all" box was toggled by the user. */
  onSelectAllChange?: (event: OgeCheckBoxGroupSelectAllEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Items-bound check box list whose value is the array of checked item values
 * — the React render of the Angular `<oge-check-box-group>`: real
 * `<OgeCheckBox>`es in a labelled `role="group"`, an optional tri-state
 * "select all" over the enabled items, the committed array in items order.
 * The ordering and select-all rules are `@oge-ui/behavior`'s choice-group
 * core, shared with Angular.
 *
 * ```tsx
 * <OgeCheckBoxGroup label="Notify me by" items={channels} displayExpr="name" valueExpr="id"
 *   showSelectAll value={notify} onValueChange={setNotify} />
 * ```
 */
export const OgeCheckBoxGroup = forwardRef(function OgeCheckBoxGroupRender<
  TItem,
>(
  props: OgeCheckBoxGroupProps<TItem>,
  ref: React.ForwardedRef<OgeCheckBoxGroupHandle>,
) {
  const {
    items = [],
    displayExpr,
    valueExpr,
    disabledExpr,
    layout = 'vertical',
    columns = 2,
    label = '',
    hint,
    showSelectAll = false,
    selectAllText,
    renderItem,
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const focusFirst = (): void =>
    hostRef.current
      ?.querySelector<HTMLInputElement>('.oge-check-box-input:not(:disabled)')
      ?.focus();
  const field = useOgeField<readonly unknown[]>({
    props,
    emptyValue: [],
    isEmpty: (value) => !value || value.length === 0,
    focusNative: focusFirst,
  });
  const readonly = props.readonly ?? false;
  const value = Array.isArray(field.value) ? field.value : [];

  const isItemDisabled = (item: TItem): boolean =>
    resolveDisabled(disabledExpr, item);
  const itemValues = items.map((item) => resolveValue(valueExpr, item));
  const selectable = items
    .filter((item) => !isItemDisabled(item))
    .map((item) => resolveValue(valueExpr, item));
  const allState = selectAllState(selectable, value);

  const latest = useRef({ itemValues, selectable, value });
  latest.current = { itemValues, selectable, value };

  const applyAll = (checked: boolean, event: Event | undefined): void => {
    if (field.effectiveDisabled || readonly) return;
    const {
      itemValues: order,
      selectable: enabled,
      value: current,
    } = latest.current;
    field.commit.commitNow(
      applySelectAll(order, enabled, current, checked),
      event,
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

  useImperativeHandle(ref, () => ({
    focus: focusFirst,
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
    selectAll: () => applyAll(true, undefined),
    unselectAll: () => applyAll(false, undefined),
  }));

  const subscript =
    field.showError && field.resolvedErrorText
      ? { id: field.ids.errorId, text: field.resolvedErrorText, error: true }
      : hint
        ? { id: field.ids.hintId, text: hint, error: false }
        : null;

  const hostClasses = [
    'oge-check-box-group',
    layout === 'horizontal' && 'oge-check-box-group-horizontal',
    layout === 'columns' && 'oge-check-box-group-columns',
    field.showError && 'oge-check-box-group-invalid',
    readonly && 'oge-check-box-group-readonly',
    field.effectiveDisabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={hostRef}
      className={hostClasses}
      style={
        { ...style, '--oge-check-box-group-columns': columns } as CSSProperties
      }
      role="group"
      aria-labelledby={label ? field.ids.labelId : undefined}
      aria-describedby={subscript?.id}
      aria-invalid={field.showError ? true : undefined}
      aria-disabled={field.effectiveDisabled ? true : undefined}
      title={props.tooltip}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      {label && (
        <span className="oge-check-box-group-label" id={field.ids.labelId}>
          {label}
          {props.required && (
            <span className="oge-check-box-group-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      {showSelectAll && (
        <OgeCheckBox
          className="oge-check-box-group-select-all"
          value={allState}
          text={selectAllText ?? field.msg.selectAllText}
          disabled={field.effectiveDisabled || selectable.length === 0}
          readonly={readonly}
          size={props.size}
          tabIndex={props.tabIndex}
          onValueCommitted={(change) => {
            // from mixed the native box goes to checked — "select all" first
            const checked = change.previousValue !== true;
            props.onSelectAllChange?.({ checked, event: change.event });
            applyAll(checked, change.event);
          }}
        />
      )}
      <div className="oge-check-box-group-items">
        {items.map((item, index) => {
          const checked = choiceIncludes(value, itemValues[index]);
          return (
            <OgeCheckBox
              key={index}
              className="oge-check-box-group-item"
              value={checked}
              text={renderItem ? '' : resolveDisplay(displayExpr, item)}
              disabled={field.effectiveDisabled || isItemDisabled(item)}
              readonly={readonly}
              size={props.size}
              tabIndex={props.tabIndex}
              name={props.name}
              onValueCommitted={(change) => {
                if (field.effectiveDisabled || readonly) return;
                const next = change.value === true;
                props.onItemClick?.({
                  item,
                  index,
                  checked: next,
                  event: change.event,
                });
                field.commit.commitNow(
                  toggleChoiceValue(
                    latest.current.itemValues,
                    latest.current.value,
                    itemValues[index],
                    next,
                  ),
                  change.event,
                );
              }}
            >
              {renderItem?.(item, { index, checked })}
            </OgeCheckBox>
          );
        })}
      </div>
      {subscript && (
        <div
          className={[
            'oge-check-box-group-subscript',
            subscript.error && 'oge-check-box-group-error',
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
  props: OgeCheckBoxGroupProps<TItem> & {
    ref?: React.ForwardedRef<OgeCheckBoxGroupHandle>;
  },
) => ReactNode;
