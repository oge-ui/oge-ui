import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  PivotEngine,
  buildPivotCsv,
  foldText,
  type CustomSummaryMap,
  type FilterExpr,
  type OgePivotStore,
  type PivotArea,
  type PivotAxisNode,
  type PivotAxisPayloadNode,
  type PivotDrillDownArgs,
  type PivotFieldConfig,
  type PivotFieldFns,
  type PivotLoadOptions,
  type PivotLoadResult,
  type PivotPath,
  type PivotCsvOptions,
  type PivotGridStateSnapshot,
  type PivotResult,
  type PivotSummaryDisplayMode,
  type SummaryDescriptor,
  type SummaryType,
} from '@oge-ui/core';
import { formatCellValue } from '@oge-ui/grid';
import {
  OGE_STATE_STORAGE,
  createStatePersistence,
  humanize,
} from '@oge-ui/grid/foundation';
import { OGE_PIVOT_MESSAGES, type OgePivotMessages } from './pivot-config';
import { OgePivotField } from './pivot-field';
import { PivotStateStore } from './pivot-state.store';

export const PIVOT_FIELD_DRAG_TYPE = 'application/x-oge-pivot-field';

// virtual-mode fixed track sizes (px)
const VIRTUAL_ROW_HEIGHT = 32;
const VIRTUAL_COLUMN_WIDTH = 110;
const VIRTUAL_ROW_HEADER_WIDTH = 200;
const VIRTUAL_HEADER_HEIGHT = 32;
const OVERSCAN = 6;

const EMPTY_RESULT: PivotResult = {
  rowRoot: [],
  columnRoot: [],
  rowLeafCount: 0,
  columnLeafCount: 0,
  values: [],
  measures: [],
};

/** One visible line of an axis (row line or column slot), in matrix order. */
export interface PivotAxisLine {
  readonly text: string;
  readonly path: PivotPath;
  readonly level: number;
  readonly expanded: boolean;
  readonly hasChildren: boolean;
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

/** A positioned column-header cell (multi-row header with spans). */
export interface PivotHeaderCell extends PivotAxisLine {
  /** 1-based grid row within the header block. */
  readonly rowStart: number;
  readonly rowEnd: number;
  /** 1-based matrix column the cell starts at. */
  readonly columnStart: number;
  readonly span: number;
}

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

/**
 * PivotGrid MVP: local array data, four field areas, multi-level column
 * headers with spans, tree-layout row headers, expand/collapse on both axes,
 * sub/grand totals and a collapsible drag & drop field panel.
 */
/** One item of the pivot's own lightweight menus. */
export interface OgePivotMenuItem {
  text: string;
  disabled?: boolean;
  active?: boolean;
  action?: () => void;
}

@Component({
  selector: 'oge-pivot-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-pivot-grid',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closePopups()',
  },
  templateUrl: './pivot-grid.html',
  styleUrl: './pivot-grid.scss',
})
export class OgePivotGrid<T = unknown> {
  /** Local rows, or any {@link OgePivotStore} for remote (pre-aggregated) data. */
  readonly data = input<readonly T[] | OgePivotStore<T>>([]);
  readonly virtualScrolling = input(false);
  readonly showRowTotals = input(true);
  readonly showColumnTotals = input(true);
  readonly showRowGrandTotals = input(true);
  readonly showColumnGrandTotals = input(true);
  readonly fieldPanel = input(true);
  readonly messages = input<Partial<OgePivotMessages>>({});
  /** Conditional appearance hook: mutate `text` / `cssClass` per cell. */
  readonly customizeCell = input<(cell: OgePivotCellPrepared) => void>();
  /** Persists the field layout + expansion under this key (`OGE_STATE_STORAGE`). */
  readonly stateKey = input<string | undefined>(undefined);
  /** Debounced notification whenever the persistable state changes. */
  readonly stateChange = output<PivotGridStateSnapshot>();

  readonly cellClick = output<OgePivotCellClickEvent>();
  readonly cellDblClick = output<OgePivotCellClickEvent>();
  readonly fieldLayoutChange = output<readonly PivotFieldConfig[]>();

  protected readonly store = new PivotStateStore();
  private readonly defaultMessages = inject(OGE_PIVOT_MESSAGES);
  protected readonly msg = computed<OgePivotMessages>(() => ({
    ...this.defaultMessages,
    ...this.messages(),
  }));

  protected readonly fieldDirectives = contentChildren(OgePivotField<T>);

  /** Declared field configuration, before any user layout overrides. */
  private readonly baseFields = computed<readonly PivotFieldConfig[]>(() =>
    this.fieldDirectives().map((directive, index) => {
      const dataField = directive.dataField();
      return {
        id: directive.id() ?? dataField,
        dataField,
        caption: directive.caption() ?? humanize(dataField),
        area: directive.area(),
        areaIndex: directive.areaIndex() ?? index,
        dataType: directive.dataType(),
        groupInterval: directive.groupInterval(),
        summaryType: directive.summaryType(),
        summaryName: directive.summaryName(),
        summaryDisplayMode: directive.summaryDisplayMode(),
        runningTotal: directive.runningTotal(),
        sortOrder: directive.sortOrder(),
        sortBySummaryField: directive.sortBySummaryField(),
        sortBySummaryPath: directive.sortBySummaryPath(),
        filterValues: directive.filterValues(),
        filterType: directive.filterType(),
        showTotals: directive.showTotals(),
      };
    }),
  );

