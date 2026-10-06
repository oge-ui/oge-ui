'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  OgeListBoxCore,
  ogeListBoxSections,
  type OgeListBoxSelectionMode,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import { createBumpAdapter } from './rx-adapter';
import { useOgeField, type OgeControlProps } from './use-field';

/** Payload of `onSelectionChange` — the selection changed by any path. */
export interface OgeListBoxSelectionChangeEvent<TItem = unknown> {
  /** The new value (one value / `null`, or the array in multiple mode). */
  value: unknown;
  /** The value before the change. */
  previousValue: unknown;
  /** Items that became selected. */
  addedItems: TItem[];
  /** Items that stopped being selected. */
  removedItems: TItem[];
  /** The originating DOM event; `undefined` for programmatic changes. */
  event: Event | undefined;
}

/** Payload of `onItemClick` — an enabled option was clicked. */
export interface OgeListBoxItemClickEvent<TItem = unknown> {
  item: TItem;
  /** Position among the visible (filtered) options. */
  index: number;
  event: MouseEvent;
}

/** Context of `renderItem`. */
export interface OgeListBoxRenderItemContext {
  index: number;
  selected: boolean;
  active: boolean;
  disabled: boolean;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeListBoxHandle<TItem = unknown> {
  /** Moves keyboard focus to the list. */
  focus(): void;
  blur(): void;
  /** Clears the selection, keeps focus in the list. */
  clear(): void;
  /** Selects every enabled option (multiple mode). */
  selectAll(): void;
  /** Deselects every enabled option. */
  unselectAll(): void;
  /** Makes `item` the active option and scrolls it into view. */
  scrollToItem(item: TItem): void;
  /** Sets the search text programmatically (`''` clears the filter). */
  search(text: string): void;
  /** The options currently shown (after the search filter), in display order. */
  getVisibleItems(): readonly TItem[];
  /** The selected items, in items order. */
  getSelectedItems(): TItem[];
}

export interface OgeListBoxProps<
  TItem = unknown,
> extends OgeControlProps<unknown> {
  /** The options. */
  items?: readonly TItem[];
  /** Item → option text. Omitted, the item itself is stringified. */
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  /** Item → value. Omitted, the whole item is the value. */
  valueExpr?: OgeSelectValueExpr<TItem>;
  /** Marks individual options as non-selectable (skipped by the keyboard). */
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** Groups the options under labelled headers (first-seen group order). */
  groupBy?: OgeSelectGroupExpr<TItem>;
  /** `'single'` (selection follows focus, default) or `'multiple'`. */
  selectionMode?: OgeListBoxSelectionMode;
  /** Draws a check glyph on every option (multiple mode only). */
  showCheckBoxes?: boolean;
  /** Renders a search field above the list that filters the options. */
  searchEnabled?: boolean;
  /** Which text the search matches; omitted, the display text. */
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /** `'contains'` (default) or `'startswith'` matching. */
  searchMode?: OgeSelectSearchMode;
  /** Placeholder of the search field; `undefined` = the messages catalog. */
  searchPlaceholder?: string;
  /** Maximum list height — px number or any CSS length; the list scrolls past it. */
  height?: number | string;
  /** Text shown while there are no (matching) options. */
  noDataText?: string;
  /** Visible label above the list; also its accessible name. */
  label?: string;
  /** Id of an external element naming the list (overrides `label`). */
  labelledBy?: string;
  /** Helper text under the list (hidden while an error shows). */
  hint?: string;
  /** Shortcuts advertised as `aria-keyshortcuts` on the list (hosts handling extra keys). */
  keyShortcuts?: string;
  /** Custom option content (the option keeps its role, state and check glyph). */
  renderItem?: (item: TItem, context: OgeListBoxRenderItemContext) => ReactNode;
  /** Custom group header content (`groupBy`). */
  renderGroup?: (label: string, context: { count: number }) => ReactNode;
  /** The selection changed — rich payload with the added / removed items. */
  onSelectionChange?: (event: OgeListBoxSelectionChangeEvent<TItem>) => void;
  /** An enabled option was clicked. */
  onItemClick?: (event: OgeListBoxItemClickEvent<TItem>) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A standing, always-open list of options as a form editor — the React
 * render of the Angular `<oge-list-box>`, the WAI-ARIA APG **listbox**: one
 * Tab stop with `aria-activedescendant`, arrows / Home / End / PageUp /
 * PageDown and type-ahead, `single` (selection follows focus) or `multiple`
 * (`aria-multiselectable`: Space and clicks toggle, Shift extends, Ctrl+A
 * selects all), labelled groups, an optional search field. The machine is
 * `@oge-ui/behavior`'s `OgeListBoxCore`, shared with Angular.
 *
 * ```tsx
 * <OgeListBox label="Cities" items={cities} displayExpr="name" valueExpr="id"
 *   selectionMode="multiple" showCheckBoxes value={picked} onValueChange={setPicked} />
 * ```
 */
export const OgeListBox = forwardRef(function OgeListBoxRender<TItem>(
  props: OgeListBoxProps<TItem>,
  ref: React.ForwardedRef<OgeListBoxHandle<TItem>>,
) {
  const {
    selectionMode = 'single',
    showCheckBoxes = false,
    searchEnabled = false,
    label = '',
    hint,
    height,
    className,
    style,
    renderItem,
    renderGroup,
  } = props;
  const multiple = selectionMode === 'multiple';
  const checks = multiple && showCheckBoxes;

  const hostRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const field = useOgeField<unknown>({
    props,
    emptyValue: multiple ? [] : null,
    isEmpty: (value) =>
      Array.isArray(value)
        ? value.length === 0
        : value === null || value === undefined,
    focusNative: () => listRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;
  const editable = !field.effectiveDisabled && !readonly;

  const latest = useRef({ props, field });
  latest.current = { props, field };

  // --- the shared listbox machine, on a version-bump adapter ---------------

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const coreRef = useRef<OgeListBoxCore<TItem>>(undefined);
  if (!coreRef.current) {
    coreRef.current = new OgeListBoxCore<TItem>(
      {
        inputId: () => latest.current.field.ids.inputId,
        items: () => latest.current.props.items ?? [],
        displayExpr: () => latest.current.props.displayExpr,
        valueExpr: () => latest.current.props.valueExpr,
        disabledExpr: () => latest.current.props.disabledExpr,
        searchExpr: () => latest.current.props.searchExpr,
        searchEnabled: () => latest.current.props.searchEnabled ?? false,
        searchMode: () => latest.current.props.searchMode ?? 'contains',
        searchDebounceMs: () => 0,
        groupBy: () => latest.current.props.groupBy,
        selectionMode: () => latest.current.props.selectionMode ?? 'single',
        value: () => {
          const value = latest.current.field.value;
          const mode = latest.current.props.selectionMode ?? 'single';
          if (mode === 'multiple') {
            return Array.isArray(value) ? value : value == null ? [] : [value];
          }
          return value ?? null;
        },
      },
      createBumpAdapter(bump),
    );
  }
  const core = coreRef.current;
  useEffect(() => () => core.destroy(), [core]);

  const [listFocused, setListFocused] = useState(false);
  const visible = core.visibleItems();
  const sections = ogeListBoxSections(core.rows());

  // a filter / items change that hides the active option moves it to the first match
  useEffect(() => {
    if (core.activeIndex() >= visible.length) {
      core.activeIndex.set(core.edgeEnabledIndex(1));
    }
  });

  const commitSelection = (next: unknown, event: Event | undefined): void => {
    const { field: f, props: p } = latest.current;
    const previousValue = core.selectedValues();
    const previous = multiple ? previousValue : (previousValue[0] ?? null);
    const delta = core.selectionDelta(previous, next);
    if (!delta.changed) return;
    f.commit.commitNow(next, event);
    p.onSelectionChange?.({
      value: next,
      previousValue: previous,
      addedItems: delta.added,
      removedItems: delta.removed,
      event,
    });
  };

  const search = (text: string): void => {
    if (text) core.setSearch(text);
    else core.resetSearch();
  };

  useImperativeHandle(ref, () => ({
    focus: () => listRef.current?.focus(),
    blur: () => listRef.current?.blur(),
    clear: () => field.clear(),
    selectAll: () => {
      if (editable) commitSelection(core.selectAllValue(), undefined);
    },
    unselectAll: () => {
      if (editable) commitSelection(core.unselectAllValue(), undefined);
    },
    scrollToItem: (item) => void core.activateItem(item),
    search,
    getVisibleItems: () => core.visibleItems(),
    getSelectedItems: () => core.selectedItems(),
  }));

  // --- interactions ----------------------------------------------------------

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (field.effectiveDisabled) return;
    const result = core.handleKey(event, !readonly);
    if (result.handled) event.preventDefault();
    if ('value' in result) commitSelection(result.value, event.nativeEvent);
  };

  const onListClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (field.effectiveDisabled) return;
    const option = (event.target as Element | null)?.closest?.(
      '.oge-list-box-option',
    );
    if (!option || !listRef.current?.contains(option)) return;
    const index = Number(option.getAttribute('data-index'));
    const item = core.visibleItems()[index];
    if (item === undefined || core.isItemDisabled(item)) return;
    props.onItemClick?.({ item, index, event: event.nativeEvent });
    if (readonly) {
      core.setActive(index);
      return;
    }
    const next = core.clickOption(index, event);
    if (next !== undefined) commitSelection(next, event.nativeEvent);
  };

  const onFocusIn = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    field.handleFocus(event);
  };
  const onFocusOut = (event: ReactFocusEvent): void => {
    if (event.target === listRef.current) {
      setListFocused(false);
      core.resetTypeAhead();
    }
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
    'oge-list-box',
    multiple && 'oge-list-box-multiple',
    checks && 'oge-list-box-checks',
    field.showError && 'oge-list-box-invalid',
    readonly && 'oge-list-box-readonly',
    props.size === 'sm' && 'oge-list-box-sm',
    props.size === 'lg' && 'oge-list-box-lg',
    field.effectiveDisabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const activeIndex = core.activeIndex();
  const renderOption = (item: TItem, index: number): ReactNode => {
    const selected = core.isSelected(item);
    const disabled = core.isItemDisabled(item);
    const active = index === activeIndex;
    return (
      <div
        key={index}
        className={[
          'oge-list-box-option',
          active && 'oge-list-box-option-active',
          selected && 'oge-list-box-option-selected',
          disabled && 'oge-disabled',
        ]
          .filter(Boolean)
          .join(' ')}
        role="option"
        id={core.optionId(index)}
        data-index={index}
        aria-selected={selected}
        aria-disabled={disabled ? true : undefined}
      >
        {checks && (
          <span className="oge-list-box-check" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
          </span>
        )}
        <span className="oge-list-box-option-content">
          {renderItem
            ? renderItem(item, { index, selected, active, disabled })
            : core.displayOf(item)}
        </span>
      </div>
    );
  };

  const groupId = (section: number) => `${field.ids.inputId}-group-${section}`;
  const maxHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={hostRef}
      className={hostClasses}
      style={style}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      {label && (
        <span className="oge-list-box-label" id={field.ids.labelId}>
          {label}
          {props.required && (
            <span className="oge-list-box-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      <div className="oge-list-box-frame">
        {searchEnabled && (
          <div className="oge-list-box-search">
            <svg
              className="oge-list-box-search-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              className="oge-list-box-search-input"
              autoComplete="off"
              placeholder={
                props.searchPlaceholder ?? field.msg.listBoxSearchPlaceholder
              }
              aria-label={field.msg.listBoxSearchLabel}
              aria-controls={core.listboxId}
              disabled={field.effectiveDisabled}
              value={core.searchText() ?? ''}
              onChange={(event) => {
                search(event.target.value);
                core.setActive(core.edgeEnabledIndex(1));
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  listRef.current?.focus();
                }
              }}
            />
          </div>
        )}
        <div
          ref={listRef}
          className="oge-list-box-list"
          role="listbox"
          id={core.listboxId}
          tabIndex={field.effectiveDisabled ? -1 : (props.tabIndex ?? 0)}
          style={maxHeight ? { maxHeight } : undefined}
          title={props.tooltip}
          aria-multiselectable={multiple ? true : undefined}
          aria-activedescendant={
            listFocused ? (core.activeDescendant() ?? undefined) : undefined
          }
          aria-labelledby={
            props.labelledBy ?? (label ? field.ids.labelId : undefined)
          }
          aria-label={
            props.labelledBy || label ? undefined : field.msg.listBoxLabel
          }
          aria-describedby={subscript?.id}
          aria-invalid={field.showError ? true : undefined}
          aria-required={props.required ? true : undefined}
          aria-readonly={readonly ? true : undefined}
          aria-disabled={field.effectiveDisabled ? true : undefined}
          aria-keyshortcuts={props.keyShortcuts}
          autoFocus={props.autofocus}
          onKeyDown={onKeyDown}
          onClick={onListClick}
          onFocus={(event) => {
            if (event.target !== listRef.current) return;
            setListFocused(true);
            core.ensureActive();
          }}
        >
          {sections.map((section, s) =>
            section.label !== null ? (
              <div
                key={`g${s}`}
                className="oge-list-box-group"
                role="group"
                aria-labelledby={groupId(s)}
              >
                <div
                  className="oge-list-box-group-header"
                  role="presentation"
                  id={groupId(s)}
                >
                  {renderGroup
                    ? renderGroup(section.label, {
                        count: section.options.length,
                      })
                    : section.label}
                </div>
                {section.options.map((option) =>
                  renderOption(option.item, option.index),
                )}
              </div>
            ) : (
              section.options.map((option) =>
                renderOption(option.item, option.index),
              )
            ),
          )}
        </div>
        {visible.length === 0 && (
          <div className="oge-list-box-empty">
            {props.noDataText ?? field.msg.noDataText}
          </div>
        )}
      </div>
      {subscript && (
        <div
          className={[
            'oge-list-box-subscript',
            subscript.error && 'oge-list-box-error',
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
  props: OgeListBoxProps<TItem> & {
    ref?: React.ForwardedRef<OgeListBoxHandle<TItem>>;
  },
) => ReactNode;
