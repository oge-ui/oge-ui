import fc from 'fast-check';
import {
  OGE_DECIMAL_ZERO,
  formatOgeDecimal,
  isOgeDecimalZero,
  ogeDecimalFractionDigits,
  ogeDecimalIntegerDigits,
  ogeDecimalMagnitude,
  ogeDecimalOf,
  ogeRoundDecimalPlaces,
  ogeRoundDecimalSignificant,
  ogeShiftDecimal,
} from './decimal';

const round = (value: number, places: number) =>
  formatOgeDecimal(ogeRoundDecimalPlaces(ogeDecimalOf(value), places));

describe('Excel decimals', () => {
  it('reduces a double to 15 significant digits', () => {
    expect(ogeDecimalOf(0.1 + 0.2)).toEqual({ digits: '3', exponent: 0 });
    expect(ogeDecimalOf(1234.5)).toEqual({ digits: '12345', exponent: 4 });
    expect(ogeDecimalOf(-0.00012)).toEqual({ digits: '12', exponent: -3 });
    expect(ogeDecimalOf(1 / 3).digits).toBe('333333333333333');
    expect(ogeDecimalOf(0)).toBe(OGE_DECIMAL_ZERO);
    expect(ogeDecimalOf(Number.NaN)).toBe(OGE_DECIMAL_ZERO);
    expect(ogeDecimalOf(1.2345678901234568e17)).toEqual({
      digits: '123456789012346',
      exponent: 18,
    });
  });

  it('rounds the decimal text half away from zero, not the binary value', () => {
    expect(round(2.675, 2)).toBe('2.68'); // JavaScript's toFixed says 2.67
    expect(round(1.005, 2)).toBe('1.01'); // toFixed says 1.00
    expect(round(0.125, 2)).toBe('0.13');
    expect(round(-0.125, 2)).toBe('0.13'); // magnitude only
    expect(round(0.5, 0)).toBe('1');
    expect(round(0.4, 0)).toBe('0');
    expect(round(9.995, 2)).toBe('10');
    expect(round(999.96, 1)).toBe('1000');
    expect(round(1234, -2)).toBe('1200');
    expect(round(0.0004, 3)).toBe('0');
  });

  it('rounds to significant digits', () => {
    const value = ogeRoundDecimalSignificant(ogeDecimalOf(123456789012), 6);
    expect(value).toEqual({ digits: '123457', exponent: 12 });
    expect(ogeRoundDecimalSignificant(ogeDecimalOf(99999.5), 5)).toEqual({
      digits: '1',
      exponent: 6,
    });
    expect(ogeRoundDecimalSignificant(OGE_DECIMAL_ZERO, 3)).toBe(
      OGE_DECIMAL_ZERO,
    );
  });

  it('splits into integer and fraction digits and shifts exactly', () => {
    const value = ogeDecimalOf(1234.5678);
    expect(ogeDecimalIntegerDigits(value)).toBe('1234');
    expect(ogeDecimalFractionDigits(value, 6)).toBe('567800');
    expect(ogeDecimalFractionDigits(value, 2)).toBe('56');
    expect(ogeDecimalIntegerDigits(ogeDecimalOf(0.5))).toBe('');
    expect(ogeDecimalFractionDigits(ogeDecimalOf(0.005), 4)).toBe('0050');
    expect(ogeDecimalIntegerDigits(ogeDecimalOf(1200))).toBe('1200');
    expect(formatOgeDecimal(ogeShiftDecimal(ogeDecimalOf(0.125), 2))).toBe(
      '12.5',
    );
    expect(formatOgeDecimal(ogeShiftDecimal(ogeDecimalOf(12345), -3))).toBe(
      '12.345',
    );
    expect(ogeDecimalMagnitude(ogeDecimalOf(0.05))).toBe(-2);
    expect(ogeDecimalMagnitude(ogeDecimalOf(1234))).toBe(3);
    expect(isOgeDecimalZero(ogeShiftDecimal(OGE_DECIMAL_ZERO, 5))).toBe(true);
  });

  it('agrees with exact decimal arithmetic on 15-digit values', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 999_999_999_999_999n }),
        fc.integer({ min: 0, max: 14 }),
        fc.integer({ min: 0, max: 6 }),
        (mantissa, scale, places) => {
          // value = mantissa / 10^scale, exactly representable as decimal text
          const text = mantissa.toString().padStart(scale + 1, '0');
          const literal = scale
            ? `${text.slice(0, -scale)}.${text.slice(-scale)}`
            : text;
          const value = Number(literal);
          // reference: BigInt half-away-from-zero rounding of the literal
          const unit = 10n ** BigInt(Math.max(0, scale - places));
          let reference: bigint;
          if (places >= scale)
            reference = mantissa * 10n ** BigInt(places - scale);
          else reference = (mantissa + unit / 2n) / unit;
          const expected = reference.toString().padStart(places + 1, '0');
          const want = places
            ? `${expected.slice(0, -places)}.${expected.slice(-places)}`
            : expected;
          const got = ogeRoundDecimalPlaces(ogeDecimalOf(value), places);
          const integer = ogeDecimalIntegerDigits(got) || '0';
          const fraction = ogeDecimalFractionDigits(got, places);
          expect(places ? `${integer}.${fraction}` : integer).toBe(
            want.replace(/^0+(?=\d)/, ''),
          );
        },
      ),
    );
  });
});
