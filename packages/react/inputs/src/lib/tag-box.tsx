'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { withInputWidth } from './field-extras';
import {
  OgeSelectListCore,
  adaptiveListViewportHeight,
  formatPattern,
  ogeAllowDropDownClose,
  ogeAllowDropDownOpen,
  ogeCanSelectMore,
  ogeChipOverflow,
  ogeSelectAllState,
  ogeToggleAllValues,
  type OgeDropDownCloseReason,
  type OgeDropDownClosingEvent,
  type OgeDropDownOpeningEvent,
  type OgeListDataSource,
  type OgeListPageLoadedEvent,
  type OgeVirtualScrollOptions,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectImageExpr,
  type OgeSelectItemsFn,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
  sanitizeResourceUrl,
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
import {
  SheetDone,
  SheetSearch,
  sheetFocusAttr,
  useAdaptivePopup,
  type OgeAdaptiveProps,
} from './adaptive';
import {
  panelCloseReason,
  type OgeSelectBoxCustomItemEvent,
} from './select-box';
import { fillShortList, useRemoteList } from './use-remote-list';

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

/** Payload of `onSelectAllValueChanged` — the "select all" toggle was used. */
export interface OgeTagBoxSelectAllEvent {
  /** `true` selected every eligible item, `false` cleared them. */
  selected: boolean;
  event: Event;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTagBoxHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  open(): void;
  /** Closes unless `onClosing` vetoes it; returns whether it closed. */
  close(): boolean;
  toggle(): void;
  /** Selects every visible, enabled item (up to `maxSelectedItems`). */
  selectAll(): void;
  /** Clears the visible, enabled items from the selection. */
  unselectAll(): void;
  /** Re-requests the current search from `dataSource`, dropping every cached page. */
  reload(): void;
}

export interface OgeTagBoxProps<TItem = unknown>
  extends
    OgeAdaptiveProps,
    OgeControlProps<readonly unknown[]>,
    OgeFieldExtrasProps {
  /** The selectable items: an array, or a function invoked lazily on first open. */
  items?: readonly TItem[] | OgeSelectItemsFn<TItem>;
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  valueExpr?: OgeSelectValueExpr<TItem>;
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** Item → image URL rendered in chips and options (avatars, flags…). */
  imageExpr?: OgeSelectImageExpr<TItem>;
  /** Groups flat items under headers; items re-order by first-seen group. */
  groupBy?: OgeSelectGroupExpr<TItem>;
  /** Enables typing into the field to filter the list. */
  searchEnabled?: boolean;
  searchMode?: OgeSelectSearchMode;
  /** Which text the filter matches; defaults to the display text. */
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /**
   * Debounce before typed text filters the list. Unset filters local items
   * immediately and debounces `dataSource` requests by the provider default.
   */
  searchTimeout?: number;
  /** Characters required before the filter narrows the list. */
  minSearchLength?: number;
  /** Below `minSearchLength`: show the full list (`true`) or nothing (`false`). */
  showDataBeforeSearch?: boolean;
  /** Lets typed text that matches no item become a new tag on Enter. */
  acceptCustomValue?: boolean;
  /** Maps typed text to an item when `acceptCustomValue` is on. */
  onCustomItemCreating?: (payload: OgeSelectBoxCustomItemEvent<TItem>) => void;
  /** Renders checkboxes in front of the options. */
  showSelectionControls?: boolean;
  /** Hides already-selected items from the popup list. */
  hideSelectedItems?: boolean;
  /** Adds a tri-state "select all" row above the options. */
  showSelectAll?: boolean;
  /** Caps the rendered chips; the rest collapse into a `+N more` chip. */
  maxDisplayedTags?: number;
  /** Caps how many items can be selected; at the cap the popup says so. */
  maxSelectedItems?: number;
  /** Renders the chevron toggle in the field rail. */
  showDropDownButton?: boolean;
  /** Renders the clear (✕) button while any tag is selected. */
  showClearButton?: boolean;
  /** Clicking the field opens the popup. */
  openOnFieldClick?: boolean;
  /** Shows a loading row instead of items — server-side filtering escape hatch. */
  loading?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  dropdownWidth?: number | 'anchor';
  dropdownMaxHeight?: number;
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height; `groupBy` is ignored while active.
   */
  virtualScroll?: boolean | OgeVirtualScrollOptions;
  /** Remote, paged data — see `OgeSelectBox`'s `dataSource`. */
  dataSource?: OgeListDataSource<TItem>;
  /** Rows requested per `dataSource` page; provider default (30) otherwise. */
  pageSize?: number;
  /** A `dataSource` page landed (search text, offset, rows, total). */
  onPageLoaded?: (event: OgeListPageLoadedEvent<TItem>) => void;
  /** Custom option row rendering (the checkbox stays). */
  renderItem?: (
    item: TItem,
    context: { index: number; selected: boolean; active: boolean },
  ) => ReactNode;
  /** Custom group header rendering (`groupBy` lists). */
  renderGroup?: (label: string) => ReactNode;
  /** Custom chip content (the remove button stays). */
  renderTag?: (
    item: TItem,
    context: { index: number; text: string },
  ) => ReactNode;
  /** Popup visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** Fires on every commit with the added/removed item delta. */
  onSelectionChange?: (event: OgeTagBoxSelectionChangedEvent<TItem>) => void;
  /** An option row was toggled by click or keyboard. */
  onItemClick?: (event: OgeTagBoxItemClickEvent<TItem>) => void;
  /** The "select all" row was toggled. */
  onSelectAllValueChanged?: (event: OgeTagBoxSelectAllEvent) => void;
  onDropDownOpened?: () => void;
  onDropDownClosed?: () => void;
  /** Cancelable pre-open event — set `cancel` to keep the popup closed. */
  onOpening?: (event: OgeDropDownOpeningEvent) => void;
  /** Cancelable pre-close event (with its `reason`) — set `cancel` to keep the popup open. */
  onClosing?: (event: OgeDropDownClosingEvent) => void;
  /** Raw search text on every keystroke — drive server-side filtering. */
  onSearchChange?: (event: { text: string }) => void;
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

const checkGlyph = (
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
);

const mixedGlyph = (
  <svg
    viewBox="0 0 16 16"
    width="10"
    height="10"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M4 8h8" />
  </svg>
);

/**
 * Multi-select editor on the shared oge field chrome — the React render of
 * the Angular `<oge-tag-box>`: selected items render as removable chips
 * inside the field, the popup is a multiselectable listbox with checkboxes
 * that stays open while picking, and the value is an array of `valueExpr`
 * results — over `@oge-ui/behavior`'s `OgeSelectListCore` and
 * `OgeRemoteListCore`, the exact machines the Angular editor runs. Shares
 * the select box's vocabulary (groups, item renderers, lazy items, remote
 * paging, custom values) and adds chip renderers, a tri-state "select all"
 * row, a selection cap and chip overflow.
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
    maxSelectedItems,
    showSelectAll = false,
    acceptCustomValue = false,
    loading = false,
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

  const adaptive = useAdaptivePopup(props, 'sheet');

  const virtual = useListVirtualizer({
    virtualScroll,
    size: props.size ?? 'md',
    dropdownMaxHeight: adaptive.active
      ? adaptiveListViewportHeight()
      : dropdownMaxHeight,
    itemCount: () => listRef.current?.visibleItems().length ?? 0,
    listEl: listElRef,
  });
  const virtualRef = useRef(virtual);
  virtualRef.current = virtual;

  const remote = useRemoteList<TItem>({
    dataSource: props.dataSource,
    pageSize: props.pageSize,
    searchTimeout: props.searchTimeout,
    minSearchLength: props.minSearchLength ?? 0,
    showDataBeforeSearch: props.showDataBeforeSearch ?? false,
    valueOf: (item) => listRef.current?.itemValue(item),
    onPageLoaded: props.onPageLoaded,
  });
  const remoteRef = useRef(remote);
  remoteRef.current = remote;

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const listRef = useRef<OgeSelectListCore<TItem>>(undefined);
  if (!listRef.current) {
    listRef.current = new OgeSelectListCore<TItem>(
      {
        inputId: () => latest.current.field.ids.inputId,
        opened: () => openedRef.current,
        items: () =>
          remoteRef.current.active
            ? remoteRef.current.core.items()
            : (latest.current.props.items ?? []),
        serverFiltering: () => remoteRef.current.active,
        displayExpr: () => latest.current.props.displayExpr,
        valueExpr: () => latest.current.props.valueExpr,
        disabledExpr: () => latest.current.props.disabledExpr,
        imageExpr: () => latest.current.props.imageExpr,
        searchExpr: () => latest.current.props.searchExpr,
        searchEnabled: () => latest.current.props.searchEnabled ?? false,
        searchMode: () => latest.current.props.searchMode ?? 'contains',
        searchDebounceMs: () => latest.current.props.searchTimeout ?? 0,
        minSearchLength: () => latest.current.props.minSearchLength ?? 0,
        showDataBeforeSearch: () =>
          latest.current.props.showDataBeforeSearch ?? false,
        groupBy: () =>
          virtualRef.current.active ? undefined : latest.current.props.groupBy,
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

  /** Items input changes: array ↔ function, or a new reference. */
  const armedItemsRef = useRef(items);
  useEffect(() => {
    if (armedItemsRef.current === items) return;
    armedItemsRef.current = items;
    list.syncItemsSource();
    if (openedRef.current) list.ensureItemsLoaded();
  });

  // --- selection -------------------------------------------------------------

  /** Custom tags created through `acceptCustomValue` — not in `items`. */
  const [customItems, setCustomItems] = useState<readonly TItem[]>([]);
  const customSeq = useRef(0);

  const isSelected = (item: TItem): boolean => {
    const entry = list.itemValue(item);
    return field.value.some((candidate) => Object.is(candidate, entry));
  };
  isSelectedRef.current = isSelected;

  const limitReached = !ogeCanSelectMore(field.value.length, maxSelectedItems);
  const isOptionDisabled = (item: TItem): boolean =>
    list.isItemDisabled(item) || (limitReached && !isSelected(item));

  /** Selected items resolved from `value`, in value order. */
  const pool = list.resolvedItems();
  const selectedItems: readonly TItem[] = field.value
    .map((entry) => {
      const matches = (item: TItem) => Object.is(list.itemValue(item), entry);
      return (
        pool.find(matches) ??
        (remote.active ? remote.core.lookup(entry) : undefined) ??
        customItems.find(matches)
      );
    })
    .filter((item): item is TItem => item !== undefined);

  const overflow = ogeChipOverflow(selectedItems.length, maxDisplayedTags);
  const visibleChips = selectedItems
    .slice(0, overflow.shown)
    .map((item, valueIndex) => ({ item, valueIndex }));
  const overflowCount = overflow.hidden;

  // --- panel -----------------------------------------------------------------

  const allowClose = (reason: OgeDropDownCloseReason): boolean =>
    ogeAllowDropDownClose(latest.current.props.onClosing, reason);

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
    beforeClose: (reason) => allowClose(panelCloseReason(reason)),
    onClosed: () => {
      if (openedRef.current) setOpened(false);
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  const [selectAllActive, setSelectAllActive] = useState(false);
  const userNavigated = useRef(false);

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
      list.ensureItemsLoaded();
      remoteRef.current.core.open();
      if (list.activeIndex() < 0) {
        list.setActive(list.edgeEnabledIndex(1));
      }
      latest.current.props.onDropDownOpened?.();
    } else {
      if (machine.isOpen) machine.close('api');
      if (!announcedOpen.current) return;
      announcedOpen.current = false;
      list.activeIndex.set(-1);
      setSelectAllActive(false);
      userNavigated.current = false;
      list.resetSearch();
      remoteRef.current.core.setSearch(null, true);
      virtualRef.current.reset();
      latest.current.props.onDropDownClosed?.();
    }
  }, [opened, panel.isOpen]);

  // filtering / selection changes re-anchor the active option
  useEffect(() => {
    if (
      openedRef.current &&
      !selectAllActive &&
      list.activeIndex() >= list.visibleItems().length
    ) {
      list.setActive(list.edgeEnabledIndex(1));
    }
  });

  // chips whose values no loaded page holds resolve through `byKey`
  useEffect(() => {
    if (!remote.active) return;
    for (const value of field.value) remote.core.resolve(value);
  }, [remote.active, remote.core, field.value]);
  // paging follows the view (rendered window / keyboard position)
  useEffect(() => {
    if (!remote.active || !opened) return;
    const end = virtual.active ? virtual.window().end : -1;
    const target = Math.max(end, list.activeIndex());
    if (target >= 0) remote.core.notifyVisibleEnd(target);
    if (!virtual.active) fillShortList(listElRef.current, remote.core);
  });

  const open = (): void => {
    if (field.effectiveDisabled || readonly || openedRef.current) return;
    if (!ogeAllowDropDownOpen(latest.current.props.onOpening)) return;
    setOpened(true);
    if (list.activeIndex() < 0) list.setActive(list.edgeEnabledIndex(1));
  };
  const close = (reason: OgeDropDownCloseReason = 'api'): boolean => {
    if (!openedRef.current) return true;
    if (!allowClose(reason)) return false;
    setOpened(false);
    return true;
  };
  const toggle = (): void => {
    if (openedRef.current) close();
    else open();
  };

  const clearSearch = (): void => {
    list.resetSearch();
    remote.core.setSearch(null, true);
  };

  const toggleItem = (item: TItem, event: Event): void => {
    const entry = list.itemValue(item);
    const current = latest.current.field.value;
    const exists = current.some((candidate) => Object.is(candidate, entry));
    if (
      !exists &&
      !ogeCanSelectMore(current.length, latest.current.props.maxSelectedItems)
    ) {
      return;
    }
    if (!exists && remote.active) remote.core.remember(item);
    const next = exists
      ? current.filter((candidate) => !Object.is(candidate, entry))
      : [...current, entry];
    field.commit.commitNow(next, event);
    latest.current.props.onSelectionChange?.(
      exists
        ? { addedItems: [], removedItems: [item] }
        : { addedItems: [item], removedItems: [] },
    );
  };

  const toggleItemAt = (index: number, event: Event): void => {
    const item = list.visibleItems()[index];
    if (item === undefined || isOptionDisabled(item)) return;
    latest.current.props.onItemClick?.({ item, index, event });
    toggleItem(item, event);
    // picking stays open (multi-select); clear the search for the next pick
    clearSearch();
    // in the adaptive sheet focus stays on the sheet's own search / list
    if (!adaptive.active) nativeRef.current?.focus();
  };

  const selectAllState = ogeSelectAllState(
    list.visibleItems(),
    isSelected,
    (item) => list.isItemDisabled(item),
  );

  const applySelectAll = (select: boolean, event: Event): void => {
    if (field.effectiveDisabled || readonly) return;
    const visible = list.visibleItems();
    const before = latest.current.field.value;
    const next = ogeToggleAllValues(
      before,
      visible,
      (item) => list.itemValue(item),
      (item) => list.isItemDisabled(item),
      select,
      latest.current.props.maxSelectedItems,
    );
    if (
      next.length === before.length &&
      next.every((value, index) => Object.is(value, before[index]))
    ) {
      return;
    }
    const has = (values: readonly unknown[], value: unknown) =>
      values.some((entry) => Object.is(entry, value));
    const addedItems = visible.filter(
      (item) =>
        has(next, list.itemValue(item)) && !has(before, list.itemValue(item)),
    );
    const removedItems = visible.filter(
      (item) =>
        !has(next, list.itemValue(item)) && has(before, list.itemValue(item)),
    );
    if (remote.active) {
      for (const item of addedItems) remote.core.remember(item);
    }
    field.commit.commitNow(next, event);
    latest.current.props.onSelectionChange?.({ addedItems, removedItems });
    latest.current.props.onSelectAllValueChanged?.({ selected: select, event });
  };

  const toggleAll = (event: Event): void => {
    // select while something can still be added; at the cap (or when all
    // are on) the same click clears the visible items
    applySelectAll(selectAllState !== true && !limitReached, event);
    if (!adaptive.active) nativeRef.current?.focus();
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

  // --- custom values --------------------------------------------------------

  const addCustomItem = (item: TItem, event: Event): void => {
    setCustomItems((current) => [...current, item]);
    if (!isSelectedRef.current(item)) toggleItem(item, event);
    clearSearch();
  };

  /** Returns `true` when the typed text was handled (created or rejected). */
  const tryCreateCustomItem = (event: Event): boolean => {
    const text = (list.searchText() ?? '').trim();
    if (!text) return false;
    // exact display match toggles the existing item instead of creating one
    const existing = list
      .resolvedItems()
      .find(
        (item) =>
          list.displayOf(item).toLocaleLowerCase() === text.toLocaleLowerCase(),
      );
    if (existing !== undefined) {
      if (!isOptionDisabled(existing) && !isSelected(existing)) {
        toggleItem(existing, event);
      }
      clearSearch();
      return true;
    }
    if (
      !ogeCanSelectMore(
        latest.current.field.value.length,
        latest.current.props.maxSelectedItems,
      )
    ) {
      return true;
    }
    const payload: OgeSelectBoxCustomItemEvent<TItem> = { text };
    latest.current.props.onCustomItemCreating?.(payload);
    const candidate =
      payload.customItem !== undefined
        ? payload.customItem
        : (text as unknown as TItem);
    if (candidate === null) return true; // handler rejected the text
    if (typeof (candidate as PromiseLike<unknown>)?.then === 'function') {
      const runId = ++customSeq.current;
      (candidate as PromiseLike<TItem | null>).then(
        (resolved) => {
          if (runId === customSeq.current && resolved != null) {
            addCustomItem(resolved, event);
          }
        },
        () => undefined,
      );
      return true;
    }
    addCustomItem(candidate as TItem, event);
    return true;
  };

  const selectAllVisible =
    showSelectAll && list.visibleItems().length > 0 && !list.searchText();

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
        userNavigated.current = true;
        if (event.key === 'ArrowDown' && selectAllActive) {
          setSelectAllActive(false);
          list.setActive(list.edgeEnabledIndex(1));
          return;
        }
        if (
          event.key === 'ArrowUp' &&
          selectAllVisible &&
          list.activeIndex() <= list.edgeEnabledIndex(1)
        ) {
          setSelectAllActive(true);
          list.activeIndex.set(-1);
          return;
        }
        list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (isOpen) {
          event.preventDefault();
          if (selectAllActive) {
            toggleAll(event.nativeEvent);
            return;
          }
          if (
            acceptCustomValue &&
            list.searchText() !== null &&
            !userNavigated.current &&
            tryCreateCustomItem(event.nativeEvent)
          ) {
            return;
          }
          if (list.activeIndex() >= 0) {
            toggleItemAt(list.activeIndex(), event.nativeEvent);
          }
          return;
        }
        field.handleEnterKey(event);
        return;
      }
      case ' ': {
        if (searchEnabled) return;
        event.preventDefault();
        if (!isOpen) open();
        else if (selectAllActive) toggleAll(event.nativeEvent);
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
          event.stopPropagation();
          close('escape');
        } else if (list.searchText()) {
          event.preventDefault();
          clearSearch();
        }
        return;
      }
      case 'Tab': {
        // the adaptive sheet traps Tab; only the anchored popup closes
        if (isOpen && !adaptive.active) close('tab');
        return;
      }
    }
  };

  const onSearchInput = (event: ChangeEvent<HTMLInputElement>): void => {
    if (!searchEnabled) return;
    const text = event.target.value;
    userNavigated.current = false;
    setSelectAllActive(false);
    list.setSearch(text);
    remote.core.setSearch(text);
    props.onInputChange?.({ text, event: event.nativeEvent });
    props.onSearchChange?.({ text });
    if (!openedRef.current) open();
  };

  useImperativeHandle(ref, () => ({
    focus: () => nativeRef.current?.focus(),
    blur: () => nativeRef.current?.blur(),
    clear: () => field.clear(),
    open,
    close: () => close(),
    toggle,
    selectAll: () => applySelectAll(true, new Event('change')),
    unselectAll: () => applySelectAll(false, new Event('change')),
    reload: () => remote.core.reload(),
  }));

  // --- render ----------------------------------------------------------------

  const floatUp = field.focused || !field.isEmpty || opened;
  const visibleItems = list.visibleItems();
  const rows = list.rows();
  const activeIndex = list.activeIndex();
  const itemsStatus = list.itemsStatus();
  const selectAllId = `${field.ids.inputId}-select-all`;
  const activeDescendant =
    opened && selectAllActive ? selectAllId : list.activeDescendant();
  const busy =
    loading || itemsStatus === 'loading' || remote.core.status() === 'loading';
  const setSize = !remote.active
    ? visibleItems.length
    : (remote.core.totalCount() ??
      (remote.core.hasMore() ? -1 : visibleItems.length));

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
        isOptionDisabled(item) && 'oge-disabled',
      ]
        .filter(Boolean)
        .join(' ')}
      role="option"
      id={list.optionId(index)}
      aria-selected={isSelected(item)}
      aria-disabled={isOptionDisabled(item) ? true : undefined}
      aria-posinset={positional ? index + 1 : undefined}
      aria-setsize={positional ? setSize : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => {
        if (isOptionDisabled(item)) return;
        setSelectAllActive(false);
        list.activeIndex.set(index);
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
          {isSelected(item) && checkGlyph}
        </span>
      )}
      {props.renderItem ? (
        props.renderItem(item, {
          index,
          selected: isSelected(item),
          active: index === activeIndex,
        })
      ) : (
        <>
          {list.imageOf(item) && (
            <img
              className="oge-select-option-img"
              src={sanitizeResourceUrl(list.imageOf(item)) || undefined}
              alt=""
              loading="lazy"
            />
          )}
          <span className="oge-select-option-text">{list.displayOf(item)}</span>
        </>
      )}
    </div>
  );

  const statusRow = (content: ReactNode, extra?: string) => (
    <div
      className={['oge-select-status', extra].filter(Boolean).join(' ')}
      role="presentation"
    >
      {content}
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
    <span
      ref={hostRef}
      className={hostClasses}
      style={withInputWidth(style, props.width)}
    >
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
              {props.renderTag ? (
                props.renderTag(chip.item, {
                  index: chip.valueIndex,
                  text: list.displayOf(chip.item),
                })
              ) : (
                <>
                  {list.imageOf(chip.item) && (
                    <img
                      className="oge-tag-img"
                      src={
                        sanitizeResourceUrl(list.imageOf(chip.item)) ||
                        undefined
                      }
                      alt=""
                    />
                  )}
                  <span className="oge-tag-text">
                    {list.displayOf(chip.item)}
                  </span>
                </>
              )}
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
            <span className="oge-tag oge-tag-more">
              {formatPattern(field.msg.moreTags, {
                count: String(overflowCount),
              })}
            </span>
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
            aria-activedescendant={activeDescendant ?? undefined}
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            onChange={onSearchInput}
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
              // the adaptive sheet taking focus is not the user leaving
              if (openedRef.current && adaptive.active) return;
              clearSearch();
              if (openedRef.current) close('blur');
              field.handleBlur(event);
            }}
          />
        </div>
      </OgeFieldChrome>
      {opened && (
        <OgePopup
          panel={panel}
          ref={popupRef}
          adaptive={adaptive.presentation}
          adaptiveTitle={label || field.msg.adaptiveTitle}
          closeLabel={field.msg.adaptiveClose}
          sheetHeader={
            adaptive.active && searchEnabled ? (
              <SheetSearch
                listboxId={list.listboxId}
                activeDescendant={activeDescendant}
                value={list.searchText() ?? ''}
                label={field.msg.adaptiveSearch}
                placeholder={field.msg.adaptiveSearch}
                onChange={onSearchInput}
                onKeyDown={onKeyDown}
              />
            ) : undefined
          }
          sheetFooter={
            adaptive.active ? (
              <SheetDone
                label={field.msg.adaptiveDone}
                onClick={() => close()}
              />
            ) : undefined
          }
        >
          {limitReached && (
            <div className="oge-select-limit" role="status">
              {formatPattern(field.msg.maxSelectedItemsMessage, {
                max: String(maxSelectedItems ?? ''),
              })}
            </div>
          )}
          <div
            ref={listElRef}
            {...(adaptive.active && !searchEnabled
              ? {
                  ...sheetFocusAttr,
                  tabIndex: 0,
                  'aria-activedescendant': activeDescendant ?? undefined,
                  onKeyDown: (event: ReactKeyboardEvent) => {
                    if (event.target === event.currentTarget) onKeyDown(event);
                  },
                }
              : {})}
            className={[
              'oge-select-list',
              virtual.active && 'oge-select-list-virtual',
            ]
              .filter(Boolean)
              .join(' ')}
            role="listbox"
            aria-multiselectable="true"
            id={list.listboxId}
            style={{
              maxHeight: adaptive.active ? undefined : dropdownMaxHeight,
            }}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            aria-busy={busy || undefined}
            onScroll={(event) => {
              virtual.onScroll(event);
              if (!virtual.active) remote.onScroll(event.currentTarget);
            }}
          >
            {selectAllVisible && (
              <div
                className={[
                  'oge-select-option',
                  'oge-tag-select-all-option',
                  selectAllActive && 'oge-select-option-active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="option"
                id={selectAllId}
                aria-selected={selectAllState === true}
                aria-checked={selectAllState}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setSelectAllActive(true)}
                onClick={(event) => toggleAll(event.nativeEvent)}
              >
                <span
                  className={[
                    'oge-tag-checkbox',
                    selectAllState === true && 'oge-tag-checkbox-on',
                    selectAllState === 'mixed' && 'oge-tag-checkbox-mixed',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  {selectAllState === true
                    ? checkGlyph
                    : selectAllState === 'mixed'
                      ? mixedGlyph
                      : null}
                </span>
                <span className="oge-select-option-text">
                  {field.msg.selectAllText}
                </span>
              </div>
            )}
            {loading ||
            itemsStatus === 'loading' ||
            remote.core.loadingFirstPage() ? (
              statusRow(field.msg.dropDownLoading)
            ) : itemsStatus === 'error' ||
              (remote.core.status() === 'error' &&
                visibleItems.length === 0) ? (
              statusRow(field.msg.dropDownLoadError)
            ) : visibleItems.length === 0 ? (
              statusRow(field.msg.noDataText)
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
              rows.map((row, rowIndex) =>
                row.kind === 'group' ? (
                  <div
                    key={`g-${rowIndex}`}
                    className="oge-select-group"
                    role="presentation"
                  >
                    {props.renderGroup
                      ? props.renderGroup(row.label)
                      : row.label}
                  </div>
                ) : (
                  optionRow(row.item, row.index, false)
                ),
              )
            )}
            {remote.core.loadingMore() &&
              statusRow(field.msg.dropDownLoading, 'oge-select-loading-more')}
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
