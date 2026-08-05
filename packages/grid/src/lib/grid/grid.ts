import { NgTemplateOutlet } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ArrayDataSource,
  OffsetTree,
  buildCsv,
  computeWindow,
  createFieldAccessor,
  flattenGroupedData,
  groupNodeKey,
  resolveKeySelector,
  type CsvOptions,
  type GridStateSnapshot,
  type GroupedItem,
  type DataRowNode,
  type DataSource,
  type FilterExpr,
  type FilterOperator,
  type GroupRowNode,
  type RowKey,
  type RowNode,
  type SummaryDescriptor,
  type SummaryType,
  type ValueAccessor,
  type ViewportWindow,
} from '@oge-ui/core';
import { OgeColumn, type OgeColumnLookup, type OgeDataType } from '../columns/column';
import { OgeColumnGroup } from '../columns/column-group';
import { formatCellValue } from '../columns/value-format';
import {
  OGE_GRID_CONFIG,
  formatPattern,
  type OgeGridMessages,
} from '../config';
import { GridDataAdapter, WINDOW_BLOCK_SIZE } from '../data/grid-data-adapter';
import {
  OgeFilterBuilderGroup,
  builderToExpr,
  describeExpr,
  exprToBuilder,
  operatorsFor,
  type BuilderGroup,
  type FilterBuilderField,
} from '../filter-builder/filter-builder';
import { OgePager } from '../pager/pager';
import { GridStateStore } from '../state/grid-state.store';
import { OGE_STATE_STORAGE } from '../state/state-storage';
import type { OgeEditingOptions } from '../state/editing-slice';
import type { SelectionMode } from '../state/selection-slice';
import type { OgeEditTemplateContext } from '../templates/edit-template';
import type { OgeCellTemplateContext } from '../templates/cell-template';
import { OgeDetailTemplate, type OgeDetailTemplateContext } from '../templates/detail-template';
import { OgeNoDataTemplate } from '../templates/no-data-template';
import { OgeRowTemplate } from '../templates/row-template';
import { OgeToolbarItem } from '../templates/toolbar-item';
import type { OgeHeaderTemplateContext } from '../templates/header-template';

/** Programmatic column definition (alternative to declarative `<oge-column>`). */
export interface OgeColumnDef {
  field: string;
  caption?: string;
}

export interface OgeRowClickEvent<T = unknown> {
  row: T;
  key: RowKey;
  event: MouseEvent;
}

/** Column metadata handed to exporters (CSV / Excel). */
export interface OgeExportColumn<T = unknown> {
  caption: string;
  field: string | undefined;
  dataType: OgeDataType;
  accessor: (row: T) => unknown;
  format?: ((value: unknown) => string) | undefined;
}

export interface OgeExportData<T = unknown> {
  rows: readonly T[];
  columns: readonly OgeExportColumn<T>[];
}

export interface OgeExportOptions {
  /**
   * Which rows to export. `'all'` (default) ignores paging and exports the
   * full filtered + sorted set; `'page'` exports only the current page;
   * `'selection'` exports the selected rows. Master-detail content and group
   * headers are never exported — data rows only.
   */
  scope?: 'all' | 'page' | 'selection';
}

/** One button of the command column (`commandButtons` input). */
export interface OgeCommandButton<T = unknown> {
  /** Built-in behavior; omit for custom buttons. */
  name?: 'edit' | 'delete';
  /** Label for custom buttons (also the accessible name). */
  text?: string;
  onClick?: (row: T, key: RowKey) => void;
  /** Per-row visibility. */
  visible?: (row: T) => boolean;
}

export interface OgeRowReorderedEvent<T = unknown> {
  key: RowKey;
  targetKey: RowKey;
  /** Positions within the rendered (filtered/sorted) view. */
  fromIndex: number;
  toIndex: number;
  row: T;
}

export interface OgeCellClickEvent<T = unknown> {
  row: T;
  key: RowKey;
  field: string | undefined;
  value: unknown;
  event: Event;
}

export interface OgeMenuItem {
  text: string;
  disabled?: boolean;
  action?: () => void;
}

/** Emitted on row right-click; push into `items` to open the context menu. */
export interface OgeContextMenuEvent<T = unknown> {
  row: T;
  key: RowKey;
  clientX: number;
  clientY: number;
  items: OgeMenuItem[];
}

// --- DevExtreme-style option objects (boolean shorthands remain valid) ------

export interface OgeFilterRowOptions {
  visible?: boolean;
  /** Debounce for typing, in ms. */
  debounce?: number;
}

