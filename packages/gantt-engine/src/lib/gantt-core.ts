/**
 * `OgeGanttCore` — the whole Gantt controller, framework-free.
 *
 * Everything the Angular `<oge-gantt>` and the React `<OgeGantt>` share lives
 * here: the working-set stores and the snapshot undo/redo history, the
 * derived tree/bars/arrows/scale view models, row virtualization, the
 * cancelable editing pipelines (task and dependency CRUD, indent/outdent,
 * auto-scheduling), the keyboard map, the pointer gestures (move, resize,
 * progress, link drawing, draw-to-create, splitter), the context-menu model
 * and every label and announcement. A render layer only binds its inputs,
 * forwards DOM events and renders what the core derives.
 *
 * State lives in cells from an `OgeReactivityAdapter` (signals in Angular, a
 * versioned store in React); inputs are read through getters so each layer
 * passes its own reactive source. Scheduling stays with the host: it calls
 * `resetTasks()` / `resetDependencies()` / `resetListWidth()` when those
 * inputs change and `syncRenderedRange()` after each change of the data.
 */
import type { OgeReactivityAdapter } from '@oge-ui/behavior';
import { observeDirection, ogeIsRtl } from '@oge-ui/behavior';
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import {
  ogeDateTimeFormat,
  ogeFormatMessage,
  ogeNumberFormat,
  contrastForeground,
  parseColor,
  resolveFirstDayOfWeek,
  resolveWeekendDays,
  sameDay,
  startOfDay,
  type RowKey,
} from '@oge-ui/core';
import {
  dependencyAnchors,
  dependencyPath,
  routeDependency,
} from './engine/dependency-routing';
import {
  chartPxToDate,
  proposeTaskMove,
  proposeTaskProgress,
  proposeTaskResize,
  type GanttTaskProposal,
} from './engine/gantt-gesture-math';
import {
  buildGanttDependencies,
  buildGanttTasks,
  ganttTaskPatch,
  isDatedConstraint,
  resolveGanttFields,
  wouldCreateCycle,
  type GanttDependency,
  type GanttFieldExpr,
  type GanttLagUnit,
  type GanttSegment,
  type GanttTask,
  type GanttTaskChange,
  type ResolvedGanttFields,
} from './engine/gantt-model';
import {
  buildResourceHistogram,
  buildResourceViewRows,
  effortDrivenEnd,
  GANTT_RESOURCE_ROW_PREFIX,
} from './engine/resources';
import {
  computeGanttSlack,
  detectGanttConflicts,
  scheduleGanttProject,
  type GanttSchedulingConflict,
  type GanttSlack,
} from './engine/schedule';
import {
  clampGanttColumnWidth,
  formatGanttLag,
  formatGanttPredecessors,
  ganttDateInputValue,
  ganttFilterKeys,
  moveGanttColumn,
  nextGanttSelection,
  parseGanttDateInput,
  parseGanttPredecessors,
  sortGanttItems,
  type GanttCellEditorType,
  type GanttSort,
} from './engine/task-list';
import {
  buildGanttScale,
  dateToPx,
  GANTT_SCALE_ORDER,
  GANTT_TICK_WIDTH,
  type GanttScale,
} from './engine/time-scale';
import {
  addWorkingDays,
  isWorkingDay,
  type GanttWorkCalendar,
} from './engine/work-calendar';
import { buildResourceWorkload } from './engine/workload';
import {
  fillGanttMessages,
  type OgeGanttConfig,
  type OgeGanttMessages,
  type OgeGanttResolvedMessages,
} from './gantt-config';
import {
  beginGanttGesture,
  type GanttGestureHandle,
  type GanttPointerLike,
} from './gantt-gesture';
import type {
  OgeGanttColumn,
  OgeGanttColumnReorderedEvent,
  OgeGanttColumnResizedEvent,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDependencyUpdatedEvent,
  OgeGanttDependencyUpdatingEvent,
  OgeGanttDialogShowingEvent,
  OgeGanttExportData,
  OgeGanttResource,
  OgeGanttScaleType,
  OgeGanttSchedulingConflict,
  OgeGanttSchedulingConflictEvent,
  OgeGanttSelectionChangedEvent,
  OgeGanttSelectionMode,
  OgeGanttSortChangedEvent,
  OgeGanttStripLine,
  OgeGanttTask,
  OgeGanttTaskClickEvent,
  OgeGanttTaskDeletedEvent,
  OgeGanttTaskDeletingEvent,
  OgeGanttTaskInsertedEvent,
  OgeGanttTaskInsertingEvent,
  OgeGanttTaskTitlePosition,
  OgeGanttTaskUpdatedEvent,
  OgeGanttTaskUpdatingEvent,
  OgeGanttViewMode,
  OgeGanttZoomPreset,
} from './gantt-types';
import {
  buildGanttDialogItems,
  fitGanttScaleType,
  formatGanttMessage,
  ganttDataRange,
  ganttWindowRange,
  GANTT_LIST_WIDTH_MAX,
  GANTT_LIST_WIDTH_MIN,
  GANTT_OVERSCAN_ROWS,
  GANTT_SCALE_HEAD_PX,
  sameGanttRange,
  stepGanttScale,
  widenGanttRange,
  type GanttEditorModel,
  type GanttEditorResult,
  type GanttRange,
} from './gantt-view';

/** One piece of a split bar, relative to the bar's start edge. */
export interface GanttBarSegment {
  readonly offsetPx: number;
  readonly widthPx: number;
  /** Progress fill inside this piece, px. */
  readonly fillPx: number;
}

/** A child milestone rolled up onto a summary bar. */
export interface GanttRollup {
  readonly key: RowKey;
  readonly title: string;
  /** Chart px (logical). */
  readonly px: number;
}

/** One rendered chart bar with its pixel geometry. */
export interface GanttBar<T> {
  readonly task: GanttTask<T>;
  readonly index: number;
  readonly leftPx: number;
  readonly widthPx: number;
  /** The baseline chosen by `baselineIndex`, or `null`. */
  readonly baselineLeftPx: number | null;
  readonly baselineWidthPx: number | null;
  readonly critical: boolean;
  /** Pieces of a split task (two or more), else `[]`. */
  readonly segments: readonly GanttBarSegment[];
  /** Deadline marker x, or `null`. */
  readonly deadlinePx: number | null;
  /** Finishes after its deadline. */
  readonly overdue: boolean;
  /** Has at least one scheduling conflict. */
  readonly conflict: boolean;
  /** Constraint-date marker x (dated constraints), or `null`. */
  readonly constraintPx: number | null;
  /** Child milestones on a summary bar (`showRollups`). */
  readonly rollups: readonly GanttRollup[];
  /** Manually scheduled (drawn with a hatched edge). */
  readonly manual: boolean;
}

/** One routed dependency arrow. */
export interface GanttArrow<D> {
  readonly dependency: GanttDependency<D>;
  readonly path: string;
  readonly critical: boolean;
  /** Lag/lead label (`+2d`), or `null` without one. */
  readonly label: string | null;
  /** Label position (logical px, near the successor's anchor). */
  readonly labelX: number;
  readonly labelY: number;
}

/** One resolved task-list column. */
export interface GanttResolvedColumn {
  readonly field: string;
  readonly header: string;
  readonly widthPx: number;
  readonly format?: (task: GanttTask) => string;
  /** The inline editor, or `null` for a read-only column. */
  readonly editor: GanttCellEditorType | null;
  readonly sortable: boolean;
  /** `'ascending' | 'descending'` while sorted (the `aria-sort` value). */
  readonly sortDirection: 'ascending' | 'descending' | null;
  readonly frozen: boolean;
  /** Sticky `inset-inline-start` of a frozen column, px. */
  readonly frozenOffsetPx: number;
}

/** The open inline cell editor. */
export interface GanttCellEditState {
  readonly key: RowKey;
  readonly field: string;
  readonly editor: GanttCellEditorType;
  readonly value: string;
}

/** The open dependency editor (type + lag/lead). */
export interface GanttDependencyEditorState<D> {
  readonly dependency: GanttDependency<D>;
  readonly type: OgeGanttDependencyType;
  readonly lag: number;
  readonly lagUnit: GanttLagUnit;
  /** Host-relative position of the editor panel. */
  readonly x: number;
  readonly y: number;
}

/** The progress line: one zig-zag path through the visible rows. */
export interface GanttProgressLine {
  /** The status date's x (logical px). */
  readonly statusPx: number;
  readonly path: string;
}

/** One option of the zoom-preset chooser. */
export interface GanttZoomPresetOption {
  readonly index: number;
  readonly label: string;
  readonly preset: OgeGanttZoomPreset;
}

/** One rendered row of the utilization histogram. */
export interface GanttHistogramRowVm {
  readonly id: unknown;
  readonly text: string;
  /** Accessible summary (peak load, periods over capacity). */
  readonly label: string;
  /** Capacity line height in % of the row. */
  readonly capacityPct: number;
  readonly cells: readonly {
    readonly px: number;
    readonly widthPx: number;
    /** Bar height in % of the row. */
    readonly heightPct: number;
    readonly load: number;
    readonly over: boolean;
  }[];
}

/** The fields the inline cell editor's keydown handler reads. */
export interface GanttEditorKeyLike {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

/** One row of the resource workload band. */
export interface GanttWorkloadRow {
  readonly id: unknown;
  readonly text: string;
  readonly color: string | undefined;
  readonly segments: readonly {
    readonly px: number;
    readonly widthPx: number;
    readonly over: boolean;
  }[];
}

/** A strip line in chart px (`widthPx === 0` is a line). */
export interface GanttStripRect {
  readonly px: number;
  readonly widthPx: number;
  readonly label: string | undefined;
  readonly color: string | undefined;
}

/** The open built-in context menu. */
export interface GanttContextMenuState<T> {
  readonly x: number;
  readonly y: number;
  readonly task: GanttTask<T> | null;
}

/** Which built-in context-menu items are enabled. */
export interface GanttMenuItemState {
  readonly edit: boolean;
  readonly newSubtask: boolean;
  readonly newTask: boolean;
  readonly indent: boolean;
  readonly outdent: boolean;
  readonly delete: boolean;
}

/** The kind of bar gesture a pointerdown starts. */
export type GanttBarGestureKind =
  'move' | 'resize-start' | 'resize-end' | 'progress';

/** The keyboard fields the row handler reads. */
export interface GanttKeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  preventDefault(): void;
}

/** The mouse fields the double-click / context-menu handlers read. */
export interface GanttMouseLike {
  readonly clientX: number;
  readonly clientY: number;
  readonly target: EventTarget | null;
  preventDefault(): void;
}

interface UndoSnapshot<T, D> {
  readonly tasks: readonly T[];
  readonly dependencies: readonly D[];
}

/** Every input of the Gantt, read through getters (signals / latest props). */
export interface OgeGanttCoreInputs<T, D> {
  tasks(): readonly T[];
  dependencies(): readonly D[];
  keyExpr(): GanttFieldExpr<T>;
  parentKeyExpr(): GanttFieldExpr<T>;
  titleExpr(): GanttFieldExpr<T>;
  startExpr(): GanttFieldExpr<T>;
  endExpr(): GanttFieldExpr<T>;
  progressExpr(): GanttFieldExpr<T>;
  colorExpr(): GanttFieldExpr<T>;
  baselineStartExpr(): GanttFieldExpr<T>;
  baselineEndExpr(): GanttFieldExpr<T>;
  dependencyKeyExpr(): GanttFieldExpr<D>;
  predecessorKeyExpr(): GanttFieldExpr<D>;
  successorKeyExpr(): GanttFieldExpr<D>;
  dependencyTypeExpr(): GanttFieldExpr<D>;
  resources(): readonly OgeGanttResource[];
  resourceIdExpr(): GanttFieldExpr<T>;
  scaleType(): OgeGanttScaleType;
  firstDayOfWeek(): number | undefined;
  taskListWidth(): number;
  columns(): readonly OgeGanttColumn[];
  taskTitlePosition(): OgeGanttTaskTitlePosition;
  showDependencies(): boolean;
  showCriticalPath(): boolean;
  weekendsHighlighted(): boolean;
  /** Weekend days (0 = Sunday) to shade; `undefined` resolves from the locale. */
  weekendDays(): readonly number[] | undefined;
  holidays(): readonly Date[];
  workCalendar(): GanttWorkCalendar | null;
  showResourceWorkload(): boolean;
  stripLines(): readonly OgeGanttStripLine[];
  autoScheduling(): boolean;
  locale(): string | undefined;
  messages(): Partial<OgeGanttMessages>;
  editingEnabled(): boolean;
  allowTaskAdding(): boolean;
  allowTaskUpdating(): boolean;
  allowTaskDeleting(): boolean;
  allowDependencyAdding(): boolean;
  allowDependencyDeleting(): boolean;
  readOnly(): boolean;
  selectedTaskKey(): RowKey | null;
  /**
   * Right-to-left override; `undefined` (or a host without the getter)
   * follows the document direction read by `connectDirection()`.
   */
  rtlEnabled?(): boolean | undefined;
  /** The resolved provider config (DI token / React context). */
  config(): OgeGanttConfig;

  /* ---- G3b: every getter below is optional; unset = the default ---- */
  manuallyScheduledExpr?(): GanttFieldExpr<T>;
  constraintTypeExpr?(): GanttFieldExpr<T>;
  constraintDateExpr?(): GanttFieldExpr<T>;
  deadlineExpr?(): GanttFieldExpr<T>;
  segmentsExpr?(): GanttFieldExpr<T>;
  baselinesExpr?(): GanttFieldExpr<T>;
  unitsExpr?(): GanttFieldExpr<T>;
  effortExpr?(): GanttFieldExpr<T>;
  dependencyLagExpr?(): GanttFieldExpr<D>;
  dependencyLagUnitExpr?(): GanttFieldExpr<D>;
  /** Where unlinked ASAP tasks start when auto-scheduling (default: keep). */
  projectStart?(): Date | null;
  /** Status date of the progress line (default: today). */
  statusDate?(): Date | null;
  showProgressLine?(): boolean;
  showRollups?(): boolean;
  /** Which baseline renders (0-based); `-1` hides them. Default 0. */
  baselineIndex?(): number;
  zoomPresets?(): readonly OgeGanttZoomPreset[] | null;
  effortDriven?(): boolean;
  hoursPerDay?(): number;
  showResourceHistogram?(): boolean;
  viewMode?(): OgeGanttViewMode;
  selectionMode?(): OgeGanttSelectionMode;
  selectedTaskKeys?(): readonly RowKey[];
  inlineEditing?(): boolean;
  allowSorting?(): boolean;
  allowColumnResizing?(): boolean;
  allowColumnReordering?(): boolean;
  filterRow?(): boolean;
  searchPanel?(): boolean;
}

/** The outputs; each layer maps them to `output()`s or `onX` props. */
export interface OgeGanttCoreEvents<T, D> {
  taskInserting?(event: OgeGanttTaskInsertingEvent<T>): void;
  taskInserted?(event: OgeGanttTaskInsertedEvent<T>): void;
  taskUpdating?(event: OgeGanttTaskUpdatingEvent<T>): void;
  taskUpdated?(event: OgeGanttTaskUpdatedEvent<T>): void;
  taskDeleting?(event: OgeGanttTaskDeletingEvent<T>): void;
  taskDeleted?(event: OgeGanttTaskDeletedEvent<T>): void;
  dependencyInserting?(event: OgeGanttDependencyInsertingEvent): void;
  dependencyInserted?(event: OgeGanttDependencyInsertedEvent<D>): void;
  dependencyDeleting?(event: OgeGanttDependencyDeletingEvent<D>): void;
  dependencyDeleted?(event: OgeGanttDependencyDeletedEvent<D>): void;
  taskClick?(event: OgeGanttTaskClickEvent<T>): void;
  taskDblClick?(event: OgeGanttTaskClickEvent<T>): void;
  taskContextMenu?(event: OgeGanttTaskClickEvent<T>): void;
  selectionChanged?(event: OgeGanttSelectionChangedEvent<T>): void;
  taskEditDialogShowing?(event: OgeGanttDialogShowingEvent<T>): void;
  schedulingConflict?(event: OgeGanttSchedulingConflictEvent<T>): void;
  dependencyUpdating?(event: OgeGanttDependencyUpdatingEvent<D>): void;
  dependencyUpdated?(event: OgeGanttDependencyUpdatedEvent<D>): void;
  sortChanged?(event: OgeGanttSortChangedEvent): void;
  columnResized?(event: OgeGanttColumnResizedEvent): void;
  columnReordered?(event: OgeGanttColumnReorderedEvent): void;
  /** The two-way halves: the core asks, the host writes the model. */
  scaleTypeChange?(type: OgeGanttScaleType): void;
  selectedTaskKeyChange?(key: RowKey | null): void;
  selectedTaskKeysChange?(keys: readonly RowKey[]): void;
  baselineIndexChange?(index: number): void;
  viewModeChange?(mode: OgeGanttViewMode): void;
}

