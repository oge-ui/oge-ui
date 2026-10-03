/**
 * The Gantt's pointer gesture: `@oge-ui/behavior`'s shared
 * `beginPointerGesture` (3px threshold, pointer capture, document listeners
 * incl. a capture-phase Escape, blur cancel, a single `finish`) with the
 * chart's defaults — the `pointerdown` is prevented (a native selection drag
 * would auto-scroll the chart under the gesture) and touch pointers start
 * after the house long press, so swiping the timeline still scrolls it.
 *
 * Framework-free: it only needs the fields every pointer event carries, so
 * the Angular layer hands it the native `PointerEvent` and the React layer
 * its synthetic one (whose `stopPropagation()` is the one that stops React's
 * own propagation).
 */
import {
  OGE_LONG_PRESS_DELAY,
  beginPointerGesture,
  type OgePointerGestureHandle,
} from '@oge-ui/behavior';

export interface GanttGestureCallbacks {
  onMove(deltaX: number, deltaY: number, event: PointerEvent): void;
  onFinish(commit: boolean, cancelled: boolean): void;
}

/** The slice of a pointer event the gesture handlers read. */
export interface GanttPointerLike {
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerId: number;
  readonly pointerType?: string;
  readonly target: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/** A running gesture; `cancel()` finishes it as cancelled (teardown). */
export type GanttGestureHandle = OgePointerGestureHandle;

export function beginGanttGesture(
  event: GanttPointerLike,
  callbacks: GanttGestureCallbacks,
): GanttGestureHandle {
  return beginPointerGesture(event, {
    onMove: callbacks.onMove,
    onFinish: callbacks.onFinish,
    longPress: OGE_LONG_PRESS_DELAY,
  });
}
