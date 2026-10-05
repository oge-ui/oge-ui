import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeScheduler } from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEPTH_DATE,
  recurringAppointments,
  type DepthAppt,
} from '../scheduler/scheduler-depth-data';
import { SCHEDULER_RECURRENCE_EDITOR_DEMOS } from './recurrence-editor-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_SCHEDULER_RECURRENCE_EDITOR_SECTIONS = [
  'Rule patterns',
  'Exceptions',
] as const;

const data = recurringAppointments();

function RulesDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: data,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'month',
    views: ['week', 'month', 'agenda'],
    style: { height: 640 },
  });
}

function ExceptionsDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: data,
    defaultCurrentDate: new Date(2026, 7, 12),
    defaultCurrentView: 'week',
    dayStartHour: 8,
    dayEndHour: 12,
    recurrenceEditMode: 'dialog',
    style: { height: 480 },
  });
}

/**
 * The React half of "Recurrence editor" — rendered inside
 * `/components/scheduler/recurrence-editor` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-scheduler-recurrence-editor-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/scheduler/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['nth weekday', 'last workday', '1st & 15th', 'COUNT']"
      heading="Rule patterns"
      description="Double-click any chip, choose &quot;The entire series&quot; and look at the Repeat section: &quot;on the second Tuesday&quot;, &quot;on the last weekday&quot;, &quot;on days 1 and 15&quot; and &quot;ends after 6 occurrences&quot; are all form fields, and the summary line under them (&quot;Every month on the second Tuesday&quot;) updates as you change them."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="rules" />
    </app-demo-card>

    <app-demo-card
      [chips]="['recurrenceException', 'EXDATE', 'UNTIL']"
      heading="Exceptions"
      description="The standup skips Wednesday the 12th. Open the series in the editor: the skipped date is a removable chip under &quot;Skipped occurrences&quot;, the date picker next to it adds more, and deleting a single occurrence from the popup adds an exception for you."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="exceptions" />
    </app-demo-card>
  `,
})
export class ReactSchedulerRecurrenceEditorDemos {
  protected readonly demos = SCHEDULER_RECURRENCE_EDITOR_DEMOS;
  protected readonly rules = () => createElement(RulesDemo);
  protected readonly exceptions = () => createElement(ExceptionsDemo);
}
