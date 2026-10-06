import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeScheduler,
  type OgeSchedulerCellClickEvent,
} from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SCHEDULER_TIME_ZONE_SECTIONS,
  ReactSchedulerTimeZoneDemos,
} from '../react-scheduler/time-zones';
import {
  DEMO_ZONES,
  DST_DATE,
  ZONE_DATE,
  dstAppointments,
  zoneAppointments,
} from './time-zone-data';
import { DST_DAY_SNIPPET, ZONE_SWITCHER_SNIPPET } from './time-zones-snippets';

const SECTIONS = ['Display zone', 'DST day'] as const;

@Component({
  selector: 'app-scheduler-time-zones',
  imports: [
    DemoCard,
    DocHeader,
    OgeScheduler,
    PageToc,
    ReactSchedulerTimeZoneDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Time zones"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="[
        'timeZone',
        'startTimeZoneExpr',
        'showTimeZoneEditor',
        'TZID',
        'DST',
      ]"
    >
      <p>
        Appointments are stored as instants. <code>timeZone</code> picks the
        clocks every view shows — slots, day boundaries, the now-line, drag
        snapping and recurrence all follow it, with the offsets taken from
        <code>Intl.DateTimeFormat</code> (core's <code>ogeZonedParts</code> /
        <code>ogeFromZoned</code>), so there is no time-zone database to ship.
        An appointment's own <code>startTimeZone</code> pins its series to that
        zone's clocks, and <code>TZID</code> values travel through RRULE blocks
        and <code>.ics</code> files.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-time-zone-demos />
    } @else {
      <app-demo-card
        [chips]="['timeZone', 'startTimeZone', 'showTimeZoneEditor']"
        heading="Display zone"
        description="One distributed team, four zones. Switch the display zone: every meeting moves to the matching wall time, while the New York standup keeps recurring at 09:00 <em>New York</em> time. Double-click a meeting to see the zone pickers — the date boxes show the meeting's own zone, and a typed time is saved in the picked one."
        [code]="zoneSnippet"
        language="ts"
      >
        <label class="mb-3 flex items-center gap-2 text-sm">
          Display zone
          <select class="rounded border px-2 py-1" (change)="onZone($event)">
            @for (option of zones; track option.value) {
              <option
                [value]="option.value"
                [selected]="option.value === zone()"
              >
                {{ option.text }}
              </option>
            }
          </select>
        </label>
        <oge-scheduler
          [dataSource]="zoneData"
          [currentDate]="zoneDate"
          currentView="week"
          [timeZone]="zone() || undefined"
          [showTimeZoneEditor]="true"
          [scrollTime]="7"
          style="height: 560px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['23-hour day', 'skipped hour', 'cellClick']"
        heading="DST day"
        description="Sunday 8 March 2026 in New York has 23 hours: the clocks jump from 02:00 to 03:00. The night shift spans 01:00–03:30 on the wall but lasts 1½ real hours; a click in the skipped hour reports the first real instant after the gap, and the daily check-in stays at 09:00 on both sides of the switch."
        [code]="dstSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="dstData"
          [currentDate]="dstDate"
          currentView="day"
          [views]="['day', 'week']"
          timeZone="America/New_York"
          [scrollTime]="0"
          (cellClick)="onCellClick($event)"
          style="height: 560px"
        />
        <p class="mt-2 text-sm" aria-live="polite">
          Last clicked slot (UTC): {{ clicked() }}
        </p>
      </app-demo-card>
    }
  `,
})
export class SchedulerTimeZonesPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_SCHEDULER_TIME_ZONE_SECTIONS;
  protected readonly zoneSnippet = ZONE_SWITCHER_SNIPPET;
  protected readonly dstSnippet = DST_DAY_SNIPPET;

  protected readonly zones = DEMO_ZONES;
  protected readonly zone = signal('Europe/Istanbul');
  protected readonly zoneDate = ZONE_DATE;
  protected readonly zoneData = zoneAppointments();
  protected readonly dstDate = DST_DATE;
  protected readonly dstData = dstAppointments();
  protected readonly clicked = signal('—');

  protected onZone(event: Event): void {
    this.zone.set((event.target as HTMLSelectElement).value);
  }

  protected onCellClick(event: OgeSchedulerCellClickEvent): void {
    this.clicked.set(event.cellDate.toISOString());
  }
}