/** What the core needs from its render layer. */
export interface OgeGanttCoreHost<T, D> {
  readonly inputs: OgeGanttCoreInputs<T, D>;
  readonly events: OgeGanttCoreEvents<T, D>;
  /** Opens the layer's task dialog with the (possibly replaced) items. */
  openDialog(
    model: GanttEditorModel,
    isNew: boolean,
    items: readonly OgeFormItemDataBase[],
  ): void;
  hostElement(): HTMLElement | null;
  /** The vertically scrolling body shared by both panes. */
  bodyElement(): HTMLElement | null;
  /** The horizontally scrolling chart region. */
  chartScrollElement(): HTMLElement | null;
  /** The chart canvas (bars, arrows) — gesture coordinates are relative to it. */
  canvasElement(): HTMLElement | null;
  /**
   * Runs `fn` without dependency tracking — Angular passes `untracked`, so a
   * public method called from inside a consumer's `effect()` does not
   * subscribe it to the Gantt's internal state. Default: plain call.
   */
  untracked?<R>(fn: () => R): R;
}

export class OgeGanttCore<
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
> {
  /** Sticky scale header height (two 24px tick rows). */
  readonly scaleHeadH = GANTT_SCALE_HEAD_PX;

  private readonly inputs: OgeGanttCoreInputs<T, D>;
  private readonly events: OgeGanttCoreEvents<T, D>;

  /* ---------------- stores + undo ---------------- */

  private readonly taskStore;
  private readonly dependencyStore;
  private readonly undoStack;
  private readonly redoStack;
  private readonly collapsedKeys;
  private readonly renderedRange;
  private readonly scrollTop;
  private readonly viewportPx;

  /** Row under the pointer (pane row + chart lane share the highlight). */
  readonly hoverKey;
  /** The keyboard-focused row. */
  readonly focusKey;
  /** The clicked dependency arrow, awaiting Delete. */
  readonly selectedDependencyKey;
  /** The polite live-region text. */
  readonly announcement;
  /** The bar being dragged. */
  readonly dragKey;
  /** Key of the bar under the pointer — drives the hover tooltip. */
  readonly tooltipKey;
  /** The floating label while a bar gesture runs. */
  readonly dragTip;
  /** The rubber-band path while a link is drawn. */
  readonly linkPreview;
  /** The ghost bar while drawing a new task on empty chart space. */
  readonly drawPreview;
  /** Width of the task pane in px (the splitter drags it). */
  readonly listWidth;
  /** The open built-in context menu, or `null`. */
  readonly contextMenu;
  /** The document direction last read from the host (`connectDirection`). */
  private readonly detectedRtl;
  /** The active column sort, or `null`. */
  readonly sort;
  /** Filter-row texts per field. */
  readonly filters;
  /** The toolbar search text. */
  readonly searchText;
  /** User column order (fields), or `null` for the `columns` order. */
  private readonly columnOrder;
  /** User column widths per field (px). */
  private readonly columnWidths;
  /** The roving header cell (index into `resolvedColumns`). */
  readonly headerFocusIndex;
  /** The open inline cell editor, or `null`. */
  readonly editingCell;
  /** The open dependency editor, or `null`. */
  readonly dependencyEditor;
  /** Minor tick width chosen by a zoom preset, or `null` (scale default). */
  private readonly tickWidthOverride;

  /* ---------------- derived ---------------- */

  readonly msg: () => OgeGanttResolvedMessages;
  /**
   * Right-to-left: the `rtlEnabled` input, else the document direction. The
   * timeline geometry stays logical (px from the range start, rendered with
   * `inset-inline-start`); RTL mirrors pointer x, drag deltas, the arrow
   * keys, the dependency SVG and the chart scroll offset.
   */
  readonly rtl: () => boolean;
  /** `transform` for the dependency-arrow group: mirrors x in RTL. */
  readonly arrowsTransform: () => string | null;
  readonly rowHeight: () => number;
  readonly effectiveLocale: () => string | undefined;
  readonly effectiveEditing: () => boolean;
  readonly resolvedFirstDayOfWeek: () => number;
  /**
   * The weekend the timeline shades (0 = Sunday): the `weekendDays` input,
   * else the locale's `Intl.Locale` week data, else Saturday and Sunday.
   */
  readonly resolvedWeekendDays: () => readonly number[];
  private readonly fields: () => ResolvedGanttFields<T>;
  /** The visible task rows (tree order, roll-ups applied). */
  readonly visibleTasks: () => readonly GanttTask<T>[];
  /** All tasks incl. collapsed subtrees — arrows/critical path need them. */
  readonly allTasks: () => readonly GanttTask<T>[];
  readonly ganttDependencies: () => readonly GanttDependency<D>[];
  private readonly criticalKeys: () => ReadonlySet<RowKey>;
  private readonly dataRange: () => GanttRange;
  private readonly stableRange: () => GanttRange;
  readonly scale: () => GanttScale;
  private readonly windowRange: () => { first: number; last: number };
  readonly windowTasks: () => readonly GanttTask<T>[];
  readonly windowTopPx: () => number;
  readonly windowBottomPx: () => number;
  private readonly rowIndexByKey: () => ReadonlyMap<RowKey, number>;
  readonly windowBars: () => readonly GanttBar<T>[];
  readonly windowArrows: () => readonly GanttArrow<D>[];
  /** The calendar merging `workCalendar` with the `holidays` input. */
  readonly effectiveWorkCalendar: () => GanttWorkCalendar | null;
  readonly shadedTicks: () => GanttScale['ticks'];
  /** Per-resource workload segments in chart px; `over` = overallocated. */
  readonly workloadRows: () => readonly GanttWorkloadRow[];
  readonly stripRects: () => readonly GanttStripRect[];
  readonly resolvedColumns: () => readonly GanttResolvedColumn[];
  /** The roving tab stop: the focused row, or the first visible one. */
  readonly rovingKey: () => RowKey | null;
  readonly tooltipBar: () => GanttBar<T> | null;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  /** Enabled states of the open context menu's items. */
  readonly menuState: () => GanttMenuItemState;
  /** `'tasks'` or `'resources'` (the resource view). */
  readonly viewMode: () => OgeGanttViewMode;
  readonly selectionMode: () => OgeGanttSelectionMode;
  /** Every selected row key (the primary one included). */
  readonly selectedKeys: () => ReadonlySet<RowKey>;
  /** Rows the canvas is tall for (`aria-rowcount` too). */
  readonly rowCount: () => number;
  /** Total / free slack per leaf task. */
  readonly slack: () => ReadonlyMap<RowKey, GanttSlack>;
  /** Current scheduling conflicts, resolved for display. */
  readonly conflicts: () => readonly OgeGanttSchedulingConflict<T>[];
  /** Keys with at least one conflict. */
  private readonly conflictKeys: () => ReadonlySet<RowKey>;
  /** Incoming links per successor key (predecessor column). */
  private readonly incomingLinks: () => ReadonlyMap<
    RowKey,
    readonly GanttDependency<D>[]
  >;
  /** The progress line, or `null` when hidden. */
  readonly progressLine: () => GanttProgressLine | null;
  /** The utilization histogram rows (`showResourceHistogram`). */
  readonly histogramRows: () => readonly GanttHistogramRowVm[];
  /** The zoom-preset chooser options. */
  readonly zoomOptions: () => readonly GanttZoomPresetOption[];
  /** The option matching the current scale, or `-1`. */
  readonly activeZoomIndex: () => number;
  /** The most baselines any task carries (chooser shows above one). */
  readonly baselineCount: () => number;
  /** The resolved `baselineIndex`. */
  readonly activeBaseline: () => number;
  /** Any filter or search text applies. */
  readonly filtering: () => boolean;
  private readonly realKeys: () => ReadonlyMap<RowKey, RowKey | null>;
  private readonly calendarFor: () => (
    task: GanttTask,
  ) => GanttWorkCalendar | undefined;

  private editedSource: T | null = null;
  private draftCounter = 0;
  private pendingParentRaw: unknown = undefined;
  private lastTasks: readonly T[] | null = null;
  private lastDependencies: readonly D[] | null = null;
  private lastListWidth: number | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly gestures = new Set<GanttGestureHandle>();
  private arrowKeyListener: ((event: KeyboardEvent) => void) | null = null;
  private stopDirection: (() => void) | null = null;
  private batchDepth = 0;
  private batchSnapshotted = false;
  private pendingSchedule = false;
  private selectionAnchor: RowKey | null = null;
  private lastConflictSignature = '';
  private suppressHeaderClick = false;

  constructor(
    private readonly host: OgeGanttCoreHost<T, D>,
    rx: OgeReactivityAdapter,
  ) {
    this.inputs = host.inputs;
    this.events = host.events;
    const inputs = this.inputs;

    this.taskStore = rx.cell<readonly T[]>([]);
    this.dependencyStore = rx.cell<readonly D[]>([]);
    this.undoStack = rx.cell<readonly UndoSnapshot<T, D>[]>([]);
    this.redoStack = rx.cell<readonly UndoSnapshot<T, D>[]>([]);
    this.collapsedKeys = rx.cell<ReadonlySet<RowKey>>(new Set());
    this.renderedRange = rx.cell<GanttRange | null>(null);
    this.scrollTop = rx.cell(0);
    this.viewportPx = rx.cell(600);
    this.hoverKey = rx.cell<RowKey | null>(null);
    this.focusKey = rx.cell<RowKey | null>(null);
    this.selectedDependencyKey = rx.cell<RowKey | null>(null);
    this.announcement = rx.cell('');
    this.dragKey = rx.cell<RowKey | null>(null);
    this.tooltipKey = rx.cell<RowKey | null>(null);
    this.dragTip = rx.cell<{ x: number; y: number; text: string } | null>(null);
    this.linkPreview = rx.cell<{ path: string; valid: boolean } | null>(null);
    this.drawPreview = rx.cell<{
      leftPx: number;
      widthPx: number;
      top: number;
    } | null>(null);
    this.listWidth = rx.cell(360);
    this.contextMenu = rx.cell<GanttContextMenuState<T> | null>(null);
    this.detectedRtl = rx.cell(false);
    this.sort = rx.cell<GanttSort | null>(null);
    this.filters = rx.cell<Readonly<Record<string, string>>>({});
    this.searchText = rx.cell('');
    this.columnOrder = rx.cell<readonly string[] | null>(null);
    this.columnWidths = rx.cell<Readonly<Record<string, number>>>({});
    this.headerFocusIndex = rx.cell(0);
    this.editingCell = rx.cell<GanttCellEditState | null>(null);
    this.dependencyEditor = rx.cell<GanttDependencyEditorState<D> | null>(
      null,
    );
    this.tickWidthOverride = rx.cell<number | null>(null);

    // deep-filled: keys added after 1.1 are optional in the public catalog
    this.msg = rx.derived<OgeGanttResolvedMessages>(() =>
      fillGanttMessages(inputs.config().messages, inputs.messages()),
    );
    this.viewMode = rx.derived(() => inputs.viewMode?.() ?? 'tasks');
    this.selectionMode = rx.derived(
      () => inputs.selectionMode?.() ?? 'single',
    );
    this.rtl = rx.derived(() => inputs.rtlEnabled?.() ?? this.detectedRtl());
    this.rowHeight = rx.derived(() => inputs.config().rowHeight ?? 36);
    this.effectiveLocale = rx.derived(
      () => inputs.locale() ?? inputs.config().locale,
    );
    this.effectiveEditing = rx.derived(
      () => inputs.editingEnabled() && !inputs.readOnly(),
    );
    this.resolvedFirstDayOfWeek = rx.derived(() =>
      resolveFirstDayOfWeek(inputs.firstDayOfWeek(), this.effectiveLocale()),
    );
    this.resolvedWeekendDays = rx.derived(() =>
      resolveWeekendDays(inputs.weekendDays(), this.effectiveLocale()),
    );
    this.canUndo = rx.derived(() => this.undoStack().length > 0);
    this.canRedo = rx.derived(() => this.redoStack().length > 0);

    this.fields = rx.derived(() =>
      resolveGanttFields<T>({
        keyExpr: inputs.keyExpr(),
        parentKeyExpr: inputs.parentKeyExpr(),
        titleExpr: inputs.titleExpr(),
        startExpr: inputs.startExpr(),
        endExpr: inputs.endExpr(),
        progressExpr: inputs.progressExpr(),
        colorExpr: inputs.colorExpr(),
        baselineStartExpr: inputs.baselineStartExpr(),
        baselineEndExpr: inputs.baselineEndExpr(),
        resourceIdExpr: inputs.resourceIdExpr(),
        manuallyScheduledExpr: inputs.manuallyScheduledExpr?.(),
        constraintTypeExpr: inputs.constraintTypeExpr?.(),
        constraintDateExpr: inputs.constraintDateExpr?.(),
        deadlineExpr: inputs.deadlineExpr?.(),
        segmentsExpr: inputs.segmentsExpr?.(),
        baselinesExpr: inputs.baselinesExpr?.(),
        unitsExpr: inputs.unitsExpr?.(),
        effortExpr: inputs.effortExpr?.(),
      }),
    );
    this.allTasks = rx.derived(() =>
      buildGanttTasks(this.taskStore(), this.fields(), new Set()),
    );
    this.ganttDependencies = rx.derived(() =>
      buildGanttDependencies(
        this.dependencyStore(),
        {
          keyExpr: inputs.dependencyKeyExpr(),
          predecessorKeyExpr: inputs.predecessorKeyExpr(),
          successorKeyExpr: inputs.successorKeyExpr(),
          typeExpr: inputs.dependencyTypeExpr(),
          lagExpr: inputs.dependencyLagExpr?.(),
          lagUnitExpr: inputs.dependencyLagUnitExpr?.(),
        },
        new Set(this.allTasks().map((task) => task.key)),
      ),
    );
    this.incomingLinks = rx.derived(() => {
      const map = new Map<RowKey, GanttDependency<D>[]>();
      for (const dep of this.ganttDependencies()) {
        const bucket = map.get(dep.successorKey);
        if (bucket) bucket.push(dep);
        else map.set(dep.successorKey, [dep]);
      }
      return map;
    });
    this.calendarFor = rx.derived(() => {
      const resources = inputs.resources();
      const planCalendar = this.effectiveWorkCalendar() ?? undefined;
      return (task: GanttTask) => {
        for (const id of task.resourceIds) {
          const calendar = resources.find(
            (resource) => resource.id === id,
          )?.calendar;
          if (calendar !== undefined) return calendar;
        }
        return planCalendar;
      };
    });
    this.slack = rx.derived(() =>
      computeGanttSlack(
        this.allTasks(),
        this.ganttDependencies(),
        this.calendarFor(),
      ),
    );
    this.criticalKeys = rx.derived<ReadonlySet<RowKey>>(() => {
      if (!inputs.showCriticalPath()) return new Set();
      const critical = new Set<RowKey>();
      for (const [key, value] of this.slack()) {
        if (value.totalSlack <= 0) critical.add(key);
      }
      return critical;
    });
    this.conflicts = rx.derived(() => {
      const byKey = new Map(this.allTasks().map((task) => [task.key, task]));
      const links = new Map(
        this.ganttDependencies().map((dep) => [dep.key, dep]),
      );
      return detectGanttConflicts(
        this.allTasks(),
        this.ganttDependencies(),
        this.calendarFor(),
      ).flatMap((conflict) => {
        const task = byKey.get(conflict.key);
        return task === undefined
          ? []
          : [
              {
                ...conflict,
                task,
                message: this.conflictMessage(conflict, task, links),
              },
            ];
      });
    });
    this.conflictKeys = rx.derived(
      () => new Set(this.conflicts().map((conflict) => conflict.key)),
    );
    this.filtering = rx.derived(
      () =>
        this.searchText().trim() !== '' ||
        Object.values(this.filters()).some((text) => text.trim() !== ''),
    );
    this.visibleTasks = rx.derived(() => {
      if (this.viewMode() === 'resources') {
        return buildResourceViewRows(
          this.allTasks(),
          inputs.resources(),
          this.collapsedKeys(),
          this.msg().grid.unassigned,
        ).map((row) => row.task);
      }
      const sort = this.sort();
      const order =
        sort !== null
          ? sortGanttItems(this.allTasks(), sort, this.effectiveLocale())
          : undefined;
      const include = this.filtering()
        ? ganttFilterKeys(
            this.allTasks(),
            this.resolvedColumns().map((column) => column.field),
            this.filters(),
            this.searchText(),
            (task, field) =>
              this.cellText(task, this.columnFor(field)),
          )
        : null;
      return buildGanttTasks(
        this.taskStore(),
        this.fields(),
        this.collapsedKeys(),
        { order, include },
      );
    });
    this.realKeys = rx.derived(() => {
      const map = new Map<RowKey, RowKey | null>();
      if (this.viewMode() !== 'resources') return map;
      for (const row of buildResourceViewRows(
        this.allTasks(),
        inputs.resources(),
        this.collapsedKeys(),
        this.msg().grid.unassigned,
      )) {
        map.set(row.task.key, row.realKey);
      }
      return map;
    });
    this.selectedKeys = rx.derived(() => {
      const primary = inputs.selectedTaskKey();
      const keys = new Set<RowKey>(
        this.selectionMode() === 'multiple'
          ? (inputs.selectedTaskKeys?.() ?? [])
          : [],
      );
      if (primary !== null) keys.add(primary);
      return keys;
    });
    this.rowCount = rx.derived(() =>
      this.viewMode() === 'resources'
        ? this.visibleTasks().length
        : this.taskStore().length,
    );
    this.dataRange = rx.derived(() =>
      ganttDataRange(this.allTasks(), startOfDay(new Date())),
    );
    this.stableRange = rx.derived(() =>
      widenGanttRange(this.dataRange(), this.renderedRange()),
    );
    this.scale = rx.derived(() => {
      const range = this.stableRange();
      const type = inputs.scaleType();
      return buildGanttScale(
        range.min,
        range.max,
        type,
        this.resolvedFirstDayOfWeek(),
        this.tickWidthOverride() ?? GANTT_TICK_WIDTH[type],
      );
    });

    this.arrowsTransform = rx.derived(() =>
      this.rtl() ? `matrix(-1 0 0 1 ${this.scale().totalPx} 0)` : null,
    );

    this.windowRange = rx.derived(() =>
      ganttWindowRange(
        this.scrollTop(),
        this.viewportPx(),
        this.rowHeight(),
        this.visibleTasks().length,
      ),
    );
    this.windowTasks = rx.derived(() => {
      const { first, last } = this.windowRange();
      return this.visibleTasks().slice(first, last);
    });
    this.windowTopPx = rx.derived(
      () => this.windowRange().first * this.rowHeight(),
    );
    this.windowBottomPx = rx.derived(
      () =>
        Math.max(0, this.visibleTasks().length - this.windowRange().last) *
        this.rowHeight(),
    );
    this.rowIndexByKey = rx.derived(() => {
      const map = new Map<RowKey, number>();
      this.visibleTasks().forEach((task, index) => map.set(task.key, index));
      return map;
    });

    this.activeBaseline = rx.derived(() => inputs.baselineIndex?.() ?? 0);
    this.baselineCount = rx.derived(() =>
      this.allTasks().reduce(
        (max, task) => Math.max(max, task.baselines.length),
        0,
      ),
    );
    this.windowBars = rx.derived(() => {
      const scale = this.scale();
      const critical = this.criticalKeys();
      const conflicted = this.conflictKeys();
      const baselineIndex = this.activeBaseline();
      const rollups = inputs.showRollups?.() ?? false;
      const realKeys = this.realKeys();
      return this.windowTasks().map((task) => {
        const realKey = realKeys.get(task.key) ?? task.key;
        const leftPx = dateToPx(scale, task.start);
        const widthPx = Math.max(4, dateToPx(scale, task.end) - leftPx);
        const baseline =
          baselineIndex >= 0 ? task.baselines[baselineIndex] : undefined;
        const baselineLeftPx =
          baseline !== undefined ? dateToPx(scale, baseline.start) : null;
        const progressPx = (widthPx * task.progress) / 100;
        const segments = task.segments.map((segment) => {
          const offsetPx = dateToPx(scale, segment.start) - leftPx;
          const pieceWidth = Math.max(
            2,
            dateToPx(scale, segment.end) - leftPx - offsetPx,
          );
          return {
            offsetPx,
            widthPx: pieceWidth,
            fillPx: Math.max(0, Math.min(pieceWidth, progressPx - offsetPx)),
          };
        });
        return {
          task,
          index: this.rowIndexOf(task),
          leftPx,
          widthPx,
          baselineLeftPx,
          baselineWidthPx:
            baseline !== undefined
              ? Math.max(
                  4,
                  dateToPx(scale, baseline.end) - (baselineLeftPx as number),
                )
              : null,
          critical: critical.has(realKey),
          segments,
          deadlinePx:
            task.deadline !== undefined && !task.isSummary
              ? dateToPx(scale, task.deadline)
              : null,
          overdue:
            task.deadline !== undefined &&
            task.end.getTime() > task.deadline.getTime(),
          conflict: conflicted.has(realKey),
          constraintPx:
            task.constraintDate !== undefined &&
            isDatedConstraint(task.constraintType)
              ? dateToPx(scale, task.constraintDate)
              : null,
          rollups:
            rollups && task.isSummary ? this.rollupsOf(task.key, scale) : [],
          manual: task.manuallyScheduled && !task.isSummary,
        };
      });
    });

    this.windowArrows = rx.derived(() => {
      if (!inputs.showDependencies()) return [];
      // the resource view repeats tasks per resource: links would be ambiguous
      if (this.viewMode() === 'resources') return [];
      const lagSuffix = {
        days: this.msg().scheduling.lagDays,
        hours: this.msg().scheduling.lagHours,
      };
      const scale = this.scale();
      const rowHeight = this.rowHeight();
      const rows = this.rowIndexByKey();
      const tasksByKey = new Map(
        this.visibleTasks().map((task) => [task.key, task]),
      );
      const { first, last } = this.windowRange();
      const critical = this.criticalKeys();
      const arrows: GanttArrow<D>[] = [];
      for (const dependency of this.ganttDependencies()) {
        const from = tasksByKey.get(dependency.predecessorKey);
        const to = tasksByKey.get(dependency.successorKey);
        if (from === undefined || to === undefined) continue;
        const fromRow = rows.get(from.key) as number;
        const toRow = rows.get(to.key) as number;
        if (
          (fromRow < first - GANTT_OVERSCAN_ROWS &&
            toRow < first - GANTT_OVERSCAN_ROWS) ||
          (fromRow > last + GANTT_OVERSCAN_ROWS &&
            toRow > last + GANTT_OVERSCAN_ROWS)
        ) {
          continue;
        }
        const anchors = dependencyAnchors(dependency.type);
        const fromX = dateToPx(scale, anchors.fromEnd ? from.end : from.start);
        const toX = dateToPx(scale, anchors.toEnd ? to.end : to.start);
        const label = formatGanttLag(
          dependency.lag,
          dependency.lagUnit,
          lagSuffix,
        );
        arrows.push({
          dependency,
          path: dependencyPath(
            routeDependency(
              { x: fromX, y: fromRow * rowHeight + rowHeight / 2 },
              { x: toX, y: toRow * rowHeight + rowHeight / 2 },
              dependency.type,
            ),
          ),
          critical:
            critical.has(dependency.predecessorKey) &&
            critical.has(dependency.successorKey),
          label: label === '' ? null : label,
          labelX: anchors.toEnd ? toX + 6 : Math.max(0, toX - 30),
          labelY: toRow * rowHeight + 2,
        });
      }
      return arrows;
    });

    this.effectiveWorkCalendar = rx.derived(() => {
      const calendar = inputs.workCalendar();
      const holidays = inputs.holidays();
      if (calendar === null) return null;
      return holidays.length === 0
        ? calendar
        : {
            ...calendar,
            holidays: [...(calendar.holidays ?? []), ...holidays],
          };
    });

    this.shadedTicks = rx.derived(() => {
      const scale = this.scale();
      if (scale.type !== 'hours' && scale.type !== 'days') return [];
      const calendar = this.effectiveWorkCalendar();
      const holidays = inputs.holidays();
      const weekendDays = inputs.weekendsHighlighted()
        ? this.resolvedWeekendDays()
        : [];
      return scale.ticks.filter((tick) => {
        if (calendar !== null) return !isWorkingDay(tick.date, calendar);
        const weekend = weekendDays.includes(tick.date.getDay());
        return (
          weekend || holidays.some((holiday) => sameDay(holiday, tick.date))
        );
      });
    });

    this.workloadRows = rx.derived(() => {
      if (!inputs.showResourceWorkload()) return [];
      const resources = inputs.resources();
      if (resources.length === 0) return [];
      const scale = this.scale();
      const workload = buildResourceWorkload(
        this.allTasks(),
        resources.map((resource) => resource.id),
      );
      return resources.map((resource) => ({
        id: resource.id,
        text: resource.text,
        color: resource.color,
        segments: (workload.get(resource.id) ?? []).map((segment) => {
          const px = dateToPx(scale, segment.start);
          return {
            px,
            widthPx: Math.max(1, dateToPx(scale, segment.end) - px),
            over: segment.count > 1,
          };
        }),
      }));
    });

    this.stripRects = rx.derived(() => {
      const scale = this.scale();
      return inputs.stripLines().map((strip) => {
        const px = dateToPx(scale, strip.start);
        const widthPx =
          strip.end !== undefined
            ? Math.max(0, dateToPx(scale, strip.end) - px)
            : 0;
        return { px, widthPx, label: strip.label, color: strip.color };
      });
    });

    this.resolvedColumns = rx.derived(() => {
      const messages = this.msg().columns;
      const builtIn: Record<
        string,
        { header: string; width: number; editor: GanttCellEditorType | null }
      > = {
        title: { header: messages.title, width: 180, editor: 'text' },
        start: { header: messages.start, width: 88, editor: 'date' },
        end: { header: messages.end, width: 88, editor: 'date' },
        duration: { header: messages.duration, width: 64, editor: 'duration' },
        progress: { header: messages.progress, width: 64, editor: 'number' },
        wbs: { header: messages.wbs, width: 56, editor: null },
        predecessors: {
          header: messages.predecessors,
          width: 104,
          editor: 'predecessor',
        },
        totalSlack: { header: messages.totalSlack, width: 80, editor: null },
        freeSlack: { header: messages.freeSlack, width: 80, editor: null },
        constraint: { header: messages.constraint, width: 120, editor: null },
        deadline: { header: messages.deadline, width: 88, editor: 'date' },
        resources: { header: messages.resources, width: 120, editor: null },
        units: { header: messages.units, width: 64, editor: null },
        effort: { header: messages.effort, width: 64, editor: 'number' },
      };
      const columns = inputs.columns();
      const order = this.columnOrder();
      const ordered =
        order === null
          ? [...columns]
          : [
              ...order
                .map((field) => columns.find((column) => column.field === field))
                .filter((column): column is OgeGanttColumn => !!column),
              ...columns.filter((column) => !order.includes(column.field)),
            ];
      // frozen columns pin to the start edge, so they lead the order
      const sorted = [
        ...ordered.filter((column) => column.frozen === true),
        ...ordered.filter((column) => column.frozen !== true),
      ];
      const widths = this.columnWidths();
      const sort = this.sort();
      const sortingAllowed = inputs.allowSorting?.() ?? false;
      let offset = 0;
      return sorted.map((column) => {
        const known = builtIn[column.field];
        const widthPx =
          widths[column.field] ?? column.widthPx ?? known?.width ?? 100;
        const frozenOffsetPx = offset;
        if (column.frozen === true) offset += widthPx;
        return {
          field: column.field,
          header: column.header ?? known?.header ?? column.field,
          widthPx,
          format: column.format,
          editor:
            column.editor === false
              ? null
              : (column.editor ?? (known !== undefined ? known.editor : 'text')),
          sortable: sortingAllowed && column.allowSorting !== false,
          sortDirection:
            sort !== null && sort.field === column.field
              ? sort.direction === 'asc'
                ? ('ascending' as const)
                : ('descending' as const)
              : null,
          frozen: column.frozen === true,
          frozenOffsetPx,
        };
      });
    });

    this.rovingKey = rx.derived(
      () => this.focusKey() ?? this.visibleTasks()[0]?.key ?? null,
    );
    this.tooltipBar = rx.derived(() => {
      const key = this.tooltipKey();
      if (key === null || this.dragKey() !== null) return null;
      return this.windowBars().find((bar) => bar.task.key === key) ?? null;
    });

    this.progressLine = rx.derived(() => {
      if (!(inputs.showProgressLine?.() ?? false)) return null;
      const scale = this.scale();
      const status = inputs.statusDate?.() ?? startOfDay(new Date());
      const statusPx = dateToPx(scale, status);
      const rowHeight = this.rowHeight();
      const points: string[] = [];
      for (const task of this.windowTasks()) {
        const top = this.rowIndexOf(task) * rowHeight;
        let x = statusPx;
        if (
          !task.isSummary &&
          !task.isMilestone &&
          task.start.getTime() <= status.getTime()
        ) {
          // the point the work has actually reached
          const reached = new Date(
            task.start.getTime() +
              ((task.end.getTime() - task.start.getTime()) * task.progress) /
                100,
          );
          x = dateToPx(scale, reached);
        }
        points.push(
          `${points.length === 0 ? 'M' : 'L'} ${statusPx} ${top}`,
          `L ${x} ${top + rowHeight / 2}`,
          `L ${statusPx} ${top + rowHeight}`,
        );
      }
      return { statusPx, path: points.join(' ') };
    });

    this.histogramRows = rx.derived(() => {
      if (!(inputs.showResourceHistogram?.() ?? false)) return [];
      const resources = inputs.resources();
      if (resources.length === 0) return [];
      const scale = this.scale();
      const periods = [...scale.ticks.map((tick) => tick.date), scale.end];
      const messages = this.msg();
      const locale = this.effectiveLocale();
      return buildResourceHistogram(this.allTasks(), resources, periods).map(
        (row) => {
          const top = Math.max(row.capacity * 1.5, row.peak, 1);
          return {
            id: row.id,
            text: row.text,
            label: ogeFormatMessage(
              messages.grid.histogramRow,
              {
                resource: row.text,
                peak: Math.round(row.peak),
                count: row.overCount,
              },
              locale,
            ),
            capacityPct: (row.capacity / top) * 100,
            cells: row.cells.flatMap((cell, i) =>
              cell.load <= 0
                ? []
                : [
                    {
                      px: scale.ticks[i].px,
                      widthPx: scale.ticks[i].widthPx,
                      heightPct: Math.min(100, (cell.load / top) * 100),
                      load: cell.load,
                      over: cell.over,
                    },
                  ],
            ),
          };
        },
      );
    });

    this.zoomOptions = rx.derived(() => {
      const scales = this.msg().scales;
      const presets =
        inputs.zoomPresets?.() ??
        GANTT_SCALE_ORDER.map((scaleType): OgeGanttZoomPreset => ({ scaleType }));
      return presets.map((preset, index) => ({
        index,
        preset,
        label: preset.label ?? scales[preset.scaleType],
      }));
    });
    this.activeZoomIndex = rx.derived(() => {
      const type = inputs.scaleType();
      const width = this.tickWidthOverride();
      const options = this.zoomOptions();
      const exact = options.find(
        (option) =>
          option.preset.scaleType === type &&
          (option.preset.tickWidth ?? null) === width,
      );
      if (exact !== undefined) return exact.index;
      if (width !== null) return -1;
      return (
        options.find(
          (option) =>
            option.preset.scaleType === type &&
            option.preset.tickWidth === undefined,
        )?.index ?? -1
      );
    });

    this.menuState = rx.derived(() => {
      const task = this.contextMenu()?.task ?? null;
      return {
        edit: inputs.allowTaskUpdating(),
        newSubtask: inputs.allowTaskAdding(),
        newTask: inputs.allowTaskAdding(),
        indent: task !== null && this.canIndent(task),
        outdent:
          task !== null &&
          task.parentKey !== null &&
          inputs.allowTaskUpdating(),
        delete: inputs.allowTaskDeleting(),
      };
    });

    // first-paint parity: a render layer that seeds state after its first
    // paint (React effects) must still paint the bound data at once
    this.resetTasks(inputs.tasks());
    this.resetDependencies(inputs.dependencies());
    this.resetListWidth(inputs.taskListWidth());
  }

  private run<R>(fn: () => R): R {
    return this.host.untracked ? this.host.untracked(fn) : fn();
  }

  /* ---------------- input sync (host-scheduled) ---------------- */

  /** A new `tasks` input: copy into the working set, clear the history. */
  resetTasks(tasks: readonly T[]): void {
    this.run(() => {
      if (tasks === this.lastTasks) return;
      this.lastTasks = tasks;
      this.taskStore.set([...tasks]);
      this.undoStack.set([]);
      this.redoStack.set([]);
    });
  }

  /** A new `dependencies` input: copy into the working set. */
  resetDependencies(dependencies: readonly D[]): void {
    this.run(() => {
      if (dependencies === this.lastDependencies) return;
      this.lastDependencies = dependencies;
      this.dependencyStore.set([...dependencies]);
    });
  }

  /** A new `taskListWidth` input. */
  resetListWidth(width: number): void {
    this.run(() => {
      if (width === this.lastListWidth) return;
      this.lastListWidth = width;
      this.listWidth.set(width);
    });
  }

  /**
   * Widens the rendered range to the data (reads the data range tracked, so
   * an Angular `effect()` re-runs on data changes); call after data changes.
   */
  syncRenderedRange(): void {
    const next = this.stableRange();
    this.run(() => {
      if (!sameGanttRange(this.renderedRange(), next)) {
        this.renderedRange.set(next);
      }
    });
  }

  /** Revives the core after a `destroy()` (StrictMode remount). */
  revive(): void {
    // nothing is torn down irreversibly: listeners and timers are created
    // per interaction, so a destroyed core is usable again as-is
  }

  /**
   * Reads the document direction around the host and keeps it current while
   * a `dir` attribute changes on an ancestor (`<html dir>`, a wrapper). Call
   * after the first render (SSR-safe: a no-op without an element);
   * idempotent, and `destroy()` disconnects it. The host's own `dir` is
   * skipped — the layers set it from `rtlEnabled`, which already wins.
   */
  connectDirection(): void {
    this.stopDirection?.();
    this.stopDirection = null;
    const host = this.host.hostElement();
    if (host === null) return;
    const context = host.parentElement ?? host;
    this.detectedRtl.set(ogeIsRtl(context));
    this.stopDirection = observeDirection(context, (direction) =>
      this.detectedRtl.set(direction === 'rtl'),
    );
  }

  /**
   * Chart-local logical x of a viewport `clientX`: px from the timeline's
   * start edge (the left edge in LTR, the right edge in RTL).
   */
  private logicalX(clientX: number, rect: DOMRect, rtl: boolean): number {
    return rtl ? rect.right - clientX : clientX - rect.left;
  }

  /** Cancels running gestures, pending focus timers and key listeners. */
  destroy(): void {
    this.stopDirection?.();
    this.stopDirection = null;
    for (const gesture of [...this.gestures]) gesture.cancel();
    this.gestures.clear();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.detachArrowKeyListener();
  }

  private later(fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    });
    this.timers.add(timer);
  }

  private track(
    event: GanttPointerLike,
    callbacks: Parameters<typeof beginGanttGesture>[1],
  ): void {
    let handle: GanttGestureHandle | null = null;
    handle = beginGanttGesture(event, {
      onMove: callbacks.onMove,
      onFinish: (commit, cancelled) => {
        if (handle !== null) this.gestures.delete(handle);
        callbacks.onFinish(commit, cancelled);
      },
    });
    this.gestures.add(handle);
  }

  private focusRovingRow(): void {
    this.later(() => {
      this.host
        .hostElement()
        ?.querySelector<HTMLElement>('[data-focus-target]')
        ?.focus();
    });
  }

  /* ---------------- undo / redo ---------------- */

  /**
   * Runs several mutations as one undo step with one auto-scheduling pass
   * at the end (bulk delete / indent, predecessor edits, baselines).
   */
  private batch(fn: () => void): void {
    this.batchDepth++;
    try {
      fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) {
        this.batchSnapshotted = false;
        if (this.pendingSchedule) {
          this.pendingSchedule = false;
          this.runAutoSchedule();
        }
      }
    }
  }

  private snapshot(): void {
    if (this.batchDepth > 0) {
      if (this.batchSnapshotted) return;
      this.batchSnapshotted = true;
    }
    const limit = this.inputs.config().undoLimit ?? 50;
    this.undoStack.set(
      [
        ...this.undoStack(),
        { tasks: this.taskStore(), dependencies: this.dependencyStore() },
      ].slice(-limit),
    );
    this.redoStack.set([]);
  }

  /** Reverts the last committed change (bounded snapshot stack). */
  undo(): void {
    this.run(() => {
      const stack = this.undoStack();
      const last = stack.at(-1);
      if (last === undefined) return;
      this.redoStack.set([
        ...this.redoStack(),
        { tasks: this.taskStore(), dependencies: this.dependencyStore() },
      ]);
      this.undoStack.set(stack.slice(0, -1));
      this.taskStore.set(last.tasks);
      this.dependencyStore.set(last.dependencies);
      this.announcement.set(this.msg().announcements.undone);
    });
  }

  /** Re-applies the last undone change. */
  redo(): void {
    this.run(() => {
      const stack = this.redoStack();
      const last = stack.at(-1);
      if (last === undefined) return;
      this.undoStack.set([
        ...this.undoStack(),
        { tasks: this.taskStore(), dependencies: this.dependencyStore() },
      ]);
      this.redoStack.set(stack.slice(0, -1));
      this.taskStore.set(last.tasks);
      this.dependencyStore.set(last.dependencies);
      this.announcement.set(this.msg().announcements.redone);
    });
  }

  /* ---------------- virtualization ---------------- */

  /** Reads the shared body's scroll offset and viewport height. */
  onBodyScroll(): void {
    const body = this.host.bodyElement();
    if (body === null) return;
    this.scrollTop.set(body.scrollTop);
    this.viewportPx.set(body.clientHeight);
  }

  rowIndexOf(task: GanttTask<T>): number {
    return this.rowIndexByKey().get(task.key) ?? 0;
  }

  /** The today marker's chart x, or `null` when today is off the range. */
  todayPx(): number | null {
    const scale = this.scale();
    const now = new Date();
    if (
      now.getTime() < scale.start.getTime() ||
      now.getTime() > scale.end.getTime()
    ) {
      return null;
    }
    return dateToPx(scale, now);
  }

  /* ---------------- labels ---------------- */

  cellText(
    task: GanttTask<T>,
    column: { field: string; format?: (task: GanttTask) => string },
  ): string {
    if (column.format !== undefined) return column.format(task);
    const locale = this.effectiveLocale();
    const msg = this.msg();
    const dateFormat = ogeDateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    });
    const realKey = this.realKeyOf(task) ?? task.key;
    switch (column.field) {
      case 'title':
        return task.title;
      case 'start':
        return dateFormat.format(task.start);
      case 'end':
        return dateFormat.format(task.end);
      case 'duration': {
        const days = Math.round(
          (task.end.getTime() - task.start.getTime()) / 86_400_000,
        );
        return msg.columns.durationDays.replace('{days}', String(days));
      }
      case 'progress':
        return `${task.progress}%`;
      case 'wbs':
        return task.wbs;
      case 'predecessors':
        return formatGanttPredecessors(
          this.incomingLinks().get(realKey) ?? [],
          { days: msg.scheduling.lagDays, hours: msg.scheduling.lagHours },
        );
      case 'totalSlack':
      case 'freeSlack': {
        const slack = this.slack().get(realKey);
        if (slack === undefined) return '';
        const value =
          column.field === 'totalSlack' ? slack.totalSlack : slack.freeSlack;
        return msg.columns.slackDays.replace(
          '{days}',
          ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(value),
        );
      }
      case 'constraint':
        return task.constraintType === 'ASAP'
          ? ''
          : task.constraintDate !== undefined
            ? `${task.constraintType} ${dateFormat.format(task.constraintDate)}`
            : task.constraintType;
      case 'deadline':
        return task.deadline !== undefined
          ? dateFormat.format(task.deadline)
          : '';
      case 'resources':
        return this.resourceText(task) ?? '';
      case 'units':
        return task.units.map((units) => `${units}%`).join(', ');
      case 'effort':
        return task.effort === undefined
          ? ''
          : msg.columns.effortHours.replace('{hours}', String(task.effort));
      default: {
        if (task.source == null) return '';
        const value = (task.source as Record<string, unknown>)[column.field];
        if (value instanceof Date) return dateFormat.format(value);
        return value == null ? '' : String(value);
      }
    }
  }

  /** The resolved column of `field` (a bare `{ field }` when hidden). */
  private columnFor(field: string): {
    field: string;
    format?: (task: GanttTask) => string;
  } {
    return (
      this.resolvedColumns().find((column) => column.field === field) ?? {
        field,
      }
    );
  }

  paneAriaLabel(): string {
    return `${this.msg().grid.treeLabel}. ${this.msg().grid.treeHint}`;
  }

  taskAriaLabel(task: GanttTask<T>): string {
    const format = ogeDateTimeFormat(this.effectiveLocale(), {
      dateStyle: 'medium',
    });
    const msg = this.msg();
    const parts = [
      msg.grid.taskLabel
        .replace('{title}', task.title)
        .replace('{start}', format.format(task.start))
        .replace('{end}', format.format(task.end))
        .replace('{progress}', String(task.progress)),
    ];
    if (task.manuallyScheduled && !task.isSummary) {
      parts.push(msg.scheduling.manual);
    }
    if (
      task.deadline !== undefined &&
      task.end.getTime() > task.deadline.getTime()
    ) {
      parts.push(msg.scheduling.overdue);
    }
    const key = this.realKeyOf(task) ?? task.key;
    for (const conflict of this.conflicts()) {
      if (conflict.key === key && conflict.kind !== 'deadline') {
        parts.push(conflict.message);
      }
    }
    return parts.join(', ');
  }

  /** The deadline marker's title. */
  deadlineTitle(task: GanttTask<T>): string {
    if (task.deadline === undefined) return '';
    return formatGanttMessage(this.msg().scheduling.deadline, {
      date: ogeDateTimeFormat(this.effectiveLocale(), {
        dateStyle: 'medium',
      }).format(task.deadline),
    });
  }

  private conflictMessage(
    conflict: GanttSchedulingConflict,
    task: GanttTask,
    links: ReadonlyMap<RowKey, GanttDependency<D>>,
  ): string {
    const msg = this.msg().scheduling;
    const date =
      conflict.date !== undefined
        ? ogeDateTimeFormat(this.effectiveLocale(), {
            dateStyle: 'medium',
          }).format(conflict.date)
        : '';
    switch (conflict.kind) {
      case 'dependency': {
        const link =
          conflict.dependencyKey !== undefined
            ? links.get(conflict.dependencyKey)
            : undefined;
        return formatGanttMessage(msg.conflictDependency, {
          title: task.title,
          type: link !== undefined ? msg.dependencyTypes[link.type] : '',
        });
      }
      case 'constraint':
        return formatGanttMessage(msg.conflictConstraint, {
          title: task.title,
          constraint:
            conflict.constraintType !== undefined
              ? msg.constraintTypes[conflict.constraintType]
              : '',
          date,
        });
      case 'deadline':
        return formatGanttMessage(msg.conflictDeadline, {
          title: task.title,
          date,
        });
    }
  }

  /** Child milestones of a summary, in chart px. */
  private rollupsOf(summaryKey: RowKey, scale: GanttScale): GanttRollup[] {
    const all = this.allTasks();
    const parentOf = new Map(all.map((task) => [task.key, task.parentKey]));
    const result: GanttRollup[] = [];
    for (const task of all) {
      if (!task.isMilestone) continue;
      let parent = task.parentKey;
      while (parent !== null && parent !== summaryKey) {
        parent = parentOf.get(parent) ?? null;
      }
      if (parent === summaryKey) {
        result.push({
          key: task.key,
          title: task.title,
          px: dateToPx(scale, task.start),
        });
      }
    }
    return result;
  }

  majorLabel(date: Date): string {
    const scale = this.scale();
    const locale = this.effectiveLocale();
    if (scale.type === 'hours') {
      return ogeDateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    }
    if (scale.type === 'quarters') {
      return ogeDateTimeFormat(locale, { year: 'numeric' }).format(date);
    }
    if (scale.type === 'years') {
      const year = date.getFullYear();
      return formatGanttMessage(this.msg().scales.decadeLabel, {
        start: String(year),
        end: String(year + 9),
      });
    }
    return ogeDateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  minorLabel(date: Date): string {
    const scale = this.scale();
    const locale = this.effectiveLocale();
    switch (scale.type) {
      case 'hours':
        return ogeDateTimeFormat(locale, { hour: 'numeric' }).format(date);
      case 'days':
        return String(date.getDate());
      case 'weeks':
        return ogeDateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
        }).format(date);
      case 'months':
        return ogeDateTimeFormat(locale, { month: 'short' }).format(date);
      case 'quarters':
        return formatGanttMessage(this.msg().scales.quarterLabel, {
          quarter: String(Math.floor(date.getMonth() / 3) + 1),
        });
      case 'years':
        return ogeDateTimeFormat(locale, { year: 'numeric' }).format(date);
    }
  }

  /** Readable text color over a custom bar color, or `null`. */
  barForeground(task: GanttTask<T>): string | null {
    if (task.color === undefined) return null;
    const parsed = parseColor(task.color);
    return parsed === null ? null : contrastForeground(parsed);
  }

  /** Joined names of the task's resources, or `null`. */
  resourceText(task: GanttTask<T>): string | null {
    const resources = this.inputs.resources();
    if (resources.length === 0 || task.resourceIds.length === 0) return null;
    const names = task.resourceIds
      .map((id) => resources.find((resource) => resource.id === id)?.text)
      .filter((text): text is string => text !== undefined);
    return names.length === 0 ? null : names.join(', ');
  }

  resourceLabelLeft(bar: GanttBar<T>): number {
    const extra = this.inputs.taskTitlePosition() === 'outside' ? 90 : 8;
    return bar.leftPx + bar.widthPx + extra;
  }

  tooltipDates(task: GanttTask<T>): string {
    const format = ogeDateTimeFormat(this.effectiveLocale(), {
      day: 'numeric',
      month: 'short',
    });
    const days = Math.max(
      1,
      Math.round((task.end.getTime() - task.start.getTime()) / 86_400_000),
    );
    const duration = this.msg().columns.durationDays.replace(
      '{days}',
      String(days),
    );
    return `${format.format(task.start)} – ${format.format(task.end)} · ${duration}`;
  }

  /** The tooltip's top offset: below the bar on the first two rows. */
  tooltipTop(bar: GanttBar<T>): number {
    return bar.index < 2
      ? this.scaleHeadH + (bar.index + 1) * this.rowHeight() + 6
      : this.scaleHeadH + bar.index * this.rowHeight() - 6;
  }

  /** The drag tip's top offset under the sticky scale header. */
  dragTipTop(tip: { y: number }): number {
    return this.scaleHeadH + Math.max(4, tip.y);
  }

  /* ---------------- selection / expansion / keyboard ---------------- */

  /** Toggles a summary row; stops the event so the row click does not fire. */
  toggleExpanded(
    task: GanttTask<T>,
    event?: { stopPropagation(): void },
  ): void {
    event?.stopPropagation();
    this.run(() => {
      const next = new Set(this.collapsedKeys());
      if (next.has(task.key)) next.delete(task.key);
      else next.add(task.key);
      this.collapsedKeys.set(next);
    });
  }

  /** Expands every summary task. */
  expandAll(): void {
    this.collapsedKeys.set(new Set());
  }

  /** Collapses every summary task. */
  collapseAll(): void {
    this.run(() =>
      this.collapsedKeys.set(
        new Set(
          this.allTasks()
            .filter((task) => task.hasChildren)
            .map((task) => task.key),
        ),
      ),
    );
  }

  /** Collapses summaries at or below `level` (dx expandAllToLevel parity). */
  expandAllToLevel(level: number): void {
    this.run(() =>
      this.collapsedKeys.set(
        new Set(
          this.allTasks()
            .filter((task) => task.hasChildren && task.level >= level)
            .map((task) => task.key),
        ),
      ),
    );
  }

  /** Expands every ancestor of `key` and scrolls its row into view. */
  expandToTask(key: RowKey): void {
    this.run(() => {
      const all = this.allTasks();
      const byKey = new Map(all.map((task) => [task.key, task]));
      const next = new Set(this.collapsedKeys());
      let current = byKey.get(key)?.parentKey ?? null;
      while (current !== null) {
        next.delete(current);
        current = byKey.get(current)?.parentKey ?? null;
      }
      this.collapsedKeys.set(next);
      const index = this.rowIndexByKey().get(key);
      const body = this.host.bodyElement();
      if (index !== undefined && body !== null) {
        body.scrollTop = Math.max(0, index * this.rowHeight() - 80);
      }
      this.focusKey.set(key);
    });
  }

  /**
   * The real task key behind a row: itself in the task view, the assigned
   * task for a resource-view row, `null` for a resource group row.
   */
  realKeyOf(task: GanttTask<T>): RowKey | null {
    const map = this.realKeys();
    return map.has(task.key) ? (map.get(task.key) ?? null) : task.key;
  }

  /** A resource group row of the resource view (not a task). */
  isGroupRow(task: GanttTask<T>): boolean {
    return (
      typeof task.key === 'string' &&
      task.key.startsWith(GANTT_RESOURCE_ROW_PREFIX) &&
      this.realKeyOf(task) === null
    );
  }

  /** Whether the row is part of the selection. */
  isSelected(task: GanttTask<T>): boolean {
    const key = this.realKeyOf(task);
    return key !== null && this.selectedKeys().has(key);
  }

  /** Every selected task, in tree order. */
  getSelectedTasks(): GanttTask<T>[] {
    return this.run(() => {
      const keys = this.selectedKeys();
      return this.allTasks().filter((task) => keys.has(task.key));
    });
  }

  private visibleRealKeys(): RowKey[] {
    return this.visibleTasks()
      .map((task) => this.realKeyOf(task))
      .filter((key): key is RowKey => key !== null);
  }

  private select(
    task: GanttTask<T> | null,
    modifiers?: { readonly toggle: boolean; readonly range: boolean },
  ): void {
    const key = task === null ? null : this.realKeyOf(task);
    if (task !== null && key === null) return; // a resource group row
    const multiple = this.selectionMode() === 'multiple';
    let keys: RowKey[];
    if (key === null) keys = [];
    else if (
      !multiple ||
      modifiers === undefined ||
      (!modifiers.toggle && !modifiers.range)
    ) {
      keys = [key];
    } else {
      keys = nextGanttSelection(
        [...this.selectedKeys()],
        this.visibleRealKeys(),
        this.selectionAnchor ?? this.inputs.selectedTaskKey() ?? key,
        key,
        modifiers,
      );
    }
    if (modifiers?.range !== true) this.selectionAnchor = key;
    const primary =
      key !== null && keys.includes(key) ? key : (keys.at(-1) ?? null);
    const primaryTask =
      task !== null && primary === key && this.viewMode() === 'tasks'
        ? task
        : null;
    this.commitSelection(keys, primary, primaryTask);
  }

  private commitSelection(
    keys: readonly RowKey[],
    primary: RowKey | null,
    primaryTask: GanttTask<T> | null = null,
  ): void {
    const multiple = this.selectionMode() === 'multiple';
    const current = this.selectedKeys();
    const samePrimary = this.inputs.selectedTaskKey() === primary;
    const sameSet =
      keys.length === current.size && keys.every((key) => current.has(key));
    if (samePrimary && sameSet) return;
    if (!samePrimary) this.events.selectedTaskKeyChange?.(primary);
    if (multiple && !sameSet) this.events.selectedTaskKeysChange?.([...keys]);
    const byKey = new Map(this.allTasks().map((entry) => [entry.key, entry]));
    this.events.selectionChanged?.({
      task:
        primaryTask ?? (primary !== null ? (byKey.get(primary) ?? null) : null),
      tasks: keys
        .map((entry) => byKey.get(entry))
        .filter((entry): entry is GanttTask<T> => entry !== undefined),
    });
    if (multiple && keys.length > 1) {
      this.announcement.set(
        ogeFormatMessage(
          this.msg().announcements.selectionCount,
          { count: keys.length },
          this.effectiveLocale(),
        ),
      );
    }
  }

  /** Selects every visible task (`selectionMode: 'multiple'`). */
  selectAll(): void {
    this.run(() => {
      if (this.selectionMode() !== 'multiple') return;
      const keys = this.visibleRealKeys();
      this.commitSelection(keys, this.inputs.selectedTaskKey() ?? keys[0] ?? null);
    });
  }

  /** Clears the selection. */
  clearSelection(): void {
    this.run(() => this.commitSelection([], null));
  }

  onRowClick(task: GanttTask<T>, event: MouseEvent): void {
    this.run(() => {
      this.focusKey.set(task.key);
      this.select(task, {
        toggle: event.ctrlKey || event.metaKey,
        range: event.shiftKey,
      });
    });
    this.events.taskClick?.({ task, event });
  }

  onRowDblClick(task: GanttTask<T>, event: MouseEvent): void {
    if (this.run(() => this.isGroupRow(task))) return;
    this.events.taskDblClick?.({ task, event });
    this.run(() => this.openEditDialog(task));
  }

  onRowContextMenu(task: GanttTask<T>, event: MouseEvent): void {
    this.events.taskContextMenu?.({ task, event });
    this.run(() => this.openMenu(task, event));
  }

  /* ---------------- built-in context menu ---------------- */

  private openMenu(task: GanttTask<T> | null, event: GanttMouseLike): void {
    if (!this.effectiveEditing()) return;
    event.preventDefault();
    const hostRect = this.host.hostElement()?.getBoundingClientRect();
    this.contextMenu.set({
      x: event.clientX - (hostRect?.left ?? 0),
      y: event.clientY - (hostRect?.top ?? 0),
      task,
    });
    if (task !== null && !this.isSelected(task)) this.select(task);
    this.later(() => {
      this.host
        .hostElement()
        ?.querySelector<HTMLElement>('.oge-gantt-menu-item:not(:disabled)')
        ?.focus();
    });
  }

  closeMenu(): void {
    this.contextMenu.set(null);
  }

  /** Escape on the focused menu closes it. */
  onMenuKeydown(event: { readonly key: string }): void {
    if (event.key === 'Escape') this.closeMenu();
  }

  /** Right-click on the chart: a bar opens its task menu, space the generic. */
  onCanvasContextMenu(event: MouseEvent): void {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-task-key]',
    );
    if (target !== null && target !== undefined) {
      const key = target.getAttribute('data-task-key');
      const task = this.run(() =>
        this.visibleTasks().find((entry) => String(entry.key) === key),
      );
      if (task !== undefined) {
        this.events.taskContextMenu?.({ task, event });
        this.run(() => this.openMenu(task, event));
        return;
      }
    }
    this.run(() => this.openMenu(null, event));
  }

  menuEdit(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (task) this.openEditDialog(task);
    });
  }

  menuNewTask(): void {
    this.closeMenu();
    this.showTaskDetailsDialog();
  }

  menuNewSubtask(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (!task) return;
      const start = new Date(
        task.start.getFullYear(),
        task.start.getMonth(),
        task.start.getDate(),
      );
      this.openCreateDialog(
        start,
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
        this.fields().key(task.source),
      );
    });
  }

  /** The menu's targets: the whole selection when the row is part of it. */
  private bulkTargets(task: GanttTask<T>): GanttTask<T>[] {
    if (this.selectionMode() === 'multiple' && this.isSelected(task)) {
      const selected = this.getSelectedTasks();
      if (selected.length > 1) return selected;
    }
    return [task];
  }

  menuDelete(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (!task || this.isGroupRow(task)) return;
      const targets = this.bulkTargets(task);
      if (targets.length > 1) {
        this.deleteTasks(targets.map((entry) => entry.source));
      } else {
        this.deleteTask(task.source);
      }
    });
  }

  menuIndent(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (!task) return;
      const targets = this.bulkTargets(task);
      if (targets.length > 1) this.indentTasks(targets);
      else this.indentTask(task);
    });
  }

  menuOutdent(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (!task) return;
      const targets = this.bulkTargets(task);
      if (targets.length > 1) this.outdentTasks(targets);
      else this.outdentTask(task);
    });
  }

  /* ---------------- indent / outdent ---------------- */

  /** The previous visible sibling — the indent target. */
  private previousSibling(task: GanttTask<T>): GanttTask<T> | null {
    const visible = this.visibleTasks();
    const index = visible.findIndex((entry) => entry.key === task.key);
    for (let i = index - 1; i >= 0; i--) {
      if (visible[i].parentKey === task.parentKey) return visible[i];
      if (visible[i].level < task.level) break;
    }
    return null;
  }

  canIndent(task: GanttTask<T>): boolean {
    return (
      this.viewMode() === 'tasks' &&
      this.inputs.allowTaskUpdating() &&
      this.effectiveEditing() &&
      this.previousSibling(task) !== null
    );
  }

  /** Makes the task a child of its previous sibling (MS Project parity). */
  indentTask(task: GanttTask<T>): void {
    this.run(() => {
      if (this.viewMode() !== 'tasks') return;
      const sibling = this.previousSibling(task);
      const names = this.fields().fieldNames;
      if (sibling === null || names.parentKey === null) return;
      if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) return;
      const patch = {
        [names.parentKey]: this.fields().key(sibling.source),
      } as Partial<T>;
      this.updateTask(task.source, patch);
      if (this.collapsedKeys().has(sibling.key)) {
        this.toggleExpanded(sibling);
      }
      this.announce(this.msg().announcements.indented, {
        title: task.title,
        parent: sibling.title,
      });
    });
  }

  /** Moves the task up to its grandparent (or the root). */
  outdentTask(task: GanttTask<T>): void {
    this.run(() => {
      const names = this.fields().fieldNames;
      if (this.viewMode() !== 'tasks') return;
      if (task.parentKey === null || names.parentKey === null) return;
      if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) return;
      const all = this.allTasks();
      const parent = all.find((entry) => entry.key === task.parentKey);
      const grandRaw =
        parent !== undefined && parent.parentKey !== null
          ? this.fields().key(
              all.find((entry) => entry.key === parent.parentKey)?.source as T,
            )
          : null;
      const patch = { [names.parentKey]: grandRaw } as Partial<T>;
      this.updateTask(task.source, patch);
      this.announce(this.msg().announcements.outdented, { title: task.title });
    });
  }

  /** Indents several tasks in tree order — one undo step. */
  indentTasks(tasks: readonly GanttTask<T>[]): void {
    this.bulkTreeEdit(tasks, 'indent');
  }

  /** Outdents several tasks — one undo step. */
  outdentTasks(tasks: readonly GanttTask<T>[]): void {
    this.bulkTreeEdit(tasks, 'outdent');
  }

  private bulkTreeEdit(
    tasks: readonly GanttTask<T>[],
    kind: 'indent' | 'outdent',
  ): void {
    this.run(() => {
      const wanted = new Set(tasks.map((task) => this.realKeyOf(task) ?? task.key));
      const keys = this.visibleTasks()
        .map((task) => task.key)
        .filter((key) => wanted.has(key));
      // outdent bottom-up so a parent and its child keep their relation
      if (kind === 'outdent') keys.reverse();
      let count = 0;
      this.batch(() => {
        for (const key of keys) {
          const current = this.visibleTasks().find((task) => task.key === key);
          if (current === undefined) continue;
          const before = current.parentKey;
          if (kind === 'indent') this.indentTask(current);
          else this.outdentTask(current);
          const after = this.allTasks().find((task) => task.key === key);
          if (after !== undefined && after.parentKey !== before) count++;
        }
      });
      if (count > 0) {
        this.announcement.set(
          ogeFormatMessage(
            kind === 'indent'
              ? this.msg().announcements.tasksIndented
              : this.msg().announcements.tasksOutdented,
            { count },
            this.effectiveLocale(),
          ),
        );
      }
    });
  }

  /** Deletes several tasks (and their links) — one undo step. */
  deleteTasks(items: readonly T[]): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowTaskDeleting()) return;
      const before = this.taskStore().length;
      this.batch(() => {
        for (const item of items) this.deleteTask(item);
      });
      const removed = before - this.taskStore().length;
      if (removed > 0) {
        this.announcement.set(
          ogeFormatMessage(
            this.msg().announcements.tasksDeleted,
            { count: removed },
            this.effectiveLocale(),
          ),
        );
        this.commitSelection([], null);
      }
    });
  }

  /** Escape anywhere in the pane clears the selection. */
  onPaneKeydown(event: { readonly key: string }): void {
    if (event.key === 'Escape') this.run(() => this.select(null));
  }

  /**
   * The treegrid keyboard map: Up/Down move the roving row, Right/Left
   * expand/collapse (or go to the parent), Enter edits, Delete deletes,
   * Alt+Shift+Right/Left indent/outdent, Ctrl+Left/Right move the bar and
   * Ctrl+Shift+Left/Right resize its end.
   */
  onRowKeydown(task: GanttTask<T>, rawEvent: GanttKeyLike): void {
    this.run(() => {
      // the map below is written in logical terms; RTL swaps Left/Right
      const event = mirrorGanttKey(rawEvent, this.rtl());
      const visible = this.visibleTasks();
      const index = this.rowIndexOf(task);
      const focusRow = (next: GanttTask<T> | undefined): void => {
        if (next === undefined) return;
        event.preventDefault();
        this.focusKey.set(next.key);
        this.select(next);
        this.focusRovingRow();
      };
      const multiple = this.selectionMode() === 'multiple';
      if (event.key === 'F2') {
        event.preventDefault();
        this.beginCellEdit(task);
        return;
      }
      if (
        multiple &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        const next = visible[index + (event.key === 'ArrowDown' ? 1 : -1)];
        if (next !== undefined) {
          event.preventDefault();
          this.focusKey.set(next.key);
          this.select(next, { toggle: false, range: true });
          this.focusRovingRow();
        }
        return;
      }
      if (multiple && event.ctrlKey && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        this.selectAll();
        return;
      }
      if (multiple && event.ctrlKey && event.key === ' ') {
        event.preventDefault();
        this.select(task, { toggle: true, range: false });
        return;
      }
      if (event.ctrlKey && this.handleBarKey(task, event)) return;
      if (event.altKey && event.shiftKey) {
        // MS Project parity: Alt+Shift+Right indents, Alt+Shift+Left outdents
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const targets = this.bulkTargets(task);
          const indent = event.key === 'ArrowRight';
          if (targets.length > 1) {
            if (indent) this.indentTasks(targets);
            else this.outdentTasks(targets);
          } else if (indent) {
            this.indentTask(task);
          } else {
            this.outdentTask(task);
          }
          return;
        }
      }
      switch (event.key) {
        case 'ArrowDown':
          focusRow(visible[index + 1]);
          return;
        case 'ArrowUp':
          focusRow(visible[index - 1]);
          return;
        case 'ArrowRight':
          if (task.hasChildren && !task.expanded) {
            event.preventDefault();
            this.toggleExpanded(task);
          }
          return;
        case 'ArrowLeft':
          if (task.hasChildren && task.expanded) {
            event.preventDefault();
            this.toggleExpanded(task);
          } else if (task.parentKey !== null) {
            focusRow(visible.find((row) => row.key === task.parentKey));
          }
          return;
        case 'Enter':
          event.preventDefault();
          if (this.isGroupRow(task)) this.toggleExpanded(task);
          else this.openEditDialog(task);
          return;
        case 'Delete':
        case 'Backspace': {
          event.preventDefault();
          if (this.isGroupRow(task)) return;
          const targets = this.bulkTargets(task);
          if (targets.length > 1) {
            this.deleteTasks(targets.map((entry) => entry.source));
          } else {
            this.deleteTask(task.source);
          }
          return;
        }
        default:
          return;
      }
    });
  }

  /** Ctrl+Arrows move the focused bar; Ctrl+Shift resizes the end edge. */
  private handleBarKey(task: GanttTask<T>, event: GanttKeyLike): boolean {
    if (task.isSummary || task.source == null) return false;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
    if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) {
      return true;
    }
    event.preventDefault();
    const scale = this.scale();
    const tick = scale.ticks[0]?.widthPx ?? 40;
    // `event` arrives mirrored: ArrowRight always means "later"
    const deltaPx = event.key === 'ArrowRight' ? tick : -tick;
    const proposal = event.shiftKey
      ? proposeTaskResize(
          task,
          'end',
          deltaPx,
          scale,
          this.resolvedFirstDayOfWeek(),
        )
      : proposeTaskMove(task, deltaPx, scale, this.resolvedFirstDayOfWeek());
    this.commitProposal(task, proposal, event.shiftKey ? 'resized' : 'moved');
    return true;
  }

  /* ---------------- zoom / scrolling ---------------- */

  canZoom(direction: -1 | 1): boolean {
    return (
      stepGanttScale(
        this.run(() => this.inputs.scaleType()),
        direction,
      ) !== null
    );
  }

  /** Steps to the next finer scale. */
  zoomIn(): void {
    const next = stepGanttScale(
      this.run(() => this.inputs.scaleType()),
      -1,
    );
    if (next === null) return;
    this.tickWidthOverride.set(null);
    this.events.scaleTypeChange?.(next);
  }

  /** Steps to the next coarser scale. */
  zoomOut(): void {
    const next = stepGanttScale(
      this.run(() => this.inputs.scaleType()),
      1,
    );
    if (next === null) return;
    this.tickWidthOverride.set(null);
    this.events.scaleTypeChange?.(next);
  }

  /** Applies a zoom preset (index into `zoomOptions()`). */
  applyZoomPreset(index: number): void {
    const option = this.run(() => this.zoomOptions()[index]);
    if (option === undefined) return;
    this.tickWidthOverride.set(option.preset.tickWidth ?? null);
    if (this.run(() => this.inputs.scaleType()) !== option.preset.scaleType) {
      this.events.scaleTypeChange?.(option.preset.scaleType);
    }
  }

  /** Picks the finest scale whose full range fits the chart viewport. */
  zoomToFit(): void {
    const { range, firstDay } = this.run(() => ({
      range: this.dataRange(),
      firstDay: this.resolvedFirstDayOfWeek(),
    }));
    this.renderedRange.set(range);
    this.tickWidthOverride.set(null);
    const viewport = this.host.chartScrollElement()?.clientWidth ?? 800;
    this.events.scaleTypeChange?.(fitGanttScaleType(range, viewport, firstDay));
  }

  /** Scrolls the chart so `date` sits near the left edge. */
  scrollToDate(date: Date): void {
    const chart = this.host.chartScrollElement();
    if (chart === null) return;
    const offset = Math.max(
      0,
      dateToPx(
        this.run(() => this.scale()),
        date,
      ) - 40,
    );
    // RTL scroll offsets run from 0 at the start edge towards negative
    chart.scrollLeft = this.run(() => this.rtl()) ? -offset : offset;
  }

  /** Today button: scrolls the chart to the current date. */
  goToday(): void {
    this.scrollToDate(new Date());
  }

  /**
   * Snapshot for the exporters: every task in tree order regardless of
   * collapse state, the resolved columns with pane-identical text
   * formatting, the chart range and the critical-path keys.
   */
  getExportData(): OgeGanttExportData<T> {
    return this.run(() => {
      const tasks = this.allTasks();
      const scale = this.scale();
      const columns = this.resolvedColumns().map((column) => ({
        field: column.field,
        header: column.header,
        text: (task: OgeGanttTask<T>) => this.cellText(task, column),
      }));
      const slack = this.slack();
      const critical = new Set<RowKey>();
      for (const [key, value] of slack) {
        if (value.totalSlack <= 0) critical.add(key);
      }
      return {
        tasks,
        columns,
        rangeStart: scale.start,
        rangeEnd: scale.end,
        critical,
        resourceText: (task: OgeGanttTask<T>) => this.resourceText(task),
        dependencies: this.ganttDependencies(),
        resources: this.inputs.resources(),
        workCalendar: this.effectiveWorkCalendar(),
        slack,
      };
    });
  }

  /** Total and free slack of a leaf task (days), or `null`. */
  getTaskSlack(key: RowKey): GanttSlack | null {
    return this.run(() => this.slack().get(key) ?? null);
  }

  /* ---------------- sort / filter / columns ---------------- */

  /** Sorts the task list by a column (siblings within each parent). */
  sortBy(field: string | null, direction: 'asc' | 'desc' = 'asc'): void {
    this.run(() => {
      const next = field === null ? null : { field, direction };
      const current = this.sort();
      if (
        (current === null && next === null) ||
        (current !== null &&
          next !== null &&
          current.field === next.field &&
          current.direction === next.direction)
      ) {
        return;
      }
      this.sort.set(next);
      this.events.sortChanged?.({
        field: next?.field ?? null,
        direction: next?.direction ?? null,
      });
      const msg = this.msg().announcements;
      if (next === null) {
        this.announcement.set(msg.sortCleared);
      } else {
        this.announce(msg.sorted, {
          column: this.columnHeader(next.field),
          direction:
            next.direction === 'asc' ? msg.sortAscending : msg.sortDescending,
        });
      }
    });
  }

  /** Header click / Enter: ascending → descending → unsorted. */
  toggleSort(field: string): void {
    const current = this.run(() => this.sort());
    if (current === null || current.field !== field) this.sortBy(field, 'asc');
    else if (current.direction === 'asc') this.sortBy(field, 'desc');
    else this.sortBy(null);
  }

  /** Sets one filter-row text (fold-insensitive "contains"). */
  setFilter(field: string, text: string): void {
    this.run(() => {
      this.filters.set({ ...this.filters(), [field]: text });
      this.announceFilteredLater();
    });
  }

  /** Sets the toolbar search text (matches any column). */
  setSearchText(text: string): void {
    this.run(() => {
      this.searchText.set(text);
      this.announceFilteredLater();
    });
  }

  /** Clears every filter-row text and the search. */
  clearFilters(): void {
    this.run(() => {
      this.filters.set({});
      this.searchText.set('');
    });
  }

  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  private announceFilteredLater(): void {
    if (this.filterTimer !== null) {
      clearTimeout(this.filterTimer);
      this.timers.delete(this.filterTimer);
    }
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.filterTimer = null;
      this.run(() => {
        if (!this.filtering()) return;
        this.announcement.set(
          ogeFormatMessage(
            this.msg().announcements.filtered,
            { count: this.visibleTasks().length },
            this.effectiveLocale(),
          ),
        );
      });
    }, 400);
    this.filterTimer = timer;
    this.timers.add(timer);
  }

  private columnHeader(field: string): string {
    return (
      this.resolvedColumns().find((column) => column.field === field)?.header ??
      field
    );
  }

  /** Sets a task-list column's width (clamped 40–600px). */
  setColumnWidth(field: string, widthPx: number): void {
    this.run(() => {
      const width = clampGanttColumnWidth(widthPx);
      if (this.columnWidths()[field] === width) return;
      this.columnWidths.set({ ...this.columnWidths(), [field]: width });
      this.events.columnResized?.({ field, widthPx: width });
      this.announce(this.msg().announcements.columnResized, {
        column: this.columnHeader(field),
        width: String(width),
      });
    });
  }

  /** Moves a task-list column to `toIndex` (frozen columns stay first). */
  moveColumn(field: string, toIndex: number): void {
    this.run(() => {
      const fields = this.resolvedColumns().map((column) => column.field);
      const from = fields.indexOf(field);
      if (from < 0) return;
      const next = moveGanttColumn(fields, field, toIndex);
      const to = next.indexOf(field);
      if (to === from) return;
      this.columnOrder.set(next);
      const landed = this.resolvedColumns().findIndex(
        (column) => column.field === field,
      );
      this.events.columnReordered?.({ field, fromIndex: from, toIndex: landed });
      this.announce(this.msg().announcements.columnMoved, {
        column: this.columnHeader(field),
        position: String(landed + 1),
      });
      this.headerFocusIndex.set(landed);
    });
  }

  /** Focuses a header cell (roving: one header in the Tab sequence). */
  focusHeader(index: number): void {
    this.headerFocusIndex.set(index);
    this.later(() => {
      this.host
        .hostElement()
        ?.querySelector<HTMLElement>(
          `.oge-gantt-pane-headcell[data-col-index="${index}"]`,
        )
        ?.focus();
    });
  }

  onHeaderClick(column: GanttResolvedColumn, index: number): void {
    if (this.suppressHeaderClick) {
      this.suppressHeaderClick = false;
      return;
    }
    this.focusHeader(index);
    if (column.sortable) this.toggleSort(column.field);
  }

  /**
   * Header keyboard: Left/Right/Home/End move between headers, Down enters
   * the rows, Enter/Space sorts, Alt+Left/Right resizes (Shift: 1px),
   * Ctrl+Shift+Left/Right moves the column. RTL mirrors the arrows.
   */
  onHeaderKeydown(index: number, rawEvent: GanttKeyLike): void {
    this.run(() => {
      const event = mirrorGanttKey(rawEvent, this.rtl());
      const columns = this.resolvedColumns();
      const column = columns[index];
      if (column === undefined) return;
      const forward = event.key === 'ArrowRight';
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        switch (event.key) {
          case 'Home':
            event.preventDefault();
            this.focusHeader(0);
            return;
          case 'End':
            event.preventDefault();
            this.focusHeader(columns.length - 1);
            return;
          case 'ArrowDown':
            event.preventDefault();
            this.focus();
            return;
          case 'Enter':
          case ' ':
            if (column.sortable) {
              event.preventDefault();
              this.toggleSort(column.field);
            }
            return;
          default:
            return;
        }
      }
      if (event.altKey && !event.ctrlKey) {
        if (!(this.inputs.allowColumnResizing?.() ?? false)) return;
        event.preventDefault();
        const step = event.shiftKey ? 1 : 10;
        this.setColumnWidth(
          column.field,
          column.widthPx + (forward ? step : -step),
        );
        return;
      }
      if (event.ctrlKey && event.shiftKey) {
        if (!(this.inputs.allowColumnReordering?.() ?? false)) return;
        event.preventDefault();
        this.moveColumn(column.field, index + (forward ? 1 : -1));
        this.focusHeader(this.headerFocusIndex());
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        this.focusHeader(
          Math.max(0, Math.min(columns.length - 1, index + (forward ? 1 : -1))),
        );
      }
    });
  }

  /** Pointer resize from a header's edge grip. */
  onColumnResizePointerDown(
    column: GanttResolvedColumn,
    event: GanttPointerLike,
  ): void {
    if (event.button !== 0) return;
    if (!this.run(() => this.inputs.allowColumnResizing?.() ?? false)) return;
    event.stopPropagation();
    const start = column.widthPx;
    const sign = this.run(() => this.rtl()) ? -1 : 1;
    const before = this.run(() => this.columnWidths());
    this.track(event, {
      onMove: (deltaX) => {
        this.columnWidths.set({
          ...this.columnWidths(),
          [column.field]: clampGanttColumnWidth(start + sign * deltaX),
        });
      },
      onFinish: (commit, cancelled) => {
        this.run(() => {
          const width = this.columnWidths()[column.field] ?? start;
          if (cancelled || !commit) {
            this.columnWidths.set(before);
            return;
          }
          // re-run the public path for the event + announcement
          this.columnWidths.set(before);
          this.setColumnWidth(column.field, width);
        });
      },
    });
  }

  /** Pointer drag of a header cell: drops the column where it is released. */
  onHeaderPointerDown(
    column: GanttResolvedColumn,
    event: GanttPointerLike,
  ): void {
    if (event.button !== 0) return;
    if (!this.run(() => this.inputs.allowColumnReordering?.() ?? false)) {
      return;
    }
    let lastX = event.clientX;
    this.track(event, {
      onMove: (_dx, _dy, moveEvent) => {
        lastX = moveEvent.clientX;
      },
      onFinish: (commit) => {
        if (!commit) return;
        this.suppressHeaderClick = true;
        this.later(() => (this.suppressHeaderClick = false));
        const cells = [
          ...(this.host
            .hostElement()
            ?.querySelectorAll<HTMLElement>('.oge-gantt-pane-headcell') ?? []),
        ];
        let target = -1;
        cells.forEach((cell, i) => {
          const rect = cell.getBoundingClientRect();
          if (lastX >= rect.left && lastX <= rect.right) target = i;
        });
        if (target >= 0) this.moveColumn(column.field, target);
      },
    });
  }

  /* ---------------- inline cell editing ---------------- */

  /** Inline editing is on and the Gantt is editable. */
  inlineEditingEnabled(): boolean {
    return (
      (this.inputs.inlineEditing?.() ?? false) &&
      this.effectiveEditing() &&
      this.inputs.allowTaskUpdating()
    );
  }

  /** Whether a cell can open an editor. */
  canEditCell(task: GanttTask<T>, column: GanttResolvedColumn): boolean {
    if (column.editor === null || task.source == null) return false;
    if (this.isGroupRow(task)) return false;
    // a summary's dates, progress and links roll up from its children
    if (
      task.isSummary &&
      ['start', 'end', 'duration', 'progress', 'predecessors'].includes(
        column.field,
      )
    ) {
      return false;
    }
    return true;
  }

  private editorValue(task: GanttTask<T>, column: GanttResolvedColumn): string {
    switch (column.field) {
      case 'start':
        return ganttDateInputValue(task.start);
      case 'end':
        return ganttDateInputValue(task.end);
      case 'deadline':
        return task.deadline !== undefined
          ? ganttDateInputValue(task.deadline)
          : '';
      case 'duration':
        return String(
          Math.round((task.end.getTime() - task.start.getTime()) / 86_400_000),
        );
      case 'progress':
        return String(task.progress);
      case 'effort':
        return task.effort === undefined ? '' : String(task.effort);
      case 'title':
        return task.title;
      case 'predecessors':
        return this.cellText(task, column);
      default: {
        const raw = (task.source as Record<string, unknown>)[column.field];
        if (raw instanceof Date) return ganttDateInputValue(raw);
        return raw == null ? '' : String(raw);
      }
    }
  }

  /**
   * Opens the inline editor on a cell (`field` unset = the first editable
   * column). Returns whether an editor opened.
   */
  beginCellEdit(task: GanttTask<T>, field?: string): boolean {
    return this.run(() => {
      if (!this.inlineEditingEnabled()) return false;
      const columns = this.resolvedColumns();
      const column =
        field !== undefined
          ? columns.find((entry) => entry.field === field)
          : columns.find((entry) => this.canEditCell(task, entry));
      if (column === undefined || !this.canEditCell(task, column)) return false;
      this.editingCell.set({
        key: task.key,
        field: column.field,
        editor: column.editor as GanttCellEditorType,
        value: this.editorValue(task, column),
      });
      this.focusKey.set(task.key);
      this.later(() => {
        const input = this.host
          .hostElement()
          ?.querySelector<HTMLInputElement>('.oge-gantt-cell-editor');
        input?.focus();
        if (input?.type === 'text') input.select();
      });
      return true;
    });
  }

  /** Double-click on a pane cell: edits it inline (when enabled). */
  onCellDblClick(
    task: GanttTask<T>,
    field: string,
    event: { stopPropagation(): void },
  ): void {
    if (this.beginCellEdit(task, field)) event.stopPropagation();
  }

  /** The editor's live text. */
  cellEditInput(value: string): void {
    const cell = this.run(() => this.editingCell());
    if (cell !== null) this.editingCell.set({ ...cell, value });
  }

  /** Closes the editor without writing. */
  cancelCellEdit(): void {
    this.editingCell.set(null);
    this.focusRovingRow();
  }

  /** The editor lost focus: commits when it is still the open one. */
  onCellEditorBlur(key: RowKey, field: string): void {
    const cell = this.run(() => this.editingCell());
    if (cell !== null && cell.key === key && cell.field === field) {
      this.commitCellEdit(0);
    }
  }

  /** Enter commits, Escape cancels, Tab / Shift+Tab commit and move. */
  onCellEditorKeydown(event: GanttEditorKeyLike): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitCellEdit(0);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelCellEdit();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.commitCellEdit(event.shiftKey ? -1 : 1);
    }
  }

  /**
   * Writes the open editor's value through the update pipeline (one undo
   * step), then optionally opens the next/previous editable cell.
   */
  commitCellEdit(move: -1 | 0 | 1 = 0): void {
    this.run(() => {
      const cell = this.editingCell();
      if (cell === null) return;
      this.editingCell.set(null);
      const task = this.visibleTasks().find((entry) => entry.key === cell.key);
      if (task === undefined) return;
      if (!this.applyCellValue(task, cell)) {
        this.announce(this.msg().announcements.cellInvalid, {
          column: this.columnHeader(cell.field),
        });
      }
      if (move === 0) {
        this.focusRovingRow();
        return;
      }
      const fresh =
        this.visibleTasks().find((entry) => entry.key === cell.key) ?? task;
      const columns = this.resolvedColumns();
      let index = columns.findIndex((column) => column.field === cell.field);
      for (let i = 0; i < columns.length; i++) {
        index += move;
        if (index < 0 || index >= columns.length) break;
        if (this.canEditCell(fresh, columns[index])) {
          this.beginCellEdit(fresh, columns[index].field);
          return;
        }
      }
      this.focusRovingRow();
    });
  }

  private applyCellValue(task: GanttTask<T>, cell: GanttCellEditState): boolean {
    const fields = this.fields();
    const value = cell.value;
    const update = (change: GanttTaskChange): void => {
      this.applyPatch(
        task,
        ganttTaskPatch(task.source, change, fields),
        'taskUpdated',
        { title: task.title },
      );
    };
    const number = (): number | null => {
      const parsed = Number(value.trim().replace(',', '.'));
      return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
    };
    switch (cell.field) {
      case 'title':
        if (value !== task.title) update({ title: value });
        return true;
      case 'start': {
        const date = parseGanttDateInput(value);
        if (date === null) return false;
        const shift = date.getTime() - startOfDay(task.start).getTime();
        if (shift === 0) return true;
        const start = new Date(task.start.getTime() + shift);
        const end = new Date(task.end.getTime() + shift);
        update({
          start,
          end,
          ...(task.segments.length > 1
            ? { segments: this.reshapeSegments(task, { start, end }) }
            : {}),
        });
        return true;
      }
      case 'end': {
        const date = parseGanttDateInput(value);
        if (date === null || date.getTime() < startOfDay(task.start).getTime()) {
          return false;
        }
        const end = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          task.end.getHours(),
          task.end.getMinutes(),
        );
        const clamped = end.getTime() < task.start.getTime() ? task.start : end;
        if (clamped.getTime() === task.end.getTime()) return true;
        update({
          end: clamped,
          ...(task.segments.length > 1
            ? {
                segments: this.reshapeSegments(task, {
                  start: task.start,
                  end: clamped,
                }),
              }
            : {}),
        });
        return true;
      }
      case 'duration': {
        const days = number();
        if (days === null || days < 0) return false;
        const calendar = this.calendarFor()(task);
        const end =
          calendar !== undefined && days > 0
            ? addWorkingDays(task.start, days, calendar)
            : new Date(
                task.start.getFullYear(),
                task.start.getMonth(),
                task.start.getDate() + days,
                task.start.getHours(),
                task.start.getMinutes(),
              );
        if (end.getTime() !== task.end.getTime()) update({ end });
        return true;
      }
      case 'progress': {
        const progress = number();
        if (progress === null || progress < 0 || progress > 100) return false;
        if (progress !== task.progress) update({ progress });
        return true;
      }
      case 'deadline': {
        if (value.trim() === '') {
          if (task.deadline !== undefined) update({ deadline: null });
          return true;
        }
        const date = parseGanttDateInput(value);
        if (date === null) return false;
        update({ deadline: date });
        return true;
      }
      case 'effort': {
        const hours = number();
        if (hours === null || hours < 0) return false;
        update({ effort: hours });
        return true;
      }
      case 'predecessors': {
        const key = this.realKeyOf(task) ?? task.key;
        const entries = parseGanttPredecessors(
          value,
          this.allTasks()
            .map((entry) => entry.key)
            .filter((entry) => entry !== key),
        );
        if (entries === null) return false;
        this.applyPredecessors(key, entries);
        return true;
      }
      default: {
        let next: unknown = value;
        if (cell.editor === 'number' || cell.editor === 'duration') {
          const parsed = number();
          if (parsed === null && value.trim() !== '') return false;
          next = parsed;
        } else if (cell.editor === 'date') {
          const date = parseGanttDateInput(value);
          if (date === null && value.trim() !== '') return false;
          next = date;
        }
        this.applyPatch(task, { [cell.field]: next } as Partial<T>, 'taskUpdated', {
          title: task.title,
        });
        return true;
      }
    }
  }

  /** Diffs a predecessor cell against the task's links — one undo step. */
  private applyPredecessors(
    successorKey: RowKey,
    entries: readonly {
      key: RowKey;
      type: OgeGanttDependencyType;
      lag: number;
      lagUnit: GanttLagUnit;
    }[],
  ): void {
    const current = this.incomingLinks().get(successorKey) ?? [];
    this.batch(() => {
      for (const link of current) {
        const keep = entries.find((entry) => entry.key === link.predecessorKey);
        if (keep === undefined) {
          this.deleteDependency(link.source);
        } else if (
          keep.type !== link.type ||
          keep.lag !== link.lag ||
          keep.lagUnit !== link.lagUnit
        ) {
          this.updateDependency(
            link.source,
            this.dependencyPatch({
              type: keep.type,
              lag: keep.lag,
              lagUnit: keep.lagUnit,
            }),
          );
        }
      }
      for (const entry of entries) {
        if (current.some((link) => link.predecessorKey === entry.key)) continue;
        this.insertDependency(entry.key, successorKey, entry.type, {
          lag: entry.lag,
          lagUnit: entry.lagUnit,
        });
      }
    });
  }

  /* ---------------- baselines / view mode / scheduling ---------------- */

  /** Shows baseline `index` (0-based); `-1` hides baselines. */
  setBaselineIndex(index: number): void {
    this.events.baselineIndexChange?.(index);
  }

  /**
   * Saves every leaf task's current dates as baseline `index` (0-based) —
   * one undo step through the update pipeline (MS Project "Set Baseline").
   */
  setBaseline(index = 0): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) return;
      const fields = this.fields();
      const names = fields.fieldNames;
      this.batch(() => {
        for (const task of this.allTasks()) {
          if (task.isSummary) continue;
          let patch: Partial<T>;
          if (names.baselines !== null) {
            const baselines = [...task.baselines];
            while (baselines.length < index) {
              baselines.push({ start: task.start, end: task.end });
            }
            baselines[index] = { start: task.start, end: task.end };
            patch = ganttTaskPatch(task.source, { baselines }, fields);
          } else if (
            index === 0 &&
            names.baselineStart !== null &&
            names.baselineEnd !== null
          ) {
            patch = {
              [names.baselineStart]: task.start,
              [names.baselineEnd]: task.end,
            } as Partial<T>;
          } else {
            continue;
          }
          this.applyPatch(task, patch, 'taskUpdated', { title: task.title });
        }
      });
      this.announce(this.msg().announcements.baselineSaved, {
        index: String(index + 1),
      });
    });
  }

  /** Switches between the task list and the resource view. */
  setViewMode(mode: OgeGanttViewMode): void {
    if (this.run(() => this.viewMode()) === mode) return;
    this.editingCell.set(null);
    this.events.viewModeChange?.(mode);
  }

  /** Toolbar toggle of the resource view. */
  toggleViewMode(): void {
    this.setViewMode(
      this.run(() => this.viewMode()) === 'tasks' ? 'resources' : 'tasks',
    );
  }

  /**
   * Runs the scheduling engine now — even with `autoScheduling` off — as one
   * undo step (forward + ALAP backward pass, constraints, lag).
   */
  scheduleProject(): void {
    this.run(() => {
      if (!this.effectiveEditing()) return;
      this.applySchedule(true);
      this.announcement.set(this.msg().announcements.scheduled);
    });
  }

  /**
   * Emits `schedulingConflict` when the conflict set changed. Reads the
   * conflicts tracked: the host calls it from an effect (Angular) or after
   * each render (React).
   */
  syncConflicts(): void {
    const conflicts = this.conflicts();
    const signature = conflicts
      .map(
        (conflict) =>
          `${String(conflict.key)}|${conflict.kind}|${String(conflict.dependencyKey ?? '')}|${conflict.constraintType ?? ''}`,
      )
      .join(';');
    if (signature === this.lastConflictSignature) return;
    this.lastConflictSignature = signature;
    this.events.schedulingConflict?.({ conflicts });
  }

  /* ---------------- dependency editor ---------------- */

  private lastArrowPoint: { x: number; y: number } | null = null;

  /** Opens the type / lag editor of a link (double-click or Enter). */
  openDependencyEditor(
    dependency: GanttDependency<D>,
    point?: { readonly clientX: number; readonly clientY: number },
  ): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowDependencyAdding()) {
        return;
      }
      const hostRect = this.host.hostElement()?.getBoundingClientRect();
      const x = point?.clientX ?? this.lastArrowPoint?.x ?? 0;
      const y = point?.clientY ?? this.lastArrowPoint?.y ?? 0;
      this.detachArrowKeyListener();
      this.dependencyEditor.set({
        dependency,
        type: dependency.type,
        lag: dependency.lag,
        lagUnit: dependency.lagUnit,
        x: Math.max(8, x - (hostRect?.left ?? 0)),
        y: Math.max(8, y - (hostRect?.top ?? 0) + 8),
      });
      this.later(() => {
        this.host
          .hostElement()
          ?.querySelector<HTMLElement>('.oge-gantt-dep-editor select')
          ?.focus();
      });
    });
  }

  /** Double-click on an arrow. */
  onArrowDblClick(
    dependency: GanttDependency<D>,
    event: {
      readonly clientX: number;
      readonly clientY: number;
      stopPropagation(): void;
    },
  ): void {
    event.stopPropagation();
    this.openDependencyEditor(dependency, event);
  }

  /** Live edits of the open dependency editor. */
  dependencyEditorChange(
    change: Partial<{
      type: OgeGanttDependencyType;
      lag: number;
      lagUnit: GanttLagUnit;
    }>,
  ): void {
    const state = this.run(() => this.dependencyEditor());
    if (state === null) return;
    this.dependencyEditor.set({
      ...state,
      ...change,
      lag:
        change.lag !== undefined && Number.isFinite(change.lag)
          ? change.lag
          : state.lag,
    });
  }

  /** Writes the editor's type / lag through `updateDependency`. */
  saveDependencyEditor(): void {
    this.run(() => {
      const state = this.dependencyEditor();
      if (state === null) return;
      this.dependencyEditor.set(null);
      const { dependency } = state;
      if (
        state.type !== dependency.type ||
        state.lag !== dependency.lag ||
        state.lagUnit !== dependency.lagUnit
      ) {
        if (
          state.type !== dependency.type &&
          wouldCreateCycle(
            this.ganttDependencies().filter((dep) => dep.key !== dependency.key),
            dependency.predecessorKey,
            dependency.successorKey,
          )
        ) {
          this.announcement.set(this.msg().announcements.dependencyRejected);
          return;
        }
        this.updateDependency(
          dependency.source,
          this.dependencyPatch({
            type: state.type,
            lag: state.lag,
            lagUnit: state.lagUnit,
          }),
        );
      }
      this.focusChart();
    });
  }

  /** The editor's Delete button. */
  deleteFromDependencyEditor(): void {
    this.run(() => {
      const state = this.dependencyEditor();
      this.dependencyEditor.set(null);
      if (state !== null) this.deleteDependency(state.dependency.source);
      this.focusChart();
    });
  }

  /** Closes the editor without writing (Escape / Cancel). */
  closeDependencyEditor(): void {
    this.dependencyEditor.set(null);
    this.focusChart();
  }

  onDependencyEditorKeydown(event: {
    readonly key: string;
    preventDefault(): void;
    stopPropagation(): void;
  }): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeDependencyEditor();
    }
  }

  private focusChart(): void {
    this.later(() => this.host.chartScrollElement()?.focus());
  }

  /** The dependency fields a type / lag change writes (string exprs only). */
  private dependencyPatch(change: {
    type?: OgeGanttDependencyType;
    lag?: number;
    lagUnit?: GanttLagUnit;
  }): Partial<D> {
    const patch: Record<string, unknown> = {};
    const typeExpr = this.inputs.dependencyTypeExpr();
    const lagExpr = this.inputs.dependencyLagExpr?.() ?? 'lag';
    const unitExpr = this.inputs.dependencyLagUnitExpr?.() ?? 'lagUnit';
    if (change.type !== undefined && typeof typeExpr === 'string') {
      patch[typeExpr] = change.type;
    }
    if (change.lag !== undefined && typeof lagExpr === 'string') {
      patch[lagExpr] = change.lag;
    }
    if (change.lagUnit !== undefined && typeof unitExpr === 'string') {
      patch[unitExpr] = change.lagUnit;
    }
    return patch as Partial<D>;
  }

  /** Focuses the roving task row. */
  focus(): void {
    this.run(() => {
      const key = this.focusKey() ?? this.visibleTasks()[0]?.key;
      if (key === undefined) return;
      this.focusKey.set(key);
      this.focusRovingRow();
    });
  }

  /* ---------------- splitter ---------------- */

  onSplitterPointerDown(event: GanttPointerLike): void {
    if (event.button !== 0) return;
    const startWidth = this.run(() => this.listWidth());
    // RTL: the pane sits on the right, so dragging left widens it
    const sign = this.run(() => this.rtl()) ? -1 : 1;
    this.track(event, {
      onMove: (deltaX) => {
        this.listWidth.set(
          Math.min(
            GANTT_LIST_WIDTH_MAX,
            Math.max(GANTT_LIST_WIDTH_MIN, startWidth + sign * deltaX),
          ),
        );
      },
      onFinish: () => undefined,
    });
  }

  /* ---------------- bar gestures ---------------- */

  onBarPointerDown(
    bar: GanttBar<T>,
    kind: GanttBarGestureKind,
    event: GanttPointerLike,
  ): void {
    if (
      !this.effectiveEditing() ||
      !this.inputs.allowTaskUpdating() ||
      event.button !== 0 ||
      bar.task.isSummary
    ) {
      return;
    }
    if (kind !== 'move') event.stopPropagation();
    const { scale, firstDay, rtl } = this.run(() => ({
      scale: this.scale(),
      firstDay: this.resolvedFirstDayOfWeek(),
      rtl: this.rtl(),
    }));
    const dateFormat = ogeDateTimeFormat(this.effectiveLocale(), {
      day: 'numeric',
      month: 'short',
    });
    let proposal: GanttTaskProposal | null = null;
    let progress: number | null = null;
    this.dragKey.set(bar.task.key);
    this.track(event, {
      onMove: (screenDeltaX, _deltaY, moveEvent) => {
        // logical delta: positive = later, whatever the direction
        const deltaX = rtl ? -screenDeltaX : screenDeltaX;
        const canvasRect = this.host.canvasElement()?.getBoundingClientRect();
        const tipX =
          canvasRect !== undefined
            ? this.logicalX(moveEvent.clientX, canvasRect, rtl)
            : 0;
        const tipY =
          canvasRect !== undefined
            ? moveEvent.clientY - canvasRect.top - 28
            : 0;
        if (kind === 'progress') {
          progress = proposeTaskProgress(
            bar.leftPx,
            bar.leftPx + bar.widthPx,
            tipX,
          );
          this.dragTip.set({ x: tipX, y: tipY, text: `${progress}%` });
          return;
        }
        proposal =
          kind === 'move'
            ? proposeTaskMove(bar.task, deltaX, scale, firstDay)
            : proposeTaskResize(
                bar.task,
                kind === 'resize-start' ? 'start' : 'end',
                deltaX,
                scale,
                firstDay,
              );
        this.dragTip.set({
          x: tipX,
          y: tipY,
          text: `${dateFormat.format(proposal.start)} - ${dateFormat.format(proposal.end)}`,
        });
      },
      onFinish: (commit, cancelled) => {
        this.run(() => {
          this.dragKey.set(null);
          this.dragTip.set(null);
          if (commit && progress !== null) {
            this.applyPatch(
              bar.task,
              ganttTaskPatch(bar.task.source, { progress }, this.fields()),
              'progressChanged',
              { title: bar.task.title, progress: String(progress) },
            );
            return;
          }
          if (commit && proposal !== null) {
            this.commitProposal(
              bar.task,
              proposal,
              kind === 'move' ? 'moved' : 'resized',
            );
          } else if (cancelled) {
            this.announcement.set(this.msg().announcements.cancelled);
          }
        });
      },
    });
  }

  /* ---------------- dependency drawing ---------------- */

  onLinkPointerDown(
    bar: GanttBar<T>,
    fromEnd: boolean,
    event: GanttPointerLike,
  ): void {
    if (
      !this.effectiveEditing() ||
      !this.inputs.allowDependencyAdding() ||
      event.button !== 0
    ) {
      return;
    }
    event.stopPropagation();
    const rowHeight = this.rowHeight();
    const fromX = fromEnd ? bar.leftPx + bar.widthPx : bar.leftPx;
    const fromY = bar.index * rowHeight + rowHeight / 2;
    const rtl = this.run(() => this.rtl());
    let target: { task: GanttTask<T>; toEnd: boolean } | null = null;
    this.track(event, {
      onMove: (_dx, _dy, moveEvent) => {
        const rect = this.host.canvasElement()?.getBoundingClientRect();
        if (rect === undefined) return;
        // logical x: the preview path is drawn in the mirrored arrow group
        const x = this.logicalX(moveEvent.clientX, rect, rtl);
        const y = moveEvent.clientY - rect.top;
        const rowIndex = Math.floor(y / rowHeight);
        this.run(() => {
          const task = this.visibleTasks()[rowIndex];
          target = null;
          let valid = false;
          if (
            task !== undefined &&
            task.key !== bar.task.key &&
            !task.isSummary
          ) {
            const scale = this.scale();
            const mid =
              (dateToPx(scale, task.start) + dateToPx(scale, task.end)) / 2;
            target = { task, toEnd: x > mid };
            valid = !wouldCreateCycle(
              this.ganttDependencies(),
              bar.task.key,
              task.key,
            );
          }
          this.linkPreview.set({
            path: `M ${fromX} ${fromY} L ${x} ${y}`,
            valid,
          });
        });
      },
      onFinish: (commit, cancelled) => {
        this.linkPreview.set(null);
        const chosen = target as { task: GanttTask<T>; toEnd: boolean } | null;
        if (commit && chosen !== null) {
          const type = ((fromEnd ? 'F' : 'S') +
            (chosen.toEnd ? 'F' : 'S')) as OgeGanttDependencyType;
          this.insertDependency(bar.task.key, chosen.task.key, type);
        } else if (cancelled) {
          this.run(() =>
            this.announcement.set(this.msg().announcements.cancelled),
          );
        }
      },
    });
  }

  /** Selects an arrow; the next Delete/Backspace removes it. */
  onArrowClick(
    dependency: GanttDependency<D>,
    event: {
      stopPropagation(): void;
      readonly clientX?: number;
      readonly clientY?: number;
    },
  ): void {
    event.stopPropagation();
    this.detachArrowKeyListener();
    this.selectedDependencyKey.set(dependency.key);
    if (event.clientX !== undefined && event.clientY !== undefined) {
      this.lastArrowPoint = { x: event.clientX, y: event.clientY };
    }
    const onKey = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
        this.deleteDependency(dependency.source);
      } else if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        this.openDependencyEditor(dependency);
      }
      this.detachArrowKeyListener();
      this.selectedDependencyKey.set(null);
    };
    this.arrowKeyListener = onKey;
    document.addEventListener('keydown', onKey);
  }

  private detachArrowKeyListener(): void {
    if (this.arrowKeyListener === null) return;
    document.removeEventListener('keydown', this.arrowKeyListener);
    this.arrowKeyListener = null;
  }

  /* ---------------- CRUD ---------------- */

  private commitProposal(
    task: GanttTask<T>,
    proposal: GanttTaskProposal,
    kind: 'moved' | 'resized',
  ): void {
    const format = ogeDateTimeFormat(this.effectiveLocale(), {
      dateStyle: 'medium',
    });
    this.applyPatch(
      task,
      ganttTaskPatch(
        task.source,
        {
          start: proposal.start,
          end: proposal.end,
          ...(task.segments.length > 1
            ? { segments: this.reshapeSegments(task, proposal) }
            : {}),
        },
        this.fields(),
      ),
      kind === 'moved' ? 'taskMoved' : 'taskResized',
      {
        title: task.title,
        start: format.format(proposal.start),
        end: format.format(proposal.end),
      },
    );
  }

  /**
   * A split task's pieces after a move (all shift) or an edge resize (the
   * first piece's start / the last piece's end follow).
   */
  private reshapeSegments(
    task: GanttTask<T>,
    next: { readonly start: Date; readonly end: Date },
  ): GanttSegment[] {
    const startShift = next.start.getTime() - task.start.getTime();
    const endShift = next.end.getTime() - task.end.getTime();
    const segments = task.segments.map((segment) => ({ ...segment }));
    if (startShift === endShift) {
      return segments.map((segment) => ({
        start: new Date(segment.start.getTime() + startShift),
        end: new Date(segment.end.getTime() + startShift),
      }));
    }
    const first = segments[0];
    const last = segments[segments.length - 1];
    if (startShift !== 0) {
      segments[0] = {
        start:
          next.start.getTime() > first.end.getTime() ? first.end : next.start,
        end: first.end,
      };
    }
    if (endShift !== 0) {
      segments[segments.length - 1] = {
        start: last.start,
        end: next.end.getTime() < last.start.getTime() ? last.start : next.end,
      };
    }
    return segments;
  }

  /**
   * `effortDriven`: an assignment, units or work change recomputes the
   * finish from the work and the assigned units.
   */
  private withEffortDriven(task: GanttTask<T>, patch: Partial<T>): Partial<T> {
    if (!(this.inputs.effortDriven?.() ?? false) || task.isSummary) {
      return patch;
    }
    const fields = this.fields();
    const names = fields.fieldNames;
    const touched = [names.resourceId, names.units, names.effort].some(
      (name) => name !== null && name in (patch as object),
    );
    if (!touched) return patch;
    const merged = { ...task.source, ...patch } as T;
    const normalized = buildGanttTasks([merged], fields, new Set())[0];
    if (normalized === undefined) return patch;
    const end = effortDrivenEnd(
      normalized.start,
      normalized.effort,
      normalized.units.reduce((sum, units) => sum + units, 0),
      this.inputs.hoursPerDay?.() ?? 8,
      this.calendarFor()(normalized) ?? null,
    );
    if (end === null || end.getTime() === normalized.end.getTime()) {
      return patch;
    }
    return { ...patch, ...ganttTaskPatch(task.source, { end }, fields) };
  }

  /** Guarded update used by every mutation path. */
  private applyPatch(
    task: GanttTask<T>,
    rawPatch: Partial<T>,
    announceKey: keyof OgeGanttResolvedMessages['announcements'],
    tokens: Readonly<Record<string, string>>,
  ): void {
    if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) return;
    if (task.source == null) return; // a resource group row
    const patch = this.withEffortDriven(task, rawPatch);
    const event: OgeGanttTaskUpdatingEvent<T> = {
      oldData: task.source,
      newData: patch,
      cancel: false,
    };
    this.events.taskUpdating?.(event);
    if (event.cancel) return;
    this.snapshot();
    const updated = { ...task.source, ...patch };
    this.taskStore.set(
      this.taskStore().map((item) => (item === task.source ? updated : item)),
    );
    this.events.taskUpdated?.({ taskData: updated });
    this.announce(this.msg().announcements[announceKey] as string, tokens);
    this.runAutoSchedule();
  }

  /** Inserts a task through the cancelable pipeline. */
  insertTask(taskData: T): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowTaskAdding()) return;
      const event: OgeGanttTaskInsertingEvent<T> = { taskData, cancel: false };
      this.events.taskInserting?.(event);
      if (event.cancel) return;
      this.snapshot();
      this.taskStore.set([...this.taskStore(), taskData]);
      this.events.taskInserted?.({ taskData });
      this.announce(this.msg().announcements.taskCreated, {
        title: String(this.fields().title(taskData) ?? ''),
      });
      this.runAutoSchedule();
    });
  }

  /** Updates a task's fields through the cancelable pipeline. */
  updateTask(taskData: T, patch: Partial<T>): void {
    this.run(() => {
      const task = this.allTasks().find((entry) => entry.source === taskData);
      if (task === undefined) return;
      this.applyPatch(task, patch, 'taskUpdated', { title: task.title });
    });
  }

  /** Deletes a task (and its dependency links) through the pipeline. */
  deleteTask(taskData: T): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowTaskDeleting()) return;
      const event: OgeGanttTaskDeletingEvent<T> = { taskData, cancel: false };
      this.events.taskDeleting?.(event);
      if (event.cancel) return;
      this.snapshot();
      const fields = this.fields();
      const key = fields.key(taskData) as RowKey;
      const linked = new Set(
        this.ganttDependencies()
          .filter(
            (dep) => dep.predecessorKey === key || dep.successorKey === key,
          )
          .map((dep) => dep.source),
      );
      this.taskStore.set(this.taskStore().filter((item) => item !== taskData));
      this.dependencyStore.set(
        this.dependencyStore().filter((item) => !linked.has(item)),
      );
      this.events.taskDeleted?.({ taskData });
      this.announce(this.msg().announcements.taskDeleted, {
        title: String(fields.title(taskData) ?? ''),
      });
    });
  }

  /** Inserts a dependency link (cycle-checked, cancelable), with an optional lag. */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type: OgeGanttDependencyType = 'FS',
    options: { readonly lag?: number; readonly lagUnit?: GanttLagUnit } = {},
  ): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowDependencyAdding()) {
        return;
      }
      if (
        wouldCreateCycle(this.ganttDependencies(), predecessorKey, successorKey)
      ) {
        this.announcement.set(this.msg().announcements.dependencyRejected);
        return;
      }
      const event: OgeGanttDependencyInsertingEvent = {
        predecessorKey,
        successorKey,
        type,
        cancel: false,
      };
      this.events.dependencyInserting?.(event);
      if (event.cancel) return;
      this.snapshot();
      const item: Record<string, unknown> = {};
      const set = (expr: GanttFieldExpr<D>, value: unknown): void => {
        if (typeof expr === 'string') item[expr] = value;
      };
      set(
        this.inputs.dependencyKeyExpr(),
        `${String(predecessorKey)}-${String(successorKey)}`,
      );
      set(this.inputs.predecessorKeyExpr(), predecessorKey);
      set(this.inputs.successorKeyExpr(), successorKey);
      set(this.inputs.dependencyTypeExpr(), type);
      if (options.lag !== undefined && options.lag !== 0) {
        set(this.inputs.dependencyLagExpr?.() ?? 'lag', options.lag);
        set(
          this.inputs.dependencyLagUnitExpr?.() ?? 'lagUnit',
          options.lagUnit ?? 'days',
        );
      }
      const dependencyData = item as D;
      this.dependencyStore.set([...this.dependencyStore(), dependencyData]);
      this.events.dependencyInserted?.({ dependencyData });
      this.announce(this.msg().announcements.dependencyCreated, {
        from: String(predecessorKey),
        to: String(successorKey),
      });
      this.runAutoSchedule();
    });
  }

  /**
   * Updates a link's fields (type, lag, lag unit…) through the cancelable
   * pipeline; auto-scheduling re-runs.
   */
  updateDependency(dependencyData: D, patch: Partial<D>): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowDependencyAdding()) {
        return;
      }
      const event: OgeGanttDependencyUpdatingEvent<D> = {
        oldData: dependencyData,
        newData: patch,
        cancel: false,
      };
      this.events.dependencyUpdating?.(event);
      if (event.cancel) return;
      this.snapshot();
      const updated = { ...dependencyData, ...patch };
      const normalized = this.ganttDependencies().find(
        (entry) => entry.source === dependencyData,
      );
      this.dependencyStore.set(
        this.dependencyStore().map((item) =>
          item === dependencyData ? updated : item,
        ),
      );
      this.events.dependencyUpdated?.({ dependencyData: updated });
      this.announce(this.msg().announcements.dependencyUpdated, {
        from: String(normalized?.predecessorKey ?? ''),
        to: String(normalized?.successorKey ?? ''),
      });
      this.runAutoSchedule();
    });
  }

  /** Deletes a dependency link through the pipeline. */
  deleteDependency(dependencyData: D): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowDependencyDeleting()) {
        return;
      }
      const event: OgeGanttDependencyDeletingEvent<D> = {
        dependencyData,
        cancel: false,
      };
      this.events.dependencyDeleting?.(event);
      if (event.cancel) return;
      this.snapshot();
      const normalized = this.ganttDependencies().find(
        (entry) => entry.source === dependencyData,
      );
      this.dependencyStore.set(
        this.dependencyStore().filter((item) => item !== dependencyData),
      );
      this.events.dependencyDeleted?.({ dependencyData });
      this.announce(this.msg().announcements.dependencyDeleted, {
        from: String(normalized?.predecessorKey ?? ''),
        to: String(normalized?.successorKey ?? ''),
      });
    });
  }

  /** Runs the scheduling engine after an edit when `autoScheduling` is on. */
  private runAutoSchedule(): void {
    if (!this.inputs.autoScheduling()) return;
    if (this.batchDepth > 0) {
      this.pendingSchedule = true;
      return;
    }
    this.applySchedule(false);
  }

  /**
   * The scheduling engine (`scheduleGanttProject`): moves tasks earlier or
   * later to honour links with lag, constraints and ALAP; manually scheduled
   * tasks stay. Writes the moved dates into the store (part of the edit's
   * undo step; `ownStep` takes a snapshot first).
   */
  private applySchedule(ownStep: boolean): void {
    const result = scheduleGanttProject(
      this.allTasks(),
      this.ganttDependencies(),
      {
        calendar: this.calendarFor(),
        projectStart: this.inputs.projectStart?.() ?? null,
      },
    );
    if (result.changes.length === 0) return;
    if (ownStep) this.snapshot();
    const fields = this.fields();
    const byKey = new Map(this.allTasks().map((task) => [task.key, task]));
    const patches = new Map<T, Partial<T>>();
    for (const change of result.changes) {
      const task = byKey.get(change.key);
      if (task === undefined) continue;
      patches.set(
        task.source,
        ganttTaskPatch(
          task.source,
          {
            start: change.start,
            end: change.end,
            ...(task.segments.length > 1
              ? { segments: this.reshapeSegments(task, change) }
              : {}),
          },
          fields,
        ),
      );
    }
    this.taskStore.set(
      this.taskStore().map((item) => {
        const patch = patches.get(item);
        return patch === undefined ? item : { ...item, ...patch };
      }),
    );
  }

  /* ---------------- draw-to-create / dialog ---------------- */

  /** Double-click on empty chart space creates a task at that date. */
  onCanvasDblClick(event: GanttMouseLike): void {
    this.run(() => {
      if (!this.effectiveEditing() || !this.inputs.allowTaskAdding()) return;
      if ((event.target as HTMLElement | null)?.closest('.oge-gantt-target')) {
        return;
      }
      const canvas = this.host.canvasElement();
      if (canvas === null) return;
      const rect = canvas.getBoundingClientRect();
      const start = chartPxToDate(
        this.scale(),
        this.logicalX(event.clientX, rect, this.rtl()),
        this.resolvedFirstDayOfWeek(),
      );
      this.openCreateDialog(
        start,
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
      );
    });
  }

  /** Drag on empty chart space draws a bar, then opens the create dialog. */
  onCanvasPointerDown(event: GanttPointerLike): void {
    if (event.button !== 0) return;
    if (!this.effectiveEditing() || !this.inputs.allowTaskAdding()) return;
    if ((event.target as HTMLElement | null)?.closest('.oge-gantt-target')) {
      return;
    }
    const canvas = this.host.canvasElement();
    if (canvas === null) return;
    const rect = canvas.getBoundingClientRect();
    const rtl = this.run(() => this.rtl());
    const startPx = this.logicalX(event.clientX, rect, rtl);
    const rowHeight = this.rowHeight();
    const rowIndex = Math.floor((event.clientY - rect.top) / rowHeight);
    this.track(event, {
      onMove: (screenDeltaX) => {
        const deltaX = rtl ? -screenDeltaX : screenDeltaX;
        this.drawPreview.set({
          leftPx: Math.min(startPx, startPx + deltaX),
          widthPx: Math.abs(deltaX),
          top: rowIndex * rowHeight + 6,
        });
      },
      onFinish: (commit, cancelled) => {
        this.run(() => {
          const draw = this.drawPreview();
          this.drawPreview.set(null);
          if (!commit || cancelled || draw === null || draw.widthPx < 12) {
            return;
          }
          const scale = this.scale();
          const firstDay = this.resolvedFirstDayOfWeek();
          const start = chartPxToDate(scale, draw.leftPx, firstDay);
          let end = chartPxToDate(scale, draw.leftPx + draw.widthPx, firstDay);
          if (end.getTime() <= start.getTime()) {
            end = new Date(
              start.getFullYear(),
              start.getMonth(),
              start.getDate() + 1,
            );
          }
          this.openCreateDialog(start, end);
        });
      },
    });
  }

  /** The optional dialog fields of a new task. */
  private newDialogExtras(): Partial<GanttEditorModel> {
    return {
      ...(this.inputs.resources().length > 0
        ? { resourceIds: [], units: 100 }
        : {}),
      ...((this.inputs.effortDriven?.() ?? false) ? { effort: 0 } : {}),
      ...(this.inputs.autoScheduling()
        ? {
            manuallyScheduled: false,
            constraintType: 'ASAP' as const,
            constraintDate: null,
            deadline: null,
          }
        : {}),
    };
  }

  /** Prefilled create dialog (double-click, draw-to-create, subtask). */
  private openCreateDialog(start: Date, end: Date, parentRaw?: unknown): void {
    this.pendingParentRaw = parentRaw;
    this.openDialog(
      {
        title: '',
        start,
        end,
        progress: 0,
        ...this.newDialogExtras(),
      },
      this.buildDraft(start, parentRaw),
      true,
    );
  }

  /** Opens the task dialog: a prefilled create form without arguments. */
  showTaskDetailsDialog(taskData?: T): void {
    this.run(() => {
      if (taskData !== undefined) {
        const task = this.allTasks().find((entry) => entry.source === taskData);
        if (task !== undefined) this.openEditDialog(task);
        return;
      }
      if (!this.effectiveEditing() || !this.inputs.allowTaskAdding()) return;
      const today = startOfDay(new Date());
      this.openDialog(
        {
          title: '',
          start: today,
          end: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
          ),
          progress: 0,
          ...this.newDialogExtras(),
        },
        this.buildDraft(today),
        true,
      );
    });
  }

  private buildDraft(start: Date, parentRaw?: unknown): T {
    const inputs = this.inputs;
    const item: Record<string, unknown> = {};
    const set = (expr: GanttFieldExpr<T>, value: unknown): void => {
      if (typeof expr === 'string') item[expr] = value;
    };
    if (parentRaw !== undefined) set(inputs.parentKeyExpr(), parentRaw);
    set(
      inputs.keyExpr(),
      `oge-task-${++this.draftCounter}-${this.taskStore().length}`,
    );
    set(inputs.titleExpr(), '');
    set(inputs.startExpr(), start);
    set(
      inputs.endExpr(),
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
    );
    set(inputs.progressExpr(), 0);
    return item as T;
  }

  private openEditDialog(task: GanttTask<T>): void {
    if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) return;
    if (task.source == null) return;
    this.openDialog(
      {
        title: task.title,
        start: task.start,
        end: task.end,
        progress: task.progress,
        color: task.color,
        ...(this.inputs.resources().length > 0
          ? { resourceIds: task.resourceIds, units: task.units[0] ?? 100 }
          : {}),
        ...((this.inputs.effortDriven?.() ?? false)
          ? { effort: task.effort ?? 0 }
          : {}),
        ...(this.inputs.autoScheduling()
          ? {
              manuallyScheduled: task.manuallyScheduled,
              constraintType: task.constraintType,
              constraintDate: task.constraintDate ?? null,
              deadline: task.deadline ?? null,
            }
          : {}),
      },
      task.source,
      false,
    );
  }

  /**
   * The dialog's default form items (what `formItems` starts as): units
   * with resources, work with `effortDriven`, the scheduling fields
   * (manual mode, constraint, deadline) with `autoScheduling`.
   */
  defaultDialogItems(): OgeFormItemDataBase[] {
    return this.run(() =>
      buildGanttDialogItems(this.msg().dialog, this.inputs.resources(), {
        scheduling: this.inputs.autoScheduling()
          ? this.msg().scheduling
          : undefined,
        effort: this.inputs.effortDriven?.() ?? false,
      }),
    );
  }

  private openDialog(model: GanttEditorModel, source: T, isNew: boolean): void {
    const event: OgeGanttDialogShowingEvent<T> = {
      taskData: source,
      isNew,
      formItems: this.defaultDialogItems(),
      cancel: false,
    };
    this.events.taskEditDialogShowing?.(event);
    if (event.cancel) return;
    this.editedSource = isNew ? null : source;
    this.host.openDialog(model, isNew, event.formItems);
  }

  /** The dialog saved: insert the new task or patch the edited one. */
  onDialogSaved(result: GanttEditorResult): void {
    this.run(() => {
      const fields = this.fields();
      if (result.isNew) {
        const draft = this.buildDraft(
          result.model.start,
          this.pendingParentRaw,
        );
        this.pendingParentRaw = undefined;
        const patch = ganttTaskPatch(
          draft,
          trimGanttDialogChange(result.model, null),
          fields,
        );
        this.insertTask({ ...draft, ...patch });
      } else if (this.editedSource !== null) {
        const source = this.editedSource;
        const task = this.allTasks().find((entry) => entry.source === source);
        this.updateTask(
          source,
          ganttTaskPatch(
            source,
            trimGanttDialogChange(result.model, task ?? null),
            fields,
          ),
        );
      }
      this.editedSource = null;
    });
  }

  /** The dialog's Delete button. */
  onDialogDelete(): void {
    this.run(() => {
      if (this.editedSource !== null) this.deleteTask(this.editedSource);
      this.editedSource = null;
    });
  }

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    this.announcement.set(formatGanttMessage(template, tokens));
  }
}

