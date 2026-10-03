/**
 * The board's pointer gesture: `@oge-ui/behavior`'s shared
 * `beginPointerGesture` (3px threshold, pointer capture, document listeners
 * incl. a capture-phase Escape, blur cancel, a single `finish`) with the
 * board's defaults — the `pointerdown` is prevented (a native selection drag
 * would auto-scroll the board under the gesture) and touch pointers start
 * after the house long press, so swiping a column still scrolls it.
 */
import {
  OGE_LONG_PRESS_DELAY,
  prepareTouchDrag,
  beginPointerGesture,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from '@oge-ui/behavior';

export interface KanbanGestureCallbacks {
  onMove(deltaX: number, deltaY: number, event: PointerEvent): void;
  onFinish(commit: boolean, cancelled: boolean): void;
  /** A touch long press armed the drag (lift feedback). */
  onLongPress?(): void;
}

/** Touch hold (ms) before a card or column header lifts. */
export const KANBAN_LONG_PRESS = OGE_LONG_PRESS_DELAY;

export function beginKanbanGesture(
  event: OgePointerGestureInput,
  callbacks: KanbanGestureCallbacks,
): OgePointerGestureHandle {
  return beginPointerGesture(event, {
    onMove: callbacks.onMove,
    onFinish: callbacks.onFinish,
    onLongPress: callbacks.onLongPress,
    longPress: KANBAN_LONG_PRESS,
  });
}

/**
 * Installs the document's touch-drag guard for a board (idempotent, SSR-safe):
 * call once on mount so the very first long-press drag can stop the page
 * from panning — the browser decides at `touchstart`, before any gesture runs.
 */
export function prepareKanbanTouchDrag(host: Element | null): void {
  prepareTouchDrag(host?.ownerDocument ?? undefined);
}
