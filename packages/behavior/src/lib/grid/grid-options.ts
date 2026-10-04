import type { RowKey, SortDescriptor, SummaryType } from '@oge-ui/core';
import type { OgeColumnAlignment, OgeDataType } from './grid-columns';
import type { OgeHeaderFilterMode } from './grid-header-conditions';
import type { OgeRowDropPosition } from './grid-row-drag-group';

/**
 * The grid's option objects and event payloads that carry no framework
 * shape — plain data both render layers accept verbatim, so a React
 * `paging={{ pageSize: 10 }}` and an Angular `[paging]="{ pageSize: 10 }"`
 * are literally the same type (ADR 0001).
 */

export interface OgeFilterRowOptions {
  visible?: boolean;
  /** Debounce for typing, in ms. */
  debounce?: number;
}

export interface OgeHeaderFilterOptions {
  visible?: boolean;
  /** Maximum distinct values listed in the popup. */
  valueLimit?: number;
  /**
   * What the popup offers: `'list'` (default) the distinct-value checklist,
   * `'conditions'` up to two operator + value conditions joined by And / Or,
   * `'both'` the Excel-style menu with conditions above the list.
   */
  mode?: OgeHeaderFilterMode;
}

export interface OgeSearchPanelOptions {
  visible?: boolean;
  placeholder?: string;
  /** Input width in px. */
  width?: number;
}

export interface OgePagingOptions {
  pageSize: number;
  /** Shows a page-size selector in the pager; `'all'` adds an unpaged option. */
  pageSizes?: readonly (number | 'all')[];
  /** Shows the total row count in the pager. Default true. */
  showInfo?: boolean;
  /** 'compact' shows `page / count`; 'adaptive' switches to compact on narrow grids. */
  displayMode?: 'full' | 'compact' | 'adaptive';
  /** Adds first-page / last-page buttons around the page list. Default false. */
  showFirstLastButtons?: boolean;
  /** Adds a "Page [n] of N" go-to-page input. Default false. */
  showPageInput?: boolean;
}

/** Options of cell range selection (`selectionMode: 'cell'`). */
export interface OgeRangeSelectionOptions {
  /** Ctrl+C prepends the column captions as the first TSV line. Default false. */
  copyHeaders?: boolean;
  /**
   * The drag handle at the range's corner that copies values or extends
   * number / date series (Ctrl+D / Ctrl+R are its keyboard twins). Default
   * true; shown only while editing is enabled.
   */
  fillHandle?: boolean;
  /**
   * Lines of a pasted block that run past the last row become new rows
   * (staged in batch mode, inserted otherwise). Default false: they are
   * dropped.
   */
  pasteAddsRows?: boolean;
  /** Ctrl/Cmd+click adds another range. Default true. */
  multipleRanges?: boolean;
}

export interface OgeSortingOptions {
  mode?: 'none' | 'single' | 'multi';
  /** Whether a third header click clears the sort. Defaults from global config. */
  allowUnsorting?: boolean;
}

export interface OgeGroupingOptions {
  /**
   * `false` starts every group collapsed and enables deferred loading:
   * a grouped payload may return `items: null` per group, and the grid
   * fetches a group's children only when it is expanded.
   */
  autoExpandAll?: boolean;
  /**
   * Offers "Group by this column" / "Ungroup" in the header context menu
   * without the drag-and-drop group panel. Default: on whenever `groupPanel`
   * is — set `true` to group from the menu alone.
   */
  contextMenuEnabled?: boolean;
}

export interface OgeScrollingOptions {
  /** 'virtual' windows the DOM; 'infinite' additionally loads on demand while scrolling down. */
  mode?: 'standard' | 'virtual' | 'infinite';
  /**
   * Fetch rows in blocks from the DataSource instead of loading everything
   * (server-side windowing). Defaults to true for 'infinite'.
   * Windowed mode is row-only: grouping and master-detail are unavailable.
   */
  remote?: boolean;
  /**
   * 'virtual' renders only the columns inside the horizontal viewport.
   * Requires plain columns: no pinned columns and no column bands; columns
   * without a numeric `width` fall back to their min width.
   */
  columnRenderingMode?: 'standard' | 'virtual';
}

/** Fires after the selection changed, with full state plus diffs. */
export interface OgeSelectionChangedEvent {
  selectedKeys: RowKey[];
  addedKeys: RowKey[];
  removedKeys: RowKey[];
}

/**
 * Fires after the sort changed — a header click, the header menu, `clearSorting()`
 * or a new `sorting` input — without the debounce of `stateChange`, so a caption
 * or a server request can follow the click in the same frame. The initial sort
 * is not a change.
 */
export interface OgeSortChangedEvent {
  sort: readonly SortDescriptor[];
  previousSort: readonly SortDescriptor[];
}

/** Fires after the page index or page size changed (the initial paging is not a change). */
export interface OgePageChangedEvent {
  pageIndex: number;
  /** `null` while paging is off. */
  pageSize: number | null;
  previousPageIndex: number;
  previousPageSize: number | null;
}

