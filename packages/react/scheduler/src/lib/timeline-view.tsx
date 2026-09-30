'use client';

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { sameDay } from '@oge-ui/core';
import {
  beginPointerGesture,
  buildTimelineGrid,
  buildTimelineRows,
  isWeekendDay,
  timelineBarCtrlKey,
  timelineDayText,
  timelineDragMove,
  timelineHourLabels,
  timelineRowAt,
  type AppointmentProposal,
  type OgeSchedulerGridMessages,
  type OgeSchedulerResource,
  type SchedulerAppointment,
  type SchedulerChipEvent,
  type TimelineMoveEvent,
} from '@oge-ui/scheduler-engine';

export interface TimelineViewProps<T> {
  readonly view: 'timelineDay' | 'timelineWeek';
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
  readonly locale: string | undefined;
  readonly messages: OgeSchedulerGridMessages;
  readonly groupResource: OgeSchedulerResource | null;
  readonly resourceIdOf: (item: T) => unknown;
  readonly allowDragging: boolean;
  readonly snapDuration: number | undefined;
  readonly onChipClicked: (event: SchedulerChipEvent<T>) => void;
  readonly onChipDblClicked: (event: SchedulerChipEvent<T>) => void;
  readonly onChipDeleteRequested: (
    appointment: SchedulerAppointment<T>,
  ) => void;
  readonly onMoveCommitted: (event: TimelineMoveEvent<T>) => void;
  readonly onGestureCancelled: () => void;
}

interface TimelinePreview {
  readonly key: unknown;
  readonly leftPct: number;
  readonly widthPct: number;
  readonly rowIndex: number;
}

/**
 * Internal timeline view: a horizontal time axis (day or week) with one row
 * per resource of the grouping field — or a single row without grouping —
 * the markup of the Angular `<oge-scheduler-timeline-view>`, rendered from
 * the same engine functions.
 */
