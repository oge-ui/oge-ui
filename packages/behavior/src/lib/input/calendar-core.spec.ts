import { describe, expect, it } from 'vitest';
import {
  decadeCells,
  isDayDisabled,
  monthCells,
  navigate,
  viewLabel,
  weekdayNames,
  yearCells,
} from './calendar-core';

const d = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

describe('isDayDisabled', () => {
  it('bounds by the DAY, not the instant — a same-day time never disables', () => {
    const min = new Date(2024, 4, 10, 18, 30);
    expect(
      isDayDisabled(new Date(2024, 4, 10, 9), min, undefined, undefined),
    ).toBe(false);
    expect(isDayDisabled(d(2024, 5, 9), min, undefined, undefined)).toBe(true);
  });

  it('bounds the far end the same way', () => {
    const max = new Date(2024, 4, 10, 1);
    expect(
      isDayDisabled(new Date(2024, 4, 10, 23), undefined, max, undefined),
    ).toBe(false);
    expect(isDayDisabled(d(2024, 5, 11), undefined, max, undefined)).toBe(true);
  });

  it('marks individual days from a list, ignoring their time of day', () => {
    const list = [new Date(2024, 4, 15, 12)];
    expect(isDayDisabled(d(2024, 5, 15), undefined, undefined, list)).toBe(
      true,
    );
    expect(isDayDisabled(d(2024, 5, 16), undefined, undefined, list)).toBe(
      false,
    );
  });

  it('accepts a predicate — weekends, holidays, a fetched list', () => {
    const weekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    expect(isDayDisabled(d(2024, 5, 11), undefined, undefined, weekend)).toBe(
      true,
    ); // Saturday
    expect(isDayDisabled(d(2024, 5, 13), undefined, undefined, weekend)).toBe(
      false,
    );
  });

  it('enables everything when nothing is configured', () => {
    expect(isDayDisabled(d(2024, 5, 15), undefined, undefined, undefined)).toBe(
      false,
    );
  });
});

describe('monthCells', () => {
  const cells = monthCells(
    d(2024, 5, 15),
    1, // Monday
    'en-US',
    undefined,
    undefined,
    undefined,
  );

  it('renders the full six-week grid', () => {
    expect(cells).toHaveLength(42);
  });

  it('starts on the configured first day of the week', () => {
    expect(cells[0].date.getDay()).toBe(1);
    expect(
      monthCells(
        d(2024, 5, 15),
        0,
        'en-US',
        undefined,
        undefined,
        undefined,
      )[0].date.getDay(),
    ).toBe(0);
  });

  it('dims the leading and trailing days of the neighbouring months', () => {
    expect(cells[0].otherPeriod).toBe(true); // 29 April
    expect(cells[cells.length - 1].otherPeriod).toBe(true);
    expect(cells.filter((cell) => !cell.otherPeriod)).toHaveLength(31);
  });

  it('labels cells with the locale day number', () => {
    expect(cells.find((cell) => !cell.otherPeriod)?.text).toBe('1');
  });

  it('carries the disabled gate onto every cell', () => {
    const gated = monthCells(
      d(2024, 5, 15),
      1,
      'en-US',
      d(2024, 5, 10),
      d(2024, 5, 20),
      undefined,
    );
    const enabled = gated.filter((cell) => !cell.disabled).map((c) => c.date);
    expect(enabled).toHaveLength(11);
    expect(enabled[0].getDate()).toBe(10);
    expect(enabled[enabled.length - 1].getDate()).toBe(20);
  });
});

describe('yearCells', () => {
  it('renders the twelve months of the anchor year', () => {
    const cells = yearCells(d(2024, 5, 15), 'en-US', undefined, undefined);
    expect(cells).toHaveLength(12);
    expect(cells.map((cell) => cell.date.getMonth())).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(cells[0].text).toBe('Jan');
    expect(cells.every((cell) => !cell.otherPeriod)).toBe(true);
  });

  it('keeps a month enabled while any day of it is in range', () => {
    // min lands mid-May: May must stay pickable, April must not
    const cells = yearCells(d(2024, 5, 15), 'en-US', d(2024, 5, 20), undefined);
    expect(cells[4].disabled).toBe(false); // May
    expect(cells[3].disabled).toBe(true); // April
  });

  it('disables months past max', () => {
    const cells = yearCells(d(2024, 5, 15), 'en-US', undefined, d(2024, 5, 1));
    expect(cells[4].disabled).toBe(false);
    expect(cells[5].disabled).toBe(true);
  });
});

describe('decadeCells', () => {
  const cells = decadeCells(d(2024, 5, 15), undefined, undefined);

  it('renders the decade plus one neighbour on each side', () => {
    expect(cells.map((cell) => cell.text)).toEqual([
      '2019',
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
      '2027',
      '2028',
      '2029',
      '2030',
    ]);
  });

  it('dims the two neighbours', () => {
    expect(cells.map((cell) => cell.otherPeriod)).toEqual([
      true,
      ...Array(10).fill(false),
      true,
    ]);
  });

  it('keeps a year enabled while any day of it is in range', () => {
    const cells = decadeCells(d(2024, 5, 15), d(2024, 12, 31), undefined);
    expect(cells[5].disabled).toBe(false); // 2024
    expect(cells[4].disabled).toBe(true); // 2023
  });
});

describe('weekdayNames', () => {
  it('rotates the header to the first day of the week', () => {
    expect(weekdayNames('en-US', 0)[0]).toBe('Sun');
    expect(weekdayNames('en-US', 1)[0]).toBe('Mon');
    expect(weekdayNames('en-US', 6)[0]).toBe('Sat');
  });

  it('returns exactly seven, localized', () => {
    const names = weekdayNames('de-DE', 1);
    expect(names).toHaveLength(7);
    expect(names[0]).toBe('Mo');
  });
});

describe('viewLabel', () => {
  it('labels each zoom level', () => {
    expect(viewLabel(d(2024, 5, 15), 'month', 'en-US')).toBe('May 2024');
    expect(viewLabel(d(2024, 5, 15), 'year', 'en-US')).toBe('2024');
    expect(viewLabel(d(2024, 5, 15), 'decade', 'en-US')).toBe('2020–2029');
  });

  it('follows the locale', () => {
    expect(viewLabel(d(2024, 5, 15), 'month', 'tr-TR')).toContain('2024');
    expect(viewLabel(d(2024, 5, 15), 'month', 'de-DE')).toBe('Mai 2024');
  });
});

describe('navigate', () => {
  it('steps one month, one year or one decade by zoom level', () => {
    const anchor = d(2024, 5, 15);
    expect(navigate(anchor, 'month', 1).getMonth()).toBe(5);
    expect(navigate(anchor, 'year', 1).getFullYear()).toBe(2025);
    expect(navigate(anchor, 'decade', 1).getFullYear()).toBe(2034);
  });

  it('steps backwards across the year boundary', () => {
    const january = d(2024, 1, 15);
    const previous = navigate(january, 'month', -1);
    expect(previous.getFullYear()).toBe(2023);
    expect(previous.getMonth()).toBe(11);
  });

  it('does not overflow when the anchor day exceeds the target month', () => {
    const back = navigate(d(2024, 3, 31), 'month', -1);
    expect(back.getMonth()).toBe(1); // February, not March
  });
});
