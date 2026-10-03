/**
 * The shared pointer-gesture machine (the bpmn five-part pattern): closure
 * state, pointer capture as a progressive enhancement, document listeners
 * incl. a capture-phase Escape, a single `finish(cancelled)` and a 3px
 * movement threshold so a plain click never commits a drag.
 *
 * Deliberately a local twin of `@oge-ui/behavior`'s `beginPointerGesture`,
 * not a wrapper: `charts-engine` depends on `core` only (its published
 * dependency set is part of the "dependency-free engine" stance, like
 * `bpmn-engine`'s), and zoom/pan never needs the shared machine's long press
 * or drop hit-testing — the chart surfaces declare their `touch-action` in
 * `chart.scss` (the plot pans vertically, the range selector not). Keep the
 * two in step when the cancel rules change (docs/ARCHITECTURE.md → shared
 * gestures).
 */
export interface ChartGestureCallbacks {
  onMove(deltaX: number, deltaY: number, event: PointerEvent): void;
  onFinish(commit: boolean, cancelled: boolean): void;
}

const MOVE_THRESHOLD = 3;

export function beginChartGesture(
  event: PointerEvent,
  callbacks: ChartGestureCallbacks,
): void {
  // A native selection drag would auto-scroll the chart under the gesture.
  event.preventDefault();
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
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onBlur);
}
