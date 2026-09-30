/**
 * The shared pointer-gesture machine (the bpmn five-part pattern): closure
 * state, pointer capture as a progressive enhancement, document-level
 * listeners including a capture-phase Escape, a `finish(cancelled)` that
 * commits at most once, and a 3px movement threshold so a plain click never
 * commits a drag.
 */

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

const MOVE_THRESHOLD = 3;

/** Starts a gesture from `pointerdown`; manages listeners and cleanup. */
export function beginPointerGesture(
  event: PointerEvent,
  callbacks: SchedulerGestureCallbacks,
): void {
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  let finished = false;

  const target = event.target as HTMLElement;
  try {
    target.setPointerCapture(event.pointerId);
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
  // capture phase so a mid-gesture Escape never reaches the grid handlers
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onBlur);
}
