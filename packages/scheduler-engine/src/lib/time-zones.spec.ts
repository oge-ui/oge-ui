import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';
import { OGE_DEFAULT_SCHEDULER_CONFIG } from './config';
import {
  buildItemFromEditor,
  buildPatchFromEditor,
  buildSchedulerEditorItems,
  editorModelFrom,
  type SchedulerEditorModel,
} from './editor';
import { parseRecurrenceRule, recurrenceRuleTimeZone } from './rrule';
import {
  OgeSchedulerCore,
  type OgeSchedulerCoreInputs,
} from './scheduler-core';
import {
  appointmentPatch,
  expandAppointment,
  normalizeAppointment,
  occurrenceSeriesStart,
  resolveSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type { OgeSchedulerView } from './scheduler-types';
import { buildSchedulerICalendar } from '../export-ical';
import { buildSchedulerExportData } from './export-data';

const NY = 'America/New_York';
const IST = 'Europe/Istanbul';
const LHI = 'Australia/Lord_Howe';
const KTM = 'Asia/Kathmandu';

interface Item {
  id?: number;
  text: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay?: boolean;
  recurrenceRule?: string;
  recurrenceException?: string;
  startTimeZone?: string;
  endTimeZone?: string;
}

const utc = (y: number, m: number, d: number, hh = 0, mm = 0): Date =>
  new Date(Date.UTC(y, m - 1, d, hh, mm));

const fieldsIn = (timeZone?: string) =>
  resolveSchedulerFields<Item>({
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
    timeZone,
  });

const appointmentIn = (
  item: Item,
  timeZone?: string,
): SchedulerAppointment<Item> =>
  normalizeAppointment(
    item,
    item.id ?? 1,
    fieldsIn(timeZone),
  ) as SchedulerAppointment<Item>;

/** `[hours, minutes]` of a wall clock (local fields). */
const clock = (date: Date): [number, number] => [
  date.getHours(),
  date.getMinutes(),
];
const day = (date: Date): number => date.getDate();

describe('display time zone', () => {
  it('holds stored instants as wall clocks of the display zone', () => {
    const item: Item = {
      text: 'Call',
      startDate: utc(2026, 1, 10, 14),
      endDate: utc(2026, 1, 10, 15),
    };
    expect(clock(appointmentIn(item, NY).startDate)).toEqual([9, 0]);
    expect(clock(appointmentIn(item, IST).startDate)).toEqual([17, 0]);
    expect(clock(appointmentIn(item, KTM).startDate)).toEqual([19, 45]);
    // an unknown zone falls back to the runtime zone
    expect(appointmentIn(item, 'Nowhere/Zone').startDate.getTime()).toBe(
      utc(2026, 1, 10, 14).getTime(),
    );
  });

  it('writes a moved wall clock back as the instant it stands for', () => {
    const item: Item = {
      text: 'Call',
      startDate: utc(2026, 1, 10, 14),
      endDate: utc(2026, 1, 10, 15),
    };
    const patch = appointmentPatch(
      item,
      {
        startDate: new Date(2026, 0, 10, 11, 0),
        endDate: new Date(2026, 0, 10, 12, 0),
      },
      fieldsIn(NY),
    );
    expect((patch.startDate as Date).toISOString()).toBe(
      '2026-01-10T16:00:00.000Z',
    );
    expect((patch.endDate as Date).toISOString()).toBe(
      '2026-01-10T17:00:00.000Z',
    );
  });

  it('resolves a skipped wall time forward and a 25-hour day once', () => {
    const item: Item = {
      text: 'x',
      startDate: utc(2026, 3, 8, 6),
      endDate: utc(2026, 3, 8, 7),
    };
    // 02:30 on New York's spring-forward night does not exist → 03:30 EDT
    const skipped = appointmentPatch(
      item,
      {
        startDate: new Date(2026, 2, 8, 2, 30),
        endDate: new Date(2026, 2, 8, 4, 0),
      },
      fieldsIn(NY),
    );
    expect((skipped.startDate as Date).toISOString()).toBe(
      '2026-03-08T07:30:00.000Z',
    );
    // 01:30 on the fall-back night happens twice: the first one wins
    const repeated = appointmentPatch(
      item,
      {
        startDate: new Date(2026, 10, 1, 1, 30),
        endDate: new Date(2026, 10, 1, 3, 0),
      },
      fieldsIn(NY),
    );
    expect((repeated.startDate as Date).toISOString()).toBe(
      '2026-11-01T05:30:00.000Z',
    );
    // both 01:30 instants render at the same wall slot
    expect(
      clock(
        appointmentIn(
          {
            ...item,
            startDate: utc(2026, 11, 1, 6, 30),
            endDate: utc(2026, 11, 1, 7),
          },
          NY,
        ).startDate,
      ),
    ).toEqual([1, 30]);
  });

  it("handles Lord Howe's half-hour shift and Kathmandu's +5:45", () => {
    const fields = fieldsIn(LHI);
    const patch = appointmentPatch(
      { text: 'x', startDate: utc(2026, 10, 3), endDate: utc(2026, 10, 3, 1) },
      {
        startDate: new Date(2026, 9, 4, 2, 15),
        endDate: new Date(2026, 9, 4, 3, 0),
      },
      fields,
    );
    // 02:15 is skipped (02:00 → 02:30): resolves to 02:45 LHDT
    expect((patch.startDate as Date).toISOString()).toBe(
      '2026-10-03T15:45:00.000Z',
    );
    const kathmandu = appointmentPatch(
      { text: 'x', startDate: utc(2026, 6, 1), endDate: utc(2026, 6, 1, 1) },
      {
        startDate: new Date(2026, 5, 1, 9, 0),
        endDate: new Date(2026, 5, 1, 10, 0),
      },
      fieldsIn(KTM),
    );
    expect((kathmandu.startDate as Date).toISOString()).toBe(
      '2026-06-01T03:15:00.000Z',
    );
  });

  it('keeps all-day appointments on their calendar days', () => {
    const item: Item = {
      text: 'Holiday',
      startDate: new Date(2026, 6, 4),
      endDate: new Date(2026, 6, 5),
      allDay: true,
    };
    const appointment = appointmentIn(item, NY);
    expect(appointment.startDate.getTime()).toBe(
      new Date(2026, 6, 4).getTime(),
    );
  });

  it('reads the appointment zone fields', () => {
    const appointment = appointmentIn(
      {
        text: 'x',
        startDate: utc(2026, 1, 1, 9),
        endDate: utc(2026, 1, 1, 10),
        startTimeZone: NY,
        endTimeZone: 'Bogus/Zone',
      },
      IST,
    );
    expect(appointment.startTimeZone).toBe(NY);
    expect(appointment.endTimeZone).toBeUndefined();
    expect(appointment.viewTimeZone).toBe(IST);
  });
});

describe('recurrence in the event zone', () => {
  const series: Item = {
    id: 7,
    text: 'NY standup',
    // 09:00 EST on Saturday 2026-03-07
    startDate: utc(2026, 3, 7, 14),
    endDate: utc(2026, 3, 7, 14, 30),
    recurrenceRule: 'FREQ=DAILY;COUNT=4',
    startTimeZone: NY,
  };

  it('keeps 09:00 New York across the DST change, shown in Istanbul', () => {
    const occurrences = expandAppointment(
      appointmentIn(series, IST),
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
    );
    // 17:00 in Istanbul while New York is on EST, 16:00 once it is on EDT
    expect(
      occurrences.map((o) => [day(o.startDate), ...clock(o.startDate)]),
    ).toEqual([
      [7, 17, 0],
      [8, 16, 0],
      [9, 16, 0],
      [10, 16, 0],
    ]);
    expect(clock(occurrences[1].endDate)).toEqual([16, 30]);
  });

  it('recurs on the display clocks when the series has no zone of its own', () => {
    const occurrences = expandAppointment(
      appointmentIn({ ...series, startTimeZone: undefined }, NY),
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
    );
    expect(occurrences.map((o) => clock(o.startDate))).toEqual([
      [9, 0],
      [9, 0],
      [9, 0],
      [9, 0],
    ]);
  });

  it('honours DTSTART;TZID in the rule over the start zone field', () => {
    const rule =
      'DTSTART;TZID=America/New_York:20260307T090000\nRRULE:FREQ=WEEKLY;COUNT=3';
    expect(recurrenceRuleTimeZone(rule)).toBe(NY);
    expect(parseRecurrenceRule(rule, { timeZone: NY })?.timeZone).toBe(NY);
    const occurrences = expandAppointment(
      appointmentIn(
        { ...series, recurrenceRule: rule, startTimeZone: undefined },
        'UTC',
      ),
      new Date(2026, 2, 1),
      new Date(2026, 3, 1),
    );
    expect(
      occurrences.map((o) => [day(o.startDate), ...clock(o.startDate)]),
    ).toEqual([
      [7, 14, 0],
      [14, 13, 0],
      [21, 13, 0],
    ]);
  });

  it('converts UTC and TZID stamps into the parse frame', () => {
    const rule = parseRecurrenceRule(
      'RRULE:FREQ=DAILY;UNTIL=20260310T130000Z\nEXDATE;TZID=Europe/Istanbul:20260309T160000',
      { timeZone: NY },
    );
    expect(rule).not.toBeNull();
    expect(clock(rule!.until!)).toEqual([9, 0]);
    expect(clock(rule!.exDates![0])).toEqual([9, 0]);
    expect(day(rule!.exDates![0])).toBe(9);
  });

  it('writes occurrence exceptions in the series zone', () => {
    const appointment = appointmentIn(series, IST);
    const [, second] = expandAppointment(
      appointment,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
    );
    const stamp = occurrenceSeriesStart(second, second.startDate);
    expect([day(stamp), ...clock(stamp)]).toEqual([8, 9, 0]);
    const skipped = expandAppointment(
      appointmentIn({ ...series, recurrenceException: '20260308T090000' }, IST),
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
    );
    expect(skipped.map((o) => day(o.startDate))).toEqual([7, 9, 10]);
  });
});

describe('editor time zones', () => {
  const item: Item = {
    id: 3,
    text: 'Review',
    startDate: utc(2026, 1, 12, 14),
    endDate: utc(2026, 1, 12, 15),
    startTimeZone: NY,
  };

  it('shows the dates in the item zone with the pickers', () => {
    const appointment = appointmentIn(item, IST);
    const model = editorModelFrom(appointment, true, [], {
      timeZoneEditor: true,
    });
    expect(clock(model.startDate)).toEqual([9, 0]);
    expect(model.startTimeZone).toBe(NY);
    expect(model.timeZoneFrame).toBe(true);
    const fields = buildSchedulerEditorItems(
      OGE_DEFAULT_SCHEDULER_CONFIG.messages.editor,
      [],
      model,
      'en-US',
    ).map((entry) => entry.field);
    expect(fields).toContain('startTimeZone');
    expect(fields).toContain('endTimeZone');
    // without the option the editor stays in the display zone
    const plain = editorModelFrom(appointment, true, []);
    expect(clock(plain.startDate)).toEqual([17, 0]);
    expect(
      buildSchedulerEditorItems(
        OGE_DEFAULT_SCHEDULER_CONFIG.messages.editor,
        [],
        plain,
        'en-US',
      ).map((entry) => entry.field),
    ).not.toContain('startTimeZone');
  });

  it('saves the typed time in the picked zone', () => {
    const appointment = appointmentIn(item, IST);
    const model: SchedulerEditorModel = {
      ...editorModelFrom(appointment, true, [], { timeZoneEditor: true }),
      // the user keeps 09:00 but switches the zone to Kathmandu
      startTimeZone: KTM,
      endTimeZone: null,
    };
    const patch = buildPatchFromEditor(item, model, fieldsIn(IST), []);
    expect((patch.startDate as Date).toISOString()).toBe(
      '2026-01-12T03:15:00.000Z',
    );
    expect(patch.startTimeZone).toBe(KTM);
    const created = buildItemFromEditor<Item>(model, fieldsIn(IST), []);
    expect((created.startDate as Date).toISOString()).toBe(
      '2026-01-12T03:15:00.000Z',
    );
    expect(created.startTimeZone).toBe(KTM);
  });
});

/* ---------- the core ---------- */

const PLAIN: OgeReactivityAdapter = {
  cell<V>(initial: V): OgeReactiveCell<V> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<V>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

function coreIn(timeZone: string | undefined, data: readonly Item[]) {
  let date = utc(2026, 3, 8, 12);
  let view: OgeSchedulerView = 'day';
  const events: { name: string; event: unknown }[] = [];
  const record = (name: string) => (event: unknown) =>
    events.push({ name, event });
  const inputs: OgeSchedulerCoreInputs<Item> = {
    dataSource: () => data,
    keyExpr: () => 'id',
    textExpr: () => 'text',
    startDateExpr: () => 'startDate',
    endDateExpr: () => 'endDate',
    allDayExpr: () => 'allDay',
    colorExpr: () => 'color',
    locationExpr: () => 'location',
    descriptionExpr: () => 'description',
    recurrenceRuleExpr: () => 'recurrenceRule',
    recurrenceExceptionExpr: () => 'recurrenceException',
    disabledExpr: () => 'disabled',
    reminderExpr: () => 'reminder',
    currentDate: () => date,
    currentView: () => view,
    views: () => ['day', 'week'],
    firstDayOfWeek: () => 1,
    weekendDays: () => undefined,
    dayStartHour: () => 0,
    dayEndHour: () => 24,
    cellDuration: () => 30,
    agendaDuration: () => 7,
    resources: () => [],
    groups: () => [],
    locale: () => 'en-US',
    messages: () => ({}),
    allowAdding: () => true,
    allowUpdating: () => true,
    allowDeleting: () => true,
    allowDragging: () => true,
    allowResizing: () => true,
    readOnly: () => false,
    recurrenceEditMode: () => 'series',
    min: () => undefined,
    max: () => undefined,
    dateNavigatorText: () => undefined,
    timeZone: () => timeZone,
  };
  const core = new OgeSchedulerCore<Item, unknown>({
    rx: PLAIN,
    inputs,
    config: () => OGE_DEFAULT_SCHEDULER_CONFIG,
    setCurrentDate: (next) => (date = next),
    setCurrentView: (next) => (view = next),
    events: {
      appointmentAdding: record('appointmentAdding'),
      appointmentAdded: record('appointmentAdded'),
      appointmentUpdating: record('appointmentUpdating'),
      appointmentUpdated: record('appointmentUpdated'),
      appointmentDeleting: record('appointmentDeleting'),
      appointmentDeleted: record('appointmentDeleted'),
      appointmentClick: record('appointmentClick'),
      appointmentDblClick: record('appointmentDblClick'),
      cellClick: record('cellClick'),
      cellDblClick: record('cellDblClick'),
      editorShowing: record('editorShowing'),
      rangeSelected: record('rangeSelected'),
      appointmentContextMenu: record('appointmentContextMenu'),
      cellContextMenu: record('cellContextMenu'),
      reminderTriggered: record('reminderTriggered'),
    },
    surfaces: {
      openPopup: () => undefined,
      closePopup: () => undefined,
      editorItems: () => [],
      openEditor: () => undefined,
      closeEditor: () => undefined,
      hostRect: () => ({ left: 0, top: 0 }),
      focusMenu: () => undefined,
    },
  });
  core.bindSource(data);
  return {
    core,
    events,
    date: () => date,
    setView: (v: OgeSchedulerView) => (view = v),
  };
}

describe('OgeSchedulerCore with a timeZone', () => {
  const data: Item[] = [
    {
      id: 1,
      text: 'Early',
      startDate: utc(2026, 3, 8, 6, 30), // 01:30 EST
      endDate: utc(2026, 3, 8, 8, 0), // 04:00 EDT
    },
  ];

  it('anchors the views on the zone day of currentDate', () => {
    const { core } = coreIn(NY, data);
    expect([day(core.viewDate()), ...clock(core.viewDate())]).toEqual([
      8, 8, 0,
    ]);
    // the 23-hour day still spans midnight to midnight on the wall
    expect(core.getStartViewDate().toISOString()).toBe(
      '2026-03-08T05:00:00.000Z',
    );
    expect(core.getEndViewDate().toISOString()).toBe(
      '2026-03-09T04:00:00.000Z',
    );
    expect(
      (core.getEndViewDate().getTime() - core.getStartViewDate().getTime()) /
        3_600_000,
    ).toBe(23);
  });

  it('renders the DST-day appointment by wall clock', () => {
    const { core } = coreIn(NY, data);
    const [appointment] = core.visibleAppointments();
    expect(clock(appointment.startDate)).toEqual([1, 30]);
    expect(clock(appointment.endDate)).toEqual([4, 0]);
  });

  it('emits instants from cell events and navigation', () => {
    const { core, events, date } = coreIn(NY, data);
    core.onCellClicked({
      cellDate: new Date(2026, 2, 8, 2, 30),
      allDay: false,
      event: new MouseEvent('click'),
    });
    const click = events.find((entry) => entry.name === 'cellClick')!.event as {
      cellDate: Date;
    };
    // a slot inside the skipped hour is the first real instant after it
    expect(click.cellDate.toISOString()).toBe('2026-03-08T07:30:00.000Z');
    core.navigate(1);
    expect(date().toISOString()).toBe('2026-03-09T12:00:00.000Z');
  });

  it('snaps a drag in wall time and stores the instant', () => {
    const { core } = coreIn(NY, data);
    const [appointment] = core.visibleAppointments();
    core.onMoveCommitted({
      appointment,
      proposal: {
        startDate: new Date(2026, 2, 8, 9, 0),
        endDate: new Date(2026, 2, 8, 10, 30),
        allDay: false,
      },
    });
    const stored = core.store()[0];
    expect((stored.startDate as Date).toISOString()).toBe(
      '2026-03-08T13:00:00.000Z',
    );
  });

  it('exports TZID values to iCalendar', () => {
    const { core } = coreIn(NY, data);
    const text = buildSchedulerICalendar(core.getExportData());
    expect(text).toContain('DTSTART;TZID=America/New_York:20260308T013000');
    expect(text).toContain('DTEND;TZID=America/New_York:20260308T040000');
    const exported = buildSchedulerExportData({
      appointments: core.appointments(),
      rangeStart: new Date(2026, 2, 8),
      rangeEnd: new Date(2026, 2, 9),
      title: '',
      locale: 'en-US',
      fields: core.fields(),
      resources: [],
      messages: OGE_DEFAULT_SCHEDULER_CONFIG.messages.export,
    });
    expect(clock(exported.rows[0].startDate)).toEqual([1, 30]);
  });

  it('leaves everything untouched without a zone', () => {
    const { core } = coreIn(undefined, data);
    expect(core.viewTimeZone()).toBeUndefined();
    expect(core.visibleAppointments()[0].startDate.getTime()).toBe(
      utc(2026, 3, 8, 6, 30).getTime(),
    );
  });
});
