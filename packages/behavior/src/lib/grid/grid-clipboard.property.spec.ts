import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ogeFillSeries,
  parseLocaleNumber,
  parseOgeTsv,
} from './grid-clipboard';

/** Line terminators, which a numbered-text prefix may not contain. */
const LINE_BREAK = /[\r\n\p{Zl}\p{Zp}]/u;

/**
 * Property-based (fuzz) tests for the paste / fill parsers: fast-check
 * generates thousands of inputs per property, adversarial shapes included.
 */
describe('grid clipboard — properties', () => {
  it('parses every finite JS number literal back to itself', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        expect(parseLocaleNumber(String(n))).toBe(n === 0 ? 0 : n);
      }),
    );
  });

  it('returns a number or null for any text, never throws', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom('en-US', 'de-DE', 'tr-TR'),
        (text, locale) => {
          const parsed = parseLocaleNumber(text, locale);
          expect(parsed === null || typeof parsed === 'number').toBe(true);
        },
      ),
    );
  });

  it('keeps every cell of a TSV block without quotes or line breaks', () => {
    const cell = fc.string().filter((s) => !/[\t\r\n"]/.test(s));
    fc.assert(
      fc.property(
        fc.array(fc.array(cell, { minLength: 1, maxLength: 5 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (rows) => {
          const text = rows.map((row) => row.join('\t')).join('\n');
          expect(parseOgeTsv(text).flat().join('')).toBe(rows.flat().join(''));
        },
      ),
    );
  });

  it('extends a numbered text series by its constant step', () => {
    const prefix = fc
      .string()
      .filter((s) => !/\d$/.test(s) && !LINE_BREAK.test(s));
    fc.assert(
      fc.property(
        prefix,
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 1, max: 50 }),
        (text, start, step) => {
          const out = ogeFillSeries(
            [`${text}${start}`, `${text}${start + step}`],
            2,
          );
          expect(out).toEqual([
            `${text}${start + 2 * step}`,
            `${text}${start + 3 * step}`,
          ]);
        },
      ),
    );
  });
});
