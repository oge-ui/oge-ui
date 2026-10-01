import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactSchedulerApiSections } from '../react-scheduler/api';
import {
  OGE_SCHEDULER_API,
  OGE_SCHEDULER_CONFIG_API,
} from './scheduler-api-data';

const SECTIONS = ['OgeScheduler', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactSchedulerApiSections`' titles. */
const SECTIONS_REACT = ['<OgeScheduler>', 'Configuration'] as const;

@Component({
  selector: 'app-scheduler-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    ReactSchedulerApiSections,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Scheduler API"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-scheduler</code>.
          The layout kernel — view-model builders, the transitive-overlap column
          layout, lane packing, gesture math, the RFC 5545 RRULE-subset parser
          and the editing/recurrence core — is pure TypeScript in
          <code>&#64;oge-ui/scheduler-engine</code>, the same engine the Angular
          scheduler runs; live demos are on the
          <a
            routerLink="/components/scheduler"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/scheduler</code>. The
          layout kernel — view-model builders, the transitive-overlap column
          layout, lane packing, gesture math and the RFC 5545 RRULE-subset
          parser — is pure TypeScript in
          <code>&#64;oge-ui/scheduler-engine</code>, shared with the React
          scheduler; live demos are on the
          <a
            routerLink="/components/scheduler"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-api />
    } @else {
      <app-api-reference
        title="OgeScheduler"
        selector="oge-scheduler"
        [sections]="schedulerApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }

    <h3>Notes</h3>
    <ul>
      <li>
        Dates are plain local <code>Date</code>s throughout (Intl-only house
        rule — no date library, no adapter, no timezone database). RRULE stamps
        without a suffix are local wall time; <code>…Z</code> stamps are UTC and
        convert to the matching local instant. The supported RFC 5545 subset is
        FREQ DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT ⊕ UNTIL, BYDAY,
        BYMONTHDAY, BYMONTH, BYHOUR, BYMINUTE, BYSETPOS and WKST, plus
        <code>DTSTART</code>/<code>RDATE</code>/<code>EXDATE</code> lines when
        the rule field holds an iCalendar property block. <code>TZID</code>,
        BYYEARDAY, BYWEEKNO, BYSECOND and EXRULE reject the whole rule rather
        than truncating it.
      </li>
      <li>
        No WAI-ARIA APG scheduler pattern exists. The widget composes the
        calendar-grid pattern: the view body is a <code>role="grid"</code> whose
        first row holds <code>role="columnheader"</code> cells (the full date,
        plus the resource when grouped; weekday names in the month view), and
        one roving-tabindex cell (arrows, Home/End, Enter/Space creates) that is
        also the <code>aria-selected</code> cell — selection follows focus, and
        a live drag-to-create range selects the slots it covers. A read-only
        scheduler sets <code>aria-readonly</code> on the grid. The appointment
        chips form a second tab stop of <code>role="button"</code> elements —
        Left/Right cycles chronologically, Enter opens the popup, Delete
        deletes, and
        <strong>Ctrl+Arrow moves / Ctrl+Shift+Up/Down resizes</strong> as the
        keyboard equivalent of drag, announced through a polite live region.
      </li>
      @if (fw.isReact()) {
        <li>
          Binding a plain array never mutates it — edits land in an internal
          working set and the past-tense callbacks carry the data to persist. A
          <code>DataSource</code> with <code>insert</code>/<code>update</code>/
          <code>remove</code> is written through and reloaded instead. The data
          is bound before the first paint, and a StrictMode remount revives the
          same core.
        </li>
      } @else {
        <li>
          Binding a plain array never mutates it — edits land in an internal
          working set and the past-tense events carry the data to persist. A
          <code>DataSource</code> with <code>insert</code>/<code>update</code>/
          <code>remove</code> is written through and reloaded instead.
        </li>
      }
    </ul>
  `,
})
export class SchedulerApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly schedulerApi = OGE_SCHEDULER_API;
  protected readonly configApi = OGE_SCHEDULER_CONFIG_API;
}
