import {
  formatCellValue,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import {
  PivotEngine,
  buildPivotCsv,
  foldText,
  type CustomSummaryMap,
  type OgePivotStore,
  type PivotArea,
  type PivotCsvOptions,
  type PivotDrillDownArgs,
  type PivotFieldConfig,
  type PivotFieldFns,
  type PivotGridStateSnapshot,
  type PivotLoadOptions,
  type PivotPath,
  type PivotResult,
  type PivotSummaryDisplayMode,
  type SummaryType,
  sanitizePivotGridStateSnapshot,
} from '@oge-ui/core';
import {
  applyPivotFieldOverrides,
  buildPivotLoadOptions,
  pivotAreaFields,
  pivotCustomSummariesOf,
  pivotFieldConfigOf,
  pivotFieldFnsOf,
  pivotOverridesFromSnapshot,
  pivotPanelAreas,
  pivotStateSnapshot,
} from './pivot-fields';
import {
  OGE_EMPTY_PIVOT_RESULT,
  pivotAxisDepth,
  pivotAxisLines,
  pivotColumnHeaderCells,
  pivotColumnWindow,
  pivotExpandablePaths,
  pivotHeaderCellsInWindow,
  pivotHeaderRows,
  type OgePivotHeaderRow,
  pivotMatrixKeyTarget,
  pivotMatrixTemplate,
  pivotResultFromPayload,
  pivotRowWindow,
  pivotSlotFlags,
  pivotVirtualColumnWidth,
  pivotWindowIndexes,
} from './pivot-layout';
import type { OgePivotMessages } from './pivot-messages';
import { OgePivotStateCore } from './pivot-state-core';
import {
  OGE_PIVOT_FIELD_DRAG_TYPE,
  type OgePivotAxisLine,
  type OgePivotCellClickEvent,
  type OgePivotCellPosition,
  type OgePivotCellPrepared,
  type OgePivotDragLike,
  type OgePivotFieldChooserOptions,
  type OgePivotFieldDef,
  type OgePivotFilterPopupState,
  type OgePivotHeaderCell,
  type OgePivotMatrixTemplate,
  type OgePivotMenuItem,
  type OgePivotMenuState,
  type OgePivotPanelArea,
  type OgePivotPointer,
  type OgePivotWindow,
} from './pivot-types';

/**
 * What the grid core reads from its host, each as a getter so the host's
 * reactivity tracks it (Angular input signals, React's latest props).
 */
export interface OgePivotGridInputs<T> {
  data(): readonly T[] | OgePivotStore<T>;
  /** Declared fields, in declaration order (children first, then data). */
  fields(): readonly OgePivotFieldDef<T>[];
  virtualScrolling(): boolean;
  showRowTotals(): boolean;
  showColumnTotals(): boolean;
  showRowGrandTotals(): boolean;
  showColumnGrandTotals(): boolean;
  /** The fully merged catalog (provider defaults + per-instance overrides). */
  messages(): OgePivotMessages;
  customizeCell(): ((cell: OgePivotCellPrepared) => void) | undefined;
  fieldChooser(): OgePivotFieldChooserOptions;
}

export interface OgePivotGridCoreDeps<T> {
  readonly inputs: OgePivotGridInputs<T>;
  /** The user changed the field layout (drag, chooser, menus). */
  readonly fieldLayoutChange?: (fields: readonly PivotFieldConfig[]) => void;
  /**
   * The layout/expansion store; supplied by a host that exposes its own
   * subclass (Angular's `OgePivotStateStore`), otherwise created here.
   */
  readonly store?: OgePivotStateCore;
}

/** A remote load the host should issue: the store and its request. */
export interface OgePivotRemoteRequest<T> {
  readonly store: OgePivotStore<T>;
  readonly options: PivotLoadOptions;
}

/** Outcome of a matrix keydown: the key was handled, and where focus is now. */
export interface OgePivotMatrixKeyResult {
  /** The focused cell changed — the host moves DOM focus to it. */
  readonly moved: boolean;
  readonly cell: OgePivotCellPosition;
}

const SUMMARY_TYPES: readonly ('sum' | 'avg' | 'min' | 'max' | 'count')[] = [
  'sum',
  'avg',
  'min',
  'max',
  'count',
];

/**
 * The whole pivot grid below the template, shared by `@oge-ui/pivot` and
 * `@oge-ui/react-pivot` (ADR 0003): field layout resolution, the
 * local-engine / remote-store split, axis and header layout, two-axis
 * virtualization, cell text + the `customizeCell` hook, keyboard navigation,
 * drag & drop between areas, the header and measure menus, the value filter
 * popup, the field chooser (live or draft), persistence snapshots and export.
 *
 * Not reactive itself: state lives in cells the host supplies through
 * {@link OgeReactivityAdapter}. Scheduling stays with the host — it calls
 * {@link load} when {@link remoteRequest} changes and moves DOM focus after
 * {@link matrixKeydown}.
 */
export class OgePivotGridCore<T = unknown> {
  readonly store: OgePivotStateCore;

  // --- host-driven state ----------------------------------------------------
  /** A remote load is in flight. */
  readonly loading: OgeReactiveCell<boolean>;
  /** Viewport scroll offsets (virtual mode reads them). */
  readonly scrollPos: OgeReactiveCell<{ top: number; left: number }>;
  /** Measured viewport size (virtual mode reads it). */
  readonly viewportSize: OgeReactiveCell<{ width: number; height: number }>;
  readonly focusedCell: OgeReactiveCell<OgePivotCellPosition | null>;
  readonly menu: OgeReactiveCell<OgePivotMenuState | null>;
  readonly filterPopup: OgeReactiveCell<OgePivotFilterPopupState | null>;
  readonly filterSearch: OgeReactiveCell<string>;
  readonly chooserOpen: OgeReactiveCell<boolean>;
  readonly chooserSearch: OgeReactiveCell<string>;
  /** Draft overrides while `applyChangesMode: 'onDemand'`; null = live mode. */
  readonly chooserDraft: OgeReactiveCell<ReadonlyMap<
    string,
    Partial<PivotFieldConfig>
  > | null>;
  private readonly remoteResult: OgeReactiveCell<PivotResult | null>;

  // --- derived --------------------------------------------------------------
  /** Declared field configuration, before any user layout overrides. */
  readonly baseFields: () => readonly PivotFieldConfig[];
  /** Declared fields + user layout overrides, ready for the engine. */
  readonly resolvedFields: () => readonly PivotFieldConfig[];
  readonly fieldFns: () => Readonly<Record<string, PivotFieldFns<T>>>;
  readonly customSummaries: () => CustomSummaryMap<T> | undefined;
  readonly isRemote: () => boolean;
  readonly dataRows: () => readonly T[];
  /** Data-dependent phase: rebuilt only when rows or the field layout change. */
  readonly engine: () => PivotEngine<T>;
  /** The persistable snapshot (field layout + expansion + panel flag). */
  readonly persistedSnapshot: () => PivotGridStateSnapshot;
  /** The load the host should issue, or `null` for local data. */
  readonly remoteRequest: () => OgePivotRemoteRequest<T> | null;
  /** Expansion-dependent phase: cheap on toggle (local); remote uses the last payload. */
  readonly result: () => PivotResult;
  readonly measures: () => readonly PivotFieldConfig[];
  readonly rowLines: () => readonly OgePivotAxisLine[];
  readonly columnLines: () => readonly OgePivotAxisLine[];
  /** Depth of the visible column header block (≥ 1). */
  readonly columnDepth: () => number;
  readonly columnHeaderCells: () => readonly OgePivotHeaderCell[];
  readonly columnSlotFlags: () => { total: boolean[]; grand: boolean[] };
  /** Fixed column track in virtual mode. */
  readonly virtualColumnWidth: () => number;
  readonly rowWindow: () => OgePivotWindow;
  readonly columnWindow: () => OgePivotWindow;
  readonly visibleRowIndexes: () => readonly number[];
  readonly visibleColumnIndexes: () => readonly number[];
  readonly visibleHeaderCells: () => readonly OgePivotHeaderCell[];
  /** The visible header cells grouped into their `role="row"`s. */
  readonly visibleHeaderRows: () => readonly OgePivotHeaderRow[];
  readonly matrixTemplate: () => OgePivotMatrixTemplate;
  readonly panelAreas: () => OgePivotPanelArea<PivotFieldConfig>[];
  readonly visibleFilterValues: () => readonly unknown[];
  /** Fields as the chooser sees them: the draft replaces the store overrides. */
  readonly chooserFields: () => readonly PivotFieldConfig[];
  readonly chooserAllFields: () => readonly PivotFieldConfig[];

  private readonly inputs: OgePivotGridInputs<T>;
  private remoteAbort: AbortController | null = null;
  private draggedFieldId: string | null = null;
  private lastRemoteKey: string | null = null;
  private lastRemoteStore: OgePivotStore<T> | null = null;

  constructor(
    rx: OgeReactivityAdapter,
    private readonly deps: OgePivotGridCoreDeps<T>,
  ) {
    const inputs = deps.inputs;
    this.inputs = inputs;
    const store = deps.store ?? new OgePivotStateCore(rx);
    this.store = store;

    this.loading = rx.cell(false);
    this.remoteResult = rx.cell<PivotResult | null>(null);
    this.scrollPos = rx.cell({ top: 0, left: 0 });
    this.viewportSize = rx.cell({ width: 1200, height: 600 });
    this.focusedCell = rx.cell<OgePivotCellPosition | null>(null);
    this.menu = rx.cell<OgePivotMenuState | null>(null);
    this.filterPopup = rx.cell<OgePivotFilterPopupState | null>(null);
    this.filterSearch = rx.cell('');
    this.chooserOpen = rx.cell(false);
    this.chooserSearch = rx.cell('');
    this.chooserDraft = rx.cell<ReadonlyMap<
      string,
      Partial<PivotFieldConfig>
    > | null>(null);

    this.baseFields = rx.derived(() =>
      inputs.fields().map((def, index) => pivotFieldConfigOf(def, index)),
    );
    this.resolvedFields = rx.derived(() =>
      applyPivotFieldOverrides(this.baseFields(), store.fieldOverrides()),
    );
    this.fieldFns = rx.derived(() => pivotFieldFnsOf(inputs.fields()));
    this.customSummaries = rx.derived(() =>
      pivotCustomSummariesOf(inputs.fields()),
    );
    this.isRemote = rx.derived(() => !Array.isArray(inputs.data()));
    this.dataRows = rx.derived(() => {
      const data = inputs.data();
      return Array.isArray(data) ? (data as readonly T[]) : [];
    });
    this.engine = rx.derived(
      () =>
        new PivotEngine<T>({
          rows: this.dataRows(),
          fields: this.resolvedFields(),
          fns: this.fieldFns(),
          customSummaries: this.customSummaries(),
        }),
    );
    this.persistedSnapshot = rx.derived(() =>
      pivotStateSnapshot(
        this.resolvedFields(),
        store.rowExpandedPathList(),
        store.columnExpandedPathList(),
        store.fieldPanelCollapsed(),
      ),
    );
    this.remoteRequest = rx.derived(() => {
      const data = inputs.data();
      if (Array.isArray(data)) return null;
      return {
        store: data as OgePivotStore<T>,
        options: buildPivotLoadOptions(
          this.resolvedFields(),
          store.rowExpandedPathList(),
          store.columnExpandedPathList(),
        ),
      };
    });
    this.result = rx.derived(() => {
      if (this.isRemote()) return this.remoteResult() ?? OGE_EMPTY_PIVOT_RESULT;
      return this.engine().materialize({
        rowExpandedPaths: store.rowExpandedPaths(),
        columnExpandedPaths: store.columnExpandedPaths(),
        settings: {
          showRowTotals: inputs.showRowTotals(),
          showColumnTotals: inputs.showColumnTotals(),
          showRowGrandTotals: inputs.showRowGrandTotals(),
          showColumnGrandTotals: inputs.showColumnGrandTotals(),
        },
      });
    });
    this.measures = rx.derived(() => this.result().measures);
    this.rowLines = rx.derived(() =>
      pivotAxisLines(this.result().rowRoot, inputs.messages()),
    );
    this.columnLines = rx.derived(() =>
      pivotAxisLines(this.result().columnRoot, inputs.messages()),
    );
    this.columnDepth = rx.derived(() =>
      pivotAxisDepth(this.result().columnRoot),
    );
    this.columnHeaderCells = rx.derived(() =>
      pivotColumnHeaderCells(
        this.result().columnRoot,
        this.columnDepth(),
        inputs.messages(),
      ),
    );
    this.columnSlotFlags = rx.derived(() =>
      pivotSlotFlags(this.result().columnRoot, this.result().columnLeafCount),
    );
    this.virtualColumnWidth = rx.derived(() =>
      pivotVirtualColumnWidth(this.measures().length),
    );
    this.rowWindow = rx.derived(() => {
      const count = this.result().rowLeafCount;
      if (!inputs.virtualScrolling()) return { start: 0, end: count };
      return pivotRowWindow(
        count,
        this.scrollPos().top,
        this.viewportSize().height,
        this.columnDepth(),
      );
    });
    this.columnWindow = rx.derived(() => {
      const count = this.result().columnLeafCount;
      if (!inputs.virtualScrolling()) return { start: 0, end: count };
      return pivotColumnWindow(
        count,
        this.scrollPos().left,
        this.viewportSize().width,
        this.virtualColumnWidth(),
      );
    });
    this.visibleRowIndexes = rx.derived(() =>
      pivotWindowIndexes(this.rowWindow()),
    );
    this.visibleColumnIndexes = rx.derived(() =>
      pivotWindowIndexes(this.columnWindow()),
    );
    this.visibleHeaderCells = rx.derived(() => {
      if (!inputs.virtualScrolling()) return this.columnHeaderCells();
      return pivotHeaderCellsInWindow(
        this.columnHeaderCells(),
        this.columnWindow(),
      );
    });
    this.visibleHeaderRows = rx.derived(() =>
      pivotHeaderRows(this.visibleHeaderCells(), this.columnDepth()),
    );
    this.matrixTemplate = rx.derived(() =>
      pivotMatrixTemplate(
        this.result(),
        inputs.virtualScrolling(),
        this.columnDepth(),
        this.virtualColumnWidth(),
      ),
    );
    this.panelAreas = rx.derived(() =>
      pivotPanelAreas(this.resolvedFields(), inputs.messages()),
    );
    this.visibleFilterValues = rx.derived(() => {
      const popup = this.filterPopup();
      if (!popup) return [];
      const query = foldText(this.filterSearch().trim());
      if (!query) return popup.values;
      const blank = inputs.messages().blankValue;
      return popup.values.filter((value) =>
        foldText(String(value ?? blank)).includes(query),
      );
    });
    this.chooserFields = rx.derived(() => {
      const draft = this.chooserDraft();
      if (!draft) return this.resolvedFields();
      return applyPivotFieldOverrides(this.baseFields(), draft);
    });
    this.chooserAllFields = rx.derived(() => {
      const query = foldText(this.chooserSearch().trim());
      const fields = this.chooserFields();
      if (!query) return fields;
      return fields.filter((field) =>
        foldText(field.caption ?? field.dataField).includes(query),
      );
    });
  }

  // --- lifecycle ------------------------------------------------------------

  /** Aborts an in-flight remote load. The host calls this on teardown. */
  dispose(): void {
    this.remoteAbort?.abort();
    this.remoteAbort = null;
    // a revived instance must re-issue its load (StrictMode remount)
    this.lastRemoteKey = null;
    this.lastRemoteStore = null;
  }

  /** Brings a disposed core back (React StrictMode runs cleanup → remount). */
  revive(): void {
    this.lastRemoteKey = null;
    this.lastRemoteStore = null;
  }

  // --- remote data ------------------------------------------------------------

  /**
   * Issues one abortable load, superseding any in-flight one. Angular calls
   * it from an effect over {@link remoteRequest}; React goes through
   * {@link syncRemote}.
   */
  load(request: OgePivotRemoteRequest<T> | null): void {
    if (!request) return;
    this.remoteAbort?.abort();
    const abort = new AbortController();
    this.remoteAbort = abort;
    this.loading.set(true);
    const measures = this.resolvedFields().filter(
      (field) => field.area === 'data',
    );
    void request.store
      .load({ ...request.options, signal: abort.signal })
      .then((payload) => {
        if (abort.signal.aborted) return;
        this.remoteResult.set(
          pivotResultFromPayload(payload, measures, {
            showRowGrandTotals: this.inputs.showRowGrandTotals(),
            showColumnGrandTotals: this.inputs.showColumnGrandTotals(),
          }),
        );
      })
      .finally(() => {
        if (!abort.signal.aborted) this.loading.set(false);
      });
  }

  /**
   * Loads when the remote request actually changed since the last load
   * (same store, same serialized options → nothing to do). For hosts that
   * cannot observe {@link remoteRequest} by identity, i.e. React effects that
   * run after every render.
   */
  syncRemote(): void {
    const request = this.remoteRequest();
    if (!request) {
      this.lastRemoteKey = null;
      this.lastRemoteStore = null;
      return;
    }
    const key = JSON.stringify(request.options);
    if (request.store === this.lastRemoteStore && key === this.lastRemoteKey)
      return;
    this.lastRemoteStore = request.store;
    this.lastRemoteKey = key;
    this.load(request);
  }

  // --- public API ---------------------------------------------------------------

  /** Current persistable UI state: field layout + expansion. */
  state(): PivotGridStateSnapshot {
    return this.persistedSnapshot();
  }

  /**
   * Applies a previously captured state snapshot. The input is validated
   * first (`sanitizePivotGridStateSnapshot`): storage and hosts are
   * untrusted, so a wrong shape or a prototype key is ignored, never thrown.
   */
  applyState(input: PivotGridStateSnapshot): void {
    const snapshot = sanitizePivotGridStateSnapshot(input);
    if (snapshot === null) return;
    const overrides = pivotOverridesFromSnapshot(snapshot);
    if (overrides) this.store.applyOverrides(overrides);
    this.store.setExpansion(
      snapshot.rowExpandedPaths ?? [],
      snapshot.columnExpandedPaths ?? [],
    );
    if (
      snapshot.fieldPanelCollapsed !== undefined &&
      this.store.fieldPanelCollapsed() !== snapshot.fieldPanelCollapsed
    ) {
      this.store.toggleFieldPanel();
    }
  }

  /** The materialized pivot exactly as rendered. */
  getResult(): PivotResult {
    return this.result();
  }

  /** CSV of exactly what is on screen (multi-level headers flattened). */
  getCsv(options?: PivotCsvOptions): string {
    return buildPivotCsv(this.result(), {
      grandTotalText: this.inputs.messages().grandTotal,
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

  /** Raw rows behind a cell — drill-down (local data only). */
  drillDown(args: PivotDrillDownArgs): T[] {
    return this.engine().drillDownRows(args.rowPath, args.columnPath);
  }

  /** Axis-wide expansion; remote mode expands only what is loaded. */
  expandAll(area: 'row' | 'column'): void {
    const paths = this.isRemote()
      ? pivotExpandablePaths(
          area === 'row' ? this.result().rowRoot : this.result().columnRoot,
        )
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

  /** Declared fields merged with user overrides. */
  getFieldLayout(): readonly PivotFieldConfig[] {
    return this.resolvedFields();
  }

  // --- cells ------------------------------------------------------------------

  /** Default text + the `customizeCell` hook, per measure of a cell. */
  preparedCell(
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
      columnPath: this.columnLines()[columnIndex]?.path ?? [],
      measureId: measure.id,
      isTotal: (rowLine?.isTotal ?? false) || columnFlags.total[columnIndex],
      isGrandTotal:
        (rowLine?.isGrandTotal ?? false) || columnFlags.grand[columnIndex],
      value,
      text,
    };
    this.inputs.customizeCell()?.(prepared);
    return prepared;
  }

  /**
   * The click / double-click payload of a value cell — one event per cell;
   * `measureIndex` 0 carries the location. `null` off the matrix or when
   * there is no measure.
   */
  cellClickPayload(
    rowIndex: number,
    columnIndex: number,
    event: MouseEvent,
  ): OgePivotCellClickEvent | null {
    const rowLine = this.rowLines()[rowIndex];
    const columnLine = this.columnLines()[columnIndex];
    if (!rowLine || !columnLine || !this.measures().length) return null;
    return {
      rowPath: rowLine.path,
      columnPath: columnLine.path,
      measureIndex: 0,
      value: this.result().values[rowIndex]?.[columnIndex]?.[0],
      event,
    };
  }

  // --- expansion ----------------------------------------------------------------

  toggleRow(line: OgePivotAxisLine): void {
    if (line.hasChildren) this.store.toggleRowPath(line.path);
  }

  toggleColumn(cell: OgePivotAxisLine): void {
    if (cell.hasChildren) this.store.toggleColumnPath(cell.path);
  }

  // --- keyboard navigation over the value matrix ----------------------------

  /** Roving tabindex: the focused cell, or the first one before any focus. */
  isCellTabbable(row: number, col: number): boolean {
    const focused = this.focusedCell();
    if (focused) return focused.row === row && focused.col === col;
    return row === 0 && col === 0;
  }

  /** A value cell received DOM focus. */
  focusCell(row: number, col: number): void {
    const current = this.focusedCell();
    if (current?.row !== row || current.col !== col)
      this.focusedCell.set({ row, col });
  }

  /**
   * Arrow / Home / End over the matrix. `null` = not handled (let the key
   * through); otherwise the host prevents the default and, when `moved`,
   * focuses the `[data-cell="row-col"]` element.
   */
  matrixKeydown(key: string): OgePivotMatrixKeyResult | null {
    const cell = this.focusedCell();
    if (!cell) return null;
    const next = pivotMatrixKeyTarget(
      key,
      cell,
      this.result().rowLeafCount - 1,
      this.result().columnLeafCount - 1,
    );
    if (!next) return null;
    const moved = next.row !== cell.row || next.col !== cell.col;
    if (moved) this.focusedCell.set(next);
    return { moved, cell: next };
  }

  // --- field panel drag & drop ----------------------------------------------

  fieldDragStart(field: PivotFieldConfig, event: OgePivotDragLike): void {
    this.draggedFieldId = field.id;
    event.dataTransfer?.setData(OGE_PIVOT_FIELD_DRAG_TYPE, field.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  areaDragOver(event: OgePivotDragLike): void {
    if (this.draggedFieldId) event.preventDefault();
  }

  areaDrop(area: PivotArea | null, event: OgePivotDragLike): void {
    const id = this.draggedFieldId;
    this.draggedFieldId = null;
    if (!id) return;
    event.preventDefault();
    this.placeField(id, area);
  }

  fieldDragEnd(): void {
    this.draggedFieldId = null;
  }

  /** Moves a field to the end of an area (chooser draft aware). */
  placeField(id: string, area: PivotArea | null): void {
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
    this.deps.fieldLayoutChange?.(this.resolvedFields());
  }

  // --- menus ------------------------------------------------------------------

  closePopups(): void {
    this.menu.set(null);
    this.filterPopup.set(null);
  }

  /**
   * An outside click closes the menu / filter popup; clicks inside them (or
   * menu actions that just opened a popup) must not.
   */
  documentClick(target: EventTarget | null): void {
    const element = target as Element | null;
    const inside = element?.closest?.(
      '.oge-context-menu, .oge-pivot-filter-popup',
    );
    if (inside) return;
    this.closePopups();
  }

  runMenuItem(item: OgePivotMenuItem): void {
    if (item.disabled) return;
    this.menu.set(null);
    item.action?.();
  }

  private axisFieldAt(
    axis: 'row' | 'column',
    level: number,
  ): PivotFieldConfig | undefined {
    return pivotAreaFields(this.resolvedFields(), axis)[level];
  }

  /** Right-click on an axis header: sort / sortBySummary / filter / layout items. */
  openHeaderMenu(
    axis: 'row' | 'column',
    line: OgePivotAxisLine,
    pointer: OgePivotPointer,
  ): void {
    pointer.preventDefault();
    pointer.stopPropagation();
    const messages = this.inputs.messages();
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
      const at = { x: pointer.clientX, y: pointer.clientY };
      items.push({
        text: `${messages.filterField}…`,
        action: () => this.openFilterPopup(field, at),
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
    this.menu.set({ x: pointer.clientX, y: pointer.clientY, items });
  }

  /** Right-click on a measure chip: summary type + display mode. */
  openMeasureMenu(field: PivotFieldConfig, pointer: OgePivotPointer): void {
    pointer.preventDefault();
    pointer.stopPropagation();
    const messages = this.inputs.messages();
    const items: OgePivotMenuItem[] = [];
    for (const type of SUMMARY_TYPES) {
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
    this.menu.set({ x: pointer.clientX, y: pointer.clientY, items });
  }

  // --- field value filter popup ---------------------------------------------

  /** Opens the distinct-value filter of a field (local rows, first 1000 values). */
  openFilterPopup(
    field: PivotFieldConfig,
    at: { readonly x: number; readonly y: number },
  ): void {
    const accessor = this.fieldFns()[field.id]?.selector;
    const values = new Set<unknown>();
    for (const row of this.dataRows()) {
      values.add(accessor ? accessor(row) : valueAt(row, field.dataField));
      if (values.size >= 1000) break;
    }
    const sorted = [...values].sort((a, b) =>
      String(a ?? '').localeCompare(String(b ?? '')),
    );
    this.filterSearch.set('');
    this.filterPopup.set({
      fieldId: field.id,
      caption: field.caption ?? field.dataField,
      x: at.x,
      y: at.y,
      values: sorted,
      selected: new Set(field.filterValues ?? sorted),
      type: field.filterType ?? 'include',
    });
  }

  filterValueText(value: unknown): string {
    return value == null || value === ''
      ? this.inputs.messages().blankValue
      : String(value);
  }

  toggleFilterValue(value: unknown): void {
    const popup = this.filterPopup();
    if (!popup) return;
    const selected = new Set(popup.selected);
    if (!selected.delete(value)) selected.add(value);
    this.filterPopup.set({ ...popup, selected });
  }

  toggleAllFilterValues(): void {
    const popup = this.filterPopup();
    if (!popup) return;
    const all = popup.selected.size === popup.values.length;
    this.filterPopup.set({
      ...popup,
      selected: new Set(all ? [] : popup.values),
    });
  }

  setFilterType(type: 'include' | 'exclude'): void {
    const popup = this.filterPopup();
    if (popup) this.filterPopup.set({ ...popup, type });
  }

  applyFilterPopup(): void {
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

  clearFilterPopup(): void {
    const popup = this.filterPopup();
    if (!popup) return;
    this.store.patchField(popup.fieldId, {
      filterValues: undefined,
      filterType: undefined,
    });
    this.filterPopup.set(null);
  }

  // --- field chooser dialog -------------------------------------------------

  /** Opens the field-chooser dialog (a draft in `'onDemand'` mode). */
  showFieldChooser(): void {
    this.chooserSearch.set('');
    this.chooserDraft.set(
      this.inputs.fieldChooser().applyChangesMode === 'onDemand'
        ? new Map(this.store.fieldOverrides())
        : null,
    );
    this.chooserOpen.set(true);
  }

  closeFieldChooser(): void {
    this.chooserOpen.set(false);
    this.chooserDraft.set(null);
  }

  applyFieldChooser(): void {
    const draft = this.chooserDraft();
    if (draft) {
      this.store.applyOverrides(draft);
      this.deps.fieldLayoutChange?.(this.resolvedFields());
    }
    this.closeFieldChooser();
  }

  chooserAreaFields(area: PivotArea): readonly PivotFieldConfig[] {
    return pivotAreaFields(this.chooserFields(), area);
  }
}

function valueAt(row: unknown, path: string): unknown {
  let value: unknown = row;
  for (const part of path.split('.')) {
    if (value == null) return null;
    value = (value as Record<string, unknown>)[part];
  }
  return value ?? null;
}
