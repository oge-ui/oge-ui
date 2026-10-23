import fc from 'fast-check';
import { compileOgeNumberFormat, formatOgeCellValue } from './number-format';
import { formatOgeGeneral } from './general';

/**
 * Property-based (fuzz) tests: format codes come from files, so the compiler
 * and renderer must be total — no throw, no `undefined`/`NaN` leaking into the
 * text, linear time — and General must keep its character budget.
 */
const codeChars = fc.constantFrom(
  ...'0#?.,%E+-e/@;"\\_*[]$<>=yymmddhhssAMPMap: General()'.split(''),
  '[Red]',
  '[>=100]',
  '[$-409]',
  '[h]',
  'General',
  'AM/PM',
);
/**
 * Free text, minus the letters that spell `NaN`, `undefined` and `[object`:
 * a code prints its letters as written and `@` prints the text, so with
 * them a code like `NaN` would trip the leak check below by itself.
 */
const freeText = (maxLength: number) =>
  fc.string({ maxLength }).filter((text) => !/[Nuo]/.test(text));
const formatCode = fc.oneof(
  fc.array(codeChars, { maxLength: 24 }).map((parts) => parts.join('')),
  freeText(24),
);
const cellValue = fc.oneof(
  fc.double({ noNaN: true }),
  fc.integer({ min: -1e6, max: 3e6 }),
  fc.double({ min: 0, max: 2958465, noNaN: true }),
  freeText(8),
  fc.boolean(),
);

describe('number formats — properties', () => {
  it('renders any value through any code without throwing', () => {
    fc.assert(
      fc.property(formatCode, cellValue, (code, value) => {
        const result = formatOgeCellValue(value, code);
        expect(typeof result.text).toBe('string');
        expect(result.text).not.toMatch(/undefined|NaN|\[object/);
        if (result.fill) {
          expect(result.fill.index).toBeGreaterThanOrEqual(0);
          expect(result.fill.index).toBeLessThanOrEqual(result.text.length);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('renders the same text from the cache and from a fresh compile', () => {
    fc.assert(
      fc.property(formatCode, fc.double({ noNaN: true }), (code, value) => {
        const cached = formatOgeCellValue(value, compileOgeNumberFormat(code));
        const lookAlike = formatOgeCellValue(value, {
          code,
          isDate: false,
          isPercent: false,
          isText: false,
        });
        expect(lookAlike).toEqual(cached);
      }),
    );
  });

  it('keeps General inside its budget and close to the value', () => {
    fc.assert(
      fc.property(
        // Excel's own ceiling is 9.99999999999999E+307
        fc.double({
          min: -9.99999999999999e307,
          max: 9.99999999999999e307,
          noNaN: true,
        }),
        fc.integer({ min: 5, max: 20 }),
        (value, budget) => {
          const text = formatOgeGeneral(value, budget);
          if (text === null) return;
          const unsigned = text.startsWith('-') ? text.slice(1) : text;
          expect(unsigned.length).toBeLessThanOrEqual(budget);
          if (budget >= 11 && value !== 0) {
            // an 11-character cell keeps six significant digits — five when
            // the exponent needs three digits (`1.2346E+141`)
            const wideExponent = /E[+-]\d{3}$/.test(text);
            const shown = Number(text);
            expect(
              Math.abs(shown - value) / Math.abs(value),
            ).toBeLessThanOrEqual(wideExponent ? 5.0001e-5 : 5.0001e-6);
          }
        },
      ),
    );
  });

  it('stays linear on long adversarial codes', () => {
    const codes = [
      '['.repeat(20000),
      '"'.repeat(20001),
      '\\'.repeat(20001),
      '0'.repeat(20000) + '.' + '#'.repeat(20000),
      'm'.repeat(30000),
      '#,'.repeat(10000),
      '?/'.repeat(10000),
      '[h]'.repeat(5000) + 's'.repeat(5000),
      ';'.repeat(20000),
      'E+0'.repeat(5000),
    ];
    const started = performance.now();
    for (const code of codes) {
      formatOgeCellValue(1234.5678, code);
      formatOgeCellValue(-0.25, code);
      formatOgeCellValue('text', code);
    }
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
