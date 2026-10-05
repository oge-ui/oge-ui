/**
 * Demo data shared by the scheduler depth pages (views & grouping,
 * resources & availability, recurrence editor, import / export) and their
 * React twins — one data set, so both framework views show the same content.
 * Plain data only: no Angular or React imports.
 */

export type DepthAppt = Record<string, unknown>;

/** The anchor every depth demo opens on (Thursday, 6 August 2026). */
export const DEPTH_DATE = new Date(2026, 7, 6);

export const PEOPLE_RESOURCE = {
  fieldExpr: 'ownerId',
  label: 'Owner',
  useColorAsDefault: true,
  items: [
    { id: 'ada', text: 'Ada', color: '#7c3aed' },
    { id: 'grace', text: 'Grace', color: '#0891b2' },
    { id: 'linus', text: 'Linus', color: '#16a34a' },
  ],
};

export const ROOM_RESOURCE = {
  fieldExpr: 'roomId',
  label: 'Room',
  items: [
    { id: 'north', text: 'North room' },
    { id: 'south', text: 'South room' },
  ],
};

/** People with their own working hours (shaded per column, snap target). */
export const SHIFT_RESOURCE = {
  fieldExpr: 'ownerId',
  label: 'Owner',
  useColorAsDefault: true,
  items: [
    {
      id: 'ada',
      text: 'Ada (8–14)',
      color: '#7c3aed',
      workHours: { start: 8, end: 14 },
    },
    {
      id: 'grace',
      text: 'Grace (12–18)',
      color: '#0891b2',
      workHours: { start: 12, end: 18 },
      workDays: [1, 2, 3, 4],
    },
  ],
};

export function teamAppointments(): DepthAppt[] {
  return [
    {
      id: 1,
      text: 'Daily standup',
      startDate: new Date(2026, 7, 3, 9, 0),
      endDate: new Date(2026, 7, 3, 9, 15),
      recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
      ownerId: 'ada',
      roomId: 'north',
    },
    {
      id: 2,
      text: 'Design pairing',
      startDate: new Date(2026, 7, 6, 10, 0),
      endDate: new Date(2026, 7, 6, 12, 0),
      ownerId: 'grace',
      roomId: 'north',
    },
    {
      id: 3,
      text: 'Release prep',
      startDate: new Date(2026, 7, 6, 13, 0),
      endDate: new Date(2026, 7, 6, 15, 30),
      ownerId: 'linus',
      roomId: 'south',
    },
    {
      id: 4,
      text: 'Customer visit',
      startDate: new Date(2026, 7, 10),
      endDate: new Date(2026, 7, 13),
      allDay: true,
      ownerId: 'ada',
      roomId: 'south',
    },
    {
      id: 5,
      text: 'Interviews',
      startDate: new Date(2026, 7, 7, 14, 0),
      endDate: new Date(2026, 7, 7, 16, 0),
      ownerId: 'grace',
      roomId: 'south',
    },
  ];
}

export function busyMonthAppointments(): DepthAppt[] {
  const day = (hour: number, text: string, color: string): DepthAppt => ({
    id: `busy-${hour}`,
    text,
    startDate: new Date(2026, 7, 5, hour, 0),
    endDate: new Date(2026, 7, 5, hour + 1, 0),
    color,
  });
  return [
    day(8, 'Inbox zero', '#2563eb'),
    day(9, 'Board prep', '#dc2626'),
    day(10, 'Vendor call', '#16a34a'),
    day(13, 'Roadmap', '#7c3aed'),
    day(15, 'Budget review', '#d97706'),
    {
      id: 'offsite',
      text: 'Offsite',
      startDate: new Date(2026, 7, 18),
      endDate: new Date(2026, 7, 20),
      allDay: true,
      color: '#0891b2',
    },
  ];
}

export function availabilityAppointments(): DepthAppt[] {
  return [
    {
      id: 1,
      text: 'Ward round',
      startDate: new Date(2026, 7, 6, 9, 0),
      endDate: new Date(2026, 7, 6, 10, 30),
      ownerId: 'ada',
    },
    {
      id: 2,
      text: 'Clinic',
      startDate: new Date(2026, 7, 5, 14, 0),
      endDate: new Date(2026, 7, 5, 16, 0),
      ownerId: 'grace',
    },
  ];
}

