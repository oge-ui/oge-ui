/**
 * The shared pointer-gesture machine (the bpmn five-part pattern): closure
 * state, pointer capture as a progressive enhancement, document listeners
 * incl. a capture-phase Escape, a single `finish(cancelled)` and a 3px
 * movement threshold so a plain click never commits a drag.
 *
 * Framework-free: it only needs the fields every pointer event carries, so
 * the Angular layer hands it the native `PointerEvent` and the React layer
 * its synthetic one (whose `stopPropagation()` is the one that stops React's
 * own propagation).
 */
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
  readonly target: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/** A running gesture; `cancel()` finishes it as cancelled (teardown). */
export interface GanttGestureHandle {
  cancel(): void;
}

const MOVE_THRESHOLD = 3;

export function beginGanttGesture(
  event: GanttPointerLike,
  callbacks: GanttGestureCallbacks,
): GanttGestureHandle {
  // A native selection drag would auto-scroll the chart under the gesture.
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  let finished = false;

  const target = event.target as HTMLElement | null;
  try {
    target?.setPointerCapture(event.pointerId);
  } catch {
    // jsdom / detached elements — capture is a progressive enhancement
  }

  const onPointerMove = (moveEvent: PointerEvent): void => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) <= MOVE_THRESHOLD) return;
    moved = true;
    callbacks.onMove(deltaX, deltaY, moveEvent);
  };
  const onPointerUp = (): void => finish(false);
  const onPointerCancel = (): void => finish(true);
  const onKeyDown = (keyEvent: KeyboardEvent): void => {
    if (keyEvent.key !== 'Escape') return;
    keyEvent.preventDefault();
    keyEvent.stopPropagation();
    finish(true);
  };
  const onBlur = (): void => finish(true);

  function cleanup(): void {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('blur', onBlur);
  }

  function finish(cancelled: boolean): void {
    if (finished) return;
    finished = true;
    cleanup();
    callbacks.onFinish(!cancelled && moved, cancelled);
  }

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onBlur);
  return { cancel: () => finish(true) };
}
