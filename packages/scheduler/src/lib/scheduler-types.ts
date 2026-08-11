/**
 * Public types of `@oge-ui/scheduler`. Event payload interfaces join this
 * module with the component in the next wave; the engine's internal shapes
 * stay unexported by design.
 */
import type { SchedulerViewType } from './engine/view-model';

/** The scheduler's view types: `'day' | 'week' | 'month'`. */
export type OgeSchedulerView = SchedulerViewType;

/** Per-view options: override the time window or slot raster for one view. */
export interface OgeSchedulerViewOptions {
  readonly type: OgeSchedulerView;
  /** Display name in the view switcher (defaults to the messages entry). */
  readonly name?: string;
  readonly dayStartHour?: number;
  readonly dayEndHour?: number;
  readonly cellDuration?: number;
}
