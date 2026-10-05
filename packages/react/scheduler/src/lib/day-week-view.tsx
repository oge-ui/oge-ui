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
  buildColumnHeaderRows,
  buildDayWeekGroupLayout,
  buildGutterSlots,
  buildLayoutAllDayStrip,
  buildTimeGrid,
  cellDateAt,
  chipHeightPercent,
  chipKey,
  chipLeftPercent,
  chipSelectKey,
  chipTabIndexOf,
  chipTopPercent,
  chipWidthPercent,
  dayWeekBlockedCells,
  dayWeekCellKey,
  dayWeekCellOffHours,
  dayWeekCellSelected,
  dayWeekChipOrder,
  dayWeekColumnHeaderText,
  dayWeekGridRows,
  dayWeekLayoutCellLeaf,
  dayWeekLayoutCellValues,
  dayWeekLayoutDragMove,
  dayWeekLayoutPreviewBox,
  dayWeekNowBoxes,
  dayWeekResizeProposal,
  dayWeekSelectionBox,
  dayWeekSlotAt,
  dragSelectionRange,
  escapeAttr,
  isOgeSchedulerDragOut,
  isWeekendDay,
  layoutGroupedDayWeekSegments,
  leafIndexOfValues,
  partitionAllDay,
  schedulerCellAriaLabel,
  schedulerChipAriaLabel,
  schedulerGridAriaLabel,
  schedulerShortcut,
  schedulerWeekNumberTexts,
  segmentKey,
  timeGridCellKey,
  timeGridChipCtrlKey,
  weekNumbersOfDays,
  weekdayShortText,
  withSelectedLabel,
  withUnavailableLabel,
  type AllDayPlacedBar,
  type AppointmentProposal,
  type DayWeekColumn,
  type DayWeekGridRow,
  type DayWeekSegment,
  type DayWeekSelection,
  type OgeSchedulerDisabledSlots,
  type OgeSchedulerDropSlot,
  type OgeSchedulerGroupOrientation,
  type OgeSchedulerResolvedMessages,
  type OgeSchedulerResource,
  type OgeSchedulerWeekNumberRule,
  type OgeSchedulerWorkHours,
  type SchedulerAppointment,
  type SchedulerCellEvent,
  type SchedulerChipEvent,
  type SchedulerGroupLeaf,
  type SchedulerHeaderCell,
  type SchedulerPasteTarget,
  type SchedulerProposalEvent,
  type SchedulerRangeEvent,
  type SchedulerSelectGesture,
  type TimeGridVm,
} from '@oge-ui/scheduler-engine';
import { SchedulerAppointmentChip } from './appointment-chip';
import type {
  OgeAppointmentRenderContext,
  OgeDateHeaderRenderContext,
  OgeResourceHeaderRenderContext,
  OgeSchedulerCellRenderContext,
} from './scheduler-types';

/** What the shell can ask of the time-grid view. */
export interface DayWeekViewHandle {
  focusGrid(): void;
  readonly grid: TimeGridVm;
  /** The slot under a viewport point (the drag-in hit test). */
  dropSlotAt(clientX: number, clientY: number): OgeSchedulerDropSlot | null;
}

/** A selection gesture from the keyboard (Ctrl/Shift+Space). */
export interface SchedulerSelectRequest<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly gesture: SchedulerSelectGesture;
  readonly order: readonly SchedulerAppointment<T>[];
}

/** The G3 props every grid view shares. */
export interface SchedulerViewG3Props<T> {
  readonly selection: readonly T[];
  readonly onCopyRequested: (appointment: SchedulerAppointment<T>) => void;
  readonly onSelectRequested: (request: SchedulerSelectRequest<T>) => void;
  readonly onDragOut: (
    appointment: SchedulerAppointment<T>,
    clientX: number,
    clientY: number,
  ) => void;
  readonly dropPreview: {
    readonly slot: OgeSchedulerDropSlot;
    readonly durationMinutes: number;
  } | null;
}

