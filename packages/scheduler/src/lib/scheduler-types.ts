/**
 * Public types of `@oge-ui/scheduler`. Event payload interfaces join this
 * module with the component in the next wave; the engine's internal shapes
 * stay unexported by design.
 */
import type { SchedulerAppointment } from './engine/scheduler-model';
import type { SchedulerViewType } from './engine/view-model';

/** The scheduler's view types: `'day' | 'week' | 'month'`. */
export type OgeSchedulerView = SchedulerViewType;

/**
 * A user item normalized into the scheduler's shape — the payload of
 * appointment events and template contexts; `source` is the original item.
 */
export type OgeSchedulerAppointment<T = unknown> = SchedulerAppointment<T>;

/** Per-view options: override the time window or slot raster for one view. */
export interface OgeSchedulerViewOptions {
  readonly type: OgeSchedulerView;
  /** Display name in the view switcher (defaults to the messages entry). */
  readonly name?: string;
  readonly dayStartHour?: number;
  readonly dayEndHour?: number;
  readonly cellDuration?: number;
}
