import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, Fragment, useState, type ReactNode } from 'react';
import {
  OgeScheduler,
  OgeSchedulerConfigProvider,
  type OgeSchedulerAppointmentAddingEvent,
  type OgeSchedulerAppointmentDeletingEvent,
  type OgeSchedulerConfigInput,
  type OgeSchedulerResource,
  type OgeSchedulerView,
  type OgeSchedulerViewOptions,
} from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { SCHEDULER_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_SCHEDULER_OVERVIEW_SECTIONS = [
  'Getting started',
  'Field mapping',
  'Editing pipeline',
  'Planner ergonomics',
  'Teams, recurrence & timeline',
  'Views',
  'Appointment template',
  'Configuration & i18n',
] as const;

type DemoAppt = Record<string, unknown>;

const FIXED_DATE = new Date(2026, 7, 6);

const basicData: DemoAppt[] = [
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

const mappedData: DemoAppt[] = [
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

const editingData: DemoAppt[] = [
  {
    id: 1,
    text: 'Release',
    startDate: new Date(2026, 7, 7, 14, 0),
    endDate: new Date(2026, 7, 7, 15, 0),
  },
];

const planningData: DemoAppt[] = [
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

const monthData: DemoAppt[] = [
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

const monthViews: readonly (OgeSchedulerView | OgeSchedulerViewOptions)[] = [
  {
    type: 'day',
    name: 'Office hours',
    dayStartHour: 9,
    dayEndHour: 17,
    cellDuration: 15,
  },
  'week',
  'month',
];

const teamResources: OgeSchedulerResource[] = [
  {
    fieldExpr: 'ownerId',
    label: 'Owner',
    useColorAsDefault: true,
    items: [
      { id: 'ada', text: 'Ada', color: '#7c3aed' },
      { id: 'grace', text: 'Grace', color: '#0891b2' },
    ],
  },
];

const teamsData: DemoAppt[] = [
  {
    id: 1,
    text: 'Daily standup',
    startDate: new Date(2026, 7, 3, 9, 0),
    endDate: new Date(2026, 7, 3, 9, 15),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    ownerId: 'ada',
    reminder: 5,
  },
  {
    id: 2,
    text: 'Design pairing',
    startDate: new Date(2026, 7, 5, 14, 0),
    endDate: new Date(2026, 7, 5, 16, 0),
    ownerId: 'grace',
  },
  {
    id: 3,
    text: 'Ops review',
    startDate: new Date(2026, 7, 6, 11, 0),
    endDate: new Date(2026, 7, 6, 12, 0),
  },
];

const templateData: DemoAppt[] = [
  {
    id: 1,
    text: 'Usability session',
    description: 'Recording — join muted',
    startDate: new Date(2026, 7, 6, 9, 0),
    endDate: new Date(2026, 7, 6, 11, 0),
    color: '#0f766e',
  },
];

const germanConfig: OgeSchedulerConfigInput = {
  messages: {
    toolbar: {
      label: 'Terminplaner',
      today: 'Heute',
      previous: 'Zurück',
      next: 'Weiter',
      viewSwitcherLabel: 'Ansichten',
      dateNavigatorLabel: 'Datum wählen',
      newAppointment: 'Neu',
      viewNames: {
        day: 'Tag',
        week: 'Woche',
        workWeek: 'Arbeitswoche',
        month: 'Monat',
        agenda: 'Agenda',
        timelineDay: 'Zeitachse Tag',
        timelineWeek: 'Zeitachse Woche',
        year: 'Jahr',
      },
    },
  },
};

function blockWeekends(event: OgeSchedulerAppointmentAddingEvent<DemoAppt>) {
  const day = (event.appointmentData['startDate'] as Date).getDay();
  if (day === 0 || day === 6) event.cancel = true;
}

function confirmDelete(event: OgeSchedulerAppointmentDeletingEvent<DemoAppt>) {
  event.cancel = !confirm('Delete this appointment?');
}

function GettingStartedDemo(): ReactNode {
  const [date, setDate] = useState(new Date(2026, 7, 6));
  const [view, setView] = useState<OgeSchedulerView>('week');
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: basicData,
    currentDate: date,
    onCurrentDateChange: setDate,
    currentView: view,
    onCurrentViewChange: setView,
    dayStartHour: 8,
    dayEndHour: 19,
    style: { height: 640 },
  });
}

function FieldMappingDemo(): ReactNode {
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: mappedData,
    keyExpr: 'meetingId',
    textExpr: 'subject',
    startDateExpr: 'slot.begin',
    endDateExpr: 'slot.finish',
    colorExpr: 'badge',
    defaultCurrentDate: FIXED_DATE,
    dayStartHour: 8,
    dayEndHour: 18,
    style: { height: 560 },
  });
}

function EditingDemo(): ReactNode {
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: editingData,
    defaultCurrentDate: FIXED_DATE,
    dayStartHour: 8,
    dayEndHour: 18,
    allowResizing: false,
    onAppointmentAdding: blockWeekends,
    onAppointmentDeleting: confirmDelete,
    style: { height: 560 },
  });
}

