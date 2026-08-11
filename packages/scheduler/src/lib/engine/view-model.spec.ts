import type { SchedulerAppointment } from './scheduler-model';
import {
  buildMonthGrid,
  buildTimeGrid,
  navigateDate,
  partitionAllDay,
  segmentTimedAppointments,
  viewRange,
} from './view-model';

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
    recurrenceRule: undefined,
    recurrenceException: undefined,
    disabled: false,
    seriesKey: null,
  };
}

describe('view-model', () => {
  describe('buildTimeGrid', () => {
    it('builds a single day for the day view', () => {
      const grid = buildTimeGrid({
        anchorDate: new Date(2026, 7, 6, 14, 30), // Thursday
        view: 'day',
        firstDayOfWeek: 1,
        dayStartHour: 8,
        dayEndHour: 18,
        cellDuration: 30,
      });
      expect(grid.days).toEqual([new Date(2026, 7, 6)]);
      expect(grid.slotStartMinutes).toHaveLength(20);
      expect(grid.slotStartMinutes[0]).toBe(480);
      expect(grid.slotStartMinutes[19]).toBe(1050);
      expect(grid.rangeStart).toEqual(new Date(2026, 7, 6));
      expect(grid.rangeEnd).toEqual(new Date(2026, 7, 7));
    });

    it('builds a week-aligned 7-day grid for the week view', () => {
      const grid = buildTimeGrid({
        anchorDate: new Date(2026, 7, 6), // Thursday
        view: 'week',
        firstDayOfWeek: 1,
        dayStartHour: 0,
        dayEndHour: 24,
        cellDuration: 60,
      });
      expect(grid.days).toHaveLength(7);
      expect(grid.days[0]).toEqual(new Date(2026, 7, 3)); // Monday
      expect(grid.days[6]).toEqual(new Date(2026, 7, 9));
      expect(grid.slotStartMinutes).toHaveLength(24);
      expect(grid.rangeEnd).toEqual(new Date(2026, 7, 10));
    });

    it('keeps 7 calendar days across a DST-length week', () => {
      // late March — a DST transition week in most of Europe
      const grid = buildTimeGrid({
        anchorDate: new Date(2026, 2, 26),
        view: 'week',
        firstDayOfWeek: 1,
        dayStartHour: 0,
        dayEndHour: 24,
        cellDuration: 30,
      });
      expect(grid.days).toHaveLength(7);
      const dates = grid.days.map((d) => d.getDate());
      expect(dates).toEqual([23, 24, 25, 26, 27, 28, 29]);
    });
  });

  it('buildMonthGrid produces 6 weeks of 7 days', () => {
    const grid = buildMonthGrid(new Date(2026, 7, 15), 1);
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
    // August 2026 starts on a Saturday; Monday-first grid leads with Jul 27
    expect(grid.weeks[0][0]).toEqual(new Date(2026, 6, 27));
    expect(grid.rangeEnd).toEqual(new Date(2026, 8, 7));
  });

  it('viewRange returns half-open period bounds', () => {
    expect(viewRange('day', new Date(2026, 7, 6, 15), 1)).toEqual({
      start: new Date(2026, 7, 6),
      end: new Date(2026, 7, 7),
    });
    expect(viewRange('week', new Date(2026, 7, 6), 1)).toEqual({
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 10),
    });
    const month = viewRange('month', new Date(2026, 7, 6), 1);
    expect(month.start).toEqual(new Date(2026, 6, 27));
    expect(month.end).toEqual(new Date(2026, 8, 7));
  });

  it('navigateDate steps one period and anchors month steps to the 1st', () => {
    expect(navigateDate('day', new Date(2026, 7, 6), 1)).toEqual(
      new Date(2026, 7, 7),
    );
    expect(navigateDate('week', new Date(2026, 7, 6), -1)).toEqual(
      new Date(2026, 6, 30),
    );
    expect(navigateDate('month', new Date(2026, 7, 31), 1)).toEqual(
      new Date(2026, 8, 1),
    );
    // Jan 31 − 1 month clamps (Dec 31 ← via addMonths) then anchors to the 1st
    expect(navigateDate('month', new Date(2026, 0, 31), 1)).toEqual(
      new Date(2026, 1, 1),
    );
  });

  it('partitionAllDay splits on displayAllDay', () => {
    const a = appointment(1, new Date(2026, 7, 6), new Date(2026, 7, 7), true);
    const b = appointment(
      2,
      new Date(2026, 7, 6, 9),
      new Date(2026, 7, 6, 10),
    );
    const { allDay, timed } = partitionAllDay([a, b]);
    expect(allDay).toEqual([a]);
    expect(timed).toEqual([b]);
  });

  describe('segmentTimedAppointments', () => {
    const grid = buildTimeGrid({
      anchorDate: new Date(2026, 7, 6),
      view: 'week',
      firstDayOfWeek: 1,
      dayStartHour: 8,
      dayEndHour: 18,
      cellDuration: 30,
    });

    it('produces one segment for a same-day appointment', () => {
      const segments = segmentTimedAppointments(
        [appointment(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10, 30))],
        grid,
      );
      expect(segments).toHaveLength(1);
      expect(segments[0].dayIndex).toBe(3); // Thursday in a Monday-first week
      expect(segments[0].startMinutes).toBe(540);
      expect(segments[0].endMinutes).toBe(630);
      expect(segments[0].clippedStart).toBe(false);
      expect(segments[0].clippedEnd).toBe(false);
    });

    it('splits a midnight-crossing appointment into per-day segments', () => {
      const segments = segmentTimedAppointments(
        [appointment(1, new Date(2026, 7, 6, 16), new Date(2026, 7, 7, 10))],
        grid,
      );
      expect(segments).toHaveLength(2);
      expect(segments[0].dayIndex).toBe(3);
      expect(segments[0].startMinutes).toBe(960);
      expect(segments[0].endMinutes).toBe(1080); // clipped to 18:00
      expect(segments[0].clippedEnd).toBe(true);
      expect(segments[1].dayIndex).toBe(4);
      expect(segments[1].startMinutes).toBe(480); // clipped to 08:00
      expect(segments[1].endMinutes).toBe(600);
      expect(segments[1].clippedStart).toBe(true);
    });

    it('clips to the visible hour window and flags the clipping', () => {
      const segments = segmentTimedAppointments(
        [appointment(1, new Date(2026, 7, 6, 6), new Date(2026, 7, 6, 9))],
        grid,
      );
      expect(segments).toHaveLength(1);
      expect(segments[0].startMinutes).toBe(480);
      expect(segments[0].clippedStart).toBe(true);
    });

    it('drops segments entirely outside the window or the grid range', () => {
      expect(
        segmentTimedAppointments(
          [appointment(1, new Date(2026, 7, 6, 19), new Date(2026, 7, 6, 20))],
          grid,
        ),
      ).toEqual([]);
      expect(
        segmentTimedAppointments(
          [appointment(1, new Date(2026, 8, 1, 9), new Date(2026, 8, 1, 10))],
          grid,
        ),
      ).toEqual([]);
    });

    it('keeps zero-length appointments as zero-length segments', () => {
      const at = new Date(2026, 7, 6, 9);
      const segments = segmentTimedAppointments(
        [appointment(1, at, at)],
        grid,
      );
      expect(segments).toHaveLength(1);
      expect(segments[0].startMinutes).toBe(540);
      expect(segments[0].endMinutes).toBe(540);
    });
  });
});
