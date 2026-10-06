/**
 * The framework-free half of the data view (W8d): the vocabulary, the message
 * catalog, the config, and every decision both render layers make — item keys,
 * search matching, locale-aware sorting, paging slices, the pager window, the
 * ARIA shape, the selection toggle, the roving tab stop and the 2-D keyboard
 * map — so the Angular and React components only draw markup.
 *
 * Semantics: no WAI-ARIA APG pattern exists for a templated collection of
 * items. A data view without selection is a `list` of `listitem`s (an item's
 * template may hold links and buttons, which stay in the Tab order); with
 * selection it is an APG **listbox** of `option`s with one roving tab stop.
 * A listbox option is a leaf for assistive technology, so its template must
 * not contain interactive controls. The grid arrangement is visual only:
 * arrows walk the items in reading order (mirrored in RTL), Up / Down jump
 * by the measured column count, PageUp / PageDown turn the page.
 */
import { foldText } from '@oge-ui/core';
import {
  OGE_PAGE_ELLIPSIS,
  paginationPageCount,
  resolvePageRange,
  resolvePageWindow,
  type OgePageWindowEntry,
} from '../navigation/pagination-core';

/** How the items are arranged: responsive columns, or one item per row. */
export type OgeDataViewLayout = 'grid' | 'list';

/** `none` renders a list; `single` / `multiple` render an APG listbox. */
export type OgeDataViewSelectionMode = 'none' | 'single' | 'multiple';

/** Identity of an item, from `keyExpr`. */
export type OgeDataViewKey = string | number;

/** Direction of a sort. */
export type OgeDataViewSortDirection = 'asc' | 'desc';

/** The active sort: a field of the items and a direction. */
export interface OgeDataViewSort {
  readonly field: string;
  readonly direction: OgeDataViewSortDirection;
}

/** One choice of the built-in sort select. */
export interface OgeDataViewSortOption {
  /** Field of the items the option sorts by (dot paths allowed). */
  readonly field: string;
  /** Visible label of the option. */
  readonly label: string;
}

/** Where an item's key comes from: a field name (dot paths allowed) or a function. */
export type OgeDataViewKeyExpr<T> = string | ((item: T) => OgeDataViewKey);

/** Which text the search matches: one field, several fields or a function. */
export type OgeDataViewSearchExpr<T> =
  string | readonly string[] | ((item: T) => string);

/** Every user-facing string the data view renders, aria labels included. */
export interface OgeDataViewMessages {
  /** Accessible name of a selectable data view's listbox without an `ariaLabel`. */
  dataView: string;
  /** Accessible name of the layout switch group. */
  layoutSwitch: string;
  /** Label of the grid-layout button. */
  gridLayout: string;
  /** Label of the list-layout button. */
  listLayout: string;
  /** Label of the sort select. */
  sortBy: string;
  /** The sort select's "no sort" choice (the items' own order). */
  sortNone: string;
  /** Label of the sort-direction toggle while the sort is ascending. */
  ascending: string;
  /** Label of the sort-direction toggle while the sort is descending. */
  descending: string;
  /** Accessible name of the search field. */
  search: string;
  /** Placeholder of the search field. */
  searchPlaceholder: string;
  /** Accessible name of the pager group. */
  pager: string;
  /** Aria label of the previous-page button. */
  previousPage: string;
  /** Aria label of the next-page button. */
  nextPage: string;
  /** Aria label of a numeric page button; `{page}` is the 1-based number. */
  page: string;
  /** Range text beside the pager; `{from}`, `{to}` and `{itemCount}`. */
  pageInfo: string;
  /** Announced after a page change; `{page}` and `{pageCount}`. */
  pageAnnouncement: string;
  /** Shown when there are no items at all. */
  noData: string;
  /** Shown when a search or filter leaves no items. */
  noResults: string;
  /** Announced after a search; ICU plural over `{count}`. */
  results: string;
  /** Visually hidden text of the loading state. */
  loading: string;
}

