import type { SummaryValue } from '../data/load-options';

/** Unique identifier of a row within the grid. */
export type RowKey = string | number;

/** A plain data row. */
export interface DataRowNode<T = unknown> {
  readonly kind: 'data';
  readonly key: RowKey;
  readonly data: T;
  /** Index of the row in the source data set (after filter/sort, before flattening). */
  readonly sourceIndex: number;
  /** Group nesting depth (0 when not grouped). */
  readonly level: number;
  /**
   * Key of the parent data row (`null` for roots). Populated only by tree
   * flattening (tree-list); absent for plain/grouped grids.
   */
  readonly parentKey?: RowKey | null;
  /**
   * Whether the row can be expanded to reveal children. Populated only by
   * tree flattening; absent for plain/grouped grids.
   */
  readonly hasChildren?: boolean;
  /**
   * Whether the row is currently expanded (always `false` when not
   * expandable). Populated only by tree flattening; absent for plain/grouped
   * grids.
   */
  readonly expanded?: boolean;
  /**
   * 1-based ARIA position of the row within its *visible* sibling bucket
   * (`aria-posinset`). Populated only by tree flattening.
   */
  readonly posInSet?: number;
  /**
   * Number of *visible* siblings in the row's bucket, itself included
   * (`aria-setsize`). Populated only by tree flattening.
   */
  readonly setSize?: number;
}

/** A group header row produced by row grouping. */
export interface GroupRowNode {
  readonly kind: 'group';
  readonly key: RowKey;
  readonly groupField: string;
  readonly groupValue: unknown;
  readonly level: number;
  readonly expanded: boolean;
  /** Number of data rows contained in this group (across all sub-groups). */
  readonly childCount: number;
  readonly summaries: readonly SummaryValue[];
}

/** An expanded master-detail row rendered below its parent data row. */
export interface DetailRowNode<T = unknown> {
  readonly kind: 'detail';
  readonly key: RowKey;
  readonly parentKey: RowKey;
  readonly data: T;
}

/** A summary (totals) row, either per-group or grid-total. */
export interface SummaryRowNode {
  readonly kind: 'summary';
  readonly key: RowKey;
  readonly scope: 'group' | 'total';
  readonly level: number;
  readonly summaries: readonly SummaryValue[];
}

/** Placeholder for a not-yet-loaded row (infinite scrolling). */
export interface FillerRowNode {
  readonly kind: 'filler';
  readonly key: RowKey;
  readonly index: number;
}

/**
 * The flattened row model: every renderable row of the grid, regardless of
 * nesting, is one typed entry in a flat list. Virtualization, keyboard
 * navigation and selection all operate on flat indices of this list.
 */
export type RowNode<T = unknown> =
  | DataRowNode<T>
  | GroupRowNode
  | DetailRowNode<T>
  | SummaryRowNode
  | FillerRowNode;
