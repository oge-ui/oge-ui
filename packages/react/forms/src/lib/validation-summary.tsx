'use client';

import type { CSSProperties } from 'react';
import {
  validationSummaryTitle,
  type OgeFormErrorEntry,
  type OgeFormsMessages,
} from '@oge-ui/behavior';
import { useOgeFormsConfig } from './forms-config';

/**
 * The form-level error list. Renders `role="alert"` so a failed submit is
 * announced, and each row is a real button that focuses its field.
 *
 * `<OgeForm showValidationSummary>` renders one automatically; use the
 * component directly to place the summary somewhere else on the page.
 *
 * ```tsx
 * <OgeValidationSummary
 *   errors={errors}
 *   onErrorClick={(entry) => form.current?.focus(entry.field)}
 * />
 * ```
 */
export interface OgeValidationSummaryProps {
  /** One entry per invalid field, in layout order. */
  errors?: readonly OgeFormErrorEntry[];
  /** Per-instance string overrides. */
  messages?: Partial<OgeFormsMessages>;
  /** A summary row was activated — focus that field. */
  onErrorClick?: (entry: OgeFormErrorEntry) => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function OgeValidationSummary(props: OgeValidationSummaryProps) {
  const config = useOgeFormsConfig();
  const messages: OgeFormsMessages = { ...config.messages, ...props.messages };
  const errors = props.errors ?? [];

  return (
    <div
      id={props.id}
      role="alert"
      aria-label={messages.validationSummaryLabel}
      hidden={errors.length === 0}
      className={['oge-validation-summary', props.className]
        .filter(Boolean)
        .join(' ')}
      style={props.style}
    >
      {errors.length > 0 && (
        <>
          <p className="oge-validation-summary-title">
            {validationSummaryTitle(errors.length, messages)}
          </p>
          <ul className="oge-validation-summary-list">
            {errors.map((entry) => (
              <li className="oge-validation-summary-item" key={entry.field}>
                <button
                  type="button"
                  className="oge-validation-summary-link"
                  onClick={() => props.onErrorClick?.(entry)}
                >
                  <span className="oge-validation-summary-field">
                    {entry.label}
                  </span>
                  <span className="oge-validation-summary-message">
                    {entry.message}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
