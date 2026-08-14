'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type {
  OgeProgressBarCompletedEvent,
  OgeProgressBarSeverity,
} from '@oge-ui/behavior';
import { useOgeProgressBarConfig } from './layout-config';

export interface OgeProgressBarProps {
  /** Current value; `null` renders the indeterminate sliding bar. */
  value?: number | null;
  min?: number;
  max?: number;
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
 * `bufferValue` draws Material's pre-load layer, and `chunkCount` renders the
 * bar as discrete segments.
 *
 * Not a meter: a current measurement within a known range (battery, disk
 * usage) is `role="meter"`, which this deliberately is not — the APG's own
 * distinction.
 *
 * ```tsx
 * <OgeProgressBar value={upload} showLabel />
 * <OgeProgressBar value={null} ariaLabel="Loading" />
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
  } = props;

  const severity = props.severity ?? config.severity ?? 'accent';
  const showLabel = props.showLabel ?? config.showLabel ?? false;

  const ratioOf = (candidate: number): number => {
    if (max <= min) return 0;
    return Math.min(Math.max((candidate - min) / (max - min), 0), 1);
  };
  const ratio = value === null ? 0 : ratioOf(value);
  const bufferRatio = bufferValue === undefined ? 0 : ratioOf(bufferValue);

  const chunkList =
    chunkCount && chunkCount > 0
      ? Array.from({ length: Math.min(chunkCount, 100) }, (_, i) => i)
      : [];
  const filledChunks = Math.round(ratio * chunkList.length);

  const label =
    value === null
      ? ''
      : formatLabel
        ? formatLabel(value, ratio)
        : `${Math.round(ratio * 100)}%`;
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
      aria-valuenow={
        value === null ? undefined : Math.min(Math.max(value, min), max)
      }
      aria-valuetext={valueText}
      aria-label={props.ariaLabel ?? config.messages.progress}
    >
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
                value === null ? undefined : { transform: `scaleX(${ratio})` }
              }
            ></div>
          </>
        )}
      </div>
      {showLabel && value !== null && (
        <span className="oge-progress-bar-label">{label}</span>
      )}
    </div>
  );
}
