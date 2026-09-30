import { OGE_DEFAULT_SCHEDULER_MESSAGES } from './config';
import {
  allDayDragProposal,
  buildAllDayLayout,
  buildDayWeekColumns,
  buildGutterSlots,
  cellDateAt,
  chipTabIndexOf,
  dayWeekChipOrder,
  dayWeekDragMove,
  dayWeekPreviewBox,
  dayWeekSelectionBox,
  dragSelectionRange,
  escapeAttr,
  isOffHoursCell,
  layoutDayWeekSegments,
  nowLineFraction,
  schedulerCellAriaLabel,
  schedulerGridAriaLabel,
} from './day-week-vm';
import {
  agendaTimeText,
  buildAgendaDays,
  buildYearMonths,
  chipForeground,
  countAppointmentsByDay,
  yearCellLabel,
} from './list-vm';
import {
  buildMonthWeekLayouts,
  monthChipOrder,
  monthDropCell,
  monthMaxLanes,
  monthOriginIndex,
  monthOverflowEntries,
  schedulerMoreText,
} from './month-vm';
import type { SchedulerAppointment } from './scheduler-model';
import {
  buildTimelineGrid,
  buildTimelineRows,
  timelineDragMove,
  timelineHourLabels,
  timelineRowAt,
} from './timeline-vm';
import { buildMonthGrid, buildTimeGrid, partitionAllDay } from './view-model';

interface Src {
  ownerId?: string;
}

function appt(
  key: number,
  start: Date,
  end: Date,
  extra: Partial<SchedulerAppointment<Src>> = {},
): SchedulerAppointment<Src> {
  return {
    key,
    source: {},
    text: `A${key}`,
    startDate: start,
    endDate: end,
    allDay: false,
    displayAllDay: false,
    color: undefined,
    location: undefined,
    description: undefined,
    reminderMinutes: undefined,
    recurrenceRule: undefined,
    recurrenceException: undefined,
    disabled: false,
    seriesKey: null,
    ...extra,
  };
}

const grid = buildTimeGrid({
  anchorDate: new Date(2026, 7, 6),
  view: 'week',
  firstDayOfWeek: 1,
  dayStartHour: 8,
  dayEndHour: 18,
  cellDuration: 30,
});
const messages = OGE_DEFAULT_SCHEDULER_MESSAGES.grid;
const owners = [
  { id: 'a', text: 'Ada' },
  { id: 'b', text: 'Bo' },
];

describe('day/week view model', () => {
  it('splits day columns per grouping resource', () => {
    const columns = buildDayWeekColumns(grid.days, owners);
    expect(columns).toHaveLength(14);
    expect(columns[3]).toMatchObject({
      dayIndex: 1,
      resIndex: 1,
      colIndex: 3,
      resourceId: 'b',
      resourceText: 'Bo',
    });
    expect(buildDayWeekColumns(grid.days, null)).toHaveLength(7);
  });

  it('buckets segments into their resource column', () => {
    const a = appt(1, new Date(2026, 7, 4, 9), new Date(2026, 7, 4, 10), {
      source: { ownerId: 'b' },
    });
    const [segment] = layoutDayWeekSegments(
      [a],
      grid,
      owners,
      (item: Src) => item.ownerId,
      15,
    );
    expect(segment.colIndex).toBe(3);
    expect(segment.topFraction).toBeCloseTo(0.1);
  });

  it('packs the all-day strip and orders chips all-day first', () => {
    const allDay = appt(1, new Date(2026, 7, 4), new Date(2026, 7, 6), {
      allDay: true,
      displayAllDay: true,
    });
    const timed = appt(2, new Date(2026, 7, 3, 9), new Date(2026, 7, 3, 10));
    const { allDay: strip, timed: body } = partitionAllDay([allDay, timed]);
    const layout = buildAllDayLayout(strip, grid);
    expect(layout.visible[0]).toMatchObject({
      startDayIndex: 1,
      endDayIndex: 2,
    });
    const order = dayWeekChipOrder(
      layout.visible,
      layoutDayWeekSegments(body, grid, null, () => null, 15),
    );
    expect(order.map((entry) => entry.key)).toEqual([1, 2]);
    expect(chipTabIndexOf(order, null, order[0])).toBe(0);
    expect(chipTabIndexOf(order, 2, order[0])).toBe(-1);
  });

  it('computes preview/selection boxes and the drag arithmetic', () => {
    const box = dayWeekPreviewBox(
      {
        startDate: new Date(2026, 7, 4, 13),
        endDate: new Date(2026, 7, 4, 14),
        allDay: false,
      },
      0,
      grid,
      15,
      7,
      1,
    );
    expect(box).toEqual({
      top: 50,
      height: 10,
      left: (1 / 7) * 100,
      width: (1 / 7) * 100,
    });
    expect(
      dayWeekSelectionBox(
        { dayIndex: 0, startMinutes: 8 * 60, endMinutes: 9 * 60 },
        grid,
        7,
      ),
    ).toMatchObject({ top: 0, height: 10 });
    expect(dragSelectionRange(150, 100, 600, grid, 9 * 60, 30)).toEqual({
      startMinutes: 540,
      endMinutes: 570,
    });
    const a = appt(1, new Date(2026, 7, 4, 9), new Date(2026, 7, 4, 10));
    const move = dayWeekDragMove(a, 100, 60, 700, 600, grid, 7, 1, 1, 0, 30);
    expect(move.proposal.startDate).toEqual(new Date(2026, 7, 5, 10));
    expect(allDayDragProposal(a, -100, 700, 7, 30).startDate).toEqual(
      new Date(2026, 7, 3, 9),
    );
  });

  it('shades off-hours, finds the now line and labels cells', () => {
    const workHours = { start: 9, end: 17, days: [1, 2, 3, 4, 5] };
    expect(isOffHoursCell(workHours, new Date(2026, 7, 3), 8 * 60)).toBe(true);
    expect(isOffHoursCell(workHours, new Date(2026, 7, 3), 10 * 60)).toBe(
      false,
    );
    expect(isOffHoursCell(workHours, new Date(2026, 7, 8), 10 * 60)).toBe(true);
    expect(nowLineFraction(grid, 3, new Date(2026, 7, 6, 13), true)).toBe(0.5);
    expect(nowLineFraction(grid, 2, new Date(2026, 7, 6, 13), true)).toBeNull();
    expect(
      nowLineFraction(grid, 3, new Date(2026, 7, 6, 13), false),
    ).toBeNull();
    expect(schedulerGridAriaLabel(messages, 'Aug')).toBe(
      `Scheduler, Aug. ${messages.gridHint}`,
    );
    expect(
      schedulerCellAriaLabel(
        messages,
        cellDateAt(grid.days[0], 540),
        'en-US',
        'Ada',
      ),
    ).toMatch(/Monday, August 3, 2026, 9:00\sAM, Ada/);
    expect(buildGutterSlots(grid, 'en-US')).toHaveLength(10);
    expect(escapeAttr('a"b\\c')).toBe('a\\"b\\\\c');
  });
});