/** Which kind of row a toggle event is about. */
export type OgeGridToggleKind = 'group' | 'detail';

/**
 * Fires before a group row or a master-detail row expands or collapses — from
 * the pointer, the keyboard or `expandRow()` / `collapseRow()`. Set `cancel` to
 * keep the row as it is. `expandAllGroups()` / `collapseAllGroups()` do not
 * fire it per row.
 */
export interface OgeGridRowTogglingEvent<T = unknown> {
  /** The group node key, or the data row's key for a detail row. */
  key: RowKey;
  kind: OgeGridToggleKind;
  /** The data row of a detail toggle; `undefined` for a group. */
  row: T | undefined;
  cancel: boolean;
}

/** Fires after a group row or a master-detail row expanded or collapsed. */
export interface OgeGridRowToggleEvent<T = unknown> {
  key: RowKey;
  kind: OgeGridToggleKind;
  row: T | undefined;
}

/**
 * Fires after keyboard/pointer focus moved to another cell. `rowIndex` is the
 * position in the rendered (flattened) row list, `columnIndex` among the
 * visible columns; `key`/`row`/`field` are `undefined` on group and other
 * non-data rows.
 */
export interface OgeFocusedCellChangedEvent<T = unknown> {
  rowIndex: number;
  columnIndex: number;
  key: RowKey | undefined;
  row: T | undefined;
  field: string | undefined;
}

/**
 * How a context menu was asked for: a right-click / long-press (`'pointer'`) or
 * the keyboard — the Menu key or Shift+F10 on a focused cell (`'keyboard'`,
 * positioned at the cell rather than at a pointer).
 */
export type OgeContextMenuSource = 'pointer' | 'keyboard';

/** Fires after the focused row changed. */
export interface OgeFocusedRowChangedEvent<T = unknown> {
  key: RowKey | null;
  /** The focused row when it is currently loaded; `undefined` otherwise. */
  row: T | undefined;
}

/** Cancelable: fires before a CSV export starts; `fileName` is mutable. */
export interface OgeExportingEvent {
  fileName: string;
  cancel: boolean;
}

/** Fires after a row is dropped in a new position (`rowDragging`). */
export interface OgeRowReorderedEvent<T = unknown> {
  key: RowKey;
  targetKey: RowKey;
  /** Positions within the rendered (filtered/sorted) view. */
  fromIndex: number;
  toIndex: number;
  row: T;
}

/** A DataSource load or save failed. */
export interface OgeDataErrorEvent {
  error: unknown;
}

/** Column metadata handed to exporters (CSV / Excel / PDF). */
export interface OgeExportColumn<T = unknown> {
  caption: string;
  field: string | undefined;
  dataType: OgeDataType;
  accessor: (row: T) => unknown;
  format?: ((value: unknown) => string) | undefined;
  /** Locale unformatted dates are written in (the column's `locale`). */
  locale?: string | undefined;
  /** On-screen width in px, when the column declares or was resized to one. */
  width?: number | undefined;
  /** Resolved cell alignment (numbers default to `'end'`). */
  alignment?: OgeColumnAlignment | undefined;
  /** Pinned side; left-pinned columns become Excel freeze panes. */
  pinned?: false | 'left' | 'right' | undefined;
  /** Band (column-group) caption — becomes a merged header row. */
  bandCaption?: string | undefined;
}

/** One computed summary as exporters write it. */
export interface OgeExportSummaryCell {
  field: string;
  type: SummaryType;
  /** Raw summary value (typed: numbers stay numbers in Excel). */
  value: unknown;
  /** Display text, already formatted with the host's summary pattern. */
  text: string;
  /** The summary's label alone ("Sum") — Excel prefixes typed values with it. */
  label?: string;
}

/**
 * One exported line, in output order. Data rows carry their nesting level
 * (group depth or tree depth); group and summary lines carry what the
 * on-screen group header / footer / total row shows.
 */
export type OgeExportItem<T = unknown> =
  | { kind: 'data'; row: T; level: number }
  | {
      kind: 'group';
      level: number;
      field: string;
      value: unknown;
      /** Group header text (caption, value, count, header summaries). */
      text: string;
      count: number;
      summaries: readonly OgeExportSummaryCell[];
    }
  | {
      kind: 'groupFooter';
      level: number;
      summaries: readonly OgeExportSummaryCell[];
    }
  | { kind: 'total'; summaries: readonly OgeExportSummaryCell[] };

/** What kind of line an exported cell belongs to. */
export type OgeExportRowKind = OgeExportItem['kind'] | 'header';

export interface OgeExportData<T = unknown> {
  /** The exported data rows (flat — what `buildCsv` reads). */
  rows: readonly T[];
  columns: readonly OgeExportColumn<T>[];
  /**
   * The structured view — group rows, group footers and the total row
   * interleaved with the data rows. Absent: the rows export flat.
   */
  items?: readonly OgeExportItem<T>[];
}

