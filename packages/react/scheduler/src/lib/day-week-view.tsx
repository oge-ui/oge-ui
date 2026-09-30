'use client';

import {
  Fragment,
  forwardRef,
  useEffect,
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
  allDayDragProposal,
  beginPointerGesture,
  buildAllDayLayout,
  buildDayWeekColumns,
  buildGutterSlots,
  buildTimeGrid,
  chipKey,
  chipLeftPercent,
  chipTabIndexOf,
  chipWidthPercent,
  dayWeekCellDate,
  dayWeekChipOrder,
  dayWeekDragMove,
  dayWeekGroupItems,
  dayWeekPreviewBox,
  dayWeekResizeProposal,
  dayWeekSelectionBox,
  dragSelectionRange,
  escapeAttr,
  isOffHoursCell,
  isWeekendDay,
  layoutDayWeekSegments,
  nowLineFraction,
  originDayIndex,
  partitionAllDay,
  resourceIndexOf,
  schedulerCellAriaLabel,
  schedulerChipAriaLabel,
  schedulerGridAriaLabel,
  segmentKey,
  timeGridCellKey,
  timeGridChipCtrlKey,
  weekdayShortText,
  type AppointmentProposal,
  type DayWeekSelection,
  type OgeSchedulerGridMessages,
  type OgeSchedulerResource,
  type OgeSchedulerWorkHours,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerProposalEvent,
  type SchedulerRangeEvent,
  type TimeGridVm,
} from '@oge-ui/scheduler-engine';
import { SchedulerAppointmentChip } from './appointment-chip';
import type {
  OgeAppointmentRenderContext,
  OgeDateHeaderRenderContext,
  OgeSchedulerCellRenderContext,
} from './scheduler-types';

/** What the shell can ask of the time-grid view. */
export interface DayWeekViewHandle {
  focusGrid(): void;
  readonly grid: TimeGridVm;
}

export interface DayWeekViewProps<T> {
  readonly view: 'day' | 'week' | 'workWeek';
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
  readonly showAllDayPanel: boolean;
  readonly showCurrentTimeIndicator: boolean;
  readonly minAppointmentMinutes: number;
  readonly locale: string | undefined;
  readonly messages: OgeSchedulerGridMessages;
  readonly periodLabel: string;
  readonly allowDragging: boolean;
  readonly allowResizing: boolean;
  readonly allowAdding: boolean;
  readonly hiddenWeekDays: readonly number[] | undefined;
  readonly workHours: OgeSchedulerWorkHours | null;
  readonly shadeUntilCurrentTime: boolean;
  readonly snapDuration: number | undefined;
  readonly groupResource: OgeSchedulerResource | null;
  readonly resourceIdOf: (item: T) => unknown;
  readonly renderAppointment:
    ((context: OgeAppointmentRenderContext<T>) => ReactNode) | undefined;
  readonly renderCell:
    ((context: OgeSchedulerCellRenderContext) => ReactNode) | undefined;
  readonly renderDateHeader:
    ((context: OgeDateHeaderRenderContext) => ReactNode) | undefined;
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
  readonly onResizeCommitted: (event: SchedulerProposalEvent<T>) => void;
  readonly onGestureCancelled: () => void;
  readonly onRangeSelected: (event: SchedulerRangeEvent) => void;
  readonly onChipContextMenu: (event: SchedulerChipEvent<T>) => void;
  readonly onCellContextMenu: (event: SchedulerCellEvent) => void;
}

interface Preview {
  readonly key: unknown;
  readonly proposal: AppointmentProposal;
  readonly resIndex?: number;
}

const rectOf = (target: EventTarget | null): DOMRect =>
  (target as HTMLElement).getBoundingClientRect();

const pct = (value: number): string => `${value}%`;

/**
 * Internal day/week view: date headers, the all-day strip, the scrollable
 * slot grid (`role="grid"`, row-major, roving tabindex) and one absolutely
 * positioned chip layer forming the second tab stop — the markup of the
 * Angular `<oge-scheduler-day-week-view>`, rendered from the same engine
 * functions.
 */
