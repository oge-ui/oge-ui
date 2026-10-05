import { OGE_DEFAULT_SCHEDULER_MESSAGES } from './lib/config';
import { buildSchedulerExportData } from './lib/export-data';
import {
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
} from './lib/scheduler-model';
import {
  buildOgeICalendar,
  buildSchedulerICalendar,
  escapeICalText,
  foldICalLine,
  parseICalDuration,
  parseOgeICalendar,
  schedulerICalEvents,
  schedulerItemsFromICalendar,
  unescapeICalText,
} from './export-ical';
import { buildSchedulerExcelWorkbook } from './export-excel';
import { buildSchedulerPdfDocument } from './export-pdf';

interface Item {
  id?: number | string;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  location?: string;
  description?: string;
  recurrenceRule?: string;
  recurrenceException?: string;
  color?: string;
  room?: string;
}

const fields = resolveSchedulerFields<Item>({
  textExpr: 'text',
  startDateExpr: 'startDate',
  endDateExpr: 'endDate',
  allDayExpr: 'allDay',
  colorExpr: 'color',
  locationExpr: 'location',
  descriptionExpr: 'description',
  reminderExpr: 'reminder',
  recurrenceRuleExpr: 'recurrenceRule',
  recurrenceExceptionExpr: 'recurrenceException',
  disabledExpr: 'disabled',
});
const appt = (item: Item): SchedulerAppointment<Item> =>
  normalizeAppointment(item, item.id, fields) as SchedulerAppointment<Item>;

const ROOMS = [
  {
    fieldExpr: 'room',
    label: 'Room',
    items: [{ id: 'a', text: 'Atlas' }],
  },
];

const ITEMS: Item[] = [
  {
    id: 1,
    text: 'Standup, daily; sync',
    startDate: new Date(2026, 7, 3, 9),
    endDate: new Date(2026, 7, 3, 9, 15),
    recurrenceRule: 'FREQ=DAILY;COUNT=10',
    recurrenceException: '20260805T090000',
    room: 'a',
    color: '#2563eb',
  },
  {
    id: 2,
    text: 'Offsite',
    startDate: new Date(2026, 7, 6),
    endDate: new Date(2026, 7, 8),
    allDay: true,
    location: 'Lisbon',
    description: 'Line one\nLine two',
  },
];

function exportData(range = { start: new Date(2026, 7, 3), end: new Date(2026, 7, 10) }) {
  return buildSchedulerExportData({
    appointments: ITEMS.map(appt),
    rangeStart: range.start,
    rangeEnd: range.end,
    title: 'Aug 3 – 9, 2026',
    locale: 'en-US',
    fields,
    resources: ROOMS,
    messages: OGE_DEFAULT_SCHEDULER_MESSAGES.export,
  });
}

describe('export data', () => {
  it('expands occurrences into chronological rows with resources', () => {
    const data = exportData();
    // 7 standups (Aug 3–9) minus the Aug 5 exception, plus the offsite
    expect(data.rows).toHaveLength(7);
    expect(data.rows[0]).toMatchObject({
      text: 'Standup, daily; sync',
      recurring: true,
      resources: [{ label: 'Room', text: 'Atlas' }],
    });
    expect(data.rows.find((row) => row.text === 'Offsite')?.allDay).toBe(true);
    expect(data.appointments).toHaveLength(2);
  });
});

