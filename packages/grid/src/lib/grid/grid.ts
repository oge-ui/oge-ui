import { NgTemplateOutlet } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
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
  resolveKeySelector,
  type CsvOptions,
  type GridStateSnapshot,
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
import { OgeColumn, type OgeDataType } from '../columns/column';
import { formatCellValue } from '../columns/value-format';
import {
  OGE_GRID_CONFIG,
  formatPattern,
  type OgeGridMessages,
} from '../config';
import { GridDataAdapter } from '../data/grid-data-adapter';
import { OgePager } from '../pager/pager';
import { GridStateStore } from '../state/grid-state.store';
import { OGE_STATE_STORAGE } from '../state/state-storage';
import type { OgeEditingOptions } from '../state/editing-slice';
import type { SelectionMode } from '../state/selection-slice';
import type { OgeEditTemplateContext } from '../templates/edit-template';
import type { OgeCellTemplateContext } from '../templates/cell-template';
import { OgeDetailTemplate, type OgeDetailTemplateContext } from '../templates/detail-template';
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
  /** Shows a page-size selector in the pager. */
  pageSizes?: readonly number[];
  /** Shows the total row count in the pager. Default true. */
  showInfo?: boolean;
}

export interface OgeSortingOptions {
  mode?: 'none' | 'single' | 'multi';
  /** Whether a third header click clears the sort. Defaults from global config. */
  allowUnsorting?: boolean;
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

interface ResolvedColumn<T = unknown> {
  id: string;
  field: string | undefined;
  caption: string;
  dataType: OgeDataType;
  width: number | string | undefined;
  minWidth: number | undefined;
  sortable: boolean;
  filterable: boolean;
  filterOperator: FilterOperator | undefined;
  pinned: false | 'left' | 'right';
  accessor: ValueAccessor<T>;
  format: ((value: unknown) => string) | undefined;
  editable: boolean;
  cellTemplate: TemplateRef<OgeCellTemplateContext<T>> | undefined;
  headerTemplate: TemplateRef<OgeHeaderTemplateContext<T>> | undefined;
  editTemplate: TemplateRef<OgeEditTemplateContext<T>> | undefined;
  source: OgeColumn<T> | undefined;
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
  switch (dataType) {
    case 'number': {
      const value = Number(text);
      return Number.isNaN(value)
        ? null
        : { type: 'binary', field, op: operator ?? 'eq', value };
    }
    case 'boolean':
      return { type: 'binary', field, op: 'eq', value: text === 'true' };
    case 'date':
      return { type: 'binary', field, op: operator ?? 'eq', value: text };
    default:
      return { type: 'binary', field, op: operator ?? 'contains', value: text };
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

const EXPANDER_WIDTH = 32;
const CHECKBOX_WIDTH = 36;
const COMMAND_WIDTH = 90;
const COLUMN_DRAG_TYPE = 'application/x-oge-column';

@Component({
  selector: 'oge-grid',
  imports: [NgTemplateOutlet, OgePager, ReactiveFormsModule],
  providers: [GridStateStore, GridDataAdapter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
  host: {
    class: 'oge-grid',
    '[class.oge-virtual]': 'virtualScroll()',
    '[class.oge-loading]': 'adapter.loading()',
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

  /** Fixed row height in px used by the virtualizer. Defaults from global config. */
  readonly rowHeight = input<number | undefined>(undefined);

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

  /** Shows the drop area for drag-and-drop row grouping. */
  readonly groupPanel = input(false);

  /** Initial/programmatic grouping by field names (also drivable via the group panel). */
  readonly groupBy = input<readonly string[] | undefined>(undefined);

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

  /** Enables editing: `{ mode: 'cell' | 'row' | 'batch' | 'popup', allow… }`. */
  readonly editing = input<false | OgeEditingOptions>(false);

  /** Fires before changes reach the DataSource; cancelable. */
  readonly savingChanges = output<OgeSavingChangesEvent<T>>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');

  protected readonly scrollTop = signal(0);
  protected readonly viewportHeight = signal(400);

  protected readonly detailTemplate = contentChild(OgeDetailTemplate<T>);
  protected readonly declaredColumns = contentChildren<OgeColumn<T>>(OgeColumn);

  constructor() {
    effect(() => {
      const data = this.data();
      const keyField = this.keyField();
      this.adapter.setSource(
        isDataSource(data) ? data : new ArrayDataSource<T>(data, { key: keyField })
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
      untracked(() => this.scrollRowIntoView(cell.row));
      setTimeout(() => {
        if (this.store.editing.editCell() !== null || this.store.editing.editRowKey() !== null) {
          return;
        }
        const viewport = this.viewportRef()?.nativeElement;
        const el = viewport?.querySelector<HTMLElement>(`[data-cell="${cell.row}-${cell.col}"]`);
        el?.focus({ preventScroll: true });
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
    afterNextRender(() => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!viewport || typeof ResizeObserver === 'undefined') return;
      this.viewportHeight.set(viewport.clientHeight);
      const observer = new ResizeObserver(() => this.viewportHeight.set(viewport.clientHeight));
      observer.observe(viewport);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
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

  // --- CSV export -----------------------------------------------------------

  /** Builds CSV of the current view (filter + search + sort applied, no paging). */
  async getCsv(options?: CsvOptions): Promise<string> {
    const source = untracked(this.adapter.source);
    if (!source) return '';
    const load = untracked(this.store.loadOptions);
    const result = await source.load({
      ...(load.sort?.length ? { sort: load.sort } : {}),
      ...(load.filter ? { filter: load.filter } : {}),
      ...(load.searchText ? { searchText: load.searchText } : {}),
    });
    const rows = result.data as readonly T[];
    const messages = untracked(this.msg);
    const columns = untracked(this.resolvedColumns)
      .filter((column) => column.field)
      .map((column) => ({
        caption: column.caption,
        accessor: column.accessor as (row: T) => unknown,
        format:
          column.format ??
          (column.dataType === 'boolean'
            ? (value: unknown) => (value ? messages.booleanTrue : messages.booleanFalse)
            : undefined),
      }));
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

  protected readonly flatNodes = computed<RowNode<T>[]>(() => {
    const result = this.adapter.result();
    const flattened = result
      ? flattenGroupedData<T>(result.data as readonly T[], {
          keyOf: this.keySelector(),
          groups: this.store.grouping.descriptors(),
          groupSummary: this.store.grouping.groupSummary(),
          collapsedGroupKeys: this.store.expansion.collapsedGroups(),
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
    return node?.kind === 'data' ? node.data : undefined;
  });

  protected readonly totalCount = computed<number>(() => {
    const result = this.adapter.result();
    if (result?.totalCount != null) return result.totalCount;
    return this.flatNodes().reduce((count, node) => (node.kind === 'data' ? count + 1 : count), 0);
  });

  protected readonly pageCount = computed<number>(() => {
    const pageSize = this.store.paging.pageSize();
    return pageSize == null ? 1 : Math.max(1, Math.ceil(this.totalCount() / pageSize));
  });

  // --- virtualization ------------------------------------------------------

  private readonly offsetTree = computed<OffsetTree>(() => {
    const nodes = this.flatNodes();
    const rowHeight = this.effRowHeight();
    const detailHeight = this.effDetailRowHeight();
    return new OffsetTree(nodes.length, (i) =>
      nodes[i].kind === 'detail' ? detailHeight : rowHeight
    );
  });

  protected readonly viewWindow = computed<ViewportWindow | null>(() => {
    if (!this.virtualScroll()) return null;
    return computeWindow(
      this.scrollTop(),
      this.viewportHeight(),
      this.offsetTree(),
      this.effOverscan()
    );
  });

  /** Index of the first rendered node within `flatNodes()`. */
  protected readonly viewStart = computed(() => this.viewWindow()?.start ?? 0);

  protected readonly viewNodes = computed<readonly RowNode<T>[]>(() => {
    const window = this.viewWindow();
    const nodes = this.flatNodes();
    return window ? nodes.slice(window.start, window.end) : nodes;
  });

  protected readonly bodyHeight = computed<number | null>(
    () => this.viewWindow()?.totalHeight ?? null
  );

  protected readonly rowsTransform = computed<string | null>(() => {
    const window = this.viewWindow();
    return window ? `translateY(${window.offsetY}px)` : null;
  });

  // --- columns -------------------------------------------------------------

  protected readonly resolvedColumns = computed<ResolvedColumn<T>[]>(() => {
    const widthOverrides = this.store.columns.widthOverrides();
    const pinOverrides = this.store.columns.pinOverrides();
    const declared = this.declaredColumns();
    let columns: ResolvedColumn<T>[];
    if (declared.length) {
      columns = declared
        .filter((column) => column.visible())
        .map((column, index) => {
          const field = column.field();
          const id = field ?? `col-${index}`;
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
            pinned: pinOverrides.get(id) ?? column.pinned(),
            accessor: field ? createFieldAccessor<T>(field) : () => undefined,
            format: column.format(),
            editable: column.editable() && field != null,
            cellTemplate: column.cellTemplate()?.templateRef,
            headerTemplate: column.headerTemplate()?.templateRef,
            editTemplate: column.editTemplate()?.templateRef,
            source: column,
          };
        });
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
        pinned: pinOverrides.get(field) ?? (false as const),
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
    return [...left, ...middle, ...right];
  });

  /** True when a leading expander column is rendered (master-detail active). */
  protected readonly hasExpander = computed(() => this.detailTemplate() !== undefined);

  protected readonly hasCheckboxColumn = computed(() => this.selectionMode() === 'checkbox');

  /** Number of leading utility cells (expander / checkbox) before data columns. */
  protected readonly leadingCellCount = computed(
    () => (this.hasExpander() ? 1 : 0) + (this.hasCheckboxColumn() ? 1 : 0)
  );

  private readonly leadingWidth = computed(
    () =>
      (this.hasExpander() ? EXPANDER_WIDTH : 0) + (this.hasCheckboxColumn() ? CHECKBOX_WIDTH : 0)
  );

  private readonly effColumnMinWidth = computed(
    () => this.columnMinWidth() ?? this.config.columnMinWidth
  );

  protected readonly gridTemplateColumns = computed(() => {
    const defaultMin = this.effColumnMinWidth();
    const tracks = this.resolvedColumns().map((column) => {
      const width = column.width;
      if (typeof width === 'number') return `${width}px`;
      if (width == null && column.pinned) return `${this.config.pinnedDefaultWidth}px`;
      return width ?? `minmax(${column.minWidth ?? defaultMin}px, 1fr)`;
    });
    const leading: string[] = [];
    if (this.hasExpander()) leading.push(`${EXPANDER_WIDTH}px`);
    if (this.hasCheckboxColumn()) leading.push(`${CHECKBOX_WIDTH}px`);
    const trailing = this.hasCommandColumn() ? [`${COMMAND_WIDTH}px`] : [];
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
    if (column.dataType === 'boolean' && !column.format && value != null) {
      return value ? this.msg().booleanTrue : this.msg().booleanFalse;
    }
    return formatCellValue(value, column.dataType, column.format);
  }

  protected onEditorEnter(): void {
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup') this.commitActiveRow();
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

  protected readonly allSelected = computed(() => {
    const keys = this.dataKeys();
    if (!keys.length) return false;
    const selected = this.store.selection.selected();
    return keys.every((key) => selected.has(key));
  });

  protected readonly someSelected = computed(
    () => this.store.selection.count() > 0 && !this.allSelected()
  );

  protected onRowClick(node: DataRowNode<T>, event: MouseEvent): void {
    this.rowClick.emit({ row: node.data, key: node.key, event });
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

  protected onCheckboxToggle(node: DataRowNode<T>, event: Event): void {
    event.stopPropagation();
    this.store.selection.toggle(node.key);
  }

  /** Select-all works on the *current* (filtered) data set. */
  protected toggleSelectAll(): void {
    if (this.allSelected()) this.store.selection.clear();
    else this.store.selection.replace(this.dataKeys());
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

  private scrollRowIntoView(row: number): void {
    if (!this.virtualScroll()) return;
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
        col = Math.min(lastCol, col + 1);
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1);
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
    const mode = this.editMode();
    if (!mode) return false;
    if (mode === 'row' || mode === 'popup') return this.canUpdate() || this.canDelete();
    return this.canDelete();
  });

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
    return this.editMode() === 'row' && this.store.editing.editRowKey() === key;
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
    void this.runSave([{ type: 'remove', key: node.key }]);
  }

  protected addNewRow(): void {
    const key = `oge-new-${++this.newRowCounter}`;
    this.store.editing.addRow(key);
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'cell') {
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
    this.debounced(`f:${field}`, () => {
      this.store.filter.setRowFilter(
        field,
        buildRowFilterExpr(field, column.dataType, raw, column.filterOperator)
      );
    });
  }

  /** Selects apply immediately (no debounce). */
  protected onFilterSelect(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    this.store.filter.setRowFilter(
      field,
      buildRowFilterExpr(field, column.dataType, raw, column.filterOperator)
    );
  }

  protected onSearchInput(raw: string): void {
    this.debounced('search', () => this.store.filter.setSearchText(raw));
  }

  // --- header filter (Excel-style distinct values) -------------------------

  protected readonly headerFilterField = signal<string | null>(null);
  protected readonly headerFilterPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  /** null while the distinct values are loading. */
  protected readonly headerFilterValues = signal<readonly unknown[] | null>(null);

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
    return String(value);
  }

  protected onPageSizeChange(pageSize: number): void {
    this.store.paging.configure(pageSize);
  }
}

export type { SummaryType };
