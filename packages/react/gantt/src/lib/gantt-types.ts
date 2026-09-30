import type { CSSProperties, ReactNode } from 'react';
import type { RowKey } from '@oge-ui/core';
import type {
  GanttFieldExpr,
  OgeGanttColumn,
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
  holidays?: readonly Date[];
  workCalendar?: OgeGanttWorkCalendar | null;
  showResourceWorkload?: boolean;
  stripLines?: readonly OgeGanttStripLine[];
  autoScheduling?: boolean;
  locale?: string;
  /** Per-instance overrides, merged over the provider's messages per block. */
  messages?: Partial<OgeGanttMessages>;

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
  /** Inserts a dependency link (cycle-checked, cancelable). */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type?: OgeGanttDependencyType,
  ): void;
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
