import type {
  CustomSummaryFn,
  PivotArea,
  PivotGroupInterval,
  PivotPath,
  PivotRunningTotal,
  PivotSummaryDisplayMode,
  SortDirection,
  SummaryType,
} from '@oge-ui/core';

/** `DataTransfer` type the field chips carry while dragged. */
export const OGE_PIVOT_FIELD_DRAG_TYPE = 'application/x-oge-pivot-field';

/**
 * One declared pivot field — the data form of Angular's `<oge-pivot-field>`
 * and the element type of React's `fields` prop. Every member but
 * `dataField` is optional; the defaults are the directive's input defaults.
 */
export interface OgePivotFieldDef<T = unknown> {
  /** Source field; dotted paths supported. */
  readonly dataField: string;
  /** Unique id; defaults to `dataField`. */
  readonly id?: string;
  /** Chip / header label; defaults to the humanized `dataField`. */
  readonly caption?: string;
  /** `null` (default) keeps the field in the chooser only. */
  readonly area?: PivotArea | null;
  /** Order within the area; defaults to the declaration index. */
  readonly areaIndex?: number;
  readonly dataType?: 'string' | 'number' | 'date' | 'boolean';
  readonly groupInterval?: PivotGroupInterval;
  /** Default `'sum'`. */
  readonly summaryType?: SummaryType;
  readonly summaryName?: string;
  /** Default `'none'`. */
  readonly summaryDisplayMode?: PivotSummaryDisplayMode;
  readonly runningTotal?: PivotRunningTotal;
  readonly calculateCustomSummary?: CustomSummaryFn<T>;
  readonly sortOrder?: SortDirection;
  readonly sortBySummaryField?: string;
  readonly sortBySummaryPath?: PivotPath;
  readonly filterValues?: readonly unknown[];
  /** Default `'include'`. */
  readonly filterType?: 'include' | 'exclude';
  /** Default `true`. */
  readonly showTotals?: boolean;
  readonly selector?: (row: T) => unknown;
  readonly format?: (value: unknown) => string;
  readonly customizeText?: (info: {
    value: unknown;
    valueText: string;
  }) => string;
}

/** Field-chooser dialog behavior. */
export interface OgePivotFieldChooserOptions {
  /** `'onDemand'` edits a draft that only applies on Apply. */
  readonly applyChangesMode?: 'instantly' | 'onDemand';
}

/** One visible line of an axis (row line or column slot), in matrix order. */
export interface OgePivotAxisLine {
  readonly text: string;
  readonly path: PivotPath;
  readonly level: number;
  readonly expanded: boolean;
  readonly hasChildren: boolean;
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

/** A positioned column-header cell (multi-row header with spans). */
export interface OgePivotHeaderCell extends OgePivotAxisLine {
  /** 1-based grid row within the header block. */
  readonly rowStart: number;
  readonly rowEnd: number;
  /** 1-based matrix column the cell starts at. */
  readonly columnStart: number;
  readonly span: number;
}

/** Payload of the cell click / double-click events. */
export interface OgePivotCellClickEvent {
  readonly rowPath: PivotPath;
  readonly columnPath: PivotPath;
  readonly measureIndex: number;
  readonly value: unknown;
  readonly event: MouseEvent;
}

/** Mutable cell-preparation args for the `customizeCell` appearance hook. */
export interface OgePivotCellPrepared {
  readonly rowPath: PivotPath;
  readonly columnPath: PivotPath;
  readonly measureId: string;
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
  readonly value: unknown;
  /** Override to change what the cell displays. */
  text: string;
  /** Extra CSS class for conditional appearance. */
  cssClass?: string;
}

/** One item of the pivot's own lightweight menus. */
export interface OgePivotMenuItem {
  text: string;
  disabled?: boolean;
  active?: boolean;
  action?: () => void;
}

/** An open context menu: viewport coordinates + items. */
export interface OgePivotMenuState {
  readonly x: number;
  readonly y: number;
  readonly items: OgePivotMenuItem[];
  /** Accessible name of the menu (the field menu names its field). */
  readonly label?: string;
}

/** An open value-filter popup. */
export interface OgePivotFilterPopupState {
  readonly fieldId: string;
  readonly caption: string;
  readonly x: number;
  readonly y: number;
  readonly values: readonly unknown[];
  readonly selected: ReadonlySet<unknown>;
  readonly type: 'include' | 'exclude';
}

/** One field-panel / chooser area with its sorted fields. */
export interface OgePivotPanelArea<F> {
  readonly area: PivotArea;
  readonly label: string;
  readonly fields: readonly F[];
}

/** Row / column index window (end exclusive). */
export interface OgePivotWindow {
  readonly start: number;
  readonly end: number;
}

/** Explicit grid tracks for the value matrix. `rows: null` = auto. */
export interface OgePivotMatrixTemplate {
  readonly rows: string | null;
  readonly columns: string;
}

/** A focused value-matrix cell. */
export interface OgePivotCellPosition {
  readonly row: number;
  readonly col: number;
}

/** The pointer facts a context menu needs — satisfied by `MouseEvent`. */
export interface OgePivotPointer {
  readonly clientX: number;
  readonly clientY: number;
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * The drag facts the field panel needs — satisfied by `DragEvent`, and by a
 * plain `Event` in environments without one (jsdom).
 */
export interface OgePivotDragLike {
  readonly dataTransfer?: DataTransfer | null;
  preventDefault(): void;
}
