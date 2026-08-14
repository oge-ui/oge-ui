'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  sliderKeyboardTarget,
  sliderPercent,
  sliderTicks,
  sliderValueFromPointer,
  snapToStep,
  startSliderDrag,
  type OgeSliderAxis,
  type OgeSliderScale,
} from '@oge-ui/behavior';
import type { OgeControlProps } from './use-field';

/** Axis the slider lays its track along. */
export type OgeSliderOrientation = 'horizontal' | 'vertical';

/**
 * When the inline value bubble shows: `'none'` never, `'active'` while a
 * thumb is focused, hovered or dragged (Material's `discrete`), `'always'`
 * (DevExtreme `tooltip.showMode: 'always'`).
 */
export type OgeSliderValueIndicator = 'none' | 'active' | 'always';

/** A drag gesture began on a thumb (or on the track, which moves a thumb). */
export interface OgeSliderDragStartedEvent {
  event: PointerEvent;
}

/**
 * A drag gesture completed — the release-time counterpart of the live
 * `onValueCommitted` stream (PrimeNG `onSlideEnd`; DevExtreme's
 * `valueChangeMode: 'onHandleRelease'` is this event). Not emitted when the
 * gesture is cancelled with Escape.
 */
export interface OgeSliderSlideEndedEvent<T> {
  value: T;
  event: PointerEvent;
}

/**
 * The shared props of `OgeSlider` and `OgeRangeSlider` — the React face of
 * the Angular `OgeSliderBase` inputs.
 */
export interface OgeSliderBaseProps<T> extends OgeControlProps<T> {
  /** Lower end of the scale. */
  min?: number;
  /** Upper end of the scale. */
  max?: number;
  /** Arrow-key and drag increment; thumbs always sit on this grid. */
  step?: number;
  /** PageUp/PageDown increment; `undefined` → `step × 10`. */
  largeStep?: number;
  orientation?: OgeSliderOrientation;
  /** Fills the selected portion of the track (DevExtreme `showRange`). */
  showRange?: boolean;
  showTicks?: boolean;
  /** Tick spacing; `undefined` → `largeStep` → `step`. */
  tickStep?: number;
  /** Renders formatted `min`/`max` labels at the track ends. */
  showLabels?: boolean;
  /**
   * Formatted labels under each tick (Kendo's tick `title` callback, fed by
   * `formatValue`). Only meaningful with `showTicks`.
   */
  showTickLabels?: boolean;
  /** When the inline value bubble shows. */
  valueIndicator?: OgeSliderValueIndicator;
  /**
   * Formats the bubble, the end labels **and** `aria-valuetext` — one prop
   * where the references split display and announcement.
   */
  formatValue?: (value: number) => string;
  /** Accessible name of the slider's handle(s); messages supply defaults. */
  ariaLabel?: string;
  /** A drag gesture began. */
  onDragStarted?: (event: OgeSliderDragStartedEvent) => void;
  /** A drag gesture completed (not emitted on Escape-cancel). */
  onSlideEnded?: (event: OgeSliderSlideEndedEvent<T>) => void;
  className?: string;
  style?: CSSProperties;
}

interface UseSliderBaseInput<T> {
  props: OgeSliderBaseProps<T>;
  hostRef: RefObject<HTMLSpanElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
}

/**
 * Shared machinery of the React sliders: the resolved scale, the render
 * helpers, the APG keyboard arithmetic and the pointer-gesture harness —
 * all delegated to `@oge-ui/behavior`'s `slider-core`, the exact functions
 * the Angular `OgeSliderBase` runs.
 */