function PlanningDemo(): ReactNode {
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: planningData,
    defaultCurrentDate: FIXED_DATE,
    defaultCurrentView: 'workWeek',
    views: ['day', 'workWeek', 'week', 'month'],
    scrollTime: 8,
    workHours: { start: 9, end: 17 },
    shadeUntilCurrentTime: true,
    snapDuration: 15,
    min: new Date(2026, 6, 1),
    max: new Date(2026, 8, 30),
    style: { height: 640 },
  });
}

function TeamsDemo(): ReactNode {
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: teamsData,
    defaultCurrentDate: FIXED_DATE,
    defaultCurrentView: 'timelineWeek',
    views: ['week', 'timelineDay', 'timelineWeek', 'agenda', 'month'],
    resources: teamResources,
    groups: ['ownerId'],
    dayStartHour: 8,
    dayEndHour: 18,
    style: { height: 560 },
  });
}

function ViewsDemo(): ReactNode {
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: monthData,
    defaultCurrentDate: FIXED_DATE,
    defaultCurrentView: 'month',
    views: monthViews,
    maxAppointmentsPerCell: 2,
    style: { height: 640 },
  });
}

function TemplateDemo(): ReactNode {
  return createElement(OgeScheduler<DemoAppt>, {
    dataSource: templateData,
    defaultCurrentDate: FIXED_DATE,
    defaultCurrentView: 'day',
    dayStartHour: 8,
    dayEndHour: 16,
    style: { height: 560 },
    renderAppointment: ({ appointment }) =>
      createElement(
        Fragment,
        null,
        createElement('strong', null, appointment.text),
        appointment.description
          ? createElement(
              'em',
              { className: 'block text-[11px] opacity-80' },
              appointment.description,
            )
          : null,
      ),
  });
}

function ConfigDemo(): ReactNode {
  return createElement(
    OgeSchedulerConfigProvider,
    { config: germanConfig },
    createElement(OgeScheduler<DemoAppt>, {
      dataSource: [],
      defaultCurrentDate: FIXED_DATE,
      locale: 'de',
      style: { height: 480 },
    }),
  );
}

/**
 * The React half of the scheduler overview — the same eight demo sections as
 * the Angular page, with the same example content, rendered as real React
 * trees inside `/components/scheduler` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-scheduler-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React scheduler carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles, plus the popup/
  // modal (overlay), the calendar (inputs) and the form (forms) it composes.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/scheduler/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['week view', 'all-day strip', 'drag & resize', 'Escape-cancel']"
      heading="Getting started"
      description="One element, a working scheduler. Drag a chip to move it (Escape cancels mid-drag), pull its edges to resize, drag over empty cells to create a range, double-click or press Enter on a cell for the form dialog, single-click a chip for the summary popup — and right-click a chip or cell for the built-in menu (edit, delete, new appointment). The toolbar title opens a date-navigator calendar."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['startDateExpr', 'dotted paths', 'string dates']"
      heading="Field mapping"
      description="Any item shape binds through the <code>*Expr</code> props — field names, dotted paths or getter functions. String dates parse as local wall time and write back in the same storage shape after edits."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="fieldMapping" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onAppointmentAdding', 'cancel', 'allow flags']"
      heading="Editing pipeline"
      description="Every mutation runs a cancelable <code>-ing</code> callback before the store changes; the past-tense callback fires only for applied changes. This demo vetoes weekend appointments and asks before deleting; resizing is disabled."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="editing" />
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
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="planning" />
    </app-demo-card>

    <app-demo-card
      [chips]="['recurrence', 'resources', 'timeline', 'agenda', 'reminders']"
      heading="Teams, recurrence & timeline"
      description='Recurring series expand into occurrences in every view — editing or deleting one asks "this appointment or the entire series?" (<code>recurrenceEditMode</code>). <code>resources</code> drive the editor&apos;s assignment selects, default colors and the timeline rows (<code>groups</code>); the agenda view lists the coming days and <code>onReminderTriggered</code> fires at the reminder lead time.'
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="teams" />
    </app-demo-card>

    <app-demo-card
      [chips]="['views options', 'per-view hours', 'maxAppointmentsPerCell']"
      heading="Views"
      description='<code>views</code> takes plain names or option objects with per-view hour windows and slot rasters. The month view packs appointments into lanes and folds the overflow into a "+N more" button that drills into the day view.'
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="views" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderAppointment']"
      heading="Appointment template"
      description="<code>renderAppointment</code> replaces the chip content while the colored surface, gestures and keyboard semantics stay with the component. <code>renderCell</code> and <code>renderDateHeader</code> exist for the grid surfaces."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="template" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeSchedulerConfigProvider', 'messages', 'locale']"
      heading="Configuration & i18n"
      description="Every user-facing string, aria labels included, lives in <code>OgeSchedulerMessages</code> — provide once with <code>&amp;lt;OgeSchedulerConfigProvider&amp;gt;</code> or override per instance with <code>messages</code>. <code>locale</code> drives every <code>Intl</code> format."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactSchedulerOverviewDemos {
  protected readonly demos = SCHEDULER_OVERVIEW_DEMOS;

  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly fieldMapping = () => createElement(FieldMappingDemo);
  protected readonly editing = () => createElement(EditingDemo);
  protected readonly planning = () => createElement(PlanningDemo);
  protected readonly teams = () => createElement(TeamsDemo);
  protected readonly views = () => createElement(ViewsDemo);
  protected readonly template = () => createElement(TemplateDemo);
  protected readonly config = () => createElement(ConfigDemo);
}
