import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { escapeCsvCell, guardCsvFormula } from './csv';

/**
 * Property-based (fuzz) tests: fast-check generates thousands of inputs per
 * property, including the adversarial shapes example-based specs miss.
 */
describe('CSV export — properties', () => {
  it('never lets a guarded cell open with a formula character', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const guarded = guardCsvFormula(text);
        const lead = guarded.replace(/^[ ]+/, '')[0];
        const isNumber = /^[+-]?(\d+(?:\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(
          text,
        );
        if (!isNumber) {
          expect(['=', '+', '-', '@', '\t', '\r']).not.toContain(lead);
        }
      }),
    );
  });

  it('leaves plain numbers untouched and only ever prepends an apostrophe', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        const text = String(n);
        expect(guardCsvFormula(text)).toBe(text);
      }),
    );
    fc.assert(
      fc.property(fc.string(), (text) => {
        const guarded = guardCsvFormula(text);
        expect(guarded === text || guarded === `'${text}`).toBe(true);
      }),
    );
  });

  it('quotes so that a cell round-trips through RFC 4180 unquoting', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom(',', ';', '\t'), (text, sep) => {
        const cell = escapeCsvCell(text, sep, false);
        if (cell.startsWith('"')) {
          expect(cell.endsWith('"')).toBe(true);
          expect(cell.slice(1, -1).replace(/""/g, '"')).toBe(text);
        } else {
          expect(cell).toBe(text);
          expect(cell.includes(sep)).toBe(false);
        }
      }),
    );
  });

  it('stays fast on long numeric-looking input', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20_000 }), (length) => {
        const started = performance.now();
        guardCsvFormula(`0${'0'.repeat(length)}x`);
        expect(performance.now() - started).toBeLessThan(50);
      }),
      { numRuns: 25 },
    );
  });
});
