import type { CSSProperties, ReactNode } from 'react';
import type { DataSource } from '@oge-ui/core';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';
import type {
  OgeSchedulerAdaptiveView,
  OgeSchedulerAppointment,
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentAddingEvent,
  OgeSchedulerAppointmentClickEvent,
  OgeSchedulerAppointmentDeletedEvent,
  OgeSchedulerAppointmentDeletingEvent,
  OgeSchedulerAppointmentDroppedEvent,
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentUpdatingEvent,
  OgeSchedulerCellClickEvent,
  OgeSchedulerConflictCheck,
  OgeSchedulerDisabledSlots,
  OgeSchedulerDragOutEvent,
  OgeSchedulerEditorShowingEvent as EditorShowingEventBase,
  OgeSchedulerExportData,
  OgeSchedulerGroupOrientation,
  OgeSchedulerMessages,
  OgeSchedulerMoreMode,
  OgeSchedulerPrintOptions,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWeekNumberRule,
  OgeSchedulerWorkHours,
  SchedulerFieldExpr,
  SchedulerPasteTarget,
} from '@oge-ui/scheduler-engine';

/**
 * The React face of the scheduler family. The vocabulary, the defaults and
 * every decision come from `@oge-ui/scheduler-engine` (ADR 0003); what this
 * file adds is the part that cannot be shared — render props standing in
 * for Angular's `TemplateRef` slots, and the props/callbacks standing in for
 * its inputs and outputs.
 */

/**
 * Cancelable: fires before the appointment editor opens; replace
 * `formItems` to customize the form (dx `onAppointmentFormOpening` parity).
 * The items are `<OgeForm>` item definitions — render props included.
 */
export type OgeSchedulerEditorShowingEvent<T = unknown> =
  EditorShowingEventBase<T, OgeFormItemDefinition>;

/** What `renderAppointment` is handed — Angular's `*ogeAppointmentTemplate` context. */
export interface OgeAppointmentRenderContext<T = unknown> {
  /** The normalized appointment (or occurrence). */
  readonly appointment: OgeSchedulerAppointment<T>;
  /** The view rendering the chip. */
  readonly view: OgeSchedulerView;
}

/** What `renderCell` is handed — Angular's `ogeCellTemplate` context. */
export interface OgeSchedulerCellRenderContext {
  /** The cell's start date/time. */
  readonly date: Date;
  readonly view: OgeSchedulerView;
  /** True in month cells. */
  readonly allDay: boolean;
}

/** What `renderDateHeader` is handed — Angular's `ogeDateHeaderTemplate` context. */
export interface OgeDateHeaderRenderContext {
  /** The column's date. */
  readonly date: Date;
  readonly view: OgeSchedulerView;
}

/** What `renderResourceHeader` is handed — Angular's `ogeResourceHeaderTemplate` context. */
export interface OgeResourceHeaderRenderContext {
  /** The resource item heading the column / row. */
  readonly item: OgeSchedulerResourceItem;
  /** The resource kind the item belongs to. */
  readonly resource: OgeSchedulerResource;
  /** Nesting level (0 = outermost `groups` entry). */
  readonly level: number;
  readonly view: OgeSchedulerView;
}

/** Props of `<OgeScheduler>`. */
export interface OgeSchedulerProps<T extends object = Record<string, unknown>> {
  /** Appointment items: a plain array or any `@oge-ui/core` `DataSource`. */
  dataSource?: readonly T[] | DataSource<T> | null;
  /** Key field or selector; defaults to `id`, falling back to the item index. */
  keyExpr?: string | ((item: T) => unknown);
  textExpr?: SchedulerFieldExpr<T, unknown>;
  startDateExpr?: SchedulerFieldExpr<T, unknown>;
  endDateExpr?: SchedulerFieldExpr<T, unknown>;
  allDayExpr?: SchedulerFieldExpr<T, unknown>;
  colorExpr?: SchedulerFieldExpr<T, unknown>;
  locationExpr?: SchedulerFieldExpr<T, unknown>;
  descriptionExpr?: SchedulerFieldExpr<T, unknown>;
  recurrenceRuleExpr?: SchedulerFieldExpr<T, unknown>;
  recurrenceExceptionExpr?: SchedulerFieldExpr<T, unknown>;
  disabledExpr?: SchedulerFieldExpr<T, unknown>;
  reminderExpr?: SchedulerFieldExpr<T, unknown>;

