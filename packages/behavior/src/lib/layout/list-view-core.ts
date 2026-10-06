/**
 * The framework-free half of the list view (W8d): the vocabulary, the message
 * catalog, the config, and every decision both render layers share — item
 * keys and texts, search filtering, the flat row model with group headers,
 * the virtual window split into group segments (sticky headers included), the
 * keyboard / click selection reducers, swipe-action geometry and the
 * load-more trigger.
 *
 * Semantics. A selectable list is a WAI-ARIA APG **listbox**: the scroll
 * viewport is the focusable `role="listbox"` and points at the active
 * `option` with `aria-activedescendant` — the APG-endorsed focus model for a
 * virtualized list, because the active option only has to be *rendered*, not
 * focused, and keyboard navigation scrolls it into the window first. A list
 * with `selectionMode: 'none'` is a `role="list"` of `listitem`s with a roving
 * tab stop (a list is not a composite widget, so it has no active
 * descendant). Groups are always rendered as segments — `role="group"` with an
 * `aria-label` in a listbox, a `listitem` holding a nested `list` in a plain
 * list — so the same DOM works windowed and not; the visible group header is
 * `aria-hidden` (the segment's label already says it) and `position: sticky`
 * inside its segment, which gives the "next header pushes the previous one
 * out" effect for free. Items carry `aria-setsize` / `aria-posinset` over the
 * whole (filtered) list, since windowing hides the rest of it.
 */
import {
  OffsetTree,
  computeWindow,
  edgeEnabledIndex,
  foldText,
  matchByPrefix,
  stepEnabledIndex,
  type OgeTypeAheadBuffer,
  type ViewportWindow,
} from '@oge-ui/core';

/** Identity of an item. */
export type OgeListViewKey = string | number;

/** `none` renders a plain list, `single` / `multiple` an APG listbox. */
export type OgeListViewSelectionMode = 'none' | 'single' | 'multiple';

/**
 * How more items are requested: `none` (the app owns paging), `button` (a
 * "Load more" button under the list) or `scroll` (infinite scroll — when the
 * viewport nears the end).
 */
export type OgeListViewPageLoadMode = 'none' | 'button' | 'scroll';

/** How the search text matches an item's search fields. */
export type OgeListViewSearchMode = 'contains' | 'startsWith';

/** A field name, or a function reading the value from an item. */
export type OgeListViewExpr<T, R = unknown> = string | ((item: T) => R);

/** Colour of a swipe / hover action. */
export type OgeListViewActionSeverity =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/** A per-item action revealed by a swipe (touch) or on hover / focus. */
export interface OgeListViewItemAction {
  /** Identity reported in `itemActionClick`. */
  key: string;
  /** Visible text and accessible name of the action. */
  label: string;
  /** SVG path data (`d`, 24×24 viewBox) drawn instead of the label. */
  icon?: string;
  /** Colour of the action; `danger` for destructive ones. */
  severity?: OgeListViewActionSeverity;
  /**
   * The keyboard twin: an `aria-keyshortcuts` value (`'Delete'`,
   * `'Shift+A'`) the active item answers to.
   */
  shortcut?: string;
}

/** Options object form of the `virtualScroll` input. */
export interface OgeListViewVirtualScrollOptions {
  /** Fixed item row height in px (default {@link OGE_LIST_VIEW_ITEM_HEIGHT}). */
  itemHeight?: number;
  /** Fixed group header height in px (default {@link OGE_LIST_VIEW_GROUP_HEIGHT}). */
  groupHeaderHeight?: number;
  /** Rows rendered outside the viewport on each side (default 6). */
  overscan?: number;
}

/** Default fixed item height of a virtualized list (px) — matches the CSS. */
export const OGE_LIST_VIEW_ITEM_HEIGHT = 44;
/** Default fixed group header height of a virtualized list (px). */
export const OGE_LIST_VIEW_GROUP_HEIGHT = 32;
/** Default overscan of a virtualized list (rows). */
export const OGE_LIST_VIEW_OVERSCAN = 6;
/** Distance (px) from the end at which infinite scroll asks for more. */
export const OGE_LIST_VIEW_LOAD_THRESHOLD = 120;
/** Viewport height (px) assumed before the first measurement. */
export const OGE_LIST_VIEW_FALLBACK_HEIGHT = 320;

