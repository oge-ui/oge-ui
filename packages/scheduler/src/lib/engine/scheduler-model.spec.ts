import {
  appointmentPatch,
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerFieldExprs,
} from './scheduler-model';

interface Item {
  id: number;
  text?: string;
  startDate?: unknown;
  endDate?: unknown;
  allDay?: boolean;
  color?: string;
  description?: string;
  recurrenceRule?: string;
  recurrenceException?: string;
  disabled?: boolean;
}

const DEFAULT_EXPRS: SchedulerFieldExprs<Item> = {
  textExpr: 'text',
  startDateExpr: 'startDate',
  endDateExpr: 'endDate',
  allDayExpr: 'allDay',
  colorExpr: 'color',
  locationExpr: 'location',
  descriptionExpr: 'description',
  recurrenceRuleExpr: 'recurrenceRule',
  recurrenceExceptionExpr: 'recurrenceException',
  disabledExpr: 'disabled',
};

describe('scheduler-model', () => {
  const fields = resolveSchedulerFields(DEFAULT_EXPRS);

  it('normalizes Date-valued items', () => {
    const item: Item = {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 9, 30),
      color: '#3b82f6',
    };
    const appointment = normalizeAppointment(item, 1, fields);
    expect(appointment).not.toBeNull();
    expect(appointment?.text).toBe('Standup');
    expect(appointment?.startDate).toEqual(new Date(2026, 7, 6, 9));
    expect(appointment?.endDate).toEqual(new Date(2026, 7, 6, 9, 30));
    expect(appointment?.allDay).toBe(false);
    expect(appointment?.displayAllDay).toBe(false);
    expect(appointment?.color).toBe('#3b82f6');
    expect(appointment?.source).toBe(item);
  });

  it('parses string dates as local wall time', () => {
    const appointment = normalizeAppointment(
      { id: 1, startDate: '2026-08-06T09:00', endDate: '2026-08-06T10:00' },
      1,
      fields,
    );
    expect(appointment?.startDate).toEqual(new Date(2026, 7, 6, 9));
    expect(appointment?.endDate).toEqual(new Date(2026, 7, 6, 10));
  });

  it('drops items with no parseable start date', () => {
    expect(normalizeAppointment({ id: 1 }, 1, fields)).toBeNull();
    expect(
      normalizeAppointment({ id: 1, startDate: 'garbage' }, 1, fields),
    ).toBeNull();
  });

  it('defaults a missing or inverted end date to the start', () => {
    const start = new Date(2026, 7, 6, 9);
    const noEnd = normalizeAppointment({ id: 1, startDate: start }, 1, fields);
    expect(noEnd?.endDate).toEqual(start);
    const inverted = normalizeAppointment(
      { id: 1, startDate: start, endDate: new Date(2026, 7, 6, 8) },
      1,
      fields,
    );
    expect(inverted?.endDate).toEqual(start);
  });

  it('flags displayAllDay for explicit allDay and for ≥24h spans', () => {
    const explicit = normalizeAppointment(
      {
        id: 1,
        startDate: new Date(2026, 7, 6),
        endDate: new Date(2026, 7, 6),
        allDay: true,
      },
      1,
      fields,
    );
    expect(explicit?.allDay).toBe(true);
    expect(explicit?.displayAllDay).toBe(true);
    const long = normalizeAppointment(
      {
        id: 2,
        startDate: new Date(2026, 7, 6, 10),
        endDate: new Date(2026, 7, 7, 10),
      },
      2,
      fields,
    );
    expect(long?.allDay).toBe(false); // model untouched
    expect(long?.displayAllDay).toBe(true); // display decision only
  });

  it('supports function exprs', () => {
    const custom = resolveSchedulerFields<Item>({
      ...DEFAULT_EXPRS,
      textExpr: (item) => `#${item.id}`,
    });
    const appointment = normalizeAppointment(
      { id: 7, startDate: new Date(2026, 7, 6, 9) },
      7,
      custom,
    );
    expect(appointment?.text).toBe('#7');
  });

  it('appointmentPatch writes back in the original storage shape', () => {
    const original: Item = {
      id: 1,
      startDate: '2026-08-06T09:00',
      endDate: '2026-08-06T10:00',
    };
    const patch = appointmentPatch(
      original,
      {
        startDate: new Date(2026, 7, 7, 14, 30),
        endDate: new Date(2026, 7, 7, 15, 30),
      },
      fields,
    );
    expect(patch).toEqual({
      startDate: '2026-08-07T14:30',
      endDate: '2026-08-07T15:30',
    });

    const dateOriginal: Item = {
      id: 2,
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
    };
    const datePatch = appointmentPatch(
      dateOriginal,
      {
        startDate: new Date(2026, 7, 7, 9),
        endDate: new Date(2026, 7, 7, 10),
        allDay: true,
      },
      fields,
    );
    expect(datePatch['startDate']).toEqual(new Date(2026, 7, 7, 9));
    expect(datePatch['allDay']).toBe(true);
  });

  it('appointmentPatch omits fields addressed by function exprs', () => {
    const custom = resolveSchedulerFields<Item>({
      ...DEFAULT_EXPRS,
      startDateExpr: (item) => item.startDate,
    });
    const patch = appointmentPatch(
      { id: 1, startDate: new Date(2026, 7, 6, 9), endDate: new Date(2026, 7, 6, 10) },
      {
        startDate: new Date(2026, 7, 7, 9),
        endDate: new Date(2026, 7, 7, 10),
      },
      custom,
    );
    expect('startDate' in patch).toBe(false);
    expect(patch['endDate']).toEqual(new Date(2026, 7, 7, 10));
  });
});
