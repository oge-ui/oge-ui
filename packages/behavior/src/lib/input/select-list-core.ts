import {
  resolveDisabled,
  resolveDisplay,
  resolveValue,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectImageExpr,
  type OgeSelectItemsFn,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from './select-expr';

/**
 * A writable reactive cell — callable getter plus `set`. The Angular adapter
 * backs it with `signal()`, the React adapter with plain state and a
 * change-notification, so the select-list machine itself stays framework-free.
 */
export interface OgeReactiveCell<T> {
  (): T;
  set(value: T): void;
}

/** How the machine creates its reactive state — supplied per render layer. */
export interface OgeReactivityAdapter {
  cell<T>(initial: T): OgeReactiveCell<T>;
  derived<T>(compute: () => T): () => T;
}

/** A rendered dropdown row: a group header or an option carrying its absolute index. */
export type OgeSelectListRow<TItem> =
  | { kind: 'group'; label: string }
  | { kind: 'item'; item: TItem; index: number };

type ItemsState<TItem> =
  | { status: 'static' }
  | { status: 'idle' }
  | { status: 'loading'; runId: number }
  | { status: 'ready'; items: readonly TItem[] }
  | { status: 'error' };

/** Reactive getters the owning component wires into the machine. */
export interface OgeSelectListCoreDeps<TItem> {
  /** The owning field's input id — option/listbox ids derive from it. */
  inputId: () => string;
  /** Popup visibility — gates `activeDescendant`. */
  opened: () => boolean;
  /** Item source: an array, or a function invoked lazily via `ensureItemsLoaded`. */
  items: () => readonly TItem[] | OgeSelectItemsFn<TItem>;
  displayExpr: () => OgeSelectDisplayExpr<TItem> | undefined;
  valueExpr: () => OgeSelectValueExpr<TItem> | undefined;
  disabledExpr: () => OgeSelectDisabledExpr<TItem> | undefined;
  imageExpr: () => OgeSelectImageExpr<TItem> | undefined;
  searchExpr: () => OgeSelectSearchExpr<TItem> | undefined;
  searchEnabled: () => boolean;
  searchMode: () => OgeSelectSearchMode;
  /** Debounce before typed text filters the list; `0` filters synchronously. */
  searchDebounceMs: () => number;
  /** Characters required before the filter narrows the list (default `0`). */
  minSearchLength?: () => number;
  /** Below `minSearchLength`: show the full list (`true`) or nothing (`false`). */
  showDataBeforeSearch?: () => boolean;
  /** Caps the filtered list length (autocomplete `maxItemCount`). */
  maxItems?: () => number | undefined;
  /** Groups flat items under headers; items re-order by first-seen group. */
  groupBy?: () => OgeSelectGroupExpr<TItem> | undefined;
  /** Component-specific narrowing applied before the search filter (e.g. hiding selected items). */
  preFilterItems?: (items: readonly TItem[]) => readonly TItem[];
  /** Overrides how the active option is brought into view (virtual mode uses offset math). */
  scrollActiveIntoView?: (index: number) => void;
}

/**
 * Framework-free list machine shared by the dropdown editors (select box,
 * tag box, autocomplete, radio-shaped pickers) in **both** render layers:
 * expression resolution, option ids, active-option bookkeeping, client-side
 * filtering with debounce, flat-data grouping and the lazy items-function
 * state machine (ADR 0001 Faz 3, the button/panel pattern applied to lists).
 *
 * Reactivity is injected: the Angular `SelectListEngine` constructs it with
 * `signal`/`computed`, the React hook with a version-bumping store — the
 * machine body is identical code either way.
 */
export class OgeSelectListCore<TItem> {
  /** Search text while the user is filtering; `null` = not searching. */
  readonly searchText: OgeReactiveCell<string | null>;
  /** Index of the keyboard-active option within `visibleItems`. */
  readonly activeIndex: OgeReactiveCell<number>;
  readonly itemsStatus: () => ItemsState<TItem>['status'];
  /** The full item set — empty until a lazy source resolves. */
  readonly resolvedItems: () => readonly TItem[];
  /**
   * Items after the client-side filter (and `groupBy` reordering); the popup
   * renders exactly these, keyboard indices point into this array.
   */
  readonly visibleItems: () => readonly TItem[];
  /** Visible items interleaved with group headers for rendering. */
  readonly rows: () => readonly OgeSelectListRow<TItem>[];
  readonly activeDescendant: () => string | null;

  private readonly itemsState: OgeReactiveCell<ItemsState<TItem>>;
  /** `searchText` after the debounce — drives the filter. */
  private readonly filterText: OgeReactiveCell<string | null>;
  private loadSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly deps: OgeSelectListCoreDeps<TItem>,
    rx: OgeReactivityAdapter,
  ) {
    this.itemsState = rx.cell<ItemsState<TItem>>({ status: 'static' });
    this.searchText = rx.cell<string | null>(null);
    this.filterText = rx.cell<string | null>(null);
    this.activeIndex = rx.cell(-1);

    this.itemsStatus = rx.derived(() => this.itemsState().status);
    this.resolvedItems = rx.derived<readonly TItem[]>(() => {
      const state = this.itemsState();
      if (state.status === 'ready') return state.items;
      if (state.status === 'static') {
        const items = this.deps.items();
        return Array.isArray(items) ? items : [];
      }
      return [];
    });
    const filteredItems = rx.derived<readonly TItem[]>(() => {
      const items = this.filterBySearch();
      const max = this.deps.maxItems?.();
      return max !== undefined && items.length > max
        ? items.slice(0, max)
        : items;
    });
    this.visibleItems = rx.derived<readonly TItem[]>(() => {
      let items = filteredItems();
      const expr = this.deps.groupBy?.();
      if (expr !== undefined) {
        const buckets = new Map<string, TItem[]>();
        for (const item of items) {
          const key = this.groupKeyOf(item);
          const bucket = buckets.get(key);
          if (bucket) bucket.push(item);
          else buckets.set(key, [item]);
        }
        items = Array.from(buckets.values()).flat();
      }
      return items;
    });
    this.rows = rx.derived<readonly OgeSelectListRow<TItem>[]>(() => {
      const items = this.visibleItems();
      const expr = this.deps.groupBy?.();
      if (expr === undefined) {
        return items.map((item, index) => ({
          kind: 'item' as const,
          item,
          index,
        }));
      }
      const rows: OgeSelectListRow<TItem>[] = [];
      let previousKey: string | null = null;
      items.forEach((item, index) => {
        const key = this.groupKeyOf(item);
        if (index === 0 || key !== previousKey) {
          rows.push({ kind: 'group', label: key });
        }
        previousKey = key;
        rows.push({ kind: 'item', item, index });
      });
      return rows;
    });
    this.activeDescendant = rx.derived<string | null>(() =>
      this.deps.opened() && this.activeIndex() >= 0
        ? this.optionId(this.activeIndex())
        : null,
    );
  }

  // --- ids -------------------------------------------------------------------

  get listboxId(): string {
    return `${this.deps.inputId()}-listbox`;
  }

  optionId(index: number): string {
    return `${this.deps.inputId()}-option-${index}`;
  }

  // --- expression resolution -------------------------------------------------

  displayOf(item: TItem): string {
    return resolveDisplay(this.deps.displayExpr(), item);
  }

  itemValue(item: TItem): unknown {
    return resolveValue(this.deps.valueExpr(), item);
  }

  isItemDisabled(item: TItem): boolean {
    return resolveDisabled(this.deps.disabledExpr(), item);
  }

  imageOf(item: TItem): string | null {
    const expr = this.deps.imageExpr();
    if (expr === undefined) return null;
    const url =
      typeof expr === 'function'
        ? expr(item)
        : (item as Record<string, unknown>)[expr];
    return typeof url === 'string' && url.length > 0 ? url : null;
  }

  searchStrings(item: TItem): string[] {
    const expr = this.deps.searchExpr();
    if (typeof expr === 'function') return [expr(item)];
    if (typeof expr === 'string') {
      return [String((item as Record<string, unknown>)[expr] ?? '')];
    }
    if (Array.isArray(expr)) {
      return expr.map((key) =>
        String((item as Record<string, unknown>)[key] ?? ''),
      );
    }
    return [this.displayOf(item)];
  }

  groupKeyOf(item: TItem): string {
    const expr = this.deps.groupBy?.();
    if (typeof expr === 'function') return expr(item);
    if (typeof expr === 'string') {
      return String((item as Record<string, unknown>)[expr] ?? '');
    }
    return '';
  }

  // --- items source (array or lazy function) ---------------------------------

  /** Re-seeds the state machine after the `items` input changes (array ↔ function). */
  syncItemsSource(): void {
    this.itemsState.set(
      typeof this.deps.items() === 'function'
        ? { status: 'idle' }
        : { status: 'static' },
    );
  }

  /** Invokes a lazy items function once; stale resolutions lose to the runId guard. */
  ensureItemsLoaded(): void {
    const items = this.deps.items();
    if (typeof items !== 'function') return;
    const state = this.itemsState();
    if (state.status === 'ready' || state.status === 'loading') return;
    const result = items();
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      const runId = ++this.loadSeq;
      this.itemsState.set({ status: 'loading', runId });
      (result as PromiseLike<readonly TItem[]>).then(
        (loaded) => {
          const current = this.itemsState();
          if (current.status === 'loading' && current.runId === runId) {
            this.itemsState.set({ status: 'ready', items: loaded });
          }
        },
        () => {
          const current = this.itemsState();
          if (current.status === 'loading' && current.runId === runId) {
            this.itemsState.set({ status: 'error' });
          }
        },
      );
    } else {
      this.itemsState.set({
        status: 'ready',
        items: result as readonly TItem[],
      });
    }
  }

  // --- search / filter -------------------------------------------------------

  /** Sets the search text; the filter follows after `searchDebounceMs`. */
  setSearch(text: string): void {
    this.searchText.set(text);
    this.scheduleFilter(text);
  }

  /** Clears the search text and filter immediately. */
  resetSearch(): void {
    if (this.searchText() !== null) this.searchText.set(null);
    this.scheduleFilter(null);
  }

  private scheduleFilter(text: string | null): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    const ms = this.deps.searchDebounceMs();
    if (text === null || !ms) {
      this.filterText.set(text);
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.filterText.set(text);
    }, ms);
  }

  private filterBySearch(): readonly TItem[] {
    const base = this.resolvedItems();
    const items = this.deps.preFilterItems?.(base) ?? base;
    if (!this.deps.searchEnabled()) return items;
    const term = this.filterText();
    const typed = (term ?? '').trim();
    const min = this.deps.minSearchLength?.() ?? 0;
    if (min > 0 && typed.length < min) {
      return (this.deps.showDataBeforeSearch?.() ?? false) ? items : [];
    }
    if (term === null || typed.length === 0) return items;
    const trimmed = typed.toLocaleLowerCase();
    const startsWith = this.deps.searchMode() === 'startswith';
    return items.filter((item) =>
      this.searchStrings(item).some((text) => {
        const lower = text.toLocaleLowerCase();
        return startsWith ? lower.startsWith(trimmed) : lower.includes(trimmed);
      }),
    );
  }

  // --- active-option bookkeeping ---------------------------------------------

  /** First (`direction = 1`) or last (`-1`) enabled index, `-1` when none. */
  edgeEnabledIndex(direction: 1 | -1): number {
    const items = this.visibleItems();
    const start = direction === 1 ? 0 : items.length - 1;
    for (let i = start; i >= 0 && i < items.length; i += direction) {
      if (!this.isItemDisabled(items[i])) return i;
    }
    return -1;
  }

  /** Moves the active option by `delta`, skipping disabled items, clamped at the edges. */
  moveActive(delta: number): void {
    const items = this.visibleItems();
    if (items.length === 0) return;
    const direction = delta > 0 ? 1 : -1;
    let index = this.activeIndex();
    if (index < 0) {
      this.setActive(this.edgeEnabledIndex(direction));
      return;
    }
    let remaining = Math.abs(delta);
    while (remaining > 0) {
      let candidate = index + direction;
      while (
        candidate >= 0 &&
        candidate < items.length &&
        this.isItemDisabled(items[candidate])
      ) {
        candidate += direction;
      }
      if (candidate < 0 || candidate >= items.length) break;
      index = candidate;
      remaining--;
    }
    this.setActive(index);
  }

  /** Activates `item` when visible, else the first enabled option. */
  activateItemOrFirst(item: TItem | null): void {
    const items = this.visibleItems();
    const index = item === null ? -1 : items.indexOf(item);
    this.setActive(index >= 0 ? index : this.edgeEnabledIndex(1));
  }

  setActive(index: number): void {
    this.activeIndex.set(index);
    if (index < 0) return;
    const scroll = this.deps.scrollActiveIntoView;
    if (scroll) scroll(index);
    else this.scrollOptionIntoView(index);
  }

  /**
   * Default active-option scrolling: `scrollIntoView` on the rendered option
   * element, deferred a frame. Virtualized lists route the
   * `scrollActiveIntoView` hook elsewhere but may fall back to this.
   */
  scrollOptionIntoView(index: number): void {
    const id = this.optionId(index);
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => (callback(0), 0);
    // the option never receives real focus (activedescendant pattern), so it
    // must be scrolled into view manually — after the pending render
    schedule(() =>
      document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' }),
    );
  }

  /** Clears pending timers — call from the owner's destroy hook. */
  destroy(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }
}
