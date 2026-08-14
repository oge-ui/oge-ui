'use client';

import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useOgeInputsConfig } from './inputs-config';
import {
  sliderBubbleVisible,
  useSliderBase,
  type OgeSliderBaseProps,
} from './slider-shared';
import { useOgeField } from './use-field';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeSliderHandle {
  focus(): void;
  blur(): void;
}

export interface OgeSliderProps extends OgeSliderBaseProps<number> {
  /** Kendo-style increment/decrement buttons with press-and-hold repeat. */
  showButtons?: boolean;
}

/**
 * WAI-ARIA APG slider — the React render of the Angular `<oge-slider>`: one
 * focusable `role="slider"` thumb on a track — arrows move by `step`
 * (RTL-aware), PageUp/PageDown by `largeStep`, Home/End to the ends, dragging
 * commits live (`debounce` throttles it) and Escape cancels the gesture,
 * restoring the start value — all over the shared `@oge-ui/behavior` slider
 * core, so the arithmetic and the gesture rules cannot drift from the Angular
 * editor. `showButtons` adds Kendo-style increment/decrement buttons with
 * press-and-hold repeat.
 *
 * ```tsx
 * <OgeSlider value={volume} onValueChange={setVolume} min={0} max={100} />
 * ```
 */
export const OgeSlider = forwardRef<OgeSliderHandle, OgeSliderProps>(
  function OgeSliderRender(props, ref) {
    const {
      orientation = 'horizontal',
      showRange = true,
      showTicks = false,
      showLabels = false,
      showTickLabels = false,
      valueIndicator = 'none',
      showButtons = false,
      className,
      style,
    } = props;

    const config = useOgeInputsConfig();
    const hostRef = useRef<HTMLSpanElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);

    const base = useSliderBase<number>({ props, hostRef, trackRef });
    const field = useOgeField<number>({
      props,
      emptyValue: base.min,
      isEmpty: () => false, // a slider always has a value
      focusNative: () => thumbRef.current?.focus({ preventScroll: true }),
    });

    // The rendered value always sits on the grid — the Angular
    // `normalizeWrite` rule applied to whatever the controlled prop carries.
    const value = base.snap(
      typeof field.value === 'number' && Number.isFinite(field.value)
        ? field.value
        : base.min,
    );

    const latest = useRef({ props, field, base, value });
    latest.current = { props, field, base, value };

    const readonly = props.readonly ?? false;
    const vertical = orientation === 'vertical';

    // --- drag ---------------------------------------------------------------

    const beginDrag = (event: ReactPointerEvent): void => {
      const { field: f } = latest.current;
      if (f.effectiveDisabled || latest.current.props.readonly) return;
      thumbRef.current?.focus({ preventScroll: true });
      const startValue = latest.current.value;
      /** Last projected value — what a completed release reports. */
      const lastApplied = { value: startValue };
      base.runDrag(
        event,
        (next, e) => {
          lastApplied.value = next;
          if (next !== latest.current.value) f.commit.queue(next, e);
        },
        () => {
          f.commit.cancel();
          f.commit.commitNow(startValue, event.nativeEvent);
        },
        (e) => {
          f.flush();
          latest.current.props.onSlideEnded?.({
            value: lastApplied.value,
            event: e,
          });
        },
      );
    };

    const onThumbPointerDown = (event: ReactPointerEvent): void => {
      beginDrag(event);
    };

    /** Clicking the track jumps to the position and starts dragging (APG). */
    const onTrackPointerDown = (event: ReactPointerEvent): void => {
      const thumbEl = thumbRef.current;
      if (thumbEl && thumbEl.contains(event.target as Node)) return;
      beginDrag(event);
    };

    // --- keyboard -----------------------------------------------------------

    const onThumbKeydown = (event: ReactKeyboardEvent): void => {
      const { field: f, base: b, value: current } = latest.current;
      if (f.effectiveDisabled || latest.current.props.readonly) return;
      const next = b.keyboardTarget(current, event.key);
      if (next === null) return;
      event.preventDefault();
      // A keyboard step is a discrete action — it commits immediately, the
      // number box's spin precedent.
      f.commit.commitNow(next, event.nativeEvent);
    };

    // --- step buttons -------------------------------------------------------

    const repeatDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
    const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const stepBy = (direction: 1 | -1, event?: Event): void => {
      const { field: f, base: b, value: current } = latest.current;
      f.commit.commitNow(b.snap(current + direction * b.step), event);
    };

    const stopRepeat = (): void => {
      if (repeatDelay.current !== null) {
        clearTimeout(repeatDelay.current);
        repeatDelay.current = null;
      }
      if (repeatTimer.current !== null) {
        clearInterval(repeatTimer.current);
        repeatTimer.current = null;
      }
    };
    useEffect(() => stopRepeat, []);

    /** One discrete step; the buttons repeat it while held (spin config). */
    const onStepPointerDown = (
      direction: 1 | -1,
      event: ReactPointerEvent,
    ): void => {
      const { field: f } = latest.current;
      if (
        f.effectiveDisabled ||
        latest.current.props.readonly ||
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
      stepBy(direction, event.nativeEvent);
      stopRepeat();
      repeatDelay.current = setTimeout(() => {
        repeatTimer.current = setInterval(
          () => stepBy(direction),
          config.spinRepeatIntervalMs,
        );
      }, config.spinRepeatDelayMs);
      const stop = (): void => stopRepeat();
      document.addEventListener('pointerup', stop, { once: true });
      document.addEventListener('pointercancel', stop, { once: true });
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => thumbRef.current?.focus(),
        blur: () => thumbRef.current?.blur(),
      }),
      [],
    );

    const bubbleVisible = sliderBubbleVisible(valueIndicator, {
      dragging: base.dragging,
      focused: field.focused,
      hovered: base.hovered,
    });

    const stepButton = (direction: 1 | -1) => (
      <button
        type="button"
        className="oge-slider-step-button"
        aria-label={
          direction === 1
            ? field.msg.sliderIncrement
            : field.msg.sliderDecrement
        }
        title={
          direction === 1
            ? field.msg.sliderIncrement
            : field.msg.sliderDecrement
        }
        disabled={field.effectiveDisabled}
        tabIndex={-1}
        onPointerDown={(event) => onStepPointerDown(direction, event)}
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={direction === 1 ? 'M8 3v10M3 8h10' : 'M3 8h10'} />
        </svg>
      </button>
    );

    const hostClasses = [
      'oge-slider',
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
          {showButtons && stepButton(-1)}
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
                    ? { height: `${base.percent(value)}%` }
                    : { width: `${base.percent(value)}%` }
                }
              ></div>
            )}
            {showTicks &&
              base.ticks.map((tick) => (
                <Fragment key={tick}>
                  <span
                    className={[
                      'oge-slider-tick',
                      tick <= value && 'oge-slider-tick-in-range',
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
            <div
              ref={thumbRef}
              className="oge-slider-thumb"
              role="slider"
              tabIndex={field.effectiveDisabled ? -1 : (props.tabIndex ?? 0)}
              aria-valuemin={base.min}
              aria-valuemax={base.max}
              aria-valuenow={value}
              aria-valuetext={base.valueText(value)}
              aria-orientation={vertical ? 'vertical' : undefined}
              aria-label={props.ariaLabel ?? field.msg.sliderHandle}
              aria-disabled={field.effectiveDisabled ? 'true' : undefined}
              aria-invalid={field.showError ? 'true' : undefined}
              aria-required={props.required ? 'true' : undefined}
              title={props.tooltip}
              style={
                vertical
                  ? { insetBlockEnd: `${base.percent(value)}%` }
                  : { insetInlineStart: `${base.percent(value)}%` }
              }
              onPointerDown={onThumbPointerDown}
              onKeyDown={onThumbKeydown}
              onFocus={field.handleFocus}
              onBlur={field.handleBlur}
              onPointerEnter={() => base.setHovered(true)}
              onPointerLeave={() => base.setHovered(false)}
            >
              {bubbleVisible && (
                <output className="oge-slider-bubble" aria-hidden="true">
                  {base.format(value)}
                </output>
              )}
            </div>
          </div>
          {showButtons && stepButton(1)}
        </div>
        {showLabels && (
          <div className="oge-slider-labels" aria-hidden="true">
            <span>{base.format(base.min)}</span>
            <span>{base.format(base.max)}</span>
          </div>
        )}
        {props.name && (
          // Plain-HTML form posts (the references' hidden-input contract).
          <input type="hidden" name={props.name} value={value} readOnly />
        )}
      </span>
    );
  },
);
