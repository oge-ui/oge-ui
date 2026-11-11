import type {
  FilterExpr,
  GroupDescriptor,
  SortDescriptor,
  SummaryType,
} from '../data/load-options';

/**
 * A total summary the user picked from a column menu: an aggregate, or
 * `'none'` to hide the column's declared totals.
 */
export type OgeUserSummaryType = Exclude<SummaryType, 'custom'> | 'none';

/**
 * Serializable snapshot of the user-driven grid state (persistence, sharing
 * between framework adapters). Plain data — no framework types.
 */
export interface GridStateSnapshot {
  sort?: readonly SortDescriptor[];
  group?: readonly GroupDescriptor[];
  filter?: {
    row?: readonly (readonly [string, FilterExpr])[];
    header?: readonly (readonly [string, readonly unknown[]])[];
    builder?: FilterExpr | null;
    searchText?: string;
  };
  paging?: {
    pageIndex?: number;
    pageSize?: number | null;
  };
  columns?: {
    order?: readonly string[] | null;
    widths?: readonly (readonly [string, number])[];
    pins?: readonly (readonly [string, 'left' | 'right' | false])[];
    hidden?: readonly string[];
  };
  /**
   * Total summaries picked from the column menus (`summaryMenu`), per
   * field; they replace that column’s declared `totalSummary`.
   */
  summaries?: readonly (readonly [string, OgeUserSummaryType])[];
}
