'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  OGE_PROGRESS_RING_INDETERMINATE_RATIO,
  ogeProgressAriaNow,
  ogeProgressLabel,
  ogeProgressRatio,
  ogeProgressRingGeometry,
  type OgeProgressBarCompletedEvent,
  type OgeProgressBarSeverity,
  type OgeProgressBarType,
} from '@oge-ui/behavior';
import { useOgeProgressBarConfig } from './layout-config';

export interface OgeProgressBarProps {
  /** Current value; `null` renders the indeterminate sliding bar. */
  value?: number | null;
  /** Lower bound of the scale. */
  min?: number;
  /** Upper bound of the scale. */
  max?: number;
  /**
   * `linear` (default) is the track; `circular` draws an SVG ring with the
   * label centred inside — same aria contract, indeterminate spin included.
   * `bufferValue` and `chunkCount` apply to the linear bar only.
   */
  type?: OgeProgressBarType;
  /** Ring diameter in px (`type="circular"` only). Default 48. */
  size?: number;
  /** Ring stroke width in px (`type="circular"` only). Default 4. */
  thickness?: number;
  /** Material's buffer layer — media pre-loading behind the primary fill. */
  bufferValue?: number;
  /** Renders the bar as N discrete segments (Kendo's chunk progress bar). */
  chunkCount?: number;
  /** Fill color — the card/toast severity vocabulary. */
  severity?: OgeProgressBarSeverity;
  /** Renders the formatted value next to the bar. */
  showLabel?: boolean;
  /**
   * Formats the visible label **and** `aria-valuetext` (dx `statusFormat`,
   * house argument order). Default label: the rounded percentage.
   */
  formatLabel?: (value: number, ratio: number) => string;
  /** Accessible name; the localized `progress` message is the fallback. */
  ariaLabel?: string;
  /** The value reached `max` — once per completion (dx `onComplete`). */
  onCompleted?: (event: OgeProgressBarCompletedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Determinate or indeterminate progress bar — the React render of the
 * Angular `<oge-progress-bar>`: `value: null` is the indeterminate slide, a
 * `bufferValue` draws Material's pre-load layer, `chunkCount` renders the
 * bar as discrete segments, and `type="circular"` draws the same contract as
 * an SVG ring (Kendo's CircularProgressBar) with the label centred inside.
 *
 * Not a meter: a current measurement within a known range (battery, disk
 * usage) is `role="meter"`, which this deliberately is not — the APG's own
 * distinction.
 *
 * ```tsx
 * <OgeProgressBar value={upload} showLabel />
 * <OgeProgressBar value={null} ariaLabel="Loading" />
 * <OgeProgressBar type="circular" value={72} showLabel />
 * ```
 */
export function OgeProgressBar(props: OgeProgressBarProps) {
  const config = useOgeProgressBarConfig();
  const {
    value = null,
    min = 0,
    max = 100,
    bufferValue,
    chunkCount,
    formatLabel,
    type = 'linear',
  } = props;

  const severity = props.severity ?? config.severity ?? 'accent';
  const showLabel = props.showLabel ?? config.showLabel ?? false;

  const ratio = ogeProgressRatio(value, min, max);
  const bufferRatio = ogeProgressRatio(bufferValue, min, max);

  const chunkList =
    chunkCount && chunkCount > 0
      ? Array.from({ length: Math.min(chunkCount, 100) }, (_, i) => i)
      : [];
  const filledChunks = Math.round(ratio * chunkList.length);

  const label = ogeProgressLabel(value, ratio, formatLabel);
  /** `aria-valuetext` only exists when the number alone is not the meaning. */
  const valueText = formatLabel && value !== null ? label : undefined;

  // One `onCompleted` per arrival at max — re-crossing after a reset fires
  // again, staying at max does not (the drawer modeChanged guard pattern).
  const previousComplete = useRef<boolean | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const complete = value !== null && value >= max;
    if (previousComplete.current === null) {
      previousComplete.current = complete;
      if (complete && value !== null) latest.current.onCompleted?.({ value });
      return;
    }
    if (complete === previousComplete.current) return;
    previousComplete.current = complete;
    if (complete && value !== null) latest.current.onCompleted?.({ value });
  }, [value, max]);

  const className = [
    'oge-progress-bar',
    value === null && 'oge-progress-bar-indeterminate',
    type === 'circular' && 'oge-progress-bar-circular',
    severity === 'success' && 'oge-progress-bar-success',
    severity === 'warning' && 'oge-progress-bar-warning',
    severity === 'danger' && 'oge-progress-bar-danger',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={props.style}
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={max}
      // Indeterminate omits aria-valuenow entirely — never a sentinel value.
      // Determinate clamps into [min, max] — a now beyond max is invalid ARIA.
      aria-valuenow={ogeProgressAriaNow(value, min, max) ?? undefined}
      aria-valuetext={valueText}
      aria-label={props.ariaLabel ?? config.messages.progress}
    >
      {type === 'circular' ? (
        <ProgressRing
          ratio={value === null ? OGE_PROGRESS_RING_INDETERMINATE_RATIO : ratio}
          size={props.size}
          thickness={props.thickness}
          label={showLabel && value !== null ? label : undefined}
        />
      ) : (
        <>
          <div className="oge-progress-bar-track">
            {chunkList.length > 0 ? (
              chunkList.map((chunk) => (
                <span
                  key={chunk}
                  className={[
                    'oge-progress-bar-chunk',
                    chunk < filledChunks && 'oge-progress-bar-chunk-filled',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                ></span>
              ))
            ) : (
              <>
                {bufferValue !== undefined && value !== null && (
                  <div
                    className="oge-progress-bar-buffer"
                    style={{ transform: `scaleX(${bufferRatio})` }}
                  ></div>
                )}
                <div
                  className="oge-progress-bar-fill"
                  style={
                    value === null
                      ? undefined
                      : { transform: `scaleX(${ratio})` }
                  }
                ></div>
              </>
            )}
          </div>
          {showLabel && value !== null && (
            <span className="oge-progress-bar-label">{label}</span>
          )}
        </>
      )}
    </div>
  );
}

/** The circular variant's SVG — geometry from `ogeProgressRingGeometry`. */
function ProgressRing(props: {
  ratio: number;
  size?: number;
  thickness?: number;
  label?: string;
}) {
  const ring = ogeProgressRingGeometry({
    ratio: props.ratio,
    size: props.size,
    thickness: props.thickness,
  });
  return (
    <div
      className="oge-progress-ring"
      style={{ width: ring.size, height: ring.size }}
    >
      <svg
        className="oge-progress-ring-svg"
        viewBox={ring.viewBox}
        width={ring.size}
        height={ring.size}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="oge-progress-ring-track"
          cx={ring.center}
          cy={ring.center}
          r={ring.radius}
          strokeWidth={ring.thickness}
        />
        <circle
          className="oge-progress-ring-value"
          cx={ring.center}
          cy={ring.center}
          r={ring.radius}
          strokeWidth={ring.thickness}
          strokeDasharray={ring.dashArray}
          strokeDashoffset={ring.dashOffset}
        />
      </svg>
      {props.label !== undefined && (
        <span className="oge-progress-bar-label oge-progress-ring-label">
          {props.label}
        </span>
      )}
    </div>
  );
}
