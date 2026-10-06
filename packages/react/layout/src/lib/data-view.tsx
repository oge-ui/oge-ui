'use client';

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { ogeFormatMessage } from '@oge-ui/core';
import {
  getOgeLiveAnnouncer,
  ogeDataViewClampPage,
  ogeDataViewDisplayText,
  ogeDataViewFormat,
  ogeDataViewInfoText,
  ogeDataViewIsEllipsis,
  ogeDataViewKey,
  ogeDataViewKeyIntent,
  ogeDataViewMeasureColumns,
  ogeDataViewPageCount,
  ogeDataViewPageItems,
  ogeDataViewPagerWindow,
  ogeDataViewProcess,
  ogeDataViewRole,
  ogeDataViewStyleVars,
  ogeDataViewTabStop,
  ogeDataViewToggleSelection,
  ogeIsRtl,
  OGE_DATA_VIEW_DEFAULT_MIN_ITEM_WIDTH,
  type OgeDataViewDisplayExpr,
  type OgeDataViewItemClickEvent,
  type OgeDataViewKey,
  type OgeDataViewKeyExpr,
  type OgeDataViewLayout,
  type OgeDataViewLayoutChangedEvent,
  type OgeDataViewOptionsChangedEvent,
  type OgeDataViewPageChangedEvent,
  type OgeDataViewSearchExpr,
  type OgeDataViewSelectionChangedEvent,
  type OgeDataViewSelectionMode,
  type OgeDataViewSort,
  type OgeDataViewSortChangedEvent,
  type OgeDataViewSortOption,
} from '@oge-ui/behavior';
import { useOgeDataViewConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Context of `renderItem` / `renderListItem` — the Angular item template context. */
export interface OgeDataViewRenderContext<T> {
  item: T;
  /** Index in the rendered page. */
  index: number;
  layout: OgeDataViewLayout;
  selected: boolean;
}

/** Context of `renderEmpty` — the Angular empty template context. */
export interface OgeDataViewEmptyContext {
  /** `true` when a search or filter (not an empty `items`) left nothing. */
  filtered: boolean;
  /** The default text for this case, from the messages. */
  text: string;
}

export interface OgeDataViewProps<T> {
  /** The items, in their own order. With `remoteOperations`: the current page. */
  items?: readonly T[];
  /** Field (dot paths allowed) or function giving each item's key. Default `'id'`. */
  keyExpr?: OgeDataViewKeyExpr<T>;
  /** Field or function giving an item's text when no `renderItem` is given. */
  displayExpr?: OgeDataViewDisplayExpr<T>;
  /** `grid` (responsive columns) or `list` (controlled); falls back to the config, then `grid`. */
  layout?: OgeDataViewLayout;
  /** Initial layout when uncontrolled. */
  defaultLayout?: OgeDataViewLayout;
  /** The committed layout — the controlled half of `layout`. */
  onLayoutChange?: (layout: OgeDataViewLayout) => void;
  /** Renders the grid / list toggle group in the header. */
  showLayoutSwitch?: boolean;
  /** Minimum width of a grid cell in px before another column fits (container query). Default 240. */
  minItemWidth?: number;
  /** A fixed column count for the grid layout (collapses to one column in a narrow container). */
  columns?: number;
  /** Gap between items — px number or any CSS length. Default 16px. */
  gap?: number | string;
  /** Items per page; `0` (default) shows every item. Falls back to the config. */
  pageSize?: number;
  /** 0-based current page (controlled). */
  pageIndex?: number;
  /** Initial page when uncontrolled. */
  defaultPageIndex?: number;
  /** The committed page — the controlled half of `pageIndex`. */
  onPageIndexChange?: (pageIndex: number) => void;
  /** Total item count for `remoteOperations`; defaults to the processed items' length. */
  itemCount?: number;
  /** Renders the built-in pager when there is more than one page (default `true`). */
  showPager?: boolean;
  /** Renders the `{from}–{to} of {itemCount}` text beside the pager (default `true`). */
  showPageInfo?: boolean;
  /** Choices of the built-in sort select; empty hides it. */
  sortOptions?: readonly OgeDataViewSortOption[];
  /** The active sort (controlled); `null` keeps the items' order. */
  sort?: OgeDataViewSort | null;
  /** Initial sort when uncontrolled. */
  defaultSort?: OgeDataViewSort | null;
  /** The committed sort — the controlled half of `sort`. */
  onSortChange?: (sort: OgeDataViewSort | null) => void;
  /** A predicate the items must pass (client-side only). */
  filter?: ((item: T) => boolean) | null;
  /** Renders the search field in the header. */
  searchEnabled?: boolean;
  /** The search text (controlled). */
  searchValue?: string;
  /** Initial search text when uncontrolled. */
  defaultSearchValue?: string;
  /** The committed search text — the controlled half of `searchValue`. */
  onSearchValueChange?: (value: string) => void;
  /** Field(s) or function the search matches; default every primitive field. */
  searchExpr?: OgeDataViewSearchExpr<T>;
  /** The app sorts, searches and pages: answer `onOptionsChanged` with the page as `items` and the total as `itemCount`. */
  remoteOperations?: boolean;
  /** `none` (a list), `single` or `multiple` (an APG listbox). */
  selectionMode?: OgeDataViewSelectionMode;
  /** Keys of the selected items (controlled). */
  selectedKeys?: readonly OgeDataViewKey[];
  /** Initial selection when uncontrolled. */
  defaultSelectedKeys?: readonly OgeDataViewKey[];
  /** The committed selection — the controlled half of `selectedKeys`. */
  onSelectedKeysChange?: (keys: OgeDataViewKey[]) => void;
  /** Shows skeleton placeholders (no items yet) or marks the items `aria-busy`. */
  loading?: boolean;
  /** BCP 47 locale of the sort comparison; falls back to the config, then the runtime locale. */
  locale?: string;
  /** Accessible name of the items; a listbox falls back to the `dataView` message. */
  ariaLabel?: string;
  /** Header content before the built-in tools — the Angular `[ogeDataViewToolbar]` slot. */
  toolbar?: ReactNode;
  /** Renders each item — the Angular `[ogeDataViewItemTemplate]`. */
  renderItem?: (context: OgeDataViewRenderContext<T>) => ReactNode;
  /** Renders each item in the `list` layout — the Angular `[ogeDataViewListItemTemplate]`. */
  renderListItem?: (context: OgeDataViewRenderContext<T>) => ReactNode;
  /** Replaces the empty state — the Angular `[ogeDataViewEmptyTemplate]`. */
  renderEmpty?: (context: OgeDataViewEmptyContext) => ReactNode;
  /** The layout changed through the switch or `setLayout()`. */
  onLayoutChanged?: (event: OgeDataViewLayoutChangedEvent) => void;
  /** The page changed through the pager, PageUp / PageDown or `goToPage()`. */
  onPageChanged?: (event: OgeDataViewPageChangedEvent) => void;
  /** The sort changed through the built-in controls. */
  onSortChanged?: (event: OgeDataViewSortChangedEvent) => void;
  /** The selection changed through a click, Space / Enter, Ctrl+A or a method. */
  onSelectionChanged?: (event: OgeDataViewSelectionChangedEvent<T>) => void;
  /** An item was clicked (or activated with Enter / Space in a listbox). */
  onItemClick?: (event: OgeDataViewItemClickEvent<T>) => void;
  /** Sort, search or page changed — the request to answer under `remoteOperations`. */
  onOptionsChanged?: (event: OgeDataViewOptionsChangedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeDataView>`. */
export interface OgeDataViewHandle {
  /** Focuses the item at `index` of the page (default: the tab stop) in a selectable view. */
  focus(index?: number): void;
  /** Shows page `index` (clamped) and emits `onPageChanged` when it changed. */
  goToPage(index: number): void;
  /** Switches the layout and emits `onLayoutChanged` when it changed. */
  setLayout(layout: OgeDataViewLayout): void;
  /** Deselects everything. */
  clearSelection(): void;
  /** Selects every item that passes the filter and search (multiple selection only). */
  selectAll(): void;
}

const EMPTY: readonly never[] = [];
const NO_KEYS: readonly OgeDataViewKey[] = [];
const NO_SORT_OPTIONS: readonly OgeDataViewSortOption[] = [];
const SKELETON = [0, 1, 2, 3, 4, 5];

const sameKeys = (a: readonly OgeDataViewKey[], b: readonly OgeDataViewKey[]) =>
  a.length === b.length && a.every((key, i) => key === b[i]);

/**
 * A templated collection of items — the React render of the Angular
 * `<oge-data-view>`, same markup, stylesheet and decisions: a `list` of
 * `listitem`s without selection, an APG **listbox** of `option`s with
 * `selectionMode` (arrows in reading order, mirrored in RTL; Up / Down by a
 * row; PageUp / PageDown turn the page; Space / Enter toggle). Columns come
 * from a container query on the view's own width.
 *
 * ```tsx
 * <OgeDataView
 *   items={products}
 *   pageSize={8}
 *   showLayoutSwitch
 *   searchEnabled
 *   sortOptions={[{ field: 'name', label: 'Name' }]}
 *   ariaLabel="Products"
 *   renderItem={({ item }) => <h3>{item.name}</h3>}
 * />
 * ```
 */
export const OgeDataView = forwardRef(function OgeDataViewRender<T>(
  props: OgeDataViewProps<T>,
  ref: ForwardedRef<OgeDataViewHandle>,
) {
  const config = useOgeDataViewConfig();
  const msg = config.messages;
  const items = (props.items ?? EMPTY) as readonly T[];
  const keyExpr = props.keyExpr ?? 'id';
  const sortOptions = props.sortOptions ?? NO_SORT_OPTIONS;
  const selectionMode = props.selectionMode ?? 'none';
  const remote = !!props.remoteOperations;
  const loading = !!props.loading;
  const locale = props.locale ?? config.locale;
  const pageSize = Math.max(
    0,
    Math.floor(props.pageSize ?? config.pageSize ?? 0),
  );

  const [uLayout, setULayout] = useState<OgeDataViewLayout | undefined>(
    props.defaultLayout,
  );
  const [uPage, setUPage] = useState(props.defaultPageIndex ?? 0);
  const [uSort, setUSort] = useState<OgeDataViewSort | null>(
    props.defaultSort ?? null,
  );
  const [uSearch, setUSearch] = useState(props.defaultSearchValue ?? '');
  const [uKeys, setUKeys] = useState<readonly OgeDataViewKey[]>(
    props.defaultSelectedKeys ?? NO_KEYS,
  );
  const [focusIndex, setFocusIndex] = useState(-1);

  const layout = props.layout ?? uLayout ?? config.layout ?? 'grid';
  const pageIndexRaw = props.pageIndex ?? uPage;
  const sort = props.sort !== undefined ? props.sort : uSort;
  const searchValue = props.searchValue ?? uSearch;
  const selectedKeys = props.selectedKeys ?? uKeys;

  const rawId = useId();
  const itemsId = `oge-data-view-items-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const pendingFocus = useRef<(() => void) | null>(null);

  const filter = props.filter ?? null;
  const searchExpr = props.searchExpr;
  const processed = useMemo<readonly T[]>(
    () =>
      remote
        ? items
        : ogeDataViewProcess(items, {
            filter,
            searchValue,
            searchExpr,
            sort,
            locale,
          }),
    [remote, items, filter, searchValue, searchExpr, sort, locale],
  );
  const total = remote ? (props.itemCount ?? items.length) : processed.length;
  const pageCount = ogeDataViewPageCount(total, pageSize);
  const currentPage = ogeDataViewClampPage(pageIndexRaw, pageCount);
  const pageItems = useMemo(
    () =>
      remote ? items : ogeDataViewPageItems(processed, currentPage, pageSize),
    [remote, items, processed, currentPage, pageSize],
  );
  const keys = useMemo(() => {
    const offset = remote ? 0 : currentPage * pageSize;
    return pageItems.map((item, i) =>
      ogeDataViewKey(item, keyExpr, offset + i),
    );
  }, [pageItems, keyExpr, remote, currentPage, pageSize]);
  const role = ogeDataViewRole(selectionMode);
  // derived, never effect-seeded: the first paint already has its tab stop
  const tabStop = ogeDataViewTabStop(keys, focusIndex, selectedKeys);
  const filtered = items.length > 0 && total === 0;
  const emptyText = filtered ? msg.noResults : msg.noData;
  const pagerVisible =
    (props.showPager ?? true) && pageSize > 0 && pageCount > 1;

  useIsomorphicLayoutEffect(() => {
    const run = pendingFocus.current;
    pendingFocus.current = null;
    run?.();
  });

  // ---- state commits -------------------------------------------------------

  const state = {
    layout,
    currentPage,
    pageCount,
    pageSize,
    sort,
    searchValue,
    selectedKeys,
    total,
  };
  const stateRef = useRef(state);
  stateRef.current = state;

  const announce = (text: string) => getOgeLiveAnnouncer().announce(text);

  const emitOptions = (patch: Partial<OgeDataViewOptionsChangedEvent>) => {
    const s = stateRef.current;
    latest.current.onOptionsChanged?.({
      sort: s.sort,
      searchValue: s.searchValue,
      pageIndex: s.currentPage,
      pageSize: s.pageSize,
      ...patch,
    });
  };

  const setPage = (next: number) => {
    if (latest.current.pageIndex === undefined) setUPage(next);
    latest.current.onPageIndexChange?.(next);
  };

  const changePage = (index: number, event?: Event): boolean => {
    const s = stateRef.current;
    const pageIndex = ogeDataViewClampPage(index, s.pageCount);
    if (pageIndex === s.currentPage) return false;
    setPage(pageIndex);
    setFocusIndex(-1);
    latest.current.onPageChanged?.({
      pageIndex,
      previousPageIndex: s.currentPage,
      pageSize: s.pageSize,
      event,
    });
    emitOptions({ pageIndex });
    announce(
      ogeDataViewFormat(msg.pageAnnouncement, {
        page: pageIndex + 1,
        pageCount: s.pageCount,
      }),
    );
    return true;
  };

  const resetPage = () => {
    if (stateRef.current.currentPage !== 0) setPage(0);
    setFocusIndex(-1);
  };

  const setLayout = (next: OgeDataViewLayout, event?: Event) => {
    const previousLayout = stateRef.current.layout;
    if (next === previousLayout) return;
    if (latest.current.layout === undefined) setULayout(next);
    latest.current.onLayoutChange?.(next);
    latest.current.onLayoutChanged?.({
      layout: next,
      previousLayout,
      event,
    });
  };

  const applySort = (next: OgeDataViewSort | null, event: Event) => {
    const previousSort = stateRef.current.sort;
    if (latest.current.sort === undefined) setUSort(next);
    latest.current.onSortChange?.(next);
    latest.current.onSortChanged?.({ sort: next, previousSort, event });
    resetPage();
    emitOptions({ sort: next, pageIndex: 0 });
  };

  const commitSelection = (
    next: OgeDataViewKey[],
    item: T | undefined,
    event: Event | undefined,
  ) => {
    const previousKeys = [...stateRef.current.selectedKeys];
    if (sameKeys(previousKeys, next)) return;
    if (latest.current.selectedKeys === undefined) setUKeys(next);
    latest.current.onSelectedKeysChange?.(next);
    latest.current.onSelectionChanged?.({
      selectedKeys: next,
      previousKeys,
      item,
      event,
    });
  };

  const selectAll = () => {
    if (selectionMode !== 'multiple') return;
    commitSelection(
      processed.map((item, i) => ogeDataViewKey(item, keyExpr, i)),
      undefined,
      undefined,
    );
  };

  const focusOption = (index: number) => {
    if (index < 0) return;
    setFocusIndex(index);
    hostRef.current
      ?.querySelector<HTMLElement>(`[data-oge-data-view-index="${index}"]`)
      ?.focus();
  };

  const handle = {
    focus: (index?: number) => {
      if (role !== 'listbox') {
        hostRef.current
          ?.querySelector<HTMLElement>(
            '.oge-data-view-items a, .oge-data-view-items button, .oge-data-view-items [tabindex]',
          )
          ?.focus();
        return;
      }
      focusOption(index ?? tabStop);
    },
    goToPage: (index: number) => void changePage(index),
    setLayout: (next: OgeDataViewLayout) => setLayout(next),
    clearSelection: () => commitSelection([], undefined, undefined),
    selectAll,
  };
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useImperativeHandle(
    ref,
    () => ({
      focus: (i) => handleRef.current.focus(i),
      goToPage: (i) => handleRef.current.goToPage(i),
      setLayout: (l) => handleRef.current.setLayout(l),
      clearSelection: () => handleRef.current.clearSelection(),
      selectAll: () => handleRef.current.selectAll(),
    }),
    [],
  );

  // ---- handlers ------------------------------------------------------------

  const onSearchInput = (value: string) => {
    if (latest.current.searchValue === undefined) setUSearch(value);
    latest.current.onSearchValueChange?.(value);
    resetPage();
    emitOptions({ searchValue: value, pageIndex: 0 });
    if (!remote) {
      const count = ogeDataViewProcess(items, {
        filter,
        searchValue: value,
        searchExpr,
        sort: null,
      }).length;
      announce(ogeFormatMessage(msg.results, { count }, locale));
    }
  };

  const activate = (index: number, event: Event) => {
    const item = pageItems[index];
    if (item === undefined) return;
    const key = keys[index];
    if (role === 'listbox') {
      setFocusIndex(index);
      commitSelection(
        ogeDataViewToggleSelection(selectionMode, selectedKeys, key),
        item,
        event,
      );
    }
    latest.current.onItemClick?.({ item, index, key, event });
  };

  const onHostClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const el = target?.closest?.('[data-oge-data-view-index]');
    const host = hostRef.current;
    if (!el || !host || el.closest('.oge-data-view') !== host) return;
    activate(
      Number(el.getAttribute('data-oge-data-view-index')),
      event.nativeEvent,
    );
  };

  const onOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    index: number,
  ) => {
    const options = Array.from(
      hostRef.current?.querySelectorAll<HTMLElement>('.oge-data-view-option') ??
        [],
    );
    const intent = ogeDataViewKeyIntent(event, {
      index,
      count: pageItems.length,
      columns: layout === 'list' ? 1 : ogeDataViewMeasureColumns(options),
      rtl: ogeIsRtl(hostRef.current),
      multiple: selectionMode === 'multiple',
    });
    if (!intent) return;
    event.preventDefault();
    switch (intent.type) {
      case 'move':
        focusOption(intent.index);
        return;
      case 'page':
        if (changePage(currentPage + intent.delta, event.nativeEvent)) {
          pendingFocus.current = () => {
            const count =
              hostRef.current?.querySelectorAll('.oge-data-view-option')
                .length ?? 0;
            focusOption(Math.min(index, count - 1));
          };
        }
        return;
      case 'toggle':
        activate(index, event.nativeEvent);
        return;
      case 'selectAll':
        selectAll();
        return;
    }
  };

  const pagerClick = (
    index: number,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const button = event.currentTarget;
    if (!changePage(index, event.nativeEvent)) return;
    pendingFocus.current = () => {
      if (button.isConnected && !button.disabled) {
        button.focus();
        return;
      }
      const page = stateRef.current.currentPage;
      hostRef.current
        ?.querySelector<HTMLElement>(`[data-oge-data-view-page="${page}"]`)
        ?.focus();
    };
  };

  // ---- render --------------------------------------------------------------

  const renderer =
    layout === 'list'
      ? (props.renderListItem ?? props.renderItem)
      : props.renderItem;
  const body = (item: T, index: number) => {
    const selected =
      selectionMode !== 'none' && selectedKeys.includes(keys[index]);
    return renderer ? (
      renderer({ item, index, layout, selected })
    ) : (
      <span className="oge-data-view-text">
        {ogeDataViewDisplayText(item, props.displayExpr)}
      </span>
    );
  };

  const styleVars = ogeDataViewStyleVars({
    minItemWidth:
      props.minItemWidth ??
      config.minItemWidth ??
      OGE_DATA_VIEW_DEFAULT_MIN_ITEM_WIDTH,
    columns: props.columns,
    gap: props.gap,
  });
  const className = [
    'oge-data-view',
    `oge-data-view-layout-${layout}`,
    props.columns ? 'oge-data-view-fixed-columns' : '',
    loading ? 'oge-data-view-loading' : '',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader =
    !!props.toolbar ||
    !!props.searchEnabled ||
    sortOptions.length > 0 ||
    !!props.showLayoutSwitch;

  let content: ReactNode;
  if (pageItems.length && role === 'listbox') {
    content = (
      <div
        className="oge-data-view-items"
        role="listbox"
        id={itemsId}
        aria-label={props.ariaLabel ?? msg.dataView}
        aria-multiselectable={selectionMode === 'multiple' ? true : undefined}
        aria-busy={loading || undefined}
      >
        {pageItems.map((item, i) => {
          const selected = selectedKeys.includes(keys[i]);
          return (
            <div
              key={keys[i]}
              role="option"
              className={
                'oge-data-view-item oge-data-view-option' +
                (selected ? ' oge-data-view-item-selected' : '')
              }
              aria-selected={selected}
              data-oge-data-view-index={i}
              tabIndex={i === tabStop ? 0 : -1}
              onKeyDown={(event) => onOptionKeyDown(event, i)}
              onFocus={() => setFocusIndex(i)}
            >
              <span className="oge-data-view-check" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  focusable="false"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {body(item, i)}
            </div>
          );
        })}
      </div>
    );
  } else if (pageItems.length) {
    content = (
      <div
        className="oge-data-view-items"
        role="list"
        id={itemsId}
        aria-label={props.ariaLabel}
        aria-busy={loading || undefined}
      >
        {pageItems.map((item, i) => (
          <div
            key={keys[i]}
            role="listitem"
            className="oge-data-view-item"
            data-oge-data-view-index={i}
          >
            {body(item, i)}
          </div>
        ))}
      </div>
    );
  } else if (loading) {
    content = (
      <div className="oge-data-view-items" id={itemsId} aria-busy="true">
        <span className="oge-sr-only">{msg.loading}</span>
        {SKELETON.map((bone) => (
          <div
            key={bone}
            className="oge-data-view-item oge-data-view-bone"
            aria-hidden="true"
          >
            <span className="oge-data-view-bone-line" />
            <span className="oge-data-view-bone-line oge-data-view-bone-short" />
          </div>
        ))}
      </div>
    );
  } else {
    content = (
      <div className="oge-data-view-empty" id={itemsId}>
        {props.renderEmpty
          ? props.renderEmpty({ filtered, text: emptyText })
          : emptyText}
      </div>
    );
  }

  const icon = (d: ReactNode, size = 16) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {d}
    </svg>
  );

  return (
    // the click handler only delegates item activation; the options carry
    // the keyboard handling themselves
    <div
      ref={hostRef}
      className={className}
      style={{ ...(styleVars as CSSProperties), ...props.style }}
      onClick={onHostClick}
    >
      {hasHeader && (
        <div className="oge-data-view-header">
          {props.toolbar}
          {props.searchEnabled && (
            <input
              type="search"
              className="oge-data-view-search"
              aria-label={msg.search}
              aria-controls={itemsId}
              placeholder={msg.searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchInput(event.target.value)}
            />
          )}
          {sortOptions.length > 0 && (
            <>
              <label className="oge-data-view-sort">
                <span className="oge-data-view-sort-label">{msg.sortBy}</span>
                <select
                  className="oge-data-view-sort-select"
                  aria-controls={itemsId}
                  value={sort?.field ?? ''}
                  onChange={(event) => {
                    const field = event.target.value;
                    applySort(
                      field
                        ? { field, direction: sort?.direction ?? 'asc' }
                        : null,
                      event.nativeEvent,
                    );
                  }}
                >
                  <option value="">{msg.sortNone}</option>
                  {sortOptions.map((option) => (
                    <option key={option.field} value={option.field}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="oge-data-view-tool oge-data-view-direction"
                disabled={!sort}
                aria-pressed={sort?.direction === 'desc'}
                aria-label={msg.descending}
                title={
                  sort?.direction === 'desc' ? msg.descending : msg.ascending
                }
                onClick={(event) => {
                  if (!sort) return;
                  applySort(
                    {
                      field: sort.field,
                      direction: sort.direction === 'asc' ? 'desc' : 'asc',
                    },
                    event.nativeEvent,
                  );
                }}
              >
                {icon(<path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 11h5M14 16h3" />)}
              </button>
            </>
          )}
          {props.showLayoutSwitch && (
            <div
              className="oge-data-view-layout-switch"
              role="group"
              aria-label={msg.layoutSwitch}
            >
              <button
                type="button"
                className="oge-data-view-tool"
                aria-pressed={layout === 'grid'}
                aria-label={msg.gridLayout}
                title={msg.gridLayout}
                onClick={(event) => setLayout('grid', event.nativeEvent)}
              >
                {icon(
                  <>
                    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
                    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
                    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
                    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
                  </>,
                )}
              </button>
              <button
                type="button"
                className="oge-data-view-tool"
                aria-pressed={layout === 'list'}
                aria-label={msg.listLayout}
                title={msg.listLayout}
                onClick={(event) => setLayout('list', event.nativeEvent)}
              >
                {icon(
                  <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {content}

      {pagerVisible && (
        <div
          className="oge-data-view-pager"
          role="group"
          aria-label={msg.pager}
        >
          <button
            type="button"
            className="oge-data-view-page-btn"
            data-oge-data-view-pager="prev"
            disabled={currentPage === 0}
            aria-label={msg.previousPage}
            title={msg.previousPage}
            onClick={(event) => pagerClick(currentPage - 1, event)}
          >
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m10 3.5-4.5 4.5L10 12.5" />
            </svg>
          </button>
          {ogeDataViewPagerWindow(currentPage, pageCount).map((entry, i) =>
            ogeDataViewIsEllipsis(entry) ? (
              <span
                key={`e${i}`}
                className="oge-data-view-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className={
                  'oge-data-view-page-btn oge-data-view-page' +
                  (entry === currentPage ? ' oge-data-view-page-current' : '')
                }
                data-oge-data-view-page={entry}
                aria-current={entry === currentPage ? 'page' : undefined}
                aria-label={ogeDataViewFormat(msg.page, { page: +entry + 1 })}
                onClick={(event) => pagerClick(+entry, event)}
              >
                {+entry + 1}
              </button>
            ),
          )}
          <button
            type="button"
            className="oge-data-view-page-btn"
            data-oge-data-view-pager="next"
            disabled={currentPage >= pageCount - 1}
            aria-label={msg.nextPage}
            title={msg.nextPage}
            onClick={(event) => pagerClick(currentPage + 1, event)}
          >
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </button>
          {(props.showPageInfo ?? true) && (
            <span className="oge-data-view-info">
              {ogeDataViewInfoText(msg, {
                pageIndex: currentPage,
                pageSize,
                itemCount: total,
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}) as <T = unknown>(
  props: OgeDataViewProps<T> & { ref?: ForwardedRef<OgeDataViewHandle> },
) => ReactNode;