/**
 * Cell style an exporter applies — shared by the Excel and PDF builders, so
 * one `cellStyle` hook styles both. Colours are `#rrggbb`.
 */
export interface OgeExportCellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Text colour. */
  color?: string;
  /** Fill colour. */
  background?: string;
  /** Font size in points. */
  fontSize?: number;
  alignment?: OgeColumnAlignment;
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  /** Wrap long text. */
  wrap?: boolean;
  /** Thin border on all four sides (`true`) or in a colour. */
  border?: boolean | string;
  /** Excel number format (`'#,##0.00'`, `'yyyy-mm-dd'`); ignored by PDF. */
  numFmt?: string;
}

/** Arguments handed to `customizeCell` for every exported data cell. */
export interface OgeExportCellArgs<T = unknown> {
  row: T;
  field: string | undefined;
  caption: string;
  /** Raw accessor value. */
  value: unknown;
  /** Default text the exporter would emit for this cell. */
  text: string;
  /** The exported column. */
  column?: OgeExportColumn<T>;
  /** Nesting level of the row (group / tree depth). */
  level?: number;
  /**
   * The cell's style (Excel and PDF) — mutate it to restyle the cell. Starts
   * from the exporter's defaults merged with `cellStyle`'s result. CSV
   * ignores it.
   */
  style?: OgeExportCellStyle;
}

/**
 * Arguments of the `cellStyle` hook — a plain, value-level styling seam that
 * also reaches header, group and summary lines (`row` is `undefined` there).
 */
export interface OgeExportCellStyleArgs<T = unknown> {
  row: T | undefined;
  column: OgeExportColumn<T>;
  value: unknown;
  kind: OgeExportRowKind;
  level: number;
}

export interface OgeExportOptions<T = unknown> {
  /**
   * Which rows to export. `'all'` (default) ignores paging and exports the
   * full filtered + sorted set; `'page'` exports only the current page;
   * `'selection'` exports the selected rows. Master-detail content is never
   * exported.
   */
  scope?: 'all' | 'page' | 'selection';
  /** Shorthand for `scope: 'selection'`. */
  selectedRowsOnly?: boolean;
  /**
   * `true` (default) exports the visible columns — columns hidden only by
   * the responsive width pass still count as visible; `false` also exports
   * the columns hidden with `visible: false` or the column chooser.
   */
  visibleColumnsOnly?: boolean;
  /**
   * Group rows (Excel outline levels) and group summaries when the grid is
   * grouped. Default `true`; CSV is always flat.
   */
  groups?: boolean;
  /** Group-footer and total summary rows. Default `true`. */
  summaries?: boolean;
  /**
   * Override what a data cell exports: return a replacement (string for
   * CSV/PDF; string/number/Date/boolean stay typed in Excel) or `undefined`
   * to keep the default. Mutate `style` to restyle the cell.
   */
  customizeCell?: (cell: OgeExportCellArgs<T>) => unknown;
  /**
   * Value-level styling (conditional formatting) for every exported cell —
   * header, group and summary lines included: return the style, or nothing.
   * Runs before `customizeCell`, which can still adjust it.
   */
  cellStyle?: (
    args: OgeExportCellStyleArgs<T>,
  ) => OgeExportCellStyle | undefined | void;
}

/** Cancelable: fires when a row drag starts (`rowDragging`). */
export interface OgeRowDragStartEvent<T = unknown> {
  key: RowKey;
  row: T;
  cancel: boolean;
}

/**
 * Cancelable: fires on the grid under the pointer while a row of the same
 * `rowDragGroup` is dragged over it — set `cancel` to refuse the spot.
 */
export interface OgeRowDragOverEvent {
  /** The dragging component's id (host `id`, else an internal id). */
  sourceComponentId: string;
  sourceKey: RowKey;
  sourceRow: unknown;
  /** The row under the pointer; `null` past the last row. */
  targetKey: RowKey | null;
  position: OgeRowDropPosition;
  cancel: boolean;
}

/**
 * Fires on the grid a row was dropped on — its own row (a reorder, which
 * also fires `rowReordered`) or one from another component of the same
 * `rowDragGroup`. Cross-component drops move no data: add the row to this
 * grid's data and remove it from the source's in the handler.
 */
export interface OgeRowDropEvent {
  sourceComponentId: string;
  targetComponentId: string;
  /** Whether the row came from this grid. */
  sameComponent: boolean;
  sourceKey: RowKey;
  sourceRow: unknown;
  targetKey: RowKey | null;
  targetRow: unknown;
  position: OgeRowDropPosition;
  /** Index among this grid's rendered data rows the row lands at. */
  toIndex: number;
}

/** Fires on the source grid when a row drag ended (dropped or cancelled). */
export interface OgeRowDragEndEvent<T = unknown> {
  key: RowKey;
  row: T;
  dropped: boolean;
  /** The component the row was dropped on; `null` when cancelled. */
  targetComponentId: string | null;
}
