import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeGantt, type OgeGanttViewMode } from '@oge-ui/gantt';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_GANTT_RESOURCES_SECTIONS,
  ReactGanttResourcesDemos,
} from '../react-gantt/resources';
import {
  DEPTH_RESOURCES,
  RESOURCE_COLUMNS,
  resourceTasks,
} from './gantt-depth-data';
import {
  RESOURCE_VIEW_SNIPPET,
  UTILIZATION_SNIPPET,
} from './resources-snippets';

const SECTIONS = ['Units, work & utilization', 'Resource view'] as const;

@Component({
  selector: 'app-gantt-resources',
  imports: [DemoCard, DocHeader, OgeGantt, PageToc, ReactGanttResourcesDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Resources"
      category="Gantt"
      categoryLink="/components/gantt"
      [chips]="['units', 'effort-driven', 'histogram', 'resource view']"
    >
      <p>
        Assignments carry <strong>units</strong> (a number for every assigned
        resource, an array per resource or an id map); with
        <code>effortDriven</code> the work in hours and the assigned units
        decide a task's length. The utilization histogram shows the load per
        period against each resource's capacity, and the resource view regroups
        the plan by person.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-gantt-resources-demos />
    } @else {
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
        [code]="utilizationSnippet"
        language="ts"
      >
        <oge-gantt
          [tasks]="utilizationTasks"
          [resources]="resources"
          [columns]="columns"
          [effortDriven]="true"
          [showResourceHistogram]="true"
          [taskListWidth]="420"
          style="height: 460px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['viewMode', 'resource rows', 'Unassigned']"
        heading="Resource view"
        description="<code>viewMode: 'resources'</code> lists every resource as a group with its tasks underneath (a task with two people appears twice); tasks without a resource gather under <em>Unassigned</em>. Dragging an assignment bar moves the real task. The toolbar toggle flips the view."
        [code]="resourceViewSnippet"
        language="ts"
      >
        <oge-gantt
          [tasks]="viewTasks"
          [resources]="resources"
          [(viewMode)]="view"
          style="height: 420px"
        />
        <p class="mt-2 text-sm">View: {{ view() }}</p>
      </app-demo-card>
    }
  `,
})
export class GanttResourcesPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_GANTT_RESOURCES_SECTIONS;
  protected readonly utilizationSnippet = UTILIZATION_SNIPPET;
  protected readonly resourceViewSnippet = RESOURCE_VIEW_SNIPPET;
  protected readonly resources = DEPTH_RESOURCES;
  protected readonly columns = RESOURCE_COLUMNS;
  protected readonly utilizationTasks = resourceTasks();
  protected readonly viewTasks = resourceTasks();
  protected readonly view = signal<OgeGanttViewMode>('resources');
}
