import { describe, expect, it } from 'vitest';
import {
  clampNumber,
  createNumberFormatter,
  offsetByStep,
} from './number-format';

describe('createNumberFormatter', () => {
  it('exposes the locale separators', () => {
    const en = createNumberFormatter('en-US');
    expect(en.decimal).toBe('.');
    expect(en.group).toBe(',');
    const de = createNumberFormatter('de-DE');
    expect(de.decimal).toBe(',');
    expect(de.group).toBe('.');
  });

  it('formats for display with grouping and editable without it', () => {
    const en = createNumberFormatter('en-US');
    expect(en.format(1234.5)).toBe('1,234.5');
    expect(en.formatEditable(1234.5)).toBe('1234.5');
    const de = createNumberFormatter('de-DE');
    expect(de.formatEditable(1234.5)).toBe('1234,5');
  });

  it('round-trips the editable form back through parse', () => {
    for (const locale of ['en-US', 'de-DE', 'tr-TR', 'fr-FR']) {
      const f = createNumberFormatter(locale);
      expect(f.parse(f.formatEditable(-1234.56))).toEqual({
        value: -1234.56,
        ok: true,
      });
    }
  });

  it('parses text typed with the locale group separator', () => {
    expect(createNumberFormatter('en-US').parse('1,234.5').value).toBe(1234.5);
    expect(createNumberFormatter('de-DE').parse('1.234,5').value).toBe(1234.5);
  });

  it('accepts a plain space where the locale groups with a narrow NBSP', () => {
    // fr-FR groups with U+202F/U+00A0; nobody types those
    expect(createNumberFormatter('fr-FR').parse('1 234,5').value).toBe(1234.5);
  });

  it('treats empty text as a cleared value, not a parse failure', () => {
    expect(createNumberFormatter('en-US').parse('   ')).toEqual({
      value: null,
      ok: true,
    });
  });

  it('rejects garbage and lone sign/separator input', () => {
    const f = createNumberFormatter('en-US');
    expect(f.parse('abc').ok).toBe(false);
    expect(f.parse('-').ok).toBe(false);
    expect(f.parse('.').ok).toBe(false);
  });

  it('strips currency and percent affixes rather than failing on them', () => {
    const f = createNumberFormatter('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    expect(f.parse('$1,234.50').value).toBe(1234.5);
    expect(createNumberFormatter('en-US').parse('42%').value).toBe(42);
  });

  it('accepts the Unicode minus a keyboard-less user may paste', () => {
    expect(createNumberFormatter('en-US').parse('−5').value).toBe(-5);
  });

  it('formats native-digit locales for display but stays Latin while editing', () => {
    const ar = createNumberFormatter('ar-EG');
    expect(ar.formatEditable(1234.5)).toBe('1234.5');
    expect(ar.parse(ar.formatEditable(1234.5)).value).toBe(1234.5);
  });
});

describe('clampNumber', () => {
  it('clamps to whichever bound is supplied', () => {
    expect(clampNumber(5, 10, 20)).toBe(10);
    expect(clampNumber(25, 10, 20)).toBe(20);
    expect(clampNumber(15, 10, 20)).toBe(15);
    expect(clampNumber(-5, undefined, 20)).toBe(-5);
    expect(clampNumber(50, 10, undefined)).toBe(50);
  });

  it('treats 0 as a real bound', () => {
    expect(clampNumber(-1, 0)).toBe(0);
    expect(clampNumber(1, undefined, 0)).toBe(0);
  });
});

describe('offsetByStep', () => {
  it('steps up and down', () => {
    expect(offsetByStep(5, 1, 1)).toBe(6);
    expect(offsetByStep(5, -1, 1)).toBe(4);
  });

  it('corrects float drift instead of showing 0.30000000000000004', () => {
    expect(offsetByStep(0.2, 1, 0.1)).toBe(0.3);
    expect(offsetByStep(0.3, -1, 0.1)).toBe(0.2);
  });

  it('preserves an off-grid value rather than snapping it to the step', () => {
    expect(offsetByStep(0.5, 1, 1)).toBe(1.5);
  });

  it('starts a cleared field from 0, clamped into range', () => {
    expect(offsetByStep(null, 1, 1)).toBe(0);
    expect(offsetByStep(null, 1, 1, 10, 20)).toBe(10);
    expect(offsetByStep(null, -1, 1, undefined, -5)).toBe(-5);
  });

  it('clamps the stepped result to the bounds', () => {
    expect(offsetByStep(9.5, 1, 1, 0, 10)).toBe(10);
    expect(offsetByStep(0.5, -1, 1, 0, 10)).toBe(0);
  });

  it('normalizes negative zero so the field never shows "-0"', () => {
    expect(Object.is(offsetByStep(1, -1, 1), 0)).toBe(true);
  });

  it('skips the digit-counting correction for exponential steps', () => {
    expect(offsetByStep(0, 1, 1e-7)).toBe(1e-7);
  });
});