/** Every user-facing string the list view renders, aria labels included. */
export interface OgeListViewMessages {
  /** Accessible name of the list when the app gives none. */
  listLabel: string;
  /** Accessible name of the search field. */
  searchLabel: string;
  /** Placeholder of the search field. */
  searchPlaceholder: string;
  /** Accessible name of the search field's clear button. */
  clearSearch: string;
  /** Text of the load-more button. */
  loadMore: string;
  /** Text of the loading row (and the announcement while loading). */
  loading: string;
  /** Empty state of a list without items. */
  noData: string;
  /** Empty state of a search without matches. */
  noResults: string;
  /** Announced after a search; ICU plural over `{count}`. */
  resultsCount: string;
  /** Announced after more items arrived; ICU plural over `{count}`. */
  loadedCount: string;
  /** Announced after Ctrl+A / `selectAll()`; ICU plural over `{count}`. */
  selectedCount: string;
  /** Description of an item with actions; `{actions}` is the list of labels + keys. */
  itemActions: string;
}

export const OGE_DEFAULT_LIST_VIEW_MESSAGES: OgeListViewMessages = {
  listLabel: 'List',
  searchLabel: 'Search',
  searchPlaceholder: 'Search…',
  clearSearch: 'Clear search',
  loadMore: 'Load more',
  loading: 'Loading…',
  noData: 'No items',
  noResults: 'No matching items',
  resultsCount:
    '{count, plural, =0 {No results} one {# result} other {# results}}',
  loadedCount:
    '{count, plural, one {# more item loaded} other {# more items loaded}}',
  selectedCount:
    '{count, plural, =0 {Selection cleared} one {# item selected} other {# items selected}}',
  itemActions: 'Actions: {actions}',
};

/** Application-wide defaults for `oge-list-view`. */
export interface OgeListViewConfig {
  messages: OgeListViewMessages;
  /** Default for the `selectionMode` input (`none`). */
  selectionMode?: OgeListViewSelectionMode;
  /** Default for the `searchMode` input (`contains`). */
  searchMode?: OgeListViewSearchMode;
  /** Default for the `showSelectionControls` input (`false`). */
  showSelectionControls?: boolean;
  /** Default for the `pageLoadMode` input (`none`). */
  pageLoadMode?: OgeListViewPageLoadMode;
  /**
   * BCP 47 locale of the announced counts; `undefined` = the application
   * locale (Angular `LOCALE_ID`, React the runtime default).
   */
  locale?: string;
}

export const OGE_DEFAULT_LIST_VIEW_CONFIG: OgeListViewConfig = {
  messages: OGE_DEFAULT_LIST_VIEW_MESSAGES,
};

export type OgeListViewConfigInput = Partial<
  Omit<OgeListViewConfig, 'messages'>
> & {
  messages?: Partial<OgeListViewMessages>;
};

export function resolveOgeListViewConfig(
  input: OgeListViewConfigInput | undefined,
): OgeListViewConfig {
  return {
    ...OGE_DEFAULT_LIST_VIEW_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_LIST_VIEW_MESSAGES, ...input?.messages },
  };
}

// --- events ------------------------------------------------------------------

/** The selection changed through a click, Space, Enter, a range or Ctrl+A. */
export interface OgeListViewSelectionChangedEvent<T = unknown> {
  readonly selectedKeys: readonly OgeListViewKey[];
  readonly previousKeys: readonly OgeListViewKey[];
  readonly addedKeys: readonly OgeListViewKey[];
  readonly removedKeys: readonly OgeListViewKey[];
  /** The item the gesture was on (absent for Ctrl+A / `selectAll()`). */
  readonly item?: T;
  readonly event?: Event;
}

/** An item was clicked or activated with Enter. */
export interface OgeListViewItemClickEvent<T = unknown> {
  readonly item: T;
  readonly key: OgeListViewKey;
  /** Position in the (filtered) item list. */
  readonly index: number;
  readonly event?: Event;
}

/** A swipe / hover action ran — by tap, click or its keyboard shortcut. */
export interface OgeListViewItemActionClickEvent<T = unknown> {
  readonly action: OgeListViewItemAction;
  readonly item: T;
  readonly key: OgeListViewKey;
  readonly index: number;
  readonly event?: Event;
}

/** The list asks the app for more items. */
export interface OgeListViewLoadMoreEvent {
  /** `button` — the load-more button; `scroll` — the viewport neared the end. */
  readonly reason: 'button' | 'scroll';
  /** Items the list holds now (the next page's offset). */
  readonly itemCount: number;
}

/** The active (focused) item moved. */
export interface OgeListViewActiveItemChangedEvent<T = unknown> {
  readonly item: T;
  readonly key: OgeListViewKey;
  readonly index: number;
}

