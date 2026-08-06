import {
  clampNumber,
  createNumberFormatter,
  offsetByStep,
} from './number-format';

describe('createNumberFormatter', () => {
  it('parses en-US grouped input', () => {
    const f = createNumberFormatter('en-US');
    expect(f.parse('1,234.5')).toEqual({ value: 1234.5, ok: true });
    expect(f.parse('42')).toEqual({ value: 42, ok: true });
  });

  it('parses de-DE grouped input (dot groups, comma decimal)', () => {
    const f = createNumberFormatter('de-DE');
    expect(f.parse('1.234,5')).toEqual({ value: 1234.5, ok: true });
    expect(f.parse('-0,25')).toEqual({ value: -0.25, ok: true });
  });

  it('parses fr-FR with NBSP or plain-space groups', () => {
    const f = createNumberFormatter('fr-FR');
    expect(f.parse(`1${f.group}234,5`)).toEqual({ value: 1234.5, ok: true });
    expect(f.parse('1 234,5')).toEqual({ value: 1234.5, ok: true });
  });

  it('parses tr-TR', () => {
    const f = createNumberFormatter('tr-TR');
    expect(f.parse('1.234,56')).toEqual({ value: 1234.56, ok: true });
  });

  it('accepts the U+2212 minus sign', () => {
    const f = createNumberFormatter('en-US');
    expect(f.parse('−7')).toEqual({ value: -7, ok: true });
  });

  it('strips currency affixes', () => {
    const f = createNumberFormatter('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
    expect(f.parse('1.234,56 €')).toEqual({ value: 1234.56, ok: true });
  });

  it('empty is ok/null; garbage fails', () => {
    const f = createNumberFormatter('en-US');
    expect(f.parse('')).toEqual({ value: null, ok: true });
    expect(f.parse('   ')).toEqual({ value: null, ok: true });
    expect(f.parse('abc')).toEqual({ value: null, ok: false });
    expect(f.parse('-')).toEqual({ value: null, ok: false });
    expect(f.parse('1..2').ok).toBe(false);
  });

  it('formats for display and for editing', () => {
    const f = createNumberFormatter('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
    expect(f.format(1234.5)).toContain('1.234,50');
    expect(f.formatEditable(1234.5)).toBe('1234,5'); // no grouping, raw
  });
});

describe('clampNumber / offsetByStep', () => {
  it('clamps at both bounds with equality allowed', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(11, 0, 10)).toBe(10);
    expect(clampNumber(10, 0, 10)).toBe(10);
  });

  it('null starts from clamp(0, min, max)', () => {
    expect(offsetByStep(null, 1, 1)).toBe(0);
    expect(offsetByStep(null, 1, 1, 5)).toBe(5);
    expect(offsetByStep(null, -1, 1, undefined, -3)).toBe(-3);
  });

  it('corrects float drift without snapping off-grid values', () => {
    expect(offsetByStep(0.3, 1, 0.1)).toBe(0.4); // not 0.4000000000000001
    expect(offsetByStep(0.1, 1, 0.2)).toBe(0.3);
    expect(offsetByStep(0.5, -1, 1)).toBe(-0.5); // off-grid value preserved
  });

  it('stops at the bounds', () => {
    expect(offsetByStep(9.5, 1, 1, 0, 10)).toBe(10);
    expect(offsetByStep(0.5, -1, 1, 0, 10)).toBe(0);
  });
});
