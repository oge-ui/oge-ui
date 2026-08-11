import {
  buildGanttScale,
  dateToPx,
  pxToDate,
  snapToUnit,
  GANTT_TICK_WIDTH,
} from './time-scale';

describe('time-scale', () => {
  const start = new Date(2026, 0, 5); // Monday
  const end = new Date(2026, 0, 16);

  it('builds a days scale with one padding unit each side', () => {
    const scale = buildGanttScale(start, end, 'days', 1);
    expect(scale.ticks[0].date).toEqual(new Date(2026, 0, 4));
    expect(scale.end.getTime()).toBeGreaterThan(end.getTime());
    expect(scale.totalPx).toBe(scale.ticks.length * GANTT_TICK_WIDTH.days);
    // majors are week segments on the days scale
    expect(scale.majorTicks.length).toBeGreaterThanOrEqual(2);
  });

  it('dateToPx and pxToDate are inverse within a tick', () => {
    const scale = buildGanttScale(start, end, 'days', 1);
    const px = dateToPx(scale, new Date(2026, 0, 7, 12));
    const back = pxToDate(scale, px);
    expect(Math.abs(back.getTime() - new Date(2026, 0, 7, 12).getTime()))
      .toBeLessThan(60_000);
  });

  it('months scale keeps calendar-true ticks with uneven widths handled', () => {
    const scale = buildGanttScale(
      new Date(2026, 0, 15),
      new Date(2026, 5, 15),
      'months',
      1,
    );
    expect(scale.ticks[0].date).toEqual(new Date(2025, 11, 1));
    const feb = dateToPx(scale, new Date(2026, 1, 1));
    const mar = dateToPx(scale, new Date(2026, 2, 1));
    expect(mar).toBeGreaterThan(feb);
  });

  it('snapToUnit rounds to the nearest unit boundary', () => {
    const scale = buildGanttScale(start, end, 'days', 1);
    expect(snapToUnit(scale, new Date(2026, 0, 7, 5), 1)).toEqual(
      new Date(2026, 0, 7),
    );
    expect(snapToUnit(scale, new Date(2026, 0, 7, 19), 1)).toEqual(
      new Date(2026, 0, 8),
    );
  });

  it('weeks scale aligns to the first day of week', () => {
    const scale = buildGanttScale(start, end, 'weeks', 1);
    expect(scale.ticks[0].date.getDay()).toBe(1); // Monday
  });
});
