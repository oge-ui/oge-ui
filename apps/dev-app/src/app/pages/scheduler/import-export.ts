import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { OgeScheduler } from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SCHEDULER_IMPORT_EXPORT_SECTIONS,
  ReactSchedulerImportExportDemos,
} from '../react-scheduler/import-export';
import { ICAL_SNIPPET, LIST_EXPORT_SNIPPET } from './import-export-snippets';
import {
  DEPTH_DATE,
  SAMPLE_ICS,
  recurringAppointments,
  teamAppointments,
  type DepthAppt,
} from './scheduler-depth-data';

const SECTIONS = ['iCalendar', 'PDF, Excel & print'] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

@Component({
  selector: 'app-scheduler-import-export',
  imports: [
    DemoCard,
    DocHeader,
    OgeScheduler,
    PageToc,
    ReactSchedulerImportExportDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Import / export"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="['.ics export', '.ics import', 'PDF', 'Excel', 'print()']"
    >
      <p>
        Three lazy secondary entries keep the main bundle small:
        <code>/export-ical</code> (RFC 5545, no dependencies),
        <code>/export-pdf</code> (the <code>jspdf</code> peer, with the same
        Unicode font registry as every other OGE PDF export) and
        <code>/export-excel</code> (the <code>exceljs</code> peer). Each reads
        the scheduler's <code>getExportData()</code> model, so a custom pipeline
        can start from the same rows. <code>print()</code> prints the current
        view itself.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-import-export-demos />
    } @else {
      <app-demo-card
        [chips]="['exportToICalendar', 'importICalendar', 'RECURRENCE-ID']"
        heading="iCalendar"
        description="Download the calendar as <code>.ics</code> — the recurring series export as <code>RRULE</code> with their skipped dates as <code>EXDATE</code> — or import a sample file: a weekly retro with one moved occurrence and an all-day holiday. Every imported event runs through the cancelable <code>appointmentAdding</code> pipeline."
        [code]="icalSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button type="button" [class]="button" (click)="exportIcs()">
            Download .ics
          </button>
          <button type="button" [class]="button" (click)="previewIcs()">
            Show .ics text
          </button>
          <button type="button" [class]="button" (click)="importIcs()">
            Import sample .ics
          </button>
        </div>
        <oge-scheduler
          #icalCal
          [dataSource]="icalData"
          [currentDate]="date"
          currentView="month"
          [views]="['week', 'month', 'agenda']"
          style="height: 560px"
        />
        @if (icsText()) {
          <pre
            class="mt-3 max-h-64 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800"
            >{{ icsText() }}</pre>
        }
        <p class="mt-2 text-sm" aria-live="polite">{{ status() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['exportSchedulerToPdf', 'exportSchedulerToExcel', 'print()']"
        heading="PDF, Excel & print"
        description="The list exports write the visible period's appointments in chronological order — grouped by day in the PDF, one typed row per occurrence in Excel, with a column per resource kind. <code>print()</code> clones the view with the page's styles into a hidden frame and opens the print dialog."
        [code]="listExportSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button type="button" [class]="button" (click)="exportPdf()">
            PDF
          </button>
          <button type="button" [class]="button" (click)="exportExcel()">
            Excel
          </button>
          <button
            type="button"
            [class]="button"
            (click)="listScheduler().print({ title: 'Team week' })"
          >
            Print
          </button>
        </div>
        <oge-scheduler
          #listCal
          [dataSource]="listData"
          [currentDate]="date"
          currentView="week"
          [dayStartHour]="8"
          [dayEndHour]="18"
          style="height: 560px"
        />
      </app-demo-card>
    }
  `,
})
export class SchedulerImportExportPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_SCHEDULER_IMPORT_EXPORT_SECTIONS;
  protected readonly icalSnippet = ICAL_SNIPPET;
  protected readonly listExportSnippet = LIST_EXPORT_SNIPPET;
  protected readonly button = BUTTON;

  protected readonly icalScheduler =
    viewChild.required<OgeScheduler<DepthAppt>>('icalCal');
  protected readonly listScheduler =
    viewChild.required<OgeScheduler<DepthAppt>>('listCal');

  protected readonly date = DEPTH_DATE;
  protected readonly icalData = recurringAppointments();
  protected readonly listData = teamAppointments();
  protected readonly icsText = signal('');
  protected readonly status = signal('');

  protected async exportIcs(): Promise<void> {
    const { exportToICalendar } = await import('@oge-ui/scheduler/export-ical');
    exportToICalendar(this.icalScheduler(), {
      filename: 'team.ics',
      calendarName: 'Team',
    });
  }

  protected async previewIcs(): Promise<void> {
    const { exportToICalendar } = await import('@oge-ui/scheduler/export-ical');
    this.icsText.set(
      exportToICalendar(this.icalScheduler(), {
        calendarName: 'Team',
        download: false,
      }),
    );
  }

  protected async importIcs(): Promise<void> {
    const { importICalendar } = await import('@oge-ui/scheduler/export-ical');
    const items = importICalendar(this.icalScheduler(), SAMPLE_ICS, {
      uidField: 'uid',
    });
    this.status.set('Imported ' + items.length + ' appointments.');
  }

  protected async exportPdf(): Promise<void> {
    const { exportSchedulerToPdf } =
      await import('@oge-ui/scheduler/export-pdf');
    await exportSchedulerToPdf(this.listScheduler(), { filename: 'week.pdf' });
  }

  protected async exportExcel(): Promise<void> {
    const { exportSchedulerToExcel } =
      await import('@oge-ui/scheduler/export-excel');
    await exportSchedulerToExcel(this.listScheduler(), {
      filename: 'week.xlsx',
    });
  }
}
