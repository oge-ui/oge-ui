import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  Fragment,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { OgeScheduler, type OgeSchedulerHandle } from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEPTH_DATE,
  SAMPLE_ICS,
  recurringAppointments,
  teamAppointments,
  type DepthAppt,
} from '../scheduler/scheduler-depth-data';
import { SCHEDULER_IMPORT_EXPORT_DEMOS } from './import-export-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_SCHEDULER_IMPORT_EXPORT_SECTIONS = [
  'iCalendar',
  'PDF, Excel & print',
] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

const button = (label: string, onClick: () => void): ReactNode =>
  createElement(
    'button',
    { type: 'button', className: BUTTON, onClick },
    label,
  );

function ICalDemo(): ReactNode {
  const scheduler = useRef<OgeSchedulerHandle<DepthAppt>>(null);
  const [data] = useState(() => recurringAppointments());
  const [icsText, setIcsText] = useState('');
  const [status, setStatus] = useState('');
  const withScheduler =
    (run: (handle: OgeSchedulerHandle<DepthAppt>) => Promise<void>) => () => {
      if (scheduler.current) void run(scheduler.current);
    };
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      button(
        'Download .ics',
        withScheduler(async (handle) => {
          const { exportToICalendar } =
            await import('@oge-ui/react-scheduler/export-ical');
          exportToICalendar(handle, {
            filename: 'team.ics',
            calendarName: 'Team',
          });
        }),
      ),
      button(
        'Show .ics text',
        withScheduler(async (handle) => {
          const { exportToICalendar } =
            await import('@oge-ui/react-scheduler/export-ical');
          setIcsText(
            exportToICalendar(handle, {
              calendarName: 'Team',
              download: false,
            }),
          );
        }),
      ),
      button(
        'Import sample .ics',
        withScheduler(async (handle) => {
          const { importICalendar } =
            await import('@oge-ui/react-scheduler/export-ical');
          const items = importICalendar(handle, SAMPLE_ICS, {
            uidField: 'uid',
          });
          setStatus('Imported ' + items.length + ' appointments.');
        }),
      ),
    ),
    createElement(OgeScheduler<DepthAppt>, {
      ref: scheduler,
      dataSource: data,
      defaultCurrentDate: DEPTH_DATE,
      defaultCurrentView: 'month',
      views: ['week', 'month', 'agenda'],
      style: { height: 560 },
    }),
    icsText
      ? createElement(
          'pre',
          {
            className:
              'mt-3 max-h-64 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800',
          },
          icsText,
        )
      : null,
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'aria-live': 'polite' },
      status,
    ),
  );
}

function ListExportDemo(): ReactNode {
  const scheduler = useRef<OgeSchedulerHandle<DepthAppt>>(null);
  const [data] = useState(() => teamAppointments());
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      button('PDF', () => {
        const handle = scheduler.current;
        if (!handle) return;
        void import('@oge-ui/react-scheduler/export-pdf').then(
          ({ exportSchedulerToPdf }) =>
            exportSchedulerToPdf(handle, { filename: 'week.pdf' }),
        );
      }),
      button('Excel', () => {
        const handle = scheduler.current;
        if (!handle) return;
        void import('@oge-ui/react-scheduler/export-excel').then(
          ({ exportSchedulerToExcel }) =>
            exportSchedulerToExcel(handle, { filename: 'week.xlsx' }),
        );
      }),
      button('Print', () => {
        void scheduler.current?.print({ title: 'Team week' });
      }),
    ),
    createElement(OgeScheduler<DepthAppt>, {
      ref: scheduler,
      dataSource: data,
      defaultCurrentDate: DEPTH_DATE,
      defaultCurrentView: 'week',
      dayStartHour: 8,
      dayEndHour: 18,
      style: { height: 560 },
    }),
  );
}

/**
 * The React half of "Import / export" — rendered inside
 * `/components/scheduler/import-export` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-scheduler-import-export-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/scheduler/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['exportToICalendar', 'importICalendar', 'RECURRENCE-ID']"
      heading="iCalendar"
      description="Download the calendar as <code>.ics</code> — the recurring series export as <code>RRULE</code> with their skipped dates as <code>EXDATE</code> — or import a sample file: a weekly retro with one moved occurrence and an all-day holiday. Every imported event runs through the cancelable <code>onAppointmentAdding</code> pipeline."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="ical" />
    </app-demo-card>

    <app-demo-card
      [chips]="['exportSchedulerToPdf', 'exportSchedulerToExcel', 'print()']"
      heading="PDF, Excel & print"
      description="The list exports write the visible period's appointments in chronological order — grouped by day in the PDF, one typed row per occurrence in Excel, with a column per resource kind. <code>print()</code> clones the view with the page's styles into a hidden frame and opens the print dialog."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="listExport" />
    </app-demo-card>
  `,
})
export class ReactSchedulerImportExportDemos {
  protected readonly demos = SCHEDULER_IMPORT_EXPORT_DEMOS;
  protected readonly ical = () => createElement(ICalDemo);
  protected readonly listExport = () => createElement(ListExportDemo);
}
