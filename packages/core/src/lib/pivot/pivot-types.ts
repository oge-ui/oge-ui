import type { FilterExpr, SortDirection, SummaryDescriptor, SummaryType } from '../data/load-options';

/** Which pivot area a field lives in. `null` keeps it available but unused. */
export type PivotArea = 'row' | 'column' | 'data' | 'filter';

/** Path of group values identifying an axis node, outermost field first. */
export type PivotPath = readonly unknown[];

/**
 * Date part or numeric bucket size a row/column field groups by.
 * A number means numeric intervals: value `v` lands in bucket `v - (v % n)`.
 */
export type PivotGroupInterval = 'year' | 'quarter' | 'month' | 'day' | 'dayOfWeek' | number;

/**
 * Post-processing applied to a measure after aggregation.
 *
 * - `percentOfColumnTotal` / `percentOfRowTotal`: share of the nearest
 *   parent total on the opposite axis (top level → grand total).
 * - `percentOfColumnGrandTotal` / `percentOfRowGrandTotal`: share of the
 *   grand-total row / column.
 * - `percentOfGrandTotal`: share of the overall grand total.
 * - `absoluteVariation` / `percentVariation`: difference vs. the previous
 *   visible column (totals are skipped in the chain).
 */
export type PivotSummaryDisplayMode =
  | 'none'
  | 'absoluteVariation'
  | 'percentVariation'
  | 'percentOfColumnTotal'
  | 'percentOfRowTotal'
  | 'percentOfColumnGrandTotal'
  | 'percentOfRowGrandTotal'
  | 'percentOfGrandTotal';

export interface PivotRunningTotal {
  readonly direction: 'row' | 'column';
  /** Keep accumulating across group boundaries. Default false (reset per group). */
  readonly allowCrossGroupVariation?: boolean;
}

/**
 * Serializable field definition. Functions (selectors, custom reducers,
 * formatters) travel out-of-band via `PivotFieldFns` / `CustomSummaryMap`.
 */
export interface PivotFieldConfig {
  /** Unique id; defaults to `dataField` on the component layer. */
  readonly id: string;
  /** Dotted paths supported (`createFieldAccessor`). */
  readonly dataField: string;
  readonly caption?: string;
  readonly area?: PivotArea | null;
  readonly areaIndex?: number;
  readonly dataType?: 'string' | 'number' | 'date' | 'boolean';
  readonly groupInterval?: PivotGroupInterval;
  // data (measure) fields:
  readonly summaryType?: SummaryType;
  /** Custom reducer key (`CustomSummaryMap`); defaults to `dataField`. */
  readonly summaryName?: string;
  readonly summaryDisplayMode?: PivotSummaryDisplayMode;
  readonly runningTotal?: PivotRunningTotal;
  // row/column fields:
  readonly sortOrder?: SortDirection;
  /** Sort this level by a measure value instead of its labels. */
  readonly sortBySummaryField?: string;
  /** Opposite-axis path the summary is read at; omitted → grand total. */
  readonly sortBySummaryPath?: PivotPath;
  readonly filterValues?: readonly unknown[];
  readonly filterType?: 'include' | 'exclude';
  /** Per-field subtotal visibility (default true). */
  readonly showTotals?: boolean;
}

/** Out-of-band functions per field id. */
export interface PivotFieldFns<T = unknown> {
  /** Replaces the `dataField` accessor with a computed value. */
  readonly selector?: (row: T) => unknown;
  readonly customizeText?: (info: { value: unknown; valueText: string }) => string;
  readonly format?: (value: unknown) => string;
}

/** One node of a materialized axis (rows or columns). */
export interface PivotAxisNode {
  readonly value: unknown;
  readonly text: string;
  readonly path: PivotPath;
  readonly children: readonly PivotAxisNode[];
  readonly expanded: boolean;
  readonly hasChildren: boolean;
  /** Index of this node's own slot in the value matrix (-1 when it has none). */
  readonly leafIndex: number;
  /** Number of matrix slots this node spans (for header col/rowspan). */
  readonly leafCount: number;
  /** Subtotal slot injected after an expanded node's children. */
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

export interface PivotResult {
  readonly rowRoot: readonly PivotAxisNode[];
  readonly columnRoot: readonly PivotAxisNode[];
  readonly rowLeafCount: number;
  readonly columnLeafCount: number;
  /** `values[rowSlot][columnSlot][measureIndex]` — display modes applied. */
  readonly values: ReadonlyArray<ReadonlyArray<readonly unknown[]>>;
  readonly measures: readonly PivotFieldConfig[];
}

export interface PivotComputeSettings {
  readonly showRowTotals?: boolean;
  readonly showColumnTotals?: boolean;
  readonly showRowGrandTotals?: boolean;
  readonly showColumnGrandTotals?: boolean;
}

// --- serializable remote contract (OLAP-style, pre-aggregated) --------------

export interface PivotFieldDescriptor {
  readonly dataField: string;
  readonly groupInterval?: PivotGroupInterval;
  readonly dir?: SortDirection;
}

export interface PivotLoadOptions {
  readonly rowFields: readonly PivotFieldDescriptor[];
  readonly columnFields: readonly PivotFieldDescriptor[];
  readonly measures: readonly SummaryDescriptor[];
  readonly filter?: FilterExpr | null;
  /** Server returns the root level plus one level under each listed path. */
  readonly rowExpandedPaths?: readonly PivotPath[];
  readonly columnExpandedPaths?: readonly PivotPath[];
  readonly signal?: AbortSignal;
}

export interface PivotAxisPayloadNode {
  readonly value: unknown;
  readonly text?: string;
  readonly hasChildren?: boolean;
  readonly children?: readonly PivotAxisPayloadNode[];
}

export interface PivotLoadResult {
  readonly rows: readonly PivotAxisPayloadNode[];
  readonly columns: readonly PivotAxisPayloadNode[];
  /** Dense leaf matrix aligned with the returned axis leaf order. */
  readonly values: ReadonlyArray<ReadonlyArray<readonly unknown[]>>;
  readonly rowTotals?: ReadonlyArray<ReadonlyArray<readonly unknown[]>>;
  readonly columnTotals?: ReadonlyArray<ReadonlyArray<readonly unknown[]>>;
  readonly grandTotal?: readonly unknown[];
}

export interface PivotDrillDownArgs {
  readonly rowPath: PivotPath;
  readonly columnPath: PivotPath;
  readonly measureId?: string;
}

export interface OgePivotStore<T = unknown> {
  load(options: PivotLoadOptions): Promise<PivotLoadResult>;
  drillDown?(
    args: PivotDrillDownArgs & { filter?: FilterExpr | null; skip?: number; take?: number }
  ): Promise<T[]>;
}
