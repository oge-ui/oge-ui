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
  OGE_SELECT_OPTION_HEIGHT,
  OgeSelectListCore,
  adaptiveListViewportHeight,
  formatPattern,
  ogeAllowDropDownClose,
  ogeAllowDropDownOpen,
  ogeChipOverflow,
  ogeComboCellText,
  ogeComboCellValue,
  ogeComboColumnCaption,
  ogeComboColumnTarget,
  ogeComboFixedWidth,
  ogeComboGridTemplate,
  ogeComboSearchStrings,
  type OgeComboBoxColumnBase,
  type OgeDropDownCloseReason,
  type OgeDropDownClosingEvent,
  type OgeDropDownOpeningEvent,
  type OgeListDataSource,
  type OgeListPageLoadedEvent,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectItemsFn,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
  type OgeVirtualScrollOptions,
  ogeIsRtl,
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
  sheetFocusAttr,
  useAdaptivePopup,
  type OgeAdaptiveProps,
} from './adaptive';
import { useOgeInputsConfig } from './inputs-config';
import { panelCloseReason } from './select-box';
import { fillShortList, useRemoteList } from './use-remote-list';

/** Context of a column's `renderCell`. */
export interface OgeComboBoxCellContext {
  /** The raw cell value (`column.field` read with dot-notation). */
  value: unknown;
  /** The formatted cell text. */
  text: string;
  /** Index of the row within the visible (filtered / loaded) list. */
  rowIndex: number;
}

/**
 * One popup column: `field`, `caption`, `width`, `format`, `searchable`,
 * `alignment`, `cssClass` (shared with the Angular layer) plus an optional
 * `renderCell`.
 */
export interface OgeComboBoxColumn<TItem> extends OgeComboBoxColumnBase<TItem> {
  /** Custom cell content (badges, avatars); the cell keeps its grid semantics. */
  readonly renderCell?: (
    item: TItem,
    context: OgeComboBoxCellContext,
  ) => ReactNode;
}

/** One row or many. `multiple` makes `value` an array and renders chips. */
export type OgeMultiColumnComboBoxSelectionMode = 'single' | 'multiple';

/** Payload of `onSelectionChange` — the selection after a commit and its delta. */
export interface OgeMultiColumnComboBoxSelectionChangedEvent<TItem> {
  selectedItems: readonly TItem[];
  addedItems: readonly TItem[];
  removedItems: readonly TItem[];
}

/** Payload of `onRowClick` — a row was activated by click or keyboard. */
export interface OgeMultiColumnComboBoxRowClickEvent<TItem> {
  item: TItem;
  index: number;
  event: Event;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeMultiColumnComboBoxHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  open(): void;
  /** Closes unless `onClosing` vetoes it; returns whether it closed. */
  close(): boolean;
  toggle(): void;
  /** Re-requests the current search from `dataSource`, dropping every cached page. */
  reload(): void;
}

