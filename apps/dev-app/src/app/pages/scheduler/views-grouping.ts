import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OgeResourceHeaderTemplate, OgeScheduler } from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SCHEDULER_VIEWS_GROUPING_SECTIONS,
  ReactSchedulerViewsGroupingDemos,
} from '../react-scheduler/views-grouping';
import {
  DEPTH_DATE,
  PEOPLE_RESOURCE,
  ROOM_RESOURCE,
  busyMonthAppointments,
  teamAppointments,
} from './scheduler-depth-data';
import {
  INTERVALS_SNIPPET,
  MORE_POPUP_SNIPPET,
  MULTI_LEVEL_SNIPPET,
  VERTICAL_SNIPPET,
} from './views-grouping-snippets';

const SECTIONS = [
  'Timelines & custom intervals',
  'Multi-level groups',
  'Vertical grouping',
  '"+N more" popup',
] as const;

@Component({
  selector: 'app-scheduler-views-grouping',
  imports: [
    DemoCard,
    DocHeader,
    OgeResourceHeaderTemplate,
    OgeScheduler,
    PageToc,
    ReactSchedulerViewsGroupingDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Views & grouping"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="[
        'intervalCount',
        'timelineMonth',
        'week numbers',
        'multi-level groups',
        'groupOrientation',
      ]"
    >
      <p>
        Every view takes an <code>intervalCount</code> — 3-day, fortnight and
        quarter views are option objects, not new components — and the
        work-week, month and year timelines join the day and week ones. Groups
        nest to any depth, lay out horizontally or as stacked row blocks, and
        the grouped headers take a template. The month view's overflow opens a
        keyboard-accessible day list.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-views-grouping-demos />
    } @else {
      <app-demo-card
        [chips]="['intervalCount', 'timelineYear', 'showWeekNumbers']"
        heading="Timelines & custom intervals"
        description="<code>{ type: 'day', intervalCount: 3 }</code> is a 3-day view and <code>{ type: 'week', intervalCount: 2 }</code> a fortnight; the month and year timelines run at day scale with one column per day. <code>showWeekNumbers</code> adds ISO week numbers (or the locale's own with <code>weekNumberRule</code>)."
        [code]="intervalsSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="teamData"
          [currentDate]="date"
          currentView="timelineMonth"
          [views]="intervalViews"
          [resources]="people"
          [groups]="['ownerId']"
          [showWeekNumbers]="true"
          [dayStartHour]="8"
          [dayEndHour]="18"
          style="height: 560px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['groups', 'groupByDate', 'ogeResourceHeaderTemplate']"
        heading="Multi-level groups"
        description="<code>[groups]=&quot;['roomId', 'ownerId']&quot;</code> nests owners inside rooms with one header row per level. <code>groupByDate</code> off puts each resource's days side by side; a drag across columns reassigns both levels, and the resource header template renders every grouped header."
        [code]="multiLevelSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="teamData"
          [currentDate]="date"
          currentView="day"
          [views]="['day', 'week', 'timelineDay']"
          [resources]="roomsAndPeople"
          [groups]="['roomId', 'ownerId']"
          [groupByDate]="false"
          [dayStartHour]="8"
          [dayEndHour]="18"
          style="height: 600px"
        >
          <ng-template ogeResourceHeaderTemplate let-item let-level="level">
            <span [class.font-semibold]="level === 0">{{ item.text }}</span>
          </ng-template>
        </oge-scheduler>
      </app-demo-card>

      <app-demo-card
        [chips]="['groupOrientation', 'row blocks']"
        heading="Vertical grouping"
        description='<code>groupOrientation="vertical"</code> stacks a full time grid per resource under a group label column. Arrow keys move between blocks, and dragging a chip into another block reassigns its owner.'
        [code]="verticalSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="teamData"
          [currentDate]="date"
          currentView="workWeek"
          [views]="['day', 'workWeek']"
          [resources]="people"
          [groups]="['ownerId']"
          groupOrientation="vertical"
          [dayStartHour]="9"
          [dayEndHour]="17"
          [cellDuration]="60"
          style="height: 640px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['moreMode', 'maxAppointmentsPerCell', 'keyboard list']"
        heading='"+N more" popup'
        description='Wednesday holds five appointments but the cell shows two: the "+N more" button opens the day&apos;s list — focus moves in, Up/Down/Home/End walk it, Enter opens an entry, Escape returns to the button and "Go to day" drills in. <code>moreMode="drill"</code> keeps the old jump-to-day behavior.'
        [code]="morePopupSnippet"
        language="ts"
      >
        <oge-scheduler
          [dataSource]="busyData"
          [currentDate]="date"
          currentView="month"
          [views]="['day', 'month']"
          [maxAppointmentsPerCell]="2"
          moreMode="popup"
          style="height: 640px"
        />
      </app-demo-card>
    }
  `,
})
export class SchedulerViewsGroupingPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_SCHEDULER_VIEWS_GROUPING_SECTIONS;
  protected readonly intervalsSnippet = INTERVALS_SNIPPET;
  protected readonly multiLevelSnippet = MULTI_LEVEL_SNIPPET;
  protected readonly verticalSnippet = VERTICAL_SNIPPET;
  protected readonly morePopupSnippet = MORE_POPUP_SNIPPET;

  protected readonly date = DEPTH_DATE;
  protected readonly teamData = teamAppointments();
  protected readonly busyData = busyMonthAppointments();
  protected readonly people = [PEOPLE_RESOURCE];
  protected readonly roomsAndPeople = [ROOM_RESOURCE, PEOPLE_RESOURCE];
  protected readonly intervalViews = [
    { type: 'day', intervalCount: 3, name: '3 days' },
    { type: 'week', intervalCount: 2, name: 'Fortnight' },
    'month',
    'timelineWorkWeek',
    'timelineMonth',
    'timelineYear',
  ] as const;
}