  /** Declared fields + user layout overrides, ready for the engine. */
  protected readonly resolvedFields = computed<readonly PivotFieldConfig[]>(
    () => {
      const overrides = this.store.fieldOverrides();
      return this.baseFields().map((base) => ({
        ...base,
        ...overrides.get(base.id),
      }));
    },
  );

  private readonly fieldFns = computed<
    Readonly<Record<string, PivotFieldFns<T>>>
  >(() => {
    const fns: Record<string, PivotFieldFns<T>> = {};
    for (const directive of this.fieldDirectives()) {
      const id = directive.id() ?? directive.dataField();
      const selector = directive.selector();
      const format = directive.format();
      const customizeText = directive.customizeText();
      if (selector || format || customizeText)
        fns[id] = { selector, format, customizeText };
    }
    return fns;
  });

  private readonly customSummaries = computed<CustomSummaryMap<T> | undefined>(
    () => {
      const map: Record<
        string,
        (rows: readonly T[], field: string) => unknown
      > = {};
      let any = false;
      for (const directive of this.fieldDirectives()) {
        const reducer = directive.calculateCustomSummary();
        if (reducer) {
          map[directive.summaryName() ?? directive.dataField()] = reducer;
          any = true;
        }
      }
      return any ? map : undefined;
    },
  );

  protected readonly isRemote = computed(() => !Array.isArray(this.data()));

  private readonly dataRows = computed<readonly T[]>(() => {
    const data = this.data();
    return Array.isArray(data) ? data : [];
  });

  /** Data-dependent phase: rebuilt only when rows or the field layout change. */
  private readonly engine = computed(
    () =>
      new PivotEngine<T>({
        rows: this.dataRows(),
        fields: this.resolvedFields(),
        fns: this.fieldFns(),
        customSummaries: this.customSummaries(),
      }),
  );

  // --- remote data (OgePivotStore) ------------------------------------------

  protected readonly loading = signal(false);
  private readonly remoteResult = signal<PivotResult | null>(null);
  private remoteAbort: AbortController | null = null;

  // --- state persistence ----------------------------------------------------

  private readonly persistedSnapshot = computed<PivotGridStateSnapshot>(() => ({
    fields: this.resolvedFields().map((field) => ({
      id: field.id,
      area: field.area ?? null,
      areaIndex: field.areaIndex,
      summaryType: field.summaryType,
      summaryDisplayMode: field.summaryDisplayMode,
      sortOrder: field.sortOrder,
      sortBySummaryField: field.sortBySummaryField,
      sortBySummaryPath: field.sortBySummaryPath,
      filterValues: field.filterValues,
      filterType: field.filterType,
    })),
    rowExpandedPaths: this.store.rowExpandedPathList(),
    columnExpandedPaths: this.store.columnExpandedPathList(),
    fieldPanelCollapsed: this.store.fieldPanelCollapsed(),
  }));

  /** Current persistable UI state: field layout + expansion. */
  state(): PivotGridStateSnapshot {
    return untracked(this.persistedSnapshot);
  }

  /** Applies a previously captured state snapshot. */
  applyState(snapshot: PivotGridStateSnapshot): void {
    untracked(() => {
      if (snapshot.fields) {
        const overrides = new Map<string, Partial<PivotFieldConfig>>();
        for (const entry of snapshot.fields) {
          const { id, ...rest } = entry;
          overrides.set(id, rest as Partial<PivotFieldConfig>);
        }
        this.store.applyOverrides(overrides);
      }
      this.store.setExpansion(
        snapshot.rowExpandedPaths ?? [],
        snapshot.columnExpandedPaths ?? [],
      );
      if (snapshot.fieldPanelCollapsed !== undefined) {
        if (this.store.fieldPanelCollapsed() !== snapshot.fieldPanelCollapsed) {
          this.store.toggleFieldPanel();
        }
      }
    });
  }

  // --- export ---------------------------------------------------------------

  /** The materialized pivot exactly as rendered — for custom export integrations. */
  getResult(): PivotResult {
    return untracked(this.result);
  }

  /** CSV of exactly what is on screen (multi-level headers flattened). */
  getCsv(options?: PivotCsvOptions): string {
    const messages = untracked(this.msg);
    return buildPivotCsv(untracked(this.result), {
      grandTotalText: messages.grandTotal,
      ...options,
    });
  }

