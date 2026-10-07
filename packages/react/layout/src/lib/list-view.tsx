'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createTypeAheadBuffer, ogeFormatMessage } from '@oge-ui/core';
import {
  OGE_LIST_VIEW_FALLBACK_HEIGHT,
  beginPointerGesture,
  getOgeLiveAnnouncer,
  ogeIsRtl,
  ogeListViewActionFromTarget,
  ogeListViewActionShortcuts,
  ogeListViewActionsText,
  ogeListViewBuildRows,
  ogeListViewClick,
  ogeListViewExprValue,
  ogeListViewFilter,
  ogeListViewIndexFromTarget,
  ogeListViewInitialActive,
  ogeListViewItemId,
  ogeListViewKeyDown,
  ogeListViewOffsetTree,
  ogeListViewRole,
  ogeListViewSameKeys,
  ogeListViewScrollTarget,
  ogeListViewSelectionDiff,
  ogeListViewShouldLoadMore,
  ogeListViewSwipeAxis,
  ogeListViewSwipeOpens,
  ogeListViewSwipeReveal,
  ogeListViewSwipeTranslate,
  ogeListViewTextOf,
  ogeListViewVirtualSettings,
  ogeListViewWindow,
  ogeListViewWindowHasIndex,
  type OgeListViewActiveItemChangedEvent,
  type OgeListViewExpr,
  type OgeListViewItemAction,
  type OgeListViewItemActionClickEvent,
  type OgeListViewItemClickEvent,
  type OgeListViewItemRow,
  type OgeListViewKey,
  type OgeListViewLoadMoreEvent,
  type OgeListViewNavResult,
  type OgeListViewNavState,
  type OgeListViewPageLoadMode,
  type OgeListViewSearchExpr,
  type OgeListViewSearchMode,
  type OgeListViewSelectionChangedEvent,
  type OgeListViewSelectionMode,
  type OgeListViewVirtualScrollOptions,
  type OgePointerGestureHandle,
} from '@oge-ui/behavior';
import { useOgeListViewConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Context of `renderItem` — the Angular `[ogeListViewItemTemplate]` context. */
export interface OgeListViewItemRenderContext<T> {
  item: T;
  index: number;
  key: OgeListViewKey;
  selected: boolean;
  active: boolean;
  disabled: boolean;
  group: string | null;
}

/** Context of `renderGroup` — the Angular `[ogeListViewGroupTemplate]` context. */
export interface OgeListViewGroupRenderContext {
  group: string;
  count: number;
}

/** Context of `renderEmpty` — the Angular `[ogeListViewEmptyTemplate]` context. */
export interface OgeListViewEmptyRenderContext {
  searching: boolean;
  searchValue: string;
}

/** Context of `renderFooter` — the Angular `[ogeListViewFooterTemplate]` context. */
export interface OgeListViewFooterRenderContext {
  loadMore: () => void;
  loading: boolean;
  hasMore: boolean;
  itemCount: number;
}

export interface OgeListViewProps<T> {
  /** The items, in order. */
  items?: readonly T[];
  /** Field (or function) giving each item's key; default `'id'`. */
  keyExpr?: OgeListViewExpr<T>;
  /** Field (or function) giving the text of the default render, search and type-ahead. */
  displayExpr?: OgeListViewExpr<T>;
  /** Field (or function) marking an item disabled (truthy = disabled). */
  disabledExpr?: OgeListViewExpr<T>;
  /** Field (or function) grouping the items under sticky headers. */
  groupExpr?: OgeListViewExpr<T>;
  /** `none` (a list), `single` or `multiple` (a listbox); falls back to the config. */
  selectionMode?: OgeListViewSelectionMode;
  /** Keys of the selected items (controlled). */
  selectedKeys?: readonly OgeListViewKey[];
  /** Initial selection when uncontrolled. */
  defaultSelectedKeys?: readonly OgeListViewKey[];
  /** The committed selection — the controlled half of `selectedKeys`. */
  onSelectedKeysChange?: (keys: OgeListViewKey[]) => void;
  /** Draws a check (multiple) or radio (single) glyph in every item; falls back to the config. */
  showSelectionControls?: boolean;
  /** Disables the whole list: nothing selects, the search field is disabled. */
  disabled?: boolean;
  /** Height of the scroll viewport (`number` = px, or any CSS length). */
  height?: number | string;
  /** Windowed rendering with fixed row heights — `true`, or `{ itemHeight, groupHeaderHeight, overscan }`. */
  virtualScroll?: boolean | OgeListViewVirtualScrollOptions;
  /** Renders a search field above the list. */
  searchEnabled?: boolean;
  /** Field(s) the search matches; default the display text. */
  searchExpr?: OgeListViewSearchExpr<T>;
  /** `contains` (default) or `startsWith`; falls back to the config. */
  searchMode?: OgeListViewSearchMode;
  /** The search text (controlled). */
  searchValue?: string;
  /** Initial search text when uncontrolled. */
  defaultSearchValue?: string;
  /** The typed search text — the controlled half of `searchValue`. */
  onSearchValueChange?: (value: string) => void;
  /** `none`, `button` or `scroll` (infinite); falls back to the config. */
  pageLoadMode?: OgeListViewPageLoadMode;
  /** Whether more items can be requested (`onLoadMoreRequested`). */
  hasMore?: boolean;
  /** Shows the loading row and sets `aria-busy`. */
  loading?: boolean;
  /** Actions revealed by a swipe (touch) or on hover / focus, with keyboard shortcuts. */
  itemActions?: readonly OgeListViewItemAction[];
  /** Accessible name; falls back to the `listLabel` message. */
  ariaLabel?: string;
  /** BCP 47 locale of the announced counts; falls back to the config, then the runtime. */
  locale?: string;
  /** Replaces each item's content — the Angular `[ogeListViewItemTemplate]`. */
  renderItem?: (context: OgeListViewItemRenderContext<T>) => ReactNode;
  /** Replaces each sticky group header's text — the Angular `[ogeListViewGroupTemplate]`. */
  renderGroup?: (context: OgeListViewGroupRenderContext) => ReactNode;
  /** Replaces the empty state — the Angular `[ogeListViewEmptyTemplate]`. */
  renderEmpty?: (context: OgeListViewEmptyRenderContext) => ReactNode;
  /** Content under the list (replaces the load-more button) — the Angular `[ogeListViewFooterTemplate]`. */
  renderFooter?: (context: OgeListViewFooterRenderContext) => ReactNode;
  /** The selection changed through a click, a key, a range or Ctrl+A. */
  onSelectionChanged?: (event: OgeListViewSelectionChangedEvent<T>) => void;
  /** An item was clicked or activated with Enter. */
  onItemClick?: (event: OgeListViewItemClickEvent<T>) => void;
  /** An item action ran — tap, click or its keyboard shortcut. */
  onItemActionClick?: (event: OgeListViewItemActionClickEvent<T>) => void;
  /** The list asks for more items (button or infinite scroll). */
  onLoadMoreRequested?: (event: OgeListViewLoadMoreEvent) => void;
  /** The active (keyboard) item moved. */
  onActiveItemChanged?: (event: OgeListViewActiveItemChangedEvent<T>) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeListView>`. */
export interface OgeListViewHandle {
  /** Moves focus into the list (the listbox, or the active item of a list). */
  focus(): void;
  /** Scrolls the item with `key` into view (and makes it the active one). */
  scrollToItem(key: OgeListViewKey): void;
  /** Clears the selection. */
  clearSelection(): void;
  /** Selects every enabled item of a multiple-selection list. */
  selectAll(): void;
  /** Empties the search field. */
  clearSearch(): void;
}

const EMPTY: readonly never[] = [];
const NO_KEYS: readonly OgeListViewKey[] = [];
const TRAY_FALLBACK = 120;

interface SwipeState {
  index: number;
  reveal: number;
  tray: number;
}

const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';

/**
 * A templated, virtualizable list — the React render of the Angular
 * `<oge-list-view>`, same markup and the same decisions: a selectable list is
 * an APG **listbox** whose viewport tracks the active option with
 * `aria-activedescendant` (so a virtualized list keeps focus while rows come
 * and go), `selectionMode="none"` a `role="list"` with a roving tab stop.
 * Groups are labelled segments with an `aria-hidden` sticky header; item
 * actions are revealed by a swipe on touch and on hover / focus, with their
 * `shortcut` as the keyboard twin.
 *
 * ```tsx
 * <OgeListView
 *   items={people}
 *   displayExpr="name"
 *   selectionMode="multiple"
 *   selectedKeys={picked}
 *   onSelectedKeysChange={setPicked}
 *   groupExpr="team"
 *   searchEnabled
 *   height={360}
 *   ariaLabel="People"
 * />
 * ```
 */
export const OgeListView = forwardRef(function OgeListViewRender<T>(
  props: OgeListViewProps<T>,
  ref: ForwardedRef<OgeListViewHandle>,
) {
  const config = useOgeListViewConfig();
  const msg = config.messages;
  const items = (props.items ?? EMPTY) as readonly T[];
  const keyExpr = props.keyExpr ?? 'id';
  const mode: OgeListViewSelectionMode =
    props.selectionMode ?? config.selectionMode ?? 'none';
  const role = ogeListViewRole(mode);
  const disabled = props.disabled ?? false;
  const actions = props.itemActions ?? EMPTY;
  const pageLoadMode: OgeListViewPageLoadMode =
    props.pageLoadMode ?? config.pageLoadMode ?? 'none';
  const showControls =
    mode !== 'none' &&
    (props.showSelectionControls ?? config.showSelectionControls ?? false);
  const locale = props.locale ?? config.locale;
  const uid = `oge-list-view-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const descId = `${uid}-actions`;

  const [uncontrolledKeys, setUncontrolledKeys] = useState<
    readonly OgeListViewKey[]
  >(props.defaultSelectedKeys ?? NO_KEYS);
  const selectedKeys = props.selectedKeys ?? uncontrolledKeys;
  const [uncontrolledSearch, setUncontrolledSearch] = useState(
    props.defaultSearchValue ?? '',
  );
  const searchValue = props.searchValue ?? uncontrolledSearch;

  const [active, setActiveState] = useState(-1);
  const [anchor, setAnchor] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const [measured, setMeasured] = useState(0);
  const [swipe, setSwipe] = useState<SwipeState | null>(null);
  const [openSwipe, setOpenSwipe] = useState<SwipeState | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const typeAhead = useMemo(() => createTypeAheadBuffer(), []);
  const requestedAt = useRef(-1);
  const pendingLoadFrom = useRef<number | null>(null);
  const pendingFocus = useRef<OgeListViewKey | null>(null);
  /** Focus moved to the viewport because the focused row scrolled away. */
  const parked = useRef(false);
  const parking = useRef(false);
  const pendingReveal = useRef<OgeListViewKey | null>(null);
  const gesture = useRef<OgePointerGestureHandle | null>(null);

  const filtered = useMemo(
    () =>
      props.searchEnabled
        ? ogeListViewFilter(items, searchValue, {
            searchExpr: props.searchExpr,
            displayExpr: props.displayExpr,
            mode: props.searchMode ?? config.searchMode ?? 'contains',
          })
        : items,
    [
      items,
      searchValue,
      props.searchEnabled,
      props.searchExpr,
      props.displayExpr,
      props.searchMode,
      config.searchMode,
    ],
  );
  const model = useMemo(
    () =>
      ogeListViewBuildRows(filtered, {
        keyExpr,
        groupExpr: props.groupExpr,
      }),
    [filtered, keyExpr, props.groupExpr],
  );
  const keys = useMemo(() => model.items.map((r) => r.key), [model]);
  const textOf = (item: T) => ogeListViewTextOf(item, props.displayExpr);
  const texts = useMemo(
    () => model.items.map((r) => ogeListViewTextOf(r.item, props.displayExpr)),
    [model, props.displayExpr],
  );
  const disabledFlags = useMemo(
    () =>
      model.items.map(
        (r) =>
          disabled ||
          (props.disabledExpr !== undefined &&
            !!ogeListViewExprValue(r.item, props.disabledExpr)),
      ),
    [model, disabled, props.disabledExpr],
  );
  const isDisabled = (i: number) => !!disabledFlags[i];
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const settings = useMemo(
    () => ogeListViewVirtualSettings(props.virtualScroll),
    // options objects written inline must not rebuild the tree per render
    [JSON.stringify(props.virtualScroll ?? false)],
  );
  const tree = useMemo(
    () => (settings ? ogeListViewOffsetTree(model.rows, settings) : null),
    [model, settings],
  );
  const height = props.height;
  const viewportHeight =
    measured > 0
      ? measured
      : typeof height === 'number'
        ? height
        : OGE_LIST_VIEW_FALLBACK_HEIGHT;
  const win = useMemo(
    () => ogeListViewWindow(model, tree, settings, scrollTop, viewportHeight),
    [model, tree, settings, scrollTop, viewportHeight],
  );
  const cssHeight =
    typeof height === 'number'
      ? `${height}px`
      : height
        ? height
        : settings
          ? `${OGE_LIST_VIEW_FALLBACK_HEIGHT}px`
          : undefined;

  // derived, never effect-seeded: the first paint already has its tab stop
  const activeIndex = useMemo(
    () =>
      ogeListViewInitialActive(
        keys,
        selectedKeys,
        (i) => !!disabledFlags[i],
        active,
      ),
    [keys, selectedKeys, disabledFlags, active],
  );
  const itemId = (key: OgeListViewKey) => ogeListViewItemId(uid, key);
  const activeKey = keys[activeIndex];
  const shortcuts = ogeListViewActionShortcuts(actions);
  const actionsText = ogeListViewActionsText(actions, msg);
  const isEmpty = model.items.length === 0;
  // The listbox is the tab stop; a plain list's rows are — unless the active
  // row is scrolled out of a virtual window, when the viewport stands in so
  // the list keeps its Tab stop (focus then moves on to the row).
  const viewportTabIndex = disabled
    ? -1
    : role === 'listbox'
      ? 0
      : isEmpty || ogeListViewWindowHasIndex(win, activeIndex)
        ? -1
        : 0;
  const searching = !!searchValue.trim();

  const say = (template: string, count: number) =>
    getOgeLiveAnnouncer().announce(
      ogeFormatMessage(template, { count }, locale),
    );

  // --- effects ----------------------------------------------------------------

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setMeasured(el.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setMeasured(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => gesture.current?.cancel(), []);

  useEffect(() => {
    const from = pendingLoadFrom.current;
    if (from === null || items.length <= from) return;
    pendingLoadFrom.current = null;
    say(msg.loadedCount, items.length - from);
  }, [items.length]);

  useIsomorphicLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const reveal = pendingReveal.current;
    if (reveal !== null) {
      pendingReveal.current = null;
      el.querySelector<HTMLElement>(`#${itemId(reveal)}`)?.scrollIntoView?.({
        block: 'nearest',
      });
    }
    const focus = pendingFocus.current;
    if (focus !== null) {
      pendingFocus.current = null;
      el.querySelector<HTMLElement>(`#${itemId(focus)}`)?.focus({
        preventScroll: true,
      });
    }
    // a parked focus returns to the active row once it is rendered again
    if (parked.current && el.ownerDocument.activeElement === el) {
      const key = keys[activeIndex];
      const row =
        key === undefined
          ? null
          : el.querySelector<HTMLElement>(`#${itemId(key)}`);
      if (row) {
        parked.current = false;
        row.focus({ preventScroll: true });
      }
    }
  });

  useEffect(() => {
    if (pageLoadMode === 'scroll') checkInfinite();
  }, [model, pageLoadMode]);

  // --- actions ------------------------------------------------------------------

  const rtl = () => ogeIsRtl(hostRef.current);

  const setActive = (index: number) => {
    setActiveState(index);
    const row = model.items[index];
    if (row && index !== activeIndex)
      latest.current.onActiveItemChanged?.({
        item: row.item,
        key: row.key,
        index,
      });
  };

  const commitSelection = (
    next: readonly OgeListViewKey[],
    item: T | undefined,
    event: Event | undefined,
  ) => {
    const previous = selectedKeys;
    if (ogeListViewSameKeys(previous, next)) return;
    const diff = ogeListViewSelectionDiff(previous, next);
    if (latest.current.selectedKeys === undefined)
      setUncontrolledKeys([...next]);
    latest.current.onSelectedKeysChange?.([...next]);
    latest.current.onSelectionChanged?.({
      selectedKeys: [...next],
      previousKeys: previous,
      addedKeys: diff.added,
      removedKeys: diff.removed,
      item,
      event,
    });
  };

  const revealIndex = (index: number) => {
    if (index < 0) return;
    const el = viewportRef.current;
    if (!el) return;
    if (tree && settings) {
      const rowIndex = model.itemRowIndex[index];
      if (rowIndex === undefined) return;
      const target = ogeListViewScrollTarget(
        tree.offsetOf(rowIndex),
        settings.itemHeight,
        el.scrollTop,
        viewportHeight,
        model.grouped ? settings.groupHeaderHeight : 0,
      );
      if (target === null) return;
      el.scrollTop = target;
      setScrollTop(target);
      return;
    }
    const key = keys[index];
    if (key !== undefined) pendingReveal.current = key;
  };

  const focusItem = (index: number) => {
    const key = keys[index];
    if (key === undefined) return;
    revealIndex(index);
    pendingFocus.current = key;
    viewportRef.current
      ?.querySelector<HTMLElement>(`#${itemId(key)}`)
      ?.focus({ preventScroll: true });
  };

  const runAction = (
    action: OgeListViewItemAction,
    index: number,
    event: Event | undefined,
  ) => {
    const row = model.items[index];
    if (!row) return;
    latest.current.onItemActionClick?.({
      action,
      item: row.item,
      key: row.key,
      index,
      event,
    });
  };

  const navState = (): OgeListViewNavState => ({
    mode,
    keys,
    texts,
    isDisabled,
    active: activeIndex,
    anchor,
    selected: selectedKeys,
    pageSize: settings
      ? Math.max(1, Math.floor(viewportHeight / settings.itemHeight) - 1)
      : 10,
    actions,
    typeAhead,
  });

  const apply = (result: OgeListViewNavResult, event: Event) => {
    const index = result.active ?? activeIndex;
    const row = model.items[index];
    if (result.anchor !== undefined) setAnchor(result.anchor);
    if (result.active !== undefined) {
      setActive(result.active);
      revealIndex(result.active);
      if (role === 'list') focusItem(result.active);
    }
    if (result.selected) commitSelection(result.selected, row?.item, event);
    if (result.selectAll) say(msg.selectedCount, result.selected?.length ?? 0);
    if (result.activate && row)
      latest.current.onItemClick?.({
        item: row.item,
        key: row.key,
        index,
        event,
      });
    if (result.action && row) runAction(result.action, index, event);
  };

  const applySearch = (value: string) => {
    if (value === searchValue) return;
    if (latest.current.searchValue === undefined) setUncontrolledSearch(value);
    latest.current.onSearchValueChange?.(value);
    setActiveState(-1);
    setAnchor(-1);
    setScrollTop(0);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    if (value.trim()) {
      const count = ogeListViewFilter(items, value, {
        searchExpr: props.searchExpr,
        displayExpr: props.displayExpr,
        mode: props.searchMode ?? config.searchMode ?? 'contains',
      }).length;
      say(msg.resultsCount, count);
    }
  };

  const requestMore = (reason: 'button' | 'scroll') => {
    const count = items.length;
    const p = latest.current;
    if (!p.hasMore || p.loading || p.disabled) return;
    if (reason === 'scroll' && requestedAt.current === count) return;
    requestedAt.current = count;
    pendingLoadFrom.current = count;
    p.onLoadMoreRequested?.({ reason, itemCount: count });
  };

  function checkInfinite() {
    const el = viewportRef.current;
    if (
      el &&
      ogeListViewShouldLoadMore(el.scrollTop, el.clientHeight, el.scrollHeight)
    )
      requestMore('scroll');
  }

  const handle = {
    focus: () => {
      if (role === 'listbox') {
        viewportRef.current?.focus();
        revealIndex(activeIndex);
      } else focusItem(activeIndex);
    },
    scrollToItem: (key: OgeListViewKey) => {
      const index = keys.indexOf(key);
      if (index < 0) return;
      setActiveState(index);
      revealIndex(index);
    },
    clearSelection: () => commitSelection([], undefined, undefined),
    selectAll: () => {
      if (mode !== 'multiple') return;
      const all = keys.filter((_, i) => !disabledFlags[i]);
      commitSelection(all, undefined, undefined);
      say(msg.selectedCount, all.length);
    },
    clearSearch: () => applySearch(''),
  };
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useImperativeHandle(
    ref,
    () => ({
      focus: () => handleRef.current.focus(),
      scrollToItem: (key) => handleRef.current.scrollToItem(key),
      clearSelection: () => handleRef.current.clearSelection(),
      selectAll: () => handleRef.current.selectAll(),
      clearSearch: () => handleRef.current.clearSearch(),
    }),
    [],
  );

  // --- events -------------------------------------------------------------------

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled || isEmpty) return;
    if ((event.target as HTMLElement).closest?.('input, textarea')) return;
    const result = ogeListViewKeyDown(navState(), event);
    if (!result.handled) return;
    event.preventDefault();
    apply(result, event.nativeEvent);
  };

  const onClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const index = ogeListViewIndexFromTarget(event.target, viewportRef.current);
    if (index < 0) return;
    const actionKey = ogeListViewActionFromTarget(event.target);
    if (actionKey !== null) {
      const action = actions.find((a) => a.key === actionKey);
      if (action && !isDisabled(index)) {
        setOpenSwipe(null);
        runAction(action, index, event.nativeEvent);
      }
      return;
    }
    if (openSwipe) {
      setOpenSwipe(null);
      return;
    }
    const result = ogeListViewClick(navState(), index, event);
    if (result.handled) apply(result, event.nativeEvent);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== 'touch' ||
      disabled ||
      !actions.length ||
      ogeListViewActionFromTarget(event.target) !== null
    )
      return;
    const index = ogeListViewIndexFromTarget(event.target, viewportRef.current);
    if (index < 0 || isDisabled(index)) return;
    const row = (event.target as Element).closest<HTMLElement>(
      '[data-oge-list-index]',
    );
    const tray =
      row?.querySelector<HTMLElement>('.oge-list-view-actions')?.offsetWidth ||
      TRAY_FALLBACK;
    const startOpen = openSwipe?.index === index;
    if (openSwipe && !startOpen) setOpenSwipe(null);
    const isRtl = rtl();
    let axis: boolean | null = null;
    let reveal = startOpen ? tray : 0;
    gesture.current?.cancel();
    const g = beginPointerGesture(event, {
      preventDefault: false,
      touchAction: false,
      touchLock: false,
      suppressClick: true,
      threshold: 6,
      onMove: (dx, dy) => {
        if (axis === null) axis = ogeListViewSwipeAxis(dx, dy);
        if (axis === false) {
          g.cancel();
          return;
        }
        if (axis === null) return;
        reveal = ogeListViewSwipeReveal(dx, tray, isRtl, startOpen);
        setSwipe({ index, tray, reveal });
      },
      onFinish: (commit) => {
        setSwipe(null);
        gesture.current = null;
        if (!commit || axis !== true) return;
        setOpenSwipe(
          ogeListViewSwipeOpens(reveal, tray)
            ? { index, tray, reveal: tray }
            : null,
        );
      },
    });
    gesture.current = g;
  };

  const onFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (role === 'listbox') {
      if (event.target === event.currentTarget) revealIndex(activeIndex);
      return;
    }
    if (event.target === event.currentTarget) {
      // Tab landed on the stand-in stop: bring the active row back, focus it
      if (!parking.current && !parked.current) focusItem(activeIndex);
      return;
    }
    const index = ogeListViewIndexFromTarget(event.target, viewportRef.current);
    if (index >= 0 && index !== activeIndex) setActive(index);
  };

  // --- render -------------------------------------------------------------------

  const swipeTranslate = (index: number) => {
    const isRtl = rtl();
    if (swipe && swipe.index === index)
      return ogeListViewSwipeTranslate(swipe.reveal, isRtl);
    if (openSwipe && openSwipe.index === index)
      return ogeListViewSwipeTranslate(openSwipe.tray, isRtl);
    return 0;
  };

  const renderRow = (row: OgeListViewItemRow<T>) => {
    const selected = selectedSet.has(row.key);
    const isActive = row.index === activeIndex;
    const rowDisabled = isDisabled(row.index);
    const shift = swipeTranslate(row.index);
    const className = [
      'oge-list-view-item',
      selected && 'oge-list-view-item-selected',
      isActive && 'oge-list-view-item-active',
      rowDisabled && 'oge-list-view-item-disabled',
      shift !== 0 && 'oge-list-view-item-swiped',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div
        key={row.key}
        className={className}
        role={role === 'listbox' ? 'option' : 'listitem'}
        id={itemId(row.key)}
        data-oge-list-index={row.index}
        aria-selected={role === 'listbox' ? selected : undefined}
        aria-disabled={rowDisabled || undefined}
        aria-setsize={model.items.length}
        aria-posinset={row.index + 1}
        aria-keyshortcuts={shortcuts ?? undefined}
        aria-describedby={actionsText ? descId : undefined}
        tabIndex={role === 'list' ? (isActive ? 0 : -1) : undefined}
        style={settings ? { height: settings.itemHeight } : undefined}
      >
        <div
          className="oge-list-view-item-main"
          style={shift ? { translate: `${shift}px 0` } : undefined}
        >
          {showControls && (
            <span
              className={
                mode === 'single'
                  ? 'oge-list-view-check oge-list-view-check-radio'
                  : 'oge-list-view-check'
              }
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" focusable="false">
                <path d={CHECK_PATH} />
              </svg>
            </span>
          )}
          {props.renderItem ? (
            <div className="oge-list-view-item-content">
              {props.renderItem({
                item: row.item,
                index: row.index,
                key: row.key,
                selected,
                active: isActive,
                disabled: rowDisabled,
                group: row.group,
              })}
            </div>
          ) : (
            <span className="oge-list-view-item-text">{textOf(row.item)}</span>
          )}
        </div>
        {actions.length > 0 && (
          <span className="oge-list-view-actions" aria-hidden="true">
            {actions.map((action) => (
              <span
                key={action.key}
                className={`oge-list-view-action oge-list-view-action-${action.severity ?? 'neutral'}`}
                data-oge-list-action={action.key}
                title={action.label}
              >
                {action.icon ? (
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    focusable="false"
                  >
                    <path d={action.icon} />
                  </svg>
                ) : (
                  action.label
                )}
              </span>
            ))}
          </span>
        )}
      </div>
    );
  };

  const hostClass = [
    'oge-list-view',
    disabled && 'oge-list-view-disabled',
    settings && 'oge-list-view-virtual',
    actions.length > 0 && 'oge-list-view-has-actions',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={hostRef} className={hostClass} style={props.style}>
      {props.searchEnabled && (
        <div className="oge-list-view-search">
          <svg
            className="oge-list-view-search-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            className="oge-list-view-search-input"
            value={searchValue}
            aria-label={msg.searchLabel}
            placeholder={msg.searchPlaceholder}
            aria-controls={uid}
            disabled={disabled}
            onChange={(event) => applySearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && !isEmpty) {
                event.preventDefault();
                handle.focus();
              } else if (event.key === 'Escape' && searchValue) {
                event.preventDefault();
                applySearch('');
              }
            }}
          />
          {searchValue && (
            <button
              type="button"
              className="oge-list-view-search-clear"
              aria-label={msg.clearSearch}
              disabled={disabled}
              onClick={() => {
                applySearch('');
                searchRef.current?.focus();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div
        ref={viewportRef}
        className={
          isEmpty
            ? 'oge-list-view-viewport oge-list-view-viewport-empty'
            : 'oge-list-view-viewport'
        }
        id={uid}
        role={role}
        aria-label={props.ariaLabel ?? msg.listLabel}
        aria-multiselectable={
          role === 'listbox' && mode === 'multiple' ? true : undefined
        }
        aria-activedescendant={
          role === 'listbox' && activeKey !== undefined
            ? itemId(activeKey)
            : undefined
        }
        aria-busy={props.loading || undefined}
        aria-disabled={disabled || undefined}
        tabIndex={viewportTabIndex}
        style={cssHeight ? { height: cssHeight } : undefined}
        onScroll={(event) => {
          const el = event.currentTarget;
          // a plain list's focused row is about to leave the window: park
          // focus on the viewport (it would fall to <body> with the row)
          const focused = el.ownerDocument.activeElement as HTMLElement | null;
          const rowHadFocus =
            role === 'list' &&
            settings !== null &&
            !!focused &&
            focused !== el &&
            el.contains(focused) &&
            focused.classList.contains('oge-list-view-item');
          setScrollTop(el.scrollTop);
          if (
            rowHadFocus &&
            !ogeListViewWindowHasIndex(
              ogeListViewWindow(
                model,
                tree,
                settings,
                el.scrollTop,
                viewportHeight,
              ),
              activeIndex,
            )
          ) {
            parking.current = true;
            el.focus({ preventScroll: true });
            parking.current = false;
            parked.current = true;
          }
          if (pageLoadMode === 'scroll') checkInfinite();
        }}
        onBlur={(event) => {
          if (event.target === event.currentTarget) parked.current = false;
        }}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onFocus={onFocus}
      >
        <div
          role="none"
          className="oge-list-view-canvas"
          style={settings ? { height: win.totalHeight } : undefined}
        >
          <div
            role="none"
            className="oge-list-view-window"
            style={
              settings
                ? { transform: `translateY(${win.offsetY}px)` }
                : undefined
            }
          >
            {win.segments.map((seg) =>
              seg.group === null ? (
                seg.items.map(renderRow)
              ) : (
                <div
                  key={seg.headerRow}
                  className="oge-list-view-group"
                  role={role === 'listbox' ? 'group' : 'listitem'}
                  aria-label={role === 'listbox' ? seg.group : undefined}
                >
                  {seg.showHeader && (
                    <div
                      className="oge-list-view-group-header"
                      aria-hidden="true"
                      style={
                        settings
                          ? { height: settings.groupHeaderHeight }
                          : undefined
                      }
                    >
                      {props.renderGroup ? (
                        props.renderGroup({
                          group: seg.group,
                          count: seg.count,
                        })
                      ) : (
                        <>
                          <span className="oge-list-view-group-label">
                            {seg.group}
                          </span>
                          <span className="oge-list-view-group-count">
                            {seg.count}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <div
                    className="oge-list-view-group-items"
                    role={role === 'listbox' ? 'none' : 'list'}
                    aria-label={role === 'list' ? seg.group : undefined}
                  >
                    {seg.items.map(renderRow)}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
      {actionsText && (
        <span className="oge-sr-only" id={descId}>
          {actionsText}
        </span>
      )}
      {isEmpty && !props.loading && (
        <div className="oge-list-view-empty">
          {props.renderEmpty
            ? props.renderEmpty({ searching, searchValue })
            : searching
              ? msg.noResults
              : msg.noData}
        </div>
      )}
      {props.loading && (
        <div className="oge-list-view-loading" aria-hidden="true">
          <span className="oge-list-view-spinner" />
          {msg.loading}
        </div>
      )}
      {pageLoadMode === 'button' &&
        props.hasMore &&
        !props.loading &&
        !props.renderFooter && (
          <button
            type="button"
            className="oge-list-view-load-more"
            disabled={disabled}
            onClick={() => requestMore('button')}
          >
            {msg.loadMore}
          </button>
        )}
      {props.renderFooter && (
        <div className="oge-list-view-footer">
          {props.renderFooter({
            loadMore: () => requestMore('button'),
            loading: !!props.loading,
            hasMore: !!props.hasMore,
            itemCount: items.length,
          })}
        </div>
      )}
    </div>
  );
}) as <T = unknown>(
  props: OgeListViewProps<T> & { ref?: ForwardedRef<OgeListViewHandle> },
) => ReactNode;
