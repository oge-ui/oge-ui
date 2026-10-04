import {
  CHART_BREAK_GAP_PX,
  addChartDateInterval,
  applyChartTickOptions,
  chartDateIntervalUnit,
  chartMinorTicks,
  createBrokenLinearScale,
  isChartDateInterval,
  normalizeChartBreaks,
  offsetChartScale,
} from './axis-scale';
import {
  createCategoryScale,
  createLinearScale,
  createLogScale,
  createTimeScale,
} from './scale';

describe('offsetChartScale', () => {
  it('shifts toPx/fromPx and the break centers by the pane offset', () => {
    const base = createBrokenLinearScale({
      min: 0,
      max: 100,
      rangePx: 200,
      breaks: [{ start: 40, end: 60 }],
    });
    const shifted = offsetChartScale(base, 50);
    expect(shifted.toPx(0)).toBe(base.toPx(0) + 50);
    expect(shifted.fromPx(shifted.toPx(80))).toBeCloseTo(80);
    expect(shifted.breaks?.[0].px).toBe((base.breaks?.[0].px ?? 0) + 50);
    expect(offsetChartScale(base, 0)).toBe(base);
  });
});

describe('createBrokenLinearScale', () => {
  it('is a plain linear scale without valid breaks', () => {
    const scale = createBrokenLinearScale({
      min: 0,
      max: 10,
      rangePx: 100,
      breaks: [{ start: 20, end: 30 }],
    });
    expect(scale.breaks).toBeUndefined();
    expect(scale.toPx(5)).toBe(50);
  });

  it('collapses the break into a fixed gap and maps both sides linearly', () => {
    const scale = createBrokenLinearScale({
      min: 0,
      max: 1000,
      rangePx: 212,
      breaks: [{ start: 100, end: 900 }],
    });
    // 200 domain units over 200 usable px (212 − one 12px gap)
    expect(scale.toPx(0)).toBeCloseTo(0);
    expect(scale.toPx(100)).toBeCloseTo(100);
    expect(scale.toPx(900)).toBeCloseTo(100 + CHART_BREAK_GAP_PX);
    expect(scale.toPx(1000)).toBeCloseTo(212);
    // a value inside the break lands inside the gap
    expect(scale.toPx(500)).toBeCloseTo(106);
    expect(scale.fromPx(scale.toPx(950))).toBeCloseTo(950);
    expect(scale.breaks).toEqual([{ start: 100, end: 900, px: 106 }]);
    // no tick inside the skipped range
    expect(scale.ticks.some((tick) => tick > 100 && tick < 900)).toBe(false);
  });

  it('inverts like the value axes do (higher values up)', () => {
    const scale = createBrokenLinearScale({
      min: 0,
      max: 1000,
      rangePx: 212,
      inverted: true,
      breaks: [{ start: 100, end: 900 }],
    });
    expect(scale.toPx(0)).toBeCloseTo(212);
    expect(scale.toPx(1000)).toBeCloseTo(0);
    expect(scale.breaks?.[0].px).toBeCloseTo(106);
    expect(scale.fromPx(scale.toPx(50))).toBeCloseTo(50);
  });

  it('normalizes breaks: sorted, merged, clipped, degenerate dropped', () => {
    expect(
      normalizeChartBreaks(
        [
          { start: 60, end: 50 },
          { start: 10, end: 30 },
          { start: 25, end: 40 },
          { start: 5, end: 5 },
          { start: 200, end: 300 },
        ],
        0,
        100,
      ),
    ).toEqual([
      { start: 10, end: 40 },
      { start: 50, end: 60 },
    ]);
    expect(normalizeChartBreaks([{ start: -10, end: 200 }], 0, 100)).toEqual(
      [],
    );
  });
});

