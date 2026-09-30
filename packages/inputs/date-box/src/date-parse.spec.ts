import { datePartOrder, parseDateText } from './date-parse';

describe('date-parse', () => {
  it('derives the locale part order from Intl', () => {
    expect(datePartOrder('en-US', 'date')).toEqual(['month', 'day', 'year']);
    expect(datePartOrder('de-DE', 'date')).toEqual(['day', 'month', 'year']);
    expect(datePartOrder('tr-TR', 'date')).toEqual(['day', 'month', 'year']);
  });

  it('parses numeric dates per locale order (dd/mm vs mm/dd)', () => {
    expect(parseDateText('8/6/2026', 'en-US', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
    expect(parseDateText('06.08.2026', 'de-DE', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
    expect(parseDateText('06.08.2026', 'tr-TR', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
  });

  it('pivots 2-digit years and defaults an omitted year to the reference', () => {
    expect(parseDateText('8/6/26', 'en-US', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
    expect(parseDateText('8/6/76', 'en-US', 'date')).toEqual(
      new Date(1976, 7, 6),
    );
    const reference = new Date(2030, 0, 15);
    expect(parseDateText('8/6', 'en-US', 'date', reference)).toEqual(
      new Date(2030, 7, 6),
    );
  });

  it('matches localized month names (long and short, case-folded)', () => {
    expect(parseDateText('6 August 2026', 'en-US', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
    expect(parseDateText('6 aug 2026', 'en-US', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
    expect(parseDateText('6 Ağustos 2026', 'tr-TR', 'date')).toEqual(
      new Date(2026, 7, 6),
    );
  });

  it('parses times incl. day periods, keeping the reference date', () => {
    const reference = new Date(2026, 7, 6);
    expect(parseDateText('14:30', 'en-US', 'time', reference)).toEqual(
      new Date(2026, 7, 6, 14, 30),
    );
    expect(parseDateText('2:30 PM', 'en-US', 'time', reference)).toEqual(
      new Date(2026, 7, 6, 14, 30),
    );
    expect(parseDateText('12:05 am', 'en-US', 'time', reference)).toEqual(
      new Date(2026, 7, 6, 0, 5),
    );
  });

  it('parses combined datetimes', () => {
    expect(parseDateText('8/6/2026 14:30', 'en-US', 'datetime')).toEqual(
      new Date(2026, 7, 6, 14, 30),
    );
    expect(parseDateText('06.08.2026 09:05', 'de-DE', 'datetime')).toEqual(
      new Date(2026, 7, 6, 9, 5),
    );
  });

  it('returns null for garbage, overflow days and out-of-range times', () => {
    expect(parseDateText('not a date', 'en-US', 'date')).toBeNull();
    expect(parseDateText('2/30/2026', 'en-US', 'date')).toBeNull(); // Feb 30
    expect(parseDateText('25:00', 'en-US', 'time')).toBeNull();
    expect(parseDateText('', 'en-US', 'date')).toBeNull();
  });
});
