import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  DATE_ONLY_STRING,
  DATE_ONLY_UTC,
  INSTANT,
  SERVER,
} from './dates-and-time-zones-snippets';

const SECTIONS = [
  'Two kinds of dates',
  'Instants on a chosen clock',
  'Date-only values',
  'What timeZone covers',
  'Server filters',
];

const COVERAGE_ROWS: string[][] = [
  [
    '`oge-date-box` · `<OgeDateBox>`',
    'the field, the calendar, Today / Now, typed and picked values, `min` / `max`',
  ],
  [
    '`oge-calendar` · `<OgeCalendar>`',
    '`value`, `values`, `range`, today, `min` / `max`',
  ],
  [
    '`oge-grid` · `<OgeGrid>` (`timeZone` on the grid or a column)',
    'cell text, value lists and the date tree, the filter row, quick dates, condition filters, cell editors, CSV / PDF text and typed Excel dates',
  ],
  [
    '`oge-scheduler` · `oge-gantt`',
    'their own `timeZone` input (already zone-aware)',
  ],
  [
    'Grid group intervals (by day, month, year)',
    'not covered: the data source groups — in memory, on the runtime zone; group on a server for another zone',
  ],
];

/**
 * `/guides/dates-and-time-zones` — instants versus calendar dates, the
 * `timeZone` input of the date editors and the grid, and the one-day shift.
 */
@Component({
  selector: 'app-guide-dates-and-time-zones',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Dates and time zones"
      category="Guides"
      categoryLink="/guides"
      [chips]="['timeZone', 'date-only values', 'no one-day shift']"
    >
      <p>
        A birthday that shows a day early in New York is the most common date
        bug in business apps. It happens when a calendar day travels as a moment
        in time and the browser re-reads that moment on its own clock. OGE keeps
        the two apart: values stay instants, and a
        <code>timeZone</code> input says which clock shows and edits them.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="two-kinds-of-dates" class="scroll-mt-20">Two kinds of dates</h2>
    <ul>
      <li>
        <strong>Instants</strong> — when an order was placed, when a meeting
        starts. The same moment everywhere; only the clock that displays it
        differs.
      </li>
      <li>
        <strong>Calendar dates</strong> — a birthday, a due date, a holiday. The
        same day everywhere; there is no moment to convert.
      </li>
    </ul>

    <h2 id="instants-on-a-chosen-clock" class="scroll-mt-20">
      Instants on a chosen clock
    </h2>
    <p>
      Without <code>timeZone</code> an editor shows the browser's clock. Set it
      to show another one — the office's, the customer's — wherever the user is.
      Picking 09:00 in a <code>timeZone="Europe/Istanbul"</code> box stores
      09:00 Istanbul time, whatever the browser's zone; the value bound to
      <code>[(value)]</code> is a plain <code>Date</code> for that instant.
    </p>
    <app-code-block [code]="instant" language="html" />

    <h2 id="date-only-values" class="scroll-mt-20">Date-only values</h2>
    <p>
      Pick one representation and keep it end to end. If the server stores
      calendar dates as UTC midnight, read and write them on UTC's clocks:
    </p>
    <app-code-block [code]="dateOnlyUtc" language="html" />
    <p>
      If they travel as <code>yyyy-MM-dd</code> strings, parse them as local
      calendar days with <code>toLocalDate()</code> and write them back with
      <code>serializeLikeOriginal()</code>; the grid's date columns and editors
      already do both for string cells.
    </p>
    <app-code-block [code]="dateOnlyString" language="ts" />

    <h2 id="what-timezone-covers" class="scroll-mt-20">What timeZone covers</h2>
    <app-guide-table
      caption="Surfaces that follow timeZone"
      [head]="['Component', 'On the zone’s clock']"
      [rows]="coverageRows"
    />

    <h2 id="server-filters" class="scroll-mt-20">Server filters</h2>
    <p>
      A day filter on a zoned column becomes the half-open range between two
      instants — that zone's midnights, 23 or 25 hours apart on a DST day — so
      the server compares instants and needs no zone logic. The
      <a routerLink="/guides/filter-contract">filter contract</a> has the full
      rules.
    </p>
    <app-code-block [code]="server" language="ts" />
  `,
})
export class GuideDatesAndTimeZonesPage {
  protected readonly sections = SECTIONS;
  protected readonly coverageRows = COVERAGE_ROWS;
  protected readonly instant = INSTANT;
  protected readonly dateOnlyUtc = DATE_ONLY_UTC;
  protected readonly dateOnlyString = DATE_ONLY_STRING;
  protected readonly server = SERVER;
}