export interface DayWeekViewProps<T> extends SchedulerViewG3Props<T> {
  readonly view: 'day' | 'week' | 'workWeek';
  readonly anchorDate: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
  readonly firstDayOfWeek: number;
  /** Weekend days (0 = Sunday) the view shades — the scheduler's resolved list. */
  readonly weekendDays: readonly number[];
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
  readonly intervalCount: number;
  readonly showAllDayPanel: boolean;
  readonly showCurrentTimeIndicator: boolean;
  readonly minAppointmentMinutes: number;
  readonly locale: string | undefined;
  readonly messages: OgeSchedulerResolvedMessages['grid'];
  readonly periodLabel: string;
  readonly allowDragging: boolean;
  readonly allowResizing: boolean;
  readonly allowAdding: boolean;
  /** `aria-readonly` on the grid — the scheduler cannot change anything. */
  readonly readOnly: boolean;
  readonly hiddenWeekDays: readonly number[] | undefined;
  readonly workHours: OgeSchedulerWorkHours | null;
  readonly shadeUntilCurrentTime: boolean;
  readonly snapDuration: number | undefined;
  /** Right-to-left layout: mirrors Left/Right keys and horizontal drag deltas. */
  readonly rtl?: boolean;
  readonly groupLevels: readonly OgeSchedulerResource[];
  readonly groupLeaves: readonly SchedulerGroupLeaf[];
  readonly leafOf: (item: T) => number;
  readonly groupOrientation: OgeSchedulerGroupOrientation;
  readonly groupByDate: boolean;
  readonly showWeekNumbers: boolean;
  readonly weekNumberRule: OgeSchedulerWeekNumberRule;
  readonly disabledSlots: OgeSchedulerDisabledSlots | null;
  readonly renderAppointment:
    ((context: OgeAppointmentRenderContext<T>) => ReactNode) | undefined;
  readonly renderCell:
    ((context: OgeSchedulerCellRenderContext) => ReactNode) | undefined;
  readonly renderDateHeader:
    ((context: OgeDateHeaderRenderContext) => ReactNode) | undefined;
  readonly renderResourceHeader:
    ((context: OgeResourceHeaderRenderContext) => ReactNode) | undefined;
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
  readonly onPasteRequested: (target: SchedulerPasteTarget) => void;
}

interface Preview {
  readonly key: unknown;
  readonly proposal: AppointmentProposal;
  readonly leafIndex: number;
}

const rectOf = (target: EventTarget | null): DOMRect =>
  (target as HTMLElement).getBoundingClientRect();

const pct = (value: number): string => `${value}%`;

