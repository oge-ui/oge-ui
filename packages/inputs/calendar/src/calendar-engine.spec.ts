import {
  decadeCells,
  isDayDisabled,
  monthCells,
  navigate,
  resolveFirstDayOfWeek,
  viewLabel,
  weekdayNames,
  yearCells,
} from './calendar-engine';

describe('calendar-engine', () => {
  it('monthCells yields 42 aligned cells with otherPeriod flags', () => {
    const cells = monthCells(
      new Date(2026, 7, 15),
      1,
      'en-US',
      undefined,
      undefined,
      undefined,
    );
    expect(cells).toHaveLength(42);
    expect(cells[0].date).toEqual(new Date(2026, 6, 27)); // Monday lead-in
    expect(cells[0].otherPeriod).toBe(true);
    const first = cells.find((cell) => cell.text === '1' && !cell.otherPeriod);
    expect(first?.date).toEqual(new Date(2026, 7, 1));
  });

  it('isDayDisabled honors min/max day bounds and disabledDates', () => {
    const min = new Date(2026, 7, 10, 18); // time part must not matter
    const max = new Date(2026, 7, 20);
    expect(isDayDisabled(new Date(2026, 7, 10), min, max, undefined)).toBe(
      false,
    );
    expect(isDayDisabled(new Date(2026, 7, 9), min, max, undefined)).toBe(true);
    expect(isDayDisabled(new Date(2026, 7, 21), min, max, undefined)).toBe(
      true,
    );
    expect(
      isDayDisabled(new Date(2026, 7, 15), undefined, undefined, [
        new Date(2026, 7, 15),
      ]),
    ).toBe(true);
    expect(
      isDayDisabled(
        new Date(2026, 7, 16),
        undefined,
        undefined,
        (d) => d.getDay() === 0,
      ),
    ).toBe(d16IsSunday());
  });

  it('yearCells and decadeCells disable fully out-of-range periods', () => {
    const min = new Date(2026, 5, 1);
    const months = yearCells(new Date(2026, 0, 1), 'en-US', min, undefined);
    expect(months).toHaveLength(12);
    expect(months[4].disabled).toBe(true); // May ends before min
    expect(months[5].disabled).toBe(false); // June contains min
    const years = decadeCells(new Date(2026, 0, 1), undefined, undefined);
    expect(years).toHaveLength(12);
    expect(years.map((c) => c.text)[0]).toBe('2019'); // decade neighbor
    expect(years[0].otherPeriod).toBe(true);
    expect(years[1].text).toBe('2020');
  });

  it('weekdayNames aligns to firstDayOfWeek', () => {
    const sundayFirst = weekdayNames('en-US', 0);
    const mondayFirst = weekdayNames('en-US', 1);
    expect(sundayFirst[0]).toBe('Sun');
    expect(mondayFirst[0]).toBe('Mon');
    expect(mondayFirst[6]).toBe('Sun');
  });

  it('viewLabel and navigate follow the zoom level', () => {
    const anchor = new Date(2026, 7, 15);
    expect(viewLabel(anchor, 'month', 'en-US')).toBe('August 2026');
    expect(viewLabel(anchor, 'year', 'en-US')).toBe('2026');
    expect(viewLabel(anchor, 'decade', 'en-US')).toBe('2020–2029');
    expect(navigate(anchor, 'month', 1).getMonth()).toBe(8);
    expect(navigate(anchor, 'year', -1).getFullYear()).toBe(2025);
    expect(navigate(anchor, 'decade', 1).getFullYear()).toBe(2036);
  });

  it('resolveFirstDayOfWeek: explicit wins, fallback is deterministic', () => {
    expect(resolveFirstDayOfWeek(1, 'en-US')).toBe(1);
    expect(resolveFirstDayOfWeek(7, 'en-US')).toBe(0); // normalized
    const resolved = resolveFirstDayOfWeek(undefined, 'en-US');
    expect(resolved).toBeGreaterThanOrEqual(0);
    expect(resolved).toBeLessThanOrEqual(6);
  });
});

function d16IsSunday(): boolean {
  return new Date(2026, 7, 16).getDay() === 0;
}