// --- items -------------------------------------------------------------------

/** Reads an expression's value from an item (`undefined` for a missing field). */
export function ogeListViewExprValue<T, R = unknown>(
  item: T,
  expr: OgeListViewExpr<T, R> | undefined,
): R | undefined {
  if (expr === undefined || item === null || item === undefined)
    return undefined;
  if (typeof expr === 'function') return expr(item);
  if (typeof item !== 'object') return undefined;
  return (item as Record<string, unknown>)[expr] as R | undefined;
}

/**
 * The key of an item: the `keyExpr` value when it is a string or a number,
 * else — primitives and items without the field — the item itself when it is
 * a primitive, else its index (stable only as long as the order is).
 */
export function ogeListViewKeyOf<T>(
  item: T,
  keyExpr: OgeListViewExpr<T> | undefined,
  index: number,
): OgeListViewKey {
  const value = ogeListViewExprValue(item, keyExpr);
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof item === 'string' || typeof item === 'number') return item;
  return index;
}

/** The display text of an item (`displayExpr`, else the primitive itself). */
export function ogeListViewTextOf<T>(
  item: T,
  displayExpr: OgeListViewExpr<T> | undefined,
): string {
  const value =
    displayExpr === undefined
      ? undefined
      : ogeListViewExprValue(item, displayExpr);
  if (value !== undefined && value !== null) return String(value);
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  return '';
}

/** Search fields: one expression or several. */
export type OgeListViewSearchExpr<T> =
  OgeListViewExpr<T> | readonly OgeListViewExpr<T>[];

/**
 * Items whose search fields match `text` — locale- and accent-insensitive
 * through core's `foldText`, so `istanbul` finds `İstanbul` on every host.
 * Without `searchExpr` the display text is searched.
 */
export function ogeListViewFilter<T>(
  items: readonly T[],
  text: string | null | undefined,
  options: {
    searchExpr?: OgeListViewSearchExpr<T>;
    displayExpr?: OgeListViewExpr<T>;
    mode?: OgeListViewSearchMode;
  } = {},
): readonly T[] {
  const needle = foldText(text ?? '').trim();
  if (!needle) return items;
  const exprs: readonly (OgeListViewExpr<T> | undefined)[] =
    options.searchExpr === undefined
      ? [options.displayExpr]
      : Array.isArray(options.searchExpr)
        ? (options.searchExpr as readonly OgeListViewExpr<T>[])
        : [options.searchExpr as OgeListViewExpr<T>];
  const startsWith = options.mode === 'startsWith';
  return items.filter((item) =>
    exprs.some((expr) => {
      const raw =
        expr === undefined
          ? ogeListViewTextOf(item, undefined)
          : ogeListViewExprValue(item, expr);
      if (raw === undefined || raw === null) return false;
      const hay = foldText(String(raw));
      return startsWith ? hay.startsWith(needle) : hay.includes(needle);
    }),
  );
}

// --- rows --------------------------------------------------------------------

/** A group header row of the flat row model. */
export interface OgeListViewGroupRow {
  readonly kind: 'group';
  /** The group's label (its `groupExpr` value as text). */
  readonly label: string;
  /** Position of the group, 0-based. */
  readonly groupIndex: number;
  /** Items in the group. */
  readonly count: number;
}

/** An item row of the flat row model. */
export interface OgeListViewItemRow<T> {
  readonly kind: 'item';
  readonly item: T;
  readonly key: OgeListViewKey;
  /** Position in the (filtered) item list — the `index` of every event. */
  readonly index: number;
  /** The item's group label, `null` when ungrouped. */
  readonly group: string | null;
}

export type OgeListViewRow<T> = OgeListViewGroupRow | OgeListViewItemRow<T>;

/** The flat row model plus the item ordinal → row index map. */
export interface OgeListViewRows<T> {
  readonly rows: readonly OgeListViewRow<T>[];
  /** `itemRowIndex[i]` is the row index of item `i`. */
  readonly itemRowIndex: readonly number[];
  /** The items in display order (grouping keeps first-appearance group order). */
  readonly items: readonly OgeListViewItemRow<T>[];
  readonly grouped: boolean;
}

/**
 * Builds the flat row model: without `groupExpr` one item row per item; with
 * it, a header row per group (first-appearance order, items keep their
 * relative order) followed by its item rows. Item `index` values follow the
 * display order, so keyboard math runs on them directly.
 */
