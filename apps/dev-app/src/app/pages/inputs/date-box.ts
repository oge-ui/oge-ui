import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeCalendar,
  OgeDateBox,
  OgeDateRangeBox,
  type OgeCalendarRange,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const CALENDAR_SNIPPET = `<oge-calendar [(value)]="date" />

<oge-calendar
  [min]="min"
  [disabledDates]="isWeekend"
  [showTodayButton]="true"
  [showWeekNumbers]="true"
  [firstDayOfWeek]="1"
  [(value)]="date"
/>`;

const DATEBOX_SNIPPET = `<oge-date-box label="Start date" [(value)]="start" />

<!-- typed text parses locale-aware through Intl — never Date.parse -->
<oge-date-box
  label="Delivery"
  [min]="today"
  [showClearButton]="true"
  [(value)]="delivery"
/>`;

const TYPES_SNIPPET = `<oge-date-box label="Meeting" type="datetime" [interval]="15" [(value)]="at" />
<oge-date-box label="Alarm" type="time" [interval]="30" [(value)]="alarm" />

<!-- OK/Cancel commit policy -->
<oge-date-box label="Due" applyValueMode="useButtons" [(value)]="due" />`;

const GRID_SNIPPET = `<!-- grid date editors and the filter row now run on <oge-date-box> -->
<oge-grid [data]="rows" [filterRow]="true" [editing]="{ mode: 'cell' }">
  <oge-column field="shipped" dataType="date" />
</oge-grid>
<!-- filtering builds a timezone-safe local day-range: [startOfDay, nextDay) -->`;

const RANGE_SNIPPET = `<!-- two-view range calendar with hover preview -->
<oge-calendar selectionMode="range" [viewsCount]="2" [(range)]="range" />

<!-- start–end on one field; typed or picked, reversed pairs reorder -->
<oge-date-range-box label="Period" [(value)]="period" />

<!-- datetime range: start/end time lists + OK, commits as a draft -->
<oge-date-range-box type="datetime" [interval]="30" [(value)]="window" />`;

const TIMEVIEW_SNIPPET = `<!-- one interval list (default) … -->
<oge-date-box type="time" timeView="list" [interval]="30" [(value)]="t1" />

<!-- … or hour + minute columns -->
<oge-date-box type="time" timeView="columns" [interval]="5" [(value)]="t2" />`;

const SECTIONS = [
  'Calendar',
  'Date Box',
  'Range selection',
  'Time & datetime',
  'Grid integration',
  'Keyboard & accessibility',
] as const;

