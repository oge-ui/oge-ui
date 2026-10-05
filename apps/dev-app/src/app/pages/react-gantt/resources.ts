import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { Fragment, createElement, useState, type ReactNode } from 'react';
import { OgeGantt, type OgeGanttViewMode } from '@oge-ui/react-gantt';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEPTH_RESOURCES,
  RESOURCE_COLUMNS,
  resourceTasks,
  type DepthTask,
} from '../gantt/gantt-depth-data';
import { GANTT_RESOURCES_DEMOS } from './resources-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_GANTT_RESOURCES_SECTIONS = [
  'Units, work & utilization',
  'Resource view',
] as const;

function UtilizationDemo(): ReactNode {
  const [tasks] = useState(() => resourceTasks());
  return createElement(OgeGantt<DepthTask>, {
    tasks,
    resources: DEPTH_RESOURCES,
    columns: RESOURCE_COLUMNS,
    effortDriven: true,
    showResourceHistogram: true,
    taskListWidth: 420,
    style: { height: 460 },
  });
}

function ResourceViewDemo(): ReactNode {
  const [tasks] = useState(() => resourceTasks());
  const [view, setView] = useState<OgeGanttViewMode>('resources');
  return createElement(
    Fragment,
    null,
    createElement(OgeGantt<DepthTask>, {
      tasks,
      resources: DEPTH_RESOURCES,
      viewMode: view,
      onViewModeChange: setView,
      style: { height: 420 },
    }),
    createElement('p', { className: 'mt-2 text-sm' }, `View: ${view}`),
  );
}

/**
 * The React half of "Resources" — rendered inside
 * `/components/gantt/resources` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-gantt-resources-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/gantt/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="[
        'units',
        'effort',
        'effortDriven',
        'showResourceHistogram',
        'capacity',
      ]"
      heading="Units, work & utilization"
      description="Bora works half time (<code>capacity: 50</code>) and is booked at 100% on the database while also running monitoring — the histogram turns those periods red. Edit a task (double-click), change its people or units: with <code>effortDriven</code> the finish follows <code>work ÷ (8h × Σ units)</code>."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="utilization" />
    </app-demo-card>

    <app-demo-card
      [chips]="['viewMode', 'resource rows', 'Unassigned']"
      heading="Resource view"
      description="<code>viewMode: 'resources'</code> lists every resource as a group with its tasks underneath (a task with two people appears twice); tasks without a resource gather under <em>Unassigned</em>. Dragging an assignment bar moves the real task. The toolbar toggle flips the view."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="resourceView" />
    </app-demo-card>
  `,
})
export class ReactGanttResourcesDemos {
  protected readonly demos = GANTT_RESOURCES_DEMOS;
  protected readonly utilization = () => createElement(UtilizationDemo);
  protected readonly resourceView = () => createElement(ResourceViewDemo);
}
