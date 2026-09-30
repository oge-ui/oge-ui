'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from 'react';
import { OgePopup, useAnchoredPanel } from '@oge-ui/react-overlay';
import {
  popupTimeText,
  type OgeSchedulerPopupMessages,
  type SchedulerAppointment,
} from '@oge-ui/scheduler-engine';

/** What the shell can ask of the summary popup. */
export interface AppointmentPopupHandle<T> {
  open(appointment: SchedulerAppointment<T>, rect: DOMRect): void;
  close(): void;
}

export interface AppointmentPopupProps<T> {
  readonly messages: OgeSchedulerPopupMessages;
  readonly locale: string | undefined;
  readonly allowEditing: boolean;
  readonly allowDeleting: boolean;
  readonly onEditRequested: (appointment: SchedulerAppointment<T>) => void;
  readonly onDeleteRequested: (appointment: SchedulerAppointment<T>) => void;
}

/**
 * Internal appointment popup: an anchored panel opened on a virtual anchor
 * rect (the clicked chip), showing the appointment summary with Edit /
 * Delete / Close actions — the markup of the Angular
 * `<oge-scheduler-appointment-popup>`. Escape and outside clicks close
 * through the shared overlay stack.
 */
function AppointmentPopupInner<T>(
  props: AppointmentPopupProps<T>,
  ref: Ref<AppointmentPopupHandle<T>>,
): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [appointment, setAppointment] =
    useState<SchedulerAppointment<T> | null>(null);
  const panel = useAnchoredPanel({
    anchor: () => null,
    anchorRect: () => {
      const rect = rectRef.current;
      return rect === null
        ? null
        : {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
    },
    panel: () => panelRef.current,
    placement: () => 'bottom-start',
    onClosed: () => setAppointment(null),
  });

  useImperativeHandle(
    ref,
    () => ({
      open: (next, rect) => {
        rectRef.current = rect;
        setAppointment(next);
        panel.open();
      },
      close: () => panel.close(),
    }),
    [panel],
  );

  if (!panel.isOpen) return null;
  const { messages } = props;
  return (
    <OgePopup panel={panel}>
      <div
        ref={panelRef}
        className="oge-scheduler-popup"
        role="dialog"
        aria-modal="false"
        aria-label={appointment?.text}
      >
        {appointment && (
          <>
            <div className="oge-scheduler-popup-header">
              <span
                className="oge-scheduler-popup-swatch"
                style={{ backgroundColor: appointment.color }}
                aria-hidden="true"
              />
              <span className="oge-scheduler-popup-title">
                {appointment.text}
              </span>
              <button
                type="button"
                className="oge-scheduler-btn oge-scheduler-btn-icon"
                aria-label={messages.close}
                onClick={() => panel.close()}
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
                  <path d="m4 4 8 8m0-8-8 8" />
                </svg>
              </button>
            </div>
            <div className="oge-scheduler-popup-time">
              {popupTimeText(appointment, props.locale)}
            </div>
            {appointment.location && (
              <div className="oge-scheduler-popup-location">
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 14.5s4.5-4.1 4.5-7.5a4.5 4.5 0 1 0-9 0c0 3.4 4.5 7.5 4.5 7.5Z" />
                  <circle cx="8" cy="7" r="1.6" />
                </svg>
                <span>{appointment.location}</span>
              </div>
            )}
            {appointment.description && (
              <div className="oge-scheduler-popup-desc">
                {appointment.description}
              </div>
            )}
            <div className="oge-scheduler-popup-actions">
              {props.allowEditing && (
                <button
                  type="button"
                  className="oge-scheduler-btn"
                  onClick={() => {
                    panel.close();
                    props.onEditRequested(appointment);
                  }}
                >
                  {messages.edit}
                </button>
              )}
              {props.allowDeleting && (
                <button
                  type="button"
                  className="oge-scheduler-btn oge-scheduler-btn-danger"
                  onClick={() => {
                    panel.close();
                    props.onDeleteRequested(appointment);
                  }}
                >
                  {messages.deleteAppointment}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </OgePopup>
  );
}

export const SchedulerAppointmentPopup = forwardRef(AppointmentPopupInner) as <
  T,
>(
  props: AppointmentPopupProps<T> & { ref?: Ref<AppointmentPopupHandle<T>> },
) => ReactElement | null;
