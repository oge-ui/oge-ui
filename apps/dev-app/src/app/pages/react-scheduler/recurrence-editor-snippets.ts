import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Recurrence editor" page — section-for-section
 * mirror of `../scheduler/recurrence-editor-snippets.ts`. Pure data.
 */
export const SCHEDULER_RECURRENCE_EDITOR_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Rule patterns',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'RecurringPatterns',
      before: `// The editor reads and writes these RRULEs in full: the nth / last
// weekday (BYSETPOS), several days of the month, a yearly month + weekday,
// COUNT or UNTIL. Rules it cannot express are kept verbatim; a live summary
// ("Every month on the second Tuesday") reads the rule back. Double-click a
// chip to open the editor.
const appointments = [
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
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 6)}
  defaultCurrentView="month"
  views={['week', 'month', 'agenda']}
  style={{ height: 640 }}
/>`,
    }),
  },
  {
    title: 'Exceptions',
    source: reactDemoSource({
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'SkippedOccurrences',
      before: `// recurrenceException lists skipped occurrences (EXDATE stamps). The
// editor shows them as removable chips and adds new ones from a date picker;
// deleting a single occurrence from the popup adds one too.
const appointments = [
  {
    id: 'standup',
    text: 'Standup (skips the 12th)',
    startDate: new Date(2026, 7, 3, 9, 0),
    endDate: new Date(2026, 7, 3, 9, 15),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260828T235959',
    recurrenceException: '20260812T090000',
  },
];`,
      jsx: `<OgeScheduler
  dataSource={appointments}
  defaultCurrentDate={new Date(2026, 7, 12)}
  defaultCurrentView="week"
  dayStartHour={8}
  dayEndHour={12}
  recurrenceEditMode="dialog"
  style={{ height: 480 }}
/>`,
    }),
  },
];