  /** Downloads the current view as a CSV file. */
  exportCsv(filename = 'pivot.csv'): void {
    const csv = this.getCsv();
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.remoteAbort?.abort());
    createStatePersistence<PivotGridStateSnapshot>({
      stateKey: this.stateKey,
      prefix: 'oge-pivot',
      storage: inject(OGE_STATE_STORAGE),
      snapshot: this.persistedSnapshot,
      apply: (snapshot) => this.applyState(snapshot),
      beforeRestore: () => this.fieldDirectives(),
      onChange: (snapshot) => this.stateChange.emit(snapshot),
    });
    // remote load: layout or expansion changes issue one (abortable) request
    effect(() => {
      const data = this.data();
      if (Array.isArray(data)) return;
      const options = this.buildLoadOptions();
      untracked(() => {
        this.remoteAbort?.abort();
        const abort = new AbortController();
        this.remoteAbort = abort;
        this.loading.set(true);
        void (data as OgePivotStore<T>)
          .load({ ...options, signal: abort.signal })
          .then((payload) => {
            if (abort.signal.aborted) return;
            this.remoteResult.set(this.fromPayload(payload));
          })
          .finally(() => {
            if (!abort.signal.aborted) this.loading.set(false);
          });
      });
    });
    afterNextRender(() => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!viewport || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        this.viewportSize.set({
          width: viewport.clientWidth,
          height: viewport.clientHeight,
        });
      });
      observer.observe(viewport);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private buildLoadOptions(): PivotLoadOptions {
    const fields = this.resolvedFields();
    const byArea = (area: PivotArea) =>
      fields
        .filter((field) => field.area === area)
        .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0));
    const measures: SummaryDescriptor[] = byArea('data').map((field) => ({
      field: field.dataField,
      type: field.summaryType ?? 'sum',
      name: field.summaryName,
    }));
    // fold include/exclude value filters into one serializable filter tree
    const operands: FilterExpr[] = [];
    for (const field of fields) {
      if (!field.filterValues?.length || field.area === 'data') continue;
      const inExpr: FilterExpr = {
        type: 'binary',
        field: field.dataField,
        op: 'in',
        value: [...field.filterValues],
      };
      operands.push(
        field.filterType === 'exclude'
          ? { type: 'not', operand: inExpr }
          : inExpr,
      );
    }
    return {
      rowFields: byArea('row').map((field) => ({
        dataField: field.dataField,
        groupInterval: field.groupInterval,
        dir: field.sortOrder,
      })),
      columnFields: byArea('column').map((field) => ({
        dataField: field.dataField,
        groupInterval: field.groupInterval,
        dir: field.sortOrder,
      })),
      measures,
      filter: operands.length
        ? operands.length === 1
          ? operands[0]
          : { type: 'and', operands }
        : null,
      rowExpandedPaths: this.store.rowExpandedPathList(),
      columnExpandedPaths: this.store.columnExpandedPathList(),
    };
  }

  /** Rebuilds a PivotResult from the serializable payload (parent-first order). */
  private fromPayload(payload: PivotLoadResult): PivotResult {
    const measures = this.resolvedFields().filter(
      (field) => field.area === 'data',
    );
    const buildAxis = (
      nodes: readonly PivotAxisPayloadNode[],
      showGrand: boolean,
    ): { nodes: PivotAxisNode[]; count: number } => {
      let slot = 0;
      const visit = (
        payloadNodes: readonly PivotAxisPayloadNode[],
        path: PivotPath,
      ): PivotAxisNode[] =>
        payloadNodes.map((node) => {
          const ownPath = [...path, node.value ?? null];
          const children = node.children ?? [];
          const expanded = children.length > 0;
          const start = slot++;
          const built: PivotAxisNode[] = expanded
            ? visit(children, ownPath)
            : [];
          return {
            value: node.value,
            text: node.text ?? String(node.value ?? ''),
            path: ownPath,
            children: built,
            expanded,
            hasChildren: node.hasChildren ?? expanded,
            leafIndex: start,
            leafCount: slot - start,
            isTotal: expanded,
            isGrandTotal: false,
          };
        });
      const roots = visit(nodes, []);
      if (showGrand) {
        roots.push({
          value: null,
          text: '',
          path: [],
          children: [],
          expanded: false,
          hasChildren: false,
          leafIndex: slot++,
          leafCount: 1,
          isTotal: false,
          isGrandTotal: true,
        });
      }
      return { nodes: roots, count: slot };
    };

    const showGrandRows = this.showRowGrandTotals() && !!payload.columnTotals;
    const showGrandColumns =
      this.showColumnGrandTotals() && !!payload.rowTotals;
    const rows = buildAxis(payload.rows, showGrandRows);
    const columns = buildAxis(payload.columns, showGrandColumns);
    const blank = measures.map(() => null as unknown);

    const values: unknown[][][] = [];
    const bodyRows = rows.count - (showGrandRows ? 1 : 0);
    const bodyColumns = columns.count - (showGrandColumns ? 1 : 0);
    for (let r = 0; r < bodyRows; r++) {
      const line: unknown[][] = [];
      for (let c = 0; c < bodyColumns; c++) {
        line.push([...(payload.values[r]?.[c] ?? blank)]);
      }
      if (showGrandColumns)
        line.push([...(payload.rowTotals?.[r]?.[0] ?? blank)]);
      values.push(line);
    }
    if (showGrandRows) {
      const line: unknown[][] = [];
      for (let c = 0; c < bodyColumns; c++) {
        line.push([...(payload.columnTotals?.[0]?.[c] ?? blank)]);
      }
      if (showGrandColumns) line.push([...(payload.grandTotal ?? blank)]);
      values.push(line);
    }

    return {
      rowRoot: rows.nodes,
      columnRoot: columns.nodes,
      rowLeafCount: rows.count,
      columnLeafCount: columns.count,
      values,
      measures,
    };
  }

  /** Expansion-dependent phase: cheap on toggle (local); remote uses the last payload. */
  protected readonly result = computed<PivotResult>(() => {
    if (this.isRemote()) {
      return this.remoteResult() ?? EMPTY_RESULT;
    }
    return this.engine().materialize({
      rowExpandedPaths: this.store.rowExpandedPaths(),
      columnExpandedPaths: this.store.columnExpandedPaths(),
      settings: {
        showRowTotals: this.showRowTotals(),
        showColumnTotals: this.showColumnTotals(),
        showRowGrandTotals: this.showRowGrandTotals(),
        showColumnGrandTotals: this.showColumnGrandTotals(),
      },
    });
  });

  // --- two-axis virtualization ----------------------------------------------

  protected readonly viewportRef =
    viewChild<ElementRef<HTMLElement>>('pivotViewport');
  protected readonly scrollPos = signal<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  protected readonly viewportSize = signal<{ width: number; height: number }>({
    width: 1200,
    height: 600,
  });

  protected onViewportScroll(event: Event): void {
    if (!this.virtualScrolling()) return;
    const target = event.target as HTMLElement;
    this.scrollPos.set({ top: target.scrollTop, left: target.scrollLeft });
  }

  /** Visible row-slot window (virtual mode; otherwise the full range). */
  protected readonly rowWindow = computed<{ start: number; end: number }>(
    () => {
      const count = this.result().rowLeafCount;
      if (!this.virtualScrolling()) return { start: 0, end: count };
      const { top } = this.scrollPos();
      const { height } = this.viewportSize();
      const headerBlock = this.columnDepth() * VIRTUAL_HEADER_HEIGHT;
      const start = Math.max(
        0,
        Math.floor((top - headerBlock) / VIRTUAL_ROW_HEIGHT) - OVERSCAN,
      );
      const end = Math.min(
        count,
        Math.ceil((top - headerBlock + height) / VIRTUAL_ROW_HEIGHT) + OVERSCAN,
      );
      return { start, end: Math.max(end, start) };
    },
  );

  /** Fixed column track in virtual mode — widened when several measures share a cell. */
  protected readonly virtualColumnWidth = computed<number>(() =>
    Math.max(VIRTUAL_COLUMN_WIDTH, this.measures().length * 96),
  );

  protected readonly columnWindow = computed<{ start: number; end: number }>(
    () => {
      const count = this.result().columnLeafCount;
      if (!this.virtualScrolling()) return { start: 0, end: count };
      const { left } = this.scrollPos();
      const { width } = this.viewportSize();
      const columnWidth = this.virtualColumnWidth();
      const start = Math.max(
        0,
        Math.floor((left - VIRTUAL_ROW_HEADER_WIDTH) / columnWidth) - OVERSCAN,
      );
      const end = Math.min(
        count,
        Math.ceil((left - VIRTUAL_ROW_HEADER_WIDTH + width) / columnWidth) +
          OVERSCAN,
      );
      return { start, end: Math.max(end, start) };
    },
  );

  /** Row indexes actually rendered. */
  protected readonly visibleRowIndexes = computed<readonly number[]>(() => {
    const { start, end } = this.rowWindow();
    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  protected readonly visibleColumnIndexes = computed<readonly number[]>(() => {
    const { start, end } = this.columnWindow();
    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  /** Header cells intersecting the horizontal window. */
  protected readonly visibleHeaderCells = computed<readonly PivotHeaderCell[]>(
    () => {
      if (!this.virtualScrolling()) return this.columnHeaderCells();
      const { start, end } = this.columnWindow();
      return this.columnHeaderCells().filter(
        (cell) =>
          cell.columnStart - 1 < end &&
          cell.columnStart - 1 + cell.span > start,
      );
    },
  );

  /** Explicit track sizes so off-window cells keep their place (virtual mode). */
  protected readonly matrixTemplate = computed<{
    rows: string | null;
    columns: string;
  }>(() => {
    const result = this.result();
    if (!this.virtualScrolling()) {
      return {
        rows: null,
        columns: `minmax(160px, max-content) repeat(${String(result.columnLeafCount)}, minmax(90px, auto))`,
      };
    }
    return {
      rows: `repeat(${String(this.columnDepth())}, ${String(VIRTUAL_HEADER_HEIGHT)}px) repeat(${String(result.rowLeafCount)}, ${String(VIRTUAL_ROW_HEIGHT)}px)`,
      columns: `${String(VIRTUAL_ROW_HEADER_WIDTH)}px repeat(${String(result.columnLeafCount)}, ${String(this.virtualColumnWidth())}px)`,
    };
  });

  // --- axis projections -----------------------------------------------------

  protected readonly rowLines = computed<readonly PivotAxisLine[]>(() => {
    const lines: PivotAxisLine[] = [];
    const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
      for (const node of nodes) {
        if (node.leafIndex >= 0)
          lines[node.leafIndex] = this.lineOf(node, level);
        if (node.children.length) visit(node.children, level + 1);
      }
    };
    visit(this.result().rowRoot, 0);
    return lines;
  });

  /** Depth of the visible column header block (≥ 1). */
  protected readonly columnDepth = computed<number>(() => {
    let depth = 1;
    const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
      for (const node of nodes) {
        depth = Math.max(depth, level + 1);
        if (node.children.length) visit(node.children, level + 1);
      }
    };
    visit(this.result().columnRoot, 0);
    return depth;
  });

  protected readonly columnHeaderCells = computed<readonly PivotHeaderCell[]>(
    () => {
      const depth = this.columnDepth();
      const cells: PivotHeaderCell[] = [];
      const startOf = (node: PivotAxisNode): number =>
        node.leafIndex >= 0 ? node.leafIndex : startOf(node.children[0]);
      const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
        for (const node of nodes) {
          const start = startOf(node);
          cells.push({
            ...this.lineOf(node, level),
            rowStart: level + 1,
            rowEnd: node.children.length ? level + 2 : depth + 1,
            columnStart: start + 1,
            span: Math.max(1, node.leafCount),
          });
          if (node.children.length) {
            // the expanded parent's own subtotal slot needs a header cell under
            // the spanning parent, down to the leaf row
            if (level + 2 <= depth) {
              cells.push({
                text: '',
                path: node.path,
                level: level + 1,
                expanded: false,
                hasChildren: false,
                isTotal: true,
                isGrandTotal: false,
                rowStart: level + 2,
                rowEnd: depth + 1,
                columnStart: start + 1,
                span: 1,
              });
            }
            visit(node.children, level + 1);
          }
        }
      };
      visit(this.result().columnRoot, 0);
      return cells;
    },
  );

  protected readonly columnIndexes = computed<readonly number[]>(() =>
    Array.from({ length: this.result().columnLeafCount }, (_, index) => index),
  );

  private readonly columnSlotFlags = computed<{
    total: boolean[];
    grand: boolean[];
  }>(() => {
    const count = this.result().columnLeafCount;
    const total = new Array<boolean>(count).fill(false);
    const grand = new Array<boolean>(count).fill(false);
    const visit = (nodes: readonly PivotAxisNode[]): void => {
      for (const node of nodes) {
        if (node.leafIndex >= 0) {
          total[node.leafIndex] = node.isTotal;
          grand[node.leafIndex] = node.isGrandTotal;
        }
        if (node.children.length) visit(node.children);
      }
    };
    visit(this.result().columnRoot);
    return { total, grand };
  });

  protected columnSlotIsTotal(): readonly boolean[] {
    return this.columnSlotFlags().total;
  }

  protected columnSlotIsGrand(): readonly boolean[] {
    return this.columnSlotFlags().grand;
  }

  private lineOf(node: PivotAxisNode, level: number): PivotAxisLine {
    const messages = this.msg();
    const text = node.isGrandTotal
      ? messages.grandTotal
      : node.isTotal && !node.hasChildren
        ? messages.totalPattern.replace('{0}', node.text || messages.blankValue)
        : node.text || messages.blankValue;
    return {
      text,
      path: node.path,
      level,
      expanded: node.expanded,
      // expanded parents keep their expander even though they carry totals
      hasChildren: node.hasChildren && !node.isGrandTotal,
      isTotal: node.isTotal,
      isGrandTotal: node.isGrandTotal,
    };
  }

  // --- cells ----------------------------------------------------------------

  protected readonly measures = computed(() => this.result().measures);

  protected cellText(
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ): string {
    return this.preparedCell(rowIndex, columnIndex, measureIndex).text;
  }

  protected cellClass(
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ): string | null {
    return (
      this.preparedCell(rowIndex, columnIndex, measureIndex).cssClass ?? null
    );
  }

  /** Default text + the `customizeCell` hook, per measure of a cell. */
  protected preparedCell(
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ): OgePivotCellPrepared {
    const value = this.result().values[rowIndex]?.[columnIndex]?.[measureIndex];
    const measure = this.measures()[measureIndex];
    const fns = this.fieldFns()[measure.id];
    let text = '';
    if (value != null) {
      if (fns?.format) text = fns.format(value);
      else if (measure.summaryDisplayMode?.startsWith('percent')) {
        text = `${(Number(value) * 100).toFixed(1)}%`;
      } else {
        text = formatCellValue(value, measure.dataType ?? 'number', undefined);
      }
    }
    const rowLine = this.rowLines()[rowIndex];
    const columnFlags = this.columnSlotFlags();
    const prepared: OgePivotCellPrepared = {
      rowPath: rowLine?.path ?? [],
      columnPath: this.columnSlotLine(columnIndex)?.path ?? [],
      measureId: measure.id,
      isTotal: (rowLine?.isTotal ?? false) || columnFlags.total[columnIndex],
      isGrandTotal:
        (rowLine?.isGrandTotal ?? false) || columnFlags.grand[columnIndex],
      value,
      text,
    };
    this.customizeCell()?.(prepared);
    return prepared;
  }

  protected onCellClick(
    rowIndex: number,
    columnIndex: number,
    event: MouseEvent,
    dbl = false,
  ): void {
    const rowLine = this.rowLines()[rowIndex];
    const columnLine = this.columnSlotLine(columnIndex);
    if (!rowLine || !columnLine) return;
    for (let m = 0; m < this.measures().length; m++) {
      const payload: OgePivotCellClickEvent = {
        rowPath: rowLine.path,
        columnPath: columnLine.path,
        measureIndex: m,
        value: this.result().values[rowIndex]?.[columnIndex]?.[m],
        event,
      };
      if (dbl) this.cellDblClick.emit(payload);
      else this.cellClick.emit(payload);
      break; // one event per cell; measureIndex 0 carries the location
    }
  }

  /** Column slots in matrix order (mirror of `rowLines`). */
  protected readonly columnLines = computed<readonly PivotAxisLine[]>(() => {
    const lines: PivotAxisLine[] = [];
    const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
      for (const node of nodes) {
        if (node.leafIndex >= 0)
          lines[node.leafIndex] = this.lineOf(node, level);
        if (node.children.length) visit(node.children, level + 1);
      }
    };
    visit(this.result().columnRoot, 0);
    return lines;
  });

  private columnSlotLine(index: number): PivotAxisLine | undefined {
    return this.columnLines()[index];
  }

  /** Raw rows behind a cell — drill-down. */
  drillDown(args: PivotDrillDownArgs): T[] {
    return this.engine().drillDownRows(args.rowPath, args.columnPath);
  }

  protected toggleRow(line: PivotAxisLine, event?: Event): void {
    event?.stopPropagation();
    if (event instanceof KeyboardEvent) event.preventDefault();
    if (line.hasChildren) this.store.toggleRowPath(line.path);
  }

  protected toggleColumn(cell: PivotHeaderCell, event?: Event): void {
    event?.stopPropagation();
    if (event instanceof KeyboardEvent) event.preventDefault();
    if (cell.hasChildren) this.store.toggleColumnPath(cell.path);
  }

  // --- keyboard navigation over the value matrix ----------------------------

  protected readonly focusedCell = signal<{ row: number; col: number } | null>(
    null,
  );

  protected isCellTabbable(row: number, col: number): boolean {
    const focused = this.focusedCell();
    if (focused) return focused.row === row && focused.col === col;
    return row === 0 && col === 0;
  }

  protected onCellFocus(row: number, col: number): void {
    const current = this.focusedCell();
    if (current?.row !== row || current.col !== col)
      this.focusedCell.set({ row, col });
  }

  protected onMatrixKeydown(event: KeyboardEvent): void {
    const cell = this.focusedCell();
    if (!cell) return;
    let { row, col } = cell;
    const lastRow = this.result().rowLeafCount - 1;
    const lastCol = this.result().columnLeafCount - 1;
    switch (event.key) {
      case 'ArrowDown':
        row = Math.min(lastRow, row + 1);
        break;
      case 'ArrowUp':
        row = Math.max(0, row - 1);
        break;
      case 'ArrowRight':
        col = Math.min(lastCol, col + 1);
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1);
        break;
      case 'Home':
        col = 0;
        break;
      case 'End':
        col = lastCol;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (row !== cell.row || col !== cell.col) {
      this.focusedCell.set({ row, col });
      // move DOM focus to the newly tabbable cell
      setTimeout(() => {
        const host = (event.target as HTMLElement).closest('.oge-pivot-matrix');
        const next = host?.querySelector<HTMLElement>(
          `[data-cell="${String(row)}-${String(col)}"]`,
        );
        next?.focus();
      });
    }
  }

  expandAll(area: 'row' | 'column'): void {
    const paths = this.isRemote()
      ? this.axisPathsFromResult(area) // remote: expand what is loaded
      : this.engine().allGroupPaths(area);
    if (area === 'row')
      this.store.setExpansion(paths, this.store.columnExpandedPathList());
    else this.store.setExpansion(this.store.rowExpandedPathList(), paths);
  }

  collapseAll(area: 'row' | 'column'): void {
    if (area === 'row')
      this.store.setExpansion([], this.store.columnExpandedPathList());
    else this.store.setExpansion(this.store.rowExpandedPathList(), []);
  }

  private axisPathsFromResult(area: 'row' | 'column'): readonly PivotPath[] {
    const paths: PivotPath[] = [];
    const visit = (nodes: readonly PivotAxisNode[]): void => {
      for (const node of nodes) {
        if (node.hasChildren && !node.isGrandTotal) paths.push(node.path);
        visit(node.children);
      }
    };
    visit(area === 'row' ? this.result().rowRoot : this.result().columnRoot);
    return paths;
  }

  getFieldLayout(): readonly PivotFieldConfig[] {
    return this.resolvedFields();
  }

  // --- field panel ----------------------------------------------------------

  protected readonly panelAreas = computed(() => {
    const messages = this.msg();
    const fields = this.resolvedFields();
    const inArea = (area: string) =>
      fields
        .filter((field) => field.area === area)
        .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0));
    return [
      {
        area: 'filter' as const,
        label: messages.filterArea,
        fields: inArea('filter'),
      },
      { area: 'row' as const, label: messages.rowArea, fields: inArea('row') },
      {
        area: 'column' as const,
        label: messages.columnArea,
        fields: inArea('column'),
      },
      {
        area: 'data' as const,
        label: messages.dataArea,
        fields: inArea('data'),
      },
    ];
  });

  private draggedFieldId: string | null = null;

  protected onFieldDragStart(field: PivotFieldConfig, event: DragEvent): void {
    this.draggedFieldId = field.id;
    event.dataTransfer?.setData(PIVOT_FIELD_DRAG_TYPE, field.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onAreaDragOver(event: DragEvent): void {
    if (this.draggedFieldId) event.preventDefault();
  }

  protected onAreaDrop(area: PivotArea | null, event: DragEvent): void {
    const id = this.draggedFieldId;
    this.draggedFieldId = null;
    if (!id) return;
    event.preventDefault();
    this.placeField(id, area);
  }

  protected onFieldDragEnd(): void {
    this.draggedFieldId = null;
  }

  /** Moves a field to the end of an area (chooser draft aware). */
  private placeField(id: string, area: PivotArea | null): void {
    const count = this.chooserFields().filter(
      (field) => field.area === area,
    ).length;
    const draft = this.chooserDraft();
    if (draft) {
      const next = new Map(draft);
      next.set(id, { ...next.get(id), area, areaIndex: count });
      this.chooserDraft.set(next);
      return;
    }
    this.store.moveField(id, area, count);
    this.fieldLayoutChange.emit(untracked(this.resolvedFields));
  }

  // --- header context menu --------------------------------------------------

  protected readonly menu = signal<{
    x: number;
    y: number;
    items: OgePivotMenuItem[];
  } | null>(null);

  protected closePopups(): void {
    this.menu.set(null);
    this.filterPopup.set(null);
  }

  /** Outside clicks close the menu/popup; clicks inside them (or menu actions
   *  that just opened a popup) must not. */
  protected onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const insideOwnPopup = target?.closest?.(
      '.oge-context-menu, .oge-pivot-filter-popup',
    );
    if (insideOwnPopup) return;
    this.closePopups();
  }

  protected runMenuItem(item: OgePivotMenuItem): void {
    if (item.disabled) return;
    this.menu.set(null);
    item.action?.();
  }

  private axisFieldAt(
    axis: 'row' | 'column',
    level: number,
  ): PivotFieldConfig | undefined {
    const area = axis === 'row' ? 'row' : 'column';
    return this.resolvedFields()
      .filter((field) => field.area === area)
      .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0))[level];
  }

  /** Right-click on an axis header: sort / sortBySummary / filter / layout items. */
  protected onHeaderContextMenu(
    axis: 'row' | 'column',
    line: PivotAxisLine,
    event: MouseEvent,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const messages = this.msg();
    const items: OgePivotMenuItem[] = [];
    const field = line.isGrandTotal
      ? undefined
      : this.axisFieldAt(axis, line.level);

    if (field) {
      items.push(
        {
          text: messages.sortAscending,
          active: field.sortOrder !== 'desc' && !field.sortBySummaryField,
          action: () =>
            this.store.patchField(field.id, {
              sortOrder: 'asc',
              sortBySummaryField: undefined,
              sortBySummaryPath: undefined,
            }),
        },
        {
          text: messages.sortDescending,
          active: field.sortOrder === 'desc' && !field.sortBySummaryField,
          action: () =>
            this.store.patchField(field.id, {
              sortOrder: 'desc',
              sortBySummaryField: undefined,
              sortBySummaryPath: undefined,
            }),
        },
      );
      // sorting the OPPOSITE axis by this header's values
      const oppositeField = this.axisFieldAt(
        axis === 'row' ? 'column' : 'row',
        0,
      );
      const measure = this.measures()[0];
      if (oppositeField && measure && !line.isTotal) {
        const sortsAlready =
          oppositeField.sortBySummaryField === measure.id &&
          JSON.stringify(oppositeField.sortBySummaryPath) ===
            JSON.stringify(line.path);
        items.push({
          text: messages.sortBySummaryPattern.replace('{0}', line.text),
          active: sortsAlready,
          action: () =>
            this.store.patchField(oppositeField.id, {
              sortBySummaryField: measure.id,
              sortBySummaryPath: line.path,
              sortOrder:
                sortsAlready && oppositeField.sortOrder === 'desc'
                  ? 'asc'
                  : 'desc',
            }),
        });
      }
      items.push({
        text: messages.clearSorting,
        action: () =>
          this.store.patchField(field.id, {
            sortOrder: undefined,
            sortBySummaryField: undefined,
            sortBySummaryPath: undefined,
          }),
      });
      items.push({
        text: `${messages.filterField}…`,
        action: () => this.openFilterPopup(field, event),
      });
      items.push({
        text: messages.removeField,
        action: () => this.placeField(field.id, null),
      });
    }

    items.push(
      { text: messages.expandAll, action: () => this.expandAll(axis) },
      { text: messages.collapseAll, action: () => this.collapseAll(axis) },
      {
        text: `${messages.showFieldChooser}…`,
        action: () => this.showFieldChooser(),
      },
    );
    this.menu.set({ x: event.clientX, y: event.clientY, items });
  }

  /** Right-click on a measure chip: summary type + display mode. */
  protected onMeasureContextMenu(
    field: PivotFieldConfig,
    event: MouseEvent,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const messages = this.msg();
    const items: OgePivotMenuItem[] = [];
    const summaryTypes: readonly ('sum' | 'avg' | 'min' | 'max' | 'count')[] = [
      'sum',
      'avg',
      'min',
      'max',
      'count',
    ];
    for (const type of summaryTypes) {
      items.push({
        text: `${messages.summaryTypeMenu}: ${messages.summaryTypeLabels[type]}`,
        active: (field.summaryType ?? 'sum') === type,
        action: () =>
          this.store.patchField(field.id, { summaryType: type as SummaryType }),
      });
    }
    const modes = Object.keys(
      messages.displayModeLabels,
    ) as PivotSummaryDisplayMode[];
    for (const mode of modes) {
      items.push({
        text: `${messages.displayModeMenu}: ${messages.displayModeLabels[mode]}`,
        active: (field.summaryDisplayMode ?? 'none') === mode,
        action: () =>
          this.store.patchField(field.id, { summaryDisplayMode: mode }),
      });
    }
    this.menu.set({ x: event.clientX, y: event.clientY, items });
  }

  // --- field value filter popup ---------------------------------------------

  protected readonly filterPopup = signal<{
    fieldId: string;
    caption: string;
    x: number;
    y: number;
    values: readonly unknown[];
    selected: ReadonlySet<unknown>;
    type: 'include' | 'exclude';
  } | null>(null);

  protected readonly filterSearch = signal('');

  private openFilterPopup(field: PivotFieldConfig, event: MouseEvent): void {
    const accessor = this.fieldFns()[field.id]?.selector;
    const values = new Set<unknown>();
    for (const row of this.dataRows()) {
      values.add(accessor ? accessor(row) : this.valueOf(row, field.dataField));
      if (values.size >= 1000) break;
    }
    const sorted = [...values].sort((a, b) =>
      String(a ?? '').localeCompare(String(b ?? '')),
    );
    this.filterSearch.set('');
    this.filterPopup.set({
      fieldId: field.id,
      caption: field.caption ?? field.dataField,
      x: event.clientX,
      y: event.clientY,
      values: sorted,
      selected: new Set(field.filterValues ?? sorted),
      type: field.filterType ?? 'include',
    });
  }

  private valueOf(row: T, path: string): unknown {
    let value: unknown = row;
    for (const part of path.split('.')) {
      if (value == null) return null;
      value = (value as Record<string, unknown>)[part];
    }
    return value ?? null;
  }

  protected readonly visibleFilterValues = computed<readonly unknown[]>(() => {
    const popup = this.filterPopup();
    if (!popup) return [];
    const query = foldText(this.filterSearch().trim());
    if (!query) return popup.values;
    return popup.values.filter((value) =>
      foldText(String(value ?? this.msg().blankValue)).includes(query),
    );
  });

  protected filterValueText(value: unknown): string {
    return value == null || value === ''
      ? this.msg().blankValue
      : String(value);
  }

  protected toggleFilterValue(value: unknown): void {
    const popup = this.filterPopup();
    if (!popup) return;
    const selected = new Set(popup.selected);
    if (!selected.delete(value)) selected.add(value);
    this.filterPopup.set({ ...popup, selected });
  }

  protected toggleAllFilterValues(): void {
    const popup = this.filterPopup();
    if (!popup) return;
    const all = popup.selected.size === popup.values.length;
    this.filterPopup.set({
      ...popup,
      selected: new Set(all ? [] : popup.values),
    });
  }

  protected setFilterType(type: 'include' | 'exclude'): void {
    const popup = this.filterPopup();
    if (popup) this.filterPopup.set({ ...popup, type });
  }

  protected applyFilterPopup(): void {
    const popup = this.filterPopup();
    if (!popup) return;
    const everything = popup.selected.size === popup.values.length;
    this.store.patchField(popup.fieldId, {
      filterValues:
        everything && popup.type === 'include'
          ? undefined
          : [...popup.selected],
      filterType: popup.type,
    });
    this.filterPopup.set(null);
  }

  protected clearFilterPopup(): void {
    const popup = this.filterPopup();
    if (!popup) return;
    this.store.patchField(popup.fieldId, {
      filterValues: undefined,
      filterType: undefined,
    });
    this.filterPopup.set(null);
  }

  // --- field chooser dialog -------------------------------------------------

  readonly fieldChooser = input<{
    applyChangesMode?: 'instantly' | 'onDemand';
  }>({});

  protected readonly chooserOpen = signal(false);
  protected readonly chooserSearch = signal('');
  /** Draft overrides while `applyChangesMode: 'onDemand'`; null = live mode. */
  protected readonly chooserDraft = signal<ReadonlyMap<
    string,
    Partial<PivotFieldConfig>
  > | null>(null);

  showFieldChooser(): void {
    this.chooserSearch.set('');
    this.chooserDraft.set(
      this.fieldChooser().applyChangesMode === 'onDemand'
        ? new Map(this.store.fieldOverrides())
        : null,
    );
    this.chooserOpen.set(true);
  }

  protected closeFieldChooser(): void {
    this.chooserOpen.set(false);
    this.chooserDraft.set(null);
  }

  protected applyFieldChooser(): void {
    const draft = this.chooserDraft();
    if (draft) {
      this.store.applyOverrides(draft);
      this.fieldLayoutChange.emit(untracked(this.resolvedFields));
    }
    this.closeFieldChooser();
  }

  /** Fields as the chooser sees them: the draft replaces the store overrides. */
  protected readonly chooserFields = computed<readonly PivotFieldConfig[]>(
    () => {
      const draft = this.chooserDraft();
      if (!draft) return this.resolvedFields();
      return this.baseFields().map((base) => ({
        ...base,
        ...draft.get(base.id),
      }));
    },
  );

  protected readonly chooserAllFields = computed(() => {
    const query = foldText(this.chooserSearch().trim());
    const fields = this.chooserFields();
    if (!query) return fields;
    return fields.filter((field) =>
      foldText(field.caption ?? field.dataField).includes(query),
    );
  });

  protected chooserAreaFields(area: PivotArea): readonly PivotFieldConfig[] {
    return this.chooserFields()
      .filter((field) => field.area === area)
      .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0));
  }
}
