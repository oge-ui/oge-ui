'use client';

import {
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
import {
  beginPointerGesture,
  buildGroupedTimelineRows,
  buildHorizontalTimelineRow,
  buildTimelineGrid,
  chipSelectKey,
  isOgeSchedulerDragOut,
  isWeekendDay,
  leafWorkHours,
  sameGroupValues,
  schedulerChipAriaLabel,
  schedulerShortcut,
  shouldVirtualizeTimeline,
  timelineAxisPct,
  timelineBarCtrlKey,
  timelineBlockDragMove,
  timelineBlockedBoxes,
  timelineDateAt,
  timelineDragMove,
  timelineHeaderCells,
  timelineHourLabels,
  timelineOffHoursBoxes,
  timelineRowAt,
  timelineRowHeight,
  timelineRowIdReader,
  timelineScaleOf,
  timelineVirtualWindow,
  toSchedulerView,
  withSelectedLabel,
  type AppointmentProposal,
  type OgeSchedulerDisabledSlots,
  type OgeSchedulerDropSlot,
  type OgeSchedulerGroupOrientation,
  type OgeSchedulerResolvedMessages,
  type OgeSchedulerResource,
  type OgeSchedulerWorkHours,
  type SchedulerAppointment,
  type SchedulerChipEvent,
  type SchedulerGroupLeaf,
  type SchedulerTimelineViewType,
  type TimelineBar,
  type TimelineMoveEvent,
  type TimelineRow,
  type TimelineShadeBox,
} from '@oge-ui/scheduler-engine';
import type { SchedulerViewG3Props } from './day-week-view';
import type { OgeResourceHeaderRenderContext } from './scheduler-types';

/** What the shell can ask of the timeline view. */
export interface TimelineViewHandle {
  /** The slot under a viewport point (the drag-in hit test). */
  dropSlotAt(clientX: number, clientY: number): OgeSchedulerDropSlot | null;
}

export interface TimelineViewProps<T> extends SchedulerViewG3Props<T> {
  readonly view: SchedulerTimelineViewType;
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  /** Weekend days (0 = Sunday) the view shades — the scheduler's resolved list. */
  readonly weekendDays: readonly number[];
  readonly hiddenWeekDays: readonly number[] | undefined;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
  readonly intervalCount: number;
  readonly locale: string | undefined;
  /** The display zone: "today" and the now-line follow its clocks. */
  readonly timeZone?: string;
  readonly messages: OgeSchedulerResolvedMessages['grid'];
  readonly groupLevels: readonly OgeSchedulerResource[];
  readonly groupLeaves: readonly SchedulerGroupLeaf[];
  readonly groupOrientation: OgeSchedulerGroupOrientation;
  readonly allowDragging: boolean;
  readonly snapDuration: number | undefined;
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl?: boolean;
  readonly workHours: OgeSchedulerWorkHours | null;
  readonly disabledSlots: OgeSchedulerDisabledSlots | null;
  readonly virtualScrolling: boolean | 'auto';
  readonly renderResourceHeader:
    ((context: OgeResourceHeaderRenderContext) => ReactNode) | undefined;
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
 * Internal timeline view: a horizontal time axis (day, week and work week
 * at hour scale; month and year at day scale) with one row per grouped leaf
 * — nested levels add group header rows — or one track of side-by-side
 * blocks under horizontal grouping; long resource lists virtualize on fixed
 * row heights. The markup of the Angular `<oge-scheduler-timeline-view>`,
 * rendered from the same engine functions.
 */
function TimelineViewInner<T>(
  props: TimelineViewProps<T>,
  ref: Ref<TimelineViewHandle>,
): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { view, locale, renderResourceHeader } = props;
  const scale = timelineScaleOf(view);
  const grid = useMemo(
    () =>
      buildTimelineGrid(
        view,
        props.anchorDate,
        props.firstDayOfWeek,
        props.dayStartHour,
        props.dayEndHour,
        props.cellDuration,
        {
          intervalCount: props.intervalCount,
          hiddenWeekDays: props.hiddenWeekDays,
          weekendDays: props.weekendDays,
        },
      ),
    [
      view,
      props.anchorDate,
      props.firstDayOfWeek,
      props.dayStartHour,
      props.dayEndHour,
      props.cellDuration,
      props.intervalCount,
      props.hiddenWeekDays,
      props.weekendDays,
    ],
  );
  const groupedRows = useMemo(
    () =>
      buildGroupedTimelineRows(
        props.appointments,
        grid,
        scale === 'day' ? 1440 : props.cellDuration,
        props.groupLevels,
        props.groupLeaves,
        props.messages.unassignedLabel,
        scale,
      ),
    [
      props.appointments,
      grid,
      scale,
      props.cellDuration,
      props.groupLevels,
      props.groupLeaves,
      props.messages.unassignedLabel,
    ],
  );
  const horizontal =
    props.groupOrientation === 'horizontal' && props.groupLevels.length > 0;
  const horizontalRow = useMemo(
    () =>
      buildHorizontalTimelineRow(groupedRows, props.messages.unassignedLabel),
    [groupedRows, props.messages.unassignedLabel],
  );
  const rows = horizontal ? [horizontalRow.row] : groupedRows;
  const blocks = horizontalRow.blocks;
  const blockCount = horizontal ? Math.max(1, blocks.length) : 1;
  const blockIndexes = Array.from({ length: blockCount }, (_, index) => index);
  const blockPct = (block: number, value: number): number =>
    (block * 100 + value) / blockCount;
  const trackDays =
    blockCount === 1 ? grid.days : blockIndexes.flatMap(() => grid.days);
  const headerCells = useMemo(
    () =>
      timelineHeaderCells(
        grid,
        view,
        locale,
        toSchedulerView(new Date(), props.timeZone),
      ),
    [grid, view, locale, props.timeZone],
  );
  const hourLabels = useMemo(
    () => timelineHourLabels(grid, view, locale),
    [grid, view, locale],
  );
  const resourceRows = rows.filter((row) => row.kind !== 'group');
  const rowIdOf = useMemo(
    () => timelineRowIdReader<T>(props.groupLevels, props.groupLeaves),
    [props.groupLevels, props.groupLeaves],
  );
  const [preview, setPreview] = useState<TimelinePreview | null>(null);
  const snapMinutes =
    scale === 'day' ? 1440 : (props.snapDuration ?? props.cellDuration);

  /* ---------- virtualization ---------- */

  const [scrollState, setScrollState] = useState({ top: 0, height: 0 });
  const readScroll = (): void => {
    const scroll = scrollRef.current;
    const body = bodyRef.current;
    if (scroll === null || body === null) return;
    const top = Math.max(0, scroll.scrollTop - body.offsetTop);
    const height = scroll.clientHeight;
    setScrollState((state) =>
      state.top === top && state.height === height ? state : { top, height },
    );
  };
  useEffect(() => {
    readScroll();
    const scroll = scrollRef.current;
    if (scroll === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => readScroll());
    observer.observe(scroll);
    return () => observer.disconnect();
  }, []);
  const windowed = useMemo(() => {
    const all = rows.map((row, index) => ({
      row,
      index,
      key: `${row.kind ?? 'resource'}:${index}:${row.text}`,
      height: timelineRowHeight(row),
    }));
    if (!shouldVirtualizeTimeline(props.virtualScrolling, rows.length)) {
      return { rows: all, padStart: 0, padEnd: 0 };
    }
    const window = timelineVirtualWindow(
      rows,
      scrollState.top,
      scrollState.height,
    );
    return {
      rows: all.slice(window.start, window.end),
      padStart: window.padStart,
      padEnd: window.padEnd,
    };
  }, [rows, props.virtualScrolling, scrollState]);

  /* ---------- shading ---------- */

  const offHoursOf = (row: TimelineRow<T>): readonly TimelineShadeBox[] =>
    horizontal
      ? []
      : timelineOffHoursBoxes(grid, leafWorkHours(row.leaf, props.workHours));
  const blockedOf = (row: TimelineRow<T>): readonly TimelineShadeBox[] =>
    horizontal
      ? blocks.flatMap((block, index) =>
          timelineBlockedBoxes(
            grid,
            props.disabledSlots,
            block.values ?? {},
            props.cellDuration,
          ).map((box) => ({
            ...box,
            key: `${index}-${box.key}`,
            leftPct: blockPct(index, box.leftPct),
            widthPct: box.widthPct / blockCount,
          })),
        )
      : timelineBlockedBoxes(
          grid,
          props.disabledSlots,
          row.values ?? {},
          props.cellDuration,
        );

  const isSelected = (appointment: SchedulerAppointment<T>): boolean =>
    props.selection.includes(appointment.source);
  const chipOrder = rows.flatMap((row) =>
    row.bars.map((bar) => bar.appointment),
  );

  const drop = props.dropPreview;
  const dropBar = (() => {
    if (drop === null) return null;
    const start = timelineAxisPct(grid, drop.slot.startDate);
    if (start === null) return null;
    const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
    const totalSpan = windowSpan * grid.days.length;
    const minutes = scale === 'day' ? 1440 : drop.durationMinutes;
    const width = (Math.min(minutes, windowSpan) / totalSpan) * 100;
    if (horizontal) {
      const block = Math.max(
        0,
        blocks.findIndex((entry) =>
          sameGroupValues(entry.values ?? {}, drop.slot.resources),
        ),
      );
      return {
        rowIndex: 0,
        leftPct: blockPct(block, start),
        widthPct: width / blockCount,
      };
    }
    const rowIndex = rows.findIndex(
      (row) =>
        row.kind !== 'group' &&
        sameGroupValues(row.values ?? {}, drop.slot.resources),
    );
    return { rowIndex: Math.max(0, rowIndex), leftPct: start, widthPct: width };
  })();

  const tracks = (): HTMLElement[] =>
    Array.from(
      hostRef.current?.querySelectorAll<HTMLElement>(
        '.oge-scheduler-timeline-track',
      ) ?? [],
    );
  const trackRowIndex = (track: HTMLElement): number =>
    Number(track.getAttribute('data-row-index') ?? -1);

  const moveEvent = (
    appointment: SchedulerAppointment<T>,
    proposal: AppointmentProposal,
    values: Readonly<Record<string, unknown>> | undefined,
  ): TimelineMoveEvent<T> => {
    if (values === undefined) return { appointment, proposal };
    const first = props.groupLevels[0];
    return {
      appointment,
      proposal,
      resources: values,
      ...(first !== undefined ? { resourceId: values[first.fieldExpr] } : {}),
    };
  };

  const dropSlotAt = (
    clientX: number,
    clientY: number,
  ): OgeSchedulerDropSlot | null => {
    const all = tracks();
    const hit = timelineRowAt(
      clientY,
      all.map((track) => track.getBoundingClientRect()),
      -1,
    );
    if (hit === -1) return null;
    const track = all[hit];
    const rect = track.getBoundingClientRect();
    if (clientX < rect.left || clientX >= rect.right) return null;
    const allDay = scale === 'day';
    if (horizontal) {
      const blockWidth = rect.width / blockCount;
      const offset = props.rtl ? rect.right - clientX : clientX - rect.left;
      const block = Math.min(blockCount - 1, Math.floor(offset / blockWidth));
      const date = timelineDateAt(
        grid,
        offset - block * blockWidth,
        blockWidth,
        snapMinutes,
      );
      return date === null
        ? null
        : { startDate: date, allDay, resources: blocks[block]?.values ?? {} };
    }
    const row = rows[trackRowIndex(track)];
    const date = timelineDateAt(
      grid,
      clientX - rect.left,
      rect.width,
      snapMinutes,
      props.rtl,
    );
    return date === null || row === undefined
      ? null
      : { startDate: date, allDay, resources: row.values ?? {} };
  };

  useImperativeHandle(ref, () => ({ dropSlotAt }));

  const onBarPointerDown = (
    bar: TimelineBar<T>,
    rowIndex: number,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    const appointment = bar.appointment;
    if (!props.allowDragging || appointment.disabled || event.button !== 0) {
      return;
    }
    const all = tracks();
    const originTrack = all.find((track) => trackRowIndex(track) === rowIndex);
    const host = hostRef.current;
    if (originTrack === undefined || host === null) return;
    const trackRect = originTrack.getBoundingClientRect();
    const rowRects = all.map((track) => track.getBoundingClientRect());
    const hostRect = host.getBoundingClientRect();
    let proposal: AppointmentProposal | null = null;
    let targetRow = rowIndex;
    let targetBlock = -1;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event.nativeEvent, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        if (horizontal) {
          const move = timelineBlockDragMove(
            appointment,
            deltaX,
            trackRect.width,
            grid,
            snapMinutes,
            bar.leftPct,
            blockCount,
            props.rtl,
          );
          proposal = move.proposal;
          targetBlock = move.block;
          setPreview({
            key: appointment.key,
            leftPct: move.leftPct,
            widthPct: bar.widthPct,
            rowIndex,
          });
          return;
        }
        const move = timelineDragMove(
          appointment,
          deltaX,
          trackRect.width,
          grid,
          snapMinutes,
          bar.leftPct,
          props.rtl,
        );
        proposal = move.proposal;
        const hit = timelineRowAt(moveEvent.clientY, rowRects, -1);
        targetRow = hit === -1 ? rowIndex : trackRowIndex(all[hit]);
        setPreview({
          key: appointment.key,
          leftPct: move.leftPct,
          widthPct: bar.widthPct,
          rowIndex: targetRow,
        });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
        if (commit && isOgeSchedulerDragOut(hostRect, lastX, lastY)) {
          props.onDragOut(appointment, lastX, lastY);
          return;
        }
        if (commit && proposal !== null) {
          let values: Readonly<Record<string, unknown>> | undefined;
          if (horizontal) {
            const block = blocks[targetBlock];
            const originBlock = Math.floor((bar.leftPct / 100) * blockCount);
            if (
              block !== undefined &&
              targetBlock !== originBlock &&
              block.id !== null
            ) {
              values = block.values;
            }
          } else if (targetRow !== rowIndex) {
            const row = rows[targetRow];
            if (row !== undefined && row.id !== null && row.kind !== 'group') {
              values = row.values;
            }
          }
          props.onMoveCommitted(moveEvent(appointment, proposal, values));
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
    order: chipOrder,
  });

  const onBarKeyDown = (
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
    const ctrl = timelineBarCtrlKey(
      appointment,
      event,
      snapMinutes,
      props.allowDragging,
      horizontal ? [] : resourceRows,
      rowIdOf,
      props.rtl,
    );
    if (ctrl.handled) {
      if (ctrl.commit !== undefined) {
        event.preventDefault();
        const resourceId = ctrl.commit.resourceId;
        const values =
          resourceId !== undefined
            ? resourceRows.find((row) => row.id === resourceId)?.values
            : undefined;
        props.onMoveCommitted(
          moveEvent(appointment, ctrl.commit.proposal, values),
        );
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      props.onChipDeleteRequested(appointment);
    }
  };

  const headerContent = (row: TimelineRow<T>): ReactNode =>
    renderResourceHeader && row.item !== undefined && row.resource !== undefined
      ? renderResourceHeader({
          item: row.item,
          resource: row.resource,
          level: row.level ?? 0,
          view,
        })
      : row.text;

  const hostClass = [
    'oge-scheduler-view oge-scheduler-timeline',
    scale === 'day' && 'oge-scheduler-timeline-day-scale',
    view === 'timelineYear' && 'oge-scheduler-timeline-year',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={hostRef}
      className={hostClass}
      style={
        {
          '--oge-scheduler-timeline-days': grid.days.length * blockCount,
        } as CSSProperties
      }
    >
      <div
        ref={scrollRef}
        className="oge-scheduler-timeline-scroll"
        onScroll={readScroll}
      >
        <div className="oge-scheduler-timeline-inner">
          {horizontal && (
            <div className="oge-scheduler-timeline-header" role="presentation">
              <div className="oge-scheduler-timeline-corner" />
              <div className="oge-scheduler-timeline-days">
                {blocks.map((block, index) => (
                  <div
                    key={index}
                    className="oge-scheduler-timeline-dayhead oge-scheduler-timeline-blockhead"
                    style={{
                      insetInlineStart: `${(index * 100) / blockCount}%`,
                      width: `${100 / blockCount}%`,
                    }}
                  >
                    {headerContent(block)}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="oge-scheduler-timeline-header" role="presentation">
            <div className="oge-scheduler-timeline-corner" />
            <div className="oge-scheduler-timeline-days">
              {blockIndexes.map((block) =>
                headerCells.map((cell) => (
                  <div
                    key={`${block}:${cell.key}`}
                    className={
                      cell.today
                        ? 'oge-scheduler-timeline-dayhead oge-scheduler-day-today'
                        : 'oge-scheduler-timeline-dayhead'
                    }
                    style={{
                      insetInlineStart: `${blockPct(block, cell.pct)}%`,
                      width: `${cell.widthPct / blockCount}%`,
                    }}
                  >
                    {cell.text}
                  </div>
                )),
              )}
            </div>
          </div>
          {hourLabels.length > 0 && (
            <div
              className="oge-scheduler-timeline-subheader"
              role="presentation"
            >
              <div className="oge-scheduler-timeline-corner" />
              <div className="oge-scheduler-timeline-days">
                {blockIndexes.map((block) =>
                  hourLabels.map((label) => (
                    <span
                      key={`${block}:${label.pct}`}
                      className="oge-scheduler-timeline-hour"
                      style={{
                        insetInlineStart: `${blockPct(block, label.pct)}%`,
                      }}
                    >
                      {label.text}
                    </span>
                  )),
                )}
              </div>
            </div>
          )}
          <div ref={bodyRef} className="oge-scheduler-timeline-body">
            {windowed.padStart > 0 && (
              <div
                className="oge-scheduler-timeline-spacer"
                aria-hidden="true"
                style={{ height: `${windowed.padStart}px` }}
              />
            )}
            {windowed.rows.map(({ row, index, key, height }) =>
              row.kind === 'group' ? (
                <div
                  key={key}
                  className="oge-scheduler-timeline-row oge-scheduler-timeline-group-row"
                  style={
                    {
                      height: `${height}px`,
                      '--oge-scheduler-timeline-level': row.level ?? 0,
                    } as CSSProperties
                  }
                >
                  <div className="oge-scheduler-timeline-rowhead">
                    {headerContent(row)}
                  </div>
                  <div className="oge-scheduler-timeline-group-fill" />
                </div>
              ) : (
                <div
                  key={key}
                  className="oge-scheduler-timeline-row"
                  style={
                    {
                      height: `${height}px`,
                      '--oge-scheduler-timeline-level': row.level ?? 0,
                    } as CSSProperties
                  }
                >
                  <div className="oge-scheduler-timeline-rowhead">
                    <span
                      className="oge-scheduler-agenda-dot"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    {headerContent(row)}
                  </div>
                  <div
                    className="oge-scheduler-timeline-track"
                    data-row-index={index}
                    style={
                      {
                        '--oge-scheduler-timeline-lanes': row.laneCount,
                      } as CSSProperties
                    }
                  >
                    {trackDays.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={
                          isWeekendDay(day, props.weekendDays)
                            ? 'oge-scheduler-timeline-daycol oge-scheduler-cell-weekend'
                            : 'oge-scheduler-timeline-daycol'
                        }
                        style={{ width: `${100 / trackDays.length}%` }}
                      />
                    ))}
                    {offHoursOf(row).map((box) => (
                      <div
                        key={box.key}
                        className="oge-scheduler-timeline-offhours"
                        aria-hidden="true"
                        style={{
                          insetInlineStart: `${box.leftPct}%`,
                          width: `${box.widthPct}%`,
                        }}
                      />
                    ))}
                    {blockedOf(row).map((box) => (
                      <div
                        key={box.key}
                        className="oge-scheduler-timeline-blocked"
                        aria-hidden="true"
                        title={box.text}
                        style={{
                          insetInlineStart: `${box.leftPct}%`,
                          width: `${box.widthPct}%`,
                        }}
                      />
                    ))}
                    {row.bars.map((bar) => (
                      <button
                        key={bar.key}
                        type="button"
                        aria-label={withSelectedLabel(
                          schedulerChipAriaLabel(
                            props.messages,
                            bar.appointment,
                            locale,
                          ),
                          isSelected(bar.appointment),
                          props.messages,
                        )}
                        data-appointment-key={String(bar.appointment.key)}
                        className={[
                          'oge-scheduler-timeline-bar oge-scheduler-chip-stop',
                          bar.clippedStart && 'oge-scheduler-bar-clipped-start',
                          bar.clippedEnd && 'oge-scheduler-bar-clipped-end',
                          isSelected(bar.appointment) &&
                            'oge-scheduler-chip-selected',
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
                          props.onChipDblClicked(
                            chipEvent(bar.appointment, event),
                          )
                        }
                        onKeyDown={(event) =>
                          onBarKeyDown(bar.appointment, event)
                        }
                        onPointerDown={(event) =>
                          onBarPointerDown(bar, index, event)
                        }
                      >
                        {bar.appointment.text}
                      </button>
                    ))}
                    {preview !== null && preview.rowIndex === index && (
                      <div
                        className="oge-scheduler-drag-preview oge-scheduler-timeline-preview"
                        aria-hidden="true"
                        style={{
                          insetInlineStart: `${preview.leftPct}%`,
                          width: `${preview.widthPct}%`,
                        }}
                      />
                    )}
                    {dropBar !== null && dropBar.rowIndex === index && (
                      <div
                        className="oge-scheduler-drag-preview oge-scheduler-timeline-preview oge-scheduler-drop-preview"
                        aria-hidden="true"
                        style={{
                          insetInlineStart: `${dropBar.leftPct}%`,
                          width: `${dropBar.widthPct}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              ),
            )}
            {windowed.padEnd > 0 && (
              <div
                className="oge-scheduler-timeline-spacer"
                aria-hidden="true"
                style={{ height: `${windowed.padEnd}px` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SchedulerTimelineView = forwardRef(TimelineViewInner) as <T>(
  props: TimelineViewProps<T> & { ref?: Ref<TimelineViewHandle> },
) => ReactElement;