export const OGE_DEFAULT_DATA_VIEW_MESSAGES: OgeDataViewMessages = {
  dataView: 'Items',
  layoutSwitch: 'Layout',
  gridLayout: 'Grid',
  listLayout: 'List',
  sortBy: 'Sort by',
  sortNone: 'Default order',
  ascending: 'Ascending',
  descending: 'Descending',
  search: 'Search',
  searchPlaceholder: 'Search…',
  pager: 'Pages',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  page: 'Page {page}',
  pageInfo: '{from}–{to} of {itemCount}',
  pageAnnouncement: 'Page {page} of {pageCount}',
  noData: 'No items to display',
  noResults: 'No matching items',
  results: '{count, plural, =0 {No results} one {# result} other {# results}}',
  loading: 'Loading…',
};

/** Application-wide defaults for `oge-data-view`. */
export interface OgeDataViewConfig {
  messages: OgeDataViewMessages;
  /** Default for the `layout` input (`grid`). */
  layout?: OgeDataViewLayout;
  /** Default for the `pageSize` input (`0` = every item on one page). */
  pageSize?: number;
  /** Default for the `minItemWidth` input in px (240). */
  minItemWidth?: number;
  /**
   * BCP 47 locale the sort compares in; `undefined` = the application
   * locale (Angular `LOCALE_ID`, React the runtime default).
   */
  locale?: string;
}

export const OGE_DEFAULT_DATA_VIEW_CONFIG: OgeDataViewConfig = {
  messages: OGE_DEFAULT_DATA_VIEW_MESSAGES,
};

export type OgeDataViewConfigInput = Partial<
  Omit<OgeDataViewConfig, 'messages'>
> & {
  messages?: Partial<OgeDataViewMessages>;
};

export function resolveOgeDataViewConfig(
  input: OgeDataViewConfigInput | undefined,
): OgeDataViewConfig {
  return {
    ...OGE_DEFAULT_DATA_VIEW_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_DATA_VIEW_MESSAGES, ...input?.messages },
  };
}

/** Default minimum width (px) of a grid cell before another column fits. */
export const OGE_DATA_VIEW_DEFAULT_MIN_ITEM_WIDTH = 240;

/** Slot budget of the built-in pager's numeric window (ellipses included). */
export const OGE_DATA_VIEW_PAGER_BUTTONS = 7;

// --- events ----------------------------------------------------------------

/** The layout changed through the switch or `setLayout()`. */
export interface OgeDataViewLayoutChangedEvent {
  readonly layout: OgeDataViewLayout;
  readonly previousLayout: OgeDataViewLayout;
  readonly event?: Event;
}

/** The page changed through the pager, PageUp / PageDown or `goToPage()`. */
export interface OgeDataViewPageChangedEvent {
  /** The new 0-based page. */
  readonly pageIndex: number;
  readonly previousPageIndex: number;
  readonly pageSize: number;
  readonly event?: Event;
}

/** The sort changed through the built-in select or direction toggle. */
export interface OgeDataViewSortChangedEvent {
  /** The new sort; `null` = the items' own order. */
  readonly sort: OgeDataViewSort | null;
  readonly previousSort: OgeDataViewSort | null;
  readonly event?: Event;
}

/** The selection changed through a click, Space, Enter or Ctrl+A. */
export interface OgeDataViewSelectionChangedEvent<T = unknown> {
  readonly selectedKeys: OgeDataViewKey[];
  readonly previousKeys: OgeDataViewKey[];
  /** The item whose toggle caused the change; absent for Ctrl+A / `clearSelection()`. */
  readonly item?: T;
  readonly event?: Event;
}

/** An item was clicked, or activated with Enter / Space in a listbox. */
export interface OgeDataViewItemClickEvent<T = unknown> {
  readonly item: T;
  /** Index in the rendered page. */
  readonly index: number;
  readonly key: OgeDataViewKey;
  readonly event: Event;
}

/**
 * Sort, search or page changed — with `remoteOperations` this is the request
 * the app answers with the next `items` (and `itemCount`).
 */
export interface OgeDataViewOptionsChangedEvent {
  readonly sort: OgeDataViewSort | null;
  readonly searchValue: string;
  readonly pageIndex: number;
  readonly pageSize: number;
}

// --- data ------------------------------------------------------------------

