'use client';

import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { constrainRangeValue, type OgeRangeThumb } from '@oge-ui/behavior';
import {
  sliderBubbleVisible,
  useSliderBase,
  type OgeSliderBaseProps,
} from './slider-shared';
import { useOgeField } from './use-field';

type RangePair = readonly [number, number];

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeRangeSliderHandle {
  focus(): void;
  blur(): void;
}

export interface OgeRangeSliderProps extends OgeSliderBaseProps<RangePair> {
  /** Minimum distance kept between the thumbs (PrimeNG's steps-between). */
  minRange?: number;
  /** Accessible name of the start thumb; messages supply the default. */
  startAriaLabel?: string;
  /** Accessible name of the end thumb; messages supply the default. */
  endAriaLabel?: string;
  /** Hidden-input names for plain form posts (dx `startName`/`endName`). */
  startName?: string;
  endName?: string;
}

/**
 * WAI-ARIA APG multi-thumb slider — the React render of the Angular
 * `<oge-range-slider>`: two focusable `role="slider"` thumbs selecting a
 * `[start, end]` pair. Each thumb's `aria-valuemin`/`aria-valuemax` is
 * dynamically constrained by the other thumb's current value — the APG
 * multi-thumb rule — and `minRange` keeps a minimum gap between them.
 * Clicking the track moves the nearest thumb; the tab order of the thumbs
 * never changes with their values (APG). Escape cancels a drag.
 *
 * ```tsx
 * <OgeRangeSlider value={priceRange} onValueChange={setPriceRange} min={0} max={1000} minRange={50} />
 * ```
 */
export const OgeRangeSlider = forwardRef<
  OgeRangeSliderHandle,
  OgeRangeSliderProps
