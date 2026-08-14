import { snapToStep, valueToRatio } from '@oge-ui/core';

// The pure slider arithmetic lives in `@oge-ui/core`; re-exported here so the
// React render layer reaches it through its one behavior dependency, exactly
// like the select family's expression resolvers.
export {
  clampValue,
  constrainRangeValue,
  ratioToValue,
  snapToStep,
  valueToRatio,
  type OgeRangeThumb,
} from '@oge-ui/core';

/** Hard cap on rendered ticks so a tiny `tickStep` cannot flood the DOM. */
export const OGE_SLIDER_MAX_TICKS = 200;

/** The scale a slider projects positions and keys onto. */
export interface OgeSliderScale {
  min: number;
  max: number;
  /** Arrow-key and drag increment; thumbs always sit on this grid. */
  step: number;
}

/**
 * The tick stops of a slider scale: one stop every `spacing` starting at
 * `min`, snapped to the grid, capped at {@link OGE_SLIDER_MAX_TICKS}; the far
 * end always gets a stop (every reference slider marks `max`).
 */
export function sliderTicks(
  scale: OgeSliderScale,
  spacing: number,
): readonly number[] {
  const { min, max } = scale;
  if (spacing <= 0 || max <= min) return [];
  const count = Math.floor((max - min) / spacing);
  const list: number[] = [];
  for (let i = 0; i <= count && list.length < OGE_SLIDER_MAX_TICKS; i++) {
    list.push(snapToStep(min + i * spacing, min, max, spacing));
  }
  if (list[list.length - 1] !== max && list.length < OGE_SLIDER_MAX_TICKS) {
    list.push(max); // the far end always gets a stop
  }
  return list;
}

/** Axis/direction context for the keyboard map and pointer projection. */
export interface OgeSliderAxis {
  vertical: boolean;
  /** Only meaningful on the horizontal axis — flips the arrow keys. */
  rtl: boolean;
}

/**
 * The APG keyboard map: arrows ±step (RTL-aware on the horizontal axis),
 * PageUp/PageDown ±`largeStep`, Home/End to the ends. Returns the next value
 * for `current`, or `null` when the key is not part of the pattern.
 */
export function sliderKeyboardTarget(
  current: number,
  key: string,
  scale: OgeSliderScale,
  largeStep: number,
  axis: OgeSliderAxis,
): number | null {
  const { min, max, step } = scale;
  if (key === 'Home') return min;
  if (key === 'End') return max;
  if (key === 'PageUp') return snapToStep(current + largeStep, min, max, step);
  if (key === 'PageDown') {
    return snapToStep(current - largeStep, min, max, step);
  }
  const rtl = !axis.vertical && axis.rtl;
  let direction = 0;
  if (key === 'ArrowUp') direction = 1;
  else if (key === 'ArrowDown') direction = -1;
  else if (key === 'ArrowRight') direction = rtl ? -1 : 1;
  else if (key === 'ArrowLeft') direction = rtl ? 1 : -1;
  if (direction === 0) return null;
  return snapToStep(current + direction * step, min, max, step);
}

/** The track geometry a pointer position is projected against. */
export interface OgeSliderTrackRect {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Projects a pointer position onto the value scale against a rect captured
 * at gesture start — never measured per move (the splitter rule: layout
 * reads belong at the gesture boundary, not in the hot path).
 */
export function sliderValueFromPointer(
  point: { clientX: number; clientY: number },
  rect: OgeSliderTrackRect,
  scale: OgeSliderScale,
  axis: OgeSliderAxis,
): number {
  let ratio: number;
  if (axis.vertical) {
    ratio = rect.height > 0 ? (rect.bottom - point.clientY) / rect.height : 0;
  } else {
    ratio = rect.width > 0 ? (point.clientX - rect.left) / rect.width : 0;
    if (axis.rtl) ratio = 1 - ratio;
  }
  const { min, max, step } = scale;
  return snapToStep(
    min + Math.min(Math.max(ratio, 0), 1) * (max - min),
    min,
    max,
    step,
  );
}

/** Projects `value` onto the track as a `[0, 100]` percentage. */
export function sliderPercent(value: number, scale: OgeSliderScale): number {
  return valueToRatio(value, scale.min, scale.max) * 100;
}

/** What a running slider drag gesture calls back into. */
export interface OgeSliderDragHandlers {
  /** Projects a pointer event to a snapped value (rect captured at start). */
  valueAt(event: PointerEvent): number;
  /** Per pointer move (and once at gesture start). */
  apply(value: number, event: PointerEvent): void;
  /**
   * The gesture ended and its listeners are already detached. `cancelled`
   * (Escape, `pointercancel`, window blur) means the caller restores the
   * start value; otherwise it flushes the live commit and emits its
   * slide-ended event.
   */
  finish(event: PointerEvent, cancelled: boolean): void;
}

/**
 * Runs a slider drag gesture: pointer capture, an immediate `apply` at the
 * start position, then document-level move/up/cancel listeners (capture is
 * not guaranteed, and alt-tab / releases outside the document never deliver
 * a `pointerup`), Escape-to-cancel and window-blur-to-cancel. Returns a
 * detach function for teardown mid-drag (component destroy); guards,
 * `preventDefault` and dragging-state bookkeeping stay with the caller.
 */
export function startSliderDrag(
  event: PointerEvent,
  handlers: OgeSliderDragHandlers,
): () => void {
  const target = event.target as HTMLElement | null;
  if (target && typeof target.setPointerCapture === 'function') {
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom / detached elements — capture is a progressive enhancement */
    }
  }

  handlers.apply(handlers.valueAt(event), event);

  const finish = (e: PointerEvent, cancelled: boolean): void => {
    cleanup();
    handlers.finish(e, cancelled);
  };
  const onMove = (e: PointerEvent): void => {
    handlers.apply(handlers.valueAt(e), e);
  };
  const onUp = (e: PointerEvent): void => finish(e, false);
  const onCancel = (e: PointerEvent): void => finish(e, true);
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    finish(event, true);
  };
  const onWindowBlur = (): void => finish(event, true);
  const cleanup = (): void => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('blur', onWindowBlur);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('blur', onWindowBlur);
  return cleanup;
}
