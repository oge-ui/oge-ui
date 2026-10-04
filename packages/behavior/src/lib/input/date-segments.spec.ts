import { describe, expect, it } from 'vitest';
import {
  OgeDateSegmentCore,
  dateSegmentTemplate,
  type OgeDateSegmentPlaceholders,
} from './date-segments';

const placeholders: OgeDateSegmentPlaceholders = {
  year: 'yyyy',
  month: 'mm',
  day: 'dd',
  hour: 'hh',
  minute: 'mm',
  second: 'ss',
  dayPeriod: '--',
};

const core = (
  locale: string,
  type: 'date' | 'time' | 'datetime' = 'date',
  extra: { hour12?: boolean; showSeconds?: boolean } = {},
) => new OgeDateSegmentCore({ locale, type, placeholders, ...extra });

const typeKeys = (machine: OgeDateSegmentCore, keys: string): void => {
  for (const key of keys) machine.key({ key });
};

describe('dateSegmentTemplate', () => {
  it('follows the locale order and separators', () => {
    const kinds = (locale: string) =>
      dateSegmentTemplate(locale, 'date', false, false)
        .filter((p) => p.kind !== 'literal')
        .map((p) => p.kind);
    expect(kinds('en-US')).toEqual(['month', 'day', 'year']);
    expect(kinds('de-DE')).toEqual(['day', 'month', 'year']);
    expect(kinds('ja-JP')).toEqual(['year', 'month', 'day']);
  });
});

describe('OgeDateSegmentCore', () => {
  it('renders placeholders and fills segments with auto-advance', () => {
    const machine = core('de-DE');
    expect(machine.text).toBe('dd.mm.yyyy');
    typeKeys(machine, '2');
    // 2 could still become 2x → stays on the day segment
    expect(machine.activeKind).toBe('day');
    typeKeys(machine, '4');
    expect(machine.activeKind).toBe('month');
    typeKeys(machine, '3'); // 3x > 12 → completes immediately
    expect(machine.activeKind).toBe('year');
    typeKeys(machine, '2026');
    expect(machine.text).toBe('24.03.2026');
    expect(machine.read(null)).toEqual({
      state: 'complete',
      date: new Date(2026, 2, 24),
    });
  });

  it('reports the active segment range for the host selection', () => {
    const machine = core('en-US');
    machine.focusFirst();
    expect(machine.activeRange()).toEqual([0, 2]);
    machine.key({ key: 'ArrowRight' });
    expect(machine.activeRange()).toEqual([3, 5]);
    machine.focusAt(8);
    expect(machine.activeKind).toBe('year');
  });

  it('mirrors left/right under RTL', () => {
    const machine = core('de-DE');
    machine.focusFirst();
    machine.key({ key: 'ArrowLeft' }, undefined, true);
    expect(machine.activeKind).toBe('month');
  });

  it('steps with wrap-around and starts empty segments at the reference', () => {
    const machine = core('de-DE');
    machine.setDate(new Date(2026, 0, 31));
    machine.focusAt(3); // month
    machine.key({ key: 'ArrowDown' });
    expect(machine.text).toBe('31.12.2026');
    machine.clear();
    machine.focusFirst();
    machine.key({ key: 'ArrowUp' }, undefined, false, new Date(2026, 5, 9));
    expect(machine.text).toBe('09.mm.yyyy');
  });

  it('clears the segment, then moves back on Backspace', () => {
    const machine = core('de-DE');
    machine.setDate(new Date(2026, 2, 24));
    machine.focusAt(3);
    machine.key({ key: 'Backspace' });
    expect(machine.text).toBe('24.mm.2026');
    expect(machine.read(null).state).toBe('incomplete');
    machine.key({ key: 'Backspace' });
    expect(machine.activeKind).toBe('day');
    machine.key({ key: 'Delete' }, [0, machine.text.length]);
    expect(machine.isEmpty).toBe(true);
  });

  it('flags impossible dates as invalid', () => {
    const machine = core('de-DE');
    typeKeys(machine, '3002');
    typeKeys(machine, '2025');
    expect(machine.read(null)).toEqual({ state: 'invalid', date: null });
  });

  it('moves on when a separator is typed and ignores letters', () => {
    const machine = core('de-DE');
    typeKeys(machine, '1.x');
    expect(machine.activeKind).toBe('month');
    expect(machine.text).toBe('01.mm.yyyy');
  });

  it('leaves modifier combos and navigation keys to the host', () => {
    const machine = core('de-DE');
    expect(machine.key({ key: 'v', ctrlKey: true })).toBe(false);
    expect(machine.key({ key: 'Tab' })).toBe(false);
    expect(machine.key({ key: 'Enter' })).toBe(false);
  });

  it('handles 12-hour time with an AM/PM segment and seconds', () => {
    const machine = core('en-US', 'time', { hour12: true, showSeconds: true });
    expect(machine.kinds).toEqual(['hour', 'minute', 'second', 'dayPeriod']);
    typeKeys(machine, '0930');
    typeKeys(machine, '15');
    machine.key({ key: 'p' });
    const reference = new Date(2026, 2, 24);
    expect(machine.read(reference).date).toEqual(
      new Date(2026, 2, 24, 21, 30, 15),
    );
    machine.key({ key: 'ArrowUp' });
    expect(machine.read(reference).date?.getHours()).toBe(9);
  });

  it('round-trips a date-time through setDate in 24-hour locales', () => {
    const machine = core('de-DE', 'datetime');
    const at = new Date(2026, 2, 24, 13, 5);
    machine.setDate(at);
    expect(machine.read(null).date).toEqual(at);
    expect(machine.text).toContain('13:05');
  });

  it('keeps the date when the template is reconfigured', () => {
    const machine = core('en-US', 'time', { hour12: false });
    machine.setDate(new Date(2026, 2, 24, 18, 0));
    machine.configure({
      locale: 'en-US',
      type: 'time',
      hour12: true,
      placeholders,
    });
    expect(machine.text.replace(/\s/g, ' ')).toBe('06:00 PM');
  });
});