/**
 * Internal day/week view: the (nested) date and resource headers, the
 * all-day strip, the scrollable slot grid (`role="grid"`, row-major, roving
 * tabindex; stacked row blocks under vertical grouping) and one absolutely
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
  const stripRef = useRef<HTMLDivElement>(null);
  const {
    view,
    locale,
    messages,
    renderAppointment,
    renderCell,
    renderDateHeader,
    renderResourceHeader,
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
        weekendDays: props.weekendDays,
        intervalCount: props.intervalCount,
      }),
    [
      props.anchorDate,
      view,
      props.firstDayOfWeek,
      props.dayStartHour,
      props.dayEndHour,
      props.cellDuration,
      props.hiddenWeekDays,
      props.weekendDays,
      props.intervalCount,
    ],
  );
  const snapMinutes = props.snapDuration ?? grid.cellDuration;
  const layout = useMemo(
    () =>
      buildDayWeekGroupLayout(grid.days, props.groupLeaves, {
        vertical: props.groupOrientation === 'vertical',
        groupByDate: props.groupByDate,
      }),
    [grid, props.groupLeaves, props.groupOrientation, props.groupByDate],
  );
  const columns = layout.columns;
  const gridRows = useMemo(
    () => dayWeekGridRows(grid, layout.blockCount),
    [grid, layout.blockCount],
  );
  const headerRows = useMemo(
    () =>
      buildColumnHeaderRows(
        grid.days,
        layout.vertical ? [] : props.groupLevels,
        layout.vertical ? [] : props.groupLeaves,
        props.groupByDate,
        (day) => weekdayShortText(day, locale),
      ),
    [grid, layout.vertical, props.groupLevels, props.groupLeaves, props.groupByDate, locale],
  );
  const blockedCells = useMemo(
    () => dayWeekBlockedCells(grid, layout, props.disabledSlots),
    [grid, layout, props.disabledSlots],
  );
  const partitioned = useMemo(
    () => partitionAllDay(props.appointments),
    [props.appointments],
  );
  const layouted = useMemo(
    () =>
      layoutGroupedDayWeekSegments(
        partitioned.timed,
        grid,
        layout,
        props.leafOf,
        props.minAppointmentMinutes,
      ),
    [partitioned, grid, layout, props.leafOf, props.minAppointmentMinutes],
  );
  const allDayStrip = useMemo(
    () => buildLayoutAllDayStrip(partitioned.allDay, grid, layout, props.leafOf),
    [partitioned, grid, layout, props.leafOf],
  );
  const allDayLaneCount = Math.max(1, allDayStrip.laneCount);
  const chipOrder = useMemo(
    () => dayWeekChipOrder(allDayStrip.bars, layouted),
    [allDayStrip, layouted],
  );
  const gutterSlots = useMemo(
    () => buildGutterSlots(grid, locale),
    [grid, locale],
  );
  const weekNumbers = useMemo(
    () =>
      props.showWeekNumbers
        ? weekNumbersOfDays(
            grid.days,
            props.weekNumberRule,
            props.firstDayOfWeek,
            locale,
          )
        : [],
    [grid, props.showWeekNumbers, props.weekNumberRule, props.firstDayOfWeek, locale],
  );
  const weekBadge =
    weekNumbers.length === 0
      ? null
      : weekNumbers.length === 1
        ? schedulerWeekNumberTexts(weekNumbers[0], messages).badge
        : `${schedulerWeekNumberTexts(weekNumbers[0], messages).badge}–${
            weekNumbers[weekNumbers.length - 1]
          }`;

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

  const dropSlotAt = (
    clientX: number,
    clientY: number,
  ): OgeSchedulerDropSlot | null => {
    const rows = rowsRef.current;
    if (rows !== null) {
      const hit = dayWeekSlotAt(
        clientX,
        clientY,
        rows.getBoundingClientRect(),
        grid,
        layout,
        props.rtl,
      );
      if (hit !== null) {
        return { startDate: hit.date, allDay: false, resources: hit.values };
      }
    }
    const strip = stripRef.current;
    if (strip !== null) {
      const rect = strip.getBoundingClientRect();
      const cells = allDayStrip.cells;
      if (
        rect.width > 0 &&
        clientX >= rect.left &&
        clientX < rect.right &&
        clientY >= rect.top &&
        clientY < rect.bottom
      ) {
        const raw = Math.floor(((clientX - rect.left) / rect.width) * cells.length);
        const cell = cells[props.rtl ? cells.length - 1 - raw : raw];
        if (cell !== undefined) {
          return { startDate: cell.day, allDay: true, resources: cell.values };
        }
      }
    }
    return null;
  };

  useImperativeHandle(
    ref,
    () => ({ focusGrid: queueFocusTarget, grid, dropSlotAt }),
    [grid, layout, allDayStrip, props.rtl],
  );

  const cellValues = (
    col: DayWeekColumn,
    block: number,
  ): Readonly<Record<string, unknown>> =>
    dayWeekLayoutCellValues(layout, col.colIndex, block);

  const cellEvent = (
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: MouseEvent | KeyboardEvent,
  ): SchedulerCellEvent => {
    const values = cellValues(col, row.block);
    const firstLevel = props.groupLevels[0];
    return {
      cellDate: cellDateAt(col.day, row.minutes),
      allDay: false,
      event,
      resourceId:
        firstLevel === undefined ? undefined : values[firstLevel.fieldExpr],
      resources: values,
    };
  };

  const isFocusedCell = (colIndex: number, rowIndex: number): boolean =>
    focusedCell.day === colIndex && focusedCell.slot === rowIndex;
  const isSelected = (appointment: SchedulerAppointment<T>): boolean =>
    props.selection.includes(appointment.source);
  const leafIndexOf = (appointment: SchedulerAppointment<T>): number =>
    layout.leaves.length === 0
      ? 0
      : Math.max(0, props.leafOf(appointment.source));

  /* ---------- keyboard ---------- */

  const onCellKeyDown = (
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    if (schedulerShortcut(event, false) === 'paste') {
      event.preventDefault();
      props.onPasteRequested({
        date: cellDateAt(col.day, row.minutes),
        allDay: false,
        values: cellValues(col, row.block),
      });
      return;
    }
    const action = timeGridCellKey(
      event.key,
      col.colIndex,
      row.index,
      layout.colCount,
      gridRows.length,
      props.rtl,
    );
    if (action === null) return;
    event.preventDefault();
    if (action.kind === 'activate') {
      props.onCellActivated(cellEvent(col, row, event.nativeEvent));
      return;
    }
    setFocusedCell({ day: action.col, slot: action.row });
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
      props.onSelectRequested({ appointment, gesture: select, order: chipOrder });
      return;
    }
    const ctrl = timeGridChipCtrlKey(
      appointment,
      event,
      grid.cellDuration,
      props.allowDragging,
      props.allowResizing,
      props.rtl,
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

  /* ---------- pointer gestures ---------- */

  const onCellPointerDown = (
    col: DayWeekColumn,
    row: DayWeekGridRow,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!props.allowAdding || event.button !== 0) return;
    const rows = rowsRef.current;
    if (rows === null) return;
    const rect = rows.getBoundingClientRect();
    const blockHeight = rect.height / layout.blockCount;
    const blockTop = rect.top + row.block * blockHeight;
    let range: { startMinutes: number; endMinutes: number } | null = null;
    beginPointerGesture(event.nativeEvent, {
      onMove: (_deltaX, _deltaY, moveEvent) => {
        range = dragSelectionRange(
          moveEvent.clientY,
          blockTop,
          blockHeight,
          grid,
          row.minutes,
          snapMinutes,
        );
        setSelection({ dayIndex: col.colIndex, block: row.block, ...range });
      },
      onFinish: (commit, cancelled) => {
        setSelection(null);
        if (commit && range !== null) {
          const values = cellValues(col, row.block);
          const firstLevel = props.groupLevels[0];
          props.onRangeSelected({
            startDate: cellDateAt(col.day, range.startMinutes),
            endDate: cellDateAt(col.day, range.endMinutes),
            resourceId:
              firstLevel === undefined
                ? undefined
                : values[firstLevel.fieldExpr],
            resources: values,
          });
        } else if (cancelled) {
          props.onGestureCancelled();
        }
      },
    });
  };

  const onChipPointerDown = (
    segment: DayWeekSegment<T>,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    const appointment = segment.appointment;
    if (
      !props.allowDragging ||
      appointment.disabled ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('.oge-scheduler-resize-handle')
    ) {
      return;
    }
    const rows = rowsRef.current;
    const host = hostRef.current;
    if (rows === null || host === null) return;
    const rect = rows.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const originLeaf = leafIndexOf(appointment);
    let proposal: AppointmentProposal | null = null;
    let leafIndex = originLeaf;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event.nativeEvent, {
      onMove: (deltaX, deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        const move = dayWeekLayoutDragMove(
          appointment,
          deltaX,
          deltaY,
          rect.width,
          rect.height,
          grid,
          layout,
          segment.colIndex,
          segment.block ?? 0,
          segment.startMinutes,
          snapMinutes,
          props.rtl,
        );
        proposal = move.proposal;
        leafIndex = move.leafIndex;
        setPreview({ key: appointment.key, proposal, leafIndex });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
        if (commit && isOgeSchedulerDragOut(hostRect, lastX, lastY)) {
          props.onDragOut(appointment, lastX, lastY);
          return;
        }
        if (commit && proposal !== null) {
          const changed = layout.leaves.length > 0 && leafIndex !== originLeaf;
          const values = changed ? props.groupLeaves[leafIndex]?.values : undefined;
          const firstLevel = props.groupLevels[0];
          props.onMoveCommitted({
            appointment,
            proposal,
            ...(values !== undefined
              ? {
                  resources: values,
                  ...(firstLevel !== undefined
                    ? { resourceId: values[firstLevel.fieldExpr] }
                    : {}),
                }
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
    const blockHeight = rect.height / layout.blockCount;
    const leafIndex = leafIndexOf(appointment);
    let proposal: AppointmentProposal | null = null;
    beginPointerGesture(event.nativeEvent, {
      onMove: (_deltaX, deltaY) => {
        proposal = dayWeekResizeProposal(
          appointment,
          edge,
          deltaY,
          blockHeight,
          grid,
          snapMinutes,
        );
        setPreview({ key: appointment.key, proposal, leafIndex });
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
    bar: AllDayPlacedBar<T>,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    const appointment = bar.appointment;
    if (!props.allowDragging || appointment.disabled || event.button !== 0) {
      return;
    }
    const rows = rowsRef.current;
    const host = hostRef.current;
    if (rows === null || host === null) return;
    const rect = rows.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const leafIndex = leafIndexOf(appointment);
    let proposal: AppointmentProposal | null = null;
    let lastX = event.clientX;
    let lastY = event.clientY;
    beginPointerGesture(event.nativeEvent, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        proposal = allDayDragProposal(
          appointment,
          deltaX,
          rect.width,
          allDayStrip.columnCount,
          snapMinutes,
          props.rtl,
        );
        setPreview({ key: appointment.key, proposal, leafIndex });
      },
      onFinish: (commit, cancelled) => {
        setPreview(null);
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

  /* ---------- pointer events ---------- */

  const onChipClick = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    event.stopPropagation();
    props.onChipClicked(
      chipEvent(appointment, event.nativeEvent, event.currentTarget),
    );
  };

  const onChipDblClick = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    event.stopPropagation();
    props.onChipDblClicked(
      chipEvent(appointment, event.nativeEvent, event.currentTarget),
    );
  };

  const onChipContextMenu = (
    appointment: SchedulerAppointment<T>,
    event: ReactMouseEvent<HTMLElement>,
  ): void => {
    event.stopPropagation();
    props.onChipContextMenu(
      chipEvent(appointment, event.nativeEvent, event.currentTarget),
    );
  };

  const chipLabel = (appointment: SchedulerAppointment<T>): string =>
    withSelectedLabel(
      schedulerChipAriaLabel(messages, appointment, locale),
      isSelected(appointment),
      messages,
    );

  const previewBox =
    preview === null || preview.proposal.allDay
      ? null
      : dayWeekLayoutPreviewBox(
          preview.proposal,
          preview.leafIndex,
          grid,
          props.minAppointmentMinutes,
          layout,
        );
  const drop = props.dropPreview;
  const dropBox =
    drop === null || drop.slot.allDay
      ? null
      : dayWeekLayoutPreviewBox(
          {
            startDate: drop.slot.startDate,
            endDate: new Date(
              drop.slot.startDate.getTime() + drop.durationMinutes * 60_000,
            ),
            allDay: false,
          },
          Math.max(
            0,
            leafIndexOfValues(props.groupLevels, props.groupLeaves, drop.slot.resources),
          ),
          grid,
          props.minAppointmentMinutes,
          layout,
        );
  const selectionBox =
    selection === null
      ? null
      : dayWeekSelectionBox(selection, grid, layout.colCount, layout.blockCount);
  const nowBoxes = dayWeekNowBoxes(
    grid,
    layout,
    now,
    props.showCurrentTimeIndicator,
  );

  const gridLabel = schedulerGridAriaLabel(
    messages,
    weekNumbers.length === 0
      ? props.periodLabel
      : `${props.periodLabel}, ${weekNumbers
          .map((week) => schedulerWeekNumberTexts(week, messages).label)
          .join(', ')}`,
  );

  const hostStyle = {
    '--oge-scheduler-day-count': grid.days.length,
    '--oge-scheduler-col-count': layout.colCount,
    '--oge-scheduler-allday-cols': allDayStrip.columnCount,
    '--oge-scheduler-block-slots': grid.slotStartMinutes.length,
  } as CSSProperties;

  const isBreak = (col: DayWeekColumn): boolean => {
    if (col.colIndex === 0 || layout.leaves.length === 0 || layout.vertical) {
      return false;
    }
    return layout.groupByDate ? col.resIndex === 0 : col.dayIndex === 0;
  };

  const headerCell = (cell: SchedulerHeaderCell): ReactNode => {
    const style = { gridColumn: `${cell.start + 2} / span ${cell.span}` };
    if (cell.kind === 'date' && cell.date !== undefined) {
      const date = cell.date;
      return (
        <div key={cell.key} className="oge-scheduler-date-header" style={style}>
          {renderDateHeader ? (
            renderDateHeader({ date, view })
          ) : (
            <>
              <span className="oge-scheduler-date-weekday">
                {weekdayShortText(date, locale)}
              </span>
              <span
                className={
                  sameDay(date, now)
                    ? 'oge-scheduler-date-num oge-scheduler-date-today'
                    : 'oge-scheduler-date-num'
                }
              >
                {date.getDate()}
              </span>
            </>
          )}
        </div>
      );
    }
    return (
      <div key={cell.key} className="oge-scheduler-resource-head" style={style}>
        {renderResourceHeader && cell.item && cell.resource
          ? renderResourceHeader({
              item: cell.item,
              resource: cell.resource,
              level: cell.level ?? 0,
              view,
            })
          : cell.text}
      </div>
    );
  };

  return (
    <div
      ref={hostRef}
      className={
        layout.vertical
          ? 'oge-scheduler-view oge-scheduler-day-week oge-scheduler-day-week-vertical'
          : 'oge-scheduler-view oge-scheduler-day-week'
      }
      style={hostStyle}
    >
      {/* visual headers; the grid's own columnheader row carries the names */}
      {headerRows.map((row, index) => (
        <div
          key={index}
          className={
            row[0]?.kind === 'group'
              ? 'oge-scheduler-header-row oge-scheduler-resource-row'
              : 'oge-scheduler-header-row'
          }
          aria-hidden="true"
        >
          <div className="oge-scheduler-gutter-spacer">
            {index === 0 && weekBadge !== null && (
              <span className="oge-scheduler-week-number">{weekBadge}</span>
            )}
          </div>
          {row.map(headerCell)}
        </div>
      ))}

      {props.showAllDayPanel && (
        <div className="oge-scheduler-allday" role="presentation">
          <div className="oge-scheduler-gutter-label" aria-hidden="true">
            {messages.allDayLabel}
          </div>
          <div
            ref={stripRef}
            className="oge-scheduler-allday-lanes"
            style={
              {
                '--oge-scheduler-allday-lane-count': allDayLaneCount,
              } as CSSProperties
            }
          >
            {allDayStrip.cells.map((cell) => (
              // pointer affordance only; keyboard creation goes through the grid cells
              <div
                key={cell.key}
                className="oge-scheduler-allday-cell"
                onClick={(event) =>
                  props.onCellClicked({
                    cellDate: cell.day,
                    allDay: true,
                    event: event.nativeEvent,
                    resources: cell.values,
                  })
                }
                onDoubleClick={(event) =>
                  props.onCellDblClicked({
                    cellDate: cell.day,
                    allDay: true,
                    event: event.nativeEvent,
                    resources: cell.values,
                  })
                }
              />
            ))}
            {allDayStrip.bars.map((bar) => (
              <div
                key={String(bar.appointment.key)}
                className={[
                  'oge-scheduler-allday-bar oge-scheduler-chip-stop',
                  bar.clippedStart && 'oge-scheduler-bar-clipped-start',
                  bar.clippedEnd && 'oge-scheduler-bar-clipped-end',
                  isSelected(bar.appointment) && 'oge-scheduler-chip-selected',
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
                  gridColumn: `${bar.colStart} / ${bar.colEnd}`,
                  gridRow: bar.lane + 1,
                }}
                onClick={(event) => onChipClick(bar.appointment, event)}
                onDoubleClick={(event) =>
                  onChipDblClick(bar.appointment, event)
                }
                onKeyDown={(event) => onChipKeyDown(bar.appointment, event)}
                onFocus={() => setFocusedChipKey(bar.appointment.key)}
                onPointerDown={(event) => onAllDayBarPointerDown(bar, event)}
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
        {layout.vertical && (
          <div className="oge-scheduler-group-gutter" aria-hidden="true">
            {layout.leaves.map((leaf) => {
              const resource = props.groupLevels[props.groupLevels.length - 1];
              const item = leaf.path[leaf.path.length - 1];
              return (
                <div key={leaf.index} className="oge-scheduler-group-label">
                  {renderResourceHeader && resource !== undefined
                    ? renderResourceHeader({
                        item,
                        resource,
                        level: props.groupLevels.length - 1,
                        view,
                      })
                    : leaf.label}
                </div>
              );
            })}
          </div>
        )}
        <div className="oge-scheduler-gutter" aria-hidden="true">
          {Array.from({ length: layout.blockCount }, (_, block) =>
            gutterSlots.map((slot) => (
              <div
                key={`${block}:${slot.minutes}`}
                className="oge-scheduler-gutter-slot"
              >
                <span className="oge-scheduler-gutter-text">{slot.text}</span>
              </div>
            )),
          )}
        </div>
        {/* the wrapper carries the overlay layers so the grid element owns
            ONLY rows (aria-required-children) */}
        <div ref={rowsRef} className="oge-scheduler-rows">
          {/* delegated keydown; focus lives on the roving gridcell */}
          <div
            className="oge-scheduler-grid"
            role="grid"
            aria-label={gridLabel}
            aria-readonly={props.readOnly ? true : undefined}
          >
            <div className="oge-scheduler-sr-header-row" role="row">
              {columns.map((col) => (
                <div
                  key={col.colIndex}
                  className="oge-scheduler-sr-header"
                  role="columnheader"
                >
                  {dayWeekColumnHeaderText(col, locale)}
                </div>
              ))}
            </div>
            {gridRows.map((row) => (
              <div key={row.index} className="oge-scheduler-row" role="row">
                {columns.map((col) => {
                  const focused = isFocusedCell(col.colIndex, row.index);
                  const date = cellDateAt(col.day, row.minutes);
                  const blocked = blockedCells.has(
                    dayWeekCellKey(row.block, row.slot, col.colIndex),
                  );
                  const leaf = dayWeekLayoutCellLeaf(layout, col.colIndex, row.block);
                  return (
                    <div
                      key={col.colIndex}
                      className={[
                        'oge-scheduler-cell',
                        row.minutes % 60 === 0 && 'oge-scheduler-cell-hour',
                        row.slot === 0 &&
                          row.block > 0 &&
                          'oge-scheduler-block-start',
                        sameDay(col.day, now) && 'oge-scheduler-day-today',
                        isWeekendDay(col.day, props.weekendDays) &&
                          'oge-scheduler-cell-weekend',
                        isBreak(col) && 'oge-scheduler-cell-daybreak',
                        dayWeekCellOffHours(
                          layout,
                          col.colIndex,
                          row.block,
                          col.day,
                          row.minutes,
                          props.workHours,
                        ) && 'oge-scheduler-cell-off-hours',
                        blocked && 'oge-scheduler-cell-disabled',
                        focused && 'oge-scheduler-cell-focused',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="gridcell"
                      aria-disabled={blocked ? true : undefined}
                      tabIndex={focused ? 0 : -1}
                      aria-selected={dayWeekCellSelected(
                        col.colIndex,
                        row.index,
                        row.minutes,
                        focusedCell,
                        selection,
                        row.block,
                      )}
                      data-focus-target={focused ? '' : undefined}
                      aria-label={withUnavailableLabel(
                        schedulerCellAriaLabel(
                          messages,
                          date,
                          locale,
                          leaf?.label ?? col.resourceText,
                        ),
                        blocked,
                        messages,
                      )}
                      onClick={(event) => {
                        setFocusedCell({ day: col.colIndex, slot: row.index });
                        props.onCellClicked(cellEvent(col, row, event.nativeEvent));
                      }}
                      onDoubleClick={(event) =>
                        props.onCellDblClicked(
                          cellEvent(col, row, event.nativeEvent),
                        )
                      }
                      onKeyDown={(event) => onCellKeyDown(col, row, event)}
                      onPointerDown={(event) =>
                        onCellPointerDown(col, row, event)
                      }
                      onContextMenu={(event) =>
                        props.onCellContextMenu(
                          cellEvent(col, row, event.nativeEvent),
                        )
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
                key={`${segmentKey(segment)}:${segment.block ?? 0}`}
                className={[
                  'oge-scheduler-chip-box oge-scheduler-chip-stop',
                  segment.clippedStart && 'oge-scheduler-chip-clipped-start',
                  segment.clippedEnd && 'oge-scheduler-chip-clipped-end',
                  isSelected(segment.appointment) &&
                    'oge-scheduler-chip-selected',
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
                  top: pct(chipTopPercent(segment, layout.blockCount)),
                  height: pct(chipHeightPercent(segment, layout.blockCount)),
                  insetInlineStart: pct(
                    chipLeftPercent(segment, layout.colCount),
                  ),
                  width: pct(chipWidthPercent(segment, layout.colCount)),
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
                onPointerDown={(event) => onChipPointerDown(segment, event)}
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
                  insetInlineStart: pct(previewBox.left),
                  width: pct(previewBox.width),
                }}
              />
            )}
            {dropBox && (
              <div
                className="oge-scheduler-drag-preview oge-scheduler-drop-preview"
                aria-hidden="true"
                style={{
                  top: pct(dropBox.top),
                  height: pct(dropBox.height),
                  insetInlineStart: pct(dropBox.left),
                  width: pct(dropBox.width),
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
                insetInlineStart: pct(selectionBox.left),
                width: pct(selectionBox.width),
              }}
            />
          )}
          {nowBoxes.map((line) => (
            <Fragment key={line.key}>
              {props.shadeUntilCurrentTime && (
                <div
                  className="oge-scheduler-shade"
                  style={{
                    top: pct(line.blockTop),
                    height: pct(line.top - line.blockTop),
                    insetInlineStart: pct(line.left),
                    width: pct(line.width),
                  }}
                  aria-hidden="true"
                />
              )}
              <div
                className="oge-scheduler-now"
                style={{
                  top: pct(line.top),
                  insetInlineStart: pct(line.left),
                  width: pct(line.width),
                }}
                aria-hidden="true"
              />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export const SchedulerDayWeekView = forwardRef(DayWeekViewInner) as <T>(
  props: DayWeekViewProps<T> & { ref?: Ref<DayWeekViewHandle> },
) => ReactElement;
