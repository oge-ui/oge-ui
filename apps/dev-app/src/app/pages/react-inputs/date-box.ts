import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeCalendar,
  OgeDateBox,
  OgeDateRangeBox,
  ogeDateRangePresets,
  type OgeCalendarRange,
  type OgeDateRangePreset,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_DATE_BOX_DEMOS } from './date-box-snippets';

/**
 * TOC of the React view — the same nine sections as the Angular date editors
 * page (`docs/REACT-PARITY.md`: pages mirror section for section). The last
 * two are prose sections the page renders for both layers.
 */
export const REACT_INPUTS_DATE_BOX_SECTIONS = [
  'Calendar',
  'Date Box',
  'Range selection',
  'Time & datetime',
  'Clock, seconds & shortcuts',
  'Masked entry',
  'Range presets & time ranges',
  'Grid integration',
  'Keyboard & accessibility',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const note = (...children: ReactNode[]) =>
  createElement(
    'div',
    { className: 'pt-2 text-sm text-gray-500 dark:text-gray-400' },
    ...children,
  );

const minDate = new Date(2026, 7, 10);
const isWeekend = (day: Date): boolean =>
  day.getDay() === 0 || day.getDay() === 6;

/** Two calendars sharing one selected day — a real `useState` demo. */
function CalendarDemo(): ReactNode {
  const [date, setDate] = useState<Date | null>(new Date(2026, 7, 15));
  return row(
    createElement(OgeCalendar, {
      key: 'plain',
      value: date,
      onValueChange: setDate,
    }),
    createElement(OgeCalendar, {
      key: 'gated',
      min: minDate,
      disabledDates: isWeekend,
      showTodayButton: true,
      showWeekNumbers: true,
      firstDayOfWeek: 1,
      value: date,
      onValueChange: setDate,
    }),
    note(
      'value: ',
      createElement('code', { key: 'v' }, date?.toDateString() ?? 'null'),
    ),
  );
}

/** The two date fields — locale-aware parsing, blur revert. */
function DateBoxDemo(): ReactNode {
  const [start, setStart] = useState<Date | null>(null);
  const [delivery, setDelivery] = useState<Date | null>(null);
  return row(
    createElement(OgeDateBox, {
      key: 'start',
      label: 'Start date',
      value: start,
      onValueChange: setStart,
    }),
    createElement(OgeDateBox, {
      key: 'delivery',
      label: 'Delivery',
      min: minDate,
      showClearButton: true,
      hint: 'Not before Aug 10',
      value: delivery,
      onValueChange: setDelivery,
    }),
  );
}

/** Range calendar + the two range fields, with their live read-outs. */
function RangeDemo(): ReactNode {
  const [range, setRange] = useState<OgeCalendarRange>([null, null]);
  const [period, setPeriod] = useState<OgeCalendarRange>([
    new Date(2026, 7, 10),
    new Date(2026, 7, 20),
  ]);
  const [maintenance, setMaintenance] = useState<OgeCalendarRange>([
    new Date(2026, 7, 14, 22, 0),
    new Date(2026, 7, 15, 6, 30),
  ]);
  return row(
    createElement(OgeCalendar, {
      key: 'range',
      selectionMode: 'range',
      viewsCount: 2,
      range,
      onRangeChange: setRange,
      firstDayOfWeek: 1,
    }),
    createElement(
      'div',
      { key: 'fields', className: 'flex flex-col gap-4' },
      createElement(OgeDateRangeBox, {
        key: 'period',
        label: 'Period',
        showClearButton: true,
        value: period,
        onValueChange: setPeriod,
      }),
      note(
        'period: ',
        createElement(
          'code',
          { key: 'p' },
          `${period[0]?.toDateString() ?? '—'} → ${period[1]?.toDateString() ?? '—'}`,
        ),
      ),
      createElement(OgeDateRangeBox, {
        key: 'maintenance',
        label: 'Maintenance window',
        type: 'datetime',
        interval: 30,
        showClearButton: true,
        value: maintenance,
        onValueChange: setMaintenance,
      }),
      note(
        'window: ',
        createElement(
          'code',
          { key: 'w' },
          `${maintenance[0]?.toLocaleString() ?? '—'} → ${maintenance[1]?.toLocaleString() ?? '—'}`,
        ),
      ),
    ),
  );
}

/** The `type` / `timeView` / `applyValueMode` matrix. */
function TimeDemo(): ReactNode {
  const [meeting, setMeeting] = useState<Date | null>(
    new Date(2026, 7, 15, 9, 30),
  );
  const [alarm, setAlarm] = useState<Date | null>(new Date(2026, 7, 15, 7, 0));
  const [due, setDue] = useState<Date | null>(null);
  return row(
    createElement(OgeDateBox, {
      key: 'meeting',
      label: 'Meeting',
      type: 'datetime',
      interval: 15,
      value: meeting,
      onValueChange: setMeeting,
    }),
    createElement(OgeDateBox, {
      key: 'alarm-list',
      label: 'Alarm (list)',
      type: 'time',
      value: alarm,
      onValueChange: setAlarm,
    }),
    createElement(OgeDateBox, {
      key: 'alarm-columns',
      label: 'Alarm (columns)',
      type: 'time',
      timeView: 'columns',
      interval: 5,
      value: alarm,
      onValueChange: setAlarm,
    }),
    createElement(OgeDateBox, {
      key: 'due',
      label: 'Due',
      applyValueMode: 'useButtons',
      value: due,
      onValueChange: setDue,
    }),
  );
}

/** AM/PM + seconds columns and the Today / Now shortcuts. */
function ClockDemo(): ReactNode {
  const [departure, setDeparture] = useState<Date | null>(
    new Date(2026, 7, 15, 18, 45, 0),
  );
  const [loggedAt, setLoggedAt] = useState<Date | null>(null);
  return row(
    createElement(OgeDateBox, {
      key: 'departure',
      label: 'Departure',
      type: 'time',
      timeView: 'columns',
      hour12: true,
      showSeconds: true,
      showNowButton: true,
      value: departure,
      onValueChange: setDeparture,
    }),
    createElement(OgeDateBox, {
      key: 'logged',
      label: 'Logged at',
      type: 'datetime',
      showTodayButton: true,
      showNowButton: true,
      value: loggedAt,
      onValueChange: setLoggedAt,
    }),
  );
}

/** Segment entry in the locale's own order. */
function MaskedDateDemo(): ReactNode {
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(
    new Date(2026, 7, 15, 14, 0),
  );
  return createElement(
    'div',
    null,
    row(
      createElement(OgeDateBox, {
        key: 'invoice',
        label: 'Invoice date',
        locale: 'de-DE',
        useMaskBehavior: true,
        value: invoiceDate,
        onValueChange: setInvoiceDate,
      }),
      createElement(OgeDateBox, {
        key: 'check-in',
        label: 'Check-in',
        type: 'datetime',
        locale: 'en-US',
        useMaskBehavior: true,
        value: checkIn,
        onValueChange: setCheckIn,
      }),
    ),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Invoice date: ',
      createElement(
        'code',
        { 'data-testid': 'mask-date-value' },
        invoiceDate?.toDateString() ?? 'null',
      ),
    ),
  );
}

