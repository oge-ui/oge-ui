'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { sameDay, sameMonth } from '@oge-ui/core';
import {
  beginPointerGesture,
  buildMonthGrid,
  buildMonthWeekLayouts,
  chipKey,
  chipTabIndexOf,
  escapeAttr,
  isWeekendDay,
  monthCellKey,
  monthChipOrder,
  monthDropCell,
  monthMaxLanes,
  monthOriginIndex,
  monthOverflowEntries,
  proposeMove,
  schedulerChipAriaLabel,
  schedulerDayCellAriaLabel,
  schedulerGridAriaLabel,
  schedulerMoreText,
  weekdayShortText,
  type AppointmentProposal,
  type OgeSchedulerGridMessages,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerProposalEvent,
} from '@oge-ui/scheduler-engine';
import { SchedulerAppointmentChip } from './appointment-chip';
import type {
  OgeAppointmentRenderContext,
  OgeSchedulerCellRenderContext,
} from './scheduler-types';

/** What the shell can ask of the month view. */
export interface MonthViewHandle {
  focusGrid(): void;
}

export interface MonthViewProps<T> {
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  /** Weekend days (0 = Sunday) the view shades — the scheduler's resolved list. */
  readonly weekendDays: readonly number[];
  readonly maxAppointmentsPerCell: number | 'auto';
  readonly locale: string | undefined;
  readonly messages: OgeSchedulerGridMessages;
  readonly periodLabel: string;
  readonly allowDragging: boolean;
  readonly renderAppointment:
    ((context: OgeAppointmentRenderContext<T>) => ReactNode) | undefined;
  readonly renderCell:
    ((context: OgeSchedulerCellRenderContext) => ReactNode) | undefined;
  readonly onMoreClick: (date: Date) => void;
  readonly onCellClicked: (event: SchedulerCellEvent) => void;
  readonly onCellDblClicked: (event: SchedulerCellEvent) => void;
  readonly onCellActivated: (event: SchedulerCellEvent) => void;
  readonly onChipClicked: (event: SchedulerChipEvent<T>) => void;
  readonly onChipDblClicked: (event: SchedulerChipEvent<T>) => void;
  readonly onChipActivated: (event: SchedulerChipEvent<T>) => void;
  readonly onChipDeleteRequested: (
    appointment: SchedulerAppointment<T>,
  ) => void;
  readonly onMoveCommitted: (event: SchedulerProposalEvent<T>) => void;
  readonly onGestureCancelled: () => void;
  readonly onChipContextMenu: (event: SchedulerChipEvent<T>) => void;
  readonly onCellContextMenu: (event: SchedulerCellEvent) => void;
}

const rectOf = (target: EventTarget | null): DOMRect =>
  (target as HTMLElement).getBoundingClientRect();

/**
 * Internal month view: a `role="grid"` of six week rows with roving cell
 * focus, packed appointment lanes forming the second tab stop and a "+N
 * more" overflow button that drills into the day view — the markup of the
 * Angular `<oge-scheduler-month-view>`, rendered from the same engine
 * functions.
 */
