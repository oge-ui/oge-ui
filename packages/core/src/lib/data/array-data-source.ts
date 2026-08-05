import { applyFilter } from '../pipeline/steps/filter.step';
import { runLoadOptions } from '../pipeline/run-load-options';
import type { RowKey } from '../rows/row-node';
import { compareValues } from '../util/comparators';
import { createFieldAccessor, resolveKeySelector } from '../util/value-accessor';
import type { DataSource, DataSourceCapabilities, LoadResult } from './data-source';
import type { FilterExpr, LoadOptions } from './load-options';

export interface ArrayDataSourceOptions<T> {
  /** Field name or selector producing a stable row key. Falls back to identity-based indices. */
  key?: keyof T | ((row: T) => RowKey);
  /** Fields the global search text matches against. Defaults to the first row's keys. */
  searchFields?: readonly string[];
}

/**
 * In-memory DataSource: executes every operation client-side via the row
 * pipeline. Accepts a plain array or a getter (so callers can hand over a
 * signal or any other live reference). When constructed with a plain array,
 * CRUD write-back mutates that array in place (DevExtreme-style).
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
  /** Present only when constructed with a mutable array (enables CRUD). */
  private readonly mutableRows: T[] | null;

  constructor(
    data: readonly T[] | (() => readonly T[]),
    options: ArrayDataSourceOptions<T> = {}
  ) {
    this.getRows = typeof data === 'function' ? data : () => data;
    this.mutableRows = typeof data === 'function' ? null : (data as T[]);
    this.keySelector = options.key != null ? resolveKeySelector(options.key) : null;
    this.searchFields = options.searchFields;
  }

  private requireMutable(): T[] {
    if (!this.mutableRows) {
      throw new Error('ArrayDataSource: CRUD requires a plain array (not a getter).');
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
    if (index < 0) return Promise.reject(new Error(`ArrayDataSource: key not found: ${String(key)}`));
    rows[index] = { ...rows[index], ...patch };
    return Promise.resolve(rows[index]);
  }

  remove(key: RowKey): Promise<void> {
    const rows = this.requireMutable();
    const index = this.indexOfKey(key);
    if (index < 0) return Promise.reject(new Error(`ArrayDataSource: key not found: ${String(key)}`));
    rows.splice(index, 1);
    return Promise.resolve();
  }

  load(options: LoadOptions): Promise<LoadResult<T>> {
    return Promise.resolve(
      runLoadOptions(this.getRows(), options, { searchFields: this.searchFields })
    );
  }

  distinct(field: string, options?: { filter?: FilterExpr | null }): Promise<readonly unknown[]> {
    const accessor = createFieldAccessor<T>(field);
    const rows = applyFilter(this.getRows(), options?.filter);
    const seen = new Set<unknown>();
    for (const row of rows) seen.add(accessor(row));
    return Promise.resolve([...seen].sort(compareValues));
  }

  keyOf(item: T): RowKey {
    if (this.keySelector) return this.keySelector(item);
    const index = this.getRows().indexOf(item);
    return index >= 0 ? index : String(item);
  }
}