const presets: OgeDateRangePreset[] = [
  ogeDateRangePresets.today(),
  ogeDateRangePresets.last7Days(),
  ogeDateRangePresets.last30Days(),
  ogeDateRangePresets.thisMonth(),
  ogeDateRangePresets.lastMonth(),
  ogeDateRangePresets.thisYear(),
  {
    label: 'Q1 2026',
    range: () => [new Date(2026, 0, 1), new Date(2026, 2, 31)],
  },
];

/** Quick ranges beside the calendar, and a time-range picker. */
function PresetsDemo(): ReactNode {
  const [report, setReport] = useState<OgeCalendarRange>([null, null]);
  const [hours, setHours] = useState<OgeCalendarRange>([
    new Date(2026, 7, 15, 9, 0),
    new Date(2026, 7, 15, 17, 30),
  ]);
  return createElement(
    'div',
    null,
    row(
      createElement(OgeDateRangeBox, {
        key: 'report',
        label: 'Report period',
        presets,
        value: report,
        onValueChange: setReport,
      }),
      createElement(OgeDateRangeBox, {
        key: 'hours',
        label: 'Opening hours',
        type: 'time',
        interval: 30,
        value: hours,
        onValueChange: setHours,
      }),
    ),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Report: ',
      createElement(
        'code',
        { 'data-testid': 'preset-range-value' },
        `${report[0]?.toDateString() ?? '—'} → ${report[1]?.toDateString() ?? '—'}`,
      ),
    ),
  );
}

