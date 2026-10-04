import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeCalendar,
  OgeDateBox,
  OgeDateRangeBox,
  ogeDateRangePresets,
  type OgeCalendarRange,
  type OgeDateRangePreset,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import {
  REACT_INPUTS_DATE_BOX_SECTIONS,
  ReactInputsDateBoxDemos,
} from '../react-inputs/date-box';
import { PageToc } from '../../shared/page-toc';
import {
  CALENDAR_SNIPPET,
  CLOCK_SNIPPET,
  DATEBOX_SNIPPET,
  GRID_SNIPPET,
  MASK_SNIPPET,
  PRESETS_SNIPPET,
  RANGE_SNIPPET,
  TIMEVIEW_SNIPPET,
  TYPES_SNIPPET,
} from './date-box-snippets';

const SECTIONS = [
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

@Component({
  selector: 'app-inputs-date-box',
  imports: [
    OgeCalendar,
    OgeDateBox,
    OgeDateRangeBox,
    DemoCard,
    DocHeader,
    ReactInputsDateBoxDemos,
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
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeCalendar /&gt;</code> is a standalone month/year/decade
          calendar; <code>&lt;OgeDateBox /&gt;</code> puts it behind a field
          with locale-aware text parsing. Everything runs on native
          <code>Date</code> + <code>Intl</code> — no date library, no adapter,
          and all day math is local (never <code>Date.parse</code>), so values
          can't drift across timezones. The React editors run the same
          <code>&#64;oge-ui/behavior</code> calendar core as the Angular ones;
          only the API is React's: <code>value</code> +
          <code>onValueChange</code> (and <code>range</code> +
          <code>onRangeChange</code> for a range calendar).
        </p>
      } @else {
        <p>
          <code>&lt;oge-calendar&gt;</code> is a standalone month/year/decade
          calendar; <code>&lt;oge-date-box&gt;</code> puts it behind a field
          with locale-aware text parsing. Everything runs on native
          <code>Date</code> + <code>Intl</code> — no date library, no adapter,
          and all day math is local (never <code>Date.parse</code>), so values
          can't drift across timezones.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-date-box-demos />
    } @else {
      <app-demo-card
        heading="Calendar"
        description="WAI-ARIA date grid with a roving-tabindex day: arrows move ±1/±7 days, <kbd>PgUp</kbd>/<kbd>PgDn</kbd> ±1 month (<kbd>Shift</kbd> ±1 year), <kbd>Home</kbd>/<kbd>End</kbd> week edges. The header drills out to year and decade views. <code>min</code>/<code>max</code>/<code>disabledDates</code> gate selection; week numbers follow a configurable rule."
        [chips]="['roving tabindex', 'min/max', 'showWeekNumbers']"
        [code]="calendarSnippet"
        language="ts"
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
        language="ts"
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
        description="<code>selectionMode: 'range'</code> turns the calendar into a start–end picker with a live hover preview; <code>viewsCount: 2</code> lays two months side by side. <code>&amp;lt;oge-date-range-box&amp;gt;</code> puts the same picker behind a single field with two parsed inputs — a reversed pair reorders on commit, either end may stay open. <code>type: 'datetime'</code> adds start/end time lists: day and time picks collect in a draft and commit together on OK."
        [chips]="[
          'selectionMode: range',
          'viewsCount',
          'oge-date-range-box',
          'type: datetime',
        ]"
        [code]="rangeSnippet"
        language="ts"
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
        language="ts"
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
          <oge-date-box
            label="Due"
            applyValueMode="useButtons"
            [(value)]="due"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Clock, seconds & shortcuts"
        description="<code>hour12: true</code> adds an AM/PM column to the column picker (hours 12, 1 … 11); <code>false</code> forces 24-hour; unset follows the locale. <code>showSeconds</code> adds a seconds column and shows the seconds in the field — typed <code>HH:MM:SS</code> parses. <code>showTodayButton</code> / <code>showNowButton</code> put Today and Now in the footer: Today keeps the time of day, Now commits the current time."
        [chips]="['hour12', 'showSeconds', 'showTodayButton', 'showNowButton']"
        [code]="clockSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-date-box
            label="Departure"
            type="time"
            timeView="columns"
            [hour12]="true"
            [showSeconds]="true"
            [showNowButton]="true"
            [(value)]="departure"
          />
          <oge-date-box
            label="Logged at"
            type="datetime"
            [showTodayButton]="true"
            [showNowButton]="true"
            [(value)]="loggedAt"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Masked entry"
        description="<code>useMaskBehavior</code> swaps free typing for segments in the locale's own order and separators (<code>dd.mm.yyyy</code> in de-DE, <code>mm/dd/yyyy, hh:mm --</code> in en-US): digits fill the selected segment and jump on once no further digit fits, <kbd>&uarr;</kbd>/<kbd>&darr;</kbd> step it with wrap-around, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> move between segments (mirrored in RTL), <kbd>Backspace</kbd> clears one, a typed separator moves on, <kbd>a</kbd>/<kbd>p</kbd> set AM/PM and <kbd>Alt</kbd>+<kbd>&darr;</kbd> opens the picker. A pasted date fills every segment; an impossible one (Feb 31) shows the invalid state and reverts on blur."
        [chips]="['useMaskBehavior', 'segments', 'Intl order']"
        [code]="maskSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-date-box
            label="Invoice date"
            locale="de-DE"
            [useMaskBehavior]="true"
            [(value)]="invoiceDate"
          />
          <oge-date-box
            label="Check-in"
            type="datetime"
            locale="en-US"
            [useMaskBehavior]="true"
            [(value)]="checkIn"
          />
        </div>
        <p class="mt-3 text-sm">
          Invoice date:
          <code data-testid="mask-date-value">{{
            invoiceDate()?.toDateString() ?? 'null'
          }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        heading="Range presets & time ranges"
        description="<code>presets</code> lists quick ranges beside the calendar — the built-in <code>ogeDateRangePresets.last7Days()</code>, <code>thisMonth()</code>, <code>lastMonth()</code>… (labels from the messages) or your own <code>{ label, range: () =&amp;gt; [start, end] }</code>, evaluated on pick so a page left open past midnight stays right. The active preset reads <code>aria-pressed</code>; the adaptive dialog shows them as a chip row. <code>type: 'time'</code> makes a time-range picker: no calendar, two time lists and OK."
        [chips]="['presets', 'ogeDateRangePresets', 'type: time']"
        [code]="presetsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-date-range-box
            label="Report period"
            [presets]="presets"
            [(value)]="report"
          />
          <oge-date-range-box
            label="Opening hours"
            type="time"
            [interval]="30"
            [(value)]="hours"
          />
        </div>
        <p class="mt-3 text-sm">
          Report:
          <code data-testid="preset-range-value"
            >{{ report()[0]?.toDateString() ?? '—' }} →
            {{ report()[1]?.toDateString() ?? '—' }}</code
          >
        </p>
      </app-demo-card>
    }

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
        typed text. With <code>useMaskBehavior</code> the arrows edit segments
        instead, so <kbd>Alt</kbd>+<kbd>&darr;</kbd> opens the picker.
      </li>
      <li>
        Time columns are labelled listboxes (Hours, Minutes, Seconds, AM/PM —
        from the messages); range presets are a labelled group of
        <code>aria-pressed</code> toggle buttons.
      </li>
      <li>
        All texts (month/weekday names, aria labels, error messages) come from
        <code>Intl</code> + the localized <code>OgeInputsMessages</code>.
      </li>
    </ul>
  `,
})
export class InputsDateBoxPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_DATE_BOX_SECTIONS;
  protected readonly calendarSnippet = CALENDAR_SNIPPET;
  protected readonly dateBoxSnippet = DATEBOX_SNIPPET;
  protected readonly rangeSnippet = RANGE_SNIPPET;
  protected readonly timeViewSnippet = TIMEVIEW_SNIPPET;
  protected readonly typesSnippet = TYPES_SNIPPET;
  protected readonly gridSnippet = GRID_SNIPPET;
  protected readonly clockSnippet = CLOCK_SNIPPET;
  protected readonly maskSnippet = MASK_SNIPPET;
  protected readonly presetsSnippet = PRESETS_SNIPPET;

  protected readonly departure = signal<Date | null>(
    new Date(2026, 7, 15, 18, 45, 0),
  );
  protected readonly loggedAt = signal<Date | null>(null);
  protected readonly invoiceDate = signal<Date | null>(null);
  protected readonly checkIn = signal<Date | null>(
    new Date(2026, 7, 15, 14, 0),
  );
  protected readonly presets: OgeDateRangePreset[] = [
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
  protected readonly report = signal<OgeCalendarRange>([null, null]);
  protected readonly hours = signal<OgeCalendarRange>([
    new Date(2026, 7, 15, 9, 0),
    new Date(2026, 7, 15, 17, 30),
  ]);

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
