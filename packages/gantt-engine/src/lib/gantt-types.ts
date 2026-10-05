/**
 * Public types of the Gantt family — framework-free, shared by
 * `@oge-ui/gantt` (Angular) and `@oge-ui/react-gantt` (React), which both
 * re-export them under the same names.
 */
import type { RowKey } from '@oge-ui/core';
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import type {
  GanttConstraintType,
  GanttDependency,
  GanttDependencyType,
  GanttLagUnit,
  GanttSegment,
  GanttTask,
} from './engine/gantt-model';
import type {
  GanttConflictKind,
  GanttSchedulingConflict,
  GanttSlack,
} from './engine/schedule';
import type { GanttCellEditorType } from './engine/task-list';
import type { GanttScaleType } from './engine/time-scale';
import type { GanttWorkCalendar } from './engine/work-calendar';

/** Work-time calendar: working weekdays (0 = Sunday) + holiday dates. */
export type OgeGanttWorkCalendar = GanttWorkCalendar;

/** The timeline scale units: `'hours' | 'days' | 'weeks' | 'months' | 'quarters' | 'years'`. */
export type OgeGanttScaleType = GanttScaleType;

/** Task constraint types: `'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO'`. */
export type OgeGanttConstraintType = GanttConstraintType;

/** Dependency lag unit: `'days'` (working days on a calendar) or `'hours'`. */
export type OgeGanttLagUnit = GanttLagUnit;

/** A dated piece — a split-task segment or a baseline: `{ start, end }`. */
export type OgeGanttSegment = GanttSegment;

/** Total / free slack of a task, in days. */
export type OgeGanttSlack = GanttSlack;

/** Editor of a task-list cell. */
export type OgeGanttCellEditorType = GanttCellEditorType;

/** What a scheduling conflict breaks: `'dependency' | 'constraint' | 'deadline'`. */
export type OgeGanttConflictKind = GanttConflictKind;

/** Task-list (`'tasks'`) or resource-centric rows (`'resources'`). */
export type OgeGanttViewMode = 'tasks' | 'resources';

/** Row selection: one row, or Ctrl/Shift multi-select with bulk actions. */
export type OgeGanttSelectionMode = 'single' | 'multiple';

/** Column sort direction. */
export type OgeGanttSortDirection = 'asc' | 'desc';

/** A normalized task row — the payload of events and templates. */
export type OgeGanttTask<T = unknown> = GanttTask<T>;

/** A normalized dependency link. */
export type OgeGanttDependency<D = unknown> = GanttDependency<D>;

/** Dependency link types. */
export type OgeGanttDependencyType = GanttDependencyType;

/**
 * One assignable resource: bar label, dialog tag-editor choice and workload
 * band row. Its own `calendar` overrides the Gantt's `workCalendar` for the
 * tasks assigned to it (first assigned resource with a calendar wins).
 */
export interface OgeGanttResource {
  readonly id: unknown;
  readonly text: string;
  readonly color?: string;
  readonly calendar?: OgeGanttWorkCalendar;
  /** Capacity in % for the utilization histogram (default 100). */
  readonly capacity?: number;
}

/** One task-list column. */
export interface OgeGanttColumn {
  /** `'title' | 'start' | 'end' | 'duration' | 'progress'` or a data field. */
  readonly field: string;
  /** Header text; built-in fields default to the messages entry. */
  readonly header?: string;
  readonly widthPx?: number;
  /** Custom cell text; wins over the built-in formatting. */
  readonly format?: (task: OgeGanttTask) => string;
  /**
   * Inline editor (with `inlineEditing`): built-in fields pick theirs
   * (`wbs` / slack columns are read-only); a data field defaults to `'text'`.
   * `false` makes the column read-only.
   */
  readonly editor?: OgeGanttCellEditorType | false;
  /** Header click sorting (with `allowSorting`); default `true`. */
  readonly allowSorting?: boolean;
  /** Pins the column to the pane's start edge while it scrolls sideways. */
  readonly frozen?: boolean;
}

