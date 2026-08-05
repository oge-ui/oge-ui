import { compareValues } from './comparators';

describe('compareValues', () => {
  it('compares numbers', () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues(2, 1)).toBeGreaterThan(0);
    expect(compareValues(2, 2)).toBe(0);
  });

  it('sorts null and undefined last', () => {
    expect(compareValues(null, 5)).toBeGreaterThan(0);
    expect(compareValues(5, undefined)).toBeLessThan(0);
    expect(compareValues(null, undefined)).toBe(0);
  });

  it('sorts NaN after real numbers', () => {
    expect(compareValues(Number.NaN, 5)).toBeGreaterThan(0);
    expect(compareValues(5, Number.NaN)).toBeLessThan(0);
  });

  it('compares strings numeric-aware and case-insensitive', () => {
    expect(compareValues('item2', 'item10')).toBeLessThan(0);
    expect(compareValues('alpha', 'Alpha')).toBe(0);
    expect(compareValues('a', 'b')).toBeLessThan(0);
  });

  it('compares booleans (false < true)', () => {
    expect(compareValues(false, true)).toBeLessThan(0);
    expect(compareValues(true, true)).toBe(0);
  });

  it('compares dates chronologically', () => {
    expect(compareValues(new Date('2024-01-01'), new Date('2025-01-01'))).toBeLessThan(0);
  });
});
