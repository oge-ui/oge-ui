/**
 * Public vocabulary of the scheduler family — shared by `@oge-ui/scheduler`
 * (Angular) and `@oge-ui/react-scheduler`, which re-export it. Only the
 * editor-showing event differs per layer (its form items carry that layer's
 * content slots), so it is generic over the item type here.
 */
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import type { RowKey } from '@oge-ui/core';
import type { SchedulerAppointment } from './scheduler-model';
import type { SchedulerViewType } from './view-model';

/**
 * The scheduler's view types: `'day' | 'week' | 'workWeek' | 'month' |
 * 'agenda' | 'year'` and the timelines `'timelineDay' | 'timelineWeek' |
 * 'timelineWorkWeek' | 'timelineMonth' | 'timelineYear'`.
 */
export type OgeSchedulerView = SchedulerViewType;

/** How grouped resources lay out: side by side, or stacked as row blocks. */
export type OgeSchedulerGroupOrientation = 'horizontal' | 'vertical';

/** Week numbering: ISO 8601 (Monday-first, 4-day rule) or the locale's own. */
export type OgeSchedulerWeekNumberRule = 'iso' | 'locale';

/** What a month view's "+N more" button does. */
export type OgeSchedulerMoreMode = 'popup' | 'drill';

/** Emphasized working hours; cells outside get the off-hours shading. */
export interface OgeSchedulerWorkHours {
  /** First working hour (fractions allowed, e.g. `8.5`). */
  readonly start: number;
  /** First non-working hour after the block. */
  readonly end: number;
  /** Working weekdays (0 = Sunday); omitted = every rendered day. */
  readonly days?: readonly number[];
}

/** One assignable resource choice. */
export interface OgeSchedulerResourceItem {
  readonly id: unknown;
  readonly text: string;
  readonly color?: string;
  /**
   * The resource's own working hours — shades its grouped columns / rows
   * and bounds `snapToWorkHours`; the innermost grouped level that sets
   * them wins over the scheduler-wide `workHours`.
   */
  readonly workHours?: Pick<OgeSchedulerWorkHours, 'start' | 'end'>;
  /** The resource's working weekdays (0 = Sunday). */
  readonly workDays?: readonly number[];
}

/**
 * A non-bookable range (lunch, a holiday, a room under maintenance):
 * rendered hatched, refused by create / move / resize / drop and announced.
 */
export interface OgeSchedulerBlockedRange {
  readonly startDate: Date;
  readonly endDate: Date;
  /**
   * Limits the block to resources: `{ roomId: 'r1' }`, or a list of ids per
   * field. Omitted = every resource.
   */
  readonly resources?: Readonly<Record<string, unknown>>;
  /** Repeats the block (RRULE subset, e.g. `FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR`). */
  readonly recurrenceRule?: string;
  /** A label for the hatched area (tooltip / screen-reader text). */
  readonly text?: string;
}

/**
 * Blocked slots: a predicate over a slot's start and its resources (the
 * grouped field values, `{}` ungrouped), or a list of blocked ranges.
 */
export type OgeSchedulerDisabledSlots =
  | ((date: Date, resources: Readonly<Record<string, unknown>>) => boolean)
  | readonly OgeSchedulerBlockedRange[];

/**
 * Decides whether a change that overlaps other appointments may land:
 * called with the proposed item and the appointments it would overlap;
 * return `true` to allow it, `false` to refuse it (announced).
 */
export type OgeSchedulerConflictCheck<T = unknown> = (
  appointment: T,
  conflicts: readonly OgeSchedulerAppointment<T>[],
) => boolean;

/** Fires after an external item (or another scheduler's appointment) was dropped in. */
export interface OgeSchedulerAppointmentDroppedEvent<T = unknown> {
  /** What the draggable carried (`[ogeSchedulerDraggable]` data). */
  readonly itemData: unknown;
  /** The appointment item built from it (fields mapped through the `*Expr`s). */
  readonly appointmentData: T;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay: boolean;
  /** The grouped resource values of the drop slot (`{}` ungrouped). */
  readonly resources: Readonly<Record<string, unknown>>;
  /** Whether the item reached the store (`appointmentAdding` may veto). */
  readonly added: boolean;
}

/** Fires when an appointment was dragged out of the scheduler and released. */
export interface OgeSchedulerDragOutEvent<T = unknown> {
  readonly appointment: OgeSchedulerAppointment<T>;
  readonly appointmentData: T;
  readonly clientX: number;
  readonly clientY: number;
  /** The element under the pointer on release. */
  readonly target: Element | null;
  /** Whether another scheduler accepted the drop (it emits `appointmentDropped`). */
  readonly droppedOnScheduler: boolean;
}

/** A resource kind appointments can be assigned to (dx `resources` parity). */
export interface OgeSchedulerResource {
  /** Item field holding the assigned resource id. */
  readonly fieldExpr: string;
  readonly items: readonly OgeSchedulerResourceItem[];
  /** Editor label; defaults to the field name. */
  readonly label?: string;
  /** Colors appointments without an own color from this resource. */
  readonly useColorAsDefault?: boolean;
}

/** Fires when an appointment's reminder lead time is reached. */
export interface OgeSchedulerReminderEvent<T = unknown> {
  readonly appointmentData: T;
  readonly appointment: OgeSchedulerAppointment<T>;
}

/** Fires after a drag-to-create cell-range selection lands. */
export interface OgeSchedulerRangeSelectedEvent {
  readonly startDate: Date;
  readonly endDate: Date;
  /** The grouped resource values of the column (`{}` ungrouped). */
  readonly resources?: Readonly<Record<string, unknown>>;
}

