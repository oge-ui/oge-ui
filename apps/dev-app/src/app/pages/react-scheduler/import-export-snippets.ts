import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Import / export" page — section-for-section
 * mirror of `../scheduler/import-export-snippets.ts`. Pure data.
 */
export const SCHEDULER_IMPORT_EXPORT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'iCalendar',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { '@oge-ui/react-scheduler': ['OgeSchedulerHandle'] },
      name: 'CalendarFiles',
      before: `// /export-ical has no dependencies: series stay series (RRULE, RDATE,
// EXDATE), all-day events use VALUE=DATE, and the import folds moved
// occurrences (RECURRENCE-ID) back into their series.
type Appt = Record<string, unknown>;

const appointments: Appt[] = [
  {
    id: 1,
    text: 'Weekly sync',
    startDate: new Date(2026, 7, 3, 10, 0),
    endDate: new Date(2026, 7, 3, 11, 0),
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
  },
];`,
      body: `const scheduler = useRef<OgeSchedulerHandle<Appt>>(null);

const exportIcs = async () => {
  const { exportToICalendar } = await import('@oge-ui/react-scheduler/export-ical');
  if (scheduler.current) {
    exportToICalendar(scheduler.current, { filename: 'team.ics', calendarName: 'Team' });
  }
};

const importIcs = async () => {
  const { importICalendar } = await import('@oge-ui/react-scheduler/export-ical');
  // a file input would pass await file.text() here
  const text = await fetch('/team.ics').then((response) => response.text());
  if (scheduler.current) importICalendar(scheduler.current, text, { uidField: 'uid' });
};`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap gap-2">
    <button type="button" onClick={exportIcs}>Download .ics</button>
    <button type="button" onClick={importIcs}>Import sample .ics</button>
  </div>
  <OgeScheduler
    ref={scheduler}
    dataSource={appointments}
    defaultCurrentDate={new Date(2026, 7, 6)}
    defaultCurrentView="month"
    views={['week', 'month', 'agenda']}
    style={{ height: 560 }}
  />
</>`,
    }),
  },
  {
    title: 'PDF, Excel & print',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: { '@oge-ui/react-scheduler': ['OgeSchedulerHandle'] },
      name: 'ListExports',
      before: `// PDF and Excel are lazy entries (jspdf / exceljs peers) exporting the
// visible period as a chronological list; print() prints the view itself.
type Appt = Record<string, unknown>;

const appointments: Appt[] = [
  {
    id: 1,
    text: 'Design pairing',
    startDate: new Date(2026, 7, 6, 10, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
  },
  {
    id: 2,
    text: 'Customer visit',
    startDate: new Date(2026, 7, 4),
    endDate: new Date(2026, 7, 6),
    allDay: true,
  },
];`,
      body: `const scheduler = useRef<OgeSchedulerHandle<Appt>>(null);

const exportPdf = async () => {
  const { exportSchedulerToPdf } = await import('@oge-ui/react-scheduler/export-pdf');
  // text outside WinAnsi needs a Unicode font: setOgePdfDefaultFont() from @oge-ui/behavior
  if (scheduler.current) await exportSchedulerToPdf(scheduler.current, { filename: 'week.pdf' });
};

const exportExcel = async () => {
  const { exportSchedulerToExcel } = await import('@oge-ui/react-scheduler/export-excel');
  if (scheduler.current) await exportSchedulerToExcel(scheduler.current, { filename: 'week.xlsx' });
};`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap gap-2">
    <button type="button" onClick={exportPdf}>PDF</button>
    <button type="button" onClick={exportExcel}>Excel</button>
    <button type="button" onClick={() => scheduler.current?.print({ title: 'Team week' })}>
      Print
    </button>
  </div>
  <OgeScheduler
    ref={scheduler}
    dataSource={appointments}
    defaultCurrentDate={new Date(2026, 7, 6)}
    defaultCurrentView="week"
    dayStartHour={8}
    dayEndHour={18}
    style={{ height: 560 }}
  />
</>`,
    }),
  },
];
