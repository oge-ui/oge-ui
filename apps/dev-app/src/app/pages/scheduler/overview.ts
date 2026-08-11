import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeAppointmentTemplate,
  OgeScheduler,
  type OgeSchedulerAppointmentAddingEvent,
  type OgeSchedulerAppointmentDeletingEvent,
  type OgeSchedulerView,
} from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  CONFIG_SNIPPET,
  EDITING_SNIPPET,
  FIELD_MAPPING_SNIPPET,
  GETTING_STARTED_SNIPPET,
  PLANNING_SNIPPET,
  TEMPLATE_SNIPPET,
  VIEWS_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Field mapping',
  'Editing pipeline',
  'Planner ergonomics',
  'Views',
  'Appointment template',
  'Configuration & i18n',
] as const;

type DemoAppt = Record<string, unknown>;

@Component({
  selector: 'app-scheduler-overview',
  imports: [
    DemoCard,
    DocHeader,
    OgeAppointmentTemplate,
    OgeScheduler,
    PageToc,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Scheduler"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="[
        'day/week/month',
        'drag & resize',
        'all-day strip',
        'form editing',
        'keyboard access',
      ]"
    >
      <p>
        The only Angular-native scheduler: day, work-week, week and month views
        over a framework-free layout kernel (transitive-overlap columns, lane
        packing, "+N more" overflow), an all-day strip, drag-move and
        edge-resize with mid-gesture Escape-cancel, an anchored appointment
        popup and a form-based editing dialog built on
        <code>&#64;oge-ui/forms</code>. Dates are plain local <code>Date</code>s
        — no date library, no adapter — and every string, aria labels included,
        lives in the messages config. No WAI-ARIA APG scheduler pattern exists,
        so the widget composes the calendar-grid pattern: a
        <code>role="grid"</code> body with roving-tabindex cells and a second
        tab stop of appointment chips with keyboard move/resize.
      </p>
      <p>
        <code>&#64;oge-ui/scheduler</code> is a commercial package — free for
        evaluation and development, with no watermark and no runtime license
        checks. See
        <a routerLink="/license" class="text-indigo-600 dark:text-indigo-400"
          >licensing</a
        >
        for the terms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['week view', 'all-day strip', 'drag & resize', 'Escape-cancel']"
      heading="Getting started"
      description="One element, a working scheduler. Drag a chip to move it (Escape cancels mid-drag), pull its edges to resize, drag over empty cells to create a range, double-click or press Enter on a cell for the form dialog, single-click a chip for the summary popup. The toolbar title opens a date-navigator calendar."
      [code]="gettingStartedSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="basicData"
        [(currentDate)]="basicDate"
        [(currentView)]="basicView"
        [dayStartHour]="8"
        [dayEndHour]="19"
        style="height: 640px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['startDateExpr', 'dotted paths', 'string dates']"
      heading="Field mapping"
      description="Any item shape binds through the <code>*Expr</code> inputs — field names, dotted paths or getter functions. String dates parse as local wall time and write back in the same storage shape after edits."
      [code]="fieldMappingSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="mappedData"
        keyExpr="meetingId"
        textExpr="subject"
        startDateExpr="slot.begin"
        endDateExpr="slot.finish"
        colorExpr="badge"
        [currentDate]="fixedDate"
        [dayStartHour]="8"
        [dayEndHour]="18"
        style="height: 560px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['appointmentAdding', 'cancel', 'allow flags']"
      heading="Editing pipeline"
      description="Every mutation runs a cancelable <code>-ing</code> event before the store changes; the past-tense event fires only for applied changes. This demo vetoes weekend appointments and asks before deleting; resizing is disabled."
      [code]="editingSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="editingData"
        [currentDate]="fixedDate"
        [dayStartHour]="8"
        [dayEndHour]="18"
        [allowResizing]="false"
        (appointmentAdding)="blockWeekends($event)"
        (appointmentDeleting)="confirmDelete($event)"
        style="height: 560px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'workWeek',
        'workHours',
        'min/max',
        'scrollTime',
        'snapDuration',
      ]"
      heading="Planner ergonomics"
      description="The work-week view drops the weekend, <code>workHours</code> shades off-hours cells, <code>shadeUntilCurrentTime</code> dims elapsed time, <code>scrollTime</code> opens the grid at a sensible hour, <code>min</code>/<code>max</code> clamp navigation and <code>snapDuration</code> refines the drag raster. <code>readOnly</code> switches the whole widget to display-only."
      [code]="planningSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="planningData"
        [currentDate]="fixedDate"
        currentView="workWeek"
        [views]="['day', 'workWeek', 'week', 'month']"
        [scrollTime]="8"
        [workHours]="{ start: 9, end: 17 }"
        [shadeUntilCurrentTime]="true"
        [snapDuration]="15"
        [min]="planningMin"
        [max]="planningMax"
        style="height: 640px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['views options', 'per-view hours', 'maxAppointmentsPerCell']"
      heading="Views"
      description='<code>views</code> takes plain names or option objects with per-view hour windows and slot rasters. The month view packs appointments into lanes and folds the overflow into a "+N more" button that drills into the day view.'
      [code]="viewsSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="monthData"
        [currentDate]="fixedDate"
        currentView="month"
        [views]="monthViews"
        [maxAppointmentsPerCell]="2"
        style="height: 640px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['*ogeAppointmentTemplate']"
      heading="Appointment template"
      description="<code>*ogeAppointmentTemplate</code> replaces the chip content while the colored surface, gestures and keyboard semantics stay with the component. <code>ogeCellTemplate</code> and <code>ogeDateHeaderTemplate</code> exist for the grid surfaces."
      [code]="templateSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="templateData"
        [currentDate]="fixedDate"
        currentView="day"
        [dayStartHour]="8"
        [dayEndHour]="16"
        style="height: 560px"
      >
        <ng-template ogeAppointmentTemplate let-appointment>
          <strong>{{ appointment.text }}</strong>
          @if (appointment.description) {
            <em class="block text-[11px] opacity-80">{{
              appointment.description
            }}</em>
          }
        </ng-template>
      </oge-scheduler>
    </app-demo-card>

    <app-demo-card
      [chips]="['provideOgeSchedulerConfig', 'messages', 'locale']"
      heading="Configuration & i18n"
      description="Every user-facing string, aria labels included, lives in <code>OgeSchedulerMessages</code> — provide once with <code>provideOgeSchedulerConfig()</code> or override per instance with <code>[messages]</code>. <code>locale</code> drives every <code>Intl</code> format."
      [code]="configSnippet"
      language="ts"
    >
      <oge-scheduler
        [dataSource]="[]"
        [currentDate]="fixedDate"
        locale="de"
        style="height: 480px"
      />
    </app-demo-card>
  `,
})
export class SchedulerOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly fieldMappingSnippet = FIELD_MAPPING_SNIPPET;
  protected readonly editingSnippet = EDITING_SNIPPET;
  protected readonly planningSnippet = PLANNING_SNIPPET;
  protected readonly viewsSnippet = VIEWS_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly fixedDate = new Date(2026, 7, 6);
  protected readonly basicDate = signal(new Date(2026, 7, 6));
  protected readonly basicView = signal<OgeSchedulerView>('week');
  protected readonly planningMin = new Date(2026, 6, 1);
  protected readonly planningMax = new Date(2026, 8, 30);
  protected readonly monthViews = [
    {
      type: 'day',
      name: 'Office hours',
      dayStartHour: 9,
      dayEndHour: 17,
      cellDuration: 15,
    },
    'week',
    'month',
  ] as const;

  protected readonly basicData: DemoAppt[] = [
    {
      id: 1,
      text: 'Design review',
      startDate: new Date(2026, 7, 4, 9, 30),
      endDate: new Date(2026, 7, 4, 11, 0),
      color: '#2563eb',
    },
    {
      id: 2,
      text: 'Sprint planning',
      startDate: new Date(2026, 7, 6, 10, 0),
      endDate: new Date(2026, 7, 6, 12, 0),
      color: '#16a34a',
    },
    {
      id: 3,
      text: 'Pairing session',
      startDate: new Date(2026, 7, 6, 10, 30),
      endDate: new Date(2026, 7, 6, 12, 30),
      color: '#7c3aed',
    },
    {
      id: 4,
      text: 'Customer workshop',
      startDate: new Date(2026, 7, 5),
      endDate: new Date(2026, 7, 7),
      allDay: true,
      color: '#d97706',
    },
  ];

  protected readonly mappedData = [
    {
      meetingId: 'a',
      subject: 'Standup',
      slot: { begin: '2026-08-06T09:00', finish: '2026-08-06T09:15' },
      badge: '#7c3aed',
    },
    {
      meetingId: 'b',
      subject: '1:1',
      slot: { begin: '2026-08-06T09:00', finish: '2026-08-06T10:00' },
      badge: '#0891b2',
    },
  ];

  protected readonly editingData: DemoAppt[] = [
    {
      id: 1,
      text: 'Release',
      startDate: new Date(2026, 7, 7, 14, 0),
      endDate: new Date(2026, 7, 7, 15, 0),
    },
  ];

  protected readonly planningData: DemoAppt[] = [
    {
      id: 1,
      text: 'Architecture sync',
      startDate: new Date(2026, 7, 6, 9, 30),
      endDate: new Date(2026, 7, 6, 10, 30),
    },
    {
      id: 2,
      text: 'Late incident review',
      startDate: new Date(2026, 7, 6, 18, 0),
      endDate: new Date(2026, 7, 6, 19, 0),
      color: '#dc2626',
    },
  ];

  protected readonly monthData: DemoAppt[] = [
    {
      id: 1,
      text: 'Board meeting',
      startDate: new Date(2026, 7, 3, 9, 0),
      endDate: new Date(2026, 7, 3, 10, 0),
    },
    {
      id: 2,
      text: 'Audit',
      startDate: new Date(2026, 7, 3, 10, 0),
      endDate: new Date(2026, 7, 3, 11, 0),
      color: '#dc2626',
    },
    {
      id: 3,
      text: 'Retro',
      startDate: new Date(2026, 7, 3, 15, 0),
      endDate: new Date(2026, 7, 3, 16, 0),
      color: '#16a34a',
    },
    {
      id: 4,
      text: 'Conference',
      startDate: new Date(2026, 7, 12),
      endDate: new Date(2026, 7, 15),
      allDay: true,
      color: '#7c3aed',
    },
  ];

  protected readonly templateData: DemoAppt[] = [
    {
      id: 1,
      text: 'Usability session',
      description: 'Recording — join muted',
      startDate: new Date(2026, 7, 6, 9, 0),
      endDate: new Date(2026, 7, 6, 11, 0),
      color: '#0f766e',
    },
  ];

  protected blockWeekends(
    event: OgeSchedulerAppointmentAddingEvent<DemoAppt>,
  ): void {
    const day = (event.appointmentData['startDate'] as Date).getDay();
    if (day === 0 || day === 6) event.cancel = true;
  }

  protected confirmDelete(
    event: OgeSchedulerAppointmentDeletingEvent<DemoAppt>,
  ): void {
    event.cancel = !confirm('Delete this appointment?');
  }
}