/** One entry of the toolbar's zoom-preset chooser. */
export interface OgeGanttZoomPreset {
  readonly scaleType: OgeGanttScaleType;
  /** Minor tick width in px; unset = the scale's default. */
  readonly tickWidth?: number;
  /** Option text; unset = the scale's messages name. */
  readonly label?: string;
}

/** One scheduling violation, resolved for display. */
export interface OgeGanttSchedulingConflict<T = unknown>
  extends GanttSchedulingConflict {
  readonly task: OgeGanttTask<T>;
  /** Readable description from the messages catalog. */
  readonly message: string;
}

/** The set of scheduling conflicts changed (also fired when it empties). */
export interface OgeGanttSchedulingConflictEvent<T = unknown> {
  readonly conflicts: readonly OgeGanttSchedulingConflict<T>[];
}

/** Cancelable: before a dependency's type / lag change reaches the store. */
export interface OgeGanttDependencyUpdatingEvent<D = unknown> {
  readonly oldData: D;
  readonly newData: Partial<D>;
  cancel: boolean;
}
export interface OgeGanttDependencyUpdatedEvent<D = unknown> {
  readonly dependencyData: D;
}

/** The column sort changed; `field: null` = cleared. */
export interface OgeGanttSortChangedEvent {
  readonly field: string | null;
  readonly direction: OgeGanttSortDirection | null;
}

/** A task-list column was resized (pointer or Alt+Arrow). */
export interface OgeGanttColumnResizedEvent {
  readonly field: string;
  readonly widthPx: number;
}

/** A task-list column moved (drag or Ctrl+Shift+Arrow). */
export interface OgeGanttColumnReorderedEvent {
  readonly field: string;
  readonly fromIndex: number;
  readonly toIndex: number;
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
 * Snapshot of the widget for the Excel/PDF/PNG exporters: every task in tree
 * order (collapse ignored), the resolved columns, the chart range and the
 * critical-path keys.
 */
export interface OgeGanttExportData<T = unknown> {
  readonly tasks: readonly OgeGanttTask<T>[];
  readonly columns: readonly OgeGanttExportColumn<T>[];
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
  readonly critical: ReadonlySet<RowKey>;
  /** Joined resource names of a task, or `null`. */
  readonly resourceText: (task: OgeGanttTask<T>) => string | null;
  /**
   * Every normalized link (lag included) — the MS Project export reads it.
   * Optional so hand-built snapshots from 1.1 keep type-checking.
   */
  readonly dependencies?: readonly OgeGanttDependency[];
  readonly resources?: readonly OgeGanttResource[];
  /** The effective work calendar (`workCalendar` + `holidays`), or `null`. */
  readonly workCalendar?: OgeGanttWorkCalendar | null;
  /** Total / free slack per leaf task. */
  readonly slack?: ReadonlyMap<RowKey, OgeGanttSlack>;
}

/** Task click / double-click / context menu. */
export interface OgeGanttTaskClickEvent<T = unknown> {
  readonly task: OgeGanttTask<T>;
  readonly event: MouseEvent;
}

/** Selection change: the primary (last clicked) row and, multi-select, all. */
export interface OgeGanttSelectionChangedEvent<T = unknown> {
  readonly task: OgeGanttTask<T> | null;
  /** Every selected task (one entry, or none, in single mode). */
  readonly tasks: readonly OgeGanttTask<T>[];
}

/**
 * Cancelable: before the task dialog opens; replace `formItems` to
 * customize the form (dx `onTaskEditDialogShowing` parity). `I` is the render
 * layer's form item type — Angular's `OgeFormItemData`, React's
 * `OgeFormItemDefinition`; both extend the shared `OgeFormItemDataBase`.
 */
export interface OgeGanttDialogShowingEvent<
  T = unknown,
  I extends OgeFormItemDataBase = OgeFormItemDataBase,
> {
  readonly taskData: T;
  readonly isNew: boolean;
  formItems: I[];
  cancel: boolean;
}
