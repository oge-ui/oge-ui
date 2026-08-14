'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  addDays,
  addMonths,
  addYears,
  decadeCells,
  isDayDisabled,
  monthCells,
  navigate,
  resolveFirstDayOfWeek,
  sameDay,
  sameMonth,
  startOfDay,
  viewLabel,
  weekNumber,
  weekdayNames,
  yearCells,
  type CalendarCell,
  type OgeCalendarCellClickEvent,
  type OgeCalendarDisabledDates,
  type OgeCalendarRange,
  type OgeCalendarSelectionMode,
  type OgeCalendarWeekNumberOptions,
  type OgeCalendarZoomLevel,
} from '@oge-ui/behavior';
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

const ZOOM_ORDER: OgeCalendarZoomLevel[] = ['month', 'year', 'decade'];

/** Context handed to `renderCell` — the React face of the Angular slot. */
export interface OgeCalendarCellContext {
  date: Date;
  view: OgeCalendarZoomLevel;
  /** Default display text of the cell. */
  text: string;
  disabled: boolean;
  selected: boolean;
  today: boolean;
  /** Day belongs to the previous/next month (month view only). */
  otherPeriod: boolean;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeCalendarHandle {
  focus(): void;
}

export interface OgeCalendarProps extends OgeControlProps<Date | null> {
  /** The selected days (`selectionMode: 'multiple'`) — controlled. */
  values?: readonly Date[];
  defaultValues?: readonly Date[];
  onValuesChange?: (values: readonly Date[]) => void;
  /** The selected `[start, end]` (`selectionMode: 'range'`) — controlled. */
  range?: OgeCalendarRange;
  defaultRange?: OgeCalendarRange;
  onRangeChange?: (range: OgeCalendarRange) => void;
  selectionMode?: OgeCalendarSelectionMode;
  /** Side-by-side month views (`2` is the range-picking layout). */
  viewsCount?: 1 | 2;
  /** Current drill level — controlled (`month` = days). */
  zoomLevel?: OgeCalendarZoomLevel;
  defaultZoomLevel?: OgeCalendarZoomLevel;
  onZoomLevelChange?: (zoom: OgeCalendarZoomLevel) => void;
  /** Most zoomed-out reachable level. */
  minZoomLevel?: OgeCalendarZoomLevel;
  /** Most zoomed-in reachable level. */
  maxZoomLevel?: OgeCalendarZoomLevel;
  /** First selectable day (`undefined` = unbounded). */
  min?: Date;
  /** Last selectable day (`undefined` = unbounded). */
  max?: Date;
  /** Individual unselectable days: an array or a predicate. */
  disabledDates?: OgeCalendarDisabledDates;
  /** `0`–`6` (Sunday-first); `undefined` resolves from the locale. */
  firstDayOfWeek?: number;
  showTodayButton?: boolean;
  /** Week-number column: `true` (ISO rule) or `{ rule }`. */
  showWeekNumbers?: boolean | OgeCalendarWeekNumberOptions;
  /** The keyboard-focused day — controlled navigation. */
  focusedDate?: Date | null;
  defaultFocusedDate?: Date | null;
  onFocusedDateChange?: (date: Date | null) => void;
  /** BCP 47 locale for all texts; `undefined` = the runtime default. */
  locale?: string;
  /** Accessible name of the grid (`aria-label`). */
  label?: string;
  /** Custom cell rendering — the React face of `[ogeCalendarCellTemplate]`. */
  renderCell?: (context: OgeCalendarCellContext) => ReactNode;
  /** A day/month/year cell was activated by click or keyboard. */
  onCellClick?: (event: OgeCalendarCellClickEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Standalone month calendar with year/decade drill-down — the React render of
 * the Angular `<oge-calendar>`: a WAI-ARIA date grid with a roving-tabindex
 * day button (arrows move ±1/±7 days, PgUp/PgDn ±1 month, Shift+PgUp/PgDn ±1
 * year, Home/End week edges), localized entirely through `Intl` (no date
 * library) over the shared `@oge-ui/behavior` calendar core — the exact cell
 * grids and navigation arithmetic the Angular calendar runs.
 *
 * ```tsx
 * <OgeCalendar value={date} onValueChange={setDate} />
 * <OgeCalendar
 *   selectionMode="multiple"
 *   values={dates}
 *   onValuesChange={setDates}
 *   disabledDates={isWeekend}
 *   showTodayButton
 * />
 * ```
 */
export const OgeCalendar = forwardRef<OgeCalendarHandle, OgeCalendarProps>(
  function OgeCalendarRender(props, ref) {
    const {
      selectionMode = 'single',
      viewsCount = 1,
      minZoomLevel = 'decade',
      maxZoomLevel = 'month',
      min,
      max,
      disabledDates,
      showTodayButton = false,
      showWeekNumbers = false,
      label = '',
      renderCell,
      className,
      style,
    } = props;

    const config = useOgeInputsConfig();
    const hostRef = useRef<HTMLDivElement>(null);

    const field = useOgeField<Date | null>({
      props,
      emptyValue: null,
      isEmpty: (value) => value === null,
      focusNative: () => focusTargetElement()?.focus(),
    });
    const readonly = props.readonly ?? false;
    const value =
      field.value instanceof Date && !Number.isNaN(field.value.getTime())
        ? field.value
        : null;

    const locale = props.locale ?? config.locale;

    // --- multiple / range values (controlled pairs) -------------------------

    const [uncontrolledValues, setUncontrolledValues] = useState<
      readonly Date[]
    >(props.defaultValues ?? []);
    const values = props.values ?? uncontrolledValues;

    const [uncontrolledRange, setUncontrolledRange] =
      useState<OgeCalendarRange>(props.defaultRange ?? [null, null]);
    const range = props.range ?? uncontrolledRange;

    // --- zoom / focus / anchor ----------------------------------------------

    const [uncontrolledZoom, setUncontrolledZoom] =
      useState<OgeCalendarZoomLevel>(props.defaultZoomLevel ?? 'month');
    const zoom = props.zoomLevel ?? uncontrolledZoom;

    const [uncontrolledFocused, setUncontrolledFocused] = useState<Date | null>(
      props.defaultFocusedDate ?? null,
    );
    const focusedDate =
      props.focusedDate !== undefined ? props.focusedDate : uncontrolledFocused;

    /** Anchor of the visible view (any date inside the month/year/decade). */
    const [viewDate, setViewDate] = useState(() => startOfDay(new Date()));

    const latest = useRef({ props, field, zoom, focusedDate, viewDate, value });
    latest.current = { props, field, zoom, focusedDate, viewDate, value };

    const setZoom = (next: OgeCalendarZoomLevel): void => {
      if (latest.current.props.zoomLevel === undefined) {
        setUncontrolledZoom(next);
      }
      latest.current.props.onZoomLevelChange?.(next);
    };

    const setFocusedDate = (next: Date | null): void => {
      if (latest.current.props.focusedDate === undefined) {
        setUncontrolledFocused(next);
      }
      latest.current.props.onFocusedDateChange?.(next);
    };

    const setValues = (next: readonly Date[]): void => {
      if (latest.current.props.values === undefined) {
        setUncontrolledValues(next);
      }
      latest.current.props.onValuesChange?.(next);
    };

    const setRange = (next: OgeCalendarRange): void => {
      if (latest.current.props.range === undefined) setUncontrolledRange(next);
      latest.current.props.onRangeChange?.(next);
    };

    // A programmatic value write re-anchors the view (Angular
    // `onValueWritten`).
    const lastWritten = useRef(value);
    useEffect(() => {
      if (value && !sameDay(value, lastWritten.current)) {
        setViewDate(startOfDay(value));
        setFocusedDate(startOfDay(value));
      }
      lastWritten.current = value;
    }, [value?.getTime()]);

    // --- derivations --------------------------------------------------------

    const effFirstDay = resolveFirstDayOfWeek(props.firstDayOfWeek, locale);
    const weekNumbersOn = showWeekNumbers !== false;
    const weekRule =
      typeof showWeekNumbers === 'object'
        ? showWeekNumbers.rule
        : 'firstFourDays';

    const weekdays = weekdayNames(locale, effFirstDay);
    const headerLabel = viewLabel(viewDate, zoom, locale);

    /** `[0]` or `[0, 1]` — the month offsets of the visible views. */
    const viewOffsets: readonly number[] = viewsCount === 2 ? [0, 1] : [0];

    const viewWeeks: CalendarCell[][][] = viewOffsets.map((offset) => {
      const cells = monthCells(
        addMonths(viewDate, offset),
        effFirstDay,
        locale,
        min,
        max,
        disabledDates,
      );
      return Array.from({ length: 6 }, (_, week) =>
        cells.slice(week * 7, week * 7 + 7),
      );
    });

    const zoomedRows: CalendarCell[][] = (() => {
      if (zoom === 'month') return [];
      const cells =
        zoom === 'year'
          ? yearCells(viewDate, locale, min, max)
          : decadeCells(viewDate, min, max);
      return Array.from({ length: 3 }, (_, row) =>
        cells.slice(row * 4, row * 4 + 4),
      );
    })();

    /** The single grid cell carrying the reachable tabindex. */
    const focusTarget: Date = (() => {
      const focused = focusedDate ?? value ?? new Date();
      if (zoom === 'month') {
        const visible = viewOffsets.some((offset) =>
          sameMonth(focused, addMonths(viewDate, offset)),
        );
        return visible ? startOfDay(focused) : viewDate;
      }
      return viewDate;
    })();

    // --- range selection ----------------------------------------------------

    /** Hovered day while picking a range end (preview shading). */
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    const rangePreviewEnd: Date | null = (() => {
      if (selectionMode !== 'range') return null;
      const [start, end] = range;
      if (!start) return null;
      return end ?? hoveredDate;
    })();

    const isRangeEdge = (date: Date): boolean => {
      if (selectionMode !== 'range') return false;
      const [start, end] = range;
      return sameDay(start, date) || sameDay(end, date);
    };

    const isInRange = (date: Date): boolean => {
      if (selectionMode !== 'range') return false;
      const [start] = range;
      const end = rangePreviewEnd;
      if (!start || !end) return false;
      const time = startOfDay(date).getTime();
      const a = startOfDay(start).getTime();
      const b = startOfDay(end).getTime();
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return time > lo && time < hi;
    };

    // --- cell state ---------------------------------------------------------

    const dayLabelFormat = new Intl.DateTimeFormat(locale, {
      dateStyle: 'full',
    });

    const isSelected = (date: Date): boolean => {
      if (selectionMode === 'multiple') {
        return values.some((candidate) => sameDay(candidate, date));
      }
      if (selectionMode === 'range') return isRangeEdge(date);
      return sameDay(value, date);
    };

    const isZoomedSelected = (date: Date): boolean => {
      if (!value) return false;
      return zoom === 'year'
        ? sameMonth(value, date)
        : value.getFullYear() === date.getFullYear();
    };

    const isToday = (date: Date): boolean => sameDay(date, new Date());

    const isFocusTarget = (date: Date, otherPeriod = false): boolean => {
      if (zoom === 'month') {
        // with two views a lead-in/out day exists twice — only its own
        // month's cell may carry the tabindex
        if (viewsCount === 2 && otherPeriod) return false;
        return sameDay(date, focusTarget);
      }
      if (zoom === 'year') return sameMonth(date, focusTarget);
      return date.getFullYear() === focusTarget.getFullYear();
    };

    // --- navigation ---------------------------------------------------------

    const canZoomOut =
      ZOOM_ORDER.indexOf(zoom) < ZOOM_ORDER.indexOf(minZoomLevel);

    const zoomOut = (): void => {
      if (!canZoomOut) return;
      setZoom(ZOOM_ORDER[ZOOM_ORDER.indexOf(zoom) + 1]);
    };

    const go = (direction: 1 | -1): void => {
      setViewDate(
        navigate(latest.current.viewDate, latest.current.zoom, direction),
      );
    };

    const focusTargetElement = (): HTMLElement | null =>
      hostRef.current?.querySelector<HTMLElement>('[data-focus-target]') ??
      null;

    /** Focuses the roving-tabindex cell after the pending render. */
    const queueFocusTarget = (): void => {
      setTimeout(() => focusTargetElement()?.focus());
    };

    const selectDay = (date: Date, event: Event): void => {
      const day = startOfDay(date);
      setFocusedDate(day);
      // keep the visible views steady while the day is already on screen
      const visible = viewOffsets.some((offset) =>
        sameMonth(day, addMonths(latest.current.viewDate, offset)),
      );
      if (!visible) setViewDate(day);
      if (selectionMode === 'multiple') {
        const exists = values.some((candidate) => sameDay(candidate, day));
        setValues(
          exists
            ? values.filter((candidate) => !sameDay(candidate, day))
            : [...values, day],
        );
        return;
      }
      if (selectionMode === 'range') {
        const [start, end] = range;
        if (!start || end) {
          setRange([day, null]);
        } else {
          setRange(
            day.getTime() < start.getTime() ? [day, start] : [start, day],
          );
        }
        return;
      }
      field.commit.commitNow(day, event);
    };

    const onCellClick = (cell: CalendarCell, event: Event): void => {
      if (field.effectiveDisabled || readonly || cell.disabled) return;
      latest.current.props.onCellClick?.({
        date: cell.date,
        view: zoom,
        event,
      });
      if (zoom === 'month') {
        selectDay(cell.date, event);
        return;
      }
      // drill in: year → its month view, decade → its year view
      setViewDate(cell.date);
      setZoom(zoom === 'decade' ? 'year' : 'month');
      queueFocusTarget();
    };

    const todayDisabled = isDayDisabled(new Date(), min, max, disabledDates);

    const selectToday = (event: React.MouseEvent): void => {
      const today = startOfDay(new Date());
      setViewDate(today);
      setZoom(maxZoomLevel);
      selectDay(today, event.nativeEvent);
    };

    const step = (
      focused: Date,
      level: OgeCalendarZoomLevel,
      amount: number,
    ): Date => {
      if (level === 'month') return addDays(focused, amount);
      if (level === 'year') return addMonths(focused, amount);
      return addYears(focused, amount);
    };

    const moveFocusTo = (date: Date): void => {
      setFocusedDate(startOfDay(date));
      setViewDate(startOfDay(date));
      queueFocusTarget();
    };

    const onGridKeydown = (event: ReactKeyboardEvent): void => {
      if (field.effectiveDisabled) return;
      const focused = focusTarget;
      let next: Date | null = null;
      switch (event.key) {
        case 'ArrowLeft':
          next = step(focused, zoom, -1);
          break;
        case 'ArrowRight':
          next = step(focused, zoom, 1);
          break;
        case 'ArrowUp':
          next = step(focused, zoom, zoom === 'month' ? -7 : -4);
          break;
        case 'ArrowDown':
          next = step(focused, zoom, zoom === 'month' ? 7 : 4);
          break;
        case 'PageUp':
          next =
            zoom === 'month'
              ? event.shiftKey
                ? addYears(focused, -1)
                : addMonths(focused, -1)
              : null;
          break;
        case 'PageDown':
          next =
            zoom === 'month'
              ? event.shiftKey
                ? addYears(focused, 1)
                : addMonths(focused, 1)
              : null;
          break;
        case 'Home':
        case 'End': {
          if (zoom !== 'month') break;
          const index = (focused.getDay() - effFirstDay + 7) % 7;
          next = addDays(focused, event.key === 'Home' ? -index : 6 - index);
          break;
        }
      }
      if (next === null) return;
      event.preventDefault();
      moveFocusTo(next);
    };

    useImperativeHandle(
      ref,
      () => ({ focus: () => focusTargetElement()?.focus() }),
      [],
    );

    // --- render -------------------------------------------------------------

    const cellBody = (cell: CalendarCell): ReactNode => {
      if (!renderCell) return cell.text;
      return renderCell({
        date: cell.date,
        view: zoom,
        text: cell.text,
        disabled: cell.disabled,
        selected:
          zoom === 'month'
            ? isSelected(cell.date)
            : isZoomedSelected(cell.date),
        today: zoom === 'month' && isToday(cell.date),
        otherPeriod: cell.otherPeriod,
      });
    };

    const navButton = (direction: 1 | -1) => (
      <button
        type="button"
        className="oge-calendar-nav"
        aria-label={
          direction === 1 ? field.msg.calendarNext : field.msg.calendarPrev
        }
        disabled={field.effectiveDisabled}
        onClick={() => go(direction)}
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={direction === 1 ? 'm6 3 5 5-5 5' : 'M10 3 5 8l5 5'} />
        </svg>
      </button>
    );

    const hostClasses = [
      'oge-calendar',
      field.showError && 'oge-calendar-invalid',
      readonly && 'oge-calendar-readonly',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={hostRef} className={hostClasses} style={style}>
        <div className="oge-calendar-header">
          {navButton(-1)}
          <button
            type="button"
            className="oge-calendar-view-label"
            aria-label={field.msg.calendarZoomOut}
            disabled={field.effectiveDisabled || !canZoomOut}
            onClick={zoomOut}
          >
            {headerLabel}
          </button>
          {navButton(1)}
        </div>
        {/* Delegated keyboard handler: focus lives on the roving-tabindex
            cell buttons inside. */}
        <div
          className={[
            'oge-calendar-grid',
            zoom === 'month' && 'oge-calendar-grid-days',
          ]
            .filter(Boolean)
            .join(' ')}
          role="grid"
          aria-label={label || field.msg.calendarLabel}
          onKeyDown={onGridKeydown}
        >
          {zoom === 'month' ? (
            <div
              className="oge-calendar-views"
              onMouseLeave={() => setHoveredDate(null)}
            >
              {viewOffsets.map((offset, viewIndex) => (
                <div className="oge-calendar-view" key={offset}>
                  {viewsCount === 2 && (
                    <div
                      className="oge-calendar-view-title"
                      role="presentation"
                    >
                      {viewLabel(addMonths(viewDate, offset), 'month', locale)}
                    </div>
                  )}
                  <div
                    className="oge-calendar-row oge-calendar-weekdays"
                    role="row"
                  >
                    {weekNumbersOn && (
                      <span
                        className="oge-calendar-weeknum"
                        role="columnheader"
                      >
                        <span className="oge-calendar-sr-only">
                          {field.msg.weekColumnLabel}
                        </span>
                      </span>
                    )}
                    {weekdays.map((name, index) => (
                      <span
                        className="oge-calendar-weekday"
                        role="columnheader"
                        key={index}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  {viewWeeks[viewIndex].map((week, weekIndex) => (
                    <div
                      className="oge-calendar-row"
                      role="row"
                      key={weekIndex}
                    >
                      {weekNumbersOn && (
                        <span className="oge-calendar-weeknum" role="rowheader">
                          {weekNumber(week[0].date, weekRule)}
                        </span>
                      )}
                      {week.map((cell) => (
                        <button
                          key={cell.date.getTime()}
                          type="button"
                          className={[
                            'oge-calendar-cell',
                            cell.otherPeriod && 'oge-calendar-cell-other',
                            isSelected(cell.date) &&
                              'oge-calendar-cell-selected',
                            isInRange(cell.date) &&
                              'oge-calendar-cell-in-range',
                            isToday(cell.date) && 'oge-calendar-cell-today',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          role="gridcell"
                          disabled={field.effectiveDisabled || cell.disabled}
                          tabIndex={
                            isFocusTarget(cell.date, cell.otherPeriod)
                              ? (props.tabIndex ?? 0)
                              : -1
                          }
                          aria-selected={isSelected(cell.date)}
                          aria-current={isToday(cell.date) ? 'date' : undefined}
                          aria-label={dayLabelFormat.format(cell.date)}
                          data-focus-target={
                            isFocusTarget(cell.date, cell.otherPeriod)
                              ? ''
                              : undefined
                          }
                          onClick={(event) =>
                            onCellClick(cell, event.nativeEvent)
                          }
                          onMouseEnter={() => {
                            if (selectionMode === 'range') {
                              setHoveredDate(cell.date);
                            }
                          }}
                          onFocus={() => setFocusedDate(startOfDay(cell.date))}
                        >
                          {cellBody(cell)}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            zoomedRows.map((row, rowIndex) => (
              <div className="oge-calendar-row" role="row" key={rowIndex}>
                {row.map((cell) => (
                  <button
                    key={cell.date.getTime()}
                    type="button"
                    className={[
                      'oge-calendar-cell',
                      'oge-calendar-cell-wide',
                      cell.otherPeriod && 'oge-calendar-cell-other',
                      isZoomedSelected(cell.date) &&
                        'oge-calendar-cell-selected',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="gridcell"
                    disabled={field.effectiveDisabled || cell.disabled}
                    tabIndex={
                      isFocusTarget(cell.date) ? (props.tabIndex ?? 0) : -1
                    }
                    data-focus-target={
                      isFocusTarget(cell.date) ? '' : undefined
                    }
                    onClick={(event) => onCellClick(cell, event.nativeEvent)}
                  >
                    {cellBody(cell)}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        {showTodayButton && (
          <button
            type="button"
            className="oge-calendar-today-btn"
            disabled={field.effectiveDisabled || todayDisabled}
            onClick={selectToday}
          >
            {field.msg.todayButton}
          </button>
        )}
      </div>
    );
  },
);
