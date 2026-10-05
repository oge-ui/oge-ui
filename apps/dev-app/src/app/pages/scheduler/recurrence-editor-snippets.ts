import { demoSource } from '../../shared/demo-source';

export const RULES_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- The editor reads and writes these RRULEs in full: the nth / last
     weekday (BYSETPOS), several days of the month, a yearly month + weekday,
     COUNT or UNTIL. Rules it cannot express are kept verbatim; a live summary
     ("Monthly on the second Tuesday") reads the rule back. Double-click a
     chip to open the editor. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="month"
  [views]="['week', 'month', 'agenda']"
  style="height: 640px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 6);
protected readonly appointments = [
  {
    id: 'second-tuesday',
    text: 'Patch Tuesday (2nd Tue)',
    startDate: new Date(2026, 7, 11, 10, 0),
    endDate: new Date(2026, 7, 11, 11, 0),
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2',
  },
  {
    id: 'payroll',
    text: 'Payroll run',
    startDate: new Date(2026, 7, 1, 9, 0),
    endDate: new Date(2026, 7, 1, 9, 30),
    recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1,15',
  },
  {
    id: 'last-workday',
    text: 'Month close (last workday)',
    startDate: new Date(2026, 7, 31, 16, 0),
    endDate: new Date(2026, 7, 31, 17, 0),
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
  },
  {
    id: 'course',
    text: 'Onboarding course',
    startDate: new Date(2026, 7, 3, 14, 0),
    endDate: new Date(2026, 7, 3, 15, 0),
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6',
  },
];`,
});

export const EXCEPTIONS_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- recurrenceException lists skipped occurrences (EXDATE stamps). The
     editor shows them as removable chips and adds new ones from a date
     picker; deleting a single occurrence from the popup adds one too. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="week"
  [dayStartHour]="8"
  [dayEndHour]="12"
  recurrenceEditMode="dialog"
  style="height: 480px"
/>`,
  body: `protected readonly date = new Date(2026, 7, 12);
protected readonly appointments = [
  {
    id: 'standup',
    text: 'Standup (skips the 12th)',
    startDate: new Date(2026, 7, 3, 9, 0),
    endDate: new Date(2026, 7, 3, 9, 15),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260828T235959',
    recurrenceException: '20260812T090000',
  },
];`,
});
