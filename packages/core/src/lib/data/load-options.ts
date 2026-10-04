export type SortDirection = 'asc' | 'desc';

export interface SortDescriptor {
  readonly field: string;
  readonly dir: SortDirection;
}

/**
 * Bucket a group key is truncated to: a calendar unit for dates (local time;
 * `'week'` starts on the locale's first day of week) or, as a positive
 * number, the bucket width for numbers (`100` groups 0–99, 100–199, …).
 */
export type GroupInterval =
  'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | number;

/** Whether a value is a {@link GroupInterval} (validated persisted state). */
export function isGroupInterval(value: unknown): value is GroupInterval {
  return typeof value === 'number'
    ? Number.isFinite(value) && value > 0
    : value === 'hour' ||
        value === 'day' ||
        value === 'week' ||
        value === 'month' ||
        value === 'quarter' ||
        value === 'year';
}

export interface GroupDescriptor {
  readonly field: string;
  readonly dir: SortDirection;
  /**
   * Buckets date values by calendar day / month / year instead of by exact
   * instant. Grids send `'day'` for date columns unless the column says
   * otherwise; a server honouring it groups the same way.
   */
  readonly interval?: GroupInterval;
}

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'contains'
  | 'notcontains'
  | 'startswith'
  | 'endswith'
  | 'in'
  | 'between'
  | 'isnull'
  | 'isnotnull';

/**
 * Filter expression tree. Closed and intentionally small so it serializes
 * cleanly for remote (e.g. .NET-style) backends.
 */
export type FilterExpr =
  | {
      readonly type: 'binary';
      readonly field: string;
      readonly op: FilterOperator;
      readonly value?: unknown;
    }
  | { readonly type: 'and' | 'or'; readonly operands: readonly FilterExpr[] }
  | { readonly type: 'not'; readonly operand: FilterExpr };

export type SummaryType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'custom';

export interface SummaryDescriptor {
  readonly field: string;
  readonly type: SummaryType;
  /**
   * Identifies the custom calculator for `type: 'custom'` (defaults to
   * `field`). The descriptor stays serializable — the function itself travels
   * out-of-band (`customSummaries` on the data source / pipeline config).
   */
  readonly name?: string;
}

/** A computed summary value (paired with the descriptor that produced it). */
export interface SummaryValue {
  readonly field: string;
  readonly type: SummaryType;
  readonly value: unknown;
}

/**
 * The single, standardized description of "what data the grid needs".
 * Produced from grid state; consumed by every DataSource implementation.
 * For remote sources this object (minus `signal`) is safe to serialize
 * as the request payload.
 */
export interface LoadOptions {
  readonly skip?: number;
  readonly take?: number;
  readonly sort?: readonly SortDescriptor[];
  readonly filter?: FilterExpr | null;
  readonly group?: readonly GroupDescriptor[];
  readonly groupSummary?: readonly SummaryDescriptor[];
  readonly totalSummary?: readonly SummaryDescriptor[];
  readonly requireTotalCount?: boolean;
  readonly requireGroupCount?: boolean;
  /** Global search text; client-side sources fold this into `filter`. */
  readonly searchText?: string;
  /** Cancellation hook — aborted loads must never resolve into the grid. */
  readonly signal?: AbortSignal;
}
