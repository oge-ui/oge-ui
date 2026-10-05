'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactElement,
  type Ref,
} from 'react';
import { OgePopup, useAnchoredPanel } from '@oge-ui/react-overlay';
import {
  agendaTimeText,
  morePopupKey,
  schedulerMorePopupTitle,
  type OgeSchedulerResolvedMessages,
  type SchedulerAppointment,
} from '@oge-ui/scheduler-engine';

/** What the shell can ask of the "+N more" popup. */
export interface MorePopupHandle {
  open(anchor: HTMLElement): void;
  close(): void;
}

export interface MorePopupProps<T> {
  readonly messages: OgeSchedulerResolvedMessages['grid'];
  readonly locale: string | undefined;
  readonly day: Date | null;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly onAppointmentPicked: (
    appointment: SchedulerAppointment<T>,
    rect: DOMRect,
    event: MouseEvent,
  ) => void;
  readonly onDayRequested: (day: Date) => void;
  readonly onClosed: () => void;
}

/**
 * Internal "+N more" popup of the month view — the markup of the Angular
 * `<oge-scheduler-more-popup>`: an anchored panel on the pressed button
 * listing the whole day (`role="dialog"` named by the date). Focus moves to
 * the first entry; Up / Down / Home / End move, Enter opens one, Escape
 * closes and returns focus to the button.
 */
function MorePopupInner<T>(
  props: MorePopupProps<T>,
  ref: Ref<MorePopupHandle>,
): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const latest = useRef(props);
  latest.current = props;
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
    onClosed: (reason) => {
      latest.current.onClosed();
      if (reason === 'escape') anchorRef.current?.focus();
    },
  });

  const focusItem = (index: number): void => {
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-more-index="${index}"]`)
      ?.focus();
  };

  useImperativeHandle(
    ref,
    () => ({
      open: (anchor) => {
        anchorRef.current = anchor;
        rectRef.current = anchor.getBoundingClientRect();
        panel.open();
        setTimeout(() => focusItem(0));
      },
      close: () => panel.close(),
    }),
    [panel],
  );

  const { day, messages, locale, appointments } = props;
  if (!panel.isOpen || day === null) return null;
  const title = schedulerMorePopupTitle(messages, day, locale);
  return (
    <OgePopup panel={panel}>
      <div
        ref={panelRef}
        className="oge-scheduler-popup oge-scheduler-more-popup"
        role="dialog"
        aria-modal="false"
        aria-label={title.label}
      >
        <div className="oge-scheduler-popup-header">
          <span className="oge-scheduler-popup-title">{title.heading}</span>
          <button
            type="button"
            className="oge-scheduler-btn oge-scheduler-btn-icon"
            aria-label={messages.closeLabel}
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
        <ul className="oge-scheduler-more-list">
          {appointments.map((appointment, index) => (
            <li key={String(appointment.key)}>
              <button
                type="button"
                className="oge-scheduler-more-item"
                data-more-index={index}
                onClick={(event) => {
                  const rect =
                    anchorRef.current?.getBoundingClientRect() ??
                    event.currentTarget.getBoundingClientRect();
                  panel.close();
                  props.onAppointmentPicked(
                    appointment,
                    rect,
                    event.nativeEvent,
                  );
                }}
                onKeyDown={(event) => {
                  const next = morePopupKey(
                    event.key,
                    index,
                    appointments.length,
                  );
                  if (next === null) return;
                  event.preventDefault();
                  focusItem(next);
                }}
              >
                <span
                  className="oge-scheduler-agenda-dot"
                  style={{ backgroundColor: appointment.color }}
                  aria-hidden="true"
                />
                <span className="oge-scheduler-agenda-time">
                  {agendaTimeText(
                    appointment,
                    day,
                    locale,
                    messages.allDayLabel,
                  )}
                </span>
                <span className="oge-scheduler-agenda-text">
                  {appointment.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="oge-scheduler-popup-actions">
          <button
            type="button"
            className="oge-scheduler-btn"
            onClick={() => {
              panel.close();
              props.onDayRequested(day);
            }}
          >
            {messages.goToDay}
          </button>
        </div>
      </div>
    </OgePopup>
  );
}

export const SchedulerMorePopup = forwardRef(MorePopupInner) as <T>(
  props: MorePopupProps<T> & { ref?: Ref<MorePopupHandle> },
) => ReactElement | null;