/** Reads `field` of an item; dot paths (`address.city`) walk nested objects. */
export function ogeDataViewField(item: unknown, field: string): unknown {
  if (item === null || item === undefined) return undefined;
  if (!field.includes('.')) return (item as Record<string, unknown>)[field];
  let value: unknown = item;
  for (const part of field.split('.')) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/** An item's key: `keyExpr`'s value, the index when it yields nothing. */
export function ogeDataViewKey<T>(
  item: T,
  keyExpr: OgeDataViewKeyExpr<T>,
  index: number,
): OgeDataViewKey {
  const value =
    typeof keyExpr === 'function'
      ? keyExpr(item)
      : ogeDataViewField(item, keyExpr);
  return typeof value === 'string' || typeof value === 'number' ? value : index;
}

/** Where an item's fallback text comes from when no template is given. */
export type OgeDataViewDisplayExpr<T> = string | ((item: T) => string);

/**
 * The text an item renders without a template: `displayExpr`'s value, else
 * its `title`, `name`, `text` or `label` field, else `String(item)`.
 */
export function ogeDataViewDisplayText<T>(
  item: T,
  displayExpr?: OgeDataViewDisplayExpr<T> | null,
): string {
  if (typeof displayExpr === 'function') return displayExpr(item) ?? '';
  if (displayExpr) {
    const value = ogeDataViewField(item, displayExpr);
    return value === null || value === undefined ? '' : String(value);
  }
  if (item !== null && typeof item === 'object') {
    for (const field of ['title', 'name', 'text', 'label']) {
      const value = (item as Record<string, unknown>)[field];
      if (value !== null && value !== undefined) return String(value);
    }
  }
  return String(item ?? '');
}

/** The text a search matches for an item (fields joined by a space). */
export function ogeDataViewSearchText<T>(
  item: T,
  searchExpr: OgeDataViewSearchExpr<T> | null | undefined,
): string {
  if (typeof searchExpr === 'function') return searchExpr(item) ?? '';
  if (searchExpr === null || searchExpr === undefined) {
    // no expression: every primitive own value of the item
    if (item === null || typeof item !== 'object') return String(item ?? '');
    return Object.values(item as Record<string, unknown>)
      .filter(
        (value) =>
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean',
      )
      .map(String)
      .join(' ');
  }
  const fields: readonly string[] =
    typeof searchExpr === 'string' ? [searchExpr] : searchExpr;
  return fields
    .map((field) => ogeDataViewField(item, field))
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .join(' ');
}

/**
 * Whether an item matches a search: every whitespace-separated word of the
 * query occurs in the item's text, compared through core's `foldText`
 * (case-, accent- and locale-insensitive — `İstanbul` matches `istanbul`).
 */
export function ogeDataViewMatches<T>(
  item: T,
  query: string,
  searchExpr: OgeDataViewSearchExpr<T> | null | undefined,
): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = foldText(ogeDataViewSearchText(item, searchExpr));
  return words.every((word) => text.includes(word));
}

const collators = new Map<string, Intl.Collator>();

/**
 * A cached `Intl.Collator` for `locale` (numeric, base-sensitive-ish
 * `variant` comparison) — an unknown locale degrades to the runtime
 * default instead of throwing.
 */
export function ogeDataViewCollator(locale?: string): Intl.Collator {
  const id = locale ?? '';
  let collator = collators.get(id);
  if (!collator) {
    try {
      collator = new Intl.Collator(locale || undefined, { numeric: true });
    } catch {
      collator = new Intl.Collator(undefined, { numeric: true });
    }
    collators.set(id, collator);
  }
  return collator;
}

function comparable(value: unknown): number | string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return String(value);
}

/**
 * Compares two items by a sort: numbers, dates and booleans numerically,
 * text through the locale's collator (numeric, so "Item 10" follows
 * "Item 9"); empty values sort last in both directions.
 */
export function ogeDataViewCompare(
  a: unknown,
  b: unknown,
  sort: OgeDataViewSort,
  locale?: string,
): number {
  const left = comparable(ogeDataViewField(a, sort.field));
  const right = comparable(ogeDataViewField(b, sort.field));
  if (left === null || right === null) {
    if (left === right) return 0;
    return left === null ? 1 : -1;
  }
  let result: number;
  if (typeof left === 'number' && typeof right === 'number') {
    result = left - right;
  } else {
    result = ogeDataViewCollator(locale).compare(String(left), String(right));
  }
  return sort.direction === 'desc' ? -result : result;
}

