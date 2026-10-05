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
import { sameDay } from '@oge-ui/core';
import {
  beginPointerGesture,
  buildMonthGrid,
  buildMonthWeekLayouts,
  chipKey,
  chipSelectKey,
  chipTabIndexOf,
  escapeAttr,
  isMonthViewDay,
  isOgeSchedulerDragOut,
  isWeekendDay,
  monthBlockedDays,
  monthCellKey,
  monthCellSelected,
  monthChipOrder,
  monthColumnHeaderText,
  monthDropCell,
  monthMaxLanes,
  monthOriginIndex,
  monthOverflowEntries,
  proposeMove,
  schedulerChipAriaLabel,
  schedulerDayCellAriaLabel,
  schedulerGridAriaLabel,
  schedulerMoreAriaLabel,
  schedulerMoreText,
  schedulerShortcut,
  schedulerWeekNumber,
  schedulerWeekNumberTexts,
  weekdayShortText,
  withSelectedLabel,
  withUnavailableLabel,
  type AppointmentProposal,
  type OgeSchedulerDisabledSlots,
  type OgeSchedulerDropSlot,
  type OgeSchedulerResolvedMessages,
  type OgeSchedulerWeekNumberRule,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerPasteTarget,
  type SchedulerProposalEvent,
} from '@oge-ui/scheduler-engine';
import { SchedulerAppointmentChip } from './appointment-chip';
import type { SchedulerViewG3Props } from './day-week-view';
import type {
  OgeAppointmentRenderContext,
  OgeSchedulerCellRenderContext,
} from './scheduler-types';

/** What the shell can ask of the month view. */
export interface MonthViewHandle {
  focusGrid(): void;
  /** The day under a viewport point (the drag-in hit test). */
  dropSlotAt(clientX: number, clientY: number): OgeSchedulerDropSlot | null;
}

export interface MonthViewProps<T> extends SchedulerViewG3Props<T> {
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  /** Weekend days (0 = Sunday) the view shades — the scheduler's resolved list. */
  readonly weekendDays: readonly number[];
  readonly maxAppointmentsPerCell: number | 'auto';
  readonly intervalCount: number;
  readonly locale: string | undefined;
  readonly messages: OgeSchedulerResolvedMessages['grid'];
  readonly periodLabel: string;
  readonly allowDragging: boolean;
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl?: boolean;
  /** `aria-readonly` on the grid — the scheduler cannot change anything. */
  readonly readOnly: boolean;
  readonly showWeekNumbers: boolean;
  readonly weekNumberRule: OgeSchedulerWeekNumberRule;
  readonly disabledSlots: OgeSchedulerDisabledSlots | null;
  readonly renderAppointment:
    ((context: OgeAppointmentRenderContext<T>) => ReactNode) | undefined;
  readonly renderCell:
    ((context: OgeSchedulerCellRenderContext) => ReactNode) | undefined;
  readonly onMoreClick: (date: Date, anchor: HTMLElement) => void;
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
  readonly onPasteRequested: (target: SchedulerPasteTarget) => void;
}

const rectOf = (target: EventTarget | null): DOMRect =>
  (target as HTMLElement).getBoundingClientRect();

/**
 * Internal month view: a `role="grid"` of week rows (six, or every week of
 * a multi-month `intervalCount`) with roving cell focus, packed appointment
 * lanes forming the second tab stop and Tab-reachable "+N more" buttons
 * that open the day's popup list — the markup of the Angular
 * `<oge-scheduler-month-view>`, rendered from the same engine functions.
 */
