import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OgeScheduler } from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SCHEDULER_RECURRENCE_EDITOR_SECTIONS,
  ReactSchedulerRecurrenceEditorDemos,
} from '../react-scheduler/recurrence-editor';
import {
  EXCEPTIONS_SNIPPET,
  RULES_SNIPPET,
} from './recurrence-editor-snippets';
import {
  DEPTH_DATE,
  recurringAppointments,
} from './scheduler-depth-data';

const SECTIONS = ['Rule patterns', 'Exceptions'] as const;

@Component({
  selector: 'app-scheduler-recurrence-editor',
  imports: [
    DemoCard,
    DocHeader,
    OgeScheduler,
    PageToc,
    ReactSchedulerRecurrenceEditorDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Recurrence editor"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="['BYSETPOS', 'BYMONTHDAY', 'COUNT / UNTIL', 'exceptions', 'live summary']"
    >
      <p>
        The appointment editor covers the recurrence patterns people actually
        book: every n-th or last weekday of a month, several days of the month,
        a yearly month and weekday, an end by count or date, and the list of
        skipped occurrences. A live summary reads the rule back in the
        scheduler's language (ICU plurals in the messages config), and a rule
        the form cannot express is kept verbatim instead of being rewritten.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-recurrence-editor-demos />
    } @else {
      <app-demo-card
        [chips]="['nth weekday', 'last workday', '1st & 15th', 'COUNT']"
        heading="Rule patterns"
        description="Double-click any chip, choose &quot;The entire series&quot; and look at the Repeat section: &quot;on the second Tuesday&quot;, &quot;on the last weekday&quot;, &quot;on days 1 and 15&quot; and &quot;ends after 6 occurrences&quot; are all form fields, and the summary line under them (&quot;Every month on the second Tuesday&quot;) updates as you change them."
        [code]="rulesSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="data"
          [currentDate]="date"
          currentView="month"
          [views]="['week', 'month', 'agenda']"
          style="height: 640px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['recurrenceException', 'EXDATE', 'UNTIL']"
        heading="Exceptions"
        description="The standup skips Wednesday the 12th. Open the series in the editor: the skipped date is a removable chip under &quot;Skipped occurrences&quot;, the date picker next to it adds more, and deleting a single occurrence from the popup adds an exception for you."
        [code]="exceptionsSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="data"
          [currentDate]="exceptionsDate"
          currentView="week"
          [dayStartHour]="8"
          [dayEndHour]="12"
          recurrenceEditMode="dialog"
          style="height: 480px"
        />
      </app-demo-card>
    }
  `,
})
export class SchedulerRecurrenceEditorPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_SCHEDULER_RECURRENCE_EDITOR_SECTIONS;
  protected readonly rulesSnippet = RULES_SNIPPET;
  protected readonly exceptionsSnippet = EXCEPTIONS_SNIPPET;

  protected readonly date = DEPTH_DATE;
  protected readonly exceptionsDate = new Date(2026, 7, 12);
  protected readonly data = recurringAppointments();
}