export interface OgeHeaderFilterOptions {
  visible?: boolean;
  /** Maximum distinct values listed in the popup. */
  valueLimit?: number;
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

export interface OgeDataChange<T = unknown> {
  type: 'insert' | 'update' | 'remove';
  key: RowKey;
  data?: Record<string, unknown> & Partial<T>;
}

/** Cancelable; set `cancel = true` in the handler to abort the save. */
export interface OgeSavingChangesEvent<T = unknown> {
  changes: OgeDataChange<T>[];
  cancel: boolean;
}

interface LookupItem {
  value: unknown;
  text: string;
}

interface ResolvedColumn<T = unknown> {
  /** Position within the full column set (stable under column virtualization). */
  absIndex: number;
  id: string;
  field: string | undefined;
  caption: string;
  dataType: OgeDataType;
  width: number | string | undefined;
  minWidth: number | undefined;
  sortable: boolean;
  filterable: boolean;
  filterOperator: FilterOperator | undefined;
  calculateFilterExpression:
    | ((value: unknown, operator: FilterOperator) => FilterExpr | null)
    | undefined;
  pinned: false | 'left' | 'right';
  accessor: ValueAccessor<T>;
  format: ((value: unknown) => string) | undefined;
  editable: boolean;
  lookupItems: readonly LookupItem[] | undefined;
  lookup: OgeColumnLookup | undefined;
  bandCaption: string | undefined;
  hidingPriority: number | undefined;
  cellTemplate: TemplateRef<OgeCellTemplateContext<T>> | undefined;
  headerTemplate: TemplateRef<OgeHeaderTemplateContext<T>> | undefined;
  editTemplate: TemplateRef<OgeEditTemplateContext<T>> | undefined;
  source: OgeColumn<T> | undefined;
}

/** Default filter-row operator per dataType. */
function defaultOperatorFor(dataType: OgeDataType): FilterOperator {
  return dataType === 'string' ? 'contains' : 'eq';
}

/** Maps a filter-row input value to a FilterExpr for the column's dataType. */
function buildRowFilterExpr(
  field: string,
  dataType: OgeDataType,
  raw: string,
  operator?: FilterOperator
): FilterExpr | null {
  const text = raw.trim();
  if (!text) return null;
  const op = operator ?? defaultOperatorFor(dataType);
  switch (dataType) {
    case 'number': {
      const value = Number(text);
      return Number.isNaN(value) ? null : { type: 'binary', field, op, value };
    }
    case 'boolean':
      return { type: 'binary', field, op: 'eq', value: text === 'true' };
    default:
      return { type: 'binary', field, op, value: text };
  }
}

function humanize(field: string): string {
  const last = field.split('.').pop() ?? field;
  const spaced = last.replace(/[_-]+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isDataSource<T>(value: readonly T[] | DataSource<T>): value is DataSource<T> {
  return !Array.isArray(value) && typeof (value as DataSource<T>).load === 'function';
}

function mapLookupItems(
  items: readonly unknown[],
  lookup: OgeColumnLookup
): readonly LookupItem[] {
  const valueOf = lookup.valueExpr ? createFieldAccessor(lookup.valueExpr) : (item: unknown) => item;
  const textOf = lookup.displayExpr ? createFieldAccessor(lookup.displayExpr) : (item: unknown) => item;
  return items.map((item) => ({
    value: valueOf(item),
    text: String(textOf(item) ?? ''),
  }));
}

/** Static lookups resolve once; function (cascading) lookups resolve per row. */
function resolveLookupItems(lookup: OgeColumnLookup | undefined): readonly LookupItem[] | undefined {
  if (!lookup || typeof lookup.dataSource === 'function') return undefined;
  return mapLookupItems(lookup.dataSource, lookup);
}

function lookupTextOf(items: readonly LookupItem[], value: unknown): string {
  const match = items.find((item) => item.value === value || String(item.value) === String(value));
  return match ? match.text : value == null ? '' : String(value);
}

const EXPANDER_WIDTH = 32;
const CHECKBOX_WIDTH = 36;
const COMMAND_WIDTH = 90;
const DRAG_WIDTH = 28;
const COLUMN_DRAG_TYPE = 'application/x-oge-column';

@Component({
  selector: 'oge-grid',
  imports: [NgTemplateOutlet, OgePager, ReactiveFormsModule, OgeFilterBuilderGroup],
  providers: [GridStateStore, GridDataAdapter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
  host: {
    class: 'oge-grid',
    '[class.oge-virtual]': 'virtualized()',
    '[class.oge-loading]': 'adapter.loading()',
    '[class.oge-wrap]': 'wordWrap()',
    '[class.oge-rtl]': 'rtl()',
    '[attr.dir]': "rtlEnabled() === undefined ? null : rtlEnabled() ? 'rtl' : 'ltr'",
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closePopups()',
  },
})
export class OgeGrid<T extends object = Record<string, unknown>> {
  protected readonly store = inject(GridStateStore);
  protected readonly adapter: GridDataAdapter<T> = inject(GridDataAdapter);
  private readonly config = inject(OGE_GRID_CONFIG);
  private readonly stateStorage = inject(OGE_STATE_STORAGE);

  /** Rows to render: a static array or any DataSource implementation. */
  readonly data = input<readonly T[] | DataSource<T>>([]);

  /**
   * Programmatic columns; used only when no declarative `<oge-column>` children
   * exist. When both are absent, columns are derived from the first row's keys.
   */
  readonly columns = input<readonly (string | OgeColumnDef)[] | undefined>(undefined);

  /** Field (or selector) producing a stable row key; falls back to the row index. */
  readonly keyField = input<keyof T | ((row: T) => RowKey) | undefined>(undefined);

  /** `false` disables sorting entirely; `'single'` restricts to one column (no shift+click chains). */
  readonly sortable = input<boolean | 'single' | 'multi'>('multi');

  /** DevExtreme-style sorting options; overrides the `sortable` shorthand. */
  readonly sorting = input<OgeSortingOptions | undefined>(undefined);

  readonly paging = input<false | OgePagingOptions>(false);

  /**
   * Renders only the rows inside the scroll viewport (plus overscan).
   * Give the grid a bounded height (e.g. `style="height: 600px"`) when enabled.
   */
  readonly virtualScroll = input(false);

  /** DevExtreme-style scrolling options; overrides the `virtualScroll` shorthand. */
  readonly scrolling = input<OgeScrollingOptions | undefined>(undefined);

  protected readonly effScrolling = computed<{
    mode: 'standard' | 'virtual' | 'infinite';
    remote: boolean;
  }>(() => {
    const options = this.scrolling();
    const mode = options?.mode ?? (this.virtualScroll() ? 'virtual' : 'standard');
    return { mode, remote: options?.remote ?? mode === 'infinite' };
  });

  /** Virtualized rendering active (virtual or infinite). */
  protected readonly virtualized = computed(() => this.effScrolling().mode !== 'standard');

  /** Sparse block-fetching active. */
  protected readonly windowed = computed(
    () => this.virtualized() && this.effScrolling().remote
  );

  /** Fixed row height in px used by the virtualizer. Defaults from global config. */
  readonly rowHeight = input<number | undefined>(undefined);

  /**
   * Measures real row heights (wrapped text, templates) instead of forcing
   * `rowHeight`, with scroll anchoring when heights above the viewport settle.
   * Virtual mode only; ignored in windowed (remote) mode.
   */
  readonly autoRowHeight = input(false);

  /** Height assumed for expanded master-detail rows in virtual mode. */
  readonly detailRowHeight = input<number | undefined>(undefined);

  /** Extra rows rendered above/below the virtual window. */
  readonly overscan = input<number | undefined>(undefined);

  /** Track minimum for columns without an explicit width. */
  readonly columnMinWidth = input<number | undefined>(undefined);

  /** Per-column filter editors below the header. */
  readonly filterRow = input<boolean | OgeFilterRowOptions>(false);

  /** Excel-style distinct-value filter button in headers. */
  readonly headerFilter = input<boolean | OgeHeaderFilterOptions>(false);

  /** Global search box above the grid. */
  readonly searchPanel = input<boolean | OgeSearchPanelOptions>(false);

  /** Per-grid overrides of the UI strings (see `provideOgeGridConfig` for app-wide). */
  readonly messages = input<Partial<OgeGridMessages> | undefined>(undefined);

  /**
   * Persists user state (sort, filters, grouping, column layout, page size)
   * under this key via `OGE_STATE_STORAGE` (default: localStorage) and
   * restores it on startup.
   */
  readonly stateKey = input<string | undefined>(undefined);

  /** Shows the filter panel bar with the filter-builder entry point. */
  readonly filterPanel = input(false);

  /** Two-way binding of the builder/programmatic filter expression. */
  readonly filterValue = model<FilterExpr | null>(null);

  /** Shows the drop area for drag-and-drop row grouping. */
  readonly groupPanel = input(false);

  /** Initial/programmatic grouping by field names (also drivable via the group panel). */
  readonly groupBy = input<readonly string[] | undefined>(undefined);

  /** DevExtreme-style grouping options (`autoExpandAll`, deferred loading). */
  readonly grouping = input<OgeGroupingOptions | undefined>(undefined);

  /** Shows the column visibility chooser button. */
  readonly columnChooser = input(false);

  /** Enables drag-resize handles on header edges. */
  readonly columnResize = input(true);

  /** Enables drag-and-drop column reordering. */
  readonly columnReorder = input(true);

  /** Debounce for text filter inputs, in ms. Set to 0 in tests. */
  readonly filterDebounce = input<number | undefined>(undefined);

  // --- effective options (input → option object → global config) -----------

  protected readonly msg = computed<OgeGridMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly effRowHeight = computed(() => this.rowHeight() ?? this.config.rowHeight);

  protected readonly effDetailRowHeight = computed(
    () => this.detailRowHeight() ?? this.config.detailRowHeight
  );

  private readonly effOverscan = computed(() => this.overscan() ?? this.config.overscan);

  protected readonly filterRowVisible = computed(() => {
    const value = this.filterRow();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  private readonly effFilterDebounce = computed(() => {
    const row = this.filterRow();
    const fromOptions = typeof row === 'object' ? row.debounce : undefined;
    return fromOptions ?? this.filterDebounce() ?? this.config.filterDebounce;
  });

  protected readonly headerFilterVisible = computed(() => {
    const value = this.headerFilter();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  private readonly effHeaderFilterLimit = computed(() => {
    const value = this.headerFilter();
    return (
      (typeof value === 'object' ? value.valueLimit : undefined) ??
      this.config.headerFilterValueLimit
    );
  });

  protected readonly searchPanelVisible = computed(() => {
    const value = this.searchPanel();
    return typeof value === 'boolean' ? value : value.visible !== false;
  });

  protected readonly searchPanelOptions = computed<OgeSearchPanelOptions>(() => {
    const value = this.searchPanel();
    return typeof value === 'object' ? value : {};
  });

  protected readonly sortMode = computed<'none' | 'single' | 'multi'>(() => {
    const explicit = this.sorting()?.mode;
    if (explicit) return explicit;
    const shorthand = this.sortable();
    if (shorthand === false) return 'none';
    return shorthand === true ? 'multi' : shorthand;
  });

  private readonly allowUnsorting = computed(
    () => this.sorting()?.allowUnsorting ?? this.config.allowUnsorting
  );

  protected readonly pagingOptions = computed<OgePagingOptions | null>(() => {
    const value = this.paging();
    return value === false ? null : value;
  });

  /** Row selection: none | single | multiple (ctrl/shift) | checkbox column. */
  readonly selectionMode = input<SelectionMode>('none');

  /** Two-way binding of the selected row keys. */
  readonly selectedKeys = model<RowKey[]>([]);

  readonly rowClick = output<OgeRowClickEvent<T>>();

  /** Fires on row right-click; add `items` in the handler to open the built-in menu. */
  readonly rowContextMenu = output<OgeContextMenuEvent<T>>();

  /** Fires when a data cell is clicked. */
  readonly cellClick = output<OgeCellClickEvent<T>>();

  /** Fires when a data row is double-clicked. */
  readonly rowDblClick = output<OgeRowClickEvent<T>>();

  /** Fires after the grid has rendered a new result set. */
  readonly contentReady = output<void>();

  /** Enables editing: `{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form', allow… }`. */
  readonly editing = input<false | OgeEditingOptions>(false);

  /** Fires before changes reach the DataSource; cancelable. */
  readonly savingChanges = output<OgeSavingChangesEvent<T>>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');

  protected readonly scrollTop = signal(0);
  protected readonly scrollLeft = signal(0);
  protected readonly viewportHeight = signal(400);

  protected readonly detailTemplate = contentChild(OgeDetailTemplate<T>);
  protected readonly declaredColumns = contentChildren<OgeColumn<T>>(OgeColumn, {
    descendants: true,
  });
  protected readonly columnGroups = contentChildren<OgeColumnGroup<T>>(OgeColumnGroup);

  /** New inputs (wordWrap) + responsive width tracking. */
  readonly wordWrap = input(false);
  protected readonly hostWidth = signal(0);

  /** Alternating row background (zebra striping), stable under virtualization. */
  readonly rowAlternation = input(false);

  /**
   * Right-to-left layout. `undefined` (default) auto-detects the inherited
   * CSS `direction`; `true`/`false` force it.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);

  /** Direction detected from the DOM when `rtlEnabled` is not set. */
  private readonly detectedRtl = signal(false);

  protected readonly rtl = computed(() => this.rtlEnabled() ?? this.detectedRtl());

  /**
   * Drag-handle column for reordering rows. With plain-array data the array
   * is mutated in place; DataSource consumers handle `rowReordered` instead.
   */
  readonly rowDragging = input(false);

  /** Fires after a row is dropped in a new position. */
  readonly rowReordered = output<OgeRowReorderedEvent<T>>();

  /**
   * Customizes the trailing command column: reorder/mix the built-in
   * 'edit'/'delete' buttons with custom ones (text + onClick), with an
   * optional per-row `visible` predicate.
   */
  readonly commandButtons = input<readonly OgeCommandButton<T>[] | undefined>(undefined);

  /** Highlights and tracks a single focused row (DevExtreme focusedRowEnabled). */
  readonly focusedRowEnabled = input(false);

  /** Two-way binding of the focused row's key. */
  readonly focusedRowKey = model<RowKey | null>(null);

  /** Spinner overlay while a load is in flight. */
  readonly loadPanel = input(false);

  protected readonly noDataTemplate = contentChild(OgeNoDataTemplate);
  protected readonly rowTemplate = contentChild(OgeRowTemplate<T>);
  protected readonly toolbarItems = contentChildren(OgeToolbarItem);

  constructor() {
    // measure real row heights once the DOM for the current window is in place
    afterRenderEffect(() => {
      if (!this.measuring()) return;
      this.viewNodes();
      this.measureRenderedRows();
    });
    // contentReady: after the DOM for a new result set is in place
    afterRenderEffect(() => {
      if (this.adapter.result() === null) return;
      untracked(() => this.contentReady.emit());
    });
    effect(() => {
      const data = this.data();
      const keyField = this.keyField();
      const sortValues = this.sortValueSelectors();
      this.adapter.setSource(
        isDataSource(data) ? data : new ArrayDataSource<T>(data, { key: keyField, sortValues })
      );
    });
    // Inline object/array bindings produce a fresh reference on every change
    // detection pass; these effects must react to *content* changes only,
    // otherwise they would keep overwriting user-driven state (pager size,
    // group panel) with the template literal.
    let lastPagingJson: string | undefined;
    effect(() => {
      const options = this.pagingOptions();
      const json = options ? JSON.stringify(options) : 'off';
      if (json === lastPagingJson) return;
      lastPagingJson = json;
      untracked(() => this.store.paging.configure(options ? options.pageSize : null));
    });
    let lastGroupByJson: string | undefined;
    effect(() => {
      const fields = this.groupBy();
      if (fields === undefined) return;
      const json = JSON.stringify(fields);
      if (json === lastGroupByJson) return;
      lastGroupByJson = json;
      untracked(() =>
        this.store.grouping.set(fields.map((field) => ({ field, dir: 'asc' as const })))
      );
    });
    // summary configuration comes from the declared columns
    effect(() => {
      const group: SummaryDescriptor[] = [];
      const total: SummaryDescriptor[] = [];
      for (const column of this.declaredColumns()) {
        const field = column.field();
        if (!field) continue;
        const groupType = column.groupSummary();
        if (groupType) group.push({ field, type: groupType });
        const totalType = column.totalSummary();
        if (totalType) total.push({ field, type: totalType });
      }
      this.store.grouping.setSummaries(group, total);
    });
    // selectedKeys model ⇄ selection slice (guarded both ways)
    effect(() => {
      const keys = this.selectedKeys();
      untracked(() => {
        const current = this.store.selection.selected();
        if (keys.length === current.size && keys.every((key) => current.has(key))) return;
        this.store.selection.replace(keys);
      });
    });
    effect(() => {
      const selected = this.store.selection.selected();
      untracked(() => {
        const keys = this.selectedKeys();
        if (keys.length === selected.size && keys.every((key) => selected.has(key))) return;
        this.selectedKeys.set([...selected]);
      });
    });
    // focus the first editor when one opens
    effect(() => {
      const cell = this.store.editing.editCell();
      const rowKey = this.store.editing.editRowKey();
      if (!cell && rowKey === null) return;
      setTimeout(() => {
        this.hostRef.nativeElement.querySelector<HTMLElement>('.oge-editor')?.focus();
      });
    });
    // focus follows the keyboard-navigation cell — unless an editor is open
    // (the editor-focus effect above owns the focus then)
    effect(() => {
      const cell = this.focusedCell();
      if (!cell) return;
      const editorOpen = untracked(
        () => this.store.editing.editCell() !== null || this.store.editing.editRowKey() !== null
      );
      if (editorOpen) return;
      untracked(() => {
        this.scrollRowIntoView(cell.row);
        this.scrollColumnIntoView(cell.col);
      });
      setTimeout(() => {
        if (this.store.editing.editCell() !== null || this.store.editing.editRowKey() !== null) {
          return;
        }
        const viewport = this.viewportRef()?.nativeElement;
        const el = viewport?.querySelector<HTMLElement>(`[data-cell="${cell.row}-${cell.col}"]`);
        el?.focus({ preventScroll: true });
      });
    });
    // filterValue model ⇄ builder filter slice (guarded both ways)
    effect(() => {
      const value = this.filterValue();
      untracked(() => {
        const current = this.store.filter.builderFilter();
        if (JSON.stringify(value) === JSON.stringify(current)) return;
        this.store.filter.setBuilderFilter(value);
      });
    });
    effect(() => {
      const current = this.store.filter.builderFilter();
      untracked(() => {
        if (JSON.stringify(current) === JSON.stringify(this.filterValue())) return;
        this.filterValue.set(current);
      });
    });
    // --- state persistence (stateKey) ---
    effect(() => {
      const key = this.stateKey();
      const columns = this.declaredColumns();
      if (!key || this.restoredStateKey === key) return;
      this.restoredStateKey = key;
      const raw = untracked(() => this.stateStorage.get(`oge-grid:${key}`));
      if (!raw) return;
      try {
        const snapshot = JSON.parse(raw) as GridStateSnapshot;
        untracked(() => {
          this.store.applySnapshot(snapshot);
          const hidden = new Set(snapshot.columns?.hidden ?? []);
          for (const column of columns) {
            const field = column.field();
            if (field) column.visible.set(!hidden.has(field));
          }
        });
      } catch {
        // corrupt persisted state — start clean
      }
    });
    effect(() => {
      const key = this.stateKey();
      if (!key) return;
      const snapshot = this.persistedSnapshot();
      untracked(() => {
        clearTimeout(this.stateSaveTimer);
        this.stateSaveTimer = setTimeout(
          () => this.stateStorage.set(`oge-grid:${key}`, JSON.stringify(snapshot)),
          250
        );
      });
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.stateSaveTimer));
    // initial sort/group from column inputs — applied only while the slices
    // are untouched (so stateKey restore and user interaction win)
    effect(() => {
      const columns = this.declaredColumns();
      const sortConfigs = columns
        .map((column) => ({
          field: column.field(),
          dir: column.sortOrder(),
          index: column.sortIndex() ?? 0,
        }))
        .filter((c): c is { field: string; dir: 'asc' | 'desc'; index: number } =>
          Boolean(c.field && c.dir)
        )
        .sort((a, b) => a.index - b.index);
      const groupConfigs = columns
        .map((column) => ({ field: column.field(), index: column.groupIndex() }))
        .filter((c): c is { field: string; index: number } =>
          Boolean(c.field && c.index !== undefined)
        )
        .sort((a, b) => a.index - b.index);
      untracked(() => {
        if (sortConfigs.length && this.store.sort.descriptors().length === 0) {
          this.store.sort.set(sortConfigs.map(({ field, dir }) => ({ field, dir })));
        }
        if (groupConfigs.length && this.store.grouping.descriptors().length === 0) {
          this.store.grouping.set(
            groupConfigs.map(({ field }) => ({ field, dir: 'asc' as const }))
          );
        }
      });
    });
    afterNextRender(() => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!viewport || typeof ResizeObserver === 'undefined') return;
      this.viewportHeight.set(viewport.clientHeight);
      this.hostWidth.set(viewport.clientWidth);
      const observer = new ResizeObserver(() => {
        this.viewportHeight.set(viewport.clientHeight);
        this.hostWidth.set(viewport.clientWidth);
      });
      observer.observe(viewport);
      this.destroyRef.onDestroy(() => observer.disconnect());
      this.detectedRtl.set(
        getComputedStyle(this.hostRef.nativeElement).direction === 'rtl'
      );
    });
  }

  protected onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.scrollTop.set(target.scrollTop);
    this.scrollLeft.set(target.scrollLeft);
  }

  // --- state persistence ----------------------------------------------------

  private restoredStateKey: string | null = null;
  private stateSaveTimer: ReturnType<typeof setTimeout> | undefined;

  /** Store snapshot + column visibility (which lives on the column directives). */
  private readonly persistedSnapshot = computed<GridStateSnapshot>(() => {
    const base = this.store.snapshot();
    const hidden = this.declaredColumns()
      .filter((column) => !column.visible())
      .map((column) => column.field())
      .filter((field): field is string => field != null);
    return { ...base, columns: { ...base.columns, hidden } };
  });

  // --- imperative API -------------------------------------------------------

  /** Re-runs the current load against the DataSource. */
  refresh(): void {
    this.adapter.reload();
  }

  /** Expands every group row (all levels). */
  expandAllGroups(): void {
    this.store.expansion.setGroups(
      untracked(this.groupsAutoExpand) ? new Set() : this.collectGroupKeys()
    );
  }

  /** Collapses every group row (all levels). */
  collapseAllGroups(): void {
    this.store.expansion.setGroups(
      untracked(this.groupsAutoExpand) ? this.collectGroupKeys() : new Set()
    );
  }

  /** All group node keys of the current result, across levels. */
  private collectGroupKeys(): Set<RowKey> {
    const keys = new Set<RowKey>();
    const result = untracked(this.adapter.result);
    if (!result?.data.length) return keys;
    const visit = (items: readonly unknown[], parentKey: RowKey | null): void => {
      for (const item of items) {
        if (typeof item !== 'object' || item === null || !('items' in item) || !('key' in item)) {
          return;
        }
        const group = item as GroupedItem<T>;
        const key = groupNodeKey(parentKey, group.key);
        keys.add(key);
        if (group.items?.length) visit(group.items, key);
      }
    };
    visit(result.data, null);
    return keys;
  }

  /** Clears every filter: row filters, header filters, builder filter and search. */
  clearFilters(): void {
    this.store.filter.clearAll();
  }

  /** Clears the sort order. */
  clearSorting(): void {
    this.store.sort.clear();
  }

  /**
   * Scrolls a row into the viewport — by flat index, or by row key when a
   * `RowKey` is given.
   */
  scrollToRow(target: number | RowKey): void {
    const nodes = untracked(this.flatNodes);
    let index = nodes.findIndex((node) => node.key === target);
    if (index < 0 && typeof target === 'number' && target >= 0 && target < nodes.length) {
      index = target;
    }
    if (index >= 0) this.scrollRowIntoView(index);
  }

  // --- export ---------------------------------------------------------------

  /**
   * Rows and column metadata of the current view (filter + search + sort
   * applied) — the shared source for CSV/Excel exporters. By default paging
   * is ignored (the full filtered set is exported); pass
   * `{ scope: 'page' | 'selection' }` to narrow it.
   */
  async getExportData(options: OgeExportOptions = {}): Promise<OgeExportData<T>> {
    const scope = options.scope ?? 'all';
    const source = untracked(this.adapter.source);
    const load = untracked(this.store.loadOptions);
    const result = source
      ? await source.load({
          ...(load.sort?.length ? { sort: load.sort } : {}),
          ...(load.filter ? { filter: load.filter } : {}),
          ...(load.searchText ? { searchText: load.searchText } : {}),
          ...(scope === 'page' && load.take != null
            ? { skip: load.skip ?? 0, take: load.take }
            : {}),
        })
      : { data: [] };
    let rows = result.data as readonly T[];
    if (scope === 'selection') {
      const selected = untracked(this.store.selection.selected);
      const keyOf = untracked(this.keySelector);
      rows = rows.filter((row, index) => selected.has(keyOf(row, index)));
    }
    return { rows, columns: this.exportColumns() };
  }

  /** Field columns with display formatting resolved (lookup text, booleans). */
  private exportColumns(): OgeExportColumn<T>[] {
    const messages = untracked(this.msg);
    return untracked(this.resolvedColumns)
      .filter((column) => column.field)
      .map((column) => ({
        caption: column.caption,
        field: column.field,
        dataType: column.dataType,
        accessor: column.accessor as (row: T) => unknown,
        format:
          column.format ??
          (column.lookupItems
            ? (value: unknown) => lookupTextOf(column.lookupItems as LookupItem[], value)
            : column.dataType === 'boolean'
              ? (value: unknown) => (value ? messages.booleanTrue : messages.booleanFalse)
              : undefined),
      }));
  }

  /**
   * Copies the selected rows (with a header) — or, without a selection, the
   * focused cell's text — to the clipboard as tab-separated values.
   */
  async copyToClipboard(): Promise<void> {
    const text = this.clipboardText();
    if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }

  private clipboardText(): string {
    const nodes = untracked(this.flatNodes);
    const columns = this.exportColumns();
    const selected = untracked(this.store.selection.selected);
    const rows = nodes
      .filter((node): node is DataRowNode<T> => node.kind === 'data' && selected.has(node.key))
      .map((node) => node.data);
    if (rows.length) return buildCsv(rows, columns, { separator: '\t', bom: false });
    const cell = untracked(this.focusedCell);
    const node = cell ? nodes[cell.row] : undefined;
    const column = cell ? untracked(this.resolvedColumns)[cell.col] : undefined;
    if (!node || node.kind !== 'data' || !column) return '';
    const value = column.accessor(node.data);
    return value == null ? '' : column.format ? column.format(value) : String(value);
  }

  /** Builds CSV of the current view; `scope` narrows to the page or selection. */
  async getCsv(options?: CsvOptions & OgeExportOptions): Promise<string> {
    const { rows, columns } = await this.getExportData({ scope: options?.scope });
    return buildCsv(rows, columns, options);
  }

  /** Downloads the current view as a CSV file. */
  async exportCsv(filename = 'grid.csv'): Promise<void> {
    const csv = await this.getCsv();
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // --- data & rows ---------------------------------------------------------

  private readonly keySelector = computed<(row: T, index: number) => RowKey>(() => {
    const key = this.keyField();
    if (key === undefined) return (_row, index) => index;
    const selector = resolveKeySelector<T>(key);
    return (row) => selector(row);
  });

  /** Backwards-compatible alias used by the template's track expressions. */
  protected readonly keyOf = this.keySelector;

  protected readonly grouped = computed(() => this.store.grouping.descriptors().length > 0);

  /** Rows expand/collapse when grouped or with master-detail → `treegrid`, else `grid`. */
  protected readonly gridRole = computed(() =>
    this.grouped() || this.detailTemplate() !== undefined ? 'treegrid' : 'grid'
  );

  /** `autoExpandAll: false` inverts group expansion: the toggled set holds *expanded* keys. */
  private readonly groupsAutoExpand = computed(() => this.grouping()?.autoExpandAll !== false);

  /** Per-field `calculateSortValue` selectors (array data only). */
  private readonly sortValueSelectors = computed<
    Record<string, (row: T) => unknown> | undefined
  >(() => {
    const entries = this.declaredColumns().flatMap((column) => {
      const field = column.field();
      const calculate = column.calculateSortValue();
      return field && calculate ? [[field, calculate] as const] : [];
    });
    return entries.length ? Object.fromEntries(entries) : undefined;
  });

  // --- deferred group loading ----------------------------------------------

  /** Children fetched on demand for groups delivered with `items: null`. */
  private readonly deferredGroupRows = signal<
    ReadonlyMap<RowKey, readonly unknown[]>
  >(new Map());

  /** Expanded groups whose children are neither in the payload nor cached yet. */
  private readonly pendingGroups = computed<{ key: RowKey; path: unknown[] }[]>(() => {
    const result = this.adapter.result();
    const groups = this.store.grouping.descriptors();
    if (!result || !groups.length || !result.data.length) return [];
    const first = result.data[0] as Record<string, unknown> | null;
    if (typeof first !== 'object' || first === null || !('items' in first)) return [];
    const autoExpand = this.groupsAutoExpand();
    const toggled = this.store.expansion.collapsedGroups();
    const cache = this.deferredGroupRows();
    const pending: { key: RowKey; path: unknown[] }[] = [];
    const visit = (
      items: readonly GroupedItem<T>[],
      parentKey: RowKey | null,
      path: readonly unknown[]
    ): void => {
      for (const item of items) {
        const key = groupNodeKey(parentKey, item.key);
        const expanded = autoExpand ? !toggled.has(key) : toggled.has(key);
        if (!expanded) continue;
        const children = item.items ?? cache.get(key) ?? null;
        if (children === null) {
          pending.push({ key, path: [...path, item.key] });
          continue;
        }
        const child = children[0] as Record<string, unknown> | undefined;
        if (child && typeof child === 'object' && 'items' in child && 'key' in child) {
          visit(children as readonly GroupedItem<T>[], key, [...path, item.key]);
        }
      }
    };
    visit(result.data as readonly GroupedItem<T>[], null, []);
    return pending;
  });

  private readonly pendingGroupLoads = new Set<RowKey>();
  private deferredBaseJson: string | null = null;

  /** Fetches children for expanded deferred groups; base changes drop the cache. */
  private readonly deferredGroupEffect = effect(() => {
    const pending = this.pendingGroups();
    const base = this.store.loadOptions();
    untracked(() => {
      const { signal: _signal, skip: _skip, take: _take, ...rest } = base;
      const baseJson = JSON.stringify(rest);
      if (baseJson !== this.deferredBaseJson) {
        this.deferredBaseJson = baseJson;
        this.pendingGroupLoads.clear();
        if (this.deferredGroupRows().size) this.deferredGroupRows.set(new Map());
      }
      const source = this.adapter.source();
      if (!source) return;
      const groups = rest.group ?? [];
      for (const entry of pending) {
        if (this.pendingGroupLoads.has(entry.key)) continue;
        this.pendingGroupLoads.add(entry.key);
        const pathFilters: FilterExpr[] = entry.path.map((value, i) => ({
          type: 'binary',
          field: groups[i]?.field ?? '',
          op: 'eq',
          value,
        }));
        const operands = [...(rest.filter ? [rest.filter] : []), ...pathFilters];
        const filter = operands.length === 1 ? operands[0] : { type: 'and' as const, operands };
        const remaining = groups.slice(entry.path.length);
        source
          .load({
            filter,
            ...(rest.sort?.length ? { sort: rest.sort } : {}),
            ...(rest.searchText ? { searchText: rest.searchText } : {}),
            ...(remaining.length
              ? {
                  group: remaining,
                  ...(rest.groupSummary?.length ? { groupSummary: rest.groupSummary } : {}),
                }
              : {}),
          })
          .then((result) => {
            if (this.deferredBaseJson !== baseJson) return; // stale base
            const next = new Map(untracked(this.deferredGroupRows));
            next.set(entry.key, result.data as readonly unknown[]);
            this.deferredGroupRows.set(next);
          })
          .catch((err) => this.adapter.error.set(err))
          .finally(() => this.pendingGroupLoads.delete(entry.key));
      }
    });
  });

  protected readonly flatNodes = computed<RowNode<T>[]>(() => {
    const result = this.adapter.result();
    const toggledGroups = this.store.expansion.collapsedGroups();
    const flattened = result
      ? flattenGroupedData<T>(result.data as readonly T[], {
          keyOf: this.keySelector(),
          groups: this.store.grouping.descriptors(),
          groupSummary: this.store.grouping.groupSummary(),
          ...(this.groupsAutoExpand()
            ? { collapsedGroupKeys: toggledGroups }
            : { expandedGroupKeys: toggledGroups }),
          deferredChildren: this.deferredGroupRows() as ReadonlyMap<RowKey, readonly T[]>,
          expandedDetailKeys: this.detailTemplate()
            ? this.store.expansion.expandedDetails()
            : undefined,
        })
      : [];
    // unsaved new rows render on top
    const added = this.store.editing.added();
    if (!added.length) return flattened;
    const addedNodes: RowNode<T>[] = added.map((key, index) => ({
      kind: 'data',
      key,
      data: {} as T,
      sourceIndex: -1 - index,
      level: 0,
    }));
    return [...addedNodes, ...flattened];
  });

  private readonly firstDataRow = computed<T | undefined>(() => {
    const node = this.flatNodes().find((n) => n.kind === 'data');
    if (node?.kind === 'data') return node.data;
    // windowed mode never populates the full result; sample the block cache
    const first = this.adapter.windowRows().values().next();
    return first.done ? undefined : first.value;
  });

  protected readonly totalCount = computed<number>(() => {
    if (this.windowed()) return this.adapter.windowTotal() ?? this.adapter.highestLoaded();
    const result = this.adapter.result();
    if (result?.totalCount != null) return result.totalCount;
    return this.flatNodes().reduce((count, node) => (node.kind === 'data' ? count + 1 : count), 0);
  });

  protected readonly pageCount = computed<number>(() => {
    const pageSize = this.store.paging.pageSize();
    return pageSize == null ? 1 : Math.max(1, Math.ceil(this.totalCount() / pageSize));
  });

  // --- virtualization ------------------------------------------------------

  /**
   * Row count of the windowed virtual space. With an unknown total (pure
   * infinite scrolling) the space grows one block past the highest loaded row,
   * so the user can always scroll further until the source runs dry.
   */
  private readonly windowCount = computed<number>(() => {
    const total = this.adapter.windowTotal();
    if (total != null) return total;
    return this.adapter.highestLoaded() + WINDOW_BLOCK_SIZE;
  });

  /** Measured row heights by row key (auto row-height mode). */
  private readonly measuredHeights = signal<ReadonlyMap<RowKey, number>>(new Map());

  private readonly measuring = computed(
    () => this.autoRowHeight() && this.virtualized() && !this.windowed()
  );

  private readonly offsetTree = computed<OffsetTree>(() => {
    const rowHeight = this.effRowHeight();
    if (this.windowed()) {
      return new OffsetTree(this.windowCount(), () => rowHeight);
    }
    const nodes = this.flatNodes();
    const detailHeight = this.effDetailRowHeight();
    const measured = this.measuring() ? this.measuredHeights() : null;
    return new OffsetTree(nodes.length, (i) => {
      const node = nodes[i];
      return (
        measured?.get(node.key) ?? (node.kind === 'detail' ? detailHeight : rowHeight)
      );
    });
  });

  /**
   * Reads real row heights after each render and folds them into the offset
   * tree. Corrections above the first visible row shift `scrollTop` by the
   * same delta (scroll anchoring), so content on screen never jumps.
   */
  private measureRenderedRows(): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    const nodes = untracked(this.flatNodes);
    const defaults = {
      row: untracked(this.effRowHeight),
      detail: untracked(this.effDetailRowHeight),
    };
    const current = untracked(this.measuredHeights);
    const anchorIndex = untracked(this.viewStart);
    let changed: Map<RowKey, number> | null = null;
    let deltaAbove = 0;
    for (const el of viewport.querySelectorAll<HTMLElement>('[data-rowindex]')) {
      const index = Number(el.dataset['rowindex']);
      const node = nodes[index];
      const height = el.offsetHeight;
      if (!node || !height) continue;
      const previous =
        current.get(node.key) ?? (node.kind === 'detail' ? defaults.detail : defaults.row);
      if (Math.abs(height - previous) < 1) continue;
      (changed ??= new Map(current)).set(node.key, height);
      if (index < anchorIndex) deltaAbove += height - previous;
    }
    if (!changed) return;
    this.measuredHeights.set(changed);
    if (deltaAbove !== 0) {
      viewport.scrollTop += deltaAbove;
      this.scrollTop.set(viewport.scrollTop);
    }
  }

  protected readonly viewWindow = computed<ViewportWindow | null>(() => {
    if (!this.virtualized()) return null;
    return computeWindow(
      this.scrollTop(),
      this.viewportHeight(),
      this.offsetTree(),
      this.effOverscan()
    );
  });

  /** Index of the first rendered node within the flat row space. */
  protected readonly viewStart = computed(() => this.viewWindow()?.start ?? 0);

  protected readonly viewNodes = computed<readonly RowNode<T>[]>(() => {
    const window = this.viewWindow();
    if (this.windowed()) {
      const rows = this.adapter.windowRows();
      const keyOf = this.keySelector();
      const start = window?.start ?? 0;
      const end = window?.end ?? Math.min(this.windowCount(), WINDOW_BLOCK_SIZE);
      const nodes: RowNode<T>[] = [];
      for (let i = start; i < end; i++) {
        const row = rows.get(i);
        nodes.push(
          row !== undefined
            ? { kind: 'data', key: keyOf(row, i), data: row, sourceIndex: i, level: 0 }
            : { kind: 'filler', key: `oge-filler-${i}`, index: i }
        );
      }
      return nodes;
    }
    const nodes = this.flatNodes();
    return window ? nodes.slice(window.start, window.end) : nodes;
  });

  /** Keeps the adapter's load strategy in sync with the scrolling options. */
  private readonly windowModeEffect = effect(() => {
    const windowed = this.windowed();
    untracked(() => this.adapter.setMode(windowed ? 'window' : 'full'));
  });

  /**
   * Requests the blocks covering the visible window (plus one block of
   * read-ahead). Tracking `loadOptions` re-triggers after sort/filter changes,
   * which invalidate the adapter's block cache.
   */
  private readonly windowRequestEffect = effect(() => {
    if (!this.windowed()) return;
    if (!this.adapter.source()) return; // re-run once the source is attached
    const window = this.viewWindow();
    this.store.loadOptions();
    untracked(() => {
      const start = window?.start ?? 0;
      const end = window?.end ?? WINDOW_BLOCK_SIZE;
      this.adapter.requestRange(start, end + WINDOW_BLOCK_SIZE);
    });
  });

  protected readonly bodyHeight = computed<number | null>(
    () => this.viewWindow()?.totalHeight ?? null
  );

  protected readonly rowsTransform = computed<string | null>(() => {
    const window = this.viewWindow();
    return window ? `translateY(${window.offsetY}px)` : null;
  });

  // --- columns -------------------------------------------------------------

  /** OgeColumn instance → band caption (from `<oge-column-group>`). */
  private readonly bandByColumn = computed<ReadonlyMap<OgeColumn<T>, string>>(() => {
    const map = new Map<OgeColumn<T>, string>();
    for (const group of this.columnGroups()) {
      for (const column of group.columns()) map.set(column, group.caption());
    }
    return map;
  });

  protected readonly resolvedColumns = computed<ResolvedColumn<T>[]>(() => {
    const widthOverrides = this.store.columns.widthOverrides();
    const pinOverrides = this.store.columns.pinOverrides();
    const declared = this.declaredColumns();
    const bands = this.bandByColumn();
    const adaptiveHidden = this.adaptiveHiddenIds();
    let columns: Omit<ResolvedColumn<T>, 'absIndex'>[];
    if (declared.length) {
      columns = declared
        .filter((column) => column.visible())
        .map((column, index) => {
          const field = column.field();
          const id = field ?? `col-${index}`;
          const calculate = column.calculateCellValue();
          return {
            id,
            field,
            caption: column.caption() ?? (field ? humanize(field) : ''),
            dataType: column.dataType(),
            width: widthOverrides.get(id) ?? column.width(),
            minWidth: column.minWidth(),
            sortable: column.sortable() && field != null,
            filterable: column.filterable() && field != null,
            filterOperator: column.filterOperator(),
            calculateFilterExpression: column.calculateFilterExpression(),
            pinned: pinOverrides.get(id) ?? column.pinned(),
            accessor: calculate ?? (field ? createFieldAccessor<T>(field) : () => undefined),
            format: column.format(),
            editable: column.editable() && field != null && !calculate,
            lookupItems: resolveLookupItems(column.lookup()),
            lookup: column.lookup(),
            bandCaption: bands.get(column),
            hidingPriority: column.hidingPriority(),
            cellTemplate: column.cellTemplate()?.templateRef,
            headerTemplate: column.headerTemplate()?.templateRef,
            editTemplate: column.editTemplate()?.templateRef,
            source: column,
          };
        })
        .filter((column) => !adaptiveHidden.has(column.id));
    } else {
      const defs = this.columns();
      const fields = defs?.length
        ? defs.map((def) => (typeof def === 'string' ? { field: def, caption: undefined } : def))
        : Object.keys(this.firstDataRow() ?? {}).map((field) => ({ field, caption: undefined }));
      columns = fields.map(({ field, caption }) => ({
        id: field,
        field,
        caption: caption ?? humanize(field),
        dataType: 'string' as const,
        width: widthOverrides.get(field),
        minWidth: undefined,
        sortable: true,
        filterable: true,
        filterOperator: undefined,
        calculateFilterExpression: undefined,
        pinned: pinOverrides.get(field) ?? (false as const),
        lookupItems: undefined,
        lookup: undefined,
        bandCaption: undefined,
        hidingPriority: undefined,
        accessor: createFieldAccessor<T>(field),
        format: undefined,
        editable: true,
        cellTemplate: undefined,
        headerTemplate: undefined,
        editTemplate: undefined,
        source: undefined,
      }));
    }
    // user-defined order, then pinned columns forced to the edges
    const order = this.store.columns.order();
    if (order) {
      columns = [...columns].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib);
      });
    }
    const left = columns.filter((c) => c.pinned === 'left');
    const right = columns.filter((c) => c.pinned === 'right');
    const middle = columns.filter((c) => !c.pinned);
    return [...left, ...middle, ...right].map((column, index) => ({ ...column, absIndex: index }));
  });

  /**
   * Responsive column hiding: when the fixed/estimated widths exceed the
   * available width, columns with a `hidingPriority` are hidden starting
   * from the lowest priority.
   */
  private readonly adaptiveHiddenIds = computed<ReadonlySet<string>>(() => {
    const hostWidth = this.hostWidth();
    if (!hostWidth) return new Set();
    const declared = this.declaredColumns().filter((column) => column.visible());
    if (!declared.length) return new Set();
    const defaultMin = this.columnMinWidth() ?? this.config.columnMinWidth;
    const widthOf = (column: OgeColumn<T>): number => {
      const width = column.width();
      if (typeof width === 'number') return width;
      return column.minWidth() ?? defaultMin;
    };
    const leading =
      (this.detailTemplate() ? EXPANDER_WIDTH : 0) +
      (this.selectionMode() === 'checkbox' ? CHECKBOX_WIDTH : 0);
    let total = leading + declared.reduce((sum, column) => sum + widthOf(column), 0);
    const hidden = new Set<string>();
    const candidates = declared
      .filter((column) => column.hidingPriority() !== undefined)
      .sort((a, b) => (a.hidingPriority() ?? 0) - (b.hidingPriority() ?? 0));
    for (const column of candidates) {
      if (total <= hostWidth) break;
      const field = column.field();
      if (!field) continue;
      hidden.add(field);
      total -= widthOf(column);
    }
    return hidden;
  });

  /** Band header cells (caption + span) for the current column order. */
  protected readonly bandRow = computed<{ caption: string | null; span: number }[] | null>(() => {
    const columns = this.resolvedColumns();
    if (!columns.some((column) => column.bandCaption)) return null;
    const cells: { caption: string | null; span: number }[] = [];
    for (const column of columns) {
      const caption = column.bandCaption ?? null;
      const last = cells[cells.length - 1];
      if (last && last.caption !== null && last.caption === caption) last.span += 1;
      else cells.push({ caption, span: 1 });
    }
    return cells;
  });

  /** True when a leading expander column is rendered (master-detail active). */
  protected readonly hasExpander = computed(() => this.detailTemplate() !== undefined);

  protected readonly hasCheckboxColumn = computed(() => this.selectionMode() === 'checkbox');

  /** Number of leading utility cells (expander / checkbox) before data columns. */
  protected readonly leadingCellCount = computed(
    () =>
      (this.rowDragging() ? 1 : 0) +
      (this.hasExpander() ? 1 : 0) +
      (this.hasCheckboxColumn() ? 1 : 0)
  );

  private readonly leadingWidth = computed(
    () =>
      (this.rowDragging() ? DRAG_WIDTH : 0) +
      (this.hasExpander() ? EXPANDER_WIDTH : 0) +
      (this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0)
  );

  private readonly effColumnMinWidth = computed(
    () => this.columnMinWidth() ?? this.config.columnMinWidth
  );

  // --- column virtualization ------------------------------------------------

  /** Extra horizontal pixels rendered on each side of the viewport. */
  private static readonly COL_OVERSCAN_PX = 200;

  /**
   * Column virtualization is opt-in and requires plain columns: pinned columns
   * and bands rely on every column being present in the DOM.
   */
  protected readonly colVirtualized = computed(
    () =>
      this.scrolling()?.columnRenderingMode === 'virtual' &&
      this.bandRow() === null &&
      this.resolvedColumns().every((column) => column.pinned === false)
  );

  /** Effective numeric width per column (fallback: min width) for prefix sums. */
  private readonly colWidths = computed<readonly number[]>(() => {
    const defaultMin = this.effColumnMinWidth();
    return this.resolvedColumns().map((column) =>
      typeof column.width === 'number' ? column.width : (column.minWidth ?? defaultMin)
    );
  });

  private readonly colRange = computed<{
    start: number;
    end: number;
    spacerLeft: number;
    spacerRight: number;
  } | null>(() => {
    if (!this.colVirtualized()) return null;
    const widths = this.colWidths();
    const viewLeft = this.scrollLeft() - OgeGrid.COL_OVERSCAN_PX;
    const viewRight =
      this.scrollLeft() + (this.hostWidth() || 1200) + OgeGrid.COL_OVERSCAN_PX;
    let x = this.leadingWidth();
    let start = widths.length;
    let end = widths.length;
    let spacerLeft = 0;
    for (let i = 0; i < widths.length; i++) {
      if (x + widths[i] > viewLeft) {
        start = i;
        break;
      }
      spacerLeft += widths[i];
      x += widths[i];
    }
    for (let i = start; i < widths.length; i++) {
      if (x >= viewRight) {
        end = i;
        break;
      }
      x += widths[i];
    }
    let spacerRight = 0;
    for (let i = end; i < widths.length; i++) spacerRight += widths[i];
    return { start, end, spacerLeft, spacerRight };
  });

  /** Columns actually rendered — the horizontal window when virtualized. */
  protected readonly renderColumns = computed<readonly ResolvedColumn<T>[]>(() => {
    const columns = this.resolvedColumns();
    const range = this.colRange();
    return range ? columns.slice(range.start, range.end) : columns;
  });

  protected readonly colSpacerLeft = computed(() => this.colRange()?.spacerLeft ?? 0);
  protected readonly colSpacerRight = computed(() => this.colRange()?.spacerRight ?? 0);

  protected readonly gridTemplateColumns = computed(() => {
    const defaultMin = this.effColumnMinWidth();
    const leading: string[] = [];
    if (this.rowDragging()) leading.push(`${DRAG_WIDTH}px`);
    if (this.hasExpander()) leading.push(`${EXPANDER_WIDTH}px`);
    if (this.hasCheckboxColumn()) leading.push(`${CHECKBOX_WIDTH}px`);
    const trailing = this.hasCommandColumn() ? [`${COMMAND_WIDTH}px`] : [];
    const range = this.colRange();
    if (range) {
      const widths = this.colWidths();
      const tracks: string[] = [];
      if (range.spacerLeft > 0) tracks.push(`${range.spacerLeft}px`);
      for (let i = range.start; i < range.end; i++) tracks.push(`${widths[i]}px`);
      if (range.spacerRight > 0) tracks.push(`${range.spacerRight}px`);
      return [...leading, ...tracks, ...trailing].join(' ');
    }
    const tracks = this.resolvedColumns().map((column) => {
      const width = column.width;
      if (typeof width === 'number') return `${width}px`;
      if (width == null && column.pinned) return `${this.config.pinnedDefaultWidth}px`;
      return width ?? `minmax(${column.minWidth ?? defaultMin}px, 1fr)`;
    });
    return [...leading, ...tracks, ...trailing].join(' ');
  });

  private pinnedWidth(column: ResolvedColumn<T>): number {
    return typeof column.width === 'number' ? column.width : this.config.pinnedDefaultWidth;
  }

  /** Sticky offsets for pinned columns (id → CSS left/right px). */
  protected readonly pinnedOffsets = computed<ReadonlyMap<string, { left?: number; right?: number }>>(
    () => {
      const offsets = new Map<string, { left?: number; right?: number }>();
      const columns = this.resolvedColumns();
      let left = this.leadingWidth();
      for (const column of columns) {
        if (column.pinned !== 'left') continue;
        offsets.set(column.id, { left });
        left += this.pinnedWidth(column);
      }
      let right = 0;
      for (const column of [...columns].reverse()) {
        if (column.pinned !== 'right') continue;
        offsets.set(column.id, { right });
        right += this.pinnedWidth(column);
      }
      return offsets;
    }
  );

  protected pinnedLeftOf(column: ResolvedColumn<T>): number | null {
    return this.pinnedOffsets().get(column.id)?.left ?? null;
  }

  protected pinnedRightOf(column: ResolvedColumn<T>): number | null {
    return this.pinnedOffsets().get(column.id)?.right ?? null;
  }

  // --- sorting -------------------------------------------------------------

  protected onHeaderClick(column: ResolvedColumn<T>, event: Event): void {
    if (this.suppressHeaderClick) {
      this.suppressHeaderClick = false;
      return;
    }
    if (!column.sortable || !column.field || this.sortMode() === 'none') return;
    if (event instanceof KeyboardEvent) event.preventDefault();
    const { shiftKey, ctrlKey } = event as MouseEvent | KeyboardEvent;
    const additive = this.sortMode() === 'multi' && (shiftKey || ctrlKey);
    this.store.sort.toggle(column.field, additive, this.allowUnsorting());
  }

  protected sortStateOf(column: ResolvedColumn<T>): { dir: 'asc' | 'desc'; index: number } | null {
    return column.field ? this.store.sort.stateOf(column.field) : null;
  }

  protected ariaSortOf(column: ResolvedColumn<T>): string | null {
    const state = this.sortStateOf(column);
    if (!state) return column.sortable && this.sortMode() !== 'none' ? 'none' : null;
    return state.dir === 'asc' ? 'ascending' : 'descending';
  }

  protected readonly multiSorted = computed(() => this.store.sort.descriptors().length > 1);

  // --- cells ---------------------------------------------------------------

  protected cellText(row: T, column: ResolvedColumn<T>): string {
    const value = column.accessor(row);
    if (column.dataType === 'boolean' && !column.format && value != null) {
      return value ? this.msg().booleanTrue : this.msg().booleanFalse;
    }
    return formatCellValue(value, column.dataType, column.format);
  }

  protected cellContext(row: T, rowIndex: number, column: ResolvedColumn<T>): OgeCellTemplateContext<T> {
    return {
      $implicit: column.accessor(row),
      row,
      rowIndex,
      // Templated columns are always declarative, so `source` is defined here.
      column: column.source as OgeColumn<T>,
    };
  }

  protected headerContext(column: ResolvedColumn<T>): OgeHeaderTemplateContext<T> {
    return { $implicit: column.source as OgeColumn<T> };
  }

  protected cellDisplayText(node: DataRowNode<T>, column: ResolvedColumn<T>): string {
    const value = this.displayValue(node, column);
    if (column.format) return column.format(value);
    if (column.lookup && typeof column.lookup.dataSource === 'function') {
      const items = this.lookupItemsFor(node, column);
      if (items) return lookupTextOf(items, value);
    }
    if (column.lookupItems) return lookupTextOf(column.lookupItems, value);
    if (column.dataType === 'boolean' && value != null) {
      return value ? this.msg().booleanTrue : this.msg().booleanFalse;
    }
    return formatCellValue(value, column.dataType, undefined);
  }

  /** Filter-row lookup select: applies an exact-match filter on the raw value. */
  protected onLookupFilter(column: ResolvedColumn<T>, rawIndex: string): void {
    const field = column.field;
    if (!field || !column.lookupItems) return;
    if (rawIndex === '') {
      this.store.filter.setRowFilter(field, null);
      return;
    }
    const item = column.lookupItems[Number(rawIndex)];
    this.store.filter.setRowFilter(
      field,
      item === undefined ? null : { type: 'binary', field, op: 'eq', value: item.value }
    );
  }

  protected onEditorEnter(): void {
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'form') this.commitActiveRow();
    else this.commitActiveCell();
  }

  protected readonly popupNode = computed<DataRowNode<T> | null>(() => {
    if (this.editMode() !== 'popup') return null;
    const key = this.store.editing.editRowKey();
    if (key === null) return null;
    return (
      this.flatNodes().find(
        (node): node is DataRowNode<T> => node.kind === 'data' && node.key === key
      ) ?? null
    );
  });

  protected detailContext(row: T): OgeDetailTemplateContext<T> {
    return { $implicit: row };
  }

  // --- grouping ------------------------------------------------------------

  protected columnByField(field: string): ResolvedColumn<T> | undefined {
    return this.resolvedColumns().find((c) => c.field === field);
  }

  protected groupCaption(field: string): string {
    return this.columnByField(field)?.caption ?? humanize(field);
  }

  protected groupValueText(node: GroupRowNode): string {
    const column = this.columnByField(node.groupField);
    return column
      ? formatCellValue(node.groupValue, column.dataType, column.format)
      : String(node.groupValue ?? '');
  }

  protected groupSummaryText(node: GroupRowNode): string {
    const messages = this.msg();
    return node.summaries
      .map((summary) => {
        const column = summary.field ? this.columnByField(summary.field) : undefined;
        const value = column
          ? formatCellValue(summary.value, column.dataType, column.format)
          : String(summary.value ?? '');
        return formatPattern(messages.groupSummaryPattern, {
          label: messages.summaryLabels[summary.type],
          column: column?.caption ?? summary.field,
          value,
        });
      })
      .join('  ·  ');
  }

  protected toggleGroup(key: RowKey, event?: Event): void {
    event?.preventDefault();
    this.store.expansion.toggleGroup(key);
  }

  protected toggleDetail(key: RowKey, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.store.expansion.toggleDetail(key);
  }

  /** Total-summary text per column id; empty when no totals are configured. */
  protected readonly totalSummaryByColumn = computed<ReadonlyMap<string, string>>(() => {
    const descriptors = this.store.grouping.totalSummary();
    const values = this.adapter.result()?.summary;
    const out = new Map<string, string>();
    if (!descriptors.length || !values) return out;
    const messages = this.msg();
    descriptors.forEach((descriptor, i) => {
      const column = this.columnByField(descriptor.field);
      if (!column) return;
      const value = formatCellValue(values[i], column.dataType, column.format);
      const text = formatPattern(messages.totalSummaryPattern, {
        label: messages.summaryLabels[descriptor.type],
        value,
      });
      const existing = out.get(column.id);
      out.set(column.id, existing ? `${existing} · ${text}` : text);
    });
    return out;
  });

  protected readonly hasTotalRow = computed(() => this.totalSummaryByColumn().size > 0);

  // --- selection -----------------------------------------------------------

  /** Keys of all (filtered, flattened) data rows in display order. */
  protected readonly dataKeys = computed<readonly RowKey[]>(() =>
    this.flatNodes().flatMap((node) => (node.kind === 'data' ? [node.key] : []))
  );

  protected isRowSelected(key: RowKey): boolean {
    return this.store.selection.isSelected(key);
  }

  /**
   * Header select-all scope: `'allPages'` (default) selects the whole
   * filtered set across pages; `'page'` only the rows on the current page.
   */
  readonly selectAllMode = input<'allPages' | 'page'>('allPages');

  protected readonly allSelected = computed(() => {
    const keys = this.dataKeys();
    if (!keys.length) return false;
    const selected = this.store.selection.selected();
    if (this.selectAllMode() === 'page' || selected.size >= this.totalCount()) {
      return keys.every((key) => selected.has(key));
    }
    return false;
  });

  protected readonly someSelected = computed(
    () => this.store.selection.count() > 0 && !this.allSelected()
  );

  protected onRowClick(node: DataRowNode<T>, event: MouseEvent): void {
    this.rowClick.emit({ row: node.data, key: node.key, event });
    if (this.focusedRowEnabled()) this.focusedRowKey.set(node.key);
    const mode = this.selectionMode();
    if (mode === 'none') return;
    if (mode === 'single') {
      this.store.selection.selectOnly(node.key);
      return;
    }
    if (event.shiftKey) this.store.selection.selectRange(this.dataKeys(), node.key);
    else if (event.ctrlKey || event.metaKey || mode === 'checkbox') {
      this.store.selection.toggle(node.key);
    } else this.store.selection.selectOnly(node.key);
  }

  // --- row drag reordering -------------------------------------------------

  private draggedRowKey: RowKey | null = null;
  /** Key of the row currently hovered as drop target (indicator line). */
  protected readonly dropTargetKey = signal<RowKey | null>(null);

  protected onRowDragStart(node: DataRowNode<T>, event: DragEvent): void {
    this.draggedRowKey = node.key;
    event.dataTransfer?.setData('text/plain', String(node.key));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onRowDragOver(node: DataRowNode<T>, event: DragEvent): void {
    if (this.draggedRowKey === null) return;
    event.preventDefault();
    if (this.dropTargetKey() !== node.key) this.dropTargetKey.set(node.key);
  }

  protected onRowDragEnd(): void {
    this.draggedRowKey = null;
    this.dropTargetKey.set(null);
  }

  protected onRowDrop(target: DataRowNode<T>, event: DragEvent): void {
    const fromKey = this.draggedRowKey;
    this.onRowDragEnd();
    if (fromKey === null || fromKey === target.key) return;
    event.preventDefault();
    event.stopPropagation();
    const nodes = untracked(this.flatNodes);
    const dataNodes = nodes.filter((node): node is DataRowNode<T> => node.kind === 'data');
    const fromIndex = dataNodes.findIndex((node) => node.key === fromKey);
    const toIndex = dataNodes.findIndex((node) => node.key === target.key);
    if (fromIndex < 0 || toIndex < 0) return;
    const moved = dataNodes[fromIndex].data;
    // plain-array data: move in place so the new order survives a reload
    const data = untracked(this.data);
    if (Array.isArray(data)) {
      const keyOf = untracked(this.keySelector);
      const source = data as T[];
      const sourceFrom = source.findIndex((row, index) => keyOf(row, index) === fromKey);
      const sourceTo = source.findIndex((row, index) => keyOf(row, index) === target.key);
      if (sourceFrom >= 0 && sourceTo >= 0) {
        source.splice(sourceTo, 0, ...source.splice(sourceFrom, 1));
        this.adapter.reload();
      }
    }
    this.rowReordered.emit({ key: fromKey, targetKey: target.key, fromIndex, toIndex, row: moved });
  }

  protected onCheckboxToggle(node: DataRowNode<T>, event: Event): void {
    event.stopPropagation();
    this.store.selection.toggle(node.key);
  }

  /** Select-all works on the current filtered set; scope via `selectAllMode`. */
  protected toggleSelectAll(): void {
    if (this.allSelected()) {
      this.store.selection.clear();
      return;
    }
    if (untracked(this.selectAllMode) === 'page') {
      this.store.selection.replace(this.dataKeys());
      return;
    }
    void this.selectAllPages();
  }

  /** Loads the full filtered set (paging ignored) and selects every key. */
  private async selectAllPages(): Promise<void> {
    const { rows } = await this.getExportData();
    const keyOf = untracked(this.keySelector);
    this.store.selection.replace(rows.map((row, index) => keyOf(row, index)));
  }

  protected ariaSelectedOf(node: DataRowNode<T>): boolean | null {
    return this.selectionMode() === 'none' ? null : this.isRowSelected(node.key);
  }

  // --- keyboard navigation -------------------------------------------------

  /** Focused cell: flat node index + visible column index. */
  protected readonly focusedCell = signal<{ row: number; col: number } | null>(null);

  protected isCellTabbable(row: number, col: number): boolean {
    const focused = this.focusedCell();
    if (focused) return focused.row === row && focused.col === col;
    return row === this.firstDataRowIndex() && col === 0;
  }

  private readonly firstDataRowIndex = computed(() =>
    this.flatNodes().findIndex((node) => node.kind === 'data')
  );

  protected onCellFocus(row: number, col: number): void {
    const current = this.focusedCell();
    if (current?.row !== row || current.col !== col) this.focusedCell.set({ row, col });
  }

  private moveFocusRow(from: number, direction: 1 | -1, steps = 1): number {
    const nodes = this.flatNodes();
    let index = from;
    let remaining = steps;
    while (remaining > 0) {
      let next = index + direction;
      while (next >= 0 && next < nodes.length && nodes[next].kind !== 'data') next += direction;
      if (next < 0 || next >= nodes.length) break;
      index = next;
      remaining -= 1;
    }
    return index;
  }

  /** Brings a virtualized column into the horizontal window before focusing. */
  private scrollColumnIntoView(col: number): void {
    if (!this.colVirtualized()) return;
    const widths = this.colWidths();
    if (col < 0 || col >= widths.length) return;
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    let left = this.leadingWidth();
    for (let i = 0; i < col; i++) left += widths[i];
    const right = left + widths[col];
    if (left < viewport.scrollLeft) viewport.scrollLeft = left;
    else if (right > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollLeft = right - viewport.clientWidth;
    }
    this.scrollLeft.set(viewport.scrollLeft);
  }

  private scrollRowIntoView(row: number): void {
    if (!this.virtualized()) return;
    const tree = this.offsetTree();
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    const top = tree.offsetOf(row);
    const bottom = top + tree.heightAt(row);
    if (top < viewport.scrollTop) viewport.scrollTop = top;
    else if (bottom > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = bottom - viewport.clientHeight;
    }
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const cell = this.focusedCell();
    if (!cell) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      // no editor open → copy selection/cell; native copy still runs unhindered
      if (this.store.editing.editCell() === null && this.store.editing.editRowKey() === null) {
        void this.copyToClipboard();
      }
      return;
    }
    const nodes = this.flatNodes();
    const lastCol = this.resolvedColumns().length - 1;
    const pageSize = Math.max(1, Math.floor(this.viewportHeight() / this.effRowHeight()) - 1);
    let { row, col } = cell;
    switch (event.key) {
      case 'ArrowDown':
        row = this.moveFocusRow(row, 1);
        break;
      case 'ArrowUp':
        row = this.moveFocusRow(row, -1);
        break;
      case 'ArrowRight':
        // arrows move visually: in RTL the next column lies to the left
        col = this.rtl() ? Math.max(0, col - 1) : Math.min(lastCol, col + 1);
        break;
      case 'ArrowLeft':
        col = this.rtl() ? Math.min(lastCol, col + 1) : Math.max(0, col - 1);
        break;
      case 'Home':
        if (event.ctrlKey) row = this.moveFocusRow(-1, 1);
        col = 0;
        break;
      case 'End':
        if (event.ctrlKey) row = this.moveFocusRow(nodes.length, -1);
        col = lastCol;
        break;
      case 'PageDown':
        row = this.moveFocusRow(row, 1, pageSize);
        break;
      case 'PageUp':
        row = this.moveFocusRow(row, -1, pageSize);
        break;
      case ' ': {
        const node = nodes[row];
        if (node?.kind === 'data' && this.selectionMode() !== 'none') {
          event.preventDefault();
          if (this.selectionMode() === 'single') this.store.selection.selectOnly(node.key);
          else this.store.selection.toggle(node.key);
        }
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    if (row !== cell.row || col !== cell.col) this.focusedCell.set({ row, col });
  }

  // --- context menu --------------------------------------------------------

  protected readonly contextMenu = signal<{
    x: number;
    y: number;
    items: OgeMenuItem[];
  } | null>(null);

  protected onRowContextMenuOpen(node: DataRowNode<T>, event: MouseEvent): void {
    const items: OgeMenuItem[] = [];
    this.rowContextMenu.emit({
      row: node.data,
      key: node.key,
      clientX: event.clientX,
      clientY: event.clientY,
      items,
    });
    if (!items.length) return; // fall back to the native browser menu
    event.preventDefault();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, items });
  }

  protected runMenuItem(item: OgeMenuItem): void {
    if (item.disabled) return;
    this.contextMenu.set(null);
    item.action?.();
  }

  /** Built-in header context menu: sort / group / pin / hide. */
  protected onHeaderContextMenu(column: ResolvedColumn<T>, event: MouseEvent): void {
    const field = column.field;
    if (!field) return;
    const messages = this.msg();
    const items: OgeMenuItem[] = [];
    if (column.sortable && this.sortMode() !== 'none') {
      items.push(
        { text: messages.sortAscending, action: () => this.store.sort.set([{ field, dir: 'asc' }]) },
        { text: messages.sortDescending, action: () => this.store.sort.set([{ field, dir: 'desc' }]) }
      );
      if (this.sortStateOf(column)) {
        items.push({ text: messages.clearSort, action: () => this.store.sort.clear() });
      }
    }
    if (this.groupPanel()) {
      const grouped = this.store.grouping.descriptors().some((d) => d.field === field);
      items.push(
        grouped
          ? { text: messages.ungroupColumn, action: () => this.store.grouping.ungroup(field) }
          : { text: messages.groupByColumn, action: () => this.store.grouping.groupBy(field) }
      );
    }
    if (column.pinned !== 'left') {
      items.push({ text: messages.pinLeft, action: () => this.store.columns.setPinned(column.id, 'left') });
    }
    if (column.pinned !== 'right') {
      items.push({ text: messages.pinRight, action: () => this.store.columns.setPinned(column.id, 'right') });
    }
    if (column.pinned !== false) {
      items.push({ text: messages.unpin, action: () => this.store.columns.setPinned(column.id, false) });
    }
    if (column.source) {
      const source = column.source;
      items.push({ text: messages.hideColumn, action: () => source.visible.set(false) });
    }
    if (!items.length) return;
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, items });
  }

  // --- editing -------------------------------------------------------------

  protected readonly editingOptions = computed<OgeEditingOptions | null>(() => {
    const value = this.editing();
    return value === false ? null : value;
  });

  protected readonly editMode = computed(() => this.editingOptions()?.mode ?? null);
  protected readonly canUpdate = computed(
    () => !!this.editingOptions() && this.editingOptions()?.allowUpdating !== false
  );
  protected readonly canDelete = computed(() => !!this.editingOptions()?.allowDeleting);
  protected readonly canAdd = computed(() => !!this.editingOptions()?.allowAdding);

  /** Trailing command column (edit/delete/save/cancel buttons). */
  protected readonly hasCommandColumn = computed(() => {
    if (this.commandButtons()?.length) return true;
    const mode = this.editMode();
    if (!mode) return false;
    if (mode === 'row' || mode === 'popup' || mode === 'form') return this.canUpdate() || this.canDelete();
    return this.canDelete();
  });

  /** Buttons rendered in a row's idle command cell — input overrides defaults. */
  protected readonly effCommandButtons = computed<readonly OgeCommandButton<T>[]>(() => {
    const custom = this.commandButtons();
    if (custom?.length) return custom;
    const mode = this.editMode();
    const buttons: OgeCommandButton<T>[] = [];
    if ((mode === 'row' || mode === 'popup' || mode === 'form') && this.canUpdate()) buttons.push({ name: 'edit' });
    if (mode && this.canDelete()) buttons.push({ name: 'delete' });
    return buttons;
  });

  protected commandButtonVisible(button: OgeCommandButton<T>, node: DataRowNode<T>): boolean {
    return button.visible ? button.visible(node.data) : true;
  }

  protected runCommandButton(button: OgeCommandButton<T>, node: DataRowNode<T>, event: Event): void {
    event.stopPropagation();
    button.onClick?.(node.data, node.key);
  }

  private newRowCounter = 0;

  /** Row data with pending edits applied (batch dirty view). */
  protected displayValue(node: DataRowNode<T>, column: ResolvedColumn<T>): unknown {
    const field = column.field;
    if (field && this.store.editing.hasChange(node.key, field)) {
      return this.store.editing.changeFor(node.key, field);
    }
    return column.accessor(node.data);
  }

  protected isCellDirty(node: DataRowNode<T>, column: ResolvedColumn<T>): boolean {
    return (
      this.editMode() === 'batch' &&
      column.field != null &&
      this.store.editing.hasChange(node.key, column.field)
    );
  }

  protected isRowEditing(key: RowKey): boolean {
    const mode = this.editMode();
    return (mode === 'row' || mode === 'form') && this.store.editing.editRowKey() === key;
  }

  /** Form mode: the row whose cells are replaced by the inline form. */
  protected isFormRow(key: RowKey): boolean {
    return this.editMode() === 'form' && this.store.editing.editRowKey() === key;
  }

  protected isCellEditorOpen(node: DataRowNode<T>, column: ResolvedColumn<T>): boolean {
    if (!column.editable || !column.field || !this.canUpdate()) return false;
    const mode = this.editMode();
    if (mode === 'cell' || mode === 'batch') {
      return this.store.editing.isCellEditing(node.key, column.field);
    }
    return mode === 'row' && this.store.editing.editRowKey() === node.key;
  }

  /** Reactive controls for the active editor(s), keyed `key::field`. */
  protected readonly activeControls = computed<ReadonlyMap<string, FormControl<unknown>>>(() => {
    const map = new Map<string, FormControl<unknown>>();
    const mode = this.editMode();
    if (!mode) return map;
    const cell = this.store.editing.editCell();
    const rowKey = this.store.editing.editRowKey();
    const targetKey = cell?.key ?? rowKey;
    if (targetKey === null || targetKey === undefined) return map;
    const node = this.flatNodes().find(
      (candidate): candidate is DataRowNode<T> =>
        candidate.kind === 'data' && candidate.key === targetKey
    );
    if (!node) return map;
    for (const column of this.resolvedColumns()) {
      const field = column.field;
      if (!field || !column.editable) continue;
      if (cell && field !== cell.field) continue;
      const validators = [...(column.source?.validators() ?? [])];
      if (column.source?.required()) validators.push(Validators.required);
      map.set(
        `${String(targetKey)}::${field}`,
        new FormControl<unknown>(untracked(() => this.displayValue(node, column)), {
          validators,
        })
      );
    }
    return map;
  });

  protected editControl(node: DataRowNode<T>, column: ResolvedColumn<T>): FormControl<unknown> {
    return this.activeControls().get(`${String(node.key)}::${column.field}`) as FormControl<unknown>;
  }

  /** Row merged with its open editors' current values (cascading lookups). */
  private draftRowOf(node: DataRowNode<T>): T {
    const prefix = `${String(node.key)}::`;
    const draft: Record<string, unknown> = { ...(node.data as Record<string, unknown>) };
    for (const [mapKey, control] of untracked(this.activeControls)) {
      if (mapKey.startsWith(prefix)) draft[mapKey.slice(prefix.length)] = control.value;
    }
    return draft as T;
  }

  /** Editor option list — cascading (function) lookups see the row's draft. */
  protected lookupItemsFor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>
  ): readonly LookupItem[] | undefined {
    const lookup = column.lookup;
    if (lookup && typeof lookup.dataSource === 'function') {
      return mapLookupItems(
        (lookup.dataSource as (row: T) => readonly unknown[])(this.draftRowOf(node)),
        lookup
      );
    }
    return column.lookupItems;
  }

  protected editContextFor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>
  ): OgeEditTemplateContext<T> {
    return {
      $implicit: this.editControl(node, column),
      row: node.data,
      column: column.source as OgeColumn<T>,
    };
  }

  protected editorErrorText(control: FormControl<unknown>): string | null {
    if (!control.invalid || !control.touched) return null;
    return control.hasError('required') ? this.msg().requiredError : this.msg().invalidError;
  }

  protected onCellClickToEdit(node: DataRowNode<T>, column: ResolvedColumn<T>, event?: Event): void {
    // ignore events bubbling out of an open editor (e.g. its own Enter commit)
    if ((event?.target as HTMLElement | null)?.closest?.('.oge-editor')) return;
    if (event?.type === 'click') {
      this.cellClick.emit({
        row: node.data,
        key: node.key,
        field: column.field,
        value: column.accessor(node.data),
        event,
      });
    }
    const mode = this.editMode();
    if (
      (mode !== 'cell' && mode !== 'batch') ||
      !this.canUpdate() ||
      !column.editable ||
      !column.field ||
      this.store.editing.isRemoved(node.key)
    ) {
      return;
    }
    if (!this.store.editing.isCellEditing(node.key, column.field)) {
      this.store.editing.startCell(node.key, column.field);
    }
  }

  private editorValue(control: FormControl<unknown>, column: ResolvedColumn<T>): unknown {
    const value = control.value;
    if (column.lookupItems) {
      const match = column.lookupItems.find((item) => String(item.value) === String(value));
      return match ? match.value : value;
    }
    if (column.dataType === 'number' && value !== null && value !== '' && value !== undefined) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  /** Commits the single-cell editor (cell → save, batch → pending change). */
  protected commitActiveCell(): void {
    const cell = this.store.editing.editCell();
    if (!cell) return;
    const column = this.resolvedColumns().find((candidate) => candidate.field === cell.field);
    const control = this.activeControls().get(`${String(cell.key)}::${cell.field}`);
    if (!column || !control) return;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    const node = this.flatNodes().find(
      (candidate): candidate is DataRowNode<T> =>
        candidate.kind === 'data' && candidate.key === cell.key
    );
    const value = this.editorValue(control, column);
    const original = node ? column.accessor(node.data) : undefined;
    if (this.editMode() === 'batch') {
      if (value !== original || this.store.editing.isAdded(cell.key)) {
        this.store.editing.setChange(cell.key, cell.field, value);
      }
      this.store.editing.stopEditor();
      return;
    }
    // cell mode: immediate write-back
    if (value === original) {
      this.store.editing.stopEditor();
      return;
    }
    void this.runSave([
      { type: 'update', key: cell.key, data: { [cell.field]: value } as OgeDataChange<T>['data'] },
    ]);
  }

  protected cancelActiveEditor(): void {
    const rowKey = this.store.editing.editRowKey();
    if (rowKey !== null && this.store.editing.isAdded(rowKey)) {
      this.store.editing.dropAdded(rowKey);
    }
    this.store.editing.stopEditor();
  }

  protected onEditorBlur(): void {
    const cell = this.store.editing.editCell();
    if (!cell) return;
    const control = this.activeControls().get(`${String(cell.key)}::${cell.field}`);
    if (control && control.valid) this.commitActiveCell();
  }

  /** Tab inside a cell editor: commit and open the next editable column. */
  protected commitAndNext(node: DataRowNode<T>, column: ResolvedColumn<T>, event: Event): void {
    const mode = this.editMode();
    if (mode !== 'cell' && mode !== 'batch') return;
    event.preventDefault();
    this.commitActiveCell();
    const columns = this.resolvedColumns();
    const from = columns.findIndex((candidate) => candidate.id === column.id);
    const next = columns.slice(from + 1).find((candidate) => candidate.editable && candidate.field);
    if (next?.field) this.store.editing.startCell(node.key, next.field);
  }

  protected startRowEdit(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    this.store.editing.startRow(node.key);
  }

  /** Saves the row editor (row + popup modes). */
  protected commitActiveRow(): void {
    const rowKey = this.store.editing.editRowKey();
    if (rowKey === null) return;
    const node = this.flatNodes().find(
      (candidate): candidate is DataRowNode<T> =>
        candidate.kind === 'data' && candidate.key === rowKey
    );
    if (!node) return;
    const controls = this.activeControls();
    const data: Record<string, unknown> = {};
    let invalid = false;
    for (const column of this.resolvedColumns()) {
      const field = column.field;
      if (!field || !column.editable) continue;
      const control = controls.get(`${String(rowKey)}::${field}`);
      if (!control) continue;
      if (control.invalid) {
        control.markAsTouched();
        invalid = true;
        continue;
      }
      const value = this.editorValue(control, column);
      if (value !== column.accessor(node.data) || this.store.editing.isAdded(rowKey)) {
        data[field] = value;
      }
    }
    if (invalid) return;
    if (!Object.keys(data).length) {
      this.store.editing.stopEditor();
      return;
    }
    const type = this.store.editing.isAdded(rowKey) ? 'insert' : 'update';
    void this.runSave([{ type, key: rowKey, data: data as OgeDataChange<T>['data'] }]);
  }

  protected deleteRow(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    if (this.store.editing.isAdded(node.key)) {
      this.store.editing.dropAdded(node.key);
      return;
    }
    if (this.editMode() === 'batch') {
      this.store.editing.toggleRemoved(node.key);
      return;
    }
    const editing = this.editing();
    if (
      editing &&
      editing.confirmDelete &&
      typeof confirm === 'function' &&
      !confirm(untracked(this.msg).confirmDelete)
    ) {
      return;
    }
    void this.runSave([{ type: 'remove', key: node.key }]);
  }

  protected addNewRow(): void {
    const key = `oge-new-${++this.newRowCounter}`;
    this.store.editing.addRow(key);
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'form' || mode === 'cell') {
      this.store.editing.startRow(key);
    }
  }

  /** Batch toolbar: save everything pending. */
  protected saveAllChanges(): void {
    const editing = this.store.editing;
    const changes: OgeDataChange<T>[] = [];
    for (const key of editing.added()) {
      if (editing.removed().has(key)) continue;
      changes.push({
        type: 'insert',
        key,
        data: (editing.changes().get(key) ?? {}) as OgeDataChange<T>['data'],
      });
    }
    for (const [key, data] of editing.changes()) {
      if (editing.isAdded(key) || editing.removed().has(key)) continue;
      changes.push({ type: 'update', key, data: data as OgeDataChange<T>['data'] });
    }
    for (const key of editing.removed()) {
      if (editing.isAdded(key)) continue;
      changes.push({ type: 'remove', key });
    }
    void this.runSave(changes);
  }

  protected discardAllChanges(): void {
    this.store.editing.clearPending();
  }

  private async runSave(changes: OgeDataChange<T>[]): Promise<void> {
    if (!changes.length) {
      this.store.editing.stopEditor();
      return;
    }
    const event: OgeSavingChangesEvent<T> = { changes, cancel: false };
    this.savingChanges.emit(event);
    if (event.cancel) return;
    const source = this.adapter.source();
    try {
      for (const change of changes) {
        if (change.type === 'update') {
          await source?.update?.(change.key, change.data as Partial<T>);
        } else if (change.type === 'insert') {
          await source?.insert?.(change.data as T);
        } else {
          await source?.remove?.(change.key);
        }
      }
    } finally {
      this.store.editing.clearPending();
      this.adapter.reload();
    }
  }

  // --- group panel & column drag/drop --------------------------------------

  protected onHeaderDragStart(column: ResolvedColumn<T>, event: DragEvent): void {
    if (!column.field || (!this.groupPanel() && !this.columnReorder())) {
      event.preventDefault();
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.setData(COLUMN_DRAG_TYPE, column.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onColumnDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(COLUMN_DRAG_TYPE)) event.preventDefault();
  }

  protected onHeaderDrop(target: ResolvedColumn<T>, event: DragEvent): void {
    const sourceId = event.dataTransfer?.getData(COLUMN_DRAG_TYPE);
    if (!sourceId || !this.columnReorder() || sourceId === target.id) return;
    event.preventDefault();
    this.store.columns.reorder(
      this.resolvedColumns().map((c) => c.id),
      sourceId,
      target.id
    );
  }

  protected onGroupPanelDrop(event: DragEvent): void {
    const sourceId = event.dataTransfer?.getData(COLUMN_DRAG_TYPE);
    if (!sourceId) return;
    event.preventDefault();
    const column = this.resolvedColumns().find((c) => c.id === sourceId);
    if (column?.field) this.store.grouping.groupBy(column.field);
  }

  protected ungroup(field: string, event?: Event): void {
    event?.stopPropagation();
    this.store.grouping.ungroup(field);
  }

  // --- column resize -------------------------------------------------------

  private suppressHeaderClick = false;

  protected onResizeStart(column: ResolvedColumn<T>, event: PointerEvent): void {
    if (!this.columnResize()) return;
    event.preventDefault();
    event.stopPropagation();
    const headerCell = (event.target as HTMLElement).closest('.oge-header-cell') as HTMLElement;
    const startWidth = headerCell?.offsetWidth ?? this.pinnedWidth(column);
    const startX = event.clientX;
    const onMove = (move: PointerEvent): void => {
      this.suppressHeaderClick = true;
      this.store.columns.setWidth(column.id, startWidth + (move.clientX - startX));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // allow the click swallow flag to reset after the click event fires
      setTimeout(() => (this.suppressHeaderClick = false));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- column chooser ------------------------------------------------------

  protected readonly chooserOpen = signal(false);

  protected toggleChooser(event: Event): void {
    event.stopPropagation();
    this.chooserOpen.set(!this.chooserOpen());
  }

  // --- filtering -----------------------------------------------------------

  private readonly filterTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private debounced(key: string, apply: () => void): void {
    const pending = this.filterTimers.get(key);
    if (pending) clearTimeout(pending);
    const delay = this.effFilterDebounce();
    if (delay <= 0) {
      apply();
      return;
    }
    this.filterTimers.set(
      key,
      setTimeout(() => {
        this.filterTimers.delete(key);
        apply();
      }, delay)
    );
  }

  protected onFilterInput(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.rowFilterRaw.set(field, raw);
    this.debounced(`f:${field}`, () => {
      this.store.filter.setRowFilter(
        field,
        this.rowFilterExprFor(column, raw, this.currentOperator(column))
      );
    });
  }

  /** Row-filter expression for a column — the column's custom builder wins. */
  private rowFilterExprFor(
    column: ResolvedColumn<T>,
    raw: string,
    operator?: FilterOperator
  ): FilterExpr | null {
    const field = column.field;
    if (!field) return null;
    if (column.calculateFilterExpression) {
      const text = raw.trim();
      const op = operator ?? column.filterOperator ?? defaultOperatorFor(column.dataType);
      return text ? column.calculateFilterExpression(text, op) : null;
    }
    return buildRowFilterExpr(field, column.dataType, raw, operator);
  }

  /** Selects apply immediately (no debounce). */
  protected onFilterSelect(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.rowFilterRaw.set(field, raw);
    this.store.filter.setRowFilter(field, this.rowFilterExprFor(column, raw, this.currentOperator(column)));
  }

  protected onSearchInput(raw: string): void {
    this.debounced('search', () => this.store.filter.setSearchText(raw));
  }

  // --- filter-row operator menu --------------------------------------------

  /** User-chosen filter-row operator per field (overrides column default). */
  private readonly rowFilterOps = signal<ReadonlyMap<string, FilterOperator>>(new Map());
  /** Last raw editor value per field, so an operator change re-applies it. */
  private readonly rowFilterRaw = new Map<string, string>();

  protected readonly operatorMenu = signal<{
    column: ResolvedColumn<T>;
    x: number;
    y: number;
  } | null>(null);

  protected currentOperator(column: ResolvedColumn<T>): FilterOperator {
    if (!column.field) return 'contains';
    return (
      this.rowFilterOps().get(column.field) ??
      column.filterOperator ??
      defaultOperatorFor(column.dataType)
    );
  }

  protected operatorSymbol(column: ResolvedColumn<T>): string {
    const symbols: Partial<Record<FilterOperator, string>> = {
      eq: '=',
      ne: '≠',
      gt: '>',
      ge: '≥',
      lt: '<',
      le: '≤',
      contains: '∗',
      notcontains: '!∗',
      startswith: 'a…',
      endswith: '…z',
    };
    return symbols[this.currentOperator(column)] ?? '=';
  }

  protected toggleOperatorMenu(column: ResolvedColumn<T>, event: MouseEvent): void {
    event.stopPropagation();
    if (this.operatorMenu()?.column.id === column.id) {
      this.operatorMenu.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.operatorMenu.set({ column, x: rect.left, y: rect.bottom + 4 });
  }

  protected operatorChoices(column: ResolvedColumn<T>): FilterOperator[] {
    return operatorsFor(column.dataType).filter((op) => op !== 'isnull' && op !== 'isnotnull');
  }

  protected chooseOperator(op: FilterOperator | null): void {
    const menu = this.operatorMenu();
    this.operatorMenu.set(null);
    const field = menu?.column.field;
    if (!menu || !field) return;
    const next = new Map(this.rowFilterOps());
    if (op === null) next.delete(field);
    else next.set(field, op);
    this.rowFilterOps.set(next);
    // re-apply the current editor value with the new operator
    const raw = this.rowFilterRaw.get(field) ?? '';
    const effective = op ?? menu.column.filterOperator ?? defaultOperatorFor(menu.column.dataType);
    this.store.filter.setRowFilter(field, this.rowFilterExprFor(menu.column, raw, effective));
  }

  // --- filter panel + builder ----------------------------------------------

  protected readonly builderOpen = signal(false);
  protected builderTree: BuilderGroup = { kind: 'group', logic: 'and', items: [] };
  /** Bumped by the recursive editor so the preview text refreshes. */
  protected readonly builderVersion = signal(0);

  protected readonly builderFields = computed<FilterBuilderField[]>(() =>
    this.resolvedColumns()
      .filter((column) => column.filterable && column.field)
      .map((column) => ({
        field: column.field as string,
        caption: column.caption,
        dataType: column.dataType,
      }))
  );

  protected readonly filterPanelText = computed<string | null>(() => {
    const expr = this.store.filter.builderFilter();
    if (!expr) return null;
    return describeExpr(expr, this.builderFields(), this.msg());
  });

  protected openFilterBuilder(): void {
    this.builderTree = exprToBuilder(this.store.filter.builderFilter(), this.builderFields());
    if (!this.builderTree.items.length) {
      const first = this.builderFields()[0];
      if (first) {
        this.builderTree.items.push({
          kind: 'condition',
          field: first.field,
          op: operatorsFor(first.dataType)[0],
          value: '',
        });
      }
    }
    this.builderVersion.set(this.builderVersion() + 1);
    this.builderOpen.set(true);
  }

  protected readonly builderPreview = computed<string>(() => {
    this.builderVersion();
    const expr = builderToExpr(this.builderTree, this.builderFields());
    return expr ? describeExpr(expr, this.builderFields(), this.msg()) : '—';
  });

  protected applyFilterBuilder(): void {
    this.store.filter.setBuilderFilter(builderToExpr(this.builderTree, this.builderFields()));
    this.builderOpen.set(false);
  }

  protected clearBuilderFilter(event?: Event): void {
    event?.stopPropagation();
    this.store.filter.setBuilderFilter(null);
  }

  // --- search highlighting --------------------------------------------------

  private readonly sanitizer = inject(DomSanitizer);

  /** Escaped cell text with `<mark>` around search matches, or null when inactive. */
  protected searchHighlightHtml(node: DataRowNode<T>, column: ResolvedColumn<T>): SafeHtml | null {
    const query = this.store.filter.searchText().trim();
    if (!query) return null;
    const text = this.cellDisplayText(node, column);
    const lower = text.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    if (!lower.includes(needle)) return null;
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = '';
    let index = 0;
    while (index < text.length) {
      const found = lower.indexOf(needle, index);
      if (found < 0) {
        html += escape(text.slice(index));
        break;
      }
      html += escape(text.slice(index, found));
      html += `<mark class="oge-highlight">${escape(text.slice(found, found + needle.length))}</mark>`;
      index = found + needle.length;
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // --- header filter (Excel-style distinct values) -------------------------

  protected readonly headerFilterField = signal<string | null>(null);
  protected readonly headerFilterPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  /** null while the distinct values are loading. */
  protected readonly headerFilterValues = signal<readonly unknown[] | null>(null);
  /** Search text inside the header-filter popup. */
  protected readonly headerFilterSearch = signal('');

  protected readonly visibleHeaderValues = computed<readonly unknown[] | null>(() => {
    const values = this.headerFilterValues();
    if (!values) return null;
    const query = this.headerFilterSearch().trim().toLocaleLowerCase();
    if (!query) return values;
    return values.filter((value) => this.headerValueText(value).toLocaleLowerCase().includes(query));
  });

  protected readonly headerFilterAvailable = computed(
    () => this.headerFilterVisible() && typeof this.adapter.source()?.distinct === 'function'
  );

  protected toggleHeaderFilter(column: ResolvedColumn<T>, event: Event): void {
    event.stopPropagation();
    const field = column.field;
    if (!field) return;
    if (this.headerFilterField() === field) {
      this.closeHeaderFilter();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.headerFilterField.set(field);
    this.headerFilterPosition.set({ top: rect.bottom + 4, left: rect.left });
    this.headerFilterValues.set(null);
    this.headerFilterSearch.set('');
    this.adapter
      .source()
      ?.distinct?.(field)
      .then((values) => {
        if (this.headerFilterField() === field) {
          this.headerFilterValues.set(values.slice(0, this.effHeaderFilterLimit()));
        }
      });
  }

  protected closeHeaderFilter(): void {
    this.headerFilterField.set(null);
    this.headerFilterValues.set(null);
  }

  protected closePopups(): void {
    this.closeHeaderFilter();
    this.chooserOpen.set(false);
    this.contextMenu.set(null);
    this.operatorMenu.set(null);
    this.builderOpen.set(false);
  }

  /** Closes popups on clicks outside of them. */
  protected onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (this.headerFilterField() !== null && !target?.closest?.('.oge-header-filter-popup')) {
      this.closeHeaderFilter();
    }
    if (this.chooserOpen() && !target?.closest?.('.oge-chooser-popup')) {
      this.chooserOpen.set(false);
    }
    if (this.contextMenu() && !target?.closest?.('.oge-context-menu')) {
      this.contextMenu.set(null);
    }
    if (this.operatorMenu() && !target?.closest?.('.oge-operator-menu')) {
      this.operatorMenu.set(null);
    }
  }

  protected isHeaderFilterActive(column: ResolvedColumn<T>): boolean {
    return column.field != null && this.store.filter.headerFilterOf(column.field) != null;
  }

  protected isHeaderValueSelected(value: unknown): boolean {
    const field = this.headerFilterField();
    if (field == null) return false;
    const selection = this.store.filter.headerFilterOf(field);
    return selection == null || selection.includes(value);
  }

  protected toggleHeaderValue(value: unknown): void {
    const field = this.headerFilterField();
    const all = this.headerFilterValues();
    if (field == null || all == null) return;
    const current = this.store.filter.headerFilterOf(field) ?? all;
    const next = current.includes(value)
      ? current.filter((candidate) => candidate !== value)
      : [...current, value];
    this.store.filter.setHeaderFilter(field, next.length === all.length ? null : next);
  }

  protected toggleAllHeaderValues(): void {
    const field = this.headerFilterField();
    if (field == null) return;
    const selection = this.store.filter.headerFilterOf(field);
    // all selected → keep none; otherwise reset to all
    this.store.filter.setHeaderFilter(field, selection == null ? [] : null);
  }

  protected allHeaderValuesSelected(): boolean {
    const field = this.headerFilterField();
    return field != null && this.store.filter.headerFilterOf(field) == null;
  }

  protected headerValueText(value: unknown): string {
    if (value == null || value === '') return this.msg().blankValue;
    const field = this.headerFilterField();
    const items = field ? this.columnByField(field)?.lookupItems : undefined;
    return items ? lookupTextOf(items, value) : String(value);
  }

  protected onPageSizeChange(pageSize: number): void {
    this.store.paging.configure(pageSize === 0 ? null : pageSize);
  }
}

export type { SummaryType };
