import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import {
  OgeScheduler,
  type OgeSchedulerView,
  type OgeSchedulerViewOptions,
} from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEPTH_DATE,
  PEOPLE_RESOURCE,
  ROOM_RESOURCE,
  busyMonthAppointments,
  teamAppointments,
  type DepthAppt,
} from '../scheduler/scheduler-depth-data';
import { SCHEDULER_VIEWS_GROUPING_DEMOS } from './views-grouping-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_SCHEDULER_VIEWS_GROUPING_SECTIONS = [
  'Timelines & custom intervals',
  'Multi-level groups',
  'Vertical grouping',
  '"+N more" popup',
] as const;

const intervalViews: (OgeSchedulerView | OgeSchedulerViewOptions)[] = [
  { type: 'day', intervalCount: 3, name: '3 days' },
  { type: 'week', intervalCount: 2, name: 'Fortnight' },
  'month',
  'timelineWorkWeek',
  'timelineMonth',
  'timelineYear',
];
const teamData = teamAppointments();
const busyData = busyMonthAppointments();

function IntervalsDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: teamData,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'timelineMonth',
    views: intervalViews,
    resources: [PEOPLE_RESOURCE],
    groups: ['ownerId'],
    showWeekNumbers: true,
    dayStartHour: 8,
    dayEndHour: 18,
    style: { height: 560 },
  });
}

function MultiLevelDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: teamData,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'day',
    views: ['day', 'week', 'timelineDay'],
    resources: [ROOM_RESOURCE, PEOPLE_RESOURCE],
    groups: ['roomId', 'ownerId'],
    groupByDate: false,
    dayStartHour: 8,
    dayEndHour: 18,
    renderResourceHeader: ({ item, level }) =>
      createElement(
        'span',
        { className: level === 0 ? 'font-semibold' : undefined },
        item.text,
      ),
    style: { height: 600 },
  });
}

function VerticalDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: teamData,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'workWeek',
    views: ['day', 'workWeek'],
    resources: [PEOPLE_RESOURCE],
    groups: ['ownerId'],
    groupOrientation: 'vertical',
    dayStartHour: 9,
    dayEndHour: 17,
    cellDuration: 60,
    style: { height: 640 },
  });
}

function MorePopupDemo(): ReactNode {
  return createElement(OgeScheduler<DepthAppt>, {
    dataSource: busyData,
    defaultCurrentDate: DEPTH_DATE,
    defaultCurrentView: 'month',
    views: ['day', 'month'],
    maxAppointmentsPerCell: 2,
    moreMode: 'popup',
    style: { height: 640 },
  });
}

/**
 * The React half of "Views & grouping" — rendered inside
 * `/components/scheduler/views-grouping` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-scheduler-views-grouping-demos',
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
      [chips]="['intervalCount', 'timelineYear', 'showWeekNumbers']"
      heading="Timelines & custom intervals"
      description="<code>{ type: 'day', intervalCount: 3 }</code> is a 3-day view and <code>{ type: 'week', intervalCount: 2 }</code> a fortnight; the month and year timelines run at day scale with one column per day. <code>showWeekNumbers</code> adds ISO week numbers (or the locale's own with <code>weekNumberRule</code>)."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="intervals" />
    </app-demo-card>

    <app-demo-card
      [chips]="['groups', 'groupByDate', 'renderResourceHeader']"
      heading="Multi-level groups"
      description="<code>groups={['roomId', 'ownerId']}</code> nests owners inside rooms with one header row per level. <code>groupByDate</code> off puts each resource's days side by side; a drag across columns reassigns both levels, and <code>renderResourceHeader</code> renders every grouped header."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="multiLevel" />
    </app-demo-card>

    <app-demo-card
      [chips]="['groupOrientation', 'row blocks']"
      heading="Vertical grouping"
      description="<code>groupOrientation=&quot;vertical&quot;</code> stacks a full time grid per resource under a group label column. Arrow keys move between blocks, and dragging a chip into another block reassigns its owner."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="vertical" />
    </app-demo-card>

    <app-demo-card
      [chips]="['moreMode', 'maxAppointmentsPerCell', 'keyboard list']"
      heading="&quot;+N more&quot; popup"
      description="Wednesday holds five appointments but the cell shows two: the &quot;+N more&quot; button opens the day's list — focus moves in, Up/Down/Home/End walk it, Enter opens an entry, Escape returns to the button and &quot;Go to day&quot; drills in. <code>moreMode=&quot;drill&quot;</code> keeps the old jump-to-day behavior."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="morePopup" />
    </app-demo-card>
  `,
})
export class ReactSchedulerViewsGroupingDemos {
  protected readonly demos = SCHEDULER_VIEWS_GROUPING_DEMOS;
  protected readonly intervals = () => createElement(IntervalsDemo);
  protected readonly multiLevel = () => createElement(MultiLevelDemo);
  protected readonly vertical = () => createElement(VerticalDemo);
  protected readonly morePopup = () => createElement(MorePopupDemo);
}
