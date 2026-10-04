import { ogeFormatValue, ogeToDate, ogeValueFormatter } from './value-format';

const JAN_5 = new Date(2024, 0, 5, 14, 7, 9);

describe('ogeValueFormatter — numbers', () => {
  it('formats number / decimal / currency / percent per locale', () => {
    expect(ogeFormatValue(1234.5, { type: 'number' }, 'en-US')).toBe('1,234.5');
    expect(ogeFormatValue(1234.5, { type: 'number' }, 'de-DE')).toBe('1.234,5');
    expect(ogeFormatValue(1234.5, { type: 'decimal' }, 'de-DE')).toBe('1234,5');
    expect(
      ogeFormatValue(1234.5, { type: 'currency', currency: 'EUR' }, 'de-DE'),
    ).toMatch(/^1\.234,50\s€$/);
    expect(
      ogeFormatValue(1234.5, { type: 'currency', currency: 'TRY' }, 'tr-TR'),
    ).toMatch(/1\.234,50/);
    expect(ogeFormatValue(0.256, { type: 'percent' }, 'en-US')).toBe('26%');
    expect(
      ogeFormatValue(
        0.256,
        { type: 'percent', minimumFractionDigits: 1 },
        'tr-TR',
      ),
    ).toBe('%25,6');
  });

  it('honours fraction digits and repairs max < min', () => {
    const format = ogeValueFormatter(
      { type: 'number', minimumFractionDigits: 2, maximumFractionDigits: 1 },
      'en-US',
    );
    expect(format(1)).toBe('1.00');
  });

  it('uses the locale digits (ar-EG)', () => {
    expect(ogeFormatValue(12, { type: 'number' }, 'ar-EG')).toBe(
      new Intl.NumberFormat('ar-EG').format(12),
    );
  });

  it('blank values are empty, wrong kinds show as is, numeric text formats', () => {
    const format = ogeValueFormatter({ type: 'number' }, 'en-US');
    expect(format(null)).toBe('');
    expect(format(undefined)).toBe('');
    expect(format('')).toBe('');
    expect(format('n/a')).toBe('n/a');
    expect(format('1500')).toBe('1,500');
  });

  it('number patterns', () => {
    expect(
      ogeFormatValue(1234.5, { type: 'number', pattern: '#,##0.00' }, 'de-DE'),
    ).toBe('1.234,50');
    expect(ogeFormatValue(7, { type: 'number', pattern: '000' }, 'en-US')).toBe(
      '007',
    );
    expect(
      ogeFormatValue(0.5, { type: 'number', pattern: '0.#%' }, 'en-US'),
    ).toBe('50%');
    expect(
      ogeFormatValue(3, { type: 'number', pattern: "'No.' 0" }, 'en-US'),
    ).toBe('No. 3');
  });
});

describe('ogeValueFormatter — dates', () => {
  it('date / time / datetime styles per locale', () => {
    expect(ogeFormatValue(JAN_5, { type: 'date' }, 'en-US')).toBe('1/5/2024');
    expect(ogeFormatValue(JAN_5, { type: 'date' }, 'de-DE')).toBe('5.1.2024');
    expect(
      ogeFormatValue(JAN_5, { type: 'date', dateStyle: 'long' }, 'tr-TR'),
    ).toBe('5 Ocak 2024');
    expect(ogeFormatValue(JAN_5, { type: 'time' }, 'de-DE')).toBe('14:07');
    expect(ogeFormatValue(JAN_5, { type: 'datetime' }, 'de-DE')).toBe(
      '05.01.24, 14:07',
    );
  });

  it('reads ISO strings and epoch numbers', () => {
    expect(
      ogeFormatValue('2024-01-05T00:00:00', { type: 'date' }, 'en-US'),
    ).toBe('1/5/2024');
    expect(ogeFormatValue(JAN_5.getTime(), { type: 'date' }, 'en-US')).toBe(
      '1/5/2024',
    );
    expect(ogeFormatValue('soon', { type: 'date' }, 'en-US')).toBe('soon');
  });

  it('date patterns use locale names and digits', () => {
    expect(
      ogeFormatValue(JAN_5, { type: 'date', pattern: 'dd.MM.yyyy' }, 'de-DE'),
    ).toBe('05.01.2024');
    expect(
      ogeFormatValue(
        JAN_5,
        { type: 'date', pattern: 'd MMMM yyyy, EEEE' },
        'tr-TR',
      ),
    ).toBe('5 Ocak 2024, Cuma');
    expect(
      ogeFormatValue(
        JAN_5,
        { type: 'datetime', pattern: "h:mm a 'on' MMM d" },
        'en-US',
      ),
    ).toBe('2:07 PM on Jan 5');
    expect(
      ogeFormatValue(JAN_5, { type: 'date', pattern: 'yy-M-d' }, 'en-US'),
    ).toBe('24-1-5');
  });
});

describe('ogeToDate', () => {
  it('rejects invalid dates and blanks', () => {
    expect(ogeToDate(new Date('x'))).toBeNull();
    expect(ogeToDate('')).toBeNull();
    expect(ogeToDate({})).toBeNull();
    expect(ogeToDate(JAN_5)).toBe(JAN_5);
  });
});
