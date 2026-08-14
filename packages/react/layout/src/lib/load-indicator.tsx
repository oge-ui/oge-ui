'use client';

import type { CSSProperties } from 'react';
import { useOgeLoadIndicatorConfig } from './layout-config';

/** Ring color — the card/toast severity vocabulary. */
export type OgeLoadIndicatorSeverity =
  'accent' | 'success' | 'warning' | 'danger';

export interface OgeLoadIndicatorProps {
  /** Ring diameter preset — 16/24/32px. */
  size?: 'sm' | 'md' | 'lg';
  /** `1em` ring that scales with the surrounding font (inside buttons). */
  inheritSize?: boolean;
  /** Ring color — the card/toast severity vocabulary. */
  severity?: OgeLoadIndicatorSeverity;
  /** Accessible name; the localized `loading` message is the fallback. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Indeterminate loading ring — the React render of the Angular
 * `<oge-load-indicator>`.
 *
 * Deliberately indeterminate-only (dx, Kendo and PrimeNG all are): a circle
 * that fills toward completion is the progress bar's job. Announced as
 * `role="progressbar"` **without** `aria-valuenow` — the ARIA rule for the
 * indeterminate state. Under `prefers-reduced-motion` the spin slows rather
 * than stops: a frozen ring reads as finished.
 *
 * ```tsx
 * <OgeLoadIndicator />
 * <button>Saving… <OgeLoadIndicator inheritSize /></button>
 * ```
 */
export function OgeLoadIndicator(props: OgeLoadIndicatorProps) {
  const config = useOgeLoadIndicatorConfig();
  const { size = 'md', inheritSize = false, severity = 'accent' } = props;

  const className = [
    'oge-load-indicator',
    size === 'sm' && 'oge-load-indicator-sm',
    size === 'lg' && 'oge-load-indicator-lg',
    inheritSize && 'oge-load-indicator-inherit',
    severity === 'success' && 'oge-load-indicator-success',
    severity === 'warning' && 'oge-load-indicator-warning',
    severity === 'danger' && 'oge-load-indicator-danger',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={className}
      style={props.style}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={props.ariaLabel ?? config.messages.loading}
    >
      <span className="oge-load-indicator-ring" aria-hidden="true"></span>
    </span>
  );
}