function MonthViewInner<T>(
  props: MonthViewProps<T>,
  ref: Ref<MonthViewHandle>,
): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { locale, messages, renderAppointment, renderCell } = props;

  const grid = useMemo(
    () => buildMonthGrid(props.anchorDate, props.firstDayOfWeek),
    [props.anchorDate, props.firstDayOfWeek],
  );
  const maxLanes = monthMaxLanes(props.maxAppointmentsPerCell);
  const weekLanes = useMemo(
    () => buildMonthWeekLayouts(props.appointments, grid.weeks, maxLanes),
    [props.appointments, grid, maxLanes],
  );
  const overflowEntries = useMemo(
    () => monthOverflowEntries(weekLanes),
    [weekLanes],
  );
  const chipOrder = useMemo(() => monthChipOrder(weekLanes), [weekLanes]);

  const [focusedCell, setFocusedCell] = useState({ week: 0, day: 0 });
  const [focusedChipKey, setFocusedChipKey] = useState<unknown>(null);
  const [draggedKey, setDraggedKey] = useState<unknown>(null);
  const [dropTarget, setDropTarget] = useState<{
    week: number;
    day: number;
  } | null>(null);

  const queueFocusTarget = (): void => {
    setTimeout(() => {
      hostRef.current
        ?.querySelector<HTMLElement>('[data-focus-target]')
        ?.focus();
    });
  };

  const focusChip = (key: unknown): void => {
    setFocusedChipKey(key);
    setTimeout(() => {
      hostRef.current
        ?.querySelector<HTMLElement>(
          `[data-appointment-key="${escapeAttr(String(key))}"]`,
        )
        ?.focus();
    });
  };

  useImperativeHandle(ref, () => ({ focusGrid: queueFocusTarget }), []);

  const onCellKeyDown = (
    weekIndex: number,
    dayIndex: number,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    const action = monthCellKey(event.key, weekIndex, dayIndex);
    if (action === null) return;
    event.preventDefault();
    if (action.kind === 'activate') {
      props.onCellActivated({
        cellDate: grid.weeks[weekIndex][dayIndex],
        allDay: true,
        event: event.nativeEvent,
      });
      return;
    }
    setFocusedCell({ week: action.row, day: action.col });
    queueFocusTarget();
  };

  const onChipKeyDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    const action = chipKey(event.key, appointment, chipOrder);
    if (action === null) return;
    switch (action.kind) {
      case 'activate':
        event.preventDefault();
        props.onChipActivated({
          appointment,
          event: event.nativeEvent,
          rect: rectOf(event.target),
        });
        return;
      case 'delete':
        event.preventDefault();
        props.onChipDeleteRequested(appointment);
        return;
      case 'focus':
        event.preventDefault();
        focusChip(action.key);
        return;
      case 'escape':
        return;
    }
  };

  const onBarPointerDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!props.allowDragging || appointment.disabled || event.button !== 0) {
      return;
    }
    const gridEl = gridRef.current;
    if (gridEl === null) return;
    const rect = gridEl.getBoundingClientRect();
    const originIndex = monthOriginIndex(grid.weeks, appointment);
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event.nativeEvent, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        const { week, day } = monthDropCell(
          moveEvent.clientX,
          moveEvent.clientY,
          rect,
        );
        setDropTarget({ week, day });
        if (originIndex === -1) return;
        const deltaDays = week * 7 + day - originIndex;
        proposal = proposeMove(appointment, deltaDays, 0, 30);
        setDraggedKey(appointment.key);
      },
      onFinish: (commit, cancelled) => {
        setDraggedKey(null);
        setDropTarget(null);
        if (commit && proposal !== null) {
          props.onMoveCommitted({ appointment, proposal });
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
    rect: rectOf(event.currentTarget),
  });

  const now = new Date();
  const lanesStyle = {
    '--oge-scheduler-month-lanes': maxLanes,
  } as CSSProperties;

  return (
    <div ref={hostRef} className="oge-scheduler-view oge-scheduler-month">
      <div className="oge-scheduler-month-weekdays" role="presentation">
        {grid.weeks[0].map((day) => (
          <div
            key={day.getTime()}
            className="oge-scheduler-month-weekday"
            aria-hidden="true"
          >
            {weekdayShortText(day, locale)}
          </div>
        ))}
      </div>
      {/* the wrapper carries the lane layers so the grid element owns ONLY
          rows (aria-required-children) */}
      <div ref={gridRef} className="oge-scheduler-month-area">
        {/* delegated keydown; focus lives on the roving gridcell */}
        <div
          className="oge-scheduler-month-grid"
          role="grid"
          aria-label={schedulerGridAriaLabel(messages, props.periodLabel)}
        >
          {grid.weeks.map((week, weekIndex) => (
            <div
              key={week[0].getTime()}
              className="oge-scheduler-month-week"
              role="row"
              style={lanesStyle}
            >
              {week.map((day, dayIndex) => {
                const focused =
                  focusedCell.week === weekIndex &&
                  focusedCell.day === dayIndex;
                const drop =
                  dropTarget !== null &&
                  dropTarget.week === weekIndex &&
                  dropTarget.day === dayIndex;
                return (
                  <div
                    key={day.getTime()}
                    className={[
                      'oge-scheduler-month-cell',
                      !sameMonth(day, props.anchorDate) &&
                        'oge-scheduler-month-other',
                      sameDay(day, now) && 'oge-scheduler-day-today',
                      isWeekendDay(day, props.weekendDays) &&
                        'oge-scheduler-cell-weekend',
                      focused && 'oge-scheduler-cell-focused',
                      drop && 'oge-scheduler-drop-target',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="gridcell"
                    tabIndex={focused ? 0 : -1}
                    data-focus-target={focused ? '' : undefined}
                    aria-label={schedulerDayCellAriaLabel(
                      messages,
                      day,
                      locale,
                    )}
                    onClick={(event) => {
                      setFocusedCell({ week: weekIndex, day: dayIndex });
                      props.onCellClicked({
                        cellDate: day,
                        allDay: true,
                        event: event.nativeEvent,
                      });
                    }}
                    onDoubleClick={(event) =>
                      props.onCellDblClicked({
                        cellDate: day,
                        allDay: true,
                        event: event.nativeEvent,
                      })
                    }
                    onKeyDown={(event) =>
                      onCellKeyDown(weekIndex, dayIndex, event)
                    }
                    onContextMenu={(event) =>
                      props.onCellContextMenu({
                        cellDate: day,
                        allDay: true,
                        event: event.nativeEvent,
                      })
                    }
                  >
                    <span
                      className="oge-scheduler-month-daynum"
                      aria-hidden="true"
                    >
                      {day.getDate()}
                    </span>
                    {renderCell?.({ date: day, view: 'month', allDay: true })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {grid.weeks.map((week, weekIndex) => (
          <div
            key={week[0].getTime()}
            className="oge-scheduler-month-lane-layer"
            role="presentation"
            style={{
              ...lanesStyle,
              top: `${(weekIndex / 6) * 100}%`,
              height: `${100 / 6}%`,
            }}
          >
            {weekLanes[weekIndex].visible.map((item) => (
              <div
                key={String(item.appointment.key)}
                className={[
                  'oge-scheduler-month-bar oge-scheduler-chip-stop',
                  item.clippedStart && 'oge-scheduler-bar-clipped-start',
                  item.clippedEnd && 'oge-scheduler-bar-clipped-end',
                  draggedKey === item.appointment.key &&
                    'oge-scheduler-dragging',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="button"
                aria-label={schedulerChipAriaLabel(
                  messages,
                  item.appointment,
                  locale,
                )}
                aria-haspopup="dialog"
                tabIndex={chipTabIndexOf(
                  chipOrder,
                  focusedChipKey,
                  item.appointment,
                )}
                data-appointment-key={String(item.appointment.key)}
                style={{
                  gridColumn: `${item.startDayIndex + 1} / ${item.endDayIndex + 2}`,
                  gridRow: item.lane + 1,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onChipClicked(chipEvent(item.appointment, event));
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  props.onChipDblClicked(chipEvent(item.appointment, event));
                }}
                onKeyDown={(event) => onChipKeyDown(item.appointment, event)}
                onContextMenu={(event) => {
                  event.stopPropagation();
                  props.onChipContextMenu(chipEvent(item.appointment, event));
                }}
                onFocus={() => setFocusedChipKey(item.appointment.key)}
                onPointerDown={(event) =>
                  onBarPointerDown(item.appointment, event)
                }
              >
                <SchedulerAppointmentChip
                  appointment={item.appointment}
                  view="month"
                  compact
                  locale={locale}
                  renderAppointment={renderAppointment}
                />
              </div>
            ))}
            {overflowEntries[weekIndex].map((overflow) => (
              <button
                key={overflow.dayIndex}
                type="button"
                className="oge-scheduler-month-more"
                tabIndex={-1}
                style={{
                  gridColumn: overflow.dayIndex + 1,
                  gridRow: maxLanes + 1,
                }}
                onClick={() => props.onMoreClick(week[overflow.dayIndex])}
              >
                {schedulerMoreText(messages, overflow.count)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const SchedulerMonthView = forwardRef(MonthViewInner) as <T>(
  props: MonthViewProps<T> & { ref?: Ref<MonthViewHandle> },
) => ReactElement;
