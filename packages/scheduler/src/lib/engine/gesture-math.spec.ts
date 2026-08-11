import {
  fractionForMinutes,
  pointToGridPosition,
  proposeMove,
  proposeResize,
} from './gesture-math';
import type { SchedulerAppointment } from './scheduler-model';
import { buildTimeGrid } from './view-model';

function appointment(
  startDate: Date,
  endDate: Date,
  allDay = false,
): SchedulerAppointment<{ id: number }> {
  return {
    key: 1,
    source: { id: 1 },
    text: 'A',
    startDate,
    endDate,
    allDay,
    displayAllDay: allDay,
    color: undefined,
    description: undefined,
    recurrenceRule: undefined,
    recurrenceException: undefined,
    disabled: false,
  };
}

describe('gesture-math', () => {
  it('proposeMove shifts both ends, snapped to the slot raster', () => {
    const proposal = proposeMove(
      appointment(new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10)),
      1,
      44,
      30,
    );
    expect(proposal.startDate).toEqual(new Date(2026, 7, 7, 9, 30));
    expect(proposal.endDate).toEqual(new Date(2026, 7, 7, 10, 30));
  });

  it('proposeMove with deltaMinutes 0 preserves the time of day (month drag)', () => {
    const proposal = proposeMove(
      appointment(new Date(2026, 7, 6, 14, 15), new Date(2026, 7, 6, 15)),
      -2,
      0,
      30,
    );
    expect(proposal.startDate).toEqual(new Date(2026, 7, 4, 14, 15));
    expect(proposal.endDate).toEqual(new Date(2026, 7, 4, 15));
  });

  it('proposeResize adjusts one edge and enforces the minimum duration', () => {
    const base = appointment(new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
    const grown = proposeResize(base, 'end', 44, 30);
    expect(grown.endDate).toEqual(new Date(2026, 7, 6, 10, 30));
    expect(grown.startDate).toEqual(base.startDate);

    const shrunkPastMin = proposeResize(base, 'end', -90, 30);
    expect(shrunkPastMin.endDate).toEqual(new Date(2026, 7, 6, 9, 30));

    const topGrown = proposeResize(base, 'start', -30, 30);
    expect(topGrown.startDate).toEqual(new Date(2026, 7, 6, 8, 30));

    const topPastMin = proposeResize(base, 'start', 90, 30);
    expect(topPastMin.startDate).toEqual(new Date(2026, 7, 6, 9, 30));
  });

  const grid = buildTimeGrid({
    anchorDate: new Date(2026, 7, 6),
    view: 'week',
    firstDayOfWeek: 1,
    dayStartHour: 8,
    dayEndHour: 18,
    cellDuration: 30,
  });

  it('pointToGridPosition hit-tests day columns and floor-snaps minutes', () => {
    // 700px wide grid, 7 days → 100px per day; 600px tall, 600min window
    expect(pointToGridPosition(350, 65, 700, 600, grid)).toEqual({
      dayIndex: 3,
      minutes: 540, // 480 + 65 = 545 → floor to 09:00
    });
    expect(pointToGridPosition(0, 0, 700, 600, grid)).toEqual({
      dayIndex: 0,
      minutes: 480,
    });
    // clamped at the edges
    expect(pointToGridPosition(699, 599, 700, 600, grid).dayIndex).toBe(6);
    expect(pointToGridPosition(-5, -5, 700, 600, grid)).toEqual({
      dayIndex: 0,
      minutes: 480,
    });
    expect(pointToGridPosition(350, 700, 700, 600, grid).minutes).toBe(1080);
  });

  it('fractionForMinutes maps the window onto 0–1', () => {
    expect(fractionForMinutes(480, grid)).toBe(0);
    expect(fractionForMinutes(780, grid)).toBeCloseTo(0.5);
    expect(fractionForMinutes(1080, grid)).toBe(1);
    expect(fractionForMinutes(0, grid)).toBe(0); // clamped
    expect(fractionForMinutes(1440, grid)).toBe(1);
  });
});