describe('month view model', () => {
  const month = buildMonthGrid(new Date(2026, 7, 6), 1);

  it('packs lanes under the budget and reports overflow', () => {
    const day = (h: number, k: number) =>
      appt(k, new Date(2026, 7, 6, h), new Date(2026, 7, 6, h + 1));
    const lanes = buildMonthWeekLayouts(
      [day(9, 1), day(10, 2), day(11, 3)],
      month.weeks,
      monthMaxLanes(2),
    );
    const overflow = monthOverflowEntries(lanes);
    expect(overflow.flat()).toEqual([{ dayIndex: 3, count: 1 }]);
    expect(monthChipOrder(lanes)).toHaveLength(2);
    expect(schedulerMoreText(messages, 1)).toBe('+1 more');
    expect(monthMaxLanes('auto')).toBe(3);
  });

  it('maps pointer positions to cells and appointments to their origin', () => {
    const rect = { left: 0, top: 0, width: 700, height: 600 };
    expect(monthDropCell(350, 150, rect)).toEqual({ week: 1, day: 3 });
    expect(monthDropCell(-5, 900, rect)).toEqual({ week: 5, day: 0 });
    expect(
      monthOriginIndex(
        month.weeks,
        appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10)),
      ),
    ).toBe(10);
  });
});

describe('timeline view model', () => {
  const timeline = buildTimelineGrid(
    'timelineDay',
    new Date(2026, 7, 6),
    1,
    8,
    18,
    30,
  );

  it('builds one row per resource plus unassigned', () => {
    const rows = buildTimelineRows(
      [
        appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10), {
          source: { ownerId: 'a' },
        }),
        appt(2, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10)),
      ],
      timeline,
      30,
      { fieldExpr: 'ownerId', items: owners },
      (item: Src) => item.ownerId,
      'Unassigned',
    );
    expect(rows.map((row) => row.text)).toEqual(['Ada', 'Bo', 'Unassigned']);
    expect(rows[0].bars[0].leftPct).toBeCloseTo(10);
    expect(rows[0].bars[0].widthPct).toBeCloseTo(10);
  });

  it('labels hours and computes drag moves and target rows', () => {
    expect(timelineHourLabels(timeline, 'timelineDay', 'en-US')).toHaveLength(
      10,
    );
    const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
    const move = timelineDragMove(a, 100, 1000, timeline, 30, 10);
    expect(move.proposal.startDate).toEqual(new Date(2026, 7, 6, 10));
    expect(move.leftPct).toBeCloseTo(20);
    expect(
      timelineRowAt(
        50,
        [
          { top: 0, bottom: 40 },
          { top: 40, bottom: 80 },
        ],
        0,
      ),
    ).toBe(1);
    expect(timelineRowAt(500, [{ top: 0, bottom: 40 }], 0)).toBe(0);
  });
});

describe('agenda, year and chip view models', () => {
  it('groups agenda days, skipping empty ones, all-day first', () => {
    const days = buildAgendaDays(new Date(2026, 7, 6), 3, [
      appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10)),
      appt(2, new Date(2026, 7, 6), new Date(2026, 7, 7), {
        allDay: true,
        displayAllDay: true,
      }),
      appt(3, new Date(2026, 7, 8, 9), new Date(2026, 7, 8, 10)),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].appointments.map((entry) => entry.key)).toEqual([2, 1]);
    expect(
      agendaTimeText(days[0].appointments[0], days[0].day, 'en-US', 'All day'),
    ).toBe('All day');
  });

  it('counts busy days in the year overview', () => {
    const counts = countAppointmentsByDay([
      appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 8, 10)),
    ]);
    expect(counts.get('2026-7-7')).toBe(1);
    const months = buildYearMonths(2026, 1, counts, 'en-US');
    expect(months).toHaveLength(12);
    expect(months[7].title).toBe('August');
    const cell = months[7].weeks
      .flat()
      .find((entry) => entry.day.getDate() === 7 && !entry.otherMonth)!;
    expect(yearCellLabel(cell, 'en-US')).toMatch(/\(1\)$/);
  });

  it('picks a readable chip foreground', () => {
    expect(chipForeground(undefined)).toBeNull();
    expect(chipForeground('#000000')).not.toBeNull();
  });
});