  /** The anchor date of the visible period — controlled when provided. */
  currentDate?: Date;
  /** Uncontrolled initial anchor date; defaults to today. */
  defaultCurrentDate?: Date;
  /** The controlled half of `currentDate`. */
  onCurrentDateChange?: (date: Date) => void;
  /** The active view — controlled when provided. */
  currentView?: OgeSchedulerView;
  /** Uncontrolled initial view; defaults to `'week'`. */
  defaultCurrentView?: OgeSchedulerView;
  /** The controlled half of `currentView`. */
  onCurrentViewChange?: (view: OgeSchedulerView) => void;

  /** The views offered by the switcher, optionally with per-view overrides. */
  views?: readonly (OgeSchedulerView | OgeSchedulerViewOptions)[];
  /**
   * Switches the visible view to agenda when the scheduler's **own** width
   * (a `ResizeObserver`, not the window) drops below 600px, and back to the
   * previous view when it grows again — `true`, or `{ breakpoint, view }`.
   * Off (`false`) by default. The switch writes `currentView` like a user
   * pick, on crossings only, so the switcher keeps working at any width.
   */
  adaptiveView?: OgeSchedulerAdaptiveView;
  /** First day of week (0 = Sunday); `undefined` resolves from the locale. */
  firstDayOfWeek?: number;
  /**
   * Weekend days (0 = Sunday … 6 = Saturday) the views shade and the
   * `workWeek` view drops; `undefined` resolves from the locale's
   * `Intl.Locale` week data (Friday + Saturday in `he-IL`), falling back to
   * Saturday + Sunday.
   */
  weekendDays?: readonly number[];
  dayStartHour?: number;
  dayEndHour?: number;
  /** Slot raster in minutes. */
  cellDuration?: number;
  showAllDayPanel?: boolean;
  showCurrentTimeIndicator?: boolean;
  /** Month-view lane budget per cell; `'auto'` picks a sensible default. */
  maxAppointmentsPerCell?: number | 'auto';
  /** Days the agenda view lists from the anchor date. */
  agendaDuration?: number;
  /** Resource kinds appointments can be assigned to. */
  resources?: readonly OgeSchedulerResource[];
  /**
   * Resource fields grouping the views, outermost first (`['roomId',
   * 'ownerId']` nests owners inside rooms): day/week columns or row blocks,
   * timeline rows with group header rows.
   */
  groups?: readonly string[];
  /**
   * How grouped resources lay out: `'horizontal'` side by side, or
   * `'vertical'` stacked (day/week row blocks; the timeline default). A
   * view option's own `groupOrientation` wins.
   */
  groupOrientation?: OgeSchedulerGroupOrientation;
  /**
   * Horizontal day/week grouping is date-major (`true`, the default) or
   * resource-major (`false`).
   */
  groupByDate?: boolean;
  /** Shows week numbers in the month rows and the day/week header corner. */
  showWeekNumbers?: boolean;
  /** Week numbering: ISO 8601 (default) or the locale's own. */
  weekNumberRule?: OgeSchedulerWeekNumberRule;
  /**
   * Non-bookable slots — a predicate `(date, resources) => boolean` or a
   * list of (optionally recurring, per-resource) ranges: rendered hatched,
   * refused by create / move / resize / paste / drop and announced.
   */
  disabledSlots?: OgeSchedulerDisabledSlots | null;
  /** Clamps timed moves, creates and drops into the target's working hours. */
  snapToWorkHours?: boolean;
  /** `false` refuses a create / move / resize that overlaps another appointment. */
  allowOverlap?: boolean;
  /** Decides overlapping changes; `true` lets one land. Wins over `allowOverlap`. */
  conflictCheck?: OgeSchedulerConflictCheck<T>;
  /** The selected items — controlled when provided. */
  selectedAppointments?: readonly T[];
  /** Uncontrolled initial selection. */
  defaultSelectedAppointments?: readonly T[];
  /** The controlled half of `selectedAppointments`. */
  onSelectedAppointmentsChange?: (items: readonly T[]) => void;
  /** Undo steps kept for Ctrl+Z / Ctrl+Y (`0` turns undo off). Default 50. */
  undoLimit?: number;
  /** What a month "+N more" does. Default `'popup'`. */
  moreMode?: OgeSchedulerMoreMode;
  /** Timeline row virtualization: `'auto'` (more than 50 rows), `true` or `false`. */
  virtualScrolling?: boolean | 'auto';
  /** BCP 47 locale for every `Intl` format; defaults to the browser locale. */
  locale?: string;
  /** Per-instance overrides of the context-configured messages. */
  messages?: Partial<OgeSchedulerMessages>;

