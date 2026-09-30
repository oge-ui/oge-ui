'use client';

import type { ReactNode } from 'react';
import {
  chipForeground,
  chipTimeText,
  type OgeSchedulerView,
  type SchedulerAppointment,
} from '@oge-ui/scheduler-engine';
import type { OgeAppointmentRenderContext } from './scheduler-types';

/** The chip props every view shares. */
export interface SchedulerChipProps<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly view: OgeSchedulerView;
  /** Single-line rendering (all-day strip, month lanes). */
  readonly compact?: boolean;
  readonly locale: string | undefined;
  readonly renderAppointment:
    ((context: OgeAppointmentRenderContext<T>) => ReactNode) | undefined;
}

/**
 * Internal presentational chip: renders one appointment (or one segment of
 * it) with its color, text and time line — the same `.oge-scheduler-chip`
 * markup the Angular `<oge-scheduler-appointment>` renders. Interaction
 * semantics live on the positioned wrapper in the owning view, not here.
 */
export function SchedulerAppointmentChip<T>({
  appointment,
  view,
  compact = false,
  locale,
  renderAppointment,
}: SchedulerChipProps<T>) {
  const className = [
    'oge-scheduler-chip',
    compact && 'oge-scheduler-chip-allday',
    appointment.disabled && 'oge-scheduler-chip-disabled',
  ]
    .filter(Boolean)
    .join(' ');
  const foreground = chipForeground(appointment.color);
  return (
    <div
      className={className}
      style={{
        backgroundColor: appointment.color,
        color: foreground ?? undefined,
      }}
    >
      {renderAppointment ? (
        renderAppointment({ appointment, view })
      ) : (
        <>
          <span className="oge-scheduler-chip-text">
            {appointment.recurrenceRule && (
              <svg
                className="oge-scheduler-chip-recur"
                viewBox="0 0 16 16"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 8a5 5 0 0 1-9 3m-1-3a5 5 0 0 1 9-3" />
                <path d="M12.5 2v3h-3M3.5 14v-3h3" />
              </svg>
            )}{' '}
            {appointment.text}
          </span>
          {!compact && (
            <>
              <span className="oge-scheduler-chip-time">
                {chipTimeText(appointment, locale)}
              </span>
              {appointment.location && (
                <span className="oge-scheduler-chip-location">
                  {appointment.location}
                </span>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