export function ogeListViewBuildRows<T>(
  items: readonly T[],
  options: {
    keyExpr?: OgeListViewExpr<T>;
    groupExpr?: OgeListViewExpr<T>;
  } = {},
): OgeListViewRows<T> {
  const keyOf = (item: T, i: number) =>
    ogeListViewKeyOf(item, options.keyExpr ?? 'id', i);
  if (options.groupExpr === undefined) {
    const rows = items.map<OgeListViewItemRow<T>>((item, index) => ({
      kind: 'item',
      item,
      key: keyOf(item, index),
      index,
      group: null,
    }));
    return {
      rows,
      itemRowIndex: rows.map((_, i) => i),
      items: rows,
      grouped: false,
    };
  }
  const order: string[] = [];
  const buckets = new Map<string, { item: T; source: number }[]>();
  items.forEach((item, source) => {
    const raw = ogeListViewExprValue(item, options.groupExpr);
    const label = raw === undefined || raw === null ? '' : String(raw);
    let bucket = buckets.get(label);
    if (!bucket) {
      bucket = [];
      buckets.set(label, bucket);
      order.push(label);
    }
    bucket.push({ item, source });
  });
  const rows: OgeListViewRow<T>[] = [];
  const itemRows: OgeListViewItemRow<T>[] = [];
  const itemRowIndex: number[] = [];
  order.forEach((label, groupIndex) => {
    const bucket = buckets.get(label)!;
    rows.push({ kind: 'group', label, groupIndex, count: bucket.length });
    for (const entry of bucket) {
      const row: OgeListViewItemRow<T> = {
        kind: 'item',
        item: entry.item,
        key: keyOf(entry.item, entry.source),
        index: itemRows.length,
        group: label,
      };
      itemRowIndex.push(rows.length);
      rows.push(row);
      itemRows.push(row);
    }
  });
  return { rows, itemRowIndex, items: itemRows, grouped: true };
}

/** Resolved virtualization settings (`null` = not virtualized). */
export interface OgeListViewVirtualSettings {
  itemHeight: number;
  groupHeaderHeight: number;
  overscan: number;
}

/** Normalizes the boolean-or-options `virtualScroll` input. */
export function ogeListViewVirtualSettings(
  input: boolean | OgeListViewVirtualScrollOptions | undefined,
): OgeListViewVirtualSettings | null {
  if (!input) return null;
  const options = input === true ? {} : input;
  return {
    itemHeight: Math.max(1, options.itemHeight ?? OGE_LIST_VIEW_ITEM_HEIGHT),
    groupHeaderHeight: Math.max(
      1,
      options.groupHeaderHeight ?? OGE_LIST_VIEW_GROUP_HEIGHT,
    ),
    overscan: Math.max(0, options.overscan ?? OGE_LIST_VIEW_OVERSCAN),
  };
}

/** The per-row height tree of a virtualized list. */
export function ogeListViewOffsetTree<T>(
  rows: readonly OgeListViewRow<T>[],
  settings: OgeListViewVirtualSettings,
): OffsetTree {
  return new OffsetTree(rows.length, (i) =>
    rows[i].kind === 'group' ? settings.groupHeaderHeight : settings.itemHeight,
  );
}

/** One group segment of the rendered window. */
export interface OgeListViewSegment<T> {
  /** The group label, `null` for an ungrouped list. */
  readonly group: string | null;
  /** Row index of the group header (`-1` ungrouped) — a stable track key. */
  readonly headerRow: number;
  /** Whether the header renders (it is in the window, or pinned). */
  readonly showHeader: boolean;
  /** Group size — feeds the header template context. */
  readonly count: number;
  readonly items: readonly OgeListViewItemRow<T>[];
}

/** The rendered slice of the rows, split into group segments. */
export interface OgeListViewWindow<T> {
  readonly segments: readonly OgeListViewSegment<T>[];
  /** Translate of the rendered slice (px). */
  readonly offsetY: number;
  /** Height of the whole list (px); `0` when not virtualized. */
  readonly totalHeight: number;
}

/**
 * Splits rows `[start, end)` into group segments. When the window starts in
 * the middle of a group, that group's header is **pinned**: rendered anyway
 * at the top of its segment and the slice moved up by its height, so the
 * sticky header stays on screen however far the group scrolled.
 */
