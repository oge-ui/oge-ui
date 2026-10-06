import type { CSSProperties, ReactNode } from 'react';
import type { RowKey } from '@oge-ui/core';
import type {
  GanttFieldExpr,
  GanttLagUnit,
  OgeGanttColumn,
  OgeGanttColumnReorderedEvent,
  OgeGanttColumnResizedEvent,
  OgeGanttDependencyUpdatedEvent,
  OgeGanttDependencyUpdatingEvent,
  OgeGanttSchedulingConflictEvent,
  OgeGanttSelectionMode,
  OgeGanttSlack,
  OgeGanttSortChangedEvent,
  OgeGanttViewMode,
  OgeGanttZoomPreset,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDialogShowingEvent as EngineDialogShowingEvent,
  OgeGanttExportData,
  OgeGanttMessages,
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
  OgeGanttWorkCalendar,
} from '@oge-ui/gantt-engine';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';

/**
 * Cancelable: before the task dialog opens; replace `formItems` to
 * customize the form (dx `onTaskEditDialogShowing` parity). The items are
 * React form items, so a replacement may carry render props.
 */
export type OgeGanttDialogShowingEvent<
  T = unknown,
  I extends OgeFormItemDefinition = OgeFormItemDefinition,
> = EngineDialogShowingEvent<T, I>;

/** Context of `renderTask` — the React form of `*ogeGanttTaskTemplate`. */
export interface OgeGanttTaskRenderContext<T = unknown> {
  /** The normalized task whose bar title is being rendered. */
  readonly task: OgeGanttTask<T>;
}

/** Context of `renderTooltip` — the React form of `*ogeGanttTooltipTemplate`. */
export interface OgeGanttTooltipRenderContext<T = unknown> {
  /** The hovered task. */
  readonly task: OgeGanttTask<T>;
}