export interface OgeMultiColumnComboBoxProps<TItem = unknown>
  extends OgeAdaptiveProps, OgeControlProps<unknown>, OgeFieldExtrasProps {
  /** The rows: an array, or a function invoked lazily on first open. */
  items?: readonly TItem[] | OgeSelectItemsFn<TItem>;
  /** The popup columns, left to right. */
  columns?: readonly OgeComboBoxColumn<TItem>[];
  /** Row → field text; omitted, the first column's formatted cell text. */
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  /** Row → committed value; omitted, the whole row is the value. */
  valueExpr?: OgeSelectValueExpr<TItem>;
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** One row (`'single'`) or many (`'multiple'`, chips + array value). */
  selectionMode?: OgeMultiColumnComboBoxSelectionMode;
  /** Typing filters the rows (default `true`). */
  searchEnabled?: boolean;
  searchMode?: OgeSelectSearchMode;
  /** Which text the search matches; omitted, every searchable column's cell text. */
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /** Debounce before typed text filters; provider default (250ms) otherwise. */
  searchTimeout?: number;
  minSearchLength?: number;
  showDataBeforeSearch?: boolean;
  /** Renders the column header row (default `true`). */
  showHeader?: boolean;
  showDropDownButton?: boolean;
  showClearButton?: boolean;
  openOnFieldClick?: boolean;
  /** Shows a loading row instead of the rows. */
  loading?: boolean;
  /** In `multiple` mode, caps the rendered chips; the rest fold into `+N more`. */
  maxDisplayedTags?: number;
  dropdownPlacement?: OgePopupPlacement;
  /** Popup width: fixed pixels or `'anchor'` to match the field. */
  dropdownWidth?: number | 'anchor';
  dropdownMaxHeight?: number;
  /** Windowed row rendering for large lists. */
  virtualScroll?: boolean | OgeVirtualScrollOptions;
  /** Remote, paged rows — see `OgeSelectBox`'s `dataSource`. */
  dataSource?: OgeListDataSource<TItem>;
  pageSize?: number;
  onPageLoaded?: (event: OgeListPageLoadedEvent<TItem>) => void;
  /** Popup visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** Fires on every commit with the selection and its delta. */
  onSelectionChange?: (
    event: OgeMultiColumnComboBoxSelectionChangedEvent<TItem>,
  ) => void;
  /** A row was activated by click or keyboard. */
  onRowClick?: (event: OgeMultiColumnComboBoxRowClickEvent<TItem>) => void;
  onDropDownOpened?: () => void;
  onDropDownClosed?: () => void;
  /** Cancelable pre-open event. */
  onOpening?: (event: OgeDropDownOpeningEvent) => void;
  /** Cancelable pre-close event (with its `reason`). */
  onClosing?: (event: OgeDropDownClosingEvent) => void;
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

const DEFAULT_LIST_MAX_HEIGHT = 320;

/**
 * Combo box whose popup is a small data grid — the React render of the
 * Angular `<oge-multi-column-combo-box>`: columns with captions, widths,
 * formats and cell renderers, a sticky header, keyboard row **and** cell
 * navigation (the WAI-ARIA APG combobox-with-grid-popup pattern, DOM focus
 * stays in the input), search across the chosen columns, virtual scrolling,
 * remote paged data, single or multiple (chips) selection and the adaptive
 * bottom sheet — over the same `@oge-ui/behavior` list, remote and column
 * machines.
 *
 * ```tsx
 * <OgeMultiColumnComboBox
 *   label="Product"
 *   items={products}
 *   columns={[{ field: 'sku', width: 90 }, { field: 'name' }]}
 *   valueExpr="id"
 *   value={productId}
 *   onValueChange={setProductId}
 * />
 * ```
 */
export const OgeMultiColumnComboBox = forwardRef(
  function OgeMultiColumnComboBoxRender<TItem>(
    props: OgeMultiColumnComboBoxProps<TItem>,
    ref: React.ForwardedRef<OgeMultiColumnComboBoxHandle>,
  ) {
    const {
      items = [],
      columns = [],
      selectionMode = 'single',
      searchEnabled = true,
      showHeader = true,
      showDropDownButton = true,
      showClearButton = false,
      openOnFieldClick = true,
      loading = false,
      maxDisplayedTags,
      dropdownMaxHeight,
      virtualScroll = false,
      showSuccessIcon = false,
      selectOnFocus = false,
      inputAttr,
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
    const multiple = selectionMode === 'multiple';

    const config = useOgeInputsConfig();
    const overlayConfig = useOgeOverlayConfig();
    const hostRef = useRef<HTMLSpanElement>(null);
    const nativeRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const listElRef = useRef<HTMLDivElement>(null);

    const field = useOgeField<unknown>({
      props,
      emptyValue: multiple ? [] : null,
      isEmpty: (value) =>
        value == null || (Array.isArray(value) && value.length === 0),
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
      if (latest.current.props.opened === undefined) {
        setUncontrolledOpened(next);
      }
      latest.current.props.onOpenedChange?.(next);
    };

    const adaptive = useAdaptivePopup(props, 'sheet');
    const size = props.size ?? 'md';
    const headerHeight = showHeader ? OGE_SELECT_OPTION_HEIGHT[size] : 0;

    // the sticky header sits in the same scroller, so the rows' viewport is
    // the list height minus one header row — the window arithmetic and
    // scrollToIndex stay exact
    const virtual = useListVirtualizer({
      virtualScroll,
      size,
      dropdownMaxHeight:
        (adaptive.active
          ? adaptiveListViewportHeight()
          : (dropdownMaxHeight ?? DEFAULT_LIST_MAX_HEIGHT)) - headerHeight,
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

    const cellText = (column: OgeComboBoxColumn<TItem>, item: TItem) =>
      ogeComboCellText(column, item, config.locale);

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
          displayExpr: () => {
            const explicit = latest.current.props.displayExpr;
            if (explicit !== undefined) return explicit;
            const first = latest.current.props.columns?.[0];
            return first
              ? (item: TItem) => ogeComboCellText(first, item, config.locale)
              : undefined;
          },
          valueExpr: () => latest.current.props.valueExpr,
          disabledExpr: () => latest.current.props.disabledExpr,
          imageExpr: () => undefined,
          searchExpr: () => latest.current.props.searchExpr,
          searchTexts: (item) =>
            ogeComboSearchStrings(
              latest.current.props.columns ?? [],
              item,
              config.locale,
            ),
          searchEnabled: () => latest.current.props.searchEnabled ?? true,
          searchMode: () => latest.current.props.searchMode ?? 'contains',
          searchDebounceMs: () =>
            latest.current.props.searchTimeout ?? config.searchTimeoutMs,
          minSearchLength: () => latest.current.props.minSearchLength ?? 0,
          showDataBeforeSearch: () =>
            latest.current.props.showDataBeforeSearch ?? false,
          scrollActiveIntoView: (index) => {
            if (virtualRef.current.active) {
              virtualRef.current.scrollToIndex(index);
              return;
            }
            const id = `${latest.current.field.ids.inputId}-row-${index}`;
            requestAnimationFrame(() =>
              document
                .getElementById(id)
                ?.scrollIntoView?.({ block: 'nearest' }),
            );
          },
        },
        createBumpAdapter(bump),
      );
    }
    const list = listRef.current;
    useEffect(() => () => list.destroy(), [list]);

    const armedItemsRef = useRef(items);
    useEffect(() => {
      if (armedItemsRef.current === items) return;
      armedItemsRef.current = items;
      list.syncItemsSource();
      if (openedRef.current) list.ensureItemsLoaded();
    });

    // --- selection -----------------------------------------------------------

    const valueList: readonly unknown[] = multiple
      ? Array.isArray(field.value)
        ? field.value
        : []
      : field.value == null
        ? []
        : [field.value];

    const isSelected = (item: TItem): boolean => {
      const entry = list.itemValue(item);
      return valueList.some((candidate) => Object.is(candidate, entry));
    };

    const pool = list.resolvedItems();
    const selectedItems: readonly TItem[] = valueList
      .map(
        (entry) =>
          pool.find((item) => Object.is(list.itemValue(item), entry)) ??
          (remote.active ? remote.core.lookup(entry) : undefined),
      )
      .filter((item): item is TItem => item !== undefined);
    const selectedItemsRef = useRef(selectedItems);
    selectedItemsRef.current = selectedItems;

    const overflow = ogeChipOverflow(selectedItems.length, maxDisplayedTags);

    // --- panel ---------------------------------------------------------------

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

    const [activeColumn, setActiveColumn] = useState(0);
    const [gridNavigating, setGridNavigating] = useState(false);

    const initActiveFromSelection = (): void =>
      list.activateItemOrFirst(selectedItemsRef.current[0] ?? null);

    const announcedOpen = useRef(false);
    useEffect(() => {
      const machine = panelRef.current;
      if (opened) {
        if (!machine.isOpen) machine.open();
        if (announcedOpen.current) return;
        announcedOpen.current = true;
        list.ensureItemsLoaded();
        remoteRef.current.core.open();
        if (list.activeIndex() < 0) initActiveFromSelection();
        latest.current.props.onDropDownOpened?.();
      } else {
        if (machine.isOpen) machine.close('api');
        if (!announcedOpen.current) return;
        announcedOpen.current = false;
        list.activeIndex.set(-1);
        setGridNavigating(false);
        list.resetSearch();
        remoteRef.current.core.setSearch(null, true);
        virtualRef.current.reset();
        latest.current.props.onDropDownClosed?.();
      }
    }, [opened, panel.isOpen]);

    // filtering re-anchors the active row; appended pages keep it
    const previousCount = useRef(0);
    useEffect(() => {
      const count = list.visibleItems().length;
      const appended =
        remote.active &&
        count > previousCount.current &&
        list.activeIndex() >= 0;
      previousCount.current = count;
      if (!openedRef.current || appended) return;
      if (list.activeIndex() >= count) list.setActive(list.edgeEnabledIndex(1));
    });
    useEffect(() => {
      if (activeColumn >= columns.length && activeColumn !== 0) {
        setActiveColumn(0);
      }
    }, [activeColumn, columns.length]);

    useEffect(() => {
      if (!remote.active) return;
      for (const value of valueList) remote.core.resolve(value);
    });
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
      if (list.activeIndex() < 0) initActiveFromSelection();
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

    const pick = (item: TItem, event: Event): void => {
      if (remote.active) remote.core.remember(item);
      const entry = list.itemValue(item);
      const before = selectedItemsRef.current;
      if (multiple) {
        const exists = valueList.some((candidate) =>
          Object.is(candidate, entry),
        );
        const next = exists
          ? valueList.filter((candidate) => !Object.is(candidate, entry))
          : [...valueList, entry];
        field.commit.commitNow(next, event);
        latest.current.props.onSelectionChange?.({
          selectedItems: exists
            ? before.filter((candidate) => candidate !== item)
            : [...before, item],
          addedItems: exists ? [] : [item],
          removedItems: exists ? [item] : [],
        });
        list.resetSearch();
        remote.core.setSearch(null, true);
        if (!adaptive.active) nativeRef.current?.focus();
        return;
      }
      const previous = before[0];
      field.commit.commitNow(entry, event);
      if (previous !== item) {
        latest.current.props.onSelectionChange?.({
          selectedItems: [item],
          addedItems: [item],
          removedItems: previous === undefined ? [] : [previous],
        });
      }
      list.resetSearch();
      close('select');
      nativeRef.current?.focus();
    };

    const onRowClick = (item: TItem, index: number, event: Event): void => {
      if (list.isItemDisabled(item)) return;
      latest.current.props.onRowClick?.({ item, index, event });
      pick(item, event);
    };

    const commitActive = (event: Event): void => {
      const visible = list.visibleItems();
      const index = list.activeIndex();
      if (index < 0 || index >= visible.length) {
        if (!multiple) close();
        return;
      }
      onRowClick(visible[index], index, event);
    };

    const removeAt = (valueIndex: number, event: Event): void => {
      if (field.effectiveDisabled || readonly) return;
      const removed = selectedItems[valueIndex];
      const next = valueList.filter((_, index) => index !== valueIndex);
      field.commit.commitNow(next, event);
      if (removed !== undefined) {
        latest.current.props.onSelectionChange?.({
          selectedItems: selectedItems.filter(
            (_, index) => index !== valueIndex,
          ),
          addedItems: [],
          removedItems: [removed],
        });
      }
      nativeRef.current?.focus();
    };

    const onSearchInput = (event: ChangeEvent<HTMLInputElement>): void => {
      if (!searchEnabled) return;
      const text = event.target.value;
      setGridNavigating(false);
      list.setSearch(text);
      remote.core.setSearch(text);
      props.onInputChange?.({ text, event: event.nativeEvent });
      props.onSearchChange?.({ text });
      if (!openedRef.current) open();
    };

    const onKeyDown = (event: ReactKeyboardEvent): void => {
      if (field.effectiveDisabled || readonly) return;
      const isOpen = openedRef.current;
      const rtl = hostRef.current !== null && ogeIsRtl(hostRef.current);
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          if (!isOpen) {
            open();
            return;
          }
          if (event.altKey && event.key === 'ArrowUp') {
            commitActive(event.nativeEvent);
            return;
          }
          setGridNavigating(true);
          list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
          return;
        }
        case 'PageDown':
        case 'PageUp': {
          if (!isOpen) return;
          event.preventDefault();
          setGridNavigating(true);
          list.moveActive(event.key === 'PageDown' ? 10 : -10);
          return;
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Home':
        case 'End': {
          // APG grid popup: once the keyboard is in the grid, these move
          // between cells; before that they belong to the text caret
          const inGrid =
            isOpen &&
            list.activeIndex() >= 0 &&
            (gridNavigating || !searchEnabled);
          if (!inGrid) return;
          event.preventDefault();
          if ((event.key === 'Home' || event.key === 'End') && event.ctrlKey) {
            list.setActive(
              list.edgeEnabledIndex(event.key === 'Home' ? 1 : -1),
            );
            return;
          }
          setActiveColumn(
            ogeComboColumnTarget(activeColumn, event.key, columns.length, rtl),
          );
          return;
        }
        case 'Enter': {
          if (isOpen) {
            event.preventDefault();
            commitActive(event.nativeEvent);
            return;
          }
          field.handleEnterKey(event);
          return;
        }
        case ' ': {
          if (!isOpen) {
            if (searchEnabled) return;
            event.preventDefault();
            open();
            return;
          }
          if (searchEnabled && !gridNavigating) return;
          event.preventDefault();
          commitActive(event.nativeEvent);
          return;
        }
        case 'Backspace': {
          if (
            multiple &&
            (list.searchText() ?? '') === '' &&
            valueList.length > 0
          ) {
            event.preventDefault();
            removeAt(valueList.length - 1, event.nativeEvent);
          }
          return;
        }
        case 'Escape': {
          if (isOpen) {
            event.preventDefault();
            event.stopPropagation();
            close('escape');
            return;
          }
          if (list.searchText()) {
            event.preventDefault();
            list.resetSearch();
            remote.core.setSearch(null, true);
          }
          return;
        }
        case 'Tab': {
          if (isOpen && !adaptive.active) close('tab');
          return;
        }
      }
    };

    useImperativeHandle(ref, () => ({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      clear: () => field.clear(),
      open,
      close: () => close(),
      toggle,
      reload: () => remote.core.reload(),
    }));

    // --- render --------------------------------------------------------------

    const inputId = field.ids.inputId;
    const gridId = `${inputId}-grid`;
    const rowId = (index: number) => `${inputId}-row-${index}`;
    const cellId = (index: number, column: number) =>
      `${inputId}-cell-${index}-${column}`;
    const activeIndex = list.activeIndex();
    const activeDescendant =
      opened && activeIndex >= 0
        ? cellId(activeIndex, activeColumn)
        : undefined;
    const visibleItems = list.visibleItems();
    const itemsStatus = list.itemsStatus();
    const busy =
      loading ||
      itemsStatus === 'loading' ||
      remote.core.status() === 'loading';
    const headerRows = showHeader ? 1 : 0;
    const rowCount = !remote.active
      ? visibleItems.length + headerRows
      : remote.core.totalCount() !== undefined
        ? (remote.core.totalCount() as number) + headerRows
        : remote.core.hasMore()
          ? -1
          : visibleItems.length + headerRows;
    const searchText = list.searchText();
    const inputText =
      searchText !== null
        ? searchText
        : multiple
          ? ''
          : selectedItems[0] !== undefined
            ? list.displayOf(selectedItems[0])
            : '';

    const floatUp = field.focused || !field.isEmpty || opened;
    const placeholderText =
      labelMode === 'floating' && label && !floatUp ? '' : placeholder;
    const virtualWindow = virtual.window();
    const windowedItems = virtual.active
      ? visibleItems
          .slice(virtualWindow.start, virtualWindow.end)
          .map((item, offset) => ({
            item,
            index: virtualWindow.start + offset,
          }))
      : visibleItems.map((item, index) => ({ item, index }));

    const alignClass = (column: OgeComboBoxColumn<TItem>) =>
      column.alignment === 'center'
        ? 'oge-mccb-align-center'
        : column.alignment === 'end'
          ? 'oge-mccb-align-end'
          : undefined;

    const statusRow = (text: string, more = false) => (
      <div className="oge-mccb-row oge-mccb-status-row" role="row">
        <div
          className={['oge-select-status', more && 'oge-select-loading-more']
            .filter(Boolean)
            .join(' ')}
          role="gridcell"
          aria-colspan={columns.length || undefined}
        >
          {text}
        </div>
      </div>
    );

    const dataRow = (item: TItem, index: number) => (
      <div
        key={index}
        id={rowId(index)}
        className={[
          'oge-mccb-row',
          'oge-select-option',
          index === activeIndex && 'oge-select-option-active',
          isSelected(item) && 'oge-select-option-selected',
          list.isItemDisabled(item) && 'oge-disabled',
        ]
          .filter(Boolean)
          .join(' ')}
        role="row"
        aria-selected={isSelected(item)}
        aria-disabled={list.isItemDisabled(item) ? true : undefined}
        aria-rowindex={index + headerRows + 1}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (!list.isItemDisabled(item)) list.activeIndex.set(index);
        }}
        onClick={(event) => onRowClick(item, index, event.nativeEvent)}
      >
        {columns.map((column, col) => (
          <div
            key={col}
            id={cellId(index, col)}
            className={[
              'oge-mccb-cell',
              column.cssClass,
              alignClass(column),
              gridNavigating &&
                index === activeIndex &&
                col === activeColumn &&
                'oge-mccb-cell-active',
            ]
              .filter(Boolean)
              .join(' ')}
            role="gridcell"
            aria-colindex={col + 1}
          >
            {column.renderCell ? (
              column.renderCell(item, {
                value: ogeComboCellValue(column, item),
                text: cellText(column, item),
                rowIndex: index,
              })
            ) : (
              <span className="oge-mccb-cell-text">
                {cellText(column, item)}
              </span>
            )}
          </div>
        ))}
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
      'oge-select-box',
      'oge-multi-column-combo-box',
      multiple && 'oge-multi-column-combo-box-multiple',
      opened && 'oge-select-box-open',
      field.effectiveDisabled && 'oge-disabled',
      field.focused && 'oge-input-focused',
      field.showError && 'oge-input-invalid',
      readonly && 'oge-input-readonly',
      field.isEmpty && 'oge-input-empty',
      fluid && 'oge-input-fluid',
      floatUp && 'oge-input-float-up',
      size === 'sm' && 'oge-input-sm',
      size === 'lg' && 'oge-input-lg',
      stylingMode === 'filled' && 'oge-input-filled',
      stylingMode === 'underlined' && 'oge-input-underlined',
      labelMode === 'floating' && 'oge-input-label-floating',
      labelMode === 'outside' && 'oge-input-label-outside',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const fieldInput = (
      <input
        {...extraAttrs}
        ref={nativeRef}
        className={[
          'oge-input-native',
          multiple && 'oge-tag-input',
          !searchEnabled && 'oge-select-plain',
        ]
          .filter(Boolean)
          .join(' ')}
        type="text"
        role="combobox"
        aria-haspopup="grid"
        autoComplete="off"
        id={inputId}
        value={inputText}
        placeholder={multiple && !field.isEmpty ? '' : placeholderText}
        disabled={field.effectiveDisabled}
        readOnly={readonly || !searchEnabled}
        name={props.name || undefined}
        title={props.tooltip}
        tabIndex={props.tabIndex ?? 0}
        autoFocus={props.autofocus}
        aria-expanded={opened}
        aria-controls={opened ? gridId : undefined}
        aria-autocomplete={searchEnabled ? 'list' : 'none'}
        aria-activedescendant={activeDescendant}
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
          if (!openedRef.current) {
            if (openOnFieldClick) open();
            return;
          }
          if (!searchEnabled) close();
        }}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          if (selectOnFocus) nativeRef.current?.select();
          field.handleFocus(event);
        }}
        onBlur={(event) => {
          if (openedRef.current && adaptive.active) return;
          list.resetSearch();
          remote.core.setSearch(null, true);
          if (openedRef.current) close('blur');
          field.handleBlur(event);
        }}
      />
    );

    const fixedWidth = ogeComboFixedWidth(columns);
    const gridStyle = {
      maxHeight: adaptive.active ? undefined : dropdownMaxHeight,
      '--oge-mccb-columns': ogeComboGridTemplate(columns),
      ...(fixedWidth !== undefined
        ? { '--oge-mccb-min-width': `${fixedWidth}px` }
        : {}),
    } as CSSProperties;

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
          {multiple ? (
            <div className="oge-tag-strip">
              {selectedItems
                .slice(0, overflow.shown)
                .map((item, valueIndex) => (
                  <span key={valueIndex} className="oge-tag">
                    <span className="oge-tag-text">{list.displayOf(item)}</span>
                    <button
                      type="button"
                      className="oge-tag-remove"
                      tabIndex={-1}
                      aria-label={field.msg.removeTagButton}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) =>
                        removeAt(valueIndex, event.nativeEvent)
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
              {overflow.hidden > 0 && (
                <span className="oge-tag oge-tag-more">
                  {formatPattern(field.msg.moreTags, {
                    count: String(overflow.hidden),
                  })}
                </span>
              )}
              {fieldInput}
            </div>
          ) : (
            fieldInput
          )}
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
                <div className="oge-popup-sheet-search">
                  <input
                    className="oge-sheet-search-input"
                    type="search"
                    role="combobox"
                    aria-haspopup="grid"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    autoComplete="off"
                    {...sheetFocusAttr}
                    aria-controls={gridId}
                    aria-activedescendant={activeDescendant}
                    aria-label={field.msg.adaptiveSearch}
                    placeholder={field.msg.adaptiveSearch}
                    value={searchText ?? ''}
                    onChange={onSearchInput}
                    onKeyDown={onKeyDown}
                  />
                </div>
              ) : undefined
            }
            sheetFooter={
              adaptive.active && multiple ? (
                <SheetDone
                  label={field.msg.adaptiveDone}
                  onClick={() => close()}
                />
              ) : undefined
            }
          >
            <div
              ref={listElRef}
              {...(adaptive.active && !searchEnabled
                ? {
                    ...sheetFocusAttr,
                    tabIndex: 0,
                    'aria-activedescendant': activeDescendant,
                    onKeyDown: (event: ReactKeyboardEvent) => {
                      if (event.target === event.currentTarget) {
                        onKeyDown(event);
                      }
                    },
                  }
                : {})}
              className={[
                'oge-mccb-grid',
                virtual.active && 'oge-mccb-grid-virtual',
              ]
                .filter(Boolean)
                .join(' ')}
              role="grid"
              id={gridId}
              aria-multiselectable={multiple || undefined}
              aria-rowcount={rowCount}
              aria-colcount={columns.length}
              aria-busy={busy || undefined}
              aria-labelledby={
                labelMode !== 'hidden' && label ? field.ids.labelId : undefined
              }
              aria-label={labelMode === 'hidden' && label ? label : undefined}
              style={gridStyle}
              onScroll={(event) => {
                virtual.onScroll(event);
                if (!virtual.active) remote.onScroll(event.currentTarget);
              }}
            >
              {showHeader && (
                <div
                  className="oge-mccb-row oge-mccb-header"
                  role="row"
                  aria-rowindex={1}
                >
                  {columns.map((column, col) => (
                    <div
                      key={col}
                      className={[
                        'oge-mccb-cell',
                        'oge-mccb-header-cell',
                        column.cssClass,
                        alignClass(column),
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="columnheader"
                      aria-colindex={col + 1}
                    >
                      {ogeComboColumnCaption(column)}
                    </div>
                  ))}
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
                  role="presentation"
                  style={{ height: virtualWindow.totalHeight }}
                >
                  <div
                    className="oge-select-window"
                    role="presentation"
                    style={{
                      transform: `translateY(${virtualWindow.offsetY}px)`,
                    }}
                  >
                    {windowedItems.map((row) => dataRow(row.item, row.index))}
                  </div>
                </div>
              ) : (
                windowedItems.map((row) => dataRow(row.item, row.index))
              )}
              {remote.core.loadingMore() &&
                statusRow(field.msg.dropDownLoading, true)}
            </div>
          </OgePopup>
        )}
      </span>
    );
  },
) as <TItem = unknown>(
  props: OgeMultiColumnComboBoxProps<TItem> & {
    ref?: React.ForwardedRef<OgeMultiColumnComboBoxHandle>;
  },
) => ReactNode;