export function ogeListViewSegments<T>(
  model: OgeListViewRows<T>,
  window: ViewportWindow | null,
  groupHeaderHeight = 0,
): OgeListViewWindow<T> {
  const rows = model.rows;
  const start = window ? window.start : 0;
  const end = window ? window.end : rows.length;
  let offsetY = window ? window.offsetY : 0;
  const totalHeight = window ? window.totalHeight : 0;
  const segments: OgeListViewSegment<T>[] = [];
  if (!model.grouped) {
    const items = rows.slice(start, end) as OgeListViewItemRow<T>[];
    if (items.length)
      segments.push({
        group: null,
        headerRow: -1,
        showHeader: false,
        count: model.items.length,
        items,
      });
    return { segments, offsetY, totalHeight };
  }
  let current: {
    group: string;
    headerRow: number;
    showHeader: boolean;
    count: number;
    items: OgeListViewItemRow<T>[];
  } | null = null;
  for (let i = start; i < end; i++) {
    const row = rows[i];
    if (row.kind === 'group') {
      current = {
        group: row.label,
        headerRow: i,
        showHeader: true,
        count: row.count,
        items: [],
      };
      segments.push(current);
      continue;
    }
    if (!current) {
      // the window starts inside a group: pin its header
      let h = i - 1;
      while (h >= 0 && rows[h].kind !== 'group') h--;
      const header = rows[h] as OgeListViewGroupRow | undefined;
      current = {
        group: row.group ?? '',
        headerRow: h,
        showHeader: true,
        count: header?.count ?? 0,
        items: [],
      };
      segments.push(current);
      if (window) offsetY -= groupHeaderHeight;
    }
    current.items.push(row);
  }
  return { segments, offsetY, totalHeight };
}

/** The virtual window for a scroll position (`null` when not virtualized). */
export function ogeListViewWindow<T>(
  model: OgeListViewRows<T>,
  tree: OffsetTree | null,
  settings: OgeListViewVirtualSettings | null,
  scrollTop: number,
  viewportHeight: number,
): OgeListViewWindow<T> {
  if (!tree || !settings) return ogeListViewSegments(model, null);
  const win = computeWindow(
    scrollTop,
    viewportHeight > 0 ? viewportHeight : OGE_LIST_VIEW_FALLBACK_HEIGHT,
    tree,
    settings.overscan,
  );
  return ogeListViewSegments(model, win, settings.groupHeaderHeight);
}

/**
 * The scroll offset that brings `[offset, offset + height)` fully into view
 * below a sticky inset (the pinned group header), or `null` when it already
 * is.
 */
export function ogeListViewScrollTarget(
  offset: number,
  height: number,
  scrollTop: number,
  viewportHeight: number,
  stickyInset = 0,
): number | null {
  if (offset - stickyInset < scrollTop)
    return Math.max(0, offset - stickyInset);
  if (offset + height > scrollTop + viewportHeight)
    return Math.max(0, offset + height - viewportHeight);
  return null;
}

/** Whether infinite scroll should ask for more at this scroll position. */
export function ogeListViewShouldLoadMore(
  scrollTop: number,
  viewportHeight: number,
  scrollHeight: number,
  threshold = OGE_LIST_VIEW_LOAD_THRESHOLD,
): boolean {
  if (viewportHeight <= 0 || scrollHeight <= 0) return false;
  return scrollTop + viewportHeight >= scrollHeight - threshold;
}

// --- semantics ---------------------------------------------------------------

/** `listbox` when the list selects, `list` otherwise. */
export function ogeListViewRole(
  mode: OgeListViewSelectionMode,
): 'listbox' | 'list' {
  return mode === 'none' ? 'list' : 'listbox';
}