function DayWeekViewInner<T>(
  props: DayWeekViewProps<T>,
  ref: Ref<DayWeekViewHandle>,
): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const {
    view,
    locale,
    messages,
    renderAppointment,
    renderCell,
    renderDateHeader,
  } = props;

  const grid = useMemo(
    () =>
      buildTimeGrid({
        anchorDate: props.anchorDate,
        view,
        firstDayOfWeek: props.firstDayOfWeek,
        dayStartHour: props.dayStartHour,
        dayEndHour: props.dayEndHour,
        cellDuration: props.cellDuration,
        hiddenWeekDays: props.hiddenWeekDays,
      }),
    [
      props.anchorDate,
      view,
      props.firstDayOfWeek,
      props.dayStartHour,
      props.dayEndHour,
      props.cellDuration,
      props.hiddenWeekDays,
    ],
  );
  const snapMinutes = props.snapDuration ?? grid.cellDuration;
  const groupItems = useMemo(
    () => dayWeekGroupItems(props.groupResource),
    [props.groupResource],
  );
  const resCount = groupItems?.length ?? 1;
  const colCount = grid.days.length * resCount;
  const columns = useMemo(
    () => buildDayWeekColumns(grid.days, groupItems),
    [grid, groupItems],
  );
  const partitioned = useMemo(
    () => partitionAllDay(props.appointments),
    [props.appointments],
  );
  const layouted = useMemo(
    () =>
      layoutDayWeekSegments(
        partitioned.timed,
        grid,
        groupItems,
        props.resourceIdOf,
        props.minAppointmentMinutes,
      ),
    [
      partitioned,
      grid,
      groupItems,
      props.resourceIdOf,
      props.minAppointmentMinutes,
    ],
  );
  const allDayLayout = useMemo(
    () => buildAllDayLayout(partitioned.allDay, grid),
    [partitioned, grid],
  );
  const allDayBars = allDayLayout.visible;
  const allDayLaneCount = Math.max(1, allDayLayout.laneCount);
  const chipOrder = useMemo(
    () => dayWeekChipOrder(allDayBars, layouted),
    [allDayBars, layouted],
  );
  const gutterSlots = useMemo(
    () => buildGutterSlots(grid, locale),
    [grid, locale],
  );

  /* ---------- roving focus ---------- */

  const [focusedCell, setFocusedCell] = useState({ day: 0, slot: 0 });
  const [focusedChipKey, setFocusedChipKey] = useState<unknown>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selection, setSelection] = useState<DayWeekSelection | null>(null);
  const [now, setNow] = useState(() => new Date());

  // ticks every 30s so the now-indicator drifts
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

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

  useImperativeHandle(
    ref,
    () => ({
      focusGrid: queueFocusTarget,
      grid,
    }),
    [grid],
  );

  const cellDate = (colIndex: number, minutes: number): Date =>
    dayWeekCellDate(columns, grid.days, resCount, colIndex, minutes);

  const isFocusedCell = (dayIndex: number, slotIndex: number): boolean =>
    focusedCell.day === dayIndex && focusedCell.slot === slotIndex;

  /* ---------- keyboard ---------- */

  const onCellKeyDown = (
    dayIndex: number,
    slotIndex: number,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    const action = timeGridCellKey(
      event.key,
      dayIndex,
      slotIndex,
      colCount,
      grid.slotStartMinutes.length,
    );
    if (action === null) return;
    event.preventDefault();
    if (action.kind === 'activate') {
      props.onCellActivated({
        cellDate: cellDate(dayIndex, grid.slotStartMinutes[slotIndex]),
        allDay: false,
        event: event.nativeEvent,
        resourceId: columns[dayIndex]?.resourceId,
      });
      return;
    }
    setFocusedCell({ day: action.col, slot: action.row });
    queueFocusTarget();
  };

  const onChipKeyDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    const ctrl = timeGridChipCtrlKey(
      appointment,
      event,
      grid.cellDuration,
      props.allowDragging,
      props.allowResizing,
    );
    if (ctrl.handled) {
      if (ctrl.commit !== undefined) {
        event.preventDefault();
        const committed = { appointment, proposal: ctrl.commit.proposal };
        if (ctrl.commit.kind === 'resize') props.onResizeCommitted(committed);
        else props.onMoveCommitted(committed);
      }
      return;
    }
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

  /* ---------- pointer gestures ---------- */

  const onCellPointerDown = (
    dayIndex: number,
    slotIndex: number,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!props.allowAdding || event.button !== 0) return;
    const rows = rowsRef.current;
    if (rows === null) return;
    const rect = rows.getBoundingClientRect();
    const anchorMinutes = grid.slotStartMinutes[slotIndex];
    let range: { startMinutes: number; endMinutes: number } | null = null;
    beginPointerGesture(event.nativeEvent, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        range = dragSelectionRange(
          moveEvent.clientY,
          rect.top,
          rect.height,
          grid,
          anchorMinutes,
          snapMinutes,
        );
        setSelection({ dayIndex, ...range });
      },
      onFinish: (commit, cancelled) => {
        setSelection(null);
        if (commit && range !== null) {
          props.onRangeSelected({
            startDate: cellDate(dayIndex, range.startMinutes),
            endDate: cellDate(dayIndex, range.endMinutes),
            resourceId: columns[dayIndex]?.resourceId,
          });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  const onChipPointerDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (
      !props.allowDragging ||
      appointment.disabled ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('.oge-scheduler-resize-handle')
    ) {
      return;
    }
    const rows = rowsRef.current;
    if (rows === null) return;
    const rect = rows.getBoundingClientRect();
    const originRes = resourceIndexOf(
      appointment,
      groupItems,
      props.resourceIdOf,
    );
    const originDay = originDayIndex(grid, appointment);
    let proposal: AppointmentProposal | null = null;
    let targetRes = originRes;
    beginPointerGesture(event.nativeEvent, {
      onMove: (deltaX, deltaY) => {
        const move = dayWeekDragMove(
          appointment,
          deltaX,
          deltaY,
          rect.width,
          rect.height,
          grid,
          colCount,
          resCount,
          originDay,
          originRes,
          snapMinutes,
        );
        proposal = move.proposal;
        targetRes = move.targetRes;
        setPreview({ key: appointment.key, proposal, resIndex: targetRes });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
        if (commit && proposal !== null) {
          const changedRes = groupItems !== null && targetRes !== originRes;
          props.onMoveCommitted({
            appointment,
            proposal,
            ...(changedRes && groupItems
              ? { resourceId: groupItems[targetRes].id }
              : {}),
          });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  const onResizePointerDown = (
    appointment: SchedulerAppointment<T>,
    edge: 'start' | 'end',
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!props.allowResizing || appointment.disabled || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    const rows = rowsRef.current;
    if (rows === null) return;
    const rect = rows.getBoundingClientRect();
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event.nativeEvent, {
      onMove: (_deltaX, deltaY) => {
        proposal = dayWeekResizeProposal(
          appointment,
          edge,
          deltaY,
          rect.height,
          grid,
          snapMinutes,
        );
        setPreview({ key: appointment.key, proposal });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
        if (commit && proposal !== null) {
          props.onResizeCommitted({ appointment, proposal });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  const onAllDayBarPointerDown = (
    appointment: SchedulerAppointment<T>,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!props.allowDragging || appointment.disabled || event.button !== 0) {
      return;
    }
    const rows = rowsRef.current;
    if (rows === null) return;
    const rect = rows.getBoundingClientRect();
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event.nativeEvent, {
      onMove: (deltaX) => {
        proposal = allDayDragProposal(
          appointment,
          deltaX,
          rect.width,
          grid.days.length,
          snapMinutes,
        );
        setPreview({ key: appointment.key, proposal });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
        if (commit && proposal !== null) {
          props.onMoveCommitted({ appointment, proposal });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  /* ---------- pointer events ---------- */

  const chipEvent = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): SchedulerChipEvent<T> => ({
    appointment,
    event: event.nativeEvent,
    rect: rectOf(event.currentTarget),
  });

  const onChipClick = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    event.stopPropagation();
    props.onChipClicked(chipEvent(appointment, event));
  };

  const onChipDblClick = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    event.stopPropagation();
    props.onChipDblClicked(chipEvent(appointment, event));
  };

  const onChipContextMenu = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    event.stopPropagation();
    props.onChipContextMenu(chipEvent(appointment, event));
  };

  const chipLabel = (appointment: SchedulerAppointment<T>): string =>
    schedulerChipAriaLabel(messages, appointment, locale);

  const previewBox =
    preview === null
      ? null
      : dayWeekPreviewBox(
          preview.proposal,
          preview.resIndex,
          grid,
          props.minAppointmentMinutes,
          colCount,
          resCount,
        );
  const selectionBox =
    selection === null ? null : dayWeekSelectionBox(selection, grid, colCount);

  const hostStyle = {
    '--oge-scheduler-day-count': grid.days.length,
    '--oge-scheduler-col-count': colCount,
  } as CSSProperties;

  return (
    <div
      ref={hostRef}
      className="oge-scheduler-view oge-scheduler-day-week"
      style={hostStyle}
    >
      <div className="oge-scheduler-header-row" role="presentation">
        <div className="oge-scheduler-gutter-spacer" role="presentation" />
        {grid.days.map((day) => (
          <div
            key={day.getTime()}
            className="oge-scheduler-date-header"
            role="presentation"
          >
            {renderDateHeader ? (
              renderDateHeader({ date: day, view })
            ) : (
              <>
                <span className="oge-scheduler-date-weekday">
                  {weekdayShortText(day, locale)}
                </span>
                <span
                  className={
                    sameDay(day, now)
                      ? 'oge-scheduler-date-num oge-scheduler-date-today'
                      : 'oge-scheduler-date-num'
                  }
                >
                  {day.getDate()}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {groupItems && (
        <div className="oge-scheduler-resource-row" role="presentation">
          <div className="oge-scheduler-gutter-spacer" role="presentation" />
          {columns.map((col) => (
            <div key={col.colIndex} className="oge-scheduler-resource-head">
              {col.resourceText}
            </div>
          ))}
        </div>
      )}

      {props.showAllDayPanel && (
        <div className="oge-scheduler-allday" role="presentation">
          <div className="oge-scheduler-gutter-label" aria-hidden="true">
            {messages.allDayLabel}
          </div>
          <div
            className="oge-scheduler-allday-lanes"
            style={
              {
                '--oge-scheduler-allday-lane-count': allDayLaneCount,
              } as CSSProperties
            }
          >
            {grid.days.map((day) => (
              // pointer affordance only; keyboard creation goes through the grid cells
              <div
                key={day.getTime()}
                className="oge-scheduler-allday-cell"
                onClick={(event) =>
                  props.onCellClicked({
                    cellDate: day,
                    allDay: true,
                    event: event.nativeEvent,
                  })
                }
                onDoubleClick={(event) =>
                  props.onCellDblClicked({
                    cellDate: day,
                    allDay: true,
                    event: event.nativeEvent,
                  })
                }
              />
            ))}
            {allDayBars.map((bar) => (
              <div
                key={String(bar.appointment.key)}
                className={[
                  'oge-scheduler-allday-bar oge-scheduler-chip-stop',
                  bar.clippedStart && 'oge-scheduler-bar-clipped-start',
                  bar.clippedEnd && 'oge-scheduler-bar-clipped-end',
                  preview?.key === bar.appointment.key &&
                    'oge-scheduler-dragging',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="button"
                aria-label={chipLabel(bar.appointment)}
                aria-haspopup="dialog"
                tabIndex={chipTabIndexOf(
                  chipOrder,
                  focusedChipKey,
                  bar.appointment,
                )}
                data-appointment-key={String(bar.appointment.key)}
                style={{
                  gridColumn: `${bar.startDayIndex + 1} / ${bar.endDayIndex + 2}`,
                  gridRow: bar.lane + 1,
                }}
                onClick={(event) => onChipClick(bar.appointment, event)}
                onDoubleClick={(event) =>
                  onChipDblClick(bar.appointment, event)
                }
                onKeyDown={(event) => onChipKeyDown(bar.appointment, event)}
                onFocus={() => setFocusedChipKey(bar.appointment.key)}
                onPointerDown={(event) =>
                  onAllDayBarPointerDown(bar.appointment, event)
                }
              >
                <SchedulerAppointmentChip
                  appointment={bar.appointment}
                  view={view}
                  compact
                  locale={locale}
                  renderAppointment={renderAppointment}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="oge-scheduler-body">
        <div className="oge-scheduler-gutter" aria-hidden="true">
          {gutterSlots.map((slot) => (
            <div key={slot.minutes} className="oge-scheduler-gutter-slot">
              <span className="oge-scheduler-gutter-text">{slot.text}</span>
            </div>
          ))}
        </div>
        {/* the wrapper carries the overlay layers so the grid element owns
            ONLY rows (aria-required-children) */}
        <div ref={rowsRef} className="oge-scheduler-rows">
          {/* delegated keydown; focus lives on the roving gridcell */}
          <div
            className="oge-scheduler-grid"
            role="grid"
            aria-label={schedulerGridAriaLabel(messages, props.periodLabel)}
          >
            {grid.slotStartMinutes.map((minutes, slotIndex) => (
              <div key={minutes} className="oge-scheduler-row" role="row">
                {columns.map((col) => {
                  const focused = isFocusedCell(col.colIndex, slotIndex);
                  const date = cellDate(col.colIndex, minutes);
                  return (
                    <div
                      key={col.colIndex}
                      className={[
                        'oge-scheduler-cell',
                        minutes % 60 === 0 && 'oge-scheduler-cell-hour',
                        sameDay(col.day, now) && 'oge-scheduler-day-today',
                        isWeekendDay(col.day) && 'oge-scheduler-cell-weekend',
                        col.resIndex === 0 &&
                          col.colIndex !== 0 &&
                          'oge-scheduler-cell-daybreak',
                        isOffHoursCell(props.workHours, col.day, minutes) &&
                          'oge-scheduler-cell-off-hours',
                        focused && 'oge-scheduler-cell-focused',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="gridcell"
                      tabIndex={focused ? 0 : -1}
                      data-focus-target={focused ? '' : undefined}
                      aria-label={schedulerCellAriaLabel(
                        messages,
                        date,
                        locale,
                        col.resourceText,
                      )}
                      onClick={(event) => {
                        setFocusedCell({ day: col.colIndex, slot: slotIndex });
                        props.onCellClicked({
                          cellDate: date,
                          allDay: false,
                          event: event.nativeEvent,
                          resourceId: col.resourceId,
                        });
                      }}
                      onDoubleClick={(event) =>
                        props.onCellDblClicked({
                          cellDate: date,
                          allDay: false,
                          event: event.nativeEvent,
                          resourceId: col.resourceId,
                        })
                      }
                      onKeyDown={(event) =>
                        onCellKeyDown(col.colIndex, slotIndex, event)
                      }
                      onPointerDown={(event) =>
                        onCellPointerDown(col.colIndex, slotIndex, event)
                      }
                      onContextMenu={(event) =>
                        props.onCellContextMenu({
                          cellDate: date,
                          allDay: false,
                          event: event.nativeEvent,
                          resourceId: col.resourceId,
                        })
                      }
                    >
                      {renderCell?.({ date, view, allDay: false })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="oge-scheduler-chip-layer" role="presentation">
            {layouted.map((segment) => (
              <div
                key={segmentKey(segment)}
                className={[
                  'oge-scheduler-chip-box oge-scheduler-chip-stop',
                  segment.clippedStart && 'oge-scheduler-chip-clipped-start',
                  segment.clippedEnd && 'oge-scheduler-chip-clipped-end',
                  preview?.key === segment.appointment.key &&
                    'oge-scheduler-dragging',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="button"
                aria-label={chipLabel(segment.appointment)}
                aria-haspopup="dialog"
                tabIndex={chipTabIndexOf(
                  chipOrder,
                  focusedChipKey,
                  segment.appointment,
                )}
                data-appointment-key={String(segment.appointment.key)}
                style={{
                  top: pct(segment.topFraction * 100),
                  height: pct(segment.heightFraction * 100),
                  left: pct(chipLeftPercent(segment, colCount)),
                  width: pct(chipWidthPercent(segment, colCount)),
                }}
                onClick={(event) => onChipClick(segment.appointment, event)}
                onDoubleClick={(event) =>
                  onChipDblClick(segment.appointment, event)
                }
                onContextMenu={(event) =>
                  onChipContextMenu(segment.appointment, event)
                }
                onKeyDown={(event) => onChipKeyDown(segment.appointment, event)}
                onFocus={() => setFocusedChipKey(segment.appointment.key)}
                onPointerDown={(event) =>
                  onChipPointerDown(segment.appointment, event)
                }
              >
                <SchedulerAppointmentChip
                  appointment={segment.appointment}
                  view={view}
                  locale={locale}
                  renderAppointment={renderAppointment}
                />
                {props.allowResizing && !segment.appointment.disabled && (
                  <>
                    <div
                      className="oge-scheduler-resize-handle oge-scheduler-resize-start"
                      aria-hidden="true"
                      onPointerDown={(event) =>
                        onResizePointerDown(segment.appointment, 'start', event)
                      }
                    />
                    <div
                      className="oge-scheduler-resize-handle oge-scheduler-resize-end"
                      aria-hidden="true"
                      onPointerDown={(event) =>
                        onResizePointerDown(segment.appointment, 'end', event)
                      }
                    />
                  </>
                )}
              </div>
            ))}
            {previewBox && (
              <div
                className="oge-scheduler-drag-preview"
                aria-hidden="true"
                style={{
                  top: pct(previewBox.top),
                  height: pct(previewBox.height),
                  left: pct(previewBox.left),
                  width: pct(previewBox.width),
                }}
              />
            )}
          </div>
          {selectionBox && (
            <div
              className="oge-scheduler-selection"
              aria-hidden="true"
              style={{
                top: pct(selectionBox.top),
                height: pct(selectionBox.height),
                left: pct(selectionBox.left),
                width: pct(selectionBox.width),
              }}
            />
          )}
          {grid.days.map((day, dayIndex) => {
            const fraction = nowLineFraction(
              grid,
              dayIndex,
              now,
              props.showCurrentTimeIndicator,
            );
            if (!fraction) return null;
            const left = pct((dayIndex / grid.days.length) * 100);
            const width = pct((1 / grid.days.length) * 100);
            return (
              <Fragment key={day.getTime()}>
                {props.shadeUntilCurrentTime && (
                  <div
                    className="oge-scheduler-shade"
                    style={{ height: pct(fraction * 100), left, width }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="oge-scheduler-now"
                  style={{ top: pct(fraction * 100), left, width }}
                  aria-hidden="true"
                />
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const SchedulerDayWeekView = forwardRef(DayWeekViewInner) as <T>(
  props: DayWeekViewProps<T> & { ref?: Ref<DayWeekViewHandle> },
) => ReactElement;
