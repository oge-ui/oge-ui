'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  OgeSelectListCore,
  type OgeVirtualScrollOptions,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectImageExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import { OgeFieldChrome } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { createBumpAdapter } from './rx-adapter';
import { useListVirtualizer } from './use-list-virtualizer';
import { useOgeField, type OgeControlProps } from './use-field';

/** Payload of `onSelectionChange` — the added/removed item delta per commit. */
export interface OgeTagBoxSelectionChangedEvent<TItem> {
  addedItems: readonly TItem[];
  removedItems: readonly TItem[];
}

/** Payload of `onItemClick` — an option row was toggled. */
export interface OgeTagBoxItemClickEvent<TItem> {
  item: TItem;
  index: number;
  event: Event;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTagBoxHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  open(): void;
  close(): void;
  toggle(): void;
}

export interface OgeTagBoxProps<TItem = unknown>
  extends OgeControlProps<readonly unknown[]>, OgeFieldExtrasProps {
  /** The selectable items. */
  items?: readonly TItem[];
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  valueExpr?: OgeSelectValueExpr<TItem>;
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** Item → image URL rendered in chips and options (avatars, flags…). */
  imageExpr?: OgeSelectImageExpr<TItem>;
  /** Enables typing into the field to filter the list. */
  searchEnabled?: boolean;
  searchMode?: OgeSelectSearchMode;
  /** Which text the filter matches; defaults to the display text. */
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /** Renders checkboxes in front of the options. */
  showSelectionControls?: boolean;
  /** Hides already-selected items from the popup list. */
  hideSelectedItems?: boolean;
  /** Caps the rendered chips; the rest collapse into a `+N` chip. */
  maxDisplayedTags?: number;
  /** Renders the chevron toggle in the field rail. */
  showDropDownButton?: boolean;
  /** Renders the clear (✕) button while any tag is selected. */
  showClearButton?: boolean;
  /** Clicking the field opens the popup. */
  openOnFieldClick?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  dropdownWidth?: number | 'anchor';
  dropdownMaxHeight?: number;
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height while active.
   */
  virtualScroll?: boolean | OgeVirtualScrollOptions;
  /** Popup visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** Fires on every commit with the added/removed item delta. */
  onSelectionChange?: (event: OgeTagBoxSelectionChangedEvent<TItem>) => void;
  /** An option row was toggled by click or keyboard. */
  onItemClick?: (event: OgeTagBoxItemClickEvent<TItem>) => void;
  onDropDownOpened?: () => void;
  onDropDownClosed?: () => void;
  onInputChange?: (event: { text: string; event: Event }) => void;
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Multi-select editor on the shared oge field chrome — the React render of
 * the Angular `<oge-tag-box>`: selected items render as removable chips
 * inside the field, the popup is a multiselectable listbox with checkboxes
 * that stays open while picking, and the value is an array of `valueExpr`
 * results — over `@oge-ui/behavior`'s `OgeSelectListCore`, the exact list
 * machine the Angular editor runs, plus `virtualScroll` windowing.
 *
 * ```tsx
 * <OgeTagBox label="Skills" items={skills} value={selected} onValueChange={setSelected} />
 * ```
 */
export const OgeTagBox = forwardRef(function OgeTagBoxRender<TItem>(
  props: OgeTagBoxProps<TItem>,
  ref: React.ForwardedRef<OgeTagBoxHandle>,
) {
  const {
    items = [],
    searchEnabled = false,
    showSelectionControls = true,
    maxDisplayedTags,
    showDropDownButton = true,
    showClearButton = false,
    showSuccessIcon = false,
    selectOnFocus = false,
    inputAttr,
    openOnFieldClick = true,
    dropdownMaxHeight,
    virtualScroll = false,
    label = '',
    labelMode = 'static',
    stylingMode = 'outlined',
    placeholder = '',
    hint,
    subscriptSizing = 'fixed',
    fluid = false,
    prefix,
    suffix,
    className,
    style,
  } = props;

  const overlayConfig = useOgeOverlayConfig();
  const hostRef = useRef<HTMLSpanElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listElRef = useRef<HTMLDivElement>(null);

  const field = useOgeField<readonly unknown[]>({
    props,
    emptyValue: [],
    isEmpty: (value) => value.length === 0,
    focusNative: () => nativeRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;

  const [uncontrolledOpened, setUncontrolledOpened] = useState(
    props.defaultOpened ?? false,
  );
  const opened = props.opened ?? uncontrolledOpened;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  const latest = useRef({ props, field, opened });
  latest.current = { props, field, opened };

  const setOpened = (next: boolean): void => {
    if (latest.current.props.opened === undefined) setUncontrolledOpened(next);
    latest.current.props.onOpenedChange?.(next);
  };

  const isSelectedRef = useRef<(item: TItem) => boolean>(() => false);

  const virtual = useListVirtualizer({
    virtualScroll,
    size: props.size ?? 'md',
    dropdownMaxHeight,
    itemCount: () => listRef.current?.visibleItems().length ?? 0,
    listEl: listElRef,
  });
  const virtualRef = useRef(virtual);
  virtualRef.current = virtual;

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const listRef = useRef<OgeSelectListCore<TItem>>(undefined);
  if (!listRef.current) {
    listRef.current = new OgeSelectListCore<TItem>(
      {
        inputId: () => latest.current.field.ids.inputId,
        opened: () => openedRef.current,
        items: () => latest.current.props.items ?? [],
        displayExpr: () => latest.current.props.displayExpr,
        valueExpr: () => latest.current.props.valueExpr,
        disabledExpr: () => latest.current.props.disabledExpr,
        imageExpr: () => latest.current.props.imageExpr,
        searchExpr: () => latest.current.props.searchExpr,
        searchEnabled: () => latest.current.props.searchEnabled ?? false,
        searchMode: () => latest.current.props.searchMode ?? 'contains',
        searchDebounceMs: () => 0,
        preFilterItems: (all) =>
          latest.current.props.hideSelectedItems
            ? all.filter((item) => !isSelectedRef.current(item))
            : all,
        scrollActiveIntoView: (index) => {
          if (virtualRef.current.active) {
            virtualRef.current.scrollToIndex(index);
          } else {
            listRef.current?.scrollOptionIntoView(index);
          }
        },
      },
      createBumpAdapter(bump),
    );
  }
  const list = listRef.current;
  useEffect(() => () => list.destroy(), [list]);

  // --- selection -------------------------------------------------------------

  const isSelected = (item: TItem): boolean => {
    const entry = list.itemValue(item);
    return field.value.some((candidate) => Object.is(candidate, entry));
  };
  isSelectedRef.current = isSelected;

  /** Selected items resolved from `value`, in value order. */
  const selectedItems: readonly TItem[] = field.value
    .map((entry) =>
      items.find((item) => Object.is(list.itemValue(item), entry)),
    )
    .filter((item): item is TItem => item !== undefined);

  /** Chips rendered in the field (respects `maxDisplayedTags`). */
  const visibleChips = (() => {
    const chips = selectedItems.map((item, valueIndex) => ({
      item,
      valueIndex,
    }));
    return maxDisplayedTags !== undefined && chips.length > maxDisplayedTags
      ? chips.slice(0, maxDisplayedTags)
      : chips;
  })();
  const overflowCount =
    maxDisplayedTags === undefined
      ? 0
      : Math.max(0, selectedItems.length - maxDisplayedTags);

  // --- panel -----------------------------------------------------------------

  const panel = useAnchoredPanel({
    anchor: () =>
      hostRef.current?.querySelector<HTMLElement>('.oge-input-container') ??
      hostRef.current,
    panel: () => popupRef.current,
    placement: () => latest.current.props.dropdownPlacement ?? 'bottom-start',
    width: () => latest.current.props.dropdownWidth ?? 'anchor',
    offset: () => overlayConfig.offset,
    viewportPadding: () => overlayConfig.viewportPadding,
    restoreFocus: () => nativeRef.current?.focus(),
    onClosed: () => {
      if (openedRef.current) setOpened(false);
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  // Tracks what we have already announced: the panel machine can close itself
  // (Escape, outside click), so `machine.isOpen` alone would miss those closes
  // and never run the teardown.
  const announcedOpen = useRef(false);
  useEffect(() => {
    const machine = panelRef.current;
    if (opened) {
      if (!machine.isOpen) machine.open();
      if (announcedOpen.current) return;
      announcedOpen.current = true;
      if (list.activeIndex() < 0) {
        list.setActive(list.edgeEnabledIndex(1));
      }
      latest.current.props.onDropDownOpened?.();
    } else {
      if (machine.isOpen) machine.close('api');
      if (!announcedOpen.current) return;
      announcedOpen.current = false;
      list.activeIndex.set(-1);
      list.resetSearch();
      virtualRef.current.reset();
      latest.current.props.onDropDownClosed?.();
    }
  }, [opened, panel.isOpen]);

  // filtering / selection changes re-anchor the active option
  useEffect(() => {
    if (openedRef.current && list.activeIndex() >= list.visibleItems().length) {
      list.setActive(list.edgeEnabledIndex(1));
    }
  });

  const open = (): void => {
    if (field.effectiveDisabled || readonly) return;
    setOpened(true);
    if (list.activeIndex() < 0) list.setActive(list.edgeEnabledIndex(1));
  };
  const close = (): void => setOpened(false);
  const toggle = (): void => (openedRef.current ? close() : open());

  const toggleItemAt = (index: number, event: Event): void => {
    const item = list.visibleItems()[index];
    if (item === undefined || list.isItemDisabled(item)) return;
    latest.current.props.onItemClick?.({ item, index, event });
    const entry = list.itemValue(item);
    const current = latest.current.field.value;
    const exists = current.some((candidate) => Object.is(candidate, entry));
    const next = exists
      ? current.filter((candidate) => !Object.is(candidate, entry))
      : [...current, entry];
    field.commit.commitNow(next, event);
    latest.current.props.onSelectionChange?.(
      exists
        ? { addedItems: [], removedItems: [item] }
        : { addedItems: [item], removedItems: [] },
    );
    // picking stays open (multi-select); clear the search for the next pick
    list.resetSearch();
    nativeRef.current?.focus();
  };

  const removeAt = (valueIndex: number, event: Event): void => {
    if (field.effectiveDisabled || readonly) return;
    const removedItem = selectedItems[valueIndex];
    const next = latest.current.field.value.filter(
      (_, index) => index !== valueIndex,
    );
    field.commit.commitNow(next, event);
    if (removedItem !== undefined) {
      latest.current.props.onSelectionChange?.({
        addedItems: [],
        removedItems: [removedItem],
      });
    }
    nativeRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (field.effectiveDisabled || readonly) return;
    const isOpen = openedRef.current;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (isOpen && list.activeIndex() >= 0) {
          event.preventDefault();
          toggleItemAt(list.activeIndex(), event.nativeEvent);
          return;
        }
        field.handleEnterKey(event);
        return;
      }
      case ' ': {
        if (searchEnabled) return;
        event.preventDefault();
        if (!isOpen) open();
        else if (list.activeIndex() >= 0) {
          toggleItemAt(list.activeIndex(), event.nativeEvent);
        }
        return;
      }
      case 'Backspace': {
        if (
          (list.searchText() ?? '') === '' &&
          latest.current.field.value.length > 0
        ) {
          event.preventDefault();
          removeAt(latest.current.field.value.length - 1, event.nativeEvent);
        }
        return;
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault();
          close();
        } else if (list.searchText()) {
          event.preventDefault();
          list.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (isOpen) close();
        return;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => nativeRef.current?.focus(),
    blur: () => nativeRef.current?.blur(),
    clear: () => field.clear(),
    open,
    close,
    toggle,
  }));

  // --- render ----------------------------------------------------------------

  const floatUp = field.focused || !field.isEmpty || opened;
  const visibleItems = list.visibleItems();
  const activeIndex = list.activeIndex();

  const virtualWindow = virtual.window();
  /** The windowed slice rendered in virtual mode — indices stay absolute. */
  const windowedItems = virtual.active
    ? visibleItems
        .slice(virtualWindow.start, virtualWindow.end)
        .map((item, offset) => ({ item, index: virtualWindow.start + offset }))
    : [];

  const optionRow = (item: TItem, index: number, positional: boolean) => (
    <div
      key={index}
      className={[
        'oge-select-option',
        index === activeIndex && 'oge-select-option-active',
        isSelected(item) && 'oge-select-option-selected',
        list.isItemDisabled(item) && 'oge-disabled',
      ]
        .filter(Boolean)
        .join(' ')}
      role="option"
      id={list.optionId(index)}
      aria-selected={isSelected(item)}
      aria-disabled={list.isItemDisabled(item) ? true : undefined}
      aria-posinset={positional ? index + 1 : undefined}
      aria-setsize={positional ? visibleItems.length : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => {
        if (!list.isItemDisabled(item)) list.activeIndex.set(index);
      }}
      onClick={(event) => toggleItemAt(index, event.nativeEvent)}
    >
      {showSelectionControls && (
        <span
          className={[
            'oge-tag-checkbox',
            isSelected(item) && 'oge-tag-checkbox-on',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {isSelected(item) && (
            <svg
              viewBox="0 0 16 16"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 8.5 3.5 3.5L13 4.5" />
            </svg>
          )}
        </span>
      )}
      {list.imageOf(item) && (
        <img
          className="oge-select-option-img"
          src={list.imageOf(item) ?? undefined}
          alt=""
          loading="lazy"
        />
      )}
      <span className="oge-select-option-text">{list.displayOf(item)}</span>
    </div>
  );

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
    'oge-tag-box',
    opened && 'oge-select-box-open',
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
    <span ref={hostRef} className={hostClasses} style={style}>
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
          clear: () => field.clear(),
          subscriptSizing,
          showError: field.showError,
          resolvedErrorText: field.resolvedErrorText,
          hint,
          counter: null,
          reveal: null,
          copy: null,
          spin: null,
          dropdown: {
            visible: showDropDownButton && !field.effectiveDisabled,
            expanded: opened,
            toggle,
          },
        }}
        prefix={prefix}
        suffix={suffix}
      >
        <div className="oge-tag-strip">
          {visibleChips.map((chip) => (
            <span key={chip.valueIndex} className="oge-tag">
              {list.imageOf(chip.item) && (
                <img
                  className="oge-tag-img"
                  src={list.imageOf(chip.item) ?? undefined}
                  alt=""
                />
              )}
              <span className="oge-tag-text">{list.displayOf(chip.item)}</span>
              <button
                type="button"
                className="oge-tag-remove"
                tabIndex={-1}
                aria-label={field.msg.removeTagButton}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) =>
                  removeAt(chip.valueIndex, event.nativeEvent)
                }
              >
                <svg
                  viewBox="0 0 16 16"
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m4 4 8 8m0-8-8 8" />
                </svg>
              </button>
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="oge-tag oge-tag-more">+{overflowCount}</span>
          )}
          <input
            {...extraAttrs}
            ref={nativeRef}
            className={[
              'oge-input-native',
              'oge-tag-input',
              !searchEnabled && 'oge-select-plain',
            ]
              .filter(Boolean)
              .join(' ')}
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            autoComplete="off"
            id={field.ids.inputId}
            value={list.searchText() ?? ''}
            placeholder={field.isEmpty ? placeholder : ''}
            disabled={field.effectiveDisabled}
            readOnly={readonly || !searchEnabled}
            name={props.name || undefined}
            title={props.tooltip}
            tabIndex={props.tabIndex ?? 0}
            autoFocus={props.autofocus}
            aria-expanded={opened}
            aria-controls={opened ? list.listboxId : undefined}
            aria-autocomplete={searchEnabled ? 'list' : 'none'}
            aria-activedescendant={list.activeDescendant() ?? undefined}
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            onChange={(event) => {
              if (!searchEnabled) return;
              const text = event.target.value;
              list.setSearch(text);
              props.onInputChange?.({ text, event: event.nativeEvent });
              if (!openedRef.current) open();
            }}
            onClick={() => {
              if (field.effectiveDisabled || readonly) return;
              if (!openedRef.current && openOnFieldClick) open();
            }}
            onKeyDown={onKeyDown}
            onFocus={(event) => {
              if (selectOnFocus) nativeRef.current?.select();
              field.handleFocus(event);
            }}
            onBlur={(event) => {
              list.resetSearch();
              if (openedRef.current) close();
              field.handleBlur(event);
            }}
          />
        </div>
      </OgeFieldChrome>
      {opened && (
        <OgePopup panel={panel} ref={popupRef}>
          <div
            ref={listElRef}
            className={[
              'oge-select-list',
              virtual.active && 'oge-select-list-virtual',
            ]
              .filter(Boolean)
              .join(' ')}
            role="listbox"
            aria-multiselectable="true"
            id={list.listboxId}
            style={{ maxHeight: dropdownMaxHeight }}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            onScroll={virtual.onScroll}
          >
            {visibleItems.length === 0 ? (
              <div className="oge-select-status" role="presentation">
                {field.msg.noDataText}
              </div>
            ) : virtual.active ? (
              <div
                className="oge-select-spacer"
                style={{ height: virtualWindow.totalHeight }}
              >
                <div
                  className="oge-select-window"
                  style={{
                    transform: `translateY(${virtualWindow.offsetY}px)`,
                  }}
                >
                  {windowedItems.map((row) =>
                    optionRow(row.item, row.index, true),
                  )}
                </div>
              </div>
            ) : (
              visibleItems.map((item, index) => optionRow(item, index, false))
            )}
          </div>
        </OgePopup>
      )}
    </span>
  );
}) as <TItem = unknown>(
  props: OgeTagBoxProps<TItem> & {
    ref?: React.ForwardedRef<OgeTagBoxHandle>;
  },
) => ReactNode;