/** A DOM-safe id for an item row (`[a-zA-Z0-9_-]` only). */
export function ogeListViewItemId(prefix: string, key: OgeListViewKey): string {
  return `${prefix}-item-${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/** The `aria-keyshortcuts` value of an item with actions (`null` = none). */
export function ogeListViewActionShortcuts(
  actions: readonly OgeListViewItemAction[] | undefined,
): string | null {
  const keys = (actions ?? [])
    .map((action) => action.shortcut)
    .filter((s): s is string => !!s);
  return keys.length ? keys.join(' ') : null;
}

/** The text listing an item's actions ("Delete (Delete), Archive (Shift+A)"). */
export function ogeListViewActionsText(
  actions: readonly OgeListViewItemAction[] | undefined,
  messages: OgeListViewMessages,
): string {
  const list = (actions ?? [])
    .map((a) => (a.shortcut ? `${a.label} (${a.shortcut})` : a.label))
    .join(', ');
  return list ? messages.itemActions.replace('{actions}', list) : '';
}

/** The slice of a keyboard event the reducers read. */
export interface OgeListViewKeyInput {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/** Whether a key event matches an `aria-keyshortcuts` token (`Shift+A`). */
export function ogeListViewMatchesShortcut(
  event: OgeListViewKeyInput,
  shortcut: string,
): boolean {
  const parts = shortcut.split('+');
  const key = parts.pop() ?? '';
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  const want = (name: string) => mods.has(name);
  if (!!event.shiftKey !== want('shift')) return false;
  if (
    !!(event.ctrlKey || event.metaKey) !==
    (want('control') || want('ctrl') || want('meta'))
  )
    return false;
  if (!!event.altKey !== want('alt')) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}

/** The action whose shortcut a key event matches, if any. */
export function ogeListViewActionForKey(
  event: OgeListViewKeyInput,
  actions: readonly OgeListViewItemAction[] | undefined,
): OgeListViewItemAction | null {
  for (const action of actions ?? []) {
    for (const token of (action.shortcut ?? '').split(' ').filter(Boolean)) {
      if (ogeListViewMatchesShortcut(event, token)) return action;
    }
  }
  return null;
}

// --- selection ---------------------------------------------------------------

/** Selection after a plain click / Space on `key`. */
export function ogeListViewToggle(
  selected: readonly OgeListViewKey[],
  key: OgeListViewKey,
  mode: OgeListViewSelectionMode,
): OgeListViewKey[] {
  if (mode === 'none') return [...selected];
  // single selection never deselects by clicking (a radio-like listbox)
  if (mode === 'single') return [key];
  const has = selected.includes(key);
  return has ? selected.filter((k) => k !== key) : [...selected, key];
}

/**
 * Keys of the enabled items between `from` and `to` (inclusive, either
 * order), merged into `base` — the Shift range of a multiple-selection list.
 */
export function ogeListViewRange(
  keys: readonly OgeListViewKey[],
  from: number,
  to: number,
  isDisabled: (index: number) => boolean,
  base: readonly OgeListViewKey[] = [],
): OgeListViewKey[] {
  const lo = Math.max(0, Math.min(from, to));
  const hi = Math.min(keys.length - 1, Math.max(from, to));
  const out = [...base];
  for (let i = lo; i <= hi; i++) {
    if (isDisabled(i) || out.includes(keys[i])) continue;
    out.push(keys[i]);
  }
  return out;
}

/** The added / removed keys between two selections. */
export function ogeListViewSelectionDiff(
  previous: readonly OgeListViewKey[],
  next: readonly OgeListViewKey[],
): { added: OgeListViewKey[]; removed: OgeListViewKey[] } {
  return {
    added: next.filter((k) => !previous.includes(k)),
    removed: previous.filter((k) => !next.includes(k)),
  };
}

/** Whether two key lists hold the same keys in the same order. */
export function ogeListViewSameKeys(
  a: readonly OgeListViewKey[],
  b: readonly OgeListViewKey[],
): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/** What the reducers read about the list. */
export interface OgeListViewNavState {
  readonly mode: OgeListViewSelectionMode;
  /** Item keys in display order. */
  readonly keys: readonly OgeListViewKey[];
  /** Display texts in display order (type-ahead). */
  readonly texts: readonly string[];
  readonly isDisabled: (index: number) => boolean;
  /** Active item index (`-1` = none yet). */
  readonly active: number;
  /** Anchor of the Shift range (`-1` = the active item). */
  readonly anchor: number;
  readonly selected: readonly OgeListViewKey[];
  /** Items per page for PageUp / PageDown. */
  readonly pageSize: number;
  readonly actions?: readonly OgeListViewItemAction[];
  readonly typeAhead?: OgeTypeAheadBuffer;
}

/** The outcome of a key or click: what to apply, nothing more. */
export interface OgeListViewNavResult {
  /** New active index (unchanged when absent). */
  readonly active?: number;
  readonly anchor?: number;
  /** New selection (unchanged when absent). */
  readonly selected?: OgeListViewKey[];
  /** Enter on an item — emit `itemClick`. */
  readonly activate?: boolean;
  /** A matched action shortcut — emit `itemActionClick`. */
  readonly action?: OgeListViewItemAction;
  /** Ctrl+A ran (announce the count). */
  readonly selectAll?: boolean;
  /** The key was handled — `preventDefault()` it. */
  readonly handled: boolean;
}

const NOT_HANDLED: OgeListViewNavResult = { handled: false };

/** The first enabled index (`-1` when every item is disabled). */
export function ogeListViewFirstEnabled(state: {
  keys: readonly unknown[];
  isDisabled: (index: number) => boolean;
}): number {
  return edgeEnabledIndex(state.keys.length, 1, state.isDisabled) ?? -1;
}

/**
 * The item holding the tab stop / active descendant on first paint: the
 * remembered active item, else the first selected one, else the first
 * enabled item.
 */
export function ogeListViewInitialActive(
  keys: readonly OgeListViewKey[],
  selected: readonly OgeListViewKey[],
  isDisabled: (index: number) => boolean,
  active: number,
): number {
  if (active >= 0 && active < keys.length && !isDisabled(active)) return active;
  const firstSelected = keys.findIndex(
    (k, i) => selected.includes(k) && !isDisabled(i),
  );
  if (firstSelected >= 0) return firstSelected;
  return edgeEnabledIndex(keys.length, 1, isDisabled) ?? -1;
}

/** Index `steps` enabled items away from `from`, clamped at the ends. */
function stepClamped(
  count: number,
  from: number,
  steps: number,
  isDisabled: (index: number) => boolean,
): number {
  const dir = steps < 0 ? -1 : 1;
  let index = from;
  for (let n = 0; n < Math.abs(steps); n++) {
    const next = stepEnabledIndex(count, index, dir, isDisabled, false);
    if (next === null) break;
    index = next;
  }
  return index;
}

/**
 * The keyboard reducer (APG listbox, plus the list's arrow navigation):
 * ↑/↓ move, Home/End jump, PageUp/PageDown move a page, printable keys
 * type-ahead, Space toggles (selects in single mode), Enter activates (and
 * selects in single mode). Multiple selection adds Shift+↑/↓ (move and
 * select), Shift+Space (range from the anchor), Ctrl+Shift+Home/End (range
 * to the edge) and Ctrl+A (all, or none when all are selected). An action
 * shortcut runs its action. Arrow keys do not wrap.
 */
export function ogeListViewKeyDown(
  state: OgeListViewNavState,
  event: OgeListViewKeyInput,
): OgeListViewNavResult {
  const count = state.keys.length;
  if (count === 0) return NOT_HANDLED;
  const multi = state.mode === 'multiple';
  const selectable = state.mode !== 'none';
  const ctrl = !!(event.ctrlKey || event.metaKey);
  const active =
    state.active >= 0 ? state.active : ogeListViewFirstEnabled(state);
  if (active < 0) return NOT_HANDLED;
  const anchor = state.anchor >= 0 ? state.anchor : active;

  const action =
    state.actions && !state.isDisabled(active)
      ? ogeListViewActionForKey(event, state.actions)
      : null;
  if (action) return { action, handled: true };

  const moveTo = (target: number): OgeListViewNavResult => {
    if (multi && event.shiftKey) {
      // Shift+arrow / Ctrl+Shift+Home/End extend the selection
      const range = ogeListViewRange(
        state.keys,
        anchor,
        target,
        state.isDisabled,
        state.selected,
      );
      return { active: target, selected: range, handled: true };
    }
    return { active: target, anchor: target, handled: true };
  };

  switch (event.key) {
    case 'ArrowDown':
      if (event.altKey) return NOT_HANDLED;
      return moveTo(stepClamped(count, active, 1, state.isDisabled));
    case 'ArrowUp':
      if (event.altKey) return NOT_HANDLED;
      return moveTo(stepClamped(count, active, -1, state.isDisabled));
    case 'Home': {
      const target = edgeEnabledIndex(count, 1, state.isDisabled) ?? active;
      if (multi && event.shiftKey && ctrl) return moveTo(target);
      return { active: target, anchor: target, handled: true };
    }
    case 'End': {
      const target = edgeEnabledIndex(count, -1, state.isDisabled) ?? active;
      if (multi && event.shiftKey && ctrl) return moveTo(target);
      return { active: target, anchor: target, handled: true };
    }
    case 'PageDown':
      return moveTo(
        stepClamped(
          count,
          active,
          Math.max(1, state.pageSize),
          state.isDisabled,
        ),
      );
    case 'PageUp':
      return moveTo(
        stepClamped(
          count,
          active,
          -Math.max(1, state.pageSize),
          state.isDisabled,
        ),
      );
    case ' ':
    case 'Spacebar': {
      if (!selectable || state.isDisabled(active))
        return selectable ? { handled: true } : NOT_HANDLED;
      if (multi && event.shiftKey) {
        return {
          selected: ogeListViewRange(
            state.keys,
            anchor,
            active,
            state.isDisabled,
            state.selected,
          ),
          handled: true,
        };
      }
      return {
        selected: ogeListViewToggle(
          state.selected,
          state.keys[active],
          state.mode,
        ),
        anchor: active,
        handled: true,
      };
    }
    case 'Enter': {
      if (state.isDisabled(active)) return { handled: true };
      const result: OgeListViewNavResult = { activate: true, handled: true };
      if (
        state.mode === 'single' &&
        !state.selected.includes(state.keys[active])
      )
        return { ...result, selected: [state.keys[active]], anchor: active };
      return result;
    }
    default:
      break;
  }

  if (multi && ctrl && !event.altKey && event.key.toLowerCase() === 'a') {
    const enabled = state.keys.filter((_, i) => !state.isDisabled(i));
    const all = enabled.every((k) => state.selected.includes(k));
    return {
      selected: all ? [] : enabled,
      selectAll: true,
      handled: true,
    };
  }

  if (
    state.typeAhead &&
    event.key.length === 1 &&
    !ctrl &&
    !event.altKey &&
    event.key !== ' '
  ) {
    const prefix = state.typeAhead.push(event.key);
    const match = matchByPrefix(state.texts, prefix, active, state.isDisabled);
    if (match === null) return { handled: true };
    return { active: match, anchor: match, handled: true };
  }
  return NOT_HANDLED;
}

/** The slice of a click the reducer reads. */
export interface OgeListViewClickInput {
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

/**
 * The click reducer: the item becomes active; in single mode it is
 * selected; in multiple mode a plain click or Ctrl+click toggles it and
 * Shift+click selects the range from the anchor.
 */
export function ogeListViewClick(
  state: OgeListViewNavState,
  index: number,
  event: OgeListViewClickInput = {},
): OgeListViewNavResult {
  if (index < 0 || index >= state.keys.length || state.isDisabled(index))
    return NOT_HANDLED;
  const key = state.keys[index];
  if (state.mode === 'none')
    return { active: index, anchor: index, activate: true, handled: true };
  if (state.mode === 'multiple' && event.shiftKey) {
    const anchor = state.anchor >= 0 ? state.anchor : index;
    return {
      active: index,
      selected: ogeListViewRange(
        state.keys,
        anchor,
        index,
        state.isDisabled,
        state.selected,
      ),
      activate: true,
      handled: true,
    };
  }
  return {
    active: index,
    anchor: index,
    selected: ogeListViewToggle(state.selected, key, state.mode),
    activate: true,
    handled: true,
  };
}

// --- swipe -------------------------------------------------------------------

/** Travel (px) a swipe reveals: `0` closed, `trayWidth` fully open. */
export function ogeListViewSwipeReveal(
  deltaX: number,
  trayWidth: number,
  rtl: boolean,
  startOpen = false,
): number {
  // the tray sits at the inline end: LTR reveals with a leftward swipe
  const toward = rtl ? deltaX : -deltaX;
  const base = startOpen ? trayWidth : 0;
  return Math.min(Math.max(base + toward, 0), Math.max(0, trayWidth));
}

/** The content translate (px, physical x) for a reveal. */
export function ogeListViewSwipeTranslate(
  reveal: number,
  rtl: boolean,
): number {
  return reveal === 0 ? 0 : rtl ? reveal : -reveal;
}

/** Whether a released swipe leaves the tray open (past half its width). */
export function ogeListViewSwipeOpens(
  reveal: number,
  trayWidth: number,
): boolean {
  return trayWidth > 0 && reveal >= trayWidth / 2;
}

/**
 * Whether a touch gesture is a horizontal swipe (decided on the first moves):
 * `true` swipe, `false` a vertical scroll — abandon it, `null` undecided.
 */
export function ogeListViewSwipeAxis(
  deltaX: number,
  deltaY: number,
): boolean | null {
  const ax = Math.abs(deltaX);
  const ay = Math.abs(deltaY);
  if (ax < 6 && ay < 6) return null;
  return ax > ay;
}

/** Index of the item row element an event target is inside (`-1` = none). */
export function ogeListViewIndexFromTarget(
  target: EventTarget | null,
  host: Element | null,
): number {
  const el = (target as Element | null)?.closest?.('[data-oge-list-index]');
  if (!el || (host && !host.contains(el))) return -1;
  const raw = Number(el.getAttribute('data-oge-list-index'));
  return Number.isInteger(raw) ? raw : -1;
}

/** Key of the action glyph an event target is inside (`null` = none). */
export function ogeListViewActionFromTarget(
  target: EventTarget | null,
): string | null {
  const el = (target as Element | null)?.closest?.('[data-oge-list-action]');
  return el?.getAttribute('data-oge-list-action') ?? null;
}