/**
 * A user item normalized into the scheduler's shape — the payload of
 * appointment events and template contexts; `source` is the original item.
 */
export type OgeSchedulerAppointment<T = unknown> = SchedulerAppointment<T>;

/** Per-view options: override the time window or slot raster for one view. */
export interface OgeSchedulerViewOptions {
  readonly type: OgeSchedulerView;
  /**
   * Display name in the view switcher (defaults to the messages entry).
   * Entries sharing a `type` (a `day` and a 3-day `day`) are told apart by
   * the switcher; `currentView` alone selects the first of them.
   */
  readonly name?: string;
  readonly dayStartHour?: number;
  readonly dayEndHour?: number;
  readonly cellDuration?: number;
  /**
   * Periods one view shows (dx `intervalCount`): `{ type: 'day',
   * intervalCount: 3 }` is a 3-day view, `{ type: 'week', intervalCount: 2 }`
   * a fortnight, `{ type: 'month', intervalCount: 3 }` a quarter, and the
   * timelines scale the same way. Navigation steps by the whole interval.
   */
  readonly intervalCount?: number;
  /** Overrides the scheduler's `groupOrientation` for this view. */
  readonly groupOrientation?: OgeSchedulerGroupOrientation;
}

/** Cancelable: fires before a new appointment reaches the store. */
export interface OgeSchedulerAppointmentAddingEvent<T = unknown> {
  /** The item about to be inserted (mutable — adjust fields before insert). */
  readonly appointmentData: T;
  /** Set `true` to veto the insert. */
  cancel: boolean;
}

/** Fires after an appointment was inserted. */
export interface OgeSchedulerAppointmentAddedEvent<T = unknown> {
  readonly appointmentData: T;
}

/** Cancelable: fires before an appointment update reaches the store. */
export interface OgeSchedulerAppointmentUpdatingEvent<T = unknown> {
  readonly oldData: T;
  /** The patch about to be applied. */
  readonly newData: Partial<T>;
  /** Set `true` to veto the update. */
  cancel: boolean;
}

/** Fires after an appointment was updated. */
export interface OgeSchedulerAppointmentUpdatedEvent<T = unknown> {
  readonly appointmentData: T;
}

/** Cancelable: fires before an appointment is removed from the store. */
export interface OgeSchedulerAppointmentDeletingEvent<T = unknown> {
  readonly appointmentData: T;
  /** Set `true` to veto the delete. */
  cancel: boolean;
}

/** Fires after an appointment was removed. */
export interface OgeSchedulerAppointmentDeletedEvent<T = unknown> {
  readonly appointmentData: T;
}

/** Fires on appointment chip click / double-click. */
export interface OgeSchedulerAppointmentClickEvent<T = unknown> {
  readonly appointment: OgeSchedulerAppointment<T>;
  /** The raw DOM event. */
  readonly event: MouseEvent;
}

/** Fires on empty-cell click / double-click. */
export interface OgeSchedulerCellClickEvent {
  /** Start date/time of the clicked cell. */
  readonly cellDate: Date;
  /** True in the all-day strip and in month cells. */
  readonly allDay: boolean;
  /** The raw DOM event. */
  readonly event: MouseEvent;
  /** The grouped resource values of the cell (`{}` / absent ungrouped). */
  readonly resources?: Readonly<Record<string, unknown>>;
}

/**
 * Cancelable: fires before the appointment editor opens; replace
 * `formItems` to customize the form (dx `onAppointmentFormOpening` parity).
 */
export interface OgeSchedulerEditorShowingEvent<
  T = unknown,
  TItem = OgeFormItemDataBase,
> {
  /** The item being edited, or the prefilled draft for a new appointment. */
  readonly appointmentData: T;
  readonly isNew: boolean;
  /** The data-driven form items the editor will render (mutable). */
  formItems: TItem[];
  /** Set `true` to keep the editor closed. */
  cancel: boolean;
}

/**
 * One range request of a remote scheduler `dataSource`: the visible period
 * (or a prefetched neighbour) as instants, `[startDate, endDate)`.
 */
export interface OgeSchedulerLoadOptions {
  readonly startDate: Date;
  readonly endDate: Date;
  /**
   * The grouped resources on screen, `{ fieldExpr: ids }` per `groups`
   * level — omitted when ungrouped.
   */
  readonly resources?: Readonly<Record<string, readonly unknown[]>>;
  /** Aborted once the range is no longer wanted (the user navigated on). */
  readonly signal: AbortSignal;
}

/**
 * A remote appointment source loaded per visible range — the scheduler
 * calls `load` for each period it shows (plus the neighbouring periods,
 * prefetched), debounced while the user navigates, and caches each range.
 * The result holds every appointment overlapping the range, **recurring
 * series whose occurrences fall inside it included**. CRUD goes through
 * `insert` / `update` / `remove` when present (the cache is dropped and the
 * range reloaded afterwards); without them edits stay local.
 */
export interface OgeSchedulerDataSource<T = unknown> {
  load(
    options: OgeSchedulerLoadOptions,
  ): Promise<readonly T[] | { readonly data: readonly T[] }>;
  insert?(item: T): Promise<unknown>;
  update?(key: RowKey, patch: Partial<T>): Promise<unknown>;
  remove?(key: RowKey): Promise<unknown>;
  /** Navigation debounce in ms (default `150`; the first load is immediate). */
  readonly debounce?: number;
  /** Prefetch the previous and next periods (default `true`). */
  readonly prefetch?: boolean;
  /** Ranges kept in the cache (default `12`). */
  readonly cacheSize?: number;
}
