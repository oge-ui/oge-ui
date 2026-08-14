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
  type OgeCalendarRange,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_DATE_BOX_DEMOS } from './date-box-snippets';

/**
 * TOC of the React view — the same six sections as the Angular date editors
 * page (`docs/REACT-PARITY.md`: pages mirror section for section). The last
 * two are prose sections the page renders for both layers.
 */
export const REACT_INPUTS_DATE_BOX_SECTIONS = [
  'Calendar',
  'Date Box',
  'Range selection',
  'Time & datetime',
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
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
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
  `,
})
export class ReactInputsDateBoxDemos {
  protected readonly demos = INPUTS_DATE_BOX_DEMOS;

  protected readonly calendar = () => createElement(CalendarDemo);
  protected readonly dateBox = () => createElement(DateBoxDemo);
  protected readonly range = () => createElement(RangeDemo);
  protected readonly time = () => createElement(TimeDemo);
}