  allowAdding?: boolean;
  allowUpdating?: boolean;
  allowDeleting?: boolean;
  allowDragging?: boolean;
  allowResizing?: boolean;
  /** Shows the toolbar "new appointment" button. */
  showAddButton?: boolean;
  /** How edits to a recurring occurrence apply. */
  recurrenceEditMode?: 'dialog' | 'occurrence' | 'series';
  /** Display-only shorthand: overrides every `allow*` flag at once. */
  readOnly?: boolean;
  /** Earliest navigable date. */
  min?: Date;
  /** Latest navigable date. */
  max?: Date;
  /** Weekdays (0 = Sunday) hidden from the week views. */
  hiddenWeekDays?: readonly number[];
  /** Working-hours emphasis; cells outside get the off-hours shading. */
  workHours?: OgeSchedulerWorkHours | null;
  /** Shades today's column above the now-line. */
  shadeUntilCurrentTime?: boolean;
  /** Drag/resize snap raster in minutes; defaults to `cellDuration`. */
  snapDuration?: number;
  /** Initial scroll position of the day/week body, in hours (e.g. `8.5`). */
  scrollTime?: number;
  /**
   * Right-to-left layout: day columns, month cells and the timeline run
   * right-to-left, and Left/Right keys and horizontal drags mirror. Unset
   * follows the page (`ogeResolveDirection`, kept current while mounted); an
   * explicit value is also set as `dir` on the host.
   */
  rtlEnabled?: boolean;
  /** Custom period-title formatter for the toolbar date navigator. */
  dateNavigatorText?: (
    start: Date,
    end: Date,
    view: OgeSchedulerView,
  ) => string;

  /** Replaces the chip content — the React face of `*ogeAppointmentTemplate`. */
  renderAppointment?: (context: OgeAppointmentRenderContext<T>) => ReactNode;
  /** Rendered inside every empty grid cell — the React face of `ogeCellTemplate`. */
  renderCell?: (context: OgeSchedulerCellRenderContext) => ReactNode;
  /** Replaces the day/week date headers — the React face of `ogeDateHeaderTemplate`. */
  renderDateHeader?: (context: OgeDateHeaderRenderContext) => ReactNode;
  /**
   * Replaces the grouped resource headers (day/week columns, timeline row
   * heads and group rows) — the React face of `ogeResourceHeaderTemplate`.
   */
  renderResourceHeader?: (context: OgeResourceHeaderRenderContext) => ReactNode;

