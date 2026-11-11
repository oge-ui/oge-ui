import { buildSearchFilter } from '../filtering/filter-evaluator';
import { applyFilter } from '../pipeline/steps/filter.step';
import { runLoadOptions } from '../pipeline/run-load-options';
import type { CustomSummaryMap } from '../grouping/summaries';
import type { RowKey } from '../rows/row-node';
import { compareValues } from '../util/comparators';
import { foldText } from '../util/text-fold';
import {
  createFieldAccessor,
  resolveKeySelector,
} from '../util/value-accessor';
import type {
  DataChange,
  DataSource,
  DataSourceCapabilities,
  DistinctOptions,
  LoadResult,
  SubscribableLike,
} from './data-source';
import type { LoadOptions } from './load-options';

export interface ArrayDataSourceOptions<T> {
  /** Field name or selector producing a stable row key. Falls back to identity-based indices. */
  key?: keyof T | ((row: T) => RowKey);
  /** Fields the global search text matches against. Defaults to the first row's keys. */
  searchFields?: readonly string[];
  /** Per-field custom sort keys (`calculateSortValue`). */
  sortValues?: Readonly<Record<string, (row: T) => unknown>>;
  /** Custom summary reducers keyed by descriptor `name ?? field`. */
  customSummaries?: CustomSummaryMap<T>;
}

/**
 * In-memory DataSource: executes every operation client-side via the row
 * pipeline. Accepts a plain array or a getter (so callers can hand over a
 * signal or any other live reference). When constructed with a plain array,
 * CRUD write-back mutates that array in place .
 */
export class ArrayDataSource<T> implements DataSource<T> {
  readonly capabilities: DataSourceCapabilities = {
    sort: true,
    filter: true,
    group: true,
    paging: true,
    summary: true,
  };

  private readonly getRows: () => readonly T[];
  private readonly keySelector: ((row: T) => RowKey) | null;
  private readonly searchFields: readonly string[] | undefined;
  private readonly sortValues:
    Readonly<Record<string, (row: T) => unknown>> | undefined;
  private readonly customSummaries: CustomSummaryMap<T> | undefined;
  /** Present only when constructed with a mutable array (enables CRUD). */
  private readonly mutableRows: T[] | null;

  constructor(
    data: readonly T[] | (() => readonly T[]),
    options: ArrayDataSourceOptions<T> = {},
  ) {
    this.getRows = typeof data === 'function' ? data : () => data;
    this.mutableRows = typeof data === 'function' ? null : (data as T[]);
    this.keySelector =
      options.key != null ? resolveKeySelector(options.key) : null;
    this.searchFields = options.searchFields;
    this.sortValues = options.sortValues;
    this.customSummaries = options.customSummaries;
  }

  private requireMutable(): T[] {
    if (!this.mutableRows) {
      throw new Error(
        'ArrayDataSource: CRUD requires a plain array (not a getter).',
      );
    }
    return this.mutableRows;
  }

  private indexOfKey(key: RowKey): number {
    const rows = this.requireMutable();
    return rows.findIndex((row) => this.keyOf(row) === key);
  }

  insert(item: T): Promise<T> {
    this.requireMutable().push(item);
    return Promise.resolve(item);
  }

  update(key: RowKey, patch: Partial<T>): Promise<T> {
    const rows = this.requireMutable();
    const index = this.indexOfKey(key);
    if (index < 0)
      return Promise.reject(
        new Error(`ArrayDataSource: key not found: ${String(key)}`),
      );
    rows[index] = { ...rows[index], ...patch };
    return Promise.resolve(rows[index]);
  }

  remove(key: RowKey): Promise<void> {
    const rows = this.requireMutable();
    const index = this.indexOfKey(key);
    if (index < 0)
      return Promise.reject(
        new Error(`ArrayDataSource: key not found: ${String(key)}`),
      );
    rows.splice(index, 1);
    return Promise.resolve();
  }

  // --- live updates ---------------------------------------------------------

  private readonly observers = new Set<
    (batch: readonly DataChange<T>[]) => void
  >();

  /** Push stream consumed by the grid; fed by {@link push}. */
  readonly changes: SubscribableLike<readonly DataChange<T>[]> = {
    subscribe: (observer) => {
      this.observers.add(observer);
      return { unsubscribe: () => this.observers.delete(observer) };
    },
  };

  /**
   * Applies external changes to the underlying array (when mutable) and
   * notifies subscribed grids without a full reload .
   */
  push(batch: readonly DataChange<T>[]): void {
    if (this.mutableRows) {
      for (const change of batch) {
        switch (change.type) {
          case 'insert':
            this.mutableRows.push(change.item);
            break;
          case 'update': {
            const index = this.indexOfKey(change.key);
            if (index >= 0) {
              this.mutableRows[index] = {
                ...this.mutableRows[index],
                ...change.patch,
              };
            }
            break;
          }
          case 'remove': {
            const index = this.indexOfKey(change.key);
            if (index >= 0) this.mutableRows.splice(index, 1);
            break;
          }
        }
      }
    }
    for (const observer of this.observers) observer(batch);
  }

  load(options: LoadOptions): Promise<LoadResult<T>> {
    return Promise.resolve(this.loadSync(options));
  }

  /** {@link load} without the promise — the rows are already in memory. */
  loadSync(options: LoadOptions): LoadResult<T> {
    return runLoadOptions(this.getRows(), options, {
      searchFields: this.searchFields,
      sortValues: this.sortValues,
      customSummaries: this.customSummaries,
    });
  }

  distinct(
    field: string,
    options: DistinctOptions = {},
  ): Promise<readonly unknown[]> {
    const accessor = createFieldAccessor<T>(field);
    const all = this.getRows();
    let rows = applyFilter(all, options.filter);
    if (options.searchText?.trim()) {
      const fields =
        this.searchFields ?? (all.length ? Object.keys(all[0] as object) : []);
      rows = applyFilter(rows, buildSearchFilter(fields, options.searchText));
    }
    const needle = options.search?.trim()
      ? foldText(options.search.trim())
      : '';
    // keyed so equal dates held in different Date objects list once
    const seen = new Set<unknown>();
    const dates = new Map<number, Date>();
    for (const row of rows) {
      const value = accessor(row);
      if (
        needle &&
        (value == null || !foldText(String(value)).includes(needle))
      )
        continue;
      if (value instanceof Date) {
        if (!dates.has(value.getTime())) dates.set(value.getTime(), value);
      } else seen.add(value);
    }
    const sorted = [...seen, ...dates.values()].sort(compareValues);
    return Promise.resolve(
      options.take !== undefined ? sorted.slice(0, options.take) : sorted,
    );
  }

  keyOf(item: T): RowKey {
    if (this.keySelector) return this.keySelector(item);
    const index = this.getRows().indexOf(item);
    return index >= 0 ? index : String(item);
  }
}
