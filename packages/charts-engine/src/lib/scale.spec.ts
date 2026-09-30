import {
  categoryBandPx,
  clampRange,
  createCategoryScale,
  createLinearScale,
  createLogScale,
  createTimeScale,
  logTicks,
  niceStep,
  niceTicks,
  pickTimeUnit,
  timeTicks,
} from './scale';

describe('niceStep / niceTicks', () => {
  it('walks the 1-2-5 ladder', () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(7, 10)).toBe(1);
    expect(niceStep(0.9, 5)).toBe(0.2);
  });

  it('produces ticks inside the domain, snapping to zero', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(-5, 5, 5)).toEqual([-4, -2, 0, 2, 4]);
    expect(niceTicks(3, 3)).toEqual([3]); // degenerate span
  });
});

describe('linear scale', () => {
  const scale = createLinearScale({ min: 0, max: 100, rangePx: 400 });

  it('maps domain to px and back', () => {
    expect(scale.toPx(0)).toBe(0);
    expect(scale.toPx(50)).toBe(200);
    expect(scale.toPx(100)).toBe(400);
    expect(scale.fromPx(300)).toBe(75);
  });

  it('inverts for value axes (px 0 at the top = max)', () => {
    const inverted = createLinearScale({
      min: 0,
      max: 100,
      rangePx: 400,
      inverted: true,
    });
    expect(inverted.toPx(100)).toBe(0);
    expect(inverted.toPx(0)).toBe(400);
    expect(inverted.fromPx(0)).toBe(100);
  });
});

describe('log scale', () => {
  it('spaces decades evenly and ticks powers of ten', () => {
    const scale = createLogScale({ min: 1, max: 1000, rangePx: 300 });
    expect(scale.toPx(1)).toBeCloseTo(0);
    expect(scale.toPx(10)).toBeCloseTo(100);
    expect(scale.toPx(100)).toBeCloseTo(200);
    expect(scale.ticks).toEqual([1, 10, 100, 1000]);
    expect(logTicks(5, 500)).toEqual([10, 100]);
  });

  it('clamps a non-positive domain honestly', () => {
    const scale = createLogScale({ min: 0, max: 100, rangePx: 100 });
    expect(scale.min).toBeGreaterThan(0);
  });
});

describe('category scale', () => {
  it('centers bands and ticks every category', () => {
    const scale = createCategoryScale({ count: 4, rangePx: 400 });
    expect(scale.toPx(0)).toBe(50); // first band center
    expect(scale.toPx(3)).toBe(350);
    expect(scale.ticks).toEqual([0, 1, 2, 3]);
    expect(categoryBandPx(scale, 4)).toBe(100);
  });
});

describe('time ticks', () => {
  it('picks calendar units by span', () => {
    expect(pickTimeUnit(3_600_000, 6).unit).toBe('minute');
    expect(pickTimeUnit(86_400_000, 6).unit).toBe('hour');
    expect(pickTimeUnit(14 * 86_400_000, 6).unit).toBe('day');
    expect(pickTimeUnit(90 * 86_400_000, 6).unit).toBe('week');
    expect(pickTimeUnit(365 * 86_400_000, 6).unit).toBe('month');
    expect(pickTimeUnit(10 * 365 * 86_400_000, 6).unit).toBe('year');
  });

  it('generates calendar-true month boundaries (real month lengths)', () => {
    const min = new Date(2026, 0, 15).getTime();
    const max = new Date(2026, 5, 15).getTime();
    const { ticks, unit } = timeTicks(min, max, 6);
    expect(unit).toBe('month');
    expect(ticks.map((ms) => new Date(ms).getDate())).toEqual(
      ticks.map(() => 1),
    );
    expect(new Date(ticks[0]).getMonth()).toBe(1); // February 1
  });

  it('week ticks land on the first day of week', () => {
    const min = new Date(2026, 7, 4).getTime(); // Tue
    const max = new Date(2026, 8, 20).getTime();
    const { ticks, unit } = timeTicks(min, max, 6, 1);
    expect(unit).toBe('week');
    for (const ms of ticks) expect(new Date(ms).getDay()).toBe(1); // Mondays
  });

  it('createTimeScale carries the unit and maps linearly', () => {
    const min = new Date(2026, 0, 1).getTime();
    const max = new Date(2026, 0, 31).getTime();
    const scale = createTimeScale({ min, max, rangePx: 300 });
    expect(scale.kind).toBe('time');
    expect(scale.tickUnit).toBeDefined();
    expect(scale.toPx(min)).toBe(0);
    expect(scale.toPx(max)).toBe(300);
  });
});

describe('clampRange', () => {
  const bounds = { min: 0, max: 100 };

  it('clamps a window that slides past the edges', () => {
    expect(clampRange({ min: -10, max: 20 }, bounds)).toEqual({
      min: 0,
      max: 30,
    });
    expect(clampRange({ min: 90, max: 120 }, bounds)).toEqual({
      min: 70,
      max: 100,
    });
  });

  it('enforces the minimum span and never exceeds the bounds', () => {
    expect(clampRange({ min: 50, max: 50.1 }, bounds, 10)).toEqual({
      min: 50,
      max: 60,
    });
    expect(clampRange({ min: -50, max: 250 }, bounds)).toEqual(bounds);
  });
});
