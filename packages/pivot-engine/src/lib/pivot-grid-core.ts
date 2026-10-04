import {
  beginPointerDragDrop,
  formatCellValue,
  isOgeDragExcludedTarget,
  ogeOwnedClosest,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import {
  PivotEngine,
  buildPivotCsv,
  foldText,
  ogeNumberFormat,
  type CustomSummaryMap,
  type OgePivotStore,
  type PivotArea,
  type PivotCsvOptions,
  type PivotDrillDownArgs,
  type PivotFieldConfig,
  type PivotFieldFns,
  type PivotGridStateSnapshot,
  type PivotLoadOptions,
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
import {
  OGE_PIVOT_PANEL_AREA_ORDER,
  pivotChipKeyIntent,
  pivotGridExtent,
  pivotGridKeyTarget,
  pivotHeaderCellAt,
  pivotMenuKeyTarget,
  type OgePivotGridNavContext,
  type OgePivotGridPosition,
  type OgePivotKeyLike,
} from './pivot-keyboard';
import type { OgePivotMessages } from './pivot-messages';
import { OgePivotStateCore } from './pivot-state-core';
import {
  applyPivotCalculatedFields,
  type OgePivotCalculatedField,
} from './pivot-calculated';
import {
  applyPivotMemberFilters,
  type OgePivotMemberFilters,
} from './pivot-filters';
import {
  toChartSeries,
  type OgePivotChartData,
  type OgePivotChartOptions,
} from './pivot-chart';
import {
  pivotRowHeaderSegments,
  type OgePivotRowHeaderLayout,
} from './pivot-row-header';
import {
  type OgePivotAxisLine,
  type OgePivotCellClickEvent,
  type OgePivotCellPosition,
  type OgePivotCellPrepared,
  type OgePivotCellTemplateContext,
  type OgePivotFieldChooserOptions,
  type OgePivotFieldDef,
  type OgePivotFieldDropTarget,
  type OgePivotFieldPointerInput,
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
  /** Measures computed from the other measures of a cell. Default none. */
  calculatedFields?(): readonly OgePivotCalculatedField[];
  /** Row-header layout of the row fields. Default `'compact'`. */
  rowHeaderLayout?(): OgePivotRowHeaderLayout;
  /**
   * BCP 47 locale of the cell text (percentages, dates, declarative field
   * formats); `undefined` = the runtime default.
   */
  locale?(): string | undefined;
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

/** Outcome of a keydown on the unified header + value grid. */
export interface OgePivotGridKeyResult {
  /** Focus changed — the host focuses {@link selector} once it rendered. */
  readonly moved: boolean;
  /** Selector of the element that now holds the tab stop. */
  readonly selector: string;
}

/** Outcome of a handled key on a field chip. */
export type OgePivotChipKeyResult =
  /** The field menu opened — the host focuses its first item. */
  | { readonly kind: 'menu' }
  /**
   * The field moved (or the move was a no-op at an edge) — the host
   * re-focuses the chip of `fieldId` in `area`, or the panel when it left
   * the layout (`area: null`).
   */
  | {
      readonly kind: 'moved';
      readonly fieldId: string;
      readonly area: PivotArea | null;
    };

/** Outcome of a key on an open menu. */
export type OgePivotMenuKeyResult =
  | { readonly kind: 'focus'; readonly index: number }
  /** The menu closed — the host returns focus to the element that opened it. */
  | { readonly kind: 'close' };

/** Percent display modes: one decimal, the locale's percent layout. */
const PERCENT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

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
  /**
   * The focused header (grid coordinates, see {@link OgePivotGridPosition});
   * while set, it — not a value cell — owns the grid's single tab stop.
   */
  readonly focusedHeader: OgeReactiveCell<OgePivotGridPosition | null>;
  /** Text of the polite live region (field moves). */
  readonly announcement: OgeReactiveCell<string>;
  readonly menu: OgeReactiveCell<OgePivotMenuState | null>;
  /** Where the field chip being dragged would land (drop indicator). */
  readonly fieldDropTarget: OgeReactiveCell<OgePivotFieldDropTarget | null>;
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
  /** Label / value / Top-N filters per row or column field id. */
  readonly memberFilters: () => ReadonlyMap<string, OgePivotMemberFilters>;
  /** The local rows after the member filters — what the engine aggregates. */
  readonly filteredRows: () => readonly T[];
  /** The declared calculated measures. */
  readonly calculatedFields: () => readonly OgePivotCalculatedField[];
  /** Effective row-header layout. */
  readonly rowHeaderLayout: () => OgePivotRowHeaderLayout;
  /** Number of row fields in the layout (label columns of outline / tabular). */
  readonly rowFieldCount: () => number;
  /** Captions of the row fields (corner header of outline / tabular). */
  readonly rowFieldCaptions: () => readonly string[];
  /** Per-field label columns of each row line; `null` in the compact layout. */
  readonly rowHeaderSegments: () => (readonly string[])[] | null;
  /** Data-dependent phase: rebuilt only when rows or the field layout change. */
  readonly engine: () => PivotEngine<T>;
  /** The persistable snapshot (field layout + expansion + panel flag). */
  readonly persistedSnapshot: () => PivotGridStateSnapshot;
  /** The load the host should issue, or `null` for local data. */
  readonly remoteRequest: () => OgePivotRemoteRequest<T> | null;
  /**
   * Expansion-dependent phase: cheap on toggle (local); remote uses the last
   * payload. Calculated measures follow the regular ones.
   */
  readonly result: () => PivotResult;
  /** The materialized pivot before the calculated measures. */
  private readonly baseResult: () => PivotResult;
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
    this.focusedHeader = rx.cell<OgePivotGridPosition | null>(null);
    this.announcement = rx.cell('');
    this.menu = rx.cell<OgePivotMenuState | null>(null);
    this.fieldDropTarget = rx.cell<OgePivotFieldDropTarget | null>(null);
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
    this.fieldFns = rx.derived(() =>
      pivotFieldFnsOf(inputs.fields(), inputs.locale?.()),
    );
    this.customSummaries = rx.derived(() =>
      pivotCustomSummariesOf(inputs.fields()),
    );
    this.isRemote = rx.derived(() => !Array.isArray(inputs.data()));
    this.dataRows = rx.derived(() => {
      const data = inputs.data();
      return Array.isArray(data) ? (data as readonly T[]) : [];
    });
    this.memberFilters = rx.derived(() => {
      const map = new Map<string, OgePivotMemberFilters>();
      for (const def of inputs.fields()) {
        if (def.labelFilter || def.valueFilter || def.topN) {
          map.set(def.id ?? def.dataField, {
            labelFilter: def.labelFilter,
            valueFilter: def.valueFilter,
            topN: def.topN,
          });
        }
      }
      return map;
    });
    this.filteredRows = rx.derived(() =>
      applyPivotMemberFilters(
        this.dataRows(),
        this.resolvedFields(),
        this.memberFilters(),
        this.fieldFns(),
        this.customSummaries(),
      ),
    );
    this.calculatedFields = rx.derived(() => inputs.calculatedFields?.() ?? []);
    this.rowHeaderLayout = rx.derived(
      () => inputs.rowHeaderLayout?.() ?? 'compact',
    );
    this.rowFieldCount = rx.derived(
      () => pivotAreaFields(this.resolvedFields(), 'row').length,
    );
    this.rowFieldCaptions = rx.derived(() =>
      pivotAreaFields(this.resolvedFields(), 'row').map(
        (field) => field.caption ?? field.dataField,
      ),
    );
    this.engine = rx.derived(
      () =>
        new PivotEngine<T>({
          rows: this.filteredRows(),
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
    this.baseResult = rx.derived(() => {
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
    this.result = rx.derived(() =>
      applyPivotCalculatedFields(this.baseResult(), this.calculatedFields()),
    );
    this.measures = rx.derived(() => this.result().measures);
    this.rowLines = rx.derived(() =>
      pivotAxisLines(this.result().rowRoot, inputs.messages()),
    );
    this.columnLines = rx.derived(() =>
      pivotAxisLines(this.result().columnRoot, inputs.messages()),
    );
    this.rowHeaderSegments = rx.derived(() =>
      pivotRowHeaderSegments(
        this.rowLines(),
        this.rowHeaderLayout(),
        this.rowFieldCount(),
      ),
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
        this.rowHeaderLayout() === 'compact'
          ? 1
          : Math.max(1, this.rowFieldCount()),
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
    const format =
      this.fieldFns()[measure.id]?.format ??
      this.calculatedFields().find((field) => field.name === measure.id)
        ?.format;
    let text = '';
    if (value != null) {
      const locale = this.inputs.locale?.();
      if (format) text = format(value);
      else if (measure.summaryDisplayMode?.startsWith('percent')) {
        // the locale's percent layout: `12.5%`, `%12,5` (tr), `12,5 %` (de)
        text = ogeNumberFormat(locale, PERCENT_OPTIONS).format(Number(value));
      } else {
        text = formatCellValue(
          value,
          measure.dataType ?? 'number',
          undefined,
          locale,
        );
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

  /** What a value-cell template / `renderCell` receives. */
  cellTemplateContext(
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ): OgePivotCellTemplateContext {
    return {
      ...this.preparedCell(rowIndex, columnIndex, measureIndex),
      rowIndex,
      columnIndex,
      measureIndex,
    };
  }

  /**
   * The current view as chart data (see `toChartSeries`): rows × measures,
   * following the expand state; pass `argumentIndexes` for a selection.
   */
  getChartData<TType extends string = 'bar'>(
    options: OgePivotChartOptions<TType> = {},
  ): OgePivotChartData<TType> {
    return toChartSeries<TType>(this.result(), {
      grandTotalText: this.inputs.messages().grandTotal,
      ...options,
    });
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

  /**
   * Roving tabindex over the whole grid (headers + values, one tab stop):
   * the focused value cell, or the first one before any focus — unless a
   * header holds the stop.
   */
  isCellTabbable(row: number, col: number): boolean {
    if (this.headerHoldsTabStop()) return false;
    const focused = this.focusedCell();
    if (focused) return focused.row === row && focused.col === col;
    return row === 0 && col === 0;
  }

  /** A value cell received DOM focus. */
  focusCell(row: number, col: number): void {
    if (this.focusedHeader()) this.focusedHeader.set(null);
    const current = this.focusedCell();
    if (current?.row !== row || current.col !== col)
      this.focusedCell.set({ row, col });
  }

  /** Whether a column-header cell holds the grid's tab stop. */
  isColumnHeaderTabbable(cell: OgePivotHeaderCell): boolean {
    const pos = this.focusedHeader();
    if (!pos || !pivotGridExtent(pos, this.navContext())) {
      // no value cells to carry the stop: the first header takes it
      return (
        !this.hasValueCells() && cell.rowStart === 1 && cell.columnStart === 1
      );
    }
    return (
      pos.row < this.columnDepth() &&
      pivotHeaderCellAt([cell], pos.row, pos.col) === cell
    );
  }

  /** Whether the row header of value row `rowIndex` holds the tab stop. */
  isRowHeaderTabbable(rowIndex: number): boolean {
    const pos = this.focusedHeader();
    return !!pos && pos.col === 0 && pos.row === this.columnDepth() + rowIndex;
  }

  /** A column-header cell received DOM focus. */
  focusColumnHeader(cell: OgePivotHeaderCell): void {
    const pos = this.focusedHeader();
    // keep the origin column inside a spanning header (Down lands under it)
    if (
      pos &&
      pos.row < this.columnDepth() &&
      pivotHeaderCellAt([cell], pos.row, pos.col) === cell
    )
      return;
    this.focusedHeader.set({ row: cell.rowStart - 1, col: cell.columnStart });
  }

  /** The row header of value row `rowIndex` received DOM focus. */
  focusRowHeader(rowIndex: number): void {
    const row = this.columnDepth() + rowIndex;
    const pos = this.focusedHeader();
    if (pos?.row !== row || pos.col !== 0)
      this.focusedHeader.set({ row, col: 0 });
  }

  /** `data-hpos` value of a column-header cell (its top-left grid position). */
  columnHeaderPos(cell: OgePivotHeaderCell): string {
    return `${String(cell.rowStart - 1)}-${String(cell.columnStart)}`;
  }

  /** `data-hpos` value of the row header of value row `rowIndex`. */
  rowHeaderPos(rowIndex: number): string {
    return `${String(this.columnDepth() + rowIndex)}-0`;
  }

  /**
   * The APG grid keyboard over column headers, row headers and value cells
   * as one composite (see `pivotGridKeyTarget`). `null` = not handled;
   * otherwise the host prevents the default and, when `moved`, focuses
   * `selector` inside the matrix.
   */
  gridKeydown(
    event: OgePivotKeyLike,
    rtl = false,
  ): OgePivotGridKeyResult | null {
    const ctx = this.navContext();
    const pos = this.currentGridPosition(ctx);
    if (!pos) return null;
    const next = pivotGridKeyTarget(event, pos, ctx, rtl);
    if (!next) return null;
    const moved = next.row !== pos.row || next.col !== pos.col;
    if (moved) {
      if (next.row >= ctx.headerDepth && next.col >= 1) {
        this.focusedHeader.set(null);
        this.focusedCell.set({
          row: next.row - ctx.headerDepth,
          col: next.col - 1,
        });
      } else {
        this.focusedHeader.set(next);
      }
    }
    return { moved, selector: this.selectorOf(next, ctx) };
  }

  private hasValueCells(): boolean {
    const result = this.result();
    return result.rowLeafCount > 0 && result.columnLeafCount > 0;
  }

  /** A header holds the stop when one is focused and still exists. */
  private headerHoldsTabStop(): boolean {
    const pos = this.focusedHeader();
    if (!pos) return !this.hasValueCells();
    return pivotGridExtent(pos, this.navContext()) !== null;
  }

  private navContext(): OgePivotGridNavContext {
    const result = this.result();
    return {
      headerDepth: this.columnDepth(),
      rowCount: result.rowLeafCount,
      columnCount: result.columnLeafCount,
      headerCells: this.columnHeaderCells(),
    };
  }

  private currentGridPosition(
    ctx: OgePivotGridNavContext,
  ): OgePivotGridPosition | null {
    const header = this.focusedHeader();
    if (header && pivotGridExtent(header, ctx)) return header;
    const cell = this.focusedCell();
    if (cell) return { row: ctx.headerDepth + cell.row, col: cell.col + 1 };
    return null;
  }

  private selectorOf(
    pos: OgePivotGridPosition,
    ctx: OgePivotGridNavContext,
  ): string {
    if (pos.row >= ctx.headerDepth && pos.col >= 1)
      return `[data-cell="${String(pos.row - ctx.headerDepth)}-${String(pos.col - 1)}"]`;
    const extent = pivotGridExtent(pos, ctx);
    const row = extent?.rowStart ?? pos.row;
    const col = extent?.colStart ?? pos.col;
    return `[data-hpos="${String(row)}-${String(col)}"]`;
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

  /**
   * Starts a pointer drag of a field chip (`pointerdown` on `chip`; touch
   * needs a long press, so swiping the panel still scrolls it). The drop
   * target is the area zone under the pointer — and the chip there, which
   * the field is inserted in front of — inside the chip's own panel or
   * chooser; a drop calls {@link moveFieldTo}, the path the chip keyboard and
   * the field menu use. Escape, blur and `pointercancel` cancel.
   */
  fieldPointerDown(
    field: PivotFieldConfig,
    event: OgePivotFieldPointerInput,
    chip: Element,
  ): void {
    if (event.button !== 0 || isOgeDragExcludedTarget(event.target, chip))
      return;
    const container =
      chip.closest('.oge-pivot-chooser-grid') ??
      chip.closest('.oge-pivot-field-panel');
    beginPointerDragDrop<OgePivotFieldDropTarget>(event, {
      source: chip,
      resolve: (hit) => this.fieldDropTargetAt(hit, container),
      onOver: (target) => {
        const current = this.fieldDropTarget();
        if (
          current?.area !== target?.area ||
          current?.beforeId !== target?.beforeId
        )
          this.fieldDropTarget.set(target);
      },
      onDrop: (target) => {
        const order = pivotAreaFields(this.chooserFields(), target.area)
          .filter((entry) => entry.id !== field.id)
          .map((entry) => entry.id);
        const at =
          target.beforeId === null ? -1 : order.indexOf(target.beforeId);
        this.moveFieldTo(field.id, target.area, at < 0 ? Infinity : at);
      },
      onEnd: () => this.fieldDropTarget.set(null),
    });
  }

  /** The area zone (and the chip in it) under `hit`, inside `container`. */
  private fieldDropTargetAt(
    hit: Element | null,
    container: Element | null,
  ): OgePivotFieldDropTarget | null {
    const zone = ogeOwnedClosest(
      hit,
      '.oge-pivot-area[data-area], .oge-pivot-chooser-zone',
      container,
    );
    if (!zone) return null;
    const area = (zone.dataset['area'] as PivotArea | undefined) ?? null;
    const chip = ogeOwnedClosest(
      hit,
      '.oge-pivot-field-chip[data-field-id]',
      zone,
    );
    return { area, beforeId: chip?.dataset['fieldId'] ?? null };
  }

  /** Moves a field to the end of an area (chooser draft aware). */
  placeField(id: string, area: PivotArea | null): void {
    this.moveFieldTo(id, area);
  }

  /**
   * Moves a field to `index` within `area` (default: the end) — the one path
   * drag & drop, the field menu and the chip keyboard share. Both affected
   * areas are renumbered `0…n-1`, so the order is exactly what was asked for
   * whatever `areaIndex` values the declaration carried. Chooser-draft
   * aware; a live move emits `fieldLayoutChange`; every move announces the
   * field's new position through {@link announcement}.
   */
  moveFieldTo(id: string, area: PivotArea | null, index = Infinity): void {
    const fields = this.chooserFields();
    const moving = fields.find((field) => field.id === id);
    if (!moving) return;
    const from = moving.area ?? null;
    const order = pivotAreaFields(fields, area)
      .filter((field) => field.id !== id)
      .map((field) => field.id);
    const at = Math.max(0, Math.min(order.length, index));
    order.splice(at, 0, id);
    const patches = new Map<string, Partial<PivotFieldConfig>>();
    if (from !== area) {
      pivotAreaFields(fields, from)
        .filter((field) => field.id !== id)
        .forEach((field, i) => patches.set(field.id, { areaIndex: i }));
    }
    order.forEach((fieldId, i) => patches.set(fieldId, { areaIndex: i }));
    patches.set(id, { area, areaIndex: at });

    const draft = this.chooserDraft();
    if (draft) {
      const next = new Map(draft);
      for (const [fieldId, patch] of patches)
        next.set(fieldId, { ...next.get(fieldId), ...patch });
      this.chooserDraft.set(next);
    } else {
      this.store.patchFields(patches);
      this.deps.fieldLayoutChange?.(this.resolvedFields());
    }
    this.announceMove(
      moving.caption ?? moving.dataField,
      area,
      at,
      order.length,
    );
  }

  /** Moves a field one place earlier (`-1`) or later (`1`) in its area. */
  moveFieldBy(id: string, delta: -1 | 1): boolean {
    const fields = this.chooserFields();
    const area = fields.find((f) => f.id === id)?.area ?? null;
    if (area === null) return false;
    const order = pivotAreaFields(fields, area);
    const target = order.findIndex((f) => f.id === id) + delta;
    if (target < 0 || target >= order.length) return false;
    this.moveFieldTo(id, area, target);
    return true;
  }

  /**
   * Moves a field to the end of the previous (`-1`) or next (`1`) area in
   * the panel's visual order: filters, rows, columns, values.
   */
  moveFieldToAdjacentArea(id: string, delta: -1 | 1): boolean {
    const area = this.chooserFields().find((f) => f.id === id)?.area ?? null;
    if (area === null) return false;
    const order = OGE_PIVOT_PANEL_AREA_ORDER;
    const target = order[order.indexOf(area) + delta];
    if (!target) return false;
    this.moveFieldTo(id, target);
    return true;
  }

  /**
   * A key on a field chip (`zone` = the area it is shown in, `null` for the
   * chooser's "All fields" list): opens the field menu at `at`, reorders,
   * changes area or removes — see `pivotChipKeyIntent`. `null` = not
   * handled (the key goes on).
   */
  fieldChipKeydown(
    field: PivotFieldConfig,
    zone: PivotArea | null,
    event: OgePivotKeyLike & {
      preventDefault(): void;
      stopPropagation(): void;
    },
    at: { readonly x: number; readonly y: number },
    rtl = false,
  ): OgePivotChipKeyResult | null {
    const intent = pivotChipKeyIntent(event, zone !== null, rtl);
    if (!intent) return null;
    event.preventDefault();
    event.stopPropagation();
    switch (intent.kind) {
      case 'menu':
        this.openFieldMenu(field, zone, at);
        return { kind: 'menu' };
      case 'reorder':
        this.moveFieldBy(field.id, intent.delta);
        break;
      case 'area':
        this.moveFieldToAdjacentArea(field.id, intent.delta);
        break;
      case 'remove':
        this.moveFieldTo(field.id, null);
        break;
    }
    const now = this.chooserFields().find((f) => f.id === field.id);
    return { kind: 'moved', fieldId: field.id, area: now?.area ?? null };
  }

  private areaLabel(area: PivotArea): string {
    const messages = this.inputs.messages();
    switch (area) {
      case 'row':
        return messages.rowArea;
      case 'column':
        return messages.columnArea;
      case 'filter':
        return messages.filterArea;
      default:
        return messages.dataArea;
    }
  }

  private announceMove(
    caption: string,
    area: PivotArea | null,
    index: number,
    count: number,
  ): void {
    const messages = this.inputs.messages();
    this.announcement.set(
      area === null
        ? messages.fieldRemovedPattern.replace('{0}', caption)
        : fillPattern(messages.fieldMovedPattern, [
            caption,
            this.areaLabel(area),
            String(index + 1),
            String(count),
          ]),
    );
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

  /**
   * Runs a menu item. Returns whether keyboard focus should go back to the
   * element that opened the menu — `false` when the item opened the value
   * filter or changed whether the chooser is open (`openerInChooser`: the
   * menu was opened from inside it), which then owns the focus.
   */
  runMenuItem(item: OgePivotMenuItem, openerInChooser = false): boolean {
    if (item.disabled) return false;
    this.menu.set(null);
    item.action?.();
    return !this.filterPopup() && this.chooserOpen() === openerInChooser;
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
    this.menu.set({
      x: pointer.clientX,
      y: pointer.clientY,
      items: this.measureMenuItems(field),
    });
  }

  /**
   * The field menu of a chip — the keyboard and single-pointer alternative
   * to dragging it: move left/right within the area, move to each other
   * area, remove; a measure chip appends its summary-type and display-mode
   * items. `zone` is the area the chip is shown in (`null` = the chooser's
   * "All fields" list). Opened by right-click or the chip keyboard.
   */
  openFieldMenu(
    field: PivotFieldConfig,
    zone: PivotArea | null,
    at: { readonly x: number; readonly y: number },
  ): void {
    const messages = this.inputs.messages();
    const fields = this.chooserFields();
    const current = fields.find((f) => f.id === field.id) ?? field;
    const area = current.area ?? null;
    const items: OgePivotMenuItem[] = [];
    if (area !== null && zone !== null) {
      const order = pivotAreaFields(fields, area);
      const index = order.findIndex((f) => f.id === field.id);
      items.push(
        {
          text: messages.moveFieldLeft,
          disabled: index <= 0,
          action: () => this.moveFieldBy(field.id, -1),
        },
        {
          text: messages.moveFieldRight,
          disabled: index < 0 || index >= order.length - 1,
          action: () => this.moveFieldBy(field.id, 1),
        },
      );
    }
    for (const target of OGE_PIVOT_PANEL_AREA_ORDER) {
      if (target === area) continue;
      items.push({
        text: messages.moveToAreaPattern.replace('{0}', this.areaLabel(target)),
        action: () => this.moveFieldTo(field.id, target),
      });
    }
    if (area !== null)
      items.push({
        text: messages.removeField,
        action: () => this.moveFieldTo(field.id, null),
      });
    // summary settings apply live — not in the chooser's draft
    if (area === 'data' && zone !== null && !this.chooserOpen())
      items.push(...this.measureMenuItems(current));
    this.menu.set({
      x: at.x,
      y: at.y,
      items,
      label: messages.fieldMenuLabelPattern.replace(
        '{0}',
        current.caption ?? current.dataField,
      ),
    });
  }

  /** Right-click on a field chip: the field menu at the pointer. */
  openFieldContextMenu(
    field: PivotFieldConfig,
    zone: PivotArea | null,
    pointer: OgePivotPointer,
  ): void {
    pointer.preventDefault();
    pointer.stopPropagation();
    this.openFieldMenu(field, zone, { x: pointer.clientX, y: pointer.clientY });
  }

  /**
   * A key on the open menu's item `index` (APG menu: Down/Up wrap over the
   * enabled items, Home/End, Escape/Tab close). `null` = not handled.
   */
  menuKeydown(key: string, index: number): OgePivotMenuKeyResult | null {
    const menu = this.menu();
    if (!menu) return null;
    const target = pivotMenuKeyTarget(key, index, menu.items);
    if (target === null) return null;
    if (target === 'close') {
      this.menu.set(null);
      return { kind: 'close' };
    }
    return { kind: 'focus', index: target };
  }

  private measureMenuItems(field: PivotFieldConfig): OgePivotMenuItem[] {
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
    return items;
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

function fillPattern(pattern: string, values: readonly string[]): string {
  return pattern.replace(/\{(\d)\}/g, (match, index: string) =>
    Number(index) < values.length ? values[Number(index)] : match,
  );
}

function valueAt(row: unknown, path: string): unknown {
  let value: unknown = row;
  for (const part of path.split('.')) {
    if (value == null) return null;
    value = (value as Record<string, unknown>)[part];
  }
  return value ?? null;
}