/** Inputs of {@link ogeDataViewProcess}. */
export interface OgeDataViewProcessOptions<T> {
  readonly filter?: ((item: T) => boolean) | null;
  readonly searchValue?: string;
  readonly searchExpr?: OgeDataViewSearchExpr<T> | null;
  readonly sort?: OgeDataViewSort | null;
  readonly locale?: string;
}

/**
 * The client-side pipeline: filter → search → stable sort. Returns the input
 * array itself when nothing applies, so a render layer's memo stays cheap.
 */
export function ogeDataViewProcess<T>(
  items: readonly T[],
  options: OgeDataViewProcessOptions<T>,
): readonly T[] {
  let result = items;
  if (options.filter) result = result.filter((item) => options.filter!(item));
  const query = options.searchValue?.trim() ?? '';
  if (query) {
    const expr = options.searchExpr;
    result = result.filter((item) => ogeDataViewMatches(item, query, expr));
  }
  if (options.sort) {
    const sort = options.sort;
    // index tie-break: Array#sort is stable, but say so explicitly
    result = result
      .map((item, index) => ({ item, index }))
      .sort(
        (x, y) =>
          ogeDataViewCompare(x.item, y.item, sort, options.locale) ||
          x.index - y.index,
      )
      .map((entry) => entry.item);
  }
  return result;
}

/** Total pages; `1` when paging is off (`pageSize <= 0`) or there are no items. */
export function ogeDataViewPageCount(
  itemCount: number,
  pageSize: number,
): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, paginationPageCount(itemCount, pageSize) ?? 1);
}

/** `pageIndex` brought into `[0, pageCount - 1]`. */
export function ogeDataViewClampPage(
  pageIndex: number,
  pageCount: number,
): number {
  if (!Number.isFinite(pageIndex)) return 0;
  return Math.min(
    Math.max(0, Math.floor(pageIndex)),
    Math.max(0, pageCount - 1),
  );
}

/** The items of one page (all of them when paging is off). */
export function ogeDataViewPageItems<T>(
  items: readonly T[],
  pageIndex: number,
  pageSize: number,
): readonly T[] {
  if (pageSize <= 0) return items;
  const start = pageIndex * pageSize;
  return items.slice(start, start + pageSize);
}

/** One slot of the built-in pager. */
export type OgeDataViewPagerEntry = OgePageWindowEntry;

/** The numeric pager window (0-based pages and `'ellipsis'` gaps). */
export function ogeDataViewPagerWindow(
  pageIndex: number,
  pageCount: number,
  maxButtons = OGE_DATA_VIEW_PAGER_BUTTONS,
): readonly OgeDataViewPagerEntry[] {
  return resolvePageWindow({ pageIndex, pageCount, maxButtons });
}

/** Whether a pager entry is the ellipsis gap. */
export function ogeDataViewIsEllipsis(entry: OgeDataViewPagerEntry): boolean {
  return entry === OGE_PAGE_ELLIPSIS;
}

