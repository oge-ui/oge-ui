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
  resolveGanttFields,
  wouldCreateCycle,
  type GanttDependency,
  type GanttFieldExpr,
  type GanttTask,
  type ResolvedGanttFields,
} from './engine/gantt-model';
import { autoScheduleForward, criticalPathKeys } from './engine/schedule';
import {
  buildGanttScale,
  dateToPx,
  type GanttScale,
} from './engine/time-scale';
import { isWorkingDay, type GanttWorkCalendar } from './engine/work-calendar';
import { buildResourceWorkload } from './engine/workload';
import type { OgeGanttConfig, OgeGanttMessages } from './gantt-config';
import {
  beginGanttGesture,
  type GanttGestureHandle,
  type GanttPointerLike,
} from './gantt-gesture';
import type {
  OgeGanttColumn,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDialogShowingEvent,
  OgeGanttExportData,
  OgeGanttResource,
  OgeGanttScaleType,
  OgeGanttSelectionChangedEvent,
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

/** One rendered chart bar with its pixel geometry. */
export interface GanttBar<T> {
  readonly task: GanttTask<T>;
  readonly index: number;
  readonly leftPx: number;
  readonly widthPx: number;
  readonly baselineLeftPx: number | null;
  readonly baselineWidthPx: number | null;
  readonly critical: boolean;
}

/** One routed dependency arrow. */
export interface GanttArrow<D> {
  readonly dependency: GanttDependency<D>;
  readonly path: string;
  readonly critical: boolean;
}

/** One resolved task-list column. */
export interface GanttResolvedColumn {
  readonly field: string;
  readonly header: string;
  readonly widthPx: number;
  readonly format?: (task: GanttTask) => string;
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
  /** The two-way halves: the core asks, the host writes the model. */
  scaleTypeChange?(type: OgeGanttScaleType): void;
  selectedTaskKeyChange?(key: RowKey | null): void;
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

  /* ---------------- derived ---------------- */

  readonly msg: () => OgeGanttMessages;
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

    this.msg = rx.derived<OgeGanttMessages>(() => ({
      ...inputs.config().messages,
      ...inputs.messages(),
    }));
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
      }),
    );
    this.visibleTasks = rx.derived(() =>
      buildGanttTasks(this.taskStore(), this.fields(), this.collapsedKeys()),
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
        },
        new Set(this.allTasks().map((task) => task.key)),
      ),
    );
    this.criticalKeys = rx.derived<ReadonlySet<RowKey>>(() =>
      inputs.showCriticalPath()
        ? criticalPathKeys(this.allTasks(), this.ganttDependencies())
        : new Set(),
    );
    this.dataRange = rx.derived(() =>
      ganttDataRange(this.allTasks(), startOfDay(new Date())),
    );
    this.stableRange = rx.derived(() =>
      widenGanttRange(this.dataRange(), this.renderedRange()),
    );
    this.scale = rx.derived(() => {
      const range = this.stableRange();
      return buildGanttScale(
        range.min,
        range.max,
        inputs.scaleType(),
        this.resolvedFirstDayOfWeek(),
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

    this.windowBars = rx.derived(() => {
      const scale = this.scale();
      const critical = this.criticalKeys();
      return this.windowTasks().map((task) => {
        const leftPx = dateToPx(scale, task.start);
        const widthPx = Math.max(4, dateToPx(scale, task.end) - leftPx);
        const hasBaseline =
          task.baselineStart !== undefined && task.baselineEnd !== undefined;
        const baselineLeftPx = hasBaseline
          ? dateToPx(scale, task.baselineStart as Date)
          : null;
        return {
          task,
          index: this.rowIndexOf(task),
          leftPx,
          widthPx,
          baselineLeftPx,
          baselineWidthPx: hasBaseline
            ? Math.max(
                4,
                dateToPx(scale, task.baselineEnd as Date) -
                  (baselineLeftPx as number),
              )
            : null,
          critical: critical.has(task.key),
        };
      });
    });

    this.windowArrows = rx.derived(() => {
      if (!inputs.showDependencies()) return [];
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
      if (scale.type === 'weeks' || scale.type === 'months') return [];
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
      const builtIn: Record<string, { header: string; width: number }> = {
        title: { header: messages.title, width: 180 },
        start: { header: messages.start, width: 88 },
        end: { header: messages.end, width: 88 },
        duration: { header: messages.duration, width: 64 },
        progress: { header: messages.progress, width: 64 },
      };
      return inputs.columns().map((column) => ({
        field: column.field,
        header: column.header ?? builtIn[column.field]?.header ?? column.field,
        widthPx: column.widthPx ?? builtIn[column.field]?.width ?? 100,
        format: column.format,
      }));
    });

    this.rovingKey = rx.derived(
      () => this.focusKey() ?? this.visibleTasks()[0]?.key ?? null,
    );
    this.tooltipBar = rx.derived(() => {
      const key = this.tooltipKey();
      if (key === null || this.dragKey() !== null) return null;
      return this.windowBars().find((bar) => bar.task.key === key) ?? null;
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

  private snapshot(): void {
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
    const dateFormat = ogeDateTimeFormat(this.effectiveLocale(), {
      day: 'numeric',
      month: 'short',
    });
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
        return this.msg().columns.durationDays.replace('{days}', String(days));
      }
      case 'progress':
        return `${task.progress}%`;
      default: {
        const value = (task.source as Record<string, unknown>)[column.field];
        return value == null ? '' : String(value);
      }
    }
  }

  paneAriaLabel(): string {
    return `${this.msg().grid.treeLabel}. ${this.msg().grid.treeHint}`;
  }

  taskAriaLabel(task: GanttTask<T>): string {
    const format = ogeDateTimeFormat(this.effectiveLocale(), {
      dateStyle: 'medium',
    });
    return this.msg()
      .grid.taskLabel.replace('{title}', task.title)
      .replace('{start}', format.format(task.start))
      .replace('{end}', format.format(task.end))
      .replace('{progress}', String(task.progress));
  }

  majorLabel(date: Date): string {
    const scale = this.scale();
    const locale = this.effectiveLocale();
    if (scale.type === 'hours') {
      return ogeDateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
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

  private select(task: GanttTask<T> | null): void {
    const key = task?.key ?? null;
    if (this.inputs.selectedTaskKey() === key) return;
    this.events.selectedTaskKeyChange?.(key);
    this.events.selectionChanged?.({ task });
  }

  onRowClick(task: GanttTask<T>, event: MouseEvent): void {
    this.run(() => {
      this.focusKey.set(task.key);
      this.select(task);
    });
    this.events.taskClick?.({ task, event });
  }

  onRowDblClick(task: GanttTask<T>, event: MouseEvent): void {
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
    if (task !== null) this.select(task);
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

  menuDelete(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (task) this.deleteTask(task.source);
    });
  }

  menuIndent(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (task) this.indentTask(task);
    });
  }

  menuOutdent(): void {
    this.run(() => {
      const task = this.contextMenu()?.task;
      this.closeMenu();
      if (task) this.outdentTask(task);
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
      this.inputs.allowTaskUpdating() &&
      this.effectiveEditing() &&
      this.previousSibling(task) !== null
    );
  }

  /** Makes the task a child of its previous sibling (MS Project parity). */
  indentTask(task: GanttTask<T>): void {
    this.run(() => {
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
      if (event.ctrlKey && this.handleBarKey(task, event)) return;
      if (event.altKey && event.shiftKey) {
        // MS Project parity: Alt+Shift+Right indents, Alt+Shift+Left outdents
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          this.indentTask(task);
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this.outdentTask(task);
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
          this.openEditDialog(task);
          return;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          this.deleteTask(task.source);
          return;
        default:
          return;
      }
    });
  }

  /** Ctrl+Arrows move the focused bar; Ctrl+Shift resizes the end edge. */
  private handleBarKey(task: GanttTask<T>, event: GanttKeyLike): boolean {
    if (task.isSummary) return false;
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
    if (next !== null) this.events.scaleTypeChange?.(next);
  }

  /** Steps to the next coarser scale. */
  zoomOut(): void {
    const next = stepGanttScale(
      this.run(() => this.inputs.scaleType()),
      1,
    );
    if (next !== null) this.events.scaleTypeChange?.(next);
  }

  /** Picks the finest scale whose full range fits the chart viewport. */
  zoomToFit(): void {
    const { range, firstDay } = this.run(() => ({
      range: this.dataRange(),
      firstDay: this.resolvedFirstDayOfWeek(),
    }));
    this.renderedRange.set(range);
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
      return {
        tasks,
        columns,
        rangeStart: scale.start,
        rangeEnd: scale.end,
        critical: criticalPathKeys(tasks, this.ganttDependencies()),
        resourceText: (task: OgeGanttTask<T>) => this.resourceText(task),
      };
    });
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
    event: { stopPropagation(): void },
  ): void {
    event.stopPropagation();
    this.detachArrowKeyListener();
    this.selectedDependencyKey.set(dependency.key);
    const onKey = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
        this.deleteDependency(dependency.source);
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
        { start: proposal.start, end: proposal.end },
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

  /** Guarded update used by every mutation path. */
  private applyPatch(
    task: GanttTask<T>,
    patch: Partial<T>,
    announceKey: keyof OgeGanttMessages['announcements'],
    tokens: Readonly<Record<string, string>>,
  ): void {
    if (!this.effectiveEditing() || !this.inputs.allowTaskUpdating()) return;
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
    this.announce(this.msg().announcements[announceKey], tokens);
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

  /** Inserts a dependency link (cycle-checked, cancelable). */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type: OgeGanttDependencyType = 'FS',
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

  /** Applies the forward pass when `autoScheduling` is on. */
  private runAutoSchedule(): void {
    if (!this.inputs.autoScheduling()) return;
    const resources = this.inputs.resources();
    const planCalendar = this.effectiveWorkCalendar() ?? undefined;
    const changes = autoScheduleForward(
      this.allTasks(),
      this.ganttDependencies(),
      (task) => {
        for (const id of task.resourceIds) {
          const calendar = resources.find(
            (resource) => resource.id === id,
          )?.calendar;
          if (calendar !== undefined) return calendar;
        }
        return planCalendar;
      },
    );
    if (changes.length === 0) return;
    const fields = this.fields();
    const byKey = new Map(this.allTasks().map((task) => [task.key, task]));
    let next = this.taskStore();
    for (const change of changes) {
      const task = byKey.get(change.key);
      if (task === undefined) continue;
      const patch = ganttTaskPatch(
        task.source,
        { start: change.start, end: change.end },
        fields,
      );
      next = next.map((item) =>
        item === task.source ? { ...item, ...patch } : item,
      );
    }
    this.taskStore.set(next);
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

  /** Prefilled create dialog (double-click, draw-to-create, subtask). */
  private openCreateDialog(start: Date, end: Date, parentRaw?: unknown): void {
    this.pendingParentRaw = parentRaw;
    this.openDialog(
      {
        title: '',
        start,
        end,
        progress: 0,
        ...(this.inputs.resources().length > 0 ? { resourceIds: [] } : {}),
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
          ...(this.inputs.resources().length > 0 ? { resourceIds: [] } : {}),
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
    this.openDialog(
      {
        title: task.title,
        start: task.start,
        end: task.end,
        progress: task.progress,
        color: task.color,
        ...(this.inputs.resources().length > 0
          ? { resourceIds: task.resourceIds }
          : {}),
      },
      task.source,
      false,
    );
  }

  /** The dialog's default form items (what `formItems` starts as). */
  defaultDialogItems(): OgeFormItemDataBase[] {
    return this.run(() =>
      buildGanttDialogItems(this.msg().dialog, this.inputs.resources()),
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
        const patch = ganttTaskPatch(draft, result.model, fields);
        this.insertTask({ ...draft, ...patch });
      } else if (this.editedSource !== null) {
        this.updateTask(
          this.editedSource,
          ganttTaskPatch(this.editedSource, result.model, fields),
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
