import type {
  OgeValueFormat,
  CustomSummaryFn,
  PivotArea,
  PivotGroupInterval,
  PivotPath,
  PivotRunningTotal,
  PivotSummaryDisplayMode,
  SortDirection,
  SummaryType,
} from '@oge-ui/core';
import type {
  OgePivotLabelFilter,
  OgePivotTopNFilter,
  OgePivotValueFilter,
} from './pivot-filters';

/**
 * `DataTransfer` type the field chips carried while HTML5-dragged.
 * @deprecated Field chips move with a pointer drag since 1.1.2 (touch
 * included) and no longer put anything on a `DataTransfer`; kept so existing
 * imports compile.
 */
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
  /**
   * Cell / member text: a function, or a declarative `OgeValueFormat`
   * (`{ type: 'currency', currency: 'EUR' }`) rendered in the grid's `locale`.
   */
  readonly format?: ((value: unknown) => string) | OgeValueFormat;
  /**
   * Member-header text of the field on a row or column axis: a function, or
   * a declarative `OgeValueFormat` rendered in the grid's `locale`. Wins over
   * `format` for headers, which then formats only the field's cells when it
   * is dragged into the data area. A date format on a date-grouped field
   * (`groupInterval` `'year'` / `'quarter'` / `'month'` / `'day'` /
   * `'dayOfWeek'`) formats a representative date of the bucket, so
   * `{ type: 'date', pattern: 'MMMM' }` turns month `1` into `January`.
   * Everything that shows a member uses it — headers, label filters, the
   * chart adapter, remote members without a server `text`, and the
   * Excel / PDF / CSV exports. `customizeText` still runs after it.
   */
  readonly headerFormat?: ((value: unknown) => string) | OgeValueFormat;
  readonly customizeText?: (info: {
    value: unknown;
    valueText: string;
  }) => string;
  /** Row/column fields: keep the members whose label matches. */
  readonly labelFilter?: OgePivotLabelFilter;
  /** Row/column fields: keep the members whose measure total passes. */
  readonly valueFilter?: OgePivotValueFilter;
  /** Row/column fields: keep the top (or bottom) N members by a measure. */
  readonly topN?: OgePivotTopNFilter;
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

/** What a value-cell template / `renderCell` receives: the prepared cell + its position. */
export interface OgePivotCellTemplateContext extends OgePivotCellPrepared {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly measureIndex: number;
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
 * The drag facts the field panel needed under HTML5 drag and drop.
 * @deprecated Field chips use {@link OgePivotFieldPointerInput} since 1.1.2.
 */
export interface OgePivotDragLike {
  readonly dataTransfer?: DataTransfer | null;
  preventDefault(): void;
}

/**
 * The `pointerdown` facts a field-chip drag reads — satisfied by the native
 * `PointerEvent` and by React's synthetic one.
 */
export interface OgePivotFieldPointerInput {
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerId: number;
  readonly pointerType?: string;
  readonly target: EventTarget | null;
  preventDefault(): void;
}

/**
 * Where a dragged field chip would land: an area (`null` = the chooser's
 * "all fields" list) and the chip it is inserted in front of (`null` = the
 * end of the area).
 */
export interface OgePivotFieldDropTarget {
  readonly area: PivotArea | null;
  readonly beforeId: string | null;
}