export function useSliderBase<T>(input: UseSliderBaseInput<T>) {
  const { props } = input;
  // Every getter below reads through `latest` so the machines see live props
  // and refs, never the ones captured when the hook first ran.
  const latest = useRef(input);
  latest.current = input;

  const [dragging, setDragging] = useState(false);
  /** Pointer is over a thumb — the `'active'` indicator includes hover (dx). */
  const [hovered, setHovered] = useState(false);

  const gestureCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => gestureCleanup.current?.(), []);

  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const scale: OgeSliderScale = { min, max, step };
  const scaleOf = (): OgeSliderScale => {
    const p = latest.current.props;
    return { min: p.min ?? 0, max: p.max ?? 100, step: p.step ?? 1 };
  };

  const resolvedLargeStep = (): number => {
    const p = latest.current.props;
    return p.largeStep ?? (p.step ?? 1) * 10;
  };

  const isRtl = (): boolean => {
    const host = latest.current.hostRef.current;
    return !!host && getComputedStyle(host).direction === 'rtl';
  };
  const axisOf = (): OgeSliderAxis => ({
    vertical: latest.current.props.orientation === 'vertical',
    rtl: isRtl(),
  });

  const snap = (value: number): number => snapToStep(value, min, max, step);

  const format = (value: number): string => {
    const fn = latest.current.props.formatValue;
    return fn ? fn(value) : String(value);
  };

  /** `aria-valuetext` only exists when the number alone is not the meaning. */
  const valueText = (value: number): string | undefined =>
    latest.current.props.formatValue ? format(value) : undefined;

  const percent = (value: number): number => sliderPercent(value, scale);

  const ticks: readonly number[] = props.showTicks
    ? sliderTicks(scale, props.tickStep ?? props.largeStep ?? step)
    : [];

  /**
   * The APG keyboard map — returns the next value for `current`, or `null`
   * when the key is not part of the pattern.
   */
  const keyboardTarget = (current: number, key: string): number | null =>
    sliderKeyboardTarget(
      current,
      key,
      scaleOf(),
      resolvedLargeStep(),
      axisOf(),
    );

  /** Projects a pointer position onto the value scale against `rect`. */
  const valueAtPointer = (
    point: { clientX: number; clientY: number },
    rect: DOMRect,
  ): number => sliderValueFromPointer(point, rect, scaleOf(), axisOf());

  /**
   * Runs a drag: `apply` per move (commit policy stays with the caller),
   * `ended` after a completed release, `restore` on Escape / cancel.
   */
  const runDrag = (
    event: ReactPointerEvent,
    apply: (value: number, event: PointerEvent) => void,
    restore: () => void,
    ended: (event: PointerEvent) => void,
  ): void => {
    const p = latest.current.props;
    if ((p.disabled ?? false) || (p.readonly ?? false) || event.button !== 0) {
      return;
    }
    const track = latest.current.trackRef.current;
    if (!track) return;
    event.preventDefault();
    const rect = track.getBoundingClientRect();
    setDragging(true);
    p.onDragStarted?.({ event: event.nativeEvent });
    gestureCleanup.current = startSliderDrag(event.nativeEvent, {
      valueAt: (e) => sliderValueFromPointer(e, rect, scaleOf(), axisOf()),
      apply,
      finish: (e, cancelled) => {
        gestureCleanup.current = null;
        setDragging(false);
        if (cancelled) {
          restore();
          return;
        }
        ended(e);
      },
    });
  };

  return {
    min,
    max,
    step,
    dragging,
    hovered,
    setHovered,
    snap,
    format,
    valueText,
    percent,
    ticks,
    keyboardTarget,
    valueAtPointer,
    runDrag,
  };
}

/** Whether the value bubble shows for the given indicator mode and state. */
export function sliderBubbleVisible(
  mode: OgeSliderValueIndicator,
  state: { dragging: boolean; focused: boolean; hovered: boolean },
): boolean {
  if (mode === 'always') return true;
  if (mode === 'active') {
    // Focus, drag OR hover — DevExtreme's `showMode: 'onHover'` and
    // Material's discrete indicator in one state.
    return state.dragging || state.focused || state.hovered;
  }
  return false;
}