export function SchedulerTimelineView<T>(props: TimelineViewProps<T>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { view, locale } = props;
  const grid = useMemo(
    () =>
      buildTimelineGrid(
        view,
        props.anchorDate,
        props.firstDayOfWeek,
        props.dayStartHour,
        props.dayEndHour,
        props.cellDuration,
      ),
    [
      view,
      props.anchorDate,
      props.firstDayOfWeek,
      props.dayStartHour,
      props.dayEndHour,
      props.cellDuration,
    ],
  );
  const rows = useMemo(
    () =>
      buildTimelineRows(
        props.appointments,
        grid,
        props.cellDuration,
        props.groupResource,
        props.resourceIdOf,
        props.messages.unassignedLabel,
      ),
    [
      props.appointments,
      grid,
      props.cellDuration,
      props.groupResource,
      props.resourceIdOf,
      props.messages.unassignedLabel,
    ],
  );
  const hourLabels = useMemo(
    () => timelineHourLabels(grid, view, locale),
    [grid, view, locale],
  );
  const [preview, setPreview] = useState<TimelinePreview | null>(null);
  const snapMinutes = props.snapDuration ?? props.cellDuration;
  const now = new Date();
  const dayWidth = `${100 / grid.days.length}%`;

  const onBarPointerDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!props.allowDragging || appointment.disabled || event.button !== 0) {
      return;
    }
    const tracks = Array.from(
      hostRef.current?.querySelectorAll<HTMLElement>(
        '.oge-scheduler-timeline-track',
      ) ?? [],
    );
    const barEl = event.currentTarget;
    const originRow = tracks.findIndex((track) => track.contains(barEl));
    if (originRow === -1) return;
    const trackRect = tracks[originRow].getBoundingClientRect();
    const rowRects = tracks.map((track) => track.getBoundingClientRect());
    const startLeftPct = parseFloat(barEl.style.insetInlineStart) || 0;
    const widthPct = parseFloat(barEl.style.width) || 0;
    let proposal: AppointmentProposal | null = null;
    let targetRow = originRow;
    beginPointerGesture(event.nativeEvent, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        const move = timelineDragMove(
          appointment,
          deltaX,
          trackRect.width,
          grid,
          snapMinutes,
          startLeftPct,
        );
        proposal = move.proposal;
        targetRow = timelineRowAt(moveEvent.clientY, rowRects, originRow);
        setPreview({
          key: appointment.key,
          leftPct: move.leftPct,
          widthPct,
          rowIndex: targetRow,
        });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
        if (commit && proposal !== null) {
          const rowId = rows[targetRow]?.id ?? null;
          const changedRow = targetRow !== originRow && rowId !== null;
          props.onMoveCommitted({
            appointment,
            proposal,
            ...(changedRow ? { resourceId: rowId } : {}),
          });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  const chipEvent = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): SchedulerChipEvent<T> => ({
    appointment,
    event: event.nativeEvent,
    rect: event.currentTarget.getBoundingClientRect(),
  });

  const onBarKeyDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    const ctrl = timelineBarCtrlKey(
      appointment,
      event,
      snapMinutes,
      props.allowDragging,
      rows,
      props.resourceIdOf,
    );
    if (ctrl.handled) {
      if (ctrl.commit !== undefined) {
        event.preventDefault();
        props.onMoveCommitted({
          appointment,
          proposal: ctrl.commit.proposal,
          ...(ctrl.commit.resourceId !== undefined
            ? { resourceId: ctrl.commit.resourceId }
            : {}),
        });
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      props.onChipDeleteRequested(appointment);
    }
  };

  return (
    <div ref={hostRef} className="oge-scheduler-view oge-scheduler-timeline">
      <div className="oge-scheduler-timeline-scroll">
        <div className="oge-scheduler-timeline-inner">
          <div className="oge-scheduler-timeline-header" role="presentation">
            <div className="oge-scheduler-timeline-corner" />
            <div className="oge-scheduler-timeline-days">
              {grid.days.map((day) => (
                <div
                  key={day.getTime()}
                  className={
                    sameDay(day, now)
                      ? 'oge-scheduler-timeline-dayhead oge-scheduler-day-today'
                      : 'oge-scheduler-timeline-dayhead'
                  }
                  style={{ width: dayWidth }}
                >
                  {timelineDayText(day, locale)}
                </div>
              ))}
            </div>
          </div>
          <div className="oge-scheduler-timeline-subheader" role="presentation">
            <div className="oge-scheduler-timeline-corner" />
            <div className="oge-scheduler-timeline-days">
              {hourLabels.map((label) => (
                <span
                  key={label.pct}
                  className="oge-scheduler-timeline-hour"
                  style={{ insetInlineStart: `${label.pct}%` }}
                >
                  {label.text}
                </span>
              ))}
            </div>
          </div>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="oge-scheduler-timeline-row">
              <div className="oge-scheduler-timeline-rowhead">
                <span
                  className="oge-scheduler-agenda-dot"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                {row.text}
              </div>
              <div
                className="oge-scheduler-timeline-track"
                style={
                  {
                    '--oge-scheduler-timeline-lanes': row.laneCount,
                  } as CSSProperties
                }
              >
                {grid.days.map((day) => (
                  <div
                    key={day.getTime()}
                    className={
                      isWeekendDay(day)
                        ? 'oge-scheduler-timeline-daycol oge-scheduler-cell-weekend'
                        : 'oge-scheduler-timeline-daycol'
                    }
                    style={{ width: dayWidth }}
                  />
                ))}
                {row.bars.map((bar) => (
                  <button
                    key={String(bar.appointment.key)}
                    type="button"
                    className={[
                      'oge-scheduler-timeline-bar oge-scheduler-chip-stop',
                      bar.clippedStart && 'oge-scheduler-bar-clipped-start',
                      bar.clippedEnd && 'oge-scheduler-bar-clipped-end',
                      preview?.key === bar.appointment.key &&
                        'oge-scheduler-dragging',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      insetInlineStart: `${bar.leftPct}%`,
                      width: `${bar.widthPct}%`,
                      top: `${4 + bar.lane * 26}px`,
                      backgroundColor: bar.appointment.color,
                    }}
                    onClick={(event) =>
                      props.onChipClicked(chipEvent(bar.appointment, event))
                    }
                    onDoubleClick={(event) =>
                      props.onChipDblClicked(chipEvent(bar.appointment, event))
                    }
                    onKeyDown={(event) => onBarKeyDown(bar.appointment, event)}
                    onPointerDown={(event) =>
                      onBarPointerDown(bar.appointment, event)
                    }
                  >
                    {bar.appointment.text}
                  </button>
                ))}
                {preview !== null && preview.rowIndex === rowIndex && (
                  <div
                    className="oge-scheduler-drag-preview oge-scheduler-timeline-preview"
                    aria-hidden="true"
                    style={{
                      insetInlineStart: `${preview.leftPct}%`,
                      width: `${preview.widthPct}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