@Component({
  selector: 'app-inputs-date-box',
  imports: [
    OgeCalendar,
    OgeDateBox,
    OgeDateRangeBox,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Date Editors"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['calendar', 'date box', 'Intl-only', 'timezone-safe']"
    >
      <p>
        <code>&lt;oge-calendar&gt;</code> is a standalone month/year/decade
        calendar; <code>&lt;oge-date-box&gt;</code> puts it behind a field with
        locale-aware text parsing. Everything runs on native <code>Date</code> +
        <code>Intl</code> — no date library, no adapter, and all day math is
        local (never <code>Date.parse</code>), so values can't drift across
        timezones.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      heading="Calendar"
      description="WAI-ARIA date grid with a roving-tabindex day: arrows move ±1/±7 days, <kbd>PgUp</kbd>/<kbd>PgDn</kbd> ±1 month (<kbd>Shift</kbd> ±1 year), <kbd>Home</kbd>/<kbd>End</kbd> week edges. The header drills out to year and decade views. <code>min</code>/<code>max</code>/<code>disabledDates</code> gate selection; week numbers follow a configurable rule."
      [chips]="['roving tabindex', 'min/max', 'showWeekNumbers']"
      [code]="calendarSnippet"
    >
      <div class="flex flex-wrap items-start gap-8">
        <oge-calendar [(value)]="date" />
        <oge-calendar
          [min]="minDate"
          [disabledDates]="isWeekend"
          [showTodayButton]="true"
          [showWeekNumbers]="true"
          [firstDayOfWeek]="1"
          [(value)]="date"
        />
        <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
          value: <code>{{ date()?.toDateString() ?? 'null' }}</code>
        </div>
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Date Box"
      description="The value is always a local <code>Date | null</code> — serialization is the app's concern. Typed text parses by the locale's own part order (dd/mm vs mm/dd) incl. month names; unparseable or out-of-range text shows the invalid state and reverts on blur — a wrong date is never committed. The popup follows the APG date-picker-dialog pattern: focus moves into the calendar, <kbd>Esc</kbd> returns it."
      [chips]="['Date | null', 'Intl parse', 'blur revert']"
      [code]="dateBoxSnippet"
    >
      <div class="flex flex-wrap items-start gap-6">
        <oge-date-box label="Start date" [(value)]="start" />
        <oge-date-box
          label="Delivery"
          [min]="minDate"
          [showClearButton]="true"
          hint="Not before Aug 10"
          [(value)]="delivery"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Range selection"
      description="<code>selectionMode: 'range'</code> turns the calendar into a start–end picker with a live hover preview; <code>viewsCount: 2</code> lays two months side by side. <code>&lt;oge-date-range-box&gt;</code> puts the same picker behind a single field with two parsed inputs — a reversed pair reorders on commit, either end may stay open. <code>type: 'datetime'</code> adds start/end time lists: day and time picks collect in a draft and commit together on OK."
      [chips]="[
        'selectionMode: range',
        'viewsCount',
        'oge-date-range-box',
        'type: datetime',
      ]"
      [code]="rangeSnippet"
    >
      <div class="flex flex-wrap items-start gap-8">
        <oge-calendar
          selectionMode="range"
          [viewsCount]="2"
          [(range)]="range"
          [firstDayOfWeek]="1"
        />
        <div class="flex flex-col gap-4">
          <oge-date-range-box
            label="Period"
            [showClearButton]="true"
            [(value)]="period"
          />
          <div class="text-sm text-gray-500 dark:text-gray-400">
            period:
            <code
              >{{ period()[0]?.toDateString() ?? '—' }} →
              {{ period()[1]?.toDateString() ?? '—' }}</code
            >
          </div>
          <oge-date-range-box
            label="Maintenance window"
            type="datetime"
            [interval]="30"
            [showClearButton]="true"
            [(value)]="maintenance"
          />
          <div class="text-sm text-gray-500 dark:text-gray-400">
            window:
            <code
              >{{ maintenance()[0]?.toLocaleString() ?? '—' }} →
              {{ maintenance()[1]?.toLocaleString() ?? '—' }}</code
            >
          </div>
        </div>
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Time & datetime"
      description="<code>type</code> switches the editor: <code>time</code> shows a time picker (clock rail icon), <code>datetime</code> pairs it with the calendar — picking a date keeps the popup open for the time. <code>timeView</code> selects the picker layout: one interval <code>list</code>, or iOS-style hour + minute <code>columns</code>. <code>applyValueMode: 'useButtons'</code> collects picks in a draft and commits on OK."
      [chips]="['type', 'interval', 'timeView', 'applyValueMode']"
      [code]="timeViewSnippet"
    >
      <div class="flex flex-wrap items-start gap-6">
        <oge-date-box
          label="Meeting"
          type="datetime"
          [interval]="15"
          [(value)]="meeting"
        />
        <oge-date-box label="Alarm (list)" type="time" [(value)]="alarm" />
        <oge-date-box
          label="Alarm (columns)"
          type="time"
          timeView="columns"
          [interval]="5"
          [(value)]="alarm"
        />
        <oge-date-box label="Due" applyValueMode="useButtons" [(value)]="due" />
      </div>
    </app-demo-card>

    <h3 id="grid-integration" class="scroll-mt-20">Grid integration</h3>
    <p>
      Grid and tree-list <code>dataType: 'date'</code> cells now edit through
      <code>&lt;oge-date-box&gt;</code> (compact <code>sm</code> shape) and the
      filter row applies a timezone-safe local day-range —
      <code>[startOfDay, nextDay)</code> for equality, day boundaries for
      ordering operators. Rows keep their storage shape: <code>Date</code> stays
      <code>Date</code>, <code>yyyy-MM-dd</code>
      strings round-trip as strings.
    </p>
    <pre><code>{{ gridSnippet }}</code></pre>

    <h3 id="keyboard-accessibility" class="scroll-mt-20">
      Keyboard &amp; accessibility
    </h3>
    <ul>
      <li>
        Calendar: <code>role="grid"</code> with real DOM focus on the day
        buttons (roving tabindex — deliberately not
        <code>aria-activedescendant</code>, per the APG date-picker-dialog
        pattern); <code>aria-current="date"</code> marks today.
      </li>
      <li>
        Date box: <kbd>&darr;</kbd> opens the picker and hands focus to the
        calendar; <kbd>Esc</kbd> closes it and restores focus to the input,
        pressed again it reverts uncommitted text; <kbd>Enter</kbd> commits the
        typed text.
      </li>
      <li>
        All texts (month/weekday names, aria labels, error messages) come from
        <code>Intl</code> + the localized <code>OgeInputsMessages</code>.
      </li>
    </ul>
  `,
})
export class InputsDateBoxPage {
  protected readonly sections = SECTIONS;
  protected readonly calendarSnippet = CALENDAR_SNIPPET;
  protected readonly dateBoxSnippet = DATEBOX_SNIPPET;
  protected readonly rangeSnippet = RANGE_SNIPPET;
  protected readonly timeViewSnippet = TIMEVIEW_SNIPPET;
  protected readonly typesSnippet = TYPES_SNIPPET;
  protected readonly gridSnippet = GRID_SNIPPET;

  protected readonly range = signal<OgeCalendarRange>([null, null]);
  protected readonly period = signal<OgeCalendarRange>([
    new Date(2026, 7, 10),
    new Date(2026, 7, 20),
  ]);
  protected readonly maintenance = signal<OgeCalendarRange>([
    new Date(2026, 7, 14, 22, 0),
    new Date(2026, 7, 15, 6, 30),
  ]);

  protected readonly minDate = new Date(2026, 7, 10);
  protected readonly isWeekend = (date: Date) =>
    date.getDay() === 0 || date.getDay() === 6;

  protected readonly date = signal<Date | null>(new Date(2026, 7, 15));
  protected readonly start = signal<Date | null>(null);
  protected readonly delivery = signal<Date | null>(null);
  protected readonly meeting = signal<Date | null>(
    new Date(2026, 7, 15, 9, 30),
  );
  protected readonly alarm = signal<Date | null>(new Date(2026, 7, 15, 7, 0));
  protected readonly due = signal<Date | null>(null);
}
