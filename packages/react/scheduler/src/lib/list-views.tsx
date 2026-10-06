'use client';

import {
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { sameDay } from '@oge-ui/core';
import {
  agendaDayText,
  agendaTimeText,
  buildAgendaDays,
  buildYearMonths,
  countAppointmentsByDay,
  toSchedulerView,
  yearCellLabel,
  yearWeekdayText,
  type OgeSchedulerGridMessages,
  type SchedulerAppointment,
  type SchedulerChipEvent,
} from '@oge-ui/scheduler-engine';

export interface AgendaViewProps<T> {
  readonly anchorDate: Date;
  readonly agendaDuration: number;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly locale: string | undefined;
  /** The display zone: "today" and the now-line follow its clocks. */
  readonly timeZone?: string;
  readonly messages: OgeSchedulerGridMessages;
  readonly onChipClicked: (event: SchedulerChipEvent<T>) => void;
  readonly onChipDblClicked: (event: SchedulerChipEvent<T>) => void;
  readonly onChipDeleteRequested: (
    appointment: SchedulerAppointment<T>,
  ) => void;
}

/**
 * Internal agenda (list) view: day-grouped appointment rows for
 * `agendaDuration` days from the anchor, empty days skipped — the markup of
 * the Angular `<oge-scheduler-agenda-view>`. Rows are plain buttons in the
 * Tab order: a list needs no composite-widget keyboard model.
 */
export function SchedulerAgendaView<T>(props: AgendaViewProps<T>) {
  const { locale, messages } = props;
  const days = useMemo(
    () =>
      buildAgendaDays(
        props.anchorDate,
        props.agendaDuration,
        props.appointments,
      ),
    [props.anchorDate, props.agendaDuration, props.appointments],
  );
  const now = toSchedulerView(new Date(), props.timeZone);

  const chipEvent = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): SchedulerChipEvent<T> => ({
    appointment,
    event: event.nativeEvent,
    rect: event.currentTarget.getBoundingClientRect(),
  });

  const onKeyDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      props.onChipDeleteRequested(appointment);
    }
  };

  return (
    <div className="oge-scheduler-view oge-scheduler-agenda">
      {days.length === 0 ? (
        <div className="oge-scheduler-agenda-empty">
          {messages.agendaNoData}
        </div>
      ) : (
        <ul className="oge-scheduler-agenda-list">
          {days.map((group) => (
            <li key={group.day.getTime()} className="oge-scheduler-agenda-day">
              <div className="oge-scheduler-agenda-date">
                <span
                  className={
                    sameDay(group.day, now)
                      ? 'oge-scheduler-agenda-daynum oge-scheduler-date-today'
                      : 'oge-scheduler-agenda-daynum'
                  }
                >
                  {group.day.getDate()}
                </span>
                <span className="oge-scheduler-agenda-weekday">
                  {agendaDayText(group.day, locale)}
                </span>
              </div>
              <ul className="oge-scheduler-agenda-items">
                {group.appointments.map((appointment) => (
                  <li key={String(appointment.key)}>
                    <button
                      type="button"
                      className={
                        appointment.disabled
                          ? 'oge-scheduler-agenda-item oge-scheduler-chip-disabled'
                          : 'oge-scheduler-agenda-item'
                      }
                      onClick={(event) =>
                        props.onChipClicked(chipEvent(appointment, event))
                      }
                      onDoubleClick={(event) =>
                        props.onChipDblClicked(chipEvent(appointment, event))
                      }
                      onKeyDown={(event) => onKeyDown(appointment, event)}
                    >
                      <span
                        className="oge-scheduler-agenda-dot"
                        style={{ backgroundColor: appointment.color }}
                        aria-hidden="true"
                      />
                      <span className="oge-scheduler-agenda-time">
                        {agendaTimeText(
                          appointment,
                          group.day,
                          locale,
                          messages.allDayLabel,
                        )}
                      </span>
                      <span className="oge-scheduler-agenda-text">
                        {appointment.text}
                        {appointment.location && (
                          <>
                            {' '}
                            <em className="oge-scheduler-agenda-location">
                              {appointment.location}
                            </em>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface YearViewProps<T> {
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  readonly locale: string | undefined;
  /** The display zone: "today" and the now-line follow its clocks. */
  readonly timeZone?: string;
  readonly onDayPicked: (date: Date) => void;
}

/**
 * Internal year view: twelve mini months with per-day busy dots; clicking a
 * day drills into the day view — the markup of the Angular
 * `<oge-scheduler-year-view>`.
 */
export function SchedulerYearView<T>(props: YearViewProps<T>) {
  const { locale } = props;
  const counts = useMemo(
    () => countAppointmentsByDay(props.appointments),
    [props.appointments],
  );
  const year = props.anchorDate.getFullYear();
  const months = useMemo(
    () => buildYearMonths(year, props.firstDayOfWeek, counts, locale),
    [year, props.firstDayOfWeek, counts, locale],
  );
  const now = toSchedulerView(new Date(), props.timeZone);
  return (
    <div className="oge-scheduler-view oge-scheduler-year">
      <div className="oge-scheduler-year-grid">
        {months.map((month) => (
          <section
            key={month.anchor.getTime()}
            className="oge-scheduler-year-month"
          >
            <h3 className="oge-scheduler-year-title">{month.title}</h3>
            <div className="oge-scheduler-year-weekdays" aria-hidden="true">
              {month.weeks[0].map((cell) => (
                <span key={cell.day.getTime()}>
                  {yearWeekdayText(cell.day, locale)}
                </span>
              ))}
            </div>
            {month.weeks.map((week) => (
              <div
                key={week[0].day.getTime()}
                className="oge-scheduler-year-week"
              >
                {week.map((cell) => (
                  <button
                    key={cell.day.getTime()}
                    type="button"
                    className={[
                      'oge-scheduler-year-cell',
                      cell.otherMonth && 'oge-scheduler-year-other',
                      sameDay(cell.day, now) && 'oge-scheduler-date-today',
                      cell.count > 0 && 'oge-scheduler-year-busy',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={yearCellLabel(cell, locale)}
                    tabIndex={cell.otherMonth ? -1 : 0}
                    onClick={() => props.onDayPicked(cell.day)}
                  >
                    {cell.day.getDate()}
                    {cell.count > 0 && !cell.otherMonth && (
                      <span
                        className="oge-scheduler-year-dot"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