const sameInstant = (
  a: Date | null | undefined,
  b: Date | null | undefined,
): boolean => (a ?? null)?.getTime() === (b ?? null)?.getTime();

/**
 * The dialog model as a task change, without the optional fields that did
 * not change (so an edit never adds `units: 100` or `constraintType: 'ASAP'`
 * to an item that had neither). `task` is the edited task, `null` = new.
 */
export function trimGanttDialogChange(
  model: GanttEditorModel,
  task: GanttTask | null,
): GanttTaskChange {
  const change: {
    -readonly [K in keyof GanttTaskChange]: GanttTaskChange[K];
  } = { ...model };
  const units = task?.units ?? [];
  if (
    model.units === undefined ||
    (task === null
      ? model.units === 100
      : units.length > 0
        ? units.every((value) => value === model.units)
        : model.units === 100)
  ) {
    delete change.units;
  }
  if (model.effort === undefined || model.effort === (task?.effort ?? 0)) {
    delete change.effort;
  }
  if (model.manuallyScheduled === (task?.manuallyScheduled ?? false)) {
    delete change.manuallyScheduled;
  }
  if (model.constraintType === (task?.constraintType ?? 'ASAP')) {
    delete change.constraintType;
  }
  if (
    model.constraintDate === undefined ||
    sameInstant(model.constraintDate, task?.constraintDate)
  ) {
    delete change.constraintDate;
  }
  if (
    model.deadline === undefined ||
    sameInstant(model.deadline, task?.deadline)
  ) {
    delete change.deadline;
  }
  return change;
}

/**
 * Mirrors the horizontal arrow keys for right-to-left layout, so the
 * keyboard map can stay written in logical terms: `ArrowRight` = towards
 * the end of the line (expand, indent, later on the timeline) and
 * `ArrowLeft` = towards its start. Other keys pass through unchanged.
 */
export function mirrorGanttKey(
  event: GanttKeyLike,
  rtl: boolean,
): GanttKeyLike {
  if (!rtl || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
    return event;
  }
  return {
    key: event.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft',
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    preventDefault: () => event.preventDefault(),
  };
}
