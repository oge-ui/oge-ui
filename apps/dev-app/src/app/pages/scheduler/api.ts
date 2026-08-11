import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_SCHEDULER_API,
  OGE_SCHEDULER_CONFIG_API,
} from './scheduler-api-data';

const SECTIONS = ['OgeScheduler', 'Configuration'] as const;

@Component({
  selector: 'app-scheduler-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Scheduler API"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/scheduler</code>. The
        layout kernel — view-model builders, the transitive-overlap column
        layout, lane packing, gesture math and the RFC 5545 RRULE-subset parser
        — is pure TypeScript inside the package; live demos are on the
        <a
          routerLink="/components/scheduler"
          class="text-indigo-600 dark:text-indigo-400"
          >overview</a
        >
        page.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeScheduler"
      selector="oge-scheduler"
      [sections]="schedulerApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />

    <h3>Notes</h3>
    <ul>
      <li>
        Dates are plain local <code>Date</code>s throughout (Intl-only house
        rule — no date library, no adapter, no timezone database). RRULE
        <code>UNTIL=…Z</code> stamps are therefore read as local wall time; the
        supported RFC 5545 subset is FREQ DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL,
        COUNT ⊕ UNTIL, BYDAY, BYMONTHDAY, BYMONTH and WKST — anything else
        rejects the whole rule rather than truncating it. The expansion engine
        ships in v0.2.
      </li>
      <li>
        No WAI-ARIA APG scheduler pattern exists. The widget composes the
        calendar-grid pattern: the view body is a <code>role="grid"</code>
        with one roving-tabindex cell (arrows, Home/End, Enter/Space creates),
        and the appointment chips form a second tab stop of
        <code>role="button"</code> elements — Left/Right cycles chronologically,
        Enter opens the popup, Delete deletes, and
        <strong>Ctrl+Arrow moves / Ctrl+Shift+Up/Down resizes</strong> as the
        keyboard equivalent of drag, announced through a polite live region.
      </li>
      <li>
        Binding a plain array never mutates it — edits land in an internal
        working set and the past-tense events carry the data to persist. A
        <code>DataSource</code> with <code>insert</code>/<code>update</code>/
        <code>remove</code> is written through and reloaded instead.
      </li>
    </ul>
  `,
})
export class SchedulerApiPage {
  protected readonly sections = SECTIONS;
  protected readonly schedulerApi = OGE_SCHEDULER_API;
  protected readonly configApi = OGE_SCHEDULER_CONFIG_API;
}