/** Replaces each `{name}` of a plain (non-ICU) message. */
export function ogeDataViewFormat(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** The `{from}–{to} of {itemCount}` text beside the pager. */
export function ogeDataViewInfoText(
  messages: Pick<OgeDataViewMessages, 'pageInfo'>,
  state: { pageIndex: number; pageSize: number; itemCount: number },
): string {
  const range = resolvePageRange(state);
  return ogeDataViewFormat(messages.pageInfo, {
    from: range.from,
    to: range.to,
    itemCount: state.itemCount,
  });
}

// --- semantics -------------------------------------------------------------

/** The items container's role: a `list`, or a `listbox` once items select. */
export function ogeDataViewRole(
  selectionMode: OgeDataViewSelectionMode,
): 'list' | 'listbox' {
  return selectionMode === 'none' ? 'list' : 'listbox';
}

/** The next selected keys after toggling `key`. */
export function ogeDataViewToggleSelection(
  mode: OgeDataViewSelectionMode,
  keys: readonly OgeDataViewKey[],
  key: OgeDataViewKey,
): OgeDataViewKey[] {
  if (mode === 'none') return [...keys];
  const has = keys.includes(key);
  if (mode === 'single') return has ? [] : [key];
  return has ? keys.filter((k) => k !== key) : [...keys, key];
}

/**
 * The roving tab stop of a listbox page: the last focused index while it is
 * still on the page, else the first selected item on the page, else 0.
 * `-1` for an empty page.
 */
export function ogeDataViewTabStop(
  pageKeys: readonly OgeDataViewKey[],
  focusIndex: number,
  selectedKeys: readonly OgeDataViewKey[],
): number {
  if (!pageKeys.length) return -1;
  if (focusIndex >= 0 && focusIndex < pageKeys.length) return focusIndex;
  const selected = pageKeys.findIndex((key) => selectedKeys.includes(key));
  return selected >= 0 ? selected : 0;
}

/** What a key press asks a listbox option for. */
export type OgeDataViewKeyIntent =
  | { readonly type: 'move'; readonly index: number }
  | { readonly type: 'page'; readonly delta: -1 | 1 }
  | { readonly type: 'toggle' }
  | { readonly type: 'selectAll' };

/** Inputs of {@link ogeDataViewKeyIntent}. */
export interface OgeDataViewKeyInput {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

/**
 * The 2-D keyboard map of a selectable data view. Left / Right step in
 * reading order (mirrored in RTL), Up / Down jump a row (`columns` items,
 * staying put at the edge), Home / End go to the page's ends, PageUp /
 * PageDown turn the page, Space / Enter toggle, Ctrl+A selects everything
 * in a multiple listbox. `null` = not ours (let the browser have it).
 */
export function ogeDataViewKeyIntent(
  input: OgeDataViewKeyInput,
  state: {
    readonly index: number;
    readonly count: number;
    readonly columns: number;
    readonly rtl: boolean;
    readonly multiple: boolean;
  },
): OgeDataViewKeyIntent | null {
  const { index, count, rtl } = state;
  const columns = Math.max(1, Math.floor(state.columns) || 1);
  const last = count - 1;
  const move = (to: number): OgeDataViewKeyIntent => ({
    type: 'move',
    index: Math.min(Math.max(0, to), Math.max(0, last)),
  });
  switch (input.key) {
    case 'ArrowRight':
      return move(index + (rtl ? -1 : 1));
    case 'ArrowLeft':
      return move(index + (rtl ? 1 : -1));
    case 'ArrowDown':
      return move(index + columns > last ? index : index + columns);
    case 'ArrowUp':
      return move(index - columns < 0 ? index : index - columns);
    case 'Home':
      return move(0);
    case 'End':
      return move(last);
    case 'PageDown':
      return { type: 'page', delta: 1 };
    case 'PageUp':
      return { type: 'page', delta: -1 };
    case ' ':
    case 'Enter':
      return { type: 'toggle' };
    case 'a':
    case 'A':
      return state.multiple && (input.ctrlKey || input.metaKey)
        ? { type: 'selectAll' }
        : null;
    default:
      return null;
  }
}

/**
 * How many columns the items currently render in: the number of items that
 * share the first item's row. `1` when nothing is measured (SSR, jsdom, a
 * hidden view), which keeps Up / Down single steps there.
 */
export function ogeDataViewMeasureColumns(
  items: readonly HTMLElement[],
): number {
  const first = items[0];
  if (!first || !first.offsetWidth) return 1;
  const top = first.offsetTop;
  let columns = 0;
  for (const item of items) {
    if (Math.abs(item.offsetTop - top) > 1) break;
    columns++;
  }
  return Math.max(1, columns);
}

/** The CSS custom properties the host writes for the layout. */
export function ogeDataViewStyleVars(options: {
  minItemWidth: number;
  columns?: number | null;
  gap?: number | string | null;
}): Record<string, string> {
  const vars: Record<string, string> = {
    '--oge-data-view-min-item-width': `${Math.max(1, options.minItemWidth)}px`,
  };
  if (options.columns && options.columns > 0)
    vars['--oge-data-view-columns'] = String(Math.floor(options.columns));
  if (options.gap !== null && options.gap !== undefined)
    vars['--oge-data-view-gap'] =
      typeof options.gap === 'number' ? `${options.gap}px` : options.gap;
  return vars;
}
