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
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentUpdatingEvent,
  OgeSchedulerCellClickEvent,
  OgeSchedulerEditorShowingEvent as EditorShowingEventBase,
  OgeSchedulerMessages,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWorkHours,
  SchedulerFieldExpr,
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
  /** Field of the resource that groups the views (first entry). */
  groups?: readonly string[];
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
}