>(function OgeRangeSliderRender(props, ref) {
  const {
    orientation = 'horizontal',
    showRange = true,
    showTicks = false,
    showLabels = false,
    showTickLabels = false,
    valueIndicator = 'none',
    minRange = 0,
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startThumbRef = useRef<HTMLDivElement>(null);
  const endThumbRef = useRef<HTMLDivElement>(null);

  const base = useSliderBase<RangePair>({ props, hostRef, trackRef });
  const field = useOgeField<RangePair>({
    props,
    emptyValue: [base.min, base.min],
    isEmpty: () => false, // a slider always has a value
    focusNative: () => startThumbRef.current?.focus({ preventScroll: true }),
  });

  // The rendered pair is always snapped and sorted — the Angular
  // `normalizeWrite` rule applied to whatever the controlled prop carries.
  const value: RangePair = (() => {
    const raw = Array.isArray(field.value) ? field.value : [];
    const a =
      typeof raw[0] === 'number' && Number.isFinite(raw[0])
        ? base.snap(raw[0])
        : base.min;
    const b =
      typeof raw[1] === 'number' && Number.isFinite(raw[1])
        ? base.snap(raw[1])
        : base.min;
    return a <= b ? [a, b] : [b, a];
  })();

  const latest = useRef({ props, field, base, value, minRange });
  latest.current = { props, field, base, value, minRange };

  const readonly = props.readonly ?? false;
  const vertical = orientation === 'vertical';

  const startLabel = props.startAriaLabel ?? field.msg.sliderStartHandle;
  const endLabel = props.endAriaLabel ?? field.msg.sliderEndHandle;

  const thumbEl = (thumb: OgeRangeThumb): HTMLDivElement | null =>
    thumb === 'start' ? startThumbRef.current : endThumbRef.current;

  const commitPair = (pair: RangePair, event?: Event): void => {
    const [start, end] = latest.current.value;
    if (pair[0] === start && pair[1] === end) return;
    latest.current.field.commit.commitNow(pair, event);
  };

  /** Constrains against the sibling (APG multi-thumb) and commits. */
  const applyThumb = (
    thumb: OgeRangeThumb,
    next: number,
    event: Event,
    discrete = false,
  ): void => {
    const { value: current, minRange: gap, field: f } = latest.current;
    const [start, end] = current;
    const sibling = thumb === 'start' ? end : start;
    const constrained = constrainRangeValue(next, sibling, thumb, gap);
    const pair: RangePair =
      thumb === 'start' ? [constrained, end] : [start, constrained];
    if (pair[0] === start && pair[1] === end) return; // tuples are re-created —
    // an unchanged pair must not re-emit valueCommitted
    if (discrete) commitPair(pair, event);
    else f.commit.queue(pair, event);
  };

  // --- drag -----------------------------------------------------------------

  const beginDrag = (thumb: OgeRangeThumb, event: ReactPointerEvent): void => {
    const { field: f } = latest.current;
    if (f.effectiveDisabled || latest.current.props.readonly) return;
    thumbEl(thumb)?.focus({ preventScroll: true });
    const startPair = latest.current.value;
    /** Last constrained pair — what a completed release reports. */
    const lastApplied = { pair: startPair };
    base.runDrag(
      event,
      (next, e) => {
        const { value: current, minRange: gap } = latest.current;
        const [start, end] = current;
        const sibling = thumb === 'start' ? end : start;
        const constrained = constrainRangeValue(next, sibling, thumb, gap);
        lastApplied.pair =
          thumb === 'start' ? [constrained, end] : [start, constrained];
        applyThumb(thumb, next, e);
      },
      () => {
        f.commit.cancel();
        commitPair(startPair, event.nativeEvent);
      },
      (e) => {
        f.flush();
        latest.current.props.onSlideEnded?.({
          value: lastApplied.pair,
          event: e,
        });
      },
    );
  };

  const onThumbPointerDown = (
    thumb: OgeRangeThumb,
    event: ReactPointerEvent,
  ): void => {
    beginDrag(thumb, event);
  };

  const isThumbTarget = (target: EventTarget | null): boolean => {
    const node = target as Node | null;
    return (
      !!node &&
      ((startThumbRef.current?.contains(node) ?? false) ||
        (endThumbRef.current?.contains(node) ?? false))
    );
  };

  /** Clicking the track moves the NEAREST thumb and starts dragging it. */
  const onTrackPointerDown = (event: ReactPointerEvent): void => {
    if (isThumbTarget(event.target)) return;
    const { field: f } = latest.current;
    if (f.effectiveDisabled || latest.current.props.readonly) return;
    const track = trackRef.current;
    if (!track) return;
    const target = base.valueAtPointer(
      event.nativeEvent,
      track.getBoundingClientRect(),
    );
    const [start, end] = latest.current.value;
    const thumb: OgeRangeThumb =
      Math.abs(target - start) < Math.abs(target - end) ||
      (Math.abs(target - start) === Math.abs(target - end) && target < start)
        ? 'start'
        : 'end';
    beginDrag(thumb, event);
  };

  // --- keyboard ---------------------------------------------------------------

  const onThumbKeydown = (
    thumb: OgeRangeThumb,
    event: ReactKeyboardEvent,
  ): void => {
    const { field: f, base: b, value: current } = latest.current;
    if (f.effectiveDisabled || latest.current.props.readonly) return;
    const from = thumb === 'start' ? current[0] : current[1];
    const next = b.keyboardTarget(from, event.key);
    if (next === null) return;
    event.preventDefault();
    applyThumb(thumb, next, event.nativeEvent, true);
  };

  useImperativeHandle(
    ref,
    () => ({
      focus: () => startThumbRef.current?.focus(),
      blur: () => {
        startThumbRef.current?.blur();
        endThumbRef.current?.blur();
      },
    }),
    [],
  );

  const bubbleVisible = sliderBubbleVisible(valueIndicator, {
    dragging: base.dragging,
    focused: field.focused,
    hovered: base.hovered,
  });

  const renderThumb = (thumb: OgeRangeThumb) => {
    const index = thumb === 'start' ? 0 : 1;
    const thumbValue = value[index];
    return (
      <div
        ref={thumb === 'start' ? startThumbRef : endThumbRef}
        className="oge-slider-thumb"
        role="slider"
        tabIndex={field.effectiveDisabled ? -1 : (props.tabIndex ?? 0)}
        aria-valuemin={thumb === 'start' ? base.min : value[0] + minRange}
        aria-valuemax={thumb === 'start' ? value[1] - minRange : base.max}
        aria-valuenow={thumbValue}
        aria-valuetext={base.valueText(thumbValue)}
        aria-orientation={vertical ? 'vertical' : undefined}
        aria-label={thumb === 'start' ? startLabel : endLabel}
        aria-disabled={field.effectiveDisabled ? 'true' : undefined}
        aria-invalid={field.showError ? 'true' : undefined}
        title={props.tooltip}
        style={
          vertical
            ? { insetBlockEnd: `${base.percent(thumbValue)}%` }
            : { insetInlineStart: `${base.percent(thumbValue)}%` }
        }
        onPointerDown={(event) => onThumbPointerDown(thumb, event)}
        onKeyDown={(event) => onThumbKeydown(thumb, event)}
        onFocus={field.handleFocus}
        onBlur={field.handleBlur}
        onPointerEnter={() => base.setHovered(true)}
        onPointerLeave={() => base.setHovered(false)}
      >
        {bubbleVisible && (
          <output className="oge-slider-bubble" aria-hidden="true">
            {base.format(thumbValue)}
          </output>
        )}
      </div>
    );
  };

  const hostClasses = [
    'oge-slider',
    'oge-range-slider',
    field.showError && 'oge-slider-invalid',
    vertical && 'oge-slider-vertical',
    base.dragging && 'oge-slider-dragging',
    readonly && 'oge-slider-readonly',
    props.size === 'sm' && 'oge-slider-sm',
    props.size === 'lg' && 'oge-slider-lg',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span ref={hostRef} className={hostClasses} style={style}>
      <div className="oge-slider-body">
        <div
          ref={trackRef}
          className="oge-slider-track"
          onPointerDown={onTrackPointerDown}
        >
          <div className="oge-slider-rail"></div>
          {showRange && (
            <div
              className="oge-slider-fill"
              style={
                vertical
                  ? {
                      insetBlockEnd: `${base.percent(value[0])}%`,
                      height: `${base.percent(value[1]) - base.percent(value[0])}%`,
                    }
                  : {
                      insetInlineStart: `${base.percent(value[0])}%`,
                      width: `${base.percent(value[1]) - base.percent(value[0])}%`,
                    }
              }
            ></div>
          )}
          {showTicks &&
            base.ticks.map((tick) => (
              <Fragment key={tick}>
                <span
                  className={[
                    'oge-slider-tick',
                    tick >= value[0] &&
                      tick <= value[1] &&
                      'oge-slider-tick-in-range',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    vertical
                      ? { insetBlockEnd: `${base.percent(tick)}%` }
                      : { insetInlineStart: `${base.percent(tick)}%` }
                  }
                ></span>
                {showTickLabels && (
                  <span
                    className="oge-slider-tick-label"
                    aria-hidden="true"
                    style={
                      vertical
                        ? { insetBlockEnd: `${base.percent(tick)}%` }
                        : { insetInlineStart: `${base.percent(tick)}%` }
                    }
                  >
                    {base.format(tick)}
                  </span>
                )}
              </Fragment>
            ))}
          {renderThumb('start')}
          {renderThumb('end')}
        </div>
      </div>
      {showLabels && (
        <div className="oge-slider-labels" aria-hidden="true">
          <span>{base.format(base.min)}</span>
          <span>{base.format(base.max)}</span>
        </div>
      )}
      {props.startName && (
        // Plain-HTML form posts — dx's startName/endName contract.
        <input type="hidden" name={props.startName} value={value[0]} readOnly />
      )}
      {props.endName && (
        <input type="hidden" name={props.endName} value={value[1]} readOnly />
      )}
    </span>
  );
});