/**
 * The React half of the date editors page — the same demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/date-box` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-date-box-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  // the popup surface (and its adaptive sheet) is react-overlay's stylesheet
  styleUrls: [
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      heading="Calendar"
      description="WAI-ARIA date grid with a roving-tabindex day: arrows move ±1/±7 days, <kbd>PgUp</kbd>/<kbd>PgDn</kbd> ±1 month (<kbd>Shift</kbd> ±1 year), <kbd>Home</kbd>/<kbd>End</kbd> week edges. The header drills out to year and decade views. <code>min</code>/<code>max</code>/<code>disabledDates</code> gate selection; week numbers follow a configurable rule."
      [chips]="['roving tabindex', 'min/max', 'showWeekNumbers']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="calendar" />
    </app-demo-card>

    <app-demo-card
      heading="Date Box"
      description="The value is always a local <code>Date | null</code> — serialization is the app's concern. Typed text parses by the locale's own part order (dd/mm vs mm/dd) incl. month names; unparseable or out-of-range text shows the invalid state and reverts on blur — a wrong date is never committed. The popup follows the APG date-picker-dialog pattern: focus moves into the calendar, <kbd>Esc</kbd> returns it."
      [chips]="['Date | null', 'Intl parse', 'blur revert']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="dateBox" />
    </app-demo-card>

    <app-demo-card
      heading="Range selection"
      description="<code>selectionMode: 'range'</code> turns the calendar into a start–end picker with a live hover preview; <code>viewsCount: 2</code> lays two months side by side. <code>OgeDateRangeBox</code> puts the same picker behind a single field with two parsed inputs — a reversed pair reorders on commit, either end may stay open. <code>type: 'datetime'</code> adds start/end time lists: day and time picks collect in a draft and commit together on OK."
      [chips]="[
        'selectionMode: range',
        'viewsCount',
        'OgeDateRangeBox',
        'type: datetime',
      ]"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="range" />
    </app-demo-card>

    <app-demo-card
      heading="Time & datetime"
      description="<code>type</code> switches the editor: <code>time</code> shows a time picker (clock rail icon), <code>datetime</code> pairs it with the calendar — picking a date keeps the popup open for the time. <code>timeView</code> selects the picker layout: one interval <code>list</code>, or iOS-style hour + minute <code>columns</code>. <code>applyValueMode: 'useButtons'</code> collects picks in a draft and commits on OK."
      [chips]="['type', 'interval', 'timeView', 'applyValueMode']"
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="time" />
    </app-demo-card>

    <app-demo-card
      heading="Clock, seconds & shortcuts"
      description="<code>hour12: true</code> adds an AM/PM column to the column picker (hours 12, 1 … 11); <code>false</code> forces 24-hour; unset follows the locale. <code>showSeconds</code> adds a seconds column and shows the seconds in the field — typed <code>HH:MM:SS</code> parses. <code>showTodayButton</code> / <code>showNowButton</code> put Today and Now in the footer: Today keeps the time of day, Now commits the current time."
      [chips]="['hour12', 'showSeconds', 'showTodayButton', 'showNowButton']"
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="clock" />
    </app-demo-card>

    <app-demo-card
      heading="Masked entry"
      description="<code>useMaskBehavior</code> swaps free typing for segments in the locale's own order and separators (<code>dd.mm.yyyy</code> in de-DE, <code>mm/dd/yyyy, hh:mm --</code> in en-US): digits fill the selected segment and jump on once no further digit fits, <kbd>&uarr;</kbd>/<kbd>&darr;</kbd> step it with wrap-around, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> move between segments (mirrored in RTL), <kbd>Backspace</kbd> clears one, a typed separator moves on, <kbd>a</kbd>/<kbd>p</kbd> set AM/PM and <kbd>Alt</kbd>+<kbd>&darr;</kbd> opens the picker. A pasted date fills every segment; an impossible one (Feb 31) shows the invalid state and reverts on blur."
      [chips]="['useMaskBehavior', 'segments', 'Intl order']"
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="masked" />
    </app-demo-card>

    <app-demo-card
      heading="Range presets & time ranges"
      description="<code>presets</code> lists quick ranges beside the calendar — the built-in <code>ogeDateRangePresets.last7Days()</code>, <code>thisMonth()</code>, <code>lastMonth()</code>… (labels from the messages) or your own <code>{ label, range: () =&amp;gt; [start, end] }</code>, evaluated on pick so a page left open past midnight stays right. The active preset reads <code>aria-pressed</code>; the adaptive dialog shows them as a chip row. <code>type: 'time'</code> makes a time-range picker: no calendar, two time lists and OK."
      [chips]="['presets', 'ogeDateRangePresets', 'type: time']"
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="presets" />
    </app-demo-card>
  `,
})
export class ReactInputsDateBoxDemos {
  protected readonly demos = INPUTS_DATE_BOX_DEMOS;

  protected readonly calendar = () => createElement(CalendarDemo);
  protected readonly dateBox = () => createElement(DateBoxDemo);
  protected readonly range = () => createElement(RangeDemo);
  protected readonly time = () => createElement(TimeDemo);
  protected readonly clock = () => createElement(ClockDemo);
  protected readonly masked = () => createElement(MaskedDateDemo);
  protected readonly presets = () => createElement(PresetsDemo);
}
