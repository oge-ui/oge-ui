import { buildMonthWeekLanes } from './month-layout';
import type { SchedulerAppointment } from './scheduler-model';

function appointment(
  key: number,
  startDate: Date,
  endDate: Date,
  allDay = false,
): SchedulerAppointment<{ id: number }> {
  return {
    key,
    source: { id: key },
    text: `A${key}`,
    startDate,
    endDate,
    allDay,
    displayAllDay: allDay,
    color: undefined,
    location: undefined,
    description: undefined,
    reminderMinutes: undefined,
    recurrenceRule: undefined,
    recurrenceException: undefined,
    disabled: false,
    seriesKey: null,
  };
}

// Monday 2026-08-03 … Sunday 2026-08-09
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 3 + i));

describe('buildMonthWeekLanes', () => {
  it('maps a single-day timed appointment onto its day column', () => {
    const layout = buildMonthWeekLanes(
      [appointment(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10))],
      WEEK,
      3,
    );
    expect(layout.visible).toHaveLength(1);
    expect(layout.visible[0].startDayIndex).toBe(3);
    expect(layout.visible[0].endDayIndex).toBe(3);
    expect(layout.visible[0].clippedStart).toBe(false);
  });

  it('spans multi-day appointments and clips them to the week', () => {
    const layout = buildMonthWeekLanes(
      [appointment(1, new Date(2026, 7, 1), new Date(2026, 7, 12), true)],
      WEEK,
      3,
    );
    expect(layout.visible).toHaveLength(1);
    expect(layout.visible[0].startDayIndex).toBe(0);
    expect(layout.visible[0].endDayIndex).toBe(6);
    expect(layout.visible[0].clippedStart).toBe(true);
    expect(layout.visible[0].clippedEnd).toBe(true);
  });

  it('does not occupy the day a half-open end lands on at midnight', () => {
    const layout = buildMonthWeekLanes(
      [appointment(1, new Date(2026, 7, 4), new Date(2026, 7, 6), true)],
      WEEK,
      3,
    );
    // Aug 4 00:00 – Aug 6 00:00 occupies Tue + Wed only
    expect(layout.visible[0].startDayIndex).toBe(1);
    expect(layout.visible[0].endDayIndex).toBe(2);
  });

  it('sorts span bars above timed items on the same start day', () => {
    const layout = buildMonthWeekLanes(
      [
        appointment(1, new Date(2026, 7, 4, 9), new Date(2026, 7, 4, 10)),
        appointment(2, new Date(2026, 7, 4), new Date(2026, 7, 7), true),
      ],
      WEEK,
      3,
    );
    const spanBar = layout.visible.find((e) => e.appointment.key === 2);
    const timed = layout.visible.find((e) => e.appointment.key === 1);
    expect(spanBar?.lane).toBe(0);
    expect(timed?.lane).toBe(1);
  });

  it('orders same-day timed items by start time', () => {
    const layout = buildMonthWeekLanes(
      [
        appointment(1, new Date(2026, 7, 4, 14), new Date(2026, 7, 4, 15)),
        appointment(2, new Date(2026, 7, 4, 9), new Date(2026, 7, 4, 10)),
      ],
      WEEK,
      3,
    );
    expect(layout.visible.find((e) => e.appointment.key === 2)?.lane).toBe(0);
    expect(layout.visible.find((e) => e.appointment.key === 1)?.lane).toBe(1);
  });

  it('ignores appointments outside the week', () => {
    const layout = buildMonthWeekLanes(
      [appointment(1, new Date(2026, 7, 10, 9), new Date(2026, 7, 10, 10))],
      WEEK,
      3,
    );
    expect(layout.visible).toEqual([]);
  });

  it('feeds the lane cap through to overflow counts', () => {
    const monday = (h: number) => new Date(2026, 7, 3, h);
    const layout = buildMonthWeekLanes(
      [
        appointment(1, monday(8), monday(9)),
        appointment(2, monday(9), monday(10)),
        appointment(3, monday(10), monday(11)),
      ],
      WEEK,
      2,
    );
    expect(layout.visible).toHaveLength(2);
    expect(layout.overflowByDay.get(0)).toBe(1);
  });
});
