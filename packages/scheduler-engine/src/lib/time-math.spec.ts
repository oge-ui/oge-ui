import {
  clampMinutesToWindow,
  durationMinutes,
  minutesOfDay,
  setMinutesOfDay,
  slotCount,
  snapToSlot,
} from './time-math';

describe('time-math', () => {
  it('minutesOfDay reads local wall time', () => {
    expect(minutesOfDay(new Date(2026, 7, 6, 0, 0))).toBe(0);
    expect(minutesOfDay(new Date(2026, 7, 6, 14, 30))).toBe(870);
    expect(minutesOfDay(new Date(2026, 7, 6, 23, 59))).toBe(1439);
  });

  it('setMinutesOfDay builds a local date and rolls values ≥ 1440', () => {
    expect(setMinutesOfDay(new Date(2026, 7, 6, 22, 15), 870)).toEqual(
      new Date(2026, 7, 6, 14, 30),
    );
    expect(setMinutesOfDay(new Date(2026, 7, 6), 1440)).toEqual(
      new Date(2026, 7, 7, 0, 0),
    );
  });

  it('durationMinutes handles same-day and midnight-crossing ranges', () => {
    expect(
      durationMinutes(new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10, 30)),
    ).toBe(90);
    expect(
      durationMinutes(new Date(2026, 7, 6, 23), new Date(2026, 7, 7, 1)),
    ).toBe(120);
    expect(
      durationMinutes(new Date(2026, 7, 6, 9), new Date(2026, 7, 8, 9)),
    ).toBe(2880);
    expect(
      durationMinutes(new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 9)),
    ).toBe(0);
  });

  it('snapToSlot floors for hit tests and rounds for previews', () => {
    expect(snapToSlot(44, 30, 'floor')).toBe(30);
    expect(snapToSlot(44, 30, 'round')).toBe(30);
    expect(snapToSlot(46, 30, 'round')).toBe(60);
    expect(snapToSlot(59, 30, 'floor')).toBe(30);
    expect(snapToSlot(-14, 30, 'round') + 0).toBe(0); // -0 normalized
    expect(snapToSlot(-16, 30, 'round')).toBe(-30);
  });

  it('slotCount covers the window, rounding partial slots up', () => {
    expect(slotCount(0, 24, 30)).toBe(48);
    expect(slotCount(8, 18, 30)).toBe(20);
    expect(slotCount(8, 18, 45)).toBe(14); // 600 / 45 = 13.3 → 14
    expect(slotCount(18, 8, 30)).toBe(0); // inverted window
  });

  it('clampMinutesToWindow clamps into the visible hours', () => {
    expect(clampMinutesToWindow(400, 8, 18)).toBe(480);
    expect(clampMinutesToWindow(700, 8, 18)).toBe(700);
    expect(clampMinutesToWindow(1200, 8, 18)).toBe(1080);
  });
});
