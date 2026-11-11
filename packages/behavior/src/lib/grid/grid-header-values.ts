import type { DataSource, FilterExpr } from '@oge-ui/core';

/**
 * Loads the value list of an Excel-style header filter popup — shared by both
 * grid render layers (ADR 0001).
 *
 * - The list is narrowed by every other active filter and the global search
 *   text, never by the column's own filter (Excel's cascading lists), in
 *   memory and on the server alike.
 * - A server source (one without `loadSync`) is asked once per opening; text
 *   typed in the popup's search box asks again after a debounce (250 ms by
 *   default), with the text as `search`. An in-memory source is searched
 *   locally instead — no request per keystroke.
 * - Every request supersedes the previous one: the previous request is
 *   aborted and a late answer to it is dropped, so an old response never
 *   overwrites a newer one.
 */
export interface OgeHeaderValuesLoaderOptions {
  /** The grid's data source; no `distinct()` means no value list. */
  readonly source: () => DataSource<never> | null | undefined;
  /** The filter a column's values are taken under (all but its own). */
  readonly filterFor: (field: string) => FilterExpr | null;
  /** The grid's global search text. */
  readonly searchText: () => string;
  /** Maximum values listed (`headerFilter.valueLimit`). */
  readonly limit: () => number;
  /** Whether typed text is sent to the server for this column (not for dates). */
  readonly remoteSearch?: (field: string) => boolean;
  /** Receives the values to list; `null` while a request is in flight. */
  readonly onValues: (field: string, values: readonly unknown[] | null) => void;
  readonly onError?: (error: unknown) => void;
  /** Debounce of a server search, in ms. Default 250. */
  readonly debounceMs?: number;
}

export class OgeHeaderValuesLoader {
  private field: string | null = null;
  private token = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private lastSearch = '';
  /** Every value seen since the popup opened (unsearched list ∪ search hits). */
  private known: unknown[] = [];
  private knownSet = new Set<unknown>();

  constructor(private readonly options: OgeHeaderValuesLoaderOptions) {}

  /** Whether the source answers from memory (it has `loadSync`). */
  isLocal(): boolean {
    return typeof this.options.source()?.loadSync === 'function';
  }

  /** Whether the typed text of the open column is searched on the server. */
  searchesRemotely(): boolean {
    const field = this.field;
    return (
      field !== null &&
      !this.isLocal() &&
      (this.options.remoteSearch?.(field) ?? true)
    );
  }

  /**
   * The values a "select all / toggle one" works against: everything listed
   * since the popup opened, so toggling inside a server search result does
   * not drop the values the search hid.
   */
  universe(): readonly unknown[] {
    return this.known;
  }

  /** Starts a popup for `field`: asks for its unsearched list right away. */
  open(field: string): void {
    this.cancel();
    this.field = field;
    this.lastSearch = '';
    this.known = [];
    this.knownSet = new Set();
    this.request('');
  }

  /**
   * The popup's search box changed. Returns `true` when the text goes to the
   * server (the caller then shows the answer as is), `false` when the caller
   * filters the loaded list itself.
   */
  search(text: string): boolean {
    if (!this.searchesRemotely()) return false;
    const next = text.trim();
    if (next === this.lastSearch) return true;
    this.lastSearch = next;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.request(next);
    }, this.options.debounceMs ?? 250);
    return true;
  }

  /** The popup closed: drops pending work; late answers are ignored. */
  close(): void {
    this.cancel();
    this.field = null;
  }

  private cancel(): void {
    this.token++;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.abort?.abort();
    this.abort = null;
  }

  private request(search: string): void {
    const field = this.field;
    const source = this.options.source();
    if (field === null || !source?.distinct) return;
    this.token++;
    const token = this.token;
    this.abort?.abort();
    const abort =
      typeof AbortController === 'function' ? new AbortController() : null;
    this.abort = abort;
    const searchText = this.options.searchText().trim();
    const limit = this.options.limit();
    this.options.onValues(field, null);
    source
      .distinct(field, {
        filter: this.options.filterFor(field),
        ...(searchText ? { searchText } : {}),
        ...(search ? { search } : {}),
        take: limit,
        ...(abort ? { signal: abort.signal } : {}),
      })
      .then(
        (values) => {
          if (token !== this.token || this.field !== field) return;
          const list = values.slice(0, limit);
          for (const value of list) {
            if (!this.knownSet.has(value)) {
              this.knownSet.add(value);
              this.known.push(value);
            }
          }
          this.options.onValues(field, list);
        },
        (error: unknown) => {
          if (token !== this.token) return; // superseded or aborted on purpose
          this.options.onValues(field, []);
          this.options.onError?.(error);
        },
      );
  }
}