/** Props of `<OgeGantt>` — every Angular input, output and template slot. */
export interface OgeGanttProps<
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
> {
  /* ---------------- data ---------------- */
  /** Task items — copied into an internal working set, never mutated. */
  tasks?: readonly T[];
  /** Dependency links; same working-set semantics as `tasks`. */
  dependencies?: readonly D[];
  keyExpr?: GanttFieldExpr<T>;
  parentKeyExpr?: GanttFieldExpr<T>;
  titleExpr?: GanttFieldExpr<T>;
  startExpr?: GanttFieldExpr<T>;
  endExpr?: GanttFieldExpr<T>;
  progressExpr?: GanttFieldExpr<T>;
  colorExpr?: GanttFieldExpr<T>;
  baselineStartExpr?: GanttFieldExpr<T>;
  baselineEndExpr?: GanttFieldExpr<T>;
  dependencyKeyExpr?: GanttFieldExpr<D>;
  predecessorKeyExpr?: GanttFieldExpr<D>;
  successorKeyExpr?: GanttFieldExpr<D>;
  dependencyTypeExpr?: GanttFieldExpr<D>;
  /** Link lag amount (negative = lead). Default `'lag'`. */
  dependencyLagExpr?: GanttFieldExpr<D>;
  /** Link lag unit `'days' | 'hours'`. Default `'lagUnit'`. */
  dependencyLagUnitExpr?: GanttFieldExpr<D>;
  /** `true` = auto-scheduling never moves the task. Default `'manuallyScheduled'`. */
  manuallyScheduledExpr?: GanttFieldExpr<T>;
  /** Constraint type. Default `'constraintType'`. */
  constraintTypeExpr?: GanttFieldExpr<T>;
  constraintDateExpr?: GanttFieldExpr<T>;
  /** Target finish. Default `'deadline'`. */
  deadlineExpr?: GanttFieldExpr<T>;
  /** Split-task pieces `[{ start, end }, …]`. Default `'segments'`. */
  segmentsExpr?: GanttFieldExpr<T>;
  /** Baseline sets `[{ start, end }, …]`. Default `'baselines'`. */
  baselinesExpr?: GanttFieldExpr<T>;
  /** Assignment units in %. Default `'units'`. */
  unitsExpr?: GanttFieldExpr<T>;
  /** Work in hours. Default `'effort'`. */
  effortExpr?: GanttFieldExpr<T>;
  /** Resource choices: bar labels, dialog tag editor, workload band rows. */
  resources?: readonly OgeGanttResource[];
  resourceIdExpr?: GanttFieldExpr<T>;

  /* ---------------- appearance / behavior ---------------- */
  /** Timeline scale — controlled when provided. */
  scaleType?: OgeGanttScaleType;
  /** Uncontrolled initial scale. Default `'days'`. */
  defaultScaleType?: OgeGanttScaleType;
  /** The controlled half of `scaleType` (toolbar zoom, zoom-to-fit). */
  onScaleTypeChange?: (scaleType: OgeGanttScaleType) => void;
  firstDayOfWeek?: number;
  /** Initial task pane width in px; the splitter drags it. Default 360. */
  taskListWidth?: number;
  columns?: readonly OgeGanttColumn[];
  taskTitlePosition?: OgeGanttTaskTitlePosition;
  showDependencies?: boolean;
  showRowLines?: boolean;
  showCriticalPath?: boolean;
  weekendsHighlighted?: boolean;
  /**
   * Weekend days (0 = Sunday … 6 = Saturday) `weekendsHighlighted` shades;
   * `undefined` resolves from the locale's `Intl.Locale` week data (Friday +
   * Saturday in `he-IL`), falling back to Saturday + Sunday. A `workCalendar`
   * takes precedence.
   */
  weekendDays?: readonly number[];
  holidays?: readonly Date[];
  workCalendar?: OgeGanttWorkCalendar | null;
  showResourceWorkload?: boolean;
  /** Per-period utilization rows (units vs capacity). */
  showResourceHistogram?: boolean;
  stripLines?: readonly OgeGanttStripLine[];
  /**
   * Project-level auto-scheduling: links with lag, constraints and ALAP move
   * tasks earlier or later after every edit; manual tasks stay put.
   */
  autoScheduling?: boolean;
  /** Where unlinked ASAP tasks start when auto-scheduling. */
  projectStart?: Date | null;
  /** Assignment / units / work changes recompute the finish. */
  effortDriven?: boolean;
  /** Working hours per day for effort-driven durations. Default 8. */
  hoursPerDay?: number;
  showProgressLine?: boolean;
  /** Status date of the progress line; unset = today. */
  statusDate?: Date | null;
  /**
   * The display zone (IANA, e.g. `'Europe/Istanbul'`); unset = the
   * browser's. Stored dates stay instants — the scale, today, working days
   * and drags follow this zone's clocks.
   */
  timeZone?: string;
  /** Child milestones drawn onto their summary bars. */
  showRollups?: boolean;
  /** Which baseline renders (0-based, `-1` hides) — controlled when provided. */
  baselineIndex?: number;
  /** Uncontrolled initial baseline. Default 0. */
  defaultBaselineIndex?: number;
  onBaselineIndexChange?: (index: number) => void;
  /** The toolbar's zoom-preset chooser; unset = one entry per scale. */
  zoomPresets?: readonly OgeGanttZoomPreset[] | null;
  /** `'tasks'` or `'resources'` — controlled when provided. */
  viewMode?: OgeGanttViewMode;
  /** Uncontrolled initial view. Default `'tasks'`. */
  defaultViewMode?: OgeGanttViewMode;
  onViewModeChange?: (mode: OgeGanttViewMode) => void;
  /** Double-click / F2 edits task-list cells in place. */
  inlineEditing?: boolean;
  allowSorting?: boolean;
  allowColumnResizing?: boolean;
  allowColumnReordering?: boolean;
  filterRow?: boolean;
  searchPanel?: boolean;
  /** `'multiple'`: Ctrl/Shift-click, Shift+Arrow, Ctrl+A and bulk actions. */
  selectionMode?: OgeGanttSelectionMode;
  locale?: string;
  /** Per-instance overrides, merged over the provider's messages per block. */
  messages?: Partial<OgeGanttMessages>;
  /**
   * Right-to-left layout: mirrors the timeline, the arrow keys, drag deltas
   * and the dependency arrows. Unset follows the page direction (the nearest
   * `dir` / computed `direction`, kept current while it changes); an explicit
   * value is also set as `dir` on the host.
   */
  rtlEnabled?: boolean;

  /* ---------------- editing gates ---------------- */
  editingEnabled?: boolean;
  allowTaskAdding?: boolean;
  allowTaskUpdating?: boolean;
  allowTaskDeleting?: boolean;
  allowDependencyAdding?: boolean;
  allowDependencyDeleting?: boolean;
  readOnly?: boolean;

  /** The selected task — controlled when provided. */
  selectedTaskKey?: RowKey | null;
  /** Uncontrolled initial selection. */
  defaultSelectedTaskKey?: RowKey | null;
  /** The controlled half of `selectedTaskKey`. */
  onSelectedTaskKeyChange?: (key: RowKey | null) => void;
  /** Every selected key (`selectionMode: 'multiple'`) — controlled when provided. */
  selectedTaskKeys?: readonly RowKey[];
  /** Uncontrolled initial multi-selection. */
  defaultSelectedTaskKeys?: readonly RowKey[];
  onSelectedTaskKeysChange?: (keys: readonly RowKey[]) => void;

  /* ---------------- callbacks ---------------- */
  onTaskInserting?: (event: OgeGanttTaskInsertingEvent<T>) => void;
  onTaskInserted?: (event: OgeGanttTaskInsertedEvent<T>) => void;
  onTaskUpdating?: (event: OgeGanttTaskUpdatingEvent<T>) => void;
  onTaskUpdated?: (event: OgeGanttTaskUpdatedEvent<T>) => void;
  onTaskDeleting?: (event: OgeGanttTaskDeletingEvent<T>) => void;
  onTaskDeleted?: (event: OgeGanttTaskDeletedEvent<T>) => void;
  onDependencyInserting?: (event: OgeGanttDependencyInsertingEvent) => void;
  onDependencyInserted?: (event: OgeGanttDependencyInsertedEvent<D>) => void;
  onDependencyDeleting?: (event: OgeGanttDependencyDeletingEvent<D>) => void;
  onDependencyDeleted?: (event: OgeGanttDependencyDeletedEvent<D>) => void;
  onTaskClick?: (event: OgeGanttTaskClickEvent<T>) => void;
  onTaskDblClick?: (event: OgeGanttTaskClickEvent<T>) => void;
  onTaskContextMenu?: (event: OgeGanttTaskClickEvent<T>) => void;
  onSelectionChanged?: (event: OgeGanttSelectionChangedEvent<T>) => void;
  onTaskEditDialogShowing?: (event: OgeGanttDialogShowingEvent<T>) => void;
  onSchedulingConflict?: (event: OgeGanttSchedulingConflictEvent<T>) => void;
  onDependencyUpdating?: (event: OgeGanttDependencyUpdatingEvent<D>) => void;
  onDependencyUpdated?: (event: OgeGanttDependencyUpdatedEvent<D>) => void;
  onSortChanged?: (event: OgeGanttSortChangedEvent) => void;
  onColumnResized?: (event: OgeGanttColumnResizedEvent) => void;
  onColumnReordered?: (event: OgeGanttColumnReorderedEvent) => void;

  /* ---------------- render props ---------------- */
  /** Replaces the bar's title content (`*ogeGanttTaskTemplate`). */
  renderTask?: (context: OgeGanttTaskRenderContext<T>) => ReactNode;
  /** Replaces the hover tooltip's content (`*ogeGanttTooltipTemplate`). */
  renderTooltip?: (context: OgeGanttTooltipRenderContext<T>) => ReactNode;

  className?: string;
  style?: CSSProperties;
}