/** Lunch every weekday plus one resource-scoped block. */
export const BLOCKED_SLOTS = [
  {
    startDate: new Date(2026, 7, 3, 12, 0),
    endDate: new Date(2026, 7, 3, 13, 0),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    text: 'Lunch',
  },
  {
    startDate: new Date(2026, 7, 7, 8, 0),
    endDate: new Date(2026, 7, 7, 18, 0),
    resources: { ownerId: 'ada' },
    text: 'Ada — training day',
  },
];

export function conflictAppointments(): DepthAppt[] {
  return [
    {
      id: 1,
      text: 'Surgery block',
      startDate: new Date(2026, 7, 6, 9, 0),
      endDate: new Date(2026, 7, 6, 12, 0),
      color: '#dc2626',
    },
    {
      id: 2,
      text: 'Hold — maybe lunch',
      startDate: new Date(2026, 7, 6, 12, 0),
      endDate: new Date(2026, 7, 6, 13, 30),
      color: '#94a3b8',
      tentative: true,
    },
  ];
}

export interface DepthTask {
  readonly id: string;
  readonly text: string;
  readonly minutes: number;
  readonly color: string;
}

export const BACKLOG_TASKS: readonly DepthTask[] = [
  { id: 't1', text: 'Write release notes', minutes: 60, color: '#2563eb' },
  { id: 't2', text: 'Review pull requests', minutes: 90, color: '#16a34a' },
  { id: 't3', text: 'Prepare demo', minutes: 120, color: '#d97706' },
];

export function recurringAppointments(): DepthAppt[] {
  return [
    {
      id: 'second-tuesday',
      text: 'Patch Tuesday (2nd Tue)',
      startDate: new Date(2026, 7, 11, 10, 0),
      endDate: new Date(2026, 7, 11, 11, 0),
      recurrenceRule: 'FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2',
      color: '#2563eb',
    },
    {
      id: 'payroll',
      text: 'Payroll run',
      startDate: new Date(2026, 7, 1, 9, 0),
      endDate: new Date(2026, 7, 1, 9, 30),
      recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1,15',
      color: '#16a34a',
    },
    {
      id: 'last-workday',
      text: 'Month close (last workday)',
      startDate: new Date(2026, 7, 31, 16, 0),
      endDate: new Date(2026, 7, 31, 17, 0),
      recurrenceRule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
      color: '#dc2626',
    },
    {
      id: 'course',
      text: 'Onboarding course',
      startDate: new Date(2026, 7, 3, 14, 0),
      endDate: new Date(2026, 7, 3, 15, 0),
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6',
      color: '#7c3aed',
    },
    {
      id: 'standup',
      text: 'Standup (skips the 12th)',
      startDate: new Date(2026, 7, 3, 9, 0),
      endDate: new Date(2026, 7, 3, 9, 15),
      recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260828T235959',
      recurrenceException: '20260812T090000',
      color: '#0891b2',
    },
  ];
}

/** A small calendar file the import demo reads (a series with one moved occurrence). */
export const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Example//Team calendar//EN',
  'BEGIN:VEVENT',
  'UID:retro@example.com',
  'DTSTAMP:20260801T080000Z',
  'DTSTART:20260807T150000',
  'DTEND:20260807T160000',
  'SUMMARY:Sprint retro',
  'RRULE:FREQ=WEEKLY;BYDAY=FR;COUNT=4',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:retro@example.com',
  'DTSTAMP:20260801T080000Z',
  'RECURRENCE-ID:20260814T150000',
  'DTSTART:20260814T110000',
  'DTEND:20260814T120000',
  'SUMMARY:Sprint retro (moved)',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:holiday@example.com',
  'DTSTAMP:20260801T080000Z',
  'DTSTART;VALUE=DATE:20260810',
  'DTEND;VALUE=DATE:20260811',
  'SUMMARY:Team holiday',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');