describe('applyChartTickOptions', () => {
  it('steps numeric ticks by tickInterval', () => {
    const scale = applyChartTickOptions(
      createLinearScale({ min: 0, max: 100, rangePx: 300 }),
      { tickInterval: 25 },
    );
    expect(scale.ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it('keeps every n-th category', () => {
    const scale = applyChartTickOptions(
      createCategoryScale({ count: 7, rangePx: 700 }),
      { tickInterval: 3 },
    );
    expect(scale.ticks).toEqual([0, 3, 6]);
  });

  it('steps time ticks by a calendar interval on real boundaries', () => {
    const min = new Date(2026, 0, 3).getTime();
    const max = new Date(2026, 1, 20).getTime();
    const weekly = applyChartTickOptions(
      createTimeScale({ min, max, rangePx: 600 }),
      { tickInterval: { weeks: 1 } },
    );
    expect(weekly.tickUnit).toBe('week');
    // Mondays (firstDayOfWeek 1)
    expect(weekly.ticks.every((tick) => new Date(tick).getDay() === 1)).toBe(
      true,
    );
    const monthly = applyChartTickOptions(
      createTimeScale({ min, max, rangePx: 600 }),
      { tickInterval: { months: 1 } },
    );
    expect(monthly.ticks).toEqual([new Date(2026, 1, 1).getTime()]);
    expect(monthly.tickUnit).toBe('month');
  });

  it('keeps ticks on whole numbers with allowDecimals: false', () => {
    const raw = createLinearScale({ min: 0, max: 3, rangePx: 300 });
    expect(raw.ticks.some((tick) => !Number.isInteger(tick))).toBe(true);
    const whole = applyChartTickOptions(raw, { allowDecimals: false });
    expect(whole.ticks).toEqual([0, 1, 2, 3]);
  });

  it('fills minor ticks between the majors', () => {
    const scale = applyChartTickOptions(
      createLinearScale({ min: 0, max: 20, rangePx: 300 }),
      { tickInterval: 10, minorTicks: { count: 1 } },
    );
    expect(scale.minorTicks).toEqual([5, 15]);
    expect(
      applyChartTickOptions(
        createLinearScale({ min: 0, max: 20, rangePx: 1 }),
        {
          minorTicks: { visible: false },
        },
      ).minorTicks,
    ).toBeUndefined();
  });
});

describe('chartMinorTicks', () => {
  it('uses 2…9 × 10ⁿ on log scales', () => {
    const scale = createLogScale({ min: 1, max: 100, rangePx: 200 });
    expect(chartMinorTicks(scale, scale.ticks, 4)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 20, 30, 40, 50, 60, 70, 80, 90,
    ]);
  });

  it('leaves the interval across a break empty', () => {
    const scale = createBrokenLinearScale({
      min: 0,
      max: 1000,
      rangePx: 300,
      breaks: [{ start: 150, end: 850 }],
    });
    const minors = chartMinorTicks(scale, [0, 100, 900, 1000], 1);
    expect(minors).toEqual([50, 950]);
  });
});

describe('calendar intervals', () => {
  it('detects interval objects (not ranges)', () => {
    expect(isChartDateInterval({ days: 7 })).toBe(true);
    expect(isChartDateInterval({ min: 0, max: 1 })).toBe(false);
    expect(isChartDateInterval(5)).toBe(false);
  });

  it('adds and subtracts in local calendar fields', () => {
    const jan31 = new Date(2026, 0, 31).getTime();
    expect(
      new Date(addChartDateInterval(jan31, { months: 1 })).getMonth(),
    ).toBe(2); // Jan 31 + 1 month rolls into March, like Date does
    const mar15 = new Date(2026, 2, 15).getTime();
    expect(addChartDateInterval(mar15, { months: 3 }, -1)).toBe(
      new Date(2025, 11, 15).getTime(),
    );
    expect(chartDateIntervalUnit({ days: 2 })).toBe('day');
    expect(chartDateIntervalUnit({ years: 1, days: 2 })).toBe('year');
  });
});
