import { demoSource } from '../../shared/demo-source';

export const ICAL_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- /export-ical has no dependencies: series stay series (RRULE, RDATE,
     EXDATE), all-day events use VALUE=DATE, and the import folds moved
     occurrences (RECURRENCE-ID) back into their series. -->
<div class="mb-3 flex flex-wrap gap-2">
  <button type="button" (click)="exportIcs()">Download .ics</button>
  <button type="button" (click)="importIcs()">Import sample .ics</button>
</div>
<oge-scheduler
  #cal
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="month"
  [views]="['week', 'month', 'agenda']"
  style="height: 560px"
/>`,
  body: `protected readonly scheduler = viewChild.required<OgeScheduler<Record<string, unknown>>>('cal');
protected readonly date = new Date(2026, 7, 6);
protected readonly appointments: Record<string, unknown>[] = [
  {
    id: 1,
    text: 'Weekly sync',
    startDate: new Date(2026, 7, 3, 10, 0),
    endDate: new Date(2026, 7, 3, 11, 0),
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
  },
];

protected async exportIcs(): Promise<void> {
  const { exportToICalendar } = await import('@oge-ui/scheduler/export-ical');
  exportToICalendar(this.scheduler(), { filename: 'team.ics', calendarName: 'Team' });
}

protected async importIcs(): Promise<void> {
  const { importICalendar } = await import('@oge-ui/scheduler/export-ical');
  // a file input would pass await file.text() here
  const text = await fetch('/team.ics').then((response) => response.text());
  importICalendar(this.scheduler(), text, { uidField: 'uid' });
}`,
});

export const LIST_EXPORT_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- PDF and Excel are lazy entries (jspdf / exceljs peers) exporting the
     visible period as a chronological list; print() prints the view itself. -->
<div class="mb-3 flex flex-wrap gap-2">
  <button type="button" (click)="exportPdf()">PDF</button>
  <button type="button" (click)="exportExcel()">Excel</button>
  <button type="button" (click)="scheduler().print({ title: 'Team week' })">Print</button>
</div>
<oge-scheduler
  #cal
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="week"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly scheduler = viewChild.required<OgeScheduler<Record<string, unknown>>>('cal');
protected readonly date = new Date(2026, 7, 6);
protected readonly appointments: Record<string, unknown>[] = [
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
];

protected async exportPdf(): Promise<void> {
  const { exportSchedulerToPdf } = await import('@oge-ui/scheduler/export-pdf');
  // text outside WinAnsi needs a Unicode font: setOgePdfDefaultFont() from @oge-ui/behavior
  await exportSchedulerToPdf(this.scheduler(), { filename: 'week.pdf' });
}

protected async exportExcel(): Promise<void> {
  const { exportSchedulerToExcel } = await import('@oge-ui/scheduler/export-excel');
  await exportSchedulerToExcel(this.scheduler(), { filename: 'week.xlsx' });
}`,
});