describe('iCalendar', () => {
  it('escapes, unescapes and folds at 75 octets without splitting characters', () => {
    expect(escapeICalText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    expect(unescapeICalText('a\\,b\\;c\\\\d\\ne\\N')).toBe('a,b;c\\d\ne\n');
    const long = `SUMMARY:${'ğ'.repeat(60)}`;
    const folded = foldICalLine(long);
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    expect(parseICalDuration('PT1H30M')).toBe(90 * 60_000);
    expect(parseICalDuration('P1W')).toBe(7 * 86_400_000);
    expect(parseICalDuration('nope')).toBeNull();
  });

  it('exports series with RRULE / EXDATE and all-day events with exclusive DATE ends', () => {
    const text = buildSchedulerICalendar(exportData(), {
      now: new Date(Date.UTC(2026, 7, 1, 12)),
      calendarName: 'Team',
    });
    expect(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(text).toContain('X-WR-CALNAME:Team');
    expect(text).toContain('UID:1@oge-ui');
    expect(text).toContain('DTSTAMP:20260801T120000Z');
    expect(text).toContain('DTSTART:20260803T090000');
    expect(text).toContain('RRULE:FREQ=DAILY;COUNT=10');
    expect(text).toContain('EXDATE:20260805T090000');
    expect(text).toContain('SUMMARY:Standup\\, daily\\; sync');
    expect(text).toContain('DTSTART;VALUE=DATE:20260806');
    expect(text).toContain('DTEND;VALUE=DATE:20260808');
    expect(text).toContain('DESCRIPTION:Line one\\nLine two');
    expect(text).toContain('X-OGE-COLOR:#2563eb');
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(schedulerICalEvents(exportData())).toHaveLength(2);
  });

  it('round-trips through import into the scheduler field shape', () => {
    const text = buildSchedulerICalendar(exportData());
    const items = schedulerItemsFromICalendar<Item>(text, fields, {
      uidField: 'id',
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: '1@oge-ui',
      text: 'Standup, daily; sync',
      startDate: new Date(2026, 7, 3, 9),
      recurrenceRule: 'FREQ=DAILY;COUNT=10',
      recurrenceException: '20260805T090000',
      color: '#2563eb',
    });
    expect(items[1]).toMatchObject({
      text: 'Offsite',
      allDay: true,
      startDate: new Date(2026, 7, 6),
      endDate: new Date(2026, 7, 8),
      description: 'Line one\nLine two',
      location: 'Lisbon',
    });
  });

  it('reads foreign files: LF, DURATION, UTC, TZID, VALARM, overrides', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:abc',
      'DTSTART;TZID=Europe/Berlin:20260803T100000',
      'DURATION:PT45M',
      'SUMMARY:Weekly',
      'RRULE:FREQ=WEEKLY;COUNT=4',
      'BEGIN:VALARM',
      'SUMMARY:alarm text',
      'END:VALARM',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:abc',
      'RECURRENCE-ID;TZID=Europe/Berlin:20260810T100000',
      'DTSTART:20260810T120000Z',
      'DTEND:20260810T130000Z',
      'SUMMARY:Moved',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'SUMMARY:no start',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const events = parseOgeICalendar(text);
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe('Weekly'); // VALARM SUMMARY ignored
    expect(events[0].endDate).toEqual(new Date(2026, 7, 3, 10, 45));
    expect(events[1].startDate).toEqual(new Date(Date.UTC(2026, 7, 10, 12)));
    const items = schedulerItemsFromICalendar<Item>(text, fields);
    expect(items[0].recurrenceException).toBe('20260810T100000');
    expect(items[1].recurrenceRule).toBeUndefined();
    expect(items[1].text).toBe('Moved');
  });

  it('builds a document from plain events', () => {
    const text = buildOgeICalendar([
      {
        uid: 'x\ny',
        summary: 'Plain',
        startDate: new Date(2026, 0, 1, 9),
        endDate: new Date(2026, 0, 1, 10),
        allDay: false,
        rDates: [new Date(2026, 0, 3, 9)],
      },
    ]);
    expect(text).toContain('UID:x y');
    expect(text).toContain('RDATE:20260103T090000');
  });
});

describe('PDF and Excel list exports', () => {
  it('builds a workbook with typed cells and resource columns', () => {
    const workbook = buildSchedulerExcelWorkbook(exportData());
    const sheet = workbook.getWorksheet('Appointments');
    expect(sheet).toBeDefined();
    const header = sheet!.getRow(1).values as unknown[];
    expect(header.slice(1)).toEqual([
      'Subject',
      'Start',
      'End',
      'All day',
      'Location',
      'Description',
      'Recurring',
      'Room',
    ]);
    const first = sheet!.getRow(2);
    expect(first.getCell(2).value).toEqual(new Date(2026, 7, 3, 9));
    expect(first.getCell(7).value).toBe('Yes');
    expect(first.getCell(8).value).toBe('Atlas');
    expect(sheet!.rowCount).toBe(8);
  });

  it('builds a paginated PDF list', () => {
    const doc = buildSchedulerPdfDocument(exportData(), { font: null });
    expect(doc.getNumberOfPages()).toBe(1);
    const empty = buildSchedulerPdfDocument(
      exportData({ start: new Date(2027, 0, 1), end: new Date(2027, 0, 2) }),
      { font: null, title: 'Nothing' },
    );
    expect(empty.getNumberOfPages()).toBe(1);
  });
});
