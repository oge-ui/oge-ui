import type {
  FilterExpr,
  GroupDescriptor,
  SortDescriptor,
} from '../data/load-options';

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
}