/** The imperative handle (`ref`) — every public method of the Angular Gantt. */
export interface OgeGanttHandle<
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
> {
  /** Inserts a task through the cancelable pipeline. */
  insertTask(taskData: T): void;
  /** Updates a task's fields through the cancelable pipeline. */
  updateTask(taskData: T, patch: Partial<T>): void;
  /** Deletes a task (and its dependency links) through the pipeline. */
  deleteTask(taskData: T): void;
  /** Inserts a dependency link (cycle-checked, cancelable), optionally with a lag. */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type?: OgeGanttDependencyType,
    options?: { readonly lag?: number; readonly lagUnit?: GanttLagUnit },
  ): void;
  /** Updates a link's fields (type, lag, lag unit…) through the pipeline. */
  updateDependency(dependencyData: D, patch: Partial<D>): void;
  /** Runs the scheduling engine now (one undo step). */
  scheduleProject(): void;
  /** Total and free slack of a leaf task (days), or `null`. */
  getTaskSlack(key: RowKey): OgeGanttSlack | null;
  /** Saves every leaf task's dates as baseline `index` (0-based). */
  setBaseline(index?: number): void;
  /** Applies a zoom preset by index. */
  applyZoomPreset(index: number): void;
  /** Sorts the task list by a column; `null` clears the sort. */
  sortBy(field: string | null, direction?: 'asc' | 'desc'): void;
  setFilter(field: string, text: string): void;
  setSearchText(text: string): void;
  clearFilters(): void;
  setColumnWidth(field: string, widthPx: number): void;
  moveColumn(field: string, toIndex: number): void;
  /** Opens the inline editor on a cell. */
  editCell(task: OgeGanttTask<T>, field?: string): boolean;
  getSelectedTasks(): OgeGanttTask<T>[];
  selectAll(): void;
  clearSelection(): void;
  deleteTasks(items: readonly T[]): void;
  indentTasks(tasks: readonly OgeGanttTask<T>[]): void;
  outdentTasks(tasks: readonly OgeGanttTask<T>[]): void;
  /** Deletes a dependency link through the pipeline. */
  deleteDependency(dependencyData: D): void;
  /** Reverts the last committed change. */
  undo(): void;
  /** Re-applies the last undone change. */
  redo(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomToFit(): void;
  /** Scrolls the chart so `date` sits near the left edge. */
  scrollToDate(date: Date): void;
  expandAll(): void;
  collapseAll(): void;
  /** Collapses summaries at or below `level`. */
  expandAllToLevel(level: number): void;
  /** Expands every ancestor of `key` and reveals its row. */
  expandToTask(key: RowKey): void;
  /** Opens the task dialog — edit form for a task, create form without. */
  showTaskDetailsDialog(taskData?: T): void;
  /** Makes the task a child of its previous sibling. */
  indentTask(task: OgeGanttTask<T>): void;
  /** Moves the task up to its grandparent (or the root). */
  outdentTask(task: OgeGanttTask<T>): void;
  /** Focuses the roving task row. */
  focus(): void;
  /** Snapshot for the exporters. */
  getExportData(): OgeGanttExportData<T>;
}
