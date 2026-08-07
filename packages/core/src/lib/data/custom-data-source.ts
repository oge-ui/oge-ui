import type { RowKey } from '../rows/row-node';
import { resolveKeySelector } from '../util/value-accessor';
import type {
  DataChange,
  DataSource,
  DataSourceCapabilities,
  LoadResult,
  SubscribableLike,
} from './data-source';
import type { FilterExpr, LoadOptions } from './load-options';

export interface CustomDataSourceOptions<T> {
  key: keyof T | ((row: T) => RowKey);
  /** The fetch delegate — receives serializable LoadOptions for the backend. */
  load: (options: LoadOptions) => Promise<LoadResult<T>>;
  /** Defaults to "the server does everything". */
  capabilities?: Partial<DataSourceCapabilities>;
  distinct?: (
    field: string,
    options?: { filter?: FilterExpr | null },
  ) => Promise<readonly unknown[]>;
  insert?: (item: T) => Promise<T>;
  update?: (key: RowKey, patch: Partial<T>) => Promise<T>;
  remove?: (key: RowKey) => Promise<void>;
  /** Push stream of external changes (e.g. a WebSocket feed mapped to DataChange batches). */
  changes?: SubscribableLike<readonly DataChange<T>[]>;
}

/**
 * Remote DataSource: delegates every operation to user-provided callbacks.
 * The grid sends standardized LoadOptions (skip/take/sort/filter/…), which
 * map 1:1 onto typical .NET-style query endpoints.
 */
export class CustomDataSource<T> implements DataSource<T> {
  readonly capabilities: DataSourceCapabilities;
  readonly distinct?: DataSource<T>['distinct'];
  readonly insert?: DataSource<T>['insert'];
  readonly update?: DataSource<T>['update'];
  readonly remove?: DataSource<T>['remove'];
  readonly changes?: SubscribableLike<readonly DataChange<T>[]>;

  private readonly keySelector: (row: T) => RowKey;
  private readonly loadDelegate: (
    options: LoadOptions,
  ) => Promise<LoadResult<T>>;

  constructor(options: CustomDataSourceOptions<T>) {
    this.keySelector = resolveKeySelector(options.key);
    this.loadDelegate = options.load;
    this.capabilities = {
      sort: true,
      filter: true,
      group: true,
      paging: true,
      summary: true,
      ...options.capabilities,
    };
    if (options.distinct) this.distinct = options.distinct;
    if (options.insert) this.insert = options.insert;
    if (options.update) this.update = options.update;
    if (options.remove) this.remove = options.remove;
    if (options.changes) this.changes = options.changes;
  }

  load(options: LoadOptions): Promise<LoadResult<T>> {
    return this.loadDelegate(options);
  }

  keyOf(item: T): RowKey {
    return this.keySelector(item);
  }
}