function MonthViewInner<T>(
  props: MonthViewProps<T>,
  ref: Ref<MonthViewHandle>,
): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { locale, messages, renderAppointment, renderCell } = props;

  const grid = useMemo(
    () =>
      buildMonthGrid(
        props.anchorDate,
        props.firstDayOfWeek,
        props.intervalCount,
      ),
    [props.anchorDate, props.firstDayOfWeek, props.intervalCount],
  );
  const weekCount = grid.weeks.length;
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
  const blockedDays = useMemo(
    () => monthBlockedDays(grid.weeks, props.disabledSlots),
    [grid, props.disabledSlots],
  );

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

  const dropSlotAt = (
    clientX: number,
    clientY: number,
  ): OgeSchedulerDropSlot | null => {
    const gridEl = gridRef.current;
    if (gridEl === null) return null;
    const rect = gridEl.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom
    ) {
      return null;
    }
    const { week, day } = monthDropCell(
      clientX,
      clientY,
      rect,
      props.rtl,
      weekCount,
    );
    const date = grid.weeks[week]?.[day];
    return date === undefined
      ? null
      : { startDate: date, allDay: true, resources: {} };
  };

  useImperativeHandle(
    ref,
    () => ({ focusGrid: queueFocusTarget, dropSlotAt }),
    [grid, props.rtl],
  );

  const isSelected = (appointment: SchedulerAppointment<T>): boolean =>
    props.selection.includes(appointment.source);

  const weekBadge = (firstDay: Date): string | null =>
    props.showWeekNumbers
      ? schedulerWeekNumberTexts(
          schedulerWeekNumber(
            firstDay,
            props.weekNumberRule,
            props.firstDayOfWeek,
            locale,
          ),
          messages,
        ).badge
      : null;

  const cellLabel = (
    day: Date,
    weekIndex: number,
    dayIndex: number,
  ): string => {
    let label = schedulerDayCellAriaLabel(messages, day, locale);
    if (dayIndex === 0 && props.showWeekNumbers) {
      label = `${label}, ${
        schedulerWeekNumberTexts(
          schedulerWeekNumber(
            day,
            props.weekNumberRule,
            props.firstDayOfWeek,
            locale,
          ),
          messages,
        ).label
      }`;
    }
    return withUnavailableLabel(
      label,
      blockedDays.has(`${weekIndex}:${dayIndex}`),
      messages,
    );
  };

  const isCurrentMonth = (day: Date): boolean =>
    isMonthViewDay(day, props.anchorDate, props.intervalCount);

  const onCellKeyDown = (
    weekIndex: number,
    dayIndex: number,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    if (schedulerShortcut(event, false) === 'paste') {
      event.preventDefault();
      props.onPasteRequested({
        date: grid.weeks[weekIndex][dayIndex],
        allDay: true,
        values: {},
      });
      return;
    }
    const action = monthCellKey(
      event.key,
      weekIndex,
      dayIndex,
      props.rtl,
      weekCount,
    );
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

  const chipEvent = (
    appointment: SchedulerAppointment<T>,
    event: MouseEvent | KeyboardEvent,
    target: EventTarget | null,
  ): SchedulerChipEvent<T> => ({
    appointment,
    event,
    rect: rectOf(target),
    order: chipOrder,
  });

  const onChipKeyDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    if (schedulerShortcut(event, false) === 'copy') {
      event.preventDefault();
      props.onCopyRequested(appointment);
      return;
    }
    const select = chipSelectKey(event);
    if (select !== null) {
      event.preventDefault();
      props.onSelectRequested({
        appointment,
        gesture: select,
        order: chipOrder,
      });
      return;
    }
    const action = chipKey(event.key, appointment, chipOrder, props.rtl);
    if (action === null) return;
    switch (action.kind) {
      case 'activate':
        event.preventDefault();
        props.onChipActivated(
          chipEvent(appointment, event.nativeEvent, event.target),
        );
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
    const host = hostRef.current;
    if (gridEl === null || host === null) return;
    const rect = gridEl.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const originIndex = monthOriginIndex(grid.weeks, appointment);
    let proposal: AppointmentProposal | null = null;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event.nativeEvent, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        const { week, day } = monthDropCell(
          moveEvent.clientX,
          moveEvent.clientY,
          rect,
          props.rtl,
          weekCount,
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
        if (commit && isOgeSchedulerDragOut(hostRect, lastX, lastY)) {
          props.onDragOut(appointment, lastX, lastY);
          return;
        }
        if (commit && proposal !== null) {
          props.onMoveCommitted({ appointment, proposal });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  const now = new Date();
  const lanesStyle = {
    '--oge-scheduler-month-lanes': maxLanes,
  } as CSSProperties;
  const drop = props.dropPreview;

  return (
    <div
      ref={hostRef}
      className="oge-scheduler-view oge-scheduler-month"
      style={{ '--oge-scheduler-month-rows': weekCount } as CSSProperties}
    >
      {/* visual headers; the grid's own columnheader row carries the names */}
      <div className="oge-scheduler-month-weekdays" aria-hidden="true">
        {grid.weeks[0].map((day) => (
          <div key={day.getTime()} className="oge-scheduler-month-weekday">
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
          aria-readonly={props.readOnly ? true : undefined}
        >
          <div className="oge-scheduler-sr-header-row" role="row">
            {grid.weeks[0].map((day) => (
              <div
                key={day.getTime()}
                className="oge-scheduler-sr-header"
                role="columnheader"
              >
                {monthColumnHeaderText(day, locale)}
              </div>
            ))}
          </div>
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
                const isDrop =
                  dropTarget !== null
                    ? dropTarget.week === weekIndex &&
                      dropTarget.day === dayIndex
                    : drop !== null && sameDay(drop.slot.startDate, day);
                const blocked = blockedDays.has(`${weekIndex}:${dayIndex}`);
                const badge = dayIndex === 0 ? weekBadge(week[0]) : null;
                return (
                  <div
                    key={day.getTime()}
                    className={[
                      'oge-scheduler-month-cell',
                      !isCurrentMonth(day) && 'oge-scheduler-month-other',
                      sameDay(day, now) && 'oge-scheduler-day-today',
                      isWeekendDay(day, props.weekendDays) &&
                        'oge-scheduler-cell-weekend',
                      blocked && 'oge-scheduler-cell-disabled',
                      focused && 'oge-scheduler-cell-focused',
                      isDrop && 'oge-scheduler-drop-target',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="gridcell"
                    aria-disabled={blocked ? true : undefined}
                    tabIndex={focused ? 0 : -1}
                    aria-selected={monthCellSelected(
                      weekIndex,
                      dayIndex,
                      focusedCell,
                    )}
                    data-focus-target={focused ? '' : undefined}
                    aria-label={cellLabel(day, weekIndex, dayIndex)}
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
                    {badge !== null && (
                      <span
                        className="oge-scheduler-week-number"
                        aria-hidden="true"
                      >
                        {badge}
                      </span>
                    )}
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
              top: `${(weekIndex / weekCount) * 100}%`,
              height: `${100 / weekCount}%`,
            }}
          >
            {weekLanes[weekIndex].visible.map((item) => (
              <div
                key={String(item.appointment.key)}
                className={[
                  'oge-scheduler-month-bar oge-scheduler-chip-stop',
                  item.clippedStart && 'oge-scheduler-bar-clipped-start',
                  item.clippedEnd && 'oge-scheduler-bar-clipped-end',
                  isSelected(item.appointment) && 'oge-scheduler-chip-selected',
                  draggedKey === item.appointment.key &&
                    'oge-scheduler-dragging',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="button"
                aria-label={withSelectedLabel(
                  schedulerChipAriaLabel(messages, item.appointment, locale),
                  isSelected(item.appointment),
                  messages,
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
                onClick={(event: ReactMouseEvent<HTMLElement>) => {
                  event.stopPropagation();
                  props.onChipClicked(
                    chipEvent(
                      item.appointment,
                      event.nativeEvent,
                      event.currentTarget,
                    ),
                  );
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  props.onChipDblClicked(
                    chipEvent(
                      item.appointment,
                      event.nativeEvent,
                      event.currentTarget,
                    ),
                  );
                }}
                onKeyDown={(event) => onChipKeyDown(item.appointment, event)}
                onContextMenu={(event) => {
                  event.stopPropagation();
                  props.onChipContextMenu(
                    chipEvent(
                      item.appointment,
                      event.nativeEvent,
                      event.currentTarget,
                    ),
                  );
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
                aria-haspopup="dialog"
                aria-label={schedulerMoreAriaLabel(
                  messages,
                  overflow.count,
                  week[overflow.dayIndex],
                  locale,
                )}
                style={{
                  gridColumn: overflow.dayIndex + 1,
                  gridRow: maxLanes + 1,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onMoreClick(
                    week[overflow.dayIndex],
                    event.currentTarget,
                  );
                }}
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
