/**
 * The scheduler's pointer gesture: `@oge-ui/behavior`'s shared
 * `beginPointerGesture` (3px threshold, pointer capture, document listeners
 * incl. a capture-phase Escape, blur cancel, a `finish` that commits at most
 * once) with the scheduler's defaults — the `pointerdown` keeps its default
 * action (focus-on-press), and touch pointers start after the house long
 * press so swiping the time grid still scrolls it.
 */
import {
  OGE_LONG_PRESS_DELAY,
  beginPointerGesture as beginSharedPointerGesture,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from '@oge-ui/behavior';

/** Callbacks of one pointer gesture. */
export interface SchedulerGestureCallbacks {
  /** Called on every pointer move past the 3px threshold. */
  onMove(deltaX: number, deltaY: number, event: PointerEvent): void;
  /**
   * Called exactly once when the gesture ends. `commit` is true only for a
   * non-cancelled gesture that actually moved.
   */
  onFinish(commit: boolean, cancelled: boolean): void;
}

/** Starts a gesture from `pointerdown`; manages listeners and cleanup. */
export function beginPointerGesture(
  event: OgePointerGestureInput,
  callbacks: SchedulerGestureCallbacks,
): OgePointerGestureHandle {
  return beginSharedPointerGesture(event, {
    onMove: callbacks.onMove,
    onFinish: callbacks.onFinish,
    preventDefault: false,
    longPress: OGE_LONG_PRESS_DELAY,
  });
}
