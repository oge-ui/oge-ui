/** Public types of `@oge-ui/gantt`. */
import type { OgeFormItemData } from '@oge-ui/forms';
import type { RowKey } from '@oge-ui/core';
import type {
  GanttDependency,
  GanttDependencyType,
  GanttTask,
} from './engine/gantt-model';
import type { GanttScaleType } from './engine/time-scale';
import type { GanttWorkCalendar } from './engine/work-calendar';

/** Work-time calendar: working weekdays (0 = Sunday) + holiday dates. */
export type OgeGanttWorkCalendar = GanttWorkCalendar;

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

/** One resolved column handed to the exporters. */
export interface OgeGanttExportColumn<T = unknown> {
  readonly field: string;
  readonly header: string;
  /** Cell text with the same formatting as the task-list pane. */
  readonly text: (task: OgeGanttTask<T>) => string;
}

/**
 * Snapshot of the widget for the Excel/PDF exporters
 * (`@oge-ui/gantt/export-excel`, `@oge-ui/gantt/export-pdf`): every task in
 * tree order (collapse ignored), the resolved columns, the chart range and
 * the critical-path keys.
 */
export interface OgeGanttExportData<T = unknown> {
  readonly tasks: readonly OgeGanttTask<T>[];
  readonly columns: readonly OgeGanttExportColumn<T>[];
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
  readonly critical: ReadonlySet<RowKey>;
  /** Joined resource names of a task, or `null`. */
  readonly resourceText: (task: OgeGanttTask<T>) => string | null;
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
