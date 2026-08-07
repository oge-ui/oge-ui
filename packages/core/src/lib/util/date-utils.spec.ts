import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  monthMatrix,
  nextDay,
  sameDay,
  sameMonth,
  serializeLikeOriginal,
  startOfDay,
  toLocalDate,
  weekNumber,
} from './date-utils';

describe('date-utils', () => {
  it('startOfDay / nextDay bound a local day', () => {
    const date = new Date(2026, 7, 6, 15, 30, 45);
    expect(startOfDay(date)).toEqual(new Date(2026, 7, 6));
    expect(nextDay(date)).toEqual(new Date(2026, 7, 7));
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 1));
    expect(addDays(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
    expect(addDays(new Date(2026, 2, 1), -1)).toEqual(new Date(2026, 1, 28));
  });

  it('addMonths clamps the day at short months (incl. leap years)', () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
    expect(addMonths(new Date(2024, 0, 31), 1)).toEqual(new Date(2024, 1, 29));
    expect(addMonths(new Date(2026, 4, 15), -3)).toEqual(new Date(2026, 1, 15));
    expect(addYears(new Date(2024, 1, 29), 1)).toEqual(new Date(2025, 1, 28));
  });

  it('sameDay / sameMonth compare by calendar fields', () => {
    expect(sameDay(new Date(2026, 5, 1, 0, 1), new Date(2026, 5, 1, 23))).toBe(
      true,
    );
    expect(sameDay(new Date(2026, 5, 1), new Date(2026, 5, 2))).toBe(false);
    expect(sameDay(null, null)).toBe(true);
    expect(sameDay(new Date(), null)).toBe(false);
    expect(sameMonth(new Date(2026, 5, 1), new Date(2026, 5, 30))).toBe(true);
    expect(sameMonth(new Date(2026, 5, 1), new Date(2026, 6, 1))).toBe(false);
  });

  it('clampDate respects optional bounds', () => {
    const min = new Date(2026, 0, 10);
    const max = new Date(2026, 0, 20);
    expect(clampDate(new Date(2026, 0, 5), min, max)).toEqual(min);
    expect(clampDate(new Date(2026, 0, 25), min, max)).toEqual(max);
    expect(clampDate(new Date(2026, 0, 15), min, max)).toEqual(
      new Date(2026, 0, 15),
    );
    expect(clampDate(new Date(1999, 0, 1), undefined, max)).toEqual(
      new Date(1999, 0, 1),
    );
  });

  it('monthMatrix yields 42 aligned days covering the whole month', () => {
    // August 2026 starts on a Saturday; week starts Monday (1)
    const matrix = monthMatrix(2026, 7, 1);
    expect(matrix).toHaveLength(42);
    expect(matrix[0]).toEqual(new Date(2026, 6, 27)); // Monday before Aug 1
    expect(matrix[5]).toEqual(new Date(2026, 7, 1));
    expect(matrix[41]).toEqual(new Date(2026, 8, 6));
    // Sunday-start (0) alignment
    const sunday = monthMatrix(2026, 7, 0);
    expect(sunday[0].getDay()).toBe(0);
  });

  it('weekNumber follows the three rules', () => {
    // ISO 8601: 2026-01-01 is a Thursday → week 1
    expect(weekNumber(new Date(2026, 0, 1), 'firstFourDays')).toBe(1);
    // 2027-01-01 is a Friday → ISO week 53 of 2026
    expect(weekNumber(new Date(2027, 0, 1), 'firstFourDays')).toBe(53);
    expect(weekNumber(new Date(2026, 0, 1), 'firstDay')).toBe(1);
    // fullWeek: week 1 is the first complete week of the year
    expect(weekNumber(new Date(2026, 0, 4), 'fullWeek')).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('serializeLikeOriginal preserves the storage type', () => {
    const next = new Date(2026, 7, 6, 14, 30);
    expect(serializeLikeOriginal(next, new Date(2020, 0, 1))).toBe(next);
    expect(serializeLikeOriginal(next, '2020-01-01')).toBe('2026-08-06');
    expect(serializeLikeOriginal(next, null)).toBe(next);
    expect(serializeLikeOriginal(null, '2020-01-01')).toBeNull();
  });

  it('toLocalDate parses date strings as LOCAL midnight, never UTC', () => {
    const parsed = toLocalDate('2026-08-06');
    expect(parsed).toEqual(new Date(2026, 7, 6)); // would fail via Date.parse in non-UTC zones
    expect(toLocalDate('2026-08-06T14:30')).toEqual(
      new Date(2026, 7, 6, 14, 30),
    );
    expect(toLocalDate(new Date(2026, 1, 2))).toEqual(new Date(2026, 1, 2));
    expect(toLocalDate('garbage')).toBeNull();
    expect(toLocalDate(undefined)).toBeNull();
  });
});