  /** Cancelable: before a new appointment reaches the store. */
  onAppointmentAdding?: (event: OgeSchedulerAppointmentAddingEvent<T>) => void;
  /** After an appointment was inserted. */
  onAppointmentAdded?: (event: OgeSchedulerAppointmentAddedEvent<T>) => void;
  /** Cancelable: before an update reaches the store. */
  onAppointmentUpdating?: (
    event: OgeSchedulerAppointmentUpdatingEvent<T>,
  ) => void;
  /** After an appointment was updated. */
  onAppointmentUpdated?: (
    event: OgeSchedulerAppointmentUpdatedEvent<T>,
  ) => void;
  /** Cancelable: before an appointment is removed from the store. */
  onAppointmentDeleting?: (
    event: OgeSchedulerAppointmentDeletingEvent<T>,
  ) => void;
  /** After an appointment was removed. */
  onAppointmentDeleted?: (
    event: OgeSchedulerAppointmentDeletedEvent<T>,
  ) => void;
  /** Chip single click (also opens the appointment popup). */
  onAppointmentClick?: (event: OgeSchedulerAppointmentClickEvent<T>) => void;
  /** Chip double click (also opens the editor). */
  onAppointmentDblClick?: (event: OgeSchedulerAppointmentClickEvent<T>) => void;
  /** Empty-cell click. */
  onCellClick?: (event: OgeSchedulerCellClickEvent) => void;
  /** Empty-cell double click (also opens the create editor). */
  onCellDblClick?: (event: OgeSchedulerCellClickEvent) => void;
  /** Cancelable: before the editor opens; customize `formItems` here. */
  onEditorShowing?: (event: OgeSchedulerEditorShowingEvent<T>) => void;
  /** A drag-to-create range selection landed (also opens the editor). */
  onRangeSelected?: (event: OgeSchedulerRangeSelectedEvent) => void;
  /** Right-click on a chip. */
  onAppointmentContextMenu?: (
    event: OgeSchedulerAppointmentClickEvent<T>,
  ) => void;
  /** Right-click on an empty cell. */
  onCellContextMenu?: (event: OgeSchedulerCellClickEvent) => void;
  /** An appointment's reminder lead time was reached (checked ~30s). */
  onReminderTriggered?: (event: OgeSchedulerReminderEvent<T>) => void;
  /** A `useOgeSchedulerDraggable` item (or another scheduler's appointment) was dropped in. */
  onAppointmentDropped?: (event: OgeSchedulerAppointmentDroppedEvent<T>) => void;
  /** An appointment was dragged out of the scheduler and released. */
  onDragOut?: (event: OgeSchedulerDragOutEvent<T>) => void;

  className?: string;
  style?: CSSProperties;
}

/** The imperative surface of `<OgeScheduler>` — Angular's public methods. */
export interface OgeSchedulerHandle<
  T extends object = Record<string, unknown>,
> {
  /** Focuses the active view's grid (roving cell). */
  focus(): void;
  /** Scrolls the day/week body so `hours:minutes` sits at the top. */
  scrollToTime(hours: number, minutes?: number): void;
  /** Navigates to `date` and scrolls the time grid to its time of day. */
  scrollTo(date: Date): void;
  /**
   * Opens the editing form — a prefilled create form with `createNew` / no
   * data, the edit form of the given item otherwise.
   */
  showAppointmentPopup(appointmentData?: Partial<T>, createNew?: boolean): void;
  /** Closes the editor dialog and the summary popup. */
  hideAppointmentPopup(): void;
  /** Inserts through the same cancelable pipeline as interactive creation. */
  addAppointment(appointmentData: T): void;
  /** Applies a patch to an existing item through the guarded pipeline. */
  updateAppointment(appointmentData: T, patch: Partial<T>): void;
  /** Deletes an item through the guarded pipeline. */
  deleteAppointment(appointmentData: T): void;
  /** First moment of the visible period. */
  getStartViewDate(): Date;
  /** Exclusive end of the visible period. */
  getEndViewDate(): Date;
  /** The bound data source, as given. */
  getDataSource(): readonly T[] | DataSource<T> | null;
  /** Moves the visible period to today. */
  goToday(): void;
  /** Steps the visible period backwards (`-1`) or forwards (`1`). */
  navigate(direction: -1 | 1): void;
  /** Copies the selection (or `appointment`) to the scheduler clipboard. */
  copyAppointments(appointment?: OgeSchedulerAppointment<T> | null): number;
  /** Pastes the clipboard at `target`, as one undo step. */
  pasteAppointments(target: SchedulerPasteTarget): number;
  /** Empties the selection. */
  clearSelection(): void;
  /** Reverts the last scheduler edit (Ctrl+Z). */
  undo(): boolean;
  /** Re-applies the last undone edit (Ctrl+Y). */
  redo(): boolean;
  /** Whether `undo()` has a step to revert. */
  canUndo(): boolean;
  /** Whether `redo()` has a step to re-apply. */
  canRedo(): boolean;
  /** The export model the `/export-*` entries consume. */
  getExportData(range?: {
    readonly startDate: Date;
    readonly endDate: Date;
  }): OgeSchedulerExportData<T>;
  /** Prints the current view. */
  print(options?: OgeSchedulerPrintOptions): Promise<void>;
}
