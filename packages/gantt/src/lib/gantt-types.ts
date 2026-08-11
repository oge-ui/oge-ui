/** Public types of `@oge-ui/gantt`. */
import type { OgeFormItemData } from '@oge-ui/forms';
import type { RowKey } from '@oge-ui/core';
import type {
  GanttDependency,
  GanttDependencyType,
  GanttTask,
} from './engine/gantt-model';
import type { GanttScaleType } from './engine/time-scale';

/** The timeline scale units: `'hours' | 'days' | 'weeks' | 'months'`. */
export type OgeGanttScaleType = GanttScaleType;

/** A normalized task row — the payload of events and templates. */
export type OgeGanttTask<T = unknown> = GanttTask<T>;

/** A normalized dependency link. */
export type OgeGanttDependency<D = unknown> = GanttDependency<D>;

/** Dependency link types. */
export type OgeGanttDependencyType = GanttDependencyType;

/** One task-list column. */
export interface OgeGanttColumn {
  /** `'title' | 'start' | 'end' | 'duration' | 'progress'` or a data field. */
  readonly field: string;
  /** Header text; built-in fields default to the messages entry. */
  readonly header?: string;
  readonly widthPx?: number;
  /** Custom cell text; wins over the built-in formatting. */
  readonly format?: (task: OgeGanttTask) => string;
}

/** A vertical marker or shaded range on the chart (dx stripLines parity). */
export interface OgeGanttStripLine {
  readonly start: Date;
  /** With `end`, a shaded range; without, a vertical line. */
  readonly end?: Date;
  readonly label?: string;
  readonly color?: string;
}

/** Where the task title renders relative to its bar. */
export type OgeGanttTaskTitlePosition = 'inside' | 'outside' | 'none';

/** Cancelable: before a new task reaches the store. */
export interface OgeGanttTaskInsertingEvent<T = unknown> {
  readonly taskData: T;
  cancel: boolean;
}
export interface OgeGanttTaskInsertedEvent<T = unknown> {
  readonly taskData: T;
}
/** Cancelable: before a task update reaches the store. */
export interface OgeGanttTaskUpdatingEvent<T = unknown> {
  readonly oldData: T;
  readonly newData: Partial<T>;
  cancel: boolean;
}
export interface OgeGanttTaskUpdatedEvent<T = unknown> {
  readonly taskData: T;
}
/** Cancelable: before a task is removed from the store. */
export interface OgeGanttTaskDeletingEvent<T = unknown> {
  readonly taskData: T;
  cancel: boolean;
}
export interface OgeGanttTaskDeletedEvent<T = unknown> {
  readonly taskData: T;
}
/** Cancelable: before a dependency link is inserted. */
export interface OgeGanttDependencyInsertingEvent {
  readonly predecessorKey: RowKey;
  readonly successorKey: RowKey;
  readonly type: OgeGanttDependencyType;
  cancel: boolean;
}
export interface OgeGanttDependencyInsertedEvent<D = unknown> {
  readonly dependencyData: D;
}
/** Cancelable: before a dependency link is removed. */
export interface OgeGanttDependencyDeletingEvent<D = unknown> {
  readonly dependencyData: D;
  cancel: boolean;
}
export interface OgeGanttDependencyDeletedEvent<D = unknown> {
  readonly dependencyData: D;
}

/** Task click / double-click. */
export interface OgeGanttTaskClickEvent<T = unknown> {
  readonly task: OgeGanttTask<T>;
  readonly event: MouseEvent;
}

/** Selection change (single-row selection). */
export interface OgeGanttSelectionChangedEvent<T = unknown> {
  readonly task: OgeGanttTask<T> | null;
}

/**
 * Cancelable: before the task dialog opens; replace `formItems` to
 * customize the form (dx `onTaskEditDialogShowing` parity).
 */
export interface OgeGanttDialogShowingEvent<T = unknown> {
  readonly taskData: T;
  readonly isNew: boolean;
  formItems: OgeFormItemData[];
  cancel: boolean;
}
